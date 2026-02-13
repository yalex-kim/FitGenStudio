import { useState, useCallback, useMemo, useEffect, type SyntheticEvent } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useDropzone } from "react-dropzone";
import {
  FolderOpen,
  Upload,
  Search,
  Trash2,
  Download,
  CheckSquare,
  Pencil,
  Image,
  ImageOff,
  Users,
  Shirt,
  Palette,
  X,
  Loader2,
  Paintbrush,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssetStore, type AssetCategory } from "@/stores/assetStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ModelAsset, GarmentAsset, ReferenceAsset } from "@/types";

type AnyAsset = ModelAsset | GarmentAsset | ReferenceAsset;

function UploadZone({
  category,
  onUpload,
  isUploading,
}: {
  category: AssetCategory;
  onUpload: (files: File[]) => void;
  isUploading: boolean;
}) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onUpload(acceptedFiles);
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxSize: 20 * 1024 * 1024,
    disabled: isUploading,
  });

  const labels: Record<AssetCategory, string> = {
    models: "model images",
    garments: "garment photos",
    references: "reference images",
  };

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
        isUploading && "pointer-events-none opacity-60"
      )}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <Loader2 className="mb-2 h-8 w-8 animate-spin text-muted-foreground" />
      ) : (
        <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
      )}
      <p className="text-sm font-medium text-foreground">
        {isUploading ? "Uploading..." : `Drop ${labels[category]} here or click to browse`}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        JPEG, PNG, WebP (max 20MB)
      </p>
    </div>
  );
}

interface AssetCardProps {
  asset: AnyAsset;
  isSelected: boolean;
  onToggle: () => void;
  onRename: () => void;
  onDelete: () => void;
  onUseInStudio: () => void;
  badges?: React.ReactNode[];
  aspectRatio: string;
}

function AssetCard({
  asset,
  isSelected,
  onToggle,
  onRename,
  onDelete,
  onUseInStudio,
  badges,
  aspectRatio,
}: AssetCardProps) {
  const [imgError, setImgError] = useState(false);

  const dateStr = new Date(asset.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const handleImgError = (e: SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = "none";
    setImgError(true);
  };

  return (
    <Card
      className={cn(
        "group overflow-hidden transition-shadow hover:shadow-md",
        isSelected && "ring-2 ring-primary"
      )}
    >
      <div
        className={cn(
          "relative cursor-pointer bg-muted flex items-center justify-center",
          aspectRatio
        )}
        onClick={onToggle}
      >
        {asset.thumbnailUrl && !imgError ? (
          <img
            src={asset.thumbnailUrl}
            alt={asset.name}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={handleImgError}
          />
        ) : imgError ? (
          <div className="flex flex-col items-center gap-1">
            <ImageOff className="h-6 w-6 text-muted-foreground/40" />
            <span className="text-[10px] text-muted-foreground">Failed to load</span>
          </div>
        ) : (
          <Image className="h-8 w-8 text-muted-foreground/30" />
        )}

        {/* Selection checkbox */}
        <div
          className={cn(
            "absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded border-2 transition-opacity",
            isSelected
              ? "border-primary bg-primary opacity-100"
              : "border-muted-foreground/40 bg-background opacity-0 group-hover:opacity-100"
          )}
        >
          {isSelected && (
            <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 12 12">
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
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onUseInStudio();
            }}
          >
            <Paintbrush className="mr-1 h-3 w-3" />
            Use
          </Button>
        </div>

        {/* Context menu */}
        <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRename}>
                <Pencil className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <CardContent className="p-2.5">
        <p className="truncate text-sm font-medium">{asset.name}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {badges}
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">{dateStr}</p>
      </CardContent>
    </Card>
  );
}

