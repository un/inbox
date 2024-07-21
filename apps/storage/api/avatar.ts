import {
  orgMemberProfiles,
  orgMembers,
  orgs,
  teams
} from '@u22n/database/schema';
import { typeIdValidator, type TypeId } from '@u22n/utils/typeid';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { zValidator } from '@u22n/hono/helpers';
import { checkSignedIn } from '../middlewares';
import { createHonoApp } from '@u22n/hono';
import { eq } from '@u22n/database/orm';
import { db } from '@u22n/database';
import type { Ctx } from '../ctx';
import { s3Client } from '../s3';
import { env } from '../env';
import sharp from 'sharp';
import { z } from 'zod';

export const avatarApi = createHonoApp<Ctx>().post(
  '/avatar',
  checkSignedIn,
  zValidator(
    'form',
    z
      .object({
        type: z.enum(['orgMember', 'org', 'contact', 'team']).transform((t) => {
          const types = [
            { name: 'orgMember', value: 'omp' }, // the naming is wrong here, it should be 'orgMemberProfile', but keeping it as is for now
            { name: 'org', value: 'o' },
            { name: 'contact', value: 'k' },
            { name: 'team', value: 't' }
          ] as const;
          return types.find((ty) => ty.name === t)!;
        }),
        publicId: z.union([
          typeIdValidator('orgMemberProfile'),
          typeIdValidator('org'),
          typeIdValidator('contacts'),
          typeIdValidator('teams')
        ]),
        file: z
          .instanceof(File, { message: 'File is required' })
          .refine((f) => f.size > 0, {
            message: 'File size must be greater than 0'
          })
          .refine(
            (f) => ['image/jpeg', 'image/png', 'image/gif'].includes(f.type),
            {
              message: `File must be a jpeg, png or gif`
            }
          )
      })
      .refine(
        (v) => v.publicId.startsWith(v.type.value),
        ({ publicId, type }) => ({
          message: `Invalid publicId ${publicId} for type ${type.name}, should start with ${type.value}`
        })
      )
  ),
  async (c) => {
    const accountId = c.get('account')!.id; // we know it's not null here, checked in the middleware
    const type = c.req.valid('form').type;
    const publicId = c.req.valid('form').publicId;
    const file = c.req.valid('form').file;
    const avatarTimestamp = new Date();

    switch (type.name) {
      case 'orgMember': {
        const profileResponse = await db.query.orgMemberProfiles.findFirst({
          where: eq(
            orgMemberProfiles.publicId,
            publicId as TypeId<'orgMemberProfile'> // need to narrow down the type here
          ),
          columns: {
            id: true,
            accountId: true,
            avatarTimestamp: true
          }
        });
        if (!profileResponse?.accountId)
          return c.json({ error: 'Invalid profile' }, { status: 400 });

        if (profileResponse.accountId !== accountId)
          return c.json({ error: 'Unauthorized' }, { status: 401 });
        break;
      }
      case 'org': {
        const orgResponse = await db.query.orgs.findFirst({
          where: eq(orgs.publicId, publicId as TypeId<'org'>),
          columns: {
            id: true,
            shortcode: true,
            avatarTimestamp: true
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
          return c.json({ error: 'Invalid org' }, { status: 400 });
        }
        const isAdmin = orgResponse.members.some(
          (member) => member.accountId === accountId
        );
        if (!isAdmin) {
          return c.json({ error: 'Unauthorized' }, { status: 401 });
        }
        break;
      }
      case 'contact': {
        return c.json({ error: 'Not implemented' }, { status: 400 });
      }
      case 'team': {
        const teamResponse = await db.query.teams.findFirst({
          where: eq(teams.publicId, publicId as TypeId<'teams'>),
          columns: {
            id: true,
            avatarTimestamp: true
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
        if (!teamResponse) {
          return c.json({ error: 'Invalid team' }, { status: 400 });
        }
        const isAdmin = teamResponse.org.members.some(
          (member) => member.accountId === accountId
        );
        if (!isAdmin) {
          return c.json({ error: 'Unauthorized' }, { status: 401 });
        }
        break;
      }
    }

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

    const success = await Promise.all(
      sizes.map(async (size) => {
        const resizedImage = await sharp(await file.arrayBuffer())
          .resize(size.value, size.value)
          .toBuffer();
        const command = new PutObjectCommand({
          Bucket: env.STORAGE_S3_BUCKET_AVATARS,
          Key: `${publicId}/${size.name}`,
          Body: resizedImage,
          ContentType: file.type
        });
        await s3Client.send(command);
      })
    )
      .then(() => true)
      .catch((err) => {
        console.error(
          'Something went wrong while resizing avatars',
          { type, publicId },
          err
        );
        return false;
      });

    if (!success) {
      return c.json(
        {
          error: 'Something went wrong while processing your avatar'
        },
        { status: 500 }
      );
    }

    switch (type.name) {
      case 'orgMember': {
        await db
          .update(orgMemberProfiles)
          .set({
            avatarTimestamp
          })
          .where(
            eq(
              orgMemberProfiles.publicId,
              publicId as TypeId<'orgMemberProfile'>
            )
          );
        break;
      }
      case 'org': {
        await db
          .update(orgs)
          .set({
            avatarTimestamp
          })
          .where(eq(orgs.publicId, publicId as TypeId<'org'>));
        break;
      }
      case 'team': {
        await db
          .update(teams)
          .set({
            avatarTimestamp
          })
          .where(eq(teams.publicId, publicId as TypeId<'teams'>));
        break;
      }
    }

    return c.json({ avatarTimestamp });
  }
);
