<script setup lang="ts">
const { t } = useI18n()
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
			class="surface-panel grid grid-cols-1 gap-4 p-4 sm:p-5 sm:grid-cols-[1fr_auto_auto]"
			aria-hidden="true"
		>
			<UFormField :label="t('searchProducts')">
				<UInput
					disabled
					:placeholder="t('nameBrandOrTag')"
					class="w-full"
				/>
			</UFormField>
			<UFormField :label="t('filterByTag')">
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
		</div>
		<div class="flex h-5 items-center" aria-hidden="true">
			<USkeleton class="h-4 w-36" />
		</div>
		<ProductGridSkeleton />
	</section>
</template>
