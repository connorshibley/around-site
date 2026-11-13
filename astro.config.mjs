import { defineConfig } from 'astro/config';

// `base` is set at build time when the site is published under a sub-path
// (for example GitHub Pages at /around-site). Locally it is the root.
export default defineConfig({
  base: process.env.SITE_BASE || '/',
  server: { port: 4321 },
});
