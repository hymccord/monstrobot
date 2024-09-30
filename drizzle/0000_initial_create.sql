CREATE TABLE `DiscordMouseHuntUsers` (
	`id` text,
	`guildId` text NOT NULL,
	`mhid` integer NOT NULL,
	PRIMARY KEY(`id`, `guildId`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mhid_guildId_idx` ON `DiscordMouseHuntUsers` (`mhid`,`guildId`);