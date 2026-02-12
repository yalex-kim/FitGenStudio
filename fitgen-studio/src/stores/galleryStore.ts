import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GeneratedImage } from "@/types";

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
  deleteImages: (ids: string[]) => void;
}

export const useGalleryStore = create<GalleryState>()(
  persist(
    (set) => ({
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

      addImages: (images) =>
        set((state) => ({
          images: [...images, ...state.images],
        })),

      deleteImages: (ids) =>
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
        }),
    }),
    {
      name: "fitgen-gallery",
      partialize: (state) => ({ images: state.images }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<GalleryState>),
      }),
    }
  )
);
