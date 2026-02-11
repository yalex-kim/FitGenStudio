**FitGen Studio**  
Technical Requirements Document

Version 1.0  |  2026-02-11

# **1\. Architecture Overview**

## **1.1 System Architecture**

FitGen Studio follows a modern JAMstack-inspired architecture with a React frontend deployed on Vercel, communicating with serverless API routes that orchestrate calls to external AI services.

| Layer | Technology | Role |
| :---- | :---- | :---- |
| Frontend | React \+ TypeScript \+ Vite | User interface, asset management, canvas display |
| UI Framework | shadcn/ui \+ Tailwind CSS | Component library and styling |
| State Management | Zustand | Client-side state (models, images, settings) |
| Routing | React Router v6 | SPA navigation |
| API Layer | Vercel Serverless Functions | Gemini API orchestration, image processing |
| AI Engine (Generation) | Google Gemini API(Nano Banana Pro) | Model generation, clothing swap, style transfer |
| AI Engine (Upscale) | Google Gemini API(Nano Banana Pro) | 4K image upscaling |
| Storage | Vercel Blob | User assets (models, garments, results) |
| Auth | NextAuth.js or Clerk | User authentication and session management |
| Database | Supabase (PostgreSQL) | User data, project metadata, usage tracking |
| Deployment | Vercel | Frontend hosting, serverless functions, edge network |

## **1.2 Core Pipeline: 2-Step Generation**

The fundamental generation pipeline consists of two sequential Gemini API calls:

### **Step 1: Model Generation**

Input: Structured prompt assembled from user selections (gender, body type, style, pose, background).

Output: Full-body model image with specified attributes.

Caching: Generated model images are stored in user's 'My Models' library for reuse.

### **Step 2: Clothing Swap**

Input: Base model image (from Step 1 or My Models) \+ garment image uploaded by user.

Output: Lookbook image with garment naturally applied to the model.

Gemini Capability: Leverages Gemini's image editing to replace clothing while preserving face, pose, background, and body proportions.

### **Step 2-B: Pose Variation (Optional)**

Input: Existing model image \+ new pose/background description.

Output: Same person in a different pose or setting.

Use Case: Creating multiple lookbook angles for the same model-garment combination.

# **2\. Technology Stack Detail**

## **2.1 Frontend Architecture**

### **Project Structure**

Monorepo structure using Vite with the following key directories:

* src/components/ — Reusable UI components (shadcn/ui based)

* src/features/ — Feature modules (studio, gallery, models, auth)

* src/stores/ — Zustand stores for state management

* src/api/ — API client functions for backend communication

* src/lib/ — Utilities, prompt templates, constants

* src/types/ — TypeScript type definitions

### **Key Frontend Libraries**

| Library | Version | Purpose |
| :---- | :---- | :---- |
| react | ^19.x | UI framework |
| typescript | ^5.x | Type safety |
| vite | ^6.x | Build tool and dev server |
| tailwindcss | ^4.x | Utility-first CSS |
| shadcn/ui | latest | Accessible component primitives |
| zustand | ^5.x | Lightweight state management |
| react-router-dom | ^7.x | Client-side routing |
| react-dropzone | ^14.x | File upload handling |
| react-compare-image | ^3.x | Before/after image comparison |
| react-hot-toast | ^2.x | Toast notifications |
| lucide-react | latest | Icon library |
| @tanstack/react-query | ^5.x | Server state & API caching |

## **2.2 Backend / API Architecture**

Serverless functions deployed on Vercel handle all API orchestration. No dedicated backend server required.

### **API Endpoints**

| Endpoint | Method | Description |
| :---- | :---- | :---- |
| /api/generate/model | POST | Generate new model image (Step 1\) |
| /api/generate/swap | POST | Swap clothing onto model (Step 2\) |
| /api/generate/variation | POST | Generate pose/background variation (Step 2-B) |
| /api/upscale | POST | Upscale image via Nano Banana |
| /api/assets/upload | POST | Upload garment image to storage |
| /api/assets/models | GET/POST/DELETE | CRUD for My Models library |
| /api/assets/garments | GET/POST/DELETE | CRUD for uploaded garments |
| /api/gallery | GET | Fetch generated results |
| /api/user/usage | GET | Get credit/usage information |

## **2.3 Gemini API Integration**

### **Model Selection**

Use Gemini 3.0 (or latest available model with image generation support) for both text-to-image and image-to-image tasks.

### **Prompt Engineering System**

