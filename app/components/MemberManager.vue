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
const confirmingMember = computed(() => members.value?.find(member => member.discordId === confirming.value))
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
    <div class="section-header">
      <div><h1 class="section-title">Members</h1><p class="section-description">Manage who can browse, add products, and share ratings.</p></div>
      <div class="section-actions"><slot name="actions" /></div>
    </div>
    <UAlert v-if="error" title="Could not manage members" :description="error" color="error" role="alert" />
    <form class="surface-panel flex flex-wrap items-end gap-3 p-5 sm:p-6" @submit.prevent="decide(discordId, true)">
      <UFormField class="w-full sm:w-auto" label="Discord user ID" help="Approve someone directly by their Discord ID."><UInput v-model="discordId" required pattern="[0-9]{17,20}" inputmode="numeric" class="w-full sm:w-64" /></UFormField>
      <UButton type="submit" :loading="busy">Approve</UButton>
      <UButton color="neutral" variant="outline" :disabled="busy || !/^[0-9]{17,20}$/.test(discordId.trim())" @click="confirming = discordId.trim()">Revoke</UButton>
    </form>
    <USkeleton v-if="!members && !error" class="h-40 w-full" aria-label="Loading members" />
    <p v-else-if="members?.length === 0" class="empty-state text-muted" role="status">No access requests or approvals yet.</p>
    <div v-for="member in members" :key="member._id" class="border-b border-default py-5 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-start gap-3 min-w-0"><UAvatar :src="member.image" :alt="member.name" size="md" /><div class="space-y-1 min-w-0">
        <p class="font-medium break-words">{{ member.name }}</p>
        <p class="font-mono text-sm text-muted select-all">{{ member.discordId }}</p>
        <UBadge color="neutral" variant="subtle">{{ member.isAdmin ? 'Approver' : member.status }}</UBadge>
        <p v-if="member.approvedBy" class="text-xs text-muted">Approved by <span class="font-mono">{{ member.approvedBy }}</span> on {{ new Date(member.approvedAt!).toLocaleDateString() }}</p>
      </div></div>
      <div v-if="!member.isAdmin" class="flex gap-2">
        <UButton v-if="member.status !== 'approved'" :disabled="busy" @click="decide(member.discordId, true)">Approve</UButton>
        <UButton v-if="member.status !== 'revoked'" color="neutral" variant="outline" :disabled="busy" @click="confirming = member.discordId">{{ member.status === 'pending' ? 'Decline' : 'Revoke' }}</UButton>
      </div>
    </div>
    <UModal :open="Boolean(confirming)" title="Revoke access?" description="This account will lose access to the product library." @update:open="value => { if (!value) confirming = null }">
      <template #body>
        <div class="flex items-center gap-3 rounded-lg bg-muted p-4">
          <UAvatar :src="confirmingMember?.image" :alt="confirmingMember?.name ?? confirming!" size="lg" />
          <div class="min-w-0"><p v-if="confirmingMember" class="font-medium break-words">{{ confirmingMember.name }}</p><p class="font-mono text-sm text-muted break-all">{{ confirming }}</p></div>
        </div>
        <p v-if="error" class="mt-4 text-sm text-error" role="alert">{{ error }}</p>
      </template>
      <template #footer>
        <UButton color="neutral" variant="ghost" :disabled="busy" @click="confirming = null">Cancel</UButton>
        <UButton color="error" :loading="busy" @click="decide(confirming!, false)">Revoke access</UButton>
      </template>
    </UModal>
  </section>
</template>
