<script setup lang="ts">
import { Head, Link } from "@inertiajs/vue3";
import { ref, computed, onMounted, watch } from "vue";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
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
	Check,
	Tag,
} from "lucide-vue-next";
import FloatingDock from "~/components/FloatingDock.vue";
import { useCategoryRules } from "~/composables/useCategoryRules";

const { categories, initialize, getCategoryForTransaction } =
	useCategoryRules();

interface Budget {
	id: string;
	name: string;
	category: string;
	limit: number;
	spent: number;
	color: string;
	icon: string;
}

interface Transaction {
	id: number;
	date: string;
	label: string;
	amount: number;
	type: "debit" | "credit";
	merchant: string | null;
}

// Budgets basés sur les catégories du composable
const budgetLimits = ref<Record<string, number>>({});
const BUDGET_STORAGE_KEY = "forecastpro_budget_limits";

// Charger les limites de budget depuis localStorage
const loadBudgetLimits = () => {
	if (typeof window === "undefined") return;
	try {
		const stored = localStorage.getItem(BUDGET_STORAGE_KEY);
		if (stored) {
			budgetLimits.value = JSON.parse(stored);
		}
	} catch (error) {
		console.error("Erreur lors du chargement des limites:", error);
	}
};

// Sauvegarder les limites
const saveBudgetLimits = () => {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(
			BUDGET_STORAGE_KEY,
			JSON.stringify(budgetLimits.value),
		);
	} catch (error) {
		console.error("Erreur lors de la sauvegarde des limites:", error);
	}
};

// Budgets calculés à partir des catégories et des limites
const budgets = computed(() => {
	return categories.value
		.filter((cat) => cat.id !== "income") // Exclure les revenus
		.map((cat) => ({
			id: cat.id,
			name: cat.name,
			category: cat.id,
			limit: budgetLimits.value[cat.id] || 0,
			spent: spentByCategory.value[cat.id] || 0,
			color: cat.color,
			icon: cat.icon,
		}))
		.filter((b) => b.limit > 0 || b.spent > 0); // Afficher seulement si limite définie ou dépenses
});

const transactions = ref<Transaction[]>([]);
const spentByCategory = ref<Record<string, number>>({});
const isModalOpen = ref(false);
const editingBudget = ref<Budget | null>(null);
const selectedCategoryId = ref("");
const newLimit = ref(0);

const availableColors = [
	{ name: "emerald", class: "bg-emerald-500" },
	{ name: "cyan", class: "bg-cyan-500" },
	{ name: "blue", class: "bg-blue-500" },
	{ name: "violet", class: "bg-violet-500" },
	{ name: "pink", class: "bg-pink-500" },
	{ name: "amber", class: "bg-amber-500" },
	{ name: "rose", class: "bg-rose-500" },
	{ name: "orange", class: "bg-orange-500" },
];

const availableIcons = [
	{ name: "utensils", label: "Alimentation" },
	{ name: "car", label: "Transport" },
	{ name: "shopping", label: "Shopping" },
	{ name: "home", label: "Logement" },
	{ name: "zap", label: "Énergie" },
	{ name: "smartphone", label: "Tech" },
	{ name: "heart", label: "Santé" },
	{ name: "gamepad", label: "Loisirs" },
	{ name: "graduation", label: "Éducation" },
	{ name: "more", label: "Autre" },
];

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
};

const formatAmount = (amount: number) => {
	return new Intl.NumberFormat("fr-FR", {
		style: "currency",
		currency: "EUR",
	}).format(amount);
};

const getColorClasses = (
	color: string,
	type: "bg" | "text" | "border" | "bg-light",
) => {
	const colors: Record<string, Record<string, string>> = {
		emerald: {
			bg: "bg-emerald-500",
			text: "text-emerald-400",
			border: "border-emerald-500/30",
			"bg-light": "bg-emerald-500/10",
		},
		cyan: {
			bg: "bg-cyan-500",
			text: "text-cyan-400",
			border: "border-cyan-500/30",
			"bg-light": "bg-cyan-500/10",
		},
		blue: {
			bg: "bg-blue-500",
			text: "text-blue-400",
			border: "border-blue-500/30",
			"bg-light": "bg-blue-500/10",
		},
		violet: {
			bg: "bg-violet-500",
			text: "text-violet-400",
			border: "border-violet-500/30",
			"bg-light": "bg-violet-500/10",
		},
		pink: {
			bg: "bg-pink-500",
			text: "text-pink-400",
			border: "border-pink-500/30",
			"bg-light": "bg-pink-500/10",
		},
		amber: {
			bg: "bg-amber-500",
			text: "text-amber-400",
			border: "border-amber-500/30",
			"bg-light": "bg-amber-500/10",
		},
		rose: {
			bg: "bg-rose-500",
			text: "text-rose-400",
			border: "border-rose-500/30",
			"bg-light": "bg-rose-500/10",
		},
		orange: {
			bg: "bg-orange-500",
			text: "text-orange-400",
			border: "border-orange-500/30",
			"bg-light": "bg-orange-500/10",
		},
	};
	return colors[color]?.[type] || colors.emerald[type];
};

