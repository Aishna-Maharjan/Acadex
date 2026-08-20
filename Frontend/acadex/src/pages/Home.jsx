import Navbar from "../components/Navbar";
import "./Home.css";

import personal from "../assets/personal.png";
import community from "../assets/community.png";
import clock from "../assets/clock.png";

export default function Home() {
  return (
    <div className="dashboard-page">
      <Navbar />

      <main>
        <section className="dashboard-hero">
          <div>
            <h1>
              Welcome back, {localStorage.getItem("userName") || "Student"}
            </h1>

            <p>
              Continue your academic journey and make the most of your learning
              space.
            </p>
          </div>
        </section>

        <section className="spaces-section">
          <div className="section-heading">
            <div>
              <span className="section-label">YOUR SPACES</span>

              <h2>Where do you want to go?</h2>
            </div>
          </div>

          <div className="spaces-grid">
            <div className="space-card personal-space-card">
              <div className="space-icon">
                <img src={personal} alt="Logo" />
              </div>

              <div className="space-content">
                <span className="space-number">01</span>

                <h3>Personal Space</h3>

                <p>
                  Your personal study environment to organize subjects,
                  resources and learning activities.
                </p>
              </div>

              <a href="/personal" className="space-button">
                Open Study Hub →
              </a>
            </div>

            <div className="space-card community-space-card">
              <div className="space-icon">
                <img src={community} alt="Logo" />
              </div>

              <div className="space-content">
                <span className="space-number">02</span>

                <h3>Community Space</h3>

                <p>
                  Discover and share useful academic resources with the Acadex
                  community.
                </p>
              </div>

              <a href="/community" className="space-button">
                Explore Community →
              </a>
            </div>
          </div>
        </section>

        <section className="activity-section">
          <div className="section-heading">
            <div>
              <span className="section-label">ACTIVITY</span>

              <h2>Recent Activity</h2>
            </div>
          </div>

          <div className="activity-empty">
            <div className="activity-icon">
              <img src={clock} alt="Logo" />
            </div>

            <h3>No recent activity</h3>

            <p>Your recent study and community activities will appear here.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
