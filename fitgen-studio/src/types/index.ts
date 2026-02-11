export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  tier: "free" | "pro" | "business";
  creditsRemaining: number;
  creditsTotal: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export interface GeneratedImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  prompt: string;
  modelId: string;
  garmentId?: string;
  createdAt: string;
  status: "generating" | "completed" | "failed";
}

export interface ModelAsset {
  id: string;
  name: string;
  thumbnailUrl: string;
  presetType?: "lovely" | "chic" | "sporty" | "street";
  gender: "female" | "male";
  bodyType: "slim" | "athletic" | "plus";
  createdAt: string;
}

export interface GarmentAsset {
  id: string;
  name: string;
  thumbnailUrl: string;
  originalUrl: string;
  category: "tops" | "outerwear" | "bottoms" | "dresses" | "accessories";
  createdAt: string;
}

export interface ReferenceAsset {
  id: string;
  name: string;
  thumbnailUrl: string;
  originalUrl: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  thumbnailUrl?: string;
  imagesCount: number;
  updatedAt: string;
  createdAt: string;
}
