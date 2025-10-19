/**
 * Polygon.io Bull PUT Spread Scanner
 * 使用 Polygon.io API 掃描並生成與 Option Samurai 相同格式的報告
 */

import axios from 'axios';

const API_KEY = process.env.POLYGON_API_KEY || 'darsfvapYZJ7ysIzNspvIFgDqDE9VWMt';
const BASE_URL = 'https://api.polygon.io';
const TARGET_DELTA = 0.03; // 目標 Delta 值

interface OptionData {
  details?: {
    contract_type?: string;
    strike_price?: number;
    expiration_date?: string;
    ticker?: string;
  };
  day?: {
    close?: number;
    volume?: number;
    open?: number;
    high?: number;
    low?: number;
    change?: number;
    change_percent?: number;
  };
  last_quote?: {
    bid?: number;
    ask?: number;
  };
  greeks?: {
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
  };
  implied_volatility?: number;
}

interface Strategy {
  ticker: string;
  company_name: string;
  stock_price: number;
  stock_change_percent: number;
  iv_rank: number;
  iv: number;
  short_put_strike: number;
  long_put_strike: number;
  moneyness_short: number;
  moneyness_long: number;
  expiration: string;
  days_to_expiry: number;
  total_volume: number;
  prob_max_profit: number;
  premium: number;
  max_profit: number;
  return_on_risk: number;
  spread_width: number;
  max_loss: number;
  short_put_delta: number;
}

// 股票名稱映射
const COMPANY_NAMES: Record<string, string> = {
  'AMD': 'Advanced Micro Devices',
  'AMZN': 'Amazon.com Inc',
  'APP': 'Applovin Corp',
  'AVGO': 'Broadcom Inc',
  'CLS': 'Celestica, Inc',
  'COIN': 'Coinbase Global',
  'CVNA': 'Carvana Co',
  'GOOG': 'Alphabet Inc',
  'GOOGL': 'Alphabet Inc',
  'LLY': 'Lilly(Eli) & Co',
  'META': 'Meta Platforms Inc',
  'MSTR': 'Strategy Inc',
  'MU': 'Micron Technology',
  'NFLX': 'Netflix Inc',
  'NVDA': 'NVIDIA Corp',
  'OKLO': 'Oklo Inc',
  'ORCL': 'Oracle Corp',
  'PLTR': 'Palantir Technologies',
  'SMH': 'VanEck Semiconductor ETF',
  'TSLA': 'Tesla Inc',
  'TSM': 'Taiwan Semiconductor'
};

/**
 * 延遲函數
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 直接獲取股票價格 (帶重試機制)
 */
async function getStockPrice(ticker: string, retries = 7): Promise<{ price: number; change_percent: number } | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // 添加延遲以避免 API 速率限制
      if (attempt > 1) {
        // 指數退避: 2s, 4s, 8s, 16s
        const delayTime = Math.min(2000 * Math.pow(2, attempt - 2), 16000);
        await delay(delayTime);
      }
      
      const response = await axios.get(`${BASE_URL}/v2/aggs/ticker/${ticker}/prev`, {
        params: { apiKey: API_KEY },
        timeout: 10000
      });
      
      if (response.data?.results?.[0]) {
        const result = response.data.results[0];
        const price = result.c; // close price
        const open = result.o;
        const change_percent = open ? ((price - open) / open) : 0;
        return { price, change_percent };
      }
    } catch (error: any) {
      const isRateLimit = error.response?.status === 429;
      const errorMsg = isRateLimit ? 'Rate limit exceeded' : error.message;
      
      if (attempt < retries) {
        // 如果是速率限制，使用更長的延遲
        const baseDelay = isRateLimit ? 5000 : 2000;
        const nextDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), 30000);
        console.log(`  ⚠️ ${ticker} stock price API failed (attempt ${attempt}/${retries}): ${errorMsg}`);
        console.log(`  ⏳ Waiting ${nextDelay}ms before retry...`);
      } else {
        console.log(`  ❌ ${ticker} stock price API failed after ${retries} attempts: ${errorMsg}`);
      }
    }
  }
  return null;
}

