import { sessions } from '@u22n/database/schema';
import type { NextRequest } from 'next/server';
import { eq } from '@u22n/database/orm';
import { db } from '@u22n/database';

export async function getAccount(req: NextRequest) {
  const sessionCookie = req.cookies.get('un-session');

  if (!sessionCookie) {
    // Redirect to the webapp if the user is not logged in
    return null;
  }

  const sessionData = await db.query.sessions.findFirst({
    where: eq(sessions.sessionToken, sessionCookie.value),
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
    // Redirect to the webapp if the user is not logged in
    return null;
  }

  // is user in org 1?
  // if not, throw error
  const inOrg = sessionData.account.orgMemberships.some(
    (membership) => membership.org.id === 1
  );

  if (!inOrg) {
    // Redirect to the webapp if the user is not in the command organization
    return null;
  }

  return sessionData.account;
}
