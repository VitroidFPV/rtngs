import { expect, test } from "bun:test"
import { ConvexError } from "convex/values"
import { productError } from "../app/utils/product-error"

test("presents private-library failures without Convex diagnostics", () => {
	const error = new Error(
		"[CONVEX Q(products:list)] [Request ID: 7251e4ddd8709c89] Server Error Uncaught Error: This library is private. Ask the owner to add your verified Discord email to the member list. at member (../convex/products.ts:9:9) Called by client",
	)
	expect(productError(error)).toEqual({
		denied: true,
		message:
			"Ask the owner to add your Discord account ID to the member list.",
	})
	expect(productError(new ConvexError({ code: "MEMBERS_ONLY" }))).toEqual(
		productError(error),
	)
})
test("does not expose unexpected server errors", () => {
	expect(productError(new Error("Server Error: internal details"))).toEqual({
		denied: false,
		message: "Could not complete the request. Please try again.",
	})
})

test("keeps intentional validation messages readable", () => {
	expect(
		productError(new ConvexError("Enter a valid product link.")),
	).toEqual({ denied: false, message: "Enter a valid product link." })
})
