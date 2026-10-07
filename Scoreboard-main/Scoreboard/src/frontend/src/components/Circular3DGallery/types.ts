import React from "react";

export interface ProjectAuthor {
  name: string;
  role?: string;
  avatar?: string;
}

export interface ProjectMetric {
  label: string;
  value: string | number;
}

export interface GalleryItem {
  id: string;
  title: string;
  description: string;
  category?: string;
  badge?: string;
  image: string;
  tags?: string[];
  metrics?: ProjectMetric[];
  link?: string;
  github?: string;
  author?: ProjectAuthor;
  date?: string;
  location?: string;
  featured?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CardRenderProps<T extends GalleryItem = GalleryItem> {
  item: T;
  index: number;
  isActive: boolean;
  angle: number;
  depthFactor: number;
  onClick: () => void;
  onSelect: () => void;
}

export interface Circular3DGalleryRef {
  /** Move to the next project card */
  next: () => void;
  /** Move to the previous project card */
  prev: () => void;
  /** Navigate directly to a specific card index */
  goTo: (index: number, immediate?: boolean) => void;
  /** Get the current active card index */
  getCurrentIndex: () => number;
  /** Pause the automatic rotation */
  pauseAutoplay: () => void;
  /** Resume the automatic rotation */
  resumeAutoplay: () => void;
  /** Imperatively set the cylinder rotation angle in degrees */
  setRotation: (angleDeg: number) => void;
}

export interface Circular3DGalleryProps<T extends GalleryItem = GalleryItem> {
  /** Array of project/gallery items */
  items: T[];
  /** Initially centered item index */
  initialIndex?: number;
  /** Width of each card in pixels (default: 320) */
  cardWidth?: number;
  /** Height of each card in pixels (default: 440) */
  cardHeight?: number;
  /** Explicit cylinder radius in pixels. If not provided, computed mathematically from cardWidth and item count */
  radius?: number;
  /** CSS 3D perspective depth in pixels (default: 1200) */
  perspective?: number;
  /** Enable subtle depth-of-field blur and atmospheric dimming for background items */
  depthOfField?: boolean;
  /** Minimum opacity for cards on the opposite side of the cylinder (default: 0.28) */
  minOpacity?: number;
  /** Maximum blur for distant background cards in pixels (default: 3.5) */
  maxBlur?: number;
  /** Drag sensitivity factor for pointer and touch interactions (default: 0.32) */
  dragSensitivity?: number;
  /** Momentum friction factor per frame (default: 0.92) */
  friction?: number;
  /** Spring lerp factor for snapping to nearest card (default: 0.12) */
  snapSpringFactor?: number;
  /** Automatically rotate through items */
  autoPlay?: boolean;
  /** Autoplay interval between transitions in ms (default: 3500) */
  autoPlayInterval?: number;
  /** Pause autoplay when pointer enters the carousel */
  pauseOnHover?: boolean;
  /** Enable trackpad/mouse wheel navigation */
  enableWheel?: boolean;
  /** Enable keyboard arrow key navigation when focused */
  enableKeyboard?: boolean;
  /** Override prefers-reduced-motion (if omitted, auto-detected from user's OS settings) */
  reducedMotion?: boolean;
  /** Callback fired when the centered active card changes */
  onActiveChange?: (index: number, item: T) => void;
  /** Callback fired when a card is clicked/selected */
  onCardClick?: (item: T, index: number) => void;
  /** Custom renderer for card contents */
  renderCard?: (props: CardRenderProps<T>) => React.ReactNode;
  /** Custom container CSS classes */
  className?: string;
  /** Show live FPS and physics telemetry HUD */
  showPerformanceHUD?: boolean;
}
