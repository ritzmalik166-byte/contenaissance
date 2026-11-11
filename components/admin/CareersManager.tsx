
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

const fetcher = async (url: string): Promise<CareerResponse> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to load applications");
  }

  return response.json();
};

const statuses = ["new", "reviewed", "interview", "rejected", "hired"];

export default function CareersAdmin() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Debounce search by 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  // Fetch applications
  const { data, error, isLoading, mutate } = useSWR<CareerResponse>(
    `/api/careers/list?page=${page}&limit=20&search=${encodeURIComponent(debouncedSearch)}`,
    fetcher,
    {
      keepPreviousData: true,
    }
  );

  // Update application status
  const updateStatus = async (id: number, status: string) => {
    setUpdatingId(id);

    try {
      const response = await fetch(`/api/careers/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Unable to update application status");
      }

      await mutate();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Status update failed"
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // Initial loading state
  if (isLoading && !data) {
    return (
      <div className="careers-loading">
        Loading applications...
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="careers-error">
        Failed to load applications. Please refresh the page.
      </div>
    );
  }

  const applications = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <main className="careers-admin">

      {/* SEARCH AND TOTAL APPLICATIONS */}
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

      {/* APPLICATIONS TABLE */}
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
              <th>Resume</th>
            </tr>
          </thead>

          <tbody>
            {applications.map((app) => (
              <tr key={app.id}>
                <td>
                  <strong>{app.name}</strong>
                </td>

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
                  <a
                    href={`/api/careers/${app.id}`}
                    className="careers-download"
                  >
                    Download
                  </a>
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

      {/* PAGINATION */}
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

    </main>
  );
}
