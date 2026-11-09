<script setup lang="ts">
import type { ConvexClient } from 'convex/browser'
import type { FunctionReturnType } from 'convex/server'
import { api } from '../../convex/_generated/api'
import { productError } from '../utils/product-error'
const props = defineProps<{ client: ConvexClient }>()
const status = ref<FunctionReturnType<typeof api.members.status> | null>(null)
const error = ref('')
const busy = ref(false)
const manage = ref(false)
const stop = props.client.onUpdate(api.members.status, {}, value => {
  status.value = value
  error.value = ''
}, cause => { status.value = null; error.value = productError(cause).message })
onBeforeUnmount(stop)
async function request() {
  busy.value = true
  error.value = ''
  try { await props.client.mutation(api.members.requestAccess, {}) }
  catch (cause) { error.value = productError(cause).message }
  finally { busy.value = false }
}
</script>
<template>
  <div class="space-y-6">
    <UAlert v-if="error" title="Could not load access" :description="error" color="error" role="alert" />
    <USkeleton v-if="!status && !error" class="h-40 w-full" aria-label="Checking membership" />
    <template v-if="status">
      <div v-if="status.admin" class="flex justify-end"><UButton color="neutral" variant="outline" @click="manage = !manage">{{ manage ? 'Back to products' : 'Manage members' }}</UButton></div>
      <MemberManager v-if="status.admin && manage" :client="client" />
      <ProductLibrary v-else-if="status.member" :client="client" />
      <div v-else class="space-y-4">
        <UAlert :title="status.status === 'pending' ? 'Access requested' : status.status === 'revoked' ? 'Access revoked' : 'Members only'" :description="status.status === 'pending' ? 'An approver needs to approve your request.' : status.status === 'revoked' ? 'Contact an approver to restore access.' : 'Request access to the product library.'" color="neutral" variant="subtle" role="status" />
        <p class="text-sm text-muted">Discord ID: <span class="font-mono select-all">{{ status.discordId }}</span></p>
        <UButton v-if="!status.status" :loading="busy" @click="request">Request access</UButton>
      </div>
    </template>
  </div>
</template>
