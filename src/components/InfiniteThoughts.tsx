import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Link } from "react-router-dom";
import { thoughts } from "../content";
import FloatingDust from "./FloatingDust";
import { ThoughtWorld, limitThoughtVelocity } from "./thoughtGeometry";
import { ThoughtCamera, edgePanSpeed, stepThoughtScene } from "./thoughtCamera";
import { prepareWordmarkIntro } from "./wordmarkIntro";

const scales = [
  1.12, 1, 1.2, 0.92, 0.88, 1.08, 1, 0.94, 1.12, 0.86, 0.94, 1.04,
];

export default function InfiniteThoughts({
  motionOff,
}: {
  motionOff: boolean;
}) {
  const [phase, setPhase] = useState<"waiting" | "intro" | "canvas">(
    motionOff ? "canvas" : "waiting",
  );
  const [introStarted, setIntroStarted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef(new Map<string, HTMLAnchorElement>());
  const worldRef = useRef<ThoughtWorld | null>(null);
  const cameraRef = useRef(new ThoughtCamera());
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const hoveredRef = useRef<string | null>(null);
  const focusedRef = useRef<string | null>(null);
  const releasedRef = useRef<string | null>(null);
  const paintRef = useRef<() => void>(() => undefined);
  const dragRef = useRef<{
    id: number;
    thought: string | null;
    x: number;
    y: number;
    startX: number;
    startY: number;
    moved: boolean;
    time: number;
    velocityX: number;
    velocityY: number;
  } | null>(null);
  const suppressClickRef = useRef(false);

  // Match Gallery's 950ms gentle title growth and enlarged watermark reveal.
  useEffect(() => {
    if (motionOff) {
      setIntroStarted(false);
      setPhase("canvas");
      return;
    }
    if (phase === "canvas") return;
    if (phase === "waiting") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      // Sticky Home chapters can become fully visible without the observer
      // crossing another threshold. Check their rendered position as well.
      let frame = 0;
      const check = () => {
        frame = 0;
        const rect = canvas.getBoundingClientRect();
        const visibleHeight =
          Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
        const center = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        );
        if (visibleHeight >= rect.height * 0.9 && canvas.contains(center))
          setPhase("intro");
      };
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(check);
      };
      const observer = new IntersectionObserver(schedule, {
        threshold: [0, 0.9],
      });
      observer.observe(canvas);
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);
      schedule();
      return () => {
        observer.disconnect();
        cancelAnimationFrame(frame);
        window.removeEventListener("scroll", schedule);
        window.removeEventListener("resize", schedule);
      };
    }
    prepareWordmarkIntro(canvasRef.current);
    setIntroStarted(true);
    const timer = window.setTimeout(() => setPhase("canvas"), 950);
    return () => window.clearTimeout(timer);
  }, [phase, motionOff]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let alive = true;
    const paint = () => {
      const world = worldRef.current;
      if (!world) return;
      const camera = cameraRef.current;
      for (const position of world.positions(camera.x, camera.y)) {
        const link = linksRef.current.get(position.id);
        if (link) {
          link.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
        }
      }
    };
    paintRef.current = paint;
    const measure = () => {
      const plane = planeRef.current;
      if (!alive || !plane?.clientWidth || !plane.clientHeight) return;
      const sizes = thoughts.map((thought) => {
        const rect = linksRef.current
          .get(thought.slug)!
          .getBoundingClientRect();
        return {
          id: thought.slug,
          width: rect.width,
          height: rect.height,
          textLength: Array.from(thought.title).length,
        };
      });
      worldRef.current = new ThoughtWorld(
        sizes,
        plane.clientWidth,
        plane.clientHeight,
      );
      // Start near a random question so even a narrow viewport has readable
      // text immediately, while retaining the randomly scattered world.
      const anchor =
        worldRef.current.bodies[Math.floor(Math.random() * thoughts.length)];
      Object.assign(cameraRef.current, {
        x:
          anchor.x +
          anchor.width / 2 +
          (plane.clientWidth - anchor.width) * (Math.random() - 0.5) * 0.4,
        y:
          anchor.y +
          anchor.height / 2 +
          (plane.clientHeight - anchor.height) * (Math.random() - 0.5) * 0.4,
      });
      cameraRef.current.stop();
      paint();
    };
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    measure();
    void document.fonts.ready.then(() => {
      if (alive) measure();
    });
    return () => {
      alive = false;
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || phase !== "canvas" || motionOff) return;
    let frame = 0;
    let previous = 0;
    let visible = false;
    let uncovered = false;
    let lastVisibilityCheck = 0;
    const tick = (time: number) => {
      frame = 0;
      if (!visible || document.hidden) {
        cameraRef.current.stop();
        pointerRef.current = null;
        canvas.dataset.active = "false";
        previous = 0;
        return;
      }
      if (time - lastVisibilityCheck > 200) {
        const rect = canvas.getBoundingClientRect();
        uncovered = !!canvas.contains(
          document.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
          ),
        );
        lastVisibilityCheck = time;
      }
      const world = worldRef.current;
      canvas.dataset.active = String(uncovered);
      if (world && uncovered) {
        const seconds = previous
          ? Math.min(0.032, (time - previous) / 1000)
          : 0;
        const camera = cameraRef.current;
        const drag = dragRef.current;
        const draggingNow = !!drag && !drag.thought;
        if (!draggingNow) {
          const pointer = pointerRef.current;
          const bounds = canvas.getBoundingClientRect();
          stepThoughtScene(
            world,
            camera,
            seconds,
            drag?.thought
              ? [drag.thought]
              : [
                  hoveredRef.current === releasedRef.current
                    ? null
                    : hoveredRef.current,
                  focusedRef.current,
                ],
            pointer ? edgePanSpeed(pointer.x - bounds.left, bounds.width) : 0,
            pointer ? edgePanSpeed(pointer.y - bounds.top, bounds.height) : 0,
          );
        } else {
          camera.stop();
          for (const body of world.bodies) body.fixed = false;
          world.step(seconds);
        }
        paintRef.current();
      } else {
        cameraRef.current.stop();
        pointerRef.current = null;
      }
      previous = time;
      frame = requestAnimationFrame(tick);
    };
    const resume = () => {
      if (visible && !document.hidden && !frame)
        frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (!visible) {
        cameraRef.current.stop();
        pointerRef.current = null;
        canvas.dataset.active = "false";
        cancelAnimationFrame(frame);
        frame = 0;
        previous = 0;
      }
      resume();
    });
    observer.observe(canvas);
    const visibility = () => {
      if (document.hidden) {
        cameraRef.current.stop();
        pointerRef.current = null;
        canvas.dataset.active = "false";
        cancelAnimationFrame(frame);
        frame = 0;
        previous = 0;
      } else resume();
    };
    document.addEventListener("visibilitychange", visibility);
    const blur = () => {
      cameraRef.current.stop();
      pointerRef.current = null;
      dragRef.current = null;
      setDragging(false);
    };
    window.addEventListener("blur", blur);
    return () => {
      cancelAnimationFrame(frame);
      cameraRef.current.stop();
      pointerRef.current = null;
      canvas.dataset.active = "false";
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", blur);
    };
  }, [phase, motionOff]);

  const pan = (x: number, y: number) => {
    cameraRef.current.x += x;
    cameraRef.current.y += y;
    paintRef.current();
  };
  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (phase !== "canvas" || !event.isPrimary || event.button !== 0) return;
    suppressClickRef.current = false;
    releasedRef.current = null;
    const thought =
      (event.target as HTMLElement).closest<HTMLElement>(".floating-thought")
        ?.dataset.thought ?? null;
    if (!thought) cameraRef.current.stop();
    else {
      const body = worldRef.current?.bodies.find((body) => body.id === thought);
      if (body) body.fixed = true;
    }
    dragRef.current = {
      id: event.pointerId,
      thought,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      time: event.timeStamp,
      velocityX: 0,
      velocityY: 0,
    };
  };
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse")
      pointerRef.current = { x: event.clientX, y: event.clientY };
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    if (
      !drag.moved &&
      Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6
    )
      return;
    if (!drag.moved) {
      drag.moved = true;
      suppressClickRef.current = true;
      hoveredRef.current = null;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.focus({ preventScroll: true });
      setDragging(true);
    }
    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    const elapsed = Math.max(drag.thought ? 8 : 1, event.timeStamp - drag.time);
    const follow = 1 - Math.exp(-elapsed / 48);
    const velocity = drag.thought
      ? limitThoughtVelocity(
          (deltaX / elapsed) * 1000,
          (deltaY / elapsed) * 1000,
        )
      : { vx: (-deltaX / elapsed) * 1000, vy: (-deltaY / elapsed) * 1000 };
    drag.velocityX += (velocity.vx - drag.velocityX) * follow;
    drag.velocityY += (velocity.vy - drag.velocityY) * follow;
    if (drag.thought) {
      worldRef.current?.moveBody(drag.thought, deltaX, deltaY, elapsed / 1000);
      paintRef.current();
    } else {
      pan(-deltaX, -deltaY);
    }
    drag.x = event.clientX;
    drag.y = event.clientY;
    drag.time = event.timeStamp;
  };
  const pointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag?.id !== event.pointerId) return;
    if (
      event.type === "pointerup" &&
      drag.moved &&
      !motionOff &&
      event.timeStamp - drag.time < 100
    ) {
      if (drag.thought) {
        worldRef.current?.releaseBody(
          drag.thought,
          drag.velocityX,
          drag.velocityY,
        );
        releasedRef.current = drag.thought;
      } else cameraRef.current.release(drag.velocityX, drag.velocityY);
    } else if (!drag.thought) cameraRef.current.stop();
    dragRef.current = null;
    setDragging(false);
    if (event.pointerType === "mouse") {
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>(".floating-thought");
      hoveredRef.current = target?.dataset.thought ?? null;
      if (hoveredRef.current !== releasedRef.current)
        releasedRef.current = null;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      ref={canvasRef}
      className={`infinite-thoughts${dragging ? " is-dragging" : ""}${motionOff ? " is-still" : ""}`}
      data-phase={phase}
      data-lenis-prevent-touch=""
      aria-label="Infinite thought index. Drag empty space to explore, or drag a question to move it. Focus the canvas and use arrow keys. Tab to a question and press Enter to read it."
      tabIndex={0}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerEnd}
      onPointerCancel={pointerEnd}
      onLostPointerCapture={() => {
        if (dragRef.current && !dragRef.current.thought)
          cameraRef.current.stop();
        dragRef.current = null;
        setDragging(false);
      }}
      onPointerLeave={() => {
        pointerRef.current = null;
        releasedRef.current = null;
        if (!dragRef.current?.moved) dragRef.current = null;
      }}
      onClickCapture={(event) => {
        if (suppressClickRef.current && event.detail !== 0) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || phase !== "canvas") return;
        const directions: Record<string, [number, number]> = {
          ArrowLeft: [-100, 0],
          ArrowRight: [100, 0],
          ArrowUp: [0, -100],
          ArrowDown: [0, 100],
        };
        const direction = directions[event.key];
        if (direction) {
          event.preventDefault();
          cameraRef.current.stop();
          pan(...direction);
        }
      }}
    >
      <FloatingDust className="thoughts-dust" motionOff={motionOff} />
      <div
        className={`thoughts-wordmark gallery-wordmark${phase === "canvas" ? " is-watermark" : " is-opening"}${introStarted && !motionOff ? " is-enlarging" : ""}`}
        aria-hidden="true"
      >
        Thoughts
      </div>
      <div ref={planeRef} className="thoughts-world" inert={phase !== "canvas"}>
        {thoughts.map((thought, index) => (
          <Link
            key={thought.slug}
            ref={(link) => {
              if (link) linksRef.current.set(thought.slug, link);
              else linksRef.current.delete(thought.slug);
            }}
            className="floating-thought"
            data-thought={thought.slug}
            style={
              {
                "--thought-scale": scales[index % scales.length],
              } as CSSProperties
            }
            to={`/thoughts/${thought.slug}`}
            draggable={false}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse" && !dragging)
                hoveredRef.current = thought.slug;
            }}
            onPointerLeave={() => {
              if (releasedRef.current === thought.slug)
                releasedRef.current = null;
              if (hoveredRef.current === thought.slug)
                hoveredRef.current = null;
            }}
            onFocus={() => {
              releasedRef.current = null;
              focusedRef.current = thought.slug;
              if (dragRef.current?.thought) return;
              const world = worldRef.current;
              const canvas = planeRef.current;
              const position = world
                ?.positions(cameraRef.current.x, cameraRef.current.y)
                .find((item) => item.id === thought.slug);
              const body = world?.bodies.find(
                (item) => item.id === thought.slug,
              );
              if (!canvas || !position || !body) return;
              if (
                position.x < 16 ||
                position.y < 16 ||
                position.x + body.width > canvas.clientWidth - 16 ||
                position.y + body.height > canvas.clientHeight - 16
              ) {
                pan(
                  position.x + body.width / 2 - canvas.clientWidth / 2,
                  position.y + body.height / 2 - canvas.clientHeight / 2,
                );
              }
            }}
            onBlur={() => {
              if (focusedRef.current === thought.slug)
                focusedRef.current = null;
            }}
          >
            {thought.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
