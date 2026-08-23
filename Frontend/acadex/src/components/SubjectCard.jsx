import { useNavigate } from "react-router-dom";

export default function SubjectCard({
  id,
  name,
  color,
  resourceCount = 0,
  onDelete,
}) {
  const navigate = useNavigate();

  const initial = (name || "").charAt(0).toUpperCase();

  function handleDelete(e) {
    e.stopPropagation();

    if (
      window.confirm(
        `Delete subject "${name}"? All its resources will be lost.`
      )
    ) {
      onDelete(id);
    }
  }

  return (
    <div className="subject-card">
      <div className="subject-card-top">
        <div
          className="subject-card-initial"
          style={{ background: color || "#1A1A2E" }}
        >
          {initial}
        </div>

        <button
          className="subject-card-delete"
          onClick={handleDelete}
          title="Delete subject"
          aria-label={`Delete ${name}`}
        >
          ×
        </button>
      </div>

      <h3>{name}</h3>

      <p>
        {resourceCount} resource
        {resourceCount !== 1 ? "s" : ""}
      </p>

      <button onClick={() => navigate(`/subject/${id}`)}>
        View guides →
      </button>
    </div>
  );
}