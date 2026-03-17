import multer from "multer";
import { AppError } from "./errorhandle.js";

const storage = multer.memoryStorage();

const fileFilter = (
    _req: any,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new AppError("Only image files are allowed", 400, true, "INVALID_FILE_TYPE") as any);
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
    },
});
