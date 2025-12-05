import { DateTime } from "luxon";
import { hashGenerator } from "#infrastructure/utils/hash_generator";
import { DateUtils } from "#infrastructure/utils/date_utils";
import type {
	ParsedTransactionData,
	ParseResult,
	TransactionType,
} from "#domain/types/index";

/**
 * Parser CSV pour les relevés bancaires
 * Couche technique - ne contient pas de logique métier
 * Supporte le format Crédit Agricole (Date;Libellé;Débit euros;Crédit euros;)
 */
export default class CsvParser {
	/**
	 * Parse un fichier CSV complet
	 */
	parse(content: string): ParseResult {
		const transactions: ParsedTransactionData[] = [];
		const errors: string[] = [];

		// Normaliser les retours à la ligne
		const normalizedContent = content
			.replace(/\r\n/g, "\n")
			.replace(/\r/g, "\n");

		// Parser les lignes en gérant les champs multilignes
		const rows = this.parseRows(normalizedContent);

		// Ignorer la première ligne (header)
		for (let i = 1; i < rows.length; i++) {
			const row = rows[i];
			if (!row || row.length < 4) continue;

			try {
				const transaction = this.parseRow(row, i);
				if (transaction) {
					transactions.push(transaction);
				}
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Erreur inconnue";
				errors.push(`Ligne ${i + 1}: ${message}`);
			}
		}

		return { transactions, errors };
	}

	/**
	 * Parse les lignes CSV en gérant les champs multilignes entre guillemets
	 */
	private parseRows(content: string): string[][] {
		const rows: string[][] = [];
		let currentRow: string[] = [];
		let currentField = "";
		let inQuotes = false;

		for (let i = 0; i < content.length; i++) {
			const char = content[i];
			const nextChar = content[i + 1];

			if (inQuotes) {
				if (char === '"' && nextChar === '"') {
					// Guillemet échappé
					currentField += '"';
					i++;
				} else if (char === '"') {
					// Fin du champ entre guillemets
					inQuotes = false;
				} else {
					currentField += char;
				}
			} else {
				if (char === '"') {
					inQuotes = true;
				} else if (char === ";") {
					currentRow.push(currentField.trim());
					currentField = "";
				} else if (char === "\n") {
					currentRow.push(currentField.trim());
					if (currentRow.some((field) => field.length > 0)) {
						rows.push(currentRow);
					}
					currentRow = [];
					currentField = "";
				} else {
					currentField += char;
				}
			}
		}

		// Dernière ligne si pas de newline final
		if (currentField || currentRow.length > 0) {
			currentRow.push(currentField.trim());
			if (currentRow.some((field) => field.length > 0)) {
				rows.push(currentRow);
			}
		}

		return rows;
	}

	/**
	 * Parse une ligne CSV en transaction
	 */
	private parseRow(
		fields: string[],
		rowIndex: number,
	): ParsedTransactionData | null {
		const [dateStr, label, debitStr, creditStr] = fields;

		// Ignorer les lignes vides ou sans date valide
		if (!dateStr || !label) return null;

		// Parser la date (format DD/MM/YYYY)
		const date = DateUtils.parseFromFrenchFormat(dateStr);
		if (!date) {
			throw new Error(`Date invalide: ${dateStr}`);
		}

		// Parser les montants
		const debit = this.parseAmount(debitStr);
		const credit = this.parseAmount(creditStr);

		// Déterminer le type et le montant
		let amount: number;
		let type: TransactionType;

		if (debit > 0) {
			amount = -debit; // Les débits sont négatifs
			type = "debit";
		} else if (credit > 0) {
			amount = credit;
			type = "credit";
		} else {
			return null; // Pas de montant
		}

		// Nettoyer le libellé
		const cleanLabel = label.replace(/\s+/g, " ").trim();

		// Extraire le marchand et la méthode de paiement
		const { merchant, paymentMethod } = this.extractDetails(cleanLabel);

		// Générer un hash unique
		const hash = hashGenerator.forImportedTransaction(
			date.toJSDate(),
			cleanLabel,
			amount,
			rowIndex,
		);

		return {
			date: date.toJSDate(),
			label: cleanLabel,
			amount,
			type,
			merchant,
			paymentMethod,
			hash,
		};
	}

	/**
	 * Parse un montant au format français (1 234,56)
	 */
	private parseAmount(value: string | undefined): number {
		if (!value || value.trim() === "") return 0;

		// Supprimer tous les caractères non numériques sauf virgule et point
		const cleaned = value
			.replace(/[^\d,.-]/g, "") // Garde uniquement chiffres, virgule, point, tiret
			.replace(",", ".");

		const amount = Number.parseFloat(cleaned);
		return Number.isNaN(amount) ? 0 : amount;
	}

	/**
	 * Extrait le marchand et la méthode de paiement du libellé
	 */
	private extractDetails(label: string): {
		merchant: string | null;
		paymentMethod: string | null;
	} {
		let merchant: string | null = null;
		let paymentMethod: string | null = null;

		const upperLabel = label.toUpperCase();

		// Détecter la méthode de paiement
		if (upperLabel.includes("PAIEMENT PAR CARTE")) {
			paymentMethod = "carte";
		} else if (upperLabel.includes("PRELEVEMENT")) {
			paymentMethod = "prelevement";
		} else if (upperLabel.includes("VIREMENT")) {
			paymentMethod = "virement";
		} else if (upperLabel.includes("RETRAIT")) {
			paymentMethod = "retrait";
		}

		// Extraire le marchand selon le type
		if (paymentMethod === "carte") {
			// Format: "PAIEMENT PAR CARTE X7055 MERCHANT_NAME DATE"
			const match = label.match(/X\d{4}\s+(.+?)\s+\d{2}\/\d{2}/i);
			if (match) {
				merchant = match[1].trim();
			}
		} else if (paymentMethod === "prelevement") {
			// Format: "PRELEVEMENT MERCHANT_NAME ..."
			const lines = label.split(/\s{2,}/);
			if (lines.length > 1) {
				merchant = lines[1].trim();
			}
		} else if (paymentMethod === "virement") {
			// Essayer d'extraire le destinataire/émetteur
			const match =
				label.match(/vers\s+(\S+)/i) || label.match(/FAVEUR\s+(.+?)\s+\d/i);
			if (match) {
				merchant = match[1].trim();
			}
		}

		return { merchant, paymentMethod };
	}
}
