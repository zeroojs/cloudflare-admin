# Cloudflare Admin

基于 Vue 3 + Ant Design Vue + Cloudflare Worker 构建的 Cloudflare 域名、DNS、账户、认证与权限管理系统。

本项目面向多 Cloudflare 账户统一管理场景，支持账户凭证加密存储、域名缓存同步、DNS 解析管理、邮箱注册登录、角色权限控制，以及与 Worker / Pages 配套的线上部署。

***预览地址***：<https://cfadmin.letssl.cn>

***文档地址***：<https://cf-admin-doc.letssl.cn/>

***开源地址***：<https://github.com/zeroojs/cloudflare-admin>

## 1. 项目定位

项目的核心目标是提供一个统一的 Cloudflare 管理后台，解决以下问题：

- 多个 Cloudflare 账户分散管理，不便统一操作
- 域名和 DNS 记录分散在不同账户下，查询和维护成本高
- 需要对不同系统用户开放不同范围的数据权限
- 需要支持邮箱注册、找回密码、密码修改、管理员重置密码等基础认证能力
- 需要将前端和 Worker 部署到 Cloudflare 平台，形成完整线上方案

## 2. 当前功能清单

### 2.1 认证与用户体系

- 邮箱注册
  - 注册前先发送邮箱验证码
  - 注册时校验邮箱验证码
- 邮箱登录
  - 登录成功后下发会话令牌
- 忘记密码
  - 发送找回密码验证码
  - 使用验证码完成密码重置
  - 重置成功后发送结果通知邮件
- 已登录修改密码
  - 校验旧密码后更新新密码
  - 修改成功后发送安全通知邮件
- 管理员重置用户密码
  - 无需邮件验证码
  - 重置成功后向目标用户发送通知邮件
- 用户角色
  - `user`
  - `admin`
  - `super_admin`
- 超级管理员规则
  - 超级管理员邮箱通过环境变量 `SUPER_ADMIN_EMAIL` 指定
  - 超级管理员可查看全部用户、全部 Cloudflare 账户、全部域名
  - 只有超级管理员可以分配角色
  - 超级管理员的角色信息不可被任何人修改
- 用户列表可见性
  - 非超级管理员看不到超级管理员记录

### 2.2 Cloudflare 账户管理

- 添加 Cloudflare 账户
- 编辑账户信息
- 删除账户
- 验证账户可用性
- 支持两种认证方式
  - API Token
  - Global API Key
- 账户凭证加密存储到 KV
- 管理员 / 超级管理员支持查看全局账户

### 2.3 域名与缓存同步

- 从 Cloudflare 账户拉取域名列表
- 将多账户域名缓存到 KV
- 支持手动同步域名缓存
- 支持定时同步域名缓存
- Worker 已配置定时任务
  - `0 19 * * *`
  - 对应北京时间凌晨 3 点
- 管理员 / 超级管理员可查看全局域名缓存

### 2.4 DNS 管理

- DNS 记录分页查询
- 按记录类型筛选
- 按关键字筛选
- 新增 DNS 记录
- 编辑 DNS 记录
- 删除单条 DNS 记录
- 批量删除 DNS 记录
- 批量切换 `proxied`
- 支持的记录类型
  - `A`
  - `AAAA`
  - `CNAME`
  - `MX`
  - `TXT`

### 2.5 前端界面能力

- Vue 3 Composition API + `<script setup>`
- Ant Design Vue 页面与表单组件
- Pinia 全局状态管理
- Vue Router 权限路由守卫
- 侧边栏 / 顶部固定布局
- 深色 / 浅色 / 自动主题
- 统一品牌色 `#f6821f`
- 统一圆角 `0.375rem`
- 统一时间格式 `YYYY-MM-DD HH:mm:ss`
- 用户管理页面
- 域名管理页面
- DNS 管理页面
- 账户管理页面

### 2.6 邮件能力

当前已经统一接入 HTML 邮件模板，覆盖以下场景：

- 注册验证码邮件
- 找回密码验证码邮件
- 找回密码成功通知邮件
- 修改密码成功通知邮件
- 管理员重置密码通知邮件

邮件模板样式参考了 Cloudflare 邮件风格，并已整理为项目模板：

- `email-template/cloudflare邮件模板.html`

## 3. 实现原理

### 3.1 总体架构

项目采用前后端分离架构：

- 前端
  - Vue 3 + Vite
  - 负责页面渲染、表单交互、状态管理、路由守卫
- 后端
  - Cloudflare Worker
  - 负责认证、权限、KV 存储、调用 Cloudflare 官方 API、发送邮件
