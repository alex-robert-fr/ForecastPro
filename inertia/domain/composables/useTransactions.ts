import { ref, computed } from "vue";
import { transactionsApi, ApiError } from "~/infrastructure/api";
import type {
	Transaction,
	Account,
	CreateTransactionDto,
} from "~/domain/types/models";

/**
 * État global partagé pour les transactions
 */
const transactions = ref<Transaction[]>([]);
const account = ref<Account | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

/**
 * Composable métier pour les transactions
 * Couche Domain - contient la logique métier côté frontend
 */
export function useTransactions() {
	// ============================================================================
	// COMPUTED (Calculs métier)
	// ============================================================================

	/**
	 * Total des débits
	 */
	const totalDebits = computed(() =>
		transactions.value
			.filter((t) => t.type === "debit")
			.reduce((sum, t) => sum + Math.abs(t.amount), 0),
	);

	/**
	 * Total des crédits
	 */
	const totalCredits = computed(() =>
		transactions.value
			.filter((t) => t.type === "credit")
			.reduce((sum, t) => sum + t.amount, 0),
	);

	/**
	 * Solde du compte
	 */
	const balance = computed(() => account.value?.balance ?? 0);

	/**
	 * Transactions du mois courant
	 */
	const currentMonthTransactions = computed(() => {
		const now = new Date();
		return transactions.value.filter((t) => {
			const date = new Date(t.date);
			return (
				date.getMonth() === now.getMonth() &&
				date.getFullYear() === now.getFullYear()
			);
		});
	});

	/**
	 * Revenus du mois courant
	 */
	const monthlyIncome = computed(() =>
		currentMonthTransactions.value
			.filter((t) => t.type === "credit")
			.reduce((sum, t) => sum + t.amount, 0),
	);

	/**
	 * Dépenses du mois courant
	 */
	const monthlyExpenses = computed(() =>
		currentMonthTransactions.value
			.filter((t) => t.type === "debit")
			.reduce((sum, t) => sum + Math.abs(t.amount), 0),
	);

	/**
	 * Taux d'épargne du mois courant
	 */
	const savingsRate = computed(() => {
		if (monthlyIncome.value <= 0) return 0;
		const savings = monthlyIncome.value - monthlyExpenses.value;
		return Math.max(0, (savings / monthlyIncome.value) * 100);
	});

	/**
	 * Nombre de transactions non catégorisées (débits uniquement)
	 */
	const uncategorizedCount = computed(
		() =>
			transactions.value.filter((t) => t.type === "debit" && !t.category)
				.length,
	);

	// ============================================================================
	// ACTIONS
	// ============================================================================

	/**
	 * Charge les transactions depuis l'API
	 */
	async function load(): Promise<void> {
		if (typeof window === "undefined") return;

		isLoading.value = true;
		error.value = null;

		try {
			const data = await transactionsApi.getAll();
			transactions.value = data.transactions || [];
			account.value = data.account || null;
		} catch (e) {
			error.value = e instanceof ApiError ? e.message : "Erreur de chargement";
			console.error("Erreur chargement transactions:", e);
		} finally {
			isLoading.value = false;
		}
	}

	/**
	 * Crée une nouvelle transaction
	 */
	async function create(data: CreateTransactionDto): Promise<Transaction> {
		const result = await transactionsApi.create(data);

		// Recharger les transactions pour avoir l'état à jour
		await load();

		return result.transaction;
	}

	/**
	 * Supprime une transaction
	 */
	async function remove(id: number): Promise<void> {
		await transactionsApi.delete(id);

		// Supprimer localement pour un feedback immédiat
		transactions.value = transactions.value.filter((t) => t.id !== id);

		// Recharger pour avoir le solde à jour
		await load();
	}

	/**
	 * Met à jour la catégorie d'une transaction
	 */
	async function updateCategory(
		id: number,
		category: string | null,
	): Promise<void> {
		const result = await transactionsApi.updateCategory(id, category);

		// Mettre à jour localement
		const index = transactions.value.findIndex((t) => t.id === id);
		if (index !== -1) {
			transactions.value[index] = result.transaction;
		}
	}

	/**
	 * Importe un fichier CSV
	 */
	async function importCsv(file: File): Promise<{
		imported: number;
		skipped: number;
		errors: string[];
	}> {
		const result = await transactionsApi.importCsv(file);

		// Recharger les transactions
		await load();

		return {
			imported: result.rowsImported,
			skipped: result.rowsSkipped,
			errors: result.parsingErrors,
		};
	}

	/**
	 * Filtre les transactions selon des critères
	 */
	function filter(criteria: {
		type?: "all" | "credit" | "debit";
		category?: string;
		search?: string;
	}): Transaction[] {
		return transactions.value.filter((t) => {
			// Filtre par type
			if (
				criteria.type &&
				criteria.type !== "all" &&
				t.type !== criteria.type
			) {
				return false;
			}

			// Filtre par catégorie
			if (criteria.category) {
				if (criteria.category === "uncategorized") {
					if (t.category) return false;
				} else if (t.category !== criteria.category) {
					return false;
				}
			}

			// Filtre par recherche
			if (criteria.search) {
				const search = criteria.search.toLowerCase();
				const matchesLabel = t.label.toLowerCase().includes(search);
				const matchesMerchant = t.merchant?.toLowerCase().includes(search);
				if (!matchesLabel && !matchesMerchant) return false;
			}

			return true;
		});
	}

	/**
	 * Réinitialise l'état
	 */
	function reset(): void {
		transactions.value = [];
		account.value = null;
		error.value = null;
	}

	// ============================================================================
	// RETOUR
	// ============================================================================

	return {
		// État
		transactions: computed(() => transactions.value),
		account: computed(() => account.value),
		isLoading: computed(() => isLoading.value),
		error: computed(() => error.value),

		// Computed
		totalDebits,
		totalCredits,
		balance,
		currentMonthTransactions,
		monthlyIncome,
		monthlyExpenses,
		savingsRate,
		uncategorizedCount,

		// Actions
		load,
		create,
		remove,
		updateCategory,
		importCsv,
		filter,
		reset,
	};
}
