import { getCookie, defineEventHandler, createError } from 'h3';
import { db } from '@u22n/database';
import { sessions } from '@u22n/database/schema';
import { eq } from '@u22n/database/orm';

export default defineEventHandler(async (event) => {
  const sessionCookie = getCookie(event, 'unsession');
  if (!sessionCookie) {
    //get IP address
    // report IP Address

    throw createError({
      status: 401,
      message: 'unauthorized'
    });
  }

  const sessionData = await db.query.sessions.findFirst({
    where: eq(sessions.sessionToken, sessionCookie),
    columns: {
      id: true
    },
    with: {
      account: {
        columns: {
          username: true,
          id: true,
          metadata: true
        },
        with: {
          orgMemberships: {
            columns: {
              role: true
            },
            with: {
              org: {
                columns: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!sessionData) {
    //get IP address
    // report IP Address
    throw createError({
      status: 401,
      message: 'unauthorized'
    });
  }

  // is user in org 1?
  // if not, throw error
  const inOrg = sessionData.account.orgMemberships.some(
    (membership) => membership.org.id === 1
  );
  if (!inOrg) {
    //get IP address
    // report IP Address
    throw createError({
      status: 401,
      message: 'unauthorized'
    });
  }

  event.context.account = sessionData.account;
});
