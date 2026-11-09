import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { compileTemplate, parse } from "@vue/compiler-sfc"

test("product library renders the actions slot for admin member management", () => {
	const filename = "app/components/ProductLibrary.vue"
	const { descriptor } = parse(readFileSync(filename, "utf8"))
	const { code, errors } = compileTemplate({
		source: descriptor.template!.content,
		filename,
		id: "library",
	})
	expect(errors).toEqual([])
	expect(code).toMatch(/_renderSlot\([^\n]*["']actions["']/)
})
