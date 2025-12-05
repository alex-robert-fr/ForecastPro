/**
 * Types du domaine métier
 * Ces types représentent les concepts métier de l'application
 */

// ============================================================================
// ENUMS & CONSTANTES
// ============================================================================

export type TransactionType = "debit" | "credit";
export type ImportStatus = "pending" | "processing" | "completed" | "failed";
export type PaymentMethod =
	| "carte"
	| "virement"
	| "prelevement"
	| "retrait"
	| "cheque"
	| null;

// ============================================================================
// DATA TRANSFER OBJECTS (DTOs)
// ============================================================================

/**
 * Données pour créer une transaction
 */
export interface CreateTransactionDto {
	date: Date;
	label: string;
	amount: number;
	type: TransactionType;
	merchant?: string | null;
	category?: string | null;
	paymentMethod?: string | null;
}

/**
 * Données pour créer un compte
 */
export interface CreateAccountDto {
	name: string;
	bank?: string | null;
	accountNumber?: string | null;
	currency?: string;
	isDefault?: boolean;
	initialBalance?: number;
}

/**
 * Données pour mettre à jour les paramètres du compte
 */
export interface UpdateAccountSettingsDto {
	initialBalance?: number;
	name?: string;
	bank?: string | null;
}

/**
 * Données pour créer un batch d'import
 */
export interface CreateImportBatchDto {
	accountId: number;
	filename: string;
	status?: ImportStatus;
}

/**
 * Données d'une transaction parsée (depuis CSV ou Tink)
 */
export interface ParsedTransactionData {
	date: Date;
	label: string;
	amount: number;
	type: TransactionType;
	merchant: string | null;
	paymentMethod: string | null;
	hash: string;
	externalId?: string; // ID externe (Tink)
}

// ============================================================================
// RÉSULTATS & RÉPONSES MÉTIER
// ============================================================================

/**
 * Résultat d'un import de transactions
 */
export interface ImportResult {
	imported: number;
	skipped: number;
	errors: string[];
	batchId: number;
}

/**
 * Résultat du parsing CSV
 */
export interface ParseResult {
	transactions: ParsedTransactionData[];
	errors: string[];
}

/**
 * Statistiques des transactions
 */
export interface TransactionStats {
	totalCredits: number;
	totalDebits: number;
	balance: number;
	transactionCount: number;
}

/**
 * Statistiques mensuelles
 */
export interface MonthlyStats {
	month: string;
	year: number;
	income: number;
	expenses: number;
	savingsRate: number;
}

// ============================================================================
// RÈGLES DE CATÉGORISATION
// ============================================================================

/**
 * Règle de catégorisation
 */
export interface CategoryRuleData {
	id?: number;
	keywords: string[];
	categoryId: string;
}

/**
 * Catégorie de transaction
 */
export interface CategoryData {
	id: string;
	name: string;
	color: string;
	icon: string;
}

// ============================================================================
// TINK / OPEN BANKING
// ============================================================================

/**
 * Compte bancaire Tink
 */
export interface TinkAccountData {
	id: string;
	name: string;
	type: string;
	iban: string | null;
	balance: number | null;
	currency: string;
}

/**
 * Transaction Tink transformée
 */
export interface TinkTransactionData {
	externalId: string;
	date: string;
	amount: number;
	description: string;
	type: TransactionType;
}

/**
 * Résultat de connexion bancaire
 */
export interface BankConnectionResult {
	accessToken: string;
	expiresIn: number;
	accounts: TinkAccountData[];
	importResult?: ImportResult;
}
