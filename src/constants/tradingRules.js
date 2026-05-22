import { Zap, Shield, AlertTriangle } from 'lucide-react';

export const TRADING_RULES = [
  {
    title: "Entry Protocols",
    icon: Zap,
    color: "text-journal-gold",
    bg: "bg-journal-gold/10",
    border: "border-journal-gold/20",
    items: [
      { label: "1) Trend Alignment", desc: "Always align entry setups strictly with the primary macro trend direction." },
      { label: "2) Trap Validation", desc: "Identify and confirm clear liquidity sweeps or retail traps before initiating a trade." },
      { label: "3) Price Action", desc: "Validate the entry with solid support/resistance structures, candlestick conformations, or BOS." },
      { label: "4) Destiny Target", desc: "Ensure your target and execution are fully anchored to high-conviction mathematical destiny levels." }
    ]
  },
  {
    title: "Stop Loss & Trailing",
    icon: Shield,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    items: [
      { label: "1) Stop Loss Placement", desc: "Place stop loss strictly below the 1-minute entry candle with some gap/room for take-outs." },
      { label: "2) Cost-to-Cost (CTC)", desc: "Immediately move stop loss to break-even (cost-to-cost) once the trade hits a 1:2 Risk-to-Reward ratio." },
      { label: "3) Target Trail Lock", desc: "After the trade hits a 1:3 Risk-to-Reward ratio, move stop loss to lock target profit and trail 1-minute candle by candle." }
    ]
  },
  {
    title: "Stay-Away Protocols",
    icon: AlertTriangle,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    items: [
      { label: "1) Total Loss Ceiling", desc: "Halt all trading sessions immediately for the day once your total losses reach ₹1,500." },
      { label: "2) Daily Trade Cap", desc: "Cease execution completely after 3 trades are completed, regardless of the session outcomes." },
      { label: "3) Cooling Pause", desc: "Take a mandatory 20-minute break after suffering 2 stop-losses back-to-back to prevent revenge trading." }
    ]
  }
];
