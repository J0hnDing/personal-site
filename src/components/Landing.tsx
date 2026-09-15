import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "motion/react";
import MathField from "./MathField";
import ScrambleText from "./ScrambleText";
import { profile } from "../content";
import "./landing.css";

const destinations = [
  {
    index: "01",
    title: "Projects",
    note: "Ideas, made real.",
    href: "/projects",
    symbol: "{ }",
  },
  {
    index: "02",
    title: "About",
    note: "The person behind the patterns.",
    href: "/about",
    symbol: "∴",
  },
  {
    index: "03",
    title: "Gallery",
    note: "A different way of seeing.",
    href: "/gallery",
    symbol: "⊙",
  },
  {
    index: "04",
    title: "Thoughts",
    note: "Questions without a full stop.",
    href: "/thoughts",
    symbol: "∑",
  },
];

const figures = [
  {
    label: "FIBERS OF S³",
    study: "HOPF FIBRATION / S³ → S²",
  },
  {
    label: "KNOTTED CONTINUITY",
    study: "(2,3) TORUS KNOT / t ∈ [0, 2π]",
  },
  {
    label: "ONE-SIDED CONTINUITY",
    study: "MÖBIUS WEAVE / u ∈ [0, 4π]",
  },
  {
    label: "POSSIBLE SINGULARITY",
    study: "NAVIER–STOKES / VORTEX STRETCHING",
  },
  {
    label: "DETERMINISTIC CHAOS",
    study: "LORENZ ATTRACTOR / σ = 10, ρ = 28, β = 8/3",
  },
] as const;

export default function Landing({ motionOff }: { motionOff: boolean }) {
  const [firstName, ...surname] = profile.name.split(" ");
  const section = useRef<HTMLElement>(null);
  const [figureIndex, setFigureIndex] = useState(0);
  const [identityHidden, setIdentityHidden] = useState(false);
  const activeFigureIndex = figureIndex % figures.length;
  const activeFigure = figures[activeFigureIndex] ?? figures[0];
  const nextFigure = figures[(figureIndex + 1) % figures.length] ?? figures[0];
  const { scrollYProgress: progress } = useScroll({
    target: section,
    offset: ["start start", "end end"],
  });
  const nameY = useTransform(progress, [0, 0.55], [0, -170]);
  // Function transforms keep these two phases on the same JS timeline as the
  // geometry, avoiding native ViewTimeline keyframe interpolation differences.
  const nameOpacity = useTransform(() =>
    Math.max(0, Math.min(1, (0.42 - progress.get()) / 0.2)),
  );
  const nameSpacing = useTransform(progress, [0, 0.6], ["-.08em", ".03em"]);
  const fieldX = useTransform(progress, [0, 0.8], ["0%", "-27%"]);
  const fieldScale = useTransform(progress, [0, 0.65, 1], [1, 1.4, 1.15]);
  const statementY = useTransform(progress, [0.35, 0.8], [130, 0]);
  const statementOpacity = useTransform(() =>
    Math.max(0, Math.min(1, (progress.get() - 0.46) / 0.23)),
  );
  useMotionValueEvent(progress, "change", (value) =>
    setIdentityHidden(value >= 0.42),
  );
  const lineScale = useTransform(progress, [0, 1], [0, 1]);
  return (
    <>
      <section
        ref={section}
        className={`math-landing ${motionOff ? "is-still" : ""}`}
      >
        <div className="landing-stage">
          <div className="landing-coordinates mono" aria-hidden="true">
            <span>PERSONAL SPACE / JD</span>
            <span>MATHEMATICS × COMPUTER SCIENCE</span>
          </div>
          <motion.div
            className="landing-field"
            style={motionOff ? undefined : { x: fieldX, scale: fieldScale }}
          >
            <MathField
              progress={progress}
              figure={figureIndex}
              motionOff={motionOff}
            />
          </motion.div>
          <div className="field-annotation mono">
            <span aria-live="polite">
              FIG. {String(activeFigureIndex + 1).padStart(2, "0")} —{" "}
              {activeFigure.label}
            </span>
            <span>{activeFigure.study}</span>
            <button
              className="form-control"
              aria-label={`Show next figure: ${nextFigure.label.toLowerCase()}`}
              onClick={() => setFigureIndex((value) => value + 1)}
            >
              NEXT FIG <span aria-hidden="true">→</span>
            </button>
          </div>
          <motion.div
            className="landing-identity"
            style={
              motionOff
                ? undefined
                : { y: nameY, opacity: nameOpacity, letterSpacing: nameSpacing }
            }
          >
            <span className="identity-eyebrow mono">A WORK IN CURIOSITY</span>
            <h1 aria-label={profile.name}>
              <span aria-hidden="true">{firstName.toUpperCase()}</span>
              <span aria-hidden="true" className="surname">
                {surname.join(" ").toUpperCase()}
                <span className="name-period">.</span>
              </span>
            </h1>
            <div className="landing-tagline">
              <p>
                {profile.tagline.lead}
                <br />
                <em>{profile.tagline.emphasis}</em>
              </p>
              <Link
                className="landing-about mono"
                to="/about"
                tabIndex={!motionOff && identityHidden ? -1 : 0}
                style={{
                  pointerEvents: !motionOff && identityHidden ? "none" : "auto",
                }}
              >
                <ScrambleText text="ABOUT ME" motionOff={motionOff} />
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </motion.div>
          {!motionOff && (
            <motion.div
              className="landing-statement"
              style={{ y: statementY, opacity: statementOpacity }}
              aria-hidden="true"
            >
              <span className="mono">A DIFFERENT PERSPECTIVE</span>
              <p>
                Between logic
                <br />
                <em>& possibility.</em>
              </p>
            </motion.div>
          )}
          <div className="landing-baseline mono">
            <a href="#explore">
              SCROLL TO UNFOLD <span aria-hidden="true">↓</span>
            </a>
            <span className="landing-interaction-hint">
              MOVE YOUR CURSOR. CHANGE YOUR PERSPECTIVE.
            </span>
            <span aria-hidden="true">( ∞ )</span>
            <motion.div
              className="landing-progress"
              style={{ scaleX: motionOff ? 1 : lineScale }}
            />
          </div>
        </div>
      </section>
      <section className="destination-index" id="explore">
        <div className="destination-heading">
          <span className="mono">EXPLORE / THE INDEX</span>
          <h2>
            A few paths.
            <br />
            <em>Infinite tangents.</em>
          </h2>
          <span className="index-symbol" aria-hidden="true">
            ↳
          </span>
        </div>
        <div className="destination-list">
          {destinations.map((item, i) => (
            <motion.div
              key={item.href}
              initial={motionOff ? false : { opacity: 0, y: 65 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: motionOff ? 0 : 0.7,
                delay: i * 0.035,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <Link className="destination" to={item.href}>
                <span className="destination-number mono">/{item.index}</span>
                <span className="destination-title">
                  <ScrambleText text={item.title} motionOff={motionOff} />
                </span>
                <span className="destination-note">{item.note}</span>
                <span className="destination-symbol" aria-hidden="true">
                  {item.symbol}
                </span>
                <span className="destination-arrow" aria-hidden="true">
                  ↗
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
        <Link className="landing-contact" to="/contact">
          <span className="mono">HAVE SOMETHING IN MIND?</span>
          <span>
            Let’s connect.<span aria-hidden="true"> ↗</span>
          </span>
        </Link>
      </section>
    </>
  );
}