/**
 * 從選擇權估算股價 (備用方法)
 */
function estimateStockPrice(options: OptionData[]): number | null {
  const atmCalls: Array<[number, number]> = [];
  
  for (const opt of options) {
    if (opt.details?.contract_type === 'call') {
      const delta = opt.greeks?.delta;
      if (delta && delta >= 0.45 && delta <= 0.55) {
        const strike = opt.details?.strike_price;
        if (strike) {
          atmCalls.push([Math.abs(delta - 0.5), strike]);
        }
      }
    }
  }
  
  if (atmCalls.length > 0) {
    atmCalls.sort((a, b) => a[0] - b[0]);
    return atmCalls[0][1];
  }
  
  const strikes = options
    .map(opt => opt.details?.strike_price)
    .filter((s): s is number => s !== undefined)
    .sort((a, b) => a - b);
  
  if (strikes.length > 0) {
    return strikes[Math.floor(strikes.length / 2)];
  }
  
  return null;
}

/**
 * 獲取選擇權數據(帶分頁和重試機制)
 */
async function getAllOptions(ticker: string, maxResults: number = 2000, retries: number = 5): Promise<OptionData[]> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // 添加延遲以避免 API 速率限制
      if (attempt > 1) {
        const delayTime = Math.min(3000 * Math.pow(2, attempt - 2), 20000);
        console.log(`  ⏳ ${ticker} options API retry ${attempt}/${retries}, waiting ${delayTime}ms...`);
        await delay(delayTime);
      }
      
      const allOptions: OptionData[] = [];
      let url = `${BASE_URL}/v3/snapshot/options/${ticker}`;
      let params: any = { apiKey: API_KEY, limit: 250 };
      
      while (allOptions.length < maxResults) {
        const response = await axios.get(url, { params, timeout: 15000 });
        const data = response.data;
        
        const results = data.results || [];
        if (results.length === 0) break;
        
        allOptions.push(...results);
        
        const nextUrl = data.next_url;
        if (!nextUrl) break;
        
        url = nextUrl;
        params = { apiKey: API_KEY };
        
        await delay(100);
      }
      
      return allOptions;
    } catch (error: any) {
      const isRateLimit = error.response?.status === 429;
      const errorMsg = isRateLimit ? 'Rate limit exceeded' : error.message;
      
      if (attempt < retries) {
        console.log(`  ⚠️ ${ticker} options API failed (attempt ${attempt}/${retries}): ${errorMsg}`);
      } else {
        console.log(`  ❌ ${ticker} options API failed after ${retries} attempts: ${errorMsg}`);
        return [];
      }
    }
  }
  return [];
}

/**
 * 計算總交易量
 */
function calculateTotalVolume(options: OptionData[]): number {
  return options.reduce((sum, opt) => {
    const volume = opt.day?.volume || 0;
    return sum + volume;
  }, 0);
}

/**
 * 為單個股票找到最佳策略
 */
