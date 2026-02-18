import { useState, useRef, useCallback, useEffect } from "react";
import { useStudioStore } from "@/stores/studioStore";
import { useAssetStore } from "@/stores/assetStore";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { downloadWithWatermark } from "@/lib/watermark";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { uploadBase64ToStorage } from "@/lib/storageUpload";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Paintbrush,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ArrowUpFromLine,
  Grid2x2,
  Image,
  Loader2,
  Heart,
  Share2,
  SplitSquareHorizontal,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  Save,
  SlidersHorizontal,
  ImagePlus,
  Footprints,
  X,
  Palette,
} from "lucide-react";
import toast from "react-hot-toast";
import type { GeneratedImage } from "@/types";

// ---- Sub-components ----

interface CompareSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
}

function CompareSlider({
  beforeUrl,
  afterUrl,
  beforeLabel = "Original",
  afterLabel = "Generated",
}: CompareSliderProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updatePosition(e.clientX);
    },
    [updatePosition]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      updatePosition(e.clientX);
    },
    [updatePosition]
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative aspect-[3/4] w-full max-w-lg cursor-col-resize select-none overflow-hidden rounded-lg"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* After image (full background) */}
      <img
        src={afterUrl}
        alt={afterLabel}
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      {/* Before image (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <img
          src={beforeUrl}
          alt={beforeLabel}
          className="h-full w-full object-cover"
          style={{ width: containerRef.current?.offsetWidth ?? "100%" }}
          draggable={false}
        />
      </div>
      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 z-10 w-0.5 bg-white shadow-md"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-black/50 text-white">
          <ChevronLeft className="h-3 w-3" />
          <ChevronRight className="h-3 w-3" />
        </div>
      </div>
      {/* Labels */}
      <div className="absolute bottom-3 left-3 z-10 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
        {beforeLabel}
      </div>
      <div className="absolute right-3 bottom-3 z-10 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
        {afterLabel}
      </div>
    </div>
  );
}

interface GenerationProgressProps {
  progress: number;
}

function GenerationProgress({ progress }: GenerationProgressProps) {
  return (
    <div className="flex h-full flex-col bg-muted/30">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">
          Generating 4 variations...
        </span>
        <span className="ml-auto text-xs font-medium text-primary">
          {Math.round(progress)}%
        </span>
      </div>
      {/* Progress bar */}
      <div className="px-4 pt-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="flex-1 p-4">
        <div className="grid h-full grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="relative overflow-hidden rounded-lg">
              <Skeleton className="aspect-[3/4] w-full" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Variation {i + 1}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ImageToolbarProps {
  image: GeneratedImage;
  isFavorite: boolean;
  onDownload: () => void;
  onUpscale: () => void;
  onFavorite: () => void;
  onShare: () => void;
  onCompare: () => void;
  onRegenerate: () => void;
  onSave: () => void;
  onSaveAsReference: () => void;
}

function ImageToolbar({
  isFavorite,
  onDownload,
  onUpscale,
  onFavorite,
  onShare,
  onCompare,
  onRegenerate,
  onSave,
  onSaveAsReference,
}: ImageToolbarProps) {
  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSave}>
            <Save className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Save as Model</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSaveAsReference}>
            <Palette className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Save as Reference</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Download</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onUpscale}>
            <ArrowUpFromLine className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Upscale to 4K</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", isFavorite && "text-red-500")}
            onClick={onFavorite}
          >
            <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isFavorite ? "Remove from favorites" : "Add to favorites"}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onShare}>
            <Share2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Share</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCompare}>
            <SplitSquareHorizontal className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Compare before/after</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRegenerate}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Regenerate</TooltipContent>
      </Tooltip>
    </div>
  );
}

// ---- Helpers ----

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

async function imageUrlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const img = await loadImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  return { base64: dataUrl.split(",")[1], mimeType: "image/jpeg" };
}

const BACKGROUND_OPTIONS = [
  { id: "white-studio", label: "White Studio" },
  { id: "outdoor-park", label: "Park" },
  { id: "outdoor-cafe", label: "Cafe" },
  { id: "outdoor-street", label: "Street" },
  { id: "urban-city", label: "Urban City" },
  { id: "beach", label: "Beach" },
];

// ---- Main CenterPanel ----

type ViewMode = "grid" | "detail" | "compare";

export function CenterPanel() {
  const {
    generatedImages,
    isGenerating,
    generationProgress,
    generationError,
    selectedImageIndex,
    setSelectedImageIndex,
    favoriteImageIds,
    toggleFavorite,
  } = useStudioStore();

  const { isUpscaling, setIsUpscaling, isEditing, setIsEditing } = useStudioStore();

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogImageIndex, setDialogImageIndex] = useState<number | null>(null);
  const [showFineTune, setShowFineTune] = useState(false);
  const [selectedBackground, setSelectedBackground] = useState("");
  const [shoesInput, setShoesInput] = useState("");

  // Reset zoom when switching images
  useEffect(() => {
    setZoomLevel(1);
  }, [selectedImageIndex]);

  const handleDownload = useCallback((image: GeneratedImage) => {
    if (!image.url) return;
    const user = useAuthStore.getState().user;
    const tier = user?.tier ?? "free";
    downloadWithWatermark(image.url, `fitgen-${image.id}.png`, tier, {
      userId: user?.id ?? "anonymous",
      imageId: image.id,
      timestamp: Date.now(),
    }).catch(() => {
      // Fallback to direct download if watermark processing fails
      const link = document.createElement("a");
      link.href = image.url;
      link.download = `fitgen-${image.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }, []);

  const handleShare = useCallback(async (image: GeneratedImage) => {
    if (!image.url) return;
    if (navigator.share) {
      await navigator.share({
        title: "FitGen Studio - Generated Lookbook",
        url: image.url,
      }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(image.url);
    }
  }, []);

  const handleSave = useCallback(async (image: GeneratedImage) => {
    if (!image.url) return;
    const { gender, bodyType, presetType } = useStudioStore.getState();
    const studioModels = useStudioStore.getState().models;
    // Prevent duplicate saves
    if (studioModels.some((m) => m.id === image.id)) {
      toast("Already saved to My Models", { icon: "ℹ️" });
      return;
    }

    const modelAsset = {
      id: image.id,
      name: `Model ${studioModels.length + 1}`,
      imageUrl: image.url,
      thumbnailUrl: image.thumbnailUrl || image.url,
      presetType: presetType ?? undefined,
      gender,
      bodyType,
      createdAt: image.createdAt,
    };

    // Add to both studio and asset stores
    useStudioStore.getState().addModel(modelAsset);
    useAssetStore.getState().addModel(modelAsset);

    // Persist to Supabase DB
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      const mapBt = (bt: string) => (bt === "plus" ? "plus-size" : bt);
      supabase.from("models").insert({
        user_id: userId,
        name: modelAsset.name,
        image_url: modelAsset.imageUrl,
        thumbnail_url: modelAsset.thumbnailUrl,
        gender,
        body_type: mapBt(bodyType),
        age_range: "20s",
        style_preset: presetType ?? null,
      }).then(({ error }) => {
        if (error) console.error("Failed to save model to DB:", error);
      });
    }

    toast.success("Saved to My Models!");
  }, []);

  const handleSaveAsReference = useCallback(async (image: GeneratedImage) => {
    if (!image.url) return;
    const refAsset = {
      id: `r-${image.id}`,
      name: image.prompt || "Generated Reference",
      thumbnailUrl: image.thumbnailUrl || image.url,
      originalUrl: image.url,
      createdAt: image.createdAt,
    };
    useAssetStore.getState().addReference(refAsset);
    useStudioStore.getState().addReference(refAsset);
    useStudioStore.getState().selectReference(refAsset.id);
    toast.success("Saved as Reference!");
  }, []);

  const handleUpscale = useCallback(async (image: GeneratedImage) => {
    if (!image.url || isUpscaling) return;
    setIsUpscaling(true);
    try {
      const { base64, mimeType } = await imageUrlToBase64(image.url);
      const user = useAuthStore.getState().user;
      const resp = await fetch("/api/upscale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id ?? "anonymous",
          "x-user-tier": user?.tier ?? "free",
        },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Upscale failed");
      }

      const result = await resp.json();
      const userId = useAuthStore.getState().user?.id;
      const upscaledUrl = await uploadBase64ToStorage(result.data.imageBase64, result.data.mimeType, userId);

      // Replace image in generatedImages
      const { generatedImages: imgs, setGeneratedImages } = useStudioStore.getState();
      setGeneratedImages(
        imgs.map((img) =>
          img.id === image.id ? { ...img, url: upscaledUrl, thumbnailUrl: upscaledUrl } : img
        )
      );
      toast.success("Image upscaled to 4K!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upscale failed");
    } finally {
      setIsUpscaling(false);
    }
  }, [isUpscaling, setIsUpscaling]);

  const handleEdit = useCallback(async (
    image: GeneratedImage,
    editType: "background" | "shoes" | "custom",
    editInstruction: string,
  ) => {
    if (!image.url || isEditing) return;
    setIsEditing(true);
    try {
      const { base64, mimeType } = await imageUrlToBase64(image.url);
      const user = useAuthStore.getState().user;
      const resp = await fetch("/api/generate/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id ?? "anonymous",
          "x-user-tier": user?.tier ?? "free",
        },
        body: JSON.stringify({
          imageBase64: base64,
          imageMimeType: mimeType,
          editType,
          editInstruction,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Edit failed");
      }

      const result = await resp.json();
      const userId = useAuthStore.getState().user?.id;
      const editedUrl = await uploadBase64ToStorage(result.data.imageBase64, result.data.mimeType, userId);

      // Add edited image as a new variation (preserve original)
      const newImage: GeneratedImage = {
        id: `edit-${Date.now()}`,
        url: editedUrl,
        thumbnailUrl: editedUrl,
        prompt: `${editType}: ${editInstruction}`,
        modelId: image.modelId,
        garmentId: image.garmentId,
        createdAt: new Date().toISOString(),
        status: "completed",
      };

      const { generatedImages: imgs, setGeneratedImages } = useStudioStore.getState();
      setGeneratedImages([...imgs, newImage]);
      // Select the new image
      useStudioStore.getState().setSelectedImageIndex(imgs.length);
      toast.success("Image edited successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Edit failed");
    } finally {
      setIsEditing(false);
    }
  }, [isEditing, setIsEditing]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel((z) => Math.min(z + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((z) => Math.max(z - 0.25, 0.5));
  }, []);

  const openFullscreen = useCallback((index: number) => {
    setDialogImageIndex(index);
    setDialogOpen(true);
  }, []);

  const navigateDialog = useCallback(
    (direction: 1 | -1) => {
      if (dialogImageIndex === null) return;
      const next = dialogImageIndex + direction;
      if (next >= 0 && next < generatedImages.length) {
        setDialogImageIndex(next);
      }
    },
    [dialogImageIndex, generatedImages.length]
  );

  // ---- Error state with retry ----
  if (generationError && !isGenerating) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h3 className="text-lg font-medium text-foreground">
            Generation Failed
          </h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            {generationError}
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              useStudioStore.getState().setGenerationError(null);
              // Trigger re-generation from right panel
              const rightPanelGenerate = document.querySelector<HTMLButtonElement>(
                '[data-testid="generate-button"]'
              );
              rightPanelGenerate?.click();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // ---- Empty state ----
  if (generatedImages.length === 0 && !isGenerating) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30">
        <div className="text-center text-muted-foreground">
          <Paintbrush className="mx-auto mb-4 h-12 w-12" />
          <h3 className="text-lg font-medium text-foreground">Canvas</h3>
          <p className="mt-1 max-w-xs text-sm">
            Upload a garment and select a model, then click Generate to create
            your lookbook.
          </p>
        </div>
      </div>
    );
  }

  // ---- Loading state with progress ----
  if (isGenerating) {
    return <GenerationProgress progress={generationProgress} />;
  }

  // ---- Compare view ----
  if (viewMode === "compare" && selectedImageIndex !== null) {
    const image = generatedImages[selectedImageIndex];
    const garments = useAssetStore.getState().garments;
    const garment = image?.garmentId
      ? garments.find((g) => g.id === image.garmentId)
      : null;
    const beforeUrl = garment?.originalUrl || "";
    const afterUrl = image?.url || "";

    return (
      <div className="flex h-full flex-col bg-muted/30">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid2x2 className="mr-1 h-4 w-4" />
              <span className="text-xs">Grid</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("detail")}
            >
              <ZoomIn className="mr-1 h-4 w-4" />
              <span className="text-xs">Detail</span>
            </Button>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            Before / After Comparison
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center p-4">
          {beforeUrl && afterUrl ? (
            <CompareSlider
              beforeUrl={beforeUrl}
              afterUrl={afterUrl}
              beforeLabel="Original Garment"
              afterLabel="Generated Lookbook"
            />
          ) : (
            <div className="text-center text-muted-foreground">
              <SplitSquareHorizontal className="mx-auto mb-2 h-10 w-10" />
              <p className="text-sm">
                No original garment image available for comparison.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setViewMode("detail")}
              >
                Back to detail view
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- Detail view ----
  if (viewMode === "detail" && selectedImageIndex !== null) {
    const image = generatedImages[selectedImageIndex];
    const isFavorite = image ? favoriteImageIds.has(image.id) : false;

    return (
      <div className="flex h-full flex-col bg-muted/30">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setViewMode("grid");
                setSelectedImageIndex(null);
              }}
            >
              <Grid2x2 className="mr-1 h-4 w-4" />
              <span className="text-xs">Grid</span>
            </Button>
            {/* Zoom controls */}
            <div className="ml-2 flex items-center gap-0.5 rounded-md border border-border px-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
              >
                <ZoomOut className="h-3 w-3" />
              </Button>
              <span className="min-w-[3ch] text-center text-xs text-muted-foreground">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {image && (
              <ImageToolbar
                image={image}
                isFavorite={isFavorite}
                onDownload={() => handleDownload(image)}
                onUpscale={() => handleUpscale(image)}
                onFavorite={() => toggleFavorite(image.id)}
                onShare={() => handleShare(image)}
                onCompare={() => setViewMode("compare")}
                onRegenerate={() => {}}
                onSave={() => handleSave(image)}
                onSaveAsReference={() => handleSaveAsReference(image)}
              />
            )}
            {image && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showFineTune ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowFineTune(!showFineTune)}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Fine-tune</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Fine-tune panel */}
        {showFineTune && image && (
          <div className="border-b border-border bg-muted/50 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Fine-tune
              </h4>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowFineTune(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Upscale */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Upscale</label>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  disabled={isUpscaling}
                  onClick={() => handleUpscale(image)}
                >
                  {isUpscaling ? (
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  ) : (
                    <ArrowUpFromLine className="mr-1.5 h-3 w-3" />
                  )}
                  {isUpscaling ? "Upscaling..." : "Upscale to 4K"}
                </Button>
              </div>
              {/* Change Background */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Background</label>
                <div className="flex gap-1.5">
                  <Select value={selectedBackground} onValueChange={setSelectedBackground}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {BACKGROUND_OPTIONS.map((bg) => (
                        <SelectItem key={bg.id} value={bg.id}>{bg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    disabled={!selectedBackground || isEditing}
                    onClick={() => {
                      const label = BACKGROUND_OPTIONS.find((b) => b.id === selectedBackground)?.label || selectedBackground;
                      handleEdit(image, "background", label);
                    }}
                  >
                    {isEditing ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
              {/* Change Shoes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Shoes</label>
                <div className="flex gap-1.5">
                  <Input
                    placeholder="e.g. white sneakers"
                    value={shoesInput}
                    onChange={(e) => setShoesInput(e.target.value)}
                    className="h-8 text-xs flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    disabled={!shoesInput.trim() || isEditing}
                    onClick={() => handleEdit(image, "shoes", shoesInput.trim())}
                  >
                    {isEditing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Footprints className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image */}
        <div className="flex flex-1 items-center justify-center overflow-auto p-4">
          {image?.url ? (
            <div className="relative">
              {isUpscaling && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/40">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                    <span className="text-sm font-medium text-white">Upscaling...</span>
                  </div>
                </div>
              )}
              {isEditing && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/40">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                    <span className="text-sm font-medium text-white">Editing...</span>
                  </div>
                </div>
              )}
              <img
                src={image.url}
                alt={image.prompt}
                className="max-h-full max-w-full cursor-pointer rounded-lg object-contain shadow-lg transition-transform"
                style={{ transform: `scale(${zoomLevel})` }}
                onClick={() => openFullscreen(selectedImageIndex)}
              />
            </div>
          ) : (
            <div className="flex aspect-[3/4] w-full max-w-lg items-center justify-center rounded-lg bg-muted">
              <div className="text-center">
                <Image className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {image?.prompt || "Generated image"}
                </p>
              </div>
            </div>
          )}
        </div>
        {/* Thumbnail strip */}
        <div className="flex justify-center gap-2 border-t border-border p-2">
          {generatedImages.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setSelectedImageIndex(i)}
              className={cn(
                "relative h-14 w-14 overflow-hidden rounded-md border-2 transition-colors",
                selectedImageIndex === i
                  ? "border-primary"
                  : "border-transparent hover:border-muted-foreground/25"
              )}
            >
              {img.url ? (
                <img
                  src={img.thumbnailUrl || img.url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  <span className="text-[10px] text-muted-foreground">
                    {i + 1}
                  </span>
                </div>
              )}
              {favoriteImageIds.has(img.id) && (
                <Heart className="absolute top-0.5 right-0.5 h-3 w-3 fill-red-500 text-red-500" />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---- Grid view (2x2) ----
  return (
    <div className="flex h-full flex-col bg-muted/30">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs text-muted-foreground">
          {generatedImages.length} variation{generatedImages.length !== 1 ? "s" : ""} generated
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("grid")}
          >
            <Grid2x2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {/* Grid */}
      <div className="flex-1 p-3">
        <div className="grid h-full grid-cols-2 gap-3">
          {generatedImages.map((image, i) => {
            const isFav = favoriteImageIds.has(image.id);
            return (
              <div
                key={image.id}
                className={cn(
                  "group relative cursor-pointer overflow-hidden rounded-lg border-2 transition-colors",
                  selectedImageIndex === i
                    ? "border-primary"
                    : "border-transparent hover:border-muted-foreground/25"
                )}
                onClick={() => {
                  setSelectedImageIndex(i);
                  setViewMode("detail");
                }}
              >
                {image.url ? (
                  <img
                    src={image.url}
                    alt={image.prompt}
                    className="aspect-[3/4] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[3/4] w-full items-center justify-center bg-muted">
                    <div className="text-center">
                      <Image className="mx-auto mb-1 h-6 w-6 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">
                        Variation {i + 1}
                      </p>
                    </div>
                  </div>
                )}
                {/* Favorite indicator */}
                {isFav && (
                  <div className="absolute top-2 right-2 z-10">
                    <Heart className="h-4 w-4 fill-red-500 text-red-500 drop-shadow" />
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex w-full items-center justify-between p-2">
                    <span className="text-xs font-medium text-white">
                      #{i + 1}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-white hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImageIndex(i);
                          setViewMode("detail");
                        }}
                      >
                        <ZoomIn className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-white hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(image.id);
                        }}
                      >
                        <Heart
                          className={cn(
                            "h-3.5 w-3.5",
                            isFav && "fill-red-500 text-red-500"
                          )}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-white hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSave(image);
                        }}
                      >
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-white hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveAsReference(image);
                        }}
                      >
                        <Palette className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-white hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(image);
                        }}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fullscreen dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
          {dialogImageIndex !== null && generatedImages[dialogImageIndex] && (
            <div className="relative flex h-[85vh] items-center justify-center bg-black">
              <img
                src={generatedImages[dialogImageIndex].url}
                alt={generatedImages[dialogImageIndex].prompt}
                className="max-h-full max-w-full object-contain"
              />
              {/* Nav arrows */}
              {dialogImageIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
                  onClick={() => navigateDialog(-1)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              {dialogImageIndex < generatedImages.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
                  onClick={() => navigateDialog(1)}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              )}
              {/* Image counter */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                {dialogImageIndex + 1} / {generatedImages.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
