import type { HttpContext } from "@adonisjs/core/http";

/**
 * Interface pour une réponse API réussie
 */
export interface ApiSuccessResponse<T> {
	success: true;
	data: T;
	message?: string;
}

/**
 * Interface pour une réponse API en erreur
 */
export interface ApiErrorResponse {
	success: false;
	error: {
		code: string;
		message: string;
		details?: unknown;
	};
}

/**
 * Type union pour toutes les réponses API
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Helper pour formater les réponses API de manière cohérente
 * Couche Interface - utilisé par les controllers
 */
export class ApiResponseHelper {
	constructor(private response: HttpContext["response"]) {}

	/**
	 * Réponse réussie (200 OK par défaut)
	 */
	success<T>(data: T, message?: string, statusCode: number = 200) {
		return this.response.status(statusCode).json({
			success: true,
			data,
			message,
		} satisfies ApiSuccessResponse<T>);
	}

	/**
	 * Réponse de création (201 Created)
	 */
	created<T>(data: T, message?: string) {
		return this.success(data, message, 201);
	}

	/**
	 * Réponse sans contenu (204 No Content)
	 */
	noContent() {
		return this.response.status(204).send("");
	}

	/**
	 * Réponse d'erreur générique
	 */
	error(
		code: string,
		message: string,
		statusCode: number = 400,
		details?: unknown,
	) {
		return this.response.status(statusCode).json({
			success: false,
			error: { code, message, details },
		} satisfies ApiErrorResponse);
	}

	/**
	 * Erreur de requête invalide (400 Bad Request)
	 */
	badRequest(message: string, details?: unknown) {
		return this.error("BAD_REQUEST", message, 400, details);
	}

	/**
	 * Erreur de validation (422 Unprocessable Entity)
	 */
	validationError(message: string, details?: unknown) {
		return this.error("VALIDATION_ERROR", message, 422, details);
	}

	/**
	 * Ressource non trouvée (404 Not Found)
	 */
	notFound(message: string = "Ressource non trouvée") {
		return this.error("NOT_FOUND", message, 404);
	}

	/**
	 * Conflit (409 Conflict)
	 */
	conflict(message: string) {
		return this.error("CONFLICT", message, 409);
	}

	/**
	 * Erreur serveur (500 Internal Server Error)
	 */
	serverError(
		message: string = "Erreur interne du serveur",
		details?: unknown,
	) {
		return this.error("INTERNAL_ERROR", message, 500, details);
	}

	/**
	 * Service indisponible (503 Service Unavailable)
	 */
	serviceUnavailable(message: string = "Service temporairement indisponible") {
		return this.error("SERVICE_UNAVAILABLE", message, 503);
	}
}

/**
 * Factory function pour créer un helper depuis le contexte HTTP
 */
export function apiResponse(ctx: HttpContext): ApiResponseHelper {
	return new ApiResponseHelper(ctx.response);
}
