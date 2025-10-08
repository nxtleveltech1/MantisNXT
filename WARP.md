# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

MantisNXT is a Next.js-based enterprise resource planning (ERP) and supply chain management application with AI capabilities, built using:
- **Framework**: Next.js 15.5.3 with TypeScript 5.9.2
- **UI**: React 19.1.1, Tailwind CSS 3.4.17, Radix UI components
- **Database**: PostgreSQL 15 with complex schema including supply chain, inventory, and AI workspaces
- **AI Integration**: Multiple AI providers (OpenAI, Anthropic, Vercel) via @ai-sdk packages
- **Cache**: Redis for session management and caching
- **Testing**: Jest for unit tests, Playwright for E2E tests
- **Container**: Docker Compose for full stack deployment

## Common Development Commands

### Development Environment
```bash
# Start development server with automatic manager
npm run dev

# Stop development server
npm run dev:stop

# Check development server status
npm run dev:status

# Restart development server
npm run dev:restart

# Run raw Next.js dev server (without manager)
npm run dev:raw
```

### Build & Production
```bash
# Build production application
npm run build

# Start production server
npm start

# Lint the codebase
npm run lint

# Type checking
npm run type-check
```

### System Stabilization
```bash
# Set up system stabilization
npm run stabilize

# Clean up stabilization
npm run stabilize:cleanup

# Monitor stabilization status
npm run stabilize:monitor

# Check system health
npm run stabilize:health

# Emergency stabilization
npm run stabilize:emergency
```

### Testing
```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run specific test suites
npm run test:component
npm run test:api
npm run test:integration
npm run test:utils
npm run test:performance

# Run all tests (unit + E2E)
npm run test:all
```

### Database Management
```bash
# Validate database schema and connections
npm run db:validate

# Run full database validation suite
npm run db:validate:full

# Optimize database performance
npm run db:validate:performance

# Test cross-module data flow
npm run db:validate:flow

# Validate API endpoints
npm run db:validate:api

# Generate sample data
npm run db:sample-data

# Set up test database
npm run db:setup:test

# Run database migrations for different environments
npm run db:migrate:test
npm run db:migrate:e2e
npm run db:migrate:perf
```

### Docker Operations
```bash
# Start full stack with Docker Compose
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f app

# Rebuild and restart services
docker-compose build app && docker-compose up -d app

# Access PostgreSQL
docker exec -it mantisnxt-postgres psql -U mantisnxt -d mantisnxt

# Access Redis CLI
docker exec -it mantisnxt-redis redis-cli
```

### Database Migrations
```bash
# Run migrations (from scripts folder)
node scripts/deploy-ai-database-architecture.js
node scripts/apply_enhanced_schema.js
node scripts/create-performance-indexes.js
```

## High-Level Architecture

### Directory Structure
```
MantisNXT/
├── src/
│   ├── app/                      # Next.js app router pages and API routes
│   │   ├── api/                   # API endpoints organized by domain
│   │   │   ├── ai/               # AI services (chat, insights, analysis)
│   │   │   ├── analytics/        # Analytics and predictions
│   │   │   ├── auth/             # Authentication endpoints
│   │   │   ├── inventory/        # Inventory management
│   │   │   ├── suppliers/        # Supplier management
│   │   │   └── purchase-orders/  # Purchase order processing
│   │   ├── admin/                # Admin panel pages
│   │   ├── suppliers/            # Supplier management UI
│   │   ├── inventory/            # Inventory management UI
│   │   └── purchase-orders/      # PO management UI
│   ├── components/               # React components
│   │   ├── ui/                  # Base UI components (shadcn/ui)
│   │   ├── suppliers/            # Supplier-specific components
│   │   ├── inventory/            # Inventory components
│   │   ├── dashboard/            # Dashboard components
│   │   └── ai/                   # AI interface components
│   ├── lib/                      # Core libraries
│   │   ├── ai/                   # AI service integration
│   │   ├── auth/                 # Authentication logic
│   │   └── db/                   # Database connections
│   ├── hooks/                    # Custom React hooks
│   └── types/                    # TypeScript type definitions
├── lib/                          # Shared utilities (legacy location)
│   ├── cache/                    # Redis caching utilities
│   ├── services/                 # Business logic services
│   └── validation/               # Data validation schemas
├── database/                     # Database schemas and utilities
├── migrations/                   # SQL migration files
├── scripts/                      # Utility and deployment scripts
├── tests/                        # Test suites
└── monitoring/                   # Prometheus/Grafana configs
```

### Core Architecture Patterns

#### 1. Database Architecture
- **Connection Pooling**: Uses pg-pool with optimized settings for production
- **Multi-Schema Design**: 
  - Core schema for users, organizations
  - Supply chain schema for suppliers, inventory, purchase orders
  - AI workspace schema for agent data and insights
  - Analytics schema for reporting
