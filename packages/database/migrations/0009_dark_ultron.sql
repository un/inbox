ALTER TABLE `accounts` ADD `recovery_email_hash` varchar(255);--> statement-breakpoint
ALTER TABLE `accounts` ADD `recovery_email_verified_at` timestamp;