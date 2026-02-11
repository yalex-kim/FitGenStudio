**FitGen Studio**  
Product Requirements Document

Version 1.0  |  2026-02-11

AI-Powered Fashion Lookbook Generation SaaS

# **1\. Product Overview**

**Service Name:** FitGen Studio (Fashion Image Generation AI)

**Definition:** A SaaS solution that generates high-resolution commercial lookbook images by combining AI-generated models with user-uploaded garment photos.

**Core Pipeline:** 2-Step Generation — Step 1: Generate model (face/pose/background) via prompt → Step 2: Swap clothing onto the generated model using garment image.

## **1.1 Core Value Proposition**

* Cost Efficiency: Eliminates model hiring, studio rental, and photography equipment costs.

* High Fidelity: Preserves garment logos, patterns, and textures through Gemini's image editing capabilities.

* Creative Freedom: Unlimited model/pose/background combinations via prompt templates.

* Consistency: Same model image reused across multiple garments ensures face and identity consistency.

## **1.2 Target Users**

| Segment | Description | Key Need |
| :---- | :---- | :---- |
| Small Online Sellers | Dongdaemun/Musinsa/Ably sellers | Fast, cheap lookbook generation |
| Indie Fashion Brands | Small brands without photo budget | Professional-quality product images |
| Fashion Marketplaces | Platforms needing consistent imagery | Bulk generation with style consistency |
| Social Commerce Sellers | Instagram/TikTok shop operators | Quick turnaround, varied styles |

# **2\. Core Features**

## **2.1 AI Model Agency (Virtual Model Generation)**

Users create virtual models through prompt-based generation. Models are saved as reusable assets.

### **Preset Personas**

Pre-configured prompt templates for common model styles:

* Lovely: Soft, feminine aesthetic with warm tones

* Chic: Sophisticated, editorial style

* Sporty: Active, energetic appearance

* Street: Urban, casual street fashion look

### **Custom Model Studio**

Users can create custom models by specifying detailed attributes:

* Demographics: Gender, age range, ethnicity

* Physical: Body type (Slim/Athletic/Plus), height impression, hair style & color

* Style Direction: Overall mood and aesthetic

### **Model Library (My Models)**

Generated models are saved to the user's asset library. The same model image is reused as the base for clothing swaps, ensuring face consistency across all generated lookbooks.

## **2.2 AI Clothing Swap (Core Generation)**

The primary value-generating feature. Takes a saved model image \+ uploaded garment photo and produces a lookbook image with the garment naturally worn by the model.

### **Workflow**

* User uploads garment image (hanger shot, flat lay, or mannequin photo)

* User selects a model from My Models library

* System generates lookbook image with garment swapped onto the model

* Multiple garments can be swapped onto the same model for catalog consistency

### **Supported Categories**

| Category | Priority | Notes |
| :---- | :---- | :---- |
| Tops (T-shirts, shirts, blouses) | P0 \- MVP | Best swap quality expected |
| Outerwear (jackets, coats) | P0 \- MVP | Important for seasonal catalogs |
| Bottoms (pants, skirts) | P1 | Requires pose-aware fitting |
| Dresses / One-pieces | P1 | Full-body swap needed |
| Accessories (bags, hats) | P2 | Lower priority, partial swap |

## **2.3 Pose & Background Variation**

Users can generate multiple poses and backgrounds for the same model, then apply clothing to each variation.

### **Pose Presets**

* Standing (front, 3/4, side)

* Walking

* Seated

* Dynamic / Action poses

### **Background Presets**

* Studio: White, gray, colored seamless backgrounds

* Outdoor: Park, street, urban, nature settings

* Lifestyle: Cafe, office, home interior

* Custom: User-described background via prompt

## **2.4 Style Reference (Mood Director)**

Instead of the full Style Mixer from the original plan, a simplified mood reference system:

* Users can upload a reference image and describe what to extract (lighting, mood, color tone)

* Gemini interprets the reference and applies the mood to the generation

* Labeled as 'Beta' feature given accuracy limitations

## **2.5 Fit Control (Styling Options)**

Prompt-based garment styling adjustments:

* Tuck-in / Untuck toggle

