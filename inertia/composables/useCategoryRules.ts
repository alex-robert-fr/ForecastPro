import { ref, computed } from 'vue'

export interface CategoryRule {
  id: string
  keywords: string[] // Maintenant un tableau de mots-clés (tous doivent matcher)
  categoryId: string
  createdAt: string
}

export interface Category {
  id: string
  name: string
  color: string
  icon: string
}

const STORAGE_KEY = 'forecastpro_category_rules'
const CATEGORIES_KEY = 'forecastpro_categories'

// Catégories par défaut
const defaultCategories: Category[] = [
  { id: 'food', name: 'Alimentation', color: 'amber', icon: 'utensils' },
  { id: 'transport', name: 'Transport', color: 'blue', icon: 'car' },
  { id: 'shopping', name: 'Shopping', color: 'violet', icon: 'shopping' },
  { id: 'leisure', name: 'Loisirs', color: 'pink', icon: 'gamepad' },
  { id: 'housing', name: 'Logement', color: 'emerald', icon: 'home' },
  { id: 'subscriptions', name: 'Abonnements', color: 'cyan', icon: 'smartphone' },
  { id: 'health', name: 'Santé', color: 'rose', icon: 'heart' },
  { id: 'income', name: 'Revenus', color: 'green', icon: 'trending-up' },
  { id: 'other', name: 'Autres', color: 'slate', icon: 'more' },
]

// État global partagé
const rules = ref<CategoryRule[]>([])
const categories = ref<Category[]>([])
const isInitialized = ref(false)

