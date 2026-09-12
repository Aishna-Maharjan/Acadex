// Figures out how (and whether) a resource_url can be shown inline, based on
// the resource type and the host of the URL. Falls back gracefully to
// "no inline preview" for anything we don't recognize — the caller should
// always keep an "open in new tab" link alongside the preview.

function safeUrl(rawUrl) {
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}

function getYouTubeEmbed(url) {
  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const videoId = url.pathname.slice(1);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname === "/watch") {
      const videoId = url.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (url.pathname.startsWith("/embed/")) {
      return url.toString();
    }

    if (url.pathname.startsWith("/shorts/")) {
      const videoId = url.pathname.split("/")[2];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
  }

  return null;
}

function getVimeoEmbed(url) {
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "vimeo.com") return null;

  const videoId = url.pathname.split("/").filter(Boolean)[0];
  return videoId && /^\d+$/.test(videoId)
    ? `https://player.vimeo.com/video/${videoId}`
    : null;
}

function getGoogleDriveEmbed(url) {
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "drive.google.com") return null;

  // .../file/d/<id>/view  ->  .../file/d/<id>/preview
  const match = url.pathname.match(/\/file\/d\/([^/]+)/);
  if (match) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }

  return null;
}

function getGoogleDocsEmbed(url) {
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "docs.google.com") return null;

  // Google Docs/Sheets/Slides already support an embeddable form by
  // swapping the trailing action for /preview.
  const match = url.pathname.match(
    /^\/(document|spreadsheets|presentation)\/d\/([^/]+)/,
  );

  if (match) {
    return `https://docs.google.com/${match[1]}/d/${match[2]}/preview`;
  }

  return null;
}

// Returns { kind, embedUrl } where kind is one of:
// "video-embed"  – render in an <iframe> (YouTube/Vimeo)
// "video-file"   – render in a native <video> tag (direct .mp4/.webm/etc.)
// "pdf"          – render in an <iframe> (works for direct PDF links)
// "doc-viewer"   – render via Google's generic doc viewer (best-effort)
// "iframe"       – Drive/Docs preview, or a generic link, rendered in an
//                   iframe (may be blocked by the source's own X-Frame-Options)
// "none"         – nothing we can safely embed; show the open link only
export function getResourcePreview(resourceType, rawUrl) {
  if (!rawUrl) return { kind: "none", embedUrl: null };

  const url = safeUrl(rawUrl);
  if (!url) return { kind: "none", embedUrl: null };

  const type = (resourceType || "").toUpperCase();

  const youTube = getYouTubeEmbed(url);
  if (youTube) return { kind: "video-embed", embedUrl: youTube };

  const vimeo = getVimeoEmbed(url);
  if (vimeo) return { kind: "video-embed", embedUrl: vimeo };

  const drive = getGoogleDriveEmbed(url);
  if (drive) return { kind: "iframe", embedUrl: drive };

  const googleDocs = getGoogleDocsEmbed(url);
  if (googleDocs) return { kind: "iframe", embedUrl: googleDocs };

  const extensionMatch = url.pathname.match(/\.([a-z0-9]+)$/i);
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : null;

  if (extension === "pdf" || type === "PDF") {
    return { kind: "pdf", embedUrl: url.toString() };
  }

  if (["mp4", "webm", "ogg"].includes(extension)) {
    return { kind: "video-file", embedUrl: url.toString() };
  }

  if (type === "VIDEO") {
    // Unknown video host — safest bet is to let the browser try an iframe,
    // the component will fall back to "open in new tab" if it fails.
    return { kind: "iframe", embedUrl: url.toString() };
  }

  if (["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(extension)) {
    return {
      kind: "doc-viewer",
      embedUrl: `https://docs.google.com/gview?url=${encodeURIComponent(
        url.toString(),
      )}&embedded=true`,
    };
  }

  if (type === "DOC") {
    return {
      kind: "doc-viewer",
      embedUrl: `https://docs.google.com/gview?url=${encodeURIComponent(
        url.toString(),
      )}&embedded=true`,
    };
  }

  // NOTES / LINK / unknown — no reliable inline preview.
  return { kind: "none", embedUrl: null };
}
