CREATE TABLE `account_credentials` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`account_id` bigint unsigned NOT NULL,
	`password_hash` varchar(255),
	`two_factor_secret` varchar(255),
	`two_factor_enabled` boolean NOT NULL DEFAULT false,
	`recovery_code` varchar(256),
	CONSTRAINT `account_credentials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` char(28) NOT NULL,
	`username` varchar(32) NOT NULL,
	`metadata` json,
	`created_at` timestamp,
	`last_login_at` timestamp,
	`password_hash` varchar(255),
	`recovery_email_hash` varchar(255),
	`recovery_email_verified_at` timestamp,
	`two_factor_secret` varchar(255),
	`two_factor_enabled` boolean NOT NULL DEFAULT false,
	`recovery_code` varchar(256),
	`pre_account` boolean NOT NULL DEFAULT true,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`),
	CONSTRAINT `username_idx` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `authenticators` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` char(29) NOT NULL,
	`account_credential_id` bigint unsigned NOT NULL,
	`account_id` bigint unsigned NOT NULL,
	`nickname` varchar(64) NOT NULL,
	`credential_id` varchar(255) NOT NULL,
	`credential_public_key` text NOT NULL,
	`counter` bigint unsigned NOT NULL,
	`credential_device_type` varchar(32) NOT NULL,
	`credential_backed_up` boolean NOT NULL,
	`transports` json,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `authenticators_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`),
	CONSTRAINT `credential_id_idx` UNIQUE(`credential_id`)
);
--> statement-breakpoint
CREATE TABLE `contact_global_reputations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`email_address` varchar(128) NOT NULL,
	`spam` tinyint NOT NULL DEFAULT 0,
	`cold` tinyint NOT NULL DEFAULT 0,
	`newsletter` tinyint NOT NULL DEFAULT 0,
	`marketing` tinyint NOT NULL DEFAULT 0,
	`product` tinyint NOT NULL DEFAULT 0,
	`message_count` mediumint NOT NULL DEFAULT 0,
	`last_updated` timestamp NOT NULL,
	CONSTRAINT `contact_global_reputations_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_address_idx` UNIQUE(`email_address`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(28) NOT NULL,
	`avatar_timestamp` timestamp,
	`reputation_id` bigint unsigned NOT NULL,
	`name` varchar(128),
	`set_name` varchar(128),
	`email_username` varchar(128) NOT NULL,
	`email_domain` varchar(128) NOT NULL,
	`signature` text,
	`signature_html` text,
	`type` enum('person','product','newsletter','marketing','unknown') NOT NULL,
	`screener_status` enum('pending','approve','reject'),
	`created_at` timestamp NOT NULL,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`),
	CONSTRAINT `email_org_unique_idx` UNIQUE(`email_username`,`email_domain`,`org_id`)
);
--> statement-breakpoint
CREATE TABLE `convo_attachments` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(29) NOT NULL,
	`convo_id` bigint unsigned NOT NULL,
	`convo_entry_id` bigint unsigned,
	`fileName` varchar(256) NOT NULL,
	`type` varchar(256) NOT NULL,
	`size` int unsigned NOT NULL,
	`inline` boolean NOT NULL DEFAULT false,
	`public` boolean NOT NULL DEFAULT false,
	`convo_participant_id` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `convo_attachments_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `convo_entries` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(29) NOT NULL,
	`type` enum('message','comment','draft') NOT NULL,
	`convo_id` bigint unsigned NOT NULL,
	`subject_id` bigint unsigned,
	`author` bigint unsigned NOT NULL,
	`reply_to_id` bigint unsigned,
	`body` json NOT NULL,
	`body_plain_text` longtext NOT NULL,
	`body_cleaned_html` longtext,
	`metadata` json DEFAULT ('{}'),
	`email_message_id` varchar(255) GENERATED ALWAYS AS (JSON_UNQUOTE(metadata-> '$.email.messageId')) STORED,
	`visibility` enum('private','internal_participants','org','all_participants') NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `convo_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `convo_entry_private_visibility_participants` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`entry_id` bigint unsigned NOT NULL,
	`convo_member_id` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `convo_entry_private_visibility_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `convo_entry_raw_html_emails` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`entry_id` bigint unsigned NOT NULL,
	`headers` json NOT NULL,
	`html` mediumtext NOT NULL,
	`wipe_date` timestamp NOT NULL,
	`keep` boolean NOT NULL DEFAULT false,
	`wiped` boolean NOT NULL DEFAULT false,
	CONSTRAINT `convo_entry_raw_html_emails_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `convo_entry_replies` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`convo_message_source_id` bigint unsigned NOT NULL,
	`convo_message_reply_id` bigint unsigned,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `convo_entry_replies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `convo_entry_seen_timestamps` (
	`org_id` bigint unsigned NOT NULL,
	`convo_entry_id` bigint unsigned NOT NULL,
	`participant_id` bigint unsigned NOT NULL,
	`org_member_id` bigint unsigned NOT NULL,
	`seen_at` timestamp NOT NULL,
	CONSTRAINT `id` PRIMARY KEY(`convo_entry_id`,`participant_id`,`org_member_id`)
);
--> statement-breakpoint
CREATE TABLE `convo_participant_team_members` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`convo_participant_id` bigint unsigned NOT NULL,
	`team_id` bigint unsigned NOT NULL,
	CONSTRAINT `convo_participant_team_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `convo_participants` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(29) NOT NULL,
	`org_member_id` bigint unsigned,
	`team_id` bigint unsigned,
	`contact_id` bigint unsigned,
	`convo_id` bigint unsigned NOT NULL,
	`role` enum('assigned','contributor','commenter','watcher','teamMember','guest') NOT NULL DEFAULT 'contributor',
	`email_identity_id` bigint unsigned,
	`notifications` enum('active','muted','off') NOT NULL DEFAULT 'active',
	`last_read_at` timestamp,
	`active` boolean NOT NULL DEFAULT true,
	`hidden` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `convo_participants_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`),
	CONSTRAINT `team_to_convo_idx` UNIQUE(`convo_id`,`team_id`)
);
--> statement-breakpoint
CREATE TABLE `convo_seen_timestamps` (
	`org_id` bigint unsigned NOT NULL,
	`convo_id` bigint unsigned NOT NULL,
	`participant_id` bigint unsigned NOT NULL,
	`org_member_id` bigint unsigned NOT NULL,
	`seen_at` timestamp NOT NULL,
	CONSTRAINT `id` PRIMARY KEY(`convo_id`,`participant_id`,`org_member_id`)
);
--> statement-breakpoint
CREATE TABLE `convo_subjects` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(29) NOT NULL,
	`convo_id` bigint unsigned NOT NULL,
	`subject` varchar(256) NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `convo_subjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
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
CREATE TABLE `convos` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(28) NOT NULL,
	`last_updated_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `convos_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `domains` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`disabled` boolean NOT NULL DEFAULT false,
	`public_id` char(30) NOT NULL,
	`catch_all_address` bigint unsigned,
	`postal_host` varchar(32) NOT NULL,
	`domain` varchar(256) NOT NULL,
	`forwarding_address` varchar(128),
	`postal_id` varchar(64),
	`domain_status` enum('unverified','pending','active','disabled') NOT NULL DEFAULT 'unverified',
	`sending_mode` enum('native','external','disabled') NOT NULL,
	`receiving_mode` enum('native','forwarding','disabled') NOT NULL,
	`dkim_key` varchar(32),
	`dkim_value` varchar(256),
	`verification_token` varchar(64),
	`mx_dns_valid` boolean NOT NULL DEFAULT false,
	`dkim_dns_valid` boolean NOT NULL DEFAULT false,
	`spf_dns_valid` boolean NOT NULL DEFAULT false,
	`return_path_dns_valid` boolean NOT NULL DEFAULT false,
	`last_dns_check_at` timestamp,
	`disabled_at` timestamp,
	`verified_at` timestamp,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `domains_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`),
	CONSTRAINT `domain_org_idx` UNIQUE(`domain`,`org_id`),
	CONSTRAINT `postal_id_idx` UNIQUE(`postal_id`)
);
--> statement-breakpoint
CREATE TABLE `email_identities` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(29) NOT NULL,
	`username` varchar(32) NOT NULL,
	`domain_name` varchar(128) NOT NULL,
	`domain_id` bigint unsigned,
	`routing_rule_id` bigint unsigned NOT NULL,
	`send_name` varchar(128),
	`created_by` bigint unsigned NOT NULL,
	`is_catch_all` boolean NOT NULL DEFAULT false,
	`personal_email_identity_id` bigint unsigned,
	`external_credentials_id` bigint unsigned,
	`forwarding_address` varchar(128),
	`created_at` timestamp NOT NULL,
	CONSTRAINT `email_identities_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`),
	CONSTRAINT `email_idx` UNIQUE(`username`,`domain_name`)
);
--> statement-breakpoint
CREATE TABLE `email_identities_authorized_org_members` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`identity_id` bigint unsigned NOT NULL,
	`org_member_id` bigint unsigned,
	`team_id` bigint unsigned,
	`space_id` bigint unsigned,
	`added_by` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `email_identities_authorized_org_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `org_member_to_identity_idx` UNIQUE(`identity_id`,`org_member_id`),
	CONSTRAINT `team_to_identity_idx` UNIQUE(`identity_id`,`team_id`)
);
--> statement-breakpoint
CREATE TABLE `email_identities_personal` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(30) NOT NULL,
	`account_id` bigint unsigned NOT NULL,
	`email_identity_id` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `email_identities_personal_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `email_identity_external` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(30) NOT NULL,
	`nickname` varchar(128) NOT NULL,
	`created_by` bigint unsigned NOT NULL,
	`username` varchar(128) NOT NULL,
	`password` varchar(128) NOT NULL,
	`hostname` varchar(128) NOT NULL,
	`port` smallint NOT NULL,
	`auth_method` enum('plain','login') NOT NULL,
	`encryption` enum('ssl','tls','starttls','none') NOT NULL DEFAULT 'none',
	`created_at` timestamp NOT NULL,
	CONSTRAINT `email_identity_external_id` PRIMARY KEY(`id`),
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
CREATE TABLE `email_routing_rules` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(29) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`created_by` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `email_routing_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `email_routing_rules_destinations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(30) NOT NULL,
	`rule_id` bigint unsigned NOT NULL,
	`team_id` bigint unsigned,
	`org_member_id` bigint unsigned,
	`space_id` bigint unsigned,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `email_routing_rules_destinations_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `org_billing` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`stripe_customer_id` varchar(128) NOT NULL,
	`stripe_subscription_id` varchar(128),
	`plan` enum('starter','pro') NOT NULL DEFAULT 'starter',
	`period` enum('monthly','yearly') NOT NULL DEFAULT 'monthly',
	CONSTRAINT `org_billing_id` PRIMARY KEY(`id`),
	CONSTRAINT `stripe_customer_id_idx` UNIQUE(`stripe_customer_id`),
	CONSTRAINT `stripe_subscription_id_idx` UNIQUE(`stripe_subscription_id`)
);
--> statement-breakpoint
CREATE TABLE `org_invitations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` char(29) NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`invited_by_org_member_id` bigint unsigned NOT NULL,
	`role` enum('member','admin') NOT NULL,
	`org_member_id` bigint unsigned,
	`invited_org_member_profile_id` bigint unsigned,
	`email` varchar(128),
	`invite_token` varchar(64),
	`invited_at` timestamp NOT NULL,
	`expires_at` timestamp,
	`accepted_at` timestamp,
	CONSTRAINT `org_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`),
	CONSTRAINT `org_member_id_idx` UNIQUE(`org_member_id`),
	CONSTRAINT `org_email_unique_idx` UNIQUE(`org_id`,`email`)
);
--> statement-breakpoint
CREATE TABLE `org_member_profiles` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(30) NOT NULL,
	`avatar_timestamp` timestamp,
	`account_id` bigint unsigned,
	`first_name` varchar(64),
	`last_name` varchar(64),
	`handle` varchar(64),
	`title` varchar(64),
	`blurb` text,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `org_member_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `org_members` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(29) NOT NULL,
	`account_id` bigint unsigned,
	`invited_by_org_member_id` bigint unsigned,
	`status` enum('invited','active','removed') NOT NULL,
	`role` enum('member','admin') NOT NULL,
	`personal_space_id` bigint unsigned,
	`org_member_profile_id` bigint unsigned NOT NULL,
	`default_email_identity_id` bigint unsigned,
	`added_at` timestamp NOT NULL,
	`removed_at` timestamp,
	CONSTRAINT `org_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`),
	CONSTRAINT `org_account_idx` UNIQUE(`org_id`,`account_id`)
);
--> statement-breakpoint
CREATE TABLE `org_modules` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`module` enum('strip signatures','anonymous analytics') NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`last_modified_by_org_member` bigint unsigned NOT NULL,
	`last_modified_at` timestamp,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `org_modules_id` PRIMARY KEY(`id`),
	CONSTRAINT `org_module_idx` UNIQUE(`org_id`,`module`)
);
--> statement-breakpoint
CREATE TABLE `org_postal_configs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`host` varchar(32) NOT NULL,
	`ip_pools` json NOT NULL,
	`default_ip_pool` varchar(32) NOT NULL,
	CONSTRAINT `org_postal_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orgs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` char(28) NOT NULL,
	`avatar_timestamp` timestamp,
	`shortcode` varchar(64) NOT NULL,
	`owner_id` bigint unsigned NOT NULL,
	`name` varchar(64) NOT NULL,
	`metadata` json DEFAULT ('{}'),
	`migrated_to_spaces` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `orgs_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`),
	CONSTRAINT `shortcode_idx` UNIQUE(`shortcode`)
);
--> statement-breakpoint
CREATE TABLE `pending_attachments` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(29) NOT NULL,
	`org_public_id` char(28) NOT NULL,
	`filename` varchar(256) NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `pending_attachments_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `postal_servers` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(29) NOT NULL,
	`type` enum('email','transactional','marketing') NOT NULL,
	`api_key` varchar(64) NOT NULL,
	`smtp_key` varchar(64),
	`root_forwarding_address` varchar(128),
	CONSTRAINT `postal_servers_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` char(29) NOT NULL,
	`account_id` bigint unsigned NOT NULL,
	`account_public_id` char(28) NOT NULL,
	`session_token` varchar(255) NOT NULL,
	`device` varchar(255) NOT NULL,
	`os` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`),
	CONSTRAINT `session_token_idx` UNIQUE(`session_token`)
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
CREATE TABLE `team_members` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(29) NOT NULL,
	`team_id` bigint unsigned NOT NULL,
	`org_member_id` bigint unsigned NOT NULL,
	`org_member_profile_id` bigint unsigned,
	`added_by` bigint unsigned NOT NULL,
	`role` enum('member','admin') NOT NULL DEFAULT 'member',
	`notifications` enum('active','muted','off') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL,
	CONSTRAINT `team_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `org_member_to_team_idx` UNIQUE(`team_id`,`org_member_id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(28) NOT NULL,
	`avatar_timestamp` timestamp,
	`name` varchar(128) NOT NULL,
	`color` enum('bronze','gold','brown','orange','tomato','red','ruby','crimson','pink','plum','purple','violet','iris','indigo','blue','cyan','teal','jade','green','grass'),
	`description` text,
	`default_email_identity_id` bigint unsigned,
	`default_space_id` bigint unsigned,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `teams_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE INDEX `account_id_idx` ON `account_credentials` (`account_id`);--> statement-breakpoint
CREATE INDEX `provider_account_id_idx` ON `authenticators` (`account_credential_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `contacts` (`org_id`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `contacts` (`email_username`,`email_domain`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `convo_attachments` (`org_id`);--> statement-breakpoint
CREATE INDEX `convo_id_idx` ON `convo_attachments` (`convo_id`);--> statement-breakpoint
CREATE INDEX `convo_entry_id_idx` ON `convo_attachments` (`convo_entry_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `convo_entries` (`org_id`);--> statement-breakpoint
CREATE INDEX `convo_id_idx` ON `convo_entries` (`convo_id`);--> statement-breakpoint
CREATE INDEX `subject_id_idx` ON `convo_entries` (`subject_id`);--> statement-breakpoint
CREATE INDEX `author_idx` ON `convo_entries` (`author`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `convo_entries` (`type`);--> statement-breakpoint
CREATE INDEX `reply_to_id_idx` ON `convo_entries` (`reply_to_id`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `convo_entries` (`created_at`);--> statement-breakpoint
CREATE INDEX `email_message_id_idx` ON `convo_entries` (`email_message_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `convo_entry_private_visibility_participants` (`org_id`);--> statement-breakpoint
CREATE INDEX `entry_id_idx` ON `convo_entry_private_visibility_participants` (`entry_id`);--> statement-breakpoint
CREATE INDEX `convo_member_id_idx` ON `convo_entry_private_visibility_participants` (`convo_member_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `convo_entry_raw_html_emails` (`org_id`);--> statement-breakpoint
CREATE INDEX `entry_id_idx` ON `convo_entry_raw_html_emails` (`entry_id`);--> statement-breakpoint
CREATE INDEX `wipe_date_idx` ON `convo_entry_raw_html_emails` (`wipe_date`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `convo_entry_replies` (`org_id`);--> statement-breakpoint
CREATE INDEX `entry_source_id_idx` ON `convo_entry_replies` (`convo_message_source_id`);--> statement-breakpoint
CREATE INDEX `entry_reply_id_idx` ON `convo_entry_replies` (`convo_message_reply_id`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `convo_entry_replies` (`created_at`);--> statement-breakpoint
CREATE INDEX `convo_entry_id_idx` ON `convo_entry_seen_timestamps` (`convo_entry_id`);--> statement-breakpoint
CREATE INDEX `participant_id_idx` ON `convo_entry_seen_timestamps` (`participant_id`);--> statement-breakpoint
CREATE INDEX `seen_at_idx` ON `convo_entry_seen_timestamps` (`seen_at`);--> statement-breakpoint
CREATE INDEX `convo_participant_id_idx` ON `convo_participant_team_members` (`convo_participant_id`);--> statement-breakpoint
CREATE INDEX `team_id_idx` ON `convo_participant_team_members` (`team_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `convo_participants` (`org_id`);--> statement-breakpoint
CREATE INDEX `org_member_id_idx` ON `convo_participants` (`org_member_id`);--> statement-breakpoint
CREATE INDEX `convo_id_idx` ON `convo_participants` (`convo_id`);--> statement-breakpoint
CREATE INDEX `org_member_to_convo_idx` ON `convo_participants` (`convo_id`,`org_member_id`);--> statement-breakpoint
CREATE INDEX `convo_id_idx` ON `convo_seen_timestamps` (`convo_id`);--> statement-breakpoint
CREATE INDEX `seen_at_idx` ON `convo_seen_timestamps` (`seen_at`);--> statement-breakpoint
CREATE INDEX `participant_id_idx` ON `convo_seen_timestamps` (`participant_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `convo_subjects` (`org_id`);--> statement-breakpoint
CREATE INDEX `convo_id_idx` ON `convo_subjects` (`convo_id`);--> statement-breakpoint
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
CREATE INDEX `org_id_idx` ON `convos` (`org_id`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `convos` (`created_at`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `domains` (`org_id`);--> statement-breakpoint
CREATE INDEX `domain_name_idx` ON `domains` (`domain`);--> statement-breakpoint
CREATE INDEX `domain_id_idx` ON `email_identities` (`domain_name`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `email_identities` (`org_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `email_identities_authorized_org_members` (`org_id`);--> statement-breakpoint
CREATE INDEX `identity_id_idx` ON `email_identities_authorized_org_members` (`identity_id`);--> statement-breakpoint
CREATE INDEX `space_id_idx` ON `email_identities_authorized_org_members` (`space_id`);--> statement-breakpoint
CREATE INDEX `account_id_idx` ON `email_identities_personal` (`account_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `email_identities_personal` (`org_id`);--> statement-breakpoint
CREATE INDEX `email_identity_id_idx` ON `email_identities_personal` (`email_identity_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `email_identity_external` (`org_id`);--> statement-breakpoint
CREATE INDEX `rule_destination_id_idx` ON `email_routing_rule_assignees` (`rule_destination_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `email_routing_rule_assignees` (`org_id`);--> statement-breakpoint
CREATE INDEX `org_member_id_idx` ON `email_routing_rule_assignees` (`org_member_id`);--> statement-breakpoint
CREATE INDEX `team_id_idx` ON `email_routing_rule_assignees` (`team_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `email_routing_rules` (`org_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `email_routing_rules_destinations` (`org_id`);--> statement-breakpoint
CREATE INDEX `rule_id_idx` ON `email_routing_rules_destinations` (`rule_id`);--> statement-breakpoint
CREATE INDEX `space_id_idx` ON `email_routing_rules_destinations` (`space_id`);--> statement-breakpoint
CREATE INDEX `team_id_idx` ON `email_routing_rules_destinations` (`team_id`);--> statement-breakpoint
CREATE INDEX `org_member_id_idx` ON `email_routing_rules_destinations` (`org_member_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `org_billing` (`org_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `org_invitations` (`org_id`);--> statement-breakpoint
CREATE INDEX `account_id_idx` ON `org_member_profiles` (`account_id`);--> statement-breakpoint
CREATE INDEX `account_id_idx` ON `org_members` (`account_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `org_members` (`org_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `org_modules` (`org_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `org_postal_configs` (`org_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `pending_attachments` (`org_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `postal_servers` (`org_id`);--> statement-breakpoint
CREATE INDEX `account_id_idx` ON `sessions` (`account_id`);--> statement-breakpoint
CREATE INDEX `expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
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
CREATE INDEX `team_id_idx` ON `team_members` (`team_id`);--> statement-breakpoint
CREATE INDEX `org_member_id_idx` ON `team_members` (`org_member_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `teams` (`org_id`);