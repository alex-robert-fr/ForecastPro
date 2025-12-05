import type { HttpContext } from '@adonisjs/core/http'
import Account from '#models/account'

export default class SettingsController {
  /**
   * Affiche la page des paramètres
   */
  async show({ inertia }: HttpContext) {
    const account = await Account.query().where('isDefault', true).first()

    return inertia.render('settings', {
      account: account
        ? {
            id: account.id,
            name: account.name,
            bank: account.bank,
            initialBalance: account.initialBalance || 0,
            balance: account.balance,
          }
        : null,
    })
  }

  /**
   * Met à jour le solde de départ
   */
  async update({ request, response }: HttpContext) {
    const { initialBalance } = request.only(['initialBalance'])

    // Récupérer ou créer le compte par défaut
    let account = await Account.query().where('isDefault', true).first()

    if (!account) {
      account = await Account.create({
        name: 'Compte Principal',
        bank: 'Crédit Agricole',
        currency: 'EUR',
        isDefault: true,
        initialBalance: Number(initialBalance) || 0,
      })
    } else {
      account.initialBalance = Number(initialBalance) || 0
      await account.save()
    }

    // Recalculer le solde total
    await account.calculateAndUpdateBalance()

    return response.ok({
      success: true,
      message: 'Solde de départ mis à jour avec succès',
      account: {
        id: account.id,
        initialBalance: account.initialBalance,
        balance: account.balance,
      },
    })
  }
}

