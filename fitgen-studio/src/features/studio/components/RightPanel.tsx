import { useState } from "react";
import toast from "react-hot-toast";
import { useStudioStore } from "@/stores/studioStore";
import { useAssetStore } from "@/stores/assetStore";
import { useAuthStore } from "@/stores/authStore";
import { useUsageStore } from "@/stores/usageStore";
import { useGalleryStore } from "@/stores/galleryStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { uploadBase64ToStorage } from "@/lib/storageUpload";
import { cn } from "@/lib/utils";
import type { StudioStep } from "@/stores/studioStore";
import {
  Sparkles,
  Heart,
  Gem,
  Zap,
  Footprints,
  Wand2,
  Loader2,
  AlertTriangle,
  ArrowRightLeft,
  Shirt,
  User,
  Camera,
  UserRound,
  Clapperboard,
  SlidersHorizontal,
  ArrowUpFromLine,
  MessageSquareText,
  Send,
  X,
  Palette,
  Users,
} from "lucide-react";

const STYLE_PRESETS = [
  { id: "lovely", label: "Lovely", icon: Heart, description: "Soft, feminine" },
  { id: "chic", label: "Chic", icon: Gem, description: "Sophisticated" },
  { id: "sporty", label: "Sporty", icon: Zap, description: "Active, energetic" },
  { id: "street", label: "Street", icon: Footprints, description: "Urban, casual" },
] as const;

const BACKGROUND_PRESETS = [
  { id: "white-studio", label: "White Studio" },
  { id: "gray-studio", label: "Gray Studio" },
  { id: "outdoor-park", label: "Park" },
  { id: "outdoor-street", label: "Street" },
  { id: "urban", label: "Urban" },
  { id: "cafe", label: "Cafe" },
  { id: "office", label: "Office" },
  { id: "nature", label: "Nature" },
];

const POSE_PRESETS = [
  { id: "standing", label: "Standing" },
  { id: "walking", label: "Walking" },
  { id: "running", label: "Running" },
  { id: "seated", label: "Seated" },
  { id: "dynamic", label: "Dynamic" },
  { id: "leaning", label: "Leaning" },
];

const CAMERA_ANGLE_PRESETS = [
  { id: "front", label: "Front" },
  { id: "three-quarter", label: "3/4 Angle" },
  { id: "side", label: "Side/Profile" },
  { id: "low-angle", label: "Low Angle" },
  { id: "high-angle", label: "High Angle" },
  { id: "over-shoulder", label: "Over Shoulder" },
];

const FRAMING_PRESETS = [
  { id: "full-body", label: "Full Body" },
  { id: "three-quarter-body", label: "3/4 Body" },
  { id: "upper-body", label: "Upper Body" },
  { id: "close-up", label: "Close-up" },
];

/**
 * Load an image URL into an HTMLImageElement.
 * Works with blob:, data:, and https: URLs.
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

/**
 * Convert an image URL to a compressed base64 string.
 * Resizes to fit within maxDim (longest side) and compresses as JPEG
 * to stay well under Vercel's 4.5MB body limit.
 */
const MAX_DIM = 1024;
const JPEG_QUALITY = 0.8;

