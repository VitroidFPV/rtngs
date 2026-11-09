<template>
  <UApp>
    <UContainer class="max-w-xl py-16 space-y-8">
      <header class="space-y-2">
        <h1 class="text-3xl font-semibold">rtngs</h1>
        <p class="text-muted">Product ratings for friends.</p>
      </header>
      <ClientOnly>
        <AuthPanel />
        <template #fallback><p role="status">Loading…</p></template>
      </ClientOnly>
    </UContainer>
  </UApp>
</template>
