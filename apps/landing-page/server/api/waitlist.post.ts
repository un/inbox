import { connect } from '@planetscale/database';
import * as mysql from 'mysql2';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const dbConnection = await connect({
    host: config.databaseHost,
    username: config.databaseUsername,
    password: config.databasePassword
  });

  const body = await readBody(event);

  await dbConnection.execute(
    `INSERT INTO waitlist (email) VALUES ('${body.email}')`,
    (error) => {
      if (error) {
        console.error(
          `user tried to register with ${body.email} but got an error`,
          error
        );
        return { success: false, error };
      }
    }
  );

  try {
    await $fetch(config.emailApiUrl, {
      method: 'POST',
      headers: {
        'X-Server-API-Key': `${config.emailApiKey}`,

        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: [`${body.email}`],
        from: 'UnInbox Waitlist <hello@uninbox.com>',
        sender: 'hello@uninbox.com',
        subject: 'Welcome to the UnInbox Waitlist! 🎉',
        plain_body: emailPlain,
        html_body: emailHtml
      })
    });
  } catch (error) {
    console.error(
      `user tried to register with ${body.email} but got an error`,
      error
    );
    return { success: false, error };
  }
  return { success: true, error: null };
});

// email content
const emailHtml = `<!doctypehtml><meta charset=utf-8><meta content="ie=edge"http-equiv=x-ua-compatible><title></title><meta content=""name=description><meta content="width=device-width,initial-scale=1"name=viewport><style>.u-row{display:flex;flex-wrap:nowrap;margin-left:0;margin-right:0}.u-row .u-col{position:relative;width:100%;padding-right:0;padding-left:0}.u-row .u-col.u-col-100{flex:0 0 100%;max-width:100%}@media (max-width:767px){.u-row:not(.no-stack){flex-wrap:wrap}.u-row:not(.no-stack) .u-col{flex:0 0 100%!important;max-width:100%!important}}body,html{padding:0;margin:0}html{box-sizing:border-box}*,:after,:before{box-sizing:inherit}html{font-size:14px;-ms-overflow-style:scrollbar;-webkit-tap-highlight-color:transparent}p{margin:0}form .error-field{-webkit-animation-name:shake;animation-name:shake;-webkit-animation-duration:1s;animation-duration:1s;-webkit-animation-fill-mode:both;animation-fill-mode:both}form .error-field input,form .error-field textarea{border-color:#a94442!important;color:#a94442!important}form .field-error{padding:5px 10px;font-size:14px;font-weight:700;position:absolute;top:-20px;right:10px}form .field-error:after{top:100%;left:50%;border:solid transparent;content:" ";height:0;width:0;position:absolute;pointer-events:none;border-color:rgba(136,183,213,0);border-top-color:#ebcccc;border-width:5px;margin-left:-5px}form .spinner{margin:0 auto;width:70px;text-align:center}form .spinner>div{width:12px;height:12px;background-color:hsla(0,0%,100%,.5);margin:0 2px;border-radius:100%;display:inline-block;-webkit-animation:sk-bouncedelay 1.4s infinite ease-in-out both;animation:sk-bouncedelay 1.4s infinite ease-in-out both}form .spinner .bounce1{-webkit-animation-delay:-.32s;animation-delay:-.32s}form .spinner .bounce2{-webkit-animation-delay:-.16s;animation-delay:-.16s}@-webkit-keyframes sk-bouncedelay{0%,80%,to{-webkit-transform:scale(0)}40%{-webkit-transform:scale(1)}}@keyframes sk-bouncedelay{0%,80%,to{-webkit-transform:scale(0);transform:scale(0)}40%{-webkit-transform:scale(1);transform:scale(1)}}@-webkit-keyframes shake{0%,to{-webkit-transform:translateZ(0);transform:translateZ(0)}10%,30%,50%,70%,90%{-webkit-transform:translate3d(-10px,0,0);transform:translate3d(-10px,0,0)}20%,40%,60%,80%{-webkit-transform:translate3d(10px,0,0);transform:translate3d(10px,0,0)}}@keyframes shake{0%,to{-webkit-transform:translateZ(0);transform:translateZ(0)}10%,30%,50%,70%,90%{-webkit-transform:translate3d(-10px,0,0);transform:translate3d(-10px,0,0)}20%,40%,60%,80%{-webkit-transform:translate3d(10px,0,0);transform:translate3d(10px,0,0)}}@media (max-width:480px){.container{max-width:100%!important}}@media (min-width:481px) and (max-width:768px){.hide-tablet{display:none!important}}.container{width:100%;padding-right:0;padding-left:0;margin-right:auto;margin-left:auto}@media (min-width:576px){.container{max-width:540px}}@media (min-width:768px){.container{max-width:720px}}@media (min-width:992px){.container{max-width:960px}}@media (min-width:1200px){.container{max-width:1140px}}a[onclick]{cursor:pointer}body{font-family:arial,helvetica,sans-serif;font-size:1rem;line-height:1.5;color:#000;background-color:#e7e7e7}#u_body a{color:#00e;text-decoration:underline}#u_body a:hover{color:#00e;text-decoration:underline}</style><div style=min-height:100vh class=u_body id=u_body><div style=padding:0 class=u_row id=u_row_1><div style="max-width:500px;margin:0 auto"class=container><div class=u-row><div style="display:flex;border-top:0 solid transparent;border-left:0 solid transparent;border-right:0 solid transparent;border-bottom:0 solid transparent"class="u-col u-col-100 u_column"id=u_column_1><div style=width:100%;padding:0><div style=overflow-wrap:break-word;padding:10px class=u_content_text id=u_content_text_1><div style=font-size:14px;line-height:140%;text-align:center;word-wrap:break-word><p style=line-height:140%><strong>You're on the waitlist! 🥳</strong><p style=line-height:140%><p style=line-height:140%>We'll send you regular updates, <em>but in the mean time:</em><br><br><em>👀 Follow us on </em>Twitter - <a href=https://twitter.com/UnInbox>https://twitter.com/UnInbox</a><p style=line-height:140%><em>💬 Join us on</em> Discord - <a href=https://discord.gg/QMV9p9sgza>https://discord.gg/QMV9p9sgza</a><p style=line-height:140%><em>⭐️ Star us on</em> GitHub - <a href=https://github.com/un/inbox>https://github.com/un/inbox</a><p style=line-height:140%><em>📞 Book a call on</em> Cal - <a href=https://cal.com/mc/un>https://cal.com/mc/un</a><p style=line-height:140%></div></div></div></div></div></div></div></div>`;

const emailPlain = `You're on the waitlist! 🥳 \n\nWe'll send you regular updates, but in the mean time; \n\n👀 Follow us on Twitter - https://twitter.com/UnInbox \n\n💬 Join us on Discord - https://discord.gg/QMV9p9sgza \n\n⭐️ Star us on GitHub - https://github.com/un/inbox \n\n📞 Book a call on Cal - https://cal.com/mc/un`;
