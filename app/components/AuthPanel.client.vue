<script setup lang="ts">
import { createAuthClient } from 'better-auth/vue'
import { convexClient, crossDomainClient } from '@convex-dev/better-auth/client/plugins'
import { ConvexClient } from 'convex/browser'
import { completeAuthRedirect } from '../utils/auth-redirect'

const config = useRuntimeConfig()
const configured = Boolean(config.public.convexUrl && config.public.convexSiteUrl)
const error = ref('')
const busy = ref(false)
const authenticated = ref(false)
const completingSignIn = ref(new URL(window.location.href).searchParams.has('ott'))

// This component is client-only: each browser owns its auth clients and session.
const auth = configured ? createAuthClient({
  baseURL: config.public.convexSiteUrl,
  plugins: [convexClient(), crossDomainClient()],
}) : null
const session = auth?.useSession()
const user = computed(() => session?.value.data?.user)
const pending = computed(() => completingSignIn.value || (session?.value.isPending ?? false))
watch(() => session?.value.error, (cause) => {
  if (cause) error.value = cause.message || 'Could not load the Discord session.'
})
const client = configured ? new ConvexClient(config.public.convexUrl) : null
watch(() => user.value?.id, () => {
  // Reinitialize auth when Better Auth loads or changes the browser session.
  if (client && auth) {
    client.setAuth(async () => {
      if (!user.value) return null
      try {
        const result = await auth.convex.token()
        if (result.error) throw new Error(result.error.message ?? 'Could not obtain a Convex token.')
        return result.data?.token ?? null
      } catch (cause) {
        error.value = cause instanceof Error ? cause.message : 'Could not obtain a Convex token.'
        return null
      }
    }, onAuthenticationChange)
  }
}, { immediate: true })

function onAuthenticationChange(isAuthenticated: boolean) {
  authenticated.value = isAuthenticated
  if (!isAuthenticated && user.value && !error.value) {
    error.value = 'Could not authenticate with Convex. Please sign in again.'
  }
}

async function run(action: () => Promise<unknown>) {
  busy.value = true
  error.value = ''
  try { await action() }
  catch (cause) { error.value = cause instanceof Error ? cause.message : String(cause) }
  finally { busy.value = false }
}

async function signIn() {
  await run(async () => {
    const result = await auth!.signIn.social({ provider: 'discord', callbackURL: window.location.origin })
    if (result.error) throw new Error(result.error.message ?? 'Discord sign-in failed.')
  })
}

async function signOut() {
  await run(async () => {
    const result = await auth!.signOut()
    if (result.error) throw new Error(result.error.message ?? 'Sign-out failed.')
    client?.setAuth(async () => null, onAuthenticationChange)
  })
}

onMounted(async () => {
  if (!auth) return
  try {
    await run(() => completeAuthRedirect(auth, new URL(window.location.href), (url) => {
      window.history.replaceState(window.history.state, '', url)
    }))
  } finally {
    completingSignIn.value = false
  }
})

onBeforeUnmount(() => {
  void client?.close()
})
</script>

<template>
  <UAlert v-if="!configured" title="Connect a Convex deployment" description="Set CONVEX_URL and CONVEX_SITE_URL in .env.local, then restart Nuxt." color="warning" />
  <template v-else>
    <UAlert v-if="error" title="Account error" :description="error" color="error" role="alert" class="mb-6" />
    <div v-if="pending" class="space-y-4" role="status" aria-label="Checking your session"><USkeleton class="h-10 w-48" /><USkeleton class="h-40 w-full" /></div>
    <template v-else-if="user">
      <Teleport to="#account-actions">
        <div class="flex items-center gap-2 sm:gap-3 min-w-0">
          <UAvatar :src="user.image ?? undefined" :alt="user.name" size="xs" />
          <span class="hidden sm:block max-w-36 truncate text-sm font-medium">{{ user.name }}</span>
          <UButton color="neutral" variant="ghost" size="sm" :loading="busy" @click="signOut">Sign out</UButton>
        </div>
      </Teleport>
      <MemberAccess v-if="authenticated && client" :client="client" />
      <USkeleton v-else class="h-48 w-full" aria-label="Connecting to library" />
    </template>
    <section v-else class="surface-panel mx-auto max-w-xl p-6 sm:p-10 my-6 sm:my-12">
      <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-highlighted leading-tight">Good products.<br>Honest opinions.</h1>
      <p class="mt-4 max-w-sm text-muted leading-relaxed">A private library of products, ratings, and reviews from people you know.</p>
      <div class="mt-8 border-t border-default pt-6">
        <UButton size="lg" :loading="busy" @click="signIn">Continue with Discord</UButton>
        <p class="mt-3 text-sm text-muted leading-relaxed">Sign in to join the library. New members can request access.</p>
      </div>
    </section>
  </template>
</template>
