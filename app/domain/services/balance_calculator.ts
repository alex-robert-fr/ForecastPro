import TransactionRepository from "#infrastructure/repositories/transaction_repository";
import AccountRepository from "#infrastructure/repositories/account_repository";
import { Money } from "#domain/value-objects/money";

/**
 * Service métier pour le calcul des soldes
 * Couche Domain - contient la logique métier pure
 */
export default class BalanceCalculator {
	constructor(
		private transactionRepo: TransactionRepository,
		private accountRepo: AccountRepository,
	) {}

	/**
	 * Calcule le solde actuel d'un compte
	 * Solde = Solde initial + Crédits - |Débits|
	 */
	async calculateForAccount(accountId: number): Promise<Money> {
		const account = await this.accountRepo.findById(accountId);
		if (!account) {
			throw new Error(`Compte non trouvé: ${accountId}`);
		}

		const initialBalance = new Money(
			account.initialBalance ?? 0,
			account.currency,
		);
		const credits = new Money(
			await this.transactionRepo.sumByType(accountId, "credit"),
			account.currency,
		);
		const debits = new Money(
			Math.abs(await this.transactionRepo.sumByType(accountId, "debit")),
			account.currency,
		);

		return initialBalance.add(credits).subtract(debits);
	}

	/**
	 * Calcule et met à jour le solde d'un compte en base
	 */
	async recalculateForAccount(accountId: number): Promise<number> {
		const newBalance = await this.calculateForAccount(accountId);
		const account = await this.accountRepo.updateBalance(
			accountId,
			newBalance.amount,
		);

		if (!account) {
			throw new Error(
				`Impossible de mettre à jour le solde du compte: ${accountId}`,
			);
		}

		return newBalance.amount;
	}

	/**
	 * Calcule les statistiques mensuelles d'un compte
	 */
	async calculateMonthlyStats(
		accountId: number,
		year: number,
		month: number,
	): Promise<{
		income: Money;
		expenses: Money;
		savings: Money;
		savingsRate: number;
	}> {
		const account = await this.accountRepo.findById(accountId);
		if (!account) {
			throw new Error(`Compte non trouvé: ${accountId}`);
		}

		const currency = account.currency;

		const income = new Money(
			await this.transactionRepo.sumByTypeAndMonth(
				accountId,
				"credit",
				year,
				month,
			),
			currency,
		);

		const expenses = new Money(
			Math.abs(
				await this.transactionRepo.sumByTypeAndMonth(
					accountId,
					"debit",
					year,
					month,
				),
			),
			currency,
		);

		const savings = income.subtract(expenses);
		const savingsRate =
			income.amount > 0 ? (savings.amount / income.amount) * 100 : 0;

		return {
			income,
			expenses,
			savings,
			savingsRate: Math.max(0, savingsRate), // Pas de taux négatif
		};
	}

	/**
	 * Calcule les statistiques globales de toutes les transactions
	 */
	async calculateTotalStats(accountId: number): Promise<{
		totalCredits: Money;
		totalDebits: Money;
		balance: Money;
		transactionCount: number;
	}> {
		const account = await this.accountRepo.findById(accountId);
		if (!account) {
			throw new Error(`Compte non trouvé: ${accountId}`);
		}

		const currency = account.currency;

		const totalCredits = new Money(
			await this.transactionRepo.sumByType(accountId, "credit"),
			currency,
		);

		const totalDebits = new Money(
			Math.abs(await this.transactionRepo.sumByType(accountId, "debit")),
			currency,
		);

		const balance = await this.calculateForAccount(accountId);
		const transactionCount =
			await this.transactionRepo.countByAccountId(accountId);

		return {
			totalCredits,
			totalDebits,
			balance,
			transactionCount,
		};
	}
}
