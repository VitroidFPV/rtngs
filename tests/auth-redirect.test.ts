import { test } from "node:test"
import assert from "node:assert/strict"
import { completeAuthRedirect } from "../app/utils/auth-redirect.ts"

function fixture(failVerification = false) {
	const calls: string[] = []
	const auth = {
		crossDomain: {
			oneTimeToken: {
				verify: async ({ token }: { token: string }) => {
					calls.push(`verify:${token}`)
					return failVerification
						? {
								data: null,
								error: { message: "Expired sign-in link" },
							}
						: {
								data: { session: { token: "test-session" } },
								error: null,
							}
				},
			},
		},
		getSession: async ({
			fetchOptions,
		}: {
			fetchOptions: { headers: { Authorization: string } }
		}) => {
			calls.push(`session:${fetchOptions.headers.Authorization}`)
			return { error: null }
		},
		updateSession: () => {
			calls.push("refresh")
		},
	}
	return { auth, calls }
}

test("redeems the redirect token, establishes the session, and refreshes Vue auth state", async () => {
	const { auth, calls } = fixture()
	let cleaned = ""
	await completeAuthRedirect(
		auth,
		new URL("http://localhost:3000/?ott=test-ott&keep=yes#test"),
		(url) => {
			cleaned = url.href
		},
	)
	assert.equal(cleaned, "http://localhost:3000/?keep=yes#test")
	assert.deepEqual(calls, [
		"verify:test-ott",
		"session:Bearer test-session",
		"refresh",
	])
})

test("does nothing on ordinary page loads", async () => {
	const { auth, calls } = fixture()
	await completeAuthRedirect(auth, new URL("http://localhost:3000/"), () =>
		assert.fail("should not change URL"),
	)
	assert.deepEqual(calls, [])
})

test("reports a rejected redirect instead of silently remaining signed out", async () => {
	const { auth, calls } = fixture(true)
	await assert.rejects(
		completeAuthRedirect(
			auth,
			new URL("http://localhost:3000/?ott=expired"),
			() => {},
		),
		/Expired sign-in link/,
	)
	assert.deepEqual(calls, ["verify:expired"])
})
