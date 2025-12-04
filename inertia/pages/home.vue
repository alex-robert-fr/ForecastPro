<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3'
import { ref, computed, onMounted } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  CreditCard,
  PiggyBank,
  Target,
  Sparkles,
  ChevronRight,
  Calendar,
  BarChart3,
  ArrowLeftRight
} from 'lucide-vue-next'
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

interface DashboardData {
  balance: number
  transactions: Transaction[]
  monthlyIncome: number
  monthlyExpenses: number
  savingsRate: number
}

const dashboardData = ref<DashboardData>({
  balance: 0,
  transactions: [],
  monthlyIncome: 0,
  monthlyExpenses: 0,
  savingsRate: 0
})

const isLoading = ref(true)

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

const formatAmountCompact = (amount: number) => {
  if (Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount)
  }
  return formatAmount(amount)
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  })
}

const recentTransactions = computed(() => {
  return dashboardData.value.transactions.slice(0, 5)
})

const currentMonth = computed(() => {
  return new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
})

// Calculer les données par catégorie de dépenses (simulé basé sur les transactions)
const expensesByCategory = computed(() => {
  const categories: Record<string, { amount: number; color: string; label: string }> = {
    'shopping': { amount: 0, color: 'bg-violet-500', label: 'Shopping' },
    'food': { amount: 0, color: 'bg-amber-500', label: 'Alimentation' },
    'transport': { amount: 0, color: 'bg-blue-500', label: 'Transport' },
    'other': { amount: 0, color: 'bg-slate-500', label: 'Autres' }
  }
  
  dashboardData.value.transactions
    .filter(t => t.type === 'debit')
    .forEach(t => {
      const label = t.label.toLowerCase()
      if (label.includes('carrefour') || label.includes('leclerc') || label.includes('auchan') || label.includes('lidl')) {
        categories.food.amount += Math.abs(t.amount)
      } else if (label.includes('sncf') || label.includes('ratp') || label.includes('essence') || label.includes('total')) {
        categories.transport.amount += Math.abs(t.amount)
      } else if (label.includes('amazon') || label.includes('fnac') || label.includes('zara')) {
        categories.shopping.amount += Math.abs(t.amount)
      } else {
        categories.other.amount += Math.abs(t.amount)
      }
    })
  
  return Object.values(categories).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount)
})

const totalExpenses = computed(() => {
  return expensesByCategory.value.reduce((sum, cat) => sum + cat.amount, 0)
})

const loadDashboard = async () => {
  if (typeof window === 'undefined') return
  
  try {
    const response = await fetch('/api/transactions')
    const data = await response.json()
    const transactions = data.transactions || []
    const balance = data.account?.balance || 0
    
    // Calculer les revenus et dépenses du mois en cours
    const now = new Date()
    const currentMonthTransactions = transactions.filter((t: Transaction) => {
      const date = new Date(t.date)
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    })
    
    const monthlyIncome = currentMonthTransactions
      .filter((t: Transaction) => t.type === 'credit')
      .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0)
    
    const monthlyExpenses = currentMonthTransactions
      .filter((t: Transaction) => t.type === 'debit')
      .reduce((sum: number, t: Transaction) => sum + Math.abs(Number(t.amount)), 0)
    
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0
    
    dashboardData.value = {
      balance,
      transactions,
      monthlyIncome,
      monthlyExpenses,
      savingsRate: Math.max(0, savingsRate)
    }
  } catch (error) {
    console.error('Erreur lors du chargement du dashboard:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadDashboard()
})
</script>

