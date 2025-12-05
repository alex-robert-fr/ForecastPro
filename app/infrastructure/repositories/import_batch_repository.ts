import ImportBatch from "#models/import_batch";
import type { ImportStatus, CreateImportBatchDto } from "#domain/types/index";

/**
 * Repository pour l'accès aux données des batches d'import
 * Couche technique - ne contient pas de logique métier
 */
export default class ImportBatchRepository {
	/**
	 * Trouve un batch par son ID
	 */
	async findById(id: number): Promise<ImportBatch | null> {
		return ImportBatch.find(id);
	}

	/**
	 * Récupère les batches d'un compte
	 */
	async findByAccountId(accountId: number): Promise<ImportBatch[]> {
		return ImportBatch.query()
			.where("accountId", accountId)
			.orderBy("createdAt", "desc");
	}

	/**
	 * Récupère les derniers batches
	 */
	async findRecent(limit: number = 10): Promise<ImportBatch[]> {
		return ImportBatch.query().orderBy("createdAt", "desc").limit(limit);
	}

	/**
	 * Crée un nouveau batch
	 */
	async create(data: CreateImportBatchDto): Promise<ImportBatch> {
		return ImportBatch.create({
			accountId: data.accountId,
			filename: data.filename,
			status: data.status ?? "pending",
			rowsImported: 0,
			rowsSkipped: 0,
		});
	}

	/**
	 * Met à jour le statut d'un batch
	 */
	async updateStatus(
		id: number,
		status: ImportStatus,
		errorMessage?: string,
	): Promise<ImportBatch | null> {
		const batch = await this.findById(id);
		if (!batch) return null;

		batch.status = status;
		if (errorMessage !== undefined) {
			batch.errorMessage = errorMessage;
		}

		await batch.save();
		return batch;
	}

	/**
	 * Met à jour les compteurs d'un batch
	 */
	async updateCounters(
		id: number,
		imported: number,
		skipped: number,
	): Promise<ImportBatch | null> {
		const batch = await this.findById(id);
		if (!batch) return null;

		batch.rowsImported = imported;
		batch.rowsSkipped = skipped;

		await batch.save();
		return batch;
	}

	/**
	 * Marque un batch comme terminé
	 */
	async markCompleted(
		id: number,
		imported: number,
		skipped: number,
	): Promise<ImportBatch | null> {
		const batch = await this.findById(id);
		if (!batch) return null;

		batch.status = "completed";
		batch.rowsImported = imported;
		batch.rowsSkipped = skipped;

		await batch.save();
		return batch;
	}

	/**
	 * Marque un batch comme échoué
	 */
	async markFailed(
		id: number,
		errorMessage: string,
	): Promise<ImportBatch | null> {
		const batch = await this.findById(id);
		if (!batch) return null;

		batch.status = "failed";
		batch.errorMessage = errorMessage;

		await batch.save();
		return batch;
	}

	/**
	 * Supprime un batch
	 */
	async delete(id: number): Promise<boolean> {
		const batch = await this.findById(id);
		if (!batch) return false;

		await batch.delete();
		return true;
	}

	/**
	 * Supprime tous les batches d'un compte
	 */
	async deleteByAccountId(accountId: number): Promise<number> {
		const result = await ImportBatch.query()
			.where("accountId", accountId)
			.delete();
		return Array.isArray(result) ? result.length : result;
	}
}
