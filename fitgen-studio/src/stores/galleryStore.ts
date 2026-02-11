import { create } from "zustand";
import type { GeneratedImage } from "@/types";

export type GallerySortBy = "newest" | "oldest";
export type GalleryFilterStyle = "all" | "lovely" | "chic" | "sporty" | "street";

export interface GalleryState {
  images: GeneratedImage[];
  isLoading: boolean;
  hasMore: boolean;
  page: number;

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
  loadMore: () => Promise<void>;
  deleteImages: (ids: string[]) => void;
}

// Generate mock gallery data
function generateMockImages(count: number, offset: number): GeneratedImage[] {
  const styles = ["lovely", "chic", "sporty", "street"] as const;
  const prompts = [
    "Chic editorial model in white studio",
    "Sporty female model, outdoor park",
    "Street style male model, urban backdrop",
    "Lovely feminine model, cafe setting",
    "Athletic model, studio gray background",
    "Casual street look, golden hour",
  ];

  return Array.from({ length: count }, (_, i) => {
    const idx = offset + i;
    return {
      id: `gen-${idx}`,
      url: "",
      thumbnailUrl: "",
      prompt: prompts[idx % prompts.length],
      modelId: `m${(idx % 4) + 1}`,
      garmentId: idx % 3 === 0 ? undefined : `g${(idx % 6) + 1}`,
      createdAt: new Date(
        Date.now() - idx * 3600000 * 4
      ).toISOString(),
      status: "completed" as const,
      style: styles[idx % styles.length],
    };
  });
}

const INITIAL_IMAGES = generateMockImages(20, 0);

export const useGalleryStore = create<GalleryState>()((set, get) => ({
  images: INITIAL_IMAGES,
  isLoading: false,
  hasMore: true,
  page: 1,

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

  loadMore: async () => {
    const { page, isLoading, hasMore } = get();
    if (isLoading || !hasMore) return;

    set({ isLoading: true });
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    const nextPage = page + 1;
    const newImages = generateMockImages(20, page * 20);
    const reachedEnd = nextPage >= 5; // Stop after 100 images

    set((state) => ({
      images: [...state.images, ...newImages],
      page: nextPage,
      hasMore: !reachedEnd,
      isLoading: false,
    }));
  },

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
}));
