# 开源说明

Cloudflare Admin 将作为一个开源项目对外发布，因此文档不仅服务使用者，也服务贡献者和维护者。

## 仓库地址

- GitHub：`https://github.com/zeroojs/cloudflare-admin.git`

你可以直接克隆仓库开始体验：

```bash
git clone https://github.com/zeroojs/cloudflare-admin.git
cd cloudflare-admin
npm install
```

## 项目结构

```text
src/                 前端页面、组件、状态、组合式逻辑
api/                 Cloudflare Worker 后端
shared/              前后端共享类型
docs/                VitePress 教程与参考文档
email-template/      邮件模板参考文件
.trae/documents/     产品、技术、页面设计文档
```

## 开源后的建议维护方式

- 所有新功能优先补到 `README.md` 和 `docs/`
- 所有环境变量和 Secrets 统一记录到文档站
- 所有用户可见功能尽量补自动化测试
- 接口、权限、部署方式变化时同步更新教程

## 适合继续贡献的方向

- 登录异常提醒邮件
- 自定义域名与多环境配置
- 审计日志与操作记录页面
- 文档站点国际化
- 更完整的 API 示例和错误码说明

## 文档与源码的关系

- `README.md` 负责提供项目总览
- `docs/` 负责提供结构化教程与参考文档
- `api/` 与 `src/` 是实现本体

开源项目建议以 `README.md + VitePress 文档站 + 代码注释` 的方式同步维护信息，而不要只依赖单一文档。
