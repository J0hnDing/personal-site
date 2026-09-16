import { useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import MathField from "./MathField";
import { profile } from "../content";
import "./landing.css";

const roles = [
  "A Student",
  "A Software Developer",
  "A Photographer",
  "A Thinker",
] as const;

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
  children,
  progress,
  range,
  motionOff,
}: {
  children: string;
  progress: MotionValue<number>;
  range: readonly [number, number];
  motionOff: boolean;
}) {
  // Derive both properties from one sampled amount so browser-native scroll
  // interpolation cannot let opacity run ahead of the masked rise.
  const amount = useTransform(() =>
    Math.max(
      0,
      Math.min(1, (progress.get() - range[0]) / (range[1] - range[0])),
    ),
  );
  const y = useTransform(amount, [0, 1], ["110%", "0%"]);

  return (
    <div className="landing-role-mask">
      <motion.p style={motionOff ? undefined : { y, opacity: amount }}>
        {children}
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
  const nameLift = useTransform(scrollYProgress, [0, 0.72], ["0vh", "-5vh"]);

  return (
    <section
      ref={section}
      id="home"
      className={`math-landing${motionOff ? " is-still" : ""}`}
    >
      <div className="landing-stage">
        <motion.div
          className="landing-field"
          initial={motionOff ? false : { opacity: 0 }}
          animate={{ opacity: ready ? 1 : 0 }}
          transition={{
            duration: motionOff ? 0 : 1.5,
            delay: motionOff ? 0 : 0.18,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <MathField
            progress={scrollYProgress}
            figure={figureIndex}
            motionOff={motionOff}
          />
        </motion.div>

        <motion.div
          className="landing-identity"
          style={motionOff ? undefined : { y: nameLift }}
          initial={motionOff ? false : { opacity: 0 }}
          animate={{ opacity: ready ? 1 : 0 }}
          transition={{ duration: motionOff ? 0 : 0.35 }}
        >
          <div className="landing-name-mask">
            <motion.h1
              className="landing-name"
              aria-label={profile.name}
              initial={motionOff ? false : { y: "112%" }}
              animate={{ y: ready ? "0%" : "112%" }}
              transition={{
                duration: motionOff ? 0 : 1.15,
                delay: motionOff ? 0 : 0.06,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <span aria-hidden="true">{firstName.toUpperCase()}</span>
              <span className="surname" aria-hidden="true">
                {surname.join(" ").toUpperCase()}
                <span className="name-period">.</span>
              </span>
            </motion.h1>
          </div>

          <motion.div
            className="landing-roles"
            initial={false}
            animate={{ opacity: ready ? 1 : 0 }}
            transition={{ duration: motionOff ? 0 : 0.4 }}
            aria-label="Roles"
          >
            {roles.map((role, index) => {
              const start = 0.1 + index * 0.16;
              return (
                <RoleLine
                  key={role}
                  progress={scrollYProgress}
                  range={[start, start + 0.105]}
                  motionOff={motionOff}
                >
                  {role}
                </RoleLine>
              );
            })}
          </motion.div>
        </motion.div>

        <motion.div
          className="landing-figure-control mono"
          initial={motionOff ? false : { opacity: 0 }}
          animate={{ opacity: ready ? 1 : 0 }}
          transition={{
            duration: motionOff ? 0 : 0.7,
            delay: motionOff ? 0 : 0.5,
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
            Next fig <span aria-hidden="true">→</span>
          </button>
        </motion.div>
      </div>
    </section>
  );
}
