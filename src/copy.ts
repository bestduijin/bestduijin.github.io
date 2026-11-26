// Every word shown on the site lives in this file, once per language.
// Change wording here; the page components only lay it out.

export type Lang = 'zh' | 'en';

export const site = {
  url: 'https://serico.ai',
  year: 2026,
};

// A word on the name's journey. `lang` is the BCP 47 tag of the word itself,
// so browsers and screen readers treat it as that language.
type Stop = { word: string; lang: string; from: string; means: string };

// One number in the row under the headline: the figure, a one-word tag beside it, and the
// section of the page it leads to (the `id` of that section's heading in Page.astro).
type Figure = { value: string; tag: string; to: 'signs' | 'work' | 'demo' };

// One published piece under "Latest": newest first. `where` is the platform, e.g. 公众号, 小红书, YouTube.
type Post = { kind: string; where: string; title: string; date: string; href: string };

// One of the four steps under the approach, numbered 01–04 on the page; also used, unnumbered,
// for the three situations at the top and the three things not handed to AI.
type Step = { title: string; body: string };

// One row of the table under the demo video, numbered 01–05 like the stages in the video.
type Stage = { name: string; before: string; machine: string; person: string };

// A way to reach the owner, in the footer (e.g. an e-mail address).
type Link = { label: string; href: string };

type Copy = {
  htmlLang: string;
  path: string;
  title: string;
  description: string;
  other: { label: string; href: string; hreflang: string };
  // Pause buttons for the moving parts: the hero scene and the demo video.
  // The scene's button shows its own words (`hero`: pause, play); the video's shows `pause` / `play`
  // and is named in full for screen readers (`demo`).
  motion: { pause: string; play: string; hero: [string, string]; demo: [string, string] };
  // Read aloud after a stage's name in the table under the video, once the name is a button.
  seek: string;
  // The large heading under the wordmark: two lines, a short one and a long one.
  headline: [string, string];
  figures: Figure[];
  // Below the opening scene, top to bottom. Each `heading` is the section's one large line.
  signs: { heading: string; items: Step[] };
  work: { heading: string; steps: Step[] };
  // `lead` sits between the heading and the video; `columns` heads the table under it
  // (stage, before, machine, person); `short` labels the three cells on phones, where each stage
  // is a block of its own; `bridge` and `disclaimer` follow the table.
  demo: { heading: string; lead: string; columns: [string, string, string, string]; short: [string, string, string]; stages: Stage[]; bridge: string; disclaimer: string };
  limits: { heading: string; items: Step[] };
  now: { heading: string; body: string[] };
  // Not shown at all while `items` is empty.
  latest: { heading: string; items: Post[] };
  // `heading` is for screen readers only; on screen the section opens with the motto.
  name: { heading: string; motto: string[]; stops: Stop[] };
  // Not shown at all while `links` is empty.
  find: { heading: string; links: Link[] };
  top: string; // "back to top", in the footer
};

// A one-line note under the language link, offered when the visitor's browser prefers
// the site's other language. It is written in the visitor's language, not the page's,
// so each one carries its own `lang`. `to` is the page it links to.
type Hint = { lang: string; text: string; action: string; close: string; to: Lang };

export const hints: Record<'zh-Hans' | 'zh-Hant' | 'en', Hint> = {
  'zh-Hans': { lang: 'zh-Hans', text: '本页有中文版', action: '切换', close: '关闭提示', to: 'zh' },
  'zh-Hant': { lang: 'zh-Hant', text: '本頁有簡體中文版', action: '切換', close: '關閉提示', to: 'zh' },
  en: { lang: 'en', text: 'This page is available in English', action: 'Switch', close: 'Dismiss', to: 'en' },
};

