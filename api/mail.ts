import { ApiError } from './errors'
import type { EnvBindings } from './store'

interface SendMailResponse {
  success?: boolean
  message?: string
  error?: string
}

function getMailApiUrl(env: EnvBindings): string {
  if (!env.MAIL_API_URL) {
    throw new ApiError(500, 'MAIL_API_NOT_CONFIGURED', '未配置邮件发送服务地址')
  }

  return env.MAIL_API_URL
}

function getMailApiToken(env: EnvBindings): string {
  if (!env.MAIL_API_TOKEN) {
    throw new ApiError(500, 'MAIL_API_NOT_CONFIGURED', '未配置邮件发送服务令牌')
  }

  return env.MAIL_API_TOKEN
}

function getMailCustomAuth(env: EnvBindings): string {
  if (!env.MAIL_API_CUSTOM_AUTH) {
    throw new ApiError(500, 'MAIL_API_NOT_CONFIGURED', '未配置邮件发送服务 x-custom-auth')
  }

  return env.MAIL_API_CUSTOM_AUTH
}

function getMailFromName(env: EnvBindings): string {
  return env.MAIL_FROM_NAME || 'Cloudflare Admin'
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildMailTemplate(payload: {
  title: string
  previewText: string
  greeting: string
  description: string
  code: string
  expireMinutes: number
  notice: string
  footerText: string
}): string {
  const title = escapeHtml(payload.title)
  const previewText = escapeHtml(payload.previewText)
  const greeting = escapeHtml(payload.greeting)
  const description = escapeHtml(payload.description)
  const code = escapeHtml(payload.code)
  const notice = escapeHtml(payload.notice)
  const footerText = escapeHtml(payload.footerText)
  const expireText = `${payload.expireMinutes} 分钟内有效`

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background: #f6f6f6;
        color: #000000;
        font-family: Inter, Helvetica, Arial, "Microsoft YaHei", sans-serif;
      }
      table {
        border-collapse: collapse;
      }
      a {
        color: #f38020;
        text-decoration: none;
      }
      .wrapper {
        width: 100%;
        background: #f6f6f6;
        padding: 24px 0;
      }
      .container {
        width: 650px;
        max-width: 650px;
        margin: 0 auto;
        background: #ffffff;
      }
      .header {
        border-top: 10px solid #f38020;
        padding: 28px 40px 24px;
      }
      .header img {
        width: 240px;
        max-width: 100%;
        height: auto;
        display: block;
      }
      .content {
        padding: 0 40px 8px;
        font-size: 14px;
        line-height: 24px;
      }
      .title {
        font-size: 22px;
        line-height: 30px;
        font-weight: 700;
        margin: 0 0 20px;
      }
      .code-box {
        margin: 24px 0;
        padding: 18px 24px;
        background: #fff7f1;
        border: 1px solid #ffd6b3;
      }
      .code-label {
        font-size: 12px;
        line-height: 18px;
        color: #8f8f8f;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .code-value {
        margin-top: 8px;
        font-size: 32px;
        line-height: 40px;
        font-weight: 700;
        letter-spacing: 0.18em;
        color: #111111;
      }
      .meta {
        margin: 0 0 20px;
        color: #4f4f4f;
      }
      .notice {
        margin: 0 0 24px;
        padding-left: 16px;
        border-left: 4px solid #f38020;
      }
      .footer {
        padding: 24px 40px 32px;
        text-align: center;
        color: #8f8f8f;
        font-size: 13px;
        line-height: 22px;
        background: #f6f6f6;
      }
      @media only screen and (max-width: 650px) {
        .container {
          width: 100% !important;
        }
        .header,
        .content,
        .footer {
          padding-left: 20px !important;
          padding-right: 20px !important;
        }
        .code-value {
          font-size: 28px !important;
          line-height: 36px !important;
          letter-spacing: 0.12em !important;
        }
      }
    </style>
  </head>
  <body>
    <div style="display: none; max-height: 0; overflow: hidden;">${previewText}</div>
    <table role="presentation" class="wrapper" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">
          <table role="presentation" class="container" width="650" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td class="header">
                <a href="https://www.cloudflare.com/" target="_blank" rel="noreferrer">
                  <img
                    src="https://info.cloudflare.com/rs/713-XSC-918/images/CF_logo_horizontal_blktype_1955x285.png?version=0"
                    alt="Cloudflare Admin"
                  />
                </a>
              </td>
            </tr>
            <tr>
              <td class="content">
                <p class="title">${title}</p>
                <p>${greeting}</p>
                <p>${description}</p>
                <div class="code-box">
                  <div class="code-label">Verification Code</div>
                  <div class="code-value">${code}</div>
                </div>
                <p class="meta">验证码 ${escapeHtml(expireText)}，请尽快完成操作。</p>
                <p class="notice">${notice}</p>
                <p>感谢您使用 Cloudflare Admin。</p>
                <p>${footerText}</p>
              </td>
            </tr>
            <tr>
              <td class="footer">
                Cloudflare Admin System<br />
                此邮件由系统自动发送，请勿直接回复。<br />
                如需帮助，请联系系统管理员。
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function buildNoticeMailTemplate(payload: {
  title: string
  previewText: string
  greeting: string
  description: string
  notice: string
  footerText: string
}): string {
  const title = escapeHtml(payload.title)
  const previewText = escapeHtml(payload.previewText)
  const greeting = escapeHtml(payload.greeting)
  const description = escapeHtml(payload.description)
  const notice = escapeHtml(payload.notice)
  const footerText = escapeHtml(payload.footerText)

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background: #f6f6f6;
        color: #000000;
        font-family: Inter, Helvetica, Arial, "Microsoft YaHei", sans-serif;
      }
      table {
        border-collapse: collapse;
      }
      a {
        color: #f38020;
        text-decoration: none;
      }
      .wrapper {
        width: 100%;
        background: #f6f6f6;
        padding: 24px 0;
      }
      .container {
        width: 650px;
        max-width: 650px;
        margin: 0 auto;
        background: #ffffff;
      }
      .header {
        border-top: 10px solid #f38020;
        padding: 28px 40px 24px;
      }
      .header img {
        width: 240px;
        max-width: 100%;
        height: auto;
        display: block;
      }
      .content {
        padding: 0 40px 8px;
        font-size: 14px;
        line-height: 24px;
      }
      .title {
        font-size: 22px;
        line-height: 30px;
        font-weight: 700;
        margin: 0 0 20px;
      }
      .notice-card {
        margin: 24px 0;
        padding: 20px 24px;
        background: #fff7f1;
        border: 1px solid #ffd6b3;
      }
      .notice-label {
        font-size: 12px;
        line-height: 18px;
        color: #8f8f8f;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .notice-value {
        margin-top: 8px;
        font-size: 18px;
        line-height: 28px;
        font-weight: 600;
        color: #111111;
      }
      .notice {
        margin: 0 0 24px;
        padding-left: 16px;
        border-left: 4px solid #f38020;
      }
      .footer {
        padding: 24px 40px 32px;
        text-align: center;
        color: #8f8f8f;
        font-size: 13px;
        line-height: 22px;
        background: #f6f6f6;
      }
      @media only screen and (max-width: 650px) {
        .container {
          width: 100% !important;
        }
        .header,
        .content,
        .footer {
          padding-left: 20px !important;
          padding-right: 20px !important;
        }
      }
    </style>
  </head>
  <body>
    <div style="display: none; max-height: 0; overflow: hidden;">${previewText}</div>
    <table role="presentation" class="wrapper" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">
          <table role="presentation" class="container" width="650" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td class="header">
                <a href="https://www.cloudflare.com/" target="_blank" rel="noreferrer">
                  <img
                    src="https://info.cloudflare.com/rs/713-XSC-918/images/CF_logo_horizontal_blktype_1955x285.png?version=0"
                    alt="Cloudflare Admin"
                  />
                </a>
              </td>
            </tr>
            <tr>
              <td class="content">
                <p class="title">${title}</p>
                <p>${greeting}</p>
                <p>${description}</p>
                <div class="notice-card">
                  <div class="notice-label">Security Notice</div>
                  <div class="notice-value">${notice}</div>
                </div>
                <p>如果这不是您本人预期的操作，请尽快登录系统检查账户安全。</p>
                <p>感谢您使用 Cloudflare Admin。</p>
                <p>${footerText}</p>
              </td>
            </tr>
            <tr>
              <td class="footer">
                Cloudflare Admin System<br />
                此邮件由系统自动发送，请勿直接回复。<br />
                如需帮助，请联系系统管理员。
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

async function sendMail(
  env: EnvBindings,
  payload: {
    toName: string
    toMail: string
    subject: string
    content: string
    isHtml?: boolean
  },
): Promise<void> {
  const token = getMailApiToken(env)
  const customAuth = getMailCustomAuth(env)
  const response = await fetch(getMailApiUrl(env), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'x-custom-auth': customAuth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from_name: getMailFromName(env),
      to_name: payload.toName,
      to_mail: payload.toMail,
      subject: payload.subject,
      is_html: payload.isHtml ?? false,
      content: payload.content,
    }),
  })
  if (!response.ok) {
    throw new ApiError(502, 'MAIL_SEND_FAILED', '邮件发送失败，请稍后重试')
  }

  let body: SendMailResponse | null = null
  try {
    body = (await response.json()) as SendMailResponse
  } catch {
    body = null
  }

  if (body && ((typeof body.success === 'boolean' && !body.success) || body.error)) {
    throw new ApiError(
      502,
      'MAIL_SEND_FAILED',
      body.message || body.error || '邮件发送失败，请稍后重试',
    )
  }
}

