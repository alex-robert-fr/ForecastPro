import type { HttpContext } from "@adonisjs/core/http";
import { services } from "#domain/services/service_provider";
import { apiResponse } from "#interface/http/responses/api_response";
import { updateSettingsValidator } from "#interface/http/validators/settings_validator";
import Transaction from "#models/transaction";

/**
 * Controller pour les comptes
 * Couche Interface - ne contient pas de logique métier
 */
export default class AccountsController {
	/**
	 * Affiche la page des paramètres
	 * GET /settings
	 */
	async show({ inertia }: HttpContext) {
		const account = await services.accountService.getOrCreateDefault();

		return inertia.render("settings", {
			account: {
				id: account.id,
				name: account.name,
				bank: account.bank,
				initialBalance: account.initialBalance || 0,
				balance: account.balance,
			},
		});
	}

	/**
	 * Met à jour les paramètres du compte
	 * PUT /api/settings
	 */
	async update({ request, response }: HttpContext) {
		const api = apiResponse({ response } as HttpContext);

		try {
			const data = await request.validateUsing(updateSettingsValidator);

			// Récupérer le compte par défaut
			const account = await services.accountService.getOrCreateDefault();

			// Mettre à jour les paramètres
			const updatedAccount = await services.accountService.updateSettings(
				account.id,
				{
					initialBalance: data.initialBalance,
					name: data.name,
					bank: data.bank,
				},
			);

			return api.success(
				{
					account: {
						id: updatedAccount.id,
						initialBalance: updatedAccount.initialBalance,
						balance: updatedAccount.balance,
					},
				},
				"Paramètres mis à jour avec succès",
			);
		} catch (error) {
			console.error("Erreur mise à jour paramètres:", error);

			if ((error as any).code === "E_VALIDATION_ERROR") {
				return api.validationError(
					"Données invalides",
					(error as any).messages,
				);
			}

			return api.serverError("Erreur lors de la mise à jour des paramètres");
		}
	}

	/**
	 * Récupère les statistiques du compte
	 * GET /api/accounts/stats
	 */
	async stats({ response }: HttpContext) {
		const api = apiResponse({ response } as HttpContext);

		try {
			const account = await services.accountService.getOrCreateDefault();
			const stats = await services.accountService.getStats(account.id);
			const monthlyStats = await services.accountService.getMonthlyStats(
				account.id,
			);

			return api.success({
				account: {
					id: account.id,
					name: account.name,
					balance: account.balance,
				},
				stats,
				monthly: monthlyStats,
			});
		} catch (error) {
			console.error("Erreur récupération stats:", error);
			return api.serverError("Erreur lors de la récupération des statistiques");
		}
	}

	/**
	 * Debug et recalcul du solde
	 * GET /api/accounts/debug-balance
	 */
	async debugBalance({ response }: HttpContext) {
		const api = apiResponse({ response } as HttpContext);

		try {
			const account = await services.accountService.getOrCreateDefault();

			// Calculer les crédits
			const creditsResult = await Transaction.query()
				.where("accountId", account.id)
				.where("type", "credit")
				.sum("amount as total")
				.first();

			// Calculer les débits
			const debitsResult = await Transaction.query()
				.where("accountId", account.id)
				.where("type", "debit")
				.sum("amount as total")
				.first();

			const credits = parseFloat(creditsResult?.$extras?.total) || 0;
			const debitsRaw = parseFloat(debitsResult?.$extras?.total) || 0;
			const debits = Math.abs(debitsRaw);

			const initialBalance = parseFloat(String(account.initialBalance)) || 0;
			const calculatedBalance = initialBalance + credits - debits;
			const currentBalance = account.balance;
			const difference = currentBalance - calculatedBalance;

			// Compter les transactions
			const creditCount = await Transaction.query()
				.where("accountId", account.id)
				.where("type", "credit")
				.count("* as total")
				.first();

			const debitCount = await Transaction.query()
				.where("accountId", account.id)
				.where("type", "debit")
				.count("* as total")
				.first();

			return api.success({
				debug: {
					initialBalance,
					credits,
					debitsRaw,
					debitsAbs: debits,
					formula: `${initialBalance} + ${credits} - ${debits}`,
					calculatedBalance,
					currentBalanceInDb: currentBalance,
					difference,
					creditCount: creditCount?.$extras?.total || 0,
					debitCount: debitCount?.$extras?.total || 0,
				},
			});
		} catch (error) {
			console.error("Erreur debug balance:", error);
			return api.serverError("Erreur lors du debug");
		}
	}

	/**
	 * Force le recalcul du solde
	 * POST /api/accounts/recalculate-balance
	 */
	async recalculateBalance({ response }: HttpContext) {
		const api = apiResponse({ response } as HttpContext);

		try {
			const account = await services.accountService.getOrCreateDefault();
			const oldBalance = account.balance;

			// Forcer le recalcul via le service
			const newBalance = await services.balanceCalculator.recalculateForAccount(
				account.id,
			);

			return api.success({
				oldBalance,
				newBalance,
				difference: oldBalance - newBalance,
				message: `Solde recalculé: ${oldBalance} → ${newBalance}`,
			});
		} catch (error) {
			console.error("Erreur recalcul balance:", error);
			return api.serverError("Erreur lors du recalcul");
		}
	}
}
