import env from "#start/env";

/**
 * Types pour l'API Tink
 */
export interface TinkToken {
	access_token: string;
	token_type: string;
	expires_in: number;
	scope: string;
}

export interface TinkAccountRaw {
	id: string;
	name: string;
	type: string;
	balances?: {
		booked?: {
			amount: {
				value: {
					unscaledValue: string;
					scale: string;
				};
				currencyCode: string;
			};
		};
	};
	identifiers?: {
		iban?: {
			iban: string;
		};
	};
}

export interface TinkTransactionRaw {
	id: string;
	accountId: string;
	amount: {
		value: {
			unscaledValue: string;
			scale: string;
		};
		currencyCode: string;
	};
	descriptions: {
		original: string;
		display?: string;
	};
	dates: {
		booked: string;
	};
	status: string;
}

/**
 * Client API Tink (Open Banking)
 * Couche technique - gère la communication avec l'API externe
 */
export default class TinkApiClient {
	private readonly baseUrl = "https://api.tink.com";
	private readonly clientId: string;
	private readonly clientSecret: string;

	constructor() {
		this.clientId = env.get("TINK_CLIENT_ID", "");
		this.clientSecret = env.get("TINK_CLIENT_SECRET", "");

		if (!this.clientId || !this.clientSecret) {
			console.warn("⚠️ TINK_CLIENT_ID ou TINK_CLIENT_SECRET non configuré");
		}
	}

	/**
	 * Génère l'URL Tink Link pour l'authentification OAuth2
	 */
	generateAuthUrl(params: {
		redirectUri: string;
		state?: string;
		market?: string;
		locale?: string;
		test?: boolean;
	}): string {
		const baseUrl = "https://link.tink.com/1.0/transactions/connect-accounts";
		const scope =
			"accounts:read,transactions:read,balances:read,credentials:read";

		const queryParams = new URLSearchParams({
			client_id: this.clientId,
			redirect_uri: params.redirectUri,
			scope: scope,
			market: params.market || "FR",
			locale: params.locale || "fr_FR",
			response_type: "code",
			input_provider: "",
		});

		if (params.state) {
			queryParams.append("state", params.state);
		}

		if (params.test) {
			queryParams.append("test", "true");
		}

		// Ajouter un timestamp pour éviter le cache
		queryParams.append("t", Date.now().toString());

		return `${baseUrl}?${queryParams.toString()}`;
	}

	/**
	 * Échange le code d'autorisation contre un access token
	 */
	async exchangeCodeForToken(
		code: string,
		redirectUri: string,
	): Promise<TinkToken> {
		const response = await fetch(`${this.baseUrl}/api/v1/oauth/token`, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				client_id: this.clientId,
				client_secret: this.clientSecret,
				grant_type: "authorization_code",
				code: code,
				redirect_uri: redirectUri,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Erreur échange code (${response.status}): ${errorText}`);
		}

		return response.json();
	}

	/**
	 * Récupère les comptes bancaires
	 */
	async getAccounts(accessToken: string): Promise<TinkAccountRaw[]> {
		const response = await fetch(`${this.baseUrl}/data/v2/accounts`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Erreur comptes (${response.status}): ${errorText}`);
		}

		const data = await response.json();
		return data.accounts || [];
	}

	/**
	 * Récupère les transactions
	 */
	async getTransactions(
		accessToken: string,
		accountId?: string,
		pageSize: number = 100,
	): Promise<TinkTransactionRaw[]> {
		let url = `${this.baseUrl}/data/v2/transactions?pageSize=${pageSize}`;
		if (accountId) {
			url += `&accountIdIn=${accountId}`;
		}

		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Erreur transactions (${response.status}): ${errorText}`);
		}

		const data = await response.json();
		return data.transactions || [];
	}
}
