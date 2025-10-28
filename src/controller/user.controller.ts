import { Request, Response } from "express";
import db from "../database";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

// Gắn kiểu user vào req
interface AuthPayload {
  id: number;
  role: string;
}

export const userController = {
  // Đăng ký tài khoản
  register: async (req: Request, res: Response) => {
    try {
      const {
        username,
        full_name = "",
        email,
        password,
        phone = "",
        address = "",
        avatar = "",
      } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({
          message: "Vui lòng nhập đầy đủ username, email và mật khẩu",
        });
      }

      const [rows]: any = await db.query(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );
      if (rows.length > 0) {
        return res.status(400).json({ message: "Email đã tồn tại" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const [result]: any = await db.query(
        `INSERT INTO users (username, full_name, email, password, phone, address, avatar, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          username,
          full_name,
          email,
          hashedPassword,
          phone,
          address,
          avatar,
          "user",
        ]
      );

      const [newUser]: any = await db.query(
        `SELECT id, username, full_name, email, phone, address, avatar, role, created_at, updated_at
       FROM users WHERE id = ?`,
        [result.insertId]
      );

      res.status(201).json({
        message: "Đăng ký tài khoản thành công!",
        data: newUser[0],
      });
    } catch (err: any) {
      res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
    }
  },

  // Đăng nhập
  login: async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập email và mật khẩu" });
    }

    try {
      const [rows]: any = await db.query(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );
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
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          avatar: user.avatar,
          role: user.role,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      });
    } catch (err: any) {
      res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
    }
  },

  // Logout
  logout: async (req: Request, res: Response) => {
    res.json({ message: "Đăng xuất thành công" });
  },

  // Lấy thông tin user hiện tại
  getMe: async (req: Request, res: Response) => {
    const authReq = req as Request & { user?: AuthPayload };
    if (!authReq.user)
      return res.status(401).json({ message: "Chưa xác thực" });

    try {
      const [rows]: any = await db.query(
        "SELECT id, username, full_name, email, phone, address, avatar, role, created_at, updated_at FROM users WHERE id = ?",
        [authReq.user.id]
      );
      if (rows.length === 0)
        return res.status(404).json({ message: "Người dùng không tồn tại" });

      res.json({ message: "Lấy thông tin thành công", data: rows[0] });
    } catch (err: any) {
      res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
    }
  },

  // Cập nhật thông tin user hiện tại (bao gồm avatar)
  updateMe: async (req: Request, res: Response) => {
    try {
      const authReq = req as Request & { user?: AuthPayload };
      if (!authReq.user)
        return res.status(401).json({ message: "Chưa xác thực" });

      const userId = authReq.user.id;
      if (typeof userId !== "number" || isNaN(userId)) {
        return res.status(400).json({ message: "ID người dùng không hợp lệ" });
      }

      const { username, full_name, email, phone, address } = req.body;

      if (!username || !email) {
        return res
          .status(400)
          .json({ message: "Vui lòng nhập đầy đủ username và email" });
      }

      const updates: Record<string, any> = {};
      if (username !== undefined && username.trim() !== "")
        updates.username = username.trim();
      if (full_name !== undefined && full_name.trim() !== "")
        updates.full_name = full_name.trim();
      if (email !== undefined && email.trim() !== "")
        updates.email = email.trim();
      if (phone !== undefined) updates.phone = phone.trim();
      if (address !== undefined) updates.address = address.trim();

      // Xử lý avatar: Nếu có file upload từ middleware, cập nhật avatar và xóa avatar cũ
      if (req.file) {
        const avatarPath = `/uploads/avatars/${req.file.filename}`;
        updates.avatar = avatarPath;

        // Lấy avatar cũ từ DB để xóa
        const [userRows]: any = await db.query(
          "SELECT avatar FROM users WHERE id = ?",
          [userId]
        );
        if (userRows.length > 0 && userRows[0].avatar) {
          const oldFilename = path.basename(userRows[0].avatar); // Fix: Lấy filename
          const oldAvatarPath = path.join(
            __dirname,
            "../../uploads/avatars",
            oldFilename
          );
          if (fs.existsSync(oldAvatarPath)) {
            fs.unlinkSync(oldAvatarPath);
          }
        }
      }

      if (Object.keys(updates).length === 0) {
        return res
          .status(400)
          .json({ message: "Không có dữ liệu hợp lệ để cập nhật" });
      }

      const setClause = Object.keys(updates)
        .map((key) => `${key} = ?`)
        .join(", ");
      const params = [...Object.values(updates), userId];

      await db.query(
        `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = ?`,
        params
      );

      const [updatedUser]: any = await db.query(
        "SELECT id, username, full_name, email, phone, address, avatar, role, created_at, updated_at FROM users WHERE id = ?",
        [userId]
      );

      res.json({
        message: "Cập nhật thông tin thành công",
        data: updatedUser[0],
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
    }
  },
};
