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
  NavLink,
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

const ease = [0.76, 0, 0.24, 1] as const;
const MotionPreference = createContext(false);
const scrollPositions = new Map<string, number>();
const AnimatedLink = motion.create(Link);
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
  ["About", "/about"],
  ["Projects", "/projects"],
  ["Gallery", "/gallery"],
  ["Thoughts", "/thoughts"],
  ["Contact", "/contact"],
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
      exit={{ y: "-100%", borderRadius: "0 0 45% 45%" }}
      transition={{ duration: 0.85, ease }}
    >
      <MathField variant="code" className="intro-code-field" />
      <div className="intro-top mono">
        <span>JOHN DING / PERSONAL SPACE</span>
        <button onClick={done}>Skip intro ↗</button>
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
      <div className="intro-bottom mono">
        <span>A WORK IN CURIOSITY</span>
        <span>
          ({String(index + 1).padStart(2, "0")} / {introGreetings.length})
        </span>
      </div>
    </motion.div>
  );
}

function Header({
  menu,
  setMenu,
}: {
  menu: boolean;
  setMenu: (open: boolean) => void;
}) {
  const motionOff = useContext(MotionPreference);
  const location = useLocation();
  const button = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 761px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMenu(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [setMenu]);
  useEffect(() => {
    if (!menu) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const links = menuRef.current?.querySelectorAll<HTMLAnchorElement>("a");
    links?.[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        button.current?.focus();
      }
      if (e.key === "Tab" && links?.length) {
        const nodes: HTMLElement[] = [button.current!, ...Array.from(links)];
        const index = nodes.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        nodes[
          (index + (e.shiftKey ? -1 : 1) + nodes.length) % nodes.length
        ]?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", key);
    };
  }, [menu, setMenu]);
  return (
    <>
      <header
        className={`site-header ${menu ? "menu-is-open" : ""} ${["/", "/projects", "/about"].includes(location.pathname) ? "dark-header" : ""}`}
      >
        <Link
          className="wordmark"
          to="/"
          onClick={() => setMenu(false)}
          aria-label="John Ding, home"
        >
          j<span className="brand-dot">.</span>
        </Link>
        <span className="header-caption mono">A WORK IN CURIOSITY</span>
        <nav className="desktop-nav" aria-label="Main navigation">
          {nav.map(([label, href]) => (
            <NavLink key={href} to={href}>
              <ScrambleText text={label} motionOff={motionOff} />
            </NavLink>
          ))}
        </nav>
        <button
          ref={button}
          className="menu-toggle mono"
          aria-expanded={menu}
          aria-controls="mobile-menu"
          onClick={() => setMenu(!menu)}
        >
          {menu ? "Close −" : "Menu +"}
        </button>
      </header>
      <AnimatePresence>
        {menu && (
          <motion.div
            ref={menuRef}
            id="mobile-menu"
            className="mobile-menu"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: motionOff ? 0 : 0.45, ease }}
          >
            <nav aria-label="Mobile navigation">
              {[["Home", "/"], ...nav].map(([label, href], i) => (
                <Link key={href} to={href} onClick={() => setMenu(false)}>
                  <span className="mono">0{i}</span>
                  {label}
                  <Arrow />
                </Link>
              ))}
            </nav>
            <span className="mono">PROJECTS, PICTURES & PASSING THOUGHTS.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
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
  useEffect(() => {
    window.scrollTo({
      top:
        navigationType === "POP" ? scrollPositions.get(location.key) || 0 : 0,
      behavior: "instant",
    });
    ref.current?.focus({ preventScroll: true });
    const titles: Record<string, string> = {
      "/": "A work in curiosity",
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
    return () => {
      scrollPositions.set(location.key, window.scrollY);
    };
  }, [location.pathname, location.key, navigationType]);
  return (
    <motion.main
      ref={ref}
      id="main"
      tabIndex={-1}
      className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: motionOff ? 0 : 0.38, ease }}
    >
      {children}
    </motion.main>
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
        {profile.name}
        <span>↗</span>
      </Link>
      <span className="mono">PROJECTS, PICTURES & PASSING THOUGHTS.</span>
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
        Motion {motionOff ? "off" : "on"}{" "}
        <span aria-hidden="true">{motionOff ? "○" : "●"}</span>
      </button>
    </footer>
  );
}

