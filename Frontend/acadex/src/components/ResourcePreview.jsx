import { useState } from "react";
import "./ResourcePreview.css";
import { getResourcePreview } from "../utils/resourcePreview";

export default function ResourcePreview({ resourceType, resourceUrl }) {
  const [failed, setFailed] = useState(false);

  if (!resourceUrl) return null;

  const { kind, embedUrl } = getResourcePreview(resourceType, resourceUrl);

  if (kind === "none" || failed || !embedUrl) {
    return (
      <div className="resource-preview resource-preview-fallback">
        <p>Preview isn&apos;t available for this resource type.</p>

        <a href={resourceUrl} target="_blank" rel="noreferrer">
          Open Resource →
        </a>
      </div>
    );
  }

  return (
    <div className="resource-preview">
      {kind === "video-file" ? (
        <video
          className="resource-preview-media"
          src={embedUrl}
          controls
          onError={() => setFailed(true)}
        />
      ) : (
        <iframe
          className="resource-preview-media"
          src={embedUrl}
          title="Resource preview"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          onError={() => setFailed(true)}
        />
      )}

      <a
        className="resource-preview-open-link"
        href={resourceUrl}
        target="_blank"
        rel="noreferrer"
      >
        Open in new tab →
      </a>
    </div>
  );
}
