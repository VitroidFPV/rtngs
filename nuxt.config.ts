export default defineNuxtConfig({
  compatibilityDate: '2026-11-09',
  modules: ['@nuxt/ui'],
  ui: { fonts: false },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      convexUrl: process.env.CONVEX_URL ?? '',
      convexSiteUrl: process.env.CONVEX_SITE_URL ?? '',
    },
  },
  devtools: { enabled: false },
})
