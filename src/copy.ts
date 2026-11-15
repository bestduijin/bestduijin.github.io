// Every word shown on the site lives in this file, once per language.
// Change wording here; the page components only lay it out.

export type Lang = 'zh' | 'en';

export const site = {
  url: 'https://bestduijin.github.io',
  github: { label: 'github.com/bestduijin', href: 'https://github.com/bestduijin' },
  year: 2026,
};

// A word on the name's journey. `lang` is the BCP 47 tag of the word itself,
// so browsers and screen readers treat it as that language.
type Stop = { word: string; lang: string; from: string; means: string };

type Copy = {
  htmlLang: string;
  path: string;
  title: string;
  description: string;
  other: { label: string; href: string; hreflang: string };
  say: string;
  lead: string[]; // one sentence per line; joined, it is the full introduction
  name: { heading: string; body: string[]; stops: Stop[] };
  now: { heading: string; body: string[] };
  find: { heading: string; github: string };
  colophon: string;
};

export const copy: Record<Lang, Copy> = {
  zh: {
    htmlLang: 'zh-Hans',
    path: '/',
    title: 'Serico',
    description: 'Serico，名字取意于丝绸。分享做产品、做生意、探索新工具的经历。',
    other: { label: 'English', href: '/en/', hreflang: 'en' },
    say: '读作 SEH-ri-ko，塞里科',
    // The owner's own words (2026-11-15). Keep verbatim.
    lead: ['名字取意于丝绸。', '过去，丝绸把东方的好东西带向世界；', '今天，我分享自己做产品、做生意、探索新工具的经历。'],
    name: {
      heading: '名字的来历',
      body: [
        'Serico 是意大利语，意思是「丝的」「像丝一样的」。它来自拉丁语 sericus，再往前是 Seres：古罗马人这样称呼东方那些产丝的人。',
        '丝绸往西走了几千公里，这个词跟着走了两千年。我借它做名字。',
      ],
      stops: [
        { word: '丝', lang: 'zh-Hans', from: '汉语', means: '有一种说法，后面这些词都从它来' },
        { word: 'Seres', lang: 'la', from: '拉丁语', means: '产丝的人' },
        { word: 'sericus', lang: 'la', from: '拉丁语', means: '丝的' },
        { word: 'serico', lang: 'it', from: '意大利语', means: '丝的，像丝一样的' },
      ],
    },
    now: {
      heading: '现在在做',
      body: [
        '用代码做短视频：文案、配音、画面都由脚本生成。做过科普、商业拆解，还有一支动画短片。',
        '新出的 AI 工具，也会自己上手试。',
      ],
    },
    find: { heading: '在哪找我', github: 'GitHub' },
    colophon: '这个页面用 Astro 搭建，放在 GitHub Pages 上。',
  },

  en: {
    htmlLang: 'en',
    path: '/en/',
    title: 'Serico',
    description:
      'Serico. The name comes from silk. Notes from building products, doing business and exploring new tools.',
    other: { label: '中文', href: '/', hreflang: 'zh-Hans' },
    say: 'Say it SEH-ri-ko',
    lead: [
      'The name comes from silk.',
      'Silk once carried the best of the East out into the world.',
      'Today I share my own experience of building products, doing business and exploring new tools.',
    ],
    name: {
      heading: 'The name',
      body: [
        'Serico is Italian for “of silk”, or “silken”. It comes from the Latin sericus, and before that from Seres, the Romans’ name for the people of the East who made silk.',
        'Silk travelled thousands of kilometres west. The word has been travelling for two thousand years. I borrowed it.',
      ],
      stops: [
        { word: '丝', lang: 'zh-Hans', from: 'Chinese', means: 'silk; by one account, the root of the rest' },
        { word: 'Seres', lang: 'la', from: 'Latin', means: 'the silk people' },
        { word: 'sericus', lang: 'la', from: 'Latin', means: 'of silk' },
        { word: 'serico', lang: 'it', from: 'Italian', means: 'of silk, silken' },
      ],
    },
    now: {
      heading: 'Now',
      body: [
        'I make short videos with code: scripts generate the text, the voice-over and the pictures. So far, a few explainers, some business breakdowns and one animated short.',
        'When a new AI tool comes out, I try it myself.',
      ],
    },
    find: { heading: 'Find me', github: 'GitHub' },
    colophon: 'Built with Astro, hosted on GitHub Pages.',
  },
};
