/**
 * Tink Open Banking Service
 * Documentation: https://docs.tink.com/
 */

import env from '#start/env'

interface TinkToken {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}

interface TinkAccount {
  id: string
  name: string
  type: string
  balances?: {
    booked?: {
      amount: {
        value: {
          unscaledValue: string
          scale: string
        }
        currencyCode: string
      }
    }
  }
  identifiers?: {
    iban?: {
      iban: string
    }
  }
}

interface TinkTransaction {
  id: string
  accountId: string
  amount: {
    value: {
      unscaledValue: string
      scale: string
    }
    currencyCode: string
  }
  descriptions: {
    original: string
    display?: string
  }
  dates: {
    booked: string
  }
  status: string
}

export default class TinkService {
  private baseUrl = 'https://api.tink.com'
  private clientId: string
  private clientSecret: string

  constructor() {
    this.clientId = env.get('TINK_CLIENT_ID', '')
    this.clientSecret = env.get('TINK_CLIENT_SECRET', '')

    if (!this.clientId || !this.clientSecret) {
      console.warn('⚠️ TINK_CLIENT_ID ou TINK_CLIENT_SECRET non configuré')
    }
  }

  /**
   * Générer l'URL Tink Link avec le flux OAuth2 standard
   * C'est le flux recommandé par Tink pour les applications web
   */
  generateTinkLinkUrl(params: {
    redirectUri: string
    state?: string
    market?: string
    locale?: string
    test?: boolean
  }): string {
    // Utiliser le flux OAuth2 Authorization Code
    const baseUrl = 'https://link.tink.com/1.0/transactions/connect-accounts'

    const scope = 'accounts:read,transactions:read,balances:read,credentials:read'

    const queryParams = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: params.redirectUri,
      scope: scope,
      market: params.market || 'FR',
      locale: params.locale || 'fr_FR',
      response_type: 'code',
      // Forcer une nouvelle session à chaque connexion (ne pas réutiliser les anciens credentials)
      input_provider: '',
    })

    if (params.state) {
      queryParams.append('state', params.state)
    }

    if (params.test) {
      queryParams.append('test', 'true')
    }

    // Ajouter un timestamp pour éviter le cache
    queryParams.append('t', Date.now().toString())

    const url = `${baseUrl}?${queryParams.toString()}`
    console.log('🔗 Tink Link URL:', url)
    return url
  }

  /**
   * Échanger le code d'autorisation contre un access token
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<TinkToken> {
    console.log('🔄 Échange code contre token...')

    const response = await fetch(`${this.baseUrl}/api/v1/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Erreur échange code:', response.status, errorText)
      throw new Error(`Erreur échange code (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    console.log('✅ Token obtenu')
    return data
  }

  /**
   * Récupérer les comptes
   */
  async getAccounts(accessToken: string): Promise<TinkAccount[]> {
    console.log('📊 Récupération des comptes...')

    const response = await fetch(`${this.baseUrl}/data/v2/accounts`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Erreur comptes:', response.status, errorText)
      throw new Error(`Erreur comptes (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    console.log('✅ Comptes récupérés:', data.accounts?.length || 0)
    return data.accounts || []
  }

  /**
   * Récupérer les transactions
   */
  async getTransactions(accessToken: string, accountId?: string, pageSize: number = 100): Promise<TinkTransaction[]> {
    console.log('📝 Récupération des transactions...')

    let url = `${this.baseUrl}/data/v2/transactions?pageSize=${pageSize}`
    if (accountId) {
      url += `&accountIdIn=${accountId}`
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Erreur transactions:', response.status, errorText)
      throw new Error(`Erreur transactions (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    console.log('✅ Transactions récupérées:', data.transactions?.length || 0)
    return data.transactions || []
  }

  /**
   * Convertir le montant Tink en nombre
   */
  parseAmount(amount: { unscaledValue: string; scale: string }): number {
    const unscaled = parseInt(amount.unscaledValue, 10)
    const scale = parseInt(amount.scale, 10)
    return unscaled / Math.pow(10, scale)
  }

  /**
   * Transformer les transactions au format ForecastPro
   */
  transformTransactions(transactions: TinkTransaction[]): Array<{
    externalId: string
    date: string
    amount: number
    description: string
    type: 'credit' | 'debit'
  }> {
    return transactions.map((tx) => {
      const amount = this.parseAmount(tx.amount.value)
      const description = tx.descriptions.display || tx.descriptions.original

      return {
        externalId: tx.id,
        date: tx.dates.booked,
        amount: Math.abs(amount),
        description: description.trim(),
        type: amount >= 0 ? 'credit' : 'debit',
      }
    })
  }
}
