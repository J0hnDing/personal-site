import { useEffect, useRef, useState } from "react";

/** The accessible label stays stable while its visual counterpart decodes. */
export default function ScrambleText({
  text,
  motionOff = false,
}: {
  text: string;
  motionOff?: boolean;
}) {
  const [display, setDisplay] = useState(text);
  const timer = useRef(0);
  const stop = () => window.clearInterval(timer.current);
  useEffect(() => {
    stop();
    setDisplay(text);
    return stop;
  }, [text, motionOff]);
  const play = () => {
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
            : symbols[(i * 7 + frame * 3) % symbols.length],
        ).join(""),
      );
      if (frame > text.length * 1.4) {
        stop();
        setDisplay(text);
      }
    }, 28);
  };
  return (
    <span className="scramble-text" onMouseEnter={play} aria-label={text}>
      <span className="scramble-sizer" aria-hidden="true">
        {text}
      </span>
      <span aria-hidden="true">{display}</span>
    </span>
  );
}
