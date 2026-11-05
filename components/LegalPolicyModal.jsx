
'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { LEGAL_POLICIES } from '@/content/legal-policies';

import './LegalPolicyModal.css';

function PolicyParagraph({ content }) {
  if (typeof content === 'string') {
    return <p className="legal-paragraph">{content}</p>;
  }

  return (
    <p className="legal-paragraph">
      {content.map((segment, index) =>
        typeof segment === 'string' ? (
          <span key={index}>{segment}</span>
        ) : (
          <a
            key={index}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {segment.label}
          </a>
        )
      )}
    </p>
  );
}

function PolicyBulletList({ items }) {
  return (
    <ul className="legal-list">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

function PolicySubsection({ subsection }) {
  return (
    <div className="legal-subsection">
      <h4>{subsection.subheading}</h4>

      {subsection.paragraphs.map((paragraph, index) => (
        <PolicyParagraph key={index} content={paragraph} />
      ))}

      {subsection.bullets && (
        <PolicyBulletList items={subsection.bullets} />
      )}

      {subsection.paragraphsAfterBullets?.map((paragraph, index) => (
        <PolicyParagraph key={index} content={paragraph} />
      ))}
    </div>
  );
}

function PolicySection({ section }) {
  return (
    <section className="legal-section">
      <h3>{section.heading}</h3>

      {section.subsections?.map((subsection, index) => (
        <PolicySubsection
          key={index}
          subsection={subsection}
        />
      ))}

      {section.paragraphs?.map((paragraph, index) => (
        <PolicyParagraph key={index} content={paragraph} />
      ))}

      {section.bullets && (
        <PolicyBulletList items={section.bullets} />
      )}

      {section.paragraphsAfterBullets?.map((paragraph, index) => (
        <PolicyParagraph key={index} content={paragraph} />
      ))}

      {section.contactItems && (
        <div className="legal-contact">
          {section.contactItems.map((item, index) => (
            <p key={index}>
              <strong>{item.label}</strong>{' '}
              {item.href ? (
                <a href={item.href}>{item.value}</a>
              ) : (
                item.value
              )}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

function PolicyBody({ policy }) {
  return (
    <div className="legal-body">
      <div className="legal-intro">
        {policy.intro.map((paragraph, index) => (
          <PolicyParagraph key={index} content={paragraph} />
        ))}
      </div>

      {policy.sections.map((section, index) => (
        <PolicySection key={index} section={section} />
      ))}
    </div>
  );
}

export function LegalPolicyModal({ policyId, onClose }) {
  const policy = policyId ? LEGAL_POLICIES[policyId] : null;
const panelRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!policyId) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const previousFocus = document.activeElement;

    requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector('.legal-close')
        ?.focus();
    });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }

      if (event.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll(
          'button, a[href], [tabindex]:not([tabindex="-1"])'
        );

        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === last
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [policyId, onClose]);

  if (!policy) return null;

  return createPortal(
    <div
      className="legal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className="legal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="legal-glow legal-glow--top" />

        <header className="legal-header">
          <div>
            <p className="legal-eyebrow">{policy.eyebrow}</p>
            <h2 id={titleId}>{policy.title}</h2>
          </div>

<button
  type="button"
  className="legal-close"
  onClick={onClose}
  aria-label={`Close ${policy.title}`}
>
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
</button>
        </header>

        <div
          className="legal-scroll"
          data-lenis-prevent
          tabIndex={0}
          role="region"
          aria-label={`${policy.title} content`}
        >
          <PolicyBody policy={policy} />
        </div>
      </div>
    </div>,
    document.body
  );
}
