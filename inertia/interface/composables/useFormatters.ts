/**
 * Composable pour les fonctions de formatage
 * Couche Interface - utilitaires UI
 */
export function useFormatters() {
	/**
	 * Formate un montant en devise
	 */
	const formatAmount = (amount: number, currency: string = "EUR"): string => {
		return new Intl.NumberFormat("fr-FR", {
			style: "currency",
			currency,
		}).format(amount);
	};

	/**
	 * Formate un montant de manière compacte (ex: 1,2k €)
	 */
	const formatAmountCompact = (
		amount: number,
		currency: string = "EUR",
	): string => {
		if (Math.abs(amount) >= 1000) {
			return new Intl.NumberFormat("fr-FR", {
				style: "currency",
				currency,
				notation: "compact",
				maximumFractionDigits: 1,
			}).format(amount);
		}
		return formatAmount(amount, currency);
	};

	/**
	 * Formate une date complète
	 */
	const formatDate = (dateStr: string): string => {
		return new Date(dateStr).toLocaleDateString("fr-FR", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});
	};

	/**
	 * Formate une date courte (jour et mois)
	 */
	const formatDateShort = (dateStr: string): string => {
		return new Date(dateStr).toLocaleDateString("fr-FR", {
			day: "2-digit",
			month: "short",
		});
	};

	/**
	 * Formate un IBAN avec espaces
	 */
	const formatIban = (iban: string | null): string => {
		if (!iban) return "—";
		return iban.replace(/(.{4})/g, "$1 ").trim();
	};

	/**
	 * Formate un pourcentage
	 */
	const formatPercent = (value: number, decimals: number = 0): string => {
		return `${value.toFixed(decimals)}%`;
	};

	/**
	 * Retourne le nom du mois courant avec l'année
	 */
	const getCurrentMonthName = (): string => {
		return new Date().toLocaleDateString("fr-FR", {
			month: "long",
			year: "numeric",
		});
	};

	/**
	 * Tronque un texte avec ellipse
	 */
	const truncate = (text: string, maxLength: number): string => {
		if (text.length <= maxLength) return text;
		return text.substring(0, maxLength - 3) + "...";
	};

	return {
		formatAmount,
		formatAmountCompact,
		formatDate,
		formatDateShort,
		formatIban,
		formatPercent,
		getCurrentMonthName,
		truncate,
	};
}
