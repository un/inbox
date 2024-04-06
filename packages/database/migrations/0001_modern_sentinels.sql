ALTER TABLE `accounts` ADD `password_hash` varchar(255);--> statement-breakpoint
ALTER TABLE `accounts` ADD `two_factor_secret` varchar(255);--> statement-breakpoint
ALTER TABLE `accounts` ADD `two_factor_enabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD `recovery_code` varchar(256);--> statement-breakpoint
ALTER TABLE `authenticators` ADD `account_id` bigint unsigned;