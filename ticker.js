// Stock Market Ticker JavaScript with Finnhub.io Real-Time Data
const FINNHUB_API_KEY = 'd1qkd99r01qo4qd7pp40d1qkd99r01qo4qd7pp4g';
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1/quote';
const CACHE_KEY = 'stockTickerCacheV2';
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

class StockTicker {
  constructor() {
    this.stocks = [
      { symbol: 'AAPL', name: 'Apple Inc.' },
      { symbol: 'MSFT', name: 'Microsoft Corp.' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.' },
      { symbol: 'NVDA', name: 'NVIDIA Corp.' },
      { symbol: 'TSLA', name: 'Tesla Inc.' },
      { symbol: 'META', name: 'Meta Platforms Inc.' },
      { symbol: 'BRK.A', name: 'Berkshire Hathaway' },
      { symbol: 'UNH', name: 'UnitedHealth Group' },
      { symbol: 'JNJ', name: 'Johnson & Johnson' },
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
      { symbol: 'V', name: 'Visa Inc.' },
      { symbol: 'PG', name: 'Procter & Gamble Co.' },
      { symbol: 'HD', name: 'Home Depot Inc.' },
      { symbol: 'MA', name: 'Mastercard Inc.' },
      { symbol: 'DIS', name: 'Walt Disney Co.' },
      { symbol: 'PYPL', name: 'PayPal Holdings Inc.' },
      { symbol: 'ADBE', name: 'Adobe Inc.' },
      { symbol: 'NFLX', name: 'Netflix Inc.' },
      { symbol: 'CRM', name: 'Salesforce Inc.' },
      { symbol: 'INTC', name: 'Intel Corp.' },
      { symbol: 'AMD', name: 'Advanced Micro Devices' },
      { symbol: 'TSM', name: 'Taiwan Semiconductor' },
      { symbol: 'ORCL', name: 'Oracle Corp.' },
      { symbol: 'IBM', name: 'International Business Machines' },
      { symbol: 'CSCO', name: 'Cisco Systems Inc.' },
      { symbol: 'QCOM', name: 'Qualcomm Inc.' },
      { symbol: 'TXN', name: 'Texas Instruments Inc.' },
      { symbol: 'AVGO', name: 'Broadcom Inc.' },
      { symbol: 'MU', name: 'Micron Technology Inc.' },
      { symbol: 'AMAT', name: 'Applied Materials Inc.' },
      { symbol: 'KLAC', name: 'KLA Corp.' },
      { symbol: 'LRCX', name: 'Lam Research Corp.' },
      { symbol: 'ASML', name: 'ASML Holding N.V.' },
      { symbol: 'SHOP', name: 'Shopify Inc.' },
      { symbol: 'BABA', name: 'Alibaba Group' },
      { symbol: 'PEP', name: 'PepsiCo Inc.' },
      { symbol: 'KO', name: 'Coca-Cola Co.' },
      { symbol: 'MCD', name: 'McDonald’s Corp.' },
      { symbol: 'WMT', name: 'Walmart Inc.' },
      { symbol: 'COST', name: 'Costco Wholesale Corp.' },
      { symbol: 'NKE', name: 'Nike Inc.' },
      { symbol: 'SBUX', name: 'Starbucks Corp.' },
      { symbol: 'BA', name: 'Boeing Co.' },
      { symbol: 'GE', name: 'General Electric Co.' },
      { symbol: 'CAT', name: 'Caterpillar Inc.' },
      { symbol: 'HON', name: 'Honeywell International' },
      { symbol: 'MMM', name: '3M Co.' },
      { symbol: 'GS', name: 'Goldman Sachs Group' },
      { symbol: 'AXP', name: 'American Express Co.' }
    ];
    this.tickerTrack = document.querySelector('.ticker-track');
    this.stockData = {};
    this.init();
  }

  async init() {
    this.loadCache();
    this.renderTicker(); // Render placeholders or cached data immediately
    this.fetchAllQuotesParallel(); // Fetch all in parallel for initial load
    this.startPriceUpdates(); // Start periodic updates (batched)
  }

  loadCache() {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
        this.stockData = cache.data;
      }
    } catch (e) {}
  }

  saveCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: this.stockData
      }));
    } catch (e) {}
  }

  // Fetch all quotes in parallel for initial load (progressive rendering)
  async fetchAllQuotesParallel() {
    await Promise.all(this.stocks.map(stock => this.fetchQuoteAndUpdate(stock)));
    this.saveCache();
  }

  // For periodic updates, use batching to avoid rate limits
  async fetchAllQuotesBatched() {
    const batchSize = 10;
    for (let i = 0; i < this.stocks.length; i += batchSize) {
      const batch = this.stocks.slice(i, i + batchSize);
      await Promise.all(batch.map(stock => this.fetchQuoteAndUpdate(stock)));
      if (i + batchSize < this.stocks.length) {
        await new Promise(res => setTimeout(res, 1200));
      }
    }
    this.saveCache();
  }

  // Fetch and update a single stock cell
  async fetchQuoteAndUpdate(stock) {
    let symbol = stock.symbol;
    if (symbol === 'BRK.A') symbol = 'BRK.A';
    const url = `${FINNHUB_BASE_URL}?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      this.stockData[stock.symbol] = {
        price: data.c,
        previousClose: data.pc,
        change: data.c - data.pc,
        changePercent: data.pc ? ((data.c - data.pc) / data.pc) * 100 : 0
      };
    } catch (e) {
      if (!this.stockData[stock.symbol]) {
        this.stockData[stock.symbol] = {
          price: 0,
          previousClose: 0,
          change: 0,
          changePercent: 0
        };
      }
    }
    this.updateTickerCell(stock.symbol);
  }

  formatPrice(price) {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return price ? price.toFixed(2) : '--';
  }

  formatChange(change) {
    if (typeof change !== 'number') return '--';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}`;
  }

  formatChangePercent(changePercent) {
    if (typeof changePercent !== 'number') return '--';
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(2)}%`;
  }

  getChangeClass(change) {
    if (change > 0) return 'positive';
    if (change < 0) return 'negative';
    return 'neutral';
  }

  getArrowClass(change) {
    if (change > 0) return 'up';
    if (change < 0) return 'down';
    return 'neutral';
  }

  getArrowSymbol(change) {
    if (change > 0) return '▲';
    if (change < 0) return '▼';
    return '●';
  }

  // Render all ticker cells (with placeholders or cached data)
  renderTicker() {
    // Two sets for seamless looping
    const stockEntries = [...this.stocks, ...this.stocks];
    this.tickerTrack.innerHTML = stockEntries.map(stock => {
      const data = this.stockData[stock.symbol] || {};
      return `
        <div class="stock-entry" data-symbol="${stock.symbol}">
          <div class="stock-symbol">${stock.symbol}</div>
          <div class="stock-price">${data.price !== undefined ? '$' + this.formatPrice(data.price) : '<span class=\'loading\'>...</span>'}</div>
          <div class="stock-change ${this.getChangeClass(data.change)}">
            <span class="change-arrow ${this.getArrowClass(data.change)}">${this.getArrowSymbol(data.change)}</span>
            ${data.change !== undefined ? this.formatChange(data.change) : '<span class=\'loading\'>...</span>'} (${data.changePercent !== undefined ? this.formatChangePercent(data.changePercent) : '<span class=\'loading\'>...</span>'})
          </div>
        </div>
      `;
    }).join('');
  }

  // Update a single ticker cell (both copies for seamless loop)
  updateTickerCell(symbol) {
    const data = this.stockData[symbol] || {};
    const entries = this.tickerTrack.querySelectorAll(`.stock-entry[data-symbol="${symbol}"]`);
    entries.forEach(entry => {
      const priceDiv = entry.querySelector('.stock-price');
      const changeDiv = entry.querySelector('.stock-change');
      if (priceDiv) priceDiv.innerHTML = data.price !== undefined ? '$' + this.formatPrice(data.price) : '<span class="loading">...</span>';
      if (changeDiv) {
        changeDiv.className = `stock-change ${this.getChangeClass(data.change)}`;
        changeDiv.innerHTML = `
          <span class="change-arrow ${this.getArrowClass(data.change)}">${this.getArrowSymbol(data.change)}</span>
          ${data.change !== undefined ? this.formatChange(data.change) : '<span class="loading">...</span>'} (${data.changePercent !== undefined ? this.formatChangePercent(data.changePercent) : '<span class="loading">...</span>'})
        `;
      }
    });
  }

  // Periodic updates (batched)
  async updatePrices() {
    await this.fetchAllQuotesBatched();
    this.renderTicker();
  }

  startPriceUpdates() {
    setInterval(() => {
      this.updatePrices();
    }, 10000); // update every 10 seconds
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new StockTicker();
}); 