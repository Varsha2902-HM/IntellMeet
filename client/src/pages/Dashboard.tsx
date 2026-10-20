
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Meeting {
  _id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  status: "scheduled" | "live" | "completed";
  meetingLink: string;
  host?: {
    _id?: string;
    name?: string;
    email?: string;
  };
}

function Dashboard() {
  const navigate = useNavigate();

  // Use Vercel's environment variable, or fall back to the deployed backend.
  const API_URL = (
    import.meta.env.VITE_API_URL ||
    "https://intellmeet-backend-tqot.onrender.com"
  ).replace(/\/$/, "");

  const [user, setUser] = useState<any>({});
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);

  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [meetingMessage, setMeetingMessage] = useState("");

  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDescription, setMeetingDescription] = useState("");
  const [meetingStartTime, setMeetingStartTime] = useState("");
  const [meetingEndTime, setMeetingEndTime] = useState("");

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser({});
      }
    }

    void fetchMeetings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoadingMeetings(true);

      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/meetings`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }

        throw new Error(data.message || "Unable to fetch meetings");
      }

      setMeetings(data.meetings || []);
    } catch (error) {
      console.error("Fetch meetings error:", error);
    } finally {
      setLoadingMeetings(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const userName = user.name || "User";

  const formatMeetingTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatMeetingDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString([], {
      day: "2-digit",
      month: "short",
    });

  const getMeetingDayLabel = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();

    const dateOnly = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    const todayOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const tomorrow = new Date(todayOnly);
    tomorrow.setDate(todayOnly.getDate() + 1);

    if (dateOnly.getTime() === todayOnly.getTime()) return "Today";
    if (dateOnly.getTime() === tomorrow.getTime()) return "Tomorrow";

    return formatMeetingDate(dateString);
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setMeetingMessage("");

    if (!meetingTitle.trim()) {
      setMeetingMessage("Please enter a meeting title.");
      return;
    }

    if (!meetingStartTime) {
      setMeetingMessage("Please select a start time.");
      return;
    }

    if (
      meetingEndTime &&
      new Date(meetingEndTime).getTime() <=
        new Date(meetingStartTime).getTime()
    ) {
      setMeetingMessage("End time must be after start time.");
      return;
    }

    try {
      setCreatingMeeting(true);

      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/meetings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: meetingTitle.trim(),
          description: meetingDescription,
          startTime: new Date(meetingStartTime).toISOString(),
          endTime: meetingEndTime
            ? new Date(meetingEndTime).toISOString()
            : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }

        setMeetingMessage(data.message || "Failed to create meeting.");
        return;
      }

      setMeetings((previousMeetings) => [
        data.meeting,
        ...previousMeetings,
      ]);

      setMeetingTitle("");
      setMeetingDescription("");
      setMeetingStartTime("");
      setMeetingEndTime("");

      setMeetingMessage("Meeting created successfully!");

      setTimeout(() => {
        setShowMeetingModal(false);
        setMeetingMessage("");
      }, 1000);
    } catch (error) {
      console.error("Create meeting error:", error);
      setMeetingMessage("Unable to connect to the server. Please try again.");
    } finally {
      setCreatingMeeting(false);
    }
  };

  const openMeetingModal = () => {
    setMeetingMessage("");
    setShowMeetingModal(true);
  };

  const closeMeetingModal = () => {
    if (creatingMeeting) return;
    setShowMeetingModal(false);
    setMeetingMessage("");
  };

  const upcomingMeetings = meetings
    .filter((meeting) => meeting.status !== "completed")
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() -
        new Date(b.startTime).getTime()
    )
    .slice(0, 5);

  const goToMeetings = () => navigate("/meetings");
  const goToChat = () => navigate("/chat");
  const goToTasks = () => navigate("/tasks");
  const goToProjects = () => navigate("/projects");
  const goToTeam = () => navigate("/team");
  const goToAnalytics = () => alert("Analytics page is coming next.");

  return (
    <div className="dashboard-page">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <div className="dashboard-brand-icon">✦</div>
          <div>
            <strong>IntellMeet</strong>
            <span>Workspace</span>
          </div>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-title">MAIN</span>
          <nav className="dashboard-nav">
            <a
              className="dashboard-nav-item active"
              onClick={() => navigate("/dashboard")}
              style={{ cursor: "pointer" }}
            >
              <span>⌂</span>
              Dashboard
            </a>

            <a
              className="dashboard-nav-item"
              onClick={goToMeetings}
              style={{ cursor: "pointer" }}
            >
              <span>◉</span>
              Meetings
            </a>

            <a
              className="dashboard-nav-item"
              onClick={goToChat}
              style={{ cursor: "pointer" }}
            >
              <span>💬</span>
              Team Chat
              <small>3</small>
            </a>

            <a
              className="dashboard-nav-item"
              onClick={goToTasks}
              style={{ cursor: "pointer" }}
            >
              <span>✓</span>
              Tasks
            </a>
          </nav>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-title">WORKSPACE</span>
          <nav className="dashboard-nav">
            <a
              className="dashboard-nav-item"
              onClick={goToProjects}
              style={{ cursor: "pointer" }}
            >
              <span>▣</span>
              Projects
            </a>

            <a
              className="dashboard-nav-item"
              onClick={goToTeam}
              style={{ cursor: "pointer" }}
            >
              <span>👥</span>
              Team
            </a>

            <a
              className="dashboard-nav-item"
              onClick={goToAnalytics}
              style={{ cursor: "pointer" }}
            >
              <span>↗</span>
              Analytics
            </a>
          </nav>
        </div>

        <div className="sidebar-ai">
          <div className="sidebar-ai-icon">✦</div>
          <strong>IntellMeet AI</strong>
          <p>Your meetings are about to become much smarter.</p>
          <button
            onClick={() =>
              alert("AI Meeting Intelligence is coming next.")
            }
          >
            Explore AI →
          </button>
        </div>

        <div className="sidebar-bottom">
          <button
            className="sidebar-settings"
            onClick={() => alert("Settings page is coming next.")}
          >
            ⚙ Settings
          </button>

          <button className="sidebar-logout" onClick={handleLogout}>
            ↪ Log out
          </button>
        </div>
      </aside>

      <main className="dashboard-content">
        <header className="dashboard-topbar">
          <div className="dashboard-search">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search meetings, tasks, people..."
            />
            <kbd>⌘ K</kbd>
          </div>

          <div className="dashboard-top-actions">
            <button
              className="notification-btn"
              onClick={() => alert("No new notifications.")}
            >
              🔔
              <span></span>
            </button>

            <div className="user-profile">
              <div className="user-avatar">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <strong>{userName}</strong>
                <small>{user.role || "Member"}</small>
              </div>
              <span className="profile-arrow">⌄</span>
            </div>
          </div>
        </header>

        <section className="dashboard-welcome">
          <div>
            <span className="welcome-label">YOUR WORKSPACE</span>
            <h1>Good morning, {userName.split(" ")[0]} 👋</h1>
            <p>Here's what's happening with your team today.</p>
          </div>

          <button className="new-meeting-btn" onClick={openMeetingModal}>
            <span>+</span>
            New meeting
          </button>
        </section>

        <section className="dashboard-stat-grid">
          <div className="dashboard-stat">
            <div className="stat-top">
              <div className="stat-symbol purple-bg">◉</div>
              <span className="stat-trend">+12.5%</span>
            </div>
            <strong>{meetings.length}</strong>
            <p>Meetings</p>
          </div>

          <div className="dashboard-stat">
            <div className="stat-top">
              <div className="stat-symbol blue-bg">✓</div>
              <span className="stat-trend">+8.2%</span>
            </div>
            <strong>38</strong>
            <p>Tasks completed</p>
          </div>

          <div className="dashboard-stat">
            <div className="stat-top">
              <div className="stat-symbol orange-bg">⏱</div>
              <span className="stat-neutral">This month</span>
            </div>
            <strong>18.4h</strong>
            <p>Meeting time</p>
          </div>

          <div className="dashboard-stat">
            <div className="stat-top">
              <div className="stat-symbol green-bg">✦</div>
              <span className="stat-trend">+18.7%</span>
            </div>
            <strong>92%</strong>
            <p>Team engagement</p>
          </div>
        </section>

        <section className="dashboard-main-grid">
          <div className="dashboard-panel meetings-panel">
            <div className="panel-header">
              <div>
                <span className="panel-label">SCHEDULE</span>
                <h2>Upcoming meetings</h2>
              </div>
              <button className="panel-link" onClick={goToMeetings}>
                View all →
              </button>
            </div>

            <div className="meeting-list">
              {loadingMeetings ? (
                <div
                  style={{
                    padding: "30px",
                    textAlign: "center",
                    opacity: 0.7,
                  }}
                >
                  Loading meetings...
                </div>
              ) : upcomingMeetings.length === 0 ? (
                <div
                  style={{
                    padding: "30px",
                    textAlign: "center",
                    opacity: 0.7,
                  }}
                >
                  <p>No upcoming meetings.</p>
                  <button
                    className="new-meeting-btn"
                    onClick={openMeetingModal}
                    style={{ marginTop: "12px" }}
                  >
                    <span>+</span>
                    Create your first meeting
                  </button>
                </div>
              ) : (
                upcomingMeetings.map((meeting, index) => (
                  <div className="dashboard-meeting" key={meeting._id}>
                    <div className="meeting-time">
                      <strong>{formatMeetingTime(meeting.startTime)}</strong>
                      <span>{getMeetingDayLabel(meeting.startTime)}</span>
                    </div>

                    <div
                      className={
                        index % 3 === 0
                          ? "meeting-line"
                          : index % 3 === 1
                            ? "meeting-line blue-line"
                            : "meeting-line orange-line"
                      }
                    />

                    <div className="meeting-details">
                      <div className="meeting-title-row">
                        <strong>{meeting.title}</strong>
                        <span className="meeting-live-tag">
                          {meeting.status === "live"
                            ? "Live"
                            : getMeetingDayLabel(meeting.startTime)}
                        </span>
                      </div>

                      <p>{meeting.description || "IntellMeet meeting"}</p>

                      <div className="meeting-members">
                        <div>{userName.charAt(0).toUpperCase()}</div>
                        <span>{meeting.status}</span>
                      </div>
                    </div>

                    <button
                      className="join-meeting-btn"
                      onClick={() => navigate(`/meeting/${meeting._id}`)}
                    >
                      {meeting.status === "live" ? "Join" : "Details"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="dashboard-panel ai-dashboard-panel">
            <div className="ai-glow"></div>
            <div className="panel-header ai-header">
              <div>
                <span className="panel-label">INTELLMEET AI</span>
                <h2>Meeting intelligence</h2>
              </div>
              <div className="ai-sparkle">✦</div>
            </div>

            <div className="ai-score">
              <div className="score-circle">
                <strong>87</strong>
                <span>score</span>
              </div>
              <div>
                <strong>Great meeting health</strong>
                <p>Your team's collaboration score improved this week.</p>
              </div>
            </div>

            <div className="ai-metrics">
              <div>
                <span>Decisions</span>
                <strong>18</strong>
              </div>
              <div>
                <span>Action items</span>
                <strong>32</strong>
              </div>
              <div>
                <span>Avg. duration</span>
                <strong>42m</strong>
              </div>
            </div>

            <button
              className="ai-action"
              onClick={() => alert("AI insights will be connected next.")}
            >
              View AI insights →
            </button>
          </div>
        </section>

        <section className="dashboard-bottom-grid">
          <div className="dashboard-panel">
            <div className="panel-header">
              <div>
                <span className="panel-label">PRODUCTIVITY</span>
                <h2>My tasks</h2>
              </div>
              <button className="panel-link" onClick={goToTasks}>
                View all →
              </button>
            </div>

            <div className="task-list">
              <div className="task-item">
                <span className="task-check"></span>
                <div>
                  <strong>Finalize project presentation</strong>
                  <small>Due today</small>
                </div>
                <span className="priority-high">High</span>
              </div>

              <div className="task-item">
                <span className="task-check"></span>
                <div>
                  <strong>Review meeting action items</strong>
                  <small>Due tomorrow</small>
                </div>
                <span className="priority-medium">Medium</span>
              </div>

              <div className="task-item completed-task">
                <span className="task-check checked">✓</span>
                <div>
                  <strong>Update team documentation</strong>
                  <small>Completed</small>
                </div>
                <span className="priority-done">Done</span>
              </div>
            </div>
          </div>

          <div className="dashboard-panel">
            <div className="panel-header">
              <div>
                <span className="panel-label">TEAM</span>
                <h2>Recent activity</h2>
              </div>
              <button className="panel-link" onClick={goToTeam}>
                See all →
              </button>
            </div>

            <div className="activity-list">
              <div className="activity-item">
                <div className="activity-avatar purple-avatar">A</div>
                <div>
                  <p><strong>Alex</strong> completed a task</p>
                  <small>Finalize user flow · 12 min ago</small>
                </div>
              </div>

              <div className="activity-item">
                <div className="activity-avatar blue-avatar">R</div>
                <div>
                  <p><strong>Rahul</strong> joined a meeting</p>
                  <small>Product Strategy · 32 min ago</small>
                </div>
              </div>

              <div className="activity-item">
                <div className="activity-avatar orange-avatar">S</div>
                <div>
                  <p><strong>Sarah</strong> added a comment</p>
                  <small>Design Review · 1 hour ago</small>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {showMeetingModal && (
        <div
          onClick={closeMeetingModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "#15151f",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "20px",
              padding: "28px",
              boxShadow: "0 25px 80px rgba(0,0,0,0.45)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "12px",
                    letterSpacing: "1.5px",
                    opacity: 0.6,
                  }}
                >
                  SCHEDULE
                </span>
                <h2 style={{ margin: "5px 0 0" }}>
                  Create a new meeting
                </h2>
              </div>

              <button
                onClick={closeMeetingModal}
                disabled={creatingMeeting}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "white",
                  fontSize: "24px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateMeeting}>
              <div style={{ marginBottom: "18px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 600,
                  }}
                >
                  Meeting title
                </label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="e.g. Product Strategy"
                  required
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "13px 14px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.05)",
                    color: "white",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: "18px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 600,
                  }}
                >
                  Description
                </label>
                <textarea
                  value={meetingDescription}
                  onChange={(e) => setMeetingDescription(e.target.value)}
                  placeholder="What will this meeting be about?"
                  rows={3}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "13px 14px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.05)",
                    color: "white",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "14px",
                  marginBottom: "18px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 600,
                    }}
                  >
                    Start time
                  </label>
                  <input
                    type="datetime-local"
                    value={meetingStartTime}
                    onChange={(e) => setMeetingStartTime(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "13px 10px",
                      borderRadius: "10px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.05)",
                      color: "white",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 600,
                    }}
                  >
                    End time
                  </label>
                  <input
                    type="datetime-local"
                    value={meetingEndTime}
                    onChange={(e) => setMeetingEndTime(e.target.value)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "13px 10px",
                      borderRadius: "10px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.05)",
                      color: "white",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {meetingMessage && (
                <div
                  role="status"
                  style={{
                    padding: "12px 14px",
                    marginBottom: "18px",
                    borderRadius: "10px",
                    background: meetingMessage.includes("successfully")
                      ? "rgba(50, 200, 120, 0.12)"
                      : "rgba(255, 80, 80, 0.12)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {meetingMessage}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={closeMeetingModal}
                  disabled={creatingMeeting}
                  style={{
                    padding: "12px 18px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "transparent",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creatingMeeting}
                  style={{
                    padding: "12px 20px",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg, #7c5cff, #5c8cff)",
                    color: "white",
                    fontWeight: 700,
                    cursor: "pointer",
                    opacity: creatingMeeting ? 0.7 : 1,
                  }}
                >
                  {creatingMeeting ? "Creating..." : "Create meeting"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
