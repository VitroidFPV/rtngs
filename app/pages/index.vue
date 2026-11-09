<script setup lang="ts">
import type { ConvexClient } from "convex/browser"
import { api } from "../../convex/_generated/api"

const props = defineProps<{ client: ConvexClient; admin: boolean }>()
const { t } = useI18n()
const pendingRequests = ref(0)

watch(
	() => [props.client, props.admin] as const,
	([client, admin], _, onCleanup) => {
		pendingRequests.value = 0
		if (!admin) return
		onCleanup(
			client.onUpdate(
				api.members.list,
				{},
				(members) => {
					pendingRequests.value = members.filter(
						(member) =>
							member.status === "pending" && !member.isAdmin,
					).length
				},
				() => {
					pendingRequests.value = 0
				},
			),
		)
	},
	{ immediate: true },
)
</script>

<template>
	<ProductLibrary :client="client">
		<template v-if="admin" #actions>
			<UButton to="/members" color="neutral" variant="outline">
				{{ t("manageMembers") }}
				<UBadge
					v-if="pendingRequests"
					color="error"
					size="xs"
					:aria-label="
						t('pendingJoinRequests', { count: pendingRequests })
					"
				>
					{{ pendingRequests }}
				</UBadge>
			</UButton>
		</template>
	</ProductLibrary>
</template>
