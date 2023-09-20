import { db } from '@uninbox/database';
import dns from 'dns';
import {
  InferSelectModel,
  and,
  desc,
  eq,
  gt,
  inArray,
  lt,
  or
} from '@uninbox/database/orm';
import {
  convoMembers,
  convoMessages,
  convoNotes,
  convoSubjects,
  convos,
  userGroupMembers
} from '@uninbox/database/schema';

export default defineEventHandler(async (event) => {
  const { user } = event.context;
  const userId = user.userId || 1;
  // const { $trpc } = use

  // const response = await $trpc.org.mail.domains.createNewDomain.mutate({
  //   orgPublicId: 'test',
  //   domainName: 'uninbox.com'
  // });

  return 'response';
});
