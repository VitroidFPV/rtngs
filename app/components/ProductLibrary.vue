<script setup lang="ts">
import { productError } from "../utils/product-error"
import type { ConvexClient } from "convex/browser"
import type { FunctionReturnType } from "convex/server"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
const { t, locale } = useI18n()
const localizedError = useLocalizedError()
const props = defineProps<{ client: ConvexClient }>()
type Product = FunctionReturnType<typeof api.products.list>[number]
const products = ref<Product[] | null>(null)
const error = ref("")
const denied = ref(false)
const busy = ref(false)
const search = ref("")
const tag = ref<string | 0>(0)
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
	imageUrl: "",
	tags: "",
})
const score = ref(3)
const note = ref("")
const tags = computed(() => [
	{ label: t("allTags"), value: 0 },
	...[...new Set(products.value?.flatMap((p) => p.tags) ?? [])].map(
		(value) => ({ label: value, value }),
	),
])
const sorts = computed(() => [
	{ label: t("newest"), value: "Newest" },
	{ label: t("topRated"), value: "Top rated" },
	{ label: t("name"), value: "Name" },
])
const visible = computed(() => {
	const needle = search.value.trim().toLowerCase()
	return (products.value ?? [])
		.filter(
			(p) =>
				`${p.name} ${p.brand} ${p.tags.join(" ")}`
					.toLowerCase()
					.includes(needle) &&
				(tag.value === 0 || p.tags.includes(tag.value)),
		)
		.sort((a, b) =>
			sort.value === "Top rated"
				? (b.average ?? -1) - (a.average ?? -1)
				: sort.value === "Name"
					? a.name.localeCompare(b.name, locale.value)
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
		error.value = localizedError(cause)
		products.value = null
		selected.value = null
		editing.value = false
	},
)
onBeforeUnmount(stop)
function clearFilters() {
	search.value = ""
	tag.value = 0
}
function edit(product?: Product) {
	editId.value = product?._id
	Object.assign(form, {
		name: product?.name ?? "",
		brand: product?.brand ?? "",
		description: product?.description ?? "",
		url: product?.url ?? "",
		imageUrl: product?.imageUrl ?? "",
		tags: product?.tags.join(", ") ?? "",
	})
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
		error.value = localizedError(cause)
	} finally {
		busy.value = false
	}
}
async function remove(product: Product) {
	if (!window.confirm(t("confirmDeleteProduct", { name: product.name })))
		return
	await run(async () => {
		await props.client.mutation(api.products.remove, {
			productId: product._id,
		})
		selected.value = null
	})
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
		:title="t('membersOnly')"
		:description="error"
		color="neutral"
		variant="subtle"
		role="status"
	/>
	<section v-else class="space-y-8">
		<UAlert
			v-if="error"
			:title="t('couldNotCompleteRequest')"
			:description="error"
			color="error"
			role="alert"
		/>
		<div
			class="surface-panel grid grid-cols-1 gap-4 p-4 sm:p-5 sm:grid-cols-[1fr_auto_auto]"
		>
			<UFormField :label="t('searchProducts')"
				><UInput
					v-model="search"
					:placeholder="t('nameBrandOrTag')"
					class="w-full"
			/></UFormField>
			<UFormField :label="t('filterByTag')"
				><USelect
					v-model="tag"
					:items="tags"
					class="w-full sm:min-w-40"
			/></UFormField>
			<UFormField :label="t('sortBy')"
				><USelect
					v-model="sort"
					:items="sorts"
					class="w-full sm:min-w-36"
			/></UFormField>
		</div>
		<p
			v-if="products"
			class="text-sm text-muted"
			role="status"
			aria-live="polite"
		>
			{{ t("productCount", visible.length) }}
			<span v-if="search || tag !== 0">{{ t("matchingFilters") }}</span>
			<span v-else>{{ t("inLibrary") }}</span>
		</p>
		<div
			v-if="!products && !error"
			class="grid gap-5 sm:grid-cols-2"
			role="status"
			:aria-label="t('loadingProducts')"
		>
			<USkeleton v-for="i in 4" :key="i" class="h-52 rounded-xl" />
		</div>
		<div
			v-else-if="products && !visible.length"
			class="empty-state"
			role="status"
		>
			<h2 class="text-xl font-semibold">
				{{
					products.length ? t("noProductsFound") : t("noProductsYet")
				}}
			</h2>
			<p class="mt-2 text-muted">
				{{
					products.length
						? t("tryAnotherSearchOrTag")
						: t("addAProductToGetStarted")
				}}
			</p>
			<UButton
				v-if="products.length"
				class="mt-5"
				color="neutral"
				variant="outline"
				@click="clearFilters"
			>
				{{ t("clearFilters") }}
			</UButton>
		</div>
		<div v-if="products" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<button
				type="button"
				class="product-card surface-panel min-h-52 p-5 sm:p-6 flex flex-col items-center justify-center gap-3 border-dashed text-muted hover:text-primary"
				@click="edit()"
			>
				<UIcon name="i-lucide-plus" class="size-8" aria-hidden="true" />
				<span class="font-medium">{{ t("addProduct") }}</span>
			</button>
			<button
				v-for="product in visible"
				:key="product._id"
				class="product-card surface-panel group text-left p-5 sm:p-6 flex flex-col gap-4"
				@click="open(product)"
			>
				<div class="flex items-start justify-between gap-3 w-full">
					<div class="flex items-center gap-3 sm:gap-4 min-w-0">
						<ProductImage
							:src="product.imageUrl"
							:alt="product.name"
						/>
						<div class="min-w-0">
							<p
								v-if="product.brand"
								class="text-sm text-muted mb-1"
							>
								{{ product.brand }}
							</p>
							<h2
								class="font-semibold text-lg text-highlighted break-words group-hover:text-primary transition-colors"
							>
								{{ product.name }}
							</h2>
						</div>
					</div>
					<div class="shrink-0 text-center">
						<p v-if="product.average !== null" class="rating-value">
							<span class="text-xl font-semibold tabular-nums">{{
								product.average.toLocaleString(locale, {
									minimumFractionDigits: 1,
									maximumFractionDigits: 1,
								})
							}}</span
							><span class="text-xs">/ 5</span>
						</p>
						<p
							v-else
							class="rounded-md bg-muted px-3 py-2 text-xs text-muted"
						>
							{{ t("unrated") }}
						</p>
						<p class="text-xs text-muted mt-1.5">
							{{ t("ratingCount", product.ratings.length) }}
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
						v-for="productTag in product.tags"
						:key="productTag"
						color="neutral"
						variant="soft"
						size="sm"
						>{{ productTag }}</UBadge
					>
				</div>
				<div
					v-if="product.ratings.length"
					class="flex flex-wrap items-center gap-4 pt-2 pb-1"
					:aria-label="t('memberRatings')"
				>
					<span
						v-for="rating in cardRatings(product)"
						:key="rating._id"
						class="relative inline-flex shrink-0"
						:title="`${rating._id === product.mine?._id ? t('you') : rating.name}: ${rating.score}/5`"
					>
						<span class="sr-only"
							>{{
								rating._id === product.mine?._id
									? t("you")
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
							class="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-[var(--app-surface)] bg-primary text-inverted text-[0.66rem] font-semibold tabular-nums"
							>{{ rating.score }}</span
						>
					</span>
					<span
						v-if="product.ratings.length > 4"
						class="text-xs text-muted"
						>+{{ product.ratings.length - 4
						}}<span class="sr-only">
							{{ t("moreRatingsOpenProductToViewAll") }}
						</span></span
					>
				</div>
			</button>
		</div>
		<UModal
			v-model:open="editing"
			:title="editId ? t('editProduct') : t('addProduct')"
			:description="
				editId
					? t('updateTheDetailsSharedWithTheLibrary')
					: t('shareAProductForMembersToTryAndReview')
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
						<UFormField :label="t('productName')" required
							><UInput
								v-model="form.name"
								required
								maxlength="120"
								class="w-full"
						/></UFormField>
						<UFormField :label="t('brand')"
							><UInput
								v-model="form.brand"
								maxlength="80"
								class="w-full"
						/></UFormField>
					</div>
					<UFormField :label="t('description')"
						><UTextarea
							v-model="form.description"
							:rows="4"
							maxlength="2000"
							class="w-full"
					/></UFormField>
					<div class="border-t border-default pt-5 space-y-5">
						<UFormField
							:label="t('productImageLink')"
							:help="t('productImageLinkHelp')"
						>
							<UInput
								v-model="form.imageUrl"
								type="url"
								maxlength="2000"
								placeholder="https://"
								class="w-full"
							/>
						</UFormField>
						<ProductImage :src="form.imageUrl" :alt="form.name" />
						<UFormField :label="t('productLink')"
							><UInput
								v-model="form.url"
								type="url"
								maxlength="2000"
								placeholder="https://"
								class="w-full"
						/></UFormField>
						<UFormField
							:label="t('tags')"
							:help="
								t(
									'separateTagsWithCommasUpTo10Tags32CharactersEach',
								)
							"
							><UInput
								v-model="form.tags"
								class="w-full"
								:placeholder="t('coffeeKitchen')"
						/></UFormField>
					</div>
					<UAlert
						v-if="error"
						:title="t('couldNotSaveProduct')"
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
				>
					{{ t("cancel") }}
				</UButton>
				<UButton type="submit" form="product-form" :loading="busy">
					{{ t("saveProduct") }}
				</UButton>
			</template>
		</UModal>
		<UModal
			:open="Boolean(selected)"
			:title="selected?.name"
			:description="selected?.brand || t('productDetailsAndRatings')"
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
								<ProductImage
									:src="selected.imageUrl"
									:alt="selected.name"
									size="detail"
								/>
								<p
									v-if="selected.average !== null"
									class="rating-value"
									:aria-label="t('averageRating')"
								>
									<span
										class="text-2xl font-semibold tabular-nums"
										>{{
											selected.average.toLocaleString(
												locale,
												{
													minimumFractionDigits: 1,
													maximumFractionDigits: 1,
												},
											)
										}}</span
									><span class="text-xs">/ 5</span>
								</p>
								<p
									v-else
									class="text-sm font-medium text-muted"
								>
									{{ t("unrated") }}
								</p>
								<div>
									<p class="text-sm font-medium">
										{{ t("communityRating") }}
									</p>
									<p class="text-xs text-muted">
										{{
											t(
												"ratedProduct",
												selected.ratings.length,
											)
										}}
									</p>
								</div>
							</div>
							<div
								v-if="
									selected.url ||
									selected.canEdit ||
									selected.canDelete
								"
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
								>
									{{ t("productLink") }}
								</UButton>
								<UButton
									v-if="selected.canEdit"
									color="neutral"
									variant="outline"
									size="sm"
									@click="edit(selected)"
								>
									{{ t("editProduct") }}
								</UButton>
								<UButton
									v-if="selected.canDelete"
									color="error"
									variant="outline"
									size="sm"
									:disabled="busy"
									@click="remove(selected)"
								>
									{{ t("deleteProduct") }}
								</UButton>
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
								v-for="productTag in selected.tags"
								:key="productTag"
								color="neutral"
								variant="soft"
								size="sm"
								>{{ productTag }}</UBadge
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
										{{ t("yourRating") }}
									</h3>
									<p class="text-xs text-muted">
										{{
											selected.mine
												? t(
														"youCanUpdateYourReviewAnytime",
													)
												: t(
														"triedItShareYourExperience",
													)
										}}
									</p>
								</div>
							</div>
							<UFormField
								:label="t('score')"
								:help="t('1Poor5Excellent')"
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
							<UFormField :label="t('reviewOptional')"
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
										? t("updateRating")
										: t("saveRating")
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
								>
									{{ t("removeRating") }}
								</UButton>
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
									{{ t("otherRatings") }}
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
										? t(
												"noOtherMembersHaveRatedThisProductYet",
											)
										: t(
												"noRatingsYetBeTheFirstToShareYours",
											)
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
