<script setup lang="ts">
import { en, cs, sk } from "@nuxt/ui/locale"
const { t, locale, locales, setLocale } = useI18n()
const uiLocale = computed(() => ({ en, cs, sk })[locale.value])
useHead(() => ({
	htmlAttrs: { lang: locale.value },
	title: "rtngs",
	link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
	meta: [
		{
			name: "description",
			content: t("aPrivateProductLibraryForSharingProductsAndRatings"),
		},
	],
}))
const colorMode = useColorMode()
</script>
<template>
	<UApp :locale="uiLocale">
		<UContainer class="max-w-7xl min-h-[100dvh] px-4 sm:px-8">
			<header
				class="app-header flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-default py-5"
			>
				<a
					href="/"
					class="text-2xl font-semibold tracking-tighter text-highlighted rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
					:aria-label="t('rtngsHome')"
					>rtngs<span class="text-primary">.</span></a
				>
				<div class="flex items-center gap-2 sm:gap-4 min-w-0">
					<USelect
						:model-value="locale"
						:items="
							locales.map((item) => ({
								label: item.name,
								value: item.code,
							}))
						"
						:aria-label="t('language')"
						size="sm"
						@update:model-value="setLocale($event)"
					/>
					<div id="account-actions" class="min-w-0" />
					<ClientOnly>
						<UButton
							color="neutral"
							variant="ghost"
							size="sm"
							class="shrink-0"
							@click="
								colorMode.preference =
									colorMode.value === 'dark'
										? 'light'
										: 'dark'
							"
							>{{
								colorMode.value === "dark"
									? t("lightMode")
									: t("darkMode")
							}}</UButton
						>
						<template #fallback
							><USkeleton class="h-8 w-20"
						/></template>
					</ClientOnly>
				</div>
			</header>
			<main class="py-8 sm:pt-12 pb-20">
				<ClientOnly
					><AuthPanel /><template #fallback
						><LibrarySkeleton
							:aria-label="t('loadingLibrary')" /></template
				></ClientOnly>
			</main>
		</UContainer>
	</UApp>
</template>
