type AuthError = { message?: string } | null

type RedirectAuth = {
	crossDomain: {
		oneTimeToken: {
			verify: (body: { token: string }) => Promise<{
				data: { session: { token: string } } | null
				error: AuthError
			}>
		}
	}
	getSession: (options: {
		fetchOptions: { headers: { Authorization: string } }
	}) => Promise<{ error: AuthError }>
	updateSession: () => void
}

export async function completeAuthRedirect(
	auth: RedirectAuth,
	url: URL,
	replaceUrl: (url: URL) => void,
) {
	const token = url.searchParams.get("ott")
	if (!token) return

	// Match ConvexBetterAuthProvider: consume the one-time token before loading the session.
	url.searchParams.delete("ott")
	replaceUrl(url)
	const result = await auth.crossDomain.oneTimeToken.verify({ token })
	if (result.error)
		throw new Error(
			result.error.message ?? "Could not complete Discord sign-in.",
		)
	if (!result.data?.session)
		throw new Error(
			"Discord sign-in did not establish a session. Please try again.",
		)

	const session = await auth.getSession({
		fetchOptions: {
			headers: { Authorization: `Bearer ${result.data.session.token}` },
		},
	})
	if (session.error)
		throw new Error(
			session.error.message ?? "Could not load the Discord session.",
		)
	auth.updateSession()
}
