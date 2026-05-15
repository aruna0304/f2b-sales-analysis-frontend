# F2B Sales Analysis — Frontend

A **Streamlit** multi-page dashboard for Farm2Bag's sales analytics platform.

## Pages

| Page | Description |
|------|-------------|
| 🏠 Home | Overview and navigation hub |
| 📊 Demand Intelligence | Product demand scoring, trends, and weekly distribution |
| 🏪 Vendor Analysis | Vendor purchase summaries, profit margins, and monthly trends |
| 📈 Historical Sales | Historical sales data exploration and analysis |

## Setup

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure backend URL
Create a `.env` file in this directory:
```env
BACKEND_URL="http://localhost:8000"
```

### 3. Run the app
```bash
streamlit run Home.py
```

The app will be available at `http://localhost:8501`.

## Requirements
- Python 3.9+
- A running instance of the [F2B Sales Analytics Backend](https://github.com/Ashwin-deals/f2b-sales-forecasting) on port `8000`

## Tech Stack
- [Streamlit](https://streamlit.io/) — UI framework
- [Plotly](https://plotly.com/python/) — Interactive charts
- [Pandas](https://pandas.pydata.org/) — Data manipulation
- [streamlit-option-menu](https://github.com/victoryhb/streamlit-option-menu) — Sidebar navigation
