// @ts-check
import { defineConfig } from 'astro/config';

// Served from the root of the custom domain serico.ai (set in the repo's Settings > Pages), so no `base`.
export default defineConfig({
  site: 'https://serico.ai',
  // English moved from /en/ to / on 2026-11-25. With static output and no adapter, Astro writes
  // dist/en/index.html as a page that forwards visitors with <meta http-equiv="refresh">.
  redirects: {
    '/en': '/',
  },
});
