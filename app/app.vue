<script setup lang="ts">
useHead({
	title: "rtngs",
	link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
	meta: [
		{
			name: "description",
			content:
				"A private product library for sharing products and ratings.",
		},
	],
})
const colorMode = useColorMode()
</script>
<template>
	<UApp>
		<UContainer class="max-w-5xl min-h-[100dvh] px-4 sm:px-8">
			<header
				class="app-header flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-default py-5"
			>
				<a
					href="/"
					class="text-2xl font-semibold tracking-tighter text-highlighted rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
					aria-label="rtngs home"
					>rtngs<span class="text-primary">.</span></a
				>
				<div class="flex items-center gap-2 sm:gap-4 min-w-0">
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
									? "Light mode"
									: "Dark mode"
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
						><USkeleton
							class="h-48 w-full"
							aria-label="Loading library" /></template
				></ClientOnly>
			</main>
		</UContainer>
	</UApp>
</template>
