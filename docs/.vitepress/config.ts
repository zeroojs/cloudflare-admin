import { defineConfig, type DefaultTheme } from 'vitepress'

const repoLink = 'https://github.com/zeroojs/cloudflare-admin.git'

function createZhNav(): DefaultTheme.NavItem[] {
  return [
    { text: '教程首页', link: '/' },
    { text: '快速开始', link: '/guide/quick-start' },
    { text: '核心教程', link: '/guide/architecture' },
    { text: '参考文档', link: '/reference/configuration' },
    { text: '项目说明', link: '/guide/open-source' },
    { text: 'GitHub', link: repoLink },
  ]
}

function createEnNav(): DefaultTheme.NavItem[] {
  return [
    { text: 'Home', link: '/en/' },
    { text: 'Quick Start', link: '/en/guide/quick-start' },
    { text: 'Architecture', link: '/en/guide/architecture' },
    { text: 'Reference', link: '/en/reference/configuration' },
    { text: 'Open Source', link: '/en/guide/open-source' },
    { text: 'GitHub', link: repoLink },
  ]
}

function createZhSidebar(): DefaultTheme.Sidebar {
  return {
    '/guide/': [
      {
        text: '入门',
        items: [
          { text: '教程导览', link: '/guide/' },
          { text: '快速开始', link: '/guide/quick-start' },
          { text: '开源说明', link: '/guide/open-source' },
        ],
      },
      {
        text: '核心实现',
        items: [
          { text: '系统架构', link: '/guide/architecture' },
          { text: '认证与权限', link: '/guide/auth-permissions' },
          { text: '账户与域名缓存', link: '/guide/accounts-zones' },
          { text: 'DNS 管理实现', link: '/guide/dns-management' },
          { text: '邮件与安全', link: '/guide/mail-security' },
        ],
      },
      {
        text: '部署',
        items: [{ text: '部署到 Cloudflare', link: '/guide/deployment' }],
      },
    ],
    '/reference/': [
      {
        text: '参考文档',
        items: [
          { text: '环境变量与 Secret', link: '/reference/configuration' },
          { text: '接口总览', link: '/reference/api' },
          { text: '常见问题', link: '/reference/faq' },
        ],
      },
    ],
  }
}

function createEnSidebar(): DefaultTheme.Sidebar {
  return {
    '/en/guide/': [
      {
        text: 'Getting Started',
        items: [
          { text: 'Guide Overview', link: '/en/guide/' },
          { text: 'Quick Start', link: '/en/guide/quick-start' },
          { text: 'Open Source', link: '/en/guide/open-source' },
        ],
      },
      {
        text: 'Core Topics',
        items: [
          { text: 'Architecture', link: '/en/guide/architecture' },
          { text: 'Auth and Permissions', link: '/en/guide/auth-permissions' },
          { text: 'Accounts and Zone Cache', link: '/en/guide/accounts-zones' },
          { text: 'DNS Management', link: '/en/guide/dns-management' },
          { text: 'Mail and Security', link: '/en/guide/mail-security' },
        ],
      },
      {
        text: 'Deployment',
        items: [{ text: 'Deploy to Cloudflare', link: '/en/guide/deployment' }],
      },
    ],
    '/en/reference/': [
      {
        text: 'Reference',
        items: [
          { text: 'Environment Variables and Secrets', link: '/en/reference/configuration' },
          { text: 'API Overview', link: '/en/reference/api' },
          { text: 'FAQ', link: '/en/reference/faq' },
        ],
      },
    ],
  }
}

function createZhThemeConfig(): DefaultTheme.Config {
  return {
    logo: '/favicon.svg',
    siteTitle: 'Cloudflare Admin',
    search: {
      provider: 'local',
    },
    nav: createZhNav(),
    sidebar: createZhSidebar(),
    outline: {
      label: '本页目录',
    },
    docFooter: {
      prev: '上一页',
      next: '下一页',
    },
    footer: {
      message: 'Built with Vue 3, Cloudflare Worker and VitePress.',
      copyright: 'Copyright © Cloudflare Admin Contributors',
    },
    lastUpdated: {
      text: '最后更新',
    },
    langMenuLabel: '语言',
    returnToTopLabel: '返回顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
  }
}

function createEnThemeConfig(): DefaultTheme.Config {
  return {
    logo: '/favicon.svg',
    siteTitle: 'Cloudflare Admin',
    search: {
      provider: 'local',
    },
    nav: createEnNav(),
    sidebar: createEnSidebar(),
    outline: {
      label: 'On This Page',
    },
    docFooter: {
      prev: 'Previous page',
      next: 'Next page',
    },
    footer: {
      message: 'Built with Vue 3, Cloudflare Worker and VitePress.',
      copyright: 'Copyright © Cloudflare Admin Contributors',
    },
    lastUpdated: {
      text: 'Last updated',
    },
    langMenuLabel: 'Languages',
    returnToTopLabel: 'Return to top',
    sidebarMenuLabel: 'Menu',
    darkModeSwitchLabel: 'Theme',
    lightModeSwitchTitle: 'Switch to light mode',
    darkModeSwitchTitle: 'Switch to dark mode',
  }
}

export default defineConfig({
  lang: 'zh-CN',
  title: 'Cloudflare Admin',
  description: 'Cloudflare Admin 开源教程与项目文档',
  cleanUrls: true,
  lastUpdated: true,
  appearance: true,
  themeConfig: createZhThemeConfig(),
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'Cloudflare Admin',
      description: 'Cloudflare Admin 开源教程与项目文档',
      themeConfig: createZhThemeConfig(),
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: 'Cloudflare Admin',
      description: 'Open-source guides and project documentation for Cloudflare Admin.',
      themeConfig: createEnThemeConfig(),
    },
  },
})
