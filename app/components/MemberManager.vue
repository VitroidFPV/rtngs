<script setup lang="ts">
import type { ConvexClient } from 'convex/browser'
import type { FunctionReturnType } from 'convex/server'
import { api } from '../../convex/_generated/api'
import { productError } from '../utils/product-error'
const props = defineProps<{ client: ConvexClient }>()
const members = ref<FunctionReturnType<typeof api.members.list> | null>(null)
const error = ref('')
const busy = ref(false)
const discordId = ref('')
const confirming = ref<string | null>(null)
const stop = props.client.onUpdate(api.members.list, {}, value => { members.value = value; error.value = '' }, cause => {
  members.value = null
  error.value = productError(cause).message
})
onBeforeUnmount(stop)
async function decide(id: string, approve: boolean) {
  busy.value = true
  error.value = ''
  try {
    await props.client.mutation(api.members.decide, { discordId: id.trim(), approve })
    discordId.value = ''
    confirming.value = null
  } catch (cause) { error.value = productError(cause).message }
  finally { busy.value = false }
}
</script>
<template>
  <section class="space-y-6">
    <h1 class="text-3xl font-semibold tracking-tight">Members</h1>
    <UAlert v-if="error" title="Could not manage members" :description="error" color="error" role="alert" />
    <form class="flex flex-wrap items-end gap-3" @submit.prevent="decide(discordId, true)">
      <UFormField label="Discord user ID" help="Approve someone directly by their Discord ID."><UInput v-model="discordId" required pattern="[0-9]{17,20}" inputmode="numeric" class="w-full sm:w-64" /></UFormField>
      <UButton type="submit" :loading="busy">Approve</UButton>
      <UButton color="neutral" variant="outline" :disabled="busy || !/^[0-9]{17,20}$/.test(discordId.trim())" @click="confirming = discordId.trim()">Revoke</UButton>
    </form>
    <USkeleton v-if="!members && !error" class="h-40 w-full" aria-label="Loading members" />
    <p v-else-if="members?.length === 0" class="text-muted">No access requests or approvals yet.</p>
    <div v-for="member in members" :key="member._id" class="border-t border-default py-5 flex flex-wrap items-center justify-between gap-4">
      <div class="space-y-1 min-w-0">
        <p class="font-medium break-words">{{ member.name }}</p>
        <p class="font-mono text-sm text-muted select-all">{{ member.discordId }}</p>
        <UBadge color="neutral" variant="subtle">{{ member.isAdmin ? 'Approver' : member.status }}</UBadge>
        <p v-if="member.approvedBy" class="text-xs text-muted">Approved by <span class="font-mono">{{ member.approvedBy }}</span> on {{ new Date(member.approvedAt!).toLocaleDateString() }}</p>
      </div>
      <div v-if="!member.isAdmin" class="flex gap-2">
        <UButton v-if="member.status !== 'approved'" :disabled="busy" @click="decide(member.discordId, true)">Approve</UButton>
        <UButton v-if="member.status !== 'revoked'" color="neutral" variant="outline" :disabled="busy" @click="confirming = member.discordId">{{ member.status === 'pending' ? 'Decline' : 'Revoke' }}</UButton>
      </div>
    </div>
    <UModal :open="Boolean(confirming)" title="Revoke access?" description="This account will lose access to the product library." @update:open="value => { if (!value) confirming = null }">
      <template #body><div class="space-y-4"><p class="font-mono break-all">{{ confirming }}</p><p v-if="error" class="text-error" role="alert">{{ error }}</p><div class="flex justify-end gap-2"><UButton color="neutral" variant="ghost" :disabled="busy" @click="confirming = null">Cancel</UButton><UButton :loading="busy" @click="decide(confirming!, false)">Revoke access</UButton></div></div></template>
    </UModal>
  </section>
</template>