export async function sendRegisterCodeEmail(
  env: EnvBindings,
  email: string,
  code: string,
  expireMinutes: number,
): Promise<void> {
  const subject = 'Cloudflare Admin 注册验证码'
  await sendMail(env, {
    toName: email,
    toMail: email,
    subject,
    isHtml: true,
    content: buildMailTemplate({
      title: subject,
      previewText: `您的注册验证码为 ${code}，请在 ${expireMinutes} 分钟内完成注册。`,
      greeting: `您好，${email}`,
      description: '我们收到了一个新的 Cloudflare Admin 账户注册请求，请在注册页面输入以下验证码完成验证。',
      code,
      expireMinutes,
      notice: '如果这不是您本人发起的操作，请直接忽略本邮件，无需执行任何操作。',
      footerText: 'Cloudflare Admin 团队',
    }),
  })
}

export async function sendPasswordResetCodeEmail(
  env: EnvBindings,
  email: string,
  code: string,
  expireMinutes: number,
): Promise<void> {
  const subject = 'Cloudflare Admin 重置密码验证码'
  await sendMail(env, {
    toName: email,
    toMail: email,
    subject,
    isHtml: true,
    content: buildMailTemplate({
      title: subject,
      previewText: `您的密码重置验证码为 ${code}，请在 ${expireMinutes} 分钟内完成验证。`,
      greeting: `您好，${email}`,
      description: '我们收到了一个 Cloudflare Admin 账户的找回密码请求，请在重置密码页面输入以下验证码继续操作。',
      code,
      expireMinutes,
      notice: '如果您没有发起找回密码操作，请尽快检查账户安全并忽略此邮件。',
      footerText: 'Cloudflare Admin 安全团队',
    }),
  })
}

