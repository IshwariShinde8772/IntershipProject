export const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "string" && ["na", "n/a", "-"].includes(value.trim().toLowerCase())) {
    return null;
  }

  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

export const toIntOrDefault = (value, defaultValue = 0) => {
  const numeric = toNumberOrNull(value);
  return numeric === null ? defaultValue : Math.trunc(numeric);
};

export const toDateOrNull = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const pick = (object, keys) =>
  keys.reduce((accumulator, key) => {
    if (object[key] !== undefined) {
      accumulator[key] = object[key];
    }

    return accumulator;
  }, {});

export const parseDelimitedValues = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};
