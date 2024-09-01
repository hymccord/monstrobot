import { integer, sqliteTable, text} from "drizzle-orm/sqlite-core";

export const discordMouseHuntUsers = sqliteTable("DiscordMouseHuntUsers", {
    id: text('id').primaryKey(),
    mhid: integer('mhid').unique().notNull(),
});

export type DiscordMouseHuntUser = typeof discordMouseHuntUsers.$inferSelect;
export type InsertDiscordMouseHuntUser = typeof discordMouseHuntUsers.$inferInsert;
