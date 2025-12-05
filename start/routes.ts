/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from "@adonisjs/core/services/router";

// Nouveaux controllers (architecture en couches)
const TransactionsController = () =>
	import("#interface/http/controllers/transactions_controller");
const ImportsController = () =>
	import("#interface/http/controllers/imports_controller");
const AccountsController = () =>
	import("#interface/http/controllers/accounts_controller");
const BankConnectionsController = () =>
	import("#interface/http/controllers/bank_connections_controller");

// ============================================================================
// PAGES
// ============================================================================

router.on("/").renderInertia("home");
router.on("/transactions").renderInertia("transactions");
router.on("/budgets").renderInertia("budgets");
router.get("/settings", [AccountsController, "show"]);

// ============================================================================
// API
// ============================================================================

router
	.group(() => {
		// Transactions
		router.get("/transactions", [TransactionsController, "index"]);
		router.post("/transactions", [TransactionsController, "store"]);
		router.get("/transactions/:id", [TransactionsController, "show"]);
		router.patch("/transactions/:id/category", [
			TransactionsController,
			"updateCategory",
		]);
		router.delete("/transactions/:id", [TransactionsController, "destroy"]);

		// Import CSV
		router.post("/import", [ImportsController, "store"]);

		// Paramètres compte
		router.put("/settings", [AccountsController, "update"]);
		router.get("/accounts/stats", [AccountsController, "stats"]);
		router.get("/accounts/debug-balance", [AccountsController, "debugBalance"]);
		router.post("/accounts/recalculate-balance", [
			AccountsController,
			"recalculateBalance",
		]);

		// Connexions bancaires (Tink)
		router.get("/banks", [BankConnectionsController, "listBanks"]);
		router.get("/bank-connections", [BankConnectionsController, "index"]);
		router.post("/bank-connections", [BankConnectionsController, "create"]);
		router.get("/bank-connections/callback", [
			BankConnectionsController,
			"callback",
		]);
		router.post("/bank-connections/sync", [BankConnectionsController, "sync"]);
		router.post("/bank-connections/adjust-balance", [
			BankConnectionsController,
			"adjustBalance",
		]);
		router.delete("/bank-connections/disconnect", [
			BankConnectionsController,
			"disconnect",
		]);
		router.delete("/bank-connections/:id", [
			BankConnectionsController,
			"disconnect",
		]);

		// Tink Token & Accounts
		router.post("/tink/token", [BankConnectionsController, "exchangeToken"]);
		router.get("/tink/accounts", [BankConnectionsController, "getAccounts"]);
	})
	.prefix("/api");
