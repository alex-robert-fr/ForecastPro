import TransactionRepository from "#infrastructure/repositories/transaction_repository";
import AccountRepository from "#infrastructure/repositories/account_repository";
import ImportBatchRepository from "#infrastructure/repositories/import_batch_repository";
import BalanceCalculator from "#domain/services/balance_calculator";
import { hashGenerator } from "#infrastructure/utils/hash_generator";
import type {
	CreateTransactionDto,
	ParsedTransactionData,
	ImportResult,
} from "#domain/types/index";
import Transaction from "#models/transaction";
import { DateTime } from "luxon";

/**
 * Erreur pour les transactions en doublon
 */
export class DuplicateTransactionError extends Error {
	constructor(message: string = "Transaction déjà existante") {
		super(message);
		this.name = "DuplicateTransactionError";
	}
}

/**
 * Service métier pour la gestion des transactions
 * Couche Domain - contient la logique métier
 */
export default class TransactionService {
	constructor(
		private transactionRepo: TransactionRepository,
		private accountRepo: AccountRepository,
		private importBatchRepo: ImportBatchRepository,
		private balanceCalculator: BalanceCalculator,
	) {}

	/**
	 * Récupère les transactions d'un compte
	 */
	async getByAccountId(
		accountId: number,
		limit?: number,
	): Promise<Transaction[]> {
		return this.transactionRepo.findByAccountId(accountId, { limit });
	}

	/**
	 * Récupère une transaction par son ID
	 */
	async getById(id: number): Promise<Transaction | null> {
		return this.transactionRepo.findById(id);
	}

	/**
	 * Crée une nouvelle transaction manuelle
	 */
	async create(
		accountId: number,
		data: CreateTransactionDto,
	): Promise<Transaction> {
		// Convertir la date
		const date =
			typeof data.date === "string" ? new Date(data.date) : data.date;

		// Calculer le montant avec le bon signe
		const amount =
			data.type === "credit" ? Math.abs(data.amount) : -Math.abs(data.amount);

		// Générer un hash unique
		const hash = hashGenerator.forManualTransaction(date, data.label, amount);

		// Vérifier si la transaction existe déjà
		const existing = await this.transactionRepo.findByHash(hash);
		if (existing) {
			throw new DuplicateTransactionError();
		}

		// Créer la transaction
		const transaction = await this.transactionRepo.create({
			accountId,
			date: DateTime.fromJSDate(date),
			label: data.label,
			amount,
			type: data.type,
			merchant: data.merchant ?? null,
			category: data.category ?? null,
			paymentMethod: data.paymentMethod ?? null,
			hash,
		});

		// Recalculer le solde du compte
		await this.balanceCalculator.recalculateForAccount(accountId);

		return transaction;
	}

	/**
	 * Supprime une transaction
	 */
	async delete(transactionId: number): Promise<void> {
		const transaction = await this.transactionRepo.findById(transactionId);
		if (!transaction) {
			throw new Error("Transaction non trouvée");
		}

		const accountId = transaction.accountId;

		await this.transactionRepo.delete(transactionId);

		// Recalculer le solde du compte
		await this.balanceCalculator.recalculateForAccount(accountId);
	}

	/**
	 * Met à jour la catégorie d'une transaction
	 */
	async updateCategory(
		transactionId: number,
		category: string | null,
	): Promise<Transaction> {
		const transaction = await this.transactionRepo.update(transactionId, {
			category,
		});
		if (!transaction) {
			throw new Error("Transaction non trouvée");
		}
		return transaction;
	}

	/**
	 * Importe un batch de transactions (depuis CSV ou Tink)
	 */
	async importBatch(
		accountId: number,
		filename: string,
		transactions: ParsedTransactionData[],
	): Promise<ImportResult> {
		// Créer le batch d'import
		const batch = await this.importBatchRepo.create({
			accountId,
			filename,
			status: "processing",
		});

		let imported = 0;
		let skipped = 0;
		const errors: string[] = [];

		for (const txData of transactions) {
			try {
				// Vérifier si la transaction existe déjà
				const existing = await this.transactionRepo.findByHash(txData.hash);
				if (existing) {
					skipped++;
					continue;
				}

				// Créer la transaction
				await this.transactionRepo.create({
					accountId,
					importBatchId: batch.id,
					date: DateTime.fromJSDate(
						txData.date instanceof Date ? txData.date : new Date(txData.date),
					),
					label: txData.label,
					amount: txData.amount,
					type: txData.type,
					merchant: txData.merchant,
					paymentMethod: txData.paymentMethod,
					hash: txData.hash,
				});

				imported++;
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Erreur inconnue";
				errors.push(message);
			}
		}

		// Mettre à jour le batch
		await this.importBatchRepo.markCompleted(batch.id, imported, skipped);

		// Recalculer le solde du compte
		await this.balanceCalculator.recalculateForAccount(accountId);

		return {
			imported,
			skipped,
			errors,
			batchId: batch.id,
		};
	}

	/**
	 * Importe des transactions depuis Tink
	 */
	async importFromTink(
		accountId: number,
		transactions: Array<{
			externalId: string;
			date: string;
			amount: number;
			description: string;
			type: "credit" | "debit";
		}>,
	): Promise<ImportResult> {
		const filename = `tink_sync_${new Date().toISOString().split("T")[0]}`;

		// Convertir en ParsedTransactionData
		const parsedTransactions: ParsedTransactionData[] = transactions.map(
			(tx) => ({
				date: new Date(tx.date),
				label: tx.description,
				amount: tx.type === "credit" ? tx.amount : -tx.amount,
				type: tx.type,
				merchant: this.extractMerchant(tx.description),
				paymentMethod: null,
				hash: hashGenerator.forTinkTransaction(
					tx.date,
					tx.amount,
					tx.description,
					tx.type,
				),
				externalId: tx.externalId,
			}),
		);

		return this.importBatch(accountId, filename, parsedTransactions);
	}

	/**
	 * Extrait le nom du marchand depuis la description
	 */
	private extractMerchant(description: string): string | null {
		const cleaned = description
			.replace(/\d{2}\/\d{2}\/\d{4}/g, "")
			.replace(/CB\s*\*?\d+/gi, "")
			.replace(/CARTE\s+\d+/gi, "")
			.replace(/PAIEMENT\s+/gi, "")
			.replace(/VIREMENT\s+/gi, "")
			.replace(/PRELEVEMENT\s+/gi, "")
			.trim();

		return cleaned.length > 2 ? cleaned.substring(0, 100) : null;
	}

	/**
	 * Récupère les transactions du mois courant
	 */
	async getCurrentMonthTransactions(accountId: number): Promise<Transaction[]> {
		const now = new Date();
		return this.transactionRepo.findByAccountIdAndMonth(
			accountId,
			now.getFullYear(),
			now.getMonth() + 1,
		);
	}

	/**
	 * Compte les transactions non catégorisées
	 */
	async countUncategorized(accountId: number): Promise<number> {
		const transactions = await this.transactionRepo.findByAccountId(accountId);
		return transactions.filter((t) => t.type === "debit" && !t.category).length;
	}
}
