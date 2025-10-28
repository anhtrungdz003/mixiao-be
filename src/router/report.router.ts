import { Router } from "express";
import { getSalesReport } from "../controller/report.Controller";
import { authMiddleware } from "../middleware/user.middleware";

const router = Router();

// Chỉ admin mới xem báo cáo
router.get("/", authMiddleware, getSalesReport);

export default router;
