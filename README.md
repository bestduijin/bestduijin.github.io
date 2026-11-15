# Serico

Serico 的个人主页。用 Astro 生成的静态站，发布在 GitHub Pages：<https://bestduijin.github.io/>

Serico's personal homepage. A static site built with Astro and published on GitHub Pages.

## 东西在哪

| 位置 | 是什么 |
|---|---|
| `src/copy.ts` | 页面上所有的字，中文、英文各一份。改文字只改这里 |
| `src/components/Page.astro` | 整个页面的排版 |
| `src/components/Ribbon.astro` | 开头那条丝带，构建时算出来的 SVG，浏览器里不跑脚本 |
| `src/layouts/Base.astro` | 页面头部信息和字体 |
| `src/styles/global.css` | 颜色、字体、链接样式 |
| `.github/workflows/deploy.yml` | 推到 `main` 后自动构建、发布 |

## 怎么跑

```bash
npm install
npm run dev      # 本机预览，http://localhost:4321
npm run build    # 生成到 dist/
```

需要 Node 22.23.4 以上。

## 字体

西文用 Bodoni Moda（SIL Open Font License 1.1），通过 Fontsource 的 npm 包随站点一起发布。中文用访客设备自带的宋体。
