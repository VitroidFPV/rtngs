export default defineNuxtConfig({
	compatibilityDate: "2026-11-09",
	modules: ["@nuxt/ui", "@nuxt/eslint", "@nuxtjs/i18n"],
	i18n: {
		defaultLocale: "en",
		strategy: "no_prefix",
		locales: [
			{ code: "en", language: "en", name: "English", file: "en.json" },
			{ code: "cs", language: "cs-CZ", name: "Čeština", file: "cs.json" },
			{
				code: "sk",
				language: "sk-SK",
				name: "Slovenčina",
				file: "sk.json",
			},
		],
		detectBrowserLanguage: { useCookie: true, redirectOn: "all" },
	},
	css: ["~/assets/css/main.css"],
	runtimeConfig: {
		public: {
			convexUrl: process.env.CONVEX_URL ?? "",
			convexSiteUrl: process.env.CONVEX_SITE_URL ?? "",
		},
	},
	devtools: { enabled: false },
})
