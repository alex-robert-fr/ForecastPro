import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'accounts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('name').notNullable() // Ex: "Compte Courant CA", "Livret A"
      table.string('bank').nullable() // Ex: "Crédit Agricole"
      table.string('account_number').nullable() // Numéro de compte (partiel pour sécurité)
      table.decimal('balance', 12, 2).defaultTo(0) // Solde actuel
      table.string('currency', 3).defaultTo('EUR')
      table.boolean('is_default').defaultTo(false)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
