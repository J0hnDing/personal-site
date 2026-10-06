/**
 * The editable content for the portfolio.
 *
 * Project facts come from their READMEs and verified implementation. Contact
 * details remain empty. Gallery photography is loaded from the root photos
 * folder and is not stored in this editable content file.
 */

export type ProjectIndex = "01" | "02" | "03" | "04";

export interface Profile {
  name: string;
  intro: string;
  introIsDraft: boolean;
}

export interface ProjectImage {
  src: string;
  alt: string;
  caption: string;
}

export interface ProjectLink {
  label: string;
  href: string;
}

export interface Project {
  slug: string;
  title: string;
  index: ProjectIndex;
  accent: string;
  description: string | null;
  context: string | null;
  technicalDetails: string[];
  images: ProjectImage[];
  links: ProjectLink[];
  tagline: string;
  category: string;
  stack: string[];
  features: { title: string; description: string }[];
  flow: {
    title: string;
    description: string;
    steps: { title: string; description: string }[];
  } | null;
  limitation: string;
}

export type ThoughtBlockType = "paragraph" | "heading" | "quote";

export interface ThoughtBlock {
  type: ThoughtBlockType;
  text: string;
}

export interface Thought {
  slug: string;
  title: string;
  kind: string;
  isSample: boolean;
  excerpt: string;
  blocks: ThoughtBlock[];
}

export type ContactLabel = "Email" | "X / Twitter" | "WeChat" | "Instagram";

export interface Contact {
  label: ContactLabel;
  value: string | null;
  href: string | null;
}

export interface Content {
  profile: Profile;
  projects: Project[];
  thoughts: Thought[];
  contacts: Contact[];
}

export const profile: Profile = {
  name: "John Ding",
  intro:
    "Hi, I’m John, a Computer Science and Mathematics student at UofT. I’m interested in ML and AI agents, specifically how they can optimize people's lives autonomously, safely and reliably. Outside of CS, I’m into photography, tennis, and philosophy.",
  introIsDraft: false,
};

