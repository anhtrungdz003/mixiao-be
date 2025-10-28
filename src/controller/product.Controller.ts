import { Request, Response } from "express";
import db from "../database";
import fs from "fs";
import path from "path";

export const productController = {
  // Lấy tất cả sản phẩm (không thay đổi)
  getAll: async (_req: Request, res: Response) => {
    try {
      const [rows] = await db.query("SELECT * FROM products");
      res.json({ message: "Lấy danh sách sản phẩm thành công", data: rows });
    } catch (err: any) {
      res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
    }
  },

  // Thêm sản phẩm (ĐÃ SỬA: Hỗ trợ upload file hoặc chọn ảnh từ images-menu)
  add: async (req: Request, res: Response) => {
    try {
      const {
        name,
        category = "",
        price = 0,
        stock = 0,
        image: bodyImage = "",
      } = req.body;
      if (!name || !price || price <= 0) {
        return res
          .status(400)
          .json({ message: "Vui lòng nhập tên và giá hợp lệ (>0)" });
      }

      let image = "";
      if (req.file) {
        // Nếu có upload file, dùng đường dẫn upload
        image = `/uploads/products/${req.file.filename}`;
      } else if (bodyImage) {
        // Nếu không upload, dùng đường dẫn từ body (từ images-menu của FE)
        image = bodyImage; // Ví dụ: "/images-menu/product1.jpg"
      } else {
        return res
          .status(400)
          .json({
            message: "Vui lòng upload ảnh hoặc cung cấp đường dẫn ảnh hợp lệ",
          });
      }

      const [result]: any = await db.query(
        "INSERT INTO products (name, category, price, stock, image) VALUES (?, ?, ?, ?, ?)",
        [name, category, price, stock, image]
      );

      // Query lại sản phẩm vừa thêm để trả về data đầy đủ
      const [newProduct]: any = await db.query(
        "SELECT * FROM products WHERE id = ?",
        [result.insertId]
      );

      res.status(201).json({
        message: "Thêm sản phẩm thành công",
        data: newProduct[0], // Trả về object Product hoàn chỉnh
      });
    } catch (err: any) {
      res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
    }
  },

  // Cập nhật sản phẩm (ĐÃ SỬA: Hỗ trợ upload file hoặc chọn ảnh từ images-menu, chỉ xóa ảnh cũ nếu từ uploads)
  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, category, price, stock, image: bodyImage } = req.body;

      const [rows]: any = await db.query(
        "SELECT image FROM products WHERE id = ?",
        [id]
      );
      if (rows.length === 0)
        return res.status(404).json({ message: "Sản phẩm không tồn tại" });

      const oldImage = rows[0].image;

      let image = oldImage;
      if (req.file) {
        // Nếu có upload file mới, dùng đường dẫn upload và xóa ảnh cũ (chỉ nếu từ uploads)
        image = `/uploads/products/${req.file.filename}`;
        if (oldImage && oldImage.startsWith("/uploads/products/")) {
          const oldPath = path.join(
            __dirname,
            "../../uploads/products",
            path.basename(oldImage)
          );
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
      } else if (bodyImage !== undefined) {
        // Nếu không upload, dùng đường dẫn từ body (có thể từ images-menu)
        image = bodyImage;
        // Không xóa ảnh cũ nếu chuyển từ uploads sang images-menu (hoặc ngược lại)
      }

      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (category !== undefined) updates.category = category;
      if (price !== undefined) updates.price = price;
      if (stock !== undefined) updates.stock = stock;
      updates.image = image;

      const setClause = Object.keys(updates)
        .map((key) => `${key}=?`)
        .join(", ");
      const params = [...Object.values(updates), id];

      await db.query(`UPDATE products SET ${setClause} WHERE id=?`, params);

      // Query lại sau update để trả về data
      const [updatedProduct]: any = await db.query(
        "SELECT * FROM products WHERE id = ?",
        [id]
      );

      res.json({
        message: "Cập nhật sản phẩm thành công",
        data: updatedProduct[0], // Trả về object Product hoàn chỉnh
      });
    } catch (err: any) {
      res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
    }
  },

  // Xóa sản phẩm (ĐÃ SỬA: Chỉ xóa ảnh nếu từ uploads)
  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const [rows]: any = await db.query(
        "SELECT image FROM products WHERE id=?",
        [id]
      );
      if (rows.length === 0)
        return res.status(404).json({ message: "Sản phẩm không tồn tại" });

      const image = rows[0].image;
      if (image && image.startsWith("/uploads/products/")) {
        const imgPath = path.join(
          __dirname,
          "../../uploads/products",
          path.basename(image)
        );
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      }

      await db.query("DELETE FROM products WHERE id=?", [id]);
      res.json({ message: "Xóa sản phẩm thành công" });
    } catch (err: any) {
      res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
    }
  },
};
