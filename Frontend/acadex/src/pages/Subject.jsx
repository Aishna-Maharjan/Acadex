import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ResourceCard from "../components/ResourceCard";

const API_BASE_URL = "http://127.0.0.1:8000";

const Subject = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [subject, setSubject] = useState(null);
  const [resources, setResources] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditingSubject, setIsEditingSubject] = useState(false);

  const [subjectForm, setSubjectForm] = useState({
    name: "",
    description: "",
  });

  const [showAddResource, setShowAddResource] = useState(false);

  const [newResource, setNewResource] = useState({
    title: "",
    description: "",
    resource_type: "",
    resource_url: "",
  });

  const userId = localStorage.getItem("userId");

  useEffect(() => {
    fetchSubjectDetails();
    fetchResources();
  }, [id]);

  const fetchSubjectDetails = async () => {
    if (!userId) {
      console.error("No logged-in user found.");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/subjects/${userId}`
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("Failed to fetch subject:", data);
        return;
      }

      const currentSubject = data.subjects.find(
        (item) => item.id === parseInt(id)
      );

      if (currentSubject) {
        setSubject(currentSubject);

        setSubjectForm({
          name: currentSubject.name,
          description: currentSubject.description || "",
        });
      } else {
        console.error("Subject not found.");
      }
    } catch (err) {
      console.error("Error fetching subject:", err);
    }
  };

  const fetchResources = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/resources/${id}`
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("Failed to fetch resources:", data);
        return;
      }

      setResources(data.resources);
    } catch (err) {
      console.error("Error fetching resources:", err);
    }
  };
  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      fetchResources();
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/resources/${id}/search?keyword=${encodeURIComponent(
          searchQuery
        )}`
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("Search failed:", data);
        return;
      }

      setResources(data.resources);
    } catch (err) {
      console.error("Error searching resources:", err);
    }
  };

  const handleUpdateSubject = async (e) => {
    e.preventDefault();

    if (!userId) {
      alert("Please log in first.");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/subjects/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: parseInt(userId),
            name: subjectForm.name,
            description: subjectForm.description,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("Failed to update subject:", data);
        alert(data.detail || data.error || "Failed to update subject.");
        return;
      }

      setSubject(data.subject);
      setIsEditingSubject(false);
    } catch (err) {
      console.error("Error updating subject:", err);
    }
  };

  const handleDeleteSubject = async () => {
    if (!userId) {
      alert("Please log in first.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this subject?")) {
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/subjects/${id}?user_id=${userId}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("Failed to delete subject:", data);
        alert(data.detail || data.error || "Failed to delete subject.");
        return;
      }

      navigate("/personal");
    } catch (err) {
      console.error("Error deleting subject:", err);
    }
  };

  const handleCreateResource = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(
        `${API_BASE_URL}/resources`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subject_id: parseInt(id),
            title: newResource.title,
            description: newResource.description,
            resource_type: newResource.resource_type,
            resource_url: newResource.resource_url,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("Failed to create resource:", data);
        alert(data.detail || data.error || "Failed to create resource.");
        return;
      }

      setNewResource({
        title: "",
        description: "",
        resource_type: "",
        resource_url: "",
      });

      setShowAddResource(false);

      fetchResources();
    } catch (err) {
      console.error("Error creating resource:", err);
    }
  };

  const handleUpdateResource = async (resourceId, updatedData) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/resources/${resourceId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subject_id: parseInt(id),
            ...updatedData,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("Failed to update resource:", data);
        return;
      }

      fetchResources();
    } catch (err) {
      console.error("Error updating resource:", err);
    }
  };

  const handleDeleteResource = async (resourceId) => {
    if (!window.confirm("Delete this resource?")) {
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/resources/${resourceId}?subject_id=${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("Failed to delete resource:", data);
        return;
      }

      fetchResources();
    } catch (err) {
      console.error("Error deleting resource:", err);
    }
  };

  const handleToggleFavorite = async (resourceId) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/resources/${resourceId}/favorite?subject_id=${id}`,
        {
          method: "PUT",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("Failed to toggle favorite:", data);
        return;
      }

      fetchResources();
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  const subjectName = subject ? subject.name : "Loading...";
  const subjectDesc = subject ? subject.description : "";

  return (
    <div className="subject-page">
      <button
        type="button"
        onClick={() => navigate("/personal")}
      >
        ← Back to Personal Space
      </button>
      <div className="subject-header">
        {isEditingSubject ? (
          <form onSubmit={handleUpdateSubject}>
            <input
              type="text"
              value={subjectForm.name}
              onChange={(e) =>
                setSubjectForm({
                  ...subjectForm,
                  name: e.target.value,
                })
              }
              required
            />

            <textarea
              value={subjectForm.description}
              onChange={(e) =>
                setSubjectForm({
                  ...subjectForm,
                  description: e.target.value,
                })
              }
            />

            <button type="submit">Save</button>

            <button
              type="button"
              onClick={() => setIsEditingSubject(false)}
            >
              Cancel
            </button>
          </form>
        ) : (
          <div>
            <h1>{subjectName}</h1>

            <p>{subjectDesc}</p>

            <div>
              <button
                type="button"
                onClick={() => setIsEditingSubject(true)}
              >
                Edit Subject
              </button>

              <button
                type="button"
                onClick={handleDeleteSubject}
              >
                Delete Subject
              </button>
            </div>
          </div>
        )}
      </div>

      <hr />
      <div className="resource-toolbar">
        <form onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <button type="submit">Search</button>

          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                fetchResources();
              }}
            >
              Clear
            </button>
          )}
        </form>

        <button
          type="button"
          onClick={() => setShowAddResource(!showAddResource)}
        >
          {showAddResource ? "Cancel" : "+ Add Resource"}
        </button>
      </div>

      {showAddResource && (
        <form
          onSubmit={handleCreateResource}
          className="add-resource-form"
        >
          <h3>Add New Resource</h3>

          <input
            type="text"
            placeholder="Title"
            value={newResource.title}
            onChange={(e) =>
              setNewResource({
                ...newResource,
                title: e.target.value,
              })
            }
            required
          />

          <input
            type="text"
            placeholder="Type (e.g. Note, Link, Video, Book)"
            value={newResource.resource_type}
            onChange={(e) =>
              setNewResource({
                ...newResource,
                resource_type: e.target.value,
              })
            }
            required
          />

          <input
            type="text"
            placeholder="URL or Path"
            value={newResource.resource_url}
            onChange={(e) =>
              setNewResource({
                ...newResource,
                resource_url: e.target.value,
              })
            }
          />

          <textarea
            placeholder="Description"
            value={newResource.description}
            onChange={(e) =>
              setNewResource({
                ...newResource,
                description: e.target.value,
              })
            }
          />

          <button type="submit">Create Resource</button>
        </form>
      )}

      <div className="resource-list">
        <h2>Resources ({resources.length})</h2>

        {resources.length === 0 ? (
          <p>No resources found for this subject.</p>
        ) : (
          resources.map((item) => (
            <ResourceCard
              key={item.id}
              resource={item}
              onDelete={handleDeleteResource}
              onUpdate={handleUpdateResource}
              onToggleFavorite={handleToggleFavorite}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Subject;