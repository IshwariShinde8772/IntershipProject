import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { uploadBuffer } from "../../utils/upload.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

router.post(
  "/single",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    const result = await uploadBuffer(req.file.buffer, "kbtcoe-placement-tracker");
    res.json({
      url: result.secure_url,
      publicId: result.public_id
    });
  })
);

export const uploadsRouter = router;
