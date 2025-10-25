import { Request, Response } from "express";
import db from "../database";

// Lấy tất cả sản phẩm
export const getAllProducts = async (_req: Request, res: Response) => {
  try {
    const [rows] = await db.query("SELECT * FROM products");
    res.json({ message: "Lấy danh sách sản phẩm thành công", data: rows });
  } catch (err: any) {
    res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
  }
};

// Thêm sản phẩm (admin)
export const addProduct = async (req: Request, res: Response) => {
  const { name, price, category, stock, image } = req.body;
  if (!name || !price)
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });

  try {
    const [result]: any = await db.query(
      "INSERT INTO products (name, price, category, stock, image) VALUES (?, ?, ?, ?, ?)",
      [name, price, category || "", stock || 0, image || ""]
    );

    res.status(201).json({
      message: "Thêm sản phẩm thành công",
      productId: result.insertId,
    });
  } catch (err: any) {
    res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
  }
};

// Cập nhật sản phẩm
export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, price, category, stock, image } = req.body;

  try {
    let query = "UPDATE products SET ";
    const params: any[] = [];

    if (name) {
      query += "name=?, ";
      params.push(name);
    }
    if (price) {
      query += "price=?, ";
      params.push(price);
    }
    if (category) {
      query += "category=?, ";
      params.push(category);
    }
    if (stock !== undefined) {
      query += "stock=?, ";
      params.push(stock);
    }
    if (image) {
      query += "image=?, ";
      params.push(image);
    }

    query = query.slice(0, -2) + " WHERE id=?";
    params.push(id);

    await db.query(query, params);
    res.json({ message: "Cập nhật sản phẩm thành công" });
  } catch (err: any) {
    res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
  }
};

// Xóa sản phẩm
export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM products WHERE id=?", [id]);
    res.json({ message: "Xóa sản phẩm thành công" });
  } catch (err: any) {
    res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
  }
};
