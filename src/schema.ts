import { integer, primaryKey, sqliteTable, text, uniqueIndex} from "drizzle-orm/sqlite-core";

export const discordMouseHuntUsers = sqliteTable("DiscordMouseHuntUsers", {
    id: text('id'),
    guildId: text('guildId').notNull(),
    mhid: integer('mhid').notNull(),
}, (table) => {
    return {
        pk: primaryKey({columns: [table.id, table.guildId]}),
        mhidIndex: uniqueIndex('mhid_guildId_idx').on(table.mhid, table.guildId),
    };
});

export type DiscordMouseHuntUser = typeof discordMouseHuntUsers.$inferSelect;
export type InsertDiscordMouseHuntUser = typeof discordMouseHuntUsers.$inferInsert;
