import {
  orgs,
  orgMembers,
  convoParticipants,
  teams as teamsSchema,
  emailRoutingRulesDestinations
} from '@u22n/database/schema';
import { eq } from '@u22n/database/orm';
import { db } from '@u22n/database';

async function checkOrgConvos(orgId: number) {
  console.info(`Checking data for org ID: ${orgId}`);

  // Get org details
  const org = await db.query.orgs.findFirst({
    where: eq(orgs.id, orgId),
    columns: {
      id: true,
      name: true,
      ownerId: true
    }
  });

  if (!org) {
    console.info(`Organization with ID ${orgId} not found.`);
    return;
  }

  console.info(`Organization: ${org.name} (ID: ${org.id})`);
  console.info(`Owner ID: ${org.ownerId}`);

  // Get org members
  const members = await db.query.orgMembers.findMany({
    where: eq(orgMembers.orgId, orgId),
    columns: {
      id: true,
      accountId: true
    }
  });

  console.info(`Number of org members: ${members.length}`);

  // Check convos for each member
  let totalConvos = 0;
  for (const member of members) {
    const convos = await db.query.convoParticipants.findMany({
      where: eq(convoParticipants.orgMemberId, member.id),
      columns: {
        convoId: true
      }
    });
    totalConvos += convos.length;
    console.info(
      `Member ID ${member.id} (Account ID: ${member.accountId}): ${convos.length} conversations`
    );

    // Check routing rule destinations for each member
    const routingRules = await db.query.emailRoutingRulesDestinations.findMany({
      where: eq(emailRoutingRulesDestinations.orgMemberId, member.id),
      columns: {
        id: true
      }
    });
    console.info(`  Routing rule destinations: ${routingRules.length}`);
  }

  console.info(`Total conversations for org: ${totalConvos}`);

  // Get org teams
  const orgTeams = await db.query.teams.findMany({
    where: eq(teamsSchema.orgId, orgId),
    columns: {
      id: true,
      name: true
    }
  });

  console.info(`Number of org teams: ${orgTeams.length}`);

  // Check convos for each team
  let totalTeamConvos = 0;
  for (const team of orgTeams) {
    const convos = await db.query.convoParticipants.findMany({
      where: eq(convoParticipants.teamId, team.id),
      columns: {
        convoId: true
      }
    });
    totalTeamConvos += convos.length;
    console.info(
      `Team ID ${team.id} (${team.name}): ${convos.length} conversations`
    );

    // Check routing rule destinations for each team
    const routingRules = await db.query.emailRoutingRulesDestinations.findMany({
      where: eq(emailRoutingRulesDestinations.teamId, team.id),
      columns: {
        id: true
      }
    });
    console.info(`  Routing rule destinations: ${routingRules.length}`);
  }

  console.info(`Total team conversations for org: ${totalTeamConvos}`);
  console.info(
    `Grand total conversations for org: ${totalConvos + totalTeamConvos}`
  );
}

// Get org ID from command line argument
// @ts-expect-error  it's a script
const orgIdToCheck = parseInt(process.argv[2], 10);

if (isNaN(orgIdToCheck)) {
  console.error(
    'Please provide a valid organization ID as a command-line argument.'
  );
  process.exit(1);
}

checkOrgConvos(orgIdToCheck).catch(console.error);
