import { api } from "./api";

export const uploadFile = async (file, options = {}) => {
  const formData = new FormData();
  formData.append("file", file);
  if (options.folder) {
    formData.append("folder", options.folder);
  }
  if (options.resourceType) {
    formData.append("resourceType", options.resourceType);
  }

  try {
    const response = await api.post("/uploads/single", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      },
      timeout: 60000
    });
    return response.data.url;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ??
        error.message ??
        `Unable to upload ${file?.name ?? "file"}`
    );
  }
};
