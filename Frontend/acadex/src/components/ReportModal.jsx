import { useState } from "react";
import "./ReportModal.css";

const REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "misinformation", label: "False information" },
  { value: "copyright", label: "Copyright violation" },
  { value: "other", label: "Something else" },
];

// Facebook-style "Report" dialog. Fully controlled by the parent:
// pass `open`, `onClose`, and `onSubmit(reason, details)`.
export default function ReportModal({ open, onClose, onSubmit, submitting, error }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");

  if (!open) return null;

  function handleClose() {
    setReason("");
    setDetails("");
    onClose();
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!reason) return;
    onSubmit(reason, details);
  }

  return (
    <div className="report-modal-overlay" onClick={handleClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <h3>Report this post</h3>
          <button
            type="button"
            className="report-modal-close"
            onClick={handleClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="report-modal-subtitle">
          Tell us what's wrong with this post. Your report is anonymous to
          other members.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="report-reason-list">
            {REASONS.map((r) => (
              <label
                key={r.value}
                className={
                  reason === r.value
                    ? "report-reason-option selected"
                    : "report-reason-option"
                }
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                />
                {r.label}
              </label>
            ))}
          </div>

          <textarea
            className="report-details-input"
            placeholder="Add any extra details (optional)"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={500}
            rows={3}
          />

          {error && <p className="report-modal-error">{error}</p>}

          <div className="report-modal-actions">
            <button type="button" className="report-cancel-btn" onClick={handleClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="report-submit-btn"
              disabled={!reason || submitting}
            >
              {submitting ? "Submitting..." : "Submit report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
