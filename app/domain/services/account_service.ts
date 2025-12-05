import AccountRepository from "#infrastructure/repositories/account_repository";
import TransactionRepository from "#infrastructure/repositories/transaction_repository";
import ImportBatchRepository from "#infrastructure/repositories/import_batch_repository";
import BalanceCalculator from "#domain/services/balance_calculator";
import type {
	CreateAccountDto,
	UpdateAccountSettingsDto,
} from "#domain/types/index";
import Account from "#models/account";

/**
 * Service métier pour la gestion des comptes
 * Couche Domain - contient la logique métier
 */
export default class AccountService {
	constructor(
		private accountRepo: AccountRepository,
		private transactionRepo: TransactionRepository,
		private importBatchRepo: ImportBatchRepository,
		private balanceCalculator: BalanceCalculator,
	) {}

	/**
	 * Récupère ou crée le compte par défaut
	 */
	async getOrCreateDefault(): Promise<Account> {
		let account = await this.accountRepo.findDefault();

		if (!account) {
			account = await this.accountRepo.create({
				name: "Compte Principal",
				currency: "EUR",
				isDefault: true,
				initialBalance: 0,
			});
		}

		return account;
	}

	/**
	 * Récupère un compte par son ID
	 */
	async getById(id: number): Promise<Account | null> {
		return this.accountRepo.findById(id);
	}

	/**
	 * Récupère tous les comptes
	 */
	async getAll(): Promise<Account[]> {
		return this.accountRepo.findAll();
	}

	/**
	 * Met à jour le solde initial d'un compte
	 */
	async updateInitialBalance(
		accountId: number,
		initialBalance: number,
	): Promise<Account> {
		const account = await this.accountRepo.findById(accountId);
		if (!account) {
			throw new Error("Compte non trouvé");
		}

		await this.accountRepo.updateInitialBalance(accountId, initialBalance);
		await this.balanceCalculator.recalculateForAccount(accountId);

		// Recharger le compte avec le nouveau solde
		const updatedAccount = await this.accountRepo.findById(accountId);
		if (!updatedAccount) {
			throw new Error("Erreur lors de la mise à jour du compte");
		}

		return updatedAccount;
	}

	/**
	 * Met à jour les paramètres d'un compte
	 */
	async updateSettings(
		accountId: number,
		settings: UpdateAccountSettingsDto,
	): Promise<Account> {
		const account = await this.accountRepo.findById(accountId);
		if (!account) {
			throw new Error("Compte non trouvé");
		}

		if (settings.initialBalance !== undefined) {
			await this.accountRepo.updateInitialBalance(
				accountId,
				settings.initialBalance,
			);
		}

		if (settings.name !== undefined) {
			await this.accountRepo.update(accountId, { name: settings.name });
		}

		if (settings.bank !== undefined) {
			await this.accountRepo.update(accountId, { bank: settings.bank });
		}

		// Recalculer le solde
		await this.balanceCalculator.recalculateForAccount(accountId);

		const updatedAccount = await this.accountRepo.findById(accountId);
		if (!updatedAccount) {
			throw new Error("Erreur lors de la mise à jour du compte");
		}

		return updatedAccount;
	}

	/**
	 * Met à jour les informations bancaires (depuis Tink)
	 */
	async updateBankInfo(
		accountId: number,
		data: {
			name?: string;
			bank?: string | null;
			accountNumber?: string | null;
			currency?: string;
		},
	): Promise<Account> {
		const account = await this.accountRepo.updateBankInfo(accountId, data);
		if (!account) {
			throw new Error("Compte non trouvé");
		}

		return account;
	}

	/**
	 * Réinitialise un compte (supprime toutes les transactions)
	 */
	async resetAccount(accountId: number): Promise<{
		deletedTransactions: number;
		newBalance: number;
	}> {
		const account = await this.accountRepo.findById(accountId);
		if (!account) {
			throw new Error("Compte non trouvé");
		}

		// Supprimer toutes les transactions
		const deletedCount =
			await this.transactionRepo.deleteByAccountId(accountId);

		// Supprimer tous les batches d'import
		await this.importBatchRepo.deleteByAccountId(accountId);

		// Réinitialiser le compte
		await this.accountRepo.resetToInitialState(accountId);

		const updatedAccount = await this.accountRepo.findById(accountId);
		const newBalance = updatedAccount?.balance ?? 0;

		return {
			deletedTransactions: deletedCount,
			newBalance,
		};
	}

	/**
	 * Calcule et retourne les statistiques d'un compte
	 */
	async getStats(accountId: number): Promise<{
		balance: number;
		initialBalance: number;
		totalCredits: number;
		totalDebits: number;
		transactionCount: number;
	}> {
		const account = await this.accountRepo.findById(accountId);
		if (!account) {
			throw new Error("Compte non trouvé");
		}

		const stats = await this.balanceCalculator.calculateTotalStats(accountId);

		return {
			balance: stats.balance.amount,
			initialBalance: account.initialBalance,
			totalCredits: stats.totalCredits.amount,
			totalDebits: stats.totalDebits.amount,
			transactionCount: stats.transactionCount,
		};
	}

	/**
	 * Calcule les statistiques mensuelles
	 */
	async getMonthlyStats(
		accountId: number,
		year?: number,
		month?: number,
	): Promise<{
		income: number;
		expenses: number;
		savings: number;
		savingsRate: number;
	}> {
		const now = new Date();
		const targetYear = year ?? now.getFullYear();
		const targetMonth = month ?? now.getMonth() + 1;

		const stats = await this.balanceCalculator.calculateMonthlyStats(
			accountId,
			targetYear,
			targetMonth,
		);

		return {
			income: stats.income.amount,
			expenses: stats.expenses.amount,
			savings: stats.savings.amount,
			savingsRate: stats.savingsRate,
		};
	}
}
