ALTER TABLE `authenticators` MODIFY COLUMN `account_id` bigint unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `convo_attachments` ADD `inline` boolean DEFAULT false NOT NULL;