import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Community.css";
import Navbar from "../components/Navbar";
import like from "../assets/like.png";
import unlike from "../assets/unlike.png";
import pdf from "../assets/pdf.png";
import doc from "../assets/doc.png";
import notes from "../assets/notes.png";
import video from "../assets/video.png";
import link from "../assets/link.png";
import empty from "../assets/empty.png";
import cmt from "../assets/cmt.png";
import search from "../assets/search.png";

const API_URL = "http://127.0.0.1:8000";

export default function Community() {
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [likedPosts, setLikedPosts] = useState([]);
  const [likeCounts, setLikeCounts] = useState({});
  const [commentCounts, setCommentCounts] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showMoreRecommended, setShowMoreRecommended] = useState(false);

  const userId = Number(localStorage.getItem("userId"));

  useEffect(() => {
    fetchPosts();
  }, []);

  async function loadPostCounts(fetchedPosts) {
    const likeResults = {};
    const commentResults = {};

    await Promise.all(
      fetchedPosts.map(async (post) => {
        try {
          const likeResponse = await fetch(
            `${API_URL}/community/${post.id}/likes`,
          );

          if (likeResponse.ok) {
            const likeData = await likeResponse.json();
            likeResults[post.id] = likeData.likes || 0;
          }
        } catch (error) {
          console.error("Like count error:", error);
        }

        try {
          const commentResponse = await fetch(
            `${API_URL}/community/${post.id}/comments`,
          );

          if (commentResponse.ok) {
            const commentData = await commentResponse.json();
            commentResults[post.id] = commentData.comments?.length || 0;
          }
        } catch (error) {
          console.error("Comment count error:", error);
        }
      }),
    );

    setLikeCounts(likeResults);
    setCommentCounts(commentResults);
  }

  async function fetchPosts() {
    setLoading(true);
    setError("");
    setShowMoreRecommended(false);

    try {
      const response = await fetch(`${API_URL}/community`);

      if (!response.ok) {
        throw new Error("Failed to fetch community posts");
      }

      const data = await response.json();
      const fetchedPosts = data.posts || [];

      setPosts(fetchedPosts);
      await loadPostCounts(fetchedPosts);
    } catch (error) {
      console.error("Community fetch error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(value) {
    setSearchQuery(value);
    setShowMoreRecommended(false);

    if (!value.trim()) {
      fetchPosts();
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/community/search?keyword=${encodeURIComponent(value)}`,
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      const searchedPosts = data.posts || [];

      setPosts(searchedPosts);
      await loadPostCounts(searchedPosts);
    } catch (error) {
      console.error("Search error:", error);
    }
  }

  async function handleLike(postId) {
    try {
      if (likedPosts.includes(postId)) {
        const response = await fetch(
          `${API_URL}/community/${postId}/like?user_id=${userId}`,
          {
            method: "DELETE",
          },
        );

        if (!response.ok) {
          throw new Error("Failed to unlike resource");
        }

        setLikedPosts((prev) => prev.filter((id) => id !== postId));

        setLikeCounts((prev) => ({
          ...prev,
          [postId]: Math.max((prev[postId] || 1) - 1, 0),
        }));
      } else {
        const response = await fetch(`${API_URL}/community/${postId}/like`, {
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

        setLikedPosts((prev) => [...prev, postId]);

        setLikeCounts((prev) => ({
          ...prev,
          [postId]: (prev[postId] || 0) + 1,
        }));
      }
    } catch (error) {
      console.error("Like error:", error);
    }
  }

  async function handleDeletePost(postId) {
    const confirmed = window.confirm("Delete this resource from Community?");

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_URL}/community/${postId}?user_id=${userId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to delete resource");
      }

      setPosts((prev) => prev.filter((post) => post.id !== postId));
      setLikeCounts((prev) => {
        const updated = { ...prev };
        delete updated[postId];
        return updated;
      });

      setCommentCounts((prev) => {
        const updated = { ...prev };
        delete updated[postId];
        return updated;
      });

      setLikedPosts((prev) => prev.filter((id) => id !== postId));
    } catch (error) {
      console.error("Delete community post error:", error);
      alert(error.message);
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

  function getSortedPosts(list) {
    return [...list].sort((a, b) => {
      const dateA = new Date(a.created_at || a.createdAt || 0);
      const dateB = new Date(b.created_at || b.createdAt || 0);

      return dateB - dateA;
    });
  }

  const sortedPosts = useMemo(() => getSortedPosts(posts), [posts]);

  const recommendedPosts = useMemo(() => {
    const limit = showMoreRecommended ? 8 : 4;
    return sortedPosts.slice(0, limit);
  }, [sortedPosts, showMoreRecommended]);

  const popularPosts = useMemo(() => {
    return [...posts]
      .sort((a, b) => (likeCounts[b.id] || 0) - (likeCounts[a.id] || 0))
      .slice(0, 4);
  }, [posts, likeCounts]);

  const recentPosts = useMemo(() => {
    return sortedPosts.slice(0, 4);
  }, [sortedPosts]);

  function ResourceCard({ post }) {
    return (
      <article className="community-resource-card">
        <div className="resource-card-top">
          <div className="resource-icon">
            <img
              src={getResourceIcon(post.resource_type)}
              alt={post.resource_type || "Resource"}
            />
          </div>

          <span className="resource-type">
            {post.resource_type || "RESOURCE"}
          </span>
        </div>

        <h3>{post.title}</h3>

        <p className="resource-shared-by">
          Shared by <strong>@{post.username || "student"}</strong>
        </p>

        <p className="resource-description">
          {post.description ||
            "A useful academic resource shared with the community."}
        </p>

        <div className="resource-card-footer">
          <div className="resource-stats">
            <button
              type="button"
              onClick={() => handleLike(post.id)}
              className={
                likedPosts.includes(post.id)
                  ? "resource-stat liked"
                  : "resource-stat"
              }
            >
              <img src={likedPosts.includes(post.id) ? like : unlike} alt="" />

              <span>{likeCounts[post.id] || 0}</span>
            </button>

            <span className="resource-stat">
              <span className="comment-symbol"><img src={cmt} alt="comments" /></span>
              {commentCounts[post.id] || 0}
            </span>
          </div>

          <div className="community-card-actions">
            {post.user_id === userId && (
              <button
                type="button"
                className="delete-community-button"
                onClick={() => handleDeletePost(post.id)}
              >
                Delete
              </button>
            )}

            <button
              type="button"
              className="view-resource-button"
              onClick={() => navigate(`/community/resource/${post.id}`)}
            >
              View Resource
            </button>
          </div>
        </div>
      </article>
    );
  }

  if (loading) {
    return (
      <div className="community-page">
        <Navbar />
        <div className="community-loading">Loading community...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="community-page">
        <Navbar />

        <div className="community-error">
          <h2>Unable to load Community</h2>
          <p>{error}</p>

          <button onClick={fetchPosts}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="community-page">
      <Navbar />

      <main className="community-main">
        <section className="community-header">
          <h1>Learn together.</h1>

          <p>
            Discover useful academic resources shared by students across Acadex.
          </p>
        </section>

        <section className="community-search-section">
          <div className="community-search">
            <span><img src={search} alt="Search" /></span>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search resources, posts, subjects..."
            />
          </div>
        </section>

        <section className="community-section">
          <div className="community-section-heading">
            <div>
              <span className="community-section-label">FOR YOU</span>

              <h2>Recommended Resources</h2>
            </div>

            {sortedPosts.length > 0 && (
              <span className="resource-count">
                {recommendedPosts.length} shown
              </span>
            )}
          </div>

          {recommendedPosts.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="resource-grid">
                {recommendedPosts.map((post) => (
                  <ResourceCard key={`recommended-${post.id}`} post={post} />
                ))}
              </div>

              {sortedPosts.length > 4 && (
                <div className="show-more-container">
                  <button
                    type="button"
                    className="show-more-button"
                    onClick={() => setShowMoreRecommended((prev) => !prev)}
                  >
                    {showMoreRecommended ? "Show Less" : "Show More"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {popularPosts.length > 0 && (
          <section className="community-section">
            <div className="community-section-heading">
              <div>
                <span className="community-section-label">MOST LOVED</span>

                <h2>Popular Resources</h2>
              </div>
            </div>

            <div className="resource-grid">
              {popularPosts.map((post) => (
                <ResourceCard key={`popular-${post.id}`} post={post} />
              ))}
            </div>
          </section>
        )}

        {recentPosts.length > 0 && (
          <section className="community-section recent-section">
            <div className="community-section-heading">
              <div>
                <span className="community-section-label">JUST SHARED</span>

                <h2>Recent Resources</h2>
              </div>
            </div>

            <div className="resource-grid">
              {recentPosts.map((post) => (
                <ResourceCard key={`recent-${post.id}`} post={post} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="community-empty">
      <div className="empty-icon">
        <img src={empty} alt="No resources" />
      </div>

      <h3>No resources found</h3>

      <p>Try a different search or check back later for new resources.</p>
    </div>
  );
}
