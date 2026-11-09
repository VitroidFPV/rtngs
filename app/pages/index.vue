<script setup lang="ts">
import type { ConvexClient } from "convex/browser"

defineProps<{ client: ConvexClient; admin: boolean }>()
const { t } = useI18n()
</script>

<template>
	<ProductLibrary :client="client">
		<template v-if="admin" #actions>
			<UButton to="/members" color="neutral" variant="outline">
				{{ t("manageMembers") }}
			</UButton>
		</template>
	</ProductLibrary>
</template>
