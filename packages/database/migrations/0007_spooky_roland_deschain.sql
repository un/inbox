ALTER TABLE `authenticators` ADD CONSTRAINT `public_id_idx` UNIQUE(`public_id`);--> statement-breakpoint
ALTER TABLE `email_routing_rules_destinations` ADD CONSTRAINT `public_id_idx` UNIQUE(`public_id`);--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `public_id_idx` UNIQUE(`public_id`);--> statement-breakpoint
CREATE INDEX `subject_id_idx` ON `convo_entries` (`subject_id`);--> statement-breakpoint
CREATE INDEX `author_idx` ON `convo_entries` (`author`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `convo_entries` (`created_at`);--> statement-breakpoint
CREATE INDEX `email_message_id_idx` ON `convo_entries` (`email_message_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `convo_entry_private_visibility_participants` (`org_id`);--> statement-breakpoint
CREATE INDEX `convo_member_id_idx` ON `convo_entry_private_visibility_participants` (`convo_member_id`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `convo_entry_raw_html_emails` (`org_id`);--> statement-breakpoint
CREATE INDEX `wipe_date_idx` ON `convo_entry_raw_html_emails` (`wipe_date`);--> statement-breakpoint
CREATE INDEX `org_id_idx` ON `convo_entry_replies` (`org_id`);--> statement-breakpoint
CREATE INDEX `entry_source_id_idx` ON `convo_entry_replies` (`convo_message_source_id`);--> statement-breakpoint
CREATE INDEX `entry_reply_id_idx` ON `convo_entry_replies` (`convo_message_reply_id`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `convo_entry_replies` (`created_at`);--> statement-breakpoint
CREATE INDEX `participant_id_idx` ON `convo_entry_seen_timestamps` (`participant_id`);--> statement-breakpoint
CREATE INDEX `participant_id_idx` ON `convo_seen_timestamps` (`participant_id`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `convos` (`created_at`);--> statement-breakpoint
CREATE INDEX `rule_id_idx` ON `email_routing_rules_destinations` (`rule_id`);--> statement-breakpoint
CREATE INDEX `team_id_idx` ON `email_routing_rules_destinations` (`team_id`);--> statement-breakpoint
CREATE INDEX `org_member_id_idx` ON `email_routing_rules_destinations` (`org_member_id`);