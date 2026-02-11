import { useStudioStore } from "@/stores/studioStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UploadDropzone } from "./UploadDropzone";
import { Shirt, Users, Palette, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StudioLeftTab } from "@/stores/studioStore";

export function LeftPanel() {
  const {
    leftTab,
    setLeftTab,
    garments,
    addGarment,
    removeGarment,
    selectedGarmentId,
    selectGarment,
    models,
    removeModel,
    selectedModelId,
    selectModel,
    references,
    addReference,
    removeReference,
  } = useStudioStore();

  const handleGarmentUpload = (files: File[]) => {
    files.forEach((file) => {
      const id = crypto.randomUUID();
      const url = URL.createObjectURL(file);
      addGarment({
        id,
        name: file.name.replace(/\.[^/.]+$/, ""),
        thumbnailUrl: url,
        originalUrl: url,
        category: "tops",
        createdAt: new Date().toISOString(),
      });
    });
  };

  const handleReferenceUpload = (files: File[]) => {
    files.forEach((file) => {
      const id = crypto.randomUUID();
      const url = URL.createObjectURL(file);
      addReference({
        id,
        name: file.name.replace(/\.[^/.]+$/, ""),
        thumbnailUrl: url,
        originalUrl: url,
        createdAt: new Date().toISOString(),
      });
    });
  };

  return (
    <div className="flex h-full flex-col">
      <Tabs
        value={leftTab}
        onValueChange={(v) => setLeftTab(v as StudioLeftTab)}
        className="flex flex-1 flex-col"
      >
        <TabsList className="mx-3 mt-3 grid w-auto grid-cols-3">
          <TabsTrigger value="product" className="gap-1 text-xs">
            <Shirt className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Product</span>
          </TabsTrigger>
          <TabsTrigger value="models" className="gap-1 text-xs">
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Models</span>
          </TabsTrigger>
          <TabsTrigger value="reference" className="gap-1 text-xs">
            <Palette className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reference</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="product" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="space-y-3 p-3">
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
                          ? "border-primary"
                          : "border-transparent hover:border-muted-foreground/25"
                      )}
                      onClick={() => selectGarment(garment.id)}
                    >
                      <img
                        src={garment.thumbnailUrl}
                        alt={garment.name}
                        className="aspect-square w-full object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeGarment(garment.id);
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
                          ? "border-primary"
                          : "border-transparent hover:border-muted-foreground/25"
                      )}
                      onClick={() => selectModel(model.id)}
                    >
                      <img
                        src={model.thumbnailUrl}
                        alt={model.name}
                        className="aspect-[3/4] w-full object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeModel(model.id);
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
                      className="group relative overflow-hidden rounded-lg border"
                    >
                      <img
                        src={ref.thumbnailUrl}
                        alt={ref.name}
                        className="aspect-square w-full object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => removeReference(ref.id)}
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
