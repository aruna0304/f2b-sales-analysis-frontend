import { useState } from 'react';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import DemandIntelligence from './pages/DemandIntelligence.jsx';
import VendorAnalysis from './pages/VendorAnalysis.jsx';
import HistoricalSales from './pages/HistoricalSales.jsx';
import WastageShrinkage from './pages/WastageShrinkage.jsx';

const pages = {
  home: Home,
  demand: DemandIntelligence,
  vendors: VendorAnalysis,
  historical: HistoricalSales,
  wastage: WastageShrinkage
};

export default function App() {
  const [page, setPage] = useState('home');
  const ActivePage = pages[page];

  return (
    <Layout page={page} setPage={setPage}>
      <ActivePage setPage={setPage} />
    </Layout>
  );
}
