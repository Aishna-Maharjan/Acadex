import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import "./Personal.css";
import SubjectGrid from "../components/SubjectGrid";

import search from "../assets/search.png";
import sub from "../assets/sub.png";
import resources from "../assets/resources.png";
import track from "../assets/track.png";
import cross from "../assets/cross.png";

export default function Personal() {
  const [showModal, setShowModal] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [subjectName, setSubjectName] = useState("");
  const [description, setDescription] = useState("");
  const userId = localStorage.getItem("userId"); //to save users info like id

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!userId) {
        console.log("No logged-in user found.");
        return;
      }

      try {
        const response = await fetch(
          `http://127.0.0.1:8000/subjects/${userId}`,
        );

        const data = await response.json();

        if (!response.ok) {
          console.error("Failed to fetch subjects:", data);
          return;
        }

        const formattedSubjects = data.subjects.map((subject) => ({
          ...subject,
          color: "#1A1A2E",
          resources: [],
        }));

        setSubjects(formattedSubjects);
      } catch (error) {
        console.error("Error fetching subjects:", error);
      }
    };

    fetchSubjects();
  }, [userId]);

  const handleAddSubject = async (e) => {
    e.preventDefault();

    if (!userId) {
      alert("Please log in first.");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/subjects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          name: subjectName,
          description: description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Failed to add subject:", data);
        alert("Failed to add subject.");
        return;
      }

      const newSubject = {
        ...data.subject,
        color: "#1A1A2E",
        resources: [],
      };

      setSubjects((prevSubjects) => [newSubject, ...prevSubjects]);

      setSubjectName("");
      setDescription("");
      setShowModal(false);
    } catch (error) {
      console.error("Error adding subject:", error);
      alert("Could not connect to the server.");
    }
  };
  const handleDeleteSubject = async (id) => {
    if (!userId) {
      alert("Please log in first.");
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/subjects/${id}?user_id=${userId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Failed to delete subject:", data);
        alert(data.detail || data.error || "Failed to delete subject.");
        return;
      }

      setSubjects((prevSubjects) =>
        prevSubjects.filter((subject) => subject.id !== id),
      );
    } catch (error) {
      console.error("Error deleting subject:", error);
      alert("Could not connect to the server.");
    }
  };

  return (
    <div className="personal-page">
      <Navbar />

      <main>
        <section className="personal-hero">
          <h1>Study Hub</h1>

          <p>
            Organize your subjects, study materials and learning activities in
            one personal space.
          </p>
        </section>

        <section className="personal-dashboard">
          <div className="personal-section-heading">
            <div>
              <h2>
                <b>Your Study Space</b>
              </h2>
            </div>
          </div>

          <div className="personal-cards">
            <div className="personal-card">
              <div className="personal-card-icon">
                <img src={sub} alt="Logo" />
              </div>

              <div>
                <span className="personal-card-number">01</span>
                <h3>Subjects</h3>
                <p>Organize your subjects and access their study materials.</p>
              </div>

              <button>View Subjects →</button>
            </div>

            <div className="personal-card">
              <div className="personal-card-icon">
                <img src={resources} alt="Logo" />
              </div>

              <div>
                <span className="personal-card-number">02</span>
                <h3>Resources</h3>
                <p>
                  Keep your notes, documents and useful academic resources
                  organized.
                </p>
              </div>

              <button>View Resources →</button>
            </div>

            <div className="personal-card">
              <div className="personal-card-icon">
                <img src={search} alt="Logo" />
              </div>

              <div>
                <span className="personal-card-number">03</span>
                <h3>Search</h3>
                <p>
                  Quickly find resources and materials from your study space.
                </p>
              </div>

              <button>Search Resources →</button>
            </div>

            <div className="personal-card">
              <div className="personal-card-icon">
                <img src={track} alt="Logo" />
              </div>

              <div>
                <span className="personal-card-number">04</span>
                <h3>Progress</h3>
                <p>
                  Keep track of your learning activities and study progress.
                </p>
              </div>

              <button>View Progress →</button>
            </div>
          </div>
        </section>

        <section className="subjects-section">
          <div className="personal-section-heading">
            <div>
              <h2>Subjects</h2>
            </div>

            <button
              className="add-subject-btn"
              onClick={() => setShowModal(true)}
            >
              + Add Subject
            </button>
          </div>

          <SubjectGrid subjects={subjects} onDelete={handleDeleteSubject} />
        </section>
      </main>

      {showModal && (
        <div className="modal-overlay">
          <div className="subject-modal">
            <button className="modal-close" onClick={() => setShowModal(false)}>
              <img src={cross} alt="Logo" />
            </button>

            <h2>Add Subject</h2>

            <form onSubmit={handleAddSubject}>
              <label>Subject Name</label>

              <input
                type="text"
                placeholder="e.g. Web Technology"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                required
              />

              <label>Description</label>

              <textarea
                placeholder="Describe your subject..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button type="submit" className="modal-add">
                  Add Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
