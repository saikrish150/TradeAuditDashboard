import { Zap, Target, Shield, Anchor } from 'lucide-react';

export const TRADING_RULES = [
  {
    title: "Entry Protocols",
    icon: Zap,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    items: [
      { label: "Trend Alignment", desc: "Trend must align with entry setup" },
      { label: "Price Action Setups", desc: "PDH/L, SR, or Trend with Price Action" },
      { 
        label: "Confirmations", 
        desc: "B.O.S, Double Top/Bottom, Trap, EMA Dir Change, or Big Bar above EMA",
        isList: true,
        subItems: ["Price Action (Double Top/Bottom, B.O.S, Trap Done)", "EMA Direction change", "Big Bar candle closing above EMA"]
      },
      { label: "Execution", desc: "Place trade above 1-min candle sustained/closed above EMA" }
    ]
  },
  {
    title: "Target Management",
    icon: Target,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    items: [
      { label: "Base Target", desc: "Standard 1:3 RR objective" },
      { label: "Trailing Logic", desc: "After target hit, trail 1-min candle by candle" }
    ]
  },
  {
    title: "Risk & Stop Loss",
    icon: Shield,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    items: [
      { label: "Stop Loss", desc: "Below 1-min candle with gap for take outs" }
    ]
  },
  {
    title: "Trailing SL Logic",
    icon: Anchor,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    items: [
      { label: "Live Move", desc: "After 1:2, place where trade is live after takeouts & pullbacks" }
    ]
  }
];
