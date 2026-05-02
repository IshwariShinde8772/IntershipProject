import { api } from "./api";

const sanitizeDocumentName = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

const extractBlobErrorMessage = async (error, fallbackMessage) => {
  const responseData = error?.response?.data;

  if (responseData instanceof Blob) {
    try {
      const text = await responseData.text();
      const parsed = JSON.parse(text);
      if (parsed?.message) {
        return parsed.message;
      }
    } catch {
      return fallbackMessage;
    }
  }

  return error?.response?.data?.message ?? error?.message ?? fallbackMessage;
};

export const openDocument = async (url, name = "document") => {
  if (!url) {
    throw new Error("Document URL is missing");
  }

  const popup = typeof window !== "undefined" ? window.open("", "_blank", "noopener,noreferrer") : null;

  try {
    const response = await api.get("/uploads/view", {
      params: {
        url,
        name: sanitizeDocumentName(name)
      },
      responseType: "blob",
      timeout: 60000
    });

    const blob = response.data instanceof Blob
      ? response.data
      : new Blob([response.data], {
          type: response.headers["content-type"] ?? "application/octet-stream"
        });
    const objectUrl = window.URL.createObjectURL(blob);

    if (popup) {
      popup.location.href = objectUrl;
    } else {
      const link = document.createElement("a");
      link.href = objectUrl;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.click();
    }

    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
  } catch (error) {
    if (popup && !popup.closed) {
      popup.close();
    }

    throw new Error(await extractBlobErrorMessage(error, "Unable to open document"));
  }
};
