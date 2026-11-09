<script setup lang="ts">
import { productError } from "../utils/product-error"
import type { ConvexClient } from "convex/browser"
import type { FunctionReturnType } from "convex/server"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
const props = defineProps<{ client: ConvexClient }>()
type Product = FunctionReturnType<typeof api.products.list>[number]
const products = ref<Product[] | null>(null)
const error = ref("")
const denied = ref(false)
const busy = ref(false)
const search = ref("")
const tag = ref("All tags")
const sort = ref("Newest")
const selected = ref<Product | null>(null)
const editing = ref(false)
const otherRatings = computed(
	() =>
		selected.value?.ratings.filter(
			(rating) => rating._id !== selected.value?.mine?._id,
		) ?? [],
)
const editId = ref<Id<"products"> | undefined>()
const form = reactive({
	name: "",
	brand: "",
	description: "",
	url: "",
	tags: "",
})
const score = ref(3)
const note = ref("")
const tags = computed(() => [
	"All tags",
	...new Set(products.value?.flatMap((p) => p.tags) ?? []),
])
const visible = computed(() => {
	const needle = search.value.trim().toLowerCase()
	return (products.value ?? [])
		.filter(
			(p) =>
				`${p.name} ${p.brand} ${p.tags.join(" ")}`
					.toLowerCase()
					.includes(needle) &&
				(tag.value === "All tags" || p.tags.includes(tag.value)),
		)
		.sort((a, b) =>
			sort.value === "Top rated"
				? (b.average ?? -1) - (a.average ?? -1)
				: sort.value === "Name"
					? a.name.localeCompare(b.name)
					: b._creationTime - a._creationTime,
		)
})
const stop = props.client.onUpdate(
	api.products.list,
	{},
	(value) => {
		denied.value = false
		error.value = ""
		products.value = value
		if (selected.value)
			selected.value =
				value.find((p) => p._id === selected.value?._id) ?? null
	},
	(cause) => {
		const failure = productError(cause)
		denied.value = failure.denied
		error.value = failure.message
		products.value = null
		selected.value = null
		editing.value = false
	},
)
onBeforeUnmount(stop)
function edit(product?: Product) {
	editId.value = product?._id
	Object.assign(
		form,
		product
			? { ...product, tags: product.tags.join(", ") }
			: { name: "", brand: "", description: "", url: "", tags: "" },
	)
	selected.value = null
	editing.value = true
}
function cardRatings(product: Product) {
	return (
		product.mine
			? [
					product.mine,
					...product.ratings.filter(
						(rating) => rating._id !== product.mine!._id,
					),
				]
			: product.ratings
	).slice(0, 4)
}
function open(product: Product) {
	selected.value = product
	score.value = product.mine?.score ?? 3
	note.value = product.mine?.note ?? ""
}
async function run(action: () => Promise<unknown>) {
	busy.value = true
	error.value = ""
	try {
		await action()
	} catch (cause) {
		error.value = productError(cause).message
	} finally {
		busy.value = false
	}
}
async function save() {
	await run(async () => {
		await props.client.mutation(api.products.save, {
			...form,
			id: editId.value,
			tags: form.tags
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean),
		})
		editing.value = false
	})
}
</script>

