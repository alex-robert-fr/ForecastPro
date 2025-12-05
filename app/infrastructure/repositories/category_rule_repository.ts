/**
 * Repository pour l'accès aux données des règles de catégorisation
 * Note: Pour l'instant, utilise le localStorage côté client
 * Ce repository sera utilisé quand on migrera vers une table en BDD
 */

import type { CategoryRuleData, CategoryData } from "#domain/types/index";

// Catégories par défaut (en attendant la table en BDD)
const DEFAULT_CATEGORIES: CategoryData[] = [
	{ id: "food", name: "Alimentation", color: "amber", icon: "utensils" },
	{ id: "transport", name: "Transport", color: "blue", icon: "car" },
	{ id: "shopping", name: "Shopping", color: "violet", icon: "shopping" },
	{ id: "leisure", name: "Loisirs", color: "pink", icon: "gamepad" },
	{ id: "housing", name: "Logement", color: "emerald", icon: "home" },
	{
		id: "subscriptions",
		name: "Abonnements",
		color: "cyan",
		icon: "smartphone",
	},
	{ id: "health", name: "Santé", color: "rose", icon: "heart" },
	{ id: "income", name: "Revenus", color: "green", icon: "trending-up" },
	{ id: "other", name: "Autres", color: "slate", icon: "more" },
];

/**
 * Repository pour les règles de catégorisation
 * Préparé pour une future migration vers la base de données
 */
export default class CategoryRuleRepository {
	/**
	 * Récupère toutes les catégories disponibles
	 */
	async findAllCategories(): Promise<CategoryData[]> {
		// Pour l'instant, retourne les catégories par défaut
		// Sera remplacé par une requête BDD
		return DEFAULT_CATEGORIES;
	}

	/**
	 * Trouve une catégorie par son ID
	 */
	async findCategoryById(id: string): Promise<CategoryData | null> {
		return DEFAULT_CATEGORIES.find((c) => c.id === id) ?? null;
	}

	/**
	 * Récupère toutes les règles
	 * Note: Sera implémenté avec le modèle CategoryRule en BDD
	 */
	async findAllRules(): Promise<CategoryRuleData[]> {
		// TODO: Implémenter avec le modèle Lucid quand la table sera créée
		return [];
	}

	/**
	 * Trouve les règles pour une catégorie
	 */
	async findRulesByCategoryId(categoryId: string): Promise<CategoryRuleData[]> {
		// TODO: Implémenter avec le modèle Lucid
		return [];
	}

	/**
	 * Crée une nouvelle règle
	 */
	async createRule(data: {
		keywords: string[];
		categoryId: string;
	}): Promise<CategoryRuleData> {
		// TODO: Implémenter avec le modèle Lucid
		return {
			id: Date.now(),
			keywords: data.keywords,
			categoryId: data.categoryId,
		};
	}

	/**
	 * Met à jour une règle
	 */
	async updateRule(
		id: number,
		data: Partial<{ keywords: string[]; categoryId: string }>,
	): Promise<CategoryRuleData | null> {
		// TODO: Implémenter avec le modèle Lucid
		return null;
	}

	/**
	 * Supprime une règle
	 */
	async deleteRule(id: number): Promise<boolean> {
		// TODO: Implémenter avec le modèle Lucid
		return false;
	}

	/**
	 * Trouve une règle qui correspond à un libellé
	 * Priorité aux règles avec plus de mots-clés (plus spécifiques)
	 */
	async findMatchingRule(label: string): Promise<CategoryRuleData | null> {
		const rules = await this.findAllRules();
		const lowerLabel = label.toLowerCase();

		// Trier par nombre de mots-clés décroissant
		const sortedRules = [...rules].sort(
			(a, b) => b.keywords.length - a.keywords.length,
		);

		for (const rule of sortedRules) {
			const allKeywordsMatch = rule.keywords.every((keyword) =>
				lowerLabel.includes(keyword.toLowerCase()),
			);
			if (allKeywordsMatch) {
				return rule;
			}
		}

		return null;
	}

	/**
	 * Trouve la catégorie correspondant à un libellé de transaction
	 */
	async findCategoryForLabel(label: string): Promise<CategoryData | null> {
		const rule = await this.findMatchingRule(label);
		if (!rule) return null;

		return this.findCategoryById(rule.categoryId);
	}
}