function ProjectIndex({ standalone = false }: { standalone?: boolean }) {
  const motionOff = useContext(MotionPreference);
  const Heading = standalone ? "h1" : "h2";
  const [active, setActive] = useState(0);
  const project = projects[active];
  return (
    <section
      className={`project-section ${standalone ? "standalone" : ""}`}
      id="selected-projects"
      style={{ "--project-accent": project.accent } as CSSProperties}
    >
      <div className="section-label mono">
        <span>01 / SELECTED PROJECTS</span>
        <span>FOUR IDEAS, TAKING SHAPE.</span>
      </div>
      <div className="project-layout">
        <div className="project-aside">
          <Heading>
            {standalone ? (
              "Projects"
            ) : (
              <>
                Things
                <br />
                I’m building<span className="accent">.</span>
              </>
            )}
          </Heading>
          <div className="project-orbit">
            <motion.div
              animate={{ rotate: active * 45 }}
              transition={{ duration: motionOff ? 0 : 0.8, ease }}
            >
              <Aperture petals={18} />
            </motion.div>
            <span className="orbit-number">{project.index}</span>
          </div>
          <div className="project-preview-note mono">
            <span>PROJECT INDEX / {project.index}</span>
            <span>
              {project.images.length ? "PROJECT MATERIAL" : "VISUALS TO COME"}
            </span>
          </div>
        </div>
        <div className="project-list">
          {projects.map((p, i) => (
            <AnimatedLink
              key={p.slug}
              initial={motionOff ? false : { opacity: 0, x: 45 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: motionOff ? 0 : 0.7,
                ease: [0.22, 1, 0.36, 1],
              }}
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
                <h3>{p.title}</h3>
                <Arrow />
              </div>
              <span className="project-row-bottom mono">
                EXPLORE PROJECT <span>+</span>
              </span>
            </AnimatedLink>
          ))}
        </div>
      </div>
      {!standalone && (
        <Link className="text-link mono" to="/projects">
          THE PROJECT INDEX <Arrow />
        </Link>
      )}
    </section>
  );
}

function Home({ motionOff }: { motionOff: boolean }) {
  return (
    <Page className="home-page">
      <Landing motionOff={motionOff} />
    </Page>
  );
}

function About({ motionOff }: { motionOff: boolean }) {
  return (
    <Page className="about-page">
      <div className="page-kicker mono">
        <span>ABOUT / THE PERSON</span>
        <span>JOHN DING</span>
      </div>
      <div className="about-heading">
        <h1>
          A little
          <br />
          <em>about me.</em>
        </h1>
        <div className="about-intro">
          <span className="mono">HELLO, I'M {profile.name.toUpperCase()}.</span>
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
        <span className="mono">A SMALL STUDY IN CONTINUOUS CURIOSITY.</span>
      </div>
      <div className="about-paths">
        <Link to="/projects">
          <span className="mono">01 / BUILD</span>
          <h2>Thinking in systems. ↗</h2>
          <p>
            Eidolon, Eidolon Atlas, Cubic, and Projector. Four projects, each
            with space for its own story.
          </p>
        </Link>
        <Link to="/gallery">
          <span className="mono">02 / OBSERVE</span>
          <h2>Looking a little closer. ↗</h2>
          <p>
            A collection for my photography. Original photographs will be added
            here.
          </p>
        </Link>
        <Link to="/thoughts">
          <span className="mono">03 / QUESTION</span>
          <h2>Leaving room to wonder. ↗</h2>
          <p>A notebook for thoughts, questions, and answers.</p>
        </Link>
      </div>
    </Page>
  );
}
function Placeholder({
  index = "01",
  label = "PROJECT VISUAL",
  className = "",
}: {
  index?: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`visual-placeholder ${className}`}>
      <div className="placeholder-top mono">
        <span>
          {label} / {index}
        </span>
        <span>ASSET PLACEHOLDER</span>
      </div>
      <span className="placeholder-cross" aria-hidden="true">
        +
      </span>
      <p>Space for the real thing.</p>
      <span className="mono placeholder-bottom">
        SCREENSHOT OR PROJECT IMAGE TO BE ADDED
      </span>
    </div>
  );
}

function ProjectDetail({ slug }: { slug: string }) {
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
          ← ALL PROJECTS
        </Link>
        <div className="detail-kicker mono">
          <span>PROJECT / {project.index}</span>
          <span>
            {project.description ? "PROJECT NOTES" : "CONTENT IN PREPARATION"}
          </span>
        </div>
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
          <span className="mono">01 / THE CONTEXT</span>
          <div>
            <h2>A closer look.</h2>
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
          <span className="mono">02 / UNDER THE SURFACE</span>
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
                    {link.label} <Arrow />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Link to={`/projects/${next.slug}`} className="next-project">
        <span className="mono">NEXT PROJECT / {next.index}</span>
        <span>{next.title}</span>
        <Arrow />
      </Link>
    </Page>
  );
}

