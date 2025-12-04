import type { HttpContext } from '@adonisjs/core/http'
import Account from '#models/account'
import ImportBatch from '#models/import_batch'
import Transaction from '#models/transaction'
import CsvParserService from '#services/csv_parser_service'
import db from '@adonisjs/lucid/services/db'

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

      // Recalculer le solde du compte = solde initial + crédits - débits
      const creditsResult = await Transaction.query()
        .where('accountId', account.id)
        .where('type', 'credit')
        .sum('amount as total')
        .first()

      const debitsResult = await Transaction.query()
        .where('accountId', account.id)
        .where('type', 'debit')
        .sum('amount as total')
        .first()

      // S'assurer que les valeurs sont des nombres valides
      const credits = parseFloat(creditsResult?.$extras?.total) || 0
      const debits = parseFloat(debitsResult?.$extras?.total) || 0
      const initialBalance = parseFloat(String(account.initialBalance)) || 0
      
      const newBalance = initialBalance + credits - debits
      account.balance = isNaN(newBalance) ? initialBalance : newBalance
      await account.save()

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
      const creditsResult = await Transaction.query()
        .where('accountId', account.id)
        .where('type', 'credit')
        .sum('amount as total')
        .first()

      const debitsResult = await Transaction.query()
        .where('accountId', account.id)
        .where('type', 'debit')
        .sum('amount as total')
        .first()

      const credits = parseFloat(creditsResult?.$extras?.total) || 0
      const debits = parseFloat(debitsResult?.$extras?.total) || 0
      const initialBalance = parseFloat(String(account.initialBalance)) || 0

      calculatedBalance = initialBalance + credits - debits
      
      // S'assurer que ce n'est pas NaN
      if (isNaN(calculatedBalance)) {
        calculatedBalance = initialBalance
      }

      // Mettre à jour le solde en base si différent
      if (account.balance !== calculatedBalance) {
        account.balance = calculatedBalance
        await account.save()
      }
    }

    return response.ok({
      transactions,
      account: account ? {
        ...account.toJSON(),
        balance: calculatedBalance,
      } : null,
    })
  }
}
