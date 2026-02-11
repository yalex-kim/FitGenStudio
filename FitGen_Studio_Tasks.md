**FitGen Studio**  
Development Task Breakdown

Version 1.0  |  2026-02-11  |  For Claude Code Execution

Tasks are ordered by dependency. Each task is independently executable.

# **Phase 0: Project Setup**

Initialize the project with all tooling, folder structure, and deployment pipeline.

## **Task 0.1: Initialize React \+ TypeScript Project**

| Field | Detail |
| :---- | :---- |
| Description | Create new Vite \+ React \+ TypeScript project with proper folder structure |
| Command | npm create vite@latest fitgen-ai \-- \--template react-ts |
| Folder Structure | src/components/, src/features/, src/stores/, src/api/, src/lib/, src/types/ |
| Acceptance Criteria | Project runs locally with \`npm run dev\`, TypeScript compiles without errors |

## **Task 0.2: Install Core Dependencies**

| Field | Detail |
| :---- | :---- |
| Dependencies | tailwindcss, @shadcn/ui, zustand, react-router-dom, @tanstack/react-query, lucide-react, react-dropzone, react-hot-toast, react-compare-image |
| Dev Dependencies | eslint, prettier, @types/\*, vitest |
| Configuration | tailwind.config.ts, tsconfig.json paths, eslint config |
| Acceptance Criteria | All packages installed, Tailwind CSS renders correctly, shadcn/ui components importable |

## **Task 0.3: Configure Vercel Deployment**

| Field | Detail |
| :---- | :---- |
| Description | Connect Git repo to Vercel, configure build settings and environment variables |
| Environment Variables | GEMINI\_API\_KEY, SUPABASE\_URL, SUPABASE\_ANON\_KEY, BLOB\_STORE\_TOKEN |
| Vercel Config | Framework: Vite, Build: npm run build, Output: dist/, Serverless: api/ directory |
| Acceptance Criteria | Push to main auto-deploys, preview deploys on PR, env vars accessible in serverless functions |

## **Task 0.4: Setup Supabase**

| Field | Detail |
| :---- | :---- |
| Description | Create Supabase project and initial database schema |
| Tables | users, models (My Models metadata), garments, generations, projects, usage\_logs |
| RLS Policies | Users can only access their own data |
| Acceptance Criteria | Database accessible from serverless functions, RLS policies tested |

# **Phase 1: Core Generation Pipeline**

Build the fundamental 2-step AI generation pipeline. This is the highest-risk phase and should be validated early.

## **Task 1.1: Gemini API Service Layer**

| Field | Detail |
| :---- | :---- |
| Description | Create a reusable Gemini API client module in src/api/gemini.ts |
| Functions | generateModel(prompt) → image, swapClothing(modelImage, garmentImage, instruction) → image, generateVariation(modelImage, newPosePrompt) → image |
| Error Handling | Retry logic (3 attempts with exponential backoff), timeout handling (60s), structured error responses |
| Acceptance Criteria | All 3 functions return valid image data from Gemini API, errors are caught and returned gracefully |

## **Task 1.2: Prompt Template System**

| Field | Detail |
| :---- | :---- |
| Description | Build a modular prompt assembly system in src/lib/prompts/ |
| Files | modelPrompts.ts (model generation templates), swapPrompts.ts (clothing swap instructions), variationPrompts.ts (pose/background change instructions) |
| Structure | Each template is a function that accepts parameters (gender, bodyType, style, pose, background) and returns an optimized prompt string |
| Presets | 4 style presets (Lovely, Chic, Sporty, Street), 6+ pose presets, 8+ background presets |
| Acceptance Criteria | Prompt assembly produces consistent, high-quality prompts. Each preset generates visually distinct results when tested with Gemini |

## **Task 1.3: API Routes \- Generation Endpoints**

| Field | Detail |
| :---- | :---- |
| Description | Create Vercel serverless functions for the generation pipeline |
| Endpoints | POST /api/generate/model, POST /api/generate/swap, POST /api/generate/variation |
| Input Validation | Validate image format (JPEG/PNG/WebP), size (\<20MB), required parameters |
| Response | Return generated image as base64 or blob URL, include generation metadata (prompt used, timestamp, model version) |
| Acceptance Criteria | All 3 endpoints functional, proper error responses (400, 429, 500), generation logged to usage\_logs table |

## **Task 1.4: Nano Banana Upscale Integration**

| Field | Detail |
| :---- | :---- |
| Description | Integrate Gemini API for 4K image upscaling |
| Endpoint | POST /api/upscale |
| Input | Generated image (from gallery or canvas) |
| Output | 4K upscaled image stored to blob storage |
| Acceptance Criteria | Upscaled image is visibly sharper, processing completes within 10 seconds |

# **Phase 2: UI Foundation**

Build the core UI shell and navigation before adding feature-specific screens.

## **Task 2.1: Layout Shell & Routing**

| Field | Detail |
| :---- | :---- |
| Description | Create the app shell with sidebar navigation and routing |
| Routes | / (Dashboard), /studio (Main workspace), /assets (Asset Library), /gallery (Results), /settings (Account) |
| Components | AppLayout (sidebar \+ content area), Sidebar (nav items with icons), TopBar (user avatar, credits display) |
| Responsive | Sidebar collapses to hamburger menu on mobile |
| Acceptance Criteria | All routes render correctly, navigation works, layout is responsive |

## **Task 2.2: Authentication Flow**

| Field | Detail |
| :---- | :---- |
| Description | Implement user authentication with Clerk or NextAuth.js |
| Providers | Email/Password, Google OAuth |
| Pages | Login, Register, Password Reset |
| Integration | Auth state available in Zustand store, protected routes redirect to login |
| Acceptance Criteria | User can register, login, logout. Auth state persists across page refresh |

## **Task 2.3: Dashboard Page**

| Field | Detail |
| :---- | :---- |
| Description | Build the landing page after login |
| Sections | Welcome banner, Recent Projects (grid of last 8 generations), Quick Stats (images generated this month, models saved, credits remaining), Quick Action buttons (New Lookbook, Upload Garment) |
| Data Source | Supabase queries for user's generations and usage |
| Acceptance Criteria | Dashboard loads with real data, quick actions navigate to correct screens |

# **Phase 3: Studio (Main Workspace)**

The core product screen. Build in sub-tasks for the 3-panel layout.

## **Task 3.1: Studio Layout \- 3 Panel Structure**

| Field | Detail |
| :---- | :---- |
| Description | Create the Studio page with resizable 3-panel layout |
| Left Panel | Assets panel with tabs (Product, Models, Reference), collapsible |
| Center Panel | Canvas area for image display, initially shows empty state with CTA |
| Right Panel | Control panel with sections (Model, Styling, Director, Action), collapsible |
| Acceptance Criteria | Panels render correctly, are resizable, collapse/expand on mobile |

## **Task 3.2: Left Panel \- Asset Upload & Management**

| Field | Detail |
| :---- | :---- |
| Description | Implement garment upload and asset browsing |
| Upload | Drag-and-drop zone using react-dropzone, supports JPEG/PNG/WebP, auto background removal toggle (calls Gemini or external API) |
| Product Tab | Grid of uploaded garments with thumbnail, name, category tag |
| Models Tab | Grid of saved models from My Models library |
| Reference Tab | Grid of uploaded reference/mood images |
| Acceptance Criteria | Files upload successfully, thumbnails display, assets persist in Supabase \+ blob storage |

## **Task 3.3: Right Panel \- Model Selection (Model Agency)**

| Field | Detail |
| :---- | :---- |
| Description | Build the model selection UI in the control panel |
| Preset Models | Grid of 4 style presets (Lovely, Chic, Sporty, Street) with preview thumbnails |
| Custom Options | Sliders/dropdowns for: Gender, Body Type, Age Range, Hair Style, Ethnicity |
| My Models | Section showing user's saved models with 'Use This Model' action |
| Generate Model Button | Triggers Step 1 of the pipeline, shows loading state |
| Save Model | After generation, option to save to My Models library |
| Acceptance Criteria | Selecting preset populates options, custom generation works, model saves to library |

## **Task 3.4: Right Panel \- Styling & Director Controls**

| Field | Detail |
| :---- | :---- |
| Description | Build styling and background/mood controls |
| Styling Section | Toggle buttons: Tuck-in/Untuck, Sleeve Roll, Button Open/Closed. Auto-Coordination switch with preview of suggested items |
| Director Section | Background preset grid (Studio, Outdoor, Urban, Cafe, etc.), Mood reference image drop zone, Lighting preset dropdown (Studio, Golden Hour, Overcast, Flash) |
| Generate Button | Primary CTA at bottom of panel. Shows estimated time. Disabled until both model and garment are selected |
| Acceptance Criteria | All controls update Zustand store, Generate button assembles correct prompt and triggers API call |

## **Task 3.5: Center Panel \- Canvas & Results Display**

| Field | Detail |
| :---- | :---- |
| Description | Build the main canvas area for displaying generated results |
| Grid View | 2x2 grid showing 4 generated variations simultaneously |
| Detail View | Click on any image to see full-size view |
| Compare View | Slider comparing original garment photo vs generated lookbook (using react-compare-image) |
| Loading State | Skeleton loader with progress indication during generation |
| Toolbar | On image hover/select: Download, Upscale, Regenerate, Save to Gallery buttons |
| Acceptance Criteria | Generated images display correctly, compare slider works, toolbar actions functional |

# **Phase 4: Asset Library & Gallery**

## **Task 4.1: Asset Library Page**

| Field | Detail |
| :---- | :---- |
| Description | Dedicated page for managing all user assets |
| Tabs | My Models (saved generated models), My Clothes (uploaded garments), References (mood/style images) |
| Actions | View, Delete, Rename, Use in Studio (navigates to Studio with asset pre-loaded) |
| Filtering | Search by name, filter by category/date |
| Acceptance Criteria | All CRUD operations work, assets load from storage, 'Use in Studio' pre-populates correctly |

## **Task 4.2: Gallery Page**

| Field | Detail |
| :---- | :---- |
| Description | Archive of all generated lookbook images |
| Display | Masonry grid layout with lazy loading |
| Metadata | Each image shows: generation date, model used, garment used, prompt summary |
| Actions | Download (original \+ 4K), Delete, Re-edit in Studio, Share link |
| Batch Operations | Select multiple images for bulk download or delete |
| Acceptance Criteria | Gallery loads efficiently (pagination/infinite scroll), all actions work, batch operations functional |

# **Phase 5: User Management & Billing**

## **Task 5.1: Settings Page**

| Field | Detail |
| :---- | :---- |
| Description | User account and subscription management |
| Sections | Profile (name, email, avatar), Subscription (current tier, upgrade/downgrade), Usage (images generated, storage used), Preferences (default style, watermark on/off for paid tiers) |
| Acceptance Criteria | Profile editable, subscription info displays correctly, usage stats accurate |

## **Task 5.2: Usage Tracking & Rate Limiting**

| Field | Detail |
| :---- | :---- |
| Description | Implement generation limits based on subscription tier |
| Logic | Free: 10/month, Pro: 500/month, Business: unlimited |
| Enforcement | Check usage count before generation API call, return 429 if exceeded |
| UI | Display remaining credits in TopBar and before generation confirmation |
| Acceptance Criteria | Limits enforced correctly, usage count increments on successful generation, UI reflects current usage |

# **Phase 6: Polish & Optimization**

## **Task 6.1: Responsive Design Pass**

| Field | Detail |
| :---- | :---- |
| Description | Ensure all screens work on tablet and mobile |
| Breakpoints | Mobile (\<640px): Single column, bottom navigation. Tablet (640-1024px): Collapsible panels. Desktop (\>1024px): Full 3-panel layout |
| Priority Screens | Studio (most complex), Dashboard, Gallery |
| Acceptance Criteria | All screens usable on iPhone 14, iPad, and desktop. No horizontal scroll, no overlapping elements |

## **Task 6.2: Loading States & Error Handling**

| Field | Detail |
| :---- | :---- |
| Description | Add comprehensive loading and error states throughout the app |
| Loading | Skeleton loaders for all data-dependent components, progress indicators for generation, optimistic UI for CRUD operations |
| Errors | Toast notifications for API errors, inline error messages for form validation, fallback UI for failed image loads, retry buttons for generation failures |
| Acceptance Criteria | No blank screens during loading, all errors surfaced to user with actionable messaging |

## **Task 6.3: Performance Optimization**

| Field | Detail |
| :---- | :---- |
| Description | Optimize for speed and efficiency |
| Image Optimization | Lazy loading for gallery/grid images, WebP format for thumbnails, progressive image loading for generated results |
| Code Splitting | Route-based code splitting with React.lazy, separate chunks for Studio vs Gallery vs Settings |
| Caching | React Query cache for API responses, browser cache headers for static assets, service worker for offline asset access (stretch) |
| Acceptance Criteria | Lighthouse score \>90 on Performance, \<1.5s FCP, \<3s LCP on 4G connection |

## **Task 6.4: Watermark System**

| Field | Detail |
| :---- | :---- |
| Description | Add watermarks to Free tier generated images |
| Visible Watermark | Semi-transparent 'FitGen Studio' text overlay on Free tier downloads |
| Invisible Watermark | Steganographic watermark on all generated images for traceability |
| Acceptance Criteria | Free tier images have visible watermark, Pro+ images are clean, invisible watermark detectable with verification tool |

# **Task Summary**

| Phase | Tasks | Estimated Complexity | Priority |
| :---- | :---- | :---- | :---- |
| Phase 0: Project Setup | 4 tasks (0.1 \- 0.4) | Low | P0 \- Do First |
| Phase 1: Core Pipeline | 4 tasks (1.1 \- 1.4) | High (core risk) | P0 \- Do First |
| Phase 2: UI Foundation | 3 tasks (2.1 \- 2.3) | Medium | P0 \- Do First |
| Phase 3: Studio | 5 tasks (3.1 \- 3.5) | High (most complex UI) | P0 \- Do First |
| Phase 4: Library & Gallery | 2 tasks (4.1 \- 4.2) | Medium | P1 |
| Phase 5: User Management | 2 tasks (5.1 \- 5.2) | Medium | P1 |
| Phase 6: Polish | 4 tasks (6.1 \- 6.4) | Medium | P2 |

Total: 24 tasks across 7 phases. Phases 0-3 constitute the MVP and should be completed first. Each task is designed to be independently assignable to Claude Code with clear acceptance criteria.