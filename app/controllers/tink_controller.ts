import type { HttpContext } from '@adonisjs/core/http'
import TinkService from '#services/tink_service'
import TinkImportService from '#services/tink_import_service'

export default class TinkController {
  /**
   * Échange le code contre un token, récupère les comptes et importe les transactions
   * POST /api/tink/token
   */
  async store({ request, response }: HttpContext) {
    const code = request.input('code')

    if (!code) {
      return response.status(400).json({
        success: false,
        error: "Code d'autorisation requis",
      })
    }

    console.log('🔄 Échange code Tink...')

    try {
      const tinkService = new TinkService()
      const importService = new TinkImportService()

      // Construire le redirect_uri (doit être identique à celui utilisé pour l'auth)
      const host = request.host() || 'localhost:3333'
      const protocol = host.includes('localhost') ? 'http' : 'https'
      const redirectUri = `${protocol}://${host}/api/bank-connections/callback`

      // Échanger le code contre un token
      const tokenData = await tinkService.exchangeCodeForToken(code, redirectUri)

      // Récupérer les comptes
      const rawAccounts = await tinkService.getAccounts(tokenData.access_token)
      const accounts = rawAccounts.map((acc) => ({
        id: acc.id,
        name: acc.name,
        type: acc.type,
        iban: acc.identifiers?.iban?.iban || null,
        balance: acc.balances?.booked ? tinkService.parseAmount(acc.balances.booked.amount.value) : null,
        currency: acc.balances?.booked?.amount?.currencyCode || 'EUR',
      }))

      // Récupérer les transactions
      console.log('📝 Récupération des transactions...')
      const rawTransactions = await tinkService.getTransactions(tokenData.access_token, undefined, 500)
      const transactions = tinkService.transformTransactions(rawTransactions)

      // Importer les transactions dans la base de données
      console.log('💾 Import des transactions dans la base de données...')
      const importResult = await importService.importTransactions(transactions, accounts)

      // Synchroniser les comptes
      await importService.syncAccounts(accounts)

      return response.json({
        success: true,
        accessToken: tokenData.access_token,
        expiresIn: tokenData.expires_in,
        accounts,
        import: {
          imported: importResult.imported,
          skipped: importResult.skipped,
          batchId: importResult.batchId,
        },
        message: `${importResult.imported} transactions importées, ${importResult.skipped} ignorées (doublons)`,
      })
    } catch (error) {
      console.error('❌ Erreur:', error)
      return response.status(500).json({
        success: false,
        error: "Erreur lors de l'import",
        message: error.message,
      })
    }
  }

  /**
   * Récupère les comptes
   * GET /api/tink/accounts
   */
  async index({ request, response }: HttpContext) {
    const authHeader = request.header('Authorization')
    const userToken = authHeader?.replace('Bearer ', '')

    if (!userToken) {
      return response.status(401).json({
        success: false,
        error: 'Token utilisateur requis',
      })
    }

    try {
      const service = new TinkService()
      const accounts = await service.getAccounts(userToken)

      return response.json({
        success: true,
        accounts: accounts.map((acc) => ({
          id: acc.id,
          name: acc.name,
          type: acc.type,
          iban: acc.identifiers?.iban?.iban || null,
          balance: acc.balances?.booked ? service.parseAmount(acc.balances.booked.amount.value) : null,
          currency: acc.balances?.booked?.amount?.currencyCode || 'EUR',
        })),
      })
    } catch (error) {
      console.error('❌ Erreur comptes:', error)
      return response.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des comptes',
        message: error.message,
      })
    }
  }
}
