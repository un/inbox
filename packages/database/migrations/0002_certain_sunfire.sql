CREATE TABLE `public_widgets` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` varchar(128) NOT NULL,
	`space_id` bigint unsigned NOT NULL,
	`name` varchar(128) NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `public_widgets_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `public_widgets` (`org_id`);--> statement-breakpoint
CREATE INDEX `space_id_idx` ON `public_widgets` (`space_id`);