- **Transaction Management**: Comprehensive transaction wrapper utilities in `lib/services/database/`
- **Cache Layer**: Redis integration for query result caching

#### 2. API Design
- **RESTful Routes**: Standard CRUD operations in `/api/[resource]/route.ts`
- **Real-time Updates**: WebSocket support for live data updates
- **Error Handling**: Centralized error handling with recovery strategies
- **Rate Limiting**: Built-in rate limiting for API endpoints
- **Response Caching**: Strategic caching headers and Redis cache

#### 3. AI Integration
- **Multiple Providers**: Supports OpenAI, Anthropic, Vercel AI SDK
- **Context Management**: AI context stored in workspace schema
- **Prompt Engineering**: Structured prompts in `lib/ai/services/prompts.ts`
- **Streaming Responses**: Support for streaming AI responses
- **Error Recovery**: Automatic fallback to alternative AI providers

#### 4. State Management
- **Server State**: React Query (TanStack Query) for server state management
- **Client State**: Zustand for client-side state
- **Form State**: React Hook Form with Zod validation
- **Auth State**: Custom auth context with JWT tokens

#### 5. Component Architecture
- **Composition Pattern**: Heavy use of component composition
- **Shadcn/UI Base**: All UI components built on shadcn/ui primitives
- **Accessibility First**: All components include ARIA labels and keyboard navigation
- **Responsive Design**: Mobile-first responsive design with Tailwind

### Key Features & Workflows

#### Supplier Management
- AI-powered supplier discovery and verification
- Price list import and analysis (Excel/CSV)
- Product catalog management
- Automated inventory sync

#### Inventory Management
- Real-time stock tracking
- Low stock alerts
- Automatic reorder points
- Multi-location support

#### Purchase Orders
- Automated PO generation
- Approval workflows
- Invoice matching
- Payment tracking

#### AI Capabilities
- Predictive analytics for demand forecasting
- Anomaly detection in pricing
- Natural language chat interface
- Automated insights generation

### Performance Considerations

1. **Database Optimization**
   - Comprehensive indexing strategy (see `scripts/create-performance-indexes.js`)
   - Materialized views for complex queries
   - Query result caching with Redis
   - Connection pooling with pg-pool

2. **Frontend Optimization**
   - Code splitting with Next.js dynamic imports
   - Image optimization with Next.js Image component
   - Static generation for marketing pages
   - Incremental Static Regeneration (ISR) for product pages

3. **Caching Strategy**
   - Redis for session storage
   - Query result caching
   - Static asset caching with CDN headers
   - API response caching

### Security Measures

- JWT-based authentication
- Role-based access control (RBAC)
- SQL injection prevention with parameterized queries
- XSS protection with React's built-in escaping
- CSRF protection with double-submit cookies
- Environment variable management for secrets

### Monitoring & Observability

- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboards
- **Loki**: Log aggregation
- **Custom health checks**: `/api/health` endpoint
- **Performance monitoring**: Custom performance reporter in tests

### Development Workflow

1. **Branch Strategy**: Feature branches from main
2. **Code Review**: PR required for all changes
3. **Testing Requirements**: 
   - Unit tests for new utilities
   - Integration tests for API endpoints
   - E2E tests for critical user flows
4. **CI/CD**: GitHub Actions for automated testing and deployment

### Troubleshooting Common Issues

#### Database Connection Issues
- Check `DATABASE_URL` in `.env.local`
- Verify PostgreSQL is running: `docker ps`
- Check connection pool settings in `lib/services/database/config.ts`

#### Build Errors
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules package-lock.json && npm install`
- Check TypeScript errors: `npm run type-check`

#### Test Failures
- Run specific test suite: `npm run test:[suite-name]`
- Check test database setup: `npm run db:setup:test`
- Verify test environment variables in `.env.test`

### Important Configuration Files

- `next.config.js`: Next.js configuration with webpack customizations
- `docker-compose.yml`: Full stack container orchestration
- `tsconfig.json`: TypeScript configuration
- `tailwind.config.js`: Tailwind CSS customization
- `.env.example`: Environment variable template

### AI-Specific Guidelines

When working with AI features:
1. Always check rate limits for API providers
2. Implement fallback strategies for API failures
3. Cache AI responses when appropriate
4. Use streaming for long-running operations
5. Implement proper error boundaries for AI components

### Database Migration Guidelines

1. Always create reversible migrations
2. Test migrations on a copy of production data
3. Use transactions for schema changes
4. Document migration purpose in comments
5. Run `npm run db:validate:full` after migrations