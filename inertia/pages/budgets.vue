<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { ref, computed, onMounted } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { 
  PieChart, 
  Plus, 
  Pencil, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ShoppingBag,
  Utensils,
  Car,
  Home,
  Zap,
  Smartphone,
  Heart,
  Gamepad2,
  GraduationCap,
  MoreHorizontal,
  X,
  Check
} from 'lucide-vue-next'
import FloatingDock from '~/components/FloatingDock.vue'

interface Budget {
  id: string
  name: string
  category: string
  limit: number
  spent: number
  color: string
  icon: string
}

interface Transaction {
  id: number
  date: string
  label: string
  amount: number
  type: 'debit' | 'credit'
  merchant: string | null
}

const budgets = ref<Budget[]>([
  { id: '1', name: 'Alimentation', category: 'food', limit: 400, spent: 0, color: 'amber', icon: 'utensils' },
  { id: '2', name: 'Transport', category: 'transport', limit: 150, spent: 0, color: 'blue', icon: 'car' },
  { id: '3', name: 'Shopping', category: 'shopping', limit: 200, spent: 0, color: 'violet', icon: 'shopping' },
  { id: '4', name: 'Loisirs', category: 'leisure', limit: 100, spent: 0, color: 'pink', icon: 'gamepad' },
  { id: '5', name: 'Logement', category: 'housing', limit: 800, spent: 0, color: 'emerald', icon: 'home' },
  { id: '6', name: 'Abonnements', category: 'subscriptions', limit: 50, spent: 0, color: 'cyan', icon: 'smartphone' },
])

const transactions = ref<Transaction[]>([])
const isModalOpen = ref(false)
const editingBudget = ref<Budget | null>(null)
const newBudget = ref({
  name: '',
  category: '',
  limit: 0,
  color: 'emerald',
  icon: 'utensils'
})

const availableColors = [
  { name: 'emerald', class: 'bg-emerald-500' },
  { name: 'cyan', class: 'bg-cyan-500' },
  { name: 'blue', class: 'bg-blue-500' },
  { name: 'violet', class: 'bg-violet-500' },
  { name: 'pink', class: 'bg-pink-500' },
  { name: 'amber', class: 'bg-amber-500' },
  { name: 'rose', class: 'bg-rose-500' },
  { name: 'orange', class: 'bg-orange-500' },
]

const availableIcons = [
  { name: 'utensils', label: 'Alimentation' },
  { name: 'car', label: 'Transport' },
  { name: 'shopping', label: 'Shopping' },
  { name: 'home', label: 'Logement' },
  { name: 'zap', label: 'Énergie' },
  { name: 'smartphone', label: 'Tech' },
  { name: 'heart', label: 'Santé' },
  { name: 'gamepad', label: 'Loisirs' },
  { name: 'graduation', label: 'Éducation' },
  { name: 'more', label: 'Autre' },
]

const iconComponents: Record<string, any> = {
  utensils: Utensils,
  car: Car,
  shopping: ShoppingBag,
  home: Home,
  zap: Zap,
  smartphone: Smartphone,
  heart: Heart,
  gamepad: Gamepad2,
  graduation: GraduationCap,
  more: MoreHorizontal,
}

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

