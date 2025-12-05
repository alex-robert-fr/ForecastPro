import Account from "#models/account";
import type { CreateAccountDto } from "#domain/types/index";

/**
 * Repository pour l'accès aux données des comptes
 * Couche technique - ne contient pas de logique métier
 */
export default class AccountRepository {
	/**
	 * Trouve un compte par son ID
	 */
	async findById(id: number): Promise<Account | null> {
		return Account.find(id);
	}

	/**
	 * Trouve le compte par défaut
	 */
	async findDefault(): Promise<Account | null> {
		return Account.query().where("isDefault", true).first();
	}

	/**
	 * Récupère tous les comptes
	 */
	async findAll(): Promise<Account[]> {
		return Account.query().orderBy("isDefault", "desc").orderBy("name", "asc");
	}

	/**
	 * Trouve un compte par numéro de compte
	 */
	async findByAccountNumber(accountNumber: string): Promise<Account | null> {
		return Account.query().where("accountNumber", accountNumber).first();
	}

	/**
	 * Trouve un compte par nom
	 */
	async findByName(name: string): Promise<Account | null> {
		return Account.query().where("name", name).first();
	}

	/**
	 * Crée un nouveau compte
	 */
	async create(data: CreateAccountDto): Promise<Account> {
		return Account.create({
			name: data.name,
			bank: data.bank ?? null,
			accountNumber: data.accountNumber ?? null,
			currency: data.currency ?? "EUR",
			isDefault: data.isDefault ?? false,
			initialBalance: data.initialBalance ?? 0,
			balance: data.initialBalance ?? 0,
		});
	}

	/**
	 * Met à jour un compte
	 */
	async update(
		id: number,
		data: Partial<{
			name: string;
			bank: string | null;
			accountNumber: string | null;
			currency: string;
			isDefault: boolean;
			initialBalance: number;
			balance: number;
		}>,
	): Promise<Account | null> {
		const account = await this.findById(id);
		if (!account) return null;

		account.merge(data);
		await account.save();

		return account;
	}

	/**
	 * Met à jour le solde d'un compte
	 */
	async updateBalance(id: number, balance: number): Promise<Account | null> {
		const account = await this.findById(id);
		if (!account) return null;

		account.balance = balance;
		await account.save();

		return account;
	}

	/**
	 * Met à jour le solde initial d'un compte
	 */
	async updateInitialBalance(
		id: number,
		initialBalance: number,
	): Promise<Account | null> {
		const account = await this.findById(id);
		if (!account) return null;

		account.initialBalance = initialBalance;
		await account.save();

		return account;
	}

	/**
	 * Réinitialise un compte à son état initial
	 */
	async resetToInitialState(id: number): Promise<Account | null> {
		const account = await this.findById(id);
		if (!account) return null;

		const initialBalance = parseFloat(String(account.initialBalance)) || 0;

		account.balance = initialBalance;
		account.bank = null;
		account.accountNumber = null;
		account.name = "Compte Principal";

		await account.save();

		return account;
	}

	/**
	 * Supprime un compte
	 */
	async delete(id: number): Promise<boolean> {
		const account = await this.findById(id);
		if (!account) return false;

		await account.delete();
		return true;
	}

	/**
	 * Définit un compte comme compte par défaut
	 * Retire le flag isDefault des autres comptes
	 */
	async setAsDefault(id: number): Promise<Account | null> {
		// Retirer le flag des autres comptes
		await Account.query().where("isDefault", true).update({ isDefault: false });

		// Définir le nouveau compte par défaut
		const account = await this.findById(id);
		if (!account) return null;

		account.isDefault = true;
		await account.save();

		return account;
	}

	/**
	 * Met à jour les informations bancaires (depuis Tink)
	 */
	async updateBankInfo(
		id: number,
		data: {
			name?: string;
			bank?: string | null;
			accountNumber?: string | null;
			currency?: string;
		},
	): Promise<Account | null> {
		const account = await this.findById(id);
		if (!account) return null;

		if (data.name) account.name = data.name;
		if (data.bank !== undefined) account.bank = data.bank;
		if (data.accountNumber !== undefined)
			account.accountNumber = data.accountNumber;
		if (data.currency) account.currency = data.currency;

		await account.save();

		return account;
	}
}
