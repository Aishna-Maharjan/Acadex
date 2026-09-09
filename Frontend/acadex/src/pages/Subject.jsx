import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar";
import ResourceCard from "../components/ResourceCard";

import "./Subject.css";

const API_URL = "http://127.0.0.1:8000";

function Subject() {
  const { id } = useParams();
  const navigate = useNavigate();

  const userId = localStorage.getItem("userId");

  const [subject, setSubject] = useState(null);
  const [resources, setResources] = useState([]);

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [activeView, setActiveView] = useState("dashboard");
  const [filterType, setFilterType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [editingSubject, setEditingSubject] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");

  useEffect(() => {
    fetchSubject();
    fetchResources();
  }, [id]);

  async function fetchSubject() {
    try {
      const response = await fetch(`${API_URL}/subjects/${userId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch subjects");
      }

      const data = await response.json();

      const foundSubject = data.find(
        (item) => item.id.toString() === id.toString()
      );

      if (foundSubject) {
        setSubject(foundSubject);
        setSubjectName(foundSubject.name || "");
        setSubjectDescription(foundSubject.description || "");
      }
    } catch (error) {
      console.error("Error fetching subject:", error);
    }
  }

  async function fetchResources() {
    try {
      const response = await fetch(`${API_URL}/resources/${id}`);

      if (!response.ok) {
        throw new Error("Failed to fetch resources");
      }

      const data = await response.json();
      setResources(data);
    } catch (error) {
      console.error("Error fetching resources:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(value) {
    setSearchQuery(value);

    if (!value.trim()) {
      fetchResources();
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/resources/${id}/search?keyword=${encodeURIComponent(value)}`
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setResources(data);
    } catch (error) {
      console.error("Search error:", error);
    }
  }

  async function handleUpdateSubject(e) {
    e.preventDefault();

    try {
      const response = await fetch(`${API_URL}/subjects/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: Number(userId),
          name: subjectName,
          description: subjectDescription,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update subject");
      }

      setSubject((prev) => ({
        ...prev,
        name: subjectName,
        description: subjectDescription,
      }));

      setEditingSubject(false);
    } catch (error) {
      console.error("Error updating subject:", error);
    }
  }

  async function handleDeleteSubject() {
    const confirmed = window.confirm(
      `Delete subject "${subject?.name}"? All its resources will be lost.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_URL}/subjects/${id}?user_id=${userId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete subject");
      }

      navigate("/personal");
    } catch (error) {
      console.error("Error deleting subject:", error);
    }
  }

  async function handleDeleteResource(resourceId) {
    const confirmed = window.confirm("Delete this resource?");

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_URL}/resources/${resourceId}?subject_id=${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete resource");
      }

      setResources((prev) => prev.filter((resource) => resource.id !== resourceId));
    } catch (error) {
      console.error("Error deleting resource:", error);
    }
  }

  async function handleToggleFavorite(resourceId) {
    try {
      const response = await fetch(
        `${API_URL}/resources/${resourceId}/favorite?subject_id=${id}`,
        {
          method: "PUT",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update favorite");
      }

      setResources((prev) =>
        prev.map((resource) =>
          resource.id === resourceId
            ? {
                ...resource,
                is_favorite: !resource.is_favorite,
              }
            : resource
        )
      );
    } catch (error) {
      console.error("Error updating favorite:", error);
    }
  }

  async function handleUpdateResource(resourceId, updatedData) {
    try {
      const response = await fetch(`${API_URL}/resources/${resourceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject_id: Number(id),
          ...updatedData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update resource");
      }

      const updatedResource = await response.json();

      setResources((prev) =>
        prev.map((resource) =>
          resource.id === resourceId ? updatedResource : resource
        )
      );
    } catch (error) {
      console.error("Error updating resource:", error);
    }
  }

  const totalResources = resources.length;

  const recentResources = [...resources]
    .sort((a, b) => {
      const dateA = new Date(a.created_at || a.createdAt || 0);
      const dateB = new Date(b.created_at || b.createdAt || 0);
      return dateB - dateA;
    })
    .slice(0, 5);

  const favoriteResources = resources.filter(
    (resource) => resource.is_favorite
  );

  const filteredResources = resources.filter((resource) => {
    const resourceType = resource.resource_type || "";

    const matchesType =
      filterType === "ALL" || resourceType === filterType;

    return matchesType;
  });

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="subject-loading">
          Loading subject...
        </div>
      </>
    );
  }

  if (!subject) {
    return (
      <>
        <Navbar />

        <div className="subject-not-found">
          <h1>Subject not found</h1>
          <p>
            It may have been deleted.
          </p>
          <button onClick={() => navigate("/personal")}>
            Go to Personal →
          </button>
        </div>
      </>
    );
  }

  function renderResourceCards(resourceList) {
    if (resourceList.length === 0) {
      return (
        <div className="resource-empty">
          <span>📂</span>
          <h3>No resources here yet</h3>
          <p>Add your first study resource to this subject.</p>

          <button
            className="save-btn"
            onClick={() => setShowModal(true)}
          >
            + Add a resource
          </button>
        </div>
      );
    }

    return (
      <div className="resource-grid">
        {resourceList.map((resource) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            onDelete={handleDeleteResource}
            onUpdate={handleUpdateResource}
            onToggleFavorite={handleToggleFavorite}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="subject-page">
      <Navbar />

      <section className="subject-hero">
        <div className="subject-hero-inner">
          <button
            className="back-button"
            onClick={() => navigate("/personal")}
          >
            ← All Subjects
          </button>

          {editingSubject ? (
            <form
              className="subject-edit-form"
              onSubmit={handleUpdateSubject}
            >
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                required
              />

              <textarea
                value={subjectDescription}
                onChange={(e) =>
                  setSubjectDescription(e.target.value)
                }
                placeholder="Subject description"
              />

              <div className="subject-edit-actions">
                <button type="submit">
                  Save Changes
                </button>

                <button
                  type="button"
                  onClick={() => setEditingSubject(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="subject-title-row">
                <div
                  className="subject-hero-dot"
                  style={{
                    background:
                      subject.color || "#E8C97A",
                  }}
                />

                <div>
                  <span className="subject-label">
                    Subject
                  </span>

                  <h1>{subject.name}</h1>
                </div>
              </div>

              <p>
                {subject.description ||
                  "Organize your study resources in one place."}
              </p>

              <div className="subject-actions">
                <button onClick={() => setEditingSubject(true)}>
                  Edit Subject
                </button>

                <button onClick={handleDeleteSubject}>
                  Delete Subject
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <main className="subject-content">
        <section className="subject-dashboard">
          <button
            className="dashboard-card"
            onClick={() => {
              setActiveView("filtered");
              setFilterType("ALL");
              setSearchQuery("");
              fetchResources();
            }}
          >
            <div>
              <h2>Total Resources</h2>
              <p>
                {totalResources} resource
                {totalResources !== 1 ? "s" : ""} saved
              </p>
            </div>

            <span>→</span>
          </button>

          <button
            className="dashboard-card"
            onClick={() => setActiveView("recent")}
          >
            <div>
              <h2>Recently Added</h2>
              <p>
                {recentResources.length} recent resource
                {recentResources.length !== 1 ? "s" : ""}
              </p>
            </div>

            <span>→</span>
          </button>

          <button
            className="dashboard-card"
            onClick={() => setActiveView("favorites")}
          >
            <div>
              <h2>Favorites</h2>
              <p>
                {favoriteResources.length} favorite
                {favoriteResources.length !== 1 ? "s" : ""}
              </p>
            </div>

            <span>★</span>
          </button>

          <div className="dashboard-card add-resource-card">
            <div>
              <h2>Add Resource</h2>
              <p>
                Add PDFs, notes, links, and study materials
              </p>
            </div>

            <button onClick={() => setShowModal(true)}>
              + Add
            </button>
          </div>
        </section>

        {activeView === "dashboard" && (
          <section className="resource-section dashboard-resource-section">
            <div className="resource-section-header">
              <div>
                <span className="resource-section-label">
                  Your study materials
                </span>

                <h2>Resources</h2>
              </div>

              <span className="resource-count">
                {totalResources} total
              </span>
            </div>

            {renderResourceCards(resources)}
          </section>
        )}

        {activeView === "recent" && (
          <section className="resource-section">
            <button
              className="section-back-button"
              onClick={() => setActiveView("dashboard")}
            >
              ← Back
            </button>

            <div className="resource-section-header">
              <div>
                <span className="resource-section-label">
                  Latest additions
                </span>

                <h2>Recently Added</h2>
              </div>
            </div>

            {renderResourceCards(recentResources)}
          </section>
        )}

        {activeView === "filtered" && (
          <section className="resource-section">
            <button
              className="section-back-button"
              onClick={() => setActiveView("dashboard")}
            >
              ← Back
            </button>

            <div className="resource-section-header">
              <div>
                <span className="resource-section-label">
                  Your study materials
                </span>

                <h2>All Resources</h2>
              </div>

              <span className="resource-count">
                {filteredResources.length} found
              </span>
            </div>

            <div className="resource-toolbar">
              <input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search resources..."
              />
            </div>

            <div className="filter-buttons">
              {["ALL", "PDF", "Link", "DOC", "Notes", "Video"].map(
                (type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={
                      filterType === type ? "active" : ""
                    }
                  >
                    {type}
                  </button>
                )
              )}
            </div>

            {renderResourceCards(filteredResources)}
          </section>
        )}

        {activeView === "favorites" && (
          <section className="resource-section">
            <button
              className="section-back-button"
              onClick={() => setActiveView("dashboard")}
            >
              ← Back
            </button>

            <div className="resource-section-header">
              <div>
                <span className="resource-section-label">
                  Saved resources
                </span>

                <h2>Favorites</h2>
              </div>

              <span className="resource-count">
                {favoriteResources.length} saved
              </span>
            </div>

            {favoriteResources.length === 0 ? (
              <div className="resource-empty">
                <span>☆</span>
                <h3>No favorites yet</h3>
                <p>
                  Click ☆ on a resource to save it here.
                </p>
              </div>
            ) : (
              <div className="resource-grid">
                {favoriteResources.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    onDelete={handleDeleteResource}
                    onUpdate={handleUpdateResource}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {showModal && (
        <AddResource
          subject={subject}
          subjects={[]}
          setSubjects={() => {}}
          onClose={() => {
            setShowModal(false);
            fetchResources();
          }}
        />
      )}
    </div>
  );
}

export default Subject;