import { PUBLIC_SERVER_URL } from "astro:env/client";
// Global Toast System
export const toast = {
    show(message, type = "info") {
        const container = document.getElementById("toaster-container");
        if (!container)
            return;
        const toastEl = document.createElement("div");
        toastEl.className = "flex items-start gap-3 p-3 bg-card border border-border rounded-sm shadow-md pointer-events-auto transform translate-y-2 opacity-0 transition-all duration-300 select-none max-w-xs ml-auto";
        let icon = "";
        if (type === "success") {
            icon = `<svg class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        }
        else if (type === "error") {
            icon = `<svg class="w-4 h-4 text-destructive shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
        }
        else {
            icon = `<svg class="w-4 h-4 text-primary shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
        }
        toastEl.innerHTML = `
      ${icon}
      <div class="flex-1 min-w-0">
        <p class="text-[11px] font-semibold text-foreground leading-normal">${message}</p>
      </div>
      <button class="text-muted-foreground hover:text-foreground cursor-pointer transition-colors p-0.5 rounded-sm hover:bg-muted" id="close-toast-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;
        const closeBtn = toastEl.querySelector("#close-toast-btn");
        if (closeBtn) {
            closeBtn.addEventListener("click", () => {
                toastEl.remove();
            });
        }
        container.appendChild(toastEl);
        // Animation
        setTimeout(() => {
            toastEl.classList.remove("translate-y-2", "opacity-0");
            toastEl.classList.add("translate-y-0", "opacity-100");
        }, 10);
        // Auto dismiss
        setTimeout(() => {
            if (toastEl.parentNode) {
                toastEl.classList.remove("translate-y-0", "opacity-100");
                toastEl.classList.add("translate-y-2", "opacity-0");
                setTimeout(() => {
                    if (toastEl.parentNode) {
                        toastEl.remove();
                    }
                }, 300);
            }
        }, 4000);
    },
    success(message) {
        this.show(message, "success");
    },
    error(message) {
        this.show(message, "error");
    },
    info(message) {
        this.show(message, "info");
    }
};
// Global Custom Dialog (AlertDialog) System
export const dialog = {
    async confirm(title, description) {
        return new Promise((resolve) => {
            const overlay = document.getElementById("custom-dialog-overlay");
            const content = document.getElementById("custom-dialog-content");
            const titleEl = document.getElementById("custom-dialog-title");
            const descEl = document.getElementById("custom-dialog-description");
            const inputContainer = document.getElementById("custom-dialog-input-container");
            const cancelBtn = document.getElementById("custom-dialog-cancel");
            const confirmBtn = document.getElementById("custom-dialog-confirm");
            titleEl.textContent = title;
            descEl.textContent = description;
            inputContainer.classList.add("hidden");
            confirmBtn.textContent = "Confirm";
            overlay.classList.remove("hidden");
            overlay.classList.add("flex");
            setTimeout(() => {
                content.classList.remove("scale-95", "opacity-0");
                content.classList.add("scale-100", "opacity-100");
            }, 10);
            const cleanUp = () => {
                content.classList.remove("scale-100", "opacity-100");
                content.classList.add("scale-95", "opacity-0");
                setTimeout(() => {
                    overlay.classList.remove("flex");
                    overlay.classList.add("hidden");
                }, 200);
            };
            const onCancel = () => {
                cleanUp();
                resolve(false);
                removeListeners();
            };
            const onConfirm = () => {
                cleanUp();
                resolve(true);
                removeListeners();
            };
            const onOverlayClick = (e) => {
                if (e.target === overlay) {
                    onCancel();
                }
            };
            const onKeyDown = (e) => {
                if (e.key === "Escape") {
                    onCancel();
                }
            };
            const removeListeners = () => {
                cancelBtn.removeEventListener("click", onCancel);
                confirmBtn.removeEventListener("click", onConfirm);
                overlay.removeEventListener("click", onOverlayClick);
                window.removeEventListener("keydown", onKeyDown);
            };
            cancelBtn.addEventListener("click", onCancel);
            confirmBtn.addEventListener("click", onConfirm);
            overlay.addEventListener("click", onOverlayClick);
            window.addEventListener("keydown", onKeyDown);
        });
    },
    async prompt(title, description, defaultValue = "") {
        return new Promise((resolve) => {
            const overlay = document.getElementById("custom-dialog-overlay");
            const content = document.getElementById("custom-dialog-content");
            const titleEl = document.getElementById("custom-dialog-title");
            const descEl = document.getElementById("custom-dialog-description");
            const inputContainer = document.getElementById("custom-dialog-input-container");
            const input = document.getElementById("custom-dialog-input");
            const cancelBtn = document.getElementById("custom-dialog-cancel");
            const confirmBtn = document.getElementById("custom-dialog-confirm");
            titleEl.textContent = title;
            descEl.textContent = description;
            inputContainer.classList.remove("hidden");
            input.value = defaultValue;
            confirmBtn.textContent = "Submit";
            overlay.classList.remove("hidden");
            overlay.classList.add("flex");
            setTimeout(() => {
                content.classList.remove("scale-95", "opacity-0");
                content.classList.add("scale-100", "opacity-100");
                input.focus();
                input.select();
            }, 10);
            const cleanUp = () => {
                content.classList.remove("scale-100", "opacity-100");
                content.classList.add("scale-95", "opacity-0");
                setTimeout(() => {
                    overlay.classList.remove("flex");
                    overlay.classList.add("hidden");
                }, 200);
            };
            const onCancel = () => {
                cleanUp();
                resolve(null);
                removeListeners();
            };
            const onConfirm = () => {
                cleanUp();
                resolve(input.value.trim());
                removeListeners();
            };
            const onOverlayClick = (e) => {
                if (e.target === overlay) {
                    onCancel();
                }
            };
            const onKeyDown = (e) => {
                if (e.key === "Escape") {
                    onCancel();
                }
            };
            const onInputKeyDown = (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    onConfirm();
                }
            };
            const removeListeners = () => {
                cancelBtn.removeEventListener("click", onCancel);
                confirmBtn.removeEventListener("click", onConfirm);
                overlay.removeEventListener("click", onOverlayClick);
                window.removeEventListener("keydown", onKeyDown);
                input.removeEventListener("keydown", onInputKeyDown);
            };
            cancelBtn.addEventListener("click", onCancel);
            confirmBtn.addEventListener("click", onConfirm);
            overlay.addEventListener("click", onOverlayClick);
            window.addEventListener("keydown", onKeyDown);
            input.addEventListener("keydown", onInputKeyDown);
        });
    }
};
// Central State Store for Blog Resources
export const blogStore = {
    state: {
        posts: [],
        categories: [],
        tags: [],
        users: [],
        searchQuery: "",
        statusFilter: "all",
        currentEditingPostId: null,
        selectedCategoryIds: [],
        selectedTagIds: [],
        currentPage: 1,
        pageSize: 10,
        seoData: {
            metaTitle: "",
            metaDescription: "",
            ogImage: "",
            canonicalUrl: "",
            focusKeyword: "",
            robotsMeta: "index, follow"
        }
    },
    setFilters(searchQuery, statusFilter) {
        this.state.searchQuery = searchQuery.toLowerCase().trim();
        this.state.statusFilter = statusFilter;
        this.state.currentPage = 1;
        this.renderPosts();
    },
    async loadPosts() {
        const tableBody = document.getElementById("posts-table-body");
        if (this.state.posts.length === 0 && tableBody) {
            tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="p-8 text-center text-muted-foreground font-medium">Loading posts...</td>
        </tr>
      `;
        }
        try {
            const res = await fetch(`${PUBLIC_SERVER_URL}/api/posts`, { credentials: "include" });
            if (!res.ok)
                throw new Error("Failed to load posts");
            const posts = await res.json();
            this.state.posts = posts;
            this.renderPosts();
        }
        catch (e) {
            console.error("Failed to load posts:", e);
            if (tableBody) {
                tableBody.innerHTML = `
          <tr>
            <td colspan="7" class="p-8 text-center text-destructive font-medium">Failed to load posts. Please verify server connection.</td>
          </tr>
        `;
            }
        }
    },
    async trashPost(id) {
        try {
            const res = await fetch(`${PUBLIC_SERVER_URL}/api/posts/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ trashed: true }),
                credentials: "include"
            });
            if (!res.ok)
                throw new Error();
            await this.loadPosts();
            toast.success("Post moved to Trash!");
        }
        catch {
            toast.error("Failed to move post to Trash.");
        }
    },
    async restorePost(id) {
        try {
            const res = await fetch(`${PUBLIC_SERVER_URL}/api/posts/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ trashed: false, published: false }),
                credentials: "include"
            });
            if (!res.ok)
                throw new Error();
            await this.loadPosts();
            toast.success("Post restored as draft!");
        }
        catch {
            toast.error("Failed to restore post.");
        }
    },
    async deletePostPermanently(id) {
        try {
            const res = await fetch(`${PUBLIC_SERVER_URL}/api/posts/${id}`, {
                method: "DELETE",
                credentials: "include"
            });
            if (!res.ok)
                throw new Error();
            await this.loadPosts();
            toast.success("Post deleted permanently!");
        }
        catch {
            toast.error("Failed to delete post permanently.");
        }
    },
    createPost() {
        this.state.currentEditingPostId = null;
        document.getElementById("editor-view-title").textContent = "Create New Post";
        document.getElementById("post-title-input").value = "";
        document.getElementById("post-slug-input").value = "";
        document.getElementById("post-published-checkbox").checked = false;
        this.state.selectedCategoryIds = [];
        this.state.selectedTagIds = [];
        this.renderCategorySelect();
        this.renderTagCheckboxes();
        this.renderAuthorSelect(window.currentUser ? window.currentUser.id : "");
        this.state.seoData = {
            metaTitle: "",
            metaDescription: "",
            ogImage: "",
            canonicalUrl: "",
            focusKeyword: "",
            robotsMeta: "index, follow"
        };
        this.syncSeoFormFields();
        const previewLink = document.getElementById("post-slug-preview-link");
        if (previewLink) {
            previewLink.textContent = "/blog/";
            previewLink.href = "#";
        }
        const datesContainer = document.getElementById("post-dates-container");
        if (datesContainer) {
            datesContainer.classList.add("hidden");
        }
        window.initTiptap?.();
        if (window.editor) {
            window.editor.commands.setContent("");
        }
        window.showView("view-blog-editor");
    },
    async editPost(id) {
        try {
            const res = await fetch(`${PUBLIC_SERVER_URL}/api/posts/${id}`, { credentials: "include" });
            if (!res.ok)
                throw new Error();
            const post = await res.json();
            this.state.currentEditingPostId = post.id;
            document.getElementById("editor-view-title").textContent = "Edit Post";
            document.getElementById("post-title-input").value = post.title;
            document.getElementById("post-slug-input").value = post.slug;
            document.getElementById("post-published-checkbox").checked = post.published;
            this.state.selectedCategoryIds = post.categories ? post.categories.map((c) => c.id) : [];
            this.state.selectedTagIds = post.tags ? post.tags.map((t) => t.id) : [];
            this.renderCategorySelect();
            this.renderTagCheckboxes();
            this.renderAuthorSelect(post.author?.id || post.authorId || "");
            const previewLink = document.getElementById("post-slug-preview-link");
            if (previewLink) {
                previewLink.textContent = `/blog/${post.slug}`;
                previewLink.href = `/blog/${post.slug}`;
            }
            const createdDateStr = new Date(post.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
            const updatedDateStr = new Date(post.updatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
            const createdEl = document.getElementById("post-created-date");
            const updatedEl = document.getElementById("post-updated-date");
            const datesContainer = document.getElementById("post-dates-container");
            if (createdEl && updatedEl && datesContainer) {
                createdEl.textContent = createdDateStr;
                updatedEl.textContent = updatedDateStr;
                datesContainer.classList.remove("hidden");
            }
            window.initTiptap?.();
            if (window.editor) {
                window.editor.commands.setContent(post.content || "");
            }
            // Populate SEO data
            this.state.seoData = {
                metaTitle: post.metaTitle || "",
                metaDescription: post.metaDescription || "",
                ogImage: post.ogImage || "",
                canonicalUrl: post.canonicalUrl || "",
                focusKeyword: post.focusKeyword || "",
                robotsMeta: post.robotsMeta || "index, follow"
            };
            this.syncSeoFormFields();
            window.showView("view-blog-editor");
        }
        catch {
            toast.error("Failed to fetch post details.");
        }
    },
    async savePost(forcePublish) {
        const title = document.getElementById("post-title-input").value.trim();
        let slug = document.getElementById("post-slug-input").value.trim();
        let published = document.getElementById("post-published-checkbox").checked;
        if (forcePublish) {
            published = true;
            document.getElementById("post-published-checkbox").checked = true;
        }
        if (!title) {
            toast.error("Post Title is required.");
            return;
        }
        if (!slug) {
            slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        }
        const content = window.editor ? window.editor.getHTML() : "";
        this.readSeoFormFields();
        const payload = {
            title,
            slug,
            content,
            published,
            categoryIds: this.state.selectedCategoryIds,
            tagIds: this.state.selectedTagIds,
            authorId: document.getElementById("post-author-select")?.value || undefined,
            metaTitle: this.state.seoData.metaTitle || "",
            metaDescription: this.state.seoData.metaDescription || "",
            ogImage: this.state.seoData.ogImage || "",
            canonicalUrl: this.state.seoData.canonicalUrl || "",
            focusKeyword: this.state.seoData.focusKeyword || "",
            robotsMeta: this.state.seoData.robotsMeta || "index, follow"
        };
        try {
            const isEdit = !!this.state.currentEditingPostId;
            const url = isEdit
                ? `${PUBLIC_SERVER_URL}/api/posts/${this.state.currentEditingPostId}`
                : `${PUBLIC_SERVER_URL}/api/posts`;
            const method = isEdit ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                credentials: "include"
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save post");
            }
            window.showView("view-blog-posts");
            await this.loadPosts();
            if (published) {
                toast.success(isEdit ? "Post updated and published!" : "Post published successfully!");
            }
            else {
                toast.success("Post saved as draft!");
            }
        }
        catch (e) {
            toast.error(e.message || "Failed to save post. Please make sure the slug is unique.");
        }
    },
    syncSeoFormFields() {
        const s = this.state.seoData;
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el)
                el.value = val;
        };
        set("seo-meta-title", s.metaTitle);
        set("seo-meta-description", s.metaDescription);
        set("seo-focus-keyword", s.focusKeyword);
        set("seo-canonical-url", s.canonicalUrl);
        set("seo-og-image", s.ogImage);
        set("seo-robots-meta", s.robotsMeta || "index, follow");
        this.updateSeoPreviews();
    },
    readSeoFormFields() {
        const get = (id) => {
            const el = document.getElementById(id);
            return el ? el.value.trim() : "";
        };
        this.state.seoData = {
            metaTitle: get("seo-meta-title"),
            metaDescription: get("seo-meta-description"),
            focusKeyword: get("seo-focus-keyword"),
            canonicalUrl: get("seo-canonical-url"),
            ogImage: get("seo-og-image"),
            robotsMeta: get("seo-robots-meta") || "index, follow"
        };
    },
    openSeoSheet() {
        const overlay = document.getElementById("seo-sheet-overlay");
        const panel = document.getElementById("seo-sheet-panel");
        if (!overlay || !panel)
            return;
        overlay.classList.remove("hidden");
        overlay.classList.add("seo-overlay-enter");
        panel.classList.remove("hidden", "seo-sheet-exit");
        panel.classList.add("seo-sheet-enter");
        this.updateSeoPreviews();
    },
    closeSeoSheet() {
        const overlay = document.getElementById("seo-sheet-overlay");
        const panel = document.getElementById("seo-sheet-panel");
        if (!overlay || !panel)
            return;
        overlay.classList.add("hidden");
        overlay.classList.remove("seo-overlay-enter");
        panel.classList.remove("seo-sheet-enter");
        panel.classList.add("seo-sheet-exit");
        const onEnd = () => {
            panel.classList.add("hidden");
            panel.classList.remove("seo-sheet-exit");
            panel.removeEventListener("animationend", onEnd);
        };
        panel.addEventListener("animationend", onEnd);
    },
    renderSeoPreviewImage(containerId, url) {
        const el = document.getElementById(containerId);
        if (!el)
            return;
        const placeholder = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground/40"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;
        if (url) {
            el.innerHTML = `<img alt="Social preview" class="w-full h-full object-cover" />`;
            const img = el.querySelector("img");
            if (img) {
                img.addEventListener("error", () => { el.innerHTML = placeholder; });
                img.src = url;
            }
        }
        else {
            el.innerHTML = placeholder;
        }
    },
    updateSeoPreviews() {
        const val = (id) => {
            const el = document.getElementById(id);
            return el ? el.value.trim() : "";
        };
        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el)
                el.textContent = text;
        };
        const postTitle = document.getElementById("post-title-input")?.value.trim() || "";
        const slug = document.getElementById("post-slug-input")?.value.trim() || "";
        const metaTitle = val("seo-meta-title") || postTitle || "Your Post Title";
        const metaDesc = val("seo-meta-description") || "Your meta description will appear here...";
        const canonical = val("seo-canonical-url");
        const ogImage = val("seo-og-image");
        let domain = "example.com";
        try {
            if (canonical)
                domain = new URL(canonical).hostname.replace(/^www\./, "");
        }
        catch { /* keep default */ }
        const mtCount = document.getElementById("seo-meta-title-count");
        const mdCount = document.getElementById("seo-meta-desc-count");
        if (mtCount)
            mtCount.textContent = String(val("seo-meta-title").length);
        if (mdCount)
            mdCount.textContent = String(val("seo-meta-description").length);
        setText("seo-preview-google-url", slug ? `${domain} › blog › ${slug}` : `${domain} › blog`);
        setText("seo-preview-google-title", metaTitle);
        setText("seo-preview-google-desc", metaDesc);
        setText("seo-preview-fb-domain", domain.toUpperCase());
        setText("seo-preview-fb-title", metaTitle);
        setText("seo-preview-fb-desc", metaDesc);
        setText("seo-preview-x-title", metaTitle);
        setText("seo-preview-x-desc", metaDesc);
        setText("seo-preview-x-domain", domain);
        setText("seo-preview-li-title", metaTitle);
        setText("seo-preview-li-domain", domain);
        this.renderSeoPreviewImage("seo-preview-fb-image", ogImage);
        this.renderSeoPreviewImage("seo-preview-x-image", ogImage);
        this.renderSeoPreviewImage("seo-preview-li-image", ogImage);
    },
    async loadUsers() {
        try {
            const res = await fetch(`${PUBLIC_SERVER_URL}/api/users`, { credentials: "include" });
            if (!res.ok)
                throw new Error();
            this.state.users = await res.json();
            this.renderAuthorSelect();
        }
        catch {
            console.warn("Failed to load users");
        }
    },
    renderAuthorSelect(selectedId) {
        const select = document.getElementById("post-author-select");
        if (!select)
            return;
        const currentVal = selectedId || select.value || (window.currentUser ? window.currentUser.id : "");
        if (this.state.users.length === 0) {
            select.innerHTML = `<option value="">No authors available</option>`;
            return;
        }
        select.innerHTML = this.state.users.map((u) => {
            const label = u.name || u.email;
            return `<option value="${u.id}">${label}</option>`;
        }).join("");
        if (currentVal && this.state.users.some((u) => u.id === currentVal)) {
            select.value = currentVal;
        }
    },
    async loadCategories() {
        try {
            const res = await fetch(`${PUBLIC_SERVER_URL}/api/categories`, { credentials: "include" });
            if (!res.ok)
                throw new Error();
            const categories = await res.json();
            this.state.categories = categories;
            this.renderCategories();
            this.renderCategorySelect();
        }
        catch {
            console.warn("Failed to load categories");
        }
    },
    async createCategory(name, slug) {
        try {
            const res = await fetch(`${PUBLIC_SERVER_URL}/api/categories`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, slug }),
                credentials: "include"
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create category");
            }
            await this.loadCategories();
            toast.success(`Category "${name}" created successfully!`);
            return true;
        }
        catch (e) {
            toast.error(e.message || "Failed to add category.");
            return false;
        }
    },
    async updateCategory(id, name, slug) {
        try {
            const res = await fetch(`${PUBLIC_SERVER_URL}/api/categories/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, slug }),
                credentials: "include"
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to update category");
            }
            await this.loadCategories();
            await this.loadPosts();
            toast.success(`Category "${name}" updated successfully!`);
            return true;
        }
        catch (e) {
            toast.error(e.message || "Failed to update category.");
            return false;
        }
    },
    async deleteCategory(id) {
        try {
            const res = await fetch(`${PUBLIC_SERVER_URL}/api/categories/${id}`, {
                method: "DELETE",
                credentials: "include"
            });
            if (!res.ok)
                throw new Error();
            await this.loadCategories();
            toast.success("Category deleted successfully!");
        }
        catch {
            toast.error("Failed to delete category. Note: Categories with posts cannot be deleted.");
        }
    },
    async loadTags() {
        try {
            const res = await fetch(`${PUBLIC_SERVER_URL}/api/tags`, { credentials: "include" });
            if (!res.ok)
                throw new Error();
            const tags = await res.json();
            this.state.tags = tags;
            this.renderTags();
            this.renderTagCheckboxes();
        }
        catch {
            console.warn("Failed to load tags");
        }
    },
    async createTag(name, slug) {
        try {
            const res = await fetch(`${PUBLIC_SERVER_URL}/api/tags`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, slug }),
                credentials: "include"
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create tag");
            }
            await this.loadTags();
            toast.success(`Tag "#${name}" created successfully!`);
            return true;
        }
        catch (e) {
            toast.error(e.message || "Failed to add tag.");
            return false;
        }
    },
    async updateTag(id, name, slug) {
        try {
            const res = await fetch(`${PUBLIC_SERVER_URL}/api/tags/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, slug }),
                credentials: "include"
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to update tag");
            }
            await this.loadTags();
            await this.loadPosts();
            toast.success(`Tag "#${name}" updated successfully!`);
            return true;
        }
        catch (e) {
            toast.error(e.message || "Failed to update tag.");
            return false;
        }
    },
    async deleteTag(id) {
        try {
            const res = await fetch(`${PUBLIC_SERVER_URL}/api/tags/${id}`, {
                method: "DELETE",
                credentials: "include"
            });
            if (!res.ok)
                throw new Error();
            await this.loadTags();
            toast.success("Tag deleted successfully!");
        }
        catch {
            toast.error("Failed to delete tag. Note: Tags with posts cannot be deleted.");
        }
    },
    toggleSelectedCategory(id) {
        const idx = this.state.selectedCategoryIds.indexOf(id);
        if (idx > -1) {
            this.state.selectedCategoryIds.splice(idx, 1);
        }
        else {
            this.state.selectedCategoryIds.push(id);
        }
        this.renderCategorySelect();
    },
    toggleSelectedTag(id) {
        const idx = this.state.selectedTagIds.indexOf(id);
        if (idx > -1) {
            this.state.selectedTagIds.splice(idx, 1);
        }
        else {
            this.state.selectedTagIds.push(id);
        }
        this.renderTagCheckboxes();
    },
    renderSelectedChips(containerId, selected, prefix, onRemove) {
        const chips = document.getElementById(containerId);
        if (!chips)
            return;
        if (selected.length === 0) {
            chips.classList.add("hidden");
            chips.classList.remove("flex");
            chips.innerHTML = "";
            return;
        }
        chips.classList.remove("hidden");
        chips.classList.add("flex");
        chips.innerHTML = selected.map(s => `
      <span class="chip" data-id="${s.id}">
        <span class="truncate max-w-[10rem]">${prefix}${s.name}</span>
        <button type="button" class="chip-remove" data-id="${s.id}" aria-label="Remove ${s.name}">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </span>`).join("");
        chips.querySelectorAll(".chip-remove").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                onRemove(btn.getAttribute("data-id"));
            });
        });
    },
    updateCategoryDropdownUI() {
        const label = document.getElementById("selected-categories-label");
        const menu = document.getElementById("dropdown-category-menu");
        if (!label || !menu)
            return;
        const items = menu.querySelectorAll(".category-item");
        const selected = [];
        items.forEach(item => {
            const id = item.getAttribute("data-id");
            const name = item.getAttribute("data-name");
            const checkIcon = item.querySelector(".check-icon");
            const isSel = this.state.selectedCategoryIds.includes(id);
            checkIcon.classList.toggle("hidden", !isSel);
            item.classList.toggle("is-selected", isSel);
            if (isSel)
                selected.push({ id, name });
        });
        if (selected.length === 0) {
            label.textContent = "Select categories";
            label.classList.add("text-muted-foreground");
        }
        else {
            label.textContent = selected.length === 1 ? selected[0].name : `${selected.length} categories selected`;
            label.classList.remove("text-muted-foreground");
        }
        this.renderSelectedChips("selected-categories-chips", selected, "", (id) => this.toggleSelectedCategory(id));
    },
    updateTagDropdownUI() {
        const label = document.getElementById("selected-tags-label");
        const menu = document.getElementById("dropdown-tags-menu");
        if (!label || !menu)
            return;
        const items = menu.querySelectorAll(".tag-item");
        const selected = [];
        items.forEach(item => {
            const id = item.getAttribute("data-id");
            const name = item.getAttribute("data-name");
            const checkIcon = item.querySelector(".check-icon");
            const isSel = this.state.selectedTagIds.includes(id);
            checkIcon.classList.toggle("hidden", !isSel);
            item.classList.toggle("is-selected", isSel);
            if (isSel)
                selected.push({ id, name });
        });
        if (selected.length === 0) {
            label.textContent = "Select tags";
            label.classList.add("text-muted-foreground");
        }
        else {
            label.textContent = selected.length === 1 ? `#${selected[0].name}` : `${selected.length} tags selected`;
            label.classList.remove("text-muted-foreground");
        }
        this.renderSelectedChips("selected-tags-chips", selected, "#", (id) => this.toggleSelectedTag(id));
    },
    renderPosts() {
        const tableBody = document.getElementById("posts-table-body");
        if (!tableBody)
            return;
        let filteredPosts = this.state.posts;
        if (this.state.searchQuery) {
            const query = this.state.searchQuery;
            filteredPosts = filteredPosts.filter((p) => p.title.toLowerCase().includes(query) ||
                p.content?.toLowerCase().includes(query));
        }
        const isTrashView = this.state.statusFilter === "trash";
        if (isTrashView) {
            filteredPosts = filteredPosts.filter((p) => p.trashed === true);
        }
        else {
            filteredPosts = filteredPosts.filter((p) => p.trashed === false);
            if (this.state.statusFilter === "published") {
                filteredPosts = filteredPosts.filter((p) => p.published === true);
            }
            else if (this.state.statusFilter === "draft") {
                filteredPosts = filteredPosts.filter((p) => p.published === false);
            }
        }
        const totalPosts = filteredPosts.length;
        const totalPages = Math.ceil(totalPosts / this.state.pageSize);
        if (this.state.currentPage > totalPages && totalPages > 0) {
            this.state.currentPage = totalPages;
        }
        if (this.state.currentPage < 1) {
            this.state.currentPage = 1;
        }
        const startIndex = (this.state.currentPage - 1) * this.state.pageSize;
        const endIndex = Math.min(startIndex + this.state.pageSize, totalPosts);
        const pagePosts = filteredPosts.slice(startIndex, endIndex);
        const paginationEl = document.getElementById("posts-pagination");
        const startEl = document.getElementById("pagination-start");
        const endEl = document.getElementById("pagination-end");
        const totalEl = document.getElementById("pagination-total");
        const prevBtn = document.getElementById("btn-posts-prev");
        const nextBtn = document.getElementById("btn-posts-next");
        if (totalPosts === 0) {
            if (startEl)
                startEl.textContent = "0";
            if (endEl)
                endEl.textContent = "0";
            if (totalEl)
                totalEl.textContent = "0";
            if (prevBtn)
                prevBtn.disabled = true;
            if (nextBtn)
                nextBtn.disabled = true;
            if (paginationEl)
                paginationEl.classList.add("hidden");
        }
        else {
            if (startEl)
                startEl.textContent = (startIndex + 1).toString();
            if (endEl)
                endEl.textContent = endIndex.toString();
            if (totalEl)
                totalEl.textContent = totalPosts.toString();
            if (prevBtn)
                prevBtn.disabled = this.state.currentPage === 1;
            if (nextBtn)
                nextBtn.disabled = this.state.currentPage === totalPages;
            if (paginationEl)
                paginationEl.classList.remove("hidden");
        }
        if (totalPosts === 0) {
            tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="p-8 text-center text-muted-foreground font-medium text-sm">No posts found.</td>
        </tr>
      `;
            return;
        }
        tableBody.innerHTML = pagePosts.map((post) => {
            const dateStr = new Date(post.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
            });
            const updatedDateStr = new Date(post.updatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
            });
            let statusBadge = "";
            if (post.trashed) {
                statusBadge = `<span class="px-2 py-0.5 rounded-sm bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs font-semibold tracking-wider uppercase">Trash</span>`;
            }
            else {
                statusBadge = post.published
                    ? `<span class="px-2 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-semibold tracking-wider uppercase">Published</span>`
                    : `<span class="px-2 py-0.5 rounded-sm bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-semibold tracking-wider uppercase">Draft</span>`;
            }
            const categoriesList = post.categories && post.categories.length > 0
                ? `<div class="flex flex-wrap gap-1.5">${post.categories.map((c) => `<span class="px-2 py-0.5 rounded-sm border border-border bg-muted/40 text-foreground/90 font-medium text-xs whitespace-nowrap">${c.name}</span>`).join("")}</div>`
                : `<span class="text-muted-foreground/50 text-sm">—</span>`;
            const tagsStr = post.tags && post.tags.length > 0
                ? post.tags.map((t) => `<span class="px-1.5 py-0.5 rounded-sm bg-muted/65 text-muted-foreground text-xs font-medium border border-transparent whitespace-nowrap">#${t.name}</span>`).join(" ")
                : `<span class="text-muted-foreground/50 text-sm">—</span>`;
            let dropdownMenuHtml = "";
            if (isTrashView) {
                dropdownMenuHtml = `
          <button type="button" class="btn-restore-post w-full text-left px-3 py-2 text-xs hover:bg-muted font-bold text-foreground transition-colors flex items-center gap-2 cursor-pointer" data-id="${post.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            <span>Restore</span>
          </button>
          <button type="button" class="btn-delete-permanent-post w-full text-left px-3 py-2 text-xs hover:bg-destructive/10 font-bold text-destructive transition-colors flex items-center gap-2 cursor-pointer" data-id="${post.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            <span>Delete</span>
          </button>
        `;
            }
            else {
                dropdownMenuHtml = `
          <button type="button" class="btn-edit-post w-full text-left px-3 py-2 text-xs hover:bg-muted font-bold text-foreground transition-colors flex items-center gap-2 cursor-pointer" data-id="${post.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            <span>Edit</span>
          </button>
          <button type="button" class="btn-trash-post w-full text-left px-3 py-2 text-xs hover:bg-destructive/10 font-bold text-destructive transition-colors flex items-center gap-2 cursor-pointer" data-id="${post.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            <span>Delete</span>
          </button>
        `;
            }
            const actionsHtml = `
        <div class="relative inline-block text-left row-dropdown-container">
          <button type="button" class="row-dropdown-trigger p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground cursor-pointer transition-colors" aria-haspopup="true" aria-expanded="false" data-id="${post.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.25"/><circle cx="12" cy="5" r="1.25"/><circle cx="12" cy="19" r="1.25"/></svg>
          </button>
          <div class="row-dropdown-menu absolute right-0 mt-1 w-32 bg-card border border-border rounded-md shadow-lg py-1 hidden z-50 animate-fade-in scale-95 opacity-0 transition-all origin-top-right">
            ${dropdownMenuHtml}
          </div>
        </div>
      `;
            return `
        <tr class="hover:bg-muted/30 transition-colors" data-post-id="${post.id}">
          <td class="p-4 font-semibold text-foreground max-w-[240px] truncate" title="${post.title}">
            <button class="btn-title-edit hover:underline hover:text-primary transition-all text-left font-semibold cursor-pointer outline-hidden select-text text-sm" data-id="${post.id}">
              ${post.title}
            </button>
          </td>
          <td class="p-4">${categoriesList}</td>
          <td class="p-4"><div class="flex flex-wrap gap-1.5">${tagsStr}</div></td>
          <td class="p-4">${statusBadge}</td>
          <td class="p-4 text-muted-foreground">${dateStr}</td>
          <td class="p-4 text-muted-foreground">${updatedDateStr}</td>
          <td class="p-4 text-right font-semibold">
            <div class="flex items-center justify-end gap-2">
              ${actionsHtml}
            </div>
          </td>
        </tr>
      `;
        }).join("");
        // Bind title clicking to open edit view
        tableBody.querySelectorAll(".btn-title-edit").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                e.preventDefault();
                const id = btn.getAttribute("data-id");
                await this.editPost(id);
            });
        });
        // Bind dropdown triggers
        tableBody.querySelectorAll(".row-dropdown-trigger").forEach(trigger => {
            trigger.addEventListener("click", (e) => {
                e.stopPropagation();
                const menu = trigger.nextElementSibling;
                const isOpen = !menu.classList.contains("hidden");
                // Close all other open dropdowns
                document.querySelectorAll(".row-dropdown-menu").forEach(el => {
                    el.classList.add("hidden");
                    el.classList.remove("scale-100", "opacity-100");
                    el.classList.add("scale-95", "opacity-0");
                });
                if (!isOpen) {
                    menu.classList.remove("hidden");
                    setTimeout(() => {
                        menu.classList.remove("scale-95", "opacity-0");
                        menu.classList.add("scale-100", "opacity-100");
                    }, 10);
                }
            });
        });
        // Close all dropdowns when clicking outside
        document.addEventListener("click", () => {
            document.querySelectorAll(".row-dropdown-menu").forEach(menu => {
                menu.classList.add("hidden");
                menu.classList.remove("scale-100", "opacity-100");
                menu.classList.add("scale-95", "opacity-0");
            });
        });
        tableBody.querySelectorAll(".btn-edit-post").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-id");
                await this.editPost(id);
            });
        });
        tableBody.querySelectorAll(".btn-trash-post").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-id");
                const confirmed = await dialog.confirm("Move to Trash", "Are you sure you want to move this post to the Trash?");
                if (confirmed) {
                    await this.trashPost(id);
                }
            });
        });
        tableBody.querySelectorAll(".btn-restore-post").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-id");
                const confirmed = await dialog.confirm("Restore Post", "Are you sure you want to restore this post as a Draft?");
                if (confirmed) {
                    await this.restorePost(id);
                }
            });
        });
        tableBody.querySelectorAll(".btn-delete-permanent-post").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-id");
                const confirmed = await dialog.confirm("Delete Permanently", "Are you sure you want to permanently delete this post? This action is irreversible!");
                if (confirmed) {
                    await this.deletePostPermanently(id);
                }
            });
        });
    },
    renderCategories() {
        const tableBody = document.getElementById("categories-table-body");
        if (!tableBody)
            return;
        if (this.state.categories.length === 0) {
            tableBody.innerHTML = `
        <tr>
          <td colspan="4" class="p-8 text-center text-muted-foreground font-medium">No categories found.</td>
        </tr>
      `;
            return;
        }
        tableBody.innerHTML = this.state.categories.map((c) => `
      <tr class="hover:bg-muted/30 transition-colors">
        <td class="p-4 font-medium text-foreground">${c.name}</td>
        <td class="p-4 text-muted-foreground">${c.slug}</td>
        <td class="p-4 font-medium text-foreground">${c._count?.posts || 0}</td>
        <td class="p-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button class="btn-edit-category p-1 hover:bg-muted rounded-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors" data-id="${c.id}" data-name="${c.name}" title="Edit Category">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>
            <button class="btn-delete-category p-1 hover:bg-destructive/10 rounded-sm text-destructive/75 hover:text-destructive cursor-pointer transition-colors" data-id="${c.id}" title="Delete Category">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join("");
        tableBody.querySelectorAll(".btn-edit-category").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-id");
                const currentName = btn.getAttribute("data-name");
                const newName = await dialog.prompt("Rename Category", "Enter new name for the category:", currentName);
                if (newName && newName !== currentName) {
                    const newSlug = newName
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)/g, "");
                    await this.updateCategory(id, newName, newSlug);
                }
            });
        });
        tableBody.querySelectorAll(".btn-delete-category").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-id");
                const confirmed = await dialog.confirm("Delete Category", "Are you sure you want to permanently delete this category? Associated posts will remain uncategorized.");
                if (confirmed) {
                    await this.deleteCategory(id);
                }
            });
        });
    },
    renderCategorySelect() {
        const menu = document.getElementById("dropdown-category-menu");
        if (!menu)
            return;
        if (this.state.categories.length === 0) {
            menu.innerHTML = `<span class="block px-3 py-2 text-[10px] text-muted-foreground font-semibold">No categories available</span>`;
            this.updateCategoryDropdownUI();
            return;
        }
        menu.innerHTML = this.state.categories.map((c) => `
      <div class="flex items-center justify-between px-3 py-2 hover:bg-muted/80 transition-colors cursor-pointer text-xs font-medium text-foreground/90 select-none category-item" data-id="${c.id}" data-name="${c.name}">
        <span>${c.name}</span>
        <svg class="w-3.5 h-3.5 text-primary check-icon hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
      </div>
    `).join("");
        menu.querySelectorAll(".category-item").forEach(item => {
            item.addEventListener("click", (e) => {
                e.stopPropagation();
                const id = item.getAttribute("data-id");
                this.toggleSelectedCategory(id);
            });
        });
        this.updateCategoryDropdownUI();
    },
    renderTags() {
        const tableBody = document.getElementById("tags-table-body");
        if (!tableBody)
            return;
        if (this.state.tags.length === 0) {
            tableBody.innerHTML = `
        <tr>
          <td colspan="4" class="p-8 text-center text-muted-foreground font-medium">No tags found.</td>
        </tr>
      `;
            return;
        }
        tableBody.innerHTML = this.state.tags.map((t) => `
      <tr class="hover:bg-muted/30 transition-colors">
        <td class="p-4 font-medium text-foreground">${t.name}</td>
        <td class="p-4 text-muted-foreground">${t.slug}</td>
        <td class="p-4 font-medium text-foreground">${t._count?.posts || 0}</td>
        <td class="p-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button class="btn-edit-tag p-1 hover:bg-muted rounded-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors" data-id="${t.id}" data-name="${t.name}" title="Edit Tag">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>
            <button class="btn-delete-tag p-1 hover:bg-destructive/10 rounded-sm text-destructive/75 hover:text-destructive cursor-pointer transition-colors" data-id="${t.id}" title="Delete Tag">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join("");
        tableBody.querySelectorAll(".btn-edit-tag").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-id");
                const currentName = btn.getAttribute("data-name");
                const newName = await dialog.prompt("Rename Tag", "Enter new name for the tag:", currentName);
                if (newName && newName !== currentName) {
                    const newSlug = newName
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)/g, "");
                    await this.updateTag(id, newName, newSlug);
                }
            });
        });
        tableBody.querySelectorAll(".btn-delete-tag").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-id");
                const confirmed = await dialog.confirm("Delete Tag", "Are you sure you want to permanently delete this tag?");
                if (confirmed) {
                    await this.deleteTag(id);
                }
            });
        });
    },
    renderTagCheckboxes() {
        const menu = document.getElementById("dropdown-tags-menu");
        if (!menu)
            return;
        if (this.state.tags.length === 0) {
            menu.innerHTML = `<span class="block px-3 py-2 text-[10px] text-muted-foreground font-semibold">No tags available</span>`;
            this.updateTagDropdownUI();
            return;
        }
        menu.innerHTML = this.state.tags.map((t) => `
      <div class="flex items-center justify-between px-3 py-2 hover:bg-muted/80 transition-colors cursor-pointer text-xs font-medium text-foreground/90 select-none tag-item" data-id="${t.id}" data-name="${t.name}">
        <span>#${t.name}</span>
        <svg class="w-3.5 h-3.5 text-primary check-icon hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
      </div>
    `).join("");
        menu.querySelectorAll(".tag-item").forEach(item => {
            item.addEventListener("click", (e) => {
                e.stopPropagation();
                const id = item.getAttribute("data-id");
                this.toggleSelectedTag(id);
            });
        });
        this.updateTagDropdownUI();
    }
};
// Wire up global variables so that all nested component scripts can access them
if (typeof window !== "undefined") {
    window.toast = toast;
    window.dialog = dialog;
    window.blogStore = blogStore;
}
