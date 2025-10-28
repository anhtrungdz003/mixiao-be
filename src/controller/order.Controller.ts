import { AuthRequest } from "../middleware/user.middleware";
import { Response } from "express";
import db from "../database";

// Tạo đơn hàng mới
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { items } = req.body; // items = [{ product_id, quantity }]
    if (!items || items.length === 0)
      return res.status(400).json({ message: "Chọn sản phẩm để đặt hàng" });

    let total = 0;
    // Tính tổng tiền
    for (const item of items) {
      const [rows]: any = await db.query(
        "SELECT price, stock FROM products WHERE id=?",
        [item.product_id]
      );
      if (rows.length === 0)
        return res
          .status(400)
          .json({ message: `Sản phẩm ${item.product_id} không tồn tại` });
      if (rows[0].stock < item.quantity)
        return res
          .status(400)
          .json({ message: `Sản phẩm ${item.product_id} không đủ` });
      total += rows[0].price * item.quantity;
    }

    // 🔹 Kiểm tra user đã có cart chưa
    const [existingCart]: any = await db.query(
      "SELECT * FROM orders WHERE user_id=? AND status='cart'",
      [userId]
    );

    let orderId;
    if (existingCart.length > 0) {
      // Dùng giỏ hàng hiện có
      orderId = existingCart[0].id;
      await db.query(
        "UPDATE orders SET total=?, status='pending', updated_at=NOW() WHERE id=?",
        [total, orderId]
      );
    } else {
      // Tạo mới
      const [orderResult]: any = await db.query(
        "INSERT INTO orders (user_id, total, status) VALUES (?, ?, ?)",
        [userId, total, "pending"]
      );
      orderId = orderResult.insertId;
    }

    const detailedItems: any[] = [];
    for (const item of items) {
      const [product]: any = await db.query(
        "SELECT price, name, category, image FROM products WHERE id=?",
        [item.product_id]
      );

      // Nếu sản phẩm đã có trong order_items → update quantity, nếu chưa → insert
      const [existingItem]: any = await db.query(
        "SELECT * FROM order_items WHERE order_id=? AND product_id=?",
        [orderId, item.product_id]
      );

      if (existingItem.length > 0) {
        await db.query(
          "UPDATE order_items SET quantity=? WHERE order_id=? AND product_id=?",
          [item.quantity, orderId, item.product_id]
        );
      } else {
        await db.query(
          "INSERT INTO order_items (user_id, order_id, product_id, quantity, price) VALUES (?, ?, ?, ?, ?)",
          [userId, orderId, item.product_id, item.quantity, product[0].price]
        );
      }

      await db.query("UPDATE products SET stock = stock - ? WHERE id=?", [
        item.quantity,
        item.product_id,
      ]);

      detailedItems.push({
        product_id: item.product_id,
        name: product[0].name,
        category: product[0].category,
        price: product[0].price,
        quantity: item.quantity,
        image: product[0].image,
      });
    }

    res.status(201).json({
      message: "Tạo đơn hàng thành công",
      order: {
        id: orderId,
        total,
        status: "pending",
        created_at: new Date(),
        user_full_name: req.user!.full_name,
        email: req.user!.email,
        phone: req.user!.phone,
        address: req.user!.address,
        items: detailedItems,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
  }
};

// Lấy chi tiết 1 đơn hàng (admin hoặc user)
export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Lấy thông tin đơn hàng + thông tin người dùng
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
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    const order = orders[0];

    // Lấy danh sách sản phẩm trong đơn
    const [items]: any = await db.query(
      `
      SELECT
        oi.id,
        oi.order_id,
        oi.product_id,
        p.name AS product_name,
        oi.quantity,
        oi.price,
        p.image
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `,
      [id]
    );

    order.items = items;

    res.json({ message: "Lấy chi tiết đơn hàng thành công", data: order });
  } catch (err: any) {
    res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
  }
};

// Lấy tất cả đơn hàng (admin)
export const getAllOrders = async (_req: AuthRequest, res: Response) => {
  try {
    const [orders]: any = await db.query(`
      SELECT o.*, u.full_name AS user_full_name, u.email, u.phone, u.address
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);

    for (const order of orders) {
      const [items]: any = await db.query(
        `
    SELECT oi.product_id, oi.quantity, oi.price, p.name, p.category, p.image
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `,
        [order.id]
      );
      order.items = items;

      // Cập nhật tổng tiền theo order_items
      order.total = items.reduce(
        (sum: number, i: any) => sum + i.price * i.quantity,
        0
      );
    }

    res.json({ message: "Lấy tất cả đơn hàng thành công", data: orders });
  } catch (err: any) {
    res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
  }
};

// Lấy đơn hàng của user
export const getUserOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const [orders]: any = await db.query(
      `
      SELECT o.*, u.full_name AS user_full_name, u.email, u.phone, u.address
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.user_id=?
      ORDER BY o.created_at DESC
    `,
      [userId]
    );

    for (const order of orders) {
      const [items]: any = await db.query(
        `
    SELECT oi.product_id, oi.quantity, oi.price, p.name, p.category, p.image
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id=?
  `,
        [order.id]
      );
      order.items = items;

      // Cập nhật tổng tiền theo order_items
      order.total = items.reduce(
        (sum: number, i: any) => sum + i.price * i.quantity,
        0
      );
    }

    res.json({ message: "Lấy đơn hàng thành công", data: orders });
  } catch (err: any) {
    res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
  }
};

// Xóa đơn hàng (chỉ admin)
export const deleteOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Kiểm tra đơn hàng có tồn tại không
    const [order]: any = await db.query("SELECT * FROM orders WHERE id=?", [
      id,
    ]);
    if (order.length === 0)
      return res
        .status(404)
        .json({ message: "Không tìm thấy đơn hàng để xóa" });

    // Xóa các bản ghi liên quan trong order_items trước (ràng buộc khóa ngoại)
    await db.query("DELETE FROM order_items WHERE order_id=?", [id]);

    // Xóa đơn hàng chính
    await db.query("DELETE FROM orders WHERE id=?", [id]);

    res.json({ message: "Đã xóa đơn hàng thành công" });
  } catch (err: any) {
    res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
  }
};

//Lấy giỏ hàng của user
export const getUserCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const [orders]: any = await db.query(
      "SELECT * FROM orders WHERE user_id=? AND status='cart'",
      [userId]
    );
    if (orders.length === 0)
      return res.json({ message: "Giỏ hàng trống", data: [] });
    const cart = orders[0];

    const [items]: any = await db.query(
      `SELECT oi.id AS id, oi.product_id, oi.quantity, oi.price, p.name, p.category, p.image
   FROM order_items oi
   JOIN products p ON oi.product_id = p.id
   WHERE oi.order_id=?`,
      [cart.id]
    );

    cart.items = items;
    cart.total = items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    );
    res.json({ message: "Lấy giỏ hàng thành công", data: cart });
  } catch (err: any) {
    res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
  }
};

export const addToCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { product_id, quantity } = req.body;
    console.log(
      "🔍 addToCart: userId =",
      userId,
      "product_id =",
      product_id,
      "quantity =",
      quantity
    ); // Thêm log để debug

    // Kiểm tra sản phẩm tồn tại
    const [product]: any = await db.query("SELECT * FROM products WHERE id=?", [
      product_id,
    ]);
    if (!product.length)
      return res.status(404).json({ message: "Sản phẩm không tồn tại" });
    console.log("✅ addToCart: Product found =", product[0]); // Thêm log

    // Lấy order cart hiện tại của user
    const [orders]: any = await db.query(
      "SELECT * FROM orders WHERE user_id=? AND status='cart'",
      [userId]
    );
    let orderId;
    if (orders.length) {
      orderId = orders[0].id;
      console.log("✅ addToCart: Existing cart orderId =", orderId); // Thêm log
    } else {
      const [newOrder]: any = await db.query(
        "INSERT INTO orders (user_id, total, status) VALUES (?, 0, 'cart')",
        [userId]
      );
      orderId = newOrder.insertId;
      console.log("✅ addToCart: New cart orderId =", orderId); // Thêm log
    }

    // Kiểm tra nếu sản phẩm đã có trong order_items cho order này (THÊM LOGIC MỚI)
    const [existingItem]: any = await db.query(
      "SELECT * FROM order_items WHERE order_id=? AND product_id=?",
      [orderId, product_id]
    );
    console.log("🔍 addToCart: Existing item =", existingItem); // Thêm log

    if (existingItem.length > 0) {
      // Nếu đã có, tăng quantity (THÊM LOGIC MỚI)
      await db.query(
        "UPDATE order_items SET quantity = quantity + ? WHERE order_id=? AND product_id=?",
        [quantity, orderId, product_id]
      );
      console.log(
        "✅ addToCart: Updated quantity for product_id =",
        product_id
      ); // Thêm log
    } else {
      // Nếu chưa có, INSERT mới (GIỮ NGUYÊN)
      await db.query(
        "INSERT INTO order_items (user_id, order_id, product_id, quantity, price) VALUES (?, ?, ?, ?, ?)",
        [userId, orderId, product_id, quantity, product[0].price]
      );
      console.log(
        "✅ addToCart: Inserted new item for product_id =",
        product_id
      ); // Thêm log
    }

    // Tính lại tổng tiền giỏ hàng
    const [orderItems]: any = await db.query(
      "SELECT price, quantity FROM order_items WHERE order_id=?",
      [orderId]
    );
    const newTotal = orderItems.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    );

    // Cập nhật total vào bảng orders
    const [result]: any = await db.query(
      "UPDATE orders SET total=? WHERE id=?",
      [newTotal, orderId]
    );
    console.log("Update total result:", result);

    res.json({ message: "Thêm vào giỏ hàng thành công" });
  } catch (err: any) {
    console.error("❌ addToCart: Error =", err.message); // Thêm log lỗi
    res.status(500).json({ message: err.message });
  }
};

export const removeFromCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { itemId } = req.params;

    // Xóa order_item
    await db.query("DELETE FROM order_items WHERE id=? AND user_id=?", [
      itemId,
      userId,
    ]);

    // Kiểm tra còn order_items nào không
    const [items]: any = await db.query(
      "SELECT * FROM order_items WHERE order_id=(SELECT id FROM orders WHERE user_id=? AND status='cart')",
      [userId]
    );

    if (items.length === 0) {
      // Xóa luôn order trống
      await db.query("DELETE FROM orders WHERE user_id=? AND status='cart'", [
        userId,
      ]);
    } else {
      // Cập nhật lại tổng
      const total = items.reduce(
        (sum: any, i: any) => sum + i.price * i.quantity,
        0
      );
      await db.query(
        "UPDATE orders SET total=? WHERE user_id=? AND status='cart'",
        [total, userId]
      );
    }

    res.json({ message: "Xóa sản phẩm khỏi giỏ hàng thành công" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