export function useCategoryRules() {
  // Charger les données depuis localStorage
  const loadFromStorage = () => {
    if (typeof window === 'undefined') return
    
    try {
      const storedRules = localStorage.getItem(STORAGE_KEY)
      if (storedRules) {
        const parsed = JSON.parse(storedRules)
        // Migration: convertir les anciennes règles (keyword string) vers le nouveau format (keywords array)
        rules.value = parsed.map((r: any) => ({
          ...r,
          keywords: r.keywords || [r.keyword] // Si ancien format, convertir
        }))
      }
      
      const storedCategories = localStorage.getItem(CATEGORIES_KEY)
      if (storedCategories) {
        categories.value = JSON.parse(storedCategories)
      } else {
        categories.value = [...defaultCategories]
      }
      
      isInitialized.value = true
    } catch (error) {
      console.error('Erreur lors du chargement des règles:', error)
      categories.value = [...defaultCategories]
    }
  }

  // Sauvegarder dans localStorage
  const saveToStorage = () => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rules.value))
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories.value))
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des règles:', error)
    }
  }

  // Initialiser si pas encore fait
  const initialize = () => {
    if (!isInitialized.value) {
      loadFromStorage()
    }
  }

  // Normaliser les mots-clés
  const normalizeKeywords = (keywords: string[]): string[] => {
    return keywords
      .map(k => k.toLowerCase().trim())
      .filter(k => k.length > 0)
      .sort() // Trier pour avoir une clé unique
  }

  // Créer une clé unique pour un ensemble de mots-clés
  const getKeywordsKey = (keywords: string[]): string => {
    return normalizeKeywords(keywords).join('|')
  }

  // Ajouter une règle avec plusieurs mots-clés
  const addRule = (keywords: string[], categoryId: string) => {
    const normalizedKeywords = normalizeKeywords(keywords)
    if (normalizedKeywords.length === 0) return
    
    const keywordsKey = getKeywordsKey(normalizedKeywords)
    
    // Vérifier si la règle existe déjà (mêmes mots-clés)
    const existingRule = rules.value.find(r => getKeywordsKey(r.keywords) === keywordsKey)
    if (existingRule) {
      // Mettre à jour la catégorie existante
      existingRule.categoryId = categoryId
    } else {
      rules.value.push({
        id: Date.now().toString(),
        keywords: normalizedKeywords,
        categoryId,
        createdAt: new Date().toISOString()
      })
    }
    
    saveToStorage()
  }

  // Supprimer une règle
  const removeRule = (ruleId: string) => {
    rules.value = rules.value.filter(r => r.id !== ruleId)
    saveToStorage()
  }

  // Supprimer une règle par mots-clés
  const removeRuleByKeywords = (keywords: string[]) => {
    const keywordsKey = getKeywordsKey(keywords)
    rules.value = rules.value.filter(r => getKeywordsKey(r.keywords) !== keywordsKey)
    saveToStorage()
  }

  // Vérifier si tous les mots-clés d'une règle sont présents dans un libellé
  const ruleMatchesLabel = (rule: CategoryRule, label: string): boolean => {
    const lowerLabel = label.toLowerCase()
    return rule.keywords.every(keyword => lowerLabel.includes(keyword))
  }

  // Trouver la catégorie d'une transaction
  // Priorité aux règles avec plus de mots-clés (plus spécifiques)
  const getCategoryForTransaction = (label: string): Category | null => {
    const lowerLabel = label.toLowerCase()
    
    // Trier les règles par nombre de mots-clés décroissant (plus spécifique d'abord)
    const sortedRules = [...rules.value].sort((a, b) => b.keywords.length - a.keywords.length)
    
    // Chercher la première règle qui match
    for (const rule of sortedRules) {
      if (ruleMatchesLabel(rule, lowerLabel)) {
        const category = categories.value.find(c => c.id === rule.categoryId)
        if (category) return category
      }
    }
    
    return null
  }

  // Obtenir la règle qui s'applique à une transaction
  const getRuleForTransaction = (label: string): CategoryRule | null => {
    const lowerLabel = label.toLowerCase()
    const sortedRules = [...rules.value].sort((a, b) => b.keywords.length - a.keywords.length)
    
    for (const rule of sortedRules) {
      if (ruleMatchesLabel(rule, lowerLabel)) {
        return rule
      }
    }
    
    return null
  }

  // Extraire les mots-clés d'un libellé de transaction
  const extractKeywords = (label: string): string[] => {
    // Nettoyer le libellé
    const cleaned = label
      .replace(/[0-9]{2}\/[0-9]{2}/g, '') // Supprimer les dates
      .replace(/[0-9]+/g, '') // Supprimer les nombres
      .replace(/CB\s*\*?/gi, '') // Supprimer CB
      .replace(/CARTE\s*/gi, '') // Supprimer CARTE
      .replace(/PAIEMENT\s*/gi, '') // Supprimer PAIEMENT
      .replace(/VIREMENT\s*/gi, '') // Supprimer VIREMENT
      .replace(/PRELEVEMENT\s*/gi, '') // Supprimer PRELEVEMENT
      .replace(/[\/\-\*\+\.\,\;\:\!\?\(\)]/g, ' ') // Remplacer ponctuation par espaces
      .trim()
    
    // Extraire les mots significatifs (> 2 caractères)
    const words = cleaned
      .split(/\s+/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length > 2)
      .filter(w => !['pour', 'par', 'les', 'des', 'une', 'sur', 'ref', 'du'].includes(w))
    
    // Retourner les mots uniques
    return [...new Set(words)]
  }

  // Obtenir toutes les règles pour une catégorie
  const getRulesForCategory = (categoryId: string) => {
    return rules.value.filter(r => r.categoryId === categoryId)
  }

  // Obtenir toutes les règles qui s'appliquent à un libellé
  const getMatchingRules = (label: string): CategoryRule[] => {
    return rules.value.filter(rule => ruleMatchesLabel(rule, label))
  }

  // Compter les transactions par catégorie
  const countTransactionsByCategory = (transactions: { label: string; type: string; amount: number }[]) => {
    const counts: Record<string, { count: number; total: number }> = {}
    
    // Initialiser toutes les catégories
    categories.value.forEach(cat => {
      counts[cat.id] = { count: 0, total: 0 }
    })
    counts['uncategorized'] = { count: 0, total: 0 }
    
    transactions.forEach(t => {
      if (t.type !== 'debit') return
      
      const category = getCategoryForTransaction(t.label)
      const catId = category?.id || 'uncategorized'
      
      counts[catId].count++
      counts[catId].total += Math.abs(t.amount)
    })
    
    return counts
  }

  return {
    rules: computed(() => rules.value),
    categories: computed(() => categories.value),
    initialize,
    addRule,
    removeRule,
    removeRuleByKeywords,
    getCategoryForTransaction,
    getRuleForTransaction,
    extractKeywords,
    getRulesForCategory,
    getMatchingRules,
    countTransactionsByCategory,
    loadFromStorage,
  }
}
