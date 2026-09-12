import "./StarRating.css";

export default function StarRating({
  value = 0,
  onRate,
  count,
  size = 15,
  readOnly = false,
}) {
  const rounded = Math.round(value);
  const stars = [1, 2, 3, 4, 5];

  return (
    <div
      className={`star-rating${readOnly ? "" : " interactive"}`}
      role={readOnly ? "img" : "radiogroup"}
      aria-label={
        readOnly
          ? `Rated ${value} out of 5 stars`
          : "Rate this resource"
      }
    >
      <div className="star-rating-stars">
        {stars.map((star) => (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            className={star <= rounded ? "star filled" : "star"}
            style={{ fontSize: size }}
            onClick={(event) => {
              event.stopPropagation();
              event.preventDefault();
              if (onRate) onRate(star);
            }}
            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
          >
            ★
          </button>
        ))}
      </div>

      {typeof count === "number" && (
        <span className="star-rating-count">
          {value > 0 ? value.toFixed(1) : "No ratings"}
          {count > 0 && ` (${count})`}
        </span>
      )}
    </div>
  );
}
