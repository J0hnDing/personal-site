import {
  createElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

type TextTag =
  "h1" | "h2" | "h3" | "p" | "blockquote" | "figcaption" | "span" | "li";

interface LineRevealTextProps {
  as?: TextTag;
  text: string;
  motionOff: boolean;
  className?: string;
  startIndex?: number;
}

type Insets = [top: number, right: number, bottom: number, left: number];

function sameInsets(previous: Insets, next: Insets) {
  return previous.every((value, index) => value === next[index]);
}

function sameLines(previous: string[], next: string[]) {
  return (
    previous.length === next.length &&
    previous.every((line, index) => line === next[index])
  );
}

export default function LineRevealText({
  as = "p",
  text,
  motionOff,
  className = "",
  startIndex = 0,
}: LineRevealTextProps) {
  const rootRef = useRef<HTMLElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [insets, setInsets] = useState<Insets>([0, 0, 0, 0]);
  const [revealed, setRevealed] = useState(false);

  useLayoutEffect(() => {
    const measure = measureRef.current;
    if (!measure || motionOff) return;
    let active = true;

    const updateLines = () => {
      if (!active) return;
      const textNode = measure.firstChild;
      if (!(textNode instanceof Text)) return;
      const root = rootRef.current;
      if (!root) return;
      const style = getComputedStyle(root);
      const nextInsets: Insets = [
        parseFloat(style.paddingTop) + parseFloat(style.borderTopWidth),
        parseFloat(style.paddingRight) + parseFloat(style.borderRightWidth),
        parseFloat(style.paddingBottom) + parseFloat(style.borderBottomWidth),
        parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth),
      ];
      setInsets((previous) =>
        sameInsets(previous, nextInsets) ? previous : nextInsets,
      );

      const nextLines: string[] = [];
      let currentTop: number | null = null;
      let currentLine = "";
      const range = document.createRange();

      for (let index = 0; index < textNode.length; index += 1) {
        range.setStart(textNode, index);
        range.setEnd(textNode, index + 1);
        const character = textNode.data[index];
        const top = range.getBoundingClientRect().top;

        if (currentTop === null) {
          currentTop = top;
          currentLine = character;
        } else if (Math.abs(top - currentTop) > 1) {
          if (currentLine.trim()) nextLines.push(currentLine.trim());
          currentLine = character.trimStart();
          currentTop = top;
        } else {
          currentLine += character;
        }
      }
      if (currentLine.trim()) nextLines.push(currentLine.trim());
      range.detach();

      setLines((previous) =>
        sameLines(previous, nextLines) ? previous : nextLines,
      );
    };

    updateLines();
    const resizeObserver = new ResizeObserver(updateLines);
    if (rootRef.current) resizeObserver.observe(rootRef.current);
    void document.fonts.ready.then(updateLines);

    return () => {
      active = false;
      resizeObserver.disconnect();
    };
  }, [motionOff, text]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || motionOff) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setRevealed(true);
        observer.disconnect();
      },
      { threshold: 0, rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(root);

    return () => observer.disconnect();
  }, [motionOff]);

  if (motionOff) return createElement(as, { className }, text);

  return createElement(
    as,
    {
      className: `line-reveal${revealed ? " is-revealed" : ""}${className ? ` ${className}` : ""}`,
      "data-line-reveal": true,
      ref: rootRef,
    },
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="line-reveal-measure" ref={measureRef}>
        {text}
      </span>
      <span
        aria-hidden="true"
        className="line-reveal-lines"
        style={{
          top: insets[0],
          right: insets[1],
          bottom: insets[2],
          left: insets[3],
        }}
      >
        {(lines.length ? lines : [text]).map((line, index) => (
          <span className="line-reveal-mask" key={`${line}-${index}`}>
            <span
              className="line-reveal-line"
              style={{ "--line-index": index + startIndex } as CSSProperties}
            >
              {line}
            </span>
          </span>
        ))}
      </span>
    </>,
  );
}
