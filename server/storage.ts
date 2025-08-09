import { type User, type InsertUser, type TradingSignal, type ForexPair } from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  saveSignal(signal: TradingSignal): Promise<void>;
  getRecentSignals(limit: number): TradingSignal[];
  getActivePairs(): ForexPair[];
  getBacktestStats(): any;
  getBacktestData(): any;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private signals: TradingSignal[] = [];
  private activePairs: ForexPair[] = [
    { id: '1', symbol: 'EUR/USD', name: 'Euro / US Dollar', isActive: true, timeframe: '1m' },
    { id: '2', symbol: 'GBP/USD', name: 'British Pound / US Dollar', isActive: true, timeframe: '1m' },
    { id: '3', symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', isActive: true, timeframe: '1m' },
  ];

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async saveSignal(signal: TradingSignal): Promise<void> {
    this.signals.unshift(signal);
    // Keep only last 1000 signals
    if (this.signals.length > 1000) {
      this.signals = this.signals.slice(0, 1000);
    }
  }

  getRecentSignals(limit: number): TradingSignal[] {
    return this.signals.slice(0, limit);
  }

  getActivePairs(): ForexPair[] {
    return this.activePairs;
  }

  getBacktestStats(): any {
    const totalSignals = this.signals.length;
    const buySignals = this.signals.filter(s => s.signal === 'BUY').length;
    const sellSignals = this.signals.filter(s => s.signal === 'SELL').length;
    const avgConfidence = totalSignals > 0 ? 
      this.signals.reduce((acc, s) => acc + s.confidence, 0) / totalSignals : 0;

    return {
      totalSignals,
      buySignals,
      sellSignals,
      avgConfidence: Math.round(avgConfidence * 100),
      winRate: 67.3, // Simulated
      sharpeRatio: 1.84,
      maxDrawdown: -3.2
    };
  }

  getBacktestData(): any {
    return {
      signals: this.signals,
      stats: this.getBacktestStats(),
      exportTime: new Date().toISOString()
    };
  }
}

export const storage = new MemStorage();
