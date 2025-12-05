/**
 * Types partagés pour le frontend
 * Correspondent aux entités et DTOs du backend
 */

// ============================================================================
// TYPES DE BASE
// ============================================================================

export type TransactionType = "debit" | "credit";
export type ImportStatus = "pending" | "processing" | "completed" | "failed";

// ============================================================================
// ENTITÉS
// ============================================================================

/**
 * Transaction bancaire
 */
export interface Transaction {
	id: number;
	accountId: number;
	importBatchId: number | null;
	date: string;
	label: string;
	amount: number;
	type: TransactionType;
	merchant: string | null;
	category: string | null;
	paymentMethod: string | null;
	hash: string;
	createdAt: string;
	updatedAt: string | null;
}

/**
 * Compte bancaire
 */
export interface Account {
	id: number;
	name: string;
	bank: string | null;
	accountNumber: string | null;
	balance: number;
	initialBalance: number;
	currency: string;
	isDefault: boolean;
	createdAt: string;
	updatedAt: string | null;
}

/**
 * Batch d'import
 */
export interface ImportBatch {
	id: number;
	accountId: number;
	filename: string;
	rowsImported: number;
	rowsSkipped: number;
	status: ImportStatus;
	errorMessage: string | null;
	createdAt: string;
	updatedAt: string | null;
}

/**
 * Règle de catégorisation
 */
export interface CategoryRule {
	id: string;
	keywords: string[];
	categoryId: string;
	createdAt: string;
}

/**
 * Catégorie de transaction
 */
export interface Category {
	id: string;
	name: string;
	color: string;
	icon: string;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * Données pour créer une transaction
 */
export interface CreateTransactionDto {
	date: string;
	label: string;
	amount: number;
	type: TransactionType;
	merchant?: string | null;
	category?: string | null;
	paymentMethod?: string | null;
}

/**
 * Données pour mettre à jour les paramètres
 */
export interface UpdateSettingsDto {
	initialBalance: number;
}

// ============================================================================
// RÉPONSES API
// ============================================================================

/**
 * Réponse de la liste des transactions
 */
export interface TransactionsResponse {
	transactions: Transaction[];
	account: Account | null;
}

/**
 * Réponse de création de transaction
 */
export interface CreateTransactionResponse {
	transaction: Transaction;
	account: Account;
}

/**
 * Réponse d'import CSV
 */
export interface ImportResponse {
	batchId: number;
	rowsImported: number;
	rowsSkipped: number;
	parsingErrors: string[];
}

// ============================================================================
// TINK / OPEN BANKING
// ============================================================================

/**
 * Compte bancaire Tink
 */
export interface TinkAccount {
	id: string;
	name: string;
	type: string;
	iban: string | null;
	balance: number | null;
	currency: string;
}

/**
 * Résultat de connexion bancaire
 */
export interface BankConnectionResponse {
	success: boolean;
	accessToken?: string;
	expiresIn?: number;
	accounts?: TinkAccount[];
	import?: {
		imported: number;
		skipped: number;
		batchId: number;
	};
	message?: string;
	error?: string;
}

// ============================================================================
// BUDGETS
// ============================================================================

/**
 * Budget mensuel
 */
export interface Budget {
	id: string;
	name: string;
	category: string;
	limit: number;
	spent: number;
	color: string;
	icon: string;
}

/**
 * Statistiques de dépenses par catégorie
 */
export interface CategorySpending {
	categoryId: string;
	amount: number;
	count: number;
	percentage: number;
}

// ============================================================================
// DASHBOARD
// ============================================================================

/**
 * Données du dashboard
 */
export interface DashboardData {
	balance: number;
	transactions: Transaction[];
	monthlyIncome: number;
	monthlyExpenses: number;
	savingsRate: number;
}

/**
 * Statistiques mensuelles
 */
export interface MonthlyStats {
	income: number;
	expenses: number;
	savings: number;
	savingsRate: number;
}
