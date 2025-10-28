import express from "express";
import { productController } from "../controller/product.Controller";
import { uploadProduct } from "../middleware/uploadProduct.middleware";
import { verifyAdmin } from "../middleware/admin.middleware";

const router = express.Router();

router.get("/", productController.getAll);
router.post("/", verifyAdmin, uploadProduct, productController.add);
router.put("/:id", verifyAdmin, uploadProduct, productController.update);
router.delete("/:id", verifyAdmin, productController.delete);

export default router;
