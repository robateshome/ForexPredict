# Overview

This is a real-time forex trading assistant that combines divergence detection with multi-indicator confirmation to generate automated trading signals. The system processes live market data from Finnhub WebSocket feeds and uses advanced technical analysis to identify high-confidence trading opportunities on forex currency pairs. It features a React-based dashboard for monitoring signals, market data, and system performance with real-time WebSocket updates.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React SPA**: Built with TypeScript using Vite as the build tool and bundler
- **UI Framework**: shadcn/ui components with Radix UI primitives and Tailwind CSS for styling
- **State Management**: TanStack React Query for server state and local React state for UI interactions
- **Real-time Communication**: WebSocket client with automatic reconnection and latency monitoring
- **Routing**: Wouter for lightweight client-side routing

## Backend Architecture
- **Express Server**: Node.js with TypeScript serving both API endpoints and static files
- **WebSocket Server**: Separate WebSocket server for real-time bidirectional communication
- **Signal Engine**: Core trading logic with divergence detection and multi-indicator confirmation
- **Technical Analysis**: Custom implementation of RSI, MACD, Stochastic, EMA, and ADX indicators
- **Data Processing**: Real-time market data processing with rate limiting and error handling

## Data Storage Solutions
- **In-Memory Storage**: MemStorage class for development/testing with user management
- **Database Schema**: Drizzle ORM with PostgreSQL schema definitions for:
  - Trading signals with entry/exit points and confidence scores
  - Divergence events with indicator data and confirmation status
  - Market data history and forex pair configurations
  - User management and authentication

## Authentication and Authorization
- **Session-based Authentication**: Uses express sessions with PostgreSQL session store
- **User Management**: Simple username/password system with encrypted storage
- **Route Protection**: API endpoint protection with session validation

## External Dependencies

### Market Data Provider
- **Finnhub API**: Primary data source for real-time forex WebSocket feeds and historical data
- **Rate Limiting**: Built-in request limiting to comply with API constraints
- **Failover Strategy**: Connection monitoring with automatic reconnection attempts

### Database Services
- **Neon Database**: Serverless PostgreSQL for production data storage
- **Drizzle ORM**: Type-safe database operations with automatic migrations
- **Connection Pooling**: Managed through Neon's serverless architecture

### Real-time Infrastructure
- **WebSocket Protocol**: Native WebSocket implementation for low-latency communication
- **Signal Broadcasting**: Multi-client signal distribution with connection management
- **Health Monitoring**: System status tracking with performance metrics

### Development Tools
- **Vite Plugin Ecosystem**: Runtime error overlay and Replit-specific development tools
- **TypeScript Compilation**: Shared type definitions between frontend and backend
- **Hot Module Replacement**: Development server with live reloading capabilities