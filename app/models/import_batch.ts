import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Account from '#models/account'
import Transaction from '#models/transaction'

export default class ImportBatch extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare accountId: number

  @column()
  declare filename: string

  @column()
  declare rowsImported: number

  @column()
  declare rowsSkipped: number

  @column()
  declare status: 'pending' | 'processing' | 'completed' | 'failed'

  @column()
  declare errorMessage: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>

  @hasMany(() => Transaction)
  declare transactions: HasMany<typeof Transaction>
}
