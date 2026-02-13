import { useState } from "react";
import toast from "react-hot-toast";
import { useStudioStore } from "@/stores/studioStore";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
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
  { id: "standing-front", label: "Standing (Front)" },
  { id: "standing-34", label: "Standing (3/4)" },
  { id: "standing-side", label: "Standing (Side)" },
  { id: "walking", label: "Walking" },
  { id: "seated", label: "Seated" },
  { id: "dynamic", label: "Dynamic" },
];

/** Convert an image URL (blob: or data:) to { base64, mimeType }. */
async function imageUrlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  // Already a data URL — extract parts directly
  if (url.startsWith("data:")) {
    const match = url.match(/^data:([^;]+);base64,(.+)$/);
    if (match) return { mimeType: match[1], base64: match[2] };
  }
  // Blob URL or other — fetch and convert
  const res = await fetch(url);
  const blob = await res.blob();
  const mimeType = blob.type || "image/png";
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return { base64: btoa(binary), mimeType };
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
    selectedGarmentId,
    selectedModelId,
    garments,
    models,
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

  const { user } = useAuthStore();
  const { canGenerate: hasCredits, getRemaining, getLimit, recordUsage } = useUsageStore();
  const [showLowCreditDialog, setShowLowCreditDialog] = useState(false);

  const tier = user?.tier ?? "free";
  const remaining = getRemaining(tier);
  const limit = getLimit(tier);
  const isUnlimited = tier === "business";
  const isLow = !isUnlimited && remaining > 0 && remaining <= Math.ceil(limit * 0.1);
  const isExhausted = !isUnlimited && remaining === 0;

  // Determine swap mode: garment selected AND a model image available
  const selectedGarment = garments.find((g) => g.id === selectedGarmentId);
  const selectedModel = models.find((m) => m.id === selectedModelId);
  const selectedGeneratedImage =
    selectedImageIndex !== null ? generatedImages[selectedImageIndex] : null;

  // A model image is available from either a saved model or a selected generated image
  const hasModelImage = !!(selectedModel || selectedGeneratedImage);
  const isSwapMode = !!(selectedGarmentId && hasModelImage);

  const canClickGenerate =
    (isSwapMode || selectedGarmentId || presetType) && !isGenerating && !isSwapping && !isExhausted;

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
  const mapPose = (p: string) => (p === "standing-34" ? "standing-three-quarter" : p);

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
      pose: mapPose(posePreset),
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
      setGenerationProgress(90);

      const images = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
        .map((r) => ({
          id: crypto.randomUUID(),
          url: `data:${r.value.data.mimeType};base64,${r.value.data.imageBase64}`,
          thumbnailUrl: `data:${r.value.data.mimeType};base64,${r.value.data.imageBase64}`,
          prompt: r.value.data.promptUsed || "",
          modelId: selectedModelId || "",
          garmentId: selectedGarmentId || undefined,
          createdAt: new Date().toISOString(),
          status: "completed" as const,
        }));

      setGenerationProgress(100);

      if (images.length === 0) {
        const firstError = results.find(
          (r): r is PromiseRejectedResult => r.status === "rejected"
        );
        throw new Error(firstError?.reason?.message || "All generations failed");
      }

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
      setGenerationProgress(90);

      const images = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
        .map((r) => ({
          id: crypto.randomUUID(),
          url: `data:${r.value.data.mimeType};base64,${r.value.data.imageBase64}`,
          thumbnailUrl: `data:${r.value.data.mimeType};base64,${r.value.data.imageBase64}`,
          prompt: r.value.data.promptUsed || "",
          modelId: selectedModelId || selectedGeneratedImage?.id || "",
          garmentId: selectedGarmentId || undefined,
          createdAt: new Date().toISOString(),
          status: "completed" as const,
        }));

      setGenerationProgress(100);

      if (images.length === 0) {
        const firstError = results.find(
          (r): r is PromiseRejectedResult => r.status === "rejected"
        );
        throw new Error(firstError?.reason?.message || "All swap generations failed");
      }

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

  const runGeneration = async () => {
    if (isSwapMode) {
      await executeSwap();
    } else {
      await executeGeneration();
    }
  };

  const handleGenerate = async () => {
    if (!hasCredits(tier)) {
      toast.error("You have used all your generation credits for this month.");
      return;
    }
    if (isLow) {
      setShowLowCreditDialog(true);
      return;
    }
    await runGeneration();
  };

  const handleConfirmLowCredit = async () => {
    setShowLowCreditDialog(false);
    await runGeneration();
  };

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-3">
          {/* Section 1: Model Agency */}
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="h-4 w-4" />
              Model Agency
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {STYLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() =>
                    setPresetType(
                      presetType === preset.id ? null : preset.id
                    )
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

            {/* Custom model options */}
            <div className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Gender</Label>
                <Select value={gender} onValueChange={(v) => setGender(v as "female" | "male")}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Body Type</Label>
                <Select value={bodyType} onValueChange={(v) => setBodyType(v as "slim" | "athletic" | "plus")}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
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
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20s">20s</SelectItem>
                    <SelectItem value="30s">30s</SelectItem>
                    <SelectItem value="40s">40s</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 2: Styling */}
          <div>
            <h3 className="mb-2 text-sm font-semibold">Styling</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="tuck-in" className="text-xs">
                  Tuck In
                </Label>
                <Switch
                  id="tuck-in"
                  checked={tuckIn}
                  onCheckedChange={setTuckIn}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="sleeve-roll" className="text-xs">
                  Sleeve Roll-up
                </Label>
                <Switch
                  id="sleeve-roll"
                  checked={sleeveRoll}
                  onCheckedChange={setSleeveRoll}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="button-open" className="text-xs">
                  Button Open
                </Label>
                <Switch
                  id="button-open"
                  checked={buttonOpen}
                  onCheckedChange={setButtonOpen}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-coord" className="text-xs">
                    Auto-Coordination
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    AI suggests matching items
                  </p>
                </div>
                <Switch
                  id="auto-coord"
                  checked={autoCoordination}
                  onCheckedChange={setAutoCoordination}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 3: Director */}
          <div>
            <h3 className="mb-2 text-sm font-semibold">Director</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Pose</Label>
                <Select value={posePreset} onValueChange={setPosePreset}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSE_PRESETS.map((pose) => (
                      <SelectItem key={pose.id} value={pose.id}>
                        {pose.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
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
        </div>
      </ScrollArea>

      {/* Section 4: Mode Indicator + Generate */}
      <div className="shrink-0 border-t border-border p-3">
        {/* Mode indicator */}
        <div className="mb-2 flex items-center justify-center gap-1.5">
          {isSwapMode ? (
            <Badge variant="default" className="gap-1 text-[10px]">
              <ArrowRightLeft className="h-3 w-3" />
              Lookbook Mode (Model + Garment)
            </Badge>
          ) : selectedGarmentId ? (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Shirt className="h-3 w-3" />
              Garment selected — select a model to swap
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <User className="h-3 w-3" />
              Model Generation
            </Badge>
          )}
        </div>

        {isExhausted && (
          <div className="mb-2 flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1.5 text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <p className="text-[10px]">
              No credits remaining. Upgrade your plan to continue generating.
            </p>
          </div>
        )}
        {!canClickGenerate && !isGenerating && !isSwapping && !isExhausted && (
          <p className="mb-2 text-center text-[10px] text-muted-foreground">
            Select a style preset or upload a garment to generate
          </p>
        )}
        <Button
          className="w-full"
          size="lg"
          disabled={!canClickGenerate}
          onClick={handleGenerate}
          data-testid="generate-button"
        >
          {isGenerating || isSwapping ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isSwapping ? "Swapping Garment..." : "Generating..."}
            </>
          ) : isSwapMode ? (
            <>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Swap Garment onto Model
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate Model
            </>
          )}
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
