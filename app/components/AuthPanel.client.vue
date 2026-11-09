<script setup lang="ts">
import { createAuthClient } from "better-auth/vue"
import {
	convexClient,
	crossDomainClient,
} from "@convex-dev/better-auth/client/plugins"
import { ConvexClient } from "convex/browser"
import { completeAuthRedirect } from "../utils/auth-redirect"

const { t } = useI18n()
const config = useRuntimeConfig()
const configured = Boolean(
	config.public.convexUrl && config.public.convexSiteUrl,
)
const error = ref("")
const busy = ref(false)
const authenticated = ref(false)
const completingSignIn = ref(
	new URL(window.location.href).searchParams.has("ott"),
)

// This component is client-only: each browser owns its auth clients and session.
const auth = configured
	? createAuthClient({
			baseURL: config.public.convexSiteUrl,
			plugins: [convexClient(), crossDomainClient()],
		})
	: null
const session = auth?.useSession()
const user = computed(() => session?.value.data?.user)
const pending = computed(
	() => completingSignIn.value || (session?.value.isPending ?? false),
)
watch(
	() => session?.value.error,
	(cause) => {
		if (cause)
			error.value = cause.message || t("couldNotLoadTheDiscordSession")
	},
)
const client = configured ? new ConvexClient(config.public.convexUrl) : null
watch(
	() => user.value?.id,
	() => {
		// Reinitialize auth when Better Auth loads or changes the browser session.
		if (client && auth) {
			client.setAuth(async () => {
				if (!user.value) return null
				try {
					const result = await auth.convex.token()
					if (result.error)
						throw new Error(
							result.error.message ??
								t("couldNotObtainAConvexToken"),
						)
					return result.data?.token ?? null
				} catch (cause) {
					error.value =
						cause instanceof Error
							? cause.message
							: t("couldNotObtainAConvexToken")
					return null
				}
			}, onAuthenticationChange)
		}
	},
	{ immediate: true },
)

function onAuthenticationChange(isAuthenticated: boolean) {
	authenticated.value = isAuthenticated
	if (!isAuthenticated && user.value && !error.value) {
		error.value = t("couldNotAuthenticateWithConvexPleaseSignInAgain")
	}
}

async function run(action: () => Promise<unknown>) {
	busy.value = true
	error.value = ""
	try {
		await action()
	} catch (cause) {
		error.value = cause instanceof Error ? cause.message : String(cause)
	} finally {
		busy.value = false
	}
}

async function signIn() {
	await run(async () => {
		const result = await auth!.signIn.social({
			provider: "discord",
			callbackURL: window.location.origin + window.location.pathname,
		})
		if (result.error)
			throw new Error(result.error.message ?? t("discordSignInFailed"))
	})
}

async function signOut() {
	await run(async () => {
		const result = await auth!.signOut()
		if (result.error)
			throw new Error(result.error.message ?? t("signOutFailed"))
		client?.setAuth(async () => null, onAuthenticationChange)
	})
}

onMounted(async () => {
	if (!auth) return
	try {
		await run(() =>
			completeAuthRedirect(auth, new URL(window.location.href), (url) => {
				window.history.replaceState(window.history.state, "", url)
			}),
		)
	} finally {
		completingSignIn.value = false
	}
})

onBeforeUnmount(() => {
	void client?.close()
})
</script>

<template>
	<UAlert
		v-if="!configured"
		:title="t('connectAConvexDeployment')"
		:description="
			t('setConvexUrlAndConvexSiteUrlInEnvLocalThenRestartNuxt')
		"
		color="warning"
	/>
	<template v-else>
		<UAlert
			v-if="error"
			:title="t('accountError')"
			:description="error"
			color="error"
			role="alert"
			class="mb-6"
		/>
		<LibrarySkeleton
			v-if="pending"
			:aria-label="t('checkingYourSession')"
		/>
		<template v-else-if="user">
			<Teleport to="#account-actions">
				<div class="flex items-center gap-2 sm:gap-3 min-w-0">
					<UAvatar
						:src="user.image ?? undefined"
						:alt="user.name"
						size="xs"
					/>
					<span
						class="hidden sm:block max-w-36 truncate text-sm font-medium"
						>{{ user.name }}</span
					>
					<UButton
						color="neutral"
						variant="ghost"
						size="sm"
						:loading="busy"
						@click="signOut"
					>
						{{ t("signOut") }}
					</UButton>
				</div>
			</Teleport>
			<MemberAccess v-if="authenticated && client" :client="client" />
			<LibrarySkeleton v-else :aria-label="t('connectingToLibrary')" />
		</template>
		<section
			v-else
			class="mx-auto flex max-w-sm flex-col items-center px-2 py-16 text-center sm:py-24"
			aria-labelledby="sign-in-title"
		>
			<h1
				id="sign-in-title"
				class="text-2xl font-semibold tracking-tight text-highlighted"
			>
				{{ t("signInToRtngs") }}
			</h1>
			<p class="mt-3 text-sm text-muted">
				{{ t("useYourDiscordAccountToAccessTheLibrary") }}
			</p>
			<UButton class="mt-8" size="lg" :loading="busy" @click="signIn">
				{{ t("continueWithDiscord") }}
			</UButton>
		</section>
	</template>
</template>
