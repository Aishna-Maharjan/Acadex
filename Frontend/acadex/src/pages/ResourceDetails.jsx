import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import like from "../assets/like.png";
import unlike from "../assets/unlike.png";
import "./ResourceDetails.css";
import pdf from "../assets/pdf.png";
import doc from "../assets/doc.png";
import notes from "../assets/notes.png";
import video from "../assets/video.png";
import link from "../assets/link.png";
import cmt from "../assets/cmt.png";

const API_URL = "http://127.0.0.1:8000";

export default function ResourceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const userId = Number(localStorage.getItem("userId"));

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    fetchResource();
  }, [id]);

  async function fetchResource() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/community`);

      if (!response.ok) {
        throw new Error("Failed to load resource");
      }

      const data = await response.json();

      const foundPost = (data.posts || []).find(
        (item) => String(item.id) === String(id),
      );

      if (!foundPost) {
        throw new Error("Resource not found");
      }

      setPost(foundPost);

      await Promise.all([
        fetchLikes(foundPost.id),
        fetchComments(foundPost.id),
      ]);
    } catch (error) {
      console.error("Resource details error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLikes(postId) {
    try {
      const response = await fetch(`${API_URL}/community/${postId}/likes`);

      if (!response.ok) return;

      const data = await response.json();
      setLikeCount(data.likes || 0);
    } catch (error) {
      console.error("Like fetch error:", error);
    }
  }

  async function fetchComments(postId) {
    try {
      const response = await fetch(`${API_URL}/community/${postId}/comments`);

      if (!response.ok) return;

      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error("Comments fetch error:", error);
    }
  }

  async function handleLike() {
    try {
      if (liked) {
        const response = await fetch(
          `${API_URL}/community/${id}/like?user_id=${userId}`,
          {
            method: "DELETE",
          },
        );

        if (!response.ok) {
          throw new Error("Failed to unlike resource");
        }

        setLiked(false);
        setLikeCount((prev) => Math.max(prev - 1, 0));
      } else {
        const response = await fetch(`${API_URL}/community/${id}/like`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to like resource");
        }

        setLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Like error:", error);
    }
  }

  async function handleAddComment() {
    const text = commentText.trim();

    if (!text) return;

    try {
      const response = await fetch(`${API_URL}/community/${id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          comment: text,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add comment");
      }

      const data = await response.json();

      setComments((prev) => [...prev, data.comment]);

      setCommentText("");
    } catch (error) {
      console.error("Add comment error:", error);
    }
  }

  async function handleDeleteComment(commentId) {
    try {
      const response = await fetch(
        `${API_URL}/community/comments/${commentId}?user_id=${userId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete comment");
      }

      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    } catch (error) {
      console.error("Delete comment error:", error);
    }
  }

  function getResourceIcon(type) {
    switch ((type || "").toUpperCase()) {
      case "PDF":
        return pdf;
      case "DOC":
        return doc;
      case "VIDEO":
        return video;
      case "NOTES":
        return notes;
      case "LINK":
        return link;
      default:
        return notes;
    }
  }

  if (loading) {
    return (
      <div className="resource-details-page">
        <Navbar />

        <div className="resource-details-loading">Loading resource...</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="resource-details-page">
        <Navbar />

        <div className="resource-details-error">
          <h2>Resource not found</h2>

          <p>{error || "This resource could not be found."}</p>

          <button onClick={() => navigate("/community")}>
            Back to Community
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="resource-details-page">
      <Navbar />

      <main className="resource-details-main">
        <button
          type="button"
          className="back-button"
          onClick={() => navigate("/community")}
        >
          ← Back to Community
        </button>

        <article className="resource-details-card">
          <div className="details-header">
            <div className="details-resource-icon">
              <img
                src={getResourceIcon(post.resource_type)}
                alt={post.resource_type || "Resource"}
              />
            </div>

            <div>
              <span className="details-resource-type">
                {post.resource_type || "RESOURCE"}
              </span>

              <h1>{post.title}</h1>

              <p className="details-shared-by">
                Shared by <strong>@{post.username || "student"}</strong>
              </p>
            </div>
          </div>

          <div className="details-description">
            <h2>About this resource</h2>

            <p>
              {post.description ||
                "A useful academic resource shared with the community."}
            </p>
          </div>

          {post.resource_url && (
            <div className="details-resource-box">
              <div>
                <span>RESOURCE LINK</span>

                <p>
                  Open the shared resource to study or explore its contents.
                </p>
              </div>

              <a href={post.resource_url} target="_blank" rel="noreferrer">
                Open Resource →
              </a>
            </div>
          )}

          <div className="details-actions">
            <button
              type="button"
              onClick={handleLike}
              className={liked ? "details-action liked" : "details-action"}
            >
              <img src={liked ? like : unlike} alt="" />

              <span>
                {likeCount} Like
                {likeCount !== 1 ? "s" : ""}
              </span>
            </button>

            <span className="details-comment-count">
              <img src={cmt} alt="Comments" />{comments.length} Comment
              {comments.length !== 1 ? "s" : ""}
            </span>
          </div>
          <section className="details-comments">
            <h2>Comments</h2>

            <div className="comment-input-wrapper">
              <input
                type="text"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddComment();
                  }
                }}
              />

              <button type="button" onClick={handleAddComment}>
                Post
              </button>
            </div>

            <div className="details-comment-list">
              {comments.length === 0 ? (
                <p className="no-detail-comments">
                  No comments yet. Be the first to comment.
                </p>
              ) : (
                comments.map((comment) => (
                  <div className="detail-comment" key={comment.id}>
                    <div className="detail-comment-avatar">
                      {comment.username?.charAt(0).toUpperCase() || "U"}
                    </div>

                    <div className="detail-comment-body">
                      <strong>@{comment.username || "student"}</strong>

                      <p>{comment.comment}</p>

                      {comment.user_id === userId && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}
