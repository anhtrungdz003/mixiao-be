import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./database";
import userRouter from "./router/user.router";
import adminRouter from "./router/admin.router";
import authRouter from "./router/auth.router";
import orderRouter from "./router/order.router";
import orderItemRouter from "./router/orderItem.router";
import productRouter from "./router/product.router";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/admin", adminRouter);

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

// Route test
app.get("/", (_req, res) => {
  res.send("🚀 Mixiao backend đang hoạt động!");
});

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
