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

// Pages
router.on('/').renderInertia('home')

// API
router
  .group(() => {
    router.post('/import', [ImportsController, 'store'])
    router.get('/transactions', [ImportsController, 'index'])
  })
  .prefix('/api')
