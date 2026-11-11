
import Link from "next/link";
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
  return (
    <main className="career-page">
      <div className="career-container">

        {/* LEFT CONTENT */}
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

            <h2>
              Great ideas start with great people.
            </h2>

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
            <p>
              We would still love to hear from you.
            </p>
            <a href="mailto:hr@contenaissance.com">
              Connect with us ↗
            </a>
          </div>
        </section>

        {/* RIGHT APPLICATION FORM */}
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
            action="/api/careers"
            method="POST"
            encType="multipart/form-data"
          >
            <div className="career-form-grid">

              <div className="career-field">
                <label htmlFor="fullName">
                  FULL NAME <b>*</b>
                </label>
                <input
                  id="fullName"
                  type="text"
                  name="fullName"
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
                  name="position"
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

            {/* RESUME */}
            <div className="career-field career-upload-field">
              <label htmlFor="resume">
                UPLOAD RESUME <b>*</b>
              </label>

              <label className="career-upload" htmlFor="resume">
                <span className="career-upload-icon">↑</span>

                <span>
                  <strong>Upload your resume</strong>
                  <small>PDF, DOC or DOCX · Maximum 5 MB</small>
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

            {/* MESSAGE */}
            <div className="career-field">
              <label htmlFor="message">
                TELL US ABOUT YOURSELF <b>*</b>
              </label>

              <textarea
                id="message"
                name="message"
                placeholder="Tell us about your experience, skills and what you bring to the team..."
                rows={4}
                required
              />
            </div>

            {/* SUBMIT */}
            <div className="career-submit">
              <button type="submit">
                Submit Application <span>↗</span>
              </button>

              <p>
                Your information will only be shared
                with our hiring team.
              </p>
            </div>

          </form>
        </section>

      </div>
    </main>
  );
}
