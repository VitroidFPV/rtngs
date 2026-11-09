<script setup lang="ts">
import { productError } from '../utils/product-error'
import type { ConvexClient } from 'convex/browser'
import type { FunctionReturnType } from 'convex/server'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
const props = defineProps<{ client: ConvexClient }>()
type Product = FunctionReturnType<typeof api.products.list>[number]
const products = ref<Product[] | null>(null)
const error = ref('')
const denied = ref(false)
const busy = ref(false)
const search = ref('')
const tag = ref('All tags')
const sort = ref('Newest')
const selected = ref<Product | null>(null)
const editing = ref(false)
const editId = ref<Id<'products'> | undefined>()
const form = reactive({ name: '', brand: '', description: '', url: '', tags: '' })
const score = ref(3)
const note = ref('')
const tags = computed(() => ['All tags', ...new Set(products.value?.flatMap(p => p.tags) ?? [])])
const visible = computed(() => {
  const needle = search.value.trim().toLowerCase()
  return (products.value ?? []).filter(p => `${p.name} ${p.brand} ${p.tags.join(' ')}`.toLowerCase().includes(needle) && (tag.value === 'All tags' || p.tags.includes(tag.value)))
    .sort((a, b) => sort.value === 'Top rated' ? (b.average ?? -1) - (a.average ?? -1) : sort.value === 'Name' ? a.name.localeCompare(b.name) : b._creationTime - a._creationTime)
})
const stop = props.client.onUpdate(api.products.list, {}, value => {
  denied.value = false
  error.value = ''
  products.value = value
  if (selected.value) selected.value = value.find(p => p._id === selected.value?._id) ?? null
}, cause => {
  const failure = productError(cause)
  denied.value = failure.denied
  error.value = failure.message
  products.value = null
  selected.value = null
  editing.value = false
})
onBeforeUnmount(stop)
function edit(product?: Product) {
  editId.value = product?._id
  Object.assign(form, product ? { ...product, tags: product.tags.join(', ') } : { name: '', brand: '', description: '', url: '', tags: '' })
  selected.value = null
  editing.value = true
}
function open(product: Product) {
  selected.value = product
  score.value = product.mine?.score ?? 3
  note.value = product.mine?.note ?? ''
}
async function run(action: () => Promise<unknown>) {
  busy.value = true
  error.value = ''
  try { await action() } catch (cause) { error.value = productError(cause).message }
  finally { busy.value = false }
}
async function save() {
  await run(async () => {
    await props.client.mutation(api.products.save, { ...form, id: editId.value, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) })
    editing.value = false
  })
}
</script>

<template>
  <UAlert v-if="denied" title="Members only" :description="error" color="neutral" variant="subtle" role="status" />
  <section v-else class="space-y-8">
    <div class="flex flex-wrap items-end justify-between gap-5">
      <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight">Products</h1>
      <UButton size="lg" :disabled="!products" @click="edit()">Add product</UButton>
    </div>
    <UAlert v-if="error" title="Could not complete request" :description="error" color="error" role="alert" />
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
      <UFormField label="Search products"><UInput v-model="search" placeholder="Name, brand, or tag" class="w-full" /></UFormField>
      <UFormField label="Filter by tag"><USelect v-model="tag" :items="tags" class="w-full sm:min-w-40" /></UFormField>
      <UFormField label="Sort by"><USelect v-model="sort" :items="['Newest', 'Top rated', 'Name']" class="w-full sm:min-w-36" /></UFormField>
    </div>
    <div v-if="!products && !error" class="grid gap-5 sm:grid-cols-2" role="status" aria-label="Loading products"><USkeleton v-for="i in 4" :key="i" class="h-40 rounded-lg" /></div>
    <div v-else-if="products && !visible.length" class="py-20 text-center border-y border-default">
      <h2 class="text-xl font-semibold">{{ products.length ? 'No products found' : 'No products yet' }}</h2>
      <p class="mt-2 text-muted">{{ products.length ? 'Try another search or tag.' : 'Add a product to get started.' }}</p>
      <UButton v-if="products.length" class="mt-5" color="neutral" variant="outline" @click="search = ''; tag = 'All tags'">Clear filters</UButton>
    </div>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
      <button v-for="product in visible" :key="product._id" class="text-left border-t border-default py-7 group focus-visible:outline-2 focus-visible:outline-primary rounded-lg px-2" @click="open(product)">
        <div class="flex justify-between gap-5">
          <div class="min-w-0"><p v-if="product.brand" class="text-sm text-muted mb-2">{{ product.brand }}</p><h2 class="font-semibold text-xl break-words group-hover:text-primary">{{ product.name }}</h2></div>
          <div class="text-right shrink-0"><p class="font-mono text-xl">{{ product.average?.toFixed(1) ?? 'Unrated' }}<span v-if="product.average" class="text-muted text-xs"> / 5</span></p><p class="text-xs text-muted mt-1">{{ product.ratings.length }} {{ product.ratings.length === 1 ? 'rating' : 'ratings' }}</p></div>
        </div>
        <p v-if="product.description" class="text-muted text-sm mt-3 line-clamp-2">{{ product.description }}</p>
        <div class="flex flex-wrap gap-2 mt-4"><UBadge v-for="t in product.tags" :key="t" color="neutral" variant="subtle">{{ t }}</UBadge><UBadge v-if="product.mine" variant="soft">You rated {{ product.mine.score }}/5</UBadge></div>
      </button>
    </div>
    <UModal v-model:open="editing" :title="editId ? 'Edit product' : 'Add product'">
      <template #body><form class="space-y-5" @submit.prevent="save">
        <UFormField label="Product name" required><UInput v-model="form.name" required maxlength="120" class="w-full" /></UFormField>
        <UFormField label="Brand"><UInput v-model="form.brand" maxlength="80" class="w-full" /></UFormField>
        <UFormField label="Description"><UTextarea v-model="form.description" maxlength="2000" class="w-full" /></UFormField>
        <UFormField label="Product link"><UInput v-model="form.url" type="url" maxlength="2000" placeholder="https://" class="w-full" /></UFormField>
        <UFormField label="Tags" help="Separate tags with commas. Up to 10 tags, 32 characters each."><UInput v-model="form.tags" class="w-full" placeholder="coffee, kitchen" /></UFormField>
        <p v-if="error" role="alert" class="text-error text-sm">{{ error }}</p>
        <div class="flex justify-end gap-2"><UButton color="neutral" variant="ghost" @click="editing = false">Cancel</UButton><UButton type="submit" :loading="busy">Save product</UButton></div>
      </form></template>
    </UModal>
    <UModal :open="Boolean(selected)" :title="selected?.name" :description="selected?.brand || 'Product details and ratings'" @update:open="value => { if (!value) selected = null }">
      <template #body><div v-if="selected" class="space-y-6">
        <p v-if="selected.description" class="whitespace-pre-wrap break-words">{{ selected.description }}</p>
        <div class="flex flex-wrap gap-2"><UBadge v-for="t in selected.tags" :key="t" color="neutral">{{ t }}</UBadge></div>
        <div class="flex gap-3"><UButton v-if="selected.url" :to="selected.url" target="_blank" rel="noopener noreferrer" color="neutral" variant="outline">Product link</UButton><UButton v-if="selected.canEdit" color="neutral" variant="ghost" @click="edit(selected)">Edit product</UButton></div>
        <form class="space-y-4 border-t border-default pt-6" @submit.prevent="run(async () => { await client.mutation(api.products.rate, { productId: selected!._id, score, note }) })">
          <h3 class="font-semibold">Your rating</h3>
          <UFormField label="Score" help="1 = poor, 5 = excellent"><USelect v-model="score" :items="[1, 2, 3, 4, 5]" class="w-full" /></UFormField>
          <UFormField label="Review (optional)"><UTextarea v-model="note" maxlength="1000" class="w-full" /></UFormField>
          <p v-if="error" role="alert" class="text-error text-sm">{{ error }}</p>
          <div class="flex flex-wrap gap-2"><UButton type="submit" :loading="busy">{{ selected.mine ? 'Update rating' : 'Save rating' }}</UButton><UButton v-if="selected.mine" color="neutral" variant="ghost" :disabled="busy" @click="run(async () => { await client.mutation(api.products.removeRating, { productId: selected!._id }); note = ''; score = 3 })">Remove rating</UButton></div>
        </form>
        <div class="border-t border-default pt-6 space-y-5"><h3 class="font-semibold">Other ratings</h3><p v-if="!selected.ratings.length" class="text-muted text-sm">No ratings yet.</p><div v-for="rating in selected.ratings" :key="rating._id"><div class="flex justify-between gap-4"><p class="text-sm font-medium">{{ rating.name }}</p><p class="font-mono text-sm">{{ rating.score }}/5</p></div><p v-if="rating.note" class="mt-2 text-sm text-muted whitespace-pre-wrap break-words">{{ rating.note }}</p></div></div>
      </div></template>
    </UModal>
  </section>
</template>
