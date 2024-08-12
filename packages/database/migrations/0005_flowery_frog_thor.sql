RENAME TABLE `convo_participant_group_members` TO `convo_participant_team_members`;--> statement-breakpoint
RENAME TABLE `group_members` TO `team_members`;--> statement-breakpoint
RENAME TABLE `groups` TO `teams`;--> statement-breakpoint
ALTER TABLE `convo_participants` RENAME COLUMN `group_id` TO `team_id`;--> statement-breakpoint
ALTER TABLE `email_identities_authorized_org_members` RENAME COLUMN `group_id` TO `team_id`;--> statement-breakpoint
ALTER TABLE `email_routing_rules_destinations` RENAME COLUMN `group_id` TO `team_id`;--> statement-breakpoint
ALTER TABLE `convo_participant_team_members` RENAME COLUMN `group_id` TO `team_id`;--> statement-breakpoint
ALTER TABLE `team_members` RENAME COLUMN `group_id` TO `team_id`;--> statement-breakpoint
DROP INDEX `group_id_idx` ON `convo_participant_team_members`;--> statement-breakpoint
DROP INDEX `group_id_idx` ON `team_members`;--> statement-breakpoint
ALTER TABLE `convo_participants` MODIFY COLUMN `role` enum('assigned','contributor','commenter','watcher','teamMember','guest') NOT NULL DEFAULT 'contributor';--> statement-breakpoint
ALTER TABLE `convo_participants` ADD CONSTRAINT `team_to_convo_idx` UNIQUE(`convo_id`,`team_id`);--> statement-breakpoint
ALTER TABLE `email_identities_authorized_org_members` ADD CONSTRAINT `team_to_identity_idx` UNIQUE(`identity_id`,`team_id`);--> statement-breakpoint
ALTER TABLE `team_members` ADD CONSTRAINT `org_member_to_team_idx` UNIQUE(`team_id`,`org_member_id`);--> statement-breakpoint
ALTER TABLE `convo_participants` DROP INDEX `group_to_convo_idx`;--> statement-breakpoint
ALTER TABLE `email_identities_authorized_org_members` DROP INDEX `group_to_identity_idx`;--> statement-breakpoint
ALTER TABLE `team_members` DROP INDEX `org_member_to_group_idx`;--> statement-breakpoint
CREATE INDEX `team_id_idx` ON `convo_participant_team_members` (`team_id`);--> statement-breakpoint
CREATE INDEX `team_id_idx` ON `team_members` (`team_id`);