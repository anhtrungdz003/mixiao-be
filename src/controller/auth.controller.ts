import { Request, Response } from "express";
import db from "../database";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Đăng ký
export const register = async (req: Request, res: Response) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ message: "Vui lòng nhập đầy đủ username, email và mật khẩu" });
  }

  try {
    const [rows]: any = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length > 0)
      return res.status(400).json({ message: "Email đã tồn tại" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
      [username, email, hashedPassword, role || "user"]
    );

    res.status(201).json({ message: "Đăng ký tài khoản thành công!" });
  } catch (err: any) {
    res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
  }
};

// Đăng nhập
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu" });

  try {
    const [rows]: any = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0)
      return res.status(400).json({ message: "Không tìm thấy người dùng" });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Mật khẩu không đúng" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" }
    );
    res.json({
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
  }
};
