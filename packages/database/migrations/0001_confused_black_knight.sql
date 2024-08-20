CREATE TABLE `convo_tags` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(30) NOT NULL,
	`convo_id` bigint unsigned NOT NULL,
	`space_id` bigint unsigned NOT NULL,
	`convo_to_space_id` bigint unsigned NOT NULL,
	`tag_id` bigint unsigned NOT NULL,
	`added_by_org_member_id` bigint unsigned NOT NULL,
	`added_at` timestamp NOT NULL,
	CONSTRAINT `convo_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `convo_to_spaces` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(30) NOT NULL,
	`convo_id` bigint unsigned NOT NULL,
	`space_id` bigint unsigned NOT NULL,
	CONSTRAINT `convo_to_spaces_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `convo_workflows` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(29) NOT NULL,
	`convo_id` bigint unsigned NOT NULL,
	`space_id` bigint unsigned NOT NULL,
	`convo_to_space_id` bigint unsigned NOT NULL,
	`workflow_id` bigint unsigned,
	`by_org_member_id` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `convo_workflows_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `email_routing_rule_assignees` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`rule_destination_id` bigint unsigned NOT NULL,
	`org_member_id` bigint unsigned NOT NULL,
	`team_id` bigint unsigned,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `email_routing_rule_assignees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `space_members` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(29) NOT NULL,
	`space_id` bigint unsigned NOT NULL,
	`org_member_id` bigint unsigned,
	`team_id` bigint unsigned,
	`role` enum('member','admin') NOT NULL DEFAULT 'member',
	`notifications` enum('active','muted','off') NOT NULL DEFAULT 'active',
	`added_by_org_member_id` bigint unsigned NOT NULL,
	`added_at` timestamp NOT NULL,
	`removed_at` timestamp,
	`can_create` boolean NOT NULL DEFAULT true,
	`can_read` boolean NOT NULL DEFAULT true,
	`can_comment` boolean NOT NULL DEFAULT true,
	`can_reply` boolean NOT NULL DEFAULT true,
	`can_delete` boolean NOT NULL DEFAULT true,
	`can_change_workflow` boolean NOT NULL DEFAULT true,
	`can_set_workflow_to_closed` boolean NOT NULL DEFAULT true,
	`can_add_tags` boolean NOT NULL DEFAULT true,
	`can_move_to_another_space` boolean NOT NULL DEFAULT true,
	`can_add_to_another_space` boolean NOT NULL DEFAULT true,
	`can_merge` boolean NOT NULL DEFAULT true,
	`can_add_participants` boolean NOT NULL DEFAULT true,
	CONSTRAINT `space_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `space_tags` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(29) NOT NULL,
	`space_id` bigint unsigned NOT NULL,
	`label` varchar(32) NOT NULL,
	`description` text,
	`color` enum('bronze','gold','brown','orange','tomato','red','ruby','crimson','pink','plum','purple','violet','iris','indigo','blue','cyan','teal','jade','green','grass') NOT NULL,
	`icon` varchar(32) NOT NULL DEFAULT 'tag-simple',
	`created_by_org_member_id` bigint unsigned NOT NULL,
	`disabled` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `space_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `space_workflows` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(29) NOT NULL,
	`space_id` bigint unsigned NOT NULL,
	`type` enum('open','active','closed') NOT NULL,
	`order` tinyint unsigned NOT NULL,
	`name` varchar(32) NOT NULL,
	`color` enum('bronze','gold','brown','orange','tomato','red','ruby','crimson','pink','plum','purple','violet','iris','indigo','blue','cyan','teal','jade','green','grass') NOT NULL,
	`icon` varchar(32) NOT NULL DEFAULT 'check',
	`description` text,
	`disabled` boolean NOT NULL DEFAULT false,
	`created_by_org_member_id` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `space_workflows_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `spaces` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`parent_space_id` bigint unsigned,
	`public_id` char(28) NOT NULL,
	`shortcode` varchar(64) NOT NULL,
	`type` enum('open','private') NOT NULL,
	`personal_space` boolean NOT NULL DEFAULT false,
	`convo_prefix` varchar(8),
	`inherit_parent_permissions` boolean NOT NULL DEFAULT false,
	`name` varchar(128) NOT NULL,
	`icon` varchar(32) NOT NULL DEFAULT 'squares-four',
	`color` enum('bronze','gold','brown','orange','tomato','red','ruby','crimson','pink','plum','purple','violet','iris','indigo','blue','cyan','teal','jade','green','grass') NOT NULL,
	`description` text,
	`avatar_timestamp` timestamp,
	`created_by_org_member_id` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `spaces_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`),
	CONSTRAINT `shortcode_org_unique_idx` UNIQUE(`shortcode`,`org_id`)
);
--> statement-breakpoint
ALTER TABLE `account_credentials` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `accounts` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `authenticators` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `contact_global_reputations` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `contacts` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `convo_attachments` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `convo_entries` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `convo_entry_private_visibility_participants` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `convo_entry_raw_html_emails` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `convo_entry_replies` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `convo_participant_team_members` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `convo_participants` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `convo_subjects` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `convos` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `domains` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `email_identities` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `email_identities_authorized_org_members` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `email_identities_personal` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `email_identity_external` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `email_routing_rules` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `email_routing_rules_destinations` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `org_billing` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `org_invitations` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `org_member_profiles` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `org_members` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `org_modules` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `org_postal_configs` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `orgs` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `pending_attachments` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `postal_servers` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `sessions` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `team_members` DROP INDEX `id`;--> statement-breakpoint
ALTER TABLE `teams` DROP INDEX `id`;--> statement-breakpoint
DROP INDEX `last_updated_at_idx` ON `convos`;--> statement-breakpoint
ALTER TABLE `convo_entry_seen_timestamps` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `convo_seen_timestamps` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `account_credentials` MODIFY COLUMN `two_factor_enabled` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `account_credentials` MODIFY COLUMN `two_factor_enabled` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `accounts` MODIFY COLUMN `two_factor_enabled` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` MODIFY COLUMN `two_factor_enabled` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `accounts` MODIFY COLUMN `pre_account` boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `authenticators` MODIFY COLUMN `credential_backed_up` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `authenticators` MODIFY COLUMN `account_id` bigint unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `convo_attachments` MODIFY COLUMN `public` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `convo_attachments` MODIFY COLUMN `public` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `convo_attachments` MODIFY COLUMN `inline` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `convo_attachments` MODIFY COLUMN `inline` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `convo_entries` MODIFY COLUMN `email_message_id` varchar(255);--> statement-breakpoint
ALTER TABLE `convo_entry_raw_html_emails` MODIFY COLUMN `keep` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `convo_entry_raw_html_emails` MODIFY COLUMN `keep` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `convo_entry_raw_html_emails` MODIFY COLUMN `wiped` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `convo_entry_raw_html_emails` MODIFY COLUMN `wiped` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `convo_participants` MODIFY COLUMN `role` enum('assigned','contributor','commenter','watcher','teamMember','guest') NOT NULL DEFAULT 'contributor';--> statement-breakpoint
ALTER TABLE `convo_participants` MODIFY COLUMN `active` boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `convo_participants` MODIFY COLUMN `hidden` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `convo_participants` MODIFY COLUMN `hidden` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `domains` MODIFY COLUMN `mx_dns_valid` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `domains` MODIFY COLUMN `mx_dns_valid` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `domains` MODIFY COLUMN `dkim_dns_valid` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `domains` MODIFY COLUMN `dkim_dns_valid` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `domains` MODIFY COLUMN `spf_dns_valid` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `domains` MODIFY COLUMN `spf_dns_valid` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `domains` MODIFY COLUMN `return_path_dns_valid` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `domains` MODIFY COLUMN `return_path_dns_valid` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `domains` MODIFY COLUMN `disabled` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `domains` MODIFY COLUMN `disabled` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `email_identities` MODIFY COLUMN `is_catch_all` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `email_identities` MODIFY COLUMN `is_catch_all` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `org_modules` MODIFY COLUMN `enabled` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `org_modules` MODIFY COLUMN `enabled` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `convo_entry_seen_timestamps` ADD PRIMARY KEY(`convo_entry_id`,`participant_id`,`org_member_id`);--> statement-breakpoint
ALTER TABLE `convo_seen_timestamps` ADD PRIMARY KEY(`convo_id`,`participant_id`,`org_member_id`);--> statement-breakpoint
ALTER TABLE `email_identities_authorized_org_members` ADD `space_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `email_routing_rules_destinations` ADD `space_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `org_members` ADD `personal_space_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `org_members` ADD `default_email_identity_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `teams` ADD `default_email_identity_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `teams` ADD `default_space_id` bigint unsigned;--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `convo_tags` (`org_id`);--> statement-breakpoint
CREATE INDEX `convo_id_idx` ON `convo_tags` (`convo_id`);--> statement-breakpoint
CREATE INDEX `space_id_idx` ON `convo_tags` (`space_id`);--> statement-breakpoint
CREATE INDEX `convo_to_spaces_id_idx` ON `convo_tags` (`convo_to_space_id`);--> statement-breakpoint
CREATE INDEX `tag_idx` ON `convo_tags` (`tag_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `convo_to_spaces` (`org_id`);--> statement-breakpoint
CREATE INDEX `convo_id_idx` ON `convo_to_spaces` (`convo_id`);--> statement-breakpoint
CREATE INDEX `space_id_idx` ON `convo_to_spaces` (`space_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `convo_workflows` (`org_id`);--> statement-breakpoint
CREATE INDEX `convo_id_idx` ON `convo_workflows` (`convo_id`);--> statement-breakpoint
CREATE INDEX `space_id_idx` ON `convo_workflows` (`space_id`);--> statement-breakpoint
CREATE INDEX `convo_to_spaces_id_idx` ON `convo_workflows` (`convo_to_space_id`);--> statement-breakpoint
CREATE INDEX `workflow_idx` ON `convo_workflows` (`workflow_id`);--> statement-breakpoint
CREATE INDEX `rule_destination_id_idx` ON `email_routing_rule_assignees` (`rule_destination_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `email_routing_rule_assignees` (`org_id`);--> statement-breakpoint
CREATE INDEX `org_member_id_idx` ON `email_routing_rule_assignees` (`org_member_id`);--> statement-breakpoint
CREATE INDEX `team_id_idx` ON `email_routing_rule_assignees` (`team_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `space_members` (`org_id`);--> statement-breakpoint
CREATE INDEX `space_id_idx` ON `space_members` (`space_id`);--> statement-breakpoint
CREATE INDEX `org_member_id_idx` ON `space_members` (`org_member_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `space_tags` (`org_id`);--> statement-breakpoint
CREATE INDEX `space_id_idx` ON `space_tags` (`space_id`);--> statement-breakpoint
CREATE INDEX `created_by_org_member_id_idx` ON `space_tags` (`created_by_org_member_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `space_workflows` (`org_id`);--> statement-breakpoint
CREATE INDEX `space_id_idx` ON `space_workflows` (`space_id`);--> statement-breakpoint
CREATE INDEX `shortcode_idx` ON `spaces` (`shortcode`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `spaces` (`org_id`);--> statement-breakpoint
CREATE INDEX `space_id_idx` ON `email_identities_authorized_org_members` (`space_id`);--> statement-breakpoint
CREATE INDEX `space_id_idx` ON `email_routing_rules_destinations` (`space_id`);--> statement-breakpoint
ALTER TABLE `email_identities_authorized_org_members` DROP COLUMN `default`;