import sharp from 'sharp';
import { PutObjectCommand } from '@aws-sdk/client-s3';
export default defineEventHandler(async (event) => {
  const types = [
    { name: 'user', value: 'u' },
    { name: 'org', value: 'o' },
    { name: 'contact', value: 'c' },
    { name: 'group', value: 'g' }
  ];
  //? Paths
  //* Users: /u/[userProfilePublicId]/[size]_[avatarId].[ext]
  //* Orgs: /o/[orgPublicId]/[size]_[avatarId].[ext]
  //* Contacts: /c/[contactPublicId]/[size]_[avatarId].[ext]
  //* Groups: /g/[groupPublicId]/[size]_[avatarId].[ext]
  const formInputs = await readMultipartFormData(event);

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

  if (typeObject.name === 'user') {
    //! check if user is owner of profile
    // get user id from event context
    // get profile ownerId from DB
    // if user id !== ownerId, throw error
  } else if (typeObject.name === 'org') {
    //! check if user is admin of org
    // get user id from event context
    // get orgId from DB publicId > members
    // if user id !== admin in members array, throw error
  } else if (typeObject.name === 'contact') {
    // Validate server key against request headers
  } else if (typeObject.name === 'group') {
    // check if user is admin of group
    // get user id from event context
    // get groupId > orgId > members
    // if user id !== admin in members array, throw error
  } else {
    // throw error
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
      Key: `${typeObject.value}/${publicId}/${size.name}`,
      Body: resizedImage,
      ContentType: file.type
    });
    await s3Client.send(command);
  }

  return send(event, 'ok');
});
