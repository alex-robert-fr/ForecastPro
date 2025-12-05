import type { HttpContext } from "@adonisjs/core/http";
import { services } from "#domain/services/service_provider";
import { apiResponse } from "#interface/http/responses/api_response";
import {
	tinkCodeValidator,
	tinkSyncValidator,
} from "#interface/http/validators/import_validator";

/**
 * Controller pour les connexions bancaires (Tink)
 * Couche Interface - ne contient pas de logique métier
 */
export default class BankConnectionsController {
	/**
	 * Liste les banques disponibles
	 * GET /api/banks
	 */
	async listBanks({ response }: HttpContext) {
		const api = apiResponse({ response } as HttpContext);

		return api.success({
			message: "Utilisez Tink Link pour sélectionner votre banque",
			info: "POST /api/bank-connections pour initier la connexion",
		});
	}

	/**
	 * Initie une connexion bancaire via Tink Link
	 * POST /api/bank-connections
	 */
	async create({ request, response }: HttpContext) {
		const api = apiResponse({ response } as HttpContext);

		try {
			// Construire l'URL de callback
			const host = request.host() || "localhost:3333";
			const protocol = host.includes("localhost") ? "http" : "https";
			const redirectUri = `${protocol}://${host}/api/bank-connections/callback`;

			// Générer un state unique pour la sécurité CSRF
			const state = `fp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

			// Générer l'URL Tink Link
			const authUrl = services.importService.generateTinkAuthUrl(
				redirectUri,
				state,
			);

			return api.success({
				authUrl,
				state,
				redirectUri,
				message: "Redirigez l'utilisateur vers authUrl",
			});
		} catch (error) {
			console.error("Erreur création connexion:", error);
			return api.serverError("Erreur lors de la création de la connexion");
		}
	}

	/**
	 * Callback après authentification via Tink Link
	 * GET /api/bank-connections/callback
	 */
	async callback({ request, response }: HttpContext) {
		const code = request.input("code");
		const error = request.input("error");
		const errorMessage = request.input("message");

		if (error) {
			console.error("Erreur Tink:", error, errorMessage);
			return response.redirect(
				`/settings?bankConnection=error&message=${encodeURIComponent(errorMessage || error)}`,
			);
		}

		if (code) {
			return response.redirect(`/settings?bankConnection=success&code=${code}`);
		}

		return response.redirect(
			"/settings?bankConnection=error&message=Paramètres manquants",
		);
	}

	/**
	 * Échange le code contre un token et importe les transactions
	 * POST /api/tink/token
	 */
	async exchangeToken({ request, response }: HttpContext) {
		const api = apiResponse({ response } as HttpContext);

		try {
			const { code } = await request.validateUsing(tinkCodeValidator);

			// Construire le redirect_uri
			const host = request.host() || "localhost:3333";
			const protocol = host.includes("localhost") ? "http" : "https";
			const redirectUri = `${protocol}://${host}/api/bank-connections/callback`;

			// Échanger le code et importer les transactions
			const result = await services.importService.processTinkCallback(
				code,
				redirectUri,
			);

			return api.success({
				accessToken: result.accessToken,
				expiresIn: result.expiresIn,
				accounts: result.accounts,
				import: result.importResult
					? {
							imported: result.importResult.imported,
							skipped: result.importResult.skipped,
							batchId: result.importResult.batchId,
						}
					: null,
				message: result.importResult
					? `${result.importResult.imported} transactions importées, ${result.importResult.skipped} ignorées`
					: "Comptes connectés",
			});
		} catch (error) {
			console.error("Erreur échange token:", error);
			return api.serverError(
				"Erreur lors de l'import",
				error instanceof Error ? error.message : undefined,
			);
		}
	}

