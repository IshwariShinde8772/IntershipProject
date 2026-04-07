import { cloudinary } from "../config/cloudinary.js";
import { env } from "../config/env.js";

export const uploadBuffer = async (buffer, folder, resourceType = "auto") =>
  new Promise((resolve, reject) => {
    if (
      !env.cloudinaryCloudName ||
      !env.cloudinaryApiKey ||
      !env.cloudinaryApiSecret ||
      String(env.cloudinaryCloudName).startsWith("replace_with_") ||
      String(env.cloudinaryApiKey).startsWith("replace_with_") ||
      String(env.cloudinaryApiSecret).startsWith("replace_with_")
    ) {
      reject(new Error("Cloudinary is not configured. Remove the logo file or configure upload credentials."));
      return;
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    stream.end(buffer);
  });
