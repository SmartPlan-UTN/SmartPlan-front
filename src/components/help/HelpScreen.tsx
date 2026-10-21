import { PageKicker } from "@/components/layout";
import { Icon } from "@/components/ui";

import {
  FAQS,
  HELP_COPY,
  SUPPORT_EMAIL,
  USER_MANUAL_URL,
} from "./helpContent";
import styles from "./help.module.css";

const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
  "Consulta de soporte - smartplan",
)}`;

/**
 * Help and support: the user manual, frequently asked questions, and a
 * contact channel, reachable from the footer, the user menu, and the
 * suspended-account message on login.
 *
 * Each block carries the id `helpSectionRoute()` links to (`#manual`,
 * `#faq`, `#contact`). The FAQ uses native `<details>` so it stays a
 * server component: keyboard, screen-reader, and find-in-page support come
 * from the browser instead of hand-rolled accordion state.
 *
 * The manual and the mail are plain `<a>` on purpose: a PDF in `public/`
 * and a `mailto:` are not routes of the app, so `next/link` doesn't apply.
 */
export function HelpScreen() {
  return (
    <div className={styles.page}>
      <header className="sp-page-intro">
        <PageKicker>{HELP_COPY.kicker}</PageKicker>
        <h1 className="sp-page-title">
          {HELP_COPY.title}{" "}
          <span className="sp-page-title-accent">{HELP_COPY.titleAccent}</span>
        </h1>
        <p className="sp-page-lead">{HELP_COPY.lead}</p>
      </header>

      <div className={styles.cards}>
        <section
          id="manual"
          className={styles.card}
          aria-labelledby="help-manual-title"
        >
          <span className={styles.cardIcon} aria-hidden="true">
            <Icon name="book-open" size={20} />
          </span>
          <h2 id="help-manual-title" className="sp-h4">
            {HELP_COPY.manual.title}
          </h2>
          <p className={styles.cardBody}>{HELP_COPY.manual.body}</p>
          <a
            href={USER_MANUAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.action}
          >
            {HELP_COPY.manual.action}
            <Icon name="external-link" size={16} aria-hidden="true" />
          </a>
        </section>

        <section
          id="contact"
          className={styles.card}
          aria-labelledby="help-contact-title"
        >
          <span className={styles.cardIcon} aria-hidden="true">
            <Icon name="mail" size={20} />
          </span>
          <h2 id="help-contact-title" className="sp-h4">
            {HELP_COPY.contact.title}
          </h2>
          <p className={styles.cardBody}>{HELP_COPY.contact.body}</p>
          <p className={styles.email}>{SUPPORT_EMAIL}</p>
          <a href={SUPPORT_MAILTO} className={styles.action}>
            {HELP_COPY.contact.action}
            <Icon name="arrow-right" size={16} aria-hidden="true" />
          </a>
        </section>
      </div>

      <section
        id="faq"
        className={styles.faq}
        aria-labelledby="help-faq-title"
      >
        <h2 id="help-faq-title" className="sp-h3">
          {HELP_COPY.faq.title}
        </h2>
        <div className={styles.faqList}>
          {FAQS.map((item) => (
            <details key={item.question} className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                <span>{item.question}</span>
                <Icon
                  name="chevron-down"
                  size={18}
                  aria-hidden="true"
                  className={styles.faqChevron}
                />
              </summary>
              <p className={styles.faqAnswer}>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
