
import "./App.css";

import {
  BrowserRouter,
  Routes,
  Route,
  Link,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import MeetingRoom from "./pages/MeetingRoom";
import Meetings from "./pages/Meetings";

/* =====================================================
   TEAM CHAT PAGE
===================================================== */

function ChatPage() {
  return (
    <div className="workspace-page">
      <div className="workspace-page-header">
        <Link to="/dashboard" className="back-link">
          ← Back to Dashboard
        </Link>

        <span className="welcome-label">
          COMMUNICATION
        </span>

        <h1>Team Chat</h1>

        <p>
          Communicate with your team in real time.
        </p>
      </div>

      <div className="workspace-empty-card">
        <div className="workspace-large-icon">
          💬
        </div>

        <h2>Team Chat</h2>

        <p>
          Real-time team messaging will be connected
          using Socket.io.
        </p>

        <button
          className="workspace-primary-btn"
          onClick={() =>
            alert(
              "Real-time chat will be implemented next."
            )
          }
        >
          Start Chat
        </button>
      </div>
    </div>
  );
}

/* =====================================================
   TASKS PAGE
===================================================== */

function TasksPage() {
  return (
    <div className="workspace-page">
      <div className="workspace-page-header">
        <Link to="/dashboard" className="back-link">
          ← Back to Dashboard
        </Link>

        <span className="welcome-label">
          PRODUCTIVITY
        </span>

        <h1>Tasks</h1>

        <p>
          Manage tasks and action items from your meetings.
        </p>
      </div>

      <div className="workspace-card-grid">
        <div className="workspace-card">
          <div className="workspace-card-icon">
            ✓
          </div>

          <h2>My Tasks</h2>

          <p>
            View tasks assigned to you.
          </p>

          <button
            className="workspace-primary-btn"
            onClick={() =>
              alert("Task creation will be implemented next.")
            }
          >
            Create Task
          </button>
        </div>

        <div className="workspace-card">
          <div className="workspace-card-icon">
            ✦
          </div>

          <h2>AI Action Items</h2>

          <p>
            AI-generated action items from your meetings
            will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   PROJECTS PAGE
===================================================== */

function ProjectsPage() {
  return (
    <div className="workspace-page">
      <div className="workspace-page-header">
        <Link to="/dashboard" className="back-link">
          ← Back to Dashboard
        </Link>

        <span className="welcome-label">
          WORKSPACE
        </span>

        <h1>Projects</h1>

        <p>
          Organize your team's projects and work.
        </p>
      </div>

      <div className="workspace-empty-card">
        <div className="workspace-large-icon">
          📁
        </div>

        <h2>Your Projects</h2>

        <p>
          Collaborative projects and Kanban boards
          will appear here.
        </p>

        <button
          className="workspace-primary-btn"
          onClick={() =>
            alert(
              "Project management will be implemented next."
            )
          }
        >
          Create Project
        </button>
      </div>
    </div>
  );
}

/* =====================================================
   TEAM PAGE
===================================================== */

function TeamPage() {
  return (
    <div className="workspace-page">
      <div className="workspace-page-header">
        <Link to="/dashboard" className="back-link">
          ← Back to Dashboard
        </Link>

        <span className="welcome-label">
          COLLABORATION
        </span>

        <h1>Team</h1>

        <p>
          Manage your IntellMeet team members.
        </p>
      </div>

      <div className="workspace-empty-card">
        <div className="workspace-large-icon">
          👥
        </div>

        <h2>Team Members</h2>

        <p>
          Team members, invitations and roles will
          appear here.
        </p>

        <button
          className="workspace-primary-btn"
          onClick={() =>
            alert(
              "Team invitations will be implemented next."
            )
          }
        >
          Invite Member
        </button>
      </div>
    </div>
  );
}

/* =====================================================
   ANALYTICS PAGE
===================================================== */

function AnalyticsPage() {
  return (
    <div className="workspace-page">
      <div className="workspace-page-header">
        <Link to="/dashboard" className="back-link">
          ← Back to Dashboard
        </Link>

        <span className="welcome-label">
          INSIGHTS
        </span>

        <h1>Analytics</h1>

        <p>
          Understand your team's meetings and productivity.
        </p>
      </div>

      <div className="workspace-card-grid">
        <div className="workspace-card">
          <div className="workspace-card-icon">
            ◉
          </div>

          <h2>Meeting Analytics</h2>

          <p>
            Track meeting frequency, duration and
            participation.
          </p>
        </div>

        <div className="workspace-card">
          <div className="workspace-card-icon">
            ↗
          </div>

          <h2>Productivity</h2>

          <p>
            Monitor team engagement and productivity
            trends.
          </p>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   LANDING PAGE
===================================================== */

function LandingPage() {
  return (
    <div className="app">
      <nav className="navbar">
        <div className="logo">
          <div className="logo-icon">✦</div>
          <span>IntellMeet</span>
        </div>

        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <a href="#workspace">Workspace</a>
        </div>

        <div className="nav-actions">
          <Link to="/login" className="login-btn">
            Log in
          </Link>

          <Link to="/register" className="nav-start-btn">
            Get Started
          </Link>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-content">
            <div className="badge">
              <span className="pulse"></span>
              AI-powered collaboration platform
            </div>

            <h1>
              Meetings that
              <span> think,</span>
              <br />
              teams that
              <span> connect.</span>
            </h1>

            <p className="hero-description">
              IntellMeet brings video meetings,
              intelligent AI summaries, real-time
              collaboration and team productivity
              into one powerful workspace.
            </p>

            <div className="hero-buttons">
              <Link to="/register" className="primary-btn">
                Start collaborating →
              </Link>

              <button
                className="secondary-btn"
                onClick={() =>
                  alert("Demo video will be added soon.")
                }
              >
                ▶ Watch demo
              </button>
            </div>
          </div>
        </section>

        <section className="features" id="features">
          <div className="section-heading">
            <span>POWERFUL WORKSPACE</span>

            <h2>Everything your team needs.</h2>

            <p>
              Meetings, conversations, tasks and
              intelligent insights in one platform.
            </p>
          </div>

          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">✦</div>

              <h3>AI Meeting Intelligence</h3>

              <p>
                Automatically generate meeting
                summaries and action items.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon blue">
                ◉
              </div>

              <h3>Video Meetings</h3>

              <p>
                Connect your team through
                real-time video meetings.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon purple">
                💬
              </div>

              <h3>Team Chat</h3>

              <p>
                Communicate with your team
                in real time.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon orange">
                ✓
              </div>

              <h3>Tasks</h3>

              <p>
                Turn meeting discussions into
                actionable tasks.
              </p>
            </div>
          </div>
        </section>

        <section className="cta" id="workspace">
          <div>
            <span>READY TO COLLABORATE?</span>

            <h2>Make every meeting count.</h2>
          </div>

          <Link to="/register" className="primary-btn">
            Create your workspace →
          </Link>
        </section>
      </main>

      <footer>
        <div className="logo">
          <div className="logo-icon">✦</div>
          <span>IntellMeet</span>
        </div>

        <p>AI-powered meetings &amp; collaboration.</p>
      </footer>
    </div>
  );
}

/* =====================================================
   APP ROUTES
===================================================== */

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* PROTECTED ROUTES */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          <Route
            path="/meetings"
            element={<Meetings />}
          />

          <Route
            path="/chat"
            element={<ChatPage />}
          />

          <Route
            path="/tasks"
            element={<TasksPage />}
          />

          <Route
            path="/projects"
            element={<ProjectsPage />}
          />

          <Route
            path="/team"
            element={<TeamPage />}
          />

          <Route
            path="/analytics"
            element={<AnalyticsPage />}
          />

          {/* INDIVIDUAL MEETING */}
          <Route
            path="/meeting/:id"
            element={<MeetingRoom />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;