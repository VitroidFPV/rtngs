<script setup lang="ts">
useHead({ title: 'rtngs', link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }], meta: [{ name: 'description', content: 'A private product library for sharing products and ratings.' }] })
const colorMode = useColorMode()
</script>
<template>
  <UApp>
    <UContainer class="max-w-5xl min-h-[100dvh] px-4 sm:px-8">
      <header class="h-18 flex items-center justify-between border-b border-default mb-8">
        <a href="/" class="text-2xl font-semibold tracking-tighter" aria-label="rtngs home">rtngs<span class="text-primary">.</span></a>
        <UButton color="neutral" variant="ghost" size="sm" @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'">Switch theme</UButton>
      </header>
      <main class="pb-20"><ClientOnly><AuthPanel /><template #fallback><USkeleton class="h-48 w-full" aria-label="Loading library" /></template></ClientOnly></main>
    </UContainer>
  </UApp>
</template>
