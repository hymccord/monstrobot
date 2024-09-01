CREATE TABLE `DiscordMouseHuntUsers` (
	`id` text PRIMARY KEY NOT NULL,
	`mhid` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `DiscordMouseHuntUsers_mhid_unique` ON `DiscordMouseHuntUsers` (`mhid`);
