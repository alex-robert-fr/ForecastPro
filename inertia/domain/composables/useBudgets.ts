import { ref, computed, watch } from "vue";
import { useCategoryRules } from "~/composables/useCategoryRules";
import { useTransactions } from "./useTransactions";
import type { Budget, Category, Transaction } from "~/domain/types/models";

const BUDGET_STORAGE_KEY = "forecastpro_budget_limits";

/**
 * État global des budgets
 */
const budgetLimits = ref<Record<string, number>>({});
const isInitialized = ref(false);

/**
 * Composable métier pour les budgets
 * Couche Domain
 */
export function useBudgets() {
	const {
		categories,
		initialize: initCategories,
		getCategoryForTransaction,
	} = useCategoryRules();
	const {
		transactions,
		currentMonthTransactions,
		load: loadTransactions,
	} = useTransactions();

	// ============================================================================
	// STORAGE
	// ============================================================================

	/**
	 * Charge les limites depuis localStorage
	 */
	function loadFromStorage(): void {
		if (typeof window === "undefined") return;

		try {
			const stored = localStorage.getItem(BUDGET_STORAGE_KEY);
			if (stored) {
				budgetLimits.value = JSON.parse(stored);
			}
		} catch (error) {
			console.error("Erreur chargement budgets:", error);
		}
	}

	/**
	 * Sauvegarde les limites dans localStorage
	 */
	function saveToStorage(): void {
		if (typeof window === "undefined") return;

		try {
			localStorage.setItem(
				BUDGET_STORAGE_KEY,
				JSON.stringify(budgetLimits.value),
			);
		} catch (error) {
			console.error("Erreur sauvegarde budgets:", error);
		}
	}

	/**
	 * Initialise le composable
	 */
	function initialize(): void {
		if (isInitialized.value) return;

		initCategories();
		loadFromStorage();
		isInitialized.value = true;
	}

	// ============================================================================
	// COMPUTED
	// ============================================================================

	/**
	 * Dépenses par catégorie pour le mois courant
	 */
	const spentByCategory = computed(() => {
		const spent: Record<string, number> = {};

		currentMonthTransactions.value
			.filter((t) => t.type === "debit")
			.forEach((t) => {
				const category = getCategoryForTransaction(t.label);
				if (category) {
					spent[category.id] = (spent[category.id] || 0) + Math.abs(t.amount);
				}
			});

		return spent;
	});

	/**
	 * Liste des budgets avec leurs données calculées
	 */
	const budgets = computed<Budget[]>(() => {
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
			.filter((b) => b.limit > 0 || b.spent > 0); // Afficher si limite définie ou dépenses
	});

	/**
	 * Budget total
	 */
	const totalBudget = computed(() =>
		budgets.value.reduce((sum, b) => sum + b.limit, 0),
	);

	/**
	 * Total dépensé
	 */
	const totalSpent = computed(() =>
		budgets.value.reduce((sum, b) => sum + b.spent, 0),
	);

	/**
	 * Restant à dépenser
	 */
	const totalRemaining = computed(() => totalBudget.value - totalSpent.value);

	/**
	 * Nombre de budgets dépassés
	 */
	const budgetsExceeded = computed(
		() => budgets.value.filter((b) => b.limit > 0 && b.spent >= b.limit).length,
	);

	/**
	 * Nombre de budgets en alerte (>80%)
	 */
	const budgetsWarning = computed(
		() =>
			budgets.value.filter((b) => {
				if (b.limit === 0) return false;
				const percentage = (b.spent / b.limit) * 100;
				return percentage >= 80 && percentage < 100;
			}).length,
	);

	/**
	 * Catégories disponibles pour un nouveau budget
	 */
	const availableCategories = computed(() =>
		categories.value.filter(
			(cat) => cat.id !== "income" && !budgetLimits.value[cat.id],
		),
	);

	/**
	 * Montant non catégorisé ce mois
	 */
	const uncategorizedAmount = computed(() =>
		currentMonthTransactions.value
			.filter((t) => t.type === "debit" && !getCategoryForTransaction(t.label))
			.reduce((sum, t) => sum + Math.abs(t.amount), 0),
	);

	/**
	 * Nombre de transactions non catégorisées
	 */
	const uncategorizedCount = computed(
		() =>
			currentMonthTransactions.value.filter(
				(t) => t.type === "debit" && !getCategoryForTransaction(t.label),
			).length,
	);

	// ============================================================================
	// HELPERS
	// ============================================================================

	/**
	 * Calcule le pourcentage utilisé d'un budget
	 */
	function getPercentage(budget: Budget): number {
		if (budget.limit === 0) return 0;
		return Math.min((budget.spent / budget.limit) * 100, 100);
	}

	/**
	 * Retourne le statut d'un budget
	 */
	function getStatus(budget: Budget): "ok" | "warning" | "exceeded" {
		const percentage = getPercentage(budget);
		if (percentage >= 100) return "exceeded";
		if (percentage >= 80) return "warning";
		return "ok";
	}

	// ============================================================================
	// ACTIONS
	// ============================================================================

	/**
	 * Définit la limite d'un budget
	 */
	function setLimit(categoryId: string, limit: number): void {
		if (limit > 0) {
			budgetLimits.value[categoryId] = limit;
		} else {
			delete budgetLimits.value[categoryId];
		}
		saveToStorage();
	}

	/**
	 * Supprime un budget
	 */
	function removeBudget(categoryId: string): void {
		delete budgetLimits.value[categoryId];
		saveToStorage();
	}

	/**
	 * Recharge les données
	 */
	async function reload(): Promise<void> {
		await loadTransactions();
	}

	// ============================================================================
	// RETOUR
	// ============================================================================

	return {
		// État
		budgets,
		categories,
		isInitialized: computed(() => isInitialized.value),

		// Computed
		spentByCategory,
		totalBudget,
		totalSpent,
		totalRemaining,
		budgetsExceeded,
		budgetsWarning,
		availableCategories,
		uncategorizedAmount,
		uncategorizedCount,

		// Helpers
		getPercentage,
		getStatus,

		// Actions
		initialize,
		setLimit,
		removeBudget,
		reload,
	};
}
