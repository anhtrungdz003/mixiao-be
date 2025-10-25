import { Response } from "express";
import db from "../database";
import { AuthRequest } from "../middleware/user.middleware";



// Xóa order item (admin) + trả stock về
export const deleteOrderItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Lấy order_item
    const [rows]: any = await db.query("SELECT * FROM order_items WHERE id=?", [
      id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ message: "Order item không tồn tại" });

    const orderItem = rows[0];

    // Xóa order_item
    await db.query("DELETE FROM order_items WHERE id=?", [id]);

    // Trả stock về
    await db.query("UPDATE products SET stock = stock + ? WHERE id=?", [
      orderItem.quantity,
      orderItem.product_id,
    ]);

    res.json({ message: "Xóa order item thành công" });
  } catch (err: any) {
    res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [orders]: any = await db.query(
      `
      SELECT o.*, u.full_name AS user_full_name, u.email, u.phone, u.address
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `,
      [id]
    );

    if (orders.length === 0)
      return res.status(404).json({ message: "Đơn hàng không tồn tại" });

    const order = orders[0];

    // Lấy items
    const [items]: any = await db.query(
      `
      SELECT oi.product_id, oi.quantity, oi.price, p.name AS product_name, p.category, p.image
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `,
      [order.id]
    );
    order.items = items;

    res.json({ message: "Lấy chi tiết đơn hàng thành công", data: order });
  } catch (err: any) {
    res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
  }
};