async function findBestStrategy(ticker: string): Promise<{ strategy: Strategy | null; failureReason?: string }> {
  const options = await getAllOptions(ticker);
  
  if (options.length === 0) {
    return { strategy: null, failureReason: 'options_api_failed' };
  }
  
  // 獲取股票價格
  const stockData = await getStockPrice(ticker);
  let stockPrice: number;
  let stockChangePercent: number = 0;
  
  if (!stockData) {
    console.log(`  ❌ ${ticker} stock price API failed, skipping...`);
    return { strategy: null, failureReason: 'stock_price_api_failed' };
  }
  
  stockPrice = stockData.price;
  stockChangePercent = stockData.change_percent;
  console.log(`  💰 ${ticker} stock price from API: $${stockPrice.toFixed(2)} (${(stockChangePercent * 100).toFixed(2)}%)`);
  
  const totalVolume = calculateTotalVolume(options);
  if (totalVolume < 5000) {
    console.log(`  ❌ ${ticker} total volume too low: ${totalVolume}`);
    return { strategy: null, failureReason: 'low_volume' };
  }
  
  const today = new Date();
  const candidatePuts: Array<{
    strike: number;
    expiration: string;
    days: number;
    delta: number;
    deltaAbs: number;
    bid: number;
    ask: number;
    moneyness: number;
    iv: number;
  }> = [];
  
  let missingPriceCount = 0; // 追蹤缺少價格數據的選項數量
  
  // 收集符合條件的 PUT
  for (const option of options) {
    try {
      const details = option.details;
      if (details?.contract_type !== 'put') continue;
      
      const expiryStr = details.expiration_date;
      if (!expiryStr) continue;
      
      const expiry = new Date(expiryStr);
      const days = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (days < 10 || days > 18) continue;
      
      const strike = details.strike_price;
      if (!strike) continue;
      
      const moneyness = strike / stockPrice;
      if (moneyness > 0.85) continue;
      
      const delta = option.greeks?.delta;
      if (delta === undefined || delta === null) continue;
      
      const deltaAbs = Math.abs(delta);
      if (deltaAbs < 0.01 || deltaAbs > 0.20) continue;
      
      const closePrice = option.day?.close || 0;
      const bid = option.last_quote?.bid || closePrice;
      const ask = option.last_quote?.ask || closePrice;
      
      if (!bid || !ask) {
        missingPriceCount++;
        continue;
      }
      
      const iv = option.implied_volatility || 0;
      
      candidatePuts.push({
        strike,
        expiration: expiryStr,
        days,
        delta,
        deltaAbs,
        bid,
        ask,
        moneyness,
        iv
      });
    } catch (error) {
      continue;
    }
  }
  
  if (candidatePuts.length === 0) {
    if (missingPriceCount > 0) {
      console.log(`  ❌ ${ticker} found ${missingPriceCount} PUTs matching criteria but missing Bid/Ask prices`);
      return { strategy: null, failureReason: 'missing_price_data' };
    }
    console.log(`  ❌ ${ticker} no candidate PUTs found`);
    return { strategy: null, failureReason: 'no_candidate_puts' };
  }
  
  // 找到所有可能的配對
  const allSpreads: Array<{
    shortPut: typeof candidatePuts[0];
    longPut: typeof candidatePuts[0];
    deltaDistance: number;
  }> = [];
  
  for (const shortPut of candidatePuts) {
    for (const longPut of candidatePuts) {
      if (longPut.strike >= shortPut.strike) continue;
      if (shortPut.expiration !== longPut.expiration) continue;
      
      const width = shortPut.strike - longPut.strike;
      if (width < 40 || width > 60) continue;
      
      const premium = shortPut.bid - longPut.ask;
      if (premium <= 0) continue;
      
      const maxProfit = premium * 100;
      if (maxProfit <= 50) continue;
      
      const deltaDistance = Math.abs(shortPut.deltaAbs - TARGET_DELTA);
      
      allSpreads.push({
        shortPut,
        longPut,
        deltaDistance
      });
    }
  }
  
  if (allSpreads.length === 0) {
    console.log(`  ❌ ${ticker} no valid spreads found`);
    return { strategy: null, failureReason: 'no_valid_spreads' };
  }
  
  // 選擇 Delta 最接近目標的
  allSpreads.sort((a, b) => a.deltaDistance - b.deltaDistance);
  const best = allSpreads[0];
  
  const premium = best.shortPut.bid - best.longPut.ask;
  const maxProfit = premium * 100;
  const width = best.shortPut.strike - best.longPut.strike;
  const maxLoss = (width - premium) * 100;
  const returnOnRisk = maxProfit / maxLoss;
  const probMaxProfit = 1 - best.shortPut.deltaAbs;
  
  // 如果之前沒有獲取到 stockChangePercent，嘗試從選擇權數據獲取
  if (stockChangePercent === 0) {
    for (const opt of options) {
      if (opt.day?.change_percent) {
        stockChangePercent = opt.day.change_percent;
        break;
      }
    }
  }
  
  // 計算 IV Rank (簡化版,使用 IV 值)
  const ivRank = best.shortPut.iv ? Math.min(best.shortPut.iv / 100, 1) : 0;
  
  return {
    strategy: {
      ticker,
      company_name: COMPANY_NAMES[ticker] || ticker,
      stock_price: stockPrice,
      stock_change_percent: stockChangePercent,
      iv_rank: ivRank,
      iv: best.shortPut.iv * 100,
      short_put_strike: best.shortPut.strike,
      long_put_strike: best.longPut.strike,
      moneyness_short: best.shortPut.moneyness,
      moneyness_long: best.longPut.moneyness,
      expiration: best.shortPut.expiration,
      days_to_expiry: best.shortPut.days,
      total_volume: totalVolume,
      prob_max_profit: probMaxProfit,
      premium,
      max_profit: maxProfit,
      return_on_risk: returnOnRisk,
      spread_width: width,
      max_loss: maxLoss,
      short_put_delta: best.shortPut.deltaAbs
    }
  };
}

interface ScanError {
  ticker: string;
  company_name: string;
  error_type: 'api_failed' | 'no_strategy' | 'low_volume';
  error_message: string;
}

export interface ScanResult {
  strategies: Strategy[];
  errors: ScanError[];
}

/**
 * 掃描所有股票
 */
export async function scanMarket(tickers: string[]): Promise<ScanResult> {
  console.log(`[Polygon Scanner] 開始掃描 ${tickers.length} 個股票...`);
  
  const strategies: Strategy[] = [];
  const errors: ScanError[] = [];
  
  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    console.log(`[${i + 1}/${tickers.length}] 掃描 ${ticker}...`);
    
    // 添加延遲以避免 API 速率限制
    if (i > 0) {
      await delay(2500); // 每個股票之間延遲 2.5秒
    }
    
    try {
      const result = await findBestStrategy(ticker);
      
      if (result.strategy) {
        strategies.push(result.strategy);
        console.log(`  ✅ 找到策略: $${result.strategy.short_put_strike}/$${result.strategy.long_put_strike}`);
      } else {
        // 根據失敗原因記錄錯誤
        const errorMessages: Record<string, { type: 'api_failed' | 'no_strategy' | 'low_volume', message: string }> = {
          'options_api_failed': { type: 'api_failed', message: '選擇權 API 失敗' },
          'stock_price_api_failed': { type: 'api_failed', message: '股票價格 API 失敗' },
          'missing_price_data': { type: 'api_failed', message: 'API 缺少 Bid/Ask 價格數據' },
          'low_volume': { type: 'low_volume', message: '總交易量低於 5,000' },
          'no_candidate_puts': { type: 'no_strategy', message: '無符合篩選條件的 PUT 選擇權' },
          'no_valid_spreads': { type: 'no_strategy', message: '無符合條件的價差組合' }
        };
        
        const errorInfo = errorMessages[result.failureReason || 'no_valid_spreads'] || 
                         { type: 'no_strategy', message: '未知原因' };
        
        errors.push({
          ticker,
          company_name: COMPANY_NAMES[ticker] || ticker,
          error_type: errorInfo.type,
          error_message: errorInfo.message
        });
        console.log(`  ❌ ${errorInfo.message}`);
      }
    } catch (error: any) {
      errors.push({
        ticker,
        company_name: COMPANY_NAMES[ticker] || ticker,
        error_type: 'api_failed',
        error_message: error.message || '未知錯誤'
      });
      console.error(`  ❌ 錯誤: ${error.message}`);
    }
      
  }
  
  console.log(`[Polygon Scanner] 掃描完成，找到 ${strategies.length} 個策略，${errors.length} 個失敗`);
  
  return { strategies, errors };
}

/**
 * 預設股票列表
 */
export const DEFAULT_TICKERS = [
  'AMD', 'AMZN', 'APP', 'AVGO', 'CLS', 'COIN', 'CVNA', 'GOOG', 'GOOGL',
  'LLY', 'META', 'MSTR', 'MU', 'NFLX', 'NVDA', 'OKLO', 'ORCL', 'PLTR',
  'SMH', 'TSLA', 'TSM'
];

