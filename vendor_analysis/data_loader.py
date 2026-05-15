"""
Data Loader for Vendor Analysis (API Version).

Calls the Backend API and returns clean pandas DataFrames 
ready for Streamlit visualizations.
"""

import os
import logging
import pandas as pd
import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Backend API configuration
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

def _fetch_from_api(endpoint: str) -> list:
    """Helper to fetch JSON from API."""
    url = f"{BACKEND_URL}/{endpoint.lstrip('/')}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Error calling API {url}: {e}")
        return []

def _clean_df(records: list, default_numeric_cols: list = None) -> pd.DataFrame:
    """
    Convert a list of dicts to a DataFrame.
    - Fills NaN numeric columns with 0.
    """
    if not records:
        return pd.DataFrame()

    df = pd.DataFrame(records)

    # Fill numeric NaN with 0
    if default_numeric_cols:
        for col in default_numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    return df


# ── Public Loader Functions ───────────────────────────────────────────────────

def load_vendor_purchase_summary() -> pd.DataFrame:
    records = _fetch_from_api("/vendors/summary")
    numeric_cols = ["totalQuantity", "totalPurchaseAmt", "totalGST",
                    "uniqueProductCount", "transactionCount"]
    df = _clean_df(records, numeric_cols)
    logger.info(f"load_vendor_purchase_summary: {len(df)} rows")
    return df


def load_profit_analysis() -> pd.DataFrame:
    records = _fetch_from_api("/vendors/profit")
    numeric_cols = ["totalRevenue", "totalCost", "totalPurchaseAmt", "totalGST",
                    "estimatedProfit", "profitMarginPct", "totalQuantity", "transactionCount"]
    df = _clean_df(records, numeric_cols)
    logger.info(f"load_profit_analysis: {len(df)} rows")
    return df


def load_monthly_trends() -> pd.DataFrame:
    records = _fetch_from_api("/vendors/trends")
    numeric_cols = ["year", "month", "totalQuantity", "totalPurchaseAmt",
                    "totalGST", "transactionCount"]
    df = _clean_df(records, numeric_cols)
    if not df.empty and "monthStr" in df.columns:
        df["monthStr"] = df["monthStr"].astype(str)
    logger.info(f"load_monthly_trends: {len(df)} rows")
    return df


def load_vendor_product_breakdown(vendor_id: str) -> pd.DataFrame:
    records = _fetch_from_api(f"/vendors/{vendor_id}/products")
    numeric_cols = ["totalQuantity", "totalPurchaseAmt", "totalGST",
                    "totalRevenue", "estimatedProfit", "avgSellingPrice", "transactionCount"]
    df = _clean_df(records, numeric_cols)
    logger.info(f"load_vendor_product_breakdown({vendor_id}): {len(df)} rows")
    return df
