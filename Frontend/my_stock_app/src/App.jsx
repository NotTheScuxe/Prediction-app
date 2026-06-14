import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import './App.css'

function App() {
  const [selectedAsset, setSelectedAsset] = useState("Nifty 50");
  const [currentPrice, setCurrentPrice] = useState("Loading...");
  const [predictedPrice, setPredictedPrice] = useState("Loading...");
  const [vibe, setVibe] = useState("WAITING");
  const [confidence, setConfidence] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState([]); // 📰 Bringing the news state back!

  // 💸 Load wallet balance from localStorage, or default to ₹1,00,000
  const [balance, setBalance] = useState(() => {
    const savedBalance = localStorage.getItem('trading_balance');
    return savedBalance ? parseFloat(savedBalance) : 100000;
  });

  // 📦 Load shares/units owned from localStorage, or default to 0
  const [holdings, setHoldings] = useState(() => {
    const savedHoldings = localStorage.getItem('trading_holdings');
    return savedHoldings ? JSON.parse(savedHoldings) : {
      "Nifty 50": 0,
      "NTPC": 0,
      "Gold ETF": 0,
      "Silver ETF": 0
    };
  });

  // Save wallet and holdings to localStorage automatically whenever they change
  useEffect(() => {
    localStorage.setItem('trading_balance', balance);
    localStorage.setItem('trading_holdings', JSON.stringify(holdings));
  }, [balance, holdings]);

  // Fetching live data from our Python bridge
  useEffect(() => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/api/predict?asset=${encodeURIComponent(selectedAsset)}`)
      .then(response => response.json())
      .then(data => {
        setCurrentPrice(data.currentPrice);
        setPredictedPrice(data.predictedPrice);
        setVibe(data.vibe);
        setChartData(data.chartData);
        setConfidence(data.confidenceScore);
        setNews(data.news); // 📰 Catching the news data from Python again!
        setLoading(false);
      })
      .catch(error => {
        console.error("The bridge is down!", error);
        setVibe("ERROR");
        setLoading(false);
      });
  }, [selectedAsset]);

  // 🟢 BUY TRANSACTION LOGIC
  const executeBuy = () => {
    if (typeof currentPrice !== 'number') return;
    if (balance >= currentPrice) {
      setBalance(prev => prev - currentPrice);
      setHoldings(prev => ({
        ...prev,
        [selectedAsset]: prev[selectedAsset] + 1
      }));
    } else {
      alert("Insufficient funds! Go grind some more paper cash.");
    }
  };

  // 🔴 SELL TRANSACTION LOGIC
  const executeSell = () => {
    if (typeof currentPrice !== 'number') return;
    if (holdings[selectedAsset] > 0) {
      setBalance(prev => prev + currentPrice);
      setHoldings(prev => ({
        ...prev,
        [selectedAsset]: prev[selectedAsset] - 1
      }));
    } else {
      alert(`You don't own any units of ${selectedAsset} to sell!`);
    }
  };

  return (
    <div className="page-wrapper"> {/* 🆕 NEW: The invisible master box */}

      <header>
        <h1>🚀 Market Oracle</h1>
        <p>AI-Powered Predictive Engine</p>
      </header>

      <div className="app-container">

        {/* LEFT PANEL: Command Center */}
        <aside className="side-panel left-panel">
          <div className="card" style={{ padding: '1.5rem', textAlign: 'left' }}>
            <h2 style={{ marginBottom: '1rem' }}>Command Center</h2>

            <div className="portfolio-balance">
              <p>Paper Trading Power</p>
              <h3>₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>

            {/* Watchlist Section */}
            <div className="watchlist">
              <h3>Quick Watchlist</h3>
              {['Nifty 50', 'NTPC', 'Gold ETF', 'Silver ETF'].map((asset) => (
                <button
                  key={asset}
                  onClick={() => setSelectedAsset(asset)}
                  className={`watch-btn ${selectedAsset === asset ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>{asset}</span>
                    {holdings[asset] > 0 && <span className="holding-badge">{holdings[asset]} owned</span>}
                  </div>
                </button>
              ))}
            </div>

          </div>
        </aside>

        {/* CENTER COLUMN */}
        <main className="dashboard-main" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s ease' }}>

          <div className="selector-container">
            <label htmlFor="asset-select">Select Asset: </label>
            <select
              id="asset-select"
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              className="asset-dropdown"
            >
              <option value="Nifty 50">Nifty 50 Index</option>
              <option value="NTPC">NTPC Shares</option>
              <option value="Gold ETF">Gold ETF</option>
              <option value="Silver ETF">Silver ETF</option>
            </select>
          </div>

          {chartData.length > 0 && (
            <div className="card" style={{ width: '100%', maxWidth: '600px', padding: '1rem' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>30-Day Trend ({selectedAsset})</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#8b92a5" tick={{ fill: '#8b92a5', fontSize: 12 }} />
                  <YAxis domain={['auto', 'auto']} stroke="#8b92a5" tick={{ fill: '#8b92a5', fontSize: 12 }} width={65} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e2030', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#00f2fe', fontWeight: 'bold' }}
                  />
                  <Line type="monotone" dataKey="price" stroke="#00f2fe" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#00f2fe' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="card">
            <h2>Today's Valuation</h2>
            <p className="price">
              {typeof currentPrice === 'number' ? `₹${currentPrice.toLocaleString()}` : currentPrice}
            </p>

            {/* 🆕 NEW: The Quick Trade Action Area */}
            <div className="trade-actions">
              <button
                onClick={executeBuy}
                disabled={typeof currentPrice !== 'number'}
                className="trade-btn buy-btn"
              >
                Buy 1 Unit
              </button>
              <button
                onClick={executeSell}
                disabled={typeof currentPrice !== 'number' || holdings[selectedAsset] === 0}
                className="trade-btn sell-btn"
              >
                Sell 1 Unit
              </button>
            </div>
          </div>

          <div className="card prediction-card">
            <h2>Tomorrow's Prediction</h2>
            <p className="price">
              {typeof predictedPrice === 'number' ? `₹${predictedPrice.toLocaleString()}` : predictedPrice}
            </p>

            {/* 🆕 NEW: Dynamic Vibe Meter */}
            <div className="vibe-meter-box">
              <div className="vibe-meter-header">
                <h3>Market Vibe</h3>
                <span className={vibe === "BULLISH" ? "green-text" : vibe === "BEARISH" ? "red-text" : ""}>
                  {confidence}% {vibe}
                </span>
              </div>

              <div className="gauge-track">
                {/* The glowing color gradient */}
                <div className="gauge-gradient"></div>

                {/* The center line */}
                <div className="gauge-center-mark"></div>

                {/* The moving needle */}
                <div
                  className="gauge-needle"
                  style={{
                    /* Math check: Center is 50%. 
                      If Bullish, we move right (+). If Bearish, we move left (-).
                    */
                    left: `${vibe === "BULLISH" ? 50 + (confidence / 2) : 50 - (confidence / 2)}%`,
                    boxShadow: vibe === "BULLISH" ? '0 0 10px #00e676' : vibe === "BEARISH" ? '0 0 10px #ff4b4b' : 'none'
                  }}
                ></div>
              </div>

              <div className="gauge-labels">
                <span>Strong Sell</span>
                <span>Neutral</span>
                <span>Strong Buy</span>
              </div>
            </div>
          </div>

        </main>

        {/* RIGHT PANEL: Market Alpha */}
        <aside className="side-panel right-panel">
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ marginBottom: '1rem', textAlign: 'left' }}>Market Alpha</h2>

            <div className="news-feed">
              {news.length > 0 ? (
                news.map((item, index) => (
                  <a key={index} href={item.link} target="_blank" rel="noreferrer" className="news-item">
                    <span className="publisher">{item.publisher}</span>
                    <h4>{item.title}</h4>
                  </a>
                ))
              ) : (
                <p style={{ color: '#8b92a5', fontSize: '0.9rem' }}>Scanning headlines...</p>
              )}
            </div>
          </div>
        </aside>

      </div>
      {/* 🆕 NEW: The Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <p>Built by Arnav Mishra | Market Oracle © 2026</p>

          {/* Your Contact Links */}
          <div className="social-links">
            <a href="https://www.linkedin.com/in/arnav-mishra-80a80431b" target="_blank" rel="noreferrer">LinkedIn</a>
            <span className="divider">•</span>
            <a href="#" target="_blank" rel="noreferrer">X (Twitter)</a>
            <span className="divider">•</span>
            <a href="https://www.instagram.com/arnavaram/" target="_blank" rel="noreferrer">Instagram</a>
          </div>
        </div>

        <div className="footer-links">
          <a href="#">System Status: All Systems Operational 🟢</a>
          <a href="#">GitHub Repo</a>
        </div>
      </footer>

    </div> /* This closes the page-wrapper */
  )
}

export default App