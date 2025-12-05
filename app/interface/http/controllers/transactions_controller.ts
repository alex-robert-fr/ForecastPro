import type { HttpContext } from "@adonisjs/core/http";
import { services } from "#domain/services/service_provider";
import { apiResponse } from "#interface/http/responses/api_response";
import { createTransactionValidator } from "#interface/http/validators/transaction_validator";
import { DuplicateTransactionError } from "#domain/services/transaction_service";

/**
 * Controller pour les transactions
 * Couche Interface - ne contient pas de logique métier
 */
export default class TransactionsController {
	/**
	 * Liste les transactions
	 * GET /api/transactions
	 */
	async index({ response }: HttpContext) {
		const api = apiResponse({ response } as HttpContext);

		try {
			const account = await services.accountService.getOrCreateDefault();
			const transactions = await services.transactionService.getByAccountId(
				account.id,
				100,
			);

			return api.success({
				transactions,
				account: {
					id: account.id,
					name: account.name,
					bank: account.bank,
					balance: account.balance,
					initialBalance: account.initialBalance,
					currency: account.currency,
				},
			});
		} catch (error) {
			console.error("Erreur chargement transactions:", error);
			return api.serverError("Erreur lors du chargement des transactions");
		}
	}

	/**
	 * Crée une nouvelle transaction
	 * POST /api/transactions
	 */
	async store({ request, response }: HttpContext) {
		const api = apiResponse({ response } as HttpContext);

		try {
			// Validation
			const data = await request.validateUsing(createTransactionValidator);

			// Récupérer le compte par défaut
			const account = await services.accountService.getOrCreateDefault();

			// Créer la transaction
			const transaction = await services.transactionService.create(account.id, {
				date: new Date(data.date),
				label: data.label,
				amount: data.amount,
				type: data.type,
				merchant: data.merchant,
				category: data.category,
				paymentMethod: data.paymentMethod,
			});

			// Récupérer le solde mis à jour
			const updatedAccount = await services.accountService.getById(account.id);

			return api.created(
				{
					transaction,
					account: {
						id: updatedAccount!.id,
						balance: updatedAccount!.balance,
					},
				},
				"Transaction créée avec succès",
			);
		} catch (error) {
			console.error("Erreur création transaction:", error);

			if (error instanceof DuplicateTransactionError) {
				return api.conflict("Une transaction similaire existe déjà");
			}

			if ((error as any).code === "E_VALIDATION_ERROR") {
				return api.validationError(
					"Données invalides",
					(error as any).messages,
				);
			}

			return api.serverError("Erreur lors de la création de la transaction");
		}
	}

	/**
	 * Affiche une transaction
	 * GET /api/transactions/:id
	 */
	async show({ params, response }: HttpContext) {
		const api = apiResponse({ response } as HttpContext);

		try {
			const transaction = await services.transactionService.getById(params.id);

			if (!transaction) {
				return api.notFound("Transaction non trouvée");
			}

			return api.success({ transaction });
		} catch (error) {
			console.error("Erreur récupération transaction:", error);
			return api.serverError(
				"Erreur lors de la récupération de la transaction",
			);
		}
	}

	/**
	 * Met à jour la catégorie d'une transaction
	 * PATCH /api/transactions/:id/category
	 */
	async updateCategory({ params, request, response }: HttpContext) {
		const api = apiResponse({ response } as HttpContext);

		try {
			const { category } = request.only(["category"]);

			const transaction = await services.transactionService.updateCategory(
				params.id,
				category,
			);

			return api.success({ transaction }, "Catégorie mise à jour");
		} catch (error) {
			console.error("Erreur mise à jour catégorie:", error);

			if ((error as Error).message === "Transaction non trouvée") {
				return api.notFound("Transaction non trouvée");
			}

			return api.serverError("Erreur lors de la mise à jour de la catégorie");
		}
	}

	/**
	 * Supprime une transaction
	 * DELETE /api/transactions/:id
	 */
	async destroy({ params, response }: HttpContext) {
		const api = apiResponse({ response } as HttpContext);

		try {
			await services.transactionService.delete(params.id);

			// Récupérer le compte mis à jour
			const account = await services.accountService.getOrCreateDefault();

			return api.success(
				{
					account: {
						id: account.id,
						balance: account.balance,
					},
				},
				"Transaction supprimée avec succès",
			);
		} catch (error) {
			console.error("Erreur suppression transaction:", error);

			if ((error as Error).message === "Transaction non trouvée") {
				return api.notFound("Transaction non trouvée");
			}

			return api.serverError("Erreur lors de la suppression de la transaction");
		}
	}
}
