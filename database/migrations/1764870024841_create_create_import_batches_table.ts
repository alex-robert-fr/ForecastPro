import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'import_batches'

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
      table.string('filename').notNullable()
      table.integer('rows_imported').defaultTo(0)
      table.integer('rows_skipped').defaultTo(0) // Doublons ignorés
      table.enum('status', ['pending', 'processing', 'completed', 'failed']).defaultTo('pending')
      table.text('error_message').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
