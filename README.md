# Inventory Management System

A full-stack MERN-style inventory app built with React, Vite, Node.js, Express, Mongoose, and MongoDB Atlas.

## Features

- Create, read, update, and delete products (CRUD)
- Dashboard totals: product count, total units, low-stock products, and inventory value
- Search by product name or SKU
- Filter by category and stock status
- Product validation, duplicate SKU handling, and delete confirmation
- Responsive layout

## Requirements

- Node.js 18+
- A MongoDB Atlas connection string (or another MongoDB connection string)

## 1. Configure the backend

Open a terminal in the project folder:

```bash
cd backend
npm install
```

Create `backend/.env` based on `.env.example`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/inventory_db?retryWrites=true&w=majority
CLIENT_URL=http://localhost:5173
```

Replace the URI with your own MongoDB Atlas connection string. In Atlas, ensure your database user exists and your current IP is allowed in Network Access.

Start the backend:

```bash
npm run dev
```

The API runs at `http://localhost:5000`. Test `http://localhost:5000/api/health`.

## 2. Configure the frontend

Open a second terminal from the project root:

```bash
cd frontend
npm install
```

Create `frontend/.env` based on `.env.example`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start React:

```bash
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/products` | List products; supports `search`, `category`, `status`, and `sort` query parameters |
| GET | `/api/products/stats` | Dashboard statistics |
| GET | `/api/products/:id` | Get one product |
| POST | `/api/products` | Create a product |
| PUT | `/api/products/:id` | Update a product |
| DELETE | `/api/products/:id` | Delete a product |

## Product fields

- `name` (required)
- `sku` (required, unique)
- `category` (required)
- `purchasePrice` (number >= 0)
- `sellingPrice` (number >= 0)
- `quantity` (non-negative integer)
- `supplier` (required)
- `description` (optional)
- `lowStockThreshold` (non-negative integer; defaults to 5)
