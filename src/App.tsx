import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Activity, Clock, Shield, 
  BarChart3, PieChart, Settings, Bell, Search,
  ChevronDown, ArrowUpRight, ArrowDownRight, Zap,
  Target, AlertTriangle, Info, RefreshCw
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area,
  ComposedChart, Bar, Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// --- Types ---
type TradingStyle = 'Scalping' | 'Intraday' | 'Swing';
type Timeframe = '1M' | '5M' | '15M' | '1H' | '4H' | '1D';

interface MarketData {
  time: any; // Unix timestamp or string for lightweight-charts
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface AnalysisResult {
  trend: 'Bullish' | 'Bearish' | 'Neutral';
  support: number[];
  resistance: number[];
  indicators: string;
  recommendation: 'Buy' | 'Sell' | 'Wait';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskLevel: 'High' | 'Medium' | 'Low';
  rationale: string;
  atr: number;
  fibonacciLevels: { level: string; price: number }[];
  ictSessionAnalysis: string;
  smcAnalysis: string;
  candlePatterns: string;
  srAreas: { type: 'Support' | 'Resistance'; price: number; strength: 'Strong' | 'Moderate' | 'Weak' }[];
}

// Initialize Gemini
// Moved to server-side for security and reliability

// --- Mock Data Generator ---
const generateMockData = (basePrice: number, count: number, precision: number): MarketData[] => {
  let currentPrice = basePrice;
  const now = Math.floor(Date.now() / 1000);
  return Array.from({ length: count }).map((_, i) => {
    const open = currentPrice;
    const close = currentPrice + (Math.random() - 0.5) * (basePrice * 0.001);
    const high = Math.max(open, close) + Math.random() * (basePrice * 0.0005);
    const low = Math.min(open, close) - Math.random() * (basePrice * 0.0005);
    currentPrice = close;
    
    return {
      time: now - (count - i) * 60 as any,
      open: Number(open.toFixed(precision)),
      high: Number(high.toFixed(precision)),
      low: Number(low.toFixed(precision)),
      close: Number(close.toFixed(precision)),
      volume: Math.floor(Math.random() * 1000) + 500
    };
  });
};

const generateNextTick = (lastData: MarketData, basePrice: number, precision: number): MarketData => {
  const open = lastData.close;
  const close = open + (Math.random() - 0.5) * (basePrice * 0.0005);
  const high = Math.max(open, close) + Math.random() * (basePrice * 0.0002);
  const low = Math.min(open, close) - Math.random() * (basePrice * 0.0002);
  
  return {
    time: Math.floor(Date.now() / 1000) as any,
    open: Number(open.toFixed(precision)),
    high: Number(high.toFixed(precision)),
    low: Number(low.toFixed(precision)),
    close: Number(close.toFixed(precision)),
    volume: Math.floor(Math.random() * 1000) + 500
  };
};

const calculateATR = (data: MarketData[], period: number = 14): number => {
  if (data.length < period + 1) return 0;
  
  const ranges: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i-1].close),
      Math.abs(data[i].low - data[i-1].close)
    );
    ranges.push(tr);
  }
  
  const recentRanges = ranges.slice(-period);
  return recentRanges.reduce((a, b) => a + b, 0) / recentRanges.length;
};

const PAIRS = [
  { id: 'XAUUSD', name: 'Gold / USD', base: 4682.00, precision: 2, pipIndex: 1 },
  { id: 'EURUSD', name: 'EUR / USD', base: 1.08450, precision: 5, pipIndex: 3 },
  { id: 'GBPUSD', name: 'GBP / USD', base: 1.26540, precision: 5, pipIndex: 3 },
  { id: 'USDJPY', name: 'USD / JPY', base: 151.250, precision: 3, pipIndex: 1 },
  { id: 'BTCUSD', name: 'Bitcoin / USD', base: 65420.00, precision: 2, pipIndex: 1 },
];

type Pair = (typeof PAIRS)[number];
type AppView = 'dashboard' | 'markets' | 'education';

