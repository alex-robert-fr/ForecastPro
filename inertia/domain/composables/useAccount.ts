import { ref, computed } from "vue";
import { accountsApi, ApiError } from "~/infrastructure/api";
import type { Account, UpdateSettingsDto } from "~/domain/types/models";

/**
 * État global du compte
 */
const account = ref<Account | null>(null);
const stats = ref<{
	balance: number;
	initialBalance: number;
	totalCredits: number;
	totalDebits: number;
	transactionCount: number;
} | null>(null);
const monthlyStats = ref<{
	income: number;
	expenses: number;
	savings: number;
	savingsRate: number;
} | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

/**
 * Composable métier pour la gestion du compte
 * Couche Domain
 */
export function useAccount() {
	// ============================================================================
	// COMPUTED
	// ============================================================================

	const balance = computed(() => account.value?.balance ?? 0);
	const initialBalance = computed(() => account.value?.initialBalance ?? 0);

	// ============================================================================
	// ACTIONS
	// ============================================================================

	/**
	 * Charge les statistiques du compte
	 */
	async function loadStats(): Promise<void> {
		if (typeof window === "undefined") return;

		isLoading.value = true;
		error.value = null;

		try {
			const data = await accountsApi.getStats();
			account.value = data.account as Account;
			stats.value = data.stats;
			monthlyStats.value = data.monthly;
		} catch (e) {
			error.value = e instanceof ApiError ? e.message : "Erreur de chargement";
			console.error("Erreur chargement stats:", e);
		} finally {
			isLoading.value = false;
		}
	}

	/**
	 * Met à jour les paramètres du compte
	 */
	async function updateSettings(data: UpdateSettingsDto): Promise<void> {
		isLoading.value = true;
		error.value = null;

		try {
			const result = await accountsApi.updateSettings(data);

			// Mettre à jour l'état local
			if (account.value) {
				account.value.initialBalance = result.account.initialBalance;
				account.value.balance = result.account.balance;
			}
		} catch (e) {
			error.value = e instanceof ApiError ? e.message : "Erreur de mise à jour";
			throw e;
		} finally {
			isLoading.value = false;
		}
	}

	/**
	 * Met à jour le solde initial
	 */
	async function updateInitialBalance(value: number): Promise<void> {
		return updateSettings({ initialBalance: value });
	}

	// ============================================================================
	// RETOUR
	// ============================================================================

	return {
		// État
		account: computed(() => account.value),
		stats: computed(() => stats.value),
		monthlyStats: computed(() => monthlyStats.value),
		isLoading: computed(() => isLoading.value),
		error: computed(() => error.value),

		// Computed
		balance,
		initialBalance,

		// Actions
		loadStats,
		updateSettings,
		updateInitialBalance,
	};
}
