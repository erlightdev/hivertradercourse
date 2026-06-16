class ToastManager {
	private container: HTMLDivElement | null = null;

	private getContainer() {
		if (this.container && document.body.contains(this.container)) {
			return this.container;
		}
		this.container = document.createElement("div");
		this.container.className =
			"fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0";
		document.body.appendChild(this.container);
		return this.container;
	}

	show(message: string, type: "success" | "error" | "info" = "info", title?: string) {
		const container = this.getContainer();
		const toastEl = document.createElement("div");

		// Modern Sonner style: stacked layout, thin borders, backdrop blurring, shadow
		// Transition uses spring-like cubic-bezier easeOutBack curve
		const baseStyles =
			"pointer-events-auto flex w-full items-start gap-3 overflow-hidden rounded-xl border p-4 shadow-lg backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.21,1.02,0.43,1.01)] transform translate-x-8 opacity-0 scale-95";
		
		let typeStyles = "";
		let defaultTitle = "";

		if (type === "success") {
			typeStyles = "bg-card/95 text-foreground border-emerald-500/20 shadow-emerald-500/5";
			defaultTitle = "Success";
		} else if (type === "error") {
			typeStyles = "bg-card/95 text-foreground border-destructive/20 shadow-destructive/5";
			defaultTitle = "Error";
		} else {
			typeStyles = "bg-card/95 text-foreground border-border";
			defaultTitle = "Notification";
		}

		toastEl.className = `${baseStyles} ${typeStyles}`;

		const successIcon = `
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500 mt-0.5">
				<polyline points="20 6 9 17 4 12"></polyline>
			</svg>
		`;

		const errorIcon = `
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-destructive mt-0.5">
				<circle cx="12" cy="12" r="10"></circle>
				<line x1="12" y1="8" x2="12" y2="12"></line>
				<line x1="12" y1="16" x2="12.01" y2="16"></line>
			</svg>
		`;

		const infoIcon = `
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-primary mt-0.5">
				<circle cx="12" cy="12" r="10"></circle>
				<line x1="12" y1="16" x2="12" y2="12"></line>
				<line x1="12" y1="8" x2="12.01" y2="8"></line>
			</svg>
		`;

		const icon =
			type === "success"
				? successIcon
				: type === "error"
					? errorIcon
					: infoIcon;

		toastEl.innerHTML = `
			<div class="flex-shrink-0">
				${icon}
			</div>
			<div class="flex-1 space-y-0.5">
				<p class="text-sm font-semibold font-sans text-foreground">${title || defaultTitle}</p>
				<p class="text-xs text-muted-foreground font-sans leading-relaxed">${message}</p>
			</div>
			<button class="text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 mt-0.5" aria-label="Close Toast">
				<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				</svg>
			</button>
		`;

		// Close button functionality
		const closeBtn = toastEl.querySelector("button");
		closeBtn?.addEventListener("click", () => {
			this.dismissToast(toastEl, container);
		});

		container.appendChild(toastEl);

		// Trigger entry animation with a spring effect
		requestAnimationFrame(() => {
			setTimeout(() => {
				toastEl.classList.remove("translate-x-8", "opacity-0", "scale-95");
				toastEl.classList.add("translate-x-0", "opacity-100", "scale-100");
			}, 20);
		});

		// Auto dismiss
		setTimeout(() => {
			this.dismissToast(toastEl, container);
		}, 4000);
	}

	private dismissToast(toastEl: HTMLDivElement, container: HTMLDivElement) {
		if (!container.contains(toastEl)) return;

		toastEl.classList.remove("translate-x-0", "opacity-100", "scale-100");
		toastEl.classList.add("translate-x-8", "opacity-0", "scale-95");

		toastEl.addEventListener("transitionend", () => {
			toastEl.remove();
			if (container.children.length === 0) {
				container.remove();
				if (this.container === container) {
					this.container = null;
				}
			}
		});
	}

	success(message: string, title?: string) {
		this.show(message, "success", title);
	}

	error(message: string, title?: string) {
		this.show(message, "error", title);
	}

	info(message: string, title?: string) {
		this.show(message, "info", title);
	}
}

export const toast = new ToastManager();
