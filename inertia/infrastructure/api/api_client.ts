/**
 * Erreur API personnalisée
 */
export class ApiError extends Error {
	constructor(
		message: string,
		public code: string,
		public status: number,
		public details?: unknown,
	) {
		super(message);
		this.name = "ApiError";
	}
}

/**
 * Client API centralisé
 * Couche Infrastructure - gère la communication avec le backend
 */
export class ApiClient {
	private baseUrl = "/api";

	/**
	 * Récupère le token CSRF depuis les cookies
	 */
	private getCsrfToken(): string {
		if (typeof document === "undefined") return "";
		const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
		return match ? decodeURIComponent(match[1]) : "";
	}

	/**
	 * Effectue une requête HTTP
	 */
	async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const isFormData = options.body instanceof FormData;

		const response = await fetch(`${this.baseUrl}${endpoint}`, {
			...options,
			headers: {
				...(!isFormData && { "Content-Type": "application/json" }),
				"X-XSRF-TOKEN": this.getCsrfToken(),
				...options.headers,
			},
		});

		const data = await response.json();

		// Vérifier si la réponse est un succès
		if (!response.ok || data.success === false) {
			throw new ApiError(
				data.error?.message || data.message || "Erreur API",
				data.error?.code || "UNKNOWN_ERROR",
				response.status,
				data.error?.details,
			);
		}

		// Retourner les données
		return data.data !== undefined ? data.data : data;
	}

	/**
	 * Requête GET
	 */
	get<T>(endpoint: string): Promise<T> {
		return this.request<T>(endpoint, { method: "GET" });
	}

	/**
	 * Requête POST avec JSON
	 */
	post<T>(endpoint: string, body?: unknown): Promise<T> {
		return this.request<T>(endpoint, {
			method: "POST",
			body: body instanceof FormData ? body : JSON.stringify(body),
		});
	}

	/**
	 * Requête PUT
	 */
	put<T>(endpoint: string, body: unknown): Promise<T> {
		return this.request<T>(endpoint, {
			method: "PUT",
			body: JSON.stringify(body),
		});
	}

	/**
	 * Requête PATCH
	 */
	patch<T>(endpoint: string, body: unknown): Promise<T> {
		return this.request<T>(endpoint, {
			method: "PATCH",
			body: JSON.stringify(body),
		});
	}

	/**
	 * Requête DELETE
	 */
	delete<T>(endpoint: string): Promise<T> {
		return this.request<T>(endpoint, { method: "DELETE" });
	}

	/**
	 * Upload de fichier
	 */
	upload<T>(
		endpoint: string,
		file: File,
		fieldName: string = "file",
	): Promise<T> {
		const formData = new FormData();
		formData.append(fieldName, file);
		return this.post<T>(endpoint, formData);
	}
}

// Instance singleton
export const apiClient = new ApiClient();
