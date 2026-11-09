<script setup lang="ts">
import type { ConvexClient } from "convex/browser"
import type { FunctionReturnType } from "convex/server"
import { api } from "../../convex/_generated/api"
const { t } = useI18n()
const localizedError = useLocalizedError()
const props = defineProps<{ client: ConvexClient }>()
const status = ref<FunctionReturnType<typeof api.members.status> | null>(null)
const error = ref("")
const busy = ref(false)
const manage = ref(false)
const stop = props.client.onUpdate(
	api.members.status,
	{},
	(value) => {
		status.value = value
		error.value = ""
	},
	(cause) => {
		status.value = null
		error.value = localizedError(cause)
	},
)
onBeforeUnmount(stop)
async function request() {
	busy.value = true
	error.value = ""
	try {
		await props.client.mutation(api.members.requestAccess, {})
	} catch (cause) {
		error.value = localizedError(cause)
	} finally {
		busy.value = false
	}
}
</script>
<template>
	<div class="space-y-6">
		<UAlert
			v-if="error"
			:title="t('couldNotLoadAccess')"
			:description="error"
			color="error"
			role="alert"
		/>
		<LibrarySkeleton
			v-if="!status && !error"
			:aria-label="t('checkingMembership')"
		/>
		<template v-if="status">
			<MemberManager v-if="status.admin && manage" :client="client">
				<template #actions
					><UButton
						color="neutral"
						variant="outline"
						@click="manage = false"
					>
						{{ t("backToProducts") }}
					</UButton></template
				>
			</MemberManager>
			<ProductLibrary v-else-if="status.member" :client="client">
				<template v-if="status.admin" #actions
					><UButton
						color="neutral"
						variant="outline"
						@click="manage = true"
					>
						{{ t("manageMembers") }}
					</UButton></template
				>
			</ProductLibrary>
			<div
				v-else
				class="surface-panel mx-auto max-w-xl p-6 sm:p-8 space-y-5"
			>
				<div>
					<h1 class="section-title">{{ t("libraryAccess") }}</h1>
					<p class="section-description">
						{{
							t(
								"yourAccountIsConnectedMembershipGivesYouAccessToProductsAndReviews",
							)
						}}
					</p>
				</div>
				<UAlert
					:title="
						status.status === 'pending'
							? t('accessRequested')
							: status.status === 'revoked'
								? t('accessRevoked')
								: t('membersOnly')
					"
					:description="
						status.status === 'pending'
							? t('anApproverNeedsToApproveYourRequest')
							: status.status === 'revoked'
								? t('contactAnApproverToRestoreAccess')
								: t('requestAccessToTheProductLibrary')
					"
					color="neutral"
					variant="subtle"
					role="status"
				/>
				<p class="text-sm text-muted">
					{{ t("discordId") }}
					<span class="font-mono select-all">{{
						status.discordId
					}}</span>
				</p>
				<UButton v-if="!status.status" :loading="busy" @click="request">
					{{ t("requestAccess") }}
				</UButton>
			</div>
		</template>
	</div>
</template>
