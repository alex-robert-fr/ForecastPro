/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

const ImportsController = () => import('#controllers/imports_controller')
const SettingsController = () => import('#controllers/settings_controller')
const BankConnectionsController = () => import('#controllers/bank_connections_controller')
const TinkController = () => import('#controllers/tink_controller')

// Pages
router.on('/').renderInertia('home')
router.on('/transactions').renderInertia('transactions')
router.on('/budgets').renderInertia('budgets')
router.get('/settings', [SettingsController, 'show'])

// API
router
  .group(() => {
    router.post('/import', [ImportsController, 'store'])
    router.get('/transactions', [ImportsController, 'index'])
    router.put('/settings', [SettingsController, 'update'])

    // Tink Bank Connections
    router.get('/banks', [BankConnectionsController, 'listBanks'])
    router.get('/bank-connections', [BankConnectionsController, 'index'])
    router.post('/bank-connections', [BankConnectionsController, 'create'])
    router.get('/bank-connections/callback', [BankConnectionsController, 'callback'])
    router.post('/bank-connections/sync', [BankConnectionsController, 'sync'])
    router.delete('/bank-connections/disconnect', [BankConnectionsController, 'destroy'])
    router.delete('/bank-connections/:id', [BankConnectionsController, 'destroy'])

    // Tink Token & Accounts (contrôleur séparé)
    router.post('/tink/token', [TinkController, 'store'])
    router.get('/tink/accounts', [TinkController, 'index'])
  })
  .prefix('/api')
