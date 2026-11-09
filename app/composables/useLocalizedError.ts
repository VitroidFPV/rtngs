import { productError } from "../utils/product-error"
const validationKeys: Record<string, string> = {
	"Enter a valid image link.": "invalidImageLink",
	"Image link must be 0-2000 characters.": "imageLinkLength",
	"Enter a valid product link.": "validation0",
	"Use an http or https link.": "validation1",
	"Use up to 10 tags.": "validation2",
	"Choose a rating from 0.5 to 5 in 0.5 increments.": "validation3",
	"Product no longer exists.": "validation4",
	"Only the person who added this product can edit it.": "validation5",
	"Enter a valid Discord user ID.": "validation6",
	"Approvers are managed in deployment settings.": "validation7",
	"Only approvers can manage membership.": "validation8",
	"Sign in with Discord first.": "validation9",
	"Name must be 1-120 characters.": "validation10",
	"Brand must be 0-80 characters.": "validation11",
	"Description must be 0-2000 characters.": "validation12",
	"Link must be 0-2000 characters.": "validation13",
	"Tag must be 1-32 characters.": "validation14",
	"Review must be 0-1000 characters.": "validation15",
}

export function useLocalizedError() {
	const { t } = useI18n()
	return (cause: unknown) => {
		const failure = productError(cause)
		const key = validationKeys[failure.message]
		return t(failure.denied ? "accessError" : (key ?? "requestError"))
	}
}
