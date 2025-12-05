import { createHash } from "node:crypto";
import { DateTime } from "luxon";

/**
 * Générateur de hash pour les transactions
 * Couche technique - utilisé pour la détection des doublons
 */
export default class HashGenerator {
	private static readonly HASH_LENGTH = 32;

	/**
	 * Génère un hash pour une transaction manuelle
	 * Inclut un timestamp et un random pour garantir l'unicité
	 */
	forManualTransaction(
		date: Date | DateTime | string,
		label: string,
		amount: number,
	): string {
		const dateStr = this.normalizeDate(date);
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 10);
		const data = `${dateStr}|${label}|${amount}|${timestamp}|${random}`;
		return this.generate(data);
	}

	/**
	 * Génère un hash pour une transaction importée (CSV)
	 * Inclut l'index de ligne pour permettre les transactions identiques
	 */
	forImportedTransaction(
		date: Date | DateTime | string,
		label: string,
		amount: number,
		rowIndex: number,
	): string {
		const dateStr = this.normalizeDate(date);
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 10);
		const data = `${dateStr}|${label}|${amount}|${rowIndex}|${timestamp}|${random}`;
		return this.generate(data);
	}

	/**
	 * Génère un hash pour une transaction Tink
	 * Déterministe pour éviter les doublons lors des re-syncs
	 */
	forTinkTransaction(
		date: string,
		amount: number,
		description: string,
		type: string,
	): string {
		const data = `${date}|${amount}|${description}|${type}`;
		return this.generate(data);
	}

	/**
	 * Génère un hash générique
	 */
	generate(input: string): string {
		return createHash("sha256")
			.update(input)
			.digest("hex")
			.substring(0, HashGenerator.HASH_LENGTH);
	}

	/**
	 * Normalise une date en string ISO
	 */
	private normalizeDate(date: Date | DateTime | string): string {
		if (typeof date === "string") {
			return date.split("T")[0]; // Garde uniquement la partie date
		}

		if (date instanceof DateTime) {
			return date.toISODate() ?? date.toISO()!.split("T")[0];
		}

		return date.toISOString().split("T")[0];
	}
}

// Export d'une instance singleton pour faciliter l'utilisation
export const hashGenerator = new HashGenerator();
