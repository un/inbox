import { DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { checkAuthorizedService } from '../middlewares';
import { zValidator } from '@u22n/hono/helpers';
import { createHonoApp } from '@u22n/hono';
import type { Ctx } from '../ctx';
import { s3Client } from '../s3';
import { env } from '../env';
import { z } from 'zod';

export const deleteOrgsApi = createHonoApp<Ctx>().post(
  '/orgs/delete',
  checkAuthorizedService,
  zValidator(
    'json',
    z.object({
      orgPublicIds: z.string().array()
    })
  ),
  async (c) => {
    const { orgPublicIds } = c.req.valid('json');

    await Promise.allSettled(
      orgPublicIds.map(async (orgPublicId) => {
        await deleteFolder(orgPublicId);
      })
    );

    return c.json({ message: 'ok' });
  }
);

async function deleteFolder(orgPublicId: string) {
  let count = 0; // number of files deleted
  async function recursiveDelete(token?: string) {
    // get the files
    const listCommand = new ListObjectsV2Command({
      Bucket: env.STORAGE_S3_BUCKET_ATTACHMENTS,
      Prefix: orgPublicId,
      ContinuationToken: token
    });
    const list = await s3Client.send(listCommand);
    if (list.KeyCount && list.Contents) {
      // if items to delete
      // delete the files
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: env.STORAGE_S3_BUCKET_ATTACHMENTS,
        Delete: {
          Objects: list.Contents.map((item) => ({ Key: item.Key })),
          Quiet: false
        }
      });
      const deleted = await s3Client.send(deleteCommand);
      if (deleted.Deleted) {
        count += deleted.Deleted.length;
      }
      // log any errors deleting files
      if (deleted.Errors) {
        deleted.Errors.map((error) =>
          console.error(`${error.Key} could not be deleted - ${error.Code}`)
        );
      }
    }
    // repeat if more files to delete
    if (list.NextContinuationToken) {
      await recursiveDelete(list.NextContinuationToken);
    }
    // return total deleted count when finished
    return `${count} files deleted.`;
  }
  // start the recursive function
  return recursiveDelete();
}
