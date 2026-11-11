
"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import "@/app/(admin)/admin/dashboard/careers/careers.css";

type CareerApplication = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  job_id: string;
  cover_letter?: string | null;
  resume_name?: string;
  status: string;
  created_at: string;
};

type CareerResponse = {
  data: CareerApplication[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type EditForm = {
  name: string;
  email: string;
  phone: string;
  job_id: string;
  cover_letter: string;
  status: string;
};

const fetcher = async (url: string): Promise<CareerResponse> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to load applications");
  return response.json();
};

const statuses = ["new", "reviewed", "interview", "rejected", "hired"];

export default function CareersAdmin() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [selected, setSelected] = useState<CareerApplication | null>(null);
  const [editing, setEditing] = useState<CareerApplication | null>(null);
  const [deleting, setDeleting] = useState<CareerApplication | null>(null);

  const [saving, setSaving] = useState(false);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const [form, setForm] = useState<EditForm>({
    name: "",
    email: "",
    phone: "",
    job_id: "",
    cover_letter: "",
    status: "new",
  });

  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  const { data, error, isLoading, mutate } = useSWR<CareerResponse>(
    `/api/careers/list?page=${page}&limit=20&search=${encodeURIComponent(debouncedSearch)}`,
    fetcher,
    { keepPreviousData: true }
  );

  const applications = data?.data ?? [];
  const pagination = data?.pagination;

  const openEdit = (app: CareerApplication) => {
    setEditing(app);
    setActionError("");

    setForm({
      name: app.name,
      email: app.email,
      phone: app.phone ?? "",
      job_id: app.job_id,
      cover_letter: app.cover_letter ?? "",
      status: app.status,
    });
  };

  const updateStatus = async (id: number, status: string) => {
    setUpdatingId(id);
    setActionError("");

    try {
      const response = await fetch(`/api/careers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to update status");
      }

      await mutate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;

    setSaving(true);
    setActionError("");

    try {
      const response = await fetch(`/api/careers/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          job_id: form.job_id,
          cover_letter: form.cover_letter,
          status: form.status,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to update application");
      }

      setEditing(null);
      await mutate();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Update failed"
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteApplication = async () => {
    if (!deleting) return;

    setDeletingLoading(true);
    setActionError("");

    try {
      const response = await fetch(`/api/careers/${deleting.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to delete application");
      }

      setDeleting(null);
      setSelected(null);

      await mutate();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Delete failed"
      );
    } finally {
      setDeletingLoading(false);
    }
  };

  if (isLoading && !data) {
    return <div className="careers-loading">Loading applications...</div>;
  }

  if (error && !data) {
    return (
      <div className="careers-error">
        Failed to load applications. Please refresh the page.
      </div>
    );
  }

  return (
    <main className="careers-admin">
      <div className="careers-toolbar">
        <input
          type="search"
          placeholder="Search by name or email..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />

        <div className="careers-total">
          <span>Total Applications</span>
          <strong>{pagination?.total ?? 0}</strong>
        </div>
      </div>

      <div className="careers-table-wrapper">
        <table className="careers-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Position</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {applications.map((app) => (
              <tr key={app.id}>
                <td><strong>{app.name}</strong></td>
                <td>{app.job_id}</td>
                <td>{app.email}</td>
                <td>{app.phone || "N/A"}</td>

                <td>
                  <select
                    className={`careers-status status-${app.status}`}
                    value={app.status}
                    disabled={updatingId === app.id}
                    onChange={(event) =>
                      updateStatus(app.id, event.target.value)
                    }
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </td>

                <td>
                  {new Date(app.created_at).toLocaleDateString()}
                </td>

                <td>
                  <div className="careers-actions">
                    <button
                      type="button"
                      className="careers-view-button"
                      onClick={() => setSelected(app)}
                    >
                      View
                    </button>

                    <button
                      type="button"
                      className="careers-edit-button"
                      onClick={() => openEdit(app)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="careers-delete-button"
                      onClick={() => {
                        setActionError("");
                        setDeleting(app);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {applications.length === 0 && (
              <tr>
                <td colSpan={7} className="careers-empty">
                  No applications found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="careers-pagination">
        <span>
          Page {page} of {pagination?.pages ?? 1}
        </span>

        <div>
          <button
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </button>

          <button
            disabled={!pagination || page >= pagination.pages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      </footer>

      {/* VIEW MODAL */}
      {selected && (
        <div
          className="career-modal-overlay"
          onClick={() => setSelected(null)}
        >
          <section
            className="career-details-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="career-details-header">
              <div>
                <span>APPLICANT DETAILS</span>
                <h2>{selected.name}</h2>
              </div>

              <button
                className="career-modal-close"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="career-details-content">
              <div className="career-details-grid">
                <Detail label="Full Name" value={selected.name} />
                <Detail label="Email" value={selected.email} />
                <Detail label="Phone" value={selected.phone || "N/A"} />
                <Detail label="Position" value={selected.job_id} />
                <Detail
                  label="Status"
                  value={selected.status}
                />
                <Detail
                  label="Submitted"
                  value={new Date(selected.created_at).toLocaleString()}
                />
              </div>

              <div className="career-detail-section">
                <label>Cover Letter</label>
                <div className="career-cover-letter">
                  {selected.cover_letter || "No cover letter provided."}
                </div>
              </div>

              <div className="career-detail-section">
                <label>Resume</label>
                <div className="career-resume-box">
                  <span className="career-resume-info">
                    {selected.resume_name || "Applicant Resume"}
                  </span>

                  <a
                    href={`/api/careers/${selected.id}`}
                    className="career-resume-download"
                  >
                    Download Resume
                  </a>
                </div>
              </div>
            </div>

            <div className="career-modal-footer">
              <button
                className="career-modal-done"
                onClick={() => setSelected(null)}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {/* EDIT MODAL */}
      {editing && (
        <div
          className="career-modal-overlay"
          onClick={() => !saving && setEditing(null)}
        >
          <section
            className="career-details-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="career-details-header">
              <div>
                <span>EDIT APPLICATION</span>
                <h2>Applicant Information</h2>
              </div>

              <button
                className="career-modal-close"
                onClick={() => setEditing(null)}
                disabled={saving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="career-details-content">
              <div className="career-edit-form">
                <label>
                  Full Name
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                  />
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </label>

                <label>
                  Phone
                  <input
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </label>

                <label>
                  Position
                  <input
                    value={form.job_id}
                    onChange={(e) =>
                      setForm({ ...form, job_id: e.target.value })
                    }
                  />
                </label>

                <label>
                  Status
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Cover Letter
                  <textarea
                    rows={5}
                    value={form.cover_letter}
                    onChange={(e) =>
                      setForm({ ...form, cover_letter: e.target.value })
                    }
                  />
                </label>
              </div>

              {actionError && (
                <p className="career-modal-error">{actionError}</p>
              )}

              <div className="career-modal-footer">
                <button
                  className="career-modal-done"
                  disabled={saving}
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>

                <button
                  className="career-save-button"
                  disabled={saving}
                  onClick={saveEdit}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deleting && (
        <div
          className="career-modal-overlay"
          onClick={() => !deletingLoading && setDeleting(null)}
        >
          <section
            className="career-details-modal career-delete-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="career-details-content">
              <h2>Delete Application?</h2>

              <p>
                Are you sure you want to permanently delete the application
                submitted by <strong>{deleting.name}</strong>?
                This will also delete the stored resume.
              </p>

              {actionError && (
                <p className="career-modal-error">{actionError}</p>
              )}

              <div className="career-modal-footer">
                <button
                  className="career-modal-done"
                  disabled={deletingLoading}
                  onClick={() => setDeleting(null)}
                >
                  Cancel
                </button>

                <button
                  className="career-confirm-delete"
                  disabled={deletingLoading}
                  onClick={deleteApplication}
                >
                  {deletingLoading ? "Deleting..." : "Yes, Delete"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="career-detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
