import { DateTime } from "luxon";

/**
 * Utilitaires pour la manipulation des dates
 * Couche technique
 */
export class DateUtils {
	/**
	 * Parse une date au format français (DD/MM/YYYY)
	 */
	static parseFromFrenchFormat(dateStr: string): DateTime | null {
		const parsed = DateTime.fromFormat(dateStr, "dd/MM/yyyy");
		return parsed.isValid ? parsed : null;
	}

	/**
	 * Parse une date au format ISO (YYYY-MM-DD)
	 */
	static parseFromISO(dateStr: string): DateTime | null {
		const parsed = DateTime.fromISO(dateStr);
		return parsed.isValid ? parsed : null;
	}

	/**
	 * Parse une date depuis différents formats
	 */
	static parse(dateStr: string): DateTime | null {
		// Essayer le format ISO d'abord
		let parsed = DateTime.fromISO(dateStr);
		if (parsed.isValid) return parsed;

		// Essayer le format français
		parsed = DateTime.fromFormat(dateStr, "dd/MM/yyyy");
		if (parsed.isValid) return parsed;

		// Essayer d'autres formats courants
		const formats = ["yyyy-MM-dd", "dd-MM-yyyy", "d/M/yyyy", "MM/dd/yyyy"];
		for (const format of formats) {
			parsed = DateTime.fromFormat(dateStr, format);
			if (parsed.isValid) return parsed;
		}

		return null;
	}

	/**
	 * Convertit une Date JS en DateTime Luxon
	 */
	static fromJSDate(date: Date): DateTime {
		return DateTime.fromJSDate(date);
	}

	/**
	 * Retourne le premier jour du mois courant
	 */
	static startOfCurrentMonth(): DateTime {
		return DateTime.now().startOf("month");
	}

	/**
	 * Retourne le dernier jour du mois courant
	 */
	static endOfCurrentMonth(): DateTime {
		return DateTime.now().endOf("month");
	}

	/**
	 * Retourne le premier jour d'un mois donné
	 */
	static startOfMonth(year: number, month: number): DateTime {
		return DateTime.fromObject({ year, month, day: 1 });
	}

	/**
	 * Retourne le dernier jour d'un mois donné
	 */
	static endOfMonth(year: number, month: number): DateTime {
		return DateTime.fromObject({ year, month, day: 1 }).endOf("month");
	}

	/**
	 * Vérifie si une date est dans le mois courant
	 */
	static isCurrentMonth(date: DateTime | Date): boolean {
		const dt = date instanceof DateTime ? date : DateTime.fromJSDate(date);
		const now = DateTime.now();
		return dt.month === now.month && dt.year === now.year;
	}

	/**
	 * Vérifie si une date est dans un mois donné
	 */
	static isInMonth(
		date: DateTime | Date,
		year: number,
		month: number,
	): boolean {
		const dt = date instanceof DateTime ? date : DateTime.fromJSDate(date);
		return dt.month === month && dt.year === year;
	}

	/**
	 * Formate une date pour l'affichage (format français)
	 */
	static formatFrench(
		date: DateTime | Date,
		options?: { short?: boolean },
	): string {
		const dt = date instanceof DateTime ? date : DateTime.fromJSDate(date);

		if (options?.short) {
			return dt.toFormat("dd MMM", { locale: "fr" });
		}

		return dt.toFormat("dd MMMM yyyy", { locale: "fr" });
	}

	/**
	 * Formate une date en ISO (YYYY-MM-DD)
	 */
	static formatISO(date: DateTime | Date): string {
		const dt = date instanceof DateTime ? date : DateTime.fromJSDate(date);
		return dt.toISODate() ?? dt.toISO()!.split("T")[0];
	}

	/**
	 * Retourne le nom du mois courant avec l'année
	 */
	static getCurrentMonthName(): string {
		return DateTime.now().toFormat("MMMM yyyy", { locale: "fr" });
	}

	/**
	 * Calcule la différence en jours entre deux dates
	 */
	static diffInDays(from: DateTime | Date, to: DateTime | Date): number {
		const fromDt = from instanceof DateTime ? from : DateTime.fromJSDate(from);
		const toDt = to instanceof DateTime ? to : DateTime.fromJSDate(to);
		return Math.floor(toDt.diff(fromDt, "days").days);
	}
}
