import type { EmailAddress } from 'mailparser';
import type { MessageParseAddressPlatformObject } from '../types';
import { db } from '@u22n/database';
import { and, eq } from '@u22n/database/orm';
import {
  contactGlobalReputations,
  contacts,
  emailIdentities
} from '@u22n/database/schema';
import { typeIdGenerator } from '@u22n/utils';

export async function parseAddressIds(input: {
  addresses: EmailAddress[];
  addressType: 'to' | 'cc' | 'from';
  orgId: number;
}): Promise<MessageParseAddressPlatformObject[] | []> {
  const parsedAddressIds: MessageParseAddressPlatformObject[] = [];

  for (const addressObject of input.addresses) {
    if (!addressObject.address) {
      continue;
    }

    const [emailUsername, emailDomain] = addressObject.address.split('@');
    if (!emailDomain || !emailUsername) {
      continue;
    }
    // check if email is existing contact
    const contactQuery = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.orgId, input.orgId),
        eq(contacts.emailDomain, emailDomain),
        eq(contacts.emailUsername, emailUsername)
      ),
      columns: {
        id: true,
        publicId: true,
        emailUsername: true,
        emailDomain: true,
        name: true,
        type: true
      }
    });
    if (contactQuery) {
      parsedAddressIds.push({
        id: contactQuery.id,
        type: 'contact',
        publicId: contactQuery.publicId,
        email: contactQuery.emailUsername + '@' + contactQuery.emailDomain,
        contactType: contactQuery.type,
        ref: input.addressType
      });
      if (contactQuery.name === null && addressObject.name) {
        await db
          .update(contacts)
          .set({
            name: addressObject.name
          })
          .where(eq(contacts.id, contactQuery.id));
      }
      continue;
    }

    // check if address is an existing email identity or a catch-all identity
    const emailIdentityQuery = await db.query.emailIdentities.findFirst({
      where: and(
        eq(emailIdentities.orgId, input.orgId),
        eq(emailIdentities.domainName, emailDomain),
        eq(emailIdentities.username, emailUsername)
      ),
      columns: {
        id: true,
        publicId: true,
        username: true,
        domainName: true
      }
    });

    if (emailIdentityQuery && emailIdentityQuery.id !== null) {
      parsedAddressIds.push({
        id: emailIdentityQuery.id,
        type: 'emailIdentity',
        publicId: emailIdentityQuery.publicId,
        email:
          emailIdentityQuery.username + '@' + emailIdentityQuery.domainName,
        contactType: null,
        ref: input.addressType
      });
      continue;
    }

    // check if is catch all
    const emailIdentityCatchAllQuery =
      input.addressType === 'from'
        ? null
        : await db.query.emailIdentities.findFirst({
            where: and(
              eq(emailIdentities.orgId, input.orgId),
              eq(emailIdentities.domainName, emailDomain),
              eq(emailIdentities.isCatchAll, true)
            ),
            columns: {
              id: true,
              publicId: true,
              username: true,
              domainName: true
            }
          });

    if (emailIdentityCatchAllQuery && emailIdentityCatchAllQuery.id !== null) {
      parsedAddressIds.push({
        id: emailIdentityCatchAllQuery.id,
        type: 'emailIdentity',
        publicId: emailIdentityCatchAllQuery.publicId,
        email:
          emailIdentityCatchAllQuery.username +
          '@' +
          emailIdentityCatchAllQuery.domainName,
        contactType: null,
        ref: input.addressType
      });
      continue;
    }

    // check if its a forwarding address
    const emailIdentityFwdQuery =
      input.addressType === 'from'
        ? null
        : await db.query.emailIdentities.findFirst({
            where: and(
              eq(emailIdentities.orgId, input.orgId),
              eq(emailIdentities.forwardingAddress, addressObject.address)
            ),
            columns: {
              id: true,
              publicId: true,
              username: true,
              domainName: true
            }
          });

    if (emailIdentityFwdQuery && emailIdentityFwdQuery.id !== null) {
      parsedAddressIds.push({
        id: emailIdentityFwdQuery.id,
        type: 'emailIdentity',
        publicId: emailIdentityFwdQuery.publicId,
        email:
          emailIdentityFwdQuery.username +
          '@' +
          emailIdentityFwdQuery.domainName,
        contactType: null,
        ref: input.addressType
      });
      continue;
    }

    // if the address is not a known contact or email identity, then maybe its a global contact with a reputation, so we need to create the contact for the org, or create the whole contact+reputation

    const contactGlobalReputation =
      await db.query.contactGlobalReputations.findFirst({
        where: eq(contactGlobalReputations.emailAddress, addressObject.address),
        columns: {
          id: true
        }
      });

    let contactGlobalReputationId: number | null = null;
    if (contactGlobalReputation) {
      contactGlobalReputationId = contactGlobalReputation.id;
    }
    if (!contactGlobalReputation) {
      const contactGlobalReputationInsert = await db
        .insert(contactGlobalReputations)
        .values({
          emailAddress: addressObject.address,
          messageCount: 1,
          lastUpdated: new Date()
        });
      contactGlobalReputationId = Number(
        contactGlobalReputationInsert.insertId
      );
    }
    const contactInsert = await db.insert(contacts).values({
      publicId: typeIdGenerator('contacts'),
      orgId: input.orgId,
      reputationId: +contactGlobalReputationId!,
      type: 'unknown',
      emailUsername: emailUsername,
      emailDomain: emailDomain,
      name: addressObject.name || emailUsername + '@' + emailDomain,
      screenerStatus: 'pending'
    });

    parsedAddressIds.push({
      id: Number(contactInsert.insertId),
      type: 'contact',
      publicId: contactInsert.insertId,
      email: emailUsername + '@' + emailDomain,
      contactType: 'unknown',
      ref: input.addressType
    });
    continue;
  }
  return parsedAddressIds;
}
