import { DateTime } from "luxon";
import { BaseModel, column, hasMany } from "@adonisjs/lucid/orm";
import type { HasMany } from "@adonisjs/lucid/types/relations";
import Transaction from "#models/transaction";
import ImportBatch from "#models/import_batch";

export default class Account extends BaseModel {
	@column({ isPrimary: true })
	declare id: number;

	@column()
	declare name: string;

	@column()
	declare bank: string | null;

	@column()
	declare accountNumber: string | null;

	@column()
	declare balance: number;

	@column()
	declare initialBalance: number;

	@column()
	declare currency: string;

	@column()
	declare isDefault: boolean;

	@column.dateTime({ autoCreate: true })
	declare createdAt: DateTime;

	@column.dateTime({ autoCreate: true, autoUpdate: true })
	declare updatedAt: DateTime | null;

	@hasMany(() => Transaction)
	declare transactions: HasMany<typeof Transaction>;

	@hasMany(() => ImportBatch)
	declare importBatches: HasMany<typeof ImportBatch>;

	/**
	 * Calcule le solde actuel basé sur le solde initial et toutes les transactions
	 * @returns Le solde calculé
	 */
	async calculateBalance(): Promise<number> {
		// Calculer les crédits
		const creditsResult = await Transaction.query()
			.where("accountId", this.id)
			.where("type", "credit")
			.sum("amount as total")
			.first();

		// Calculer les débits
		const debitsResult = await Transaction.query()
			.where("accountId", this.id)
			.where("type", "debit")
			.sum("amount as total")
			.first();

		// S'assurer que les valeurs sont des nombres valides
		const credits = Number.parseFloat(creditsResult?.$extras?.total) || 0;
		const debits =
			Math.abs(Number.parseFloat(debitsResult?.$extras?.total)) || 0;
		const initialBalance = Number.parseFloat(String(this.initialBalance)) || 0;

		// Le solde = solde initial + crédits - débits
		const calculatedBalance = initialBalance + credits - debits;
		// Vérifier que le résultat n'est pas NaN
		return Number.isNaN(calculatedBalance) ? initialBalance : calculatedBalance;
	}

	/**
	 * Calcule et met à jour le solde du compte en base de données
	 * @param save Si true, sauvegarde le compte après calcul (défaut: true)
	 * @returns Le solde calculé
	 */
	async calculateAndUpdateBalance(save: boolean = true): Promise<number> {
		const newBalance = await this.calculateBalance();
		this.balance = newBalance;

		if (save) {
			await this.save();
		}

		return newBalance;
	}
}
