/**
 * <LandingPage /> — public marketing/demo page.
 *
 * Shows what Aurix does WITHOUT requiring login, so a reviewer can
 * grok the product immediately. Data comes from the public endpoints
 * /api/price/ and /api/insights/market/.
 */
import {
  ArrowRight, BarChart3, Brain, ChevronRight, Cpu, Database, Github,
  Lightbulb, Lock, Newspaper, Shield, Sparkles, TrendingUp, Wallet, Zap,
} from 'lucide-react'

import { useMarketInsight } from '../../hooks/useMarketInsight.js'
import { usePrice } from '../../hooks/usePrice.js'
import { formatRelative } from '../../utils/format.js'

import ChartsPanel from '../charts/ChartsPanel.jsx'
import NewsPanel from '../news/NewsPanel.jsx'
import SignalBadge from '../insights/SignalBadge.jsx'

export default function LandingPage({ onSignIn, onSignUp }) {
  const { price, source, fetchedAt } = usePrice()
  const { data: market, isLoading } = useMarketInsight({
    initialPeriod: '1y', initialInterval: '1d',
  })

  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-200 font-sans">
      <Nav onSignIn={onSignIn} onSignUp={onSignUp} />
      <Hero
        price={price} source={source} fetchedAt={fetchedAt}
        signal={market?.signal} action={market?.action}
        onSignUp={onSignUp}
      />
      <Features />
      <DemoSection market={market} isLoading={isLoading} />
      <HowItWorks />
      <TechStack />
      <CTA onSignUp={onSignUp} />
      <Footer />
    </div>
  )
}

/* --------------- Nav --------------- */

function Nav({ onSignIn, onSignUp }) {
  return (
    <nav className="sticky top-0 z-30 bg-[#0A0E17]/85 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-amber-500" />
          <span className="text-lg font-bold text-white tracking-wide">Aurix</span>
          <span className="text-[10px] uppercase tracking-wider text-amber-500/70 ml-1 hidden sm:inline">
            Pro Desk
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="https://github.com/sunil1206/aurix-project"
            target="_blank" rel="noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-white"
          >
            <Github className="w-4 h-4" /> GitHub
          </a>
          <button
            onClick={onSignIn}
            className="px-3 py-1.5 text-sm text-slate-300 hover:text-white"
          >
            Sign in
          </button>
          <button
            onClick={onSignUp}
            className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-semibold px-4 py-1.5 rounded-lg text-sm shadow-lg shadow-amber-500/20"
          >
            Get started →
          </button>
        </div>
      </div>
    </nav>
  )
}

/* --------------- Hero --------------- */

function Hero({ price, source, fetchedAt, signal, action, onSignUp }) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-1/4 w-[480px] h-[480px] bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[420px] h-[420px] bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-slate-800/60 border border-slate-700 px-3 py-1 rounded-full text-xs text-slate-300 mb-6">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          AI-enabled · Pluggable LLM analyst · Real-time gold feeds
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-tight">
          The AI-enabled <span className="text-amber-400">digital gold</span><br className="hidden sm:block" />
          {' '}trading desk.
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Buy, sell and reason about your gold position with a
          production-grade backend, atomic transactions, real-time
          market data and an AI quant analyst.
        </p>

        {/* Live ticker pill */}
        <div className="mt-8 inline-flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl px-5 py-3">
          <div className="text-left">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Live · XAU / EUR</p>
            <p className="text-2xl font-mono font-bold text-amber-400">
              {price ? `€${price.toFixed(2)}` : '—'}
              <span className="text-sm text-slate-500"> / g</span>
            </p>
          </div>
          {signal && (
            <div className="border-l border-slate-700 pl-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Signal</p>
              <SignalBadge signal={signal} />
            </div>
          )}
          {action && (
            <div className="border-l border-slate-700 pl-4 hidden sm:block">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Action</p>
              <p className="font-bold text-white">{action}</p>
            </div>
          )}
          <div className="border-l border-slate-700 pl-4 hidden sm:block">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Source</p>
            <p className="text-xs font-mono text-slate-300">
              {source ?? '—'}
              {fetchedAt && <span className="text-slate-500"> · {formatRelative(fetchedAt)}</span>}
            </p>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={onSignUp}
            className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold px-6 py-3 rounded-xl shadow-lg shadow-amber-500/30 inline-flex items-center gap-2"
          >
            Open the live demo <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href="#demo"
            className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold px-6 py-3 rounded-xl border border-slate-700"
          >
            See it in action ↓
          </a>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          €1,000 starter balance · Demo deposits · No credit card required
        </p>
      </div>
    </section>
  )
}

/* --------------- Feature grid --------------- */

const FEATURES = [
  {
    icon: Database,
    title: 'Atomic immutable ledger',
    body: 'Every buy and sell is wrapped in a Postgres transaction with row-level locking. No double-spend, ever. Your balance is always derivable from the ledger.',
    accent: 'text-emerald-400',
    bg: 'from-emerald-500/10',
  },
  {
    icon: Brain,
    title: 'AI Quant Analyst',
    body: 'Pluggable engines — rule-based by default, OpenAI when configured. Reads RSI, MACD, Bollinger Bands and 6 macro headlines via FinBERT, then writes a 4-sentence executive summary.',
    accent: 'text-indigo-400',
    bg: 'from-indigo-500/10',
  },
  {
    icon: BarChart3,
    title: '3 years of real charts',
    body: 'Live XAU/EUR price from stooq.com with a 5-step yfinance fallback chain. Recharts-rendered price + SMA + Bollinger, RSI, and MACD panels, all from the same payload.',
    accent: 'text-amber-400',
    bg: 'from-amber-500/10',
  },
  {
    icon: Newspaper,
    title: 'FinBERT macro sentiment',
    body: 'Pulls real gold-related headlines from Google News, Yahoo Finance and Investing.com RSS, classifies each one, and blends the score into the trading signal.',
    accent: 'text-blue-400',
    bg: 'from-blue-500/10',
  },
  {
    icon: Shield,
    title: 'Production-grade architecture',
    body: 'Clean layering: views → services → models. JWT auth with refresh rotation, Redis-backed throttling, request-id correlation, structured error envelopes.',
    accent: 'text-rose-400',
    bg: 'from-rose-500/10',
  },
  {
    icon: Zap,
    title: 'One-command Docker deploy',
    body: 'Postgres + Redis + Django + Vite + nginx + Caddy auto-SSL — boot the entire stack with `docker compose up`. Auto-deploy via systemd reload.',
    accent: 'text-purple-400',
    bg: 'from-purple-500/10',
  },
]

function Features() {
  return (
    <section className="py-16 sm:py-20 bg-[#0A0E17]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-wider text-amber-500 font-semibold">
            What's inside
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">
            A complete fintech stack, in one repo
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className={`bg-gradient-to-br ${f.bg} via-slate-900/40 to-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors`}>
              <f.icon className={`w-6 h-6 ${f.accent} mb-3`} />
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* --------------- Live demo --------------- */

function DemoSection({ market, isLoading }) {
  return (
    <section id="demo" className="py-16 sm:py-20 bg-gradient-to-b from-[#0A0E17] to-slate-950 border-y border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-wider text-amber-500 font-semibold">
            Live demo · No login required
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">
            See real gold market analysis right now
          </h2>
          <p className="text-slate-400 mt-3 max-w-2xl mx-auto">
            The charts and headlines below are pulled from the same backend
            you'd use as a registered user — no demo data.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartsPanel data={market} isLoading={isLoading} />
          </div>
          <div className="space-y-6">
            <AnalystPreview data={market} isLoading={isLoading} />
            <NewsPanel sentiment={market?.sentiment} />
          </div>
        </div>
      </div>
    </section>
  )
}

function AnalystPreview({ data, isLoading }) {
  if (isLoading || !data) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 animate-pulse space-y-3">
        <div className="h-4 bg-slate-700 rounded w-1/2" />
        <div className="h-4 bg-slate-700 rounded w-3/4" />
      </div>
    )
  }
  return (
    <div className="bg-gradient-to-b from-indigo-950 to-slate-900 border border-indigo-500/30 rounded-xl overflow-hidden shadow-xl">
      <div className="bg-indigo-900/40 p-4 border-b border-indigo-500/20 flex items-center justify-between">
        <div className="flex items-center">
          <Cpu className="w-5 h-5 text-indigo-400 mr-2" />
          <h3 className="font-bold text-indigo-100">AI Quant Analyst</h3>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-indigo-300/70 font-mono">
          {data.engine}
        </span>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <SignalBadge signal={data.signal} size="lg" />
          <span className="text-sm text-slate-300">
            Confidence: <span className="font-mono text-white">
              {Math.round((data.confidence || 0) * 100)}%
            </span>
          </span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          {data.summary || '—'}
        </p>
        {data.stop_loss && data.stop_loss !== '—' && (
          <div className="text-xs text-amber-300 border-t border-indigo-500/20 pt-3">
            Suggested stop-loss: <span className="font-mono">{data.stop_loss}</span>
          </div>
        )}
      </div>
    </div>
  )
}

