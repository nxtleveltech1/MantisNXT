# MantisNXT

A comprehensive inventory management system with integrated supplier portfolio management, built with Next.js, TypeScript, and PostgreSQL.

## 🎉 NXT-SPP Integration Complete

The inventory management system has been fully integrated with the NXT-SPP (Supplier Inventory Portfolio) platform. All supplier pricelist uploads, product selection, and stock tracking are now managed through a unified workflow.

**Quick Start:**
- Access the system at: `http://localhost:3000/nxt-spp`
- See [Integration Documentation](docs/INTEGRATION_COMPLETE.md) for details
- See [NXT-SPP README](NXT-SPP-README.md) for API reference

## Features

- ✅ **Unified supplier inventory management (NXT-SPP)**
- ✅ **End-to-end workflow: Upload → Select → Stock**
- ✅ **Single-active-selection business rule enforcement**
- ✅ **Real-time stock on hand reporting**
- ✅ **Automated pricelist validation and merging**
- ✅ **Comprehensive dashboard and analytics**
- ✅ **Multi-supplier support with price history tracking**
- ✅ **Inventory selection interface (ISI)**
- ✅ **Performance-optimized database queries**
- ✅ **RESTful API with comprehensive error handling**

## 📋 Key Workflows

1. **Supplier Pricelist Management**: Upload and validate supplier pricelists → [NXT-SPP Dashboard](http://localhost:3000/nxt-spp)
2. **Inventory Selection**: Choose which products to stock → [Selection Interface](http://localhost:3000/nxt-spp?tab=selections)
3. **Stock Reporting**: View stock on hand for selected items → [Stock Reports](http://localhost:3000/nxt-spp?tab=stock-reports)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Environment variables configured

### Installation

1. **Clone the repository**
   ```bash
   git clone https://gitlab.com/gambew/MantisNXT.git
   cd MantisNXT
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your database credentials
   ```

4. **Run full integration**
   ```bash
   npm run integration:full
   ```

5. **Verify integration**
   ```bash
   npm run integration:verify
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Access the application**
   - NXT-SPP Dashboard: `http://localhost:3000/nxt-spp`
   - Inventory Management: `http://localhost:3000/inventory`

## 🔄 Migration from Legacy System

If you were using the previous inventory system:
- All functionality has moved to `/nxt-spp`
- The `/inventory` route now redirects to the unified system
- Your data can be migrated using the integration scripts
- See [Integration Documentation](docs/INTEGRATION_COMPLETE.md) for details

## Integration Scripts

The system includes comprehensive integration scripts for data management:

```bash
# Database operations
npm run db:purge              # Purge all inventory data
npm run db:verify-schema      # Verify database schema
npm run db:create-schemas     # Create missing schemas

# Data import
npm run import:master         # Import master dataset
npm run import:create-selection # Create default selection
npm run import:seed-stock     # Seed stock on hand

# Full integration
npm run integration:full     # Run complete integration
npm run integration:verify   # Verify integration success
```

## Architecture

The system follows a 3-layer architecture:

- **SPP Layer** (Staging): Pricelist uploads and validation
- **CORE Layer** (Canonical): Normalized master data
- **SERVE Layer** (Reporting): Read-optimized views

## API Endpoints

### Selection Management
- `GET /api/core/selections/active` - Get active selection
- `POST /api/core/selections/[id]/activate` - Activate selection
- `GET /api/core/selections/[id]/items` - Get selection items

### Stock Reporting
- `GET /api/serve/nxt-soh` - NXT Stock on Hand (selected items only)

### Pricelist Management
- `POST /api/spp/upload` - Upload pricelist
- `POST /api/spp/validate` - Validate pricelist
- `POST /api/spp/merge` - Merge pricelist to core

## Business Rules

- **Single Active Selection**: Only one selection can be active at a time
- **Selected Items Only**: Stock reports show ONLY items in active selection
- **Price History**: SCD Type 2 tracking with valid_from/valid_to
- **Supplier Product Mapping**: Each supplier SKU maps to internal product

## Documentation

- [Integration Documentation](docs/INTEGRATION_COMPLETE.md) - Complete integration guide
- [NXT-SPP README](NXT-SPP-README.md) - API reference and technical details
- [Database Schema](database/schema/) - Schema documentation
- [Type Definitions](src/types/nxt-spp.ts) - TypeScript interfaces

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
npm run test         # Run tests
npm run test:e2e     # Run end-to-end tests
```

### Testing

```bash
# Run all tests
npm run test:all

# Run specific test suites
npm run test:component  # Component tests
npm run test:api        # API tests
npm run test:integration # Integration tests
npm run test:e2e       # End-to-end tests
```

## Docker Support

You can run the platform inside containers for both production-style testing and local development.

### Production-style image

1. Build the multi-stage image (runs `npm run build` during the build step):
   ```bash
   docker compose build
   ```
2. Provide any required environment variables (e.g. `DATABASE_URL`) via your shell or a `.env` file, then start the container:
   ```bash
   docker compose up
   ```
   The application is exposed on `http://localhost:3000`.

### Development container

For a live-reloading dev server inside Docker, use the development compose file:
```bash
docker compose -f docker-compose.dev.yml up --build
```
This mounts the repository into the container, installs dependencies, and runs the dev server.

**Important**: create a `.env.local` (see `env.example`) with a valid Neon connection string before starting, or the app will fail fast on env validation.

### Cursor / VS Code Dev Containers

A `.devcontainer/devcontainer.json` is included. In Cursor (or VS Code) choose **Dev Containers: Open Folder in Container...** and select the project; the editor will attach to the `docker-compose.dev.yml` service and run `bun install` automatically.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the [documentation](docs/)
- Review the [integration guide](docs/INTEGRATION_COMPLETE.md)

---

## Performance Optimization

### Query Performance

For detailed information on query optimization, index usage, and troubleshooting slow queries, see:
- [Query Optimization Guide](docs/QUERY_OPTIMIZATION_GUIDE.md)
- [Slow Query Analysis Script](scripts/analyze-slow-queries.sql)

### Monitoring

Query performance metrics are available at:
- Endpoint: `GET /api/health/query-metrics`
- Requires authentication (admin token)

### Key Metrics
- Slow query threshold: 1000ms (configurable via `SLOW_QUERY_THRESHOLD_MS`)
- Query logging: Enabled by default in development
- Circuit breaker threshold: 3 consecutive failures

### Quick Troubleshooting

1. **Check slow queries**:
   ```bash
   # View query metrics
   curl http://localhost:3000/api/health/query-metrics
   ```

2. **Analyze database performance**:
   ```bash
   # Connect to database
   psql $DATABASE_URL
   
   # Run analysis script
   \i scripts/analyze-slow-queries.sql
   ```

3. **Enable detailed query logging**:
   ```bash
   # In .env.local
   QUERY_LOG_ENABLED=true
   LOG_QUERY_TEXT=true
   LOG_PARAMETERS=true
   SLOW_QUERY_THRESHOLD_MS=500
   ```

### Index Maintenance

Run these commands periodically:
```sql
-- Update statistics
ANALYZE inventory_items;
ANALYZE suppliers;

-- Vacuum to reclaim space
VACUUM ANALYZE inventory_items;
VACUUM ANALYZE suppliers;
```