- 存储
  - Cloudflare KV
  - 用于存储用户、会话、邮箱验证码、账户信息、域名缓存、运行时配置等数据

### 3.2 数据存储原理

系统核心数据均存入 `ACCOUNT_STORE` KV：

- 用户信息
- 用户邮箱索引
- 会话 token
- 注册验证码
- 找回密码验证码
- Cloudflare 账户信息
- 域名缓存
- 运行时配置，例如前端 API 地址

为了满足多用户和多账户隔离，KV 中使用了不同前缀进行分组，例如：

- `auth-user:*`
- `auth-session:*`
- `auth-register-code:*`
- `auth-password-reset-code:*`
- `cf-account:*`
- `cf-zone-cache:*`
- `system:runtime-config`

### 3.3 密码与凭证安全原理

- 用户密码不会明文存储
- 密码使用 PBKDF2 派生哈希
- Cloudflare 账户凭证使用 AES-GCM 加密后再写入 KV
- 加密密钥来自 `ENCRYPTION_SECRET`
- 邮件发送认证信息通过 Worker Secrets 注入
  - `MAIL_API_TOKEN`
  - `MAIL_API_CUSTOM_AUTH`

### 3.4 权限控制原理

后端基于角色做统一鉴权，而不是只依赖前端控制：

- `user`
  - 只能看自己的账户和域名
- `admin`
  - 可查看全局用户、全局账户、全局域名
  - 不能分配角色
- `super_admin`
  - 拥有管理员全部视角
  - 可分配角色
  - 但超级管理员自身的角色信息不可修改

权限规则由 Worker 统一收口，前端只做辅助显示和交互限制。

### 3.5 域名同步原理

- Worker 调用 Cloudflare API 拉取各账户的 Zone 列表
- 将结果转换为统一结构后缓存到 KV
- 管理员 / 超级管理员可读取聚合后的全局缓存
- 普通用户只能读取自己的缓存
- 定时任务和手动同步共用同一套同步逻辑

### 3.6 前端 API 地址配置原理

前端 API 地址采用“引导地址 + 运行时配置”的方式：

- 前端启动时先请求 `GET /api/runtime-config`
- Worker 从 KV 中读取运行时配置
- 配置项当前包含 `apiBaseUrl`
- 前端后续业务请求优先使用该运行时地址

当前实现里，前端引导地址写在：

- `src/services/http.ts`

当前代码中引导地址为：

```ts
const bootstrapApiBaseUrl = 'https://cloudflare-admin-worker-api.letssl.cn'
```

如果运行时配置加载成功，前端会自动切换为 KV 中配置的 `apiBaseUrl`。

## 4. 实现方式

### 4.1 前端实现

前端目录结构：

```text
src/
  components/       通用组件、账户组件、认证组件、DNS 组件、用户组件
  composables/      组合式逻辑
  layouts/          应用壳层
  pages/            页面
  router/           路由与权限守卫
  services/         API 请求封装
  stores/           Pinia 状态
  utils/            时间、会话、DNS 等工具
```

主要实现方式：

- 页面使用 `pages/*`
- 可复用业务逻辑抽到 `composables/*`
- 所有后端请求统一通过 `src/services/*`
- 全局登录态由 `src/stores/auth.ts` 管理
- 路由权限由 `src/router/index.ts` 管理
- 应用主题由 `src/composables/useTheme.ts` 管理

### 4.2 后端实现

后端目录结构：

```text
api/
  index.ts          Worker 入口与路由分发
  store.ts          KV 读写、用户/账户/验证码/缓存持久化
  cloudflare.ts     Cloudflare 官方 API 封装
  validators.ts     入参校验
  response.ts       统一响应与 CORS 处理
  mail.ts           邮件模板与发信封装
  crypto.ts         密码与加密逻辑
  rate-limit.ts     请求频率限制
  zone-cache.ts     域名同步逻辑
```

主要实现方式：

- `api/index.ts` 负责按路径分发接口
- `api/store.ts` 负责持久化层
- `api/cloudflare.ts` 负责调用 Cloudflare API
- `api/mail.ts` 负责邮件模板和发信
- `api/validators.ts` 负责参数合法性校验
- `api/response.ts` 负责统一 JSON 响应和 CORS

### 4.3 共享类型

前后端共享类型位于：

- `shared/types.ts`

这里统一定义：

- 用户、会话、角色
- 账户结构
- 域名结构
- DNS 记录结构
- 运行时配置结构
- API 响应结构

## 5. 关键接口

### 5.1 认证接口

