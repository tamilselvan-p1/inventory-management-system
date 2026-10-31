const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Product name is required"],
    trim: true,
    maxlength: [100, "Product name cannot exceed 100 characters"]
  },
  sku: {
    type: String,
    required: [true, "SKU is required"],
    trim: true,
    uppercase: true,
    unique: true,
    maxlength: [40, "SKU cannot exceed 40 characters"]
  },
  category: {
    type: String,
    required: [true, "Category is required"],
    trim: true,
    maxlength: [60, "Category cannot exceed 60 characters"]
  },
  purchasePrice: {
    type: Number,
    required: [true, "Purchase price is required"],
    min: [0, "Purchase price cannot be negative"]
  },
  sellingPrice: {
    type: Number,
    required: [true, "Selling price is required"],
    min: [0, "Selling price cannot be negative"]
  },
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
    min: [0, "Quantity cannot be negative"],
    validate: {
      validator: Number.isInteger,
      message: "Quantity must be a whole number"
    }
  },
  supplier: {
    type: String,
    required: [true, "Supplier is required"],
    trim: true,
    maxlength: [100, "Supplier cannot exceed 100 characters"]
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, "Description cannot exceed 500 characters"],
    default: ""
  },
  lowStockThreshold: {
    type: Number,
    min: [0, "Low-stock threshold cannot be negative"],
    default: 5,
    validate: {
      validator: Number.isInteger,
      message: "Low-stock threshold must be a whole number"
    }
  }
}, { timestamps: true });

productSchema.index({ name: "text", sku: "text" });

module.exports = mongoose.model("Product", productSchema);