/* --------------- How it works --------------- */

function HowItWorks() {
  const steps = [
    { num: '01', icon: Wallet,    title: 'Sign up',     body: 'Create an account; we issue a €1,000 demo balance and a fresh wallet, no card needed.' },
    { num: '02', icon: TrendingUp, title: 'Trade gold', body: 'Buy or sell at the live cached XAU/EUR price. Trades fill atomically against your wallet.' },
    { num: '03', icon: Lightbulb,  title: 'Get insights', body: 'The AI analyst tracks your behaviour and the market, surfacing patterns and risk warnings.' },
  ]
  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-wider text-amber-500 font-semibold">How it works</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">From sign-up to insight in 30 seconds</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div key={s.num} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <s.icon className="w-6 h-6 text-amber-400" />
                <span className="text-xs font-mono text-slate-600">{s.num}</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* --------------- Tech stack --------------- */

function TechStack() {
  const tech = [
    'Django 5', 'Django REST Framework', 'JWT', 'PostgreSQL', 'Redis',
    'Docker', 'Caddy', 'React 18', 'Vite', 'TailwindCSS', 'Recharts',
    'OpenAI', 'FinBERT', 'stooq.com', 'yfinance',
  ]
  return (
    <section className="py-12 border-y border-slate-800 bg-slate-950/40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <p className="text-xs uppercase tracking-wider text-slate-500 mb-4">Built with</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {tech.map((t) => (
            <span key={t} className="px-3 py-1 text-xs font-mono text-slate-300 bg-slate-900 border border-slate-800 rounded-full">
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

/* --------------- CTA --------------- */

function CTA({ onSignUp }) {
  return (
    <section className="py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white">
          Ready to trade?
        </h2>
        <p className="text-slate-400 mt-4">
          Spin up an account, get your starter balance, and explore the AI analyst.
        </p>
        <button
          onClick={onSignUp}
          className="mt-8 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold px-8 py-4 rounded-xl shadow-lg shadow-amber-500/30 inline-flex items-center gap-2"
        >
          Create your wallet <ChevronRight className="w-5 h-5" />
        </button>
        <p className="text-xs text-slate-500 mt-4 flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3" /> Demo environment · €1,000 starter balance
        </p>
      </div>
    </section>
  )
}

/* --------------- Footer --------------- */

function Footer() {
  return (
    <footer className="border-t border-slate-800 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-500" />
          <span>Aurix Pro Desk · Demo build</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="https://github.com/sunil1206/aurix-project" target="_blank" rel="noreferrer"
             className="hover:text-white">GitHub</a>
          <a href="/api/health/" className="hover:text-white">API status</a>
          <a href="/api/price/" className="hover:text-white">Live price</a>
        </div>
      </div>
    </footer>
  )
}
