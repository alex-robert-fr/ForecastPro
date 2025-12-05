import { apiClient } from "./api_client";
import type {
	Transaction,
	Account,
	CreateTransactionDto,
	TransactionsResponse,
	CreateTransactionResponse,
	ImportResponse,
} from "~/domain/types/models";

/**
 * API pour les transactions
 * Couche Infrastructure
 */
export const transactionsApi = {
	/**
	 * Récupère la liste des transactions
	 */
	getAll(): Promise<TransactionsResponse> {
		return apiClient.get("/transactions");
	},

	/**
	 * Récupère une transaction par son ID
	 */
	getById(id: number): Promise<{ transaction: Transaction }> {
		return apiClient.get(`/transactions/${id}`);
	},

	/**
	 * Crée une nouvelle transaction
	 */
	create(data: CreateTransactionDto): Promise<CreateTransactionResponse> {
		return apiClient.post("/transactions", data);
	},

	/**
	 * Met à jour la catégorie d'une transaction
	 */
	updateCategory(
		id: number,
		category: string | null,
	): Promise<{ transaction: Transaction }> {
		return apiClient.patch(`/transactions/${id}/category`, { category });
	},

	/**
	 * Supprime une transaction
	 */
	delete(id: number): Promise<{ account: { id: number; balance: number } }> {
		return apiClient.delete(`/transactions/${id}`);
	},

	/**
	 * Importe un fichier CSV
	 */
	importCsv(file: File): Promise<ImportResponse> {
		return apiClient.upload("/import", file, "csv");
	},
};