const EDUCATION_TOPICS = [
  {
    term: 'Order Block (OB)',
    detail: 'Zona candle terakhir sebelum pergerakan impulsif. Dipakai sebagai area entry saat harga kembali menguji zona tersebut.',
  },
  {
    term: 'Fair Value Gap (FVG)',
    detail: 'Celah likuiditas yang terbentuk dari tiga candle berurutan. Harga cenderung kembali mengisi celah ini sebelum melanjutkan tren.',
  },
  {
    term: 'Break of Structure (BOS)',
    detail: 'Penembusan swing high/low terakhir yang mengonfirmasi tren berlanjut pada timeframe yang diamati.',
  },
  {
    term: 'Change of Character (CHoCH)',
    detail: 'Sinyal awal pembalikan arah, terjadi saat struktur pasar gagal mempertahankan urutan swing-nya.',
  },
  {
    term: 'Killzone',
    detail: 'Jendela waktu sesi (Asia, London, New York) dengan likuiditas tertinggi sehingga peluang sweep lebih besar.',
  },
  {
    term: 'ATR (Average True Range)',
    detail: 'Ukuran volatilitas rata-rata. Dipakai untuk menyesuaikan jarak stop loss terhadap kondisi pasar saat ini.',
  },
];

const MarketsView = ({ selectedPair, onSelect }: { selectedPair: Pair; onSelect: (pair: Pair) => void }) => {
  const rows = useMemo(
    () =>
      PAIRS.map((pair) => {
        const series = generateMockData(pair.base, 50, pair.precision);
        const first = series[0].close;
        const last = series[series.length - 1].close;
        const volume = series.reduce((sum, candle) => sum + candle.volume, 0);
        return { pair, last, change: ((last - first) / first) * 100, volume };
      }),
    []
  );

  return (
    <div className="lg:col-span-12 space-y-6">
      <section className="glass-panel p-6 space-y-2">
        <h3 className="text-2xl font-bold text-white">Markets</h3>
        <p className="text-sm text-gray-400">
          Ringkasan seluruh instrumen yang tersedia. Pilih salah satu untuk membuka analisisnya di Dashboard.
        </p>
      </section>

      <section className="glass-panel p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map(({ pair, last, change, volume }) => {
            const isUp = change >= 0;
            const isActive = selectedPair.id === pair.id;

            return (
              <button
                key={pair.id}
                onClick={() => onSelect(pair)}
                className={cn(
                  "text-left p-5 rounded-xl border transition-all space-y-4",
                  isActive
                    ? "bg-indigo-600/20 border-indigo-500/50"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-white">{pair.id}</div>
                    <div className="text-xs text-gray-400">{pair.name}</div>
                  </div>
                  <span className={cn("text-xs font-bold flex items-center gap-1", isUp ? "text-green-400" : "text-red-400")}>
                    {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {isUp ? '+' : ''}{change.toFixed(2)}%
                  </span>
                </div>

                <MT5Price price={last} precision={pair.precision} pipIndex={pair.pipIndex} className="text-2xl text-white" />

                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-gray-500">
                  <span>Volume {volume.toLocaleString('en-US')}</span>
                  <span>{isActive ? 'Sedang Dipilih' : 'Buka Analisis'}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};

const EducationView = () => (
  <div className="lg:col-span-12 space-y-6">
    <section className="glass-panel p-6 space-y-2">
      <h3 className="text-2xl font-bold text-white">Education</h3>
      <p className="text-sm text-gray-400">
        Dasar-dasar ICT &amp; Smart Money Concepts yang dipakai mesin analisis AuraTrade.
      </p>
    </section>

    <section className="glass-panel p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EDUCATION_TOPICS.map((topic) => (
          <article key={topic.term} className="p-5 bg-white/5 rounded-xl border border-white/10 space-y-2">
            <h4 className="text-sm font-bold text-indigo-300">{topic.term}</h4>
            <p className="text-xs text-gray-400 leading-relaxed">{topic.detail}</p>
          </article>
        ))}
      </div>
    </section>
  </div>
);

// --- Components ---
const StopLossCalculator = ({ atr, currentPrice, precision }: { atr: number; currentPrice: number; precision: number }) => {
  const [multiplier, setMultiplier] = useState(1.5);
  const slDistance = atr * multiplier;
  
  return (
    <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">SL Calculator (ATR)</h4>
        <Target size={14} className="text-indigo-400" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">ATR Multiplier</span>
          <span className="font-mono text-indigo-400">{multiplier}x</span>
        </div>
        <input 
          type="range" 
          min="1" 
          max="3" 
          step="0.1" 
          value={multiplier} 
          onChange={(e) => setMultiplier(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
          <div className="text-[10px] text-red-300 uppercase">Buy SL</div>
          <div className="text-sm font-mono font-bold">{(currentPrice - slDistance).toFixed(precision)}</div>
        </div>
        <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20">
          <div className="text-[10px] text-green-300 uppercase">Sell SL</div>
          <div className="text-sm font-mono font-bold">{(currentPrice + slDistance).toFixed(precision)}</div>
        </div>
      </div>
    </div>
  );
};

const MT5Price = ({ price, precision, pipIndex, className }: { price: number; precision: number; pipIndex: number; className?: string }) => {
  if (price === undefined || price === null || isNaN(price)) {
    return <span className={className}>---</span>;
  }
  const priceStr = price.toFixed(precision);
  const parts = priceStr.split('.');
  const whole = parts[0];
  const decimal = parts[1] || '';
  
  // MT5 style: 1.08 [45] 0
  // For Gold: 2385. [50]
  const beforePips = decimal.substring(0, pipIndex);
  const pips = decimal.substring(pipIndex, pipIndex + 2);
  const pipette = decimal.substring(pipIndex + 2);

  return (
    <div className={cn("font-mono flex items-baseline leading-none", className)}>
      <span className="opacity-60 text-[0.8em]">{whole}.{beforePips}</span>
      <span className="text-[1.2em] font-bold mx-[1px]">{pips}</span>
      <span className="opacity-60 text-[0.7em] self-start mt-[0.1em]">{pipette}</span>
    </div>
  );
};

const CandlestickChart = ({ data, precision }: { data: MarketData[]; precision: number }) => {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white/5 rounded-xl border border-white/10">
        <p className="text-gray-500 text-sm">Waiting for market data...</p>
      </div>
    );
  }

  // Format data for recharts
  const chartData = data.map((d, idx) => ({
    ...d,
    // Body: from min(open, close) to max(open, close)
    // Wick: from low to high
    body: [Math.min(d.open, d.close), Math.max(d.open, d.close)],
    wick: [d.low, d.high],
    isUp: d.close >= d.open,
    // Use index + time as a unique key for the axis if needed, 
    // but tickFormatter is better for display
    timestamp: d.time
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-[#1a1a1e] border border-white/10 p-3 rounded-lg shadow-xl text-xs font-mono z-50">
          <p className="text-gray-400 mb-1">{new Date(d.time * 1000).toLocaleString()}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-gray-500">Open:</span> <span className="text-white text-right">{d.open.toFixed(precision)}</span>
            <span className="text-gray-500">High:</span> <span className="text-white text-right">{d.high.toFixed(precision)}</span>
            <span className="text-gray-500">Low:</span> <span className="text-white text-right">{d.low.toFixed(precision)}</span>
            <span className="text-gray-500">Close:</span> <span className="text-white text-right">{d.close.toFixed(precision)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full min-h-[300px] min-w-[300px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart 
          data={chartData} 
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          barGap="-100%" // Overlay bars for candle effect
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="timestamp" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6b7280', fontSize: 10 }}
            minTickGap={40}
            tickFormatter={(unixTime) => new Date(unixTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          />
          <YAxis 
            domain={['auto', 'auto']} 
            orientation="right"
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6b7280', fontSize: 10 }}
            mirror
            tickFormatter={(val) => val.toFixed(precision)}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
          
          {/* Wick */}
          <Bar dataKey="wick" barSize={1} isAnimationActive={false}>
            {chartData.map((entry, index) => (
              <Cell key={`wick-${index}`} fill={entry.isUp ? '#22c55e' : '#ef4444'} />
            ))}
          </Bar>
          
          {/* Body */}
          <Bar dataKey="body" barSize={8} isAnimationActive={false}>
            {chartData.map((entry, index) => (
              <Cell key={`body-${index}`} fill={entry.isUp ? '#22c55e' : '#ef4444'} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default function App() {
  const [selectedPair, setSelectedPair] = useState(PAIRS[0]);
  const [tradingStyle, setTradingStyle] = useState<TradingStyle>('Intraday');
  const [timeframe, setTimeframe] = useState<Timeframe>('1H');
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [view, setView] = useState<AppView>('dashboard');

  useEffect(() => {
    setMarketData(generateMockData(selectedPair.base, 50, selectedPair.precision));
  }, [selectedPair]);

  // WebSocket Connection for OANDA prices
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('Connected to price stream');
      setWsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.instrument === selectedPair.id) {
          setMarketData(prev => {
            const last = prev[prev.length - 1];
            const price = data.price;
            
            // If it's a new minute, create a new candle
            // Otherwise update the last candle
            const now = Math.floor(new Date(data.time).getTime() / 1000);
            const lastTime = last?.time as number;
            
            if (last && now - lastTime < 60) {
              const updatedLast = {
                ...last,
                high: Math.max(last.high, price),
                low: Math.min(last.low, price),
                close: price,
              };
              return [...prev.slice(0, -1), updatedLast];
            } else {
              const nextTick = {
                time: now as any,
                open: price,
                high: price,
                low: price,
                close: price,
                volume: Math.floor(Math.random() * 1000) + 500
              };
              return [...prev.slice(-49), nextTick];
            }
          });
        }
      } catch (e) {
        console.error('Error parsing WS data', e);
      }
    };

    socket.onclose = () => {
      console.log('Disconnected from price stream');
      setWsConnected(false);
    };

    return () => socket.close();
  }, [selectedPair]);

  // Real-time updates simulation (Fallback when WS is not connected)
  useEffect(() => {
    if (wsConnected) return; // Skip simulation if live stream is active

    const interval = setInterval(() => {
      setMarketData(prev => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const nextTick = generateNextTick(last, selectedPair.base, selectedPair.precision);
        
        // If same minute, update last candle
        if (nextTick.time - (last.time as number) < 60) {
           const updatedLast = {
             ...last,
             high: Math.max(last.high, nextTick.high),
             low: Math.min(last.low, nextTick.low),
             close: nextTick.close,
           };
           return [...prev.slice(0, -1), updatedLast];
        }
        
        return [...prev.slice(-49), nextTick];
      });
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, [selectedPair.base, selectedPair.precision, wsConnected]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const currentATR = calculateATR(marketData);
      const lastPrice = marketData[marketData.length - 1]?.close || selectedPair.base;
      const currentTime = new Date().toISOString();

      const prompt = `
        You are an expert financial analyst specializing in ICT (Inner Circle Trader) and SMC (Smart Money Concepts).
        Analyze the following market data for ${selectedPair.id} on the ${timeframe} timeframe for a ${tradingStyle} trading style.
        
        Current Market Context:
        - Last Price: ${lastPrice}
        - Calculated Volatility (ATR 14): ${currentATR.toFixed(5)}
        - Current Time (UTC): ${currentTime}
        - Market Data Summary (Last 20 points): ${JSON.stringify(marketData.slice(-20))}

        CRITICAL ANALYSIS REQUIREMENTS:
        1. ICT Time Trading: Analyze the current session (Asia, London, or US) and identify potential "Killzones" or session liquidity sweeps.
        2. Smart Money Concepts (SMC): Identify Order Blocks (OB), Fair Value Gaps (FVG), Break of Structure (BOS), and Change of Character (CHoCH).
        3. Fibonacci Retracement: Calculate key retracement levels (0.382, 0.5, 0.618, 0.786) based on recent price swings.
        4. Candle Confirmation: Identify specific candle patterns (Engulfing, Pin Bar, Doji) at key levels.
        5. Support & Resistance Areas: Define specific price zones where liquidity is resting.
        6. Volatility-Adjusted Stop Loss: Use ATR to set a dynamic SL (e.g., 1.5x or 2x ATR from entry).

        Provide a detailed analysis including:
        - Current Trend (Bullish/Bearish/Neutral)
        - Trade Recommendation (Buy/Sell/Wait)
        - Entry, Stop Loss (Volatility-adjusted), and Take Profit levels (min 1:2 RR)
        - ICT Session Analysis
        - SMC Analysis (OB, FVG, BOS)
        - Candle Confirmation Patterns
        - Fibonacci Levels
        - Support & Resistance Areas with strength rating.

        Format the response as a structured JSON object.
      `;

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "Failed to call analysis API");
      }

      const resultData = await response.json();
      setAnalysis(resultData);
    } catch (error) {
      console.error('Analysis failed', error);
      setAnalysisError(error instanceof Error ? error.message : "An unexpected error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col trading-grid">
      {/* Header */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#0a0a0c]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Zap className="text-white w-6 h-6 fill-current" />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            AuraTrade AI
          </h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 text-sm font-medium text-gray-400">
            {([
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'markets', label: 'Markets' },
              { id: 'education', label: 'Education' },
            ] as { id: AppView; label: string }[]).map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={cn(
                  "transition-colors",
                  view === item.id ? "text-white" : "hover:text-white"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400">
              <Bell size={20} />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border border-white/20" />
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        {view === 'markets' ? (
          <MarketsView
            selectedPair={selectedPair}
            onSelect={(pair) => {
              setSelectedPair(pair);
              setView('dashboard');
            }}
          />
        ) : view === 'education' ? (
          <EducationView />
        ) : (
          <>
                
        {/* Left Sidebar: Controls */}
        <aside className="lg:col-span-3 space-y-6">
          <section className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Market Selection</h2>
              <Activity size={16} className="text-indigo-400" />
            </div>
            <div className="space-y-2">
              {PAIRS.map((pair) => (
                <button
                  key={pair.id}
                  onClick={() => setSelectedPair(pair)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-lg transition-all border",
                    selectedPair.id === pair.id 
                      ? "bg-indigo-600/20 border-indigo-500/50 text-white" 
                      : "bg-white/5 border-transparent text-gray-400 hover:bg-white/10"
                  )}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{pair.name}</span>
                    <span className="text-[10px] font-mono opacity-40">{pair.id}</span>
                  </div>
                  <MT5Price 
                    price={selectedPair.id === pair.id ? (marketData[marketData.length - 1]?.close || pair.base) : pair.base} 
                    precision={pair.precision} 
                    pipIndex={pair.pipIndex} 
                    className={selectedPair.id === pair.id ? "text-green-400" : "text-gray-400"}
                  />
                </button>
              ))}
            </div>
          </section>

          <section className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Strategy Engine</h2>
              <Settings size={16} className="text-indigo-400" />
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Trading Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Scalping', 'Intraday', 'Swing'] as TradingStyle[]).map((style) => (
                    <button
                      key={style}
                      onClick={() => setTradingStyle(style)}
                      className={cn(
                        "py-2 text-xs rounded-md border transition-all",
                        tradingStyle === style 
                          ? "bg-indigo-600 border-indigo-500 text-white" 
                          : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                      )}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-2 block">Timeframe</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['1M', '5M', '15M', '1H', '4H', '1D'] as Timeframe[]).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={cn(
                        "py-2 text-xs rounded-md border transition-all",
                        timeframe === tf 
                          ? "bg-indigo-600 border-indigo-500 text-white" 
                          : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                      )}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 group"
              >
                {isAnalyzing ? (
                  <RefreshCw className="animate-spin" size={20} />
                ) : (
                  <Zap className="group-hover:scale-110 transition-transform" size={20} />
                )}
                {isAnalyzing ? 'Analyzing Market...' : 'Run AI Analysis'}
              </button>

              <div className="pt-4 border-t border-white/10 space-y-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Risk Management</h4>
                <StopLossCalculator 
                  atr={calculateATR(marketData)} 
                  currentPrice={marketData[marketData.length - 1]?.close || selectedPair.base}
                  precision={selectedPair.precision}
                />
              </div>
            </div>
          </section>
        </aside>

        {/* Center: Chart & Analysis */}
        <div className="lg:col-span-6 space-y-6">
          {/* Chart Section */}
          <section className="glass-panel p-6 h-[450px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white">{selectedPair.id}</h3>
                <p className="text-sm text-gray-400">{selectedPair.name} • {timeframe} Chart</p>
              </div>
              <div className="text-right">
                <MT5Price 
                  price={marketData[marketData.length - 1]?.close || selectedPair.base} 
                  precision={selectedPair.precision} 
                  pipIndex={selectedPair.pipIndex}
                  className="text-3xl text-green-400"
                />
                <div className="text-xs text-green-400/60 flex items-center justify-end gap-1 mt-1">
                  <ArrowUpRight size={12} /> +0.24% Today
                </div>
              </div>
            </div>
            
            <div className="flex-1 min-h-0">
              <CandlestickChart data={marketData} precision={selectedPair.precision} />
            </div>
          </section>

          {/* AI Analysis Output */}
          <AnimatePresence mode="wait">
            {analysis ? (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-panel p-6 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                      <BarChart3 className="text-indigo-400" size={20} />
                    </div>
                    <h3 className="text-lg font-bold">AI Market Analysis</h3>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                    analysis.recommendation === 'Buy' ? "bg-green-500/20 text-green-400" :
                    analysis.recommendation === 'Sell' ? "bg-red-500/20 text-red-400" :
                    "bg-gray-500/20 text-gray-400"
                  )}>
                    Signal: {analysis.recommendation}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="text-xs text-gray-500 mb-1">Trend Direction</div>
                    <div className="flex items-center gap-2">
                      {analysis.trend === 'Bullish' ? <TrendingUp className="text-green-400" /> : <TrendingDown className="text-red-400" />}
                      <span className="font-bold">{analysis.trend}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="text-xs text-gray-500 mb-1">Risk Level</div>
                    <div className="flex items-center gap-2">
                      <Shield className={cn(
                        analysis.riskLevel === 'Low' ? "text-green-400" :
                        analysis.riskLevel === 'Medium' ? "text-yellow-400" : "text-red-400"
                      )} />
                      <span className="font-bold">{analysis.riskLevel}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="text-xs text-gray-500 mb-1">Volatility (ATR)</div>
                    <div className="flex items-center gap-2">
                      <Activity className="text-indigo-400" />
                      <span className="font-bold font-mono">{analysis.atr.toFixed(5)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Strategic Levels</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                      <div className="text-xs text-indigo-300 mb-1">Entry Price</div>
                      <div className="text-xl font-mono font-bold">{analysis.entry}</div>
                    </div>
                    <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                      <div className="text-xs text-red-300 mb-1">Stop Loss</div>
                      <div className="text-xl font-mono font-bold">{analysis.stopLoss}</div>
                    </div>
                    <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                      <div className="text-xs text-green-300 mb-1">Take Profit</div>
                      <div className="text-xl font-mono font-bold">{analysis.takeProfit}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <Clock size={16} className="text-indigo-400" />
                      ICT Session Analysis
                    </h4>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-sm text-gray-300 leading-relaxed">
                      {analysis.ictSessionAnalysis}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <Zap size={16} className="text-yellow-400" />
                      Smart Money Concepts (SMC)
                    </h4>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-sm text-gray-300 leading-relaxed">
                      {analysis.smcAnalysis}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <PieChart size={16} className="text-blue-400" />
                      Fibonacci Retracement
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {analysis.fibonacciLevels.map((fib, idx) => (
                        <div key={idx} className="p-3 bg-white/5 rounded-lg border border-white/5 flex justify-between items-center">
                          <span className="text-xs text-gray-500">{fib.level}</span>
                          <span className="text-sm font-mono font-bold text-gray-300">{fib.price.toFixed(selectedPair.precision)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <Shield size={16} className="text-purple-400" />
                      S/R Liquidity Zones
                    </h4>
                    <div className="space-y-2">
                      {analysis.srAreas.map((area, idx) => (
                        <div key={idx} className="p-3 bg-white/5 rounded-lg border border-white/5 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              area.type === 'Support' ? "bg-green-500" : "bg-red-500"
                            )} />
                            <span className="text-xs font-medium">{area.type}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-mono font-bold">{area.price.toFixed(selectedPair.precision)}</span>
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded uppercase font-bold",
                              area.strength === 'Strong' ? "bg-green-500/20 text-green-400" :
                              area.strength === 'Moderate' ? "bg-yellow-500/20 text-yellow-400" : "bg-gray-500/20 text-gray-400"
                            )}>{area.strength}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-white/5 rounded-xl border border-white/5">
                  <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                    <Info size={16} className="text-indigo-400" />
                    Candle Confirmation & Rationale
                  </h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-indigo-500/5 rounded-lg border border-indigo-500/10 text-xs italic text-indigo-300">
                      Pattern Detected: {analysis.candlePatterns}
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {analysis.rationale}
                    </p>
                  </div>
                </div>
              </motion.section>
            ) : analysisError ? (
              <div className="glass-panel p-12 flex flex-col items-center justify-center text-center space-y-4 border-red-500/20 bg-red-500/5">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="text-red-400" size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-300">Analysis Failed</h3>
                  <p className="text-sm text-red-400/60 max-w-xs mx-auto">
                    {analysisError}
                  </p>
                  <button 
                    onClick={handleAnalyze}
                    className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : (
              <div className="glass-panel p-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                  <BarChart3 className="text-gray-600" size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-300">No Analysis Performed</h3>
                  <p className="text-sm text-gray-500 max-w-xs">
                    Select a pair and strategy, then click "Run AI Analysis" to get real-time market insights.
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Sidebar: Risk & News */}
        <aside className="lg:col-span-3 space-y-6">
          <section className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Risk Management</h2>
              <Shield size={16} className="text-indigo-400" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Max Drawdown</span>
                <span className="text-red-400 font-bold">2.5%</span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div className="bg-red-500 h-full w-[25%]" />
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 flex gap-3">
                <AlertTriangle className="text-yellow-500 shrink-0" size={18} />
                <p className="text-[10px] text-yellow-200/80 leading-tight">
                  XAUUSD volatility is currently high. Consider reducing position size by 50%.
                </p>
              </div>
            </div>
          </section>

          <section className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Economic Calendar</h2>
              <Clock size={16} className="text-indigo-400" />
            </div>
            <div className="space-y-3">
              {[
                { time: '14:30', event: 'US CPI (MoM)', impact: 'High' },
                { time: '16:00', event: 'FOMC Member Speech', impact: 'Medium' },
                { time: '18:30', event: 'Crude Oil Inventories', impact: 'Low' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <div className="flex flex-col">
                    <span className="text-xs font-mono text-indigo-400">{item.time}</span>
                    <span className="text-xs text-gray-300">{item.event}</span>
                  </div>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    item.impact === 'High' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                    item.impact === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                  )} />
                </div>
              ))}
            </div>
          </section>

          <section className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Market Sentiment</h2>
              <PieChart size={16} className="text-indigo-400" />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-green-400">65% Long</span>
                <span className="text-red-400">35% Short</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden">
                <div className="bg-green-500 w-[65%]" />
                <div className="bg-red-500 w-[35%]" />
              </div>
              <p className="text-[10px] text-gray-500 text-center italic">
                Retail sentiment is currently leaning Bullish on {selectedPair.id}.
              </p>
            </div>
          </section>
        </aside>
          </>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="h-10 border-t border-white/10 bg-[#0a0a0c] flex items-center justify-between px-6 text-[10px] text-gray-500 uppercase tracking-widest">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", wsConnected ? "bg-green-500" : "bg-yellow-500")} />
            {wsConnected ? "OANDA Live Stream Active" : "Simulated Feed (Check .env)"}
          </div>
          <div className="flex items-center gap-1.5">
            <Activity size={12} />
            Latency: {wsConnected ? "Real-time" : "3000ms"}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span>Server Time: {new Date().toUTCString()}</span>
          <span className="text-indigo-400 font-bold">AuraTrade v1.0.4</span>
        </div>
      </footer>
    </div>
  );
}
