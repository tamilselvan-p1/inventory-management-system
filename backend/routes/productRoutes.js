const express = require("express");
const {
  getProducts,
  getProduct,
  getStats,
  createProduct,
  updateProduct,
  deleteProduct
} = require("../controllers/productController");

const router = express.Router();

// Keep /stats before /:id so "stats" is not treated as a product ID.
router.get("/stats", getStats);
router.get("/", getProducts);
router.get("/:id", getProduct);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;
