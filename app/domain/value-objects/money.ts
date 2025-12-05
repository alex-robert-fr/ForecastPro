/**
 * Value Object représentant une somme d'argent
 * Immutable et auto-validé
 */
export class Money {
	private readonly _amount: number;
	private readonly _currency: string;

	constructor(amount: number, currency: string = "EUR") {
		// Arrondir à 2 décimales pour éviter les erreurs de flottants
		this._amount = Math.round(amount * 100) / 100;
		this._currency = currency.toUpperCase();
	}

	get amount(): number {
		return this._amount;
	}

	get currency(): string {
		return this._currency;
	}

	/**
	 * Additionne deux montants
	 */
	add(other: Money): Money {
		this.assertSameCurrency(other);
		return new Money(this._amount + other._amount, this._currency);
	}

	/**
	 * Soustrait un montant
	 */
	subtract(other: Money): Money {
		this.assertSameCurrency(other);
		return new Money(this._amount - other._amount, this._currency);
	}

	/**
	 * Multiplie par un facteur
	 */
	multiply(factor: number): Money {
		return new Money(this._amount * factor, this._currency);
	}

	/**
	 * Retourne la valeur absolue
	 */
	abs(): Money {
		return new Money(Math.abs(this._amount), this._currency);
	}

	/**
	 * Vérifie si le montant est positif
	 */
	isPositive(): boolean {
		return this._amount > 0;
	}

	/**
	 * Vérifie si le montant est négatif
	 */
	isNegative(): boolean {
		return this._amount < 0;
	}

	/**
	 * Vérifie si le montant est zéro
	 */
	isZero(): boolean {
		return this._amount === 0;
	}

	/**
	 * Compare avec un autre montant
	 */
	equals(other: Money): boolean {
		return this._amount === other._amount && this._currency === other._currency;
	}

	/**
	 * Vérifie si ce montant est supérieur à un autre
	 */
	greaterThan(other: Money): boolean {
		this.assertSameCurrency(other);
		return this._amount > other._amount;
	}

	/**
	 * Vérifie si ce montant est inférieur à un autre
	 */
	lessThan(other: Money): boolean {
		this.assertSameCurrency(other);
		return this._amount < other._amount;
	}

	/**
	 * Formate le montant pour l'affichage
	 */
	format(locale: string = "fr-FR"): string {
		return new Intl.NumberFormat(locale, {
			style: "currency",
			currency: this._currency,
		}).format(this._amount);
	}

	/**
	 * Formate le montant de manière compacte (ex: 1,2k €)
	 */
	formatCompact(locale: string = "fr-FR"): string {
		if (Math.abs(this._amount) >= 1000) {
			return new Intl.NumberFormat(locale, {
				style: "currency",
				currency: this._currency,
				notation: "compact",
				maximumFractionDigits: 1,
			}).format(this._amount);
		}
		return this.format(locale);
	}

	/**
	 * Retourne le montant en centimes (pour stockage précis)
	 */
	toCents(): number {
		return Math.round(this._amount * 100);
	}

	/**
	 * Crée un Money depuis des centimes
	 */
	static fromCents(cents: number, currency: string = "EUR"): Money {
		return new Money(cents / 100, currency);
	}

	/**
	 * Crée un Money à zéro
	 */
	static zero(currency: string = "EUR"): Money {
		return new Money(0, currency);
	}

	/**
	 * Calcule la somme d'un tableau de Money
	 */
	static sum(amounts: Money[], currency: string = "EUR"): Money {
		return amounts.reduce(
			(total, amount) => total.add(amount),
			Money.zero(currency),
		);
	}

	private assertSameCurrency(other: Money): void {
		if (this._currency !== other._currency) {
			throw new Error(
				`Cannot operate on different currencies: ${this._currency} vs ${other._currency}`,
			);
		}
	}

	toString(): string {
		return this.format();
	}

	toJSON(): { amount: number; currency: string } {
		return {
			amount: this._amount,
			currency: this._currency,
		};
	}
}
