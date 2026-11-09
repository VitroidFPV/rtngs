export default defineI18nConfig(() => ({
	fallbackLocale: "en",
	pluralRules: {
		cs: (count: number) =>
			count === 1 ? 0 : count >= 2 && count <= 4 ? 1 : 2,
		sk: (count: number) =>
			count === 1 ? 0 : count >= 2 && count <= 4 ? 1 : 2,
	},
}))
