import { db } from '.';
import { sql } from './orm';

(async () => {
  console.log('🔥 Cleaning the database of all entries');
  console.time('🧼 All clean');

  await db.execute(sql`truncate table convo_Note_replies`);
  await db.execute(sql`truncate table convo_attachments`);
  await db.execute(sql`truncate table convo_drafts`);
  await db.execute(sql`truncate table convo_members`);
  await db.execute(sql`truncate table convo_message_replies`);
  await db.execute(sql`truncate table convo_messages`);
  await db.execute(sql`truncate table convo_notes`);
  await db.execute(sql`truncate table convo_subjects`);
  await db.execute(sql`truncate table convos`);
  await db.execute(sql`truncate table domain_verifications`);
  await db.execute(sql`truncate table domains`);
  await db.execute(sql`truncate table email_identities`);
  await db.execute(sql`truncate table email_identities_authorized_users`);
  await db.execute(sql`truncate table email_routing_rules`);
  await db.execute(sql`truncate table email_routing_rules_destinations`);
  await db.execute(sql`truncate table foreign_email_identities`);
  await db.execute(sql`truncate table foreign_email_identities_reputations`);
  await db.execute(
    sql`truncate table foreign_email_identities_screener_status`
  );
  await db.execute(sql`truncate table org_invitations`);
  await db.execute(sql`truncate table org_members`);
  await db.execute(sql`truncate table org_modules`);
  await db.execute(sql`truncate table org_postal_configs`);
  await db.execute(sql`truncate table orgs`);
  await db.execute(sql`truncate table postal_servers`);
  await db.execute(sql`truncate table send_as_external_email_identities`);
  await db.execute(
    sql`truncate table send_as_external_email_identities_authorized_users`
  );
  await db.execute(
    sql`truncate table send_as_external_email_identities_smtp_credentials`
  );
  await db.execute(
    sql`truncate table send_as_external_email_identities_verification`
  );
  await db.execute(sql`truncate table user_group_members`);
  await db.execute(sql`truncate table user_groups`);
  await db.execute(sql`truncate table user_identities`);
  await db.execute(sql`truncate table user_profiles`);
  await db.execute(sql`truncate table user_profiles_to_orgs`);
  await db.execute(sql`truncate table users`);
  console.timeEnd('🧼 All clean');
})();
