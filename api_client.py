import os
import requests
import pandas as pd
import streamlit as st
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

@st.cache_data(ttl=600) # Cache for 10 minutes
def fetch_demand_data():
    url = f"{BACKEND_URL}/data/demand"
    try:
        response = requests.get(url)
        response.raise_for_status()
        return pd.DataFrame(response.json())
    except Exception as e:
        st.error(f"Error fetching demand data: {e}")
        return pd.DataFrame()

@st.cache_data(ttl=600)
def fetch_historical_sales():
    url = f"{BACKEND_URL}/data/historical"
    try:
        response = requests.get(url)
        response.raise_for_status()
        return pd.DataFrame(response.json())
    except Exception as e:
        st.error(f"Error fetching historical sales: {e}")
        return pd.DataFrame()