- `POST /api/auth/register-code`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/password-reset-code`
- `POST /api/auth/password-reset`
- `POST /api/auth/change-password`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### 5.2 用户管理接口

- `GET /api/users`
- `PUT /api/users/:id/role`
- `PUT /api/users/:id/reset-password`

### 5.3 Cloudflare 账户接口

- `GET /api/accounts`
- `POST /api/accounts`
- `PUT /api/accounts/:id`
- `DELETE /api/accounts/:id`
- `POST /api/accounts/:id/verify`
- `GET /api/accounts/:id/zones`

### 5.4 域名缓存接口

- `GET /api/zones-cache`
- `POST /api/zones-cache/sync`

### 5.5 DNS 接口

- `GET /api/dns-records`
- `POST /api/dns-records`
- `PUT /api/dns-records/:id`
- `DELETE /api/dns-records/:id`
- `POST /api/dns-records/batch-delete`
- `POST /api/dns-records/batch-proxied`

### 5.6 运行时配置接口

- `GET /api/runtime-config`
- `PUT /api/runtime-config`

## 6. 本地开发方式

### 6.1 安装依赖

```bash
npm install
```

### 6.2 本地启动前端

```bash
npm run dev
```

### 6.3 本地启动 Worker

```bash
npm run dev:worker
```

### 6.4 本地开发需要的配置

Worker 普通变量位于：

- `wrangler.worker.jsonc`

本地敏感变量建议写入：

- `.dev.vars`

示例文件：

- `.dev.vars.example`

至少需要关注的配置项：

```env
MAIL_API_TOKEN=replace-with-local-mail-api-token
MAIL_API_CUSTOM_AUTH=replace-with-local-mail-api-custom-auth
```

Worker 普通变量示例：

```jsonc
{
  "vars": {
    "ADMIN_TOKEN": "local-dev-token",
    "ENCRYPTION_SECRET": "local-dev-encryption-secret",
    "MAIL_API_URL": "https://tmapi.wxin.org/api/send_mail",
    "MAIL_FROM_NAME": "Cloudflare Admin",
    "SUPER_ADMIN_EMAIL": "wlittleyang@163.com",
    "MAIL_CODE_EXPIRE_MINUTES": "10",
    "MAIL_CODE_RESEND_INTERVAL_SECONDS": "60",
    "ALLOWED_ORIGIN": "*",
    "RATE_LIMIT_MAX": "120",
    "RATE_LIMIT_WINDOW_MS": "60000"
  }
}
```

### 6.5 环境变量与 Secret 清单

#### 6.5.1 Worker 普通变量

以下变量通常写在 `wrangler.worker.jsonc` 的 `vars` 中：

| 变量名                                 | 用途                             | 是否必填 | 当前建议位置                         |
| ----------------------------------- | ------------------------------ | ---- | ------------------------------ |
| `ADMIN_TOKEN`                       | 预留的管理令牌配置                      | 否    | `wrangler.worker.jsonc`        |
| `ENCRYPTION_SECRET`                 | 用户密码哈希与账户凭证加密使用的密钥             | 是    | `wrangler.worker.jsonc` 或分环境变量 |
| `MAIL_API_URL`                      | 邮件发送 API 地址                    | 是    | `wrangler.worker.jsonc`        |
| `MAIL_FROM_NAME`                    | 邮件发件人名称                        | 否    | `wrangler.worker.jsonc`        |
| `SUPER_ADMIN_EMAIL`                 | 超级管理员邮箱，匹配后自动识别为 `super_admin` | 是    | `wrangler.worker.jsonc`        |
| `MAIL_CODE_EXPIRE_MINUTES`          | 注册 / 找回密码验证码有效期                | 否    | `wrangler.worker.jsonc`        |
| `MAIL_CODE_RESEND_INTERVAL_SECONDS` | 验证码重发间隔秒数                      | 否    | `wrangler.worker.jsonc`        |
| `ALLOWED_ORIGIN`                    | Worker CORS 允许来源               | 是    | `wrangler.worker.jsonc`        |
| `RATE_LIMIT_MAX`                    | 限流窗口内最大请求数                     | 否    | `wrangler.worker.jsonc`        |
| `RATE_LIMIT_WINDOW_MS`              | 限流窗口时长，单位毫秒                    | 否    | `wrangler.worker.jsonc`        |

#### 6.5.2 Worker Secrets

以下变量属于敏感信息，不应写入版本库，必须通过 Cloudflare Secret 或本地 `.dev.vars` 注入：

| 变量名                    | 用途                         | 是否必填 | 当前建议位置                          |
| ---------------------- | -------------------------- | ---- | ------------------------------- |
| `MAIL_API_TOKEN`       | 邮件 API Bearer Token        | 是    | Cloudflare Secret / `.dev.vars` |
| `MAIL_API_CUSTOM_AUTH` | 邮件 API `x-custom-auth` 请求头 | 是    | Cloudflare Secret / `.dev.vars` |

线上写入命令示例：

```bash
npx wrangler secret put MAIL_API_TOKEN --config wrangler.worker.jsonc
npx wrangler secret put MAIL_API_CUSTOM_AUTH --config wrangler.worker.jsonc
```

#### 6.5.3 前端构建期与运行时配置

| 配置项                 | 用途                       | 是否必填 | 当前实现方式                        |
| ------------------- | ------------------------ | ---- | ----------------------------- |
| `VITE_API_BASE_URL` | 前端启动时用于拉取运行时配置的引导 API 地址 | 建议配置 | Vite 环境变量                     |
| `apiBaseUrl`        | 前端实际业务请求使用的 API 地址       | 是    | KV 中的 `system:runtime-config` |

说明：

- `VITE_API_BASE_URL` 主要用于前端冷启动时先访问 `GET /api/runtime-config`
- `apiBaseUrl` 才是运行时真实生效的后端地址
- 当前代码中，`src/services/http.ts` 里已经写入了一个固定引导地址，如需改回环境变量模式，可恢复为 `import.meta.env.VITE_API_BASE_URL`

#### 6.5.4 本地开发文件建议

| 文件                      | 作用                        |
| ----------------------- | ------------------------- |
| `wrangler.worker.jsonc` | Worker 普通变量、KV、Cron 等部署配置 |
| `.dev.vars`             | 本地开发 Secret，不提交到仓库        |
| `.dev.vars.example`     | 本地 Secret 示例文件            |
| `wrangler.jsonc`        | Cloudflare Pages 配置       |

## 7. 测试与检查

类型检查：

```bash
npm run check
```

运行测试：

```bash
npm run test:run
```

当前测试覆盖重点包括：

- 认证流程
- 注册 / 找回密码验证码
- 修改密码
- 管理员重置密码
- 超级管理员权限规则
- CORS 头
- 运行时配置接口
- DNS 管理组合式逻辑

## 8. 部署方式

### 8.1 Worker 部署

Worker 配置文件：

- `wrangler.worker.jsonc`

部署命令：

```bash
npm run deploy:worker
```

仅检查不部署：

```bash
npm run deploy:worker:dry-run
```

当前 Worker 绑定：

- KV Namespace: `ACCOUNT_STORE`
- Secrets:
  - `MAIL_API_TOKEN`
  - `MAIL_API_CUSTOM_AUTH`

当前线上 API 地址：

- `https://cloudflare-admin-worker-api.letssl.cn`

