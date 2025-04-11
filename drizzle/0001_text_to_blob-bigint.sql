PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_DiscordMouseHuntUsers` (
	`id` blob,
	`guildId` blob NOT NULL,
	`mhid` integer NOT NULL,
	PRIMARY KEY(`id`, `guildId`)
);
--> statement-breakpoint
INSERT INTO `__new_DiscordMouseHuntUsers`("id", "guildId", "mhid") SELECT "id", "guildId", "mhid" FROM `DiscordMouseHuntUsers`;--> statement-breakpoint
DROP TABLE `DiscordMouseHuntUsers`;--> statement-breakpoint
ALTER TABLE `__new_DiscordMouseHuntUsers` RENAME TO `DiscordMouseHuntUsers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `mhid_guildId_idx` ON `DiscordMouseHuntUsers` (`mhid`,`guildId`);