ALTER TABLE `domains` DROP INDEX `domain_idx`;
ALTER TABLE `domains` ADD CONSTRAINT `domain_org_idx` UNIQUE(`domain`,`org_id`);
ALTER TABLE `domains` ADD `disabled` boolean DEFAULT false NOT NULL;
CREATE INDEX `domain_name_idx` ON `domains` (`domain`);