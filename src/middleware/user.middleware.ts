import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import fs from "fs";
import db from "../database";

dotenv.config();

// Mở rộng user trong request
export interface AuthUser {
  id: number;
  role: "user" | "admin";
  full_name: string;
  email: string;
  phone: string;
  address: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// Middleware xác thực JWT
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authReq = req as AuthRequest;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Chưa có token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number;
      role: "user" | "admin";
    };

    // Lấy thông tin đầy đủ từ database
    const [rows]: any = await db.query(
      "SELECT id, role, full_name, email, phone, address FROM users WHERE id=?",
      [decoded.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Người dùng không tồn tại" });

    authReq.user = rows[0];
    next();
  } catch (err) {
    return res.status(403).json({ message: "Token không hợp lệ" });
  }
};

// Cấu hình multer cho upload avatar
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads/avatars");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ cho phép upload file ảnh (JPEG, PNG, v.v.)"));
  }
};

export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).single("avatar");
