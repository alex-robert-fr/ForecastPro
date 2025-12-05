import AccountService from "#domain/services/account_service";
import TransactionService from "#domain/services/transaction_service";
import CsvParser from "#infrastructure/external/csv/csv_parser";
import TinkApiClient from "#infrastructure/external/tink/tink_api_client";
import TinkTransformer from "#infrastructure/external/tink/tink_transformer";
import AccountRepository from "#infrastructure/repositories/account_repository";
import type {
	ImportResult,
	TinkAccountData,
	BankConnectionResult,
} from "#domain/types/index";

/**
 * Service métier pour l'import de transactions
 * Couche Domain - orchestre les différentes sources d'import
 */
export default class ImportService {
	private csvParser: CsvParser;
	private tinkClient: TinkApiClient;
	private tinkTransformer: TinkTransformer;

	constructor(
		private accountService: AccountService,
		private transactionService: TransactionService,
		private accountRepo: AccountRepository,
	) {
		this.csvParser = new CsvParser();
		this.tinkClient = new TinkApiClient();
		this.tinkTransformer = new TinkTransformer();
	}

	/**
	 * Importe des transactions depuis un fichier CSV
	 */
	async importFromCsv(
		csvContent: string,
		filename: string,
	): Promise<ImportResult> {
		// Parser le CSV
		const { transactions, errors: parseErrors } =
			this.csvParser.parse(csvContent);

		if (transactions.length === 0 && parseErrors.length > 0) {
			return {
				imported: 0,
				skipped: 0,
				errors: parseErrors,
				batchId: 0,
			};
		}

		// Récupérer ou créer le compte par défaut
		const account = await this.accountService.getOrCreateDefault();

		// Importer les transactions
		const result = await this.transactionService.importBatch(
			account.id,
			filename,
			transactions,
		);

		// Ajouter les erreurs de parsing
		result.errors = [...parseErrors, ...result.errors];

		return result;
	}

	/**
	 * Génère l'URL d'authentification Tink
	 */
	generateTinkAuthUrl(redirectUri: string, state?: string): string {
		return this.tinkClient.generateAuthUrl({
			redirectUri,
			state,
			market: "FR",
			locale: "fr_FR",
			test: true, // TODO: Configurable via env
		});
	}

	/**
	 * Échange le code Tink et importe les transactions
	 */
	async processTinkCallback(
		code: string,
		redirectUri: string,
	): Promise<BankConnectionResult> {
		// Échanger le code contre un token
		const tokenData = await this.tinkClient.exchangeCodeForToken(
			code,
			redirectUri,
		);

		// Récupérer les comptes
		const rawAccounts = await this.tinkClient.getAccounts(
			tokenData.access_token,
		);
		const accounts = this.tinkTransformer.transformAccounts(rawAccounts);

		// Récupérer les transactions
		const rawTransactions = await this.tinkClient.getTransactions(
			tokenData.access_token,
			undefined,
			500,
		);
		const transactions =
			this.tinkTransformer.transformTransactions(rawTransactions);

		// Mettre à jour les infos du compte avec Tink
		const account = await this.accountService.getOrCreateDefault();

		// Sélectionner le compte courant (CHECKING) en priorité, sinon le premier compte
		const tinkAccount = this.selectPrimaryAccount(accounts);

		console.log(
			`📊 Comptes Tink disponibles:`,
			accounts.map((a) => ({
				name: a.name,
				type: a.type,
				balance: a.balance,
			})),
		);
		console.log(
			`📌 Compte sélectionné:`,
			tinkAccount?.name,
			tinkAccount?.type,
			tinkAccount?.balance,
		);

		if (tinkAccount) {
			await this.accountService.updateBankInfo(account.id, {
				name: tinkAccount.name || account.name,
				bank: "Tink",
				accountNumber: tinkAccount.iban,
				currency: tinkAccount.currency,
			});
		}

		// Importer les transactions
		const importResult = await this.transactionService.importFromTink(
			account.id,
			transactions,
		);

		// Ajuster le solde initial pour correspondre au solde réel de Tink
		// solde_initial = solde_tink - (crédits - débits_importés)
		if (tinkAccount?.balance !== null && tinkAccount?.balance !== undefined) {
			await this.adjustInitialBalanceFromTink(account.id, tinkAccount.balance);
		}

		return {
			accessToken: tokenData.access_token,
			expiresIn: tokenData.expires_in,
			accounts,
			importResult,
		};
	}

	/**
	 * Synchronise les transactions depuis Tink
	 */
	async syncFromTink(
		accessToken: string,
		accountId?: string,
	): Promise<{
		count: number;
		transactions: Array<{
			externalId: string;
			date: string;
			amount: number;
			description: string;
			type: "credit" | "debit";
		}>;
	}> {
		const rawTransactions = await this.tinkClient.getTransactions(
			accessToken,
			accountId,
			500,
		);
		const transactions =
			this.tinkTransformer.transformTransactions(rawTransactions);

		return {
			count: transactions.length,
			transactions,
		};
	}

	/**
	 * Récupère les comptes depuis Tink
	 */
	async getTinkAccounts(accessToken: string): Promise<TinkAccountData[]> {
		const rawAccounts = await this.tinkClient.getAccounts(accessToken);
		return this.tinkTransformer.transformAccounts(rawAccounts);
	}

	/**
	 * Sélectionne le compte principal parmi les comptes Tink
	 * Priorité : compte courant (CHECKING) > autres types
	 */
	private selectPrimaryAccount(
		accounts: TinkAccountData[],
	): TinkAccountData | undefined {
		if (accounts.length === 0) return undefined;

		// Chercher un compte courant (CHECKING) en priorité
		const checkingAccount = accounts.find(
			(acc) =>
				acc.type?.toUpperCase() === "CHECKING" ||
				acc.type?.toUpperCase() === "CURRENT" ||
				acc.name?.toLowerCase().includes("courant"),
		);

		if (checkingAccount) {
			return checkingAccount;
		}

		// Sinon, retourner le premier compte
		return accounts[0];
	}

	/**
	 * Ajuste le solde initial pour correspondre au solde réel de Tink
	 *
	 * Le solde Tink est le solde réel actuel du compte.
	 * Pour que notre calcul (solde_initial + crédits - débits = solde_actuel) soit correct,
	 * on doit calculer le solde initial ainsi :
	 *
	 * solde_initial = solde_tink - crédits + débits
	 *
	 * Où crédits et débits sont les montants des transactions importées.
	 */
	private async adjustInitialBalanceFromTink(
		accountId: number,
		tinkBalance: number,
	): Promise<void> {
		try {
			// Récupérer le compte
			const account = await this.accountRepo.findById(accountId);
			if (!account) return;

			// Calculer la somme des transactions importées
			// Crédits = transactions positives, Débits = transactions négatives (en valeur absolue)
			const Transaction = (await import("#models/transaction")).default;

			const creditsResult = await Transaction.query()
				.where("accountId", accountId)
				.where("type", "credit")
				.sum("amount as total")
				.first();

			const debitsResult = await Transaction.query()
				.where("accountId", accountId)
				.where("type", "debit")
				.sum("amount as total")
				.first();

			const credits = parseFloat(creditsResult?.$extras?.total) || 0;
			const debitsRaw = parseFloat(debitsResult?.$extras?.total) || 0;
			const debits = Math.abs(debitsRaw);

			// Calculer le solde initial correct
			// solde_tink = solde_initial + crédits - débits
			// Donc: solde_initial = solde_tink - crédits + débits
			const calculatedInitialBalance = tinkBalance - credits + debits;

			console.log(`📊 Ajustement solde initial depuis Tink:`);
			console.log(`   Solde Tink: ${tinkBalance}`);
			console.log(`   Crédits importés: ${credits}`);
			console.log(`   Débits importés: ${debits}`);
			console.log(`   Solde initial calculé: ${calculatedInitialBalance}`);

			// Mettre à jour le solde initial et recalculer
			account.initialBalance = calculatedInitialBalance;
			account.balance = tinkBalance; // Le solde réel est celui de Tink
			await account.save();

			console.log(
				`✅ Solde ajusté: initial=${calculatedInitialBalance}, actuel=${tinkBalance}`,
			);
		} catch (error) {
			console.error("Erreur ajustement solde initial:", error);
			// Ne pas faire échouer l'import pour une erreur de calcul de solde
		}
	}
}
