import React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Boxes, Package, CircleDollarSign, AlertTriangle, Search, Plus, Pencil,
  Trash2, RefreshCw, X, ArrowDownRight, ArrowUpRight, Layers3, Truck
} from "lucide-react";
import { api } from "./api.js";

const emptyForm = {
  name: "", sku: "", category: "Electronics", purchasePrice: "", sellingPrice: "",
  quantity: "", supplier: "", description: "", lowStockThreshold: "5"
};

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0
}).format(Number(value || 0));

function stockStatus(product) {
  if (Number(product.quantity) === 0) return { label: "Out of stock", className: "out" };
  if (Number(product.quantity) <= Number(product.lowStockThreshold ?? 5)) return { label: "Low stock", className: "low" };
  return { label: "In stock", className: "in" };
}

function StatCard({ title, value, note, icon: Icon, tone }) {
  return <article className="stat-card">
    <div className={`stat-icon ${tone}`}><Icon size={20} /></div>
    <p className="stat-title">{title}</p>
    <div className="stat-value">{value}</div>
    <p className="stat-note">{note}</p>
  </article>;
}

function ProductModal({ product, onClose, onSave, saving }) {
  const [form, setForm] = useState(product ? {
    name: product.name, sku: product.sku, category: product.category,
    purchasePrice: String(product.purchasePrice), sellingPrice: String(product.sellingPrice),
    quantity: String(product.quantity), supplier: product.supplier,
    description: product.description || "", lowStockThreshold: String(product.lowStockThreshold ?? 5)
  } : emptyForm);
  const [error, setError] = useState("");

  function update(event) {
    setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!form.name.trim() || !form.sku.trim() || !form.category.trim() || !form.supplier.trim()) {
      setError("Please complete all required fields.");
      return;
    }
    const purchasePrice = Number(form.purchasePrice);
    const sellingPrice = Number(form.sellingPrice);
    const quantity = Number(form.quantity);
    const lowStockThreshold = Number(form.lowStockThreshold);
    if ([form.purchasePrice, form.sellingPrice, form.quantity, form.lowStockThreshold].some(v => v === "")) {
      setError("Please enter prices, quantity, and low-stock threshold.");
      return;
    }
    if (![purchasePrice, sellingPrice, quantity, lowStockThreshold].every(Number.isFinite) ||
        purchasePrice < 0 || sellingPrice < 0 || quantity < 0 || !Number.isInteger(quantity) ||
        lowStockThreshold < 0 || !Number.isInteger(lowStockThreshold)) {
      setError("Prices must be zero or higher; quantities and threshold must be whole, non-negative numbers.");
      return;
    }

    try {
      await onSave({
        name: form.name.trim(), sku: form.sku.trim().toUpperCase(), category: form.category.trim(),
        purchasePrice, sellingPrice, quantity, supplier: form.supplier.trim(),
        description: form.description.trim(), lowStockThreshold
      });
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-head">
        <div><span className="eyebrow">{product ? "UPDATE INVENTORY" : "NEW INVENTORY ITEM"}</span>
          <h2 id="modal-title">{product ? "Edit product" : "Add a product"}</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button>
      </div>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label className="field full">Product name *<input name="name" value={form.name} onChange={update} placeholder="e.g. Wireless Mouse" maxLength="100" required /></label>
          <label className="field">SKU *<input name="sku" value={form.sku} onChange={update} placeholder="e.g. WM-001" maxLength="40" required /></label>
          <label className="field">Category *
            <select name="category" value={form.category} onChange={update} required>
              {["Electronics", "Accessories", "Office Supplies", "Furniture", "Clothing", "Food & Beverage", "Other"].map(category => <option key={category}>{category}</option>)}
            </select>
          </label>
          <label className="field">Purchase price (₹) *<input type="number" min="0" step="0.01" name="purchasePrice" value={form.purchasePrice} onChange={update} placeholder="350" required /></label>
          <label className="field">Selling price (₹) *<input type="number" min="0" step="0.01" name="sellingPrice" value={form.sellingPrice} onChange={update} placeholder="599" required /></label>
          <label className="field">Quantity *<input type="number" min="0" step="1" name="quantity" value={form.quantity} onChange={update} placeholder="25" required /></label>
          <label className="field">Low-stock alert at<input type="number" min="0" step="1" name="lowStockThreshold" value={form.lowStockThreshold} onChange={update} required /></label>
          <label className="field full">Supplier *<input name="supplier" value={form.supplier} onChange={update} placeholder="Supplier or company name" maxLength="100" required /></label>
          <label className="field full">Description <textarea name="description" value={form.description} onChange={update} placeholder="Optional product details..." rows="3" maxLength="500" /></label>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="button primary" disabled={saving}>{saving ? "Saving..." : product ? "Save changes" : "Add product"}</button></div>
      </form>
    </section>
  </div>;
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({ totalProducts: 0, totalUnits: 0, lowStockProducts: 0, inventoryValue: 0 });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [modalProduct, setModalProduct] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (category !== "all") params.set("category", category);
    if (status !== "all") params.set("status", status);
    if (sort !== "newest") params.set("sort", sort);
    const value = params.toString();
    return value ? `?${value}` : "";
  }, [search, category, status, sort]);

  const refresh = useCallback(async () => {
    setPageError("");
    try {
      const [productData, statsData] = await Promise.all([api.getProducts(query), api.getStats()]);
      setProducts(productData);
      setStats(statsData);
    } catch (error) {
      setPageError(error.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(refresh, 180);
    return () => clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function saveProduct(data) {
    setSaving(true);
    try {
      if (modalProduct?._id) await api.updateProduct(modalProduct._id, data);
      else await api.createProduct(data);
      setModalOpen(false);
      setModalProduct(null);
      setNotice(modalProduct ? "Product updated successfully." : "Product added successfully.");
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete "${product.name}" (${product.sku})? This cannot be undone.`)) return;
    try {
      await api.deleteProduct(product._id);
      setNotice("Product deleted successfully.");
      await refresh();
    } catch (error) {
      setPageError(error.message);
    }
  }

  const categories = [...new Set(products.map(product => product.category))].sort();

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#" aria-label="Stockwise home"><span className="brand-mark"><Boxes size={22} /></span><span>stockwise<span className="brand-dot">.</span><small>INVENTORY CONTROL</small></span></a>
      <div className="side-label">WORKSPACE</div>
      <div className="side-link active"><Layers3 size={18} /> Inventory overview</div>
      <div className="side-link muted"><Package size={18} /> Products <span className="side-count">{stats.totalProducts}</span></div>
      <div className="sidebar-bottom"><div className="help-mark">?</div><div><strong>Inventory made simple</strong><p>Keep your stock in check, every day.</p></div></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>Inventory</strong></div>
        <div className="topbar-right"><span className="connection-dot"></span><span>Inventory workspace</span><div className="avatar">S</div></div>
      </header>

      <section className="page-heading">
        <div><div className="eyebrow">OVERVIEW</div><h1>Inventory overview</h1><p className="subtitle">Track your products, stock levels, and inventory value.</p></div>
        <button className="button primary add-main" onClick={() => { setModalProduct(null); setModalOpen(true); }}><Plus size={18} /> Add product</button>
      </section>

      {pageError && <div className="alert error-alert"><AlertTriangle size={18} /><span>{pageError}</span><button className="icon-button" onClick={() => setPageError("")} aria-label="Dismiss"><X size={16} /></button></div>}
      {notice && <div className="alert success-alert">{notice}</div>}

      <section className="stats-grid">
        <StatCard title="Total products" value={stats.totalProducts.toLocaleString("en-IN")} note="Unique items in inventory" icon={Package} tone="purple" />
        <StatCard title="Units in stock" value={stats.totalUnits.toLocaleString("en-IN")} note="Across all products" icon={Boxes} tone="blue" />
        <StatCard title="Low-stock items" value={stats.lowStockProducts.toLocaleString("en-IN")} note="Needs your attention" icon={AlertTriangle} tone="orange" />
        <StatCard title="Inventory value" value={money(stats.inventoryValue)} note="Based on purchase price" icon={CircleDollarSign} tone="green" />
      </section>

      <section className="inventory-panel">
        <div className="panel-heading"><div><h2>Product inventory</h2><p>Manage and monitor your current stock.</p></div>
          <button className="button secondary refresh-button" onClick={() => { setLoading(true); refresh(); }}><RefreshCw size={15} /> Refresh</button></div>
        <div className="toolbar">
          <label className="search-box"><Search size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search products or SKU..." aria-label="Search products" /></label>
          <select value={category} onChange={event => setCategory(event.target.value)} aria-label="Filter category"><option value="all">All categories</option>{categories.map(item => <option key={item} value={item}>{item}</option>)}</select>
          <select value={status} onChange={event => setStatus(event.target.value)} aria-label="Filter stock status"><option value="all">All stock status</option><option value="in">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></select>
          <select value={sort} onChange={event => setSort(event.target.value)} aria-label="Sort products"><option value="newest">Newest first</option><option value="name">Name A–Z</option><option value="priceLow">Price: low to high</option><option value="priceHigh">Price: high to low</option><option value="quantityLow">Quantity: low to high</option><option value="quantityHigh">Quantity: high to low</option></select>
        </div>

        <div className="table-wrap"><table><thead><tr><th>PRODUCT</th><th>SKU</th><th>CATEGORY</th><th>SELLING PRICE</th><th>QUANTITY</th><th>STOCK STATUS</th><th className="actions-heading">ACTIONS</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan="7"><div className="empty-state"><RefreshCw className="spin" size={22} /><strong>Loading inventory...</strong></div></td></tr>
            : products.length === 0 ? <tr><td colSpan="7"><div className="empty-state"><Package size={28} /><strong>No products found</strong><span>Add a product or change your search filters.</span><button className="button secondary" onClick={() => { setSearch(""); setCategory("all"); setStatus("all"); }}>Clear filters</button></div></td></tr>
            : products.map(product => {
              const stock = stockStatus(product);
              return <tr key={product._id}>
                <td><div className="product-cell"><span className="product-icon"><Package size={17} /></span><div><strong>{product.name}</strong><small>{product.supplier}</small></div></div></td>
                <td><span className="sku">{product.sku}</span></td><td><span className="category-chip">{product.category}</span></td>
                <td className="price">{money(product.sellingPrice)}</td><td><strong>{product.quantity}</strong><span className="unit-label"> units</span></td>
                <td><span className={`status-pill ${stock.className}`}><span></span>{stock.label}</span></td>
                <td><div className="row-actions"><button className="icon-button edit-button" title="Edit product" aria-label={`Edit ${product.name}`} onClick={() => { setModalProduct(product); setModalOpen(true); }}><Pencil size={16} /></button><button className="icon-button delete-button" title="Delete product" aria-label={`Delete ${product.name}`} onClick={() => deleteProduct(product)}><Trash2 size={16} /></button></div></td>
              </tr>;
            })}
          </tbody></table></div>
        <div className="table-footer"><span>Showing <strong>{products.length}</strong> product{products.length === 1 ? "" : "s"} matching your filters</span><span><span className="footer-dot"></span> Live database data</span></div>
      </section>

      <footer className="footer"><span>Stockwise Inventory Management</span><span>Built with React · Express · MongoDB</span></footer>
    </main>
    {modalOpen && <ProductModal product={modalProduct} onClose={() => { setModalOpen(false); setModalProduct(null); }} onSave={saveProduct} saving={saving} />}
  </div>;
}