### 8.2 Pages 部署

Pages 配置文件：

- `wrangler.jsonc`

先构建前端：

```bash
npm run build
```

再部署 Pages：

```bash
npm run deploy:pages
```

当前线上前端地址：

- `https://cfadmin.letssl.cn/`

### 8.3 推荐部署顺序

1. 先部署 Worker
2. 再部署 Pages
3. 检查 `GET /api/health`
4. 检查前端登录、注册、DNS、用户管理功能

## 9. 当前线上信息

当前已知线上地址：

- 前端站点: `https://cfadmin.letssl.cn/`
- API 地址: `https://cloudflare-admin-worker-api.letssl.cn`
- 文档地址: `https://cf-admin-doc.letssl.cn/`
- 开源地址: `https://github.com/zeroojs/cloudflare-admin`

当前自定义引导 API 地址代码位于：

- `src/services/http.ts`

当前值为：

- `https://cloudflare-admin-worker-api.letssl.cn`

## 10. 相关文件

- `README.md`：项目总览文档
- `UI调整总结.md`：UI 调整说明
- `wrangler.worker.jsonc`：Worker 部署配置
- `wrangler.jsonc`：Pages 部署配置
- `email-template/cloudflare邮件模板.html`：系统邮件模板参考文件
- `.trae/documents/产品需求文档.md`
- `.trae/documents/技术架构文档.md`
- `.trae/documents/页面设计文档.md`

## 11. 后续可扩展方向

- 登录异常提醒邮件
- 账户操作审计日志
- 更细粒度的 RBAC 权限
- 更严格的 CORS 白名单控制
- 更完善的运行时配置管理页面
- 前端与后端统一接入自定义域名