export const projects: Project[] = [
  {
    slug: "eidolon",
    title: "Eidolon",
    index: "01",
    accent: "#b2c2b7",
    description:
      "A local personal agent that turns recurring needs into reusable capabilities, with explicit control over what it can do.",
    tagline: "Useful intelligence. Deliberate control.",
    category: "Personal AI / Local software",
    context:
      "An assistant becomes more useful when its work carries forward. Eidolon brings persistent conversations, inspectable memory, and reusable skills into one local workspace. Its central idea is that growing capability should come with understandable, revocable authority.",
    stack: [
      "Python",
      "FastAPI",
      "React",
      "TypeScript",
      "SQLite",
      "Codex CLI",
      "Docker",
    ],
    features: [
      {
        title: "Work that carries forward",
        description:
          "Persistent agent sessions preserve the thread of a task. Project mode turns a recurring need into a bounded plan for a reusable skill.",
      },
      {
        title: "Context you can inspect",
        description:
          "Memory facts have an explicit local interface for creating, editing, and deleting context. Atlas integration connects the agent to a structured personal workspace.",
      },
      {
        title: "Capabilities with boundaries",
        description:
          "Versioned skills can expose functions, applications, or scheduled services. Approvals, permissions, and run history stay visible in the control plane.",
      },
    ],
    flow: {
      title: "From an idea to a reusable capability.",
      description:
        "A simplified view of the skill lifecycle. Each approval gate belongs to the user; validation and activation belong to the backend.",
      steps: [
        {
          title: "Describe",
          description:
            "Describe a recurring need. Project mode clarifies it and produces a bounded blueprint for the capability.",
        },
        {
          title: "Approve the build",
          description:
            "Build approval authorizes generation. It does not install a skill or grant runtime permissions.",
        },
        {
          title: "Build & validate",
          description:
            "Builder and Tester create the package. The backend checks its files, tests, manifest, and requested permissions.",
        },
        {
          title: "Approve runtime",
          description:
            "Review the proposed capability and its permissions before a version becomes installed. Generated code cannot approve itself.",
        },
        {
          title: "Use & inspect",
          description:
            "Run a function, open an application, or resume a scheduled service. Services install paused; runs and versions remain inspectable.",
        },
      ],
    },
    technicalDetails: [
      "FastAPI owns state, approvals, skill registration, and execution. SQLite keeps local conversations, explicit memory, and run history.",
      "Generated Python skills use bounded runtime contracts. Docker is the default skill sandbox; the explicit development fallback is less isolated.",
      "Capability updates are built as drafts and activated through validation and approval, preserving a versioned installation history.",
    ],
    limitation:
      "Active development. Automatic selection of stored memory facts and experience-driven self-improvement are unfinished; they are goals, not current capabilities.",
    images: [
      {
        src: "/projects/eidolon-cover.webp",
        alt: "Eidolon website introducing a local-first personal agent, with a preview of its weekly review workspace.",
        caption:
          "Supplied screenshot · Eidolon's website and weekly review preview.",
      },
      {
        src: "/projects/eidolon-memory.webp",
        alt: "Eidolon memory interface showing three explicitly labeled demonstration facts with edit and delete controls.",
        caption:
          "Live capture · Editable memory with demonstration facts in an isolated database.",
      },
    ],
    links: [
      {
        label: "Explore the source",
        href: "https://github.com/J0hnDing/eidolon-agent",
      },
    ],
  },
  {
    slug: "eidolon-atlas",
    title: "Eidolon Atlas",
    index: "02",
    accent: "#b5b1c7",
    description:
      "An encrypted personal workspace that connects the different parts of a life, from goals and experiences to knowledge and relationships.",
    tagline: "A connected life. A private foundation.",
    category: "Personal context / Encrypted local data",
    context:
      "Personal context rarely fits a single list. Atlas gives it structure: eight connected domains, typed records, and navigable links. A goal can unfold into a progression; an experience can connect to a project; knowledge can narrow into a taxonomy. The browser is the primary interface, with personal content encrypted at rest.",
    stack: [
      "Node.js 24",
      "SQLite",
      "JavaScript",
      "AES-256-GCM",
      "scrypt",
      "Loopback API",
    ],
    features: [
      {
        title: "Eight connected domains",
        description:
          "Profile, experiences, goals, projects, resources, relationships, interests, and knowledge share one workspace without flattening their different meanings.",
      },
      {
        title: "A path through your goals",
        description:
          "Ordered subgoals and sibling prerequisites form an acyclic progression. Parent progress rolls up evenly from active direct subgoals.",
      },
      {
        title: "History without losing context",
        description:
          "Record revisions, reversible removal, encrypted attachments, and portable encrypted backups make the workspace durable and recoverable.",
      },
    ],
    flow: {
      title: "Readable while unlocked. Encrypted at rest.",
      description:
        "The passphrase-derived key lives in memory while the local workspace is unlocked. This diagram follows the protection of personal content.",
      steps: [
        {
          title: "Passphrase",
          description:
            "The user supplies a passphrase. Atlas does not store it and cannot recover it.",
        },
        {
          title: "Derive a key",
          description:
            "scrypt derives the encryption key. Unlocking loads it into memory for the local session.",
        },
        {
          title: "Encrypt content",
          description:
            "AES-256-GCM protects record payloads and attachment bytes before they are persisted.",
        },
        {
          title: "Store locally",
          description:
            "SQLite stores encrypted content. Structural metadata, such as timestamps, counts, and topology, remains visible.",
        },
        {
          title: "Lock",
          description:
            "Locking or restarting discards the derived key. Trusted local integrations can use the native API while Atlas is unlocked.",
        },
      ],
    },
    technicalDetails: [
      "The server binds only to loopback. The browser and trusted local integrations share the native API while Atlas is unlocked.",
      "Typed payload validation, optimistic revisions, and cycle checks preserve the meaning of records, goal hierarchies, and prerequisites.",
      "Built-in Node.js SQLite and crypto keep the application dependency-free. Encrypted backups include record history, knowledge, and attachments.",
    ],
    limitation:
      "Encryption protects personal content at rest. Structural metadata remains visible, and an unlocked Atlas trusts local integrations. The passphrase cannot be recovered.",
    images: [
      {
        src: "/projects/atlas-goal.webp",
        alt: "Atlas goal progression with three connected demonstration subgoals and an overall progress indicator.",
        caption:
          "Live capture · Goal progression in a fresh demo database. Titles and progress are demonstration data.",
      },
      {
        src: "/projects/atlas-knowledge.webp",
        alt: "Atlas knowledge workspace with the seeded Subjects and Ideologies taxonomy and concept navigation.",
        caption:
          "Live capture · The seeded knowledge taxonomy in an isolated demo instance.",
      },
    ],
    links: [
      {
        label: "Explore the source",
        href: "https://github.com/J0hnDing/eidolon-atlas",
      },
    ],
  },
  {
    slug: "cubic",
    title: "Cubic",
    index: "03",
    accent: "#9badb7",
    description:
      "An Android game built with Unity, with a spare interface and colorful geometric scenes.",
    tagline: "Small screen. Geometric worlds.",
    category: "Game / Android",
    context:
      "Cubic explores a different kind of interface: a compact Android game built with Unity. The published screenshots show cubic forms, restrained color, and a small set of controls. The repository shares the game through an Android APK release.",
    stack: ["Unity", "Android", "APK"],
    features: [
      {
        title: "Geometric scenes",
        description:
          "The published gameplay images center colorful cubic forms in a dark, uncluttered space.",
      },
      {
        title: "A compact interface",
        description:
          "Level labels and icon controls frame the game in a portrait layout, leaving the scene as the visual focus.",
      },
      {
        title: "An Android release",
        description:
          "The public repository links to downloadable APK releases for Android.",
      },
    ],
    flow: null,
    technicalDetails: [
      "The README identifies Unity as the engine and Android as the target platform.",
      "The public repository contains the README and three screenshots; the downloadable game is distributed separately through GitHub Releases.",
    ],
    limitation:
      "The public repository shares screenshots and APK releases. Unity source files are not included, so the implementation details behind the game are not documented here.",
    images: [
      {
        src: "/projects/cubic-cover.webp",
        alt: "Three phone screens showing Cubic Levels 10, 1, and 19 with blue geometric platforms and coral and teal blocks.",
        caption: "Supplied image · Cubic Levels 10, 1, and 19.",
      },
      {
        src: "/projects/cubic-level.webp",
        alt: "Cubic Level 10 with blue geometric forms and coral and teal blocks, from the published README.",
        caption: "Published screenshot · Level 10, from Cubic's public README.",
      },
      {
        src: "/projects/cubic-menu.webp",
        alt: "Cubic Level 19 with a stepped blue geometric scene and colored blocks, from the published README.",
        caption: "Published screenshot · Level 19, from Cubic's public README.",
      },
    ],
    links: [
      { label: "View the project", href: "https://github.com/J0hnDing/Cubic" },
      {
        label: "Android releases",
        href: "https://github.com/J0hnDing/Cubic/releases",
      },
    ],
  },
  {
    slug: "projector",
    title: "Projector",
    index: "04",
    accent: "#bea79b",
    description:
      "A local project manager for AI-assisted development, keeping unfinished work, agent instructions, and accepted history close to the code.",
    tagline: "Fast-moving work. A memory that stays.",
    category: "Developer tool / Desktop",
    context:
      "When agents can implement quickly, understanding a project becomes its own challenge. Projector brings the README, instructions, TODOs, review proposals, working history, and Git activity into a focused desktop app. Its shared memory lives in readable Markdown beside the code.",
    stack: ["Tauri 2", "Rust", "React", "TypeScript", "Axum", "libgit2"],
    features: [
      {
        title: "Readable project memory",
        description:
          "README, AGENTS, startup instructions, TODOs, and working history stay in ordinary files that can be read, reviewed, and versioned with the project.",
      },
      {
        title: "Work with a clear next step",
        description:
          "Structured TODOs carry priorities, dependencies, rationale, and acceptance criteria. Project instructions and worker configurations keep agents aligned.",
      },
      {
        title: "Completion you can review",
        description:
          "Agents submit proposals through a local API. Completed work enters Pending Review before the user accepts it into project history.",
      },
    ],
    flow: {
      title: "An agent finishes. You decide what is accepted.",
      description:
        "The review boundary keeps reported completion separate from accepted project history. Rejecting a proposal leaves project Markdown unchanged.",
      steps: [
        {
          title: "Open work",
          description:
            "TODO.md stores prioritized, dependency-aware work alongside rationale and acceptance criteria.",
        },
        {
          title: "Agent works",
          description:
            "The agent completes the task in the repository and reports its summary and limitations through Projector's loopback API.",
        },
        {
          title: "Pending Review",
          description:
            "A completion proposal waits in a review queue. Submitting it does not immediately rewrite the project's accepted history.",
        },
        {
          title: "You approve",
          description:
            "The user reviews and approves the proposal. Rejection leaves the project Markdown unchanged.",
        },
        {
          title: "History persists",
          description:
            "Approved completion updates the TODO ledger and appends accepted work to WORK_HISTORY.md. The readable files remain authoritative.",
        },
      ],
    },
    technicalDetails: [
      "A React interface sits on a Rust/Tauri desktop backend. Axum exposes the local API used by coding agents.",
      "Validated registered roots bound filesystem operations. A filesystem watcher refreshes project state when files change.",
      "Git operations use libgit2. Pending proposals and application metadata stay local; canonical project state stays in Markdown.",
    ],
    limitation:
      "Projector is designed for local development. Project files stay authoritative, and agent-reported completion waits for user approval before becoming accepted history.",
    images: [
      {
        src: "/projects/projector-cover.webp",
        alt: "Projector's desktop interface showing the Personal-site overview, project counts, repository status, and project documents.",
        caption: "Supplied screenshot · Projector's project overview.",
      },
    ],
    links: [
      {
        label: "Explore the source",
        href: "https://github.com/J0hnDing/projector",
      },
    ],
  },
];

export const thoughts: Thought[] = [
  ["meaning-of-life", "What is the meaning of life?"],
  ["consciousness", "What is consciousness?"],
  ["what-am-i", "What am I?"],
  ["can-ai-think-and-feel", "Can AI think? Can AI feel?"],
  [
    "a-perfect-copy",
    "If your brain were copied perfectly, would the copy be you?",
  ],
  ["how-can-we-know", "How can we know?"],
  ["free-will", "Do we have free will?"],
  ["good-and-evil", "What is good and evil?"],
  ["does-god-exist", "Does God exist?"],
  [
    "ai-and-originality",
    "Can one claim originality of something made with AI?",
  ],
  [
    "something-rather-than-nothing",
    "Why is there something rather than nothing?",
  ],
  ["existence", "What is existence?"],
].map(([slug, title]) => ({
  slug,
  title,
  kind: "Question",
  isSample: false,
  excerpt: "",
  blocks: [],
}));
export const contacts: Contact[] = [
  { label: "Email", value: null, href: null },
  { label: "X / Twitter", value: null, href: null },
  { label: "WeChat", value: null, href: null },
  { label: "Instagram", value: null, href: null },
];

export const content: Content = {
  profile,
  projects,
  thoughts,
  contacts,
};

export default content;