* Sleeve roll-up option

* Button open/closed

* Auto-Coordination: AI suggests matching bottoms/shoes when only a top is uploaded

Note: These are prompt-level instructions. Accuracy is not guaranteed and results should be presented as 'styling suggestions'.

## **2.6 Post-Processing Tools**

### **Upscale**

4K upscaling via Nano Banana or equivalent upscaling API for print-ready output.

### **Basic Editing**

Gemini-based touch-up for minor issues: background cleanup, color adjustment requests via natural language.

# **3\. User Flow**

## **3.1 Primary Flow: Lookbook Generation**

| Step | Action | Screen |
| :---- | :---- | :---- |
| 1 | Sign up / Login | Auth Page |
| 2 | Create or select a model from My Models | Studio \> Model Agency |
| 3 | Upload garment image(s) | Studio \> Product Upload |
| 4 | Select pose and background (or use defaults) | Studio \> Director Panel |
| 5 | Click 'Generate' → System runs 2-step pipeline | Studio \> Canvas |
| 6 | Review 4 generated variations | Studio \> Canvas (Grid View) |
| 7 | Select best result → Optional: Upscale/Edit | Studio \> Canvas (Detail) |
| 8 | Download final image | Studio \> Download |

# **4\. UI/UX Structure**

## **4.1 Global Layout**

Three-panel layout optimized for production workflows:

* Left Panel (Assets): Product uploads, My Models library, reference images

* Center Panel (Canvas): Generated image display, comparison view, editing toolbar

* Right Panel (Controls): Model selection, styling options, background/mood settings, Generate button

## **4.2 Sitemap**

| Page | Description |
| :---- | :---- |
| Dashboard | Home, recent projects, credit/usage status |
| Studio | Main workspace for lookbook generation (3-panel layout) |
| Asset Library | My Models, My Clothes (uploaded garments), References |
| Gallery | Generated results archive with download options |
| Settings | Account, membership, watermark management |

## **4.3 Studio Detail**

### **Left Panel \- Assets**

* \[Product\] tab: Drag-and-drop garment upload, auto background removal toggle

* \[Models\] tab: Grid view of saved models with quick-select

* \[Reference\] tab: Style/mood reference images

### **Center Panel \- Canvas**

* Grid view: 4 generated variations displayed in 2x2 layout

* Compare view: Original garment vs generated lookbook slider

* Toolbar (on image select): Upscale, Download, Edit, Regenerate

### **Right Panel \- Controls**

* Section 1 \- Model: Preset/Custom model selector with filter (gender, body type)

* Section 2 \- Styling: Fit control toggles, auto-coordination switch

* Section 3 \- Director: Background presets, mood reference slot

* Section 4 \- Action: Generate button with estimated time display

# **5\. Business Model**

| Tier | Price | Features |
| :---- | :---- | :---- |
| Starter (Free) | Free | 1 preset model, basic backgrounds, 10 images/month (watermarked) |
| Pro | TBD/month | All presets, custom models (5 saved), HD output, 500 images/month, upscale |
| Business | TBD/month | Unlimited custom models, team sharing, API access, priority generation, no watermark |

Note: Pricing to be determined based on Gemini API cost structure changes. Currently operating on unlimited API access.

# **6\. Safety & Ethics Policy**

* Portrait Rights: Custom model creation from real person photos requires identity verification and consent form

* Content Safety: NSFW filter applied to all generations. Celebrity/politician face synthesis blocked

* Traceability: Invisible watermark (SynthID or equivalent) embedded in all generated images

* Terms of Service: Clear usage policy prohibiting deepfake, fraud, and unauthorized likeness use

# **7\. Success Metrics (KPIs)**

| Metric | Target | Measurement |
| :---- | :---- | :---- |
| Generation Quality Score | \>4.0/5.0 user rating | Post-generation feedback survey |
| Garment Fidelity | \>90% logo/pattern preservation | Manual QA sampling |
| Generation Time | \<30 seconds per image | Server-side latency tracking |
| User Retention (M1) | \>40% | Monthly active user tracking |
| Free-to-Pro Conversion | \>5% | Subscription analytics |

