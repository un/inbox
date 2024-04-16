ALTER TABLE `authenticators` MODIFY COLUMN `credential_public_key` text NOT NULL;--> statement-breakpoint
ALTER TABLE `convo_entry_raw_html_emails` MODIFY COLUMN `html` mediumtext NOT NULL;