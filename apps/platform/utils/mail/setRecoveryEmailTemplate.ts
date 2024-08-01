export interface RecoveryEmailProps {
  to: string;
  username: string;
  recoveryEmail: string;
  expiryDate: string;
  verificationCode: string;
}

export const recoveryEmailTemplatePlainText = ({
  to,
  username,
  recoveryEmail,
  expiryDate,
  verificationCode
}: RecoveryEmailProps) =>
  `Hello ${username},
  
  You have requested to link ${recoveryEmail} as your recovery email for your Uninbox account.
  
  
  If the button is not working, copy paste this code in your browser:
 \`${verificationCode}\`
  
  This confirmation link will expire on ${expiryDate}. Make sure to confirm before the expiry date.
  
  --------------------------------------------------------------------------------
  
  This email was intended for ${to}. If you did not request to link a recovery email,
  you can ignore this email. If you are concerned about your account's safety,
  please contact us immediately.`;

export const recoveryEmailTemplate = ({
  to,
  username,
  recoveryEmail,
  expiryDate,
  verificationCode
}: RecoveryEmailProps) =>
  `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html dir="ltr" lang="en">
    <head>
      <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    </head>
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">Confirm your recovery email for Uninbox<div> ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏ ‌​‍‎‏</div>
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
              <p style="font-size:14px;line-height:12px;margin:16px 0;margin-top:2.5rem;color:rgb(0,0,0)">Hello <strong>${username}</strong>,</p>
              <p style="font-size:14px;line-height:12px;margin:16px 0;color:rgb(0,0,0)">You have requested to link <strong>${recoveryEmail}</strong> as your recovery email for your Uninbox account.</p>
              <p style="font-size:14px;line-height:24px;margin:16px 0;color:rgb(0,0,0)">Your verification code is:</p>
              <div style="background-color:#f0f0f0;border-radius:4px;padding:10px;margin-bottom:20px;">
                <code style="word-break:break-all;display:block;font-family:monospace;font-size:24px;color:#333;text-align:center;">${verificationCode}</code>
              </div>
              <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation">
                <tbody>
                  <tr>
                    <td>
                      <p style="font-size:14px;line-height:20px;margin:16px 0;color:rgb(0,0,0)">This verification code will expire on <strong>${expiryDate}</strong>. Make sure to confirm before the expiry date.</p>
                    </td>
                  </tr>
                </tbody>
              </table>
              <hr style="width:100%;border:none;border-top:1px solid #eaeaea;margin-left:0px;margin-right:0px;margin-top:26px;margin-bottom:26px;border-width:1px;border-style:solid;border-color:rgb(234,234,234)" />
              <p style="font-size:12px;line-height:24px;margin:16px 0;color:rgb(102,102,102)">This email was intended for<!-- --> <span style="color:rgb(0,0,0)">${to}</span>. If you did not request to link a recovery email, you can ignore this email. If you are concerned about your account&#x27;s safety, please contact us immediately.</p>
            </td>
          </tr>
        </tbody>
      </table>
    </body>
  </html>
`;
