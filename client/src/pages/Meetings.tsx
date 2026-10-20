
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";

interface Meeting {
  _id: string;
  title: string;
  description?: string;
  host?: {
    name?: string;
    email?: string;
  } | string;
  participants?: Array<{
    _id?: string;
    name?: string;
    email?: string;
  } | string>;
  startTime: string;
  endTime?: string;
  status: "scheduled" | "live" | "completed";
  meetingLink?: string;
}

type FilterType = "all" | "upcoming" | "past";

const API_URL =
  "https://intellmeet-backend-tqot.onrender.com/api/meetings";

function getHostName(host: Meeting["host"]): string {
  if (!host) return "Unknown host";
  if (typeof host === "string") return host;
  return host.name || host.email || "Unknown host";
}

function formatTime(dateValue: string): string {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Time unavailable";
  }

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getMeetingTimestamp(meeting: Meeting): number {
  const timestamp = new Date(meeting.startTime).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function Meetings() {
  const navigate = useNavigate();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const [currentTime] = useState(() => Date.now());

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    setError("");

    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load meetings."
        );
      }

      setMeetings(
        Array.isArray(data.meetings) ? data.meetings : []
      );
    } catch (err) {
      console.error("Fetch meetings error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchMeetings();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchMeetings]);

  const filteredMeetings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return meetings
      .filter((meeting) => {
        const title = meeting.title || "";
        const description = meeting.description || "";
        const host = getHostName(meeting.host);

        return (
          title.toLowerCase().includes(query) ||
          description.toLowerCase().includes(query) ||
          host.toLowerCase().includes(query)
        );
      })
      .filter((meeting) => {
        const start = getMeetingTimestamp(meeting);

        if (filter === "upcoming") {
          return (
            meeting.status !== "completed" &&
            start >= currentTime
          );
        }

        if (filter === "past") {
          return (
            meeting.status === "completed" ||
            start < currentTime
          );
        }

        return true;
      })
      .sort(
        (a, b) =>
          getMeetingTimestamp(a) - getMeetingTimestamp(b)
      );
  }, [meetings, search, filter, currentTime]);

  const upcomingCount = meetings.filter(
    (meeting) =>
      meeting.status !== "completed" &&
      getMeetingTimestamp(meeting) >= currentTime
  ).length;

  const pastCount = meetings.filter(
    (meeting) =>
      meeting.status === "completed" ||
      getMeetingTimestamp(meeting) < currentTime
  ).length;

  function getStatus(meeting: Meeting) {
    if (meeting.status === "completed") {
      return {
        label: "Completed",
        className: "meeting-status-completed",
      };
    }

    if (meeting.status === "live") {
      return {
        label: "Live",
        className: "meeting-status-live",
      };
    }

    if (getMeetingTimestamp(meeting) < currentTime) {
      return {
        label: "Scheduled time passed",
        className: "meeting-status-past",
      };
    }

    return {
      label: "Scheduled",
      className: "meeting-status-scheduled",
    };
  }

  return (
    <main className="meetings-page">
      <header className="meetings-topbar">
        <Link to="/dashboard" className="meetings-brand">
          <span className="meetings-brand-icon">✦</span>
          IntellMeet
        </Link>

        <div className="meetings-topbar-actions">
          <button
            type="button"
            className="meetings-refresh-btn"
            onClick={() => void fetchMeetings()}
            disabled={loading}
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>

          <Link to="/dashboard" className="meetings-back-link">
            ← Dashboard
          </Link>
        </div>
      </header>

      <section className="meetings-content">
        <div className="meetings-heading">
          <div>
            <span className="meetings-eyebrow">
              YOUR WORKSPACE
            </span>

            <h1>Meetings</h1>

            <p>
              Organize your schedule and continue collaborating
              with your team.
            </p>
          </div>

          <Link
            to="/dashboard"
            className="meetings-create-btn"
          >
            <span>＋</span> New meeting
          </Link>
        </div>

        <div className="meetings-stats">
          <article className="meetings-stat-card">
            <span className="meetings-stat-icon">◉</span>
            <span className="meetings-stat-label">
              Total meetings
            </span>
            <strong>{meetings.length}</strong>
          </article>

          <article className="meetings-stat-card">
            <span className="meetings-stat-icon">◷</span>
            <span className="meetings-stat-label">
              Upcoming meetings
            </span>
            <strong>{upcomingCount}</strong>
          </article>

          <article className="meetings-stat-card">
            <span className="meetings-stat-icon">✓</span>
            <span className="meetings-stat-label">
              Past meetings
            </span>
            <strong>{pastCount}</strong>
          </article>
        </div>

        <section className="meetings-list-section">
          <div className="meetings-list-heading">
            <div>
              <h2>Your schedule</h2>
              <p>
                Meetings saved to your IntellMeet account.
              </p>
            </div>

            <label className="meetings-search">
              <span>⌕</span>

              <input
                type="search"
                placeholder="Search meetings..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                aria-label="Search meetings"
              />
            </label>
          </div>

          <div className="meetings-filters">
            {(
              [
                ["all", "All meetings"],
                ["upcoming", "Upcoming"],
                ["past", "Past meetings"],
              ] as [FilterType, string][]
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={
                  filter === value
                    ? "meetings-filter active"
                    : "meetings-filter"
                }
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="meetings-feedback">
              <div className="meetings-spinner" />
              <h3>Loading your meetings...</h3>
              <p>Fetching your schedule from the server.</p>
            </div>
          ) : error ? (
            <div className="meetings-feedback">
              <div className="meetings-feedback-icon">!</div>
              <h3>Couldn&apos;t load meetings</h3>
              <p>{error}</p>

              <button
                type="button"
                className="meetings-create-btn"
                onClick={() => void fetchMeetings()}
              >
                Try again
              </button>
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="meetings-feedback">
              <div className="meetings-feedback-icon">◷</div>

              <h3>
                {search
                  ? "No matching meetings"
                  : filter === "past"
                    ? "No past meetings yet"
                    : filter === "upcoming"
                      ? "No upcoming meetings"
                      : "Your schedule is empty"}
              </h3>

              <p>
                {search
                  ? "Try another search term."
                  : "Create a meeting from your dashboard. It will appear here after it is saved successfully."}
              </p>

              {!search && (
                <Link
                  to="/dashboard"
                  className="meetings-create-btn"
                >
                  ＋ Create a meeting
                </Link>
              )}
            </div>
          ) : (
            <div className="meetings-list">
              {filteredMeetings.map((meeting) => {
                const status = getStatus(meeting);
                const meetingDate = new Date(meeting.startTime);
                const validDate = !Number.isNaN(
                  meetingDate.getTime()
                );

                return (
                  <article
                    className="meeting-item"
                    key={meeting._id}
                  >
                    <div className="meeting-date-block">
                      <span>
                        {validDate
                          ? meetingDate.toLocaleDateString(
                              undefined,
                              { month: "short" }
                            )
                          : "N/A"}
                      </span>

                      <strong>
                        {validDate
                          ? meetingDate.getDate()
                          : "—"}
                      </strong>

                      <small>
                        {validDate
                          ? meetingDate.getFullYear()
                          : ""}
                      </small>
                    </div>

                    <div className="meeting-item-main">
                      <div className="meeting-item-title-row">
                        <h3>{meeting.title}</h3>

                        <span
                          className={`meeting-status ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </div>

                      <p className="meeting-item-description">
                        {meeting.description ||
                          "No description provided."}
                      </p>

                      <div className="meeting-item-meta">
                        <span>
                          ◷ {formatTime(meeting.startTime)}
                        </span>

                        <span>
                          ◉ {meeting.participants?.length || 0}{" "}
                          participant
                          {meeting.participants?.length === 1
                            ? ""
                            : "s"}
                        </span>

                        <span>
                          Host: {getHostName(meeting.host)}
                        </span>
                      </div>
                    </div>

                    <div className="meeting-item-actions">
                      <button
                        type="button"
                        className="meeting-details-btn"
                        onClick={() =>
                          navigate(`/meeting/${meeting._id}`)
                        }
                      >
                        Details
                      </button>

                      {meeting.status !== "completed" && (
                        <button
                          type="button"
                          className="meeting-join-btn"
                          onClick={() =>
                            navigate(`/meeting/${meeting._id}`)
                          }
                        >
                          Join →
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <p className="meetings-footer-note">
          Your meetings are loaded from the IntellMeet backend.
        </p>
      </section>
    </main>
  );
}

export default Meetings;
