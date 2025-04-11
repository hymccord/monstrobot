import { blob, integer, primaryKey, sqliteTable, uniqueIndex} from "drizzle-orm/sqlite-core";

export const discordMouseHuntUsers = sqliteTable("DiscordMouseHuntUsers", {
    id: blob('id', { mode: 'bigint'}),
    guildId: blob('guildId', { mode: 'bigint'}).notNull(),
    mhid: integer('mhid').notNull(),
}, (table) => [
    primaryKey({columns: [table.id, table.guildId]}),
    uniqueIndex('mhid_guildId_idx').on(table.mhid, table.guildId),
]);

export type DiscordMouseHuntUser = typeof discordMouseHuntUsers.$inferSelect;
export type InsertDiscordMouseHuntUser = typeof discordMouseHuntUsers.$inferInsert;
