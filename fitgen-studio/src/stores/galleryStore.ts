import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "./authStore";
import type { GeneratedImage } from "@/types";
import type { GenerationRow, GenerationInsert } from "@/types/database";

export type GallerySortBy = "newest" | "oldest";
export type GalleryFilterStyle = "all" | "lovely" | "chic" | "sporty" | "street";

export interface GalleryState {
  images: GeneratedImage[];
  isLoading: boolean;

  // Filters
  sortBy: GallerySortBy;
  setSortBy: (sort: GallerySortBy) => void;
  filterStyle: GalleryFilterStyle;
  setFilterStyle: (style: GalleryFilterStyle) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Selection
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Detail view
  detailImageId: string | null;
  openDetail: (id: string) => void;
  closeDetail: () => void;

  // Actions
  addImages: (images: GeneratedImage[]) => void;
  updateImage: (id: string, updates: Partial<GeneratedImage>) => void;
  deleteImages: (ids: string[]) => void;
  initialize: () => void;
}

function getUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null;
}

function generationRowToImage(row: GenerationRow): GeneratedImage {
  return {
    id: row.id,
    url: row.image_url,
    thumbnailUrl: row.thumbnail_url || row.image_url,
    prompt: row.prompt_used || "",
    modelId: row.model_id || "",
    garmentId: row.garment_id || undefined,
    createdAt: row.created_at,
    status: "completed",
  };
}

function imageToGenerationInsert(
  image: GeneratedImage,
  userId: string,
): GenerationInsert {
  return {
    id: image.id,
    user_id: userId,
    type: image.garmentId ? "swap" : "model",
    image_url: image.url,
    thumbnail_url: image.thumbnailUrl,
    prompt_used: image.prompt || null,
    model_id: image.modelId || null,
    garment_id: image.garmentId || null,
    project_id: null,
    gemini_model_version: null,
  };
}

export const useGalleryStore = create<GalleryState>()((set) => ({
  images: [],
  isLoading: false,

  sortBy: "newest",
  setSortBy: (sort) => set({ sortBy: sort }),
  filterStyle: "all",
  setFilterStyle: (style) => set({ filterStyle: style }),
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
    set((state) => ({
      selectedIds: new Set(state.images.map((img) => img.id)),
    })),
  clearSelection: () => set({ selectedIds: new Set() }),

  detailImageId: null,
  openDetail: (id) => set({ detailImageId: id }),
  closeDetail: () => set({ detailImageId: null }),

  updateImage: (id, updates) => {
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id ? { ...img, ...updates } : img
      ),
    }));
  },

  addImages: (images) => {
    set((state) => ({
      images: [...images, ...state.images],
    }));

    // Insert into Supabase (fire-and-forget)
    const userId = getUserId();
    if (userId) {
      const rows = images.map((img) =>
        imageToGenerationInsert(img, userId),
      );
      supabase
        .from("generations")
        .insert(rows)
        .then(({ error }) => {
          if (error)
            console.error("Failed to save generations to DB:", error);
        });
    }
  },

  deleteImages: (ids) => {
    set((state) => {
      const idSet = new Set(ids);
      return {
        images: state.images.filter((img) => !idSet.has(img.id)),
        selectedIds: new Set(),
        detailImageId:
          state.detailImageId && idSet.has(state.detailImageId)
            ? null
            : state.detailImageId,
      };
    });

    // Delete from Supabase (fire-and-forget)
    const userId = getUserId();
    if (userId) {
      supabase
        .from("generations")
        .delete()
        .in("id", ids)
        .then(({ error }) => {
          if (error)
            console.error("Failed to delete generations from DB:", error);
        });
    }
  },

  initialize: () => {
    const userId = getUserId();
    if (!userId) return;

    set({ isLoading: true });

    supabase
      .rpc("get_user_generations", { p_user_id: userId, p_limit: 200 })
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to load generations:", error);
          set({ isLoading: false });
          return;
        }

        const dbImages = (data as GenerationRow[]).map(
          generationRowToImage,
        );

        set({
          images: dbImages,
          isLoading: false,
        });
      });
  },
}));
