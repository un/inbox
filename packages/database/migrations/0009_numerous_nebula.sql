ALTER TABLE `accounts` ADD `hashed_recovery_email` varchar(255);--> statement-breakpoint
ALTER TABLE `accounts` ADD `recovery_email_recovered_at` timestamp;