import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Account from '#models/account'
import ImportBatch from '#models/import_batch'

export default class Transaction extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare accountId: number

  @column()
  declare importBatchId: number | null

  @column.date()
  declare date: DateTime

  @column()
  declare label: string

  @column()
  declare amount: number

  @column()
  declare type: 'debit' | 'credit'

  @column()
  declare merchant: string | null

  @column()
  declare category: string | null

  @column()
  declare paymentMethod: string | null

  @column()
  declare hash: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>

  @belongsTo(() => ImportBatch)
  declare importBatch: BelongsTo<typeof ImportBatch>
}
