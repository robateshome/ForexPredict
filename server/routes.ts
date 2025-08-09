import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage.js";
import { ForexService } from "./services/forex-service.js";
import { DemoDataService } from "./services/demo-data-service.js";
import { TradingSignal, SystemStatus, SignalUpdate, MarketUpdate } from "@shared/schema.js";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Initialize services - use demo service for stable development
  const apiKey = process.env.FINNHUB_API_KEY;
  let dataService: ForexService | DemoDataService;
  
  // Force demo mode for stable WebSocket connections during development
  if (process.env.NODE_ENV === 'development') {
    dataService = new DemoDataService();
    console.log('Using demo data service for stable development experience');
  } else if (apiKey) {
    dataService = new ForexService();
    console.log('Using live Finnhub data service');
  } else {
    dataService = new DemoDataService();
    console.log('Using demo data service - no API key provided');
  }
  
  // Store connected clients
  const clients = new Set<WebSocket>();
  
  // Broadcast to all connected clients
  function broadcast(message: any) {
    const data = JSON.stringify(message);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
  
  // Set up data service callbacks
  dataService.setCallbacks(
    (signal: TradingSignal) => {
      // Store signal (in production, would save to database)
      storage.saveSignal(signal);
      
      // Broadcast to clients
      const update: SignalUpdate = {
        type: 'signal_update',
        data: signal
      };
      broadcast(update);
    },
    (marketUpdate: any) => {
      const update: MarketUpdate = {
        type: 'market_update',
        data: marketUpdate
      };
      broadcast(update);
    },
    (systemStatus: SystemStatus['data']) => {
      const update: SystemStatus = {
        type: 'system_status',
        data: systemStatus
      };
      broadcast(update);
    }
  );
  
  // WebSocket connection handling
  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    clients.add(ws);
    
    // Send initial data
    ws.send(JSON.stringify({
      type: 'connection_established',
      data: { status: 'connected', timestamp: new Date().toISOString() }
    }));
    
    // Keep connection simple for now
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('Received WebSocket message:', message.type);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
      clients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });
  
  // API Routes
  app.get('/api/signals', async (req, res) => {
    try {
      const signals = storage.getRecentSignals(50);
      res.json(signals);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch signals' });
    }
  });
  
  app.get('/api/pairs', async (req, res) => {
    try {
      const pairs = storage.getActivePairs();
      res.json(pairs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch pairs' });
    }
  });
  
  app.get('/api/system-status', async (req, res) => {
    try {
      const status = dataService.getConnectionStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch system status' });
    }
  });
  
  app.get('/api/backtest-stats', async (req, res) => {
    try {
      const stats = storage.getBacktestStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch backtest stats' });
    }
  });
  
  app.post('/api/download-backtest', async (req, res) => {
    try {
      const data = storage.getBacktestData();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=backtest-data.json');
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate backtest data' });
    }
  });
  
  // Start data service
  if (dataService instanceof ForexService) {
    dataService.connect().catch(error => {
      console.error('Failed to connect to Finnhub:', error);
    });
  } else {
    dataService.start();
  }
  
  return httpServer;
}
