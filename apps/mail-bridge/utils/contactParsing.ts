import {
  contactGlobalReputations,
  contacts,
  emailIdentities
} from '@u22n/database/schema';
import { typeIdGenerator } from '@u22n/utils/typeid';
import type { EmailAddress } from 'mailparser';
import { and, eq } from '@u22n/database/orm';
import { db } from '@u22n/database';

type MessageParseAddressPlatformObject = {
  id: number;
  type: 'contact' | 'emailIdentity';
  publicId: string;
  email: string;
  contactType:
    | 'person'
    | 'product'
    | 'newsletter'
    | 'marketing'
    | 'unknown'
    | null;
  ref: 'to' | 'cc' | 'from';
};

export async function parseAddressIds(input: {
  addresses: EmailAddress[];
  addressType: 'to' | 'cc' | 'from';
  orgId: number;
}) {
  return (
    await Promise.all(
      input.addresses.map(async (addressObject) => {
        if (!addressObject.address) return;

        const [emailUsername, emailDomain] = addressObject.address.split('@');
        if (!emailDomain || !emailUsername) return;

        const emailIdentity = await tryParsingAsEmailIdentity({
          addressType: input.addressType,
          domain: emailDomain,
          username: emailUsername,
          orgId: input.orgId
        });

        if (emailIdentity) return emailIdentity;

        if (input.addressType !== 'from') {
          const catchAllEmailIdentity = await tryParsingAsCatchAllEmailIdentity(
            {
              addressType: input.addressType,
              domain: emailDomain,
              orgId: input.orgId
            }
          );

          if (catchAllEmailIdentity) return catchAllEmailIdentity;

          const forwardingAddress = await tryParsingAsForwardingAddress({
            addressType: input.addressType,
            domain: emailDomain,
            username: emailUsername,
            orgId: input.orgId
          });

          if (forwardingAddress) return forwardingAddress;
        }

        const contact = await tryParsingAsContact({
          addressType: input.addressType,
          domain: emailDomain,
          username: emailUsername,
          orgId: input.orgId,
          saidName: addressObject.name
        });

        if (contact) return contact;

        const newContact = await tryParsingAsNewContact({
          addressType: input.addressType,
          domain: emailDomain,
          username: emailUsername,
          orgId: input.orgId,
          saidName: addressObject.name
        });

        return newContact;
      })
    )
  ).filter(
    (address): address is MessageParseAddressPlatformObject => !!address
  );
}

type TryParsingOptions = {
  orgId: number;
  username: string;
  domain: string;
  addressType: 'to' | 'from' | 'cc';
};

async function tryParsingAsContact({
  addressType,
  domain,
  orgId,
  username,
  saidName
}: TryParsingOptions & {
  saidName: string;
}): Promise<MessageParseAddressPlatformObject | null> {
  const contactQuery = await db.query.contacts.findFirst({
    where: and(
      eq(contacts.orgId, orgId),
      eq(contacts.emailDomain, domain),
      eq(contacts.emailUsername, username)
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
    if (contactQuery.name === null && saidName) {
      await db
        .update(contacts)
        .set({
          name: saidName
        })
        .where(eq(contacts.id, contactQuery.id));
    }
    return {
      id: contactQuery.id,
      type: 'contact',
      publicId: contactQuery.publicId,
      email: `${contactQuery.emailUsername}@${contactQuery.emailDomain}`,
      contactType: contactQuery.type,
      ref: addressType
    };
  } else {
    return null;
  }
}

async function tryParsingAsEmailIdentity({
  addressType,
  username,
  domain,
  orgId
}: TryParsingOptions): Promise<MessageParseAddressPlatformObject | null> {
  const emailIdentityQuery = await db.query.emailIdentities.findFirst({
    where: and(
      eq(emailIdentities.orgId, orgId),
      eq(emailIdentities.domainName, domain),
      eq(emailIdentities.username, username)
    ),
    columns: {
      id: true,
      publicId: true,
      username: true,
      domainName: true
    }
  });

  if (emailIdentityQuery && emailIdentityQuery.id !== null) {
    return {
      id: emailIdentityQuery.id,
      type: 'emailIdentity',
      publicId: emailIdentityQuery.publicId,
      email: `${emailIdentityQuery.username}@${emailIdentityQuery.domainName}`,
      contactType: null,
      ref: addressType
    };
  } else {
    return null;
  }
}

async function tryParsingAsCatchAllEmailIdentity({
  addressType,
  domain,
  orgId
}: Omit<
  TryParsingOptions,
  'username'
>): Promise<MessageParseAddressPlatformObject | null> {
  const emailIdentityCatchAllQuery = await db.query.emailIdentities.findFirst({
    where: and(
      eq(emailIdentities.orgId, orgId),
      eq(emailIdentities.domainName, domain),
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
    return {
      id: emailIdentityCatchAllQuery.id,
      type: 'emailIdentity',
      publicId: emailIdentityCatchAllQuery.publicId,
      email: `${emailIdentityCatchAllQuery.username}@${emailIdentityCatchAllQuery.domainName}`,
      contactType: null,
      ref: addressType
    };
  } else {
    return null;
  }
}

async function tryParsingAsForwardingAddress({
  addressType,
  domain,
  username,
  orgId
}: TryParsingOptions): Promise<MessageParseAddressPlatformObject | null> {
  const emailIdentityFwdQuery = await db.query.emailIdentities.findFirst({
    where: and(
      eq(emailIdentities.orgId, orgId),
      eq(emailIdentities.forwardingAddress, `${username}@${domain}`)
    ),
    columns: {
      id: true,
      publicId: true,
      username: true,
      domainName: true
    }
  });

  if (emailIdentityFwdQuery && emailIdentityFwdQuery.id !== null) {
    return {
      id: emailIdentityFwdQuery.id,
      type: 'emailIdentity',
      publicId: emailIdentityFwdQuery.publicId,
      email: `${emailIdentityFwdQuery.username}@${emailIdentityFwdQuery.domainName}`,
      contactType: null,
      ref: addressType
    };
  } else {
    return null;
  }
}

async function tryParsingAsNewContact({
  orgId,
  username,
  domain,
  addressType,
  saidName
}: TryParsingOptions & {
  saidName?: string;
}): Promise<MessageParseAddressPlatformObject> {
  const contactGlobalReputation =
    await db.query.contactGlobalReputations.findFirst({
      where: eq(contactGlobalReputations.emailAddress, `${username}@${domain}`),
      columns: {
        id: true
      }
    });

  const contactGlobalReputationId = contactGlobalReputation
    ? contactGlobalReputation.id
    : Number(
        (
          await db.insert(contactGlobalReputations).values({
            emailAddress: `${username}@${domain}`,
            messageCount: 1,
            lastUpdated: new Date()
          })
        ).insertId
      );

  const newContactPublicId = typeIdGenerator('contacts');

  const contactInsert = await db.insert(contacts).values({
    publicId: newContactPublicId,
    orgId: orgId,
    reputationId: contactGlobalReputationId,
    type: 'unknown',
    emailUsername: username,
    emailDomain: domain,
    name: saidName ?? `${username}@${domain}`,
    screenerStatus: 'pending'
  });

  return {
    id: Number(contactInsert.insertId),
    type: 'contact',
    publicId: newContactPublicId,
    email: `${username}@${domain}`,
    contactType: 'unknown',
    ref: addressType
  };
}
