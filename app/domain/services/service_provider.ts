import AccountRepository from "#infrastructure/repositories/account_repository";
import TransactionRepository from "#infrastructure/repositories/transaction_repository";
import ImportBatchRepository from "#infrastructure/repositories/import_batch_repository";
import CategoryRuleRepository from "#infrastructure/repositories/category_rule_repository";
import BalanceCalculator from "#domain/services/balance_calculator";
import AccountService from "#domain/services/account_service";
import TransactionService from "#domain/services/transaction_service";
import ImportService from "#domain/services/import_service";

/**
 * Provider de services
 * Centralise l'instanciation et l'injection de dépendances
 * Pattern: Service Locator / Simple IoC
 */
class ServiceProvider {
	// Repositories (singletons)
	private _accountRepo?: AccountRepository;
	private _transactionRepo?: TransactionRepository;
	private _importBatchRepo?: ImportBatchRepository;
	private _categoryRuleRepo?: CategoryRuleRepository;

	// Services (singletons)
	private _balanceCalculator?: BalanceCalculator;
	private _accountService?: AccountService;
	private _transactionService?: TransactionService;
	private _importService?: ImportService;

	// ============================================================================
	// REPOSITORIES
	// ============================================================================

	get accountRepository(): AccountRepository {
		if (!this._accountRepo) {
			this._accountRepo = new AccountRepository();
		}
		return this._accountRepo;
	}

	get transactionRepository(): TransactionRepository {
		if (!this._transactionRepo) {
			this._transactionRepo = new TransactionRepository();
		}
		return this._transactionRepo;
	}

	get importBatchRepository(): ImportBatchRepository {
		if (!this._importBatchRepo) {
			this._importBatchRepo = new ImportBatchRepository();
		}
		return this._importBatchRepo;
	}

	get categoryRuleRepository(): CategoryRuleRepository {
		if (!this._categoryRuleRepo) {
			this._categoryRuleRepo = new CategoryRuleRepository();
		}
		return this._categoryRuleRepo;
	}

	// ============================================================================
	// SERVICES
	// ============================================================================

	get balanceCalculator(): BalanceCalculator {
		if (!this._balanceCalculator) {
			this._balanceCalculator = new BalanceCalculator(
				this.transactionRepository,
				this.accountRepository,
			);
		}
		return this._balanceCalculator;
	}

	get accountService(): AccountService {
		if (!this._accountService) {
			this._accountService = new AccountService(
				this.accountRepository,
				this.transactionRepository,
				this.importBatchRepository,
				this.balanceCalculator,
			);
		}
		return this._accountService;
	}

	get transactionService(): TransactionService {
		if (!this._transactionService) {
			this._transactionService = new TransactionService(
				this.transactionRepository,
				this.accountRepository,
				this.importBatchRepository,
				this.balanceCalculator,
			);
		}
		return this._transactionService;
	}

	get importService(): ImportService {
		if (!this._importService) {
			this._importService = new ImportService(
				this.accountService,
				this.transactionService,
				this.accountRepository,
			);
		}
		return this._importService;
	}

	// ============================================================================
	// RESET (pour les tests)
	// ============================================================================

	reset(): void {
		this._accountRepo = undefined;
		this._transactionRepo = undefined;
		this._importBatchRepo = undefined;
		this._categoryRuleRepo = undefined;
		this._balanceCalculator = undefined;
		this._accountService = undefined;
		this._transactionService = undefined;
		this._importService = undefined;
	}
}

// Export d'une instance singleton
export const services = new ServiceProvider();

// Export des types pour faciliter l'utilisation
export { AccountService, TransactionService, ImportService, BalanceCalculator };
