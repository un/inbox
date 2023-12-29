import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../../utils/s3';

export default defineEventHandler(async (event) => {
  // Parameters: /[orgSlug]/[attachmentId]
  // attachment url: https://s3/attachments/[orgPublicId]/[attachmentId]/[filename].ext

  // get attachment from db
  //? if attachment is public, generate pre-signed url and redirect to it
  //! if attachment does not exist, redirect to 404 page

  // get user id from event context
  // from cache storage: get orgSlug cache
  // check if user is a member of the org
  //! if not member, redirect to 401 page

  const orgPublicId = 'un';
  const attachmentId = '123';
  const filename = 'Parking Notice.pdf';

  //* generate pre-signed url and redirect to it
  const command = new GetObjectCommand({
    Bucket: 'attachments',
    Key: `${orgPublicId}/${attachmentId}/${filename}`
  });
  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return sendProxy(event, url);
});
