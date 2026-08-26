import { useEffect, useState } from "react";
import "./Community.css";
import Navbar from "../components/Navbar";

import cmt from "../assets/cmt.png";
import like from "../assets/like.png";
import unlike from "../assets/unlike.png";

export default function Community() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [likedPosts, setLikedPosts] = useState([]);
  const [likeCounts, setLikeCounts] = useState({});

  const [openComments, setOpenComments] = useState([]);
  const [comments, setComments] = useState({});
  const [commentText, setCommentText] = useState({});

  useEffect(() => {
    fetch("http://127.0.0.1:8000/community")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch posts");
        }
        return response.json();
      })
      .then((data) => {
        setPosts(data.posts);

        data.posts.forEach((post) => {
          fetch(`http://127.0.0.1:8000/community/${post.id}/likes`)
            .then((response) => response.json())
            .then((likeData) => {
              setLikeCounts((prev) => ({
                ...prev,
                [post.id]: likeData.likes,
              }));
            });
        });

        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, []);

  const handleLike = async (postId) => {
    const userId = Number(localStorage.getItem("userId"));

    try {
      if (likedPosts.includes(postId)) {
        await fetch(
          `http://127.0.0.1:8000/community/${postId}/like?user_id=${userId}`,
          {
            method: "DELETE",
          },
        );

        setLikedPosts(likedPosts.filter((id) => id !== postId));

        setLikeCounts((prev) => ({
          ...prev,
          [postId]: Math.max((prev[postId] || 1) - 1, 0),
        }));
      } else {
        await fetch(`http://127.0.0.1:8000/community/${postId}/like`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
          }),
        });

        setLikedPosts([...likedPosts, postId]);

        setLikeCounts((prev) => ({
          ...prev,
          [postId]: (prev[postId] || 0) + 1,
        }));
      }
    } catch (error) {
      console.error("Like error:", error);
    }
  };

  const handleCommentClick = async (postId) => {
    if (openComments.includes(postId)) {
      setOpenComments(openComments.filter((id) => id !== postId));
      return;
    }
    setOpenComments([...openComments, postId]);
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/community/${postId}/comments`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch comments");
      }

      const data = await response.json();

      setComments((prev) => ({
        ...prev,
        [postId]: data.comments,
      }));
    } catch (error) {
      console.error("Comment fetch error:", error);
    }
  };

  const handleAddComment = async (postId) => {
    const userId = Number(localStorage.getItem("userId"));
    const text = commentText[postId]?.trim();

    if (!text) {
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/community/${postId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            comment: text,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to add comment");
      }

      const data = await response.json();
      setComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), data.comment],
      }));

      // Clear input
      setCommentText((prev) => ({
        ...prev,
        [postId]: "",
      }));
    } catch (error) {
      console.error("Add comment error:", error);
    }
  };
  const handleDeleteComment = async (commentId, postId) => {
    try {
      const userId = Number(localStorage.getItem("userId"));

      const response = await fetch(
        `http://127.0.0.1:8000/community/comments/${commentId}?user_id=${userId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete comment");
      }

      setComments((prev) => ({
        ...prev,
        [postId]: prev[postId].filter((comment) => comment.id !== commentId),
      }));
    } catch (error) {
      console.error("Delete comment error:", error);
    }
  };

  if (loading) {
    return <div className="community-page">Loading community posts...</div>;
  }

  if (error) {
    return <div className="community-page">{error}</div>;
  }

  return (
    <div className="community-page">
      <div className="community-header">
        <Navbar />
        <h1>Community</h1>
        <p>Share and discover useful academic resources.</p>
      </div>

      <div className="community-posts">
        {posts.map((post) => (
          <div className="community-card" key={post.id}>
            <div className="post-header">
              <div className="post-avatar">
                {post.username?.charAt(0).toUpperCase()}
              </div>

              <div>
                <h3>{post.title}</h3>
                <p>By @{post.username}</p>
              </div>
            </div>

            <div className="post-content">
              <p>{post.description}</p>
            </div>

            <div className="post-resource">
              <span>{post.resource_type}</span>

              <a href={post.resource_url} target="_blank" rel="noreferrer">
                View Resource
              </a>
            </div>

            <div className="post-footer">
              <span
                onClick={() => handleLike(post.id)}
                className={likedPosts.includes(post.id) ? "liked" : ""}
              >
                {likedPosts.includes(post.id) ? (
                  <img src={like} alt="Like" />
                ) : (
                  <img src={unlike} alt="Unlike" />
                )}
                {likeCounts[post.id] || 0} Like
              </span>

              <span onClick={() => handleCommentClick(post.id)}>
                <img src={cmt} alt="Comment" />
                Comment
              </span>
            </div>
            {openComments.includes(post.id) && (
              <div className="comments-section">
                <h4>Comments</h4>

                <div className="comment-list">
                  {comments[post.id]?.length > 0 ? (
                    comments[post.id].map((comment) => (
                      <div className="comment-item" key={comment.id}>
                        <div className="comment-avatar">
                          {comment.username?.charAt(0).toUpperCase()}
                        </div>

                        <div className="comment-content">
                          <strong>@{comment.username}</strong>
                          <p>{comment.comment}</p>

                          {comment.user_id ===
                            Number(localStorage.getItem("userId")) && (
                            <button
                              onClick={() =>
                                handleDeleteComment(comment.id, post.id)
                              }
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="no-comments">No comments yet.</p>
                  )}
                </div>

                <div className="comment-input">
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={commentText[post.id] || ""}
                    onChange={(e) =>
                      setCommentText((prev) => ({
                        ...prev,
                        [post.id]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddComment(post.id);
                      }
                    }}
                  />

                  <button onClick={() => handleAddComment(post.id)}>
                    Post
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
