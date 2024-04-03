import { defineNuxtPrepareHandler } from 'nuxt-prepare/config';

async function validateLicenseKey(key: string, appUrl: string) {
  const response = await fetch('https://ee.u22n.com/api/license/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, appUrl })
  }).then((response: any) => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  });

  if (!response.valid) {
    throw new Error(
      '🚨 You are attempting to run software that requires a paid license but have not provided a valid license key. Please check https://github.com/un/inbox/tree/main/ee for more information about the license'
    );
  }
  return true;
}
export default defineNuxtPrepareHandler(async () => {
  // set the primary mail domains
  const eeLicenseKey = process.env.EE_LICENSE_KEY;
  const appUrl = process.env.WEBAPP_URL;

  if (eeLicenseKey && appUrl) {
    validateLicenseKey(eeLicenseKey, appUrl).catch((error) => {
      console.error(error);
      throw new Error(
        '🚨 Something went wrong when trying to validate the license key. Please check https://github.com/un/inbox/tree/main/ee for more information about the license'
      );
    });
  } else {
    throw new Error(
      '🚨 You are attempting to run software that requires a paid license but have not provided a valid license key or app url. Please check https://github.com/un/inbox/tree/main/ee for more information about the license'
    );
  }
  return {};
});
