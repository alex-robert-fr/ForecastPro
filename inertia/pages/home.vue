<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { ref, computed, onMounted } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Loader2 } from 'lucide-vue-next'

interface Transaction {
  id: number
  date: string
  label: string
  amount: number
  type: 'debit' | 'credit'
  merchant: string | null
  paymentMethod: string | null
}

interface ImportResult {
  success: boolean
  message: string
  data?: {
    rowsImported: number
    rowsSkipped: number
    parsingErrors: string[]
  }
}

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const isUploading = ref(false)
const uploadResult = ref<ImportResult | null>(null)
const transactions = ref<Transaction[]>([])
const balance = ref<number>(0)

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

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const totalDebits = computed(() => {
  return transactions.value
    .filter((t) => t.type === 'debit')
    .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0)
})

const totalCredits = computed(() => {
  return transactions.value
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
})

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    uploadFile(files[0])
  }
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    uploadFile(files[0])
  }
}

const uploadFile = async (file: File) => {
  if (!file.name.endsWith('.csv')) {
    uploadResult.value = {
      success: false,
      message: 'Veuillez sélectionner un fichier CSV',
    }
    return
  }

  isUploading.value = true
  uploadResult.value = null

  const formData = new FormData()
  formData.append('csv', file)

  try {
    const response = await fetch('/api/import', {
      method: 'POST',
      body: formData,
      headers: {
        'X-XSRF-TOKEN': getCsrfToken(),
      },
    })

    const result = await response.json()

    if (response.ok) {
      uploadResult.value = {
        success: true,
        message: result.message,
        data: result.data,
      }
      // Recharger les transactions
      await loadTransactions()
    } else {
      uploadResult.value = {
        success: false,
        message: result.error || 'Erreur lors de l\'import',
      }
    }
  } catch (error) {
    uploadResult.value = {
      success: false,
      message: 'Erreur de connexion au serveur',
    }
  } finally {
    isUploading.value = false
    // Reset file input
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

const loadTransactions = async () => {
  // Ne pas exécuter côté serveur (SSR)
  if (typeof window === 'undefined') return
  
  try {
    const response = await fetch('/api/transactions')
    const data = await response.json()
    transactions.value = data.transactions || []
    balance.value = data.account?.balance || 0
  } catch (error) {
    console.error('Erreur lors du chargement des transactions:', error)
  }
}

// Charger les transactions au montage (côté client uniquement)
onMounted(() => {
  loadTransactions()
})
</script>

<template>
  <Head title="ForecastPro - Dashboard" />

  <div class="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen">
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

    <main class="space-y-8 mx-auto px-6 py-8 max-w-7xl">
      <!-- Stats Cards -->
      <div class="gap-4 grid grid-cols-1 md:grid-cols-3" v-if="transactions.length > 0">
        <Card class="bg-slate-900/50 backdrop-blur border-slate-800/50">
          <CardContent class="pt-6">
            <div class="flex justify-between items-center">
              <div>
                <p class="text-slate-400 text-sm">Solde actuel</p>
                <p class="mt-1 font-bold text-white text-2xl">{{ formatAmount(balance) }}</p>
              </div>
              <div class="flex justify-center items-center bg-emerald-500/10 rounded-full w-12 h-12">
                <TrendingUp class="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card class="bg-slate-900/50 backdrop-blur border-slate-800/50">
          <CardContent class="pt-6">
            <div class="flex justify-between items-center">
              <div>
                <p class="text-slate-400 text-sm">Total crédits</p>
                <p class="mt-1 font-bold text-emerald-400 text-2xl">+{{ formatAmount(totalCredits) }}</p>
              </div>
              <div class="flex justify-center items-center bg-emerald-500/10 rounded-full w-12 h-12">
                <TrendingUp class="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card class="bg-slate-900/50 backdrop-blur border-slate-800/50">
          <CardContent class="pt-6">
            <div class="flex justify-between items-center">
              <div>
                <p class="text-slate-400 text-sm">Total débits</p>
                <p class="mt-1 font-bold text-rose-400 text-2xl">-{{ formatAmount(totalDebits) }}</p>
              </div>
              <div class="flex justify-center items-center bg-rose-500/10 rounded-full w-12 h-12">
                <TrendingDown class="w-6 h-6 text-rose-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Import Section -->
      <Card class="bg-slate-900/50 backdrop-blur border-slate-800/50 overflow-hidden">
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-white">
            <FileSpreadsheet class="w-5 h-5 text-cyan-400" />
            Importer vos transactions
          </CardTitle>
          <CardDescription class="text-slate-400">
            Glissez-déposez votre relevé CSV ou cliquez pour sélectionner un fichier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <!-- Drop Zone -->
          <div
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @drop="handleDrop"
            @click="fileInput?.click()"
            :class="[
              'relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300',
              isDragging
                ? 'border-cyan-400 bg-cyan-400/5'
                : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/30',
            ]"
          >
            <input
              ref="fileInput"
              type="file"
              accept=".csv"
              class="hidden"
              @change="handleFileSelect"
            />

            <div v-if="isUploading" class="flex flex-col items-center gap-4">
              <Loader2 class="w-12 h-12 text-cyan-400 animate-spin" />
              <p class="text-slate-300">Traitement en cours...</p>
            </div>

            <div v-else class="flex flex-col items-center gap-4">
              <div class="flex justify-center items-center bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 rounded-2xl w-16 h-16">
                <Upload class="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <p class="font-medium text-slate-300">Déposez votre fichier CSV ici</p>
                <p class="mt-1 text-slate-500 text-sm">ou cliquez pour parcourir</p>
              </div>
              <p class="text-slate-600 text-xs">Format supporté : CSV Crédit Agricole (Date;Libellé;Débit;Crédit)</p>
            </div>
          </div>

          <!-- Upload Result -->
          <div v-if="uploadResult" class="mt-4">
            <div
              :class="[
                'rounded-lg p-4 flex items-start gap-3',
                uploadResult.success ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20',
              ]"
            >
              <CheckCircle2 v-if="uploadResult.success" class="flex-shrink-0 mt-0.5 w-5 h-5 text-emerald-400" />
              <AlertCircle v-else class="flex-shrink-0 mt-0.5 w-5 h-5 text-rose-400" />
              <div>
                <p :class="uploadResult.success ? 'text-emerald-300' : 'text-rose-300'">
                  {{ uploadResult.message }}
                </p>
                <div v-if="uploadResult.data" class="mt-2 text-slate-400 text-sm">
                  <p>{{ uploadResult.data.rowsImported }} transactions importées</p>
                  <p v-if="uploadResult.data.rowsSkipped > 0">
                    {{ uploadResult.data.rowsSkipped }} doublons ignorés
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Transactions List -->
      <Card v-if="transactions.length > 0" class="bg-slate-900/50 backdrop-blur border-slate-800/50">
        <CardHeader>
          <CardTitle class="text-white">Transactions récentes</CardTitle>
          <CardDescription class="text-slate-400">
            {{ transactions.length }} transactions affichées
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-2">
            <div
              v-for="transaction in transactions"
              :key="transaction.id"
              class="flex justify-between items-center bg-slate-800/30 hover:bg-slate-800/50 p-4 rounded-lg transition-colors"
            >
              <div class="flex items-center gap-4">
                <div
                  :class="[
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    transaction.type === 'credit' ? 'bg-emerald-500/10' : 'bg-rose-500/10',
                  ]"
                >
                  <TrendingUp v-if="transaction.type === 'credit'" class="w-5 h-5 text-emerald-400" />
                  <TrendingDown v-else class="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <p class="max-w-md font-medium text-white truncate">
                    {{ transaction.merchant || transaction.label.substring(0, 50) }}
                  </p>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-slate-500 text-xs">{{ formatDate(transaction.date) }}</span>
                    <span v-if="transaction.paymentMethod" class="bg-slate-700/50 px-2 py-0.5 rounded-full text-slate-400 text-xs">
                      {{ transaction.paymentMethod }}
                    </span>
                  </div>
                </div>
              </div>
              <p
                :class="[
                  'font-semibold tabular-nums',
                  transaction.type === 'credit' ? 'text-emerald-400' : 'text-rose-400',
                ]"
              >
                {{ transaction.type === 'credit' ? '+' : '' }}{{ formatAmount(transaction.amount) }}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Empty State -->
      <Card v-else class="bg-slate-900/50 backdrop-blur border-slate-800/50">
        <CardContent class="py-16">
          <div class="text-center">
            <div class="flex justify-center items-center bg-slate-800/50 mx-auto mb-4 rounded-2xl w-20 h-20">
              <FileSpreadsheet class="w-10 h-10 text-slate-600" />
            </div>
            <h3 class="font-medium text-slate-300 text-lg">Aucune transaction</h3>
            <p class="mt-1 text-slate-500">Importez votre premier relevé CSV pour commencer</p>
          </div>
        </CardContent>
      </Card>
    </main>
  </div>
</template>
