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

// Pages
router.on('/').renderInertia('home')
router.on('/transactions').renderInertia('transactions')
router.get('/settings', [SettingsController, 'show'])

// API
router
  .group(() => {
    router.post('/import', [ImportsController, 'store'])
    router.get('/transactions', [ImportsController, 'index'])
    router.put('/settings', [SettingsController, 'update'])
  })
  .prefix('/api')