<template>
  <Head title="ForecastPro - Dashboard" />

  <div class="bg-slate-950 min-h-screen">
    <!-- Header avec gradient subtil -->
    <header class="relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-emerald-500/5" />
      <div class="top-0 right-0 absolute bg-cyan-500/10 blur-3xl rounded-full w-96 h-96 -translate-y-1/2 translate-x-1/2" />
      
      <div class="relative mx-auto px-6 py-6 max-w-7xl">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3">
            <div class="flex justify-center items-center shadow-cyan-500/20 shadow-lg rounded-xl w-11 h-11" style="background: linear-gradient(135deg, #34d399 0%, #06b6d4 100%);">
              <span class="font-bold text-slate-950 text-xl">F</span>
            </div>
            <div>
              <h1 class="font-semibold text-white text-xl tracking-tight">ForecastPro</h1>
              <p class="text-slate-500 text-xs">Tableau de bord</p>
            </div>
          </div>
          
          <div class="flex items-center gap-2 text-slate-400 text-sm">
            <Calendar class="w-4 h-4" />
            <span class="capitalize">{{ currentMonth }}</span>
          </div>
        </div>
      </div>
    </header>

    <main class="space-y-6 mx-auto py-6 pr-6 pl-20 max-w-7xl">
      <!-- Hero Stats Section -->
      <div class="gap-6 grid grid-cols-1 lg:grid-cols-3">
        <!-- Balance Card - Grande carte principale -->
        <Card class="relative lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-slate-800/50 overflow-hidden">
          <div class="top-0 right-0 absolute bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 blur-3xl rounded-full w-64 h-64 -translate-y-1/2 translate-x-1/4" />
          <CardContent class="relative pt-6 pb-8">
            <div class="flex justify-between items-start mb-8">
              <div>
                <div class="flex items-center gap-2 mb-2">
                  <Wallet class="w-5 h-5 text-slate-400" />
                  <span class="font-medium text-slate-400 text-sm">Solde total</span>
                </div>
                <p class="font-bold text-white text-5xl tracking-tight">
                  {{ formatAmount(dashboardData.balance) }}
                </p>
              </div>
              <div class="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 border border-emerald-500/20 rounded-full">
                <ArrowUpRight class="w-4 h-4 text-emerald-400" />
                <span class="font-medium text-emerald-400 text-sm">+{{ dashboardData.savingsRate.toFixed(1) }}%</span>
              </div>
            </div>
            
            <!-- Mini stats -->
            <div class="gap-6 grid grid-cols-2">
              <div class="bg-slate-800/40 p-4 border border-slate-700/30 rounded-xl">
                <div class="flex items-center gap-2 mb-2">
                  <div class="flex justify-center items-center bg-emerald-500/10 rounded-lg w-8 h-8">
                    <TrendingUp class="w-4 h-4 text-emerald-400" />
                  </div>
                  <span class="text-slate-400 text-sm">Revenus</span>
                </div>
                <p class="font-semibold text-emerald-400 text-2xl">+{{ formatAmountCompact(dashboardData.monthlyIncome) }}</p>
              </div>
              <div class="bg-slate-800/40 p-4 border border-slate-700/30 rounded-xl">
                <div class="flex items-center gap-2 mb-2">
                  <div class="flex justify-center items-center bg-rose-500/10 rounded-lg w-8 h-8">
                    <TrendingDown class="w-4 h-4 text-rose-400" />
                  </div>
                  <span class="text-slate-400 text-sm">Dépenses</span>
                </div>
                <p class="font-semibold text-rose-400 text-2xl">-{{ formatAmountCompact(dashboardData.monthlyExpenses) }}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Quick Actions / Savings Goal -->
        <Card class="bg-slate-900/50 border-slate-800/50 overflow-hidden">
          <CardContent class="flex flex-col pt-6 h-full">
            <div class="flex items-center gap-2 mb-4">
              <Target class="w-5 h-5 text-cyan-400" />
              <span class="font-medium text-white">Objectif d'épargne</span>
            </div>
            
            <div class="flex flex-col flex-1 justify-center">
              <div class="relative mb-4">
                <div class="relative mx-auto w-32 h-32">
                  <svg class="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke="currentColor"
                      stroke-width="8"
                      fill="none"
                      class="text-slate-800"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke="url(#gradient)"
                      stroke-width="8"
                      fill="none"
                      stroke-linecap="round"
                      :stroke-dasharray="`${Math.min(dashboardData.savingsRate, 100) * 2.64} 264`"
                      class="transition-all duration-1000 ease-out"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#06b6d4" />
                        <stop offset="100%" stop-color="#10b981" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div class="absolute inset-0 flex flex-col justify-center items-center">
                    <span class="font-bold text-white text-2xl">{{ dashboardData.savingsRate.toFixed(0) }}%</span>
                    <span class="text-slate-500 text-xs">épargné</span>
                  </div>
                </div>
              </div>
              
              <p class="text-slate-400 text-sm text-center">
                <span class="font-medium text-white">{{ formatAmountCompact(dashboardData.monthlyIncome - dashboardData.monthlyExpenses) }}</span>
                épargné ce mois
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Second Row: Categories & Recent Transactions -->
      <div class="gap-6 grid grid-cols-1 lg:grid-cols-5">
        <!-- Expense Categories -->
        <Card class="lg:col-span-2 bg-slate-900/50 border-slate-800/50">
          <CardHeader>
            <CardTitle class="flex items-center gap-2 text-white text-base">
              <BarChart3 class="w-5 h-5 text-cyan-400" />
              Répartition des dépenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div v-if="expensesByCategory.length > 0" class="space-y-4">
              <div v-for="category in expensesByCategory" :key="category.label" class="space-y-2">
                <div class="flex justify-between items-center text-sm">
                  <span class="text-slate-300">{{ category.label }}</span>
                  <span class="font-medium text-slate-400">{{ formatAmount(category.amount) }}</span>
                </div>
                <div class="bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    :class="[category.color, 'h-full rounded-full transition-all duration-500']"
                    :style="{ width: `${(category.amount / totalExpenses) * 100}%` }"
                  />
                </div>
              </div>
            </div>
            <div v-else class="py-8 text-center">
              <PiggyBank class="mx-auto mb-3 w-10 h-10 text-slate-600" />
              <p class="text-slate-500 text-sm">Aucune dépense ce mois</p>
            </div>
          </CardContent>
        </Card>

        <!-- Recent Transactions -->
        <Card class="lg:col-span-3 bg-slate-900/50 border-slate-800/50">
          <CardHeader class="flex flex-row justify-between items-center">
            <CardTitle class="flex items-center gap-2 text-white text-base">
              <ArrowLeftRight class="w-5 h-5 text-cyan-400" />
              Dernières transactions
            </CardTitle>
            <Link 
              href="/transactions" 
              class="flex items-center gap-1 font-medium text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
            >
              Voir tout
              <ChevronRight class="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div v-if="recentTransactions.length > 0" class="space-y-3">
              <div
                v-for="transaction in recentTransactions"
                :key="transaction.id"
                class="flex justify-between items-center gap-4 bg-slate-800/30 hover:bg-slate-800/50 p-3 rounded-xl transition-colors"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div
                    :class="[
                      'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                      transaction.type === 'credit' ? 'bg-emerald-500/10' : 'bg-rose-500/10',
                    ]"
                  >
                    <ArrowUpRight v-if="transaction.type === 'credit'" class="w-4 h-4 text-emerald-400" />
                    <ArrowDownRight v-else class="w-4 h-4 text-rose-400" />
                  </div>
                  <div class="min-w-0">
                    <p class="font-medium text-white text-sm truncate">
                      {{ transaction.merchant || transaction.label.substring(0, 30) }}
                    </p>
                    <p class="text-slate-500 text-xs">{{ formatDate(transaction.date) }}</p>
                  </div>
                </div>
                <p
                  :class="[
                    'font-semibold text-sm tabular-nums whitespace-nowrap',
                    transaction.type === 'credit' ? 'text-emerald-400' : 'text-rose-400',
                  ]"
                >
                  {{ transaction.type === 'credit' ? '+' : '' }}{{ formatAmount(transaction.amount) }}
                </p>
              </div>
            </div>
            <div v-else class="py-8 text-center">
              <CreditCard class="mx-auto mb-3 w-10 h-10 text-slate-600" />
              <p class="text-slate-500 text-sm">Aucune transaction récente</p>
              <Link 
                href="/transactions" 
                class="inline-flex items-center gap-1 mt-3 font-medium text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
              >
                Importer des transactions
                <ChevronRight class="w-4 h-4" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Quick Insights -->
      <div class="gap-4 grid grid-cols-1 md:grid-cols-3">
        <Card class="bg-gradient-to-br from-violet-500/10 to-purple-500/5 border-violet-500/20">
          <CardContent class="pt-5 pb-5">
            <div class="flex items-center gap-3">
              <div class="flex justify-center items-center bg-violet-500/20 rounded-xl w-10 h-10">
                <Sparkles class="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p class="font-medium text-violet-300 text-sm">Conseil du jour</p>
                <p class="mt-0.5 text-slate-400 text-xs">Vous dépensez 15% de moins que le mois dernier</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card class="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20">
          <CardContent class="pt-5 pb-5">
            <div class="flex items-center gap-3">
              <div class="flex justify-center items-center bg-amber-500/20 rounded-xl w-10 h-10">
                <Target class="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p class="font-medium text-amber-300 text-sm">Objectif mensuel</p>
                <p class="mt-0.5 text-slate-400 text-xs">Encore {{ formatAmountCompact(Math.max(0, 500 - (dashboardData.monthlyIncome - dashboardData.monthlyExpenses))) }} à épargner</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card class="bg-gradient-to-br from-cyan-500/10 to-teal-500/5 border-cyan-500/20">
          <CardContent class="pt-5 pb-5">
            <div class="flex items-center gap-3">
              <div class="flex justify-center items-center bg-cyan-500/20 rounded-xl w-10 h-10">
                <PiggyBank class="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p class="font-medium text-cyan-300 text-sm">Épargne cumulée</p>
                <p class="mt-0.5 text-slate-400 text-xs">{{ formatAmountCompact(dashboardData.balance) }} au total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>

    <!-- Floating Dock Navigation -->
    <FloatingDock />
  </div>
</template>
