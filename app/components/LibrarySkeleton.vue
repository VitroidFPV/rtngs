<script setup lang="ts">
const { t } = useI18n()
const density = useCookie("product-grid-density")
</script>

<template>
	<section
		class="space-y-8"
		role="status"
		:aria-label="t('loadingLibrary')"
		aria-busy="true"
	>
		<div class="flex min-h-8 justify-end" aria-hidden="true">
			<USkeleton class="h-8 w-36" />
		</div>
		<div
			class="surface-panel grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
			aria-hidden="true"
		>
			<UFormField
				:label="t('searchProducts')"
				class="col-span-full min-w-0 md:col-span-1"
			>
				<UInput
					disabled
					:placeholder="t('nameBrandOrTag')"
					class="w-full"
				/>
			</UFormField>
			<UFormField
				:label="t('filterByTag')"
				class="col-span-full md:col-span-1"
			>
				<USelect
					disabled
					:items="[t('allTags')]"
					:model-value="t('allTags')"
					class="w-full sm:min-w-40"
				/>
			</UFormField>
			<UFormField :label="t('sortBy')">
				<USelect
					disabled
					:items="[t('newest')]"
					:model-value="t('newest')"
					class="w-full sm:min-w-36"
				/>
			</UFormField>
			<div class="inline-flex justify-self-end gap-1">
				<USkeleton class="size-11 md:size-9" />
				<USkeleton class="size-11 md:size-9" />
			</div>
		</div>
		<ProductGridSkeleton :compact="density === 'compact'" />
	</section>
</template>
