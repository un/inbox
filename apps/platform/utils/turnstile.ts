type TurnstileResponse = {
  success: boolean;
  errorCodes?: string[];
};

type TurnstileVerifyInput = {
  response: string;
  remoteIp?: string;
  secretKey: string;
};

export default async function verifyTurnstileToken(
  options: TurnstileVerifyInput
) {
  const { response, remoteIp, secretKey } = options;

  const data = new FormData();
  data.append('secret', secretKey);
  data.append('response', response);
  remoteIp && data.append('remoteip', remoteIp);

  const result = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      body: data
    }
  );

  const res = (await result.json()) as TurnstileResponse;
  return res.success;
}
