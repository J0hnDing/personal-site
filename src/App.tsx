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
import { profile, projects, thoughts } from "./content";
import Landing, { supportingRevealDelay } from "./components/Landing";
import FloatingDust from "./components/FloatingDust";
import CursorMark from "./components/CursorMark";
import LineRevealText from "./components/LineRevealText";
import ScrambleText from "./components/ScrambleText";
import SmoothScroll from "./components/SmoothScroll";
import InfiniteGallery from "./components/InfiniteGallery";
import InfiniteThoughts from "./components/InfiniteThoughts";
import QuickIntroduction from "./components/QuickIntroduction";
import ScrollCue from "./components/ScrollCue";
import ProjectPreview from "./components/ProjectPreview";
import { scrollPageTo } from "./components/scrollController";
import { useTextReveals } from "./components/useTextReveals";
import { ArchiveHeading, ArchiveRow } from "./pages/ArchiveLayout";
import AboutContent from "./pages/AboutPage";
import ProjectDetailContent from "./pages/ProjectDetailPage";
import {
  GalleryIndexContent,
  GalleryFolderContent,
} from "./pages/GalleryPages";
import "./pages/archive.css";

const ease = [0.76, 0, 0.24, 1] as const;
const MotionPreference = createContext(false);
const scrollPositions = new Map<string, number>();
const introGreetings = [
  { text: "Hello", hold: 1900 },

  { text: "Bonjour", hold: 450 },
  { text: "Ciao", hold: 357 },
  { text: "नमस्ते", hold: 279 },
  { text: "Olá", hold: 214 },
  { text: "Hola", hold: 164 },
  { text: "Hallo", hold: 129 },
  { text: "Merhaba", hold: 107 },
  { text: "مرحبا", hold: 100 },
  { text: "สวัสดี", hold: 107 },
  { text: "Xin chào", hold: 129 },
  { text: "Γεια", hold: 164 },
  { text: "Привет", hold: 214 },
  { text: "안녕하세요", hold: 279 },
  { text: "こんにちは", hold: 357 },
  { text: "你好", hold: 450 },
] as const;
const nav = [
  ["Home", "/#home"],
  ["Projects", "/projects"],
  ["Gallery", "/gallery"],
  ["Thoughts", "/thoughts"],
  ["About", "/about"],
];
const Arrow = () => (
  <span aria-hidden="true" className="arrow">
    ↗
  </span>
);

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
              href === "/#home"
                ? location.pathname === "/"
                  ? "page"
                  : undefined
                : location.pathname === href ||
                    location.pathname.startsWith(`${href}/`)
                  ? "page"
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
  floatingDust = false,
}: {
  children: ReactNode;
  className?: string;
  floatingDust?: boolean;
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
    };
    const item =
      projects.find((p) => location.pathname === `/projects/${p.slug}`) ||
      thoughts.find((p) => location.pathname === `/thoughts/${p.slug}`);
    // Folder names arrive with the manifest; the folder page owns that title.
    if (!location.pathname.startsWith("/gallery/")) {
      document.title = `${item?.title || titles[location.pathname] || "Page not found"} — ${profile.name}`;
    }
    const savePosition = () =>
      scrollPositions.set(location.key, window.scrollY);
    window.addEventListener("scroll", savePosition, { passive: true });
    return () => window.removeEventListener("scroll", savePosition);
  }, [location.pathname, location.hash, location.key, navigationType]);
  return (
    <main
      ref={ref}
      id="main"
      tabIndex={-1}
      className={`${className}${floatingDust ? " has-floating-dust" : ""}`}
    >
      {floatingDust && (
        <FloatingDust className="archive-page-dust" motionOff={motionOff} />
      )}
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
  const [active, setActive] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const project = active === null ? null : projects[active];
  const previewImage = project?.images[0];

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || motionOff || revealed) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setRevealed(true);
        observer.disconnect();
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [motionOff, revealed]);

  return (
    <section
      ref={sectionRef}
      className={`project-section${motionOff ? " is-still" : ""}${revealed ? " is-revealed" : ""}`}
      id="projects"
      data-scroll-section
      style={{ "--project-accent": project?.accent } as CSSProperties}
    >
      <FloatingDust />
      <div className="project-layout">
        <div className="project-aside">
          <h2>Projects</h2>
          <div className="project-image-stage" aria-label="Project image area">
            {(revealed || motionOff) && (
              <ProjectPreview image={previewImage} motionOff={motionOff} />
            )}
          </div>
        </div>
        <div className="project-list-column">
          <div className="project-list">
            {projects.map((p, i) => (
              <Link
                key={p.slug}
                className={`project-row ${active === i ? "is-active" : ""}`}
                to={`/projects/${p.slug}`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                style={
                  {
                    "--row-accent": p.accent,
                    "--row-index": i,
                  } as CSSProperties
                }
              >
                <h3>
                  <span className="project-row-mask">
                    <span className="project-row-ink">
                      <ScrambleText text={p.title} motionOff={motionOff} />
                    </span>
                  </span>
                </h3>
                <svg
                  className="project-row-arrow"
                  viewBox="0 0 56 56"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M16.44 42.34 14 39.9l22.96-22.98H16.09v-3.5h26.83v26.83h-3.5V19.38L16.44 42.34Z"
                    fill="currentColor"
                  />
                </svg>
              </Link>
            ))}
          </div>
          <Link className="view-all-work" to="/projects">
            View All Work <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
      <ScrollCue motionOff={motionOff} />
    </section>
  );
}

