import { apiClient } from "./api_client";
import type {
	TinkAccount,
	BankConnectionResponse,
} from "~/domain/types/models";

/**
 * Réponse d'initiation de connexion
 */
interface InitConnectionResponse {
	authUrl: string;
	state: string;
	redirectUri: string;
	message: string;
}

/**
 * Réponse de synchronisation
 */
interface SyncResponse {
	count: number;
	transactions: Array<{
		externalId: string;
		date: string;
		amount: number;
		description: string;
		type: "credit" | "debit";
	}>;
}

/**
 * Réponse de déconnexion
 */
interface DisconnectResponse {
	deletedTransactions: number;
	newBalance: number;
}

/**
 * API pour les connexions bancaires (Tink)
 * Couche Infrastructure
 */
export const bankConnectionsApi = {
	/**
	 * Initie une connexion bancaire
	 */
	initiate(): Promise<InitConnectionResponse> {
		return apiClient.post("/bank-connections");
	},

	/**
	 * Échange le code contre un token et importe les transactions
	 */
	exchangeToken(code: string): Promise<BankConnectionResponse> {
		return apiClient.post("/tink/token", { code });
	},

	/**
	 * Récupère les comptes Tink
	 */
	getAccounts(accessToken: string): Promise<{ accounts: TinkAccount[] }> {
		return apiClient.request("/tink/accounts", {
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});
	},

	/**
	 * Synchronise les transactions
	 */
	sync(accessToken: string, accountId?: string): Promise<SyncResponse> {
		return apiClient.post("/bank-connections/sync", { accessToken, accountId });
	},

	/**
	 * Déconnecte le compte bancaire
	 */
	disconnect(): Promise<DisconnectResponse> {
		return apiClient.delete("/bank-connections/disconnect");
	},

	/**
	 * Liste les connexions
	 */
	list(): Promise<{ connections: unknown[] }> {
		return apiClient.get("/bank-connections");
	},
};
