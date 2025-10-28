import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path"; // ✅ Thêm import path để sử dụng path.join
import db from "./database";
import userRouter from "./router/user.router";
import adminRouter from "./router/admin.router";
import authRouter from "./router/auth.router";
import orderRouter from "./router/order.router";
import orderItemRouter from "./router/orderItem.router";
import productRouter from "./router/product.router";
import reportRouter from "./router/report.router";


dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
// Phục vụ file tĩnh cho avatar
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(
  "/images-menu",
  express.static(path.join(__dirname, "../uploads/images-menu"))
);

// ✅ Kiểm tra kết nối MySQL và database
(async () => {
  try {
    const connection = await db.getConnection();

    // Kiểm tra database đang kết nối
    const [dbName]: any = await connection.query("SELECT DATABASE() AS db");
    console.log("✅ Connected to database:", dbName[0].db);

    // Kiểm tra bảng users có tồn tại không
    const [tables]: any = await connection.query("SHOW TABLES LIKE 'users'");
    if (tables.length === 0) {
      console.warn("⚠️ Bảng 'users' chưa tồn tại trong database!");
    } else {
      console.log("✅ Bảng 'users' tồn tại");
    }

    connection.release();
  } catch (err) {
    console.error("❌ DB connection error:", err);
  }
})();

// Mount router
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/products", productRouter);
app.use("/api/orders", orderRouter);
app.use("/api/order-items", orderItemRouter);
app.use("/api/reports", reportRouter);

// Cron job cập nhật trạng thái đơn hàng tự động
setInterval(async () => {
  try {
    // pending → confirmed sau 3 phút
    await db.query(
      `UPDATE orders
       SET status='confirmed', confirmed_at=NOW(), updated_at=NOW()
       WHERE status='pending' AND created_at < NOW() - INTERVAL 3 MINUTE`
    );

    // confirmed → shipped sau 5 phút
    await db.query(
      `UPDATE orders
       SET status='shipped', shipped_at=NOW(), updated_at=NOW()
       WHERE status='confirmed' AND confirmed_at < NOW() - INTERVAL 5 MINUTE`
    );

    // shipped → completed sau 5 phút
    await db.query(
      `UPDATE orders
       SET status='completed', completed_at=NOW(), updated_at=NOW()
       WHERE status='shipped' AND shipped_at < NOW() - INTERVAL 5 MINUTE`
    );

    console.log("Cập nhật trạng thái đơn hàng tự động");
  } catch (err) {
    console.error(err);
  }
}, 60 * 1000); // chạy mỗi 1 phút

// Route test
app.get("/", (_req, res) => {
  res.send("🚀 Mixiao backend đang hoạt động!");
});

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
