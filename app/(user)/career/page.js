
"use client";

import { useState } from "react";
import "./career.css";

const jobs = [
  "Lead Front-End Engineer",
  "Machine Learning Researcher",
  "Product Manager",
  "AI Developer",
  "UI/UX Designer",
  "Video & Creative Producer",
  "Marketing & Strategy",
  "Other",
];

export default function CareerPage() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

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

        <section className="career-left">
          <span className="career-tag">CAREERS</span>

          <h1>
            Create what’s
            <br />
            <span>next with us.</span>
          </h1>

          <p className="career-intro">
            At Contenaissance, creativity meets technology.
            We bring ideas to life through AI, storytelling
            and extraordinary digital experiences.
            Join our team and help shape the future.
          </p>

          <div className="career-highlight">
            <span className="career-highlight-label">
              JOIN THE CREATIVE REVOLUTION
            </span>

            <h2>Great ideas start with great people.</h2>

            <p>
              We're always looking for passionate people
              who think differently, experiment fearlessly
              and love creating meaningful experiences.
            </p>

            <div className="career-tags">
              <span>AI & Technology</span>
              <span>Creative & Design</span>
              <span>Marketing</span>
              <span>Video Production</span>
              <span>Development</span>
            </div>
          </div>

          <div className="career-note">
            <span>HAVE A DIFFERENT SKILL SET?</span>
            <p>We would still love to hear from you.</p>
            <a href="mailto:hr@contenaissance.com">
              Connect with us ↗
            </a>
          </div>
        </section>

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

              <div className="career-field">
                <label htmlFor="position">
                  APPLYING FOR <b>*</b>
                </label>
                <select
                  id="position"
                  name="jobId"
                  defaultValue=""
                  required
                >
                  <option value="" disabled>
                    Choose a position
                  </option>

                  {jobs.map((job) => (
                    <option key={job} value={job}>
                      {job}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            <div className="career-field career-upload-field">
              <label htmlFor="resume">
                UPLOAD RESUME <b>*</b>
              </label>

              <label className="career-upload" htmlFor="resume">
                <span className="career-upload-icon">↑</span>

                <span>
                  <strong>Upload your resume</strong>
                  <small>PDF, DOC or DOCX · Maximum 10 MB</small>
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

            <div className="career-submit">
              <button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Application"}
                {!submitting && <span>↗</span>}
              </button>

              <p>
                Your information will only be shared
                with our hiring team.
              </p>

              {message && (
                <p
                  className={`career-message ${messageType}`}
                  role="status"
                  aria-live="polite"
                >
                  {message}
                </p>
              )}
            </div>

          </form>
        </section>

      </div>
    </main>
  );
}
