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
	`created_at` timestamp DEFAULT (now()),
	`last_login_at` timestamp,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`),
	CONSTRAINT `username_idx` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `authenticators` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` char(29) NOT NULL,
	`account_credential_id` bigint unsigned NOT NULL,
	`nickname` varchar(64) NOT NULL,
	`credential_id` varchar(255) NOT NULL,
	`credential_public_key` varchar(255) NOT NULL,
	`counter` bigint unsigned NOT NULL,
	`credential_device_type` varchar(32) NOT NULL,
	`credential_backed_up` boolean NOT NULL,
	`transports` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `authenticators_id` PRIMARY KEY(`id`),
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
	`last_updated` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contact_global_reputations_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_address_idx` UNIQUE(`email_address`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` char(28) NOT NULL,
	`avatar_timestamp` timestamp,
	`org_id` bigint unsigned NOT NULL,
	`reputation_id` bigint unsigned NOT NULL,
	`name` varchar(128),
	`set_name` varchar(128),
	`email_username` varchar(128) NOT NULL,
	`email_domain` varchar(128) NOT NULL,
	`signature` text,
	`signature_html` text,
	`type` enum('person','product','newsletter','marketing','unknown') NOT NULL,
	`screener_status` enum('pending','approve','reject'),
	`created_at` timestamp NOT NULL DEFAULT (now()),
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
	`public` boolean NOT NULL DEFAULT false,
	`convo_participant_id` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
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
	`body_plain_text` text NOT NULL,
	`metadata` json DEFAULT ('{}'),
	`email_message_id` varchar(255),
	`visibility` enum('private','internal_participants','org','all_participants') NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `convo_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `convo_entry_private_visibility_participants` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`entry_id` bigint unsigned NOT NULL,
	`convo_member_id` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `convo_entry_private_visibility_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `convo_entry_raw_html_emails` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`entry_id` bigint unsigned NOT NULL,
	`headers` json NOT NULL,
	`html` text NOT NULL,
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
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
CREATE TABLE `convo_participant_group_members` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`convo_participant_id` bigint unsigned NOT NULL,
	`group_id` bigint unsigned NOT NULL,
	CONSTRAINT `convo_participant_group_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `convo_participants` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(29) NOT NULL,
	`org_member_id` bigint unsigned,
	`group_id` bigint unsigned,
	`contact_id` bigint unsigned,
	`convo_id` bigint unsigned NOT NULL,
	`role` enum('assigned','contributor','commenter','watcher','groupMember','guest') NOT NULL DEFAULT 'contributor',
	`email_identity_id` bigint unsigned,
	`notifications` enum('active','muted','off') NOT NULL DEFAULT 'active',
	`last_read_at` timestamp,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `convo_participants_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`),
	CONSTRAINT `org_member_to_convo_idx` UNIQUE(`convo_id`,`org_member_id`),
	CONSTRAINT `group_to_convo_idx` UNIQUE(`convo_id`,`group_id`)
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `convo_subjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `convos` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(28) NOT NULL,
	`last_updated_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `convos_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `domains` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` char(30) NOT NULL,
	`org_id` bigint unsigned NOT NULL,
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `domains_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`),
	CONSTRAINT `domain_idx` UNIQUE(`domain`),
	CONSTRAINT `postal_id_idx` UNIQUE(`postal_id`)
);
--> statement-breakpoint
CREATE TABLE `email_identities` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` char(29) NOT NULL,
	`org_id` bigint unsigned NOT NULL,
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
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
	`group_id` bigint unsigned,
	`default` boolean NOT NULL DEFAULT false,
	`added_by` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_identities_authorized_org_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `org_member_to_identity_idx` UNIQUE(`identity_id`,`org_member_id`),
	CONSTRAINT `group_to_identity_idx` UNIQUE(`identity_id`,`group_id`)
);
--> statement-breakpoint
CREATE TABLE `email_identities_personal` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` char(30) NOT NULL,
	`account_id` bigint unsigned NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`email_identity_id` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_identities_personal_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `email_identity_external` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` char(30) NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`nickname` varchar(128) NOT NULL,
	`created_by` bigint unsigned NOT NULL,
	`username` varchar(128) NOT NULL,
	`password` varchar(128) NOT NULL,
	`hostname` varchar(128) NOT NULL,
	`port` smallint NOT NULL,
	`auth_method` enum('plain','login') NOT NULL,
	`encryption` enum('ssl','tls','starttls','none') NOT NULL DEFAULT 'none',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_identity_external_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `email_routing_rules` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` char(29) NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`created_by` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_routing_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `email_routing_rules_destinations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` char(30) NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`rule_id` bigint unsigned NOT NULL,
	`group_id` bigint unsigned,
	`org_member_id` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_routing_rules_destinations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_members` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` char(29) NOT NULL,
	`group_id` bigint unsigned NOT NULL,
	`org_member_id` bigint unsigned NOT NULL,
	`org_member_profile_id` bigint unsigned,
	`added_by` bigint unsigned NOT NULL,
	`role` enum('member','admin') NOT NULL DEFAULT 'member',
	`notifications` enum('active','muted','off') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `org_member_to_group_idx` UNIQUE(`group_id`,`org_member_id`)
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` char(28) NOT NULL,
	`avatar_timestamp` timestamp,
	`org_id` bigint unsigned NOT NULL,
	`name` varchar(128) NOT NULL,
	`color` enum('red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose'),
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `groups_id` PRIMARY KEY(`id`),
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
	`invited_at` timestamp NOT NULL DEFAULT (now()),
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
	`public_id` char(30) NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`avatar_timestamp` timestamp,
	`account_id` bigint unsigned,
	`first_name` varchar(64),
	`last_name` varchar(64),
	`handle` varchar(64),
	`title` varchar(64),
	`blurb` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `org_member_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `org_members` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` char(29) NOT NULL,
	`account_id` bigint unsigned,
	`org_id` bigint unsigned NOT NULL,
	`invited_by_org_member_id` bigint unsigned,
	`status` enum('invited','active','removed') NOT NULL,
	`role` enum('member','admin') NOT NULL,
	`org_member_profile_id` bigint unsigned NOT NULL,
	`added_at` timestamp NOT NULL DEFAULT (now()),
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orgs_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`),
	CONSTRAINT `shortcode_idx` UNIQUE(`shortcode`)
);
--> statement-breakpoint
CREATE TABLE `pending_attachments` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` char(29) NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`org_public_id` char(28) NOT NULL,
	`filename` varchar(256) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pending_attachments_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `postal_servers` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` char(29) NOT NULL,
	`org_id` bigint unsigned NOT NULL,
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_idx` UNIQUE(`session_token`)
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
CREATE INDEX `type_idx` ON `convo_entries` (`type`);--> statement-breakpoint
CREATE INDEX `reply_to_id_idx` ON `convo_entries` (`reply_to_id`);--> statement-breakpoint
CREATE INDEX `entry_id_idx` ON `convo_entry_private_visibility_participants` (`entry_id`);--> statement-breakpoint
CREATE INDEX `entry_id_idx` ON `convo_entry_raw_html_emails` (`entry_id`);--> statement-breakpoint
CREATE INDEX `convo_entry_id_idx` ON `convo_entry_seen_timestamps` (`convo_entry_id`);--> statement-breakpoint
CREATE INDEX `seen_at_idx` ON `convo_entry_seen_timestamps` (`seen_at`);--> statement-breakpoint
CREATE INDEX `convo_participant_id_idx` ON `convo_participant_group_members` (`convo_participant_id`);--> statement-breakpoint
CREATE INDEX `group_id_idx` ON `convo_participant_group_members` (`group_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `convo_participants` (`org_id`);--> statement-breakpoint
CREATE INDEX `org_member_id_idx` ON `convo_participants` (`org_member_id`);--> statement-breakpoint
CREATE INDEX `convo_id_idx` ON `convo_participants` (`convo_id`);--> statement-breakpoint
CREATE INDEX `convo_id_idx` ON `convo_seen_timestamps` (`convo_id`);--> statement-breakpoint
CREATE INDEX `seen_at_idx` ON `convo_seen_timestamps` (`seen_at`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `convo_subjects` (`org_id`);--> statement-breakpoint
CREATE INDEX `convo_id_idx` ON `convo_subjects` (`convo_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `convos` (`org_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `domains` (`org_id`);--> statement-breakpoint
CREATE INDEX `domain_id_idx` ON `email_identities` (`domain_name`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `email_identities` (`org_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `email_identities_authorized_org_members` (`org_id`);--> statement-breakpoint
CREATE INDEX `identity_id_idx` ON `email_identities_authorized_org_members` (`identity_id`);--> statement-breakpoint
CREATE INDEX `account_id_idx` ON `email_identities_personal` (`account_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `email_identities_personal` (`org_id`);--> statement-breakpoint
CREATE INDEX `email_identity_id_idx` ON `email_identities_personal` (`email_identity_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `email_identity_external` (`org_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `email_routing_rules` (`org_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `email_routing_rules_destinations` (`org_id`);--> statement-breakpoint
CREATE INDEX `group_id_idx` ON `group_members` (`group_id`);--> statement-breakpoint
CREATE INDEX `org_member_id_idx` ON `group_members` (`org_member_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `groups` (`org_id`);--> statement-breakpoint
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
CREATE INDEX `expires_at_idx` ON `sessions` (`expires_at`);