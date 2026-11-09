<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		src?: string
		alt: string
		size?: "thumbnail" | "compact" | "detail" | "search"
	}>(),
	{ size: "thumbnail" },
)
const { t } = useI18n()
const failed = ref(false)
const imageUrl = computed(() => {
	try {
		const url = new URL(props.src?.trim() ?? "")
		return ["http:", "https:"].includes(url.protocol) ? url.href : ""
	} catch {
		return ""
	}
})
watch(imageUrl, () => {
	failed.value = false
})
</script>

<template>
	<div
		v-if="imageUrl"
		class="shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
		:class="[
			size === 'search'
				? 'w-full aspect-square rounded-none'
				: size === 'detail'
					? 'size-24 sm:size-36'
					: size === 'compact'
						? 'size-12'
						: 'size-16 sm:size-20',
			failed ? 'bg-muted text-muted' : 'bg-white p-2',
		]"
	>
		<img
			v-if="!failed"
			:key="imageUrl"
			:src="imageUrl"
			:alt="alt"
			loading="lazy"
			referrerpolicy="no-referrer"
			class="w-full h-full object-contain"
			@error="failed = true"
		/>
		<UIcon
			v-else
			name="i-lucide-image-off"
			class="size-5"
			role="img"
			:aria-label="t('imageUnavailable')"
		/>
	</div>
</template>
