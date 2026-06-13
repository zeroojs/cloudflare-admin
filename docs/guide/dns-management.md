# DNS 管理实现

DNS 模块是本项目最核心的业务模块。

## 当前支持的操作

- 查询 DNS 记录
- 按类型筛选
- 按关键字筛选
- 新增记录
- 编辑记录
- 删除单条记录
- 批量删除
- 批量切换代理状态

## 支持的记录类型

- `A`
- `AAAA`
- `CNAME`
- `MX`
- `TXT`

## 查询链路

1. 前端选择账户与 Zone
2. 前端调用 `GET /api/dns-records`
3. Worker 校验权限与参数
4. Worker 读取对应账户凭据
5. Worker 调用 Cloudflare DNS API
6. Worker 返回标准化分页结果

## 写操作链路

新增、编辑、删除、批量操作的基本过程一致：

1. 前端提交操作参数
2. Worker 校验参数合法性
3. Worker 校验当前用户是否可访问目标账户
4. Worker 调用 Cloudflare 官方 API
5. 将错误映射为前端可识别结构
6. 前端刷新列表并提示结果

## 为什么要统一走 Worker

原因包括：

- 避免在前端暴露 Cloudflare 凭据
- 统一做权限控制
- 统一做限流
- 统一做参数校验
- 统一做错误处理和消息格式化

## 前端实现位置

- 页面：`src/pages/DnsPage.vue`
- 组合式逻辑：`src/composables/useDnsManagement.ts`
- 服务层：`src/services/cloudflare.ts`

## 后端实现位置

- 路由入口：`api/index.ts`
- Cloudflare API 封装：`api/cloudflare.ts`
- 参数校验：`api/validators.ts`

## 推荐阅读

- [系统架构](/guide/architecture)
- [接口总览](/reference/api)
