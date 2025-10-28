import { Request, Response } from "express";
import db from "../database";

export const getSalesReport = async (req: Request, res: Response) => {
  try {
    const { filter, startDate, endDate } = req.query;

    let whereClause = "WHERE o.status = 'completed'";
    const params: any[] = [];

    if (filter === "day" && startDate) {
      whereClause += " AND DATE(o.completed_at) = ?";
      params.push(startDate);
    } else if (filter === "week" && startDate) {
      whereClause += " AND YEARWEEK(DATE(o.completed_at), 1) = YEARWEEK(?, 1)";
      params.push(startDate);
    } else if (filter === "month" && startDate) {
      whereClause +=
        " AND MONTH(DATE(o.completed_at)) = MONTH(?) AND YEAR(DATE(o.completed_at)) = YEAR(?)";
      params.push(startDate, startDate);
    } else if (filter === "year" && startDate) {
      whereClause += " AND YEAR(DATE(o.completed_at)) = YEAR(?)";
      params.push(startDate);
    } else if (filter === "range" && startDate && endDate) {
      whereClause += " AND DATE(o.completed_at) BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }

    // Tổng doanh thu & tổng số đơn
    const [summary]: any = await db.query(
      `SELECT COUNT(*) AS totalOrders, SUM(o.total) AS totalRevenue
       FROM orders o
       ${whereClause}`,
      params
    );

    // Sản phẩm bán chạy nhất
    const [bestSeller]: any = await db.query(
      `SELECT p.name, SUM(oi.quantity) AS totalQty
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN products p ON oi.product_id = p.id
       ${whereClause}
       GROUP BY oi.product_id
       ORDER BY totalQty DESC
       LIMIT 1`,
      params
    );

    // Biểu đồ
    const [chartData]: any = await db.query(
      `SELECT p.category AS category,
              SUM(oi.quantity) AS quantity,
              SUM(oi.quantity * oi.price) AS revenue
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN products p ON oi.product_id = p.id
       ${whereClause}
       GROUP BY p.category`,
      params
    );

    // Bảng chi tiết
    const [reportData]: any = await db.query(
      `SELECT p.id AS product_id,
              p.name,
              SUM(oi.quantity) AS quantity,
              SUM(oi.quantity * oi.price) AS revenue,
              p.category
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN products p ON oi.product_id = p.id
       ${whereClause}
       GROUP BY p.id, p.name, p.category
       ORDER BY quantity DESC`,
      params
    );

    res.json({
      totalRevenue: summary[0].totalRevenue || 0,
      totalOrders: summary[0].totalOrders || 0,
      bestSeller: bestSeller.length > 0 ? bestSeller[0].name : "Chưa có",
      chartData,
      reportData,
    });
  } catch (err: any) {
    res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
  }
};
