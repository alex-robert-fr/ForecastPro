import type { HttpContext } from '@adonisjs/core/http'
import Account from '#models/account'
import ImportBatch from '#models/import_batch'
import Transaction from '#models/transaction'
import CsvParserService from '#services/csv_parser_service'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { createHash } from 'node:crypto'

export default class ImportsController {
  /**
   * Upload et traitement d'un fichier CSV
   */
  async store({ request, response }: HttpContext) {
    const file = request.file('csv', {
      size: '10mb',
      extnames: ['csv'],
    })

    if (!file) {
      return response.badRequest({ error: 'Aucun fichier CSV fourni' })
    }

    if (!file.isValid) {
      return response.badRequest({ error: file.errors })
    }

    // Récupérer ou créer le compte par défaut
    let account = await Account.query().where('isDefault', true).first()

    if (!account) {
      account = await Account.create({
        name: 'Compte Principal',
        bank: 'Crédit Agricole',
        currency: 'EUR',
        isDefault: true,
      })
    }

    // Créer le batch d'import
    const batch = await ImportBatch.create({
      accountId: account.id,
      filename: file.clientName,
      status: 'processing',
    })

    try {
      // Lire le contenu du fichier
      const content = await file.tmpPath ? 
        await import('node:fs/promises').then(fs => fs.readFile(file.tmpPath!, 'utf-8')) :
        ''

      if (!content) {
        throw new Error('Impossible de lire le fichier')
      }

      // Parser le CSV
      const parser = new CsvParserService()
      const { transactions, errors } = parser.parse(content)

      if (errors.length > 0) {
        console.warn('Erreurs de parsing:', errors)
      }

      // Insérer toutes les transactions
      await db.transaction(async (trx) => {
        for (const txData of transactions) {
          await Transaction.create(
            {
              accountId: account!.id,
              importBatchId: batch.id,
              date: txData.date,
              label: txData.label,
              amount: txData.amount,
              type: txData.type,
              merchant: txData.merchant,
              paymentMethod: txData.paymentMethod,
              hash: txData.hash,
            },
            { client: trx }
          )
        }
      })

      // Mettre à jour le batch
      batch.rowsImported = transactions.length
      batch.rowsSkipped = 0
      batch.status = 'completed'
      await batch.save()

      // Recalculer le solde du compte
      await account.calculateAndUpdateBalance()

      return response.ok({
        success: true,
        message: `Import terminé: ${transactions.length} transactions importées`,
        data: {
          batchId: batch.id,
          rowsImported: transactions.length,
          parsingErrors: errors,
        },
      })
    } catch (error) {
      batch.status = 'failed'
      batch.errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      await batch.save()

      return response.internalServerError({
        error: 'Erreur lors du traitement du fichier',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  }

  /**
   * Liste les transactions récentes avec solde calculé dynamiquement
   */
  async index({ response }: HttpContext) {
    const transactions = await Transaction.query()
      .orderBy('date', 'desc')
      .orderBy('id', 'desc')
      .limit(100)

    const account = await Account.query().where('isDefault', true).first()

    // Calculer le solde dynamiquement à partir des transactions
    let calculatedBalance = 0
    
    if (account) {
      calculatedBalance = await account.calculateAndUpdateBalance()
    }

    return response.ok({
      transactions,
      account: account ? {
        ...account.toJSON(),
        balance: calculatedBalance,
      } : null,
    })
  }

  /**
   * Crée une nouvelle transaction manuellement
   * POST /api/transactions
   */
  async createTransaction({ request, response }: HttpContext) {
    const { date, label, amount, type, merchant, category, paymentMethod } = request.only([
      'date',
      'label',
      'amount',
      'type',
      'merchant',
      'category',
      'paymentMethod',
    ])

    // Validation
    if (!date || !label || amount === undefined || !type) {
      return response.badRequest({
        error: 'Les champs date, label, amount et type sont requis',
      })
    }

    if (!['debit', 'credit'].includes(type)) {
      return response.badRequest({
        error: "Le type doit être 'debit' ou 'credit'",
      })
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return response.badRequest({
        error: 'Le montant doit être un nombre positif',
      })
    }

    try {
      // Récupérer ou créer le compte par défaut
      let account = await Account.query().where('isDefault', true).first()

      if (!account) {
        account = await Account.create({
          name: 'Compte Principal',
          bank: 'Crédit Agricole',
          currency: 'EUR',
          isDefault: true,
        })
      }

      // Convertir la date en DateTime
      const transactionDate = DateTime.fromISO(date)
      if (!transactionDate.isValid) {
        return response.badRequest({
          error: 'Format de date invalide',
        })
      }

      // S'assurer que le montant est positif et correspond au type
      const transactionAmount = type === 'credit' ? Math.abs(amount) : -Math.abs(amount)

      // Générer un hash unique pour éviter les doublons
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 10)
      const hashData = `${transactionDate.toISODate()}|${label}|${transactionAmount}|${timestamp}|${random}`
      const hash = createHash('sha256').update(hashData).digest('hex').substring(0, 32)

      // Vérifier si la transaction existe déjà
      const existing = await Transaction.query().where('hash', hash).first()
      if (existing) {
        return response.conflict({
          error: 'Une transaction similaire existe déjà',
        })
      }

      // Créer la transaction
      const transaction = await Transaction.create({
        accountId: account.id,
        importBatchId: null, // Transaction manuelle
        date: transactionDate,
        label,
        amount: transactionAmount,
        type,
        merchant: merchant || null,
        category: category || null,
        paymentMethod: paymentMethod || null,
        hash,
      })

      // Recalculer le solde du compte
      const newBalance = await account.calculateAndUpdateBalance()

      return response.ok({
        success: true,
        message: 'Transaction créée avec succès',
        transaction,
        account: {
          ...account.toJSON(),
          balance: newBalance,
        },
      })
    } catch (error) {
      console.error('Erreur lors de la création de la transaction:', error)
      return response.internalServerError({
        error: 'Erreur lors de la création de la transaction',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  }

  /**
   * Supprime une transaction
   * DELETE /api/transactions/:id
   */
  async destroy({ params, response }: HttpContext) {
    const { id } = params

    if (!id) {
      return response.badRequest({
        error: 'ID de transaction requis',
      })
    }

    try {
      const transaction = await Transaction.find(id)

      if (!transaction) {
        return response.notFound({
          error: 'Transaction non trouvée',
        })
      }

      const account = await Account.find(transaction.accountId)
      if (!account) {
        return response.notFound({
          error: 'Compte non trouvé',
        })
      }

      // Supprimer la transaction
      await transaction.delete()

      // Recalculer le solde du compte
      await account.calculateAndUpdateBalance()

      return response.ok({
        success: true,
        message: 'Transaction supprimée avec succès',
        account: {
          ...account.toJSON(),
          balance: account.balance,
        },
      })
    } catch (error) {
      console.error('Erreur lors de la suppression de la transaction:', error)
      return response.internalServerError({
        error: 'Erreur lors de la suppression de la transaction',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  }
}
