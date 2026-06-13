# 系统架构

Cloudflare Admin 采用前后端分离架构，由 Vue 前端控制台、Cloudflare Worker API、Cloudflare KV 和 Cloudflare 官方 API 四部分组成。

## 总体架构

```text
Vue 3 管理后台
    ↓
Cloudflare Worker API 网关
    ↓
Cloudflare KV / Cloudflare 官方 API / 外部邮件 API
```

## 前端职责

前端位于 `src/`，主要负责：

- 页面渲染与布局
- 表单交互与状态管理
- 路由守卫
- 请求封装
- 主题切换

前端技术栈：

- Vue 3
- TypeScript
- Vite
- Ant Design Vue
- Pinia
- Vue Router

## 后端职责

后端位于 `api/`，运行于 Cloudflare Worker，主要负责：

- 用户认证
- 角色权限校验
- 限流
- 参数校验
- Cloudflare API 代理与标准化
- KV 读写
- 邮件发送

## KV 持久化设计

系统当前使用 `ACCOUNT_STORE` KV 保存以下内容：

- 用户信息
- 邮箱索引
- 会话 token
- 注册验证码
- 找回密码验证码
- Cloudflare 账户与加密凭证
- 域名缓存
- 运行时配置

典型前缀包括：

- `auth-user:*`
- `auth-session:*`
- `auth-register-code:*`
- `auth-password-reset-code:*`
- `cf-account:*`
- `cf-zone-cache:*`
- `system:runtime-config`

## 运行时 API 地址

前端在启动时会先读取运行时配置：

- 接口：`GET /api/runtime-config`
- 存储位置：KV 的 `system:runtime-config`
- 配置项：`apiBaseUrl`

这样在不重新打包前端的前提下，也可以切换实际 API 地址。

## 为什么用 Worker

使用 Worker 的主要原因：

- 与 Cloudflare 平台天然贴合
- 适合做 API 网关和轻量服务
- 能直接使用 KV、Cron、Secrets 等能力
- 部署成本低，发布速度快

## 推荐阅读

- [认证与权限](/guide/auth-permissions)
- [账户与域名缓存](/guide/accounts-zones)
- [部署到 Cloudflare](/guide/deployment)
