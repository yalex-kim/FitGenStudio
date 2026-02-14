import { create } from "zustand";
import type { ModelAsset, GarmentAsset, ReferenceAsset, GeneratedImage } from "@/types";

export type StudioLeftTab = "product" | "models" | "reference";

export interface StudioState {
  // Left panel
  leftTab: StudioLeftTab;
  setLeftTab: (tab: StudioLeftTab) => void;
  garments: GarmentAsset[];
  addGarment: (garment: GarmentAsset) => void;
  removeGarment: (id: string) => void;
  selectedGarmentId: string | null;
  selectGarment: (id: string | null) => void;
  models: ModelAsset[];
  addModel: (model: ModelAsset) => void;
  removeModel: (id: string) => void;
  selectedModelId: string | null;
  selectModel: (id: string | null) => void;
  references: ReferenceAsset[];
  addReference: (ref: ReferenceAsset) => void;
  removeReference: (id: string) => void;
  selectedReferenceId: string | null;
  selectReference: (id: string | null) => void;

  // Right panel - model generation
  presetType: "lovely" | "chic" | "sporty" | "street" | null;
  setPresetType: (preset: "lovely" | "chic" | "sporty" | "street" | null) => void;
  gender: "female" | "male";
  setGender: (gender: "female" | "male") => void;
  bodyType: "slim" | "athletic" | "plus";
  setBodyType: (bodyType: "slim" | "athletic" | "plus") => void;
  ageRange: "20s" | "30s" | "40s";
  setAgeRange: (age: "20s" | "30s" | "40s") => void;

  // Styling
  tuckIn: boolean;
  setTuckIn: (v: boolean) => void;
  sleeveRoll: boolean;
  setSleeveRoll: (v: boolean) => void;
  buttonOpen: boolean;
  setButtonOpen: (v: boolean) => void;
  autoCoordination: boolean;
  setAutoCoordination: (v: boolean) => void;

  // Director
  backgroundPreset: string;
  setBackgroundPreset: (bg: string) => void;
  lightingPreset: string;
  setLightingPreset: (lighting: string) => void;
  posePreset: string;
  setPosePreset: (pose: string) => void;
  cameraAngle: string;
  setCameraAngle: (angle: string) => void;
  framing: string;
  setFraming: (framing: string) => void;

  // Canvas
  generatedImages: GeneratedImage[];
  setGeneratedImages: (images: GeneratedImage[]) => void;
  selectedImageIndex: number | null;
  setSelectedImageIndex: (index: number | null) => void;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
  generationProgress: number;
  setGenerationProgress: (progress: number) => void;
  generationError: string | null;
  setGenerationError: (error: string | null) => void;
  favoriteImageIds: Set<string>;
  toggleFavorite: (imageId: string) => void;
  compareImageId: string | null;
  setCompareImageId: (id: string | null) => void;

  // Upscale / Fine-tune
  isUpscaling: boolean;
  setIsUpscaling: (v: boolean) => void;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;

  // Swap mode
  swapResults: GeneratedImage[];
  setSwapResults: (images: GeneratedImage[]) => void;
  isSwapping: boolean;
  setIsSwapping: (v: boolean) => void;
  swapError: string | null;
  setSwapError: (error: string | null) => void;
}

export const useStudioStore = create<StudioState>()((set) => ({
  // Left panel
  leftTab: "product",
  setLeftTab: (tab) => set({ leftTab: tab }),
  garments: [],
  addGarment: (garment) =>
    set((state) => ({ garments: [...state.garments, garment] })),
  removeGarment: (id) =>
    set((state) => ({ garments: state.garments.filter((g) => g.id !== id) })),
  selectedGarmentId: null,
  selectGarment: (id) => set({ selectedGarmentId: id }),
  models: [],
  addModel: (model) =>
    set((state) => ({ models: [...state.models, model] })),
  removeModel: (id) =>
    set((state) => ({ models: state.models.filter((m) => m.id !== id) })),
  selectedModelId: null,
  selectModel: (id) => set({ selectedModelId: id }),
  references: [],
  addReference: (ref) =>
    set((state) => ({ references: [...state.references, ref] })),
  removeReference: (id) =>
    set((state) => ({ references: state.references.filter((r) => r.id !== id) })),
  selectedReferenceId: null,
  selectReference: (id) => set({ selectedReferenceId: id }),

  // Right panel
  presetType: null,
  setPresetType: (preset) => set({ presetType: preset }),
  gender: "female",
  setGender: (gender) => set({ gender }),
  bodyType: "slim",
  setBodyType: (bodyType) => set({ bodyType }),
  ageRange: "20s",
  setAgeRange: (age) => set({ ageRange: age }),

  // Styling
  tuckIn: false,
  setTuckIn: (v) => set({ tuckIn: v }),
  sleeveRoll: false,
  setSleeveRoll: (v) => set({ sleeveRoll: v }),
  buttonOpen: false,
  setButtonOpen: (v) => set({ buttonOpen: v }),
  autoCoordination: false,
  setAutoCoordination: (v) => set({ autoCoordination: v }),

  // Director
  backgroundPreset: "white-studio",
  setBackgroundPreset: (bg) => set({ backgroundPreset: bg }),
  lightingPreset: "studio",
  setLightingPreset: (lighting) => set({ lightingPreset: lighting }),
  posePreset: "standing",
  setPosePreset: (pose) => set({ posePreset: pose }),
  cameraAngle: "front",
  setCameraAngle: (angle) => set({ cameraAngle: angle }),
  framing: "full-body",
  setFraming: (framing) => set({ framing }),

  // Canvas
  generatedImages: [],
  setGeneratedImages: (images) => set({ generatedImages: images }),
  selectedImageIndex: null,
  setSelectedImageIndex: (index) => set({ selectedImageIndex: index }),
  isGenerating: false,
  setIsGenerating: (v) => set({ isGenerating: v }),
  generationProgress: 0,
  setGenerationProgress: (progress) => set({ generationProgress: progress }),
  generationError: null,
  setGenerationError: (error) => set({ generationError: error }),
  favoriteImageIds: new Set<string>(),
  toggleFavorite: (imageId) =>
    set((state) => {
      const next = new Set(state.favoriteImageIds);
      if (next.has(imageId)) {
        next.delete(imageId);
      } else {
        next.add(imageId);
      }
      return { favoriteImageIds: next };
    }),
  compareImageId: null,
  setCompareImageId: (id) => set({ compareImageId: id }),

  // Upscale / Fine-tune
  isUpscaling: false,
  setIsUpscaling: (v) => set({ isUpscaling: v }),
  isEditing: false,
  setIsEditing: (v) => set({ isEditing: v }),

  // Swap mode
  swapResults: [],
  setSwapResults: (images) => set({ swapResults: images }),
  isSwapping: false,
  setIsSwapping: (v) => set({ isSwapping: v }),
  swapError: null,
  setSwapError: (error) => set({ swapError: error }),
}));
