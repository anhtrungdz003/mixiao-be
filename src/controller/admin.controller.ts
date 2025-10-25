import { Request, Response } from "express";
import db from "../database";
import bcrypt from "bcryptjs";

// Lấy tất cả user
export const getAllUsers = async (req: any, res: Response) => {
  try {
    const [rows] = await db.query(
      "SELECT id, username, full_name, email, phone, address, avatar, role, created_at, updated_at FROM users"
    );
    res.json({ message: "Lấy danh sách người dùng thành công", data: rows });
  } catch (err: any) {
    res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
  }
};

// Thêm user
export const addUser = async (req: Request, res: Response) => {
  const { username, full_name, email, password, phone, address, avatar, role } =
    req.body;
  if (!username || !email || !password)
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });

  try {
    const [rows]: any = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length > 0)
      return res.status(400).json({ message: "Email đã tồn tại" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO users (username, full_name, email, password, phone, address, avatar, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        username,
        full_name,
        email,
        hashedPassword,
        phone,
        address,
        avatar,
        role || "user",
      ]
    );

    res.status(201).json({ message: "Thêm người dùng thành công" });
  } catch (err: any) {
    res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
  }
};

// Cập nhật user
export const updateUser = async (req: Request, res: Response) => {
  const { username, full_name, email, password, phone, address, avatar, role } =
    req.body;
  const userId = req.params.id;

  try {
    let query = "UPDATE users SET ";
    const params: any[] = [];
    if (username) {
      query += "username = ?, ";
      params.push(username);
    }
    if (full_name) {
      query += "full_name = ?, ";
      params.push(full_name);
    }
    if (email) {
      query += "email = ?, ";
      params.push(email);
    }
    if (role) {
      query += "role = ?, ";
      params.push(role);
    }
    if (phone) {
      query += "phone = ?, ";
      params.push(phone);
    }
    if (address) {
      query += "address = ?, ";
      params.push(address);
    }
    if (avatar) {
      query += "avatar = ?, ";
      params.push(avatar);
    }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      query += "password = ?, ";
      params.push(hashed);
    }

    query = query.slice(0, -2) + " WHERE id = ?";
    params.push(userId);

    await db.query(query, params);
    res.json({ message: "Cập nhật người dùng thành công" });
  } catch (err: any) {
    res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
  }
};

// Xóa user
export const deleteUser = async (req: Request, res: Response) => {
  const userId = req.params.id;
  try {
    await db.query("DELETE FROM users WHERE id = ?", [userId]);
    res.json({ message: "Xóa người dùng thành công" });
  } catch (err: any) {
    res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
  }
};

// Lấy user theo ID
export const getUserById = async (req: Request, res: Response) => {
  const userId = req.params.id;
  try {
    const [rows]: any = await db.query(
      "SELECT id, username, full_name, email, phone, address, avatar, role, created_at, updated_at FROM users WHERE id = ?",
      [userId]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Người dùng không tồn tại" });

    res.json({ message: "Lấy thông tin người dùng thành công", data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
  }
};
