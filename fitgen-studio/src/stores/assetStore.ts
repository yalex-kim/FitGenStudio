import { create } from "zustand";
import type { ModelAsset, GarmentAsset, ReferenceAsset } from "@/types";

export type AssetCategory = "models" | "garments" | "references";

export interface AssetState {
  // Assets
  models: ModelAsset[];
  garments: GarmentAsset[];
  references: ReferenceAsset[];

  // UI state
  isLoading: boolean;
  activeCategory: AssetCategory;
  setActiveCategory: (category: AssetCategory) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  isUploading: boolean;

  // CRUD operations
  addModel: (model: ModelAsset) => void;
  addGarment: (garment: GarmentAsset) => void;
  addReference: (ref: ReferenceAsset) => void;
  removeAssets: (ids: string[]) => void;
  renameAsset: (id: string, name: string) => void;
  uploadFiles: (files: File[], category: AssetCategory) => Promise<void>;
  initialize: () => void;
}

// Mock data for demonstration
const MOCK_MODELS: ModelAsset[] = [
  {
    id: "m1",
    name: "Chic Model A",
    thumbnailUrl: "",
    imageUrl: "",
    presetType: "chic",
    gender: "female",
    bodyType: "slim",
    createdAt: "2026-02-10T10:00:00Z",
  },
  {
    id: "m2",
    name: "Sporty Model B",
    thumbnailUrl: "",
    imageUrl: "",
    presetType: "sporty",
    gender: "female",
    bodyType: "athletic",
    createdAt: "2026-02-09T14:30:00Z",
  },
  {
    id: "m3",
    name: "Street Male",
    thumbnailUrl: "",
    imageUrl: "",
    presetType: "street",
    gender: "male",
    bodyType: "athletic",
    createdAt: "2026-02-08T09:15:00Z",
  },
  {
    id: "m4",
    name: "Lovely Model C",
    thumbnailUrl: "",
    imageUrl: "",
    presetType: "lovely",
    gender: "female",
    bodyType: "slim",
    createdAt: "2026-02-07T16:45:00Z",
  },
];

const MOCK_GARMENTS: GarmentAsset[] = [
  {
    id: "g1",
    name: "White Blouse",
    thumbnailUrl: "",
    originalUrl: "",
    category: "tops",
    createdAt: "2026-02-10T11:00:00Z",
  },
  {
    id: "g2",
    name: "Denim Jacket",
    thumbnailUrl: "",
    originalUrl: "",
    category: "outerwear",
    createdAt: "2026-02-09T13:00:00Z",
  },
  {
    id: "g3",
    name: "Black Skirt",
    thumbnailUrl: "",
    originalUrl: "",
    category: "bottoms",
    createdAt: "2026-02-08T15:00:00Z",
  },
  {
    id: "g4",
    name: "Floral Dress",
    thumbnailUrl: "",
    originalUrl: "",
    category: "dresses",
    createdAt: "2026-02-07T10:00:00Z",
  },
  {
    id: "g5",
    name: "Striped T-Shirt",
    thumbnailUrl: "",
    originalUrl: "",
    category: "tops",
    createdAt: "2026-02-06T09:00:00Z",
  },
  {
    id: "g6",
    name: "Leather Bag",
    thumbnailUrl: "",
    originalUrl: "",
    category: "accessories",
    createdAt: "2026-02-05T14:00:00Z",
  },
];

const MOCK_REFERENCES: ReferenceAsset[] = [
  {
    id: "r1",
    name: "Editorial Lighting Ref",
    thumbnailUrl: "",
    originalUrl: "",
    createdAt: "2026-02-10T12:00:00Z",
  },
  {
    id: "r2",
    name: "Street Style Mood",
    thumbnailUrl: "",
    originalUrl: "",
    createdAt: "2026-02-09T08:00:00Z",
  },
];

export const useAssetStore = create<AssetState>()((set, get) => ({
  models: [],
  garments: [],
  references: [],

  isLoading: true,
  activeCategory: "garments",
  setActiveCategory: (category) =>
    set({ activeCategory: category, selectedIds: new Set(), searchQuery: "" }),
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectedIds: new Set<string>(),
  toggleSelection: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedIds: next };
    }),
  selectAll: () =>
    set((state) => {
      const category = state.activeCategory;
      const items =
        category === "models"
          ? state.models
          : category === "garments"
            ? state.garments
            : state.references;
      return { selectedIds: new Set(items.map((i) => i.id)) };
    }),
  clearSelection: () => set({ selectedIds: new Set() }),
  isUploading: false,

  addModel: (model) =>
    set((state) => ({ models: [model, ...state.models] })),
  addGarment: (garment) =>
    set((state) => ({ garments: [garment, ...state.garments] })),
  addReference: (ref) =>
    set((state) => ({ references: [ref, ...state.references] })),

  removeAssets: (ids) =>
    set((state) => {
      const idSet = new Set(ids);
      return {
        models: state.models.filter((m) => !idSet.has(m.id)),
        garments: state.garments.filter((g) => !idSet.has(g.id)),
        references: state.references.filter((r) => !idSet.has(r.id)),
        selectedIds: new Set(),
      };
    }),

  renameAsset: (id, name) =>
    set((state) => ({
      models: state.models.map((m) => (m.id === id ? { ...m, name } : m)),
      garments: state.garments.map((g) => (g.id === id ? { ...g, name } : g)),
      references: state.references.map((r) =>
        r.id === id ? { ...r, name } : r
      ),
    })),

  uploadFiles: async (files, category) => {
    set({ isUploading: true });
    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const now = new Date().toISOString();
    const { addGarment, addReference } = get();

    for (const file of files) {
      const id = `${category[0]}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const objectUrl = URL.createObjectURL(file);

      if (category === "garments") {
        addGarment({
          id,
          name: file.name.replace(/\.[^/.]+$/, ""),
          thumbnailUrl: objectUrl,
          originalUrl: objectUrl,
          category: "tops",
          createdAt: now,
        });
      } else if (category === "references") {
        addReference({
          id,
          name: file.name.replace(/\.[^/.]+$/, ""),
          thumbnailUrl: objectUrl,
          originalUrl: objectUrl,
          createdAt: now,
        });
      }
    }
    set({ isUploading: false });
  },

  initialize: () => {
    // Simulate initial data fetch - will be replaced with real API call
    setTimeout(() => {
      set({
        models: MOCK_MODELS,
        garments: MOCK_GARMENTS,
        references: MOCK_REFERENCES,
        isLoading: false,
      });
    }, 600);
  },
}));
