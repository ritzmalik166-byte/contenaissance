
'use client';

import { useRef, useState } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { site } from '@/lib/content';
import { ArrowUpRight, Mail, Phone, Pin } from '../Icons';

const serviceOptions = [
  'AI Brand Films',
  'Digital-First Content',
  'AI-Powered Campaigns',
  'Visual Identity Systems',
  '3D Websites',
];

const countries = ['India', 'UAE', 'UK', 'Singapore', 'USA'];

export default function ContactForm() {
  const root = useRef(null);
  const formRef = useRef(null);

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useGSAP(() => {
    gsap.from('.form, .info > *', {
      y: 60,
      opacity: 0,
      rotateX: 12,
      transformPerspective: 1000,
      stagger: 0.1,
      duration: 1.1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: root.current,
        start: 'top 85%',
      },
    });
  }, { scope: root });

  const submit = async (e) => {
    e.preventDefault();

    if (loading) return;

    const data = Object.fromEntries(
      new FormData(e.currentTarget)
    );

    setFormData(data);
    setError('');
    setSent(false);
    setLoading(true);

    try {
      const response = await fetch('/api/otp-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          phone: data.phone,
          country: data.country,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Unable to send OTP.');
      }

      setOtp('');
      setOtpSent(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to send OTP. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyAndSubmit = async () => {
    if (!formData || otp.length !== 4 || loading) return;

    setError('');
    setLoading(true);

    try {
      const verifyResponse = await fetch('/api/otp-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          phone: formData.phone,
          country: formData.country,
          otp,
        }),
      });

      const verifyResult = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(
          verifyResult.error || 'OTP verification failed.'
        );
      }

      const enquiryResponse = await fetch('/api/enquiry-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.name,
          email: formData.email,
          contactNumber: formData.phone,
          subject: formData.service,
          message: `Country: ${formData.country}\n\n${formData.message}`,
        }),
      });

      const enquiryResult = await enquiryResponse.json();

      if (!enquiryResponse.ok) {
        throw new Error(
          enquiryResult.error || 'Unable to submit your enquiry.'
        );
      }

      // Close the OTP popup and clear every form field.
      formRef.current?.reset();
      setOtpSent(false);
      setOtp('');
      setFormData(null);
      setError('');
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const closeOtpPopup = () => {
    if (loading) return;
    setOtpSent(false);
    setOtp('');
    setFormData(null);
    setError('');
  };

  return (
    <section ref={root} className="contact">
      <div className="container contact__grid">
        <form
          ref={formRef}
          className="form"
          onSubmit={submit}
        >
          <div className="form__head">
            <h2>Start Your Project</h2>
            <span className="mono">All fields required</span>
          </div>

          <div className="form__row">
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                name="name"
                required
                autoComplete="name"
                disabled={otpSent || loading}
              />
            </div>

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                disabled={otpSent || loading}
              />
            </div>
          </div>

          <div className="form__row">
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                pattern="[0-9+\s()-]{7,20}"
                title="Enter a valid phone number."
                disabled={otpSent || loading}
              />
            </div>

            <div className="field">
              <label htmlFor="country">
                Country <span className="required">*</span>
              </label>

              <select
                id="country"
                name="country"
                required
                defaultValue=""
                disabled={otpSent || loading}
              >
                <option value="" disabled>
                  Select country
                </option>

                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="service">What do you need?</label>
            <select
              id="service"
              name="service"
              required
              defaultValue=""
              disabled={otpSent || loading}
            >
              <option value="" disabled>
                Select a service
              </option>

              {serviceOptions.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="message">
              Tell us about your project
            </label>
            <textarea
              id="message"
              name="message"
              required
              disabled={otpSent || loading}
            />
          </div>

          {!sent && (
            <button
              className="btn btn--gold"
              type="submit"
              disabled={loading || otpSent}
            >
              {loading ? 'Sending OTP...' : 'Send transmission'}
              {!loading && <ArrowUpRight />}
            </button>
          )}

          {error && !otpSent && (
            <p className="form__error" role="alert">
              {error}
            </p>
          )}

          {sent && (
            <p className="form__ok" role="status">
              Your enquiry has been submitted successfully.
              We will respond within 24 hours.
            </p>
          )}
        </form>

        <aside className="info">
          <p className="mono">24h response</p>

          <a className="info__card" href={`mailto:${site.email}`}>
            <span className="info__icon"><Mail /></span>
            <span>
              <small>Email</small>
              <p>{site.email}</p>
            </span>
          </a>

          <a className="info__card" href={site.phoneHref}>
            <span className="info__icon"><Phone /></span>
            <span>
              <small>Phone</small>
              <p>{site.phone}</p>
            </span>
          </a>

          <div className="info__card">
            <span className="info__icon"><Pin /></span>
            <span>
              <small>Location</small>
              <p>{site.address}</p>
            </span>
          </div>

          <figure className="info__quote">
            <blockquote>
              “Where human creativity meets artificial precision,
              we craft experiences that define the future.”
            </blockquote>
            <cite>Contenaissance Studio</cite>
          </figure>
        </aside>
      </div>

      {/* OTP popup */}
      {otpSent && (
        <div
          className="otp-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeOtpPopup();
          }}
        >
          <div
            className="otp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="otp-title"
          >
            <button
              type="button"
              className="otp-close"
              onClick={closeOtpPopup}
              disabled={loading}
              aria-label="Close OTP popup"
            >
              ×
            </button>

            <div className="otp-modal__icon">✉</div>

            <p className="mono">VERIFICATION REQUIRED</p>
            <h2 id="otp-title">Verify your number</h2>

            <p className="otp-description">
              Enter the 4-digit OTP sent to {formData?.phone}.
            </p>

            <div className="field otp-field">
              <label htmlFor="otp">One-time password</label>
              <input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="••••"
                maxLength={4}
                value={otp}
                onChange={(e) =>
                  setOtp(
                    e.target.value.replace(/\D/g, '').slice(0, 4)
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    verifyAndSubmit();
                  }
                }}
                autoFocus
                disabled={loading}
              />
            </div>

            {error && (
              <p className="form__error" role="alert">
                {error}
              </p>
            )}

            <button
              className="btn btn--gold otp-submit"
              type="button"
              onClick={verifyAndSubmit}
              disabled={loading || otp.length !== 4}
            >
              {loading ? 'Please wait...' : 'Verify & Submit'}
              {!loading && <ArrowUpRight />}
            </button>

            <button
              className="otp-cancel"
              type="button"
              onClick={closeOtpPopup}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
