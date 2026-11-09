export function isMember(
	discordId: string | null | undefined,
	ids: string | undefined,
) {
	const allowed = (ids ?? "")
		.split(",")
		.map((id) => id.trim())
		.filter(Boolean)
	return Boolean(discordId && allowed.includes(discordId))
}
