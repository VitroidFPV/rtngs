<template>
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
		<div
			v-for="i in 4"
			:key="i"
			aria-hidden="true"
			class="surface-panel min-h-64 p-5 sm:p-6 flex flex-col gap-4"
		>
			<div class="flex items-center gap-4">
				<USkeleton class="size-14 shrink-0 rounded-lg" />
				<div class="flex-1 space-y-2">
					<USkeleton class="h-4 w-20" />
					<USkeleton class="h-6 w-3/4" />
				</div>
			</div>
			<USkeleton class="h-4 w-full" />
			<USkeleton class="h-4 w-2/3" />
			<div class="mt-auto flex gap-2">
				<USkeleton class="size-10 rounded-full" />
				<USkeleton class="size-10 rounded-full" />
			</div>
		</div>
	</div>
</template>
