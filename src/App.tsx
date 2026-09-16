import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from "motion/react";
import { contacts, photography, profile, projects, thoughts } from "./content";
import Landing from "./components/Landing";
import MathField from "./components/MathField";
import CursorMark from "./components/CursorMark";
import ScrambleText from "./components/ScrambleText";
import SmoothScroll from "./components/SmoothScroll";
import { scrollPageTo } from "./components/scrollController";
import { useTextReveals } from "./components/useTextReveals";

const ease = [0.76, 0, 0.24, 1] as const;
const MotionPreference = createContext(false);
const scrollPositions = new Map<string, number>();
const introGreetings = [
  { text: "Hello", hold: 1500 },
  { text: "Bonjour", hold: 320 },
  { text: "ሰላም", hold: 270 },
  { text: "Ciao", hold: 220 },
  { text: "שלום", hold: 185 },
  { text: "नमस्ते", hold: 155 },
  { text: "Hallo", hold: 130 },
  { text: "안녕하세요", hold: 115 },
  { text: "Olá", hold: 95 },
  { text: "Γεια σου", hold: 80 },
  { text: "নমস্কার", hold: 80 },
  { text: "Привет", hold: 90 },
  { text: "Jambo", hold: 100 },
  { text: "哈囉", hold: 120 },
  { text: "வணக்கம்", hold: 150 },
  { text: "Hola", hold: 190 },
  { text: "გამარჯობა", hold: 250 },
  { text: "สวัสดี", hold: 330 },
  { text: "مرحبًا", hold: 450 },
  { text: "こんにちは", hold: 620 },
  { text: "你好", hold: 1500 },
] as const;
const nav = [
  ["Home", "/#home"],
  ["Projects", "/#projects"],
  ["Gallery", "/#gallery"],
  ["Thoughts", "/#thoughts"],
  ["Contact", "/#contact"],
];
const Arrow = () => (
  <span aria-hidden="true" className="arrow">
    ↗
  </span>
);

function Aperture({
  className = "",
  petals = 28,
}: {
  className?: string;
  petals?: number;
}) {
  return (
    <svg
      className={`aperture ${className}`}
      viewBox="0 0 500 500"
      fill="none"
      aria-hidden="true"
    >
      {Array.from({ length: petals }, (_, i) => (
        <ellipse
          key={i}
          cx="250"
          cy="250"
          rx="218"
          ry="76"
          transform={`rotate(${(i * 180) / petals} 250 250)`}
        />
      ))}
      <circle cx="250" cy="250" r="34" />
    </svg>
  );
}

function Intro({ done }: { done: () => void }) {
  const motionOff = useContext(MotionPreference);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    let elapsed = 0;
    const greetingTimers = introGreetings.slice(0, -1).map((greeting, i) => {
      elapsed += greeting.hold;
      return window.setTimeout(() => setIndex(i + 1), elapsed);
    });
    const finishTimer = window.setTimeout(
      done,
      elapsed + introGreetings.at(-1)!.hold,
    );
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") done();
    };
    document.addEventListener("keydown", key);
    return () => {
      greetingTimers.forEach(window.clearTimeout);
      clearTimeout(finishTimer);
      document.removeEventListener("keydown", key);
    };
  }, [done]);
  return (
    <motion.div
      className="intro"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.85, ease }}
    >
      <div className="intro-top mono">
        <button onClick={done}>
          <ScrambleText text="Skip intro" motionOff={motionOff} /> ↗
        </button>
      </div>
      <motion.div
        className="intro-greeting"
        aria-hidden="true"
        initial={{ opacity: 0, y: 28, scale: 0.96, filter: "blur(14px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.8, delay: 0.1, ease }}
      >
        <span className="intro-dot" />
        {introGreetings[index].text}
      </motion.div>
      <span className="sr-only">Welcome to John Ding's portfolio.</span>
    </motion.div>
  );
}

function Header() {
  const motionOff = useContext(MotionPreference);
  const location = useLocation();
  return (
    <header className="site-header">
      <nav className="simple-nav" aria-label="Main navigation">
        {nav.map(([label, href]) => (
          <Link
            key={href}
            to={href}
            aria-current={
              location.pathname === "/" &&
              (location.hash || "#home") === href.slice(1)
                ? "location"
                : undefined
            }
          >
            <ScrambleText text={label} motionOff={motionOff} />
          </Link>
        ))}
      </nav>
    </header>
  );
}