function Gallery() {
  const [selected, setSelected] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (selected !== null) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);
  const photo = selected !== null ? photography[selected] : null;
  return (
    <Page className="gallery-page">
      <div className="page-kicker mono">
        <span>02 / PHOTOGRAPHY</span>
        <span>{String(photography.length).padStart(2, "0")} PHOTOGRAPHS</span>
      </div>
      <div className="gallery-heading">
        <h1>
          Looking.
          <br />
          <em>Again.</em>
        </h1>
        <p>
          A place for photographs.
          <br />
          For the things worth
          <br />a second look.
        </p>
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
              <span className="mono">{p.title} ↗</span>
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
            <span className="mono">THE COLLECTION BEGINS HERE</span>
            <h2>
              Nothing on the walls.
              <br />
              <em>Not yet.</em>
            </h2>
            <p>Original photography will be added here.</p>
          </div>
          <span className="empty-frame-label mono">
            FRAME 001 / AWAITING PHOTOGRAPH
          </span>
        </div>
      )}
      <div className="gallery-foot mono">
        <span>AN OPEN COLLECTION</span>
        <span>JOHN / PHOTOGRAPHY</span>
      </div>
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
          Close ×
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
            ← Previous
          </button>
          <button
            disabled={selected === photography.length - 1}
            onClick={() =>
              setSelected((i) =>
                i === null ? null : Math.min(photography.length - 1, i + 1),
              )
            }
          >
            Next →
          </button>
        </div>
      </dialog>
    </Page>
  );
}

function Thoughts() {
  return (
    <Page className="thoughts-page">
      <div className="page-kicker mono">
        <span>03 / A NOTEBOOK</span>
        <span>THOUGHTS, QUESTIONS & ANSWERS</span>
      </div>
      <div className="thoughts-heading">
        <h1>
          Thinking
          <br />
          <em>out loud.</em>
        </h1>
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
              <h2>{thought.title}</h2>
              <p>{thought.excerpt}</p>
            </div>
            <Arrow />
          </Link>
        ))}
      </div>
      <p className="notebook-foot">
        Room for a sentence.
        <br />
        Or a much longer conversation.
      </p>
    </Page>
  );
}

function ThoughtDetail({ slug }: { slug: string }) {
  const thought = thoughts.find((t) => t.slug === slug);
  if (!thought) return <NotFound />;
  return (
    <Page className="thought-detail">
      <Link to="/thoughts" className="back-link mono">
        ← THE NOTEBOOK
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
            BACK TO THOUGHTS ↗
          </Link>
        </div>
      </article>
    </Page>
  );
}

function Contact() {
  return (
    <Page className="contact-page">
      <div className="page-kicker mono">
        <span>04 / CONTACT</span>
        <span>EVERYTHING STARTS WITH A HELLO.</span>
      </div>
      <div className="contact-heading">
        <h1>
          Say
          <br />
          <em>hello.</em>
        </h1>
        <Aperture petals={20} />
      </div>
      <div className="contact-bottom">
        <p>
          A thought, a question,
          <br />
          or just a hello.
          <br />
          <span>Find me here.</span>
        </p>
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
                  {contact.value || "Connect"} <Arrow />
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
    </Page>
  );
}

function NotFound() {
  return (
    <Page className="not-found">
      <span className="mono">404 / A SMALL DETOUR</span>
      <h1>
        Nothing
        <br />
        <em>here.</em>
      </h1>
      <Link className="text-link" to="/">
        Back to familiar ground <Arrow />
      </Link>
    </Page>
  );
}

export default function App() {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const [manualMotionOff, setManualMotionOff] = useState(false);
  const motionOff = !!prefersReducedMotion || manualMotionOff;
  const [menu, setMenu] = useState(false);
  const [intro, setIntro] = useState(() => {
    try {
      return (
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
        !sessionStorage.getItem("john-intro-seen-v2")
      );
    } catch {
      return false;
    }
  });
  const finishIntro = useRef(() => {
    setIntro(false);
    try {
      sessionStorage.setItem("john-intro-seen-v2", "true");
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
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <div inert={intro || undefined}>
          <Header menu={menu} setMenu={setMenu} />
          <div inert={menu || undefined}>
            <AnimatePresence mode="wait" initial={false}>
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Home motionOff={motionOff} />} />
                <Route
                  path="/about"
                  element={<About motionOff={motionOff} />}
                />
                <Route
                  path="/projects"
                  element={
                    <Page className="projects-page">
                      <ProjectIndex standalone />
                    </Page>
                  }
                />
                {projects.map((p) => (
                  <Route
                    key={p.slug}
                    path={`/projects/${p.slug}`}
                    element={<ProjectDetail slug={p.slug} />}
                  />
                ))}
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/thoughts" element={<Thoughts />} />
                {thoughts.map((t) => (
                  <Route
                    key={t.slug}
                    path={`/thoughts/${t.slug}`}
                    element={<ThoughtDetail slug={t.slug} />}
                  />
                ))}
                <Route path="/contact" element={<Contact />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AnimatePresence>
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
        {!motionOff && (
          <motion.div
            key={location.pathname}
            className="route-shutter"
            aria-hidden="true"
            initial={{ scaleY: 1 }}
            animate={{ scaleY: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease }}
          />
        )}
      </MotionConfig>
    </MotionPreference.Provider>
  );
}
