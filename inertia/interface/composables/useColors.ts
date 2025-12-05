/**
 * Composable pour la gestion des couleurs
 * Couche Interface - utilitaires UI
 */

type ColorType = "bg" | "text" | "border" | "bg-light";

const colorMap: Record<string, Record<ColorType, string>> = {
	emerald: {
		bg: "bg-emerald-500",
		text: "text-emerald-400",
		border: "border-emerald-500/30",
		"bg-light": "bg-emerald-500/10",
	},
	green: {
		bg: "bg-green-500",
		text: "text-green-400",
		border: "border-green-500/30",
		"bg-light": "bg-green-500/10",
	},
	cyan: {
		bg: "bg-cyan-500",
		text: "text-cyan-400",
		border: "border-cyan-500/30",
		"bg-light": "bg-cyan-500/10",
	},
	blue: {
		bg: "bg-blue-500",
		text: "text-blue-400",
		border: "border-blue-500/30",
		"bg-light": "bg-blue-500/10",
	},
	violet: {
		bg: "bg-violet-500",
		text: "text-violet-400",
		border: "border-violet-500/30",
		"bg-light": "bg-violet-500/10",
	},
	pink: {
		bg: "bg-pink-500",
		text: "text-pink-400",
		border: "border-pink-500/30",
		"bg-light": "bg-pink-500/10",
	},
	amber: {
		bg: "bg-amber-500",
		text: "text-amber-400",
		border: "border-amber-500/30",
		"bg-light": "bg-amber-500/10",
	},
	rose: {
		bg: "bg-rose-500",
		text: "text-rose-400",
		border: "border-rose-500/30",
		"bg-light": "bg-rose-500/10",
	},
	orange: {
		bg: "bg-orange-500",
		text: "text-orange-400",
		border: "border-orange-500/30",
		"bg-light": "bg-orange-500/10",
	},
	slate: {
		bg: "bg-slate-500",
		text: "text-slate-400",
		border: "border-slate-500/30",
		"bg-light": "bg-slate-500/10",
	},
};

export function useColors() {
	/**
	 * Retourne la classe CSS pour une couleur et un type donnés
	 */
	const getColorClasses = (color: string, type: ColorType): string => {
		return colorMap[color]?.[type] || colorMap.slate[type];
	};

	/**
	 * Retourne toutes les classes pour une couleur
	 */
	const getAllColorClasses = (color: string): Record<ColorType, string> => {
		return colorMap[color] || colorMap.slate;
	};

	/**
	 * Liste des couleurs disponibles
	 */
	const availableColors = Object.keys(colorMap);

	return {
		getColorClasses,
		getAllColorClasses,
		availableColors,
	};
}
