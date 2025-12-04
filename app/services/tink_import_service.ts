import { DateTime } from 'luxon'
import crypto from 'node:crypto'
import Account from '#models/account'
import Transaction from '#models/transaction'
import ImportBatch from '#models/import_batch'

interface TinkTransaction {
  externalId: string
  date: string
  amount: number
  description: string
  type: 'credit' | 'debit'
}

interface TinkAccount {
  id: string
  name: string
  type: string
  iban: string | null
  balance: number | null
  currency: string
}

export default class TinkImportService {
  /**
   * Importer les transactions Tink dans la base de données
   */
  async importTransactions(
    transactions: TinkTransaction[],
    tinkAccounts: TinkAccount[]
  ): Promise<{
    imported: number
    skipped: number
    batchId: number
  }> {
    // Récupérer ou créer le compte par défaut
    let account = await Account.query().where('isDefault', true).first()
    const tinkAccount = tinkAccounts[0]

    if (!account) {
      // Créer un compte basé sur le premier compte Tink
      account = await Account.create({
        name: tinkAccount?.name || 'Compte Principal',
        bank: 'Tink',
        accountNumber: tinkAccount?.iban || null,
        balance: tinkAccount?.balance || 0,
        initialBalance: 0,
        currency: tinkAccount?.currency || 'EUR',
        isDefault: true,
      })
    } else {
      // Mettre à jour les infos du compte avec les données Tink
      if (tinkAccount) {
        account.name = tinkAccount.name || account.name
        account.bank = 'Tink'
        account.accountNumber = tinkAccount.iban || account.accountNumber
        account.currency = tinkAccount.currency || account.currency
        await account.save()
      }
    }

    // Créer un batch d'import
    const batch = await ImportBatch.create({
      accountId: account.id,
      filename: `tink_sync_${DateTime.now().toFormat('yyyy-MM-dd_HH-mm')}`,
      rowsImported: 0,
      rowsSkipped: 0,
      status: 'processing',
    })

    let imported = 0
    let skipped = 0

    for (const tx of transactions) {
      // Générer un hash unique pour éviter les doublons
      const hash = this.generateHash(tx)

      // Vérifier si la transaction existe déjà
      const existing = await Transaction.query().where('hash', hash).first()

      if (existing) {
        skipped++
        continue
      }

      // Créer la transaction
      await Transaction.create({
        accountId: account.id,
        importBatchId: batch.id,
        date: DateTime.fromISO(tx.date),
        label: tx.description,
        amount: tx.amount,
        type: tx.type,
        merchant: this.extractMerchant(tx.description),
        category: null, // À catégoriser plus tard
        paymentMethod: null,
        hash,
      })

      imported++
    }

    // Mettre à jour le batch
    batch.rowsImported = imported
    batch.rowsSkipped = skipped
    batch.status = 'completed'
    await batch.save()

    // Mettre à jour le solde du compte
    await this.updateAccountBalance(account.id)

    console.log(`✅ Import terminé: ${imported} importées, ${skipped} ignorées`)

    return {
      imported,
      skipped,
      batchId: batch.id,
    }
  }

  /**
   * Générer un hash unique pour une transaction
   */
  private generateHash(tx: TinkTransaction): string {
    const data = `${tx.date}|${tx.amount}|${tx.description}|${tx.type}`
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 64)
  }

  /**
   * Extraire le nom du marchand depuis la description
   */
  private extractMerchant(description: string): string | null {
    // Nettoyer la description pour extraire le marchand
    const cleaned = description
      .replace(/\d{2}\/\d{2}\/\d{4}/g, '') // Supprimer les dates
      .replace(/CB\s*\*?\d+/gi, '') // Supprimer les numéros CB
      .replace(/CARTE\s+\d+/gi, '')
      .replace(/PAIEMENT\s+/gi, '')
      .replace(/VIREMENT\s+/gi, '')
      .replace(/PRELEVEMENT\s+/gi, '')
      .trim()

    return cleaned.length > 2 ? cleaned.substring(0, 100) : null
  }

  /**
   * Mettre à jour le solde du compte basé sur les transactions
   */
  private async updateAccountBalance(accountId: number): Promise<void> {
    const account = await Account.find(accountId)
    if (!account) return

    // Calculer les crédits
    const creditsResult = await Transaction.query()
      .where('accountId', accountId)
      .where('type', 'credit')
      .sum('amount as total')
      .first()

    // Calculer les débits
    const debitsResult = await Transaction.query()
      .where('accountId', accountId)
      .where('type', 'debit')
      .sum('amount as total')
      .first()

    // S'assurer que les valeurs sont des nombres valides (pas NaN)
    const credits = parseFloat(creditsResult?.$extras?.total) || 0
    const debits = parseFloat(debitsResult?.$extras?.total) || 0
    const initialBalance = parseFloat(String(account.initialBalance)) || 0

    // Le solde = solde initial + crédits - débits
    const newBalance = initialBalance + credits - debits
    
    // Vérifier que le résultat n'est pas NaN
    account.balance = isNaN(newBalance) ? initialBalance : newBalance

    console.log(`💰 Solde mis à jour: initial=${initialBalance}, crédits=${credits}, débits=${debits}, final=${account.balance}`)

    await account.save()
  }

  /**
   * Mettre à jour ou créer les comptes depuis Tink
   */
  async syncAccounts(tinkAccounts: TinkAccount[]): Promise<void> {
    for (const tinkAccount of tinkAccounts) {
      // Chercher un compte existant par IBAN ou nom
      let account = await Account.query()
        .where('accountNumber', tinkAccount.iban || '')
        .orWhere('name', tinkAccount.name)
        .first()

      if (account) {
        // Mettre à jour le solde
        if (tinkAccount.balance !== null) {
          account.balance = tinkAccount.balance
          await account.save()
        }
      }
    }
  }
}

