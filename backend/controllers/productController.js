const mongoose = require("mongoose");
const Product = require("../models/Product");

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function handleError(error, res) {
  if (error.code === 11000) {
    return res.status(409).json({ message: "That SKU already exists. Please use a unique SKU." });
  }
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ message: error.message });
  }
  console.error(error);
  return res.status(500).json({ message: "Something went wrong on the server." });
}

async function getProducts(req, res) {
  try {
    const { search = "", category = "all", status = "all", sort = "newest" } = req.query;
    const filter = {};

    if (search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { sku: { $regex: escaped, $options: "i" } }
      ];
    }
    if (category !== "all") filter.category = category;

    if (status === "out") filter.quantity = 0;
    if (status === "low") {
      filter.$expr = { $and: [{ $gt: ["$quantity", 0] }, { $lte: ["$quantity", "$lowStockThreshold"] }] };
    }
    if (status === "in") {
      filter.$expr = { $gt: ["$quantity", "$lowStockThreshold"] };
    }

    const sortOptions = {
      newest: { createdAt: -1 },
      name: { name: 1 },
      priceLow: { sellingPrice: 1 },
      priceHigh: { sellingPrice: -1 },
      quantityLow: { quantity: 1 },
      quantityHigh: { quantity: -1 }
    };

    const products = await Product.find(filter).sort(sortOptions[sort] || sortOptions.newest);
    res.json(products);
  } catch (error) {
    handleError(error, res);
  }
}

async function getProduct(req, res) {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid product ID." });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json(product);
  } catch (error) {
    handleError(error, res);
  }
}

async function getStats(_req, res) {
  try {
    const [totalProducts, stockResult, lowStockProducts, valueResult] = await Promise.all([
      Product.countDocuments(),
      Product.aggregate([{ $group: { _id: null, units: { $sum: "$quantity" } } }]),
      Product.countDocuments({
        $expr: { $and: [{ $gt: ["$quantity", 0] }, { $lte: ["$quantity", "$lowStockThreshold"] }] }
      }),
      Product.aggregate([
        { $group: { _id: null, value: { $sum: { $multiply: ["$purchasePrice", "$quantity"] } } } }
      ])
    ]);

    res.json({
      totalProducts,
      totalUnits: stockResult[0]?.units || 0,
      lowStockProducts,
      inventoryValue: valueResult[0]?.value || 0
    });
  } catch (error) {
    handleError(error, res);
  }
}

async function createProduct(req, res) {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    handleError(error, res);
  }
}

async function updateProduct(req, res) {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid product ID." });
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json(product);
  } catch (error) {
    handleError(error, res);
  }
}

async function deleteProduct(req, res) {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid product ID." });
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json({ message: "Product deleted successfully." });
  } catch (error) {
    handleError(error, res);
  }
}

module.exports = { getProducts, getProduct, getStats, createProduct, updateProduct, deleteProduct };