const getPercentage = (budget: Budget) => {
	if (budget.limit === 0) return 0;
	return Math.min((budget.spent / budget.limit) * 100, 100);
};

const getStatus = (budget: Budget) => {
	const percentage = getPercentage(budget);
	if (percentage >= 100) return "exceeded";
	if (percentage >= 80) return "warning";
	return "ok";
};

const totalBudget = computed(() =>
	budgets.value.reduce((sum, b) => sum + b.limit, 0),
);
const totalSpent = computed(() =>
	budgets.value.reduce((sum, b) => sum + b.spent, 0),
);
const totalRemaining = computed(() => totalBudget.value - totalSpent.value);

const budgetsExceeded = computed(
	() => budgets.value.filter((b) => getStatus(b) === "exceeded").length,
);
const budgetsWarning = computed(
	() => budgets.value.filter((b) => getStatus(b) === "warning").length,
);

// Calculer les dépenses par catégorie en utilisant les règles
const calculateSpentAmounts = () => {
	const spent: Record<string, number> = {};

	// Calculer les dépenses du mois en cours
	const now = new Date();
	const currentMonthTransactions = transactions.value.filter((t) => {
		const date = new Date(t.date);
		return (
			date.getMonth() === now.getMonth() &&
			date.getFullYear() === now.getFullYear() &&
			t.type === "debit"
		);
	});

	currentMonthTransactions.forEach((t) => {
		const category = getCategoryForTransaction(t.label);
		if (category) {
			spent[category.id] = (spent[category.id] || 0) + Math.abs(t.amount);
		}
	});

	spentByCategory.value = spent;
};

// Nombre de transactions non catégorisées
const uncategorizedCount = computed(() => {
	const now = new Date();
	return transactions.value.filter((t) => {
		const date = new Date(t.date);
		return (
			date.getMonth() === now.getMonth() &&
			date.getFullYear() === now.getFullYear() &&
			t.type === "debit" &&
			!getCategoryForTransaction(t.label)
		);
	}).length;
});

const uncategorizedAmount = computed(() => {
	const now = new Date();
	return transactions.value
		.filter((t) => {
			const date = new Date(t.date);
			return (
				date.getMonth() === now.getMonth() &&
				date.getFullYear() === now.getFullYear() &&
				t.type === "debit" &&
				!getCategoryForTransaction(t.label)
			);
		})
		.reduce((sum, t) => sum + Math.abs(t.amount), 0);
});

const loadTransactions = async () => {
	if (typeof window === "undefined") return;

	try {
		const response = await fetch("/api/transactions");
		const data = await response.json();
		// Le nouveau format API encapsule dans data.data
		const result = data.data || data;
		transactions.value = result.transactions || [];
		calculateSpentAmounts();
	} catch (error) {
		console.error("Erreur lors du chargement des transactions:", error);
	}
};

const openModal = (budget?: Budget) => {
	if (budget) {
		editingBudget.value = budget;
		selectedCategoryId.value = budget.category;
		newLimit.value = budget.limit;
	} else {
		editingBudget.value = null;
		selectedCategoryId.value = "";
		newLimit.value = 0;
	}
	isModalOpen.value = true;
};

const closeModal = () => {
	isModalOpen.value = false;
	editingBudget.value = null;
	selectedCategoryId.value = "";
	newLimit.value = 0;
};

const saveBudget = () => {
	const categoryId = editingBudget.value?.category || selectedCategoryId.value;
	if (!categoryId || newLimit.value < 0) return;

	budgetLimits.value[categoryId] = newLimit.value;
	saveBudgetLimits();

	closeModal();
};

const deleteBudget = (id: string) => {
	delete budgetLimits.value[id];
	saveBudgetLimits();
};

