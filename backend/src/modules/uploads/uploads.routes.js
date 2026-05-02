import { Router } from "express";
import createError from "http-errors";
import multer from "multer";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { getUploadDeliveryUrl, uploadBuffer } from "../../utils/upload.js";

const router = Router();
const defaultFolder = "kbtcoe-placement-tracker";
const allowedMimeTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/jpg"]);
const allowedResourceTypes = new Set(["auto", "image", "raw"]);
const allowedViewMimeTypes = new Set(["application/pdf", "image/png", "image/jpeg"]);

const privateIpv4Pattern =
  /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.)/;

const sanitizeFolder = (value) => {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/[^a-zA-Z0-9/_-]/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "");

  return normalized || defaultFolder;
};

const sanitizeFileName = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

const buildRawUploadPublicId = (value) => {
  const trimmed = String(value ?? "").trim();
  const extensionMatch = trimmed.match(/\.([a-z0-9]+)$/i);
  const extension = extensionMatch?.[1]?.toLowerCase() ?? "pdf";
  const baseName = sanitizeFileName(trimmed) || "document";

  return `${baseName}-${Date.now()}.${extension}`;
};

const getExtensionFromContentType = (contentType) => {
  if (contentType === "application/pdf") {
    return "pdf";
  }

  if (contentType === "image/png") {
    return "png";
  }

  if (contentType === "image/jpeg") {
    return "jpg";
  }

  return null;
};

const detectMimeTypeFromBuffer = (buffer) => {
  if (!buffer || buffer.length < 4) {
    return null;
  }

  if (buffer.subarray(0, 4).toString("ascii") === "%PDF") {
    return "application/pdf";
  }

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  return null;
};

const getExtensionFromUrl = (value) => {
  try {
    const parsedUrl = new URL(value);
    const lastSegment = parsedUrl.pathname.split("/").filter(Boolean).at(-1) ?? "";
    const match = lastSegment.match(/\.([a-z0-9]+)$/i);
    return match?.[1]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
};

const isAllowedDocumentUrl = (value) => {
  try {
    const parsedUrl = new URL(value);
    const protocolAllowed = parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
    const hostname = parsedUrl.hostname.toLowerCase();

    if (!protocolAllowed || parsedUrl.username || parsedUrl.password) {
      return false;
    }

    if (
      hostname === "localhost" ||
      hostname === "::1" ||
      hostname.endsWith(".local") ||
      privateIpv4Pattern.test(hostname)
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new Error("Only PDF, JPG, JPEG, and PNG files are allowed"));
      return;
    }

    callback(null, true);
  }
});

router.use(authMiddleware);

router.post(
  "/single",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    const folder = sanitizeFolder(req.body.folder);
    const requestedResourceType = String(req.body.resourceType ?? "auto").trim().toLowerCase();
    const resourceType = allowedResourceTypes.has(requestedResourceType)
      ? requestedResourceType
      : "auto";

    const uploadOptions =
      resourceType === "raw" && req.file.originalname
        ? {
            filename_override: req.file.originalname,
            public_id: buildRawUploadPublicId(req.file.originalname)
          }
        : {};

    const result = await uploadBuffer(req.file.buffer, folder, resourceType, uploadOptions);
    res.json({
      url: getUploadDeliveryUrl(result),
      publicId: result.public_id
    });
  })
);

router.get(
  "/view",
  asyncHandler(async (req, res) => {
    const sourceUrl = String(req.query.url ?? "").trim();
    if (!sourceUrl || !isAllowedDocumentUrl(sourceUrl)) {
      throw createError(400, "Invalid document URL");
    }

    const upstreamResponse = await fetch(sourceUrl, { redirect: "follow" });
    if (!upstreamResponse.ok) {
      throw createError(upstreamResponse.status === 404 ? 404 : 502, "Unable to fetch document");
    }

    const reportedContentType = (upstreamResponse.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
    const resolvedContentType = allowedViewMimeTypes.has(reportedContentType)
      ? reportedContentType
      : detectMimeTypeFromBuffer(buffer);

    if (!resolvedContentType || !allowedViewMimeTypes.has(resolvedContentType)) {
      throw createError(415, "Unsupported document type");
    }

    const extension = getExtensionFromContentType(resolvedContentType) ?? getExtensionFromUrl(sourceUrl) ?? "bin";
    const requestedName = sanitizeFileName(req.query.name);
    const fallbackName = sanitizeFileName(getExtensionFromUrl(sourceUrl) ? sourceUrl.split("/").at(-1) : "document");
    const fileName = `${requestedName || fallbackName || "document"}.${extension}`;

    res.setHeader("Content-Type", resolvedContentType);
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    res.setHeader("Content-Length", String(buffer.length));
    res.send(buffer);
  })
);

export const uploadsRouter = router;
