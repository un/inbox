CREATE TABLE `accounts` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`userId` bigint unsigned NOT NULL,
	`passwordEnabled` boolean NOT NULL DEFAULT false,
	`password_hash` varchar(255),
	`recoveryEmailEnabled` boolean NOT NULL DEFAULT false,
	`recovery_email` varchar(255),
	`email_verified` timestamp,
	`passkeys_enabled` boolean NOT NULL DEFAULT false,
	`two_factor_enabled` boolean NOT NULL DEFAULT false,
	`two_factor_secret` varchar(255),
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `recovery_email_idx` UNIQUE(`recovery_email`)
);
--> statement-breakpoint
CREATE TABLE `authenticators` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`account_id` bigint unsigned NOT NULL,
	`nickname` varchar(64) NOT NULL,
	`credential_id` varchar(255) NOT NULL,
	`credential_public_key` varchar(255) NOT NULL,
	`counter` bigint unsigned NOT NULL,
	`credential_device_type` varchar(32) NOT NULL,
	`credential_backed_up` boolean NOT NULL,
	`transports` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
	`last_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `contact_global_reputations_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_address_idx` UNIQUE(`email_address`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` varchar(16) NOT NULL,
	`avatar_id` varchar(32),
	`org_id` bigint unsigned NOT NULL,
	`reputation_id` bigint unsigned NOT NULL,
	`name` varchar(128),
	`set_name` varchar(128),
	`email_username` varchar(128) NOT NULL,
	`email_domain` varchar(128) NOT NULL,
	`signature` text,
	`type` enum('person','product','newsletter','marketing') NOT NULL,
	`screener_status` enum('pending','approve','reject'),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`),
	CONSTRAINT `email_org_unique_idx` UNIQUE(`email_username`,`email_domain`,`org_id`)
);
--> statement-breakpoint
CREATE TABLE `convo_attachments` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` varchar(16) NOT NULL,
	`convo_id` bigint unsigned NOT NULL,
	`convo_entry_id` bigint unsigned,
	`fileName` varchar(256) NOT NULL,
	`type` varchar(256) NOT NULL,
	`public` boolean NOT NULL DEFAULT false,
	`convo_participant_id` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `convo_attachments_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `convo_entries` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` varchar(32) NOT NULL,
	`type` enum('message','comment','draft') NOT NULL,
	`convo_id` bigint unsigned NOT NULL,
	`subject_id` bigint unsigned,
	`author` bigint unsigned NOT NULL,
	`reply_to_id` bigint unsigned,
	`body` json NOT NULL,
	`body_plain_text` text NOT NULL,
	`metadata` json DEFAULT ('{}'),
	`visibility` enum('private','internal_participants','org','all_participants') NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `convo_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `convo_entry_private_visibility_participants` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`entry_id` bigint unsigned NOT NULL,
	`convo_member_id` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `convo_entry_private_visibility_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `convo_entry_replies` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`convo_message_source_id` bigint unsigned NOT NULL,
	`convo_message_reply_id` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `convo_entry_replies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `convo_participants` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` varchar(16) NOT NULL,
	`org_member_id` bigint unsigned,
	`user_group_id` bigint unsigned,
	`contact_id` bigint unsigned,
	`convo_id` bigint unsigned NOT NULL,
	`role` enum('assigned','contributor','commenter','watcher','guest') NOT NULL DEFAULT 'contributor',
	`notifications` enum('active','muted','off') NOT NULL DEFAULT 'active',
	`last_read_at` timestamp,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `convo_participants_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`),
	CONSTRAINT `org_member_to_convo_idx` UNIQUE(`convo_id`,`org_member_id`),
	CONSTRAINT `user_group_to_convo_idx` UNIQUE(`convo_id`,`user_group_id`)
);
--> statement-breakpoint
CREATE TABLE `convo_subjects` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` varchar(16) NOT NULL,
	`convo_id` bigint unsigned NOT NULL,
	`subject` varchar(256) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `convo_subjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `convos` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`public_id` varchar(16) NOT NULL,
	`last_updated_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `convos_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `domains` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` varchar(16) NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`catch_all_address` bigint unsigned,
	`postal_host` varchar(32) NOT NULL,
	`domain` varchar(256) NOT NULL,
	`forwarding_address` varchar(128),
	`postal_id` varchar(64),
	`domain_status` enum('pending','active','disabled') NOT NULL DEFAULT 'pending',
	`sending_mode` enum('native','external','disabled') NOT NULL,
	`receiving_mode` enum('native','forwarding','disabled') NOT NULL,
	`dkim_key` varchar(32),
	`dkim_value` varchar(256),
	`mx_dns_valid` boolean NOT NULL DEFAULT false,
	`dkim_dns_valid` boolean NOT NULL DEFAULT false,
	`spf_dns_valid` boolean NOT NULL DEFAULT false,
	`return_path_dns_valid` boolean NOT NULL DEFAULT false,
	`last_dns_check_at` timestamp,
	`disabled_at` timestamp,
	`verified_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `domains_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`),
	CONSTRAINT `domain_idx` UNIQUE(`domain`),
	CONSTRAINT `postal_id_idx` UNIQUE(`postal_id`)
);
--> statement-breakpoint
CREATE TABLE `email_identities` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` varchar(16) NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`username` varchar(32) NOT NULL,
	`domain_name` varchar(128) NOT NULL,
	`domain_id` bigint unsigned,
	`routing_rule_id` bigint unsigned NOT NULL,
	`send_name` varchar(128),
	`created_by` bigint unsigned NOT NULL,
	`is_catch_all` boolean NOT NULL DEFAULT false,
	`is_personal` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `email_identities_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`),
	CONSTRAINT `email_idx` UNIQUE(`username`,`domain_name`)
);
--> statement-breakpoint
CREATE TABLE `email_identities_authorized_users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`identity_id` bigint unsigned NOT NULL,
	`org_member_id` bigint unsigned,
	`user_group_id` bigint unsigned,
	`default` boolean NOT NULL DEFAULT false,
	`added_by` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `email_identities_authorized_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `org_member_to_identity_idx` UNIQUE(`identity_id`,`org_member_id`),
	CONSTRAINT `user_group_to_identity_idx` UNIQUE(`identity_id`,`user_group_id`)
);
--> statement-breakpoint
CREATE TABLE `email_routing_rules` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` varchar(16) NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`created_by` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `email_routing_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `email_routing_rules_destinations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`rule_id` bigint unsigned NOT NULL,
	`group_id` bigint unsigned,
	`org_member_id` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `email_routing_rules_destinations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `org_billing` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`stripe_customer_id` varchar(128) NOT NULL,
	`stripe_subscription_id` varchar(128),
	`plan` enum('free','starter','pro') NOT NULL DEFAULT 'free',
	`period` enum('monthly','yearly') NOT NULL DEFAULT 'monthly',
	CONSTRAINT `org_billing_id` PRIMARY KEY(`id`),
	CONSTRAINT `stripe_customer_id_idx` UNIQUE(`stripe_customer_id`),
	CONSTRAINT `stripe_subscription_id_idx` UNIQUE(`stripe_subscription_id`)
);
--> statement-breakpoint
CREATE TABLE `org_invitations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` varchar(16) NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`invited_by_org_member_id` bigint unsigned NOT NULL,
	`role` enum('member','admin') NOT NULL,
	`org_member_id` bigint unsigned,
	`invited_user_profile_id` bigint unsigned,
	`email` varchar(128),
	`invite_token` varchar(64),
	`invited_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`expires_at` timestamp,
	`accepted_at` timestamp,
	CONSTRAINT `org_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`),
	CONSTRAINT `org_member_id_idx` UNIQUE(`org_member_id`),
	CONSTRAINT `org_email_unique_idx` UNIQUE(`org_id`,`email`)
);
--> statement-breakpoint
CREATE TABLE `org_members` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` varchar(16) NOT NULL,
	`user_id` bigint unsigned,
	`org_id` bigint unsigned NOT NULL,
	`invited_by_org_member_id` bigint unsigned,
	`status` enum('invited','active','removed') NOT NULL,
	`role` enum('member','admin') NOT NULL,
	`user_profile_id` bigint unsigned NOT NULL,
	`added_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`removed_at` timestamp,
	CONSTRAINT `org_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`),
	CONSTRAINT `org_user_idx` UNIQUE(`org_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `org_modules` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`module` enum('strip signatures','anonymous analytics') NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`last_modified_by_user` bigint unsigned NOT NULL,
	`last_modified_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
	`public_id` varchar(16) NOT NULL,
	`avatar_id` varchar(32),
	`slug` varchar(64) NOT NULL,
	`owner_id` bigint unsigned NOT NULL,
	`name` varchar(64) NOT NULL,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `orgs_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`),
	CONSTRAINT `slug_idx` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `personal_email_identities` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` varchar(16) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`email_identity_id` bigint unsigned NOT NULL,
	`postal_server_id` bigint unsigned NOT NULL,
	`forwarding_address` varchar(128),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `personal_email_identities_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `postal_servers` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` varchar(16) NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`root_mail_server` boolean NOT NULL DEFAULT false,
	`type` enum('email','transactional','marketing') NOT NULL,
	`send_limit` mediumint NOT NULL,
	`api_key` varchar(64) NOT NULL,
	`smtp_key` varchar(64),
	`root_forwarding_address` varchar(128),
	CONSTRAINT `postal_servers_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `send_as_external_email_identities` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` varchar(16) NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	`verified` boolean NOT NULL DEFAULT false,
	`username` varchar(32) NOT NULL,
	`domain` varchar(128) NOT NULL,
	`send_name` varchar(128),
	`created_by` bigint unsigned NOT NULL,
	`smtp_credentials_id` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `send_as_external_email_identities_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`),
	CONSTRAINT `email_idx` UNIQUE(`username`,`domain`)
);
--> statement-breakpoint
CREATE TABLE `send_as_external_email_identities_authorized_users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`identity_id` bigint unsigned NOT NULL,
	`org_member_id` bigint unsigned,
	`user_group_id` bigint unsigned,
	`added_by` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `send_as_external_email_identities_authorized_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `org_member_to_identity_idx` UNIQUE(`identity_id`,`org_member_id`)
);
--> statement-breakpoint
CREATE TABLE `send_as_external_email_identities_smtp_credentials` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`username` varchar(128) NOT NULL,
	`password` varchar(128) NOT NULL,
	`hostname` varchar(128) NOT NULL,
	`port` smallint NOT NULL,
	`auth_method` enum('plain','login','cram_md5'),
	`encryption` enum('ssl','tls','starttls','none'),
	`created_by` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `send_as_external_email_identities_smtp_credentials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `send_as_external_email_identities_verification` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`identity_id` bigint unsigned NOT NULL,
	`verification_token` varchar(64) NOT NULL,
	`verified_at` timestamp,
	CONSTRAINT `send_as_external_email_identities_verification_id` PRIMARY KEY(`id`),
	CONSTRAINT `identity_id_idx` UNIQUE(`identity_id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`user_public_id` varchar(16) NOT NULL,
	`session_token` varchar(255) NOT NULL,
	`device` varchar(255) NOT NULL,
	`os` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_idx` UNIQUE(`session_token`)
);
--> statement-breakpoint
CREATE TABLE `user_group_members` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` varchar(16) NOT NULL,
	`group_id` bigint unsigned NOT NULL,
	`org_member_id` bigint unsigned NOT NULL,
	`user_profile_id` bigint unsigned,
	`added_by` bigint unsigned NOT NULL,
	`role` enum('member','admin') NOT NULL DEFAULT 'member',
	`notifications` enum('active','muted','off') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `user_group_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_to_group_idx` UNIQUE(`group_id`,`org_member_id`)
);
--> statement-breakpoint
CREATE TABLE `user_groups` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` varchar(16) NOT NULL,
	`avatar_id` varchar(32),
	`org_id` bigint unsigned NOT NULL,
	`name` varchar(128) NOT NULL,
	`color` enum('red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose'),
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `user_groups_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` varchar(16) NOT NULL,
	`avatar_id` varchar(32),
	`user_id` bigint unsigned,
	`first_name` varchar(64),
	`last_name` varchar(64),
	`handle` varchar(64),
	`title` varchar(64),
	`blurb` text,
	`default_profile` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles_to_orgs` (
	`user_profile_id` bigint unsigned NOT NULL,
	`org_id` bigint unsigned NOT NULL,
	CONSTRAINT `user_profiles_to_orgs_user_profile_id_org_id_pk` PRIMARY KEY(`user_profile_id`,`org_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`public_id` varchar(16) NOT NULL,
	`username` varchar(32) NOT NULL,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`last_login_at` timestamp,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_id_idx` UNIQUE(`public_id`),
	CONSTRAINT `username_idx` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `accounts` (`userId`);--> statement-breakpoint
CREATE INDEX `provider_account_id_idx` ON `authenticators` (`account_id`);--> statement-breakpoint
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
CREATE INDEX `org_id_idx` ON `convo_participants` (`org_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `convo_participants` (`org_member_id`);--> statement-breakpoint
CREATE INDEX `convo_id_idx` ON `convo_participants` (`convo_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `convo_subjects` (`org_id`);--> statement-breakpoint
CREATE INDEX `convo_id_idx` ON `convo_subjects` (`convo_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `convos` (`org_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `domains` (`org_id`);--> statement-breakpoint
CREATE INDEX `domain_id_idx` ON `email_identities` (`domain_name`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `email_identities` (`org_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `email_identities_authorized_users` (`org_id`);--> statement-breakpoint
CREATE INDEX `identity_id_idx` ON `email_identities_authorized_users` (`identity_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `email_routing_rules` (`org_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `email_routing_rules_destinations` (`org_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `org_billing` (`org_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `org_invitations` (`org_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `org_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `org_members` (`org_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `org_modules` (`org_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `org_postal_configs` (`org_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `personal_email_identities` (`user_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `personal_email_identities` (`org_id`);--> statement-breakpoint
CREATE INDEX `email_identity_id_idx` ON `personal_email_identities` (`email_identity_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `postal_servers` (`org_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `send_as_external_email_identities` (`org_id`);--> statement-breakpoint
CREATE INDEX `identity_id_idx` ON `send_as_external_email_identities_authorized_users` (`identity_id`);--> statement-breakpoint
CREATE INDEX `org_member_id_idx` ON `send_as_external_email_identities_authorized_users` (`org_member_id`);--> statement-breakpoint
CREATE INDEX `user_group_id_idx` ON `send_as_external_email_identities_authorized_users` (`user_group_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `group_id_idx` ON `user_group_members` (`group_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `user_group_members` (`org_member_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `user_groups` (`org_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `user_profiles` (`user_id`);