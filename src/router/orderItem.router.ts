import express from "express";
import { authMiddleware } from "../middleware/user.middleware";
import { verifyAdmin } from "../middleware/admin.middleware";
import { deleteOrderItem } from "../controller/orderItem.Controller";

const router = express.Router();

// Admin routes
router.delete("/:id", authMiddleware, verifyAdmin, deleteOrderItem);

export default router;
