import { useState } from "react";
import { useStudioStore } from "@/stores/studioStore";
import { useAssetStore } from "@/stores/assetStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadDropzone } from "./UploadDropzone";
import { Shirt, Users, Palette, Images, X, Check, Loader2, Plus, UserRound, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGalleryStore } from "@/stores/galleryStore";
import toast from "react-hot-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { StudioLeftTab } from "@/stores/studioStore";
import type { GarmentAsset, GeneratedImage } from "@/types";

export function LeftPanel() {
  const {
    leftTab,
    setLeftTab,
    selectedGarmentId,
    selectGarment,
    selectedModelId,
    selectModel,
    selectedReferenceId,
    selectReference,
    studioStep,
    selectedImageIndex,
    favoriteImageIds,
    toggleFavorite,
  } = useStudioStore();

  // Read assets from assetStore (Supabase-backed)
  const garments = useAssetStore((s) => s.garments);
  const models = useAssetStore((s) => s.models);
  const references = useAssetStore((s) => s.references);
  const uploadFiles = useAssetStore((s) => s.uploadFiles);
  const removeAssets = useAssetStore((s) => s.removeAssets);

  // Gallery store for Generations tab
  const galleryImages = useGalleryStore((s) => s.images);
  const galleryHasMore = useGalleryStore((s) => s.hasMore);
  const galleryIsLoadingMore = useGalleryStore((s) => s.isLoadingMore);
  const galleryLoadMore = useGalleryStore((s) => s.loadMore);

  const [garmentCategory, setGarmentCategory] = useState<GarmentAsset["category"]>("tops");
  const isFinetune = studioStep === "finetune";

  /** In Fine Tune mode, add the image to canvas and select it */
  const addToCanvasAndSelect = (image: GeneratedImage) => {
    const imgs = useStudioStore.getState().generatedImages;
    const existingIdx = imgs.findIndex((i) => i.id === image.id);
    if (existingIdx >= 0) {
      useStudioStore.getState().setSelectedImageIndex(existingIdx);
    } else {
      useStudioStore.getState().setGeneratedImages([...imgs, image]);
      useStudioStore.getState().setSelectedImageIndex(imgs.length);
    }
  };

  /** Convert any asset to a GeneratedImage so it can go on the canvas */
  const assetToCanvasImage = (id: string, url: string, thumbUrl: string, name: string): GeneratedImage => ({
    id,
    url,
    thumbnailUrl: thumbUrl,
    prompt: name,
    modelId: "",
    createdAt: new Date().toISOString(),
    status: "completed",
  });

  const handleGarmentUpload = (files: File[]) => {
    uploadFiles(files, "garments", garmentCategory);
  };

  const handleReferenceUpload = (files: File[]) => {
    uploadFiles(files, "references");
  };

  const handleUseAsModel = (img: GeneratedImage) => {
    const { gender, bodyType, presetType } = useStudioStore.getState();
    const studioModels = useStudioStore.getState().models;
    if (studioModels.some((m) => m.id === img.id)) {
      toast("Already saved to My Models", { icon: "ℹ️" });
      return;
    }
    const modelAsset = {
      id: img.id,
      name: `Model ${studioModels.length + 1}`,
      imageUrl: img.url,
      thumbnailUrl: img.thumbnailUrl || img.url,
      presetType: presetType ?? undefined,
      gender,
      bodyType,
      createdAt: img.createdAt,
    };
    useAssetStore.getState().addModel(modelAsset);
    useStudioStore.getState().addModel(modelAsset);
    useStudioStore.getState().selectModel(modelAsset.id);
    toast.success("Saved as Model!");
  };

  const handleUseAsRef = (img: GeneratedImage) => {
    const refAsset = {
      id: `r-${img.id}`,
      name: img.prompt || "Generated Reference",
      thumbnailUrl: img.thumbnailUrl || img.url,
      originalUrl: img.url,
      createdAt: img.createdAt,
    };
    useAssetStore.getState().addReference(refAsset);
    useStudioStore.getState().addReference(refAsset);
    useStudioStore.getState().selectReference(refAsset.id);
    toast.success("Saved as Reference!");
  };

  return (
    <div className="flex h-full flex-col">
      <Tabs
        value={leftTab}
        onValueChange={(v) => setLeftTab(v as StudioLeftTab)}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <TabsList className="mx-3 mt-3 grid w-auto grid-cols-4">
          <TabsTrigger value="product" className="relative gap-1 text-xs">
            <Shirt className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Product</span>
            {selectedGarmentId && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
            )}
          </TabsTrigger>
          <TabsTrigger value="models" className="relative gap-1 text-xs">
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Models</span>
            {selectedModelId && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
            )}
          </TabsTrigger>
          <TabsTrigger value="reference" className="relative gap-1 text-xs">
            <Palette className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ref</span>
            {selectedReferenceId && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
            )}
          </TabsTrigger>
          <TabsTrigger value="generations" className="relative gap-1 text-xs">
            <Images className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Gen</span>
            {selectedImageIndex !== null && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="product" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="space-y-3 p-3">
              <Select value={garmentCategory} onValueChange={(v) => setGarmentCategory(v as GarmentAsset["category"])}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tops">Tops</SelectItem>
                  <SelectItem value="outerwear">Outerwear</SelectItem>
                  <SelectItem value="bottoms">Bottoms</SelectItem>
                  <SelectItem value="dresses">Dresses</SelectItem>
                  <SelectItem value="accessories">Accessories</SelectItem>
                </SelectContent>
              </Select>
              <UploadDropzone
                onFilesAccepted={handleGarmentUpload}
                label="Drop garment images"
              />
              {garments.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {garments.map((garment) => (
                    <div
                      key={garment.id}
                      className={cn(
                        "group relative cursor-pointer overflow-hidden rounded-lg border-2 transition-colors",
                        selectedGarmentId === garment.id
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-transparent hover:border-muted-foreground/25"
                      )}
                      onClick={() => {
                        if (isFinetune) {
                          addToCanvasAndSelect(assetToCanvasImage(garment.id, garment.originalUrl, garment.thumbnailUrl, garment.name));
                        } else {
                          selectGarment(selectedGarmentId === garment.id ? null : garment.id);
                        }
                      }}
                    >
                      <img
                        src={garment.thumbnailUrl}
                        alt={garment.name}
                        className="aspect-square w-full object-cover"
                      />
                      {!isFinetune && selectedGarmentId === garment.id && (
                        <div className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedGarmentId === garment.id) selectGarment(null);
                          removeAssets([garment.id]);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <p className="truncate p-1 text-xs">{garment.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="models" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="space-y-3 p-3">
              {models.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <Users className="mb-2 h-8 w-8" />
                  <p className="text-sm">No saved models yet</p>
                  <p className="text-xs">
                    Generate a model from the right panel
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {models.map((model) => (
                    <div
                      key={model.id}
                      className={cn(
                        "group relative cursor-pointer overflow-hidden rounded-lg border-2 transition-colors",
                        selectedModelId === model.id
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-transparent hover:border-muted-foreground/25"
                      )}
                      onClick={() => {
                        if (isFinetune) {
                          addToCanvasAndSelect(assetToCanvasImage(model.id, model.imageUrl, model.thumbnailUrl, model.name));
                        } else {
                          selectModel(selectedModelId === model.id ? null : model.id);
                        }
                      }}
                    >
                      <img
                        src={model.thumbnailUrl}
                        alt={model.name}
                        className="aspect-[3/4] w-full object-cover"
                      />
                      {!isFinetune && selectedModelId === model.id && (
                        <div className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedModelId === model.id) selectModel(null);
                          removeAssets([model.id]);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <p className="truncate p-1 text-xs">{model.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="generations" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="space-y-3 p-3">
              {galleryImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <Images className="mb-2 h-8 w-8" />
                  <p className="text-sm">No generations yet</p>
                  <p className="text-xs">Generate images to see them here</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {galleryImages.map((img) => (
                    <div
                      key={img.id}
                      className="group relative overflow-hidden rounded-lg border-2 border-transparent hover:border-muted-foreground/25"
                    >
                      <img
                        src={img.thumbnailUrl}
                        alt=""
                        className="aspect-[3/4] w-full object-cover"
                      />
                      {/* Favorite indicator */}
                      {favoriteImageIds.has(img.id) && (
                        <div className="absolute top-1 right-1 z-10">
                          <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500 drop-shadow" />
                        </div>
                      )}
                      {/* Hover action icons */}
                      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="flex w-full justify-end gap-1 p-1.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-white hover:bg-white/20"
                                onClick={() => toggleFavorite(img.id)}
                              >
                                <Heart className={cn("h-3.5 w-3.5", favoriteImageIds.has(img.id) && "fill-red-500 text-red-500")} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{favoriteImageIds.has(img.id) ? "Unfavorite" : "Favorite"}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-white hover:bg-white/20"
                                onClick={() => handleUseAsRef(img)}
                              >
                                <Palette className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Save as Reference</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-white hover:bg-white/20"
                                onClick={() => handleUseAsModel(img)}
                              >
                                <UserRound className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Save as Model</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-white hover:bg-white/20"
                                onClick={() => addToCanvasAndSelect(img)}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Add to Canvas</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {galleryHasMore && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    disabled={galleryIsLoadingMore}
                    onClick={galleryLoadMore}
                  >
                    {galleryIsLoadingMore ? (
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    ) : null}
                    Load More
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="reference" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="space-y-3 p-3">
              <UploadDropzone
                onFilesAccepted={handleReferenceUpload}
                label="Drop reference / mood images"
              />
              {references.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {references.map((ref) => (
                    <div
                      key={ref.id}
                      className={cn(
                        "group relative cursor-pointer overflow-hidden rounded-lg border-2 transition-colors",
                        selectedReferenceId === ref.id
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-transparent hover:border-muted-foreground/25"
                      )}
                      onClick={() => {
                        if (isFinetune) {
                          addToCanvasAndSelect(assetToCanvasImage(ref.id, ref.originalUrl, ref.thumbnailUrl, ref.name));
                        } else {
                          selectReference(selectedReferenceId === ref.id ? null : ref.id);
                        }
                      }}
                    >
                      <img
                        src={ref.thumbnailUrl}
                        alt={ref.name}
                        className="aspect-square w-full object-cover"
                      />
                      {!isFinetune && selectedReferenceId === ref.id && (
                        <div className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedReferenceId === ref.id) selectReference(null);
                          removeAssets([ref.id]);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <p className="truncate p-1 text-xs">{ref.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

    </div>
  );
}
