import React, { useState, useRef } from "react";
import {
  Circular3DGallery,
  Circular3DGalleryRef,
  GalleryItem,
  MOCK_PROJECTS,
  ProjectModal,
} from "../components/Circular3DGallery";
import {
  Layers,
  Sparkles,
  Sliders,
  RotateCcw,
  Zap,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Eye,
  Settings2,
  Code2,
  Info,
  CheckCircle2,
  Copy,
} from "lucide-react";

export function Gallery3DPage() {
  const galleryRef = useRef<Circular3DGalleryRef>(null);

  // Gallery Configuration States
  const [items, setItems] = useState<GalleryItem[]>(MOCK_PROJECTS);
  const [perspective, setPerspective] = useState<number>(1200);
  const [explicitRadius, setExplicitRadius] = useState<number | undefined>(undefined);
  const [depthOfField, setDepthOfField] = useState<boolean>(true);
  const [maxBlur, setMaxBlur] = useState<number>(3.5);
  const [minOpacity, setMinOpacity] = useState<number>(0.28);
  const [friction, setFriction] = useState<number>(0.92);
  const [snapSpring, setSnapSpring] = useState<number>(0.12);
  const [autoPlay, setAutoPlay] = useState<boolean>(false);
  const [reducedMotionOverride, setReducedMotionOverride] = useState<boolean | undefined>(undefined);
  const [showHUD, setShowHUD] = useState<boolean>(true);

  // Inspection Modal States
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [modalIndex, setModalIndex] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Active Index tracker
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"gallery" | "code">("gallery");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const handleOpenModal = (item: GalleryItem, index: number) => {
    setSelectedItem(item);
    setModalIndex(index);
    setIsModalOpen(true);
  };

  const handleModalNext = () => {
    const nextIdx = (modalIndex + 1) % items.length;
    setModalIndex(nextIdx);
    setSelectedItem(items[nextIdx]);
    galleryRef.current?.goTo(nextIdx);
  };

  const handleModalPrev = () => {
    const prevIdx = (modalIndex - 1 + items.length) % items.length;
    setModalIndex(prevIdx);
    setSelectedItem(items[prevIdx]);
    galleryRef.current?.goTo(prevIdx);
  };

  const handleCopySnippet = () => {
    const code = `<Circular3DGallery
  items={myProjects}
  perspective={1200}
  depthOfField={true}
  autoPlay={false}
  dragSensitivity={0.32}
  onCardClick={(project) => openDetails(project)}
/>`;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Banner & Header */}
      <div className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-lg shadow-amber-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Layers className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                3D Cylindrical Gallery Carousel
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                60/120 FPS rAF
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Direct GPU DOM transforms • Momentum drag physics • Depth-of-Field
            </p>
          </div>
        </div>

        {/* View Switcher & Quick Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("gallery")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "gallery"
                ? "bg-amber-500 text-slate-950 shadow-md font-bold"
                : "bg-slate-800/80 text-slate-300 hover:text-white"
            }`}
          >
            Interactive Demo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("code")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "code"
                ? "bg-amber-500 text-slate-950 shadow-md font-bold"
                : "bg-slate-800/80 text-slate-300 hover:text-white"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            React Usage
          </button>
        </div>
      </div>

      {activeTab === "gallery" ? (
        <div className="flex-1 flex flex-col">
          {/* Main 3D Stage Area */}
          <div className="relative flex-1 flex flex-col items-center justify-center p-2 sm:p-6 overflow-hidden">
            {/* Background 3D Radial Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-amber-500/10 via-blue-600/5 to-purple-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Core 3D Circular Gallery Component */}
            <Circular3DGallery
              ref={galleryRef}
              items={items}
              cardWidth={330}
              cardHeight={450}
              perspective={perspective}
              radius={explicitRadius}
              depthOfField={depthOfField}
              maxBlur={maxBlur}
              minOpacity={minOpacity}
              friction={friction}
              snapSpringFactor={snapSpring}
              autoPlay={autoPlay}
              reducedMotion={reducedMotionOverride}
              showPerformanceHUD={showHUD}
              onActiveChange={(idx) => setActiveIndex(idx)}
              onCardClick={(item, idx) => handleOpenModal(item, idx)}
            />
          </div>

          {/* Interactive Parameters & Imperative Control Panel */}
          <div className="border-t border-slate-800 bg-slate-900/90 backdrop-blur-xl p-4 sm:p-6">
            <div className="max-w-7xl mx-auto space-y-5">
              {/* Row 1: Imperative Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Imperative API:
                  </span>
                  <button
                    type="button"
                    onClick={() => galleryRef.current?.prev()}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    prev()
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryRef.current?.next()}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors flex items-center gap-1"
                  >
                    next()
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryRef.current?.goTo(0)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors"
                  >
                    goTo(0)
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryRef.current?.goTo(Math.floor(items.length / 2))}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors"
                  >
                    goTo(Center)
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryRef.current?.setRotation(0)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1"
                    title="Reset Angle"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {/* Autoplay Switch */}
                  <button
                    type="button"
                    onClick={() => setAutoPlay(!autoPlay)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      autoPlay
                        ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                        : "bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                    }`}
                  >
                    {autoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {autoPlay ? "Autoplay On" : "Autoplay Off"}
                  </button>

                  {/* HUD Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowHUD(!showHUD)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      showHUD
                        ? "bg-slate-800 border-amber-400/50 text-amber-400"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    HUD {showHUD ? "Visible" : "Hidden"}
                  </button>
                </div>
              </div>

              {/* Row 2: Live Physics & 3D Parameters Sliders */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
                {/* Perspective */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-400 font-medium">
                    <span>Perspective</span>
                    <span className="font-mono text-amber-400">{perspective}px</span>
                  </div>
                  <input
                    type="range"
                    min="600"
                    max="2200"
                    step="50"
                    value={perspective}
                    onChange={(e) => setPerspective(Number(e.target.value))}
                    className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Cylinder Radius */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-400 font-medium">
                    <span>Radius</span>
                    <span className="font-mono text-amber-400">
                      {explicitRadius ? `${explicitRadius}px` : "Auto"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="320"
                    max="900"
                    step="20"
                    value={explicitRadius || 460}
                    onChange={(e) => setExplicitRadius(Number(e.target.value))}
                    className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Depth of Field Blur */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-400 font-medium">
                    <span>Max DOF Blur</span>
                    <span className="font-mono text-amber-400">{maxBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    step="0.5"
                    value={maxBlur}
                    onChange={(e) => setMaxBlur(Number(e.target.value))}
                    className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Min Opacity */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-400 font-medium">
                    <span>Min Opacity</span>
                    <span className="font-mono text-amber-400">{minOpacity.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.05"
                    value={minOpacity}
                    onChange={(e) => setMinOpacity(Number(e.target.value))}
                    className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Friction */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-400 font-medium">
                    <span>Momentum Friction</span>
                    <span className="font-mono text-amber-400">{friction.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.80"
                    max="0.98"
                    step="0.01"
                    value={friction}
                    onChange={(e) => setFriction(Number(e.target.value))}
                    className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Snap Spring Lerp */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-400 font-medium">
                    <span>Snap Spring</span>
                    <span className="font-mono text-amber-400">{snapSpring.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.30"
                    step="0.01"
                    value={snapSpring}
                    onChange={(e) => setSnapSpring(Number(e.target.value))}
                    className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Row 3: Reduced Motion Override Switch & Items count */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
                <div className="flex items-center gap-4">
                  <span className="text-slate-400">Prefers-Reduced-Motion Test:</span>
                  <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setReducedMotionOverride(undefined)}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        reducedMotionOverride === undefined
                          ? "bg-amber-500 text-slate-950 font-bold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      System Default
                    </button>
                    <button
                      type="button"
                      onClick={() => setReducedMotionOverride(false)}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        reducedMotionOverride === false
                          ? "bg-amber-500 text-slate-950 font-bold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Force Off (120fps 3D)
                    </button>
                    <button
                      type="button"
                      onClick={() => setReducedMotionOverride(true)}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        reducedMotionOverride === true
                          ? "bg-amber-500 text-slate-950 font-bold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Force On (Reduced)
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  <span>Items:</span>
                  <button
                    type="button"
                    onClick={() => setItems(MOCK_PROJECTS.slice(0, 5))}
                    className={`px-2 py-1 rounded border text-xs ${
                      items.length === 5
                        ? "bg-amber-500/20 border-amber-400 text-amber-300 font-bold"
                        : "border-slate-700 hover:bg-slate-800"
                    }`}
                  >
                    5 Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setItems(MOCK_PROJECTS)}
                    className={`px-2 py-1 rounded border text-xs ${
                      items.length === MOCK_PROJECTS.length
                        ? "bg-amber-500/20 border-amber-400 text-amber-300 font-bold"
                        : "border-slate-700 hover:bg-slate-800"
                    }`}
                  >
                    8 Cards
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Code & Architecture Documentation View */
        <div className="flex-1 max-w-5xl mx-auto w-full p-6 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-amber-400" />
                  Integration Guide
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  How to use Circular3DGallery in any React + TypeScript + Tailwind application.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopySnippet}
                className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
              >
                {copiedCode ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedCode ? "Copied!" : "Copy Code"}
              </button>
            </div>

            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-amber-300 overflow-x-auto leading-relaxed">
{`import { useRef } from "react";
import { Circular3DGallery, Circular3DGalleryRef } from "@/components/Circular3DGallery";

export function MyProjectShowcase() {
  const galleryRef = useRef<Circular3DGalleryRef>(null);

  return (
    <div className="w-full py-12 bg-slate-950">
      <Circular3DGallery
        ref={galleryRef}
        items={projects}
        cardWidth={330}
        cardHeight={450}
        perspective={1200}
        depthOfField={true}
        maxBlur={3.5}
        friction={0.92}
        snapSpringFactor={0.12}
        enableWheel={true}
        enableKeyboard={true}
        onCardClick={(project, index) => {
          console.log("Selected project:", project);
        }}
      />
    </div>
  );
}`}
            </pre>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="font-bold text-amber-400 text-sm mb-1">True 3D Cylinder</div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  Items are positioned along a regular polygon cylinder using <code>rotateY(theta) translateZ(radius)</code> within a 3D perspective viewport.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="font-bold text-emerald-400 text-sm mb-1">Zero-Jank rAF Engine</div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  Direct DOM mutations inside <code>requestAnimationFrame</code> bypass React reconciliation during drags and spins, achieving locked 60/120fps.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="font-bold text-blue-400 text-sm mb-1">Adaptive Depth of Field</div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  Dynamic cosine-based z-indexing, Gaussian blur, and opacity scaling ensure foreground items are sharp and clickable while background cards gently recede.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Full Project Modal (Matching User's Uploaded Sports Photo) */}
      <ProjectModal
        isOpen={isModalOpen}
        item={selectedItem}
        currentIndex={modalIndex}
        totalItems={items.length}
        onClose={() => setIsModalOpen(false)}
        onNext={handleModalNext}
        onPrev={handleModalPrev}
      />
    </div>
  );
}
