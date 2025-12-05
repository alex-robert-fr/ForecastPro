import type { HttpContext } from "@adonisjs/core/http";
import { services } from "#domain/services/service_provider";
import { apiResponse } from "#interface/http/responses/api_response";

/**
 * Controller pour l'import de fichiers CSV
 * Couche Interface - ne contient pas de logique métier
 */
export default class ImportsController {
	/**
	 * Importe un fichier CSV
	 * POST /api/import
	 */
	async store({ request, response }: HttpContext) {
		const api = apiResponse({ response } as HttpContext);

		try {
			// Récupérer le fichier
			const file = request.file("csv", {
				size: "10mb",
				extnames: ["csv"],
			});

			if (!file) {
				return api.badRequest("Aucun fichier CSV fourni");
			}

			if (!file.isValid) {
				return api.validationError("Fichier invalide", file.errors);
			}

			// Lire le contenu du fichier
			if (!file.tmpPath) {
				return api.badRequest("Impossible de lire le fichier");
			}

			const fs = await import("node:fs/promises");
			const content = await fs.readFile(file.tmpPath, "utf-8");

			if (!content) {
				return api.badRequest("Le fichier est vide");
			}

			// Importer via le service
			const result = await services.importService.importFromCsv(
				content,
				file.clientName,
			);

			if (result.imported === 0 && result.errors.length > 0) {
				return api.badRequest("Erreur lors du parsing du fichier", {
					errors: result.errors,
				});
			}

			return api.success(
				{
					batchId: result.batchId,
					rowsImported: result.imported,
					rowsSkipped: result.skipped,
					parsingErrors: result.errors,
				},
				`Import terminé: ${result.imported} transactions importées`,
			);
		} catch (error) {
			console.error("Erreur import CSV:", error);
			return api.serverError(
				"Erreur lors du traitement du fichier",
				error instanceof Error ? error.message : undefined,
			);
		}
	}
}
