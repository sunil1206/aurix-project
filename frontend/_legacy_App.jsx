/**
 * Aurix - React SPA reference implementation
 * ------------------------------------------------------------
 * This is the reference UI that consumes the Django backend.
 * It demonstrates how the four main resources (auth, wallet,
 * trades, insights) are wired together end-to-end.
 *
 * Stack:
 *   - React 18 + Hooks (useState, useEffect)
 *   - TailwindCSS for styling
 *   - lucide-react for icons
 *
 * The `api` object below is a mock shim so the component can be
 * dropped into a CRA / Vite app and previewed without a backend.
 * To wire it to the real Django service, replace `api` with
 * fetch/axios calls against `http://localhost:8000/api/...` and
 * forward the JWT access token on every request:
 *
 *     headers: { Authorization: `Bearer ${token}` }
 *
 * Endpoint mapping:
 *   POST /api/auth/register/        -> register form
 *   POST /api/auth/login/           -> login form
 *   GET  /api/wallet/               -> Dashboard balances
 *   POST /api/transactions/buy/     -> Trade Engine (BUY)
 *   POST /api/transactions/sell/    -> Trade Engine (SELL)
 *   GET  /api/transactions/         -> Ledger view
 *   GET  /api/insights/             -> AI Insights view
 *   GET  /api/price/                -> XAU/EUR ticker in header
 * ------------------------------------------------------------
 */
import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowRightLeft,
  ScrollText,
  Lightbulb,
  TrendingUp,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Mail,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

// --- MOCK API SERVICE ---
// Simulates the Django REST backend. Swap with real fetch() calls
// against the endpoints listed in the file header above.
const api = {
  price: 65.42, // Simulated cached price from services/price_service.py
  getLivePrice: () => new Promise(res => setTimeout(() => res(api.price + (Math.random() * 0.5 - 0.25)), 500)),
  getInsights: (txs) => {
    return new Promise(res => setTimeout(() => {
      if (txs.length === 0) return res({ summary: "No trading activity detected. Start by buying some gold.", type: "neutral" });
      const buys = txs.filter(t => t.type === 'BUY');
      if (buys.length === txs.length) return res({ summary: "Strong accumulation phase. You are dollar-cost averaging into gold.", type: "positive" });
      return res({ summary: "Active trading detected. Ensure you are tracking your capital gains for tax purposes.", type: "warning" });
    }, 800));
  }
};