async function imageUrlToBase64(
  url: string,
  maxDim = MAX_DIM,
  quality = JPEG_QUALITY,
): Promise<{ base64: string; mimeType: string }> {
  const img = await loadImage(url);

  // Calculate scaled dimensions
  let { naturalWidth: w, naturalHeight: h } = img;
  if (w > maxDim || h > maxDim) {
    const scale = maxDim / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  // Draw to canvas and export as JPEG
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const base64 = dataUrl.split(",")[1];
  return { base64, mimeType: "image/jpeg" };
}

export function RightPanel() {
  const {
    presetType,
    setPresetType,
    gender,
    setGender,
    bodyType,
    setBodyType,
    ageRange,
    setAgeRange,
    tuckIn,
    setTuckIn,
    sleeveRoll,
    setSleeveRoll,
    buttonOpen,
    setButtonOpen,
    autoCoordination,
    setAutoCoordination,
    backgroundPreset,
    setBackgroundPreset,
    lightingPreset,
    setLightingPreset,
    posePreset,
    setPosePreset,
    cameraAngle,
    setCameraAngle,
    framing,
    setFraming,
    selectedGarmentId,
    selectGarment,
    selectedModelId,
    selectModel,
    selectReference,
    setLeftTab,
    generatedImages,
    selectedImageIndex,
    isGenerating,
    setIsGenerating,
    setGeneratedImages,
    setGenerationProgress,
    setGenerationError,
    isSwapping,
    setIsSwapping,
    setSwapResults,
    setSwapError,
  } = useStudioStore();

  // Read asset data from assetStore (Supabase-backed)
  const garments = useAssetStore((s) => s.garments);
  const models = useAssetStore((s) => s.models);

  const { isUpscaling, setIsUpscaling, isEditing, setIsEditing } = useStudioStore();

  const { user } = useAuthStore();
  const { canGenerate: hasCredits, getRemaining, getLimit, recordUsage } = useUsageStore();
  const [showLowCreditDialog, setShowLowCreditDialog] = useState(false);
  const [customInstruction, setCustomInstruction] = useState("");
  const [editingAction, setEditingAction] = useState<string | null>(null);

  const tier = user?.tier ?? "free";
  const remaining = getRemaining(tier);
  const limit = getLimit(tier);
  const isUnlimited = tier === "business";
  const isLow = !isUnlimited && remaining > 0 && remaining <= Math.ceil(limit * 0.1);
  const isExhausted = !isUnlimited && remaining === 0;

  // Read references and selected reference from stores
  const references = useAssetStore((s) => s.references);
  const selectedReferenceId = useStudioStore((s) => s.selectedReferenceId);


  // Determine mode: model+garment = Swap, model-only = Variation, else = Model Generation
  const selectedGarment = garments.find((g) => g.id === selectedGarmentId);
  const selectedModel = models.find((m) => m.id === selectedModelId);
  const selectedReference = references.find((r) => r.id === selectedReferenceId);
  const selectedGeneratedImage =
    selectedImageIndex !== null ? generatedImages[selectedImageIndex] : null;

  // A model image is available from either a saved model or a selected generated image
  const hasModelImage = !!(selectedModel || selectedGeneratedImage);
  const isSwapMode = !!(selectedGarmentId && hasModelImage);
  const mapBodyType = (bt: string) => (bt === "plus" ? "plus-size" : bt);
  const mapBackground = (bg: string): string => {
    const bgMap: Record<string, string> = {
      "white-studio": "studio-white",
      "gray-studio": "studio-gray",
      "urban": "outdoor-urban",
      "cafe": "lifestyle-cafe",
      "office": "lifestyle-office",
      "nature": "outdoor-nature",
    };
    return bgMap[bg] ?? bg;
  };
  const apiResultsToImages = async (
    results: Array<{ data: { mimeType: string; imageBase64: string; promptUsed?: string } }>,
    modelId: string,
    garmentId: string | undefined,
  ) => {
    const userId = user?.id;
    const uploaded = await Promise.all(
      results.map(async (r) => {
        const url = await uploadBase64ToStorage(r.data.imageBase64, r.data.mimeType, userId);
        return {
          id: crypto.randomUUID(),
          url,
          thumbnailUrl: url,
          prompt: r.data.promptUsed || "",
          modelId,
          garmentId,
          createdAt: new Date().toISOString(),
          status: "completed" as const,
        };
      }),
    );
    return uploaded;
  };

  const executeGeneration = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationProgress(0);
    recordUsage();

    const requestBody = {
      gender,
      bodyType: mapBodyType(bodyType),
      ageRange,
      style: presetType || "lovely",
      pose: posePreset,
      cameraAngle,
      framing,
      background: mapBackground(backgroundPreset),
      lighting: lightingPreset,
    };

    try {
      setGenerationProgress(10);

      // Generate 4 variations in parallel
      const promises = Array.from({ length: 4 }, () =>
        fetch("/api/generate/model", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user?.id || "anonymous",
            "x-user-tier": tier,
          },
          body: JSON.stringify(requestBody),
        }).then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: "Generation failed" }));
            throw new Error(err.error || `HTTP ${res.status}`);
          }
          return res.json();
        })
      );

      setGenerationProgress(30);

      const results = await Promise.allSettled(promises);
      setGenerationProgress(80);

      const fulfilled = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled");

      if (fulfilled.length === 0) {
        const firstError = results.find(
          (r): r is PromiseRejectedResult => r.status === "rejected"
        );
        throw new Error(firstError?.reason?.message || "All generations failed");
      }

      const images = await apiResultsToImages(
        fulfilled.map((r) => r.value),
        selectedModelId || "",
        selectedGarmentId || undefined,
      );

      setGenerationProgress(100);

      setGeneratedImages(images);
      useGalleryStore.getState().addImages(images);
      toast.success(`${images.length} image${images.length > 1 ? "s" : ""} generated!`);
    } catch (err: any) {
      const errorMsg = err?.message || "Generation failed. Please try again.";
      setGenerationError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const executeSwap = async () => {
    if (!selectedGarment) return;

    // Resolve the model image URL
    const modelImageUrl = selectedModel?.imageUrl ?? selectedGeneratedImage?.url;
    if (!modelImageUrl) return;

    setIsSwapping(true);
    setSwapError(null);
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationProgress(0);
    recordUsage();

    try {
      setGenerationProgress(10);

      const [modelData, garmentData] = await Promise.all([
        imageUrlToBase64(modelImageUrl),
        imageUrlToBase64(selectedGarment.originalUrl),
      ]);

      setGenerationProgress(20);

      const swapBody = {
        modelImageBase64: modelData.base64,
        garmentImageBase64: garmentData.base64,
        garmentCategory: selectedGarment.category,
        modelMimeType: modelData.mimeType,
        garmentMimeType: garmentData.mimeType,
        fitOptions: { tuckIn, sleeveRoll, buttonOpen, autoCoordination },
      };

      // Generate 4 swap variations in parallel
      const promises = Array.from({ length: 4 }, () =>
        fetch("/api/generate/swap", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user?.id || "anonymous",
            "x-user-tier": tier,
          },
          body: JSON.stringify(swapBody),
        }).then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: "Swap failed" }));
            throw new Error(err.error || `HTTP ${res.status}`);
          }
          return res.json();
        })
      );

      setGenerationProgress(30);

      const results = await Promise.allSettled(promises);
      setGenerationProgress(80);

      const fulfilled = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled");

      if (fulfilled.length === 0) {
        const firstError = results.find(
          (r): r is PromiseRejectedResult => r.status === "rejected"
        );
        throw new Error(firstError?.reason?.message || "All swap generations failed");
      }

      const images = await apiResultsToImages(
        fulfilled.map((r) => r.value),
        selectedModelId || selectedGeneratedImage?.id || "",
        selectedGarmentId || undefined,
      );

      setGenerationProgress(100);

      setSwapResults(images);
      setGeneratedImages(images);
      useGalleryStore.getState().addImages(images);
      toast.success(`${images.length} lookbook image${images.length > 1 ? "s" : ""} generated!`);
    } catch (err: any) {
      const errorMsg = err?.message || "Clothing swap failed. Please try again.";
      setSwapError(errorMsg);
      setGenerationError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSwapping(false);
      setIsGenerating(false);
    }
  };

  const executeVariation = async () => {
    const modelImageUrl = selectedModel?.imageUrl ?? selectedGeneratedImage?.url;
    if (!modelImageUrl) return;

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationProgress(0);
    recordUsage();

    try {
      setGenerationProgress(10);

      // Compress model image; optionally compress reference image
      const imagePromises: Promise<{ base64: string; mimeType: string }>[] = [
        imageUrlToBase64(modelImageUrl),
      ];
      if (selectedReference) {
        imagePromises.push(imageUrlToBase64(selectedReference.originalUrl));
      }
      const imageResults = await Promise.all(imagePromises);
      const modelData = imageResults[0];
      const refData = imageResults[1]; // undefined if no reference

      setGenerationProgress(20);

      const variationBody: Record<string, unknown> = {
        modelImageBase64: modelData.base64,
        modelMimeType: modelData.mimeType,
        pose: posePreset,
        cameraAngle,
        framing,
        background: mapBackground(backgroundPreset),
        lighting: lightingPreset,
      };
      if (refData) {
        variationBody.referenceImageBase64 = refData.base64;
        variationBody.referenceMimeType = refData.mimeType;
      }

      // Generate 4 variations in parallel
      const promises = Array.from({ length: 4 }, () =>
        fetch("/api/generate/variation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user?.id || "anonymous",
            "x-user-tier": tier,
          },
          body: JSON.stringify(variationBody),
        }).then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: "Variation failed" }));
            throw new Error(err.error || `HTTP ${res.status}`);
          }
          return res.json();
        })
      );

      setGenerationProgress(30);

      const results = await Promise.allSettled(promises);
      setGenerationProgress(80);

      const fulfilled = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled");

      if (fulfilled.length === 0) {
        const firstError = results.find(
          (r): r is PromiseRejectedResult => r.status === "rejected"
        );
        throw new Error(firstError?.reason?.message || "All variations failed");
      }

      const images = await apiResultsToImages(
        fulfilled.map((r) => r.value),
        selectedModelId || selectedGeneratedImage?.id || "",
        undefined,
      );

      setGenerationProgress(100);

      setGeneratedImages(images);
      useGalleryStore.getState().addImages(images);
      toast.success(`${images.length} variation${images.length > 1 ? "s" : ""} generated!`);
    } catch (err: any) {
      const errorMsg = err?.message || "Variation failed. Please try again.";
      setGenerationError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };


  const handleFineTuneEdit = async (editType: "background" | "shoes" | "custom", instruction: string, actionId: string) => {
    if (!selectedGeneratedImage?.url || isEditing) return;
    setIsEditing(true);
    setEditingAction(actionId);
    try {
      const { base64, mimeType } = await imageUrlToBase64(selectedGeneratedImage.url);
      const resp = await fetch("/api/generate/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "anonymous",
          "x-user-tier": tier,
        },
        body: JSON.stringify({
          imageBase64: base64,
          imageMimeType: mimeType,
          editType,
          editInstruction: instruction,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Edit failed" }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      const result = await resp.json();
      const userId = user?.id;
      const editedUrl = await uploadBase64ToStorage(result.data.imageBase64, result.data.mimeType, userId);

      const newImage = {
        id: crypto.randomUUID(),
        url: editedUrl,
        thumbnailUrl: editedUrl,
        prompt: `${editType}: ${instruction}`,
        modelId: selectedGeneratedImage.modelId,
        garmentId: selectedGeneratedImage.garmentId,
        createdAt: new Date().toISOString(),
        status: "completed" as const,
      };
      const imgs = useStudioStore.getState().generatedImages;
      useStudioStore.getState().setGeneratedImages([...imgs, newImage]);
      useStudioStore.getState().setSelectedImageIndex(imgs.length);
      useGalleryStore.getState().addImages([newImage]);
      toast.success("Edit applied!");
    } catch (err: any) {
      toast.error(err?.message || "Edit failed");
    } finally {
      setIsEditing(false);
      setEditingAction(null);
    }
  };

  const handleUpscale = async () => {
    if (!selectedGeneratedImage?.url || isUpscaling) return;
    setIsUpscaling(true);
    try {
      const { base64, mimeType } = await imageUrlToBase64(selectedGeneratedImage.url);
      const resp = await fetch("/api/upscale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id ?? "anonymous",
          "x-user-tier": tier,
        },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Upscale failed" }));
        throw new Error(err.error || "Upscale failed");
      }
      const result = await resp.json();
      const userId = user?.id;
      const upscaledUrl = await uploadBase64ToStorage(result.data.imageBase64, result.data.mimeType, userId);
      const imgs = useStudioStore.getState().generatedImages;
      useStudioStore.getState().setGeneratedImages(
        imgs.map((img) =>
          img.id === selectedGeneratedImage.id ? { ...img, url: upscaledUrl, thumbnailUrl: upscaledUrl } : img
        )
      );
      toast.success("Image upscaled to 4K!");
    } catch (err: any) {
      toast.error(err?.message || "Upscale failed");
    } finally {
      setIsUpscaling(false);
    }
  };

  const studioStep = useStudioStore((s) => s.studioStep);
  const setStudioStep = useStudioStore((s) => s.setStudioStep);

  const STEPS: { id: StudioStep; label: string; icon: typeof UserRound }[] = [
    { id: "model", label: "Model", icon: UserRound },
    { id: "scene", label: "Scene", icon: Clapperboard },
    { id: "tryon", label: "Try-On", icon: Shirt },
    { id: "finetune", label: "Fine Tune", icon: SlidersHorizontal },
  ];

  // --- Step-specific button labels & logic ---
  const getStepButtonProps = () => {
    if (isGenerating || isSwapping) {
      return {
        label: isSwapping ? "Swapping Garment..." : studioStep === "scene" ? "Generating Scene..." : "Generating...",
        icon: Loader2,
        spinning: true,
      };
    }
    switch (studioStep) {
      case "model":
        return { label: "Generate Model", icon: Wand2, spinning: false };
      case "scene":
        return { label: "Generate Scene", icon: Camera, spinning: false };
      case "tryon":
        return { label: "Try On Garment", icon: ArrowRightLeft, spinning: false };
      default:
        return null; // finetune has no generate button
    }
  };

  const canClickStep = () => {
    if (isGenerating || isSwapping || isExhausted) return false;
    switch (studioStep) {
      case "model": return !!presetType;
      case "scene": return hasModelImage;
      case "tryon": return isSwapMode;
      default: return false;
    }
  };

  const handleStepGenerate = async () => {
    if (!hasCredits(tier)) {
      toast.error("You have used all your generation credits for this month.");
      return;
    }
    if (isLow) {
      setShowLowCreditDialog(true);
      return;
    }
    if (studioStep === "model") {
      await executeGeneration();
    } else if (studioStep === "scene") {
      // Scene always uses variation when a model image exists
      if (hasModelImage) await executeVariation();
      else await executeGeneration();
    } else if (studioStep === "tryon") {
      await executeSwap();
    }
  };

  const handleConfirmLowCredit = async () => {
    setShowLowCreditDialog(false);
    await handleStepGenerate();
  };

  const stepBtnProps = getStepButtonProps();

  return (
    <div className="flex h-full flex-col">
      {/* Step indicator */}
      <div className="flex border-b border-border">
        {STEPS.map((step) => (
          <button
            key={step.id}
            onClick={() => setStudioStep(step.id)}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors relative",
              studioStep === step.id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <step.icon className="h-3.5 w-3.5" />
            {step.label}
            {studioStep === step.id && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-3">
          {/* ===== STEP: Model Generation ===== */}
          {studioStep === "model" && (
            <>
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <Sparkles className="h-4 w-4" />
                  Style Preset
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {STYLE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() =>
                        setPresetType(presetType === preset.id ? null : preset.id)
                      }
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-center transition-colors",
                        presetType === preset.id
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-muted/50 hover:bg-muted"
                      )}
                    >
                      <preset.icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{preset.label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {preset.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 text-sm font-semibold">Model Options</h3>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Gender</Label>
                    <Select value={gender} onValueChange={(v) => setGender(v as "female" | "male")}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Body Type</Label>
                    <Select value={bodyType} onValueChange={(v) => setBodyType(v as "slim" | "athletic" | "plus")}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="slim">Slim</SelectItem>
                        <SelectItem value="athletic">Athletic</SelectItem>
                        <SelectItem value="plus">Plus Size</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Age Range</Label>
                    <Select value={ageRange} onValueChange={(v) => setAgeRange(v as "20s" | "30s" | "40s")}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="20s">20s</SelectItem>
                        <SelectItem value="30s">30s</SelectItem>
                        <SelectItem value="40s">40s</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[11px] text-muted-foreground">
                  A model will be generated wearing a basic white t-shirt and black shorts.
                  Save the result as a Model to use in the next steps.
                </p>
              </div>
            </>
          )}

          {/* ===== STEP: Scene Direction ===== */}
          {studioStep === "scene" && (
            <>
              {/* Selected Model */}
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <Users className="h-4 w-4" />
                  Model
                </h3>
                {selectedModel ? (
                  <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2">
                    <img
                      src={selectedModel.thumbnailUrl}
                      alt={selectedModel.name}
                      className="h-14 w-10 shrink-0 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-medium">{selectedModel.name}</p>
                      <p className="text-[10px] text-muted-foreground">{selectedModel.gender ?? ""} model</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => selectModel(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setLeftTab("models")}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-3 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    <User className="h-4 w-4" />
                    Select a model
                  </button>
                )}
              </div>

              {/* Selected Reference */}
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <Palette className="h-4 w-4" />
                  Reference
                  <span className="text-[10px] font-normal text-muted-foreground">(optional)</span>
                </h3>
                {selectedReference ? (
                  <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2">
                    <img
                      src={selectedReference.thumbnailUrl}
                      alt={selectedReference.name}
                      className="h-10 w-10 shrink-0 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-medium">{selectedReference.name}</p>
                      <p className="text-[10px] text-muted-foreground">Mood & atmosphere</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => selectReference(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setLeftTab("reference")}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-3 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    <Palette className="h-4 w-4" />
                    Select a reference
                  </button>
                )}
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 text-sm font-semibold">Pose & Camera</h3>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pose</Label>
                    <Select value={posePreset} onValueChange={setPosePreset}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {POSE_PRESETS.map((pose) => (
                          <SelectItem key={pose.id} value={pose.id}>{pose.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Camera Angle</Label>
                    <Select value={cameraAngle} onValueChange={setCameraAngle}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CAMERA_ANGLE_PRESETS.map((angle) => (
                          <SelectItem key={angle.id} value={angle.id}>{angle.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Framing</Label>
                    <Select value={framing} onValueChange={setFraming}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FRAMING_PRESETS.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 text-sm font-semibold">Environment</h3>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Background</Label>
                    <div className="grid grid-cols-4 gap-1">
                      {BACKGROUND_PRESETS.map((bg) => (
                        <button
                          key={bg.id}
                          onClick={() => setBackgroundPreset(bg.id)}
                          className={cn(
                            "rounded-md border px-1.5 py-1 text-[10px] transition-colors",
                            backgroundPreset === bg.id
                              ? "border-primary bg-primary/10 font-medium"
                              : "border-transparent bg-muted/50 hover:bg-muted"
                          )}
                        >
                          {bg.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Lighting</Label>
                    <Select value={lightingPreset} onValueChange={setLightingPreset}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="studio">Studio</SelectItem>
                        <SelectItem value="golden-hour">Golden Hour</SelectItem>
                        <SelectItem value="overcast">Overcast</SelectItem>
                        <SelectItem value="flash">Flash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

            </>
          )}

          {/* ===== STEP: Virtual Try-On ===== */}
          {studioStep === "tryon" && (
            <>
              {/* Selected Model */}
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <Users className="h-4 w-4" />
                  Model
                </h3>
                {selectedModel ? (
                  <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2">
                    <img
                      src={selectedModel.thumbnailUrl}
                      alt={selectedModel.name}
                      className="h-14 w-10 shrink-0 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-medium">{selectedModel.name}</p>
                      <p className="text-[10px] text-muted-foreground">{selectedModel.gender ?? ""} model</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => selectModel(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setLeftTab("models")}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-3 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    <User className="h-4 w-4" />
                    Select a model
                  </button>
                )}
              </div>

              {/* Selected Product / Garment */}
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <Shirt className="h-4 w-4" />
                  Product
                </h3>
                {selectedGarment ? (
                  <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2">
                    <img
                      src={selectedGarment.thumbnailUrl}
                      alt={selectedGarment.name}
                      className="h-10 w-10 shrink-0 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-medium">{selectedGarment.name}</p>
                      <Badge variant="secondary" className="text-[10px]">{selectedGarment.category}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => selectGarment(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setLeftTab("product")}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-3 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    <Shirt className="h-4 w-4" />
                    Upload or select a product
                  </button>
                )}
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 text-sm font-semibold">Fit Options</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tuck-in" className="text-xs">Tuck In</Label>
                    <Switch id="tuck-in" checked={tuckIn} onCheckedChange={setTuckIn} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sleeve-roll" className="text-xs">Sleeve Roll-up</Label>
                    <Switch id="sleeve-roll" checked={sleeveRoll} onCheckedChange={setSleeveRoll} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="button-open" className="text-xs">Button Open</Label>
                    <Switch id="button-open" checked={buttonOpen} onCheckedChange={setButtonOpen} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="auto-coord" className="text-xs">Auto-Coordination</Label>
                      <p className="text-[10px] text-muted-foreground">AI suggests matching items</p>
                    </div>
                    <Switch id="auto-coord" checked={autoCoordination} onCheckedChange={setAutoCoordination} />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ===== STEP: Fine Tune ===== */}
          {studioStep === "finetune" && (
            <>
              {!selectedGeneratedImage && (
                <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-center">
                  <SlidersHorizontal className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">
                    Select an image from the left panel to fine-tune.
                  </p>
                </div>
              )}

              {/* Custom Instruction */}
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <MessageSquareText className="h-4 w-4" />
                  Custom Instruction
                </h3>
                <p className="mb-2 text-[11px] text-muted-foreground">
                  Describe what to change. The model's face and body will be preserved.
                </p>
                <div className="mb-2 flex flex-wrap gap-1">
                  {[
                    "Tuck the shirt in",
                    "Roll up the sleeves",
                    "Unbutton the top button",
                    "Change shoes to white sneakers",
                    "Change background to outdoor cafe",
                    "Add a wristwatch",
                  ].map((ex) => (
                    <button
                      key={ex}
                      className="rounded-full border border-muted-foreground/20 bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground hover:border-primary/30"
                      onClick={() => setCustomInstruction(ex)}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Type an instruction or click an example above..."
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  className="min-h-[80px] text-xs resize-none"
                  disabled={!selectedGeneratedImage || isEditing}
                />
                <Button
                  variant="default"
                  size="sm"
                  className="mt-2 w-full text-xs"
                  disabled={!selectedGeneratedImage || !customInstruction.trim() || isEditing}
                  onClick={() => handleFineTuneEdit("custom", customInstruction.trim(), "custom")}
                >
                  {editingAction === "custom" ? (
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="mr-1.5 h-3 w-3" />
                  )}
                  {editingAction === "custom" ? "Applying..." : "Apply Edit"}
                </Button>
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 text-sm font-semibold">Upscale</h3>
                <p className="mb-2 text-[11px] text-muted-foreground">
                  Enhance resolution to 4K for print-ready output.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  disabled={!selectedGeneratedImage || isUpscaling}
                  onClick={handleUpscale}
                >
                  {isUpscaling ? (
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  ) : (
                    <ArrowUpFromLine className="mr-1.5 h-3 w-3" />
                  )}
                  {isUpscaling ? "Upscaling..." : "Upscale to 4K"}
                </Button>
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 text-sm font-semibold">Digital Ironing</h3>
                <p className="mb-2 text-[11px] text-muted-foreground">
                  Remove unwanted wrinkles and creases from the garment.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  disabled={!selectedGeneratedImage || isEditing}
                  onClick={() => handleFineTuneEdit("custom", "Remove all unwanted wrinkles and creases from the clothing. Make the fabric look freshly pressed and smooth, like digital ironing. Keep everything else identical.", "ironing")}
                >
                  {editingAction === "ironing" ? (
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="mr-1.5 h-3 w-3" />
                  )}
                  {editingAction === "ironing" ? "Ironing..." : "Apply Digital Ironing"}
                </Button>
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 text-sm font-semibold">Natural Wrinkles</h3>
                <p className="mb-2 text-[11px] text-muted-foreground">
                  Add realistic natural fabric folds for authenticity.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  disabled={!selectedGeneratedImage || isEditing}
                  onClick={() => handleFineTuneEdit("custom", "Add subtle, realistic natural fabric wrinkles and folds to the clothing for a more authentic, lived-in look. Keep everything else identical.", "wrinkles")}
                >
                  {editingAction === "wrinkles" ? (
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="mr-1.5 h-3 w-3" />
                  )}
                  {editingAction === "wrinkles" ? "Adding Wrinkles..." : "Add Natural Wrinkles"}
                </Button>
              </div>

            </>
          )}
        </div>
      </ScrollArea>

      {/* Bottom action bar */}
      <div className="border-t border-border p-3">
        {isExhausted && studioStep !== "finetune" && (
          <div className="mb-2 flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1.5 text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <p className="text-[10px]">No credits remaining. Upgrade your plan.</p>
          </div>
        )}

        {stepBtnProps && (
          <>
            <Button
              className="w-full"
              size="lg"
              disabled={!canClickStep()}
              onClick={handleStepGenerate}
              data-testid="generate-button"
            >
              {stepBtnProps.spinning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <stepBtnProps.icon className="mr-2 h-4 w-4" />
              )}
              {stepBtnProps.label}
            </Button>
            {(isGenerating || isSwapping) && (
              <p className="mt-1 text-center text-[10px] text-muted-foreground">
                Estimated time: ~30 seconds
              </p>
            )}
            <div className="mt-2 flex items-center justify-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                4 variations will be generated
              </Badge>
              {!isUnlimited && (
                <Badge
                  variant={isExhausted ? "destructive" : isLow ? "outline" : "secondary"}
                  className="text-[10px]"
                >
                  {remaining} left
                </Badge>
              )}
            </div>
          </>
        )}

        {studioStep === "finetune" && (
          <p className="text-center text-[11px] text-muted-foreground">
            Use the fine-tune actions above on the selected image.
          </p>
        )}
      </div>

      {/* Low credit confirmation dialog */}
      <Dialog open={showLowCreditDialog} onOpenChange={setShowLowCreditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Low Credits Warning
            </DialogTitle>
            <DialogDescription>
              You have {remaining} of {limit} credits remaining this month.
              Are you sure you want to continue with this generation?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLowCreditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmLowCredit}>
              Continue Generation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
