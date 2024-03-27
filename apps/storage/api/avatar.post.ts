import {
  orgs,
  orgMemberProfiles,
  orgMembers,
  groups,
  contacts
} from '@u22n/database/schema';
import { nanoIdLong, validateTypeId } from '@u22n/utils';
import { eq } from '@u22n/database/orm';
import { db } from '@u22n/database';
import sharp from 'sharp';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import type { S3Config } from '~/types';
import {
  eventHandler,
  loggedIn,
  readMultipartFormData,
  setResponseStatus,
  send,
  useRuntimeConfig,
  s3Client
} from '#imports';

//?  Avatar Path: /[type.value]/[orgMemberProfilePublicId]/[size]

export default eventHandler({
  onRequest: [loggedIn],
  async handler(event) {
    const types = [
      { name: 'orgMember', value: 'om' },
      { name: 'org', value: 'o' },
      { name: 'contact', value: 'c' },
      { name: 'group', value: 'g' }
    ];

    const formInputs = await readMultipartFormData(event);

    const avatarId = nanoIdLong();

    if (!formInputs) {
      setResponseStatus(event, 400);
      return send(event, 'Missing Form data');
    }

    const typeInput =
      formInputs
        .find((input) => input.name === 'type')
        ?.data.toString('utf8') || '';

    const typeObject = types.find((t) => t.name === typeInput);
    if (!typeObject) {
      setResponseStatus(event, 400);
      return send(event, 'Missing or invalid type value');
    }

    const publicIdInput = formInputs.find((input) => input.name === 'publicId');
    if (!publicIdInput) {
      setResponseStatus(event, 400);
      return send(event, 'Missing publicId value');
    }
    const publicId = publicIdInput.data.toString('utf8');
    const accountId = +event.context.account.id || null;

    if (typeObject.name === 'orgMember') {
      if (!validateTypeId('orgMemberProfile', publicId)) {
        return send(event, 'Invalid org member publicId');
      }
      const profileResponse = await db.query.orgMemberProfiles.findFirst({
        where: eq(orgMemberProfiles.publicId, publicId),
        columns: {
          id: true,
          accountId: true,
          avatarId: true
        }
      });
      if (!profileResponse || !profileResponse.accountId) {
        setResponseStatus(event, 400);
        return send(event, 'Invalid profile ');
      }
      if (+profileResponse.accountId !== accountId) {
        setResponseStatus(event, 401);
        return send(event, 'Unauthorized');
      }
    } else if (typeObject.name === 'org') {
      if (!validateTypeId('org', publicId)) {
        return send(event, 'Invalid org publicId');
      }
      const orgResponse = await db.query.orgs.findFirst({
        where: eq(orgs.publicId, publicId),
        columns: {
          id: true,
          slug: true,
          avatarId: true
        },
        with: {
          members: {
            columns: {
              accountId: true,
              role: true
            },
            where: eq(orgMembers.role, 'admin')
          }
        }
      });
      if (!orgResponse) {
        setResponseStatus(event, 400);
        return send(event, 'Invalid org');
      }
      const isAdmin = orgResponse.members.some(
        (member) => member.accountId === accountId
      );
      if (!isAdmin) {
        setResponseStatus(event, 401);
        return send(event, 'Unauthorized');
      }
    } else if (typeObject.name === 'contact') {
      setResponseStatus(event, 400);
      return send(event, 'Not implemented');
    } else if (typeObject.name === 'group') {
      if (!validateTypeId('groups', publicId)) {
        return send(event, 'Invalid groups publicId');
      }
      const groupResponse = await db.query.groups.findFirst({
        where: eq(groups.publicId, publicId),
        columns: {
          id: true,
          avatarId: true
        },
        with: {
          org: {
            with: {
              members: {
                columns: {
                  accountId: true,
                  role: true
                },
                where: eq(orgMembers.role, 'admin')
              }
            }
          }
        }
      });
      if (!groupResponse) {
        setResponseStatus(event, 400);
        return send(event, 'Invalid group');
      }
      const isAdmin = groupResponse.org.members.some(
        (member) => member.accountId === accountId
      );
      if (!isAdmin) {
        setResponseStatus(event, 401);
        return send(event, 'Unauthorized');
      }
    } else {
      setResponseStatus(event, 400);
      return send(event, 'Invalid type value');
    }

    const file = formInputs.find((input) => input.name === 'file');
    if (!file || !file.type) {
      setResponseStatus(event, 400);
      return send(event, 'Missing file attachment');
    }
    const acceptedFileTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!acceptedFileTypes.includes(file.type)) {
      setResponseStatus(event, 400);
      return send(event, 'Invalid file type');
    }
    // do image conversion
    const sizes = [
      { name: '3xs', value: 16 },
      { name: '2xs', value: 20 },
      { name: 'xs', value: 24 },
      { name: 'sm', value: 32 },
      { name: 'md', value: 40 },
      { name: 'lg', value: 48 },
      { name: 'xl', value: 56 },
      { name: '2xl', value: 64 },
      { name: '3xl', value: 80 },
      { name: '4xl', value: 96 },
      { name: '5xl', value: 128 }
    ];

    const s3Config: S3Config = useRuntimeConfig().s3;
    for (const size of sizes) {
      const resizedImage = await sharp(file.data)
        .resize(size.value, size.value)
        .toBuffer();
      const command = new PutObjectCommand({
        Bucket: s3Config.bucketAvatars,
        Key: `${typeObject.value}_${avatarId}/${size.name}`,
        Body: resizedImage,
        ContentType: file.type
      });
      await s3Client.send(command);
    }

    if (typeObject.name === 'orgMember') {
      if (!validateTypeId('orgMemberProfile', publicId)) {
        return send(event, 'Invalid publicId');
      }
      await db
        .update(orgMemberProfiles)
        .set({
          avatarId: avatarId
        })
        .where(eq(orgMemberProfiles.publicId, publicId));
    } else if (typeObject.name === 'org') {
      if (!validateTypeId('org', publicId)) {
        return send(event, 'Invalid publicId');
      }
      await db
        .update(orgs)
        .set({
          avatarId: avatarId
        })
        .where(eq(orgs.publicId, publicId));
    } else if (typeObject.name === 'group') {
      if (!validateTypeId('groups', publicId)) {
        return send(event, 'Invalid publicId');
      }
      await db
        .update(groups)
        .set({
          avatarId: avatarId
        })
        .where(eq(groups.publicId, publicId));
    } else if (typeObject.name === 'contact') {
      if (!validateTypeId('contacts', publicId)) {
        return send(event, 'Invalid publicId');
      }
      await db
        .update(contacts)
        .set({
          avatarId: avatarId
        })
        .where(eq(contacts.publicId, publicId));
    }

    return { avatarId: avatarId };
  }
});
