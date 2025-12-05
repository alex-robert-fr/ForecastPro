import vine from "@vinejs/vine";

/**
 * Validateur pour la mise à jour des paramètres du compte
 */
export const updateSettingsValidator = vine.compile(
	vine.object({
		initialBalance: vine.number().optional(),
		name: vine.string().trim().minLength(1).maxLength(100).optional(),
		bank: vine.string().trim().maxLength(100).nullable().optional(),
	}),
);
