import express from "express";
import {
  getAllProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} from "../controller/product.Controller";
import { verifyAdmin } from "../middleware/admin.middleware";

const router = express.Router();

router.get("/", getAllProducts); // GET tất cả sản phẩm
router.post("/", verifyAdmin, addProduct); // POST thêm sản phẩm
router.put("/:id", verifyAdmin, updateProduct);
router.delete("/:id", verifyAdmin, deleteProduct);

export default router;