	/**
	 * Récupère les comptes Tink
	 * GET /api/tink/accounts
	 */
	async getAccounts({ request, response }: HttpContext) {
		const api = apiResponse({ response } as HttpContext);

		try {
			const authHeader = request.header("Authorization");
			const userToken = authHeader?.replace("Bearer ", "");

			if (!userToken) {
				return api.badRequest("Token utilisateur requis");
			}

			const accounts = await services.importService.getTinkAccounts(userToken);

			return api.success({ accounts });
		} catch (error) {
			console.error("Erreur récupération comptes:", error);
			return api.serverError("Erreur lors de la récupération des comptes");
		}
	}

	/**
	 * Synchronise les transactions
	 * POST /api/bank-connections/sync
	 */
	async sync({ request, response }: HttpContext) {
		const api = apiResponse({ response } as HttpContext);

		try {
			const { accessToken, accountId } =
				await request.validateUsing(tinkSyncValidator);

			const result = await services.importService.syncFromTink(
				accessToken,
				accountId,
			);

			return api.success({
				count: result.count,
				transactions: result.transactions,
			});
		} catch (error) {
			console.error("Erreur sync:", error);
			return api.serverError("Erreur lors de la synchronisation");
		}
	}

	/**
	 * Déconnecte le compte bancaire et supprime les données
	 * DELETE /api/bank-connections/disconnect
	 */
	async disconnect({ response }: HttpContext) {
		const api = apiResponse({ response } as HttpContext);

		try {
			const account = await services.accountService.getOrCreateDefault();
			const result = await services.accountService.resetAccount(account.id);

			return api.success(
				{
					deletedTransactions: result.deletedTransactions,
					newBalance: result.newBalance,
				},
				`${result.deletedTransactions} transactions supprimées, compte réinitialisé`,
			);
		} catch (error) {
			console.error("Erreur déconnexion:", error);
			return api.serverError("Erreur lors de la déconnexion");
		}
	}

	/**
	 * Liste les connexions (stub)
	 * GET /api/bank-connections
	 */
	async index({ response }: HttpContext) {
		const api = apiResponse({ response } as HttpContext);
		return api.success({ connections: [] });
	}

	/**
	 * Ajuste le solde initial basé sur le solde réel Tink
	 * POST /api/bank-connections/adjust-balance
	 */
	async adjustBalance({ request, response }: HttpContext) {
		const api = apiResponse({ response } as HttpContext);

		try {
			const { accessToken, tinkBalance } = request.only([
				"accessToken",
				"tinkBalance",
			]);

			if (tinkBalance === undefined || tinkBalance === null) {
				return api.badRequest("Le solde Tink est requis");
			}

			const account = await services.accountService.getOrCreateDefault();

			// Importer Transaction pour calculer
			const Transaction = (await import("#models/transaction")).default;

			const creditsResult = await Transaction.query()
				.where("accountId", account.id)
				.where("type", "credit")
				.sum("amount as total")
				.first();

			const debitsResult = await Transaction.query()
				.where("accountId", account.id)
				.where("type", "debit")
				.sum("amount as total")
				.first();

			const credits = parseFloat(creditsResult?.$extras?.total) || 0;
			const debitsRaw = parseFloat(debitsResult?.$extras?.total) || 0;
			const debits = Math.abs(debitsRaw);

			// solde_initial = solde_tink - crédits + débits
			const newInitialBalance = parseFloat(tinkBalance) - credits + debits;
			const oldInitialBalance = account.initialBalance;
			const oldBalance = account.balance;

			// Mettre à jour
			await services.accountService.updateSettings(account.id, {
				initialBalance: newInitialBalance,
			});

			// Recalculer le solde
			const newBalance = await services.balanceCalculator.recalculateForAccount(
				account.id,
			);

			return api.success(
				{
					oldInitialBalance,
					newInitialBalance,
					oldBalance,
					newBalance,
					tinkBalance: parseFloat(tinkBalance),
					credits,
					debits,
				},
				`Solde initial ajusté de ${oldInitialBalance} à ${newInitialBalance}`,
			);
		} catch (error) {
			console.error("Erreur ajustement solde:", error);
			return api.serverError("Erreur lors de l'ajustement du solde");
		}
	}
}
