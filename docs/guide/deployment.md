# 部署到 Cloudflare

本项目采用前后端分离部署：

- 前端部署到 Cloudflare Pages
- 后端部署到 Cloudflare Worker

## 当前正式地址

- 前端站点：`https://cfadmin.letssl.cn/`
- API 地址：`https://cloudflare-admin-worker-api.letssl.cn`
- 文档站点：`https://cf-admin-doc.letssl.cn`

## 1. 部署 Worker

配置文件：

- `wrangler.worker.jsonc`

部署命令：

```bash
npm run deploy:worker
```

仅检查配置：

```bash
npm run deploy:worker:dry-run
```

## 2. 配置 Worker Secrets

```bash
npx wrangler secret put MAIL_API_TOKEN --config wrangler.worker.jsonc
npx wrangler secret put MAIL_API_CUSTOM_AUTH --config wrangler.worker.jsonc
```

## 3. 部署前端 Pages

配置文件：

- `wrangler.jsonc`

先构建：

```bash
npm run build
```

再部署：

```bash
npm run deploy:pages
```

## 4. 配置正式域名

建议将正式域名分为两类：

- 前端域名：`https://cfadmin.letssl.cn/`
- API 域名：`https://cloudflare-admin-worker-api.letssl.cn`
- 文档域名：`https://cf-admin-doc.letssl.cn`

同时需要确保前端引导地址与运行时 API 地址配置一致。

## 5. 验证上线结果

至少验证以下内容：

- `GET /api/health` 正常
- 登录正常
- 注册发信正常
- 找回密码发信正常
- DNS 查询与编辑正常
- 用户管理正常

## 推荐部署顺序

1. 写入 Worker Secrets
2. 部署 Worker
3. 构建并部署 Pages
4. 绑定正式域名
5. 检查健康接口与关键功能

## 推荐阅读

- [环境变量与 Secret](/reference/configuration)
- [快速开始](/guide/quick-start)
