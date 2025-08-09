import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const forexPairs = pgTable("forex_pairs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: varchar("symbol", { length: 10 }).notNull().unique(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  timeframe: varchar("timeframe", { length: 10 }).notNull().default("1m"),
});

export const tradingSignals = pgTable("trading_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  pair: varchar("pair", { length: 10 }).notNull(),
  timeframe: varchar("timeframe", { length: 10 }).notNull(),
  signal: varchar("signal", { length: 10 }).notNull(), // BUY, SELL, HOLD
  confidence: real("confidence").notNull(),
  reason: text("reason").notNull(),
  entryPrice: real("entry_price").notNull(),
  entryType: varchar("entry_type", { length: 10 }).notNull().default("market"),
  stopLoss: real("stop_loss"),
  takeProfit: real("take_profit"),
  predictionHorizonMins: integer("prediction_horizon_mins").notNull().default(5),
  expectedMovePct: real("expected_move_pct"),
  indicatorValues: jsonb("indicator_values"),
  backtestStats: jsonb("backtest_stats"),
});

export const divergenceEvents = pgTable("divergence_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  pair: varchar("pair", { length: 10 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // bullish, bearish, hidden_bullish, hidden_bearish
  indicator: varchar("indicator", { length: 20 }).notNull(), // RSI, MACD, Stochastic
  status: varchar("status", { length: 20 }).notNull().default("pending"), // confirmed, pending, rejected
  priceData: jsonb("price_data"),
  indicatorData: jsonb("indicator_data"),
  confidence: real("confidence"),
});

export const marketData = pgTable("market_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  price: real("price").notNull(),
  volume: real("volume"),
  bid: real("bid"),
  ask: real("ask"),
  spread: real("spread"),
});

// Zod schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertForexPairSchema = createInsertSchema(forexPairs).omit({
  id: true,
});

export const insertTradingSignalSchema = createInsertSchema(tradingSignals).omit({
  id: true,
  timestamp: true,
});

export const insertDivergenceEventSchema = createInsertSchema(divergenceEvents).omit({
  id: true,
  timestamp: true,
});

export const insertMarketDataSchema = createInsertSchema(marketData).omit({
  id: true,
  timestamp: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ForexPair = typeof forexPairs.$inferSelect;
export type InsertForexPair = z.infer<typeof insertForexPairSchema>;

export type TradingSignal = typeof tradingSignals.$inferSelect;
export type InsertTradingSignal = z.infer<typeof insertTradingSignalSchema>;

export type DivergenceEvent = typeof divergenceEvents.$inferSelect;
export type InsertDivergenceEvent = z.infer<typeof insertDivergenceEventSchema>;

export type MarketData = typeof marketData.$inferSelect;
export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;

// WebSocket message types
export interface WSMessage {
  type: string;
  data: any;
}

export interface SignalUpdate extends WSMessage {
  type: 'signal_update';
  data: TradingSignal;
}

export interface DivergenceUpdate extends WSMessage {
  type: 'divergence_update';
  data: DivergenceEvent;
}

export interface MarketUpdate extends WSMessage {
  type: 'market_update';
  data: {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    timestamp: string;
  };
}

export interface SystemStatus extends WSMessage {
  type: 'system_status';
  data: {
    connected: boolean;
    mode?: string; // 'demo' or 'live'
    provider?: string; // 'ExchangeRate-API' or 'Demo'
    rateLimit: { 
      current: number; 
      max: number; 
      resetTime?: string;
    };
    uptime?: number;
    latency?: number;
    lastUpdate?: string;
    // Legacy fields for backward compatibility
    finnhubConnected?: boolean;
    dataProcessing?: boolean;
    signalEngine?: boolean;
    memoryUsage?: { used: number; total: number; };
    cpuUsage?: number;
  };
}