export const copy: Record<Lang, Copy> = {
  zh: {
    htmlLang: 'zh-Hans',
    path: '/zh/',
    title: 'Serico',
    description: 'Serico。电商人。生意难题进，赚钱的 AI 系统出。',
    other: { label: 'English', href: '/', hreflang: 'en' },
    motion: { pause: '暂停', play: '播放', hero: ['暂停动画', '播放动画'], demo: ['暂停演示视频', '播放演示视频'] },
    // The owner's final wording (2026-11-26, second round). The second line is one in, one out:
    // it may break only at its comma.
    headline: ['Serico。电商人。', '生意难题进，赚钱的 AI 系统出。'],
    // The owner's own figures (2026-11-23); tags and links 2026-11-26.
    figures: [
      { value: '15 年', tag: '电商', to: 'signs' },
      { value: '5 小时 → 5 分钟', tag: '效率', to: 'work' },
      { value: '6 套', tag: '流程', to: 'demo' },
    ],
    seek: '，在视频里看这一步',
    // Below the opening scene: wording from 个人主页_改版/agy/文案_v3.md (the 推荐 versions), 2026-11-26;
    // the bodies of the situations, the four steps and the three limits from 文案_v3_精简.md (with the
    // owner's own wording for situation 2 and step 4),
    // except the approach's heading (kept from v2) and the bridge under the table (the owner's wording).
    signs: {
      heading: '生意做久了，拖慢人的往往不是大事。',
      items: [
        {
          title: '同一份资料，在不同地方反复抄改',
          body: '规格、图片和报价改完一次，还要往各平台和表格里重填。人累在搬运，错也大多出在这里。',
        },
        {
          title: '熟练员工的大半时间，耗在有规律的机械活上',
          body: '筛清单、套格式、整理多渠道资料，天天要干、路数固定，却绑着最懂业务的人，没空盯客户和产品。',
        },
        {
          title: '散在各处的小异常，总要等出了错才有人知道',
          body: '库存见底、字段漏填、渠道慢半拍，平时没人逐项核对，往往等耽误了订单才开始救火。',
        },
      ],
    },
    work: {
      heading: '不用换掉整套系统，只把最卡的那一步重做。',
      steps: [
        {
          title: '把一单活从头到尾摊开',
          body: '不先看工具，按业务真实走法把一件事拆成几道工序，看清时间耗在哪、哪段全靠人兜底。',
        },
        {
          title: '先挑最值得动的那一步',
          body: '选同时满足三点的：每周反复发生、做法能讲给新人听懂、对错一眼能核对。风险最小，见效最快。',
        },
        {
          title: '只重做这一步，接回现有做法',
          body: '只给这一个卡点做自动流转，直接接上团队顺手的表格和渠道，不推倒重来，也不用重学新软件。',
        },
        {
          title: '让它安静自己跑，跑稳了再动下一步',
          body: '该人拍板的依然留给人，平时不用专人盯着；缺资料或出异常，第一时间用大白话提醒人接手。',
        },
      ],
    },
    demo: {
      heading: '五道工序，五分钟内跑完。',
      lead: '这段演示把电商上新拆成五道工序：机器接走重复的活，拿主意的地方留给人。',
      columns: ['工序', '原来靠人怎么耗', '现在机器做什么', '人留着管什么'],
      short: ['原来', '机器', '人'],
      // In the order of the video's five stages, three seconds each.
      stages: [
        { name: '选品', before: '人工翻榜单、查竞品、逐行填表比对', machine: '按定好的口径自动扫描并筛出候选清单', person: '拍板到底做哪一款、押不押货' },
        { name: '修图', before: '一张张抠图、调光线、再凑场景图', machine: '按统一画面规格批量处理成可用主图', person: '抽看成片质感，定品牌视觉标准' },
        { name: '写介绍', before: '对着同款货，按不同渠道重写标题和卖点', machine: '按产品信息生成各渠道可用的初稿与属性', person: '校对关键承诺，敲定对客人的口吻' },
        { name: '上架', before: '登录一个个后台，重复上传图文、填价格', machine: '一次整理好资料，同步推送到多个渠道', person: '核对最终售价，决定什么时候上线' },
        { name: '分析', before: '定期导表、拼数据，再一条条翻哪里不对', machine: '自动汇总表现数据，把明显异动直接挑出来', person: '决定哪些款继续加推，哪些该止损停掉' },
      ],
      bridge: '上面这五道，是拿电商上新举的例子。做外贸里常见的一些重复活，比如整理多语种产品资料和报价单、给常规询盘做初步归类、发货前核对单证明细，拆解和分工的思路完全一样。',
      disclaimer: '画面里的商品和数字仅作演示。',
    },
    limits: {
      heading: '有三件事，我不交给 AI。',
      // No order among the three: not numbered.
      items: [
        {
          title: '定价、让利与关键谈判',
          body: '账可以让机器先算清，但对重要客户要不要让步、怎么护住长期关系，必须负责人自己定。',
        },
        {
          title: '押注新品与备货拍板',
          body: 'AI 能把趋势、竞品和历史账摊整齐，但掏钱开模、压库存的风险老板自己扛，最后一锤必须人敲。',
        },
        {
          title: '自己还没理清的临时活',
          body: '偶尔一次的杂事，或连自己都没定好规矩的活，别硬上自动化。路没通就给机器，只会乱得更快。',
        },
      ],
    },
    now: {
      heading: '把跑通的思路，一点点讲清楚。',
      body: [
        '这些年做贸易、做电商摸出来的门道，和用 AI 理顺具体环节的思路，我正在一条条写成文章、做成短视频。',
        '不讲空泛概念，也不堆用不上的技术细节，只说清什么活值得做、怎么判断、哪里容易吃亏。新出的 AI 工具我也会讲：亲手试过的说体验，没试过的照实说明。',
      ],
    },
    latest: {
      heading: '最新内容',
      // 发布一篇就在最前面加一条（中英文各加一次），这一段就会出现，例如：
      // { kind: '文章', where: '公众号', title: '……', date: '2026-12-01', href: 'https://…' },
      items: [],
    },
    name: {
      heading: '名字的来历',
      // The owner's own words (2026-11-15). Keep verbatim.
      motto: ['名字取意于丝绸。', '过去，丝绸把东方的好东西带向世界；', '今天，我分享自己做产品、做生意、探索新工具的经历。'],
      stops: [
        { word: '丝', lang: 'zh-Hans', from: '汉语', means: '有一种说法，后面这些词都从它而来' },
        { word: 'Seres', lang: 'la', from: '拉丁语', means: '产丝的人' },
        { word: 'sericus', lang: 'la', from: '拉丁语', means: '丝的' },
        { word: 'serico', lang: 'it', from: '意大利语', means: '丝的，像丝一样的' },
      ],
    },
    // 先不留联系方式（站主 2026-11-26 定）。有了域名邮箱，在 `links` 里加一条（中英文各加一次），
    // 页尾就会出现「在哪找我」这一行，例如：{ label: '……@serico.ai', href: 'mailto:……@serico.ai' }
    find: { heading: '在哪找我', links: [] },
    top: '回到顶部',
  },

  en: {
    htmlLang: 'en',
    path: '/',
    title: 'Serico',
    description: 'Serico. Ecommerce. Business problems in. Profitable AI systems out.',
    other: { label: '中文', href: '/zh/', hreflang: 'zh-Hans' },
    motion: { pause: 'Pause', play: 'Play', hero: ['Pause motion', 'Play motion'], demo: ['Pause the demo video', 'Play the demo video'] },
    // The owner's final wording (2026-11-26, second round); the second line may break only after "in.".
    headline: ['Serico. Ecommerce.', 'Business problems in. Profitable AI systems out.'],
    figures: [
      { value: '15 years', tag: 'ecommerce', to: 'signs' },
      { value: '5 h → 5 min', tag: 'efficiency', to: 'work' },
      { value: '6', tag: 'workflows', to: 'demo' },
    ],
    seek: ', watch this step in the video',
    signs: {
      heading: 'What slows a business down is rarely one big crisis.',
      items: [
        {
          title: 'The same information copied from place to place',
          body: 'Update specs, photos, or prices once, then re-enter them into every platform and sheet. Hours vanish in copying, and most errors start there.',
        },
        {
          title: 'Experienced people tied up in routine groundwork',
          body: 'Sorting lists, formatting files, and prepping channel data repeat every day by fixed rules, and they tie up the people who know the business best.',
        },
        {
          title: 'Small slips that stay invisible until an order goes wrong',
          body: 'Low stock, missing fields, or a slow channel go unchecked day to day, so teams only start firefighting once an order is already delayed.',
        },
      ],
    },
    work: {
      heading: 'Keep what works. Rebuild only what slows you down.',
      steps: [
        {
          title: 'Lay the whole job out from start to finish',
          body: 'Start with how the work actually runs, not a tool. Break one job into clear steps to see where time leaks and where people carry the load.',
        },
        {
          title: 'Pick the single step worth fixing first',
          body: 'Pick the step that repeats weekly, can be explained to a new hire, and is verifiable at a glance. Lowest risk, fastest clear result.',
        },
        {
          title: 'Rebuild only that step inside your current workflow',
          body: 'Automate just that bottleneck and plug it into the sheets and channels your team already uses. No tearing everything down, and no new software to learn.',
        },
        {
          title: 'Let it run quietly, then move to the next step',
          body: 'Keep human sign-off where decisions matter and let routine runs stay silent. If data is missing or off, it flags a person immediately in plain language.',
        },
      ],
    },
    demo: {
      heading: 'Five steps, done in under five minutes.',
      lead: 'This demo breaks a product launch into five steps. The machine takes the repetitive work, and a person keeps every decision.',
      columns: ['Step', 'Before (by hand)', 'What the machine handles', 'Where a person stays in charge'],
      short: ['Before', 'Machine', 'Person'],
      stages: [
        { name: 'Source', before: 'Browsing trends, checking rivals, and filling sheets line by line', machine: 'Scans signals against set criteria and shortlists candidates', person: 'Deciding which products are actually worth backing' },
        { name: 'Retouch', before: 'Cutting backgrounds, balancing light, and staging photos one by one', machine: 'Processes and formats clean product visuals in batches', person: 'Spot-checking finished images and setting the visual standard' },
        { name: 'Describe', before: 'Rewriting titles, features, and attributes for every channel', machine: 'Drafts structured titles, bullet points, and specs for each store', person: 'Checking claims and owning the voice that speaks to buyers' },
        { name: 'List', before: 'Logging into each back office to upload assets and retype fields', machine: 'Publishes the prepared package across channels in one pass', person: 'Approving final pricing and launch timing' },
        { name: 'Analyse', before: 'Exporting reports, stitching tables, and hunting for drops', machine: 'Pulls performance numbers together and flags clear changes', person: 'Deciding what to double down on and what to cut' },
      ],
      bridge: 'These five steps use an ecommerce product launch as the example. The same logic applies to recurring export work such as preparing multilingual product sheets and quotes, sorting routine inquiries, or checking shipping documents before dispatch.',
      disclaimer: 'The products and numbers shown are simulated for demonstration.',
    },
    limits: {
      heading: 'Three things I do not hand over to AI.',
      items: [
        {
          title: 'Pricing, discounts, and key negotiations',
          body: 'A system can run the numbers first, but deciding whether to bend for a key buyer and protect a long-term relationship must stay with the owner.',
        },
        {
          title: 'Betting on new products and inventory',
          body: 'AI can lay out trends, rivals, and past sales cleanly. When real cash is on the line for tooling and stock, the final call belongs to the owner.',
        },
        {
          title: 'One-off work with no clear rules yet',
          body: 'Rare one-off tasks, or jobs whose rules are still unclear, should not be automated. Handing an unsettled process to a machine only spreads the mess faster.',
        },
      ],
    },
    now: {
      heading: 'Sharing the thinking that holds up in real work.',
      body: [
        'I write articles and make short videos about what years in trade and ecommerce have taught me, and how to think about using AI in everyday operations.',
        'No hype and no dense technical walkthroughs. Just what is worth automating, how to judge each step, and where it can cost you. I cover new AI tools too: hands-on notes where I have tested them, and a plain statement where I have not.',
      ],
    },
    latest: {
      heading: 'Latest',
      items: [],
    },
    name: {
      heading: 'The name',
      motto: [
        'The name comes from silk.',
        'Silk once carried the best of the East out into the world.',
        'Today, I share my own experience of building products, doing business, and exploring new tools.',
      ],
      stops: [
        { word: '丝', lang: 'zh-Hans', from: 'Chinese', means: 'Silk. By one account, the root of the words that followed.' },
        { word: 'Seres', lang: 'la', from: 'Latin', means: 'The silk people' },
        { word: 'sericus', lang: 'la', from: 'Latin', means: 'Of silk' },
        { word: 'serico', lang: 'it', from: 'Italian', means: 'Of silk, silken' },
      ],
    },
    find: { heading: 'Find me', links: [] },
    top: 'Back to top',
  },
};
