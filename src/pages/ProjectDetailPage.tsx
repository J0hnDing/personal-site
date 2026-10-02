import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { Project, ProjectImage } from "../content";
import ScrambleText from "../components/ScrambleText";
import "./project-detail.css";

function imageSource(src: string) {
  return /^(https?:|data:|blob:)/.test(src)
    ? src
    : `${import.meta.env.BASE_URL}${src.replace(/^\/+/, "")}`;
}

export default function ProjectDetailContent({
  project,
  next,
  motionOff,
}: {
  project: Project;
  next: Project;
  motionOff: boolean;
}) {
  const [selectedStep, setSelectedStep] = useState(0);
  const [expandedImage, setExpandedImage] = useState<ProjectImage | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const imageTrigger = useRef<HTMLButtonElement | null>(null);
  const captionId = useId();
  const stepPanelId = useId();
  const steps = project.flow?.steps ?? [];
  const currentStep = steps[Math.min(selectedStep, steps.length - 1)];
  const conceptSteps =
    steps.length > 2
      ? [steps[0], steps[Math.floor(steps.length / 2)], steps[steps.length - 1]]
      : steps;

  useEffect(() => {
    setSelectedStep(0);
    setExpandedImage(null);
  }, [project.slug]);

  useEffect(() => {
    if (expandedImage && dialog.current && !dialog.current.open) {
      dialog.current.showModal();
    } else if (!expandedImage && dialog.current?.open) {
      dialog.current.close();
    }
  }, [expandedImage]);

  const openImage = (image: ProjectImage, trigger: HTMLButtonElement) => {
    imageTrigger.current = trigger;
    setExpandedImage(image);
  };

  const renderImage = (image: ProjectImage, hero = false) => (
    <figure className={hero ? "project-story-hero" : "project-story-capture"}>
      <button
        type="button"
        className="project-story-image-button"
        aria-label={`Enlarge screenshot: ${image.alt}`}
        aria-haspopup="dialog"
        onClick={(event) => openImage(image, event.currentTarget)}
      >
        <img
          src={imageSource(image.src)}
          alt={image.alt}
          loading={hero ? "eager" : "lazy"}
          decoding="async"
        />
        <span className="project-story-image-hint mono" aria-hidden="true">
          View full size <span>↗</span>
        </span>
      </button>
      <figcaption>
        <span className="project-story-caption-mark" aria-hidden="true" />
        {image.caption}
      </figcaption>
    </figure>
  );

  return (
    <article
      className="project-story"
      data-motion-off={motionOff || undefined}
      style={{ "--project-accent": project.accent } as CSSProperties}
    >
      <header className="project-story-heading">
        <div className="project-story-topline mono">
          <Link to="/projects">
            ← <ScrambleText text="All projects" motionOff={motionOff} />
          </Link>
          <span>{project.index} / Selected work</span>
        </div>
        <div className="project-story-title-row">
          <h1>{project.title}</h1>
          <span className="project-story-title-symbol" aria-hidden="true">
            ↗
          </span>
        </div>
        <div className="project-story-introduction">
          <span className="project-story-category mono">
            <span aria-hidden="true" /> {project.category}
          </span>
          <p>{project.tagline}</p>
        </div>
      </header>

      {project.images[0] ? (
        renderImage(project.images[0], true)
      ) : (
        <figure className="project-story-concept">
          <div className="project-story-concept-art">
            <div className="project-story-concept-topline">
              <span className="mono">Concept / {project.category}</span>
              {project.slug === "projector" && (
                <img
                  src={imageSource("/projects/projector-logo.webp")}
                  alt=""
                  width="40"
                  height="40"
                />
              )}
            </div>
            <p className="project-story-concept-title">
              {project.flow?.title ?? project.title}
            </p>
            {conceptSteps.length > 0 && (
              <ol className="project-story-concept-path">
                {conceptSteps.map((step, index) => (
                  <li key={step.title}>
                    <div
                      className="project-story-concept-node"
                      aria-hidden="true"
                    >
                      <span>
                        {index === 1 ? "◇" : index === 2 ? "✓" : "＋"}
                      </span>
                    </div>
                    <span className="project-story-concept-step-label">
                      {step.title}
                    </span>
                    {project.slug === "projector" && (
                      <span className="project-story-concept-step-note mono">
                        {["TODO.md", "Your decision", "WORK_HISTORY.md"][index]}
                      </span>
                    )}
                    {index < conceptSteps.length - 1 && (
                      <span
                        className="project-story-concept-connector"
                        aria-hidden="true"
                      >
                        <span>{index === 0 ? "Proposal" : "Approval"}</span>
                        <span>→</span>
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            )}
            {project.slug === "projector" && (
              <p className="project-story-concept-boundary mono">
                <span aria-hidden="true" /> Proposal ≠ accepted history
              </p>
            )}
          </div>
          <figcaption>
            Conceptual workflow illustration. A live interface capture is
            unavailable for this project.
          </figcaption>
        </figure>
      )}

      <section
        className="project-story-overview"
        aria-labelledby="project-overview-title"
      >
        <div className="project-story-section-label mono">01 / The idea</div>
        <div>
          <h2 id="project-overview-title">{project.description}</h2>
          <p>{project.context}</p>
        </div>
      </section>

      <div className="project-story-features">
        {project.features.map((feature, index) => (
          <section className="project-story-feature" key={feature.title}>
            <div className="project-story-feature-marker" aria-hidden="true">
              <span className="mono">0{index + 1}</span>
              <span
                className={`project-story-feature-glyph project-story-feature-glyph-${index % 3}`}
              />
            </div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </section>
        ))}
      </div>

      {project.flow && steps.length > 0 && (
        <section
          className="project-story-flow"
          aria-labelledby="project-flow-title"
        >
          <div className="project-story-flow-heading">
            <div className="project-story-section-label mono">
              02 / Under the surface
            </div>
            <h2 id="project-flow-title">{project.flow.title}</h2>
            <p>{project.flow.description}</p>
          </div>
          <ol className="project-story-flow-steps">
            {steps.map((step, index) => (
              <li key={step.title}>
                <button
                  type="button"
                  aria-pressed={selectedStep === index}
                  aria-controls={stepPanelId}
                  onClick={() => setSelectedStep(index)}
                >
                  <span className="project-story-step-number mono">
                    0{index + 1}
                  </span>
                  <span>{step.title}</span>
                  <span
                    className="project-story-step-indicator"
                    aria-hidden="true"
                  >
                    {selectedStep === index ? "−" : "+"}
                  </span>
                </button>
                {index < steps.length - 1 && (
                  <span className="project-story-flow-arrow" aria-hidden="true">
                    →
                  </span>
                )}
              </li>
            ))}
          </ol>
          {currentStep && (
            <div
              className="project-story-step-detail"
              id={stepPanelId}
              aria-live="polite"
              aria-atomic="true"
            >
              <span
                className="project-story-step-detail-index"
                aria-hidden="true"
              >
                0{selectedStep + 1}
              </span>
              <div>
                <span className="project-story-step-detail-label mono">
                  Inside this step
                </span>
                <h3>{currentStep.title}</h3>
                <p>{currentStep.description}</p>
              </div>
            </div>
          )}
          <p className="project-story-flow-help mono">
            Select a step to explore how it works.
          </p>
        </section>
      )}

      {project.images.length > 1 && (
        <div
          className="project-story-gallery"
          aria-label="More interface screenshots"
        >
          {project.images.slice(1).map((image) => (
            <div key={image.src}>{renderImage(image)}</div>
          ))}
        </div>
      )}

      <section
        className="project-story-engineering"
        aria-labelledby="project-engineering-title"
      >
        <div>
          <div className="project-story-section-label mono">
            {project.flow && steps.length > 0 ? "03" : "02"} / Engineering
            choices
          </div>
          <h2 id="project-engineering-title">How it comes together.</h2>
          <ul className="project-story-stack" aria-label="Technology stack">
            {project.stack.map((technology) => (
              <li className="mono" key={technology}>
                {technology}
              </li>
            ))}
          </ul>
        </div>
        <div className="project-story-engineering-copy">
          {project.technicalDetails.map((detail, index) => (
            <p key={detail}>
              <span className="mono" aria-hidden="true">
                0{index + 1}
              </span>
              {detail}
            </p>
          ))}
          <aside className="project-story-boundary">
            <h3 className="mono">Scope &amp; boundaries</h3>
            <p>{project.limitation}</p>
          </aside>
        </div>
      </section>

      {project.links.length > 0 && (
        <div className="project-story-links">
          <span className="project-story-section-label mono">
            Explore the project
          </span>
          {project.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="mono"
            >
              <ScrambleText text={link.label} motionOff={motionOff} />{" "}
              <span aria-hidden="true">↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ))}
        </div>
      )}

      <nav className="project-story-next" aria-label="Next project">
        <Link to={`/projects/${next.slug}`}>
          <span className="project-story-next-label mono">
            Next project / {next.index}
          </span>
          <span className="project-story-next-title">
            <ScrambleText text={next.title} motionOff={motionOff} />
            <span aria-hidden="true">↗</span>
          </span>
          <span className="project-story-next-description">{next.tagline}</span>
        </Link>
      </nav>

      <dialog
        className="project-lightbox"
        ref={dialog}
        aria-label={`${project.title} screenshot`}
        aria-describedby={captionId}
        data-lenis-prevent
        onClose={() => {
          setExpandedImage(null);
          imageTrigger.current?.focus({ preventScroll: true });
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <button
          className="project-lightbox-close mono"
          type="button"
          autoFocus
          onClick={() => dialog.current?.close()}
        >
          Close <span aria-hidden="true">×</span>
        </button>
        {expandedImage && (
          <figure>
            <img src={imageSource(expandedImage.src)} alt={expandedImage.alt} />
            <figcaption id={captionId}>{expandedImage.caption}</figcaption>
          </figure>
        )}
      </dialog>
    </article>
  );
}
