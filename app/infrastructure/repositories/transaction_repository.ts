import Transaction from "#models/transaction";
import type {
	TransactionType,
	CreateTransactionDto,
} from "#domain/types/index";
import { DateTime } from "luxon";

/**
 * Repository pour l'accès aux données des transactions
 * Couche technique - ne contient pas de logique métier
 */
export default class TransactionRepository {
	/**
	 * Trouve une transaction par son ID
	 */
	async findById(id: number): Promise<Transaction | null> {
		return Transaction.find(id);
	}

	/**
	 * Trouve une transaction par son hash (détection doublons)
	 */
	async findByHash(hash: string): Promise<Transaction | null> {
		return Transaction.query().where("hash", hash).first();
	}

	/**
	 * Récupère les transactions d'un compte
	 */
	async findByAccountId(
		accountId: number,
		options?: { limit?: number; offset?: number },
	): Promise<Transaction[]> {
		const query = Transaction.query()
			.where("accountId", accountId)
			.orderBy("date", "desc")
			.orderBy("id", "desc");

		if (options?.limit) {
			query.limit(options.limit);
		}

		if (options?.offset) {
			query.offset(options.offset);
		}

		return query;
	}

	/**
	 * Récupère les transactions d'un batch d'import
	 */
	async findByImportBatchId(batchId: number): Promise<Transaction[]> {
		return Transaction.query()
			.where("importBatchId", batchId)
			.orderBy("date", "desc");
	}

	/**
	 * Récupère les transactions d'un compte pour un mois donné
	 */
	async findByAccountIdAndMonth(
		accountId: number,
		year: number,
		month: number,
	): Promise<Transaction[]> {
		const startDate = DateTime.fromObject({ year, month, day: 1 });
		const endDate = startDate.endOf("month");

		return Transaction.query()
			.where("accountId", accountId)
			.where("date", ">=", startDate.toSQLDate()!)
			.where("date", "<=", endDate.toSQLDate()!)
			.orderBy("date", "desc");
	}

	/**
	 * Crée une nouvelle transaction
	 */
	async create(data: {
		accountId: number;
		importBatchId?: number | null;
		date: DateTime | Date;
		label: string;
		amount: number;
		type: TransactionType;
		merchant?: string | null;
		category?: string | null;
		paymentMethod?: string | null;
		hash: string;
	}): Promise<Transaction> {
		const dateTime =
			data.date instanceof DateTime
				? data.date
				: DateTime.fromJSDate(data.date);

		return Transaction.create({
			accountId: data.accountId,
			importBatchId: data.importBatchId ?? null,
			date: dateTime,
			label: data.label,
			amount: data.amount,
			type: data.type,
			merchant: data.merchant ?? null,
			category: data.category ?? null,
			paymentMethod: data.paymentMethod ?? null,
			hash: data.hash,
		});
	}

	/**
	 * Met à jour une transaction
	 */
	async update(
		id: number,
		data: Partial<{
			label: string;
			amount: number;
			type: TransactionType;
			merchant: string | null;
			category: string | null;
			paymentMethod: string | null;
		}>,
	): Promise<Transaction | null> {
		const transaction = await this.findById(id);
		if (!transaction) return null;

		transaction.merge(data);
		await transaction.save();

		return transaction;
	}

	/**
	 * Supprime une transaction
	 */
	async delete(id: number): Promise<boolean> {
		const transaction = await this.findById(id);
		if (!transaction) return false;

		await transaction.delete();
		return true;
	}

	/**
	 * Supprime toutes les transactions d'un compte
	 */
	async deleteByAccountId(accountId: number): Promise<number> {
		const result = await Transaction.query()
			.where("accountId", accountId)
			.delete();
		return Array.isArray(result) ? result.length : result;
	}

	/**
	 * Supprime toutes les transactions d'un batch
	 */
	async deleteByImportBatchId(batchId: number): Promise<number> {
		const result = await Transaction.query()
			.where("importBatchId", batchId)
			.delete();
		return Array.isArray(result) ? result.length : result;
	}

	/**
	 * Calcule la somme des transactions par type
	 */
	async sumByType(accountId: number, type: TransactionType): Promise<number> {
		const result = await Transaction.query()
			.where("accountId", accountId)
			.where("type", type)
			.sum("amount as total")
			.first();

		const total = result?.$extras?.total;
		return typeof total === "string" ? parseFloat(total) : (total ?? 0);
	}

	/**
	 * Calcule la somme des transactions par type pour un mois donné
	 */
	async sumByTypeAndMonth(
		accountId: number,
		type: TransactionType,
		year: number,
		month: number,
	): Promise<number> {
		const startDate = DateTime.fromObject({ year, month, day: 1 });
		const endDate = startDate.endOf("month");

		const result = await Transaction.query()
			.where("accountId", accountId)
			.where("type", type)
			.where("date", ">=", startDate.toSQLDate()!)
			.where("date", "<=", endDate.toSQLDate()!)
			.sum("amount as total")
			.first();

		const total = result?.$extras?.total;
		return typeof total === "string" ? parseFloat(total) : (total ?? 0);
	}

	/**
	 * Compte le nombre de transactions d'un compte
	 */
	async countByAccountId(accountId: number): Promise<number> {
		const result = await Transaction.query()
			.where("accountId", accountId)
			.count("* as total")
			.first();

		const total = result?.$extras?.total;
		return typeof total === "string" ? parseInt(total, 10) : (total ?? 0);
	}

	/**
	 * Vérifie si un hash existe déjà
	 */
	async hashExists(hash: string): Promise<boolean> {
		const result = await Transaction.query().where("hash", hash).first();
		return result !== null;
	}
}
