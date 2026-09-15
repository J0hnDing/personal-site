/**
 * The editable content for the portfolio.
 *
 * Project facts, photography, and contact details are intentionally left
 * empty until they are supplied by John.
 */

export type ProjectIndex = "01" | "02" | "03" | "04";

export interface Profile {
  name: string;
  tagline: { lead: string; emphasis: string };
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
}

export interface PhotographyItem {
  id: string;
  src: string;
  alt: string;
  title: string;
  caption: string;
  width: number;
  height: number;
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
  photography: PhotographyItem[];
  thoughts: Thought[];
  contacts: Contact[];
}

export const profile: Profile = {
  name: "John Ding",
  tagline: { lead: "Finding beauty", emphasis: "in the logic." },
  intro:
    "I’m John Ding. My studies draw me to mathematics; my projects explore software. This is where I collect what I build, photograph, and think about.",
  introIsDraft: true,
};

export const projects: Project[] = [
  {
    slug: "eidolon",
    title: "Eidolon",
    index: "01",
    accent: "#b2c2b7",
    description: null,
    context: null,
    technicalDetails: [],
    images: [],
    links: [],
  },
  {
    slug: "eidolon-atlas",
    title: "Eidolon Atlas",
    index: "02",
    accent: "#b5b1c7",
    description: null,
    context: null,
    technicalDetails: [],
    images: [],
    links: [],
  },
  {
    slug: "cubic",
    title: "Cubic",
    index: "03",
    accent: "#9badb7",
    description: null,
    context: null,
    technicalDetails: [],
    images: [],
    links: [],
  },
  {
    slug: "projector",
    title: "Projector",
    index: "04",
    accent: "#bea79b",
    description: null,
    context: null,
    technicalDetails: [],
    images: [],
    links: [],
  },
];

export const photography: PhotographyItem[] = [];

export const thoughts: Thought[] = [
  {
    slug: "on-noticing",
    title: "On noticing",
    kind: "Sample thought",
    isSample: true,
    excerpt:
      "A temporary sample to show the reading rhythm and typographic hierarchy of a thought page.",
    blocks: [
      { type: "heading", text: "Sample only" },
      {
        type: "paragraph",
        text: "Noticing begins as a small interruption: a change in light, a loose thread, a question that refuses to leave.",
      },
      {
        type: "quote",
        text: "The ordinary keeps its shape until we look at it long enough.",
      },
      {
        type: "paragraph",
        text: "This short passage is a typography sample, not an authored thought. Replace it with your own writing when the site is ready.",
      },
    ],
  },
];

export const contacts: Contact[] = [
  { label: "Email", value: null, href: null },
  { label: "X / Twitter", value: null, href: null },
  { label: "WeChat", value: null, href: null },
  { label: "Instagram", value: null, href: null },
];

export const content: Content = {
  profile,
  projects,
  photography,
  thoughts,
  contacts,
};

export default content;