<template>
	<UAlert
		v-if="denied"
		title="Members only"
		:description="error"
		color="neutral"
		variant="subtle"
		role="status"
	/>
	<section v-else class="space-y-8">
		<div class="section-header">
			<div>
				<h1 class="section-title">Products</h1>
				<p class="section-description">
					Find something worth trying. Share what you think.
				</p>
			</div>
			<div class="section-actions">
				<slot name="actions" /><UButton
					:disabled="!products"
					@click="edit()"
					>Add product</UButton
				>
			</div>
		</div>
		<UAlert
			v-if="error"
			title="Could not complete request"
			:description="error"
			color="error"
			role="alert"
		/>
		<div
			class="surface-panel grid grid-cols-1 gap-4 p-4 sm:p-5 sm:grid-cols-[1fr_auto_auto]"
		>
			<UFormField label="Search products"
				><UInput
					v-model="search"
					placeholder="Name, brand, or tag"
					class="w-full"
			/></UFormField>
			<UFormField label="Filter by tag"
				><USelect
					v-model="tag"
					:items="tags"
					class="w-full sm:min-w-40"
			/></UFormField>
			<UFormField label="Sort by"
				><USelect
					v-model="sort"
					:items="['Newest', 'Top rated', 'Name']"
					class="w-full sm:min-w-36"
			/></UFormField>
		</div>
		<p
			v-if="products"
			class="text-sm text-muted"
			role="status"
			aria-live="polite"
		>
			{{ visible.length }}
			{{ visible.length === 1 ? "product" : "products"
			}}<span v-if="search || tag !== 'All tags'">
				matching your filters</span
			><span v-else> in the library</span>
		</p>
		<div
			v-if="!products && !error"
			class="grid gap-5 sm:grid-cols-2"
			role="status"
			aria-label="Loading products"
		>
			<USkeleton v-for="i in 4" :key="i" class="h-52 rounded-xl" />
		</div>
		<div
			v-else-if="products && !visible.length"
			class="empty-state"
			role="status"
		>
			<h2 class="text-xl font-semibold">
				{{ products.length ? "No products found" : "No products yet" }}
			</h2>
			<p class="mt-2 text-muted">
				{{
					products.length
						? "Try another search or tag."
						: "Add a product to get started."
				}}
			</p>
			<UButton
				v-if="products.length"
				class="mt-5"
				color="neutral"
				variant="outline"
				@click="
					search = ''
					tag = 'All tags'
				"
				>Clear filters</UButton
			>
		</div>
		<div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<button
				v-for="product in visible"
				:key="product._id"
				class="product-card surface-panel group text-left p-5 sm:p-6 flex flex-col gap-4"
				@click="open(product)"
			>
				<div class="flex items-start justify-between gap-4 w-full">
					<div class="min-w-0">
						<p v-if="product.brand" class="text-sm text-muted mb-1">
							{{ product.brand }}
						</p>
						<h2
							class="font-semibold text-lg text-highlighted break-words group-hover:text-primary transition-colors"
						>
							{{ product.name }}
						</h2>
					</div>
					<div class="shrink-0 text-center">
						<p v-if="product.average !== null" class="rating-value">
							<span class="text-xl font-semibold tabular-nums">{{
								product.average.toFixed(1)
							}}</span
							><span class="text-xs">/ 5</span>
						</p>
						<p
							v-else
							class="rounded-md bg-muted px-3 py-2 text-xs text-muted"
						>
							Unrated
						</p>
						<p class="text-xs text-muted mt-1.5">
							{{ product.ratings.length }}
							{{
								product.ratings.length === 1
									? "rating"
									: "ratings"
							}}
						</p>
					</div>
				</div>
				<p
					v-if="product.description"
					class="text-muted text-sm leading-relaxed line-clamp-2"
				>
					{{ product.description }}
				</p>
				<div
					v-if="product.tags.length"
					class="flex flex-wrap gap-1.5 mt-auto pt-1"
				>
					<UBadge
						v-for="t in product.tags"
						:key="t"
						color="neutral"
						variant="soft"
						size="sm"
						>{{ t }}</UBadge
					>
				</div>
				<div
					v-if="product.ratings.length"
					class="flex flex-wrap items-center gap-4 pt-2 pb-1"
					aria-label="Member ratings"
				>
					<span
						v-for="rating in cardRatings(product)"
						:key="rating._id"
						class="relative inline-flex shrink-0"
						:title="`${rating._id === product.mine?._id ? 'You' : rating.name}: ${rating.score}/5`"
					>
						<span class="sr-only"
							>{{
								rating._id === product.mine?._id
									? "You"
									: rating.name
							}}: {{ rating.score }}/5</span
						>
						<UAvatar
							:src="rating.image"
							:alt="rating.name"
							size="xl"
							:class="
								rating._id === product.mine?._id
									? 'ring-2 ring-primary ring-offset-2 ring-offset-[var(--app-surface)]'
									: undefined
							"
							aria-hidden="true"
						/>
						<span
							aria-hidden="true"
							class="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border-2 border-[var(--app-surface)] bg-primary text-inverted text-xs font-semibold tabular-nums"
							>{{ rating.score }}</span
						>
					</span>
					<span
						v-if="product.ratings.length > 4"
						class="text-xs text-muted"
						>+{{ product.ratings.length - 4
						}}<span class="sr-only">
							more ratings. Open product to view all.</span
						></span
					>
				</div>
			</button>
		</div>
		<UModal
			v-model:open="editing"
			:title="editId ? 'Edit product' : 'Add product'"
			:description="
				editId
					? 'Update the details shared with the library.'
					: 'Share a product for members to try and review.'
			"
			:ui="{ content: 'max-w-xl' }"
		>
			<template #body>
				<form
					id="product-form"
					class="space-y-5"
					@submit.prevent="save"
				>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
						<UFormField label="Product name" required
							><UInput
								v-model="form.name"
								required
								maxlength="120"
								class="w-full"
						/></UFormField>
						<UFormField label="Brand"
							><UInput
								v-model="form.brand"
								maxlength="80"
								class="w-full"
						/></UFormField>
					</div>
					<UFormField label="Description"
						><UTextarea
							v-model="form.description"
							:rows="4"
							maxlength="2000"
							class="w-full"
					/></UFormField>
					<div class="border-t border-default pt-5 space-y-5">
						<UFormField label="Product link"
							><UInput
								v-model="form.url"
								type="url"
								maxlength="2000"
								placeholder="https://"
								class="w-full"
						/></UFormField>
						<UFormField
							label="Tags"
							help="Separate tags with commas. Up to 10 tags, 32 characters each."
							><UInput
								v-model="form.tags"
								class="w-full"
								placeholder="coffee, kitchen"
						/></UFormField>
					</div>
					<UAlert
						v-if="error"
						title="Could not save product"
						:description="error"
						color="error"
						variant="soft"
						role="alert"
					/>
				</form>
			</template>
			<template #footer>
				<UButton
					color="neutral"
					variant="ghost"
					:disabled="busy"
					@click="editing = false"
					>Cancel</UButton
				>
				<UButton type="submit" form="product-form" :loading="busy"
					>Save product</UButton
				>
			</template>
		</UModal>
		<UModal
			:open="Boolean(selected)"
			:title="selected?.name"
			:description="selected?.brand || 'Product details and ratings'"
			:ui="{ content: 'max-w-3xl', body: 'p-0 sm:p-0' }"
			@update:open="
				(value) => {
					if (!value) selected = null
				}
			"
		>
			<template #body>
				<div v-if="selected">
					<div class="p-5 sm:p-6 space-y-4">
						<div
							class="flex flex-wrap items-center justify-between gap-4"
						>
							<div class="flex items-center gap-3">
								<p
									v-if="selected.average !== null"
									class="rating-value"
									aria-label="Average rating"
								>
									<span
										class="text-2xl font-semibold tabular-nums"
										>{{ selected.average.toFixed(1) }}</span
									><span class="text-xs">/ 5</span>
								</p>
								<p
									v-else
									class="text-sm font-medium text-muted"
								>
									Unrated
								</p>
								<div>
									<p class="text-sm font-medium">
										Community rating
									</p>
									<p class="text-xs text-muted">
										{{ selected.ratings.length }}
										{{
											selected.ratings.length === 1
												? "member has"
												: "members have"
										}}
										rated this product
									</p>
								</div>
							</div>
							<div
								v-if="selected.url || selected.canEdit"
								class="flex flex-wrap gap-2"
							>
								<UButton
									v-if="selected.url"
									:to="selected.url"
									target="_blank"
									rel="noopener noreferrer"
									color="neutral"
									variant="outline"
									size="sm"
									>Product link</UButton
								>
								<UButton
									v-if="selected.canEdit"
									color="neutral"
									variant="outline"
									size="sm"
									@click="edit(selected)"
									>Edit product</UButton
								>
							</div>
						</div>
						<p
							v-if="selected.description"
							class="text-sm leading-relaxed whitespace-pre-wrap break-words"
						>
							{{ selected.description }}
						</p>
						<div
							v-if="selected.tags.length"
							class="flex flex-wrap gap-1.5"
						>
							<UBadge
								v-for="t in selected.tags"
								:key="t"
								color="neutral"
								variant="soft"
								size="sm"
								>{{ t }}</UBadge
							>
						</div>
					</div>
					<div
						class="grid grid-cols-1 md:grid-cols-2 border-t border-default"
					>
						<form
							class="bg-muted/50 p-5 sm:p-6 space-y-5"
							@submit.prevent="
								run(async () => {
									await client.mutation(api.products.rate, {
										productId: selected!._id,
										score,
										note,
									})
								})
							"
						>
							<div class="flex items-center gap-3">
								<UAvatar
									v-if="selected.mine"
									:src="selected.mine.image"
									:alt="selected.mine.name"
									size="md"
									class="ring-2 ring-primary/30"
								/>
								<div>
									<h3 class="font-semibold text-highlighted">
										Your rating
									</h3>
									<p class="text-xs text-muted">
										{{
											selected.mine
												? "You can update your review anytime."
												: "Tried it? Share your experience."
										}}
									</p>
								</div>
							</div>
							<UFormField
								label="Score"
								help="1 = poor, 5 = excellent"
							>
								<div
									class="flex flex-wrap items-center gap-3 py-1"
								>
									<UInputRating
										v-model="score"
										:length="5"
										:step="1"
										:clearable="false"
										:disabled="busy"
										size="xl"
										required
									/><span
										class="text-sm font-medium tabular-nums"
										>{{ score }} / 5</span
									>
								</div>
							</UFormField>
							<UFormField label="Review (optional)"
								><UTextarea
									v-model="note"
									:rows="4"
									maxlength="1000"
									class="w-full"
							/></UFormField>
							<p
								v-if="error"
								role="alert"
								class="text-error text-sm"
							>
								{{ error }}
							</p>
							<div class="flex flex-wrap items-center gap-2">
								<UButton type="submit" :loading="busy">{{
									selected.mine
										? "Update rating"
										: "Save rating"
								}}</UButton>
								<UButton
									v-if="selected.mine"
									color="neutral"
									variant="ghost"
									size="sm"
									:disabled="busy"
									@click="
										run(async () => {
											await client.mutation(
												api.products.removeRating,
												{ productId: selected!._id },
											)
											note = ''
											score = 3
										})
									"
									>Remove rating</UButton
								>
							</div>
						</form>
						<section
							class="p-5 sm:p-6 border-t md:border-t-0 md:border-l border-default"
							aria-labelledby="other-ratings-heading"
						>
							<div
								class="flex items-center justify-between gap-3 mb-5"
							>
								<h3
									id="other-ratings-heading"
									class="font-semibold text-highlighted"
								>
									Other ratings
								</h3>
								<UBadge
									color="neutral"
									variant="soft"
									size="sm"
									>{{ otherRatings.length }}</UBadge
								>
							</div>
							<p
								v-if="!otherRatings.length"
								class="text-sm text-muted leading-relaxed"
							>
								{{
									selected.mine
										? "No other members have rated this product yet."
										: "No ratings yet. Be the first to share yours."
								}}
							</p>
							<div v-else class="divide-y divide-default">
								<article
									v-for="rating in otherRatings"
									:key="rating._id"
									class="py-4 first:pt-0 last:pb-0"
								>
									<div
										class="flex items-center justify-between gap-3"
									>
										<div
											class="flex items-center gap-3 min-w-0"
										>
											<UAvatar
												:src="rating.image"
												:alt="rating.name"
												size="md"
											/>
											<p
												class="text-sm font-medium min-w-0 break-words"
											>
												{{ rating.name }}
											</p>
										</div>
										<p
											class="text-sm font-semibold text-primary tabular-nums shrink-0"
										>
											{{ rating.score
											}}<span
												class="text-xs text-muted font-normal"
											>
												/ 5</span
											>
										</p>
									</div>
									<p
										v-if="rating.note"
										class="mt-3 text-sm text-muted leading-relaxed whitespace-pre-wrap break-words"
									>
										{{ rating.note }}
									</p>
								</article>
							</div>
						</section>
					</div>
				</div>
			</template>
		</UModal>
	</section>
</template>
