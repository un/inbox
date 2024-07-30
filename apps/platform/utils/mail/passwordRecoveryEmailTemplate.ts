export type PasswordRecoveryEmailProps = {
  username: string;
  recoveryCode: string;
  expiryDate: string;
};

export function passwordRecoveryEmailTemplate({
  username,
  recoveryCode,
  expiryDate
}: PasswordRecoveryEmailProps): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Recovery for Your Uninbox Account</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4a4a4a;">Password Recovery</h1>
        <p>Hello ${username},</p>
        <p>We received a request to reset the password for your Uninbox account. If you didn't make this request, please ignore this email.</p>
        <p>To reset your password, please use the following recovery code:</p>
        <p style="font-size: 24px; font-weight: bold; text-align: center; padding: 10px; background-color: #f0f0f0; border-radius: 5px;">${recoveryCode}</p>
        <p>This code will expire on ${expiryDate}.</p>
        <p>If you didn't request a password reset, please contact our support team immediately.</p>
        <p>Best regards,<br>The Uninbox Team</p>
      </div>
    </body>
    </html>
  `;
}

export function passwordRecoveryEmailTemplatePlainText({
  username,
  recoveryCode,
  expiryDate
}: PasswordRecoveryEmailProps): string {
  return `
Hello ${username},

We received a request to reset the password for your Uninbox account. If you didn't make this request, please ignore this email.

To reset your password, please use the following recovery code:

\`${recoveryCode}\`

This code will expire on ${expiryDate}.

If you didn't request a password reset, please contact our support team immediately.

Best regards,
The Uninbox Team
  `.trim();
}