function Page({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const motionOff = useContext(MotionPreference);
  const navigationType = useNavigationType();
  const ref = useRef<HTMLElement>(null);
  const location = useLocation();
  useTextReveals(ref, motionOff);
  useEffect(() => {
    const saved = scrollPositions.get(location.key);
    const target =
      location.hash && document.getElementById(location.hash.slice(1));
    if (target && !(navigationType === "POP" && saved !== undefined)) {
      scrollPageTo(target, motionOff);
    } else scrollPageTo(navigationType === "POP" ? saved || 0 : 0, true);
    if (target) {
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    } else ref.current?.focus({ preventScroll: true });
    const titles: Record<string, string> = {
      "/": "Home",
      "/about": "About",
      "/projects": "Projects",
      "/gallery": "Gallery",
      "/thoughts": "Thoughts",
      "/contact": "Contact",
    };
    const item =
      projects.find((p) => location.pathname === `/projects/${p.slug}`) ||
      thoughts.find((p) => location.pathname === `/thoughts/${p.slug}`);
    document.title = `${item?.title || titles[location.pathname] || "Page not found"} — ${profile.name}`;
    const savePosition = () =>
      scrollPositions.set(location.key, window.scrollY);
    window.addEventListener("scroll", savePosition, { passive: true });
    return () => window.removeEventListener("scroll", savePosition);
  }, [location.pathname, location.hash, location.key, navigationType]);
  return (
    <main ref={ref} id="main" tabIndex={-1} className={className}>
      {children}
    </main>
  );
}

function Footer({
  motionOff,
  systemReduced,
  toggleMotion,
}: {
  motionOff: boolean;
  systemReduced: boolean;
  toggleMotion: () => void;
}) {
  return (
    <footer className="site-footer">
      <Link className="footer-name" to="/">
        <ScrambleText text={profile.name} motionOff={motionOff} />
        <span>↗</span>
      </Link>
      <button
        className="mono motion-toggle"
        aria-pressed={motionOff}
        disabled={systemReduced}
        title={
          systemReduced
            ? "Reduced motion follows your system preference."
            : "Toggle decorative motion"
        }
        onClick={toggleMotion}
      >
        <ScrambleText
          text={`Motion ${motionOff ? "off" : "on"}`}
          motionOff={motionOff}
        />{" "}
        <span aria-hidden="true">{motionOff ? "○" : "●"}</span>
      </button>
    </footer>
  );
}

function ProjectIndex() {
  const motionOff = useContext(MotionPreference);
  const [active, setActive] = useState(0);
  const project = projects[active];
  return (
    <section
      className="project-section"
      id="projects"
      data-scroll-snap
      style={{ "--project-accent": project.accent } as CSSProperties}
    >
      <div className="project-layout">
        <div className="project-aside">
          <h2>Projects</h2>
          <div className="project-orbit">
            <motion.div
              animate={{ rotate: active * 45 }}
              transition={{ duration: motionOff ? 0 : 0.8, ease }}
            >
              <Aperture petals={18} />
            </motion.div>
            <span className="orbit-number">{project.index}</span>
          </div>
        </div>
        <div className="project-list">
          {projects.map((p, i) => (
            <Link
              key={p.slug}
              className={`project-row ${active === i ? "is-active" : ""}`}
              to={`/projects/${p.slug}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              style={{ "--row-accent": p.accent } as CSSProperties}
            >
              <div className="project-row-meta mono">
                <span>/{p.index}</span>
                <span>
                  {p.description
                    ? "PROJECT NOTES"
                    : "PROJECT NOTES FORTHCOMING"}
                </span>
              </div>
              <div className="project-row-title">
                <h3>
                  <ScrambleText text={p.title} motionOff={motionOff} />
                </h3>
                <Arrow />
              </div>
              <span className="project-row-bottom mono">
                <ScrambleText text="EXPLORE PROJECT" motionOff={motionOff} />{" "}
                <span>+</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Home({ motionOff, ready }: { motionOff: boolean; ready: boolean }) {
  return (
    <Page className="home-page">
      <Landing motionOff={motionOff} ready={ready} />
      <section
        className="quick-intro"
        id="about"
        data-scroll-snap
        aria-label="Introduction"
      >
        <p>{profile.intro}</p>
        <Link className="text-link" to="/about">
          <ScrambleText text="More about me" motionOff={motionOff} /> <Arrow />
        </Link>
      </section>
      <ProjectIndex />
      <Gallery embedded />
      <Thoughts embedded />
      <Contact embedded />
    </Page>
  );
}

function ContentSection({
  embedded,
  id,
  className,
  children,
}: {
  embedded: boolean;
  id: string;
  className: string;
  children: ReactNode;
}) {
  return embedded ? (
    <section id={id} className={className} data-scroll-snap aria-label={id}>
      {children}
    </section>
  ) : (
    <Page className={className}>{children}</Page>
  );
}

function About({ motionOff }: { motionOff: boolean }) {
  return (
    <Page className="about-page">
      <div className="about-heading">
        <h1>About</h1>
        <div className="about-intro">
          <p>{profile.intro}</p>
          {profile.introIsDraft && (
            <span className="draft-label mono">INTRODUCTION / DRAFT COPY</span>
          )}
        </div>
      </div>
      <div className="about-geometry">
        <div>
          <MathField motionOff={motionOff} />
        </div>
      </div>
      <div className="about-paths">
        <Link to="/projects">
          <h2>Projects ↗</h2>
          <p>
            Eidolon, Eidolon Atlas, Cubic, and Projector. Four projects, each
            with space for its own story.
          </p>
        </Link>
        <Link to="/gallery">
          <h2>Gallery ↗</h2>
          <p>
            A collection for my photography. Original photographs will be added
            here.
          </p>
        </Link>
        <Link to="/thoughts">
          <h2>Thoughts ↗</h2>
          <p>A notebook for thoughts, questions, and answers.</p>
        </Link>
      </div>
    </Page>
  );
}
function Placeholder() {
  return (
    <div className="visual-placeholder">
      <span className="placeholder-cross" aria-hidden="true">
        +
      </span>
      <p>Project image to be added.</p>
    </div>
  );
}

function ProjectDetail({ slug }: { slug: string }) {
  const motionOff = useContext(MotionPreference);
  const project = projects.find((p) => p.slug === slug);
  if (!project) return <NotFound />;
  const next = projects[(projects.indexOf(project) + 1) % projects.length];
  return (
    <Page className="detail-page">
      <section
        className="project-detail-head"
        style={{ "--detail-accent": project.accent } as CSSProperties}
      >
        <Link to="/projects" className="back-link mono">
          ← <ScrambleText text="ALL PROJECTS" motionOff={motionOff} />
        </Link>
        <h1>
          {project.title}
          <span>↗</span>
        </h1>
        <p className="project-deck">
          {project.description || "Project description to come."}
        </p>
      </section>
      <div className="detail-body">
        {project.images.length ? (
          project.images.map((image) => (
            <figure className="project-image" key={image.src}>
              <img src={image.src} alt={image.alt} loading="lazy" />
              <figcaption>{image.caption}</figcaption>
            </figure>
          ))
        ) : (
          <Placeholder />
        )}
        <div className="project-context">
          <div>
            <h2>Context</h2>
            <p>
              {project.context ||
                "The story behind this project will go here: what prompted it, what it explores, and how it took shape."}
            </p>
            {!project.context && (
              <span className="mono content-pending">CONTENT PLACEHOLDER</span>
            )}
          </div>
        </div>
        <div className="project-context">
          <div>
            <h2>Technical notes.</h2>
            {project.technicalDetails.length ? (
              <ul>
                {project.technicalDetails.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            ) : (
              <>
                <p>
                  Architecture, tools, implementation decisions, and lessons
                  learned will be added here.
                </p>
                <span className="mono content-pending">
                  CONTENT PLACEHOLDER
                </span>
              </>
            )}
            {project.links.length > 0 && (
              <div className="project-links">
                {project.links.map((link) => (
                  <a
                    className="text-link"
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ScrambleText text={link.label} motionOff={motionOff} />{" "}
                    <Arrow />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Link to={`/projects/${next.slug}`} className="next-project">
        <span className="mono">
          <ScrambleText
            text={`NEXT PROJECT / ${next.index}`}
            motionOff={motionOff}
          />
        </span>
        <span>
          <ScrambleText text={next.title} motionOff={motionOff} />
        </span>
        <Arrow />
      </Link>
    </Page>
  );
}

function Gallery({ embedded = false }: { embedded?: boolean }) {
  const motionOff = useContext(MotionPreference);
  const Heading = embedded ? "h2" : "h1";
  const [selected, setSelected] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (selected !== null) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);
  const photo = selected !== null ? photography[selected] : null;
  return (
    <ContentSection embedded={embedded} id="gallery" className="gallery-page">
      <div className="gallery-heading">
        <Heading>Gallery</Heading>
      </div>
      {photography.length ? (
        <div className="photo-collection">
          {photography.map((p, i) => (
            <button
              key={p.id}
              className="photo-item"
              onClick={() => setSelected(i)}
              aria-label={`View ${p.title}`}
            >
              <img
                src={p.src}
                alt={p.alt}
                width={p.width}
                height={p.height}
                loading="lazy"
              />
              <span className="mono">
                <ScrambleText text={p.title} motionOff={motionOff} /> ↗
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-exhibition">
          <span className="registration top-left">+</span>
          <span className="registration top-right">+</span>
          <span className="registration bottom-left">+</span>
          <span className="registration bottom-right">+</span>
          <div className="empty-aperture">
            <Aperture petals={12} />
          </div>
          <div className="empty-gallery-copy">
            <p>Original photography will be added here.</p>
          </div>
        </div>
      )}
      <dialog
        ref={dialog}
        className="photo-dialog"
        aria-label="Photograph viewer"
        onCancel={() => setSelected(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelected(null);
        }}
      >
        <button
          autoFocus
          className="dialog-close mono"
          onClick={() => setSelected(null)}
        >
          <ScrambleText text="Close" motionOff={motionOff} /> ×
        </button>
        {photo && (
          <figure>
            <img src={photo.src} alt={photo.alt} />
            <figcaption>
              {photo.title}
              <span>{photo.caption}</span>
            </figcaption>
          </figure>
        )}
        <div className="photo-controls">
          <button
            disabled={selected === 0}
            onClick={() =>
              setSelected((i) => (i === null ? null : Math.max(0, i - 1)))
            }
          >
            ← <ScrambleText text="Previous" motionOff={motionOff} />
          </button>
          <button
            disabled={selected === photography.length - 1}
            onClick={() =>
              setSelected((i) =>
                i === null ? null : Math.min(photography.length - 1, i + 1),
              )
            }
          >
            <ScrambleText text="Next" motionOff={motionOff} /> →
          </button>
        </div>
      </dialog>
    </ContentSection>
  );
}

function Thoughts({ embedded = false }: { embedded?: boolean }) {
  const motionOff = useContext(MotionPreference);
  const Heading = embedded ? "h2" : "h1";
  return (
    <ContentSection embedded={embedded} id="thoughts" className="thoughts-page">
      <div className="thoughts-heading">
        <Heading>Thoughts</Heading>
        <span aria-hidden="true">✳</span>
      </div>
      <div className="thought-index">
        {thoughts.map((thought, i) => (
          <Link to={`/thoughts/${thought.slug}`} key={thought.slug}>
            <span className="mono">/{String(i + 1).padStart(2, "0")}</span>
            <div>
              <span className="sample-label mono">
                {thought.isSample
                  ? "SAMPLE / LAYOUT DEMONSTRATION"
                  : thought.kind}
              </span>
              <h2>
                <ScrambleText text={thought.title} motionOff={motionOff} />
              </h2>
              <p>{thought.excerpt}</p>
            </div>
            <Arrow />
          </Link>
        ))}
      </div>
    </ContentSection>
  );
}

function ThoughtDetail({ slug }: { slug: string }) {
  const motionOff = useContext(MotionPreference);
  const thought = thoughts.find((t) => t.slug === slug);
  if (!thought) return <NotFound />;
  return (
    <Page className="thought-detail">
      <Link to="/thoughts" className="back-link mono">
        ← <ScrambleText text="THE NOTEBOOK" motionOff={motionOff} />
      </Link>
      <article>
        <header>
          <span className="mono sample-label">
            {thought.isSample
              ? "SAMPLE THOUGHT / TYPOGRAPHY DEMONSTRATION"
              : thought.kind}
          </span>
          <h1>{thought.title}</h1>
          <p className="article-deck">{thought.excerpt}</p>
          {thought.isSample && (
            <p className="sample-notice">
              This sample demonstrates the reading layout. It is not a piece
              written by John.
            </p>
          )}
        </header>
        <div className="article-content">
          {thought.blocks.map((block, i) =>
            block.type === "heading" ? (
              <h2 key={i}>{block.text}</h2>
            ) : block.type === "quote" ? (
              <blockquote key={i}>{block.text}</blockquote>
            ) : (
              <p key={i}>{block.text}</p>
            ),
          )}
        </div>
        <div className="article-end">
          <span aria-hidden="true">✳</span>
          <Link to="/thoughts" className="mono">
            <ScrambleText text="BACK TO THOUGHTS" motionOff={motionOff} /> ↗
          </Link>
        </div>
      </article>
    </Page>
  );
}

function Contact({ embedded = false }: { embedded?: boolean }) {
  const motionOff = useContext(MotionPreference);
  const Heading = embedded ? "h2" : "h1";
  return (
    <ContentSection embedded={embedded} id="contact" className="contact-page">
      <div className="contact-heading">
        <Heading>Contact</Heading>
        <Aperture petals={20} />
      </div>
      <div className="contact-bottom">
        <div className="contact-list">
          {contacts.map((contact) => (
            <div className="contact-row" key={contact.label}>
              <span>{contact.label}</span>
              {contact.href ? (
                <a
                  href={contact.href}
                  target={contact.label === "Email" ? undefined : "_blank"}
                  rel="noreferrer"
                >
                  <ScrambleText
                    text={contact.value || "Connect"}
                    motionOff={motionOff}
                  />{" "}
                  <Arrow />
                </a>
              ) : (
                <span className="contact-placeholder mono">
                  {contact.value || "DETAILS TO BE ADDED"}
                  <span aria-hidden="true">↗</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </ContentSection>
  );
}

function NotFound() {
  const motionOff = useContext(MotionPreference);
  return (
    <Page className="not-found">
      <span className="mono">404 / A SMALL DETOUR</span>
      <h1>
        Nothing
        <br />
        <em>here.</em>
      </h1>
      <Link className="text-link" to="/">
        <ScrambleText text="Back to familiar ground" motionOff={motionOff} />{" "}
        <Arrow />
      </Link>
    </Page>
  );
}

export default function App() {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const [manualMotionOff, setManualMotionOff] = useState(false);
  const motionOff = !!prefersReducedMotion || manualMotionOff;
  const [intro, setIntro] = useState(() => {
    try {
      return (
        location.pathname === "/" &&
        !location.hash &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
        !sessionStorage.getItem("john-intro-seen-v3")
      );
    } catch {
      return false;
    }
  });
  const finishIntro = useRef(() => {
    setIntro(false);
    try {
      sessionStorage.setItem("john-intro-seen-v3", "true");
    } catch {
      /* Browsing remains usable without storage. */
    }
  }).current;
  useEffect(() => {
    document.documentElement.dataset.motion = motionOff ? "off" : "on";
  }, [motionOff]);
  useEffect(() => {
    if (motionOff) finishIntro();
  }, [motionOff, finishIntro]);
  useEffect(() => {
    if (!intro) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [intro]);
  return (
    <MotionPreference.Provider value={motionOff}>
      <MotionConfig
        reducedMotion={motionOff ? "always" : "never"}
        transition={motionOff ? { duration: 0 } : undefined}
      >
        <SmoothScroll disabled={motionOff || intro} />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <div className="ambient-background" aria-hidden="true">
          <MathField variant="code" motionOff={motionOff} contours={intro} />
        </div>
        <div
          className="site-shell"
          data-intro={intro}
          inert={intro || undefined}
        >
          <Header />
          <div>
            <Routes location={location}>
              <Route
                path="/"
                element={<Home motionOff={motionOff} ready={!intro} />}
              />
              <Route path="/about" element={<About motionOff={motionOff} />} />
              <Route
                path="/projects"
                element={<Navigate to="/#projects" replace />}
              />
              {projects.map((p) => (
                <Route
                  key={p.slug}
                  path={`/projects/${p.slug}`}
                  element={<ProjectDetail slug={p.slug} />}
                />
              ))}
              <Route
                path="/gallery"
                element={<Navigate to="/#gallery" replace />}
              />
              <Route
                path="/thoughts"
                element={<Navigate to="/#thoughts" replace />}
              />
              {thoughts.map((t) => (
                <Route
                  key={t.slug}
                  path={`/thoughts/${t.slug}`}
                  element={<ThoughtDetail slug={t.slug} />}
                />
              ))}
              <Route
                path="/contact"
                element={<Navigate to="/#contact" replace />}
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Footer
              motionOff={motionOff}
              systemReduced={!!prefersReducedMotion}
              toggleMotion={() => setManualMotionOff((value) => !value)}
            />
          </div>
        </div>
        <AnimatePresence>
          {intro && <Intro done={finishIntro} />}
        </AnimatePresence>
        <CursorMark motionOff={motionOff || intro} />
      </MotionConfig>
    </MotionPreference.Provider>
  );
}