function Home({ motionOff, ready }: { motionOff: boolean; ready: boolean }) {
  const location = useLocation();
  if (location.hash === "#contact") {
    return <Navigate to="/about#contact" replace />;
  }
  return (
    <Page className="home-page">
      <Landing motionOff={motionOff} ready={ready} />
      <QuickIntroduction motionOff={motionOff} />
      <ProjectIndex />
      <Gallery embedded />
      <Thoughts embedded />
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
  const motionOff = useContext(MotionPreference);
  return embedded ? (
    <section id={id} className={className} data-scroll-section aria-label={id}>
      {children}
      <ScrollCue motionOff={motionOff} />
    </section>
  ) : (
    <Page className={className}>{children}</Page>
  );
}

function About({ motionOff }: { motionOff: boolean }) {
  return (
    <Page className="archive-page">
      <AboutContent motionOff={motionOff} />
    </Page>
  );
}

function ProjectsArchive() {
  const motionOff = useContext(MotionPreference);
  return (
    <Page className="archive-page" floatingDust>
      <ArchiveHeading
        title="Projects"
        eyebrow="Work"
        intro="A few things I’m building."
        motionOff={motionOff}
      />
      <ul className="archive-list">
        {projects.map((project) => (
          <ArchiveRow
            key={project.slug}
            to={`/projects/${project.slug}`}
            title={project.title}
            index={project.index}
            meta={project.description || undefined}
            motionOff={motionOff}
          />
        ))}
      </ul>
    </Page>
  );
}

function ThoughtsArchive() {
  const motionOff = useContext(MotionPreference);
  return (
    <Page className="archive-page" floatingDust>
      <ArchiveHeading
        title="Thoughts"
        eyebrow="Questions"
        intro="Questions I keep coming back to."
        motionOff={motionOff}
      />
      <ul className="archive-list">
        {thoughts.map((thought, index) => (
          <ArchiveRow
            key={thought.slug}
            to={`/thoughts/${thought.slug}`}
            title={thought.title}
            index={String(index + 1).padStart(2, "0")}
            motionOff={motionOff}
          />
        ))}
      </ul>
    </Page>
  );
}
function ProjectDetail({ slug }: { slug: string }) {
  const motionOff = useContext(MotionPreference);
  const project = projects.find((p) => p.slug === slug);
  if (!project) return <NotFound />;
  const next = projects[(projects.indexOf(project) + 1) % projects.length];
  return (
    <Page className="archive-page project-detail-page" floatingDust>
      <ProjectDetailContent
        project={project}
        next={next}
        motionOff={motionOff}
      />
    </Page>
  );
}

function Gallery({ embedded = false }: { embedded?: boolean }) {
  const motionOff = useContext(MotionPreference);
  const Heading = embedded ? "h2" : "h1";
  return (
    <ContentSection
      embedded={embedded}
      id="gallery"
      className={`gallery-page gallery-page--${embedded ? "embedded" : "standalone"}`}
    >
      <Heading className="sr-only">Gallery</Heading>
      <InfiniteGallery motionOff={motionOff} intro />
    </ContentSection>
  );
}

function Thoughts({ embedded = false }: { embedded?: boolean }) {
  const motionOff = useContext(MotionPreference);
  const Heading = embedded ? "h2" : "h1";
  return (
    <ContentSection embedded={embedded} id="thoughts" className="thoughts-page">
      <Heading className="sr-only">Thoughts</Heading>
      <InfiniteThoughts motionOff={motionOff} />
    </ContentSection>
  );
}

function ThoughtDetail({ slug }: { slug: string }) {
  const motionOff = useContext(MotionPreference);
  const thought = thoughts.find((t) => t.slug === slug);
  if (!thought) return <NotFound />;
  return (
    <Page className="thought-detail" floatingDust>
      <Link to="/thoughts" className="back-link mono">
        ← <ScrambleText text="THOUGHTS" motionOff={motionOff} />
      </Link>
      <article>
        <header>
          <LineRevealText
            as="span"
            className="mono sample-label"
            text={
              thought.isSample
                ? "SAMPLE THOUGHT / TYPOGRAPHY DEMONSTRATION"
                : thought.kind
            }
            motionOff={motionOff}
          />
          <LineRevealText as="h1" text={thought.title} motionOff={motionOff} />
          {thought.excerpt && (
            <LineRevealText
              text={thought.excerpt}
              className="article-deck"
              motionOff={motionOff}
            />
          )}
          {thought.isSample && (
            <LineRevealText
              text="This sample demonstrates the reading layout. It is not a piece written by John."
              className="sample-notice"
              motionOff={motionOff}
            />
          )}
        </header>
        <div className="article-content">
          {thought.blocks.map((block, i) =>
            block.type === "heading" ? (
              <LineRevealText
                as="h2"
                text={block.text}
                motionOff={motionOff}
                key={i}
              />
            ) : block.type === "quote" ? (
              <LineRevealText
                as="blockquote"
                text={block.text}
                motionOff={motionOff}
                key={i}
              />
            ) : (
              <LineRevealText text={block.text} motionOff={motionOff} key={i} />
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

function NotFound() {
  const motionOff = useContext(MotionPreference);
  return (
    <Page className="not-found">
      <span className="mono">404 / A SMALL DETOUR</span>
      <h1>
        <LineRevealText as="span" text="Nothing" motionOff={motionOff} />
        <br />
        <em>
          <LineRevealText
            as="span"
            text="here."
            motionOff={motionOff}
            startIndex={1}
          />
        </em>
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
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = overflow;
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
        <div
          className="site-shell"
          data-intro={intro}
          inert={intro || undefined}
          style={
            {
              "--supporting-reveal-delay": `${supportingRevealDelay}s`,
            } as CSSProperties
          }
        >
          <Header />
          <div>
            <Routes location={location}>
              <Route
                path="/"
                element={<Home motionOff={motionOff} ready={!intro} />}
              />
              <Route path="/about" element={<About motionOff={motionOff} />} />
              <Route path="/projects" element={<ProjectsArchive />} />
              {projects.map((p) => (
                <Route
                  key={p.slug}
                  path={`/projects/${p.slug}`}
                  element={<ProjectDetail slug={p.slug} />}
                />
              ))}
              <Route
                path="/gallery"
                element={
                  <Page className="archive-page" floatingDust>
                    <GalleryIndexContent motionOff={motionOff} />
                  </Page>
                }
              />
              <Route
                path="/gallery/:folder"
                element={
                  <Page className="archive-page" floatingDust>
                    <GalleryFolderContent motionOff={motionOff} />
                  </Page>
                }
              />
              <Route path="/thoughts" element={<ThoughtsArchive />} />
              {thoughts.map((t) => (
                <Route
                  key={t.slug}
                  path={`/thoughts/${t.slug}`}
                  element={<ThoughtDetail slug={t.slug} />}
                />
              ))}
              <Route
                path="/contact"
                element={<Navigate to="/about#contact" replace />}
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
