import React, { useState } from "react";

const TYPE_ICONS = {
  PDF: "📄",
  Link: "🔗",
  DOC: "📝",
  Notes: "🗒️",
  Video: "🎬",
};

const ResourceCard = ({
  resource,
  onDelete,
  onUpdate,
  onToggleFavorite,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const id = resource.id || resource[0];
  const title = resource.title || resource[2];
  const description = resource.description || resource[3];
  const resourceType = resource.resource_type || resource[4];
  const resourceUrl = resource.resource_url || resource[5];
  const isFavorite = resource.is_favorite ?? resource[6];

  const [formData, setFormData] = useState({
    title: title || "",
    description: description || "",
    resource_type: resourceType || "",
    resource_url: resourceUrl || "",
  });

  const handleSave = (e) => {
    e.preventDefault();
    onUpdate(id, formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      title: title || "",
      description: description || "",
      resource_type: resourceType || "",
      resource_url: resourceUrl || "",
    });

    setIsEditing(false);
  };

  const icon = TYPE_ICONS[resourceType] || "📌";

  if (isEditing) {
    return (
      <div className="resource-card editing">
        <form onSubmit={handleSave}>
          <input
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData({
                ...formData,
                title: e.target.value,
              })
            }
            placeholder="Resource Title"
            required
          />

          <input
            type="text"
            value={formData.resource_type}
            onChange={(e) =>
              setFormData({
                ...formData,
                resource_type: e.target.value,
              })
            }
            placeholder="Type (e.g. PDF, Link, Video)"
            required
          />

          <input
            type="text"
            value={formData.resource_url}
            onChange={(e) =>
              setFormData({
                ...formData,
                resource_url: e.target.value,
              })
            }
            placeholder="URL / File path"
          />

          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({
                ...formData,
                description: e.target.value,
              })
            }
            placeholder="Description"
          />

          <div className="resource-edit-actions">
            <button type="submit">Save</button>

            <button type="button" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="resource-card">
      <div className="resource-card-header">
        <div className="resource-card-title-row">
          <span className="resource-type-icon">
            {icon}
          </span>

          <h3>{title}</h3>
        </div>

        <div className="resource-card-actions">
          <button
            type="button"
            onClick={() => onToggleFavorite(id)}
            className={`icon-btn ${
              isFavorite ? "fav-active" : ""
            }`}
            title="Toggle favorite"
          >
            {isFavorite ? "★" : "☆"}
          </button>

          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="icon-btn"
            title="Edit resource"
          >
            ✎
          </button>

          <button
            type="button"
            onClick={() => onDelete(id)}
            className="icon-btn icon-btn-danger"
            title="Delete resource"
          >
            ×
          </button>
        </div>
      </div>

      <div className="resource-card-meta">
        <span className="resource-type-badge">
          {resourceType}
        </span>
      </div>

      {resourceUrl && (
        <a
          href={resourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="resource-link"
        >
          Open Resource ↗
        </a>
      )}

      {description && (
        <p className="resource-notes-preview">
          {description}
        </p>
      )}
    </div>
  );
};

export default ResourceCard;