import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import SubjectGrid from "../components/SubjectGrid";
import "./Personal.css";

import sub from "../assets/sub.png";
import resources from "../assets/resources.png";
import { apiFetch, API_URL } from "../utils/api";


export default function Personal() {
  const [showModal, setShowModal] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [subjectName, setSubjectName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);

  const userId = localStorage.getItem("userId");

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!userId) {
        console.log("No logged-in user found.");
        setLoading(false);
        return;
      }

      try {
        const response = await apiFetch(
          `${API_URL}/subjects/${userId}`
        );

        const data = await response.json();

        if (!response.ok) {
          console.error("Failed to fetch subjects:", data);
          setLoading(false);
          return;
        }
      
        // Fetch resources for each subject so the Personal page can display the real resource count and favorites.
        const subjectsWithResources = await Promise.all(
          data.subjects.map(async (subject) => {
            try {
              const resourceResponse = await apiFetch(
                `${API_URL}/resources/${subject.id}`
              );

              const resourceData = await resourceResponse.json();

              if (!resourceResponse.ok) {
                return {
                  ...subject,
                  color: "#2D1B4E",
                  resources: [],
                };
              }

              return {
                ...subject,
                color: "#2D1B4E",
                resources: resourceData.resources || [],
              };
            } catch (error) {
              console.error(
                `Error fetching resources for subject ${subject.id}:`,
                error
              );

              return {
                ...subject,
                color: "#2D1B4E",
                resources: [],
              };
            }
          })
        );

        setSubjects(subjectsWithResources);
      } catch (error) {
        console.error("Error fetching subjects:", error);
      } finally {
        setLoading(false);
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

    if (!subjectName.trim()) {
      return;
    }

    try {
      const response = await apiFetch(`${API_URL}/subjects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: parseInt(userId),
          name: subjectName.trim(),
          description: description.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Failed to add subject:", data);
        alert(data.detail || data.error || "Failed to add subject.");
        return;
      }

      const newSubject = {
        ...data.subject,
        color: "#2D1B4E",
        resources: [],
      };

      setSubjects((prevSubjects) => [
        newSubject,
        ...prevSubjects,
      ]);

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
      const response = await apiFetch(
        `${API_URL}/subjects/${id}?user_id=${userId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Failed to delete subject:", data);
        alert(
          data.detail ||
            data.error ||
            "Failed to delete subject."
        );
        return;
      }

      setSubjects((prevSubjects) =>
        prevSubjects.filter((subject) => subject.id !== id)
      );
    } catch (error) {
      console.error("Error deleting subject:", error);
      alert("Could not connect to the server.");
    }
  };

  const totalResources = subjects.reduce(
    (total, subject) => total + (subject.resources?.length || 0),
    0
  );

  const totalFavorites = subjects.reduce(
    (total, subject) =>
      total +
      (subject.resources?.filter(
        (resource) =>
          resource.is_favorite === true ||
          resource.is_favorite === 1
      ).length || 0),
    0
  );

  return (
    <div className="personal-page">
      <Navbar />

      <main>
        <section className="personal-hero">
          <div className="personal-hero-inner">

            <h1>Keep your study life in one place.</h1>

            <p>
              Organize your subjects, notes, documents and
              other academic resources in one simple space.
            </p>
          </div>
        </section>

        <section className="personal-dashboard">
          <div className="personal-section-heading">
            <div>
              <span className="personal-section-label">
                OVERVIEW
              </span>

              <h2>Your Study Space</h2>
            </div>
          </div>

          <div className="personal-stats">
            <div className="personal-stat">
              <div className="personal-stat-icon">
                <img src={sub} alt="" />
              </div>

              <div>
                <span className="personal-stat-number">
                  {subjects.length.toString().padStart(2, "0")}
                </span>

                <span className="personal-stat-label">
                  Subjects
                </span>
              </div>
            </div>

            <div className="personal-stat">
              <div className="personal-stat-icon">
                <img src={resources} alt="" />
              </div>

              <div>
                <span className="personal-stat-number">
                  {totalResources.toString().padStart(2, "0")}
                </span>

                <span className="personal-stat-label">
                  Resources
                </span>
              </div>
            </div>

            <div className="personal-stat">
              <div className="personal-stat-icon personal-stat-star">
                ★
              </div>

              <div>
                <span className="personal-stat-number">
                  {totalFavorites.toString().padStart(2, "0")}
                </span>

                <span className="personal-stat-label">
                  Favorites
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="subjects-section">
          <div className="personal-section-heading">
            <div>
              <span className="personal-section-label">
                ORGANIZE YOUR LEARNING
              </span>

              <h2>Your Subjects</h2>
            </div>

            <button
              className="add-subject-btn"
              onClick={() => setShowModal(true)}
            >
              + Add Subject
            </button>
          </div>

          {loading ? (
            <div className="subjects-loading">
              <p>Loading your subjects...</p>
            </div>
          ) : (
            <SubjectGrid
              subjects={subjects}
              onDelete={handleDeleteSubject}
            />
          )}
        </section>
      </main>

      {showModal && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div className="subject-modal">
            <button
              className="modal-close"
              type="button"
              onClick={() => setShowModal(false)}
              aria-label="Close"
            >
              x
            </button>

            <h2><b>Add Subject</b></h2>

            <form onSubmit={handleAddSubject}>
              <label htmlFor="subject-name">
                Subject Name
              </label>

              <input
                id="subject-name"
                type="text"
                placeholder="e.g. Web Technology"
                value={subjectName}
                onChange={(e) =>
                  setSubjectName(e.target.value)
                }
                required
              />

              <label htmlFor="subject-description">
                Description
              </label>

              <textarea
                id="subject-description"
                placeholder="Describe your subject..."
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
              />

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="modal-add"
                >
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