from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import pandas as pd
from sklearn.neighbors import KNeighborsClassifier

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TICKER_MAP = {
    "Nifty 50": "^NSEI",
    "NTPC": "NTPC.NS",
    "Gold ETF": "GOLDBEES.NS",
    "Silver ETF": "SILVERBEES.NS"
}

@app.get("/api/predict")
def get_market_prediction(asset: str = Query("Nifty 50")):
    ticker_symbol = TICKER_MAP.get(asset, "^NSEI")
    market_asset = yf.Ticker(ticker_symbol)
    df = market_asset.history(period='1y')[['Close']].copy()
    
    # 30-day trend chart logic remains untouched
    chart_df = df.tail(30)
    chart_data = []
    for date, row in chart_df.iterrows():
        chart_data.append({
            "name": date.strftime("%b %d"),
            "price": round(row['Close'], 2)
        })

    # 🆕 FEATURE ENGINEERING FOR KNN CLASSIFICATION
    # Calculate daily percentage changes (momentum)
    df['Return'] = df['Close'].pct_change()
    df['Lag_1'] = df['Return'].shift(1) # Yesterday's return
    
    # Target: 1 if tomorrow's price goes up, 0 if it goes down
    df['Target'] = (df['Return'].shift(-1) > 0).astype(int)
    df = df.dropna()

    # Features: Using [Today's Return, Yesterday's Return] to find patterns
    X = df[['Return', 'Lag_1']]
    y = df['Target']

    # Initialize and train our KNN Classifier
    model = KNeighborsClassifier(n_neighbors=5)
    model.fit(X, y)

    # Grab the absolute latest data points to make tomorrow's prediction
    latest_price = df['Close'].iloc[-1]
    latest_return = df['Return'].iloc[-1]
    prev_return = df['Lag_1'].iloc[-1]

    # Predict tomorrow's classification (0 or 1)
    future_features = pd.DataFrame([{'Return': latest_return, 'Lag_1': prev_return}])
    prediction = model.predict(future_features)[0]
    
    vibe = "BULLISH" if prediction == 1 else "BEARISH"

    # 🆕 PURE DATA SCIENCE FLEX: Real probabilities
    # predict_proba gives us the exact vote split (e.g. [0.2, 0.8] means 80% confident it goes up)
    probabilities = model.predict_proba(future_features)[0]
    confidence_score = round(max(probabilities) * 100, 1)

    # Calculate a conditional expected price target for the UI
    avg_move = df[df['Target'] == prediction]['Return'].mean()
    tomorrow_target = latest_price * (1 + avg_move)

# 📰 BRINGING THE NEWS BACK
    raw_news = market_asset.news
    news_data = []
    
    for article in raw_news[:3]:
        if 'content' in article:
            content = article['content']
            title = content.get('title', 'Market Update')
            
            provider = content.get('provider', {})
            publisher = provider.get('displayName', 'Finance News')
            
            canonical = content.get('canonicalUrl', {})
            click_through = content.get('clickThroughUrl', {})
            link = canonical.get('url') or click_through.get('url') or '#'

            news_data.append({
                "title": title,
                "publisher": publisher,
                "link": link
            })
        else:
            news_data.append({
                "title": article.get('title', 'Market Update'),
                "publisher": article.get('publisher', 'Finance News'),
                "link": article.get('link', '#')
            })

    return {
        "currentPrice": round(latest_price, 2),
        "predictedPrice": round(tomorrow_target, 2),
        "vibe": vibe,
        "chartData": chart_data,
        "confidenceScore": confidence_score,
        "news": news_data # 🆕 Sent back over the bridge!
    }

