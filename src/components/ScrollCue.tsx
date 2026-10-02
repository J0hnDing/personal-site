import { motion, type MotionValue } from "motion/react";

export default function ScrollCue({
  motionOff,
  opacity,
}: {
  motionOff: boolean;
  opacity?: MotionValue<number>;
}) {
  return (
    <motion.div
      className={`scroll-cue${motionOff ? " is-still" : ""}`}
      style={!motionOff && opacity ? { opacity } : undefined}
      aria-hidden="true"
    >
      <span />
    </motion.div>
  );
}
