'use client';

import { useRef, useState } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { site } from '@/lib/content';
import { ArrowUpRight, Mail, Phone, Pin } from '../Icons';

const serviceOptions = ['AI Brand Films', 'Digital-First Content', 'AI-Powered Campaigns', 'Visual Identity Systems', '3D Websites'];

export default function ContactForm() {
  const root = useRef(null);
  const [sent, setSent] = useState(false);

  useGSAP(
    () => {
      gsap.from('.form, .info > *', {
        y: 60,
        opacity: 0,
        rotateX: 12,
        transformPerspective: 1000,
        stagger: 0.1,
        duration: 1.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: root.current, start: 'top 85%' },
      });
    },
    { scope: root }
  );

  const submit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const body = [
      `Name: ${data.name}`,
      `Email: ${data.email}`,
      `Phone: ${data.phone}`,
      `Company: ${data.company}`,
      `Service: ${data.service}`,
      '',
      data.message,
    ].join('\n');
    window.location.href = `mailto:${site.email}?subject=${encodeURIComponent(
      `New project enquiry — ${data.name}`
    )}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  return (
    <section ref={root} className="contact">
      <div className="container contact__grid">
        <form className="form" onSubmit={submit}>
          <div className="form__head">
            <h2>Start Your Project</h2>
            <span className="mono">All fields required</span>
          </div>
          <div className="form__row">
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" name="name" required autoComplete="name" />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required autoComplete="email" />
            </div>
          </div>
          <div className="form__row">
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" type="tel" required autoComplete="tel" />
            </div>
            <div className="field">
              <label htmlFor="company">Company</label>
              <input id="company" name="company" required autoComplete="organization" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="service">What do you need?</label>
            <select id="service" name="service" required defaultValue="">
              <option value="" disabled>
                Select a service
              </option>
              {serviceOptions.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="message">Tell us about your project</label>
            <textarea id="message" name="message" required />
          </div>
          <button className="btn btn--gold" type="submit">
            Send transmission <ArrowUpRight />
          </button>
          {sent && <p className="form__ok">Your mail app should open with the details — we respond within 24 hours.</p>}
        </form>

        <aside className="info">
          <p className="mono">24h response</p>
          <a className="info__card" href={`mailto:${site.email}`}>
            <span className="info__icon">
              <Mail />
            </span>
            <span>
              <small>Email</small>
              <p>{site.email}</p>
            </span>
          </a>
          <a className="info__card" href={site.phoneHref}>
            <span className="info__icon">
              <Phone />
            </span>
            <span>
              <small>Phone</small>
              <p>{site.phone}</p>
            </span>
          </a>
          <div className="info__card">
            <span className="info__icon">
              <Pin />
            </span>
            <span>
              <small>Location</small>
              <p>{site.address}</p>
            </span>
          </div>
          <figure className="info__quote">
            <blockquote>
              “Where human creativity meets artificial precision, we craft experiences that define the future.”
            </blockquote>
            <cite>— Contenaissance Studio</cite>
          </figure>
        </aside>
      </div>
    </section>
  );
}
