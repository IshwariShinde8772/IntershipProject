export const downloadBlob = async (requestFactory, filename) => {
  const response = await requestFactory();
  const blob = response instanceof Blob ? response : await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
