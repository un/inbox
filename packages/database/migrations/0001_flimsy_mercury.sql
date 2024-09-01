DROP TABLE `account_credentials`;--> statement-breakpoint
DROP INDEX `provider_account_id_idx` ON `authenticators`;--> statement-breakpoint
ALTER TABLE `accounts` DROP COLUMN `pre_account`;--> statement-breakpoint
ALTER TABLE `authenticators` DROP COLUMN `account_credential_id`;