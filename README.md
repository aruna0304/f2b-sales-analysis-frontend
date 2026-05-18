# F2B Sales Analysis Frontend

A React.js dashboard for Farm2Bag sales analytics. The app is built with Vite and consumes the existing FastAPI backend.

## Pages

| Page | Description |
| --- | --- |
| Home | Overview and navigation hub |
| Demand Intelligence | Product demand scoring, filters, priority products, and weekly distribution |
| Vendor Analysis | Vendor purchase summaries, profit margins, monthly trends, and product drill-down |
| Historical Sales | Daily and monthly top-product sales views |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure backend URL

Create or update `.env` in this directory:

```env
VITE_BACKEND_URL="http://localhost:8000"
```

### 3. Run the app

```bash
npm run dev
```

The app will be available at the local Vite URL, usually `http://localhost:5173`.

## Build

```bash
npm run build
```

## Requirements

- Node.js 16+
- A running instance of the F2B Sales Analytics Backend on port `8000`

## Tech Stack

- React
- Vite
- FastAPI backend
