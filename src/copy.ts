// Every word shown on the site lives in this file, once per language.
// Change wording here; the page components only lay it out.

export type Lang = 'zh' | 'en';

export const site = {
  url: 'https://serico.ai',
  github: { label: 'github.com/bestduijin', href: 'https://github.com/bestduijin' },
  year: 2026,
};

// A word on the name's journey. `lang` is the BCP 47 tag of the word itself,
// so browsers and screen readers treat it as that language.
type Stop = { word: string; lang: string; from: string; means: string };

// One number in the row under the introduction: the figure, then what it counts.
type Figure = { value: string; label: string };

// One published piece under "Latest": newest first. `where` is the platform, e.g. 公众号, 小红书, YouTube.
type Post = { kind: string; where: string; title: string; date: string; href: string };

// One thing Serico can do, shown as one of three cards.
type Skill = { title: string; body: string };

type Copy = {
  htmlLang: string;
  path: string;
  title: string;
  description: string;
  other: { label: string; href: string; hreflang: string };
  say: string;
  // Pause buttons for the moving parts: the hero scene and the demo video.
  motion: { pause: string; play: string; hero: [string, string]; demo: [string, string] };
  headline: string; // the one line under the wordmark
  intro: string[]; // one sentence per line, under the headline
  figures: Figure[];
  skills: { heading: string; items: Skill[]; demo: string };
  now: { heading: string; body: string[] };
  latest: { heading: string; empty: string; items: Post[] };
  name: { heading: string; motto: string[]; stops: Stop[] };
  find: { heading: string; github: string };
  colophon: string;
};

export const copy: Record<Lang, Copy> = {
  zh: {
    htmlLang: 'zh-Hans',
    path: '/',
    title: 'Serico',
    description: '把生意里的难题，变成能自动跑的系统。贸易、电商出身，用 AI 和代码解决业务问题。',
    other: { label: 'English', href: '/en/', hreflang: 'en' },
    say: '读作 SEH-ri-ko，塞里科',
    motion: { pause: '暂停', play: '播放', hero: ['暂停首屏动画', '播放首屏动画'], demo: ['暂停演示视频', '播放演示视频'] },
    // Version B, picked by the owner on 2026-11-23.
    headline: '把生意里的难题，变成能自动跑的系统。',
    intro: [
      '我不是科班程序员。',
      '我是做贸易、做电商出身的人，知道一个订单从哪里开始出问题。',
      '现在我用 AI 和代码，把这些问题一个个修掉。',
    ],
    // The owner's own figures (2026-11-23).
    figures: [
      { value: '15 年', label: '贸易、电商一线' },
      { value: '5 小时 → 5 分钟', label: '一道重复的活，交给自动化以后' },
      { value: '6 套', label: '正在运行的自动化流程' },
    ],
    skills: {
      heading: '我能做什么',
      demo: '演示：一轮自动选品 → 修图 → 写介绍 → 上架 → 分析，五分钟内跑完。商品和数字是演示用的。',
      items: [
        { title: '看懂流程', body: '从业务一线看出哪一步在浪费人、哪一步最容易出错。' },
        { title: '搭起来', body: '用 AI 和代码把这一步做成工具，不用换掉整套系统。' },
        { title: '让它自己跑', body: '部署上线，定时自动运行，出了问题会提醒人。' },
      ],
    },
    now: {
      heading: '现在在做',
      body: [
        '把做生意时摸到的门道、用 AI 解决问题的办法，写成文章，做成短视频。',
        '新出的 AI 工具，也会自己上手试。',
      ],
    },
    name: {
      heading: '名字的来历',
      // The owner's own words (2026-11-15). Keep verbatim.
      motto: ['名字取意于丝绸。', '过去，丝绸把东方的好东西带向世界；', '今天，我分享自己做产品、做生意、探索新工具的经历。'],
      stops: [
        { word: '丝', lang: 'zh-Hans', from: '汉语', means: '有一种说法，后面这些词都从它来' },
        { word: 'Seres', lang: 'la', from: '拉丁语', means: '产丝的人' },
        { word: 'sericus', lang: 'la', from: '拉丁语', means: '丝的' },
        { word: 'serico', lang: 'it', from: '意大利语', means: '丝的，像丝一样的' },
      ],
    },
    latest: {
      heading: '最新内容',
      empty: '第一批文章和视频正在准备，发布以后会放在这里。',
      // 发布一篇就在最前面加一条，例如：
      // { kind: '文章', where: '公众号', title: '……', date: '2026-12-01', href: 'https://…' },
      items: [],
    },
    find: { heading: '在哪找我', github: 'GitHub' },
    colophon: '这个页面用 Astro 搭建，放在 GitHub Pages 上。',
  },

  en: {
    htmlLang: 'en',
    path: '/en/',
    title: 'Serico',
    description:
      'Turning business headaches into systems that run themselves. From trade and e-commerce to AI and code.',
    other: { label: '中文', href: '/', hreflang: 'zh-Hans' },
    say: 'Say it SEH-ri-ko',
    motion: { pause: 'Pause', play: 'Play', hero: ['Pause the opening animation', 'Play the opening animation'], demo: ['Pause the demo video', 'Play the demo video'] },
    headline: 'Turning business headaches into systems that run themselves.',
    intro: [
      'I am not a trained programmer. I came up through trade and e-commerce, so I know where an order starts to go wrong.',
      'Now I use AI and code to fix those problems, one by one.',
    ],
    figures: [
      { value: '15 years', label: 'on the front line of trade and e-commerce' },
      { value: '5 h → 5 min', label: 'one repetitive job, once it was automated' },
      { value: '6', label: 'automated workflows running today' },
    ],
    skills: {
      heading: 'What I do',
      demo: 'Demo: one round of sourcing → retouch → copy → listing → analytics, done in under five minutes. Products and figures are for illustration.',
      items: [
        { title: 'Read the process', body: 'Spot, from the front line, which step wastes people’s time and which one breaks most often.' },
        { title: 'Build the fix', body: 'Turn that step into a tool with AI and code, without replacing the whole system.' },
        { title: 'Let it run', body: 'Deploy it, run it on a schedule, and alert a person when something goes wrong.' },
      ],
    },
    now: {
      heading: 'Now',
      body: [
        'I write articles and make short videos about what business has taught me, and how AI can solve real problems.',
        'When a new AI tool comes out, I try it myself.',
      ],
    },
    name: {
      heading: 'The name',
      motto: [
        'The name comes from silk.',
        'Silk once carried the best of the East out into the world.',
        'Today I share my own experience of building products, doing business and exploring new tools.',
      ],
      stops: [
        { word: '丝', lang: 'zh-Hans', from: 'Chinese', means: 'silk; by one account, the root of the rest' },
        { word: 'Seres', lang: 'la', from: 'Latin', means: 'the silk people' },
        { word: 'sericus', lang: 'la', from: 'Latin', means: 'of silk' },
        { word: 'serico', lang: 'it', from: 'Italian', means: 'of silk, silken' },
      ],
    },
    latest: {
      heading: 'Latest',
      empty: 'The first articles and videos are on their way. They will appear here once published.',
      items: [],
    },
    find: { heading: 'Find me', github: 'GitHub' },
    colophon: 'Built with Astro, hosted on GitHub Pages.',
  },
};
