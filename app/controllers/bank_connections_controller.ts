import type { HttpContext } from '@adonisjs/core/http'
import TinkService from '#services/tink_service'

export default class BankConnectionsController {
  /**
   * Liste les banques disponibles
   * GET /api/banks
   */
  async listBanks({ response }: HttpContext) {
    return response.json({
      message: 'Utilisez Tink Link pour sélectionner votre banque',
      info: 'POST /api/bank-connections pour initier la connexion',
    })
  }

  /**
   * Initie une connexion bancaire via Tink Link (flux OAuth2 standard)
   * POST /api/bank-connections
   */
  async create({ request, response }: HttpContext) {
    console.log('🏦 Création connexion bancaire...')

    try {
      const service = new TinkService()

      // Construire l'URL de callback
      const host = request.host() || 'localhost:3333'
      const protocol = host.includes('localhost') ? 'http' : 'https'
      const redirectUri = `${protocol}://${host}/api/bank-connections/callback`

      console.log('📍 Redirect URI:', redirectUri)

      // Générer un state unique pour la sécurité CSRF
      const state = `fp_${Date.now()}_${Math.random().toString(36).substring(7)}`

      // Générer l'URL Tink Link avec le flux OAuth2 standard
      const tinkLinkUrl = service.generateTinkLinkUrl({
        redirectUri,
        state,
        market: 'FR',
        locale: 'fr_FR',
        test: true, // Mode sandbox - retirer en production
      })

      return response.json({
        success: true,
        authUrl: tinkLinkUrl,
        state,
        redirectUri,
        message: "Redirigez l'utilisateur vers authUrl",
      })
    } catch (error) {
      console.error('❌ Erreur création connexion:', error)
      return response.status(500).json({
        success: false,
        error: 'Erreur lors de la création de la connexion',
        message: error.message,
      })
    }
  }

  /**
   * Callback après authentification via Tink Link
   * GET /api/bank-connections/callback
   */
  async callback({ request, response }: HttpContext) {
    const code = request.input('code')
    const state = request.input('state')
    const credentialsId = request.input('credentialsId')
    const error = request.input('error')
    const errorMessage = request.input('message')

    console.log('📥 Callback Tink:', { code, state, credentialsId, error })

    if (error) {
      console.error('❌ Erreur Tink:', error, errorMessage)
      return response.redirect(`/settings?bankConnection=error&message=${encodeURIComponent(errorMessage || error)}`)
    }

    if (code) {
      // Succès ! Rediriger avec le code pour l'échanger contre un token
      console.log('✅ Redirection avec code:', code)
      return response.redirect(`/settings?bankConnection=success&code=${code}`)
    }

    if (credentialsId) {
      return response.redirect(`/settings?bankConnection=success&credentialsId=${credentialsId}`)
    }

    return response.redirect('/settings?bankConnection=error&message=Paramètres manquants')
  }

  /**
   * Synchronise les transactions
   * POST /api/bank-connections/sync
   */
  async sync({ request, response }: HttpContext) {
    const accessToken = request.input('accessToken')
    const accountId = request.input('accountId')

    if (!accessToken) {
      return response.status(400).json({ error: 'accessToken requis' })
    }

    try {
      const service = new TinkService()
      const transactions = await service.getTransactions(accessToken, accountId, 500)
      const formattedTransactions = service.transformTransactions(transactions)

      return response.json({
        success: true,
        count: formattedTransactions.length,
        transactions: formattedTransactions,
      })
    } catch (error) {
      console.error('❌ Erreur sync:', error)
      return response.status(500).json({
        success: false,
        error: 'Erreur lors de la synchronisation',
        message: error.message,
      })
    }
  }

  /**
   * Liste les connexions
   * GET /api/bank-connections
   */
  async index({ response }: HttpContext) {
    return response.json({ connections: [] })
  }

  /**
   * Supprime une connexion et toutes les transactions associées
   * DELETE /api/bank-connections/:id
   */
  async destroy({ response }: HttpContext) {
    try {
      const Account = (await import('#models/account')).default
      const Transaction = (await import('#models/transaction')).default
      const ImportBatch = (await import('#models/import_batch')).default

      // Récupérer le compte par défaut
      const account = await Account.query().where('isDefault', true).first()

      if (account) {
        // Supprimer toutes les transactions du compte
        const deletedCount = await Transaction.query()
          .where('accountId', account.id)
          .delete()

        // Supprimer tous les batches d'import
        await ImportBatch.query()
          .where('accountId', account.id)
          .delete()

        // Remettre le solde au solde initial (s'assurer que c'est un nombre valide)
        const initialBalance = parseFloat(String(account.initialBalance)) || 0
        account.balance = isNaN(initialBalance) ? 0 : initialBalance
        
        // Réinitialiser les infos du compte bancaire (venant de Tink)
        account.bank = null
        account.accountNumber = null
        account.name = 'Compte Principal'
        
        await account.save()

        console.log(`🗑️ Déconnexion: ${deletedCount} transactions supprimées, compte réinitialisé`)

        return response.json({
          success: true,
          message: `${deletedCount} transactions supprimées, compte réinitialisé`,
          deletedTransactions: deletedCount,
          newBalance: account.balance,
        })
      }

      return response.json({
        success: true,
        message: 'Aucun compte à déconnecter',
      })
    } catch (error) {
      console.error('❌ Erreur déconnexion:', error)
      return response.status(500).json({
        success: false,
        error: 'Erreur lors de la déconnexion',
        message: error.message,
      })
    }
  }
}
