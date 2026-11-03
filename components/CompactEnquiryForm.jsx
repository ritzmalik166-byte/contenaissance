
'use client';

import { useEffect, useId, useState } from 'react';
import { ArrowUpRight } from './Icons';
import './CompactEnquiryForm.css';

const serviceOptions = [
  'AI Brand Films',
  'Digital-First Content',
  'AI-Powered Campaigns',
  'Visual Identity Systems',
  '3D Websites',
];

const countries = ['India', 'UAE', 'UK', 'Singapore', 'USA'];

export default function CompactEnquiryForm({
  variant = 'sidebar',
  open = false,
  onClose,
}) {
  const id = useId();

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const isPopup = variant === 'popup';

  useEffect(() => {
    if (!isPopup || !open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPopup, open, loading, onClose]);

  const resetForm = () => {
    setOtpSent(false);
    setOtp('');
    setFormData(null);
    setLoading(false);
    setError('');
    setSent(false);
  };

  const closePopup = () => {
    if (loading) return;

    resetForm();
    onClose?.();
  };

  const submit = async (event) => {
    event.preventDefault();

    if (loading || otpSent || sent) return;

    const data = Object.fromEntries(
      new FormData(event.currentTarget)
    );

    setFormData(data);
    setError('');
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

      resetForm();
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

  if (isPopup && !open) return null;

  return (
    <div
      className={[
        'compact-enquiry',
        isPopup ? 'compact-enquiry--popup' : 'compact-enquiry--sidebar',
      ].join(' ')}
      onMouseDown={(event) => {
        if (
          isPopup &&
          event.target === event.currentTarget &&
          !otpSent
        ) {
          closePopup();
        }
      }}
    >
      <div
        className="compact-enquiry__panel"
        role={isPopup ? 'dialog' : undefined}
        aria-modal={isPopup ? 'true' : undefined}
        aria-labelledby={`${id}-title`}
      >
        {isPopup && (
          <button
            className="compact-enquiry__close"
            type="button"
            onClick={closePopup}
            disabled={loading}
            aria-label="Close enquiry form"
          >
            ×
          </button>
        )}

        {!otpSent ? (
          <>
            <h2
              className="compact-enquiry__title"
              id={`${id}-title`}
            >
              {sent ? 'Thank You!' : 'Start Your Project'}
            </h2>

            {sent ? (
              <div className="compact-enquiry__success" role="status">
                Your enquiry has been submitted successfully.
                We will respond within 24 hours.
                <button
                  className="compact-enquiry__button"
                  type="button"
                  onClick={resetForm}
                >
                  Send another enquiry
                  <ArrowUpRight />
                </button>
              </div>
            ) : (
              <>
                <p className="compact-enquiry__intro">
                  Tell us a little about your project. We'll be in touch.
                </p>

                <form
                  className="compact-enquiry__form"
                  onSubmit={submit}
                >
                  <div className="compact-enquiry__field">
                    <label htmlFor={`${id}-name`}>Full name</label>
                    <input
                      id={`${id}-name`}
                      name="name"
                      autoComplete="name"
                      placeholder="Your name"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="compact-enquiry__field">
                    <label htmlFor={`${id}-email`}>Email address</label>
                    <input
                      id={`${id}-email`}
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="compact-enquiry__field">
                    <label htmlFor={`${id}-phone`}>Phone number</label>
                    <input
                      id={`${id}-phone`}
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="Phone number"
                      pattern="[0-9+\s()-]{7,20}"
                      title="Enter a valid phone number."
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="compact-enquiry__field">
                    <label htmlFor={`${id}-country`}>Country</label>
                    <select
                      id={`${id}-country`}
                      name="country"
                      defaultValue=""
                      required
                      disabled={loading}
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

                  <div className="compact-enquiry__field">
                    <label htmlFor={`${id}-service`}>Service required</label>
                    <select
                      id={`${id}-service`}
                      name="service"
                      defaultValue=""
                      required
                      disabled={loading}
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

                  <div className="compact-enquiry__field">
                    <label htmlFor={`${id}-message`}>
                      Project details
                    </label>
                    <textarea
                      id={`${id}-message`}
                      name="message"
                      placeholder="Tell us about your project..."
                      rows={3}
                      required
                      disabled={loading}
                    />
                  </div>

                  {error && (
                    <p className="compact-enquiry__error" role="alert">
                      {error}
                    </p>
                  )}

                  <button
                    className="compact-enquiry__button"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Sending OTP...' : 'Send Enquiry'}
                    {!loading && <ArrowUpRight />}
                  </button>
                </form>
              </>
            )}
          </>
        ) : (
          <div className="compact-enquiry__verification">
            <p className="compact-enquiry__eyebrow">
              VERIFICATION REQUIRED
            </p>

            <h2 className="compact-enquiry__title" id={`${id}-title`}>
              Verify your number
            </h2>

            <p className="compact-enquiry__intro">
              Enter the 4-digit OTP sent to {formData?.phone}.
            </p>

            <div className="compact-enquiry__field">
              <label htmlFor={`${id}-otp`}>One-time password</label>
              <input
                id={`${id}-otp`}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Enter 4-digit OTP"
                maxLength={4}
                value={otp}
                onChange={(event) =>
                  setOtp(
                    event.target.value.replace(/\D/g, '').slice(0, 4)
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    verifyAndSubmit();
                  }
                }}
                autoFocus
                disabled={loading}
              />
            </div>

            {error && (
              <p className="compact-enquiry__error" role="alert">
                {error}
              </p>
            )}

            <button
              className="compact-enquiry__button"
              type="button"
              onClick={verifyAndSubmit}
              disabled={loading || otp.length !== 4}
            >
              {loading ? 'Please wait...' : 'Verify & Submit'}
              {!loading && <ArrowUpRight />}
            </button>

            <button
              className="compact-enquiry__text-button"
              type="button"
              onClick={closePopup}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