export async function sendPasswordChangedNotificationEmail(
  env: EnvBindings,
  email: string,
): Promise<void> {
  const subject = 'Cloudflare Admin 密码修改成功通知'
  await sendMail(env, {
    toName: email,
    toMail: email,
    subject,
    isHtml: true,
    content: buildNoticeMailTemplate({
      title: subject,
      previewText: '您的 Cloudflare Admin 账户密码已修改成功。',
      greeting: `您好，${email}`,
      description: '您的 Cloudflare Admin 账户密码刚刚已修改成功，本邮件用于确认本次安全操作。',
      notice: '如果这是您本人操作，则无需处理；如果不是，请立即重置密码并检查账户登录状态。',
      footerText: 'Cloudflare Admin 安全团队',
    }),
  })
}

export async function sendPasswordResetSuccessNotificationEmail(
  env: EnvBindings,
  email: string,
): Promise<void> {
  const subject = 'Cloudflare Admin 密码重置成功通知'
  await sendMail(env, {
    toName: email,
    toMail: email,
    subject,
    isHtml: true,
    content: buildNoticeMailTemplate({
      title: subject,
      previewText: '您的 Cloudflare Admin 账户密码已通过找回密码流程重置成功。',
      greeting: `您好，${email}`,
      description: '您的 Cloudflare Admin 账户密码已通过邮箱验证码完成重置，本邮件用于确认本次安全操作。',
      notice: '如果这是您本人操作，则可以使用新密码登录；如果不是，请立即再次重置密码并联系管理员。',
      footerText: 'Cloudflare Admin 安全团队',
    }),
  })
}

export async function sendAdminResetPasswordNotificationEmail(
  env: EnvBindings,
  email: string,
  adminEmail: string,
): Promise<void> {
  const subject = 'Cloudflare Admin 管理员已重置您的密码'
  await sendMail(env, {
    toName: email,
    toMail: email,
    subject,
    isHtml: true,
    content: buildNoticeMailTemplate({
      title: subject,
      previewText: '您的 Cloudflare Admin 账户密码已被管理员重置。',
      greeting: `您好，${email}`,
      description: `管理员 ${adminEmail} 刚刚重置了您的 Cloudflare Admin 账户密码，请使用最新密码登录后尽快自行修改密码。`,
      notice: '如果您不了解本次重置来源，请立即联系管理员核实并检查账户安全。',
      footerText: 'Cloudflare Admin 安全团队',
    }),
  })
}
