# 🎠 High-Performance 3D Circular Project Gallery Carousel

A high-performance, GPU-accelerated **3D Cylindrical Project Gallery Carousel** built with **React**, **TypeScript**, and **Tailwind CSS**.

---

## ⚡ Highlights & Key Architectural Pillars

### 1. True 3D Cylindrical Geometry
- Uses CSS 3D transforms (`perspective`, `rotateY`, and `translateZ`) to map cards along a regular polygonal cylinder in true 3D space.
- Radius is dynamically calculated using polygon geometry:
  $$\text{Radius} \approx \frac{\text{cardWidth}}{2 \cdot \tan(\pi / N)}$$
- Provides depth and curvature with perspective origin centered on the viewport.

### 2. 60 / 120 FPS Direct DOM Mutation Loop
- **Zero React re-renders during motion**: Eliminates React reconciliation overhead during drags, momentum spins, and snapping.
- Runs inside a single persistent `requestAnimationFrame` loop that sleeps when the carousel is at rest to preserve battery and GPU cycles.
- Direct DOM mutations target composite-only GPU properties (`transform`, `opacity`, `filter`, `z-index`).

### 3. Fluid Momentum Physics & Auto-Snap
- **Velocity Estimation**: Tracks pointer displacement over a rolling time window using an Exponential Moving Average (EMA).
- **Momentum Coasting**: Applies configurable exponential friction decay on release.
- **Auto-Snap**: Predicts the resting angle based on velocity and smoothly spring-lerps into alignment with the nearest card with zero jitter or overshoot.
- **Click vs Drag Discrimination**: Distinguishes intentional drags from clicks. Clicking an offset card smoothly rotates it to the front.

### 4. Adaptive Depth-of-Field (DOF) & Z-Index Ordering
- Calculates each card's angle relative to the camera vector:
  $$\Delta\theta_i = (\theta_i + \theta_{\text{track}}) \pmod{360}$$
  $$\text{depthFactor} = \frac{1 + \cos(\Delta\theta_i)}{2} \in [0, 1]$$
- **Foreground items** stay crisp, sharp, full brightness, and interactive (`pointer-events: auto`).
- **Background items** gently fade in opacity, receive atmospheric Gaussian blur, dim in brightness, and disable pointer events so foreground actions are never blocked.
- Strict numeric `z-index` layering resolves 3D browser clipping artifacts.

### 5. Imperative API & Accessibility (`prefers-reduced-motion`)
- Exposes imperative handles via `forwardRef<Circular3DGalleryRef>`:
  - `next()`: Step to the next project
  - `prev()`: Step to the previous project
  - `goTo(index, immediate?)`: Smoothly or immediately rotate to any target index
  - `getCurrentIndex()`: Returns active card index
  - `pauseAutoplay()` / `resumeAutoplay()`
  - `setRotation(angleDeg)`
- **`prefers-reduced-motion` compliance**: Detects system preferences (or explicit prop override) to disable 3D revolutions and high-speed momentum, replacing them with instantaneous or gentle linear steps.

---

## 📦 Installation & Setup

Install standard peer dependencies:
```bash
npm install lucide-react clsx tailwind-merge
```

Import into your component:
```tsx
import { useRef } from "react";
import {
  Circular3DGallery,
  Circular3DGalleryRef,
  GalleryItem
} from "./components/Circular3DGallery";

const MY_PROJECTS: GalleryItem[] = [
  {
    id: "1",
    title: "DSSL Sports Arena",
    description: "Realtime sports telemetry and drone tracking in Haridwar.",
    image: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80",
    tags: ["Cricket", "Haridwar", "IoT"],
    link: "https://dsspl.in",
  },
  // ... more items
];

export function Showcase() {
  const galleryRef = useRef<Circular3DGalleryRef>(null);

  return (
    <div className="w-full min-h-[600px] bg-slate-950 flex items-center justify-center">
      <Circular3DGallery
        ref={galleryRef}
        items={MY_PROJECTS}
        cardWidth={330}
        cardHeight={450}
        perspective={1200}
        depthOfField={true}
        maxBlur={3.5}
        friction={0.92}
        snapSpringFactor={0.12}
        enableWheel={true}
        enableKeyboard={true}
        onCardClick={(item, index) => {
          console.log("Card clicked:", item);
        }}
      />
    </div>
  );
}
```

---

## 🎛️ Component Props (`Circular3DGalleryProps`)

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `items` | `T[]` | **Required** | Array of items conforming to `GalleryItem` |
| `initialIndex` | `number` | `0` | Initially centered active item index |
| `cardWidth` | `number` | `320` | Width of each card in pixels |
| `cardHeight` | `number` | `440` | Height of each card in pixels |
| `radius` | `number` | *Auto* | Cylinder radius override in pixels |
| `perspective` | `number` | `1200` | CSS 3D perspective depth in pixels |
| `depthOfField` | `boolean` | `true` | Enables Gaussian blur and dimming on receding cards |
| `minOpacity` | `number` | `0.28` | Minimum opacity for cards on the opposite side |
| `maxBlur` | `number` | `3.5` | Maximum blur radius in pixels for distant cards |
| `dragSensitivity` | `number` | `0.32` | Drag response factor for pointer and touch |
| `friction` | `number` | `0.92` | Momentum deceleration decay per frame |
| `snapSpringFactor` | `number` | `0.12` | Lerp spring factor for auto-snapping |
| `autoPlay` | `boolean` | `false` | Enable automatic carousel rotation |
| `autoPlayInterval`| `number` | `3500` | Autoplay step interval in milliseconds |
| `pauseOnHover` | `boolean` | `true` | Pauses autoplay when mouse hovers over carousel |
| `enableWheel` | `boolean` | `true` | Enables trackpad & mouse wheel navigation |
| `enableKeyboard` | `boolean` | `true` | Enables ArrowLeft / ArrowRight / Home / End keys |
| `reducedMotion` | `boolean` | *Auto* | Override system `prefers-reduced-motion` |
| `showPerformanceHUD` | `boolean` | `false` | Displays live FPS and telemetry monitor |
| `onActiveChange` | `(index, item) => void` | `undefined` | Callback fired when the active card changes |
| `onCardClick` | `(item, index) => void` | `undefined` | Callback fired when a card is clicked |
| `renderCard` | `(props) => ReactNode` | *Default* | Custom card renderer |
