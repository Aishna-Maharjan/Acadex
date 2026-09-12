export function timeAgo(dateString) {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (Number.isNaN(seconds) || seconds < 0) return "just now";
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}

export function getNotificationVerb(type) {
  switch (type) {
    case "like":
      return "liked your resource";
    case "comment":
      return "commented on your resource";
    case "rating":
      return "rated your resource";
    default:
      return "sent you a notification";
  }
}

export function getNotificationText(notification) {
  const actor = notification.sender_username
    ? `@${notification.sender_username}`
    : "Someone";

  const verb = getNotificationVerb(notification.type);

  const postPart = notification.post_title
    ? ` — "${notification.post_title}"`
    : "";

  return `${actor} ${verb}${postPart}`;
}

const AVATAR_PALETTE = [
  "#E8C97A",
  "#8FB39E",
  "#C97A7A",
  "#7A9CC9",
  "#B98FC9",
  "#C9A87A",
];

export function getAvatarColor(seed) {
  const text = String(seed || "");
  let hash = 0;

  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % AVATAR_PALETTE.length;
  }

  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}
