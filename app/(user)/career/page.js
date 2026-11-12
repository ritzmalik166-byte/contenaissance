
"use client";

import { useState } from "react";
import "./career.css";

const jobs = [
  "Full Stack Developer",
  "AI Video Generation Artist",
  "Sales Executive - Media Agency",
  "Media Sales Manager",
  "Media Influencer Coordinator",
  "SEO Executive",
  "SEO Intern",
  "Marketing Executive",
  "Content Creator Lifestyle",
  "Video Editor - CGI Specialist",
  "Social Media Executive (SPOC)",
  "Senior Video Editor",
  "UI/UX Designer",
  "Frontend Developer",
  "Backend Developer",
];

export default function CareerPage() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [positionOpen, setPositionOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState("");

  // Handle mouse wheel scrolling inside the dropdown
const handleDropdownWheel = (event) => {
  const dropdown = event.currentTarget;

  dropdown.scrollTop += event.deltaY;

  event.preventDefault();
  event.stopPropagation();
};

  // Handle application submission
const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedJob) {
      setMessage("Please choose a position.");
      setMessageType("error");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/careers/submit", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Unable to submit your application."
        );
      }

      setMessage(
        "Thank you! Your application has been submitted successfully."
      );

      setMessageType("success");

      form.reset();
      setSelectedJob("");
      setPositionOpen(false);

    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );

      setMessageType("error");

    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="career-page">
      <div className="career-container">

        {/* LEFT SECTION */}

        <section className="career-left">
          <span className="career-tag">CAREERS</span>

          <h1>
            Create What's Next.
            <br />
            <span>Make an Impact.</span>
          </h1>

          <p className="career-intro">
            At Contenaissance, we bring creativity, technology, and
            artificial intelligence together to build meaningful
            digital experiences.
          </p>

          <div className="career-highlight">
            <span className="career-highlight-label">
              JOIN THE CREATIVE REVOLUTION
            </span>

            <h2>Great ideas start with great people.</h2>

            <p>
              We're looking for curious minds, creative thinkers,
              and passionate professionals who want to challenge
              conventions, explore new possibilities, and create
              work that makes a difference.
            </p>

            <div className="career-tags">
              <span>AI & Technology</span>
              <span>Creative & Design</span>
              <span>Marketing</span>
              <span>Video Production</span>
              <span>Design & Development</span>
            </div>
          </div>

          <div className="career-note">
            <span>HAVE A DIFFERENT SKILL SET?</span>

            <p>We would still love to hear from you.</p>

            <a href="mailto:info@ritzmediaworld.com">
              Connect with us ↗
            </a>
          </div>
        </section>

        {/* RIGHT FORM SECTION */}

        <section className="career-form-wrapper">

          <div className="career-form-header">
            <div>
              <span>CAREER OPPORTUNITY</span>
              <h2>Let's work together.</h2>
            </div>

            <p>
              Fields marked <b>*</b> are required
            </p>
          </div>

          <form
            className="career-form"
            onSubmit={handleSubmit}
          >
            <div className="career-form-grid">

              {/* FULL NAME */}

              <div className="career-field">
                <label htmlFor="fullName">
                  FULL NAME <b>*</b>
                </label>

                <input
                  id="fullName"
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {/* EMAIL */}

              <div className="career-field">
                <label htmlFor="email">
                  EMAIL ADDRESS <b>*</b>
                </label>

                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Enter your email address"
                  required
                />
              </div>

              {/* PHONE */}

              <div className="career-field">
                <label htmlFor="phone">
                  PHONE NUMBER <b>*</b>
                </label>

                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  placeholder="Enter your phone number"
                  required
                />
              </div>

              {/* CUSTOM POSITION DROPDOWN */}

              <div className="career-field career-position-field">

                <label htmlFor="position">
                  APPLYING FOR <b>*</b>
                </label>

                {/* Value submitted to API */}

                <input
                  type="hidden"
                  name="jobId"
                  value={selectedJob}
                />

                <div className="career-custom-select">

                  <button
                    type="button"
                    id="position"
                    className={`career-select-trigger ${
                      positionOpen ? "active" : ""
                    }`}
                    onClick={() =>
                      setPositionOpen((prev) => !prev)
                    }
                    aria-expanded={positionOpen}
                    aria-haspopup="listbox"
                  >
                    <span>
                      {selectedJob || "Choose a position"}
                    </span>

                    <span className="career-select-arrow">
                      ⌄
                    </span>
                  </button>

                  {positionOpen && (
                    <div
                      className="career-options-list"
                      role="listbox"
                      aria-label="Available positions"
                      onWheel={handleDropdownWheel}
                    >
                      {jobs.map((job) => (
                        <button
                          type="button"
                          role="option"
                          aria-selected={selectedJob === job}
                          key={job}
                          className={`career-option ${
                            selectedJob === job ? "selected" : ""
                          }`}
                          onClick={() => {
                            setSelectedJob(job);
                            setPositionOpen(false);
                          }}
                        >
                          {job}
                        </button>
                      ))}
                    </div>
                  )}

                </div>
              </div>

            </div>

            {/* RESUME UPLOAD */}

            <div className="career-field career-upload-field">

              <label htmlFor="resume">
                UPLOAD RESUME <b>*</b>
              </label>

              <label
                className="career-upload"
                htmlFor="resume"
              >
                <span className="career-upload-icon">
                  ↑
                </span>

                <span>
                  <strong>Upload your resume</strong>

                  <small>
                    PDF, DOC or DOCX · Maximum 10 MB
                  </small>
                </span>
              </label>

              <input
                id="resume"
                className="career-file-input"
                type="file"
                name="resume"
                accept=".pdf,.doc,.docx"
                required
              />

            </div>

            {/* COVER LETTER */}

            <div className="career-field">

              <label htmlFor="message">
                TELL US ABOUT YOURSELF <b>*</b>
              </label>

              <textarea
                id="message"
                name="coverLetter"
                placeholder="Tell us about your experience, skills and what you bring to the team..."
                rows={4}
                required
              />

            </div>

            {/* SUBMIT */}

            <div className="career-submit">

              <button
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? "Submitting..."
                  : "Submit Application"}

                {!submitting && <span>↗</span>}
              </button>

              <p>
                Your information will only be shared
                with our hiring team.
              </p>

            </div>

            {/* SUCCESS / ERROR MESSAGE */}

            {message && (
              <p
                className={`career-message ${messageType}`}
                role="status"
                aria-live="polite"
              >
                {message}
              </p>
            )}

          </form>

        </section>

      </div>
    </main>
  );
}
