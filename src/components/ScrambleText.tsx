import { useCallback, useEffect, useRef, useState } from "react";

/** The accessible label stays stable while its visual counterpart decodes. */
export default function ScrambleText({
  text,
  motionOff = false,
}: {
  text: string;
  motionOff?: boolean;
}) {
  const root = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(text);
  const timer = useRef(0);
  const stop = useCallback(() => window.clearInterval(timer.current), []);
  useEffect(() => {
    stop();
    setDisplay(text);
    return stop;
  }, [text, motionOff]);
  const play = useCallback(() => {
    if (motionOff) return;
    stop();
    let frame = 0;
    const symbols = "01<>/{}[]+*";
    timer.current = window.setInterval(() => {
      frame++;
      setDisplay(
        Array.from(text, (character, i) =>
          character === " " || i < frame / 1.4
            ? character
            : symbols[Math.floor(Math.random() * symbols.length)],
        ).join(""),
      );
      if (frame > text.length * 1.4) {
        stop();
        setDisplay(text);
      }
    }, 28);
  }, [motionOff, stop, text]);
  useEffect(() => {
    const element = root.current;
    const control = element?.closest<HTMLElement>("a, button");
    if (!control) return;
    control.addEventListener("pointerenter", play);
    control.addEventListener("focus", play);
    return () => {
      control.removeEventListener("pointerenter", play);
      control.removeEventListener("focus", play);
    };
  }, [play]);
  return (
    <span ref={root} className="scramble-text" aria-label={text}>
      <span className="scramble-sizer" aria-hidden="true">
        {text}
      </span>
      <span aria-hidden="true">{display}</span>
    </span>
  );
}
