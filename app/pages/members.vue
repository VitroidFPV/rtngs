<script setup lang="ts">
import type { ConvexClient } from "convex/browser"

const props = defineProps<{ client: ConvexClient; admin: boolean }>()
const { t } = useI18n()

watch(
	() => props.admin,
	(admin) => {
		if (!admin) void navigateTo("/", { replace: true })
	},
	{ immediate: true },
)
</script>

<template>
	<MemberManager v-if="admin" :client="client">
		<template #actions>
			<UButton to="/" color="neutral" variant="outline">
				{{ t("backToProducts") }}
			</UButton>
		</template>
	</MemberManager>
</template>
