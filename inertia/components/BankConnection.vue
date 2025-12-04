<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import {
  Building2,
  Link2,
  Unlink,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
  ExternalLink,
  Banknote,
  ChevronRight,
  CreditCard,
} from 'lucide-vue-next'

interface Bank {
  id: string
  name: string
  type: string
  status: string
  logo: string | null
}

interface BankAccount {
  id: string
  name: string
  type: string
  iban: string | null
  balance: number | null
  currency: string
}

// États
const isLoading = ref(false)
const searchQuery = ref('')
const banks = ref<Bank[]>([])
const authUrl = ref<string | null>(null)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const isSyncing = ref(false)
const syncedTransactions = ref<number | null>(null)

// État de connexion
const isConnected = ref(false)
const userAccessToken = ref<string | null>(null)
const accounts = ref<BankAccount[]>([])

// Récupérer le token CSRF
const getCsrfToken = (): string => {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

// Formater le montant
const formatAmount = (amount: number | null, currency: string = 'EUR') => {
  if (amount === null) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount)
}

// Formater l'IBAN
const formatIban = (iban: string | null) => {
  if (!iban) return '—'
  return iban.replace(/(.{4})/g, '$1 ').trim()
}

// Rechercher des banques
const searchBanks = async () => {
  if (searchQuery.value.length < 2) {
    banks.value = []
    return
  }

  isLoading.value = true
  error.value = null

  try {
    const response = await fetch(`/api/banks?search=${encodeURIComponent(searchQuery.value)}`)
    const data = await response.json()

    if (response.ok) {
      banks.value = data.banks
    } else {
      error.value = data.error || 'Erreur lors de la recherche'
    }
  } catch (e) {
    error.value = 'Erreur de connexion au serveur'
  } finally {
    isLoading.value = false
  }
}

// Initier une connexion bancaire
const initiateConnection = async () => {
  isLoading.value = true
  error.value = null
  authUrl.value = null

  try {
    const response = await fetch('/api/bank-connections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': getCsrfToken(),
      },
      body: JSON.stringify({}),
    })

    const data = await response.json()

    if (response.ok) {
      authUrl.value = data.authUrl
      // Stocker l'userId pour plus tard
      localStorage.setItem('tink_user_id', data.userId)
      successMessage.value = 'Connexion initiée ! Cliquez sur le bouton pour vous authentifier.'
    } else {
      error.value = data.error || 'Erreur lors de la création de la connexion'
    }
  } catch (e) {
    error.value = 'Erreur de connexion au serveur'
  } finally {
    isLoading.value = false
  }
}

// Échanger le code contre un token et récupérer les comptes
const exchangeCodeForToken = async (code: string) => {
  isLoading.value = true
  error.value = null

  try {
    const response = await fetch('/api/tink/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': getCsrfToken(),
      },
      body: JSON.stringify({ code }),
    })

    const data = await response.json()

    if (response.ok && data.success) {
      userAccessToken.value = data.accessToken
      accounts.value = data.accounts
      isConnected.value = true
      
      // Afficher le résultat de l'import
      if (data.import) {
        successMessage.value = `✅ ${data.accounts.length} compte(s) connecté(s) ! ${data.import.imported} transactions importées, ${data.import.skipped} doublons ignorés.`
        syncedTransactions.value = data.import.imported
      } else {
        successMessage.value = `${data.accounts.length} compte(s) connecté(s) avec succès !`
      }

      // Stocker le token
      localStorage.setItem('tink_access_token', data.accessToken)
      localStorage.setItem('tink_accounts', JSON.stringify(data.accounts))
    } else {
      error.value = data.error || 'Erreur lors de l\'échange du token'
    }
  } catch (e) {
    error.value = 'Erreur de connexion au serveur'
  } finally {
    isLoading.value = false
  }
}

// Synchroniser les transactions
const syncTransactions = async (accountId?: string) => {
  if (!userAccessToken.value) {
    error.value = 'Vous devez d\'abord connecter votre banque'
    return
  }

  isSyncing.value = true
  error.value = null
  syncedTransactions.value = null

  try {
    const response = await fetch('/api/bank-connections/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': getCsrfToken(),
      },
      body: JSON.stringify({
        accessToken: userAccessToken.value,
        accountId,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      syncedTransactions.value = data.count
      successMessage.value = `${data.count} transactions synchronisées !`
    } else {
      error.value = data.error || 'Erreur lors de la synchronisation'
    }
  } catch (e) {
    error.value = 'Erreur de connexion au serveur'
  } finally {
    isSyncing.value = false
  }
}

// Déconnecter
const disconnect = async () => {
  if (!confirm('Êtes-vous sûr de vouloir déconnecter votre compte bancaire ?\n\n⚠️ Toutes les transactions importées seront supprimées et le solde sera remis à zéro.')) {
    return
  }

  isLoading.value = true
  error.value = null
  successMessage.value = null

  try {
    // Appeler l'API pour supprimer les transactions côté serveur
    const response = await fetch('/api/bank-connections/disconnect', {
      method: 'DELETE',
      headers: {
        'X-XSRF-TOKEN': getCsrfToken(),
      },
    })

    const data = await response.json()

    if (response.ok && data.success) {
      // Supprimer les données locales
      localStorage.removeItem('tink_access_token')
      localStorage.removeItem('tink_accounts')
      localStorage.removeItem('tink_user_id')

      // Réinitialiser l'état
      userAccessToken.value = null
      accounts.value = []
      isConnected.value = false
      authUrl.value = null
      syncedTransactions.value = null

      successMessage.value = `✅ Compte déconnecté ! ${data.deletedTransactions || 0} transactions supprimées.`
    } else {
      error.value = data.error || 'Erreur lors de la déconnexion'
    }
  } catch (e) {
    error.value = 'Erreur de connexion au serveur'
  } finally {
    isLoading.value = false
  }
}

// Vérifier les paramètres URL et l'état local au chargement
onMounted(async () => {
  const urlParams = new URLSearchParams(window.location.search)
  const bankConnection = urlParams.get('bankConnection')
  const code = urlParams.get('code')
  const errorMsg = urlParams.get('message')

  // Gérer le callback de Tink
  if (bankConnection === 'success' && code) {
    await exchangeCodeForToken(code)
    // Nettoyer l'URL
    window.history.replaceState({}, '', '/settings')
  } else if (bankConnection === 'error') {
    error.value = errorMsg || 'Erreur lors de la connexion bancaire'
    window.history.replaceState({}, '', '/settings')
  }

  // Restaurer l'état depuis le localStorage
  const storedToken = localStorage.getItem('tink_access_token')
  const storedAccounts = localStorage.getItem('tink_accounts')

  if (storedToken && storedAccounts) {
    try {
      const parsedAccounts = JSON.parse(storedAccounts)
      if (Array.isArray(parsedAccounts) && parsedAccounts.length > 0) {
        userAccessToken.value = storedToken
        accounts.value = parsedAccounts
        isConnected.value = true
        console.log('🔄 Session Tink restaurée:', parsedAccounts.length, 'compte(s)')
      }
    } catch (e) {
      // Données corrompues, nettoyer
      localStorage.removeItem('tink_access_token')
      localStorage.removeItem('tink_accounts')
      console.log('🧹 Données Tink corrompues, nettoyage effectué')
    }
  }
})
</script>

<template>
  <Card class="bg-slate-900/50 backdrop-blur border-slate-800/50 overflow-hidden">
    <CardHeader>
      <CardTitle class="flex items-center gap-2 text-white">
        <Building2 class="w-5 h-5 text-violet-400" />
        Connexion bancaire
        <span class="bg-violet-500/20 px-2 py-0.5 rounded text-violet-300 text-xs font-normal">Tink by Visa</span>
      </CardTitle>
      <CardDescription class="text-slate-400">
        Connectez votre compte bancaire pour synchroniser automatiquement vos transactions via Tink (plateforme Visa, sécurisée DSP2).
      </CardDescription>
    </CardHeader>

    <CardContent class="space-y-6">
      <!-- Messages d'erreur/succès -->
      <div v-if="error" class="flex items-start gap-3 bg-rose-500/10 p-4 border border-rose-500/20 rounded-lg">
        <AlertCircle class="flex-shrink-0 mt-0.5 w-5 h-5 text-rose-400" />
        <p class="text-rose-300 text-sm">{{ error }}</p>
      </div>

      <div v-if="successMessage" class="flex items-start gap-3 bg-emerald-500/10 p-4 border border-emerald-500/20 rounded-lg">
        <CheckCircle2 class="flex-shrink-0 mt-0.5 w-5 h-5 text-emerald-400" />
        <p class="text-emerald-300 text-sm">{{ successMessage }}</p>
      </div>

      <!-- Compte connecté -->
      <div v-if="isConnected && accounts.length > 0" class="space-y-4">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <div class="flex justify-center items-center bg-emerald-500/20 rounded-full w-8 h-8">
              <CheckCircle2 class="w-4 h-4 text-emerald-400" />
            </div>
            <span class="font-medium text-emerald-400">{{ accounts.length }} compte(s) connecté(s)</span>
          </div>
          <button
            @click="disconnect"
            class="flex items-center gap-2 bg-slate-800 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg text-slate-400 hover:text-rose-400 text-sm transition-colors"
          >
            <Unlink class="w-4 h-4" />
            Déconnecter
          </button>
        </div>

        <!-- Liste des comptes -->
        <div v-for="account in accounts" :key="account.id" class="bg-slate-800/50 p-4 rounded-lg">
          <div class="flex justify-between items-start mb-3">
            <div class="flex items-center gap-3">
              <div class="flex justify-center items-center bg-violet-500/20 rounded-lg w-10 h-10">
                <CreditCard class="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p class="font-medium text-white">{{ account.name }}</p>
                <p class="font-mono text-slate-500 text-xs">{{ formatIban(account.iban) }}</p>
              </div>
            </div>
            <button
              @click="syncTransactions(account.id)"
              :disabled="isSyncing"
              class="flex items-center gap-2 bg-violet-500/20 hover:bg-violet-500/30 px-3 py-1.5 rounded-lg text-violet-400 text-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw :class="['w-4 h-4', isSyncing && 'animate-spin']" />
              {{ isSyncing ? 'Sync...' : 'Synchroniser' }}
            </button>
          </div>

          <!-- Solde -->
          <div class="pt-3 border-t border-slate-700/50">
            <p class="text-slate-500 text-xs">Solde actuel</p>
            <p class="font-semibold text-2xl text-white">
              {{ formatAmount(account.balance, account.currency) }}
            </p>
          </div>

          <!-- Résultat sync -->
          <div v-if="syncedTransactions !== null" class="flex items-center gap-2 bg-emerald-500/10 mt-3 p-3 rounded-lg">
            <Banknote class="w-4 h-4 text-emerald-400" />
            <span class="text-emerald-300 text-sm">{{ syncedTransactions }} transactions importées</span>
          </div>
        </div>

        <!-- Bouton sync tous les comptes -->
        <button
          @click="syncTransactions()"
          :disabled="isSyncing"
          class="flex justify-center items-center gap-2 bg-violet-500 hover:bg-violet-400 py-3 rounded-lg w-full font-semibold text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw :class="['w-5 h-5', isSyncing && 'animate-spin']" />
          {{ isSyncing ? 'Synchronisation en cours...' : 'Synchroniser tous les comptes' }}
        </button>
      </div>

      <!-- Interface de connexion (si pas de compte connecté) -->
      <div v-else class="space-y-4">
        <!-- URL d'authentification Tink Link -->
        <div v-if="authUrl" class="bg-violet-500/10 p-4 border border-violet-500/20 rounded-lg">
          <p class="mb-3 text-violet-300 text-sm">
            Cliquez sur le bouton ci-dessous pour vous connecter à votre banque via Tink (Visa) :
          </p>
          <a
            :href="authUrl"
            class="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-400 px-4 py-2.5 rounded-lg font-semibold text-white transition-colors"
          >
            <ExternalLink class="w-4 h-4" />
            Connecter ma banque
          </a>
          <p class="mt-3 text-slate-500 text-xs">
            Vous serez redirigé vers le portail sécurisé Tink pour sélectionner votre banque et vous authentifier.
          </p>
          <p class="mt-2 text-amber-400/80 text-xs">
            💡 <strong>Astuce :</strong> Si Tink réutilise vos anciens identifiants, ouvrez le lien dans une fenêtre de navigation privée (Ctrl+Shift+N).
          </p>
        </div>

        <!-- Bouton pour initier la connexion -->
        <div v-else class="space-y-4">
          <div class="bg-slate-800/30 p-6 rounded-lg text-center">
            <div class="flex justify-center items-center bg-violet-500/20 mx-auto mb-4 rounded-full w-16 h-16">
              <Building2 class="w-8 h-8 text-violet-400" />
            </div>
            <h3 class="mb-2 font-medium text-lg text-white">Connectez votre banque</h3>
            <p class="mb-4 text-slate-400 text-sm">
              Synchronisez automatiquement vos transactions depuis votre Crédit Agricole ou toute autre banque française.
            </p>
            <button
              @click="initiateConnection"
              :disabled="isLoading"
              class="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-400 px-6 py-3 rounded-lg font-semibold text-white transition-colors disabled:opacity-50"
            >
              <Loader2 v-if="isLoading" class="w-5 h-5 animate-spin" />
              <Link2 v-else class="w-5 h-5" />
              {{ isLoading ? 'Préparation...' : 'Connecter une banque' }}
            </button>
          </div>

          <!-- Banques supportées -->
          <div class="gap-3 grid grid-cols-4">
            <div class="flex flex-col justify-center items-center bg-slate-800/30 p-3 rounded-lg">
              <span class="text-slate-400 text-xs">Crédit Agricole</span>
            </div>
            <div class="flex flex-col justify-center items-center bg-slate-800/30 p-3 rounded-lg">
              <span class="text-slate-400 text-xs">BNP Paribas</span>
            </div>
            <div class="flex flex-col justify-center items-center bg-slate-800/30 p-3 rounded-lg">
              <span class="text-slate-400 text-xs">Société Générale</span>
            </div>
            <div class="flex flex-col justify-center items-center bg-slate-800/30 p-3 rounded-lg">
              <span class="text-slate-400 text-xs">+ 3400 banques</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Info sécurité -->
      <div class="bg-slate-800/30 p-4 rounded-lg">
        <p class="text-slate-500 text-xs">
          🔒 <strong class="text-slate-400">Sécurisé par Visa :</strong> Tink est une plateforme d'open banking certifiée, 
          rachetée par Visa en 2022. Vos identifiants bancaires ne transitent jamais par notre serveur. 
          L'authentification est conforme à la réglementation européenne DSP2.
        </p>
      </div>
    </CardContent>
  </Card>
</template>
