export const formatDate = (value, options) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", options ?? { dateStyle: "medium" }).format(new Date(value));
};

export const formatNumber = (value, digits = 2) => {
  if (value === null || value === undefined || value === "") return "-";
  return Number(value).toFixed(digits);
};

export const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
