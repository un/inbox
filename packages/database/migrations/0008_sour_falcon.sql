ALTER TABLE `domains` DROP INDEX `domain_idx`;--> statement-breakpoint
ALTER TABLE `domains` ADD CONSTRAINT `domain_org_idx` UNIQUE(`domain`,`org_id`);--> statement-breakpoint
ALTER TABLE `domains` ADD `disabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `domain_name_idx` ON `domains` (`domain`);