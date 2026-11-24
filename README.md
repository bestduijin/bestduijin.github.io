# Serico 个人主页

这是 Serico 的中英双语个人名片。第一次来的人，应当能读懂 Serico 这个名字、知道站主最近在做什么，并找到他的 GitHub。仓库里已有可运行的 Astro 静态站，可以直接在现有页面上调整设计。[中文首页](https://serico.ai/) · [English](https://serico.ai/en/) · [源码仓库](https://github.com/bestduijin/bestduijin.github.io)

## 页面要讲什么

中文在 `/`，英文在 `/en/`，两页共用布局。首屏右上角提供语言切换。2026-11-23 起，首屏讲站主的定位：贸易、电商出身，用 AI 和代码解决业务问题（站主选的 B 版文案）。只讲能力，不讲给哪家公司搭过什么系统。首屏的三个数字是站主本人给的，改之前先问站主。

站主定稿的自述放在页面最后的「名字的来历」里，请保留原文：

> 名字取意于丝绸。
>
> 过去，丝绸把东方的好东西带向世界；
>
> 今天，我分享自己做产品、做生意、探索新工具的经历。

| 从上到下 | 访客看到的内容 |
| --- | --- |
| 首屏 | 背景是一幅插画：夜里的沙漠和驼队，天上流过一条条发光的丝带，一路连到远处的城市（丝绸之路变成网络）。上面有程序画的光：光点顺着丝带流、星星闪、偶尔有流星、驼队的灯笼闪、城市的光在呼吸，整幅画缓慢推近。前面是 Serico 字标、读音、一句定位、两三句自我介绍、三个数字。右上角有暂停按钮。 |
| 我能做什么 | 看懂流程、搭起来、让它自己跑，三张卡片并排（边框是首屏丝带的粉、金、青渐变，各配一个线条图标），手机上竖排。下面一段 15 秒循环的演示视频：深色「自动化运营台」跑一轮自动选品 → 修图 → 写介绍 → 上架 → 分析（商品和数字是编的），滚到这里才播，可以暂停。 |
| 现在在做 | 把做生意的门道、用 AI 解决问题的办法写成文章、做成短视频，也会亲自试用新出的 AI 工具。 |
| 最新内容 | 发布过的文章、视频，新的在前。还没有时显示一句「正在准备」。加一条：在 `src/copy.ts` 的 `latest.items` 最前面加 `{ kind, where, title, date, href }`，中英文各加一次。 |
| 在哪找我 | 链接到站主的 [GitHub 个人资料](https://github.com/bestduijin)。 |
| 名字的来历 | 页面收尾：站主的自述原文，加一条「丝 → Seres → sericus → serico」的词源线。保留原文对汉语词源「有一种说法」的限定。 |

## 视觉与阅读体验

现有设计从名字里的「丝」取材。西文用随站点加载的 Bodoni Moda 斜体做字标，中文正文用设备上的宋体。首屏固定是深色（压在夜空插画上），往下的正文浅色版用月白底、鸦青字，一根胭脂红线贯穿词源。Bodoni Moda 通过 Fontsource 打包，字体许可为 SIL Open Font License 1.1。

桌面上，四个词从左到右读；手机上改为纵向排列，让每个词和解释相邻。深色版随系统切换。

首屏插画在 `public/hero/`：`hero_wide.webp`（宽屏）、`hero_tall.webp`（宽高比小于 3:4 的手机），是用 Codex 订阅出的图，提示词和草稿在 `B003/个人主页_插画/`。上面的光是 [src/scripts/sky.ts](src/scripts/sky.ts) 用 canvas 画的，丝带、驼队、城市的位置是照两张画描的坐标，**换了画就要重描**。

「我能做什么」下面的演示视频在 `public/cover/`（中英各一条横版，约 0.7 MB，配一张封面图），是用代码做的：画面在 `B003/讲解视频/主页封面_自动化大屏/ui/screen.html`，在那个文件夹里跑 `python3 make_cover.py` 出片，`--publish` 拷进本仓库。

两处会动的地方都有暂停按钮（WCAG 2.2.2），只在滚到眼前时才动；开了「减少动态效果」就不自动动，访客自己点「播放」才动。原来的丝带 [Ribbon.astro](src/components/Ribbon.astro) 现在没用上，留着备用。

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
| 首屏插画、动的光、暂停按钮 | 插画换 `public/hero/` 里的图；光在 [sky.ts](src/scripts/sky.ts)；排版和暂停在 [Page.astro](src/components/Page.astro) 的 `.scene`、`.motion-toggle` |
| 演示视频 | 在 `B003/讲解视频/主页封面_自动化大屏/` 改了重出，`--publish` 拷进来 |
| 全站配色、字体与链接样式 | [global.css](src/styles/global.css)。字体文件和页面元信息在 [Base.astro](src/layouts/Base.astro)。 |

## 交付时怎么验收

在生产预览里逐项检查。键盘、页面语言和放大阅读的检查方法可参考 [W3C WAI Easy Checks](https://www.w3.org/WAI/test-evaluate/easy-checks/)。

- [ ] 直接打开和刷新两个语言地址都能读到完整内容。点击「English」进入英文页，点击「中文」回到中文页。
- [ ] 在手机宽度下读完开场自述和四个词源，文字没有被裁切。桌面浏览器放大到 200% 后，正文和链接仍可读、可用。
- [ ] 只用 Tab 和 Enter 就能切换语言、打开正确的 GitHub 个人资料，并能看清当前焦点。
- [ ] 切换系统深浅色后，正文与链接清晰可辨。首屏的字压在插画上仍然看得清；首屏和演示视频各点一次「暂停」都会停、按钮变「播放」。开启「减少动态效果」并刷新，两处都不自己动。
- [ ] 查看生成的 HTML，中文页的 `lang` 为 `zh-Hans`，英文页为 `en`；两页的描述使用各自语言，canonical 链接指向各自的正式地址。

## 发布到 GitHub Pages

仓库的发布流程监听 `main`。首次配置时，在 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。改动合入 `main` 后，在 **Actions → Deploy to GitHub Pages** 查看构建与部署结果；成功后打开页首的两个正式地址复查。本站用自己的域名 `serico.ai`（在 Cloudflare 买的，DNS 也在 Cloudflare），在仓库 **Settings → Pages → Custom domain** 里填；用 GitHub Actions 发布时不需要 `CNAME` 文件。Astro 的 `site` 已配置为 `https://serico.ai`。DNS 怎么配见 [GitHub 官方：管理自定义域名](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)。[仓库发布流程](.github/workflows/deploy.yml) · [Astro 官方部署指南](https://docs.astro.build/en/guides/deploy/github/)

文档结构参考 GitHub 对项目用途和入门说明的建议，以及社区指南中用具体命令和预期结果帮助新协作者上手的做法。[GitHub README 文档](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes) · [Make a README](https://www.makeareadme.com/)
