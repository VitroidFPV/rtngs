export default defineAppConfig({
	ui: {
		colors: { primary: "purple", neutral: "mauve" },
		button: {
			slots: {
				base: "rounded-lg justify-center whitespace-nowrap",
				label: "truncate",
			},
			defaultVariants: { size: "lg" },
		},
		badge: { slots: { base: "rounded-md" } },
		modal: {
			slots: {
				overlay: "bg-neutral-950/60 backdrop-blur-sm",
				content: "rounded-xl bg-[var(--app-surface)]",
				header: "p-5 sm:p-6",
				wrapper: "min-w-0 pe-8",
				title: "text-xl font-semibold tracking-tight break-words",
				description: "text-sm leading-relaxed",
				body: "p-5 sm:p-6",
				footer: "justify-end gap-2 bg-muted/50 p-5 sm:px-6 sm:py-4",
				close: "top-5 end-5",
			},
		},
		formField: {
			slots: {
				label: "text-sm font-medium text-default",
				help: "mt-2 text-sm text-muted",
			},
		},
		input: {
			slots: { base: "rounded-lg" },
			defaultVariants: { variant: "outline", size: "lg" },
		},
		select: {
			slots: { base: "rounded-lg" },
			defaultVariants: { variant: "outline", size: "lg" },
		},
		textarea: {
			slots: { base: "rounded-lg" },
			defaultVariants: { variant: "outline", size: "lg" },
		},
		selectMenu: { defaultVariants: { variant: "subtle" } },
		inputMenu: { defaultVariants: { variant: "subtle" } },
		inputNumber: { defaultVariants: { variant: "subtle" } },
		inputTags: { defaultVariants: { variant: "subtle" } },
		inputDate: { defaultVariants: { variant: "subtle" } },
		inputTime: { defaultVariants: { variant: "subtle" } },
		pinInput: { defaultVariants: { variant: "subtle" } },
	},
})
