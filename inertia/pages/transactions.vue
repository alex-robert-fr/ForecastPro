<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { ref, computed, onMounted } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Loader2, Search, Filter, Calendar } from 'lucide-vue-next'
import FloatingDock from '~/components/FloatingDock.vue'

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
const searchQuery = ref('')
const filterType = ref<'all' | 'credit' | 'debit'>('all')

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

const filteredTransactions = computed(() => {
  return transactions.value.filter((t) => {
    const matchesSearch = searchQuery.value === '' || 
      t.label.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (t.merchant && t.merchant.toLowerCase().includes(searchQuery.value.toLowerCase()))
    
    const matchesFilter = filterType.value === 'all' || t.type === filterType.value
    
    return matchesSearch && matchesFilter
  })
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
  <Head title="ForecastPro - Transactions" />

  <div class="bg-slate-950 min-h-screen">
    <!-- Header -->
    <header class="bg-slate-900/30 backdrop-blur-sm border-slate-800/50 border-b">
      <div class="mx-auto px-6 py-4 max-w-7xl">
        <div class="flex items-center gap-3">
          <div class="flex justify-center items-center rounded-xl w-10 h-10" style="background: linear-gradient(135deg, #34d399 0%, #06b6d4 100%);">
            <span class="font-bold text-slate-950 text-lg">F</span>
          </div>
          <div>
            <h1 class="font-semibold text-white text-xl tracking-tight">Transactions</h1>
            <p class="text-slate-500 text-xs">Gérez et importez vos opérations bancaires</p>
          </div>
        </div>
      </div>
    </header>

    <main class="space-y-6 mx-auto py-8 pr-6 pl-20 max-w-7xl">
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
              'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300',
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

            <div v-if="isUploading" class="flex flex-col items-center gap-3">
              <Loader2 class="w-10 h-10 text-cyan-400 animate-spin" />
              <p class="text-slate-300">Traitement en cours...</p>
            </div>

            <div v-else class="flex items-center gap-6">
              <div class="flex justify-center items-center bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 rounded-xl w-14 h-14 shrink-0">
                <Upload class="w-7 h-7 text-cyan-400" />
              </div>
              <div class="text-left">
                <p class="font-medium text-slate-300">Déposez votre fichier CSV ici</p>
                <p class="mt-0.5 text-slate-500 text-sm">ou cliquez pour parcourir</p>
                <p class="mt-1 text-slate-600 text-xs">Format supporté : CSV Crédit Agricole (Date;Libellé;Débit;Crédit)</p>
              </div>
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

      <!-- Search and Filters -->
      <div v-if="transactions.length > 0" class="flex flex-wrap items-center gap-4">
        <div class="relative flex-1 min-w-[200px]">
          <div class="absolute left-3 inset-y-0 flex items-center pointer-events-none">
            <Search class="w-4 h-4 text-slate-500" />
          </div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Rechercher une transaction..."
            class="w-full h-10 bg-slate-900/50 border border-slate-800 rounded-lg pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
          />
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="filterType = 'all'"
            :class="[
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filterType === 'all' 
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:text-white'
            ]"
          >
            Tout
          </button>
          <button
            @click="filterType = 'credit'"
            :class="[
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filterType === 'credit' 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:text-white'
            ]"
          >
            Crédits
          </button>
          <button
            @click="filterType = 'debit'"
            :class="[
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filterType === 'debit' 
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:text-white'
            ]"
          >
            Débits
          </button>
        </div>
      </div>

      <!-- Transactions List -->
      <Card v-if="transactions.length > 0" class="bg-slate-900/50 backdrop-blur border-slate-800/50 overflow-hidden">
        <CardHeader class="border-b border-slate-800/50">
          <div class="flex items-center justify-between">
            <div>
              <CardTitle class="text-white">Liste des transactions</CardTitle>
              <CardDescription class="text-slate-400">
                {{ filteredTransactions.length }} transaction{{ filteredTransactions.length > 1 ? 's' : '' }} 
                <span v-if="filteredTransactions.length !== transactions.length">
                  sur {{ transactions.length }}
                </span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent class="p-0">
          <div class="divide-y divide-slate-800/50">
            <div
              v-for="transaction in filteredTransactions"
              :key="transaction.id"
              class="flex justify-between items-center gap-4 hover:bg-slate-800/30 px-6 py-4 transition-colors"
            >
              <div class="flex flex-1 items-center gap-4 min-w-0">
                <div
                  :class="[
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                    transaction.type === 'credit' ? 'bg-emerald-500/10' : 'bg-rose-500/10',
                  ]"
                >
                  <TrendingUp v-if="transaction.type === 'credit'" class="w-5 h-5 text-emerald-400" />
                  <TrendingDown v-else class="w-5 h-5 text-rose-400" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-white truncate">
                    {{ transaction.merchant || transaction.label.substring(0, 50) }}
                  </p>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-slate-500 text-xs">{{ formatDate(transaction.date) }}</span>
                    <span v-if="transaction.paymentMethod" class="bg-slate-700/50 px-2 py-0.5 rounded-full text-slate-400 text-xs whitespace-nowrap">
                      {{ transaction.paymentMethod }}
                    </span>
                  </div>
                </div>
              </div>
              <p
                :class="[
                  'font-semibold tabular-nums whitespace-nowrap shrink-0',
                  transaction.type === 'credit' ? 'text-emerald-400' : 'text-rose-400',
                ]"
              >
                {{ transaction.type === 'credit' ? '+' : '' }}{{ formatAmount(transaction.amount) }}
              </p>
            </div>
          </div>

          <!-- Empty filtered state -->
          <div v-if="filteredTransactions.length === 0" class="py-12 text-center">
            <Search class="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p class="text-slate-400">Aucune transaction trouvée</p>
            <p class="text-slate-600 text-sm mt-1">Essayez de modifier vos critères de recherche</p>
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

    <!-- Floating Dock Navigation -->
    <FloatingDock />
  </div>
</template>

