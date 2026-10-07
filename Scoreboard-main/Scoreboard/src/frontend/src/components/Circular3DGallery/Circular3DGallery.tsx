import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  ExternalLink,
  Github,
  Maximize2,
  Sparkles,
  Layers,
  Gauge,
} from "lucide-react";
import {
  Circular3DGalleryProps,
  Circular3DGalleryRef,
  GalleryItem,
  CardRenderProps,
} from "./types";

interface PointerHistorySample {
  time: number;
  x: number;
}

const DEFAULT_CARD_WIDTH = 320;
const DEFAULT_CARD_HEIGHT = 440;
const DEFAULT_PERSPECTIVE = 1200;
const DEFAULT_MIN_OPACITY = 0.28;
const DEFAULT_MAX_BLUR = 3.5;
const DEFAULT_DRAG_SENSITIVITY = 0.32;
const DEFAULT_FRICTION = 0.92;
const DEFAULT_SNAP_SPRING = 0.12;

function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

function getShortestAngleDelta(current: number, target: number): number {
  return ((target - current + 540) % 360) - 180;
}

export const Circular3DGallery = forwardRef<Circular3DGalleryRef, Circular3DGalleryProps>(
  function Circular3DGalleryInner<T extends GalleryItem = GalleryItem>(
    {
      items,
      initialIndex = 0,
      cardWidth = DEFAULT_CARD_WIDTH,
      cardHeight = DEFAULT_CARD_HEIGHT,
      radius: explicitRadius,
      perspective = DEFAULT_PERSPECTIVE,
      depthOfField = true,
      minOpacity = DEFAULT_MIN_OPACITY,
      maxBlur = DEFAULT_MAX_BLUR,
      dragSensitivity = DEFAULT_DRAG_SENSITIVITY,
      friction = DEFAULT_FRICTION,
      snapSpringFactor = DEFAULT_SNAP_SPRING,
      autoPlay = false,
      autoPlayInterval = 3500,
      pauseOnHover = true,
      enableWheel = true,
      enableKeyboard = true,
      reducedMotion: explicitReducedMotion,
      onActiveChange,
      onCardClick,
      renderCard,
      className = "",
      showPerformanceHUD = false,
    }: Circular3DGalleryProps<T>,
    ref: React.Ref<Circular3DGalleryRef>
  ) {
    const N = items.length;
    const stepAngle = N > 0 ? 360 / N : 360;

    // Cylinder radius: auto-computed with polygon trigonometry + breathing margin
    const radius =
      explicitRadius ??
      (N > 0
        ? Math.max(
            cardWidth * 1.25,
            Math.round((cardWidth / 2) / Math.tan(Math.PI / Math.max(N, 3)) * 1.06)
          )
        : 400);

    // DOM Element Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const cylinderRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Animation & Physics State in Refs (ZERO React state mutations in rAF)
    const angleRef = useRef<number>(-initialIndex * stepAngle);
    const targetAngleRef = useRef<number>(-initialIndex * stepAngle);
    const velocityRef = useRef<number>(0);
    const isDraggingRef = useRef<boolean>(false);
    const isHoveredRef = useRef<boolean>(false);
    const isAutoPlayPausedRef = useRef<boolean>(false);

    // Pointer Drag Tracking Refs
    const pointerStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
    const pointerLastRef = useRef<{ x: number; time: number }>({ x: 0, time: 0 });
    const pointerHistoryRef = useRef<PointerHistorySample[]>([]);
    const dragDistanceRef = useRef<number>(0);

    // Loop & Performance Telemetry
    const rafIdRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number>(performance.now());
    const lastActiveIndexRef = useRef<number>(initialIndex);
    const fpsRef = useRef<{ frames: number; lastTime: number; currentFps: number }>({
      frames: 0,
      lastTime: performance.now(),
      currentFps: 60,
    });

    // React states for UI / indicators ONLY (updated infrequently)
    const [activeIndex, setActiveIndex] = useState<number>(initialIndex);
    const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(autoPlay);
    const [isDraggingState, setIsDraggingState] = useState<boolean>(false);
    const [liveFps, setLiveFps] = useState<number>(60);
    const [systemReducedMotion, setSystemReducedMotion] = useState<boolean>(false);

    // Detect system prefers-reduced-motion
    useEffect(() => {
      if (typeof window === "undefined") return;
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setSystemReducedMotion(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => setSystemReducedMotion(e.matches);
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }, []);

    const isReducedMotion = explicitReducedMotion ?? systemReducedMotion;

    // Helper: update active index when cylinder settles or crosses cards
    const checkAndUpdateActiveIndex = useCallback(
      (currentAngle: number) => {
        if (N === 0) return;
        const normalized = -currentAngle;
        const rawIndex = Math.round(normalized / stepAngle);
        const resolvedIndex = ((rawIndex % N) + N) % N;

        if (resolvedIndex !== lastActiveIndexRef.current) {
          lastActiveIndexRef.current = resolvedIndex;
          setActiveIndex(resolvedIndex);
          onActiveChange?.(resolvedIndex, items[resolvedIndex]);
        }
      },
      [N, stepAngle, items, onActiveChange]
    );

    // Direct DOM Mutation Function: transforms cylinder and individual card DOF properties
    const mutateDOM = useCallback(
      (angle: number) => {
        if (!cylinderRef.current) return;

        // Mutate Cylinder Transform (GPU Accelerated Composite)
        cylinderRef.current.style.transform = `translateZ(-${radius}px) rotateY(${angle.toFixed(3)}deg)`;

        const blurFactor = isReducedMotion ? 0 : maxBlur;

        // Mutate each card's depth-of-field, opacity, filter and z-index directly
        for (let i = 0; i < N; i++) {
          const cardEl = cardRefs.current[i];
          if (!cardEl) continue;

          const baseAngle = i * stepAngle;
          // Angular distance from camera front (0 deg = facing camera directly)
          const relAngle = ((baseAngle + angle + 540) % 360) - 180;
          const rad = (relAngle * Math.PI) / 180;
          const cosVal = Math.cos(rad); // 1 = front, -1 = back

          // Normalized depth factor: 1 at front, 0 at deep back
          const depthFactor = Math.max(0, Math.min(1, (1 + cosVal) / 2));

          // 1. Z-Index ordering (highest at front so foreground strictly layers above background)
          cardEl.style.zIndex = String(Math.round(depthFactor * 1000));

          // 2. Opacity falloff
          const calculatedOpacity = minOpacity + (1 - minOpacity) * Math.pow(depthFactor, 1.35);
          cardEl.style.opacity = calculatedOpacity.toFixed(3);

          // 3. Depth-of-Field Blur & Brightness
          if (depthOfField && blurFactor > 0) {
            const blurPx = ((1 - depthFactor) * blurFactor).toFixed(1);
            const brightness = (0.55 + 0.45 * depthFactor).toFixed(2);
            cardEl.style.filter = `blur(${blurPx}px) brightness(${brightness})`;
          } else {
            cardEl.style.filter = "none";
          }

          // 4. Pointer Events & Interactivity: only cards facing viewer (cosVal > 0.15) receive clicks
          cardEl.style.pointerEvents = cosVal > 0.15 ? "auto" : "none";

          // Optional subtle CSS custom property for consumer styling
          cardEl.style.setProperty("--depth-factor", depthFactor.toFixed(3));
          cardEl.style.setProperty("--is-active", Math.abs(relAngle) < stepAngle / 2 ? "1" : "0");
        }
      },
      [radius, isReducedMotion, maxBlur, N, stepAngle, minOpacity, depthOfField]
    );

    // Main 60/120fps Animation Loop using requestAnimationFrame
    const animate = useCallback(
      (time: number) => {
        const dt = Math.min(32, Math.max(1, time - lastFrameTimeRef.current));
        lastFrameTimeRef.current = time;
        const dtFactor = dt / 16.667;

        // Telemetry FPS meter
        if (showPerformanceHUD) {
          fpsRef.current.frames++;
          if (time - fpsRef.current.lastTime >= 350) {
            const calculatedFps = Math.round(
              (fpsRef.current.frames * 1000) / (time - fpsRef.current.lastTime)
            );
            fpsRef.current.currentFps = calculatedFps;
            fpsRef.current.frames = 0;
            fpsRef.current.lastTime = time;
            setLiveFps(calculatedFps);
          }
        }

        let isMoving = false;

        if (isDraggingRef.current) {
          // While dragging: angle tracks pointer directly, velocity computed via EMA
          isMoving = true;
        } else if (isReducedMotion) {
          // Reduced motion: quick direct spring without spin
          const diff = targetAngleRef.current - angleRef.current;
          if (Math.abs(diff) > 0.1) {
            angleRef.current += diff * 0.35 * dtFactor;
            isMoving = true;
          } else {
            angleRef.current = targetAngleRef.current;
            velocityRef.current = 0;
          }
        } else {
          // Physics: Momentum Coasting & Spring Snapping
          const velocity = velocityRef.current;
          const targetAngle = targetAngleRef.current;
          const currentAngle = angleRef.current;
          const distanceToTarget = targetAngle - currentAngle;

          if (Math.abs(velocity) > 0.04) {
            // Phase 1: Coasting with momentum
            angleRef.current += velocity * dtFactor;
            // Decay velocity with friction
            velocityRef.current *= Math.pow(friction, dtFactor);

            // Dynamically recalculate nearest snap target as velocity decays
            const projectedRest =
              angleRef.current + (velocityRef.current * 16.67) / (1 - friction);
            const nearestIndex = Math.round(-projectedRest / stepAngle);
            targetAngleRef.current = -nearestIndex * stepAngle;
            isMoving = true;
          } else {
            // Phase 2: Smooth spring snapping to target angle
            if (Math.abs(distanceToTarget) > 0.04) {
              const springStep = distanceToTarget * snapSpringFactor * dtFactor;
              angleRef.current += springStep;
              isMoving = true;
            } else {
              // Settled at rest
              angleRef.current = targetAngle;
              velocityRef.current = 0;
            }
          }
        }

        // Apply DOM mutation directly (Composite only, no React layout trigger)
        mutateDOM(angleRef.current);
        checkAndUpdateActiveIndex(angleRef.current);

        // Keep loop running if in motion or dragging or autoplaying
        if (isMoving || isDraggingRef.current || isAutoPlaying) {
          rafIdRef.current = requestAnimationFrame(animate);
        } else {
          rafIdRef.current = null;
        }
      },
      [
        showPerformanceHUD,
        isReducedMotion,
        friction,
        stepAngle,
        snapSpringFactor,
        mutateDOM,
        checkAndUpdateActiveIndex,
        isAutoPlaying,
      ]
    );

    // Start or wake the animation loop
    const wakeLoop = useCallback(() => {
      if (rafIdRef.current === null) {
        lastFrameTimeRef.current = performance.now();
        rafIdRef.current = requestAnimationFrame(animate);
      }
    }, [animate]);

    // Initial DOM setup & resize positioning
    useEffect(() => {
      mutateDOM(angleRef.current);
      wakeLoop();
      return () => {
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
      };
    }, [mutateDOM, wakeLoop]);

    // Imperative Navigation Functions
    const goTo = useCallback(
      (targetIndex: number, immediate = false) => {
        if (N === 0) return;
        const normalizedTarget = ((targetIndex % N) + N) % N;
        const targetDeg = -targetIndex * stepAngle;

        if (immediate || isReducedMotion) {
          angleRef.current = targetDeg;
          targetAngleRef.current = targetDeg;
          velocityRef.current = 0;
          mutateDOM(targetDeg);
          checkAndUpdateActiveIndex(targetDeg);
        } else {
          // Find shortest angular distance from current angle
          const current = angleRef.current;
          const delta = getShortestAngleDelta(current, targetDeg);
          targetAngleRef.current = current + delta;
          velocityRef.current = 0;
          wakeLoop();
        }
      },
      [N, stepAngle, isReducedMotion, mutateDOM, checkAndUpdateActiveIndex, wakeLoop]
    );

    const next = useCallback(() => {
      const currentIdx = Math.round(-angleRef.current / stepAngle);
      targetAngleRef.current = -(currentIdx + 1) * stepAngle;
      velocityRef.current = 0;
      wakeLoop();
    }, [stepAngle, wakeLoop]);

    const prev = useCallback(() => {
      const currentIdx = Math.round(-angleRef.current / stepAngle);
      targetAngleRef.current = -(currentIdx - 1) * stepAngle;
      velocityRef.current = 0;
      wakeLoop();
    }, [stepAngle, wakeLoop]);

    // Expose imperative ref
    useImperativeHandle(
      ref,
      () => ({
        next,
        prev,
        goTo,
        getCurrentIndex: () => lastActiveIndexRef.current,
        pauseAutoplay: () => {
          isAutoPlayPausedRef.current = true;
          setIsAutoPlaying(false);
        },
        resumeAutoplay: () => {
          isAutoPlayPausedRef.current = false;
          setIsAutoPlaying(true);
          wakeLoop();
        },
        setRotation: (angleDeg: number) => {
          angleRef.current = angleDeg;
          targetAngleRef.current = angleDeg;
          velocityRef.current = 0;
          mutateDOM(angleDeg);
          wakeLoop();
        },
      }),
      [next, prev, goTo, wakeLoop, mutateDOM]
    );

    // Autoplay Timer Loop
    useEffect(() => {
      if (!isAutoPlaying || autoPlayInterval <= 0) return;

      const timer = setInterval(() => {
        if (
          isDraggingRef.current ||
          (pauseOnHover && isHoveredRef.current) ||
          isAutoPlayPausedRef.current
        ) {
          return;
        }
        next();
      }, autoPlayInterval);

      return () => clearInterval(timer);
    }, [isAutoPlaying, autoPlayInterval, pauseOnHover, next]);

    // Pointer Event Handlers (Fluid dragging with velocity tracking & snap)
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      // Allow primary pointer (mouse left click or touch)
      if (e.button !== 0 && e.pointerType === "mouse") return;

      const clientX = e.clientX;
      const clientY = e.clientY;
      const now = performance.now();

      isDraggingRef.current = true;
      setIsDraggingState(true);
      velocityRef.current = 0;
      dragDistanceRef.current = 0;

      pointerStartRef.current = { x: clientX, y: clientY, time: now };
      pointerLastRef.current = { x: clientX, time: now };
      pointerHistoryRef.current = [{ time: now, x: clientX }];

      // Capture pointer so dragging outside the element continues smoothly
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // Fallback for browsers that don't support pointer capture on certain elements
      }

      wakeLoop();
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;

      const clientX = e.clientX;
      const now = performance.now();
      const deltaX = clientX - pointerLastRef.current.x;
      const dt = Math.max(1, now - pointerLastRef.current.time);

      pointerLastRef.current = { x: clientX, time: now };
      dragDistanceRef.current += Math.abs(deltaX);

      // Angle step based on drag sensitivity and cylinder perimeter
      const degPerPx = dragSensitivity * (360 / (2 * Math.PI * radius)) * 1.8;
      angleRef.current += deltaX * degPerPx;

      // Keep recent pointer history for velocity calculation
      pointerHistoryRef.current.push({ time: now, x: clientX });
      // Keep only samples from last 90ms
      const cutoff = now - 90;
      while (
        pointerHistoryRef.current.length > 2 &&
        pointerHistoryRef.current[0].time < cutoff
      ) {
        pointerHistoryRef.current.shift();
      }

      // Compute instantaneous velocity (degrees per frame)
      const instantVelocity = (deltaX / dt) * degPerPx * 16.67;
      // Exponential moving average for smooth release velocity
      velocityRef.current = velocityRef.current * 0.4 + instantVelocity * 0.6;

      wakeLoop();
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;

      isDraggingRef.current = false;
      setIsDraggingState(false);

      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }

      const now = performance.now();
      const totalDist = dragDistanceRef.current;
      const totalTime = now - pointerStartRef.current.time;

      // Threshold check: was this a gentle tap/click rather than a drag?
      const wasClick = totalDist < 6 && totalTime < 300;

      if (!wasClick && !isReducedMotion) {
        // Calculate release velocity over recent history
        const history = pointerHistoryRef.current;
        let releaseVelocity = velocityRef.current;

        if (history.length >= 2) {
          const first = history[0];
          const last = history[history.length - 1];
          const dt = Math.max(1, last.time - first.time);
          const dx = last.x - first.x;
          const degPerPx = dragSensitivity * (360 / (2 * Math.PI * radius)) * 1.8;
          releaseVelocity = (dx / dt) * degPerPx * 16.67;
        }

        // Clamp maximum spin speed to prevent disorienting rotations
        const maxVelocity = 14;
        releaseVelocity = Math.max(-maxVelocity, Math.min(maxVelocity, releaseVelocity));
        velocityRef.current = releaseVelocity;

        // Predict resting angle with momentum
        const projectedRest =
          angleRef.current + (releaseVelocity * 16.67) / (1 - friction);
        const nearestIndex = Math.round(-projectedRest / stepAngle);
        targetAngleRef.current = -nearestIndex * stepAngle;
      } else {
        // Just snap directly to nearest card
        const nearestIndex = Math.round(-angleRef.current / stepAngle);
        targetAngleRef.current = -nearestIndex * stepAngle;
        velocityRef.current = 0;
      }

      wakeLoop();
    };

    // Trackpad / Wheel Support
    const wheelTimerRef = useRef<NodeJS.Timeout | null>(null);
    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
      if (!enableWheel) return;

      // Pick horizontal delta if available (trackpads), or vertical delta (mouse wheel)
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 2) return;

      e.preventDefault();

      const degDelta = -delta * 0.08 * dragSensitivity;
      angleRef.current += degDelta;
      velocityRef.current = degDelta * 0.3;

      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => {
        const nearestIndex = Math.round(-angleRef.current / stepAngle);
        targetAngleRef.current = -nearestIndex * stepAngle;
        velocityRef.current = 0;
        wakeLoop();
      }, 120);

      wakeLoop();
    };

    // Keyboard Arrow Navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!enableKeyboard) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(N - 1);
      }
    };

    // Card Click Handler
    const handleCardClicked = (item: T, index: number, e: React.MouseEvent) => {
      if (dragDistanceRef.current > 6) {
        // Prevent click if user was dragging
        return;
      }

      const activeIdx = ((lastActiveIndexRef.current % N) + N) % N;
      if (index === activeIdx) {
        // Foreground card clicked -> trigger full item preview
        onCardClick?.(item, index);
      } else {
        // Background card clicked -> smoothly rotate it to the front
        e.stopPropagation();
        goTo(index);
      }
    };

    return (
      <div
        ref={containerRef}
        role="region"
        aria-label="3D Project Gallery Carousel"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        onMouseEnter={() => {
          isHoveredRef.current = true;
        }}
        onMouseLeave={() => {
          isHoveredRef.current = false;
        }}
        className={`relative w-full select-none outline-none overflow-hidden ${className}`}
        style={{
          perspective: `${perspective}px`,
          perspectiveOrigin: "50% 50%",
          minHeight: `${cardHeight + 160}px`,
        }}
      >
        {/* Performance & Physics Telemetry HUD */}
        {showPerformanceHUD && (
          <div className="absolute top-3 left-3 z-50 flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-xs font-mono text-slate-300 shadow-xl pointer-events-none">
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            <span className="flex items-center gap-1 font-semibold text-white">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  liveFps >= 55
                    ? "bg-emerald-400 animate-pulse"
                    : liveFps >= 30
                    ? "bg-amber-400"
                    : "bg-rose-400"
                }`}
              />
              {liveFps} FPS
            </span>
            <span className="text-slate-500">|</span>
            <span>rAF Direct DOM</span>
            <span className="text-slate-500">|</span>
            <span className="text-amber-400">Card {activeIndex + 1}/{N}</span>
          </div>
        )}

        {/* 3D Cylindrical Carousel Viewport & Track */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing transition-cursor ${
            isDraggingState ? "cursor-grabbing" : ""
          }`}
          style={{
            height: `${cardHeight + 100}px`,
            transformStyle: "preserve-3d",
          }}
        >
          {/* Rotating Cylinder Track (Directly mutated by rAF) */}
          <div
            ref={cylinderRef}
            className="relative"
            style={{
              width: `${cardWidth}px`,
              height: `${cardHeight}px`,
              transformStyle: "preserve-3d",
              willChange: "transform",
            }}
          >
            {items.map((item, index) => {
              const itemAngle = index * stepAngle;
              const isInitiallyActive = index === initialIndex;

              const cardRenderProps: CardRenderProps<T> = {
                item,
                index,
                isActive: index === activeIndex,
                angle: itemAngle,
                depthFactor: isInitiallyActive ? 1 : 0.5,
                onClick: () => onCardClick?.(item, index),
                onSelect: () => goTo(index),
              };

              return (
                <div
                  key={item.id || index}
                  ref={(el) => {
                    cardRefs.current[index] = el;
                  }}
                  onClick={(e) => handleCardClicked(item, index, e)}
                  role="group"
                  aria-label={`${item.title} (${index + 1} of ${N})`}
                  className="absolute top-0 left-0 rounded-2xl overflow-hidden shadow-2xl transition-shadow duration-300 group"
                  style={{
                    width: `${cardWidth}px`,
                    height: `${cardHeight}px`,
                    transform: `rotateY(${itemAngle}deg) translateZ(${radius}px)`,
                    transformStyle: "preserve-3d",
                    backfaceVisibility: "visible",
                    willChange: "transform, opacity, filter",
                  }}
                >
                  {renderCard ? (
                    renderCard(cardRenderProps)
                  ) : (
                    <DefaultProjectCard
                      item={item}
                      index={index}
                      isActive={index === activeIndex}
                      onExpand={() => onCardClick?.(item, index)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Ambient Ground Lighting / Reflection Glow */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 w-3/4 max-w-2xl h-12 bg-gradient-to-t from-amber-500/10 via-amber-500/5 to-transparent rounded-full blur-2xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Floating Glassmorphism Navigation Controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2 rounded-full bg-slate-900/80 hover:bg-slate-900/95 border border-slate-700/60 backdrop-blur-xl shadow-2xl transition-all duration-200">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous Project"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 active:scale-95 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Autoplay Play/Pause Toggle */}
          <button
            type="button"
            onClick={() => {
              if (isAutoPlaying) {
                isAutoPlayPausedRef.current = true;
                setIsAutoPlaying(false);
              } else {
                isAutoPlayPausedRef.current = false;
                setIsAutoPlaying(true);
                wakeLoop();
              }
            }}
            aria-label={isAutoPlaying ? "Pause autoplay" : "Start autoplay"}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-amber-400 bg-slate-800/80 hover:bg-slate-700 active:scale-95 transition-all"
          >
            {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5 px-2">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`transition-all duration-200 rounded-full ${
                  i === activeIndex
                    ? "w-6 h-2 bg-amber-400 shadow-sm shadow-amber-400/50"
                    : "w-2 h-2 bg-slate-600 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={next}
            aria-label="Next Project"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 active:scale-95 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }
);

/** Default Rich Project Card Renderer */
interface DefaultProjectCardProps {
  item: GalleryItem;
  index: number;
  isActive: boolean;
  onExpand: () => void;
}

function DefaultProjectCard({ item, index, isActive, onExpand }: DefaultProjectCardProps) {
  return (
    <div
      className={`relative w-full h-full bg-slate-900 border rounded-2xl flex flex-col justify-between overflow-hidden transition-all duration-200 ${
        isActive
          ? "border-amber-400/80 shadow-2xl shadow-amber-500/20 ring-1 ring-amber-400/50"
          : "border-slate-800 hover:border-slate-700 shadow-xl"
      }`}
    >
      {/* Top Banner Image with Gradient Overlay */}
      <div className="relative w-full h-[52%] overflow-hidden bg-black/60 group-hover:scale-105 transition-transform duration-500 ease-out">
        <img
          src={item.image}
          alt={item.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-black/40" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          {item.badge ? (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-amber-500 text-slate-950 shadow-md">
              {item.badge}
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-900/80 text-slate-300 border border-white/10 backdrop-blur-md">
              {item.category || "Project"}
            </span>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
            aria-label="Inspect project"
            className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white/90 hover:text-white border border-white/15 backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Location / Date Pill */}
        {item.location && (
          <div className="absolute bottom-2 left-3 z-10 text-[10px] text-slate-300 font-medium flex items-center gap-1 drop-shadow-md">
            <span>📍 {item.location}</span>
          </div>
        )}
      </div>

      {/* Card Content & Metadata */}
      <div className="p-4 flex-1 flex flex-col justify-between bg-slate-900 z-10">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-bold text-white text-base leading-snug line-clamp-1 group-hover:text-amber-400 transition-colors">
              {item.title}
            </h3>
          </div>

          <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 my-2">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-slate-800 text-slate-300 border border-slate-700/60"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer Metrics & Actions */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
          {item.metrics && item.metrics.length > 0 ? (
            <div className="flex items-center gap-3">
              {item.metrics.slice(0, 2).map((m) => (
                <div key={m.label} className="leading-tight">
                  <div className="text-[10px] text-slate-500 font-medium">{m.label}</div>
                  <div className="text-xs font-bold text-slate-200">{m.value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-slate-500">{item.date || "Active 2026"}</div>
          )}

          <div className="flex items-center gap-1.5">
            {item.github && (
              <a
                href={item.github}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-md text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-colors"
                aria-label="GitHub Repository"
              >
                <Github className="w-3.5 h-3.5" />
              </a>
            )}
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-md text-slate-400 hover:text-amber-400 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-colors"
                aria-label="Live Demo Link"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
