import express from "express";
import {
  getAllUsers,
  addUser,
  updateUser,
  deleteUser,
  getUserById
} from "../controller/admin.controller";
import { verifyAdmin } from "../middleware/admin.middleware";

const router = express.Router();

// Chỉ admin mới truy cập được
router.get("/users", verifyAdmin, getAllUsers);
router.post("/users", verifyAdmin, addUser);
router.put("/users/:id", verifyAdmin, updateUser);
router.delete("/users/:id", verifyAdmin, deleteUser);
router.get("/users/:id", getUserById);

export default router;
