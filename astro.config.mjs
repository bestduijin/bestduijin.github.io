// @ts-check
import { defineConfig } from 'astro/config';

// Served from the root of the custom domain serico.ai (set in the repo's Settings > Pages), so no `base`.
export default defineConfig({
  site: 'https://serico.ai',
});
