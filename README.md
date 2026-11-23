# Serico 个人主页

这是 Serico 的中英双语个人名片。第一次来的人，应当能读懂 Serico 这个名字、知道站主最近在做什么，并找到他的 GitHub。仓库里已有可运行的 Astro 静态站，可以直接在现有页面上调整设计。[中文首页](https://serico.ai/) · [English](https://serico.ai/en/) · [源码仓库](https://github.com/bestduijin/bestduijin.github.io)

## 页面要讲什么

中文在 `/`，英文在 `/en/`，两页共用布局。首屏右上角提供语言切换。2026-11-23 起，首屏讲站主的定位：贸易、电商出身，用 AI 和代码解决业务问题（站主选的 B 版文案）。只讲能力，不讲给哪家公司搭过什么系统。首屏的三个数字是站主本人给的，改之前先问站主。

站主定稿的自述放在「名字的来历」开头，请保留原文：

> 名字取意于丝绸。
>
> 过去，丝绸把东方的好东西带向世界；
>
> 今天，我分享自己做产品、做生意、探索新工具的经历。

| 从上到下 | 访客看到的内容 |
| --- | --- |
| 首屏 | Serico 字标、丝带、读音「SEH-ri-ko，塞里科」，一句定位、两三句自我介绍，下面一排三个数字。 |
| 我能做什么 | 看懂流程、搭起来、让它自己跑，三栏并排，手机上竖排。 |
| 现在在做 | 把做生意的门道、用 AI 解决问题的办法写成文章、做成短视频，也会亲自试用新出的 AI 工具。 |
| 名字的来历 | 先是站主的自述原文，再用「丝 → Seres → sericus → serico」串起名字的故事。保留原文对汉语词源「有一种说法」的限定。 |
| 在哪找我 | 链接到站主的 [GitHub 个人资料](https://github.com/bestduijin)。 |

## 视觉与阅读体验

现有设计从名字里的「丝」取材。西文用随站点加载的 Bodoni Moda 斜体做字标，中文正文用设备上的宋体。浅色版用月白底、鸦青字，丝带里的一根胭脂红线呼应下方的词源线。Bodoni Moda 通过 Fontsource 打包，字体许可为 SIL Open Font License 1.1。

桌面上，四个词从左到右读；手机上改为纵向排列，让每个词和解释相邻。深色版随系统切换。丝带在构建时生成 SVG，展开效果由 CSS 控制；开启「减少动态效果」后直接显示完整丝带。

## 在本地打开

准备 Git、Node.js（项目声明最低版本为 22.23.4）和 npm。首次接手时运行：

```bash
git clone https://github.com/bestduijin/bestduijin.github.io.git
cd bestduijin.github.io
npm ci
npm run dev
```

打开终端显示的地址，默认是 `http://localhost:4321/`。直接访问 `/en/` 可以检查英文版。交付前按 Ctrl+C 停止开发服务，再预览实际要发布的版本：

```bash
npm run build
npm run preview
```

构建成功后，`dist/index.html` 和 `dist/en/index.html` 分别对应中文和英文首页。

## 改哪里

| 想改什么 | 文件 |
| --- | --- |
| 定位、数字、能力三栏、自述、近况、英文译文、GitHub 地址 | [src/copy.ts](src/copy.ts)。例如更新「现在在做」，分别修改 `copy.zh.now.body` 和 `copy.en.now.body`。 |
| 首屏排版、栏目顺序、手机布局 | [Page.astro](src/components/Page.astro)，两种语言都会生效。 |
| 丝带的形状与动效 | [Ribbon.astro](src/components/Ribbon.astro) |
| 全站配色、字体与链接样式 | [global.css](src/styles/global.css)。字体文件和页面元信息在 [Base.astro](src/layouts/Base.astro)。 |

## 交付时怎么验收

在生产预览里逐项检查。键盘、页面语言和放大阅读的检查方法可参考 [W3C WAI Easy Checks](https://www.w3.org/WAI/test-evaluate/easy-checks/)。

- [ ] 直接打开和刷新两个语言地址都能读到完整内容。点击「English」进入英文页，点击「中文」回到中文页。
- [ ] 在手机宽度下读完开场自述和四个词源，文字没有被裁切。桌面浏览器放大到 200% 后，正文和链接仍可读、可用。
- [ ] 只用 Tab 和 Enter 就能切换语言、打开正确的 GitHub 个人资料，并能看清当前焦点。
- [ ] 切换系统深浅色后，正文与链接清晰可辨。开启「减少动态效果」并刷新，丝带静态显示。
- [ ] 查看生成的 HTML，中文页的 `lang` 为 `zh-Hans`，英文页为 `en`；两页的描述使用各自语言，canonical 链接指向各自的正式地址。

## 发布到 GitHub Pages

仓库的发布流程监听 `main`。首次配置时，在 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。改动合入 `main` 后，在 **Actions → Deploy to GitHub Pages** 查看构建与部署结果；成功后打开页首的两个正式地址复查。本站用自己的域名 `serico.ai`（在 Cloudflare 买的，DNS 也在 Cloudflare），在仓库 **Settings → Pages → Custom domain** 里填；用 GitHub Actions 发布时不需要 `CNAME` 文件。Astro 的 `site` 已配置为 `https://serico.ai`。DNS 怎么配见 [GitHub 官方：管理自定义域名](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)。[仓库发布流程](.github/workflows/deploy.yml) · [Astro 官方部署指南](https://docs.astro.build/en/guides/deploy/github/)

文档结构参考 GitHub 对项目用途和入门说明的建议，以及社区指南中用具体命令和预期结果帮助新协作者上手的做法。[GitHub README 文档](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes) · [Make a README](https://www.makeareadme.com/)
