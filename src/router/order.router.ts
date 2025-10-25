import express from "express";
import { authMiddleware } from "../middleware/user.middleware";
import { verifyAdmin } from "../middleware/admin.middleware";
import {
  createOrder,
  getUserOrders,
  getAllOrders,
  getOrderById,
  deleteOrder,
  getUserCart,
  addToCart,
  removeFromCart,
} from "../controller/order.Controller";

const router = express.Router();

// Giỏ hàng (user)
router.get("/cart", authMiddleware, getUserCart); // lấy giỏ hàng
router.post("/cart", authMiddleware, addToCart); // thêm vào giỏ
router.delete("/cart/:itemId", authMiddleware, removeFromCart); // xóa sản phẩm khỏi giỏ

// Đơn hàng (user)
router.post("/", authMiddleware, createOrder); // tạo đơn hàng
router.get("/", authMiddleware, getUserOrders); // lấy đơn hàng của user

// Đơn hàng (admin)
router.get("/all", authMiddleware, verifyAdmin, getAllOrders);
router.get("/:id", authMiddleware, verifyAdmin, getOrderById);
router.delete("/:id", authMiddleware, verifyAdmin, deleteOrder);

export default router;
