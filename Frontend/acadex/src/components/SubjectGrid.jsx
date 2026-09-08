import SubjectCard from "./SubjectCard";
import sub from "../assets/sub.png";

function SubjectGrid({ subjects = [], onDelete }) {
  return (
    <div className="subject-grid">
      {subjects.length === 0 ? (
        <div className="subject-grid-empty">
          <div className="subject-grid-empty-icon">
            <img src={sub} alt="Logo" />
          </div>

          <h3>No subjects yet</h3>

          <p>Add your first subject to get started.</p>
        </div>
      ) : (
        <div className="grid">
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              id={subject.id}
              name={subject.name}
              color={subject.color}
              resourceCount={subject.resources?.length || 0}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default SubjectGrid;