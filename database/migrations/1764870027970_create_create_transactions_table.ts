import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'transactions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('account_id')
        .unsigned()
        .references('id')
        .inTable('accounts')
        .onDelete('CASCADE')
        .notNullable()
      table
        .integer('import_batch_id')
        .unsigned()
        .references('id')
        .inTable('import_batches')
        .onDelete('SET NULL')
        .nullable()

      table.date('date').notNullable()
      table.text('label').notNullable() // Libellé complet de la banque
      table.decimal('amount', 12, 2).notNullable() // Négatif = débit, Positif = crédit
      table.enum('type', ['debit', 'credit']).notNullable()

      // Champs extraits/parsés du libellé
      table.string('merchant').nullable() // Ex: "OVH SAS", "UBER EATS"
      table.string('category').nullable() // Ex: "Abonnements", "Alimentation"
      table.string('payment_method').nullable() // Ex: "carte", "virement", "prelevement"

      // Hash unique pour éviter les doublons (date + label + amount)
      table.string('hash').notNullable().unique()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    // Index pour les recherches fréquentes
    this.schema.alterTable(this.tableName, (table) => {
      table.index(['account_id', 'date'])
      table.index(['category'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
