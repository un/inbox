import {
  convoParticipants,
  convoToSpaces,
  emailRoutingRulesDestinations,
  orgMembers,
  orgs,
  spaceMembers,
  spaces,
  teams
} from '@u22n/database/schema';
import { eq, type InferInsertModel } from '@u22n/database/orm';
import { typeIdGenerator } from '@u22n/utils/typeid';
import { db } from '@u22n/database';
import { logger } from './logger';

export async function runOrgMigration({
  orgId,
  batchDistinctId
}: {
  orgId: number;
  batchDistinctId: string;
}) {
  logger.log(
    `[Batch ${batchDistinctId}] --------------------------------------------------------------------------------`
  );
  logger.log(
    `[Batch ${batchDistinctId}] --------------------------------------------------------------------------------`
  );
  logger.log(
    `[Batch ${batchDistinctId}] --------------------------------------------------------------------------------`
  );
  logger.log(
    `[Batch ${batchDistinctId}] 🏃‍♂️ Running migration for org ${orgId}`
  );
  const orgQueryResponse = await db.query.orgs.findFirst({
    where: eq(orgs.id, orgId),
    columns: {
      id: true,
      ownerId: true
    }
  });
  if (!orgQueryResponse) {
    logger.log(`[Batch ${batchDistinctId}] 🚨 org not found for id ${orgId}`);
    return;
  }

  const orgMemberIdArray: number[] = [];
  const teamIdArray: number[] = [];
  const consumedOrgSpaceShortcodes: string[] = [];

  //! Process Org Members

  // get list of org members:
  const orgMembersQueryResponse = await db.query.orgMembers.findMany({
    where: eq(orgMembers.orgId, orgId),
    columns: {
      id: true,
      accountId: true
    }
  });
  if (!orgMembersQueryResponse) {
    logger.log(
      `[Batch ${batchDistinctId}] 🚨 No org members found for org ${orgId}`
    );
    return;
  }

  // set the owner
  const orgOwnerMembershipId = orgMembersQueryResponse.find(
    (orgMember) => orgMember.accountId === orgQueryResponse.ownerId
  )?.id;
  if (!orgOwnerMembershipId) {
    logger.log(
      `[Batch ${batchDistinctId}] 🚨 No org owner found for org ${orgId}`
    );
    return;
  }

  // push all orgMemberIds to orgMemberIdArray
  orgMembersQueryResponse.forEach((orgMember) => {
    orgMemberIdArray.push(orgMember.id);
  });

  logger.log(
    `[Batch ${batchDistinctId}] 🔍 Found ${orgMemberIdArray.length} org members`
  );

  // For each member in orgMemberIdArray:
  for (const individualOrgMemberId of orgMemberIdArray) {
    // get org member profile
    const orgMemberProfileQueryResponse = await db.query.orgMembers.findFirst({
      where: eq(orgMembers.id, individualOrgMemberId),
      columns: {
        id: true
      },
      with: {
        profile: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            handle: true
          }
        }
      }
    });

    // Create a Private Space with defaults
    // check space name has not already been used
    if (!orgMemberProfileQueryResponse?.profile) {
      logger.log(
        `[Batch ${batchDistinctId}] 🚨 orgMemberProfileQueryResponse not found for org ${orgId} member ${individualOrgMemberId}`
      );
      break;
    }
    const userHandle = orgMemberProfileQueryResponse.profile.handle!;

    const preShortcode = `${userHandle.toLocaleLowerCase()}-personal`;

    const validatedShortcode = generateSpaceShortcode({
      input: preShortcode,
      consumedShortcodes: consumedOrgSpaceShortcodes
    });
    consumedOrgSpaceShortcodes.push(validatedShortcode);

    const newSpaceResponse = await db.insert(spaces).values({
      orgId: orgId,
      publicId: typeIdGenerator('spaces'),
      name: `${userHandle}'s Personal Space`,
      type: 'private',
      personalSpace: true,
      color: 'cyan',
      icon: 'house',
      createdByOrgMemberId: orgOwnerMembershipId,
      shortcode: validatedShortcode
    });

    // Add the org member as the space member
    await db.insert(spaceMembers).values({
      orgId: orgId,
      spaceId: Number(newSpaceResponse.insertId),
      publicId: typeIdGenerator('spaceMembers'),
      orgMemberId: Number(individualOrgMemberId),
      addedByOrgMemberId: orgOwnerMembershipId,
      role: 'admin',
      canCreate: true,
      canRead: true,
      canComment: true,
      canReply: true,
      canDelete: true,
      canChangeWorkflow: true,
      canSetWorkflowToClosed: true,
      canAddTags: true,
      canMoveToAnotherSpace: true,
      canAddToAnotherSpace: true,
      canMergeConvos: true,
      canAddParticipants: true
    });

    // set orgMember.personalSpaceId to spaceId
    await db
      .update(orgMembers)
      .set({
        personalSpaceId: Number(newSpaceResponse.insertId)
      })
      .where(eq(orgMembers.id, Number(individualOrgMemberId)));

    //! get all routingruleDestinations with orgMemberId match
    const routingRuleDestinationsQueryResponse =
      await db.query.emailRoutingRulesDestinations.findMany({
        where: eq(
          emailRoutingRulesDestinations.orgMemberId,
          individualOrgMemberId
        ),
        columns: {
          id: true,
          spaceId: true,
          teamId: true,
          ruleId: true,
          orgMemberId: true
        },
        with: {
          rule: {
            columns: {
              id: true
            },
            with: {
              mailIdentities: {
                columns: {
                  id: true
                }
              }
            }
          }
        }
      });

    if (routingRuleDestinationsQueryResponse.length === 0) {
      logger.log(
        `[Batch ${batchDistinctId}] 🚨 No routing rule destinations found for org member ${individualOrgMemberId}`
      );
      break;
    }

    // set orgMember.defaultEmailIdentityId to first routingruleDestination.emailIdentityId

    const routingRuleEmailIdentityId =
      routingRuleDestinationsQueryResponse[0]?.rule.mailIdentities[0]?.id;

    routingRuleEmailIdentityId &&
      (await db
        .update(orgMembers)
        .set({
          defaultEmailIdentityId: routingRuleEmailIdentityId
        })
        .where(eq(orgMembers.id, Number(individualOrgMemberId))));
    logger.log(
      `[Batch ${batchDistinctId}] 📧 updated org member ${individualOrgMemberId} default email identity`
    );

    // fetch all convos.id where user is participant.type === assigned | contributor
    const allConvoIds: number[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    logger.log(
      `[Batch ${batchDistinctId}] 🔍 Fetching convos for orgMember ${individualOrgMemberId}`
    );

    while (hasMore) {
      logger.log(
        `[Batch ${batchDistinctId}] 📊 Fetching chunk: offset=${offset}, limit=${limit}`
      );
      const responseChunk = await db.query.convoParticipants.findMany({
        where: eq(convoParticipants.orgMemberId, individualOrgMemberId),
        columns: { convoId: true },
        limit: limit,
        offset: offset
      });
      logger.log(
        `[Batch ${batchDistinctId}] 📊 Chunk size: ${responseChunk.length}`
      );

      const newConvoIds = responseChunk.map((cp) => cp.convoId);
      allConvoIds.push(...newConvoIds);
      logger.log(
        `[Batch ${batchDistinctId}] 📊 New convo IDs: ${newConvoIds.join(', ')}`
      );
      logger.log(
        `[Batch ${batchDistinctId}] 📊 Total convo IDs so far: ${allConvoIds.length}`
      );

      hasMore = responseChunk.length === limit;
      offset += limit;
      logger.log(
        `[Batch ${batchDistinctId}] 📊 Has more: ${hasMore}, New offset: ${offset}`
      );
    }

    logger.log(
      `[Batch ${batchDistinctId}] 🔢 Total convos found: ${allConvoIds.length}`
    );

    // insert convos2Spacestable entry
    const convosToSpacesInsertValuesArray: InferInsertModel<
      typeof convoToSpaces
    >[] = [];
    logger.log(
      `[Batch ${batchDistinctId}] 🏗️ Preparing convoToSpaces insert array`
    );
    for (const convoId of allConvoIds) {
      const spaceId = Number(newSpaceResponse.insertId);
      convosToSpacesInsertValuesArray.push({
        orgId: orgId,
        convoId: convoId,
        spaceId: spaceId,
        publicId: typeIdGenerator('convoToSpaces')
      });
    }
    logger.log(
      `[Batch ${batchDistinctId}] 🏗️ Prepared ${convosToSpacesInsertValuesArray.length} entries for convoToSpaces insert`
    );

    // Add this check before inserting
    if (convosToSpacesInsertValuesArray.length > 0) {
      await db.insert(convoToSpaces).values(convosToSpacesInsertValuesArray);
      logger.log(
        `[Batch ${batchDistinctId}] 🔗 linked ${convosToSpacesInsertValuesArray.length} convos to spaces`
      );
    } else {
      logger.log(
        `[Batch ${batchDistinctId}] ℹ️ No convos to link for this org member/team`
      );
    }

    for (const routingRuleDestination of routingRuleDestinationsQueryResponse) {
      await db
        .update(emailRoutingRulesDestinations)
        .set({
          spaceId: Number(newSpaceResponse.insertId),
          orgMemberId: null
        })
        .where(eq(emailRoutingRulesDestinations.id, routingRuleDestination.id));
      logger.log(
        `[Batch ${batchDistinctId}] 🔺 updated orgMember ${Number(
          individualOrgMemberId
        )} routing rule destination ${routingRuleDestination.id}`
      );
    }
  }
  logger.log(
    `[Batch ${batchDistinctId}] ⏱️ Finished processing ${orgMemberIdArray.length} org member spaces`
  );

  //! Process Teams

  // get list of org teams:
  const orgTeamsQueryResponse = await db.query.teams.findMany({
    where: eq(teams.orgId, orgId),
    columns: {
      id: true
    }
  });

  logger.log(
    `[Batch ${batchDistinctId}] 🔍 Found ${orgTeamsQueryResponse.length} org teams`
  );
  if (orgTeamsQueryResponse.length > 0) {
    // push all teamIds to teamIdArray
    orgTeamsQueryResponse.forEach((orgTeam) => {
      teamIdArray.push(orgTeam.id);
    });

    // for each team in teamIdArray

    for (const individualTeamId of teamIdArray) {
      // get team
      const teamQueryResponse = await db.query.teams.findFirst({
        where: eq(teams.id, individualTeamId),
        columns: {
          id: true,
          name: true
        }
      });

      if (!teamQueryResponse) {
        logger.log(
          `[Batch ${batchDistinctId}] 🚨 teamQueryResponse not found for org ${orgId} team ${individualTeamId}`
        );
        break;
      }

      // create private space
      const validatedShortcode = generateSpaceShortcode({
        input: teamQueryResponse.name,
        consumedShortcodes: consumedOrgSpaceShortcodes
      });
      consumedOrgSpaceShortcodes.push(validatedShortcode);

      const newSpaceResponse = await db.insert(spaces).values({
        orgId: orgId,
        publicId: typeIdGenerator('spaces'),
        name: `${teamQueryResponse.name}'s Space`,
        type: 'private',
        personalSpace: true,
        color: 'cyan',
        icon: 'house',
        createdByOrgMemberId: orgOwnerMembershipId,
        shortcode: validatedShortcode
      });

      // Add the org member as the space member
      await db.insert(spaceMembers).values({
        orgId: orgId,
        spaceId: Number(newSpaceResponse.insertId),
        publicId: typeIdGenerator('spaceMembers'),
        orgMemberId: orgOwnerMembershipId,
        addedByOrgMemberId: orgOwnerMembershipId,
        role: 'admin',
        canCreate: true,
        canRead: true,
        canComment: true,
        canReply: true,
        canDelete: true,
        canChangeWorkflow: true,
        canSetWorkflowToClosed: true,
        canAddTags: true,
        canMoveToAnotherSpace: true,
        canAddToAnotherSpace: true,
        canMergeConvos: true,
        canAddParticipants: true
      });

      // set team.defaultSpaceId > spaceId
      await db
        .update(teams)
        .set({
          defaultSpaceId: Number(newSpaceResponse.insertId)
        })
        .where(eq(teams.id, Number(individualTeamId)));

      // get all routingruleDestinations with teamId match
      const routingRuleDestinationsQueryResponse =
        await db.query.emailRoutingRulesDestinations.findMany({
          where: eq(
            emailRoutingRulesDestinations.teamId,
            Number(individualTeamId)
          ),
          columns: {
            id: true,
            spaceId: true,
            teamId: true,
            ruleId: true,
            orgMemberId: true
          },
          with: {
            rule: {
              columns: {
                id: true
              },
              with: {
                mailIdentities: {
                  columns: {
                    id: true
                  }
                }
              }
            }
          }
        });

      if (routingRuleDestinationsQueryResponse.length === 0) {
        logger.log(
          `[Batch ${batchDistinctId}] 🚨 No routing rule destinations found for team ${Number(individualTeamId)}`
        );
        break;
      }

      // set team.defaultEmailIdentityId to first routingruleDestination.emailIdentityId

      const routingRuleEmailIdentityId =
        routingRuleDestinationsQueryResponse[0]?.rule.mailIdentities[0]?.id;

      routingRuleEmailIdentityId &&
        (await db
          .update(teams)
          .set({
            defaultEmailIdentityId: routingRuleEmailIdentityId
          })
          .where(eq(teams.id, Number(Number(individualTeamId)))));
      logger.log(
        `[Batch ${batchDistinctId}] 📧 updated team ${Number(individualTeamId)} default email identity`
      );

      // fetch all convos.id where team is participant
      // fetch all convos.id where user is participant.type === assigned | contributor
      const allConvoIds: number[] = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const responseChunk = await db.query.convoParticipants.findMany({
          where: eq(convoParticipants.teamId, Number(individualTeamId)),
          columns: { convoId: true },
          limit: limit,
          offset: offset
        });
        allConvoIds.push(...responseChunk.map((cp) => cp.convoId));
        hasMore = responseChunk.length === limit;
        offset += limit;
      }

      // insert convos2Spacestable entry
      const convosToSpacesInsertValuesArray: InferInsertModel<
        typeof convoToSpaces
      >[] = [];
      for (const convoId of allConvoIds) {
        const spaceId = Number(newSpaceResponse.insertId);
        convosToSpacesInsertValuesArray.push({
          orgId: orgId,
          convoId: convoId,
          spaceId: spaceId,
          publicId: typeIdGenerator('convoToSpaces')
        });
      }

      // Add this check before inserting
      if (convosToSpacesInsertValuesArray.length > 0) {
        await db.insert(convoToSpaces).values(convosToSpacesInsertValuesArray);
        logger.log(
          `[Batch ${batchDistinctId}] 🔗 linked ${convosToSpacesInsertValuesArray.length} convos to spaces`
        );
      } else {
        logger.log(
          `[Batch ${batchDistinctId}] ℹ️ No convos to link for this org member/team`
        );
      }

      for (const routingRuleDestination of routingRuleDestinationsQueryResponse) {
        await db
          .update(emailRoutingRulesDestinations)
          .set({
            spaceId: Number(newSpaceResponse.insertId),
            teamId: null
          })
          .where(
            eq(emailRoutingRulesDestinations.id, routingRuleDestination.id)
          );
        logger.log(
          `[Batch ${batchDistinctId}] 🔺 updated team ${Number(
            individualTeamId
          )} routing rule destination ${routingRuleDestination.id}`
        );
      }
    }
    logger.log(
      `[Batch ${batchDistinctId}] 📦 created ${teamIdArray.length} team spaces`
    );
  }

  logger.log(
    `[Batch ${batchDistinctId}] 🏁 Finished processing orgId migration`
  );
}

function generateSpaceShortcode({
  input,
  consumedShortcodes
}: {
  input: string;
  consumedShortcodes: string[];
}) {
  const cleanedInput = input.toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
  if (!consumedShortcodes.includes(cleanedInput)) {
    return cleanedInput;
  }
  const existingMatchingSpaces = consumedShortcodes.filter((spaceShortcode) =>
    spaceShortcode.startsWith(cleanedInput)
  );
  let currentSuffix = existingMatchingSpaces.length;
  let retries = 0;
  let validatedShortcode = `${cleanedInput}${currentSuffix}`;
  while (retries < 30) {
    if (consumedShortcodes.includes(validatedShortcode)) {
      retries++;
      currentSuffix++;
      validatedShortcode = `${cleanedInput}${currentSuffix}`;
      continue;
    }
    break;
  }

  return validatedShortcode;
}
