# 邮件与安全

项目已经接入统一的 HTML 系统邮件模板，用于注册、找回密码和密码安全通知。

## 当前邮件场景

- 注册验证码邮件
- 找回密码验证码邮件
- 找回密码成功通知邮件
- 修改密码成功通知邮件
- 管理员重置密码通知邮件

## 邮件模板来源

模板样式参考了 Cloudflare 官方邮件风格，并针对本系统做了二次整理：

- `email-template/cloudflare邮件模板.html`
- `api/mail.ts`

## 邮件发送方式

当前使用外部邮件 API：

- 地址：`https://tmapi.wxin.org/api/send_mail`
- 认证头：
  - `Authorization: Bearer <MAIL_API_TOKEN>`
  - `x-custom-auth: <MAIL_API_CUSTOM_AUTH>`

## 为什么用 Secret 管理邮件认证

邮件服务认证信息属于敏感信息，因此：

- 不应放在前端
- 不应写入公开仓库
- 应通过 Worker Secret 或本地 `.dev.vars` 注入

## 密码安全设计

- 用户密码使用 PBKDF2 哈希
- Cloudflare 账户凭据使用 AES-GCM 加密
- 会话 token 存储于 KV
- 超级管理员身份由环境变量控制

## 建议的安全加固方向

- 将 `ALLOWED_ORIGIN` 从 `*` 收紧到白名单
- 增加登录异常提醒邮件
- 增加操作审计日志
- 增加更严格的请求来源校验

## 推荐阅读

- [认证与权限](/guide/auth-permissions)
- [环境变量与 Secret](/reference/configuration)