export default function App() {
  // --- APP STATE ---
  const [token, setToken] = useState(null); // Simulates JWT
  const [currentView, setCurrentView] = useState('dashboard');

  // Wallet State (Derived from simulated backend)
  const [wallet, setWallet] = useState({ eur_balance: 1000.00, gold_balance: 0.0000 });
  const [transactions, setTransactions] = useState([]); // Ledger
  const [currentPrice, setCurrentPrice] = useState(api.price);
  const [isRefreshingPrice, setIsRefreshingPrice] = useState(false);
  const [insight, setInsight] = useState(null);
  // Form States
  const [authForm, setAuthForm] = useState({ email: '', password: '', isLogin: true });
  const [tradeForm, setTradeForm] = useState({ type: 'BUY', amount: '' });
  const [notification, setNotification] = useState({ type: '', message: '' });

  // --- EFFECTS ---
  // Simulate Redis 60s cache refresh logic for the frontend
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(async () => {
      handleRefreshPrice();
    }, 60000);
    return () => clearInterval(interval);
  }, [token]);

  // Fetch insights when view changes to insights
  useEffect(() => {
    if (currentView === 'insights' && token) {
      api.getInsights(transactions).then(setInsight);
    }
  }, [currentView, transactions, token]);

  // --- HANDLERS ---
  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  const handleRefreshPrice = async () => {
    setIsRefreshingPrice(true);
    const newPrice = await api.getLivePrice();
    setCurrentPrice(newPrice);
    setIsRefreshingPrice(false);
  };

  const handleAuth = (e) => {
    e.preventDefault();
    if (!authForm.email || !authForm.password) {
      showNotification('error', 'Please fill all fields');
      return;
    }
    // Simulate JWT retrieval
    setToken('mock_jwt_token_header.payload.signature');
    showNotification('success', `Successfully ${authForm.isLogin ? 'logged in' : 'registered'}.`);
  };

  // Simulates services.py (buy_gold and sell_gold)
  const handleTrade = (e) => {
    e.preventDefault();
    const amount = parseFloat(tradeForm.amount);
    if (isNaN(amount) || amount <= 0) {
      showNotification('error', 'Enter a valid positive amount.');
      return;
    }
    const price = currentPrice;
    let eurChange = 0;
    let goldChange = 0;
    if (tradeForm.type === 'BUY') {
      // Amount is in EUR
      if (amount > wallet.eur_balance) {
        showNotification('error', 'Insufficient EUR balance.');
        return;
      }
      eurChange = -amount;
      goldChange = amount / price;
    } else {
      // Amount is in Gold
      if (amount > wallet.gold_balance) {
        showNotification('error', 'Insufficient Gold balance.');
        return;
      }
      goldChange = -amount;
      eurChange = amount * price;
    }
    // Atomic transaction simulation
    const newTx = {
      id: `tx_${Date.now()}`,
      type: tradeForm.type,
      eur_amount: Math.abs(eurChange),
      gold_amount: Math.abs(goldChange),
      price_per_gram: price,
      timestamp: new Date().toISOString(),
    };
    setTransactions([newTx, ...transactions]);
    setWallet({
      eur_balance: wallet.eur_balance + eurChange,
      gold_balance: wallet.gold_balance + goldChange
    });
    setTradeForm({ ...tradeForm, amount: '' });
    showNotification('success', `Successfully executed ${tradeForm.type} order.`);
  };

  // --- RENDERERS ---
  if (!token) {
    return (
      <div className="min-h-screen bg-[#0A0E17] flex items-center justify-center p-4 font-sans">
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-amber-500/10 p-4 rounded-full mb-4 ring-1 ring-amber-500/20">
              <TrendingUp className="w-10 h-10 text-amber-500" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Aurix</h1>
            <p className="text-slate-400 mt-2 text-sm text-center">Digital Gold Wallet & Ledger</p>
          </div>
          {notification.message && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 mr-2" /> {notification.message}
            </div>
          )}
          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={authForm.email}
                  onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                  className="w-full bg-[#0A0E17] border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                  placeholder="investor@aurix.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={authForm.password}
                  onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                  className="w-full bg-[#0A0E17] border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 mt-2"
            >
              {authForm.isLogin ? 'Authenticate (JWT)' : 'Create Wallet'}
            </button>
          </form>
          <p className="text-center text-slate-500 text-sm mt-6">
            {authForm.isLogin ? "Don't have a wallet? " : "Already registered? "}
            <button
              onClick={() => setAuthForm({ ...authForm, isLogin: !authForm.isLogin })}
              className="text-amber-500 hover:text-amber-400 font-medium"
            >
              {authForm.isLogin ? 'Register' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  const NavButton = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setCurrentView(id)}
      className={`w-full flex items-center px-4 py-3 rounded-xl mb-2 transition-all ${
        currentView === id
          ? 'bg-amber-500/10 text-amber-500 font-medium'
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
      }`}
    >
      <Icon className="w-5 h-5 mr-3" />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-200 font-sans flex">
      {/* Sidebar (Desktop) */}
      <aside className="w-64 bg-[#111827] border-r border-slate-800 hidden md:flex flex-col">
        <div className="p-6 flex items-center border-b border-slate-800">
          <TrendingUp className="w-6 h-6 text-amber-500 mr-2" />
          <span className="text-xl font-bold text-white tracking-wide">Aurix</span>
        </div>
        <nav className="p-4 flex-1">
          <NavButton id="dashboard" icon={Wallet} label="Dashboard" />
          <NavButton id="trade" icon={ArrowRightLeft} label="Trade Engine" />
          <NavButton id="ledger" icon={ScrollText} label="Immutable Ledger" />
          <NavButton id="insights" icon={Lightbulb} label="AI Insights" />
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => setToken(null)}
            className="w-full flex items-center px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-[#111827]/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8 sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-white capitalize">{currentView.replace('-', ' ')}</h2>

          <div className="flex items-center space-x-6">
            <div className="flex items-center bg-slate-800/50 rounded-full px-4 py-1.5 border border-slate-700">
              <span className="text-slate-400 text-sm mr-2">XAU/EUR</span>
              <span className="text-amber-400 font-mono font-medium">€{currentPrice.toFixed(2)}</span>
              <button onClick={handleRefreshPrice} className={`ml-3 text-slate-400 hover:text-white ${isRefreshingPrice ? 'animate-spin text-amber-500' : ''}`}>
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>
        {/* Global Notifications */}
        {notification.message && (
          <div className="absolute top-24 right-8 z-50">
            <div className={`px-6 py-4 rounded-xl shadow-lg border flex items-center animate-in slide-in-from-top-2 ${
              notification.type === 'error' ? 'bg-red-900/50 border-red-500/50 text-red-200' : 'bg-emerald-900/50 border-emerald-500/50 text-emerald-200'
            }`}>
              {notification.type === 'error' ? <AlertTriangle className="w-5 h-5 mr-3" /> : <CheckCircle2 className="w-5 h-5 mr-3" />}
              {notification.message}
            </div>
          </div>
        )}
        {/* Dynamic Views */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto">

            {/* --- DASHBOARD VIEW --- */}
            {currentView === 'dashboard' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Fiat Wallet */}
                  <div className="bg-[#111827] rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full"></div>
                    <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Fiat Balance</h3>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-4xl font-bold text-white">€{wallet.eur_balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  {/* Gold Wallet */}
                  <div className="bg-gradient-to-br from-[#1A1814] to-[#111827] rounded-2xl p-6 border border-amber-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-bl-full"></div>
                    <h3 className="text-amber-500/80 text-sm font-medium uppercase tracking-wider mb-2">Gold Balance</h3>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-4xl font-bold text-amber-400">{wallet.gold_balance.toFixed(4)}</span>
                      <span className="text-xl text-amber-600 font-medium">grams</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      ≈ €{(wallet.gold_balance * currentPrice).toFixed(2)} Value
                    </p>
                  </div>
                </div>
                <div className="bg-[#111827] rounded-2xl p-6 border border-slate-800">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">Recent Ledger Entries</h3>
                    <button onClick={() => setCurrentView('ledger')} className="text-amber-500 text-sm hover:underline">View All</button>
                  </div>
                  {transactions.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No transactions found. System is ready.</p>
                  ) : (
                    <div className="space-y-3">
                      {transactions.slice(0, 3).map(tx => (
                        <div key={tx.id} className="flex items-center justify-between p-4 bg-[#0A0E17] rounded-xl border border-slate-800/50">
                          <div className="flex items-center">
                            <div className={`p-2 rounded-lg mr-4 ${tx.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                              {tx.type === 'BUY' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="font-semibold text-white">{tx.type} Gold</p>
                              <p className="text-xs text-slate-500">{new Date(tx.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-amber-400 font-medium">{tx.type === 'BUY' ? '+' : '-'}{tx.gold_amount.toFixed(4)} g</p>
                            <p className="text-xs text-slate-400 font-mono">{tx.type === 'BUY' ? '-' : '+'}€{tx.eur_amount.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* --- TRADE ENGINE VIEW --- */}
            {currentView === 'trade' && (
              <div className="max-w-md mx-auto animate-in fade-in duration-300">
                <div className="bg-[#111827] rounded-2xl p-6 border border-slate-800 shadow-xl">
                  <div className="flex bg-[#0A0E17] p-1 rounded-xl mb-8 border border-slate-800">
                    <button
                      onClick={() => setTradeForm({ type: 'BUY', amount: '' })}
                      className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                        tradeForm.type === 'BUY' ? 'bg-emerald-500 text-emerald-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Buy Gold
                    </button>
                    <button
                      onClick={() => setTradeForm({ type: 'SELL', amount: '' })}
                      className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                        tradeForm.type === 'SELL' ? 'bg-rose-500 text-rose-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Sell Gold
                    </button>
                  </div>
                  <form onSubmit={handleTrade} className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-slate-400 text-sm font-medium">Amount to {tradeForm.type === 'BUY' ? 'Spend' : 'Sell'}</label>
                        <span className="text-xs text-slate-500 font-mono">
                          Avail: {tradeForm.type === 'BUY' ? `€${wallet.eur_balance.toFixed(2)}` : `${wallet.gold_balance.toFixed(4)}g`}
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.0001"
                          value={tradeForm.amount}
                          onChange={e => setTradeForm({ ...tradeForm, amount: e.target.value })}
                          className="w-full bg-[#0A0E17] border border-slate-700 rounded-xl py-4 pl-4 pr-16 text-2xl font-mono text-white focus:outline-none focus:border-amber-500 transition-all"
                          placeholder="0.00"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold bg-[#111827] px-2 py-1 rounded-md text-sm border border-slate-800">
                          {tradeForm.type === 'BUY' ? 'EUR' : 'GRAMS'}
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#0A0E17] rounded-xl p-4 border border-slate-800/50 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Execution Price (Redis Cache)</span>
                        <span className="text-slate-200 font-mono">€{currentPrice.toFixed(2)} /g</span>
                      </div>
                      <div className="h-px bg-slate-800 w-full"></div>
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-300">Estimated Receive</span>
                        <span className="text-amber-500 font-mono text-lg">
                          {tradeForm.amount ? (
                            tradeForm.type === 'BUY'
                              ? `~ ${(parseFloat(tradeForm.amount) / currentPrice).toFixed(4)} g`
                              : `~ €${(parseFloat(tradeForm.amount) * currentPrice).toFixed(2)}`
                          ) : '0.00'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className={`w-full font-bold py-4 rounded-xl transition-all shadow-lg text-lg ${
                        tradeForm.type === 'BUY'
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950 shadow-emerald-500/20'
                          : 'bg-rose-500 hover:bg-rose-400 text-rose-950 shadow-rose-500/20'
                      }`}
                    >
                      Execute {tradeForm.type} Order
                    </button>
                    <p className="text-center text-xs text-slate-500 mt-4 flex items-center justify-center">
                      <Lock className="w-3 h-3 mr-1" /> Uses PostgreSQL SELECT FOR UPDATE
                    </p>
                  </form>
                </div>
              </div>
            )}
            {/* --- LEDGER VIEW --- */}
            {currentView === 'ledger' && (
              <div className="animate-in fade-in duration-300">
                <div className="bg-[#111827] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                  <div className="p-6 border-b border-slate-800 bg-slate-800/20">
                    <h3 className="text-lg font-semibold text-white">Immutable Ledger</h3>
                    <p className="text-sm text-slate-400">All balance changes are derived from these atomic transactions.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#0A0E17] text-slate-400 font-semibold text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-4">Transaction ID / Time</th>
                          <th className="px-6 py-4">Type</th>
                          <th className="px-6 py-4 text-right">Gold Delta</th>
                          <th className="px-6 py-4 text-right">EUR Delta</th>
                          <th className="px-6 py-4 text-right">Execution Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {transactions.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-6 py-12 text-center text-slate-500">No ledger entries.</td>
                          </tr>
                        ) : transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-mono text-xs text-slate-500">{tx.id}</div>
                              <div className="text-slate-300">{new Date(tx.timestamp).toLocaleString()}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold ${
                                tx.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-amber-400">
                              {tx.type === 'BUY' ? '+' : '-'}{tx.gold_amount.toFixed(4)} g
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-slate-300">
                              {tx.type === 'BUY' ? '-' : '+'}€{tx.eur_amount.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-slate-500">
                              €{tx.price_per_gram.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            {/* --- AI INSIGHTS VIEW --- */}
            {currentView === 'insights' && (
              <div className="max-w-2xl mx-auto animate-in fade-in duration-300 space-y-6">
                <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-[#111827] rounded-2xl p-8 border border-indigo-500/30 shadow-xl relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 opacity-20">
                    <Sparkles className="w-48 h-48 text-indigo-400" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="bg-indigo-500/20 p-2 rounded-lg border border-indigo-500/30">
                        <Lightbulb className="w-6 h-6 text-indigo-400" />
                      </div>
                      <h2 className="text-2xl font-bold text-white">AI Engine Analysis</h2>
                    </div>
                    {!insight ? (
                      <div className="animate-pulse flex space-x-4">
                        <div className="flex-1 space-y-4 py-1">
                          <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                          <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#0A0E17]/80 backdrop-blur-md rounded-xl p-6 border border-slate-700/50">
                        <p className="text-lg text-indigo-100 leading-relaxed font-medium">"{insight.summary}"</p>

                        <div className="mt-6 pt-6 border-t border-slate-700/50 grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Metrics Analyzed</p>
                            <p className="text-slate-300 font-mono">{transactions.length} Total Trades</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Engine Status</p>
                            <p className="text-emerald-400 flex items-center text-sm">
                              <CheckCircle2 className="w-4 h-4 mr-1" /> OpenAI API Connected
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {/* Explanation linking back to Backend constraints */}
                <div className="bg-[#111827] rounded-xl p-6 border border-slate-800 text-sm text-slate-400 space-y-3">
                  <h4 className="text-white font-medium mb-2">Backend Architecture Integration:</h4>
                  <ul className="list-disc pl-5 space-y-2 marker:text-amber-500">
                    <li>This view consumes <code className="bg-[#0A0E17] px-1.5 py-0.5 rounded text-amber-400">GET /api/insights/</code>.</li>
                    <li>The backend calculates metrics in <code className="bg-[#0A0E17] px-1.5 py-0.5 rounded text-amber-400">insights/services.py</code> before passing them to the LLM.</li>
                    <li>If the OpenAI API fails, the backend falls back to rule-based insights, ensuring the UI always receives structured data.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
