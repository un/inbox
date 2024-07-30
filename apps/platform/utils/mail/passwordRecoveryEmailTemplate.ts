export type PasswordRecoveryEmailProps = {
  to: string;
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
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
  </head>
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">Password Recovery for Your Uninbox Account<div> ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏</div>
  </div>
  <body style="margin-left:auto;margin-right:auto;margin-top:auto;margin-bottom:auto;background-color:rgb(255,255,255);padding-left:0.5rem;padding-right:0.5rem;font-family:ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, Arial, &quot;Noto Sans&quot;, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;, &quot;Noto Color Emoji&quot;">
    <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="max-width:465px;margin-left:auto;margin-right:auto;margin-top:40px;margin-bottom:40px;border-radius:0.25rem;border-width:1px;border-style:solid;border-color:rgb(234,234,234);padding:20px">
      <tbody>
        <tr style="width:100%">
          <td>
            <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin-top:32px">
              <tbody>
                <tr>
                  <td><img alt="Uninbox" height="100" src="https://avatars.githubusercontent.com/u/135225712?s=400&amp;u=72ad315d63b0326e5bb34377c3f59389373edc9a&amp;v=4" style="display:block;outline:none;border:none;text-decoration:none;margin-left:auto;margin-right:auto;margin-top:0px;margin-bottom:0px;border-radius:0.375rem" width="100" /></td>
                </tr>
              </tbody>
            </table>
            <h1 style="color:#333;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;font-size:24px;font-weight:bold;margin-top:30px;margin-bottom:15px;text-align:center;">Password Recovery</h1>
            <p style="font-size:14px;line-height:24px;margin:16px 0;color:rgb(0,0,0)">Hello <strong>${username}</strong>,</p>
            <p style="font-size:14px;line-height:24px;margin:16px 0;color:rgb(0,0,0)">We received a request to reset the password for your Uninbox account. If you didn't make this request, please ignore this email.</p>
            <p style="font-size:14px;line-height:24px;margin:16px 0;color:rgb(0,0,0)">Your recovery code is:</p>
            <div style="background-color:#f0f0f0;border-radius:4px;padding:10px;margin-bottom:20px;">
              <code style="word-break:break-all;display:block;font-family:monospace;font-size:24px;color:#333;text-align:center;">${recoveryCode}</code>
            </div>
            <p style="font-size:14px;line-height:24px;margin:16px 0;color:rgb(0,0,0)">This recovery code will expire on <strong>${expiryDate}</strong>. Make sure to use it before the expiry date.</p>
            <p style="font-size:14px;line-height:24px;margin:16px 0;color:rgb(0,0,0)">If you didn't request a password reset, please contact our support team immediately.</p>
            <hr style="width:100%;border:none;border-top:1px solid #eaeaea;margin-left:0px;margin-right:0px;margin-top:26px;margin-bottom:26px;border-width:1px;border-style:solid;border-color:rgb(234,234,234)" />
            <p style="font-size:12px;line-height:24px;margin:16px 0;color:rgb(102,102,102)">Best regards,<br />The Uninbox Team</p>
          </td>
        </tr>
      </tbody>
    </table>
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
