import {
  convos,
  convoToSpaces,
  convoWorkflows,
  spaces,
  spaceWorkflows
} from '@u22n/database/schema';
import { typeIdGenerator } from '@u22n/utils/typeid';
import { eq, and } from '@u22n/database/orm';
import { type DBType } from '@u22n/database';

//! copy of functions from apps/platform/trpc/routers/spaceRouter/utils.ts

export async function addConvoToSpace({
  db,
  orgId,
  convoId,
  spaceId
}: {
  db: DBType;
  orgId: number;
  convoId: number;
  spaceId: number;
}) {
  // validate that the space and convo exist and belong to the same org
  const spaceQuery = await db.query.spaces.findFirst({
    where: and(eq(spaces.orgId, orgId), eq(spaces.id, spaceId)),
    columns: {
      id: true,
      createdByOrgMemberId: true
    }
  });
  if (!spaceQuery) {
    throw new Error('❌addConvoToSpace: Space not found');
  }
  const convoQuery = await db.query.convos.findFirst({
    where: and(eq(convos.orgId, orgId), eq(convos.id, convoId)),
    columns: {
      id: true
    }
  });
  if (!convoQuery) {
    throw new Error('❌addConvoToSpace: Convo not found');
  }

  // check if the convo is already in the space
  const convoToSpacesQuery = await db.query.convoToSpaces.findMany({
    where: and(
      eq(convoToSpaces.orgId, orgId),
      eq(convoToSpaces.convoId, convoId),
      eq(convoToSpaces.spaceId, spaceId)
    ),
    columns: {
      id: true
    }
  });
  if (convoToSpacesQuery.length > 0) {
    return;
  }

  // add the convo to the space
  const newConvoToSpaceInsert = await db.insert(convoToSpaces).values({
    orgId: orgId,
    convoId: convoId,
    spaceId: spaceId,
    publicId: typeIdGenerator('convoToSpaces')
  });

  // check if the space has "open" workflows
  const spaceWorkflowsQuery = await db.query.spaceWorkflows.findMany({
    where: and(
      eq(spaceWorkflows.orgId, orgId),
      eq(spaceWorkflows.spaceId, spaceId),
      eq(spaceWorkflows.type, 'open')
    ),
    columns: {
      id: true,
      disabled: true,
      order: true
    }
  });

  if (!spaceWorkflowsQuery || spaceWorkflowsQuery.length === 0) {
    return;
  }

  // check first convoWorkflow type === open
  const openWorkflows = spaceWorkflowsQuery.sort((a, b) => a.order - b.order);
  if (openWorkflows && openWorkflows.length > 0) {
    const firstOpenWorkflow = openWorkflows?.[0];
    if (firstOpenWorkflow) {
      await db.insert(convoWorkflows).values({
        orgId: orgId,
        convoId: convoId,
        spaceId: spaceId,
        convoToSpaceId: Number(newConvoToSpaceInsert.insertId),
        publicId: typeIdGenerator('convoWorkflows'),
        workflow: firstOpenWorkflow.id,
        byOrgMemberId: spaceQuery.createdByOrgMemberId
      });
      return;
    }
  }
  return;
}
