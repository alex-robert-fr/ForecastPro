import { apiClient } from "./api_client";
import type { Account, UpdateSettingsDto } from "~/domain/types/models";

/**
 * Réponse de mise à jour des paramètres
 */
interface UpdateSettingsResponse {
	account: {
		id: number;
		initialBalance: number;
		balance: number;
	};
}

/**
 * Statistiques du compte
 */
interface AccountStatsResponse {
	account: {
		id: number;
		name: string;
		balance: number;
	};
	stats: {
		balance: number;
		initialBalance: number;
		totalCredits: number;
		totalDebits: number;
		transactionCount: number;
	};
	monthly: {
		income: number;
		expenses: number;
		savings: number;
		savingsRate: number;
	};
}

/**
 * API pour les comptes
 * Couche Infrastructure
 */
export const accountsApi = {
	/**
	 * Met à jour les paramètres du compte
	 */
	updateSettings(data: UpdateSettingsDto): Promise<UpdateSettingsResponse> {
		return apiClient.put("/settings", data);
	},

	/**
	 * Récupère les statistiques du compte
	 */
	getStats(): Promise<AccountStatsResponse> {
		return apiClient.get("/accounts/stats");
	},
};
