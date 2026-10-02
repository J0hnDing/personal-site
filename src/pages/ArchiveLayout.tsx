import { Link } from "react-router-dom";
import LineRevealText from "../components/LineRevealText";
import ScrambleText from "../components/ScrambleText";

export function ArchiveHeading({
  title,
  intro,
  eyebrow,
  motionOff,
}: {
  title: string;
  intro?: string;
  eyebrow?: string;
  motionOff: boolean;
}) {
  return (
    <header className="archive-heading">
      {eyebrow && <span className="archive-eyebrow mono">{eyebrow}</span>}
      <LineRevealText as="h1" text={title} motionOff={motionOff} />
      {intro && <LineRevealText text={intro} motionOff={motionOff} />}
    </header>
  );
}

export function ArchiveRow({
  to,
  title,
  meta,
  index,
  motionOff,
}: {
  to: string;
  title: string;
  meta?: string;
  index?: string;
  motionOff: boolean;
}) {
  return (
    <li>
      <Link to={to} className="archive-row">
        {index && <span className="archive-row-index mono">{index}</span>}
        <div className="archive-row-copy">
          <h2>
            <ScrambleText text={title} motionOff={motionOff} />
          </h2>
          {meta && <span className="archive-row-meta">{meta}</span>}
        </div>
        <span className="archive-row-arrow" aria-hidden="true">
          ↗
        </span>
      </Link>
    </li>
  );
}
