import vine from "@vinejs/vine";

/**
 * Validateur pour la création d'une transaction
 */
export const createTransactionValidator = vine.compile(
	vine.object({
		date: vine.string().trim(),
		label: vine.string().trim().minLength(1).maxLength(500),
		amount: vine.number().positive(),
		type: vine.enum(["debit", "credit"]),
		merchant: vine.string().trim().maxLength(100).optional(),
		category: vine.string().trim().maxLength(50).optional(),
		paymentMethod: vine.string().trim().maxLength(50).optional(),
	}),
);

/**
 * Validateur pour la mise à jour d'une transaction
 */
export const updateTransactionValidator = vine.compile(
	vine.object({
		label: vine.string().trim().minLength(1).maxLength(500).optional(),
		amount: vine.number().positive().optional(),
		type: vine.enum(["debit", "credit"]).optional(),
		merchant: vine.string().trim().maxLength(100).nullable().optional(),
		category: vine.string().trim().maxLength(50).nullable().optional(),
		paymentMethod: vine.string().trim().maxLength(50).nullable().optional(),
	}),
);

/**
 * Validateur pour les paramètres de filtre
 */
export const transactionFiltersValidator = vine.compile(
	vine.object({
		type: vine.enum(["debit", "credit", "all"]).optional(),
		category: vine.string().trim().optional(),
		search: vine.string().trim().optional(),
		limit: vine.number().positive().max(500).optional(),
		offset: vine.number().min(0).optional(),
	}),
);