const getColorClasses = (color: string, type: 'bg' | 'text' | 'border' | 'bg-light') => {
  const colors: Record<string, Record<string, string>> = {
    emerald: { bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/30', 'bg-light': 'bg-emerald-500/10' },
    cyan: { bg: 'bg-cyan-500', text: 'text-cyan-400', border: 'border-cyan-500/30', 'bg-light': 'bg-cyan-500/10' },
    blue: { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/30', 'bg-light': 'bg-blue-500/10' },
    violet: { bg: 'bg-violet-500', text: 'text-violet-400', border: 'border-violet-500/30', 'bg-light': 'bg-violet-500/10' },
    pink: { bg: 'bg-pink-500', text: 'text-pink-400', border: 'border-pink-500/30', 'bg-light': 'bg-pink-500/10' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/30', 'bg-light': 'bg-amber-500/10' },
    rose: { bg: 'bg-rose-500', text: 'text-rose-400', border: 'border-rose-500/30', 'bg-light': 'bg-rose-500/10' },
    orange: { bg: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500/30', 'bg-light': 'bg-orange-500/10' },
  }
  return colors[color]?.[type] || colors.emerald[type]
}

const getPercentage = (budget: Budget) => {
  if (budget.limit === 0) return 0
  return Math.min((budget.spent / budget.limit) * 100, 100)
}

const getStatus = (budget: Budget) => {
  const percentage = getPercentage(budget)
  if (percentage >= 100) return 'exceeded'
  if (percentage >= 80) return 'warning'
  return 'ok'
}

const totalBudget = computed(() => budgets.value.reduce((sum, b) => sum + b.limit, 0))
const totalSpent = computed(() => budgets.value.reduce((sum, b) => sum + b.spent, 0))
const totalRemaining = computed(() => totalBudget.value - totalSpent.value)

const budgetsExceeded = computed(() => budgets.value.filter(b => getStatus(b) === 'exceeded').length)
const budgetsWarning = computed(() => budgets.value.filter(b => getStatus(b) === 'warning').length)

// Catégorisation des transactions
const categorizeTransaction = (label: string): string => {
  const lowerLabel = label.toLowerCase()
  
  // Alimentation
  if (/carrefour|leclerc|auchan|lidl|intermarche|monoprix|franprix|picard|boulangerie|restaurant|mcdo|burger|pizza|sushi|uber eats|deliveroo/i.test(lowerLabel)) {
    return 'food'
  }
  // Transport
  if (/sncf|ratp|uber|bolt|taxi|essence|total|shell|bp|parking|autoroute|peage/i.test(lowerLabel)) {
    return 'transport'
  }
  // Shopping
  if (/amazon|fnac|darty|zara|h&m|decathlon|ikea|leroy merlin|castorama/i.test(lowerLabel)) {
    return 'shopping'
  }
  // Logement
  if (/loyer|edf|engie|eau|assurance habitation|syndic/i.test(lowerLabel)) {
    return 'housing'
  }
  // Abonnements
  if (/netflix|spotify|amazon prime|canal|orange|sfr|bouygues|free|deezer|apple/i.test(lowerLabel)) {
    return 'subscriptions'
  }
  // Loisirs
  if (/cinema|theatre|concert|musee|sport|gym|fitness/i.test(lowerLabel)) {
    return 'leisure'
  }
  
  return 'other'
}

const calculateSpentAmounts = () => {
  const spentByCategory: Record<string, number> = {}
  
  // Calculer les dépenses du mois en cours
  const now = new Date()
  const currentMonthTransactions = transactions.value.filter(t => {
    const date = new Date(t.date)
    return date.getMonth() === now.getMonth() && 
           date.getFullYear() === now.getFullYear() &&
           t.type === 'debit'
  })
  
  currentMonthTransactions.forEach(t => {
    const category = categorizeTransaction(t.label)
    spentByCategory[category] = (spentByCategory[category] || 0) + Math.abs(t.amount)
  })
  
  // Mettre à jour les budgets
  budgets.value = budgets.value.map(budget => ({
    ...budget,
    spent: spentByCategory[budget.category] || 0
  }))
}

const loadTransactions = async () => {
  if (typeof window === 'undefined') return
  
  try {
    const response = await fetch('/api/transactions')
    const data = await response.json()
    transactions.value = data.transactions || []
    calculateSpentAmounts()
  } catch (error) {
    console.error('Erreur lors du chargement des transactions:', error)
  }
}

const openModal = (budget?: Budget) => {
  if (budget) {
    editingBudget.value = budget
    newBudget.value = { ...budget }
  } else {
    editingBudget.value = null
    newBudget.value = { name: '', category: '', limit: 0, color: 'emerald', icon: 'utensils' }
  }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  editingBudget.value = null
  newBudget.value = { name: '', category: '', limit: 0, color: 'emerald', icon: 'utensils' }
}

const saveBudget = () => {
  if (!newBudget.value.name || newBudget.value.limit <= 0) return
  
  if (editingBudget.value) {
    // Mise à jour
    const index = budgets.value.findIndex(b => b.id === editingBudget.value!.id)
    if (index !== -1) {
      budgets.value[index] = {
        ...budgets.value[index],
        name: newBudget.value.name,
        category: newBudget.value.category || newBudget.value.name.toLowerCase(),
        limit: newBudget.value.limit,
        color: newBudget.value.color,
        icon: newBudget.value.icon,
      }
    }
  } else {
    // Création
    budgets.value.push({
      id: Date.now().toString(),
      name: newBudget.value.name,
      category: newBudget.value.category || newBudget.value.name.toLowerCase(),
      limit: newBudget.value.limit,
      spent: 0,
      color: newBudget.value.color,
      icon: newBudget.value.icon,
    })
  }
  
  closeModal()
  calculateSpentAmounts()
}

const deleteBudget = (id: string) => {
  budgets.value = budgets.value.filter(b => b.id !== id)
}

onMounted(() => {
  loadTransactions()
})
</script>

<template>
  <Head title="ForecastPro - Budgets" />

  <div class="bg-slate-950 min-h-screen">
    <!-- Header -->
    <header class="bg-slate-900/30 backdrop-blur-sm border-slate-800/50 border-b">
      <div class="mx-auto px-6 py-4 max-w-7xl">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="flex justify-center items-center rounded-xl w-10 h-10" style="background: linear-gradient(135deg, #34d399 0%, #06b6d4 100%);">
              <span class="font-bold text-slate-950 text-lg">F</span>
            </div>
            <div>
              <h1 class="font-semibold text-white text-xl tracking-tight">Budgets</h1>
              <p class="text-slate-500 text-xs">Gérez vos limites de dépenses mensuelles</p>
            </div>
          </div>
          <Button 
            @click="openModal()"
            class="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-medium"
          >
            <Plus class="w-4 h-4 mr-2" />
            Nouveau budget
          </Button>
        </div>
      </div>
    </header>

    <main class="space-y-6 mx-auto py-8 pr-6 pl-20 max-w-7xl">
      <!-- Stats Overview -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card class="bg-slate-900/50 backdrop-blur border-slate-800/50">
          <CardContent class="pt-5 pb-5">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <PieChart class="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p class="text-slate-400 text-xs">Budget total</p>
                <p class="font-semibold text-white text-lg">{{ formatAmount(totalBudget) }}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card class="bg-slate-900/50 backdrop-blur border-slate-800/50">
          <CardContent class="pt-5 pb-5">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <TrendingDown class="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <p class="text-slate-400 text-xs">Dépensé</p>
                <p class="font-semibold text-rose-400 text-lg">{{ formatAmount(totalSpent) }}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card class="bg-slate-900/50 backdrop-blur border-slate-800/50">
          <CardContent class="pt-5 pb-5">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp class="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p class="text-slate-400 text-xs">Restant</p>
                <p class="font-semibold text-emerald-400 text-lg">{{ formatAmount(totalRemaining) }}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card class="bg-slate-900/50 backdrop-blur border-slate-800/50">
          <CardContent class="pt-5 pb-5">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle class="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p class="text-slate-400 text-xs">Alertes</p>
                <p class="font-semibold text-white text-lg">
                  <span v-if="budgetsExceeded > 0" class="text-rose-400">{{ budgetsExceeded }} dépassé{{ budgetsExceeded > 1 ? 's' : '' }}</span>
                  <span v-else-if="budgetsWarning > 0" class="text-amber-400">{{ budgetsWarning }} attention</span>
                  <span v-else class="text-emerald-400">Tout va bien</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Budget Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card 
          v-for="budget in budgets" 
          :key="budget.id"
          :class="[
            'bg-slate-900/50 backdrop-blur border-slate-800/50 overflow-hidden transition-all hover:border-slate-700/50',
            getStatus(budget) === 'exceeded' ? 'ring-1 ring-rose-500/30' : '',
            getStatus(budget) === 'warning' ? 'ring-1 ring-amber-500/30' : ''
          ]"
        >
          <CardContent class="pt-5">
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center gap-3">
                <div :class="['w-10 h-10 rounded-xl flex items-center justify-center', getColorClasses(budget.color, 'bg-light')]">
                  <component :is="iconComponents[budget.icon]" :class="['w-5 h-5', getColorClasses(budget.color, 'text')]" />
                </div>
                <div>
                  <h3 class="font-medium text-white">{{ budget.name }}</h3>
                  <p class="text-slate-500 text-xs">{{ formatAmount(budget.spent) }} / {{ formatAmount(budget.limit) }}</p>
                </div>
              </div>
              <div class="flex items-center gap-1">
                <button 
                  @click="openModal(budget)"
                  class="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <Pencil class="w-4 h-4" />
                </button>
                <button 
                  @click="deleteBudget(budget.id)"
                  class="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="space-y-2">
              <div class="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  :class="[
                    'h-full rounded-full transition-all duration-500',
                    getStatus(budget) === 'exceeded' ? 'bg-rose-500' : 
                    getStatus(budget) === 'warning' ? 'bg-amber-500' : 
                    getColorClasses(budget.color, 'bg')
                  ]"
                  :style="{ width: `${getPercentage(budget)}%` }"
                />
              </div>
              <div class="flex items-center justify-between text-xs">
                <span :class="[
                  getStatus(budget) === 'exceeded' ? 'text-rose-400' : 
                  getStatus(budget) === 'warning' ? 'text-amber-400' : 
                  'text-slate-400'
                ]">
                  {{ getPercentage(budget).toFixed(0) }}% utilisé
                </span>
                <span class="text-slate-500">
                  Reste {{ formatAmount(Math.max(0, budget.limit - budget.spent)) }}
                </span>
              </div>
            </div>

            <!-- Status Badge -->
            <div class="mt-4 pt-4 border-t border-slate-800/50">
              <div v-if="getStatus(budget) === 'exceeded'" class="flex items-center gap-2 text-rose-400 text-sm">
                <AlertTriangle class="w-4 h-4" />
                <span>Budget dépassé de {{ formatAmount(budget.spent - budget.limit) }}</span>
              </div>
              <div v-else-if="getStatus(budget) === 'warning'" class="flex items-center gap-2 text-amber-400 text-sm">
                <AlertTriangle class="w-4 h-4" />
                <span>Attention, plus que {{ formatAmount(budget.limit - budget.spent) }}</span>
              </div>
              <div v-else class="flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle2 class="w-4 h-4" />
                <span>Dans les limites</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Add New Budget Card -->
        <Card 
          @click="openModal()"
          class="bg-slate-900/30 border-slate-800/50 border-dashed cursor-pointer hover:border-cyan-500/50 hover:bg-slate-900/50 transition-all group"
        >
          <CardContent class="pt-5 h-full flex flex-col items-center justify-center min-h-[200px]">
            <div class="w-12 h-12 rounded-xl bg-slate-800/50 group-hover:bg-cyan-500/10 flex items-center justify-center mb-3 transition-colors">
              <Plus class="w-6 h-6 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </div>
            <p class="text-slate-500 group-hover:text-slate-300 font-medium transition-colors">Ajouter un budget</p>
            <p class="text-slate-600 text-sm mt-1">Définir une nouvelle catégorie</p>
          </CardContent>
        </Card>
      </div>

      <!-- Monthly Overview Chart -->
      <Card class="bg-slate-900/50 backdrop-blur border-slate-800/50">
        <CardHeader>
          <CardTitle class="text-white flex items-center gap-2 text-base">
            <PieChart class="w-5 h-5 text-cyan-400" />
            Répartition du budget mensuel
          </CardTitle>
          <CardDescription class="text-slate-400">
            Visualisez comment votre budget est réparti entre les catégories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div 
              v-for="budget in budgets" 
              :key="budget.id"
              class="text-center"
            >
              <div class="relative w-20 h-20 mx-auto mb-2">
                <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    stroke-width="8"
                    fill="none"
                    class="text-slate-800"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    :stroke="getStatus(budget) === 'exceeded' ? '#f43f5e' : getStatus(budget) === 'warning' ? '#f59e0b' : 'currentColor'"
                    stroke-width="8"
                    fill="none"
                    stroke-linecap="round"
                    :stroke-dasharray="`${getPercentage(budget) * 2.51} 251`"
                    :class="getColorClasses(budget.color, 'text')"
                  />
                </svg>
                <div class="absolute inset-0 flex items-center justify-center">
                  <span class="text-white font-semibold text-sm">{{ getPercentage(budget).toFixed(0) }}%</span>
                </div>
              </div>
              <p class="text-slate-300 text-sm font-medium">{{ budget.name }}</p>
              <p class="text-slate-500 text-xs">{{ formatAmount(budget.spent) }}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>

    <!-- Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div 
          v-if="isModalOpen" 
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <!-- Backdrop -->
          <div 
            class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            @click="closeModal"
          />
          
          <!-- Modal Content -->
          <div class="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-white text-lg font-semibold">
                {{ editingBudget ? 'Modifier le budget' : 'Nouveau budget' }}
              </h2>
              <button 
                @click="closeModal"
                class="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="space-y-4">
              <!-- Name -->
              <div>
                <label class="block text-slate-400 text-sm mb-2">Nom du budget</label>
                <input
                  v-model="newBudget.name"
                  type="text"
                  placeholder="Ex: Alimentation"
                  class="w-full h-10 bg-slate-800/50 border border-slate-700 rounded-lg px-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
                />
              </div>

              <!-- Limit -->
              <div>
                <label class="block text-slate-400 text-sm mb-2">Limite mensuelle (€)</label>
                <input
                  v-model.number="newBudget.limit"
                  type="number"
                  min="0"
                  step="10"
                  placeholder="400"
                  class="w-full h-10 bg-slate-800/50 border border-slate-700 rounded-lg px-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
                />
              </div>

              <!-- Icon Selection -->
              <div>
                <label class="block text-slate-400 text-sm mb-2">Icône</label>
                <div class="grid grid-cols-5 gap-2">
                  <button
                    v-for="icon in availableIcons"
                    :key="icon.name"
                    @click="newBudget.icon = icon.name"
                    :class="[
                      'p-2.5 rounded-lg border transition-all',
                      newBudget.icon === icon.name 
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' 
                        : 'border-slate-700 text-slate-500 hover:text-white hover:border-slate-600'
                    ]"
                  >
                    <component :is="iconComponents[icon.name]" class="w-5 h-5 mx-auto" />
                  </button>
                </div>
              </div>

              <!-- Color Selection -->
              <div>
                <label class="block text-slate-400 text-sm mb-2">Couleur</label>
                <div class="flex gap-2">
                  <button
                    v-for="color in availableColors"
                    :key="color.name"
                    @click="newBudget.color = color.name"
                    :class="[
                      'w-8 h-8 rounded-full transition-all',
                      color.class,
                      newBudget.color === color.name 
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' 
                        : 'opacity-50 hover:opacity-100'
                    ]"
                  />
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-3 mt-6">
              <Button 
                @click="closeModal"
                variant="outline"
                class="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Annuler
              </Button>
              <Button 
                @click="saveBudget"
                class="flex-1 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-medium"
                :disabled="!newBudget.name || newBudget.limit <= 0"
              >
                <Check class="w-4 h-4 mr-2" />
                {{ editingBudget ? 'Enregistrer' : 'Créer' }}
              </Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Floating Dock Navigation -->
    <FloatingDock />
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>

