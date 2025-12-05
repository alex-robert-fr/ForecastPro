import {
	Utensils,
	Car,
	ShoppingBag,
	Home,
	Zap,
	Smartphone,
	Heart,
	Gamepad2,
	GraduationCap,
	MoreHorizontal,
	TrendingUp,
	type LucideIcon,
} from "lucide-vue-next";

/**
 * Mapping des noms d'icônes vers les composants
 */
const iconMap: Record<string, LucideIcon> = {
	utensils: Utensils,
	car: Car,
	shopping: ShoppingBag,
	home: Home,
	zap: Zap,
	smartphone: Smartphone,
	heart: Heart,
	gamepad: Gamepad2,
	graduation: GraduationCap,
	more: MoreHorizontal,
	"trending-up": TrendingUp,
};

/**
 * Composable pour la gestion des icônes
 * Couche Interface - utilitaires UI
 */
export function useIcons() {
	/**
	 * Retourne le composant d'icône pour un nom donné
	 */
	const getIcon = (name: string): LucideIcon => {
		return iconMap[name] || MoreHorizontal;
	};

	/**
	 * Vérifie si une icône existe
	 */
	const hasIcon = (name: string): boolean => {
		return name in iconMap;
	};

	/**
	 * Liste des icônes disponibles
	 */
	const availableIcons = Object.keys(iconMap);

	return {
		getIcon,
		hasIcon,
		availableIcons,
		iconMap,
	};
}
