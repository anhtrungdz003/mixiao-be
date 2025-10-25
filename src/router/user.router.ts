import express from "express";
import { userController } from "../controller/user.controller";
import { authMiddleware} from "../middleware/user.middleware";

const router = express.Router();


router.post("/register", userController.register);


router.post("/login", userController.login);


router.post("/logout", authMiddleware, userController.logout);


router.get("/me", authMiddleware, userController.getMe);


router.put("/me", authMiddleware, userController.updateMe);

export default router;
