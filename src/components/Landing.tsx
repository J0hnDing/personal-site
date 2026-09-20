import { useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import MathField from "./MathField";
import ScrambleText from "./ScrambleText";
import { profile } from "../content";
import "./landing.css";

const roles = [
  { label: "a student", icon: "book" },
  { label: "a thinker", icon: "thought" },
  { label: "a photographer", icon: "camera" },
  { label: "a software developer", icon: "code" },
] as const;

const nameRevealDuration = 1.15;
const firstNameDelay = 1.35;
const surnameDelay = 2.55;
const supportingRevealDelay = surnameDelay + nameRevealDuration + 0.6;

type RoleIconKind = (typeof roles)[number]["icon"];

function RoleIcon({ kind }: { kind: RoleIconKind }) {
  if (kind === "book") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.5 5.25h4.25A3.25 3.25 0 0 1 12 8.5v10.25a3.25 3.25 0 0 0-3.25-3.25H4.5V5.25Z" />
        <path d="M19.5 5.25h-4.25A3.25 3.25 0 0 0 12 8.5v10.25a3.25 3.25 0 0 1 3.25-3.25h4.25V5.25Z" />
      </svg>
    );
  }

  if (kind === "code") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m8.75 7.25-4.5 4.75 4.5 4.75M15.25 7.25l4.5 4.75-4.5 4.75M13.75 4.75l-3.5 14.5" />
      </svg>
    );
  }

  if (kind === "camera") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.25 8.25h3l1.5-2.5h6.5l1.5 2.5h3v10H4.25v-10Z" />
        <circle cx="12" cy="13" r="3.25" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.25 16.25A7 7 0 1 1 18 14.75l1.25 3-3.5-1A7 7 0 0 1 6.25 16.25Z" />
      <path d="M9 11.75h6M12 8.75v6" />
    </svg>
  );
}

const figures = [
  { label: "FIBERS OF S³", study: "HOPF FIBRATION / S³ → S²" },
  { label: "KNOTTED CONTINUITY", study: "(2,3) TORUS KNOT / t ∈ [0, 2π]" },
  { label: "ONE-SIDED CONTINUITY", study: "MÖBIUS WEAVE / u ∈ [0, 4π]" },
  { label: "POSSIBLE SINGULARITY", study: "NAVIER–STOKES / VORTEX STRETCHING" },
  {
    label: "DETERMINISTIC CHAOS",
    study: "LORENZ ATTRACTOR / σ = 10, ρ = 28, β = 8/3",
  },
] as const;

function RoleLine({
  label,
  icon,
  progress,
  range,
  motionOff,
}: {
  label: string;
  icon: RoleIconKind;
  progress: MotionValue<number>;
  range: readonly [number, number];
  motionOff: boolean;
}) {
  const amount = useTransform(() =>
    Math.max(
      0,
      Math.min(1, (progress.get() - range[0]) / (range[1] - range[0])),
    ),
  );
  const y = useTransform(amount, [0, 1], ["110%", "0%"]);

  return (
    <div className="landing-role-mask">
      <motion.p
        style={motionOff ? { y: 0, opacity: 1 } : { y, opacity: amount }}
      >
        <span>{label}</span>
        <RoleIcon kind={icon} />
      </motion.p>
    </div>
  );
}

export default function Landing({
  motionOff,
  ready = true,
}: {
  motionOff: boolean;
  ready?: boolean;
}) {
  const [firstName, ...surname] = profile.name.split(" ");
  const surnameText = surname.join(" ").toLowerCase();
  const displayFirstName = `${firstName.charAt(0).toUpperCase()}${firstName.slice(1).toLowerCase()}`;
  const displaySurname = `${surnameText.slice(0, -1)}${surnameText.slice(-1).toUpperCase()}`;
  const section = useRef<HTMLElement>(null);
  const [figureIndex, setFigureIndex] = useState(0);
  const activeFigureIndex = figureIndex % figures.length;
  const activeFigure = figures[activeFigureIndex];
  const nextFigure =
    figures[(activeFigureIndex + 1) % figures.length] ?? figures[0];
  const { scrollYProgress } = useScroll({
    target: section,
    offset: ["start start", "end end"],
  });
  const scrollCueOpacity = useTransform(
    scrollYProgress,
    [0, 0.08, 0.18],
    [1, 1, 0],
  );

  return (
    <section
      ref={section}
      id="home"
      data-scroll-snap
      className={`math-landing${motionOff ? " is-still" : ""}`}
    >
      <div className="landing-stage">
        <motion.div
          className="landing-field"
          initial={motionOff ? false : { opacity: 0 }}
          animate={{ opacity: ready ? 1 : 0 }}
          transition={{
            duration: motionOff ? 0 : 1.25,
            delay: motionOff ? 0 : supportingRevealDelay,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <MathField
            progress={scrollYProgress}
            figure={figureIndex}
            motionOff={motionOff}
          />
        </motion.div>

        <div className="landing-identity">
          <div className="landing-name-mask">
            <h1 className="landing-name" aria-label={profile.name}>
              <span className="landing-name-line">
                <motion.span
                  aria-hidden="true"
                  initial={motionOff ? false : { y: "112%" }}
                  animate={{ y: ready ? "0%" : "112%" }}
                  transition={{
                    duration: motionOff ? 0 : nameRevealDuration,
                    delay: motionOff ? 0 : firstNameDelay,
                    ease: [0.12, 0.95, 0.18, 1],
                  }}
                >
                  {displayFirstName}
                </motion.span>
              </span>
              <span className="landing-name-line">
                <motion.span
                  aria-hidden="true"
                  initial={motionOff ? false : { y: "112%" }}
                  animate={{ y: ready ? "0%" : "112%" }}
                  transition={{
                    duration: motionOff ? 0 : nameRevealDuration,
                    delay: motionOff ? 0 : surnameDelay,
                    ease: [0.12, 0.95, 0.18, 1],
                  }}
                >
                  {displaySurname}
                </motion.span>
              </span>
            </h1>
          </div>

          <div className="landing-roles" aria-label="Roles">
            {roles.map((role, index) => {
              const start = 0.1 + index * 0.16;
              return (
                <RoleLine
                  key={role.label}
                  label={role.label}
                  icon={role.icon}
                  progress={scrollYProgress}
                  range={[start, start + 0.105]}
                  motionOff={motionOff}
                />
              );
            })}
          </div>
        </div>

        <motion.div
          className="landing-figure-control mono"
          initial={motionOff ? false : { opacity: 0 }}
          animate={{ opacity: ready ? 1 : 0 }}
          transition={{
            duration: motionOff ? 0 : 0.8,
            delay: motionOff ? 0 : supportingRevealDelay,
          }}
        >
          <div
            className="figure-metadata"
            aria-live="polite"
            aria-atomic="true"
          >
            <span>
              FIG. {String(activeFigureIndex + 1).padStart(2, "0")} —{" "}
              {activeFigure.label}
            </span>
            <span>{activeFigure.study}</span>
          </div>
          <button
            type="button"
            onClick={() => setFigureIndex((value) => value + 1)}
            aria-label={`Show next figure: ${nextFigure.label.toLowerCase()}`}
          >
            <ScrambleText text="Next fig" motionOff={motionOff} />{" "}
            <span aria-hidden="true">→</span>
          </button>
        </motion.div>

        <motion.div
          className="landing-scroll-cue"
          style={motionOff ? undefined : { opacity: scrollCueOpacity }}
          aria-hidden="true"
        >
          <span />
        </motion.div>
      </div>
    </section>
  );
}
