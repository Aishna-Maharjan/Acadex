import React, { useState } from 'react';

const ResourceCard = ({ resource, onDelete, onUpdate, onToggleFavorite }) => {
  const [isEditing, setIsEditing] = useState(false);
  const id = resource.id || resource[0];
  const title = resource.title || resource[2];
  const description = resource.description || resource[3];
  const resourceType = resource.resource_type || resource[4];
  const resourceUrl = resource.resource_url || resource[5];
  const isFavorite = resource.is_favorite ?? resource[6];

  const [formData, setFormData] = useState({
    title: title || '',
    description: description || '',
    resource_type: resourceType || '',
    resource_url: resourceUrl || ''
  });

  const handleSave = (e) => {
    e.preventDefault();
    onUpdate(id, formData);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="resource-card editing">
        <form onSubmit={handleSave}>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Resource Title"
            required
          />
          <input
            type="text"
            value={formData.resource_type}
            onChange={(e) => setFormData({ ...formData, resource_type: e.target.value })}
            placeholder="Type (e.g. PDF, Link, Video)"
            required
          />
          <input
            type="text"
            value={formData.resource_url}
            onChange={(e) => setFormData({ ...formData, resource_url: e.target.value })}
            placeholder="URL / File path"
          />
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description"
          />
          <div>
            <button type="submit">Save</button>
            <button type="button" onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="resource-card">
      <div>
        <h3>{title}</h3>
        <span>{resourceType}</span>
        <button type="button" onClick={() => onToggleFavorite(id)}>
          {isFavorite ? '★ Favorited' : '☆ Favorite'}
        </button>
      </div>

      <p>{description}</p>

      {resourceUrl && (
        <a href={resourceUrl} target="_blank" rel="noopener noreferrer">
          Open Resource ↗
        </a>
      )}

      <div>
        <button type="button" onClick={() => setIsEditing(true)}>Edit</button>
        <button type="button" onClick={() => onDelete(id)}>Delete</button>
      </div>
    </div>
  );
};

export default ResourceCard;