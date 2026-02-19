import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";
import { uploadBase64ToStorage } from "@/lib/storageUpload";
import { useAuthStore } from "@/stores/authStore";
import { useAssetStore } from "@/stores/assetStore";
import { useStudioStore } from "@/stores/studioStore";
import { downloadWithWatermark } from "@/lib/watermark";
import { cn } from "@/lib/utils";
import {
  Search,
  Download,
  Trash2,
  Palette,
  Image,
  Calendar,
  ArrowUpFromLine,
  CheckSquare,
  X,
  SlidersHorizontal,
  ImageOff,
  Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGalleryStore,
  type GalleryFilterStyle,
  type GallerySortBy,
} from "@/stores/galleryStore";

function LazyImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  if (!src || hasError) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-1 bg-muted", className)}>
        {hasError ? (
          <>
            <ImageOff className="h-6 w-6 text-muted-foreground/40" />
            <span className="text-[10px] text-muted-foreground">Failed to load</span>
          </>
        ) : (
          <Image className="h-8 w-8 text-muted-foreground/30" />
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative bg-muted", className)}>
      {!isLoaded && (
        <Skeleton className="absolute inset-0 h-full w-full" />
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          "h-full w-full object-cover transition-opacity",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export function GalleryPage() {
  const navigate = useNavigate();
  const {
    images,
    isLoading,
    isLoadingMore,
    hasMore,
    sortBy,
    setSortBy,
    filterStyle,
    setFilterStyle,
    searchQuery,
    setSearchQuery,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    detailImageId,
    openDetail,
    closeDetail,
    deleteImages,
    loadMore,
  } = useGalleryStore();

  // Re-initialize if images are empty (e.g. initial load failed due to DB timeout)
  const initialize = useGalleryStore((s) => s.initialize);
  useEffect(() => {
    if (images.length === 0 && !isLoading) {
      initialize();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Filtered and sorted images
  const filtered = useMemo(() => {
    let result = [...images];

    // Filter by style
    if (filterStyle !== "all") {
      result = result.filter(
        (img) => (img as unknown as { style?: string }).style === filterStyle
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (img) =>
          img.prompt.toLowerCase().includes(q) ||
          img.modelId.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === "oldest") {
      result.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } else {
      result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return result;
  }, [images, filterStyle, searchQuery, sortBy]);

  const hasSelection = selectedIds.size > 0;
  const batchMode = hasSelection;

  const detailImage = detailImageId
    ? images.find((img) => img.id === detailImageId)
    : null;

  const handleDownload = useCallback(
    (image: { id: string; url: string }) => {
      if (!image.url) return;
      const user = useAuthStore.getState().user;
      const tier = user?.tier ?? "free";
      downloadWithWatermark(image.url, `fitgen-${image.id}.png`, tier, {
        userId: user?.id ?? "anonymous",
        imageId: image.id,
        timestamp: Date.now(),
      }).catch(() => {
        const link = document.createElement("a");
        link.href = image.url;
        link.download = `fitgen-${image.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    },
    []
  );

  const handleDelete = useCallback(
    (ids: string[]) => {
      deleteImages(ids);
      toast.success(
        ids.length === 1 ? "Image deleted" : `${ids.length} images deleted`
      );
    },
    [deleteImages]
  );

  const [upscalingId, setUpscalingId] = useState<string | null>(null);

  const handleUseAsReference = useCallback(
    (image: { id: string; url: string; thumbnailUrl: string; prompt: string; createdAt: string }) => {
      const refAsset = {
        id: `r-${image.id}`,
        name: image.prompt || "Gallery Reference",
        thumbnailUrl: image.thumbnailUrl,
        originalUrl: image.url,
        createdAt: image.createdAt,
      };
      useAssetStore.getState().addReference(refAsset);
      useStudioStore.getState().addReference(refAsset);
      useStudioStore.getState().selectReference(refAsset.id);
      toast.success("Added as reference");
      navigate("/studio");
    },
    [navigate]
  );

  const handleUpscale = useCallback(
    async (image: { id: string; url: string }) => {
      if (!image.url || upscalingId) return;
      setUpscalingId(image.id);
      try {
        // Convert image URL to base64
        const img = document.createElement("img");
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Failed to load image"));
          img.src = image.url;
        });
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        const base64 = dataUrl.split(",")[1];

        const user = useAuthStore.getState().user;
        const resp = await fetch("/api/upscale", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user?.id ?? "anonymous",
            "x-user-tier": user?.tier ?? "free",
          },
          body: JSON.stringify({ imageBase64: base64, mimeType: "image/jpeg" }),
        });

        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.error || "Upscale failed");
        }

        const result = await resp.json();
        const userId = useAuthStore.getState().user?.id;
        const upscaledUrl = await uploadBase64ToStorage(result.data.imageBase64, result.data.mimeType, userId);

        // Update image in gallery store
        useGalleryStore.getState().updateImage(image.id, {
          url: upscaledUrl,
          thumbnailUrl: upscaledUrl,
        });
        toast.success("Image upscaled to 4K!");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Upscale failed");
      } finally {
        setUpscalingId(null);
      }
    },
    [upscalingId]
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Image className="h-6 w-6" />
            Gallery
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse your generated lookbook images.
          </p>
        </div>
        {hasSelection && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedIds.size} selected</Badge>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select all
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const selected = images.filter((img) => selectedIds.has(img.id));
                selected.forEach((img) => handleDownload(img));
              }}
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              Download
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleDelete(Array.from(selectedIds))}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by prompt or model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full pl-8 text-sm sm:w-72"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <Select
            value={filterStyle}
            onValueChange={(v) => setFilterStyle(v as GalleryFilterStyle)}
          >
            <SelectTrigger className="h-9 w-32 text-sm">
              <SelectValue placeholder="Style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Styles</SelectItem>
              <SelectItem value="lovely">Lovely</SelectItem>
              <SelectItem value="chic">Chic</SelectItem>
              <SelectItem value="sporty">Sporty</SelectItem>
              <SelectItem value="street">Street</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as GallerySortBy)}
          >
            <SelectTrigger className="h-9 w-32 text-sm">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
          {!hasSelection && (
            <Button variant="outline" size="sm" onClick={selectAll}>
              <CheckSquare className="mr-1 h-3.5 w-3.5" />
              Select
            </Button>
          )}
        </div>
      </div>

      {/* Skeleton loading for initial load */}
      {images.length === 0 && isLoading ? (
        <div className="columns-1 gap-4 sm:columns-2 md:columns-3 lg:columns-4">
          {Array.from({ length: 8 }).map((_, i) => {
            const heights = ["aspect-[3/4]", "aspect-square", "aspect-[4/5]", "aspect-[3/4]"];
            return (
              <div key={i} className="mb-4 break-inside-avoid">
                <Card className="overflow-hidden">
                  <Skeleton className={cn("w-full", heights[i % heights.length])} />
                  <CardContent className="p-2.5 space-y-1.5">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      ) : /* Masonry grid */
      filtered.length > 0 ? (
        <div className="columns-1 gap-4 sm:columns-2 md:columns-3 lg:columns-4">
          {filtered.map((item, i) => {
            const heights = [
              "aspect-[3/4]",
              "aspect-square",
              "aspect-[4/5]",
              "aspect-[3/4]",
            ];
            const heightClass = heights[i % heights.length];
            const isUpscaled = i % 5 === 0;

            return (
              <div key={item.id} className="mb-4 break-inside-avoid">
                <Card
                  className={cn(
                    "group overflow-hidden transition-shadow hover:shadow-md cursor-pointer",
                    selectedIds.has(item.id) && "ring-2 ring-primary"
                  )}
                  onClick={() => {
                    if (batchMode) {
                      toggleSelection(item.id);
                    } else {
                      openDetail(item.id);
                    }
                  }}
                >
                  <div className={cn("relative", heightClass)}>
                    <LazyImage
                      src={item.thumbnailUrl}
                      alt={item.prompt}
                      className="h-full w-full"
                    />

                    {isUpscaled && (
                      <Badge
                        className="absolute right-2 top-2 text-[10px]"
                        variant="secondary"
                      >
                        4K
                      </Badge>
                    )}

                    {/* Selection checkbox - always show in batch mode, on hover otherwise */}
                    <div
                      className={cn(
                        "absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded border-2 transition-opacity",
                        selectedIds.has(item.id)
                          ? "border-primary bg-primary opacity-100"
                          : batchMode
                            ? "border-muted-foreground/40 bg-background opacity-100"
                            : "border-muted-foreground/40 bg-background opacity-0 group-hover:opacity-100"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelection(item.id);
                      }}
                    >
                      {selectedIds.has(item.id) && (
                        <svg
                          className="h-3 w-3 text-primary-foreground"
                          viewBox="0 0 12 12"
                        >
                          <path
                            d="M10 3L4.5 8.5 2 6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>

                    {/* Hover overlay */}
                    {!batchMode && (
                      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="flex w-full items-center justify-between p-2">
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-white hover:bg-white/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(item);
                              }}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-white hover:bg-white/20"
                              title="Use as Reference"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUseAsReference(item);
                              }}
                            >
                              <Palette className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-2.5">
                    <p className="truncate text-xs font-medium">{item.prompt}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      Model: {item.modelId}
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(item.createdAt)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Image className="mb-4 h-12 w-12" />
          <p className="text-sm">
            {searchQuery || filterStyle !== "all"
              ? "No results found. Try adjusting your filters."
              : "No generated images yet. Head to the Studio to create lookbooks."}
          </p>
        </div>
      )}

      {images.length > 0 && (
        <div className="flex flex-col items-center gap-3 py-4">
          {hasMore && (
            <Button
              variant="outline"
              onClick={loadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isLoadingMore ? "Loading..." : "Load More"}
            </Button>
          )}
          <p className="text-sm text-muted-foreground">
            {images.length} image{images.length !== 1 ? "s" : ""} in gallery
          </p>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailImage !== null} onOpenChange={() => closeDetail()}>
        <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Image Detail</DialogTitle>
            <DialogDescription>{detailImage?.prompt}</DialogDescription>
          </DialogHeader>
          {detailImage && (
            <div className="space-y-4">
              <div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-muted">
                {detailImage.url ? (
                  <LazyImage
                    src={detailImage.url}
                    alt={detailImage.prompt}
                    className="h-full w-full rounded-lg"
                  />
                ) : (
                  <Image className="h-12 w-12 text-muted-foreground/30" />
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Model:</span>
                  <span>{detailImage.modelId}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Prompt:</span>
                  <span>{detailImage.prompt}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{formatDate(detailImage.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge
                    variant={
                      detailImage.status === "completed"
                        ? "secondary"
                        : detailImage.status === "failed"
                          ? "destructive"
                          : "default"
                    }
                    className="capitalize"
                  >
                    {detailImage.status}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => handleDownload(detailImage)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  disabled={upscalingId === detailImage.id}
                  onClick={() => handleUpscale(detailImage)}
                >
                  {upscalingId === detailImage.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUpFromLine className="mr-2 h-4 w-4" />
                  )}
                  {upscalingId === detailImage.id ? "Upscaling..." : "Upscale to 4K"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    handleUseAsReference(detailImage);
                    closeDetail();
                  }}
                >
                  <Palette className="mr-2 h-4 w-4" />
                  Use as Reference
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDelete([detailImage.id])}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
