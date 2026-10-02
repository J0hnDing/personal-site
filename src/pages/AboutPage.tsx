import { Link } from "react-router-dom";
import { contacts, profile } from "../content";
import LineRevealText from "../components/LineRevealText";
import ScrambleText from "../components/ScrambleText";
import { ArchiveHeading, ArchiveRow } from "./ArchiveLayout";

export default function AboutContent({ motionOff }: { motionOff: boolean }) {
  return (
    <>
      <ArchiveHeading
        title="About"
        eyebrow={profile.name}
        motionOff={motionOff}
      />
      <div className="archive-about-intro">
        <LineRevealText text={profile.intro} motionOff={motionOff} />
        <figure className="archive-portrait">
          <img
            src={`${import.meta.env.BASE_URL}john-portrait.webp`}
            alt="John beside a mountain lake"
            width="750"
            height="1000"
          />
        </figure>
      </div>
      <div className="archive-about-sections">
        <section>
          <LineRevealText as="h2" text="What I work on" motionOff={motionOff} />
          <div>
            <LineRevealText
              text="My interests sit around machine learning and AI agents. I’m especially interested in how agents can help with everyday life, and what it takes for them to act autonomously, safely, and reliably."
              motionOff={motionOff}
            />
            <LineRevealText
              text="This site brings together the things I build, the photographs I take, and the questions I keep returning to."
              motionOff={motionOff}
            />
          </div>
        </section>
        <section>
          <LineRevealText
            as="h2"
            text="Away from the screen"
            motionOff={motionOff}
          />
          <div>
            <LineRevealText
              text="Outside of computer science, I spend time on photography, tennis, and piano. I’m also a beginner in Brazilian jiu-jitsu."
              motionOff={motionOff}
            />
            <LineRevealText
              text="I’m interested in philosophy, particularly questions about consciousness, identity, knowledge, and what it means to live well. Thoughts is a place for those questions as I work through them."
              motionOff={motionOff}
            />
          </div>
        </section>
        <section
          id="contact"
          className="archive-about-contact"
          aria-labelledby="about-contact-title"
        >
          <h2 id="about-contact-title">
            <LineRevealText as="span" text="Contact" motionOff={motionOff} />
          </h2>
          <dl className="archive-contact-list">
            {contacts.map((contact) => (
              <div className="archive-contact-row" key={contact.label}>
                <dt>{contact.label}</dt>
                <dd>
                  {contact.href ? (
                    <a
                      href={contact.href}
                      target={contact.label === "Email" ? undefined : "_blank"}
                      rel={contact.label === "Email" ? undefined : "noreferrer"}
                    >
                      <ScrambleText
                        text={contact.value || "Connect"}
                        motionOff={motionOff}
                      />
                      <span aria-hidden="true">↗</span>
                    </a>
                  ) : (
                    <span
                      className={
                        contact.value
                          ? undefined
                          : "archive-contact-placeholder"
                      }
                    >
                      {contact.value || "Details to be added"}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <nav aria-label="Explore my work">
        <ul className="archive-list">
          <ArchiveRow
            to="/projects"
            title="Projects"
            meta="Things I build"
            motionOff={motionOff}
          />
          <ArchiveRow
            to="/gallery"
            title="Gallery"
            meta="Photography collections"
            motionOff={motionOff}
          />
          <ArchiveRow
            to="/thoughts"
            title="Thoughts"
            meta="Questions I’m exploring"
            motionOff={motionOff}
          />
        </ul>
      </nav>
      <Link to="/" className="archive-back mono">
        ← <ScrambleText text="Home" motionOff={motionOff} />
      </Link>
    </>
  );
}
