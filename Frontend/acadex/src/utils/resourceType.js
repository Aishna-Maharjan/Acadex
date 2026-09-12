const TYPE_COLORS = {
  PDF: { bg: "rgba(200, 92, 78, 0.14)", text: "#B0503F", border: "rgba(200, 92, 78, 0.35)" },
  DOC: { bg: "rgba(90, 130, 201, 0.14)", text: "#3E6BB0", border: "rgba(90, 130, 201, 0.35)" },
  VIDEO: { bg: "rgba(154, 106, 201, 0.14)", text: "#7C4FAD", border: "rgba(154, 106, 201, 0.35)" },
  NOTES: { bg: "rgba(114, 168, 122, 0.14)", text: "#4C8955", border: "rgba(114, 168, 122, 0.35)" },
  LINK: { bg: "rgba(88, 170, 178, 0.14)", text: "#317A82", border: "rgba(88, 170, 178, 0.35)" },
};

const DEFAULT_COLOR = {
  bg: "rgba(232, 201, 122, 0.16)",
  text: "#A88932",
  border: "rgba(232, 201, 122, 0.45)",
};

export function getTypeColor(type) {
  const key = (type || "").toUpperCase();
  return TYPE_COLORS[key] || DEFAULT_COLOR;
}
