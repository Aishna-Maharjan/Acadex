import { useState } from "react";

import pdf from "../assets/pdf.png";
import doc from "../assets/doc.png";
import notes from "../assets/notes.png";
import video from "../assets/video.png";
import link from "../assets/link.png";
import ResourcePreview from "./ResourcePreview";

const TYPE_ICONS = {
  PDF: pdf,
  DOC: doc,
  Notes: notes,
  Video: video,
  Link: link,
};

const ResourceCard = ({
  resource,
  onDelete,
  onUpdate,
  onToggleFavorite,
  onShare,
  alreadyShared,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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
            <img src={icon} alt={resourceType} />
          </span>

          <h3>{title}</h3>
        </div>

        <div className="resource-card-actions">
          <button
            type="button"
            onClick={() => onToggleFavorite(id)}
            className={`icon-btn ${isFavorite ? "fav-active" : ""}`}
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
        <span className="resource-type-badge">{resourceType}</span>
      </div>

      {resourceUrl && (
        <div className="resource-card-open-row">
          <button
            type="button"
            className="resource-link resource-preview-toggle"
            onClick={() => setShowPreview((prev) => !prev)}
          >
            {showPreview ? "Hide Preview" : "Preview"}
          </button>

          <a
            href={resourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="resource-link"
          >
            Open Resource ↗
          </a>
        </div>
      )}

      {showPreview && (
        <ResourcePreview resourceType={resourceType} resourceUrl={resourceUrl} />
      )}

      {description && <p className="resource-notes-preview">{description}</p>}

      {alreadyShared ? (
        <div className="shared-community-label">✓ Shared to Community</div>
      ) : (
        onShare && (
          <button
            type="button"
            className="share-community-btn"
            onClick={() => onShare(resource)}
          >
            Share to Community
          </button>
        )
      )}
    </div>
  );
};

export default ResourceCard;
