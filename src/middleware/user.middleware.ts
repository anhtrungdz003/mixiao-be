import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import db from "../database"; // truy vấn user

dotenv.config();

// --- Mở rộng user trong request ---
export interface AuthUser {
  id: number;
  role: "user" | "admin";
  full_name: string;
  email: string;
  phone: string;
  address: string;
  avatar?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// --- Middleware xác thực user ---
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
    console.error(err);
    return res.status(403).json({ message: "Token không hợp lệ" });
  }
};


