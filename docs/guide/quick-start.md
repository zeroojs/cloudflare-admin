# 快速开始

本页按最短路径说明如何在本地启动 Cloudflare Admin。

## 环境要求

- Node.js 18 及以上
- npm
- Cloudflare 账户
- 可用的邮件发送 API 凭据

## 1. 克隆仓库并安装依赖

```bash
git clone https://github.com/zeroojs/cloudflare-admin.git
cd cloudflare-admin
npm install
```

## 2. 准备 Worker 配置

普通变量已经写在 `wrangler.worker.jsonc`，本地敏感变量请写入 `.dev.vars`：

```txt
MAIL_API_TOKEN=replace-with-local-mail-api-token
MAIL_API_CUSTOM_AUTH=replace-with-local-mail-api-custom-auth
```

如果你希望自定义超级管理员邮箱、邮件 API 或限流策略，也可以修改 `wrangler.worker.jsonc` 中的 `vars`。

## 3. 启动前端

```bash
npm run dev
```

默认启动 Vite 前端开发服务。

## 4. 启动 Worker

```bash
npm run dev:worker
```

默认使用 `wrangler.worker.jsonc` 本地启动 Worker，并绑定本地 KV。

## 5. 启动文档站点

```bash
npm run docs:dev
```

你可以通过 VitePress 文档站点查看教程。

## 6. 可选检查

```bash
npm run check
npm run test:run
```

## 常见启动顺序

推荐同时打开三个终端：

1. `npm run dev`
2. `npm run dev:worker`
3. `npm run docs:dev`

## 当前线上地址

- 前端站点：`https://cfadmin.letssl.cn/`
- API 地址：`https://cloudflare-admin-worker-api.letssl.cn`

## 下一步

- 想看整体实现：继续阅读 [系统架构](/guide/architecture)
- 想直接部署：继续阅读 [部署到 Cloudflare](/guide/deployment)
