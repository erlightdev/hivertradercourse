# Project Checkpoint and Context Document

This document tracks the comprehensive status, architectural layout, implementation details, and design decisions of the Hiver Trader Course project. Read this file at the start of any new session or task to ensure perfect alignment with existing patterns.

---

## 1. Project Overview & Tech Stack

The project is a high-performance monorepo platform designed for hosting trader training courses, blogs, live sessions, projects, analytics, and collaborative chat.

### Core Stack
- **Monorepo Build System:** Turborepo (`turbo.json`)
- **Frontend Framework:** Astro v6 (SSR with Node adapter `@astrojs/node` for state, sessions, and APIs)
- **Styling:** Tailwind CSS v4 (incorporating modern utility rules, CSS variables, and gradients)
- **Backend APIs:** Hono (Node Server API routing layer mounted on `apps/server`)
- **Database Layer:** Prisma ORM (with multi-file schema support, executing against PostgreSQL)
- **Authentication:** Better Auth (handling credentials, OTP signups, session persistence, and custom credential states)
- **Interactive Tools:** Tiptap Editor (for blog curation with bubble, drag-handle, and text extensions) and web-component based Emoji Pickers (`emoji-picker-element`).

---

## 2. Directory Structure

The workspace is organized into a clean mono-repo structure:

```
├── apps/
│   ├── web/                     # Astro Frontend & SSR Routes
│   │   ├── src/
│   │   │   ├── components/      # Modular layout components & sub-views
│   │   │   ├── lib/             # Global stores & auth client
│   │   │   └── pages/           # Landing page, authentication, & dashboard shell
│   └── server/                  # Hono Server handling accounts & blogs APIs
├── packages/
│   ├── auth/                    # Shared Better Auth configuration
│   ├── db/                      # Multi-file Prisma schema & DB actions
│   ├── env/                     # Zod-validated safe env variables
│   └── config/                  # Shared workspace configurations
├── turbo.json                   # Build & pipeline runner
├── checkpoint.md                # This file (master context)
└── package.json                 # Monorepo dependencies & script entrypoints
```

---

## 3. Detailed Component & File Guide

### 3.1. Master Dashboard Shell (`apps/web/src/pages/dashboard.astro`)
- Orchestrates the primary dashboard interface.
- Contains a client-side `#dashboard-loading` overlay mask that displays on initial load while checking `localStorage`. This prevents visual flicker before state-recovery scripts finish resolving.
- Intercepts side-navigation state, restoring sidebar collapsing, main menu options, and blog editor views to their exact previous states.

### 3.2. Global Store & Toast System (`apps/web/src/lib/dashboard-store.ts`)
- **`toast`**: Fully custom, lightweight alert drawer with success, error, and info styles. Mounts to `#toaster-container` with custom entry animations.
- **`dialog`**: Custom replacement for native `window.confirm` and `window.prompt` overlays with sleek, dark dark-mode modals.
- **`blogStore`**: Keeps frontend posts, categories, tags, and SEO sheets synchronized via client-side requests to the Hono API. Emits global events like `blog-posts-updated` and `active-view-changed`.

### 3.3. Modular Blog Suite (`apps/web/src/components/blog/`)
To keep codebase maintenance high and maintain a modular design, the monolithic blog components have been separated:
- **`BlogPanel.astro`**: Parent layout coordinator for the Blog menu item. Shows/hides sub-views depending on current state.
- **`BlogPostsView.astro`**: Listing of all drafted/published posts using absolute aligned 3-dot dropdown cells for actions (Edit, Delete, Toggle Publish).
- **`BlogEditorView.astro`**: Rich Tiptap writer with title focus, slug binding, content serialization, and category/tag selectors.
- **`SeoSheet.astro`**: Modular SEO overlay drawer sliding in from the right to inspect Google/X/Facebook search appearance metadata.
- **`BlogCategoriesView.astro`**: Dynamic category additions, searches, and color tag configurations.
- **`BlogTagsView.astro`**: Dynamic tag management matching posts to relevant topics.

### 3.4. Account Settings (`apps/web/src/components/dashboard/ProfileSettingsModal.astro`)
- Multi-tabbed account popup.
- **Profile Tab**: Enables editing names, uploading profile avatars, and choosing personalized theme colors.
- **Preferences Tab**: Configures local storage preferences (e.g., auto-save intervals, sidebar layout modes).
- **Security Tab**: Facilitates secure password updates. Accommodates users who signed up with passwordless OTP by allowing them to create a password for the first time.

### 3.5. Group Chat UI (`apps/web/src/components/chat/ChatView.astro`)
- Compact Messenger-style borderless bubbles.
- Features a deterministic sender background color generator, guaranteeing color persistence for each user.
- Utilizes `emoji-picker-element` inside a compact, floating input pill popover.
- Layout height is constrained to `h-[calc(100vh-11.5rem)]` and top-navigation elements are optimized to ensure full responsiveness without viewport spillages.

---

## 4. Key Database & Authentication Adjustments

### 4.1. Passwordless Setup Tracking
Better Auth pre-creates credential rows with a temporary `tempPassword` for OTP email registrants. This makes standard credential checks insufficient to determine if a user has configured a custom password.
- **Prisma Schema Update (`packages/db/prisma/schema/auth.prisma`)**: Added a `passwordSet Boolean @default(false)` column to the `User` model.
- **Backend Handling (`apps/server/src/index.ts`)**:
  - `/api/account-status` inspects `passwordSet` directly.
  - `/api/set-initial-password` sets the password for users where `passwordSet` is false and marks it true upon successful resolution.
  - Registration hooks are configured to mark `passwordSet` as true for traditional credential signups.

---

## 5. Architectural Design Decisions

1. **Global Object Bindings (`(window as any)`)**:
   Key stores (`window.blogStore`, `window.toast`, `window.dialog`) are bound to the window object to bypass Astro `<script>` module boundaries, enabling cross-component reactivity without heavy frontend library overhead.
2. **Deterministic UI State Recovery**:
   Using `localStorage` with initial loading screens hides page element swapping.
3. **Tailwind scoping in Astro**:
   Primary sidebar and theme settings use global stylesheets and `is:global` style attributes within Astro templates to guarantee style rules apply correctly to deep children components.
4. **No-Whitespace Bubble Rendering**:
   Bubble text variables (`${msg.text}`) in the Javascript templates are written fully side-by-side with tag definitions to prevent template indentation spaces from bleeding as empty whitespace inside the message rendering.

---

## 6. How to Run & Verify

- **Build Workspace:** `npm run build`
- **Start Dev Environment:** `npm run dev`
- **Database Studio:** `npm run db:studio` (inside packages/db)

---

## 7. Next Steps

- Implement dashboard panels for **Courses**, **Analytics**, **Projects**, and **1:1 Live Sessions** (scaffolding inside `apps/web/src/components/` is ready).
- Polish chat layouts and add real-time WebSocket integrations.
- Set up automated testing pipelines.