The prompt system is the core technical asset of FitGen Studio. Prompts are assembled from modular templates:

| Component | Example Values | Assembled Into |
| :---- | :---- | :---- |
| Gender | female, male | Base description |
| Body Type | slim, athletic, plus-size | Base description |
| Age Range | 20s, 30s, 40s | Base description |
| Style Preset | chic, lovely, sporty, street | Style modifier |
| Pose | standing front, walking, seated | Pose instruction |
| Background | white studio, urban street, park | Scene description |
| Lighting | studio lighting, golden hour, overcast | Lighting modifier |
| Camera | full body shot, 3/4 shot, fashion editorial | Camera instruction |

Prompt templates are stored as JSON configuration files and versioned. A/B testing framework should be implemented to continuously optimize prompt quality.

### **API Call Pattern**

Step 1 (Model Generation): Text prompt → Gemini generates image.

Step 2 (Clothing Swap): Image (model) \+ Image (garment) \+ Text instruction → Gemini edits image.

Step 3 (Fine tune): Image (model+garment) \+ Text instruction → Gemini edits image.

Rate Limiting: Implement client-side queuing to prevent API throttling. Display queue position to users.

## **2.4 Storage Architecture**

| Data Type | Storage | Retention |
| :---- | :---- | :---- |
| User-uploaded garments | Vercel Blob | Until user deletes |
| Generated model images (My Models) | Vercel Blob | Until user deletes |
| Generated lookbook results | Vercel Blob | Until user deletes |
| User metadata & projects | Supabase PostgreSQL | Account lifetime |
| Prompt templates | Git repository (JSON) | Version controlled |
| Usage/billing logs | Supabase PostgreSQL | Indefinite |

## **2.5 Authentication & Authorization**

Clerk or NextAuth.js for authentication with the following providers:

* Email/Password

* Google OAuth


Role-based access: Free, Pro, Business tiers with feature gating enforced at both frontend (UI visibility) and backend (API validation) levels.

# **3\. Performance Requirements**

| Metric | Target | Notes |
| :---- | :---- | :---- |
| Model Generation (Step 1\) | \< 15 seconds | Single Gemini API call |
| Clothing Swap (Step 2\) | \< 15 seconds | Single Gemini API call |
| Full Pipeline (4 variations) | \< 60 seconds | Parallel generation of 4 variants |
| Image Upscale (4K) | \< 10 seconds | Nano Banana API |
| Page Load (First Contentful Paint) | \< 1.5 seconds | Vercel edge network \+ code splitting |
| Asset Upload | \< 3 seconds for 10MB image | Direct upload to blob storage |

# **4\. Security Considerations**

* API Key Management: Gemini and Nano Banana API keys stored in Vercel environment variables, never exposed to client

* Input Validation: All uploaded images validated for file type (JPEG, PNG, WebP), size limits (max 20MB), and basic content safety

* NSFW Filtering: Pre-generation content safety check on uploaded garment images

* Rate Limiting: Per-user generation limits enforced at API layer based on tier

* CORS: Strict origin policy, only allowing requests from the FitGen Studio domain

* Data Encryption: TLS in transit, encrypted at rest in blob storage

# **5\. Deployment Strategy**

## **5.1 Environment Setup**

| Environment | URL | Purpose |
| :---- | :---- | :---- |
| Development | localhost:5173 | Local development with Vite |
| Staging | staging.fitgen.studio | Preview deployments on Vercel |
| Production | app.fitgen.studio | Production deployment |

## **5.2 CI/CD**

* Git push to main → Vercel auto-deploys to production

* Pull request → Vercel creates preview deployment for review

* Environment variables managed via Vercel dashboard

## **5.3 Monitoring**

* Vercel Analytics for frontend performance

* Sentry for error tracking

* Custom logging for Gemini API call success rates, latency, and error patterns

# **6\. Known Constraints & Risks**

| Risk | Impact | Mitigation |
| :---- | :---- | :---- |
| Gemini API pricing changes | High — cost model invalidation | Monitor pricing, build abstraction layer for potential API switch |
| Gemini image quality inconsistency | Medium — user satisfaction | Generate 4 variants, prompt optimization, user feedback loop |
| Complex pattern/logo degradation | Medium — fidelity issues | Post-generation comparison tool, manual retry option |
| API rate limits | Medium — scaling bottleneck | Queue system, tier-based priority, caching |
| Gemini API downtime | High — service outage | Health check monitoring, user notification system |

