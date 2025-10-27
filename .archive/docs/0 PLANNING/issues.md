
55           const notification = state.notifications.find(n => n.id === id)
                                                           ~

src/lib/stores/notification-store.ts:59:55 - error TS7006: Parameter 'n' implicitly has an 'any' type.

59             notifications: state.notifications.filter(n => n.id !== id),
                                                         ~

src/lib/stores/supplier-store.ts:9:8 - error TS2307: Cannot find module '@/lib/types/inventory' or its corresponding type declarations.

9 } from '@/lib/types/inventory'
         ~~~~~~~~~~~~~~~~~~~~~~~

src/lib/stores/supplier-store.ts:74:14 - error TS7006: Parameter 'state' implicitly has an 'any' type.

74         set((state) => ({
                ~~~~~

src/lib/stores/supplier-store.ts:98:16 - error TS7006: Parameter 'state' implicitly has an 'any' type.

98           set((state) => ({
                  ~~~~~

src/lib/stores/supplier-store.ts:125:16 - error TS7006: Parameter 'state' implicitly has an 'any' type.

125           set((state) => ({
                   ~~~~~

src/lib/stores/supplier-store.ts:126:44 - error TS7006: Parameter 's' implicitly has an 'any' type.

126             suppliers: state.suppliers.map(s => s.id === id ? data.data : s),
                                               ~

src/lib/stores/supplier-store.ts:149:16 - error TS7006: Parameter 'state' implicitly has an 'any' type.

149           set((state) => ({
                   ~~~~~

src/lib/stores/supplier-store.ts:150:47 - error TS7006: Parameter 's' implicitly has an 'any' type.

150             suppliers: state.suppliers.filter(s => s.id !== id),
                                                  ~

src/lib/stores/supplier-store.ts:170:20 - error TS7006: Parameter 'state' implicitly has an 'any' type.

170       partialize: (state) => ({
                       ~~~~~

src/lib/supplier-discovery/engine.ts:110:30 - error TS2802: Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.

110             sourcesUsed: [...new Set(extractionResults.map(r => r.source))]
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/lib/supplier-discovery/extractors.ts:132:18 - error TS2339: Property 'waitForTimeout' does not exist on type 'Page'.

132       await page.waitForTimeout(2000);
                     ~~~~~~~~~~~~~~

src/lib/supplier-discovery/extractors.ts:175:29 - error TS2802: Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.

175         patterns[key] = [...new Set(matches)]; // Remove duplicates
                                ~~~~~~~~~~~~~~~~

src/lib/supplier-discovery/processor.ts:49:25 - error TS2802: Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.

49     const sources = [...new Set(results.map(r => r.source))];
                           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/lib/supplier-discovery/utils.ts:366:14 - error TS2802: Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.

366   return [...new Set(combined)]; // Remove duplicates
                 ~~~~~~~~~~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:7:40 - error TS2307: Cannot find module '@/lib/database' or its corresponding type declarations.

7 import { query, withTransaction } from '@/lib/database'
                                         ~~~~~~~~~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:72:39 - error TS7006: Parameter 'row' implicitly has an 'any' type.

72     const suppliers = result.rows.map(row => this.mapRowToSupplier(row))
                                         ~~~

src/lib/suppliers/core/SupplierRepository.ts:96:36 - error TS2339: Property 'legalName' does not exist on type 'CreateSupplierData'.

96         data.name, data.code, data.legalName, data.website, data.industry,
                                      ~~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:96:52 - error TS2339: Property 'website' does not exist on type 'CreateSupplierData'.

96         data.name, data.code, data.legalName, data.website, data.industry,
                                                      ~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:96:66 - error TS2339: Property 'industry' does not exist on type 'CreateSupplierData'.

96         data.name, data.code, data.legalName, data.website, data.industry,
                                                                    ~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:98:14 - error TS2339: Property 'taxId' does not exist on type 'CreateSupplierData'.

98         data.taxId, data.registrationNumber, data.foundedYear, data.employeeCount,
                ~~~~~

src/lib/suppliers/core/SupplierRepository.ts:98:26 - error TS2339: Property 'registrationNumber' does not exist on type 'CreateSupplierData'.

98         data.taxId, data.registrationNumber, data.foundedYear, data.employeeCount,
                            ~~~~~~~~~~~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:98:51 - error TS2339: Property 'foundedYear' does not exist on type 'CreateSupplierData'.

98         data.taxId, data.registrationNumber, data.foundedYear, data.employeeCount,
                                                     ~~~~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:98:69 - error TS2339: Property 'employeeCount' does not exist on type 'CreateSupplierData'.

98         data.taxId, data.registrationNumber, data.foundedYear, data.employeeCount,
                                                                       ~~~~~~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:99:14 - error TS2339: Property 'annualRevenue' does not exist on type 'CreateSupplierData'.

99         data.annualRevenue, data.currency
                ~~~~~~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:99:34 - error TS2339: Property 'currency' does not exist on type 'CreateSupplierData'.

99         data.annualRevenue, data.currency
                                    ~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:113:28 - error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.      
  Type 'undefined' is not assignable to type 'string'.

113           acc.mobiles.push(contact.mobile)
                               ~~~~~~~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:114:32 - error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.      
  Type 'undefined' is not assignable to type 'string'.

114           acc.departments.push(contact.department)
                                   ~~~~~~~~~~~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:159:26 - error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.      
  Type 'undefined' is not assignable to type 'string'.

159           acc.names.push(address.name)
                             ~~~~~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:161:34 - error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.      
  Type 'undefined' is not assignable to type 'string'.

161           acc.addressLine2s.push(address.addressLine2)
                                     ~~~~~~~~~~~~~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:233:16 - error TS2339: Property 'legalName' does not exist on type 'UpdateSupplierData'.

233       if (data.legalName !== undefined) { updateFields.push(`legal_name = $${paramIndex++}`); params.push(data.legalName) }
                   ~~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:233:112 - error TS2339: Property 'legalName' does not exist on type 'UpdateSupplierData'.

233       if (data.legalName !== undefined) { updateFields.push(`legal_name = $${paramIndex++}`); params.push(data.legalName) }
                                                                                                                   ~~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:234:16 - error TS2339: Property 'website' does not exist on type 'UpdateSupplierData'.

234       if (data.website !== undefined) { updateFields.push(`website = $${paramIndex++}`); params.push(data.website) }
                   ~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:234:107 - error TS2339: Property 'website' does not exist on type 'UpdateSupplierData'.

234       if (data.website !== undefined) { updateFields.push(`website = $${paramIndex++}`); params.push(data.website) }
                                                                                                              ~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:255:30 - error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.      
  Type 'undefined' is not assignable to type 'string'.

255             acc.mobiles.push(contact.mobile)
                                 ~~~~~~~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:256:34 - error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.

256             acc.departments.push(contact.department)
                                     ~~~~~~~~~~~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:304:28 - error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.      
  Type 'undefined' is not assignable to type 'string'.

304             acc.names.push(address.name)
                               ~~~~~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:306:36 - error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.      
  Type 'undefined' is not assignable to type 'string'.

306             acc.addressLine2s.push(address.addressLine2)
                                       ~~~~~~~~~~~~~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:382:38 - error TS2339: Property 'legalName' does not exist on type 'CreateSupplierData'.

382         acc.legalNames.push(supplier.legalName)
                                         ~~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:383:36 - error TS2339: Property 'website' does not exist on type 'CreateSupplierData'.

383         acc.websites.push(supplier.website || null)
                                       ~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:384:38 - error TS2339: Property 'industry' does not exist on type 'CreateSupplierData'.

384         acc.industries.push(supplier.industry)
                                         ~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:390:34 - error TS2339: Property 'taxId' does not exist on type 'CreateSupplierData'.

390         acc.taxIds.push(supplier.taxId)
                                     ~~~~~

src/lib/suppliers/core/SupplierRepository.ts:391:47 - error TS2339: Property 'registrationNumber' does not exist on type 'CreateSupplierData'.

391         acc.registrationNumbers.push(supplier.registrationNumber)
                                                  ~~~~~~~~~~~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:392:40 - error TS2339: Property 'foundedYear' does not exist on type 'CreateSupplierData'.

392         acc.foundedYears.push(supplier.foundedYear || null)
                                           ~~~~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:393:42 - error TS2339: Property 'employeeCount' does not exist on type 'CreateSupplierData'.

393         acc.employeeCounts.push(supplier.employeeCount || null)
                                             ~~~~~~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:394:42 - error TS2339: Property 'annualRevenue' does not exist on type 'CreateSupplierData'.

394         acc.annualRevenues.push(supplier.annualRevenue || null)
                                             ~~~~~~~~~~~~~

src/lib/suppliers/core/SupplierRepository.ts:395:38 - error TS2339: Property 'currency' does not exist on type 'CreateSupplierData'.

395         acc.currencies.push(supplier.currency)
                                         ~~~~~~~~

src/lib/suppliers/services/SupplierExportService.ts:321:31 - error TS18048: 'request.template' is possibly 'undefined'.

321     const title = `Supplier ${request.template.charAt(0).toUpperCase() + request.template.slice(1)} Report`
                                  ~~~~~~~~~~~~~~~~

src/lib/suppliers/services/SupplierExportService.ts:321:74 - error TS18048: 'request.template' is possibly 'undefined'.

321     const title = `Supplier ${request.template.charAt(0).toUpperCase() + request.template.slice(1)} Report`
                                                                             ~~~~~~~~~~~~~~~~

src/lib/types/inventory.ts:397:3 - error TS2300: Duplicate identifier 'environmental_monitoring'.

397   environmental_monitoring: boolean
      ~~~~~~~~~~~~~~~~~~~~~~~~

src/lib/types/inventory.ts:438:3 - error TS2300: Duplicate identifier 'edge_computing'.

438   edge_computing: boolean
      ~~~~~~~~~~~~~~

src/lib/types/inventory.ts:755:3 - error TS2300: Duplicate identifier 'environmental_monitoring'.

755   environmental_monitoring: boolean
      ~~~~~~~~~~~~~~~~~~~~~~~~

src/lib/types/inventory.ts:804:3 - error TS2300: Duplicate identifier 'edge_computing'.

804   edge_computing: boolean
      ~~~~~~~~~~~~~~

src/lib/upload/error-handler.ts:2:33 - error TS2307: Cannot find module '@/lib/database' or its corresponding type declarations.

2 import { withTransaction } from '@/lib/database';
                                  ~~~~~~~~~~~~~~~~

src/lib/upload/error-handler.ts:149:51 - error TS7006: Parameter 'client' implicitly has an 'any' type.

149       const exists = await withTransaction(async (client) => {
                                                      ~~~~~~

src/lib/upload/error-handler.ts:270:43 - error TS7006: Parameter 'client' implicitly has an 'any' type.

270       return await withTransaction(async (client) => {
                                              ~~~~~~

src/lib/upload/error-handler.ts:302:56 - error TS7006: Parameter 'acc' implicitly has an 'any' type.

302         const errorsByLevel = levelResult.rows.reduce((acc, row) => {
                                                           ~~~

src/lib/upload/error-handler.ts:302:61 - error TS7006: Parameter 'row' implicitly has an 'any' type.

302         const errorsByLevel = levelResult.rows.reduce((acc, row) => {
                                                                ~~~

src/lib/upload/error-handler.ts:317:64 - error TS7006: Parameter 'acc' implicitly has an 'any' type.

317         const errorsByOperation = operationResult.rows.reduce((acc, row) => {
                                                                   ~~~

src/lib/upload/error-handler.ts:317:69 - error TS7006: Parameter 'row' implicitly has an 'any' type.

317         const errorsByOperation = operationResult.rows.reduce((acc, row) => {
                                                                        ~~~

src/lib/upload/error-handler.ts:332:52 - error TS7006: Parameter 'row' implicitly has an 'any' type.

332         const topErrors = topErrorsResult.rows.map(row => ({
                                                       ~~~

src/lib/upload/error-handler.ts:439:36 - error TS7006: Parameter 'client' implicitly has an 'any' type.

439       await withTransaction(async (client) => {
                                       ~~~~~~

src/lib/upload/file-parser.ts:312:5 - error TS2322: Type 'unknown[]' is not assignable to type 'Record<string, any>[]'.
  Type 'unknown' is not assignable to type 'Record<string, any>'.

312     return jsonData.slice(0, options.maxRows);
        ~~~~~~

src/lib/upload/transaction-manager.ts:2:33 - error TS2307: Cannot find module '@/lib/database' or its corresponding type declarations.

2 import { withTransaction } from '@/lib/database';
                                  ~~~~~~~~~~~~~~~~

src/lib/upload/transaction-manager.ts:32:41 - error TS7006: Parameter 'client' implicitly has an 'any' type.

32     return await withTransaction(async (client) => {
                                           ~~~~~~

src/lib/upload/transaction-manager.ts:411:34 - error TS7006: Parameter 'client' implicitly has an 'any' type.

411     await withTransaction(async (client) => {
                                     ~~~~~~

src/lib/upload/transaction-manager.ts:436:34 - error TS7006: Parameter 'client' implicitly has an 'any' type.

436     await withTransaction(async (client) => {
                                     ~~~~~~

src/lib/utils/api-helpers.ts:141:25 - error TS2339: Property 'errors' does not exist on type 'ZodError<unknown>'.

141   const details = error.errors.map(e => ({
                            ~~~~~~

src/lib/utils/api-helpers.ts:141:36 - error TS7006: Parameter 'e' implicitly has an 'any' type.

141   const details = error.errors.map(e => ({
                                       ~

src/lib/utils/api-helpers.ts:346:15 - error TS2484: Export declaration conflicts with exported declaration of 'ApiError'.

346 export type { ApiError, ApiSuccess }
                  ~~~~~~~~

src/lib/utils/api-helpers.ts:346:25 - error TS2484: Export declaration conflicts with exported declaration of 'ApiSuccess'.

346 export type { ApiError, ApiSuccess }
                            ~~~~~~~~~~

src/lib/utils/dataValidation.ts:176:77 - error TS2339: Property 'toLowerCase' does not exist on type 'never'.

176                   typeof normalized.isRead === 'string' ? normalized.isRead.toLowerCase() === 'true' :
                                                                                ~~~~~~~~~~~

src/lib/utils/error-reporting.ts:6:76 - error TS2307: Cannot find module '@/lib/error-handling/upload-error-manager' or its corresponding type declarations.    

6 import { UploadError, ErrorStatistics, ErrorCategory, ErrorSeverity } from '@/lib/error-handling/upload-error-manager'
                                                                             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/lib/utils/neon-error-handler.ts:49:22 - error TS2339: Property 'errors' does not exist on type 'ZodError<unknown>'.

49       details: error.errors.map(e => ({
                        ~~~~~~

src/lib/utils/neon-error-handler.ts:49:33 - error TS7006: Parameter 'e' implicitly has an 'any' type.

49       details: error.errors.map(e => ({
                                   ~

src/lib/utils/nxt-spp-helpers.ts:12:3 - error TS2305: Module '"@/types/supplier-portfolio"' has no exported member 'SelectionWorkflowRequest'.

12   SelectionWorkflowRequest
     ~~~~~~~~~~~~~~~~~~~~~~~~

src/lib/utils/nxt-spp-helpers.ts:214:3 - error TS2322: Type '{ id: string; sku: string; name: string; supplier_name: string | undefined; category: string | null; current_price: number; currency: string | undefined; is_new: boolean; is_mapped: boolean; is_selected: boolean; selectable: boolean; validation_status: "valid" | ... 1 more ... | "needs_review"; }[]' is not assignable to type '{ id: string; sku: string; name: string; supplier_name: string; category: string | null; current_price: number; currency: string; is_new: boolean; is_mapped: boolean; is_selected: boolean; selectable: boolean; validation_status: string; }[]'.
  Type '{ id: string; sku: string; name: string; supplier_name: string | undefined; category: string | null; current_price: number; currency: string | undefined; is_new: boolean; is_mapped: boolean; is_selected: boolean; selectable: boolean; validation_status: "valid" | ... 1 more ... | "needs_review"; }' is not assignable to type '{ id: string; sku: string; name: string; supplier_name: string; category: string | null; current_price: number; currency: string; is_new: boolean; is_mapped: boolean; is_selected: boolean; selectable: boolean; validation_status: string; }'.
    Types of property 'supplier_name' are incompatible.
      Type 'string | undefined' is not assignable to type 'string'.
        Type 'undefined' is not assignable to type 'string'.

214   return products.map(product => ({
      ~~~~~~

src/lib/utils/nxt-spp-helpers.ts:619:3 - error TS2322: Type '{ Supplier: string | undefined; SKU: string; Name: string; Brand: string; Category: string; 'Current Price': number; 'Previous Price': number | null; 'Change %': number | null; Currency: string | undefined; 'Is New': string; 'Is Mapped': string; 'Is Selected': string; 'First Seen': string; }[]' is not assignable to type '{ Supplier: string; SKU: string; Name: string; Brand: string; Category: string; 'Current Price': number; 'Previous Price': number | null; 'Change %': number | null; Currency: string; 'Is New': string; 'Is Mapped': string; 'Is Selected': string; 'First Seen': string; }[]'.
  Type '{ Supplier: string | undefined; SKU: string; Name: string; Brand: string; Category: string; 'Current Price': number; 'Previous Price': number | null; 'Change %': number | null; Currency: string | undefined; 'Is New': string; 'Is Mapped': string; 'Is Selected': string; 'First Seen': string; }' is not assignable to type '{ Supplier: string; SKU: string; Name: string; Brand: string; Category: string; 'Current Price': number; 'Previous Price': number | null; 'Change %': number | null; Currency: string; 'Is New': string; 'Is Mapped': string; 'Is Selected': string; 'First Seen': string; }'.
    Types of property 'Supplier' are incompatible.
      Type 'string | undefined' is not assignable to type 'string'.
        Type 'undefined' is not assignable to type 'string'.

619   return products.map(p => ({
      ~~~~~~

src/lib/utils/safe-data.ts:391:3 - error TS2740: Type 'Record<string, unknown>' is missing the following properties from type 'SafeSupplier': id, name, email, status, and 4 more.

391   return safeObject(input, {
      ~~~~~~

src/lib/utils/safe-data.ts:410:6 - error TS2345: Argument of type 'SafeSupplier' is not assignable to parameter of type 'Record<string, unknown>'.
  Index signature for type 'string' is missing in type 'SafeSupplier'.

410   }, fallback)
         ~~~~~~~~

src/lib/utils/safe-data.ts:441:3 - error TS2740: Type 'Record<string, unknown>' is missing the following properties from type 'SafeInventoryItem': id, name, sku, quantity, and 5 more.

441   return safeObject(input, {
      ~~~~~~

src/lib/utils/safe-data.ts:456:6 - error TS2345: Argument of type 'SafeInventoryItem' is not assignable to parameter of type 'Record<string, unknown>'.
  Index signature for type 'string' is missing in type 'SafeInventoryItem'.

456   }, fallback)
         ~~~~~~~~

src/lib/utils/transformers/inventory.ts:1:42 - error TS2307: Cannot find module '@/lib/utils/case' or its corresponding type declarations.

1 import { keysToCamel, keysToSnake } from '@/lib/utils/case';
                                           ~~~~~~~~~~~~~~~~~~

src/lib/validation/inventory-validator.ts:342:30 - error TS2339: Property 'errors' does not exist on type 'ZodError<{ sku: string; name: string; category: string; unit_of_measure: string; reorder_level: number; is_serialized: boolean; currency_code: string; description?: string | undefined; brand?: string | undefined; ... 7 more ...; supplier_sku?: string | undefined; }>'.

342         baseValidation.error.errors.forEach(error => {
                                 ~~~~~~

src/lib/validation/inventory-validator.ts:342:45 - error TS7006: Parameter 'error' implicitly has an 'any' type.

342         baseValidation.error.errors.forEach(error => {
                                                ~~~~~

src/middleware/query-validator.ts:13:41 - error TS2307: Cannot find module '@/lib/db/schema-contract' or its corresponding type declarations.

13 import { SchemaContractValidator } from '@/lib/db/schema-contract';
                                           ~~~~~~~~~~~~~~~~~~~~~~~~~~

src/middleware/query-validator.ts:178:14 - error TS2802: Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.

178   return [...new Set(unqualified)]; // Remove duplicates
                 ~~~~~~~~~~~~~~~~~~~~

src/middleware/schema-validator.ts:11:41 - error TS2307: Cannot find module '@/lib/db/schema-contract' or its corresponding type declarations.

11 import { SchemaContractValidator } from '@/lib/db/schema-contract';
                                           ~~~~~~~~~~~~~~~~~~~~~~~~~~

src/services/ai/PredictiveAnalyticsService.ts:6:22 - error TS2307: Cannot find module '@/lib/database' or its corresponding type declarations.

6 import { pool } from '@/lib/database';
                       ~~~~~~~~~~~~~~~~

src/services/ai/PredictiveAnalyticsService.ts:346:28 - error TS7006: Parameter 'row' implicitly has an 'any' type.

346     return result.rows.map(row => ({
                               ~~~

src/services/ai/SupplierIntelligenceService.ts:83:28 - error TS2304: Cannot find name 'pool'.

83       const result = await pool.query(query, params);
                              ~~~~

src/services/ai/SupplierIntelligenceService.ts:179:28 - error TS2304: Cannot find name 'pool'.

179       const result = await pool.query(query, [
                               ~~~~

src/services/ai/SupplierIntelligenceService.ts:260:28 - error TS2304: Cannot find name 'pool'.

260       const result = await pool.query(query, [supplierId]);
                               ~~~~

src/services/ai/SupplierIntelligenceService.ts:416:26 - error TS2304: Cannot find name 'pool'.

416     const result = await pool.query(`
                             ~~~~

src/types/nxt-spp.ts:44:18 - error TS2554: Expected 2-3 arguments, but got 1.

44   errors_json: z.record(z.any()).nullable().optional(),
                    ~~~~~~

  node_modules/zod/v4/classic/schemas.d.cts:482:107
    482 export declare function record<Key extends core.$ZodRecordKey, Value extends core.SomeType>(keyType: Key, valueType: Value, params?: string | core.$ZodRecordParams): ZodRecord<Key, Value>;
                                                                                                                  ~~~~~~~~~~~~~~~~
    An argument for 'valueType' was not provided.

src/types/nxt-spp.ts:81:17 - error TS2554: Expected 2-3 arguments, but got 1.

81   attrs_json: z.record(z.any()).optional()
                   ~~~~~~

  node_modules/zod/v4/classic/schemas.d.cts:482:107
    482 export declare function record<Key extends core.$ZodRecordKey, Value extends core.SomeType>(keyType: Key, valueType: Value, params?: string | core.$ZodRecordParams): ZodRecord<Key, Value>;
                                                                                                                  ~~~~~~~~~~~~~~~~
    An argument for 'valueType' was not provided.

src/types/nxt-spp.ts:148:17 - error TS2554: Expected 2-3 arguments, but got 1.

148   attrs_json: z.record(z.any()).optional(),
                    ~~~~~~

  node_modules/zod/v4/classic/schemas.d.cts:482:107
    482 export declare function record<Key extends core.$ZodRecordKey, Value extends core.SomeType>(keyType: Key, valueType: Value, params?: string | core.$ZodRecordParams): ZodRecord<Key, Value>;
                                                                                                                  ~~~~~~~~~~~~~~~~
    An argument for 'valueType' was not provided.

src/types/nxt-spp.ts:209:17 - error TS2554: Expected 2-3 arguments, but got 1.

209   attrs_json: z.record(z.any()).optional()
                    ~~~~~~

  node_modules/zod/v4/classic/schemas.d.cts:482:107
    482 export declare function record<Key extends core.$ZodRecordKey, Value extends core.SomeType>(keyType: Key, valueType: Value, params?: string | core.$ZodRecordParams): ZodRecord<Key, Value>;
                                                                                                                  ~~~~~~~~~~~~~~~~
    An argument for 'valueType' was not provided.

src/types/supplier-portfolio.ts:142:18 - error TS2430: Interface 'ProductTableBySupplier' incorrectly extends interface 'SupplierProduct'.
  Types of property 'previous_price' are incompatible.
    Type 'number | null' is not assignable to type 'number | undefined'.
      Type 'null' is not assignable to type 'number | undefined'.

142 export interface ProductTableBySupplier extends SupplierProduct {
                     ~~~~~~~~~~~~~~~~~~~~~~

src/utils/dataValidation.ts:40:14 - error TS2323: Cannot redeclare exported variable 'TimestampValidator'.

40 export class TimestampValidator {
                ~~~~~~~~~~~~~~~~~~

src/utils/dataValidation.ts:250:14 - error TS2323: Cannot redeclare exported variable 'NumberValidator'.

250 export class NumberValidator {
                 ~~~~~~~~~~~~~~~

src/utils/dataValidation.ts:378:14 - error TS2323: Cannot redeclare exported variable 'StringValidator'.

378 export class StringValidator {
                 ~~~~~~~~~~~~~~~

src/utils/dataValidation.ts:456:14 - error TS2323: Cannot redeclare exported variable 'ArrayValidator'.

456 export class ArrayValidator {
                 ~~~~~~~~~~~~~~

src/utils/dataValidation.ts:554:14 - error TS2323: Cannot redeclare exported variable 'DataSanitizer'.

554 export class DataSanitizer {
                 ~~~~~~~~~~~~~

src/utils/dataValidation.ts:654:14 - error TS2323: Cannot redeclare exported variable 'SafeSorter'.

654 export class SafeSorter {
                 ~~~~~~~~~~

src/utils/dataValidation.ts:711:3 - error TS2323: Cannot redeclare exported variable 'TimestampValidator'.

711   TimestampValidator,
      ~~~~~~~~~~~~~~~~~~

src/utils/dataValidation.ts:711:3 - error TS2484: Export declaration conflicts with exported declaration of 'TimestampValidator'.

711   TimestampValidator,
      ~~~~~~~~~~~~~~~~~~

src/utils/dataValidation.ts:712:3 - error TS2323: Cannot redeclare exported variable 'NumberValidator'.

712   NumberValidator,
      ~~~~~~~~~~~~~~~

src/utils/dataValidation.ts:712:3 - error TS2484: Export declaration conflicts with exported declaration of 'NumberValidator'.

712   NumberValidator,
      ~~~~~~~~~~~~~~~

src/utils/dataValidation.ts:713:3 - error TS2323: Cannot redeclare exported variable 'StringValidator'.

713   StringValidator,
      ~~~~~~~~~~~~~~~

src/utils/dataValidation.ts:713:3 - error TS2484: Export declaration conflicts with exported declaration of 'StringValidator'.

713   StringValidator,
      ~~~~~~~~~~~~~~~

src/utils/dataValidation.ts:714:3 - error TS2323: Cannot redeclare exported variable 'ArrayValidator'.

714   ArrayValidator,
      ~~~~~~~~~~~~~~

src/utils/dataValidation.ts:714:3 - error TS2484: Export declaration conflicts with exported declaration of 'ArrayValidator'.

714   ArrayValidator,
      ~~~~~~~~~~~~~~

src/utils/dataValidation.ts:715:3 - error TS2323: Cannot redeclare exported variable 'DataSanitizer'.

715   DataSanitizer,
      ~~~~~~~~~~~~~

src/utils/dataValidation.ts:715:3 - error TS2484: Export declaration conflicts with exported declaration of 'DataSanitizer'.

715   DataSanitizer,
      ~~~~~~~~~~~~~

src/utils/dataValidation.ts:716:3 - error TS2323: Cannot redeclare exported variable 'SafeSorter'.

716   SafeSorter
      ~~~~~~~~~~

src/utils/dataValidation.ts:716:3 - error TS2484: Export declaration conflicts with exported declaration of 'SafeSorter'.

716   SafeSorter
      ~~~~~~~~~~

src/utils/resilientApi.ts:84:27 - error TS2802: Type 'Map<string, { data: any; timestamp: number; expiresAt: number; etag?: string | undefined; }>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.

84       for (const [key] of this.cache) {
                             ~~~~~~~~~~

src/utils/resilientApi.ts:96:44 - error TS18048: 'entry' is possibly 'undefined'.

96     return entry !== null && Date.now() <= entry.expiresAt
                                              ~~~~~

src/utils/resilientApi.ts:428:56 - error TS2345: Argument of type 'Partial<ApiConfig> | undefined' is not assignable to parameter of type 'Partial<RetryConfig> | undefined'.
  Type 'Partial<ApiConfig>' has no properties in common with type 'Partial<RetryConfig>'.

428     return this.makeRequest<T>(url, { method: 'GET' }, config)
                                                           ~~~~~~

src/utils/resilientApi.ts:435:8 - error TS2345: Argument of type 'Partial<ApiConfig> | undefined' is not assignable to parameter of type 'Partial<RetryConfig> | undefined'.
  Type 'Partial<ApiConfig>' has no properties in common with type 'Partial<RetryConfig>'.

435     }, config)
           ~~~~~~

src/utils/resilientApi.ts:442:8 - error TS2345: Argument of type 'Partial<ApiConfig> | undefined' is not assignable to parameter of type 'Partial<RetryConfig> | undefined'.
  Type 'Partial<ApiConfig>' has no properties in common with type 'Partial<RetryConfig>'.

442     }, config)
           ~~~~~~

src/utils/resilientApi.ts:449:8 - error TS2345: Argument of type 'Partial<ApiConfig> | undefined' is not assignable to parameter of type 'Partial<RetryConfig> | undefined'.
  Type 'Partial<ApiConfig>' has no properties in common with type 'Partial<RetryConfig>'.

449     }, config)
           ~~~~~~

src/utils/resilientApi.ts:453:59 - error TS2345: Argument of type 'Partial<ApiConfig> | undefined' is not assignable to parameter of type 'Partial<RetryConfig> | undefined'.
  Type 'Partial<ApiConfig>' has no properties in common with type 'Partial<RetryConfig>'.

453     return this.makeRequest<T>(url, { method: 'DELETE' }, config)
                                                              ~~~~~~


Found 1610 errors in 320 files.

Errors  Files
     2  .next/types/validator.ts:648
     4  docs/0 PLANNING/Phase 5/api_samples/inventory_adjustments_route.ts:6
     2  docs/0 PLANNING/Phase 5/api_samples/inventory_batch_put_route.ts:5
     2  docs/0 PLANNING/Phase 5/api_samples/stock_movements_route.ts:6
     4  docs/0 PLANNING/Phase 5/orm/drizzle/phase5_schema.ts:3
    18  lib/data-import/BulkPriceListProcessor.ts:153
     1  lib/database/enterprise-connection-manager.ts:512
     3  lib/database/neon-connection.ts:130
     1  playwright.config.ts:59
     5  scripts/import_master_dataset.ts:157
     8  scripts/test-pricelist-upload.ts:39
     5  scripts/validate-api-endpoints.ts:16
     1  scripts/validate-database.ts:24
     9  scripts/verify_integration.ts:49
     3  src/app/admin/audit/page.tsx:267
    30  src/app/admin/organization/page.tsx:14
     8  src/app/admin/settings/currency/page.tsx:21
     6  src/app/admin/users/page.tsx:19
     1  src/app/ai-insights/page.tsx:392
    18  src/app/api/activities/recent/route.ts:2
     1  src/app/api/ai/analytics/anomalies/route.ts:82
    12  src/app/api/ai/analyze/route.ts:4
     7  src/app/api/ai/chat/route.ts:3
     2  src/app/api/ai/data/analyze/route.ts:22
     6  src/app/api/ai/data/anomalies/route.ts:16
     5  src/app/api/ai/data/predictions/route.ts:17
     2  src/app/api/ai/data/query/route.ts:19
    12  src/app/api/ai/generate/route.ts:4
     2  src/app/api/ai/insights/generate/route.ts:178
     1  src/app/api/ai/suppliers/discover/route.ts:56
     5  src/app/api/ai/suppliers/discover/route.v5.example.ts:289
     7  src/app/api/alerts/optimized-route.ts:9
     1  src/app/api/alerts/route.optimized.ts:317
     2  src/app/api/alerts/route.ts:173
     1  src/app/api/analytics/anomalies/route.ts:7
     1  src/app/api/analytics/comprehensive/route.ts:2
     1  src/app/api/analytics/dashboard/route.ts:85
     3  src/app/api/analytics/predictions/route.ts:7
     5  src/app/api/analytics/recommendations/route.ts:7
    23  src/app/api/analytics/system/route.ts:3
     2  src/app/api/auth/login/route.ts:7
     1  src/app/api/backend-health/route.ts:7
     1  src/app/api/core/selections/[id]/activate/route.ts:2
     1  src/app/api/core/selections/[id]/items/route.ts:2
     1  src/app/api/core/selections/active/route.ts:2
     1  src/app/api/core/selections/catalog/route.ts:6
     2  src/app/api/core/selections/route.ts:6
     2  src/app/api/core/selections/workflow/route.ts:6
     1  src/app/api/core/suppliers/products/route.ts:6
     1  src/app/api/core/suppliers/products/table/route.ts:6
     2  src/app/api/core/suppliers/route.ts:2
     1  src/app/api/dashboard/real-stats/route.ts:11
     7  src/app/api/health/database-enterprise/route.ts:7
     5  src/app/api/health/database/route.ts:7
     8  src/app/api/health/frontend/route.ts:2
     6  src/app/api/health/pipeline/route.ts:7
     7  src/app/api/health/route.ts:2
     2  src/app/api/inventory/[id]/route.ts:4
     2  src/app/api/inventory/adjustments/route.ts:2
     7  src/app/api/inventory/alerts/route.ts:2
     2  src/app/api/inventory/analytics/route.ts:2
     2  src/app/api/inventory/batch/route.ts:2
     8  src/app/api/inventory/complete/route.ts:7
     6  src/app/api/inventory/detailed/[itemId]/route.ts:2
    20  src/app/api/inventory/enhanced/route.ts:3
     3  src/app/api/inventory/products/[id]/route.ts:2
     4  src/app/api/inventory/products/route.ts:2
     1  src/app/api/inventory/route.ts:4
     2  src/app/api/inventory/trends/route.ts:2
     7  src/app/api/pricelists/process/route.ts:3
     2  src/app/api/products/catalog/route.ts:2
     5  src/app/api/purchase-orders/analytics/route.ts:2
     5  src/app/api/purchase-orders/route.ts:2
     3  src/app/api/serve/nxt-soh/route.ts:20
     2  src/app/api/serve/soh/import/route.ts:6
     2  src/app/api/serve/soh/rolled-up/route.ts:6
     2  src/app/api/serve/soh/route.ts:6
     1  src/app/api/serve/soh/value/route.ts:6
     2  src/app/api/spp/merge/route.ts:6
     1  src/app/api/spp/upload/route.ts:8
     2  src/app/api/spp/uploads/[id]/route.ts:10
     2  src/app/api/spp/validate/route.ts:6
     6  src/app/api/stock-movements/route.ts:3
     1  src/app/api/supplier-products/route.ts:135
     2  src/app/api/suppliers/[id]/inventory/route.ts:2
     2  src/app/api/suppliers/[id]/route.ts:2
    11  src/app/api/suppliers/bulk-import/route.ts:2
     1  src/app/api/suppliers/discovery/health/route.ts:7
    11  src/app/api/suppliers/discovery/route.ts:8
     8  src/app/api/suppliers/enhanced/route.ts:3
     1  src/app/api/suppliers/metrics/route.ts:2
    11  src/app/api/suppliers/pricelists/import/route.ts:2
     4  src/app/api/suppliers/pricelists/promote/route.deprecated.ts:2
     4  src/app/api/suppliers/pricelists/promote/route.ts:2
    12  src/app/api/suppliers/pricelists/route.ts:2
     6  src/app/api/suppliers/pricelists/upload/enhanced-route.ts:4
     8  src/app/api/suppliers/pricelists/upload/live-route.ts:9
     8  src/app/api/suppliers/pricelists/upload/route.ts:52
     2  src/app/api/suppliers/real-data/route.ts:2
    18  src/app/api/suppliers/route.optimized.ts:2
     3  src/app/api/suppliers/route.ts:5
     6  src/app/api/suppliers/v3/[id]/route.ts:8
    13  src/app/api/suppliers/v3/ai/discover/route.ts:8
     6  src/app/api/suppliers/v3/export/route.ts:8
     6  src/app/api/suppliers/v3/route.ts:8
     2  src/app/api/test/live/route.ts:7
     2  src/app/api/upload/xlsx/route.ts:7
     3  src/app/api/v2/inventory/[id]/route.ts:6
     5  src/app/api/v2/inventory/route.ts:6
     2  src/app/api/v2/inventory/upload/route.ts:7
     6  src/app/api/v2/suppliers/[id]/route.ts:6
     8  src/app/api/v2/suppliers/route.ts:6
     1  src/app/api/verify/product-inventory/route.ts:2
     3  src/app/api/warehouses/[id]/route.ts:3
     9  src/app/api/warehouses/route.ts:306
     1  src/app/auth/forgot-password/page.tsx:11
     2  src/app/auth/login/page.tsx:18
     2  src/app/auth/register/page.tsx:19
     3  src/app/auth/two-factor/page.tsx:16
     1  src/app/auth/verify-email/page.tsx:19
     1  src/app/auth/verify-email/page_fixed.tsx:17
     2  src/app/invoices/page.tsx:97
     2  src/app/layout.tsx:3
     1  src/app/messages/page.tsx:358
     1  src/app/nxt-spp/page.tsx:29
     1  src/app/page_broken.tsx:17
     1  src/app/payments/page.tsx:44
     2  src/app/purchase-orders/page.tsx:113
     3  src/app/suppliers/pricelists/[id]/promote/page.tsx:12
     6  src/app/zar-dashboard.tsx:37
     1  src/components/ai/ChatInterface.tsx:597
     1  src/components/ai/ChatInterfaceV5.tsx:104
     1  src/components/analytics/PredictiveCharts.tsx:440
     1  src/components/dashboard/ActivityFeed.tsx:13
     2  src/components/dashboard/EnhancedSupplierDashboard.tsx:33
    31  src/components/dashboard/InventoryDashboard.tsx:46
     1  src/components/dashboard/OptimizedDashboard.tsx:24
    15  src/components/dashboard/RealDataDashboard.tsx:75
     2  src/components/dashboard/RealTimeDashboard.tsx:18
    42  src/components/examples/ComprehensiveSupplierUI.tsx:8
     2  src/components/fallbacks/FallbackComponents.tsx:297
     6  src/components/inventory/AddProductDialog.tsx:33
     1  src/components/inventory/DetailedInventoryModal.tsx:829
     4  src/components/inventory/EditProductDialog.tsx:33
     3  src/components/inventory/EnhancedInventoryDashboard.tsx:263
     1  src/components/inventory/ErrorBoundary.tsx:100
     1  src/components/inventory/InventoryChart.tsx:163
     8  src/components/inventory/InventoryDetailView.tsx:99
    16  src/components/inventory/InventoryManagement.tsx:63
     1  src/components/inventory/NextJsXlsxConverter.tsx:661
     2  src/components/inventory/NotificationSystem.tsx:122
     1  src/components/inventory/PriceListUploader.tsx:15
     1  src/components/inventory/ProductDetailsDialog.tsx:30
    25  src/components/inventory/ProductStockManagement.tsx:57
     5  src/components/inventory/StockAdjustmentDialog.tsx:35
     2  src/components/inventory/StockAlertSystem.tsx:37
    40  src/components/inventory/SupplierInventoryView.tsx:12
     2  src/components/inventory/UploadFeedbackSystem.tsx:10
     1  src/components/inventory/WarehouseManagement.tsx:47
     1  src/components/layout/AdminLayout.tsx:4
     2  src/components/layout/SelfContainedLayout.tsx:6
     1  src/components/layout/ViewportAdminLayout.tsx:4
     1  src/components/products/ProductCatalogGrid.tsx:50
     1  src/components/products/RealProductCatalog.tsx:56
     1  src/components/purchase-orders/ApprovalWorkflow.tsx:21
     2  src/components/purchase-orders/BulkOperations.tsx:42
     1  src/components/purchase-orders/POCreationWizard.tsx:35
     1  src/components/purchase-orders/POTemplates.tsx:45
     4  src/components/purchase-orders/PurchaseOrdersManagement.tsx:33
     1  src/components/spp/AnimatedComponents.tsx:8
     1  src/components/spp/ErrorStates.tsx:23
     2  src/components/spp/MetricsDashboard.tsx:23
     1  src/components/spp/PortfolioDashboard.tsx:32
     1  src/components/supplier-portfolio/EnhancedPricelistUpload.tsx:43
     1  src/components/supplier-portfolio/ISIWizard.tsx:37
     5  src/components/supplier-portfolio/ISSohReports.tsx:55
     1  src/components/supplier-portfolio/PortfolioDashboard.tsx:30
     3  src/components/supplier-portfolio/SupplierProductDataTable.tsx:71
    23  src/components/supplier/EnhancedSupplierForm.tsx:22
     3  src/components/supplier/SupplierDashboard.tsx:8
     3  src/components/supplier/SupplierDiscoveryWidget.tsx:17
     1  src/components/suppliers/ai/AIEnhancedSupplierForm.tsx:286
     4  src/components/suppliers/ai/AISupplierDiscoveryPanel.tsx:37
     2  src/components/suppliers/ai/AISupplierInsightsPanel.tsx:171
     3  src/components/suppliers/AIEnhancedSupplierDashboard.tsx:349
    21  src/components/suppliers/EnhancedSupplierDashboard.tsx:45
    43  src/components/suppliers/EnhancedSupplierForm.tsx:45
     4  src/components/suppliers/SupplierDirectory.tsx:43
    43  src/components/suppliers/SupplierForm.tsx:30
    11  src/components/suppliers/SupplierManagement.tsx:67
    11  src/components/suppliers/SupplierManagement_backup.tsx:67
     3  src/components/suppliers/UnifiedSupplierDashboard.tsx:53
     3  src/components/test/TimestampValidationTest.tsx:21
    11  src/components/ui/accessibility/AccessibilityProvider.tsx:9
     1  src/components/ui/alert.tsx:4
     1  src/components/ui/avatar.tsx:6
     1  src/components/ui/badge.tsx:5
     1  src/components/ui/breadcrumb.tsx:5
     1  src/components/ui/button.tsx:5
     1  src/components/ui/calendar.tsx:7
     1  src/components/ui/card.tsx:3
     1  src/components/ui/checkbox.tsx:7
     3  src/components/ui/data-table/EnhancedDataTable.tsx:74
     1  src/components/ui/dialog.tsx:7
     1  src/components/ui/dropdown-menu.tsx:7
     3  src/components/ui/empty-states.tsx:6
     1  src/components/ui/error-boundary.tsx:8
     1  src/components/ui/error-states.tsx:4
     1  src/components/ui/fallback-states.tsx:8
     1  src/components/ui/form.tsx:16
    13  src/components/ui/indicators/DataFreshnessIndicators.tsx:95
     1  src/components/ui/input.tsx:3
     1  src/components/ui/label.tsx:7
     5  src/components/ui/loading/LoadingStates.tsx:41
     1  src/components/ui/popover.tsx:6
     1  src/components/ui/progress.tsx:6
     1  src/components/ui/ResponsiveUIManager.tsx:590
     1  src/components/ui/SafeLink.tsx:7
     1  src/components/ui/scroll-area.tsx:6
    36  src/components/ui/search/UnifiedSearchSystem.tsx:314
     1  src/components/ui/select.tsx:7
     1  src/components/ui/separator.tsx:6
     1  src/components/ui/sheet.tsx:7
     1  src/components/ui/sidebar.tsx:8
     1  src/components/ui/skeleton.tsx:2
     1  src/components/ui/stepper.tsx:4
     1  src/components/ui/switch.tsx:6
     1  src/components/ui/SystemHealthMonitor.tsx:483
     1  src/components/ui/table.tsx:3
     1  src/components/ui/tabs.tsx:6
     1  src/components/ui/textarea.tsx:3
     1  src/components/ui/tooltip.tsx:6
     1  src/hooks/api/useAnalyticsOverview.ts:9
     1  src/hooks/api/useDashboardMetrics.ts:9
     2  src/hooks/api/useInvalidation.ts:10
     1  src/hooks/api/useInventoryList.ts:9
     1  src/hooks/useAISupplier.ts:153
    10  src/hooks/useRealTimeData.ts:386
    46  src/hooks/useRealTimeDataFixed.ts:65
     1  src/hooks/useSupplierDiscovery.ts:6
     2  src/hooks/useSuppliers.ts:116
    10  src/lib/ai/config.ts:90
     6  src/lib/ai/database-integration.ts:146
    11  src/lib/ai/providers.ts:239
     9  src/lib/ai/services/base.ts:2
     9  src/lib/ai/services/chat.ts:64
     7  src/lib/ai/services/embedding.ts:82
     1  src/lib/ai/services/index.ts:76
     1  src/lib/ai/services/response.ts:2
     5  src/lib/ai/services/text.ts:77
    11  src/lib/analytics/advanced-ml-models.ts:56
    34  src/lib/analytics/analytics-integration.ts:113
     3  src/lib/analytics/automated-optimization.ts:364
     2  src/lib/analytics/data-processor.ts:209
     7  src/lib/analytics/intelligent-recommendations.ts:153
     2  src/lib/analytics/ml-models.ts:291
     2  src/lib/analytics/performance-optimizer.ts:380
    18  src/lib/analytics/predictive-analytics.ts:301
     4  src/lib/analytics/query-optimizer.ts:125
     3  src/lib/analytics/real-time-anomaly-detection.ts:609
     3  src/lib/api-client.ts:210
     1  src/lib/api/error-handler.ts:8
    10  src/lib/api/middleware.ts:7
     4  src/lib/api/supplier-portfolio-client-enhanced.ts:32
     8  src/lib/api/suppliers.ts:3
     4  src/lib/api/validation.ts:20
     1  src/lib/auth.ts:9
    11  src/lib/auth/auth-context.tsx:4
     3  src/lib/auth/multi-tenant-auth.ts:215
     4  src/lib/auth/validation.ts:143
     3  src/lib/bulletproof-fetch.ts:100
     2  src/lib/cache/event-bus.ts:61
     2  src/lib/cache/event-invalidation.ts:14
     1  src/lib/cache/query-cache.ts:131
     2  src/lib/config/currency-config.ts:215
     1  src/lib/database/connection-resolver.ts:7
     1  src/lib/database/transaction-helper.ts:194
     2  src/lib/error-handling/upload-error-manager.ts:325
     1  src/lib/integrations/xlsx-processor.ts:440
     1  src/lib/logging/error-logger.ts:6
     4  src/lib/monitoring/performance-monitor.ts:323
     3  src/lib/notifications/live-notifications.ts:161
     6  src/lib/offline-manager.ts:182
     1  src/lib/pipeline/cache-manager.ts:182
    10  src/lib/realtime/websocket-server.ts:6
     2  src/lib/security/index.ts:117
    13  src/lib/services/InventorySelectionService.ts:15
     8  src/lib/services/PriceListProcessor.ts:7
    13  src/lib/services/PricelistService.ts:13
    11  src/lib/services/StockService.ts:13
     5  src/lib/services/SupplierProductService.ts:231
     1  src/lib/stores/neon-spp-store.ts:119
    10  src/lib/stores/notification-store.ts:3
     8  src/lib/stores/supplier-store.ts:9
     1  src/lib/supplier-discovery/engine.ts:110
     2  src/lib/supplier-discovery/extractors.ts:132
     1  src/lib/supplier-discovery/processor.ts:49
     1  src/lib/supplier-discovery/utils.ts:366
    32  src/lib/suppliers/core/SupplierRepository.ts:7
     2  src/lib/suppliers/services/SupplierExportService.ts:321
     4  src/lib/types/inventory.ts:397
     9  src/lib/upload/error-handler.ts:2
     1  src/lib/upload/file-parser.ts:312
     4  src/lib/upload/transaction-manager.ts:2
     4  src/lib/utils/api-helpers.ts:141
     1  src/lib/utils/dataValidation.ts:176
     1  src/lib/utils/error-reporting.ts:6
     2  src/lib/utils/neon-error-handler.ts:49
     3  src/lib/utils/nxt-spp-helpers.ts:12
     4  src/lib/utils/safe-data.ts:391
     1  src/lib/utils/transformers/inventory.ts:1
     2  src/lib/validation/inventory-validator.ts:342
     2  src/middleware/query-validator.ts:13
     1  src/middleware/schema-validator.ts:11
     2  src/services/ai/PredictiveAnalyticsService.ts:6
     4  src/services/ai/SupplierIntelligenceService.ts:83
     4  src/types/nxt-spp.ts:44
     1  src/types/supplier-portfolio.ts:142
    18  src/utils/dataValidation.ts:40
     7  src/utils/resilientApi.ts:84
(base) PS K:\00Project\MantisNXT> 