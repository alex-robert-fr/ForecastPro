<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { ref, computed } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Settings, Wallet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-vue-next'
import FloatingDock from '~/components/FloatingDock.vue'

interface Account {
  id: number
  name: string
  bank: string | null
  initialBalance: number
  balance: number
}

interface Props {
  account: Account | null
}

const props = defineProps<Props>()

const initialBalance = ref<string>(
  props.account?.initialBalance?.toString() || '0'
)
const isSaving = ref(false)
const saveResult = ref<{ success: boolean; message: string } | null>(null)

// Récupérer le token CSRF depuis le cookie
const getCsrfToken = (): string => {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

const formattedInitialBalance = computed(() => {
  const value = parseFloat(initialBalance.value.replace(',', '.')) || 0
  return formatAmount(value)
})

const handleSubmit = async () => {
  isSaving.value = true
  saveResult.value = null

  try {
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': getCsrfToken(),
      },
      body: JSON.stringify({
        initialBalance: parseFloat(initialBalance.value.replace(',', '.')) || 0,
      }),
    })

    const result = await response.json()

    if (response.ok) {
      saveResult.value = {
        success: true,
        message: result.message,
      }
    } else {
      saveResult.value = {
        success: false,
        message: result.error || 'Erreur lors de la sauvegarde',
      }
    }
  } catch (error) {
    saveResult.value = {
      success: false,
      message: 'Erreur de connexion au serveur',
    }
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Head title="ForecastPro - Paramètres" />

  <div class="bg-slate-950 min-h-screen">
    <!-- Header -->
    <header class="bg-slate-900/30 backdrop-blur-sm border-slate-800/50 border-b">
      <div class="mx-auto px-6 py-4 max-w-7xl">
        <div class="flex items-center gap-3">
            <div class="flex justify-center items-center bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-xl w-10 h-10">
              <span class="font-bold text-slate-950 text-lg">F</span>
            </div>
            <div>
              <h1 class="font-semibold text-white text-xl tracking-tight">ForecastPro</h1>
              <p class="text-slate-500 text-xs">Gestion financière intelligente</p>
            </div>
          </div>
      </div>
    </header>

    <main class="space-y-8 mx-auto pl-20 pr-6 py-8 max-w-2xl">
      <!-- Page Title -->
      <div class="flex items-center gap-3">
        <div class="flex justify-center items-center bg-slate-800/50 rounded-xl w-12 h-12">
          <Settings class="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h2 class="font-semibold text-white text-2xl">Paramètres</h2>
          <p class="text-slate-400 text-sm">Configurez votre compte et vos préférences</p>
        </div>
      </div>

      <!-- Initial Balance Card -->
      <Card class="bg-slate-900/50 backdrop-blur border-slate-800/50 overflow-hidden">
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-white">
            <Wallet class="w-5 h-5 text-emerald-400" />
            Solde de départ
          </CardTitle>
          <CardDescription class="text-slate-400">
            Définissez le solde initial de votre compte avant l'import des transactions.
            Ce montant sera ajouté à la somme de vos transactions pour calculer votre solde actuel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form @submit.prevent="handleSubmit" class="space-y-6">
            <!-- Input Field -->
            <div class="space-y-2">
              <label for="initialBalance" class="block font-medium text-slate-300 text-sm">
                Montant du solde initial
              </label>
              <div class="relative">
                <input
                  id="initialBalance"
                  v-model="initialBalance"
                  type="text"
                  inputmode="decimal"
                  placeholder="0.00"
                  class="bg-slate-800/50 px-4 py-3 pr-12 border border-slate-700 focus:border-cyan-500 rounded-lg focus:outline-none w-full text-white text-lg placeholder-slate-500 transition-colors focus:ring-2 focus:ring-cyan-500/20"
                />
                <span class="right-4 absolute inset-y-0 flex items-center font-medium text-slate-400">€</span>
              </div>
              <p class="text-slate-500 text-sm">
                Aperçu : <span class="text-cyan-400">{{ formattedInitialBalance }}</span>
              </p>
            </div>

            <!-- Info Box -->
            <div class="bg-cyan-500/5 p-4 border border-cyan-500/20 rounded-lg">
              <p class="text-cyan-300 text-sm">
                <strong>Conseil :</strong> Utilisez le solde affiché sur votre relevé bancaire 
                à la date de votre première transaction importée. Cela permettra de calculer 
                correctement votre solde actuel.
              </p>
            </div>

            <!-- Submit Button -->
            <div class="flex justify-end">
              <button
                type="submit"
                :disabled="isSaving"
                class="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 px-6 py-2.5 rounded-lg font-semibold text-white transition-colors disabled:opacity-50"
              >
                <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin" />
                <span v-if="isSaving">Enregistrement...</span>
                <span v-else>Enregistrer</span>
              </button>
            </div>

            <!-- Result Message -->
            <div v-if="saveResult" class="mt-4">
              <div
                :class="[
                  'rounded-lg p-4 flex items-start gap-3',
                  saveResult.success ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20',
                ]"
              >
                <CheckCircle2 v-if="saveResult.success" class="flex-shrink-0 mt-0.5 w-5 h-5 text-emerald-400" />
                <AlertCircle v-else class="flex-shrink-0 mt-0.5 w-5 h-5 text-rose-400" />
                <p :class="saveResult.success ? 'text-emerald-300' : 'text-rose-300'">
                  {{ saveResult.message }}
                </p>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <!-- Account Info Card -->
      <Card v-if="account" class="bg-slate-900/50 backdrop-blur border-slate-800/50 overflow-hidden">
        <CardHeader>
          <CardTitle class="text-white text-lg">Informations du compte</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="gap-4 grid grid-cols-2">
            <div>
              <p class="text-slate-500 text-sm">Nom du compte</p>
              <p class="font-medium text-white">{{ account.name }}</p>
            </div>
            <div>
              <p class="text-slate-500 text-sm">Banque</p>
              <p class="font-medium text-white">{{ account.bank || 'Non définie' }}</p>
            </div>
            <div>
              <p class="text-slate-500 text-sm">Solde initial</p>
              <p class="font-medium text-cyan-400">{{ formatAmount(account.initialBalance) }}</p>
            </div>
            <div>
              <p class="text-slate-500 text-sm">Solde actuel</p>
              <p class="font-medium text-emerald-400">{{ formatAmount(account.balance) }}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>

    <!-- Floating Dock Navigation -->
    <FloatingDock />
  </div>
</template>