function AssetGridSkeleton({ count, aspectRatio }: { count: number; aspectRatio: string }) {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className={cn("w-full", aspectRatio)} />
          <CardContent className="p-2.5 space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-3 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AssetLibraryPage() {
  const navigate = useNavigate();
  const {
    models,
    garments,
    references,
    isLoading,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    removeAssets,
    renameAsset,
    uploadFiles,
    isUploading,
    initialize,
  } = useAssetStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const [garmentCategory, setGarmentCategory] = useState<GarmentAsset["category"]>("tops");
  const [renameDialog, setRenameDialog] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [renameName, setRenameName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string[] | null>(null);

  const currentItems = useMemo(() => {
    const items =
      activeCategory === "models"
        ? models
        : activeCategory === "garments"
          ? garments
          : references;

    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [activeCategory, models, garments, references, searchQuery]);

  const handleUpload = useCallback(
    async (files: File[]) => {
      await uploadFiles(files, activeCategory, activeCategory === "garments" ? garmentCategory : undefined);
      toast.success(`${files.length} file${files.length > 1 ? "s" : ""} uploaded`);
    },
    [uploadFiles, activeCategory, garmentCategory]
  );

  const openRename = (id: string, name: string) => {
    setRenameName(name);
    setRenameDialog({ id, name });
  };

  const confirmRename = () => {
    if (renameDialog && renameName.trim()) {
      renameAsset(renameDialog.id, renameName.trim());
      setRenameDialog(null);
      toast.success("Asset renamed");
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    setDeleteConfirm(Array.from(selectedIds));
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      const count = deleteConfirm.length;
      removeAssets(deleteConfirm);
      setDeleteConfirm(null);
      toast.success(`${count === 1 ? "Asset" : `${count} assets`} deleted`);
    }
  };

  const hasSelection = selectedIds.size > 0;

  const handleTabChange = (v: string) => {
    setActiveCategory(v as AssetCategory);
  };

  function renderBadges(asset: AnyAsset): React.ReactNode[] {
    if (activeCategory === "models") {
      const model = asset as ModelAsset;
      return [
        model.presetType && (
          <Badge key="preset" variant="secondary" className="text-[10px] capitalize">
            {model.presetType}
          </Badge>
        ),
        <Badge key="gender" variant="outline" className="text-[10px] capitalize">
          {model.gender}
        </Badge>,
      ].filter(Boolean) as React.ReactNode[];
    }
    if (activeCategory === "garments") {
      const garment = asset as GarmentAsset;
      return [
        <Badge key="cat" variant="secondary" className="text-[10px] capitalize">
          {garment.category}
        </Badge>,
      ];
    }
    return [];
  }

  return (
    <div className="space-y-4 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <FolderOpen className="h-6 w-6" />
            Asset Library
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your models, garments, and reference images.
          </p>
        </div>
        {hasSelection && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedIds.size} selected</Badge>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBatchDelete}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Delete
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-1 h-3 w-3" />
              Download
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeCategory} onValueChange={handleTabChange}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="garments" className="gap-1.5">
              <Shirt className="h-4 w-4" />
              My Clothes
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {garments.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="models" className="gap-1.5">
              <Users className="h-4 w-4" />
              My Models
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {models.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="references" className="gap-1.5">
              <Palette className="h-4 w-4" />
              References
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {references.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-60 pl-8 text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              disabled={currentItems.length === 0}
            >
              <CheckSquare className="mr-1 h-3.5 w-3.5" />
              All
            </Button>
          </div>
        </div>

        {/* Upload zone - garments and references only */}
        {activeCategory !== "models" && (
          <div className="mt-4 space-y-3">
            {activeCategory === "garments" && (
              <Select value={garmentCategory} onValueChange={(v) => setGarmentCategory(v as GarmentAsset["category"])}>
                <SelectTrigger className="h-9 w-48">
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
            )}
            <UploadZone
              category={activeCategory}
              onUpload={handleUpload}
              isUploading={isUploading}
            />
          </div>
        )}

        {/* Garments tab */}
        <TabsContent value="garments" className="mt-4">
          {isLoading ? (
            <AssetGridSkeleton count={6} aspectRatio="aspect-square" />
          ) : currentItems.length === 0 ? (
            <EmptyState message="No garments found. Upload garment photos above to get started." />
          ) : (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {currentItems.map((item) => (
                <AssetCard
                  key={item.id}
                  asset={item}
                  isSelected={selectedIds.has(item.id)}
                  onToggle={() => toggleSelection(item.id)}
                  onRename={() => openRename(item.id, item.name)}
                  onDelete={() => setDeleteConfirm([item.id])}
                  onUseInStudio={() => navigate("/studio")}
                  badges={renderBadges(item)}
                  aspectRatio="aspect-square"
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Models tab */}
        <TabsContent value="models" className="mt-4">
          {isLoading ? (
            <AssetGridSkeleton count={4} aspectRatio="aspect-[3/4]" />
          ) : currentItems.length === 0 ? (
            <EmptyState message="No models saved yet. Create models in the Studio." />
          ) : (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {currentItems.map((item) => (
                <AssetCard
                  key={item.id}
                  asset={item}
                  isSelected={selectedIds.has(item.id)}
                  onToggle={() => toggleSelection(item.id)}
                  onRename={() => openRename(item.id, item.name)}
                  onDelete={() => setDeleteConfirm([item.id])}
                  onUseInStudio={() => navigate("/studio")}
                  badges={renderBadges(item)}
                  aspectRatio="aspect-[3/4]"
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* References tab */}
        <TabsContent value="references" className="mt-4">
          {isLoading ? (
            <AssetGridSkeleton count={4} aspectRatio="aspect-square" />
          ) : currentItems.length === 0 ? (
            <EmptyState message="No references found. Upload reference images above to get started." />
          ) : (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {currentItems.map((item) => (
                <AssetCard
                  key={item.id}
                  asset={item}
                  isSelected={selectedIds.has(item.id)}
                  onToggle={() => toggleSelection(item.id)}
                  onRename={() => openRename(item.id, item.name)}
                  onDelete={() => setDeleteConfirm([item.id])}
                  onUseInStudio={() => navigate("/studio")}
                  badges={renderBadges(item)}
                  aspectRatio="aspect-square"
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Rename Dialog */}
      <Dialog
        open={renameDialog !== null}
        onOpenChange={(open) => !open && setRenameDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Asset</DialogTitle>
            <DialogDescription>Enter a new name for this asset.</DialogDescription>
          </DialogHeader>
          <Input
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            placeholder="Enter new name"
            onKeyDown={(e) => e.key === "Enter" && confirmRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog(null)}>
              Cancel
            </Button>
            <Button onClick={confirmRename} disabled={!renameName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Assets</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              {deleteConfirm?.length === 1
                ? "this asset"
                : `${deleteConfirm?.length} assets`}
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <FolderOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
