ALTER TABLE `accounts` ADD `recovery_email_hash` varchar(255);
ALTER TABLE `accounts` ADD `recovery_email_verified_at` timestamp;