import { env } from './env';

async function validateLicenseKey(key: string, appUrl: string) {
  const response = (await fetch('https://ee.u22n.com/api/license/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, appUrl })
  }).then((response) => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })) as { valid: boolean };

  if (!response.valid) {
    throw new Error(
      '🚨 You are attempting to run software that requires a paid license but have not provided a valid license key. Please check https://github.com/un/inbox/tree/main/ee for more information about the license'
    );
  }
  return true;
}

export const validateLicense = async () => {
  if (env.EE_LICENSE_KEY && env.WEBAPP_URL) {
    await validateLicenseKey(env.EE_LICENSE_KEY, env.WEBAPP_URL).catch(
      (error) => {
        console.error(error);
        throw new Error(
          '🚨 Something went wrong when trying to validate the license key. Please check https://github.com/un/inbox/tree/main/ee for more information about the license'
        );
      }
    );
  } else {
    throw new Error(
      '🚨 You are attempting to run software that requires a paid license but have not provided a valid license key or app url. Please check https://github.com/un/inbox/tree/main/ee for more information about the license'
    );
  }
};
