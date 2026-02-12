import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "./authStore";
import type { ModelAsset, GarmentAsset, ReferenceAsset } from "@/types";
import type { ModelRow, GarmentRow } from "@/types/database";

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

// --- DB ↔ Frontend type mappers ---

function mapBodyTypeFromDb(bt: string): "slim" | "athletic" | "plus" {
  return bt === "plus-size" ? "plus" : (bt as "slim" | "athletic");
}

function modelRowToAsset(row: ModelRow): ModelAsset {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.image_url,
    thumbnailUrl: row.thumbnail_url || row.image_url,
    presetType: row.style_preset ?? undefined,
    gender: row.gender,
    bodyType: mapBodyTypeFromDb(row.body_type),
    createdAt: row.created_at,
  };
}

function garmentRowToAsset(row: GarmentRow): GarmentAsset {
  return {
    id: row.id,
    name: row.name,
    thumbnailUrl: row.thumbnail_url || row.image_url,
    originalUrl: row.image_url,
    category: row.category,
    createdAt: row.created_at,
  };
}

function getUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null;
}

// References are stored in localStorage (no DB table)
const REFS_STORAGE_KEY = "fitgen-references";

function loadLocalReferences(): ReferenceAsset[] {
  try {
    const raw = localStorage.getItem(REFS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalReferences(refs: ReferenceAsset[]) {
  localStorage.setItem(REFS_STORAGE_KEY, JSON.stringify(refs));
}

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
    set((state) => {
      const next = [ref, ...state.references];
      saveLocalReferences(next);
      return { references: next };
    }),

  removeAssets: (ids) => {
    const userId = getUserId();
    const idSet = new Set(ids);

    // Optimistic update
    set((state) => ({
      models: state.models.filter((m) => !idSet.has(m.id)),
      garments: state.garments.filter((g) => !idSet.has(g.id)),
      references: state.references.filter((r) => !idSet.has(r.id)),
      selectedIds: new Set(),
    }));

    // Persist reference deletions
    saveLocalReferences(get().references);

    // Delete from DB (fire-and-forget)
    if (userId) {
      supabase.from("models").delete().in("id", ids).then();
      supabase.from("garments").delete().in("id", ids).then();
    }
  },

  renameAsset: (id, name) => {
    // Optimistic update
    set((state) => ({
      models: state.models.map((m) => (m.id === id ? { ...m, name } : m)),
      garments: state.garments.map((g) => (g.id === id ? { ...g, name } : g)),
      references: state.references.map((r) =>
        r.id === id ? { ...r, name } : r
      ),
    }));

    // Persist reference renames
    saveLocalReferences(get().references);

    // Update DB (fire-and-forget)
    const userId = getUserId();
    if (userId) {
      supabase.from("models").update({ name }).eq("id", id).then();
      supabase.from("garments").update({ name }).eq("id", id).then();
    }
  },

  uploadFiles: async (files, category) => {
    set({ isUploading: true });
    const userId = getUserId();
    const now = new Date().toISOString();
    const { addGarment, addReference } = get();

    for (const file of files) {
      const ext = file.name.split(".").pop() || "png";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const assetName = file.name.replace(/\.[^/.]+$/, "");

      if (category === "references") {
        // References: local only (no DB table)
        const objectUrl = URL.createObjectURL(file);
        addReference({
          id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: assetName,
          thumbnailUrl: objectUrl,
          originalUrl: objectUrl,
          createdAt: now,
        });
        continue;
      }

      if (!userId) {
        // Not logged in — fallback to local
        const objectUrl = URL.createObjectURL(file);
        if (category === "garments") {
          addGarment({
            id: `g-${Date.now()}`,
            name: assetName,
            thumbnailUrl: objectUrl,
            originalUrl: objectUrl,
            category: "tops",
            createdAt: now,
          });
        }
        continue;
      }

      // Upload to Supabase Storage
      const storagePath = `${userId}/${fileName}`;
      const bucket = category === "garments" ? "garments" : "models";
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, file, { contentType: file.type });

      if (uploadError) {
        console.error("Upload failed:", uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      if (category === "garments") {
        const { data, error } = await supabase
          .from("garments")
          .insert({
            user_id: userId,
            name: assetName,
            image_url: publicUrl,
            thumbnail_url: publicUrl,
            category: "tops",
          })
          .select()
          .single();

        if (!error && data) {
          addGarment(garmentRowToAsset(data as GarmentRow));
        }
      }
    }
    set({ isUploading: false });
  },

  initialize: () => {
    const userId = getUserId();

    // Load references from localStorage immediately
    const localRefs = loadLocalReferences();
    set({ references: localRefs });

    if (!userId) {
      set({ isLoading: false });
      return;
    }

    // Fetch models and garments from Supabase
    Promise.all([
      supabase
        .from("models")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("garments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]).then(([modelsRes, garmentsRes]) => {
      const models = (modelsRes.data as ModelRow[] | null)?.map(modelRowToAsset) ?? [];
      const garments = (garmentsRes.data as GarmentRow[] | null)?.map(garmentRowToAsset) ?? [];

      set({ models, garments, isLoading: false });
    }).catch(() => {
      set({ isLoading: false });
    });
  },
}));
