import type { TinkAccountRaw, TinkTransactionRaw } from "./tink_api_client.js";
import type {
	TinkAccountData,
	TinkTransactionData,
	TransactionType,
} from "#domain/types/index";
import { hashGenerator } from "#infrastructure/utils/hash_generator";

/**
 * Transformateur de données Tink
 * Couche technique - convertit les données brutes de l'API en format applicatif
 */
export default class TinkTransformer {
	/**
	 * Convertit le montant Tink en nombre
	 */
	parseAmount(amount: { unscaledValue: string; scale: string }): number {
		const unscaled = parseInt(amount.unscaledValue, 10);
		const scale = parseInt(amount.scale, 10);
		return unscaled / Math.pow(10, scale);
	}

	/**
	 * Transforme un compte Tink brut en format applicatif
	 */
	transformAccount(raw: TinkAccountRaw): TinkAccountData {
		return {
			id: raw.id,
			name: raw.name,
			type: raw.type,
			iban: raw.identifiers?.iban?.iban || null,
			balance: raw.balances?.booked
				? this.parseAmount(raw.balances.booked.amount.value)
				: null,
			currency: raw.balances?.booked?.amount?.currencyCode || "EUR",
		};
	}

	/**
	 * Transforme une liste de comptes Tink
	 */
	transformAccounts(rawAccounts: TinkAccountRaw[]): TinkAccountData[] {
		return rawAccounts.map((acc) => this.transformAccount(acc));
	}

	/**
	 * Transforme une transaction Tink brute en format applicatif
	 */
	transformTransaction(raw: TinkTransactionRaw): TinkTransactionData {
		const amount = this.parseAmount(raw.amount.value);
		const description = raw.descriptions.display || raw.descriptions.original;
		const type: TransactionType = amount >= 0 ? "credit" : "debit";

		return {
			externalId: raw.id,
			date: raw.dates.booked,
			amount: Math.abs(amount),
			description: description.trim(),
			type,
		};
	}

	/**
	 * Transforme une liste de transactions Tink
	 */
	transformTransactions(
		rawTransactions: TinkTransactionRaw[],
	): TinkTransactionData[] {
		return rawTransactions.map((tx) => this.transformTransaction(tx));
	}

	/**
	 * Génère un hash pour une transaction Tink (pour détection doublons)
	 */
	generateTransactionHash(tx: TinkTransactionData): string {
		return hashGenerator.forTinkTransaction(
			tx.date,
			tx.amount,
			tx.description,
			tx.type,
		);
	}

	/**
	 * Extrait le nom du marchand depuis la description
	 */
	extractMerchant(description: string): string | null {
		const cleaned = description
			.replace(/\d{2}\/\d{2}\/\d{4}/g, "") // Supprimer les dates
			.replace(/CB\s*\*?\d+/gi, "") // Supprimer les numéros CB
			.replace(/CARTE\s+\d+/gi, "")
			.replace(/PAIEMENT\s+/gi, "")
			.replace(/VIREMENT\s+/gi, "")
			.replace(/PRELEVEMENT\s+/gi, "")
			.trim();

		return cleaned.length > 2 ? cleaned.substring(0, 100) : null;
	}
}
