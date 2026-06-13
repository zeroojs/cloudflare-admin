# 教程导览

本章节面向第一次接触 Cloudflare Admin 的开发者，帮助你从“看懂项目”走到“能够本地运行和二次开发”。

## 教程结构

### 入门

- [快速开始](/guide/quick-start)：最短路径跑起前端、Worker 和文档站
- [开源说明](/guide/open-source)：了解项目目录、维护方式和适合贡献的方向

### 核心实现

- [系统架构](/guide/architecture)：理解前后端分层、KV、Cloudflare API 与运行时配置
- [认证与权限](/guide/auth-permissions)：理解邮箱注册登录、会话、角色与超级管理员规则
- [账户与域名缓存](/guide/accounts-zones)：理解多账户接入和域名同步机制
- [DNS 管理实现](/guide/dns-management)：理解 DNS 查询、编辑、批量操作的实现方式
- [邮件与安全](/guide/mail-security)：理解验证码邮件、通知邮件、密码安全与 Secrets 配置

### 部署

- [部署到 Cloudflare](/guide/deployment)：按步骤完成 Worker、Pages 和正式域名部署

## 建议阅读方式

如果你是：

- 使用者：先看 [快速开始](/guide/quick-start) 与 [部署到 Cloudflare](/guide/deployment)
- 二次开发者：从 [系统架构](/guide/architecture) 开始，再进入功能章节
- 开源贡献者：先看 [开源说明](/guide/open-source)，再按功能模块阅读