// Catégories disponibles pour ajouter un budget (celles qui n'ont pas encore de limite)
const availableCategoriesForBudget = computed(() => {
	return categories.value.filter(
		(cat) => cat.id !== "income" && !budgetLimits.value[cat.id],
	);
});

onMounted(() => {
	initialize();
	loadBudgetLimits();
	loadTransactions();
});

// Recalculer quand les catégories changent
watch(
	categories,
	() => {
		calculateSpentAmounts();
	},
	{ deep: true },
);
</script>

<template>
  <Head title="ForecastPro - Budgets" />

  <div class="bg-slate-950 min-h-screen">
    <!-- Header -->
    <header class="bg-slate-900/30 backdrop-blur-sm border-slate-800/50 border-b">
      <div class="mx-auto px-6 py-4 max-w-7xl">
        <div class="flex justify-between items-center">
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
            class="bg-cyan-500 hover:bg-cyan-600 font-medium text-slate-950"
          >
            <Plus class="mr-2 w-4 h-4" />
            Nouveau budget
          </Button>
        </div>
      </div>
    </header>

    <main class="space-y-6 mx-auto py-8 pr-6 pl-20 max-w-7xl">
      <!-- Uncategorized Warning -->
      <Card v-if="uncategorizedCount > 0" class="bg-amber-500/5 border-amber-500/20">
        <CardContent class="py-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-3">
              <div class="flex justify-center items-center bg-amber-500/10 rounded-xl w-10 h-10">
                <Tag class="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p class="font-medium text-amber-300">{{ uncategorizedCount }} transaction{{ uncategorizedCount > 1 ? 's' : '' }} non catégorisée{{ uncategorizedCount > 1 ? 's' : '' }}</p>
                <p class="text-slate-400 text-sm">{{ formatAmount(uncategorizedAmount) }} de dépenses ne sont pas comptabilisées dans vos budgets du mois</p>
              </div>
            </div>
            <Link 
              href="/transactions?filter=uncategorized"
              class="bg-amber-500/20 hover:bg-amber-500/30 px-4 py-2 rounded-lg font-medium text-amber-400 text-sm transition-colors"
            >
              Catégoriser
            </Link>
          </div>
        </CardContent>
      </Card>

      <!-- Stats Overview -->
      <div class="gap-4 grid grid-cols-1 md:grid-cols-4">
        <Card class="bg-slate-900/50 backdrop-blur border-slate-800/50">
          <CardContent class="pt-5 pb-5">
            <div class="flex items-center gap-3">
              <div class="flex justify-center items-center bg-cyan-500/10 rounded-xl w-10 h-10">
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
              <div class="flex justify-center items-center bg-rose-500/10 rounded-xl w-10 h-10">
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
              <div class="flex justify-center items-center bg-emerald-500/10 rounded-xl w-10 h-10">
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
              <div class="flex justify-center items-center bg-amber-500/10 rounded-xl w-10 h-10">
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
      <div class="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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
            <div class="flex justify-between items-start mb-4">
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
                  class="hover:bg-slate-800 p-1.5 rounded-lg text-slate-500 hover:text-white transition-colors"
                >
                  <Pencil class="w-4 h-4" />
                </button>
                <button 
                  @click="deleteBudget(budget.id)"
                  class="hover:bg-rose-500/10 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="space-y-2">
              <div class="bg-slate-800 rounded-full h-2 overflow-hidden">
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
              <div class="flex justify-between items-center text-xs">
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
            <div class="mt-4 pt-4 border-slate-800/50 border-t">
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
          class="group bg-slate-900/30 hover:bg-slate-900/50 border-slate-800/50 hover:border-cyan-500/50 border-dashed transition-all cursor-pointer"
        >
          <CardContent class="flex flex-col justify-center items-center pt-5 h-full min-h-[200px]">
            <div class="flex justify-center items-center bg-slate-800/50 group-hover:bg-cyan-500/10 mb-3 rounded-xl w-12 h-12 transition-colors">
              <Plus class="w-6 h-6 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </div>
            <p class="font-medium text-slate-500 group-hover:text-slate-300 transition-colors">Ajouter un budget</p>
            <p class="mt-1 text-slate-600 text-sm">Définir une nouvelle catégorie</p>
          </CardContent>
        </Card>
      </div>

      <!-- Monthly Overview Chart -->
      <Card class="bg-slate-900/50 backdrop-blur border-slate-800/50">
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-white text-base">
            <PieChart class="w-5 h-5 text-cyan-400" />
            Répartition du budget mensuel
          </CardTitle>
          <CardDescription class="text-slate-400">
            Visualisez comment votre budget est réparti entre les catégories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="gap-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <div 
              v-for="budget in budgets" 
              :key="budget.id"
              class="text-center"
            >
              <div class="relative mx-auto mb-2 w-20 h-20">
                <svg class="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
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
                <div class="absolute inset-0 flex justify-center items-center">
                  <span class="font-semibold text-white text-sm">{{ getPercentage(budget).toFixed(0) }}%</span>
                </div>
              </div>
              <p class="font-medium text-slate-300 text-sm">{{ budget.name }}</p>
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
          class="z-50 fixed inset-0 flex justify-center items-center p-4"
        >
          <!-- Backdrop -->
          <div 
            class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            @click="closeModal"
          />
          
          <!-- Modal Content -->
          <div class="relative bg-slate-900 shadow-2xl p-6 border border-slate-800 rounded-2xl w-full max-w-md">
            <div class="flex justify-between items-center mb-6">
              <h2 class="font-semibold text-white text-lg">
                {{ editingBudget ? 'Modifier le budget' : 'Nouveau budget' }}
              </h2>
              <button 
                @click="closeModal"
                class="hover:bg-slate-800 p-1.5 rounded-lg text-slate-500 hover:text-white transition-colors"
              >
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="space-y-4">
              <!-- Category Selection (only for new budget) -->
              <div v-if="!editingBudget">
                <label class="block mb-2 text-slate-400 text-sm">Catégorie</label>
                <div class="gap-2 grid grid-cols-2">
                  <button
                    v-for="cat in availableCategoriesForBudget"
                    :key="cat.id"
                    @click="selectedCategoryId = cat.id"
                    :class="[
                      'flex items-center gap-2 p-3 rounded-lg border transition-all text-left',
                      selectedCategoryId === cat.id 
                        ? 'border-cyan-500 bg-cyan-500/10' 
                        : 'border-slate-700 hover:border-slate-600'
                    ]"
                  >
                    <div :class="['w-8 h-8 rounded-lg flex items-center justify-center', getColorClasses(cat.color, 'bg-light')]">
                      <component :is="iconComponents[cat.icon] || MoreHorizontal" :class="['w-4 h-4', getColorClasses(cat.color, 'text')]" />
                    </div>
                    <span :class="selectedCategoryId === cat.id ? 'text-white' : 'text-slate-300'" class="font-medium text-sm">{{ cat.name }}</span>
                  </button>
                </div>
                <p v-if="availableCategoriesForBudget.length === 0" class="py-4 text-slate-500 text-sm text-center">
                  Toutes les catégories ont déjà un budget défini
                </p>
              </div>

              <!-- Category info (for editing) -->
              <div v-else class="bg-slate-800/50 p-4 rounded-xl">
                <div class="flex items-center gap-3">
                  <div :class="['w-10 h-10 rounded-lg flex items-center justify-center', getColorClasses(editingBudget.color, 'bg-light')]">
                    <component :is="iconComponents[editingBudget.icon] || MoreHorizontal" :class="['w-5 h-5', getColorClasses(editingBudget.color, 'text')]" />
                  </div>
                  <div>
                    <p class="font-medium text-white">{{ editingBudget.name }}</p>
                    <p class="text-slate-500 text-xs">Dépensé ce mois : {{ formatAmount(editingBudget.spent) }}</p>
                  </div>
                </div>
              </div>

              <!-- Limit -->
              <div>
                <label class="block mb-2 text-slate-400 text-sm">Limite mensuelle (€)</label>
                <input
                  v-model.number="newLimit"
                  type="number"
                  min="0"
                  step="10"
                  placeholder="400"
                  class="bg-slate-800/50 px-4 border border-slate-700 focus:border-cyan-500/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500/50 w-full h-10 text-white transition-colors placeholder-slate-500"
                />
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-3 mt-6">
              <Button 
                @click="closeModal"
                variant="outline"
                class="flex-1 hover:bg-slate-800 border-slate-700 text-slate-300"
              >
                Annuler
              </Button>
              <Button 
                @click="saveBudget"
                class="flex-1 bg-cyan-500 hover:bg-cyan-600 font-medium text-slate-950"
                :disabled="(!editingBudget && !selectedCategoryId) || newLimit <= 0"
              >
                <Check class="mr-2 w-4 h-4" />
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

