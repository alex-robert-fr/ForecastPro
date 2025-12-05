import vine from "@vinejs/vine";

/**
 * Validateur pour l'échange de code Tink
 */
export const tinkCodeValidator = vine.compile(
	vine.object({
		code: vine.string().trim().minLength(1),
	}),
);

/**
 * Validateur pour la synchronisation Tink
 */
export const tinkSyncValidator = vine.compile(
	vine.object({
		accessToken: vine.string().trim().minLength(1),
		accountId: vine.string().trim().optional(),
	}),
);
