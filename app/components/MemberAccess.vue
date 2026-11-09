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
      <MemberManager v-if="status.admin && manage" :client="client">
        <template #actions><UButton color="neutral" variant="outline" @click="manage = false">Back to products</UButton></template>
      </MemberManager>
      <ProductLibrary v-else-if="status.member" :client="client">
        <template v-if="status.admin" #actions><UButton color="neutral" variant="outline" @click="manage = true">Manage members</UButton></template>
      </ProductLibrary>
      <div v-else class="surface-panel mx-auto max-w-xl p-6 sm:p-8 space-y-5">
        <div><h1 class="section-title">Library access</h1><p class="section-description">Your account is connected. Membership gives you access to products and reviews.</p></div>
        <UAlert :title="status.status === 'pending' ? 'Access requested' : status.status === 'revoked' ? 'Access revoked' : 'Members only'" :description="status.status === 'pending' ? 'An approver needs to approve your request.' : status.status === 'revoked' ? 'Contact an approver to restore access.' : 'Request access to the product library.'" color="neutral" variant="subtle" role="status" />
        <p class="text-sm text-muted">Discord ID: <span class="font-mono select-all">{{ status.discordId }}</span></p>
        <UButton v-if="!status.status" :loading="busy" @click="request">Request access</UButton>
      </div>
    </template>
  </div>
</template>
