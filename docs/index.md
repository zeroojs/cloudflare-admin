---
layout: home

hero:
  name: Cloudflare Admin
  text: 面向开源社区的 Cloudflare 管理控制台教程
  tagline: 基于 Vue 3、Ant Design Vue 与 Cloudflare Worker 构建，覆盖多账户管理、域名缓存同步、DNS 解析、认证权限和 Cloudflare 部署。
  image:
    src: /favicon.svg
    alt: Cloudflare Admin
  actions:
    - theme: brand
      text: 开始阅读教程
      link: /guide/
    - theme: alt
      text: 快速开始
      link: /guide/quick-start
    - theme: alt
      text: 环境变量参考
      link: /reference/configuration
    - theme: alt
      text: GitHub 仓库
      link: https://github.com/zeroojs/cloudflare-admin.git

features:
  - icon: "☁️"
    title: 多账户统一接入
    details: 在一个后台中维护多个 Cloudflare 账户，统一读取账户、域名和 DNS 数据。
  - icon: "🧭"
    title: 从教程到部署
    details: 覆盖本地启动、系统架构、权限设计、DNS 管理和 Cloudflare 部署全链路。
  - icon: "🔐"
    title: 安全与邮件能力
    details: 支持邮箱注册登录、找回密码、管理员重置密码以及统一的 HTML 邮件模板。
---

<div class="landing-panel">
  <div class="landing-grid">
    <div class="landing-stat">
      <p class="landing-label">核心场景</p>
      <p class="landing-value">多账户 + DNS</p>
      <p class="landing-note">统一管理 Cloudflare 账户、域名缓存与 DNS 记录变更。</p>
    </div>
    <div class="landing-stat">
      <p class="landing-label">后端模型</p>
      <p class="landing-value">Worker + KV</p>
      <p class="landing-note">使用 Worker 作为 API 网关，KV 作为用户、会话和缓存持久化层。</p>
    </div>
    <div class="landing-stat">
      <p class="landing-label">开源文档</p>
      <p class="landing-value">VitePress</p>
      <p class="landing-note">教程站、参考文档和 README 形成配套的开源交付结构。</p>
    </div>
  </div>
</div>

<div class="landing-section">
  <h2>这个项目适合谁</h2>
  <p>
    如果你正在维护多个 Cloudflare 账户、需要统一管理域名与 DNS，或者希望把一个前后端分离的
    Cloudflare Worker 项目以开源方式对外发布，这套项目和教程就是为你准备的。
  </p>
</div>

<div class="landing-card-list">
  <div class="landing-card">
    <h3>开源使用者</h3>
    <p>希望快速部署一套可用的 Cloudflare 管理后台，直接复用现成能力。</p>
    <ul class="landing-mini-list">
      <li>账户管理</li>
      <li>域名缓存同步</li>
      <li>DNS 解析管理</li>
    </ul>
  </div>
  <div class="landing-card">
    <h3>二次开发者</h3>
    <p>需要理解项目结构、权限规则、KV 模型和 Worker API 组织方式。</p>
    <ul class="landing-mini-list">
      <li>共享类型与服务层</li>
      <li>运行时 API 配置</li>
      <li>邮件与安全通知</li>
    </ul>
  </div>
  <div class="landing-card">
    <h3>运维与团队维护者</h3>
    <p>需要标准化部署、记录配置项，并让团队成员能快速接手维护。</p>
    <ul class="landing-mini-list">
      <li>Secrets 管理</li>
      <li>Worker / Pages 分离部署</li>
      <li>文档化交接</li>
    </ul>
  </div>
  <div class="landing-card">
    <h3>教程读者</h3>
    <p>希望从一个真实项目中学习 Vue 3 + Worker + KV + VitePress 的完整组合。</p>
    <ul class="landing-mini-list">
      <li>架构设计</li>
      <li>权限与认证</li>
      <li>文档站建设</li>
    </ul>
  </div>
</div>

<div class="landing-section">
  <h2>你会从文档中看到什么</h2>
  <p>
    教程不是只讲页面怎么写，而是按真实开源项目的维护视角拆解：从启动项目、理解架构，到掌握接口、
    邮件、安全和上线方式，再到如何把文档本身做成可持续维护的站点。
  </p>
</div>

<div class="landing-section">
  <h2>开源仓库地址</h2>
  <p>
    GitHub：<a href="https://github.com/zeroojs/cloudflare-admin.git">https://github.com/zeroojs/cloudflare-admin.git</a>
  </p>
  <p>
    你可以直接克隆仓库开始本地开发，也可以通过页面右上角的语言菜单切换中文与英文文档。
  </p>
</div>

<div class="landing-callout">
  <div class="landing-accent">
    <h3>当前正式地址</h3>
    <p>前端站点：`https://cfadmin.letssl.cn/`</p>
    <p>API 地址：`https://cloudflare-admin-worker-api.letssl.cn`</p>
    <p>
      当前项目已经具备认证、账户、域名缓存、DNS、邮件通知和部署链路，适合作为开源模板继续扩展。
    </p>
  </div>
  <div class="landing-link-list">
    <a class="landing-link-item" href="https://github.com/zeroojs/cloudflare-admin.git">
      <strong>查看 GitHub 仓库</strong>
      <span>获取源码、跟踪更新，并基于当前项目继续二次开发与开源协作。</span>
    </a>
    <a class="landing-link-item" href="/guide/architecture">
      <strong>先看系统架构</strong>
      <span>快速理解 Vue、Worker、KV 和外部邮件 API 是如何协同工作的。</span>
    </a>
    <a class="landing-link-item" href="/guide/deployment">
      <strong>直接看部署方式</strong>
      <span>了解 Worker、Pages、Secrets 和正式域名该如何配置。</span>
    </a>
    <a class="landing-link-item" href="/reference/api">
      <strong>查看接口总览</strong>
      <span>快速找到认证、用户、账户、域名缓存、DNS 和运行时配置接口。</span>
    </a>
  </div>
</div>
