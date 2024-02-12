import {
  orgs,
  userProfiles,
  orgMembers,
  userGroupMembers,
  userGroups,
  contacts
} from '@uninbox/database/schema';
import { nanoIdLong } from '@uninbox/utils';
import { eq } from '@uninbox/database/orm';
import { db } from '@uninbox/database';
import sharp from 'sharp';
import { PutObjectCommand } from '@aws-sdk/client-s3';

//?  Avatar Path: /[type.value]/[userProfilePublicId]/[size]

export default eventHandler({
  onRequest: [loggedIn],
  async handler(event) {
    const types = [
      { name: 'user', value: 'u' },
      { name: 'org', value: 'o' },
      { name: 'contact', value: 'c' },
      { name: 'group', value: 'g' }
    ];
    const formInputs = await readMultipartFormData(event);

    const avatarId = nanoIdLong();

    const typeInput = formInputs
      .find((input) => input.name === 'type')
      .data.toString('utf8');

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
    const userId = +event.context.user.id || null;

    if (typeObject.name === 'user') {
      const profileResponse = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.publicId, publicId),
        columns: {
          id: true,
          userId: true,
          avatarId: true
        }
      });
      if (!profileResponse) {
        setResponseStatus(event, 400);
        return send(event, 'Invalid user profile ');
      }
      if (profileResponse.userId !== userId) {
        setResponseStatus(event, 401);
        return send(event, 'Unauthorized');
      }
    } else if (typeObject.name === 'org') {
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
              userId: true,
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
        (member) => member.userId === userId
      );
      if (!isAdmin) {
        setResponseStatus(event, 401);
        return send(event, 'Unauthorized');
      }
    } else if (typeObject.name === 'contact') {
      setResponseStatus(event, 400);
      return send(event, 'Not implemented');
    } else if (typeObject.name === 'group') {
      const groupResponse = await db.query.userGroups.findFirst({
        where: eq(orgs.publicId, publicId),
        columns: {
          id: true,
          avatarId: true
        },
        with: {
          org: {
            with: {
              members: {
                columns: {
                  userId: true,
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
        (member) => member.userId === userId
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
    if (!file) {
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

    for (const size of sizes) {
      const resizedImage = await sharp(file.data)
        .resize(size.value, size.value)
        .toBuffer();
      const command = new PutObjectCommand({
        Bucket: 'avatars',
        Key: `${typeObject.value}_${avatarId}/${size.name}`,
        Body: resizedImage,
        ContentType: file.type
      });
      await s3Client.send(command);
    }

    if (typeObject.name === 'user') {
      await db
        .update(userProfiles)
        .set({
          avatarId: avatarId
        })
        .where(eq(userProfiles.publicId, publicId));
    } else if (typeObject.name === 'org') {
      await db
        .update(orgs)
        .set({
          avatarId: avatarId
        })
        .where(eq(orgs.publicId, publicId));
    } else if (typeObject.name === 'group') {
      await db
        .update(userGroups)
        .set({
          avatarId: avatarId
        })
        .where(eq(userGroups.publicId, publicId));
    } else if (typeObject.name === 'contact') {
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
