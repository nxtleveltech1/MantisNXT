import { setupServer } from 'msw/node'
import { inventoryHandlers } from './handlers/inventory'
import { xlsxHandlers } from './handlers/xlsx'
import { warehouseHandlers } from './handlers/warehouse'

// Setup MSW server with all handlers
export const server = setupServer(
  ...inventoryHandlers,
  ...xlsxHandlers,
  ...warehouseHandlers
)