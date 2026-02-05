# No-Mock / No-Fallback Audit

Generated: 2026-02-06 00:49:28
Scope: src, lib, database, docs

This file lists occurrences of patterns indicating mock data, randomization, or fallback logic.

docs\ai-alert-service-implementation.md:5:Production AI Alert Service has been successfully implemented to replace mock implementations in the MantisNXT system. This service provides comprehensive alert management capabilities for all AI services.
docs\ai-alert-service-implementation.md:201:All TODO comments and mock implementations have been replaced with production code:
docs\ai-alert-service-implementation.md:315:? **No mock data** - real database integration  
docs\COMPETITIVE_INTELLIGENCE_INTEGRATION.md:17:4. Environment variable (`DEFAULT_ORG_ID`)
docs\COMPETITIVE_INTELLIGENCE_INTEGRATION.md:18:5. Database lookup (fallback)
lib\database\spp-connection-manager.ts:8: * Connection priority: DATABASE_URL (unified) ? ENTERPRISE_DATABASE_URL (fallback)
lib\database\spp-connection-manager.ts:27:function parseIntEnv(key: string, fallback: number): number {
lib\database\spp-connection-manager.ts:29:  if (!value) return fallback;
lib\database\spp-connection-manager.ts:31:  return Number.isNaN(parsed) ? fallback : parsed;
lib\database\neon-connection.ts:20:    // Convert $1 style to tagged template: split by placeholders and interpolate values
src\utils\resilientApi.ts:243:  return delayWithCap + (Math.random() - 0.5) * 2 * jitterAmount;
src\utils\resilientApi.ts:333:    const requestId = `${Date.now()}-${Math.random()}`;
lib\data-import\BulkPriceListProcessor.ts:606:    return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
lib\data-import\BulkPriceListProcessor.ts:612:    const random = Math.random().toString(36).substring(2, 6);
lib\database\enterprise-connection-manager.ts:167:          connectionString: 'postgres://placeholder:placeholder@localhost:5432/placeholder',
lib\database\enterprise-connection-manager.ts:198:  private parseIntEnv(key: string, fallback: number): number {
lib\database\enterprise-connection-manager.ts:202:      return fallback;
lib\database\enterprise-connection-manager.ts:207:    return Number.isNaN(parsed) ? fallback : parsed;
lib\database\enterprise-connection-manager.ts:210:  private parseBoolEnv(key: string, fallback: boolean): boolean {
lib\database\enterprise-connection-manager.ts:214:      return fallback;
lib\database\enterprise-connection-manager.ts:433:      return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
lib\database\enterprise-connection-manager.ts:438:    // Normalize SQL by replacing parameter placeholders with ?
docs\ai\METRICS_QUICK_REFERENCE.md:185:DEFAULT_ORG_ID=00000000-0000-0000-0000-000000000000
docs\ai\metrics-service.md:559:- [ ] Set `DEFAULT_ORG_ID` environment variable
docs\ACCOUNT_MANAGEMENT_ARCHITECTURE.md:32:| `/api/auth/login` | POST | ?? Mock | Uses hardcoded mock users, NOT database |
docs\ACCOUNT_MANAGEMENT_ARCHITECTURE.md:33:| `/api/auth/status` | GET | ?? Mock | Checks mock session |
docs\ACCOUNT_MANAGEMENT_ARCHITECTURE.md:37:| `/api/v1/users/me` | GET/PUT | ?? Partial | GET real, PUT uses mock |
docs\ACCOUNT_MANAGEMENT_ARCHITECTURE.md:38:| `/api/v1/admin/users` | GET/POST | ?? Partial | GET real, POST uses mock |
docs\ACCOUNT_MANAGEMENT_ARCHITECTURE.md:39:| `/api/v1/admin/users/[id]` | GET/PUT/DELETE | ?? Partial | Uses mock provider |
docs\ACCOUNT_MANAGEMENT_ARCHITECTURE.md:60:| `AuthProvider` | `src/lib/auth/auth-context.tsx` | ?? Uses mock provider |
docs\ACCOUNT_MANAGEMENT_ARCHITECTURE.md:88:| `MockAuthProvider` | `src/lib/auth/mock-provider.ts` | ?? Currently used by frontend |
docs\ACCOUNT_MANAGEMENT_ARCHITECTURE.md:100:    A[Frontend AuthProvider] -->|Uses| B[mockAuthProvider]
docs\ACCOUNT_MANAGEMENT_ARCHITECTURE.md:115:| Frontend uses mock auth, not real DB | ?? Critical | No real authentication |
docs\ACCOUNT_MANAGEMENT_ARCHITECTURE.md:116:| Login API uses hardcoded mock users | ?? Critical | Cannot add new users |
docs\ACCOUNT_MANAGEMENT_ARCHITECTURE.md:121:| Admin user creation uses mock | ?? High | Created users not persisted |
docs\ACCOUNT_MANAGEMENT_ARCHITECTURE.md:508:2. [ ] Fix login API to use database, not mock users
docs\ACCOUNT_MANAGEMENT_ARCHITECTURE.md:592:| `src/lib/auth/auth-context.tsx` | Replace mockAuthProvider with API calls |
docs\ACCOUNT_MANAGEMENT_ARCHITECTURE.md:593:| `src/app/api/auth/login/route.ts` | Remove mock users, use neonAuthService |
docs\ACCOUNT_MANAGEMENT_ARCHITECTURE.md:594:| `src/app/api/v1/admin/users/route.ts` | POST: Remove mock provider import |
docs\ACCOUNT_MANAGEMENT_ARCHITECTURE.md:595:| `src/app/api/v1/users/me/route.ts` | PUT: Remove mock provider import |
docs\deployment\AUTH_SYSTEM_DEPLOYMENT_RUNBOOK.md:31:Deploy MantisNXT's comprehensive authentication system with **zero downtime** and **100% data integrity**, transitioning from mock auth (`DISABLE_AUTH=true`) to production-ready Neon Auth (Stack Auth) integration with full RBAC capabilities.
docs\deployment\AUTH_SYSTEM_DEPLOYMENT_RUNBOOK.md:1063:      // Fast-forward time (mock)
src\utils\dataValidation.ts:5: * Handles malformed data, invalid timestamps, and provides safe fallbacks
src\utils\dataValidation.ts:24:  fallbackToNow?: boolean;
src\utils\dataValidation.ts:34:  fallback?: number;
src\utils\dataValidation.ts:52:      fallbackToNow = false,
src\utils\dataValidation.ts:73:      if (fallbackToNow) {
src\utils\dataValidation.ts:130:        if (fallbackToNow) {
src\utils\dataValidation.ts:146:        if (fallbackToNow) {
src\utils\dataValidation.ts:158:        if (fallbackToNow) {
src\utils\dataValidation.ts:175:      if (fallbackToNow) {
src\utils\dataValidation.ts:187:   * Safe timestamp formatting with fallbacks
src\utils\dataValidation.ts:192:    fallback: string = 'Invalid Date'
src\utils\dataValidation.ts:194:    const validation = this.validate(value, { fallbackToNow: false });
src\utils\dataValidation.ts:197:      return fallback;
src\utils\dataValidation.ts:204:      return fallback;
src\utils\dataValidation.ts:211:  static formatRelativeSafe(value: unknown, fallback: string = 'Unknown time'): string {
src\utils\dataValidation.ts:212:    const validation = this.validate(value, { fallbackToNow: false });
src\utils\dataValidation.ts:215:      return fallback;
src\utils\dataValidation.ts:222:      return fallback;
src\utils\dataValidation.ts:230:    const aValidation = this.validate(a, { fallbackToNow: false, allowNull: true });
src\utils\dataValidation.ts:231:    const bValidation = this.validate(b, { fallbackToNow: false, allowNull: true });
src\utils\dataValidation.ts:255:    const { min, max, allowNull = false, fallback = 0, decimals } = options;
src\utils\dataValidation.ts:272:      result.data = fallback;
src\utils\dataValidation.ts:275:      result.warnings.push(`Null value replaced with fallback: ${fallback}`);
src\utils\dataValidation.ts:290:        result.data = fallback;
src\utils\dataValidation.ts:298:        result.data = fallback;
src\utils\dataValidation.ts:333:      result.data = fallback;
src\utils\dataValidation.ts:342:   * Safe number formatting with fallbacks
src\utils\dataValidation.ts:352:    fallback: string = '0'
src\utils\dataValidation.ts:357:      return fallback;
src\utils\dataValidation.ts:364:      return fallback;
src\utils\dataValidation.ts:382:      fallback?: string;
src\utils\dataValidation.ts:391:      fallback = '',
src\utils\dataValidation.ts:405:      str = fallback;
src\utils\dataValidation.ts:420:      str = fallback;
src\utils\dataValidation.ts:460:      fallback?: T[];
src\utils\dataValidation.ts:468:      fallback = [],
src\utils\dataValidation.ts:484:      arr = fallback;
src\utils\dataValidation.ts:556:        id: `fallback-${Date.now()}`,
src\utils\dataValidation.ts:566:      { fallbackToNow: true }
src\utils\dataValidation.ts:571:      id: StringValidator.validate(data.id, { fallback: `item-${Date.now()}` }).data,
src\utils\dataValidation.ts:573:      type: StringValidator.validate(data.type, { fallback: 'general' }).data,
src\utils\dataValidation.ts:574:      description: StringValidator.validate(data.description, { fallback: 'No description' }).data,
src\utils\dataValidation.ts:575:      amount: NumberValidator.validate(data.amount, { fallback: 0, decimals: 2 }).data,
src\utils\dataValidation.ts:576:      quantity: NumberValidator.validate(data.quantity, { fallback: 0, decimals: 0 }).data,
src\utils\dataValidation.ts:577:      status: StringValidator.validate(data.status, { fallback: 'unknown' }).data,
src\utils\dataValidation.ts:590:      id: StringValidator.validate(data.id, { fallback: `supplier-${Date.now()}` }).data,
src\utils\dataValidation.ts:591:      name: StringValidator.validate(data.name, { fallback: 'Unknown Supplier' }).data,
src\utils\dataValidation.ts:594:      rating: NumberValidator.validate(data.rating, { min: 0, max: 5, fallback: 0 }).data,
src\utils\dataValidation.ts:595:      created_at: TimestampValidator.validate(data.created_at, { fallbackToNow: true }).data,
src\utils\dataValidation.ts:596:      updated_at: TimestampValidator.validate(data.updated_at, { fallbackToNow: true }).data,
src\utils\dataValidation.ts:608:      id: StringValidator.validate(data.id, { fallback: `item-${Date.now()}` }).data,
src\utils\dataValidation.ts:609:      name: StringValidator.validate(data.name, { fallback: 'Unknown Item' }).data,
src\utils\dataValidation.ts:610:      sku: StringValidator.validate(data.sku, { fallback: `SKU-${Date.now()}` }).data,
src\utils\dataValidation.ts:611:      quantity: NumberValidator.validate(data.quantity, { min: 0, fallback: 0 }).data,
src\utils\dataValidation.ts:612:      price: NumberValidator.validate(data.price, { min: 0, fallback: 0, decimals: 2 }).data,
src\utils\dataValidation.ts:613:      category: StringValidator.validate(data.category, { fallback: 'uncategorized' }).data,
src\utils\dataValidation.ts:614:      created_at: TimestampValidator.validate(data.created_at, { fallbackToNow: true }).data,
src\utils\dataValidation.ts:615:      updated_at: TimestampValidator.validate(data.updated_at, { fallbackToNow: true }).data,
src\utils\dataValidation.ts:669:      const aVal = NumberValidator.validate(getNumber(a), { fallback: 0 }).data || 0;
src\utils\dataValidation.ts:670:      const bVal = NumberValidator.validate(getNumber(b), { fallback: 0 }).data || 0;
src\utils\dataValidation.ts:689:      const aVal = StringValidator.validate(getString(a), { fallback: '' }).data || '';
src\utils\dataValidation.ts:690:      const bVal = StringValidator.validate(getString(b), { fallback: '' }).data || '';
docs\DOCUSTORE_CRON_SETUP.md:76:- `DEFAULT_ORG_ID` - Default organization ID (optional, will query DB if not set)
docs\infrastructure\RATE_LIMITING.md:368:// Automatic fallback on Redis error
docs\deployment\neon-mcp.md:23:### Optional (fallback)
docs\architecture\implementation-checklist.md:473:| Cache failures | Medium | Low | Graceful degradation, fallback to database |
docs\architecture\implementation-checklist.md:475:| Third-party service outages | Medium | Low | Circuit breakers, retry logic, fallbacks |
docs\listing-standards.md:62:      <Input placeholder="Search..." />
src\middleware\extraction-rate-limit.ts:35:  // Try to get user ID as fallback
docs\LOGISTICS_MODULE_EXISTING_REVIEW.md:97:All routes follow Next.js App Router patterns but use mock data:
docs\LOGISTICS_MODULE_EXISTING_REVIEW.md:99:- **`app/api/couriers/route.ts`** - GET/POST couriers (mock data)
docs\LOGISTICS_MODULE_EXISTING_REVIEW.md:100:- **`app/api/deliveries/route.ts`** - GET/POST deliveries (mock data)
docs\LOGISTICS_MODULE_EXISTING_REVIEW.md:101:- **`app/api/deliveries/[id]/route.ts`** - GET/PUT/DELETE delivery (mock data)
docs\LOGISTICS_MODULE_EXISTING_REVIEW.md:102:- **`app/api/deliveries/[id]/status/route.ts`** - Status updates (mock data)
docs\LOGISTICS_MODULE_EXISTING_REVIEW.md:103:- **`app/api/tracking/[trackingNumber]/route.ts`** - Tracking lookup (mock data)
docs\LOGISTICS_MODULE_EXISTING_REVIEW.md:104:- **`app/api/maps/geocode/route.ts`** - Geocoding (mock SA locations)
docs\LOGISTICS_MODULE_EXISTING_REVIEW.md:105:- **`app/api/maps/directions/route.ts`** - Directions (mock response)
docs\LOGISTICS_MODULE_EXISTING_REVIEW.md:149:**Current:** All data is mock/in-memory  
docs\LOGISTICS_MODULE_EXISTING_REVIEW.md:152:- Replace all mock data arrays with database queries
docs\LOGISTICS_MODULE_EXISTING_REVIEW.md:241:**Approach:** Migrate structure, replace mock data with database calls
docs\LOGISTICS_MODULE_EXISTING_REVIEW.md:245:   - Replace mock data with service calls
docs\LOGISTICS_MODULE_EXISTING_REVIEW.md:250:   - `DeliveryService.ts` - Replace mock arrays
docs\LOGISTICS_MODULE_EXISTING_REVIEW.md:305:- ? Database layer (all mock)
docs\LOGISTICS_MODULE_EXISTING_REVIEW.md:322:2. Build service layer (replace mock data)
docs\LOGISTICS_MODULE_EXISTING_REVIEW.md:394:- **Service Layer:** 3-4 days (replace mock data, build services)
docs\LOGISTICS_MODULE_EXISTING_REVIEW.md:409:1. **Database integration** (replace mock data)
docs\LOGISTICS_MIGRATION_CHECKLIST.md:73:- [x] Supplier notification placeholder
docs\LOGISTICS_MIGRATION_CHECKLIST.md:80:- [x] Customer notification placeholder
docs\LOGISTICS_MODULE.md:61:- Customer notifications (placeholder)
docs\LOGISTICS_MODULE.md:226:4. Supplier notification is triggered (placeholder for implementation)
database\scripts\setup_fdw_issoh_to_spp.sql:6:-- Usage option 1 (replace placeholders manually):
src\types\ai.ts:107:  fallback?: AIProviderId[];
src\types\ai.ts:175:  fallbackOrder: AIProviderId[];
src\stores\activity-store.ts:67:    const id = `pulse-${Date.now()}-${Math.random()}`;
src\app\customers\page.tsx:445:              placeholder="Search customers by name, email, company, or phone..."
src\app\admin\organizations\page.tsx:239:                <Input id="orgName" placeholder="Enter organization name" />
src\app\admin\organizations\page.tsx:243:                <Input id="orgDomain" placeholder="company.mantisnxt.com" />
src\app\admin\organizations\page.tsx:249:                    <SelectValue placeholder="Select tier" />
src\app\admin\organizations\page.tsx:260:                <Input id="contactEmail" type="email" placeholder="admin@company.com" />
src\app\admin\organizations\page.tsx:328:                placeholder="Search organizations..."
database\migrations\0001_prerequisite_core_tables.sql:216:            -- This is a placeholder - actual implementation depends on auth provider
src\services\ssot\supplierService.ts:148:  const envOrgId = process.env.DEFAULT_ORG_ID;
src\app\admin\users\[id]\page.tsx:580:                          placeholder="+27 11 123 4567"
src\app\admin\users\[id]\page.tsx:638:                          <SelectValue placeholder="Select" />
src\app\admin\users\[id]\page.tsx:656:                        placeholder="8001015009087"
src\services\ssot\inventoryService.ts:99:      // Create a placeholder stock_on_hand record with qty 0 then apply delta
src\app\customers\new\page.tsx:182:                    placeholder="John Doe"
src\app\customers\new\page.tsx:198:                    placeholder="john@example.com"
src\app\customers\new\page.tsx:213:                    placeholder="+1 (555) 123-4567"
src\app\customers\new\page.tsx:228:                    placeholder="Acme Corp"
src\app\customers\new\page.tsx:302:                    placeholder="0.00"
src\app\customers\new\page.tsx:357:                    placeholder="123 Main Street"
src\app\customers\new\page.tsx:372:                    placeholder="New York"
src\app\customers\new\page.tsx:387:                    placeholder="NY"
src\app\customers\new\page.tsx:405:                    placeholder="10001"
src\app\customers\new\page.tsx:420:                    placeholder="United States"
src\app\customers\new\page.tsx:437:                    placeholder="Add a tag (e.g., vip, high-value, referral)"
src\app\customers\new\page.tsx:482:                    placeholder="Key (e.g., referral_source)"
src\app\customers\new\page.tsx:490:                    placeholder="Value (e.g., google_ads)"
src\app\customers\new\page.tsx:542:                  placeholder="Additional information about the customer..."
src\app\admin\users\bulk\page.tsx:421:                        <SelectValue placeholder="Choose a role" />
src\app\admin\users\bulk\page.tsx:469:                        <SelectValue placeholder="Choose status" />
database\validation\data_validation_rules.sql:201:    IF cleaned ~* '^(test|sample|dummy|placeholder)' THEN
database\validation\data_validation_rules.sql:203:        suggestions := suggestions || 'Name appears to be a placeholder';
src\app\admin\organization\page.tsx:22:import { mockAuthProvider } from '@/lib/auth/mock-provider';
src\app\admin\organization\page.tsx:72:        const mockOrganizations = mockAuthProvider.getMockOrganizations();
src\app\admin\organization\page.tsx:73:        const org = mockOrganizations.find(o => o.id === user?.organizationId);
src\app\admin\organization\page.tsx:238:                placeholder="Company Name"
src\app\admin\organization\page.tsx:249:                placeholder="ORG123"
src\app\admin\organization\page.tsx:262:              placeholder="https://company.co.za"
src\app\admin\organization\page.tsx:303:                placeholder="CK2024/123456/07"
src\app\admin\organization\page.tsx:324:                placeholder="4123456789"
src\app\admin\organization\page.tsx:347:                  <SelectValue placeholder="Select BEE Level" />
src\app\admin\organization\page.tsx:413:                placeholder="info@company.co.za"
src\app\admin\organization\page.tsx:434:                placeholder="+27 11 123 4567"
src\app\admin\organization\page.tsx:458:              placeholder="123 Business Park Drive"
src\app\admin\organization\page.tsx:469:              placeholder="Suite 456"
src\app\admin\organization\page.tsx:481:                placeholder="Sandton"
src\app\admin\organization\page.tsx:492:                placeholder="Johannesburg"
src\app\admin\organization\page.tsx:515:                placeholder="2196"
src\app\admin\organization\page.tsx:539:                <SelectValue placeholder="Select Province" />
src\app\docustore\page.tsx:330:      // Build folders from document types as fallback
src\app\docustore\page.tsx:548:    // Group by folder - use folder_id first, then fallback to document_type mapping
src\app\docustore\page.tsx:785:                    placeholder="Search documents..."
src\app\docustore\page.tsx:799:                    <SelectValue placeholder="Status" />
src\app\docustore\page.tsx:818:                    <SelectValue placeholder="Folder" />
docs\UI_ARCHITECTURE_PLAN.md:29:   - Real-time data with fallbacks
docs\UI_ARCHITECTURE_PLAN.md:978:5. Set up API routes with placeholder responses
src\app\admin\audit\page.tsx:378:                placeholder="Search logs..."
src\app\admin\audit\page.tsx:387:                <SelectValue placeholder="All Actions" />
src\app\admin\audit\page.tsx:401:                <SelectValue placeholder="All Status" />
src\app\admin\audit\page.tsx:414:                <SelectValue placeholder="All Resources" />
src\app\admin\supplier-rules\page.tsx:311:                      <SelectValue placeholder="Select type" />
src\app\admin\supplier-rules\page.tsx:347:                  placeholder="e.g., Join the Product List tab with Price List tab on Product Title = Description, drop the price-list SKU, set brand from tab name, map Part# to SKU, NETT EXCL to priceExVat, and Materials to category."
src\app\admin\supplier-rules\page.tsx:410:      fallback={
src\app\docustore\new\page.tsx:195:                          placeholder="e.g. Q4 Financial Report"
src\app\docustore\new\page.tsx:208:                        placeholder="Provide a brief overview of the document contents..."
src\app\docustore\new\page.tsx:295:                        placeholder="e.g. Invoice, Contract"
src\app\docustore\new\page.tsx:305:                        placeholder="Comma separated tags..."
src\app\admin\supplier-profiles\page.tsx:149:                placeholder="Supplier UUID"
src\app\admin\supplier-profiles\page.tsx:155:                placeholder="Profile name"
src\services\repairs\invoiceService.ts:54:    // This is a placeholder - adjust based on your actual invoice schema
src\app\zar-dashboard.tsx:40:} from '@/lib/mock-data/zar-dashboard-data';
src\app\directories\suppliers\page.tsx:465:                    placeholder="Search contacts..."
src\app\directories\suppliers\page.tsx:473:                    <SelectValue placeholder="Supplier" />
src\app\directories\suppliers\page.tsx:486:                    <SelectValue placeholder="Type" />
src\app\directories\suppliers\page.tsx:693:                          <SelectValue placeholder="Select supplier" />
src\app\directories\suppliers\page.tsx:715:                      <Input {...field} placeholder="John Doe" />
src\app\directories\suppliers\page.tsx:729:                        <Input {...field} type="email" placeholder="john@example.com" />
src\app\directories\suppliers\page.tsx:742:                        <Input {...field} placeholder="+1 234 567 8900" />
src\app\directories\suppliers\page.tsx:757:                        <Input {...field} placeholder="Manager" />
src\app\directories\suppliers\page.tsx:770:                        <Input {...field} placeholder="Sales" />
src\app\directories\suppliers\page.tsx:787:                            <SelectValue placeholder="Select type" />
src\app\directories\suppliers\page.tsx:869:                          <SelectValue placeholder="Select supplier" />
src\app\directories\suppliers\page.tsx:963:                            <SelectValue placeholder="Select type" />
src\app\directories\customers\page.tsx:96:                  placeholder="Search customers, contacts, or emails..."
docs\SOCIAL_MEDIA_ENV_SETUP.md:236:- [ ] Channels page shows (even with mock data)
src\services\rentals\invoiceService.ts:55:    // This is a placeholder - adjust based on your actual invoice schema
src\app\catalog\categories\(cmm)\page.tsx:100:      setError('Unable to load live category metrics. Showing placeholders instead.');
src\app\catalog\categories\(cmm)\exceptions\page.tsx:270:                            <SelectValue placeholder="Select category…" />
src\app\catalog\categories\(cmm)\exceptions\page.tsx:309:                          placeholder="Enter master SKU"
src\app\admin\settings\regional\page.tsx:322:                      placeholder="en-ZA"
src\app\admin\settings\regional\page.tsx:335:                      placeholder="en"
src\app\admin\settings\regional\page.tsx:591:                      placeholder="{street}&#10;{city}&#10;{province}&#10;{postalCode}&#10;{country}"
src\app\admin\settings\regional\page.tsx:594:                      Use placeholders: {'{street}'}, {'{city}'}, {'{province}'}, {'{postalCode}'},{' '}
src\app\admin\settings\regional\page.tsx:627:                      placeholder="+27 {area} {number}"
src\app\admin\settings\regional\page.tsx:630:                      Use placeholders: {'{area}'}, {'{number}'}
src\app\admin\settings\regional\page.tsx:644:                      placeholder="####"
src\app\payments\page.tsx:140:const mockPaymentMethods: PaymentMethod[] = [
src\app\payments\page.tsx:173:const mockBankAccounts: BankAccount[] = [
src\app\payments\page.tsx:198:const mockPayments: Payment[] = [
src\app\payments\page.tsx:259:const mockCashFlow: CashFlowProjection[] = [
src\app\payments\page.tsx:354:    return mockPayments.filter(payment => {
src\app\payments\page.tsx:446:                {mockPayments.filter(p => p.status === 'pending').length} payments
src\app\payments\page.tsx:459:                {mockPayments.filter(p => p.status === 'scheduled').length} payments
src\app\payments\page.tsx:472:                {mockPayments.filter(p => p.status === 'processing').length} payments
src\app\payments\page.tsx:488:                  mockPayments.filter(p => p.status === 'pending' && isAfter(new Date(), p.dueDate))
src\app\payments\page.tsx:522:                        placeholder="Search payments..."
src\app\payments\page.tsx:530:                        <SelectValue placeholder="Status" />
src\app\payments\page.tsx:645:                              mockPaymentMethods.find(pm => pm.name === payment.paymentMethod)
src\app\payments\page.tsx:720:                  {mockPaymentMethods.map(method => (
src\app\payments\page.tsx:802:                  {mockBankAccounts.map(account => (
src\app\payments\page.tsx:859:                    {mockCashFlow.map((flow, index) => (
src\app\payments\page.tsx:912:                        +${mockCashFlow.reduce((sum, f) => sum + f.inflow, 0).toLocaleString()}
src\app\payments\page.tsx:925:                        -${mockCashFlow.reduce((sum, f) => sum + f.outflow, 0).toLocaleString()}
src\app\payments\page.tsx:938:                        +${mockCashFlow.reduce((sum, f) => sum + f.netFlow, 0).toLocaleString()}
src\app\payments\page.tsx:953:                        ${mockCashFlow[mockCashFlow.length - 1].cumulativeBalance.toLocaleString()}
src\app\payments\page.tsx:1194:                      <SelectValue placeholder="Select supplier" />
src\app\payments\page.tsx:1205:                  <Input id="invoice" placeholder="INV-2024-004" />
src\app\payments\page.tsx:1212:                  <Input id="amount" type="number" placeholder="0.00" />
src\app\payments\page.tsx:1218:                      <SelectValue placeholder="USD" />
src\app\payments\page.tsx:1251:                      <SelectValue placeholder="Select method" />
src\app\payments\page.tsx:1254:                      {mockPaymentMethods.map(method => (
src\app\payments\page.tsx:1266:                <Textarea id="notes" placeholder="Additional payment notes..." />
src\app\payments\page.tsx:1297:                  {mockPayments
src\app\payments\page.tsx:1346:                      {mockPayments
docs\security\PHASE1_SECURITY_ASSESSMENT.md:31:- No local password hashing visible for fallback scenarios
docs\security\PHASE1_SECURITY_ASSESSMENT.md:137:      id: 'stack_mock_user',
docs\security\PHASE1_SECURITY_ASSESSMENT.md:155:- Add fallback authentication mechanism
docs\security\PHASE1_SECURITY_ASSESSMENT.md:467:    organizationId: DEFAULT_ORG_ID,
src\app\catalog\categories\(cmm)\categories\page.tsx:132:          {/* Mobile QuickLinks fallback if needed, or keep it hidden on mobile as per design */}
src\app\catalog\categories\(cmm)\categories\page.tsx:161:                  placeholder="e.g., Electric Guitars"
src\app\catalog\categories\(cmm)\categories\page.tsx:169:                    <SelectValue placeholder="Top-level category" />
src\app\page_original.tsx:29:const mockStats = {
src\app\page_original.tsx:38:const mockSuppliers = [
src\app\page_original.tsx:44:const mockActivities = [
src\app\page_original.tsx:168:                    <p className="text-2xl font-bold">{mockStats.totalSuppliers}</p>
src\app\page_original.tsx:179:                    <p className="text-2xl font-bold">{mockStats.activeSuppliers}</p>
src\app\page_original.tsx:190:                    <p className="text-2xl font-bold">{mockStats.strategicPartners}</p>
src\app\page_original.tsx:201:                    <p className="text-2xl font-bold">{mockStats.avgRating}/5</p>
src\app\page_original.tsx:221:                      <span className="text-sm font-medium">{mockStats.onTimeDelivery}%</span>
src\app\page_original.tsx:223:                    <Progress value={mockStats.onTimeDelivery} className="h-2" />
src\app\page_original.tsx:228:                      <span className="text-sm font-medium">{mockStats.qualityScore}%</span>
src\app\page_original.tsx:230:                    <Progress value={mockStats.qualityScore} className="h-2" />
src\app\page_original.tsx:238:                    {mockSuppliers.map((supplier, index) => (
src\app\page_original.tsx:278:                  {mockActivities.map((activity, index) => (
src\app\page_broken.tsx:29:const mockStats = {
src\app\page_broken.tsx:38:const mockSuppliers = [
src\app\page_broken.tsx:44:const mockActivities = [
src\app\page_broken.tsx:168:                    <p className="text-2xl font-bold">{mockStats.totalSuppliers}</p>
src\app\page_broken.tsx:179:                    <p className="text-2xl font-bold">{mockStats.activeSuppliers}</p>
src\app\page_broken.tsx:190:                    <p className="text-2xl font-bold">{mockStats.strategicPartners}</p>
src\app\page_broken.tsx:201:                    <p className="text-2xl font-bold">{mockStats.avgRating}/5</p>
src\app\page_broken.tsx:221:                      <span className="text-sm font-medium">{mockStats.onTimeDelivery}%</span>
src\app\page_broken.tsx:223:                    <Progress value={mockStats.onTimeDelivery} className="h-2" />
src\app\page_broken.tsx:228:                      <span className="text-sm font-medium">{mockStats.qualityScore}%</span>
src\app\page_broken.tsx:230:                    <Progress value={mockStats.qualityScore} className="h-2" />
src\app\page_broken.tsx:238:                    {mockSuppliers.map((supplier, index) => (
src\app\page_broken.tsx:278:                  {mockActivities.map((activity, index) => (
src\app\admin\config\workflows\page.tsx:362:                    <Input id="workflowName" placeholder="Enter workflow name" />
src\app\admin\config\workflows\page.tsx:368:                        <SelectValue placeholder="Select entity type" />
src\app\admin\config\workflows\page.tsx:381:                  <Textarea id="description" placeholder="Describe the workflow purpose" />
src\app\catalog\categories\(cmm)\analytics\page.tsx:208:            <AlertDescription>{error}. Showing fallback data.</AlertDescription>
src\app\catalog\categories\(cmm)\analytics\page.tsx:380:                <SelectValue placeholder="Select tag" />
src\services\ai\WebSearchService.ts:152:    // If no real results obtained, generate enhanced mock results as fallback
src\services\ai\WebSearchService.ts:154:      console.log('?? No real results obtained, using enhanced fallback data');
src\services\ai\WebSearchService.ts:320:   * Generate enhanced fallback results with comprehensive mock data
src\services\ai\WebSearchService.ts:851:    const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
src\app\admin\settings\email\page.tsx:376:                      <SelectItem value="auto">Auto (Resend primary, SMTP fallback)</SelectItem>
src\app\admin\settings\email\page.tsx:403:                      placeholder={settings.hasResendKey ? '••••••••' : 're_xxxxxxxxxx'}
src\app\admin\settings\email\page.tsx:440:                        placeholder="smtp.gmail.com"
src\app\admin\settings\email\page.tsx:450:                        placeholder="587"
src\app\admin\settings\email\page.tsx:462:                        placeholder="your-email@domain.com"
src\app\admin\settings\email\page.tsx:472:                        placeholder={settings.hasSmtpPassword ? '••••••••' : 'Enter password'}
src\app\admin\settings\email\page.tsx:506:                        placeholder="noreply@company.com"
src\app\admin\settings\email\page.tsx:515:                        placeholder="Company Name"
src\app\admin\settings\email\page.tsx:527:                      placeholder="support@company.com"
src\app\admin\settings\email\page.tsx:550:                    placeholder="test@example.com"
src\services\ai\WebScrapingService.ts:235:    // Default fallback
src\services\ai\WebScrapingService.ts:523:      // If real scraping fails, fallback to mock but inform the user
src\services\ai\WebScrapingService.ts:524:      console.log('?? Falling back to mock data due to scraping error');
src\services\ai\WebScrapingService.ts:1180:      // Basic validation placeholder – in production we'd issue a HEAD request
src\app\catalog\categories\(cmm)\ai-categorization\page.tsx:179:          {/* Mobile QuickLinks fallback */}
src\services\ai\SupplierIntelligenceService.ts:155:            console.warn(`?? AI extraction failed, using fallback:`, aiError);
src\services\ai\SupplierIntelligenceService.ts:774:        console.log('?? All AI providers failed, using fallback extraction');
src\services\ai\SupplierIntelligenceService.ts:775:        const fallbackData = await this.dataExtractionEngine.extractSupplierData({
src\services\ai\SupplierIntelligenceService.ts:785:        if (!fallbackData) {
src\services\ai\SupplierIntelligenceService.ts:790:          fallbackData,
src\services\ai\SupplierIntelligenceService.ts:1191:    console.warn('?? No brands found in webData.brands, attempting fallback extraction');
src\services\ai\SupplierIntelligenceService.ts:1224:          `?? Extracted ${foundBrands.size} brands from products (fallback):`,
src\services\ai\SupplierIntelligenceService.ts:1851:    // Default fallback
src\components\ui\textarea.tsx:10:        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
src\app\admin\settings\currency\page.tsx:209:                      placeholder="en-ZA"
src\services\ai\PredictiveAnalyticsService.ts:458:      const randomFactor = (Math.random() - 0.5) * 0.2; // Add some noise
src\services\ai\PredictiveAnalyticsService.ts:518:    const trend = (Math.random() - 0.5) * 0.1;
src\services\ai\PredictiveAnalyticsService.ts:524:      const value = baseValue + trend * i + (Math.random() - 0.5) * (baseValue * 0.2);
src\services\ai\PredictiveAnalyticsService.ts:731:  // Additional placeholder methods
docs\quickstart\CONVERSATION_API_QUICKSTART.md:343:  return `conv_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
src\app\admin\settings\backup\page.tsx:179:        return prev + Math.random() * 15;
src\app\admin\settings\backup\page.tsx:196:        return prev + Math.random() * 10;
src\app\admin\settings\backup\page.tsx:692:                          <SelectValue placeholder="Choose backup..." />
src\services\ai\DataExtractionEngine.ts:290:    // Enhanced fallback: extract meaningful business names
src\services\ai\DataExtractionEngine.ts:337:    return 'Services'; // Default fallback
src\components\ui\SystemHealthMonitor.tsx:181:      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
src\services\ai\AIPoweredWebScrapingService.ts:521:    // Generate fallback description based on domain and content analysis
src\services\ai\AIPoweredWebScrapingService.ts:530:    console.log(`? AI fallback description: "${description}"`);
docs\PRICING_OPTIMIZATION_REVIEW.md:148:- `CostPlusOptimizer`: Uses placeholder `estimatedUnitsSold = 100`
docs\PRICING_OPTIMIZATION_REVIEW.md:151:- `DynamicPricingOptimizer`: Uses placeholder demand factor
docs\PRICING_OPTIMIZATION_REVIEW.md:155:- Add fallback strategies when data is missing
src\app\auth\verify-email\page.tsx.corrupt:12:import { authProvider } from '@/lib/auth/mock-provider'
src\services\ai\AIDataExtractionService.ts:176:      console.warn('?? No AI API keys found. AI extraction will use fallback methods.');
src\services\ai\AIDataExtractionService.ts:207:        console.log('?? Using fallback extraction (no AI available)');
src\services\ai\AIDataExtractionService.ts:212:      // Return null on error - let the caller handle fallback logic
src\services\ai\AIDataExtractionService.ts:324:          console.warn(`?? Anthropic model doesn't support JSON schema, using JSON mode fallback`);
src\services\ai\AIDataExtractionService.ts:387:          console.log('? AI extraction completed successfully (JSON mode fallback)');
src\services\ai\AIDataExtractionService.ts:433:   * Get a fallback model that supports JSON schema
src\services\ai\AIDataExtractionService.ts:470:    // Log if we're using a fallback model
src\services\ai\AIDataExtractionService.ts:587:        // Check if it's a model not found error - fallback to compatible model
src\services\ai\AIDataExtractionService.ts:595:          // Try with fallback model
src\services\ai\AIDataExtractionService.ts:596:          const fallbackModel = openai('gpt-4o-mini');
src\services\ai\AIDataExtractionService.ts:598:            const fallbackOptions: unknown = {
src\services\ai\AIDataExtractionService.ts:599:              model: fallbackModel,
src\services\ai\AIDataExtractionService.ts:604:              fallbackOptions.temperature = 0.1;
src\services\ai\AIDataExtractionService.ts:607:            const result = await generateObject(fallbackOptions);
src\services\ai\AIDataExtractionService.ts:609:            console.log('? AI extraction completed successfully (fallback model)');
src\services\ai\AIDataExtractionService.ts:611:          } catch (fallbackError) {
src\services\ai\AIDataExtractionService.ts:612:            // If fallback also fails, try JSON mode
src\services\ai\AIDataExtractionService.ts:614:            throw schemaError; // Re-throw to trigger JSON mode fallback
src\services\ai\AIDataExtractionService.ts:625:            `?? Model ${modelName} doesn't support JSON schema, using JSON mode fallback`
src\services\ai\AIDataExtractionService.ts:668:          // Try with fallback model if original failed
src\services\ai\AIDataExtractionService.ts:695:          console.log('? AI extraction completed successfully (JSON mode fallback)');
docs\PRICELIST_EXTRACTION_RULES.md:185:- Also checks direct column mappings as fallback
src\app\auth\verify-email\page.tsx:127:    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
docs\PRICELIST_EXTRACTION_ALGORITHMS.md:316:        // Priority 3: Fuzzy fallbacks
docs\PRICELIST_EXTRACTION_ALGORITHMS.md:349:        // Dealer cost has additional fuzzy fallbacks
docs\PRICELIST_EXTRACTION_ALGORITHMS.md:533:function detectVatStatus(value: any, fallback: VatStatus = 'inc'): VatStatus {
docs\PRICELIST_EXTRACTION_ALGORITHMS.md:534:    if (!value && value !== 0) return fallback;
docs\PRICELIST_EXTRACTION_ALGORITHMS.md:541:    return fallback;
src\app\auth\two-factor\page.tsx:16:import { authProvider } from '@/lib/auth/mock-provider';
src\app\auth\two-factor\page.tsx:346:                    placeholder="000000"
src\app\admin\security\ip-whitelist\page.tsx:76:                placeholder="192.168.1.1 or 192.168.1.0/24"
src\app\admin\security\ip-whitelist\page.tsx:110:                placeholder="Office network, VPN, etc."
src\app\suppliers\[id]\profile\page.tsx:1545:                              placeholder="Enter rule name"
src\app\suppliers\[id]\profile\page.tsx:1552:                                <SelectValue placeholder="Select type" />
src\app\suppliers\[id]\profile\page.tsx:1569:                              placeholder="0"
src\app\suppliers\[id]\profile\page.tsx:1591:                            placeholder="Describe what this rule should do..."
src\app\suppliers\[id]\profile\page.tsx:1617:                            placeholder="{}"
src\app\suppliers\[id]\profile\page.tsx:1795:                        placeholder="https://example.com/wp-json/wc/v3/products"
src\app\suppliers\[id]\profile\page.tsx:1809:                            <SelectValue placeholder="Select type" />
src\app\suppliers\[id]\profile\page.tsx:1826:                            <SelectValue placeholder="Select interval" />
src\app\suppliers\[id]\profile\page.tsx:2021:                        placeholder="charles@nxtleveltech.co.za"
src\app\suppliers\[id]\profile\page.tsx:2032:                        placeholder={plusPortalCredentialsConfigured ? '••••••••' : 'Enter PlusPortal password'}
src\app\suppliers\[id]\profile\page.tsx:2050:                          <SelectValue placeholder="Select interval" />
src\app\suppliers\[id]\profile\page.tsx:2518:      fallback={
src\app\auth\signup\page.tsx:192:                          placeholder="you@example.com"
src\app\auth\signup\page.tsx:213:                            placeholder="Create a strong password"
database\migrations\0017_fix_analytics_anomalies_org_id.sql:21:-- Update any existing records with fallback org_id
src\components\ui\sidebar.tsx:591:    return `${Math.floor(Math.random() * 40) + 50}%`;
src\app\admin\settings\integrations\page.tsx:164:      key: `mk_live_${Math.random().toString(36).substring(2, 15)}`,
src\app\admin\settings\integrations\page.tsx:201:      secret: `whsec_${Math.random().toString(36).substring(2, 15)}`,
src\app\auth\register\page.tsx:40:import { authProvider } from '@/lib/auth/mock-provider';
src\app\auth\register\page.tsx:267:                              <Input placeholder="Acme Corporation" {...field} />
src\app\auth\register\page.tsx:281:                              <Input placeholder="Acme Corporation (Pty) Ltd" {...field} />
src\app\auth\register\page.tsx:295:                              <Input placeholder="2024/123456/07" {...field} />
src\app\auth\register\page.tsx:310:                              <Input placeholder="4123456789" {...field} />
src\app\auth\register\page.tsx:330:                                  <SelectValue placeholder="Select BEE Level" />
src\app\auth\register\page.tsx:360:                                  <SelectValue placeholder="Select Province" />
src\app\auth\register\page.tsx:385:                              placeholder="Manufacturing, Technology, Construction, etc."
src\app\auth\register\page.tsx:407:                              <Input placeholder="John Smith" {...field} />
src\app\auth\register\page.tsx:421:                              <Input type="email" placeholder="john@company.com" {...field} />
src\app\auth\register\page.tsx:435:                              <Input placeholder="+27 11 123 4567" {...field} />
src\app\auth\register\page.tsx:449:                              <Input placeholder="8001015009087" {...field} />
src\app\auth\register\page.tsx:467:                                  placeholder="••••••••"
src\app\auth\register\page.tsx:503:                                  placeholder="••••••••"
src\app\auth\register\page.tsx:539:                            <Input placeholder="123 Business Street" {...field} />
src\app\auth\register\page.tsx:554:                              <Input placeholder="Sandton" {...field} />
src\app\auth\register\page.tsx:568:                              <Input placeholder="Johannesburg" {...field} />
src\app\auth\register\page.tsx:584:                                  <SelectValue placeholder="Select Province" />
src\app\auth\register\page.tsx:607:                              <Input placeholder="2196" {...field} />
src\lib\utils\woocommerce-connector.ts:28:  const envOrg = normalizeOrgId(process.env.DEFAULT_ORG_ID || null);
src\lib\utils\woocommerce-connector.ts:47:  const envOrg = normalizeOrgId(process.env.DEFAULT_ORG_ID || null);
src\lib\utils\validate-safe-data.ts:47:    console.log(`? Safe string: ${safeString(null, 'fallback')}`);
src\lib\utils\validate-safe-data.ts:53:    console.log(`? Safe get (exists): ${safeGet(testObj, 'a.b.c', 'fallback')}`);
src\lib\utils\validate-safe-data.ts:54:    console.log(`? Safe get (missing): ${safeGet(testObj, 'x.y.z', 'fallback')}`);
src\app\auth\login\page.tsx:213:                placeholder="000000"
src\app\auth\login\page.tsx:297:                        placeholder="Username or Email"
src\app\auth\login\page.tsx:298:                        className="h-12 rounded-lg placeholder:text-white text-white"
src\app\auth\login\page.tsx:317:                          placeholder="Password"
src\app\auth\login\page.tsx:318:                          className="h-12 rounded-lg pr-12 placeholder:text-white text-white"
database\migrations\0010_seed.sql:20:-- For demo purposes, we'll create placeholder profiles with synthetic UUIDs
src\app\admin\settings\general\page.tsx:98:        const mockUrl = `/uploads/${field}_${Date.now()}.${file.name.split('.').pop()}`;
src\app\admin\settings\general\page.tsx:99:        handleInputChange(field, mockUrl);
src\app\admin\settings\general\page.tsx:158:                  placeholder="Enter company name"
src\app\admin\settings\general\page.tsx:169:                    placeholder="https://example.com"
src\app\admin\settings\general\page.tsx:182:                placeholder="Brief description of your company"
src\app\admin\settings\general\page.tsx:195:                  placeholder="info@company.com"
src\app\admin\settings\general\page.tsx:204:                  placeholder="+27 11 123 4567"
src\app\admin\settings\general\page.tsx:215:                placeholder="Full company address"
src\app\admin\settings\general\page.tsx:299:                    placeholder="#2563eb"
src\app\admin\settings\general\page.tsx:322:                    placeholder="#64748b"
src\components\ui\select.tsx:52:        "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-sm border bg-transparent px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
src\app\auth\forgot-password\page.tsx:18:import { authProvider } from '@/lib/auth/mock-provider';
src\app\auth\forgot-password\page.tsx:180:                  placeholder="you@example.com"
src\lib\integrations\xlsx-processor.ts:357:    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
src\lib\integrations\xlsx-processor.ts:361:      VALUES (${placeholders})
src\lib\integrations\xlsx-processor.ts:373:    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
src\lib\integrations\xlsx-processor.ts:378:      VALUES (${placeholders})
src\lib\integrations\xlsx-processor.ts:457:    return `xlsx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
src\app\admin\settings\financial\page.tsx:341:                          placeholder="4123456789"
src\app\admin\settings\financial\page.tsx:356:                          placeholder="VAT vendor number"
src\app\admin\settings\financial\page.tsx:454:                          placeholder="BEE certificate number"
src\app\admin\settings\financial\page.tsx:990:                      placeholder="2024/2025"
src\app\admin\security\access-logs\page.tsx:195:                    placeholder="Search by user, action, or IP address..."
src\lib\utils\testAlertValidationFix.ts:46:  // Minimal alert (should trigger fallback)
src\lib\utils\testAlertValidationFix.ts:79:    name: 'Performance Alert', // Should use as title fallback
src\lib\utils\testAlertValidationFix.ts:80:    description: 'Performance degraded', // Should use as message fallback
src\lib\utils\testAlertValidationFix.ts:83:    timestamp: '2024-01-01T11:00:00Z', // Alternative fallback
src\lib\utils\testAlertValidation.ts:65:  // Invalid alert - missing required fields (should fail or use fallback)
src\components\ui\search\UnifiedSearchSystem.tsx:319:  placeholder?: string;
src\components\ui\search\UnifiedSearchSystem.tsx:332:  placeholder = 'Search...',
src\components\ui\search\UnifiedSearchSystem.tsx:428:        .search-input::placeholder {
src\components\ui\search\UnifiedSearchSystem.tsx:528:          placeholder={placeholder}
src\components\ui\search\UnifiedSearchSystem.tsx:783:              placeholder="Enter value..."
src\app\analytics\page.tsx:22:// Lazy-load AI components with fallbacks to prevent build failures
src\app\analytics\page.tsx:102:// Basic fallback components when AI components fail to load
src\app\admin\roles\permissions\page.tsx:503:                placeholder="Search permissions..."
src\app\suppliers\pricelists\[id]\promote\page.tsx:65:      fallback={
src\components\ui\SafeLink.tsx:12:  fallback?: React.ReactNode;
src\components\ui\SafeLink.tsx:17: * Returns fallback content (or null) if URL is unsafe
src\components\ui\SafeLink.tsx:19:export function SafeLink({ href, children, fallback = null, ...props }: SafeLinkProps) {
src\components\ui\SafeLink.tsx:23:    return <>{fallback}</>;
src\lib\utils\safe-data.ts:18:  fallbackUsed: boolean;
src\lib\utils\safe-data.ts:22: * Safely parse any date input with comprehensive fallbacks
src\lib\utils\safe-data.ts:24:export function safeParseDate(input: unknown, fallbackDate: Date = new Date()): SafeDateResult {
src\lib\utils\safe-data.ts:29:      date: fallbackDate,
src\lib\utils\safe-data.ts:31:      fallbackUsed: true,
src\lib\utils\safe-data.ts:41:        fallbackUsed: false,
src\lib\utils\safe-data.ts:46:      date: fallbackDate,
src\lib\utils\safe-data.ts:48:      fallbackUsed: true,
src\lib\utils\safe-data.ts:61:          fallbackUsed: false,
src\lib\utils\safe-data.ts:86:            fallbackUsed: false,
src\lib\utils\safe-data.ts:101:          fallbackUsed: false,
src\lib\utils\safe-data.ts:110:      date: fallbackDate,
src\lib\utils\safe-data.ts:112:      fallbackUsed: true,
src\lib\utils\safe-data.ts:124:          fallbackUsed: false,
src\lib\utils\safe-data.ts:133:      date: fallbackDate,
src\lib\utils\safe-data.ts:135:      fallbackUsed: true,
src\lib\utils\safe-data.ts:141:    date: fallbackDate,
src\lib\utils\safe-data.ts:143:    fallbackUsed: true,
src\lib\utils\safe-data.ts:148: * Safe date formatting with fallbacks
src\lib\utils\safe-data.ts:153:  fallback: string = 'Invalid Date'
src\lib\utils\safe-data.ts:158:    return fallback;
src\lib\utils\safe-data.ts:164:    return fallback;
src\lib\utils\safe-data.ts:171:export function safeRelativeTime(input: unknown, fallback: string = 'Unknown time'): string {
src\lib\utils\safe-data.ts:175:    return fallback;
src\lib\utils\safe-data.ts:194:    return fallback;
src\lib\utils\safe-data.ts:203: * Safely convert to string with fallback
src\lib\utils\safe-data.ts:205:export function safeString(input: unknown, fallback: string = ''): string {
src\lib\utils\safe-data.ts:206:  if (input == null) return fallback;
src\lib\utils\safe-data.ts:212:    return fallback;
src\lib\utils\safe-data.ts:217: * Safely convert to number with fallback
src\lib\utils\safe-data.ts:219:export function safeNumber(input: unknown, fallback: number = 0): number {
src\lib\utils\safe-data.ts:220:  if (input == null) return fallback;
src\lib\utils\safe-data.ts:228:  return fallback;
src\lib\utils\safe-data.ts:232: * Safely convert to boolean with fallback
src\lib\utils\safe-data.ts:234:export function safeBoolean(input: unknown, fallback: boolean = false): boolean {
src\lib\utils\safe-data.ts:235:  if (input == null) return fallback;
src\lib\utils\safe-data.ts:248:  return fallback;
src\lib\utils\safe-data.ts:254:export function safeGet<T>(obj: unknown, path: string, fallback: T): T {
src\lib\utils\safe-data.ts:256:    return fallback;
src\lib\utils\safe-data.ts:265:        return fallback;
src\lib\utils\safe-data.ts:270:    return current ?? fallback;
src\lib\utils\safe-data.ts:272:    return fallback;
src\lib\utils\safe-data.ts:286:  fallback: TOutput;
src\lib\utils\safe-data.ts:295:  fallback: T[] = []
src\lib\utils\safe-data.ts:298:    return fallback;
src\lib\utils\safe-data.ts:308:    return fallback;
src\lib\utils\safe-data.ts:318:  fallback: T
src\lib\utils\safe-data.ts:321:    return fallback;
src\lib\utils\safe-data.ts:333:        result[key] = fallback[key];
src\lib\utils\safe-data.ts:339:    return fallback;
src\lib\utils\safe-data.ts:367:  const fallback: SafeSupplier = {
src\lib\utils\safe-data.ts:386:      id: v => safeString(v, fallback.id),
src\lib\utils\safe-data.ts:387:      name: v => safeString(v, fallback.name),
src\lib\utils\safe-data.ts:388:      email: v => safeString(v, fallback.email),
src\lib\utils\safe-data.ts:393:          : fallback.status;
src\lib\utils\safe-data.ts:395:      createdAt: v => safeParseDate(v, fallback.createdAt).date!,
src\lib\utils\safe-data.ts:396:      updatedAt: v => safeParseDate(v, fallback.updatedAt).date!,
src\lib\utils\safe-data.ts:402:            totalOrders: v => safeNumber(v, fallback.metrics.totalOrders),
src\lib\utils\safe-data.ts:403:            totalValue: v => safeNumber(v, fallback.metrics.totalValue),
src\lib\utils\safe-data.ts:404:            averageDeliveryTime: v => safeNumber(v, fallback.metrics.averageDeliveryTime),
src\lib\utils\safe-data.ts:405:            qualityScore: v => safeNumber(v, fallback.metrics.qualityScore),
src\lib\utils\safe-data.ts:407:          fallback.metrics
src\lib\utils\safe-data.ts:410:    fallback
src\lib\utils\safe-data.ts:430:  const fallback: SafeInventoryItem = {
src\lib\utils\safe-data.ts:445:      id: v => safeString(v, fallback.id),
src\lib\utils\safe-data.ts:446:      name: v => safeString(v, fallback.name),
src\lib\utils\safe-data.ts:447:      sku: v => safeString(v, fallback.sku),
src\lib\utils\safe-data.ts:448:      quantity: v => safeNumber(v, fallback.quantity),
src\lib\utils\safe-data.ts:449:      price: v => safeNumber(v, fallback.price),
src\lib\utils\safe-data.ts:454:          : fallback.status;
src\lib\utils\safe-data.ts:456:      lastUpdated: v => safeParseDate(v, fallback.lastUpdated).date!,
src\lib\utils\safe-data.ts:457:      category: v => safeString(v, fallback.category),
src\lib\utils\safe-data.ts:458:      supplier: v => safeString(v, fallback.supplier),
src\lib\utils\safe-data.ts:460:    fallback
src\lib\utils\safe-data.ts:471:export function safeExecute<T>(fn: () => T, fallback: T, onError?: (error: Error) => void): T {
src\lib\utils\safe-data.ts:478:    return fallback;
src\lib\utils\safe-data.ts:487:  fallback: T,
src\lib\utils\safe-data.ts:496:    return fallback;
src\lib\utils\safe-data.ts:505:  fallback: TReturn,
src\lib\utils\safe-data.ts:515:      return fallback;
src\app\admin\roles\page.tsx:291:                  placeholder="Search roles..."
src\components\ui\ResponsiveUIManager.tsx:578:  fallback?: React.ReactNode;
src\components\ui\ResponsiveUIManager.tsx:580:}> = ({ children, operationName, priority = 'medium', fallback, showProgress = false }) => {
src\components\ui\ResponsiveUIManager.tsx:608:  if (isOperationPending && fallback) {
src\components\ui\ResponsiveUIManager.tsx:609:    return <>{fallback}</>;
src\components\ui\ResponsiveUIManager.tsx:630:  fallback?: React.ReactNode;
src\components\ui\ResponsiveUIManager.tsx:632:}> = ({ children, fallback, threshold = 3 }) => {
src\components\ui\ResponsiveUIManager.tsx:635:  if (uiState.currentLoad >= threshold && fallback) {
src\components\ui\ResponsiveUIManager.tsx:636:    return <>{fallback}</>;
src\app\nxt-spp\profiles\page.tsx:673:                    placeholder="Search suppliers by name, code, or tier..."
src\app\nxt-spp\profiles\page.tsx:1082:                    placeholder="e.g., ZAR, USD, EUR"
src\app\nxt-spp\profiles\page.tsx:1102:                    placeholder="0.00"
src\app\nxt-spp\profiles\page.tsx:1122:                    placeholder="0"
src\app\nxt-spp\profiles\page.tsx:1138:                    placeholder="e.g., Net 30, COD, Prepayment"
src\app\nxt-spp\profiles\page.tsx:1174:                      placeholder="sku, name, price, description, category"
src\app\nxt-spp\profiles\page.tsx:1199:                        placeholder="0"
src\app\nxt-spp\profiles\page.tsx:1221:                        placeholder="100000"
src\app\nxt-spp\profiles\page.tsx:1369:                    placeholder="80"
src\app\nxt-spp\profiles\page.tsx:1485:                    placeholder="hazardous_materials, pharmaceuticals, restricted_electronics"
src\app\nxt-spp\profiles\page.tsx:1630:      fallback={
src\app\api\activities\recent\route.ts:284:      // Return fallback activities on error
src\app\api\activities\recent\route.ts:348:            fallback: true,
src\app\nxt-spp\page.tsx.restored:256:    <Suspense fallback={
src\app\nxt-spp\page.tsx.bak:256:    <Suspense fallback={
src\app\api\alerts\route.ts:237:        createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Random within last 24 hours
src\app\api\alerts\route.ts:270:        createdAt: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000), // Random within last 12 hours
src\app\api\alerts\route.optimized.ts:101:      createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
src\app\api\alerts\route.optimized.ts:134:      createdAt: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000),
src\app\nxt-spp\page.tsx:219:      fallback={
src\lib\utils\error-reporting.ts:502:    // This is a placeholder for demonstration
src\lib\utils\error-reporting.ts:522:    // This is a placeholder for demonstration
src\lib\error-handling\upload-error-manager.ts:412:    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
src\lib\error-handling\upload-error-manager.ts:416:    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
src\lib\utils\dateUtils.ts:50: * Returns fallback string if timestamp is invalid
src\lib\utils\dateUtils.ts:54:  fallback: string = 'Unknown'
src\lib\utils\dateUtils.ts:58:  if (!date) return fallback;
src\lib\utils\dateUtils.ts:68:    return fallback;
src\lib\utils\dateUtils.ts:74: * Returns fallback string if timestamp is invalid
src\lib\utils\dateUtils.ts:85:  fallback: string = 'Unknown'
src\lib\utils\dateUtils.ts:89:  if (!date) return fallback;
src\lib\utils\dateUtils.ts:95:    return fallback;
src\components\ui\loading\LoadingStates.tsx:172:                animate={{ height: `${Math.random() * 80 + 20}%` }}
src\lib\utils\date-utils.ts:26: * Safely get timestamp for comparison, with fallback
src\lib\utils\date-utils.ts:28:export function safeGetTime(input: unknown, fallback: number = 0): number {
src\lib\utils\date-utils.ts:30:  return date ? date.getTime() : fallback;
src\app\nxt-spp\catalog\popout\page.tsx:48:      fallback={
src\components\ui\input.tsx:11:        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-sm border bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
src\lib\utils\dataValidation.ts:172: * Safely validate and normalize alert items with fallback recovery
src\lib\utils\dataValidation.ts:212:        // Try fallback validation with relaxed constraints
src\lib\utils\dataValidation.ts:213:        const fallbackItem = attemptFallbackValidation(item, index);
src\lib\utils\dataValidation.ts:214:        if (fallbackItem) {
src\lib\utils\dataValidation.ts:215:          validated.push(fallbackItem);
src\lib\utils\dataValidation.ts:276: * Attempt fallback validation with data repair for partial alert objects
src\lib\utils\dataValidation.ts:286:      // Required fields with fallbacks
src\lib\utils\dataValidation.ts:288:      type: item.type || 'quality_issue', // Default fallback type
src\lib\utils\dataValidation.ts:351:      // Context ID fallback
src\lib\utils\dataValidation.ts:411: * Safe property access with fallback
src\lib\utils\dataValidation.ts:413:export function safeGet<T>(obj: unknown, path: string, fallback: T): T {
src\lib\utils\dataValidation.ts:422:        return fallback;
src\lib\utils\dataValidation.ts:426:    return current !== undefined ? current : fallback;
src\lib\utils\dataValidation.ts:431:    return fallback;
src\lib\utils\dataValidation.ts:465:  fallback: T,
src\lib\utils\dataValidation.ts:473:      return fallback;
src\lib\utils\dataValidation.ts:481:    return fallback;
src\lib\utils\dataValidation.ts:540:    // Ensure type is valid - provide fallback
src\lib\utils\dataValidation.ts:581: * Map different severity naming conventions with better fallbacks
src\lib\utils\dataValidation.ts:585:    return 'info'; // Default fallback
src\components\ui\indicators\DataFreshnessIndicators.tsx:628:              transition={{ duration: 0.3, delay: Math.random() * 0.1 }}
src\app\messages\page.tsx:71:const mockConversations: Conversation[] = [
src\app\messages\page.tsx:124:const mockMessages: Message[] = [
src\app\messages\page.tsx:269:            placeholder="Search conversations..."
src\app\messages\page.tsx:597:              placeholder="Type a message..."
src\app\messages\page.tsx:629:  const [conversations, setConversations] = useState(mockConversations);
src\app\messages\page.tsx:630:  const [messages, setMessages] = useState(mockMessages);
src\components\ui\fallback-ui.tsx:3: * User-friendly fallback states for various error scenarios
src\components\ui\fallback-ui.tsx:463:      `err_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`
src\components\ui\fallback-ui.tsx:611:      `err_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`
src\components\ui\fallback-ui.tsx:795: * Specialized fallback for data fetching errors
src\components\ui\fallback-states.tsx:19:// Base fallback component interface
src\components\ui\fallback-states.tsx:28:// Network connection fallback
src\components\ui\fallback-states.tsx:103:// API error fallback
src\components\ui\fallback-states.tsx:220:// Database connection fallback
src\components\ui\fallback-states.tsx:274:// Timeout fallback
src\components\ui\fallback-states.tsx:319:// Generic fallback that adapts based on error type
src\components\ui\fallback-states.tsx:366:// Maintenance mode fallback
src\components\ui\fallback-states.tsx:404:// Help and support fallback
src\app\api\admin\dashboard\status\route.ts:87:        message: 'Redis not available (using fallback)',
src\app\api\admin\dashboard\status\route.ts:207:  // For now, return a placeholder
src\components\ui\error-boundary.tsx:27:  fallback?: React.ComponentType<ErrorFallbackProps>;
src\components\ui\error-boundary.tsx:141:      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
src\components\ui\error-boundary.tsx:159:// Default error fallback component
src\app\api\analytics\system\route.ts:769:    id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
src\app\api\admin\dashboard\stats\route.ts:103:      // Table might not exist yet, use fallback
src\lib\utils\api-helpers.ts:334: * Request rate limiting check (placeholder for future implementation)
src\lib\utils\alertValidationEnhancements.ts:111: * Create a mock alert for testing validation
src\lib\utils\alertValidationEnhancements.ts:115:    id: `mock_alert_${Date.now()}`,
src\lib\utils\alertValidationEnhancements.ts:119:    message: 'This is a mock alert for testing',
src\app\api\ai\generate\route.ts:520:  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
src\components\ui\data-table\EnhancedDataTable.tsx:145:    placeholder: string;
src\components\ui\data-table\EnhancedDataTable.tsx:239:  globalSearch = { enabled: true, placeholder: 'Search across all columns...', debounceMs: 300 },
src\components\ui\data-table\EnhancedDataTable.tsx:404:      if (realtime.highlightChanges && Math.random() > 0.7) {
src\components\ui\data-table\EnhancedDataTable.tsx:405:        const randomIndex = Math.floor(Math.random() * paginatedData.length);
src\components\ui\data-table\EnhancedDataTable.tsx:623:                  placeholder={globalSearch.placeholder}
src\components\ui\command.tsx:59:            'flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
src\lib\db\schema-contract.ts:218:    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
src\lib\db\schema-contract.ts:219:    return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
src\components\ui\BulletproofErrorBoundary.tsx:17:  fallback?: ReactNode;
src\components\ui\BulletproofErrorBoundary.tsx:139:      // Use custom fallback if provided
src\components\ui\BulletproofErrorBoundary.tsx:140:      if (this.props.fallback) {
src\components\ui\BulletproofErrorBoundary.tsx:141:        return this.props.fallback;
src\components\ui\BulletproofDataLoader.tsx:25:} from '@/components/fallbacks/FallbackComponents'
src\components\ui\BulletproofDataLoader.tsx:51:  fallbackComponent?: React.ReactNode
src\components\ui\BulletproofDataLoader.tsx:192:  sanitizeNumber: (value: any, fallback: number = 0): number => {
src\components\ui\BulletproofDataLoader.tsx:204:    return fallback
src\components\ui\BulletproofDataLoader.tsx:210:  sanitizeString: (value: any, fallback: string = ''): string => {
src\components\ui\BulletproofDataLoader.tsx:212:    if (value === null || value === undefined) return fallback
src\components\ui\BulletproofDataLoader.tsx:219:  sanitizeArray: <T>(value: any, fallback: T[] = []): T[] => {
src\components\ui\BulletproofDataLoader.tsx:221:    if (value === null || value === undefined) return fallback
src\components\ui\BulletproofDataLoader.tsx:303:  fallbackComponent,
src\components\ui\BulletproofDataLoader.tsx:477:    if (fallbackComponent) return fallbackComponent
src\components\ui\BulletproofActivityList.tsx:26:} from '@/components/fallbacks/FallbackComponents';
src\components\ui\BulletproofActivityList.tsx:111:    fallback: `activity-${Date.now()}-${Math.random()}`,
src\components\ui\BulletproofActivityList.tsx:115:    validationErrors.push('Generated fallback ID');
src\components\ui\BulletproofActivityList.tsx:121:    { fallbackToNow: false, allowNull: true }
src\components\ui\BulletproofActivityList.tsx:131:    fallbackToNow: false,
src\components\ui\BulletproofActivityList.tsx:136:    fallbackToNow: false,
src\components\ui\BulletproofActivityList.tsx:141:  const typeResult = StringValidator.validate(item.type, { fallback: 'general' });
src\components\ui\BulletproofActivityList.tsx:143:    fallback: 'No description available',
src\components\ui\BulletproofActivityList.tsx:147:  const statusResult = StringValidator.validate(item.status, { fallback: 'unknown' });
src\components\ui\BulletproofActivityList.tsx:219:  timestamp: (value: any, fallback: string = 'Invalid Date'): string => {
src\components\ui\BulletproofActivityList.tsx:221:    if (!result.isValid || !result.data) return fallback;
src\components\ui\BulletproofActivityList.tsx:226:      return fallback;
src\components\ui\BulletproofActivityList.tsx:230:  relativeTime: (value: any, fallback: string = 'Unknown time'): string => {
src\components\ui\BulletproofActivityList.tsx:232:    if (!result.isValid || !result.data) return fallback;
src\components\ui\BulletproofActivityList.tsx:237:      return fallback;
src\components\ui\BulletproofActivityList.tsx:241:  amount: (value: any, fallback: string = '—'): string => {
src\components\ui\BulletproofActivityList.tsx:243:    if (!result.isValid || result.data === null) return fallback;
src\components\ui\BulletproofActivityList.tsx:252:  quantity: (value: any, fallback: string = '—'): string => {
src\components\ui\BulletproofActivityList.tsx:254:    if (!result.isValid || result.data === null) return fallback;
src\components\ui\BulletproofActivityList.tsx:531:                          placeholder="Search activities..."
src\components\ui\BulletproofActivityList.tsx:540:                          <SelectValue placeholder="Type" />
src\components\ui\BulletproofActivityList.tsx:554:                          <SelectValue placeholder="Status" />
src\app\social-media-app\channels\page.tsx:77:        pingLatency: c.isConnected ? Math.floor(Math.random() * 50) + 20 : 0, // Simulated ping for now
src\components\ui\BuildSafeErrorBoundary.tsx:17:  fallback?: ReactNode;
src\components\ui\BuildSafeErrorBoundary.tsx:25: * Provides graceful degradation with appropriate fallbacks for different levels
src\components\ui\BuildSafeErrorBoundary.tsx:153:      // Use custom fallback if provided
src\components\ui\BuildSafeErrorBoundary.tsx:154:      if (this.props.fallback) {
src\components\ui\BuildSafeErrorBoundary.tsx:155:        return this.props.fallback;
src\components\ui\BuildSafeErrorBoundary.tsx:181:    fallback?: ReactNode;
src\components\ui\BuildSafeErrorBoundary.tsx:189:        fallback={options.fallback}
src\components\ui\BuildSafeErrorBoundary.tsx:203:  fallback,
src\components\ui\BuildSafeErrorBoundary.tsx:207:  fallback?: ReactNode;
src\components\ui\BuildSafeErrorBoundary.tsx:221:      <React.Suspense fallback={fallback || defaultFallback}>{children}</React.Suspense>
src\components\ui\avatar.tsx:34:      data-slot="avatar-fallback"
src\components\ui\AsyncBoundary.tsx:7:  fallback?: React.ReactNode;
src\components\ui\AsyncBoundary.tsx:32:export default function AsyncBoundary({ children, fallback }: Props) {
src\components\ui\AsyncBoundary.tsx:35:      <Suspense fallback={fallback ?? <div className="p-4">Loading…</div>}>{children}</Suspense>
src\app\api\ai\suppliers\discover\route.ts:55:      // Filter out existing suppliers (placeholder logic)
src\lib\database\wooCommerce-queries.ts:48:      query: text.replace(/\$\d+/g, '?'), // Remove parameter placeholders for logging
src\app\api\ai\analyze\route.ts.bak:614:  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
src\app\api\ai\analyze\route.ts:674:  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
src\app\marketing-app\page.tsx:289:                          src={item.image || "/placeholder.svg"}
src\app\marketing-app\page.tsx:352:                  src={product.image || "/placeholder.svg"}
src\app\marketing-app\page.tsx:418:                      src={selectedProduct.image || "/placeholder.svg"}
src\components\test\TimestampValidationTest.tsx:27:  expectedResult: 'valid' | 'invalid' | 'fallback';
src\components\test\TimestampValidationTest.tsx:66:  // Invalid dates that should fallback gracefully
src\components\test\TimestampValidationTest.tsx:67:  { name: 'Null Input', input: null, expectedResult: 'fallback', description: 'Null value' },
src\components\test\TimestampValidationTest.tsx:71:    expectedResult: 'fallback',
src\components\test\TimestampValidationTest.tsx:74:  { name: 'Empty String', input: '', expectedResult: 'fallback', description: 'Empty string' },
src\components\test\TimestampValidationTest.tsx:78:    expectedResult: 'fallback',
src\components\test\TimestampValidationTest.tsx:81:  { name: 'Invalid Number', input: NaN, expectedResult: 'fallback', description: 'NaN value' },
src\components\test\TimestampValidationTest.tsx:85:    expectedResult: 'fallback',
src\components\test\TimestampValidationTest.tsx:144:      } else if (testCase.expectedResult === 'fallback') {
src\components\test\TimestampValidationTest.tsx:145:        passed = !isValidParse && !isValidRelative; // Should fallback gracefully
src\lib\database\secure-db.ts:587:    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
src\lib\database\secure-db.ts:591:      VALUES (${placeholders})
src\components\test\ErrorHandlingTest.tsx:3: * Validates crash prevention and fallback behavior
src\components\test\ErrorHandlingTest.tsx:29:// Error fallback component
src\lib\database\index.ts:26: * @param text - SQL query string with $1, $2, etc. placeholders
src\app\sales-channels\page.tsx:106:                    placeholder="Search channels..."
src\components\tags\TagManager.tsx:200:                placeholder="e.g., Summer Collection"
src\components\tags\TagManager.tsx:267:                placeholder="Optional description"
src\components\tags\TagManager.tsx:275:                placeholder="#FF5733"
src\lib\suppliers\services\AISupplierDiscoveryService.ts:66:   * (used internally to generate mock data)
src\lib\suppliers\services\AISupplierDiscoveryService.ts:274:      notes: 'Generated by AISupplierDiscoveryService mock data pipeline.',
src\app\layout.tsx:19:    // Fallback placeholder for build-time static generation
src\app\api\dashboard\real-stats\route.ts:197:        avgRating: 4.2 + Math.random() * 0.6, // 4.2-4.8 (would come from supplier_performance table)
src\app\api\dashboard\real-stats\route.ts:225:        suppliersGrowth: 5.2 + Math.random() * 2, // 5-7% (would come from analytics table)
src\app\api\dashboard\real-stats\route.ts:226:        productsGrowth: 12.1 + Math.random() * 3, // 12-15%
src\app\api\dashboard\real-stats\route.ts:227:        valueGrowth: 8.7 + Math.random() * 2.3, // 8-11%
src\app\api\dashboard\metrics\route.ts:7: * This route previously returned 100% hardcoded mock data.
src\app\logistics\tracking\page.tsx:59:                      placeholder="Enter tracking number (e.g., TRACK123456)"
src\app\sales\sales-orders\page.tsx:112:                    placeholder="Search..."
src\lib\currency\constants.ts:2: * South African Rand (ZAR) mock data with realistic amounts
src\lib\currency\constants.ts:63:// South African company registration numbers (mock format)
src\lib\currency\constants.ts:77:// South African VAT numbers (mock format)
src\app\api\categories\route.ts:14:      // Return mock categories for demo
src\app\api\categories\route.ts:89:    // Legacy fallback
src\app\api\categories\route.ts:182:    // Legacy schema fallback - use core.category for consistency
src\app\api\backend-health\route.ts:21:    // Test critical table access with fallbacks
src\lib\supplier-discovery\web-search-service.ts:174:   * Simulate Google results (fallback when API not available)
src\app\api\dashboard\inventory-by-category\route.ts:112:      const fallbackQuery = buildCategoryQuery('month');
src\app\api\dashboard\inventory-by-category\route.ts:113:      const fallbackResult = await query(fallbackQuery, [], { timeout: 5000 });
src\app\api\dashboard\inventory-by-category\route.ts:114:      categories = fallbackResult.rows.map((row: any) => ({
src\app\logistics\settings\page.tsx:155:                    <SelectValue placeholder="Select a default tier" />
src\app\logistics\settings\page.tsx:169:                    <SelectValue placeholder="Select a default provider" />
src\app\logistics\settings\page.tsx:211:                placeholder="e.g. 123 Main Rd, Sandton, Johannesburg"
src\app\logistics\settings\page.tsx:254:                  placeholder="e.g. South Africa"
src\components\suppliers\WebSupplierDiscovery.tsx:177:        confidence: item.confidence || Math.floor(Math.random() * 20) + 80,
src\components\suppliers\WebSupplierDiscovery.tsx:258:                      placeholder="Enter company name, industry, or keywords..."
src\components\suppliers\WebSupplierDiscovery.tsx:307:                      placeholder="https://company-website.com"
src\lib\supplier-discovery\utils.ts:329:    .map(value => ({ value, confidence: Math.random() })) // In real implementation, use actual confidence
src\app\invoices\page.tsx:91:const mockInvoices: Invoice[] = [
src\app\invoices\page.tsx:215:const mockMetrics: InvoiceMetrics = {
src\app\invoices\page.tsx:247:  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
src\app\invoices\page.tsx:248:  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>(mockInvoices);
src\app\invoices\page.tsx:472:              <div className="text-2xl font-bold">{mockMetrics.totalInvoices}</div>
src\app\invoices\page.tsx:474:                {formatCurrency(mockMetrics.totalValue)} total value
src\app\invoices\page.tsx:485:              <div className="text-2xl font-bold">{mockMetrics.averageProcessingTime} days</div>
src\app\invoices\page.tsx:487:                {mockMetrics.automationRate}% automated
src\app\invoices\page.tsx:498:              <div className="text-2xl font-bold">{mockMetrics.approvalRate}%</div>
src\app\invoices\page.tsx:500:                {mockMetrics.disputeRate}% dispute rate
src\app\invoices\page.tsx:512:                {formatCurrency(mockMetrics.earlyPaymentSavings)}
src\app\invoices\page.tsx:515:                {mockMetrics.onTimePaymentRate}% on-time payments
src\app\invoices\page.tsx:535:                    placeholder="Search invoices..."
src\app\invoices\page.tsx:890:                      <SelectValue placeholder={itemsPerPage} />
src\app\invoices\page.tsx:986:                  <SelectValue placeholder="Select supplier" />
src\app\invoices\page.tsx:998:              <Input id="invoiceNumber" placeholder="INV-2024-001" />
src\app\invoices\page.tsx:1013:              <Input id="amount" type="number" placeholder="0.00" />
src\app\invoices\page.tsx:1020:                  <SelectValue placeholder="Select currency" />
src\app\invoices\page.tsx:1143:            placeholder="Min amount"
src\app\invoices\page.tsx:1158:            placeholder="Max amount"
src\components\suppliers\UnifiedSupplierDashboard.tsx:1079:                          placeholder="Search suppliers by name, code, category, or tags..."
src\components\suppliers\UnifiedSupplierDashboard.tsx:1126:                              <SelectValue placeholder="All statuses" />
src\components\suppliers\UnifiedSupplierDashboard.tsx:1147:                              <SelectValue placeholder="All tiers" />
src\components\suppliers\UnifiedSupplierDashboard.tsx:1168:                              <SelectValue placeholder="All categories" />
src\components\suppliers\UnifiedSupplierDashboard.tsx:1190:                              <SelectValue placeholder="All levels" />
src\app\api\categories\dashboard\route.ts:10:      // Return mock stats for demo mode
src\app\api\categories\dashboard\route.ts:175:    // Legacy schema fallback
src\components\suppliers\SupplierPricelistUpload.tsx:263:                    placeholder="Enter SKU"
src\components\suppliers\SupplierPricelistUpload.tsx:272:                    placeholder="Enter supplier SKU"
src\components\suppliers\SupplierPricelistUpload.tsx:281:                    placeholder="Enter product name"
src\components\suppliers\SupplierPricelistUpload.tsx:294:                    placeholder="0.00"
src\components\suppliers\SupplierPricelistUpload.tsx:310:                    placeholder="0.00"
src\components\suppliers\SupplierPricelistUpload.tsx:319:                    placeholder="Enter category"
src\components\suppliers\SupplierPricelistUpload.tsx:334:                    placeholder="1"
src\components\suppliers\SupplierPricelistUpload.tsx:349:                    placeholder="7"
src\components\suppliers\SupplierPricelistUpload.tsx:358:                    placeholder="Enter product description"
src\app\api\auth\status\route.ts:6:    // For now, return a mock authenticated user for testing
src\components\suppliers\SupplierManagement_backup.tsx:304:                  placeholder="Search suppliers..."
src\components\suppliers\SupplierManagement_backup.tsx:344:                        <SelectValue placeholder="All statuses" />
src\components\suppliers\SupplierManagement_backup.tsx:369:                        <SelectValue placeholder="All tiers" />
src\components\suppliers\SupplierManagement_backup.tsx:393:                        <SelectValue placeholder="All categories" />
src\components\suppliers\SupplierManagement_backup.tsx:417:                        <SelectValue placeholder="All regions" />
src\components\suppliers\SupplierManagement_backup.tsx:441:                        <SelectValue placeholder="All levels" />
src\components\suppliers\SupplierManagement.tsx:298:                  placeholder="Search suppliers..."
src\components\suppliers\SupplierManagement.tsx:339:                        <SelectValue placeholder="All statuses" />
src\components\suppliers\SupplierManagement.tsx:364:                        <SelectValue placeholder="All tiers" />
src\components\suppliers\SupplierManagement.tsx:388:                        <SelectValue placeholder="All categories" />
src\components\suppliers\SupplierManagement.tsx:412:                        <SelectValue placeholder="All regions" />
src\components\suppliers\SupplierManagement.tsx:436:                        <SelectValue placeholder="All levels" />
src\lib\supplier-discovery\extractors.ts:76:          'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
src\lib\supplier-discovery\extractors.ts:129:      await page.setUserAgent(USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]);
src\lib\supplier-discovery\extractors.ts:204:      await page.setUserAgent(USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]);
src\components\suppliers\SupplierDirectory.tsx:906:                  placeholder="Search suppliers by name, code, category, or tags..."
src\components\suppliers\SupplierDirectory.tsx:955:                      <SelectValue placeholder="All Statuses" />
src\components\suppliers\SupplierDirectory.tsx:980:                      <SelectValue placeholder="All Tiers" />
src\components\suppliers\SupplierDirectory.tsx:1002:                      <SelectValue placeholder="All Categories" />
src\components\suppliers\SupplierDirectory.tsx:1024:                      <SelectValue placeholder="All Locations" />
src\app\sales\quotations\page.tsx:99:                    placeholder="Search..."
src\lib\supplier-discovery\enhanced-use-supplier-discovery.ts:457:      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
src\lib\supplier-discovery\enhanced-use-supplier-discovery.ts:594:   * Bulk discovery (placeholder implementation)
src\lib\supplier-discovery\enhanced-use-supplier-discovery.ts:599:      // For now, return a placeholder response
src\components\suppliers\SupplierCategoriesTab.tsx:204:                    placeholder="Enter category name"
src\components\suppliers\SupplierCategoriesTab.tsx:218:                      <SelectValue placeholder="Select parent category (optional)" />
src\components\suppliers\SupplierCategoriesTab.tsx:256:              placeholder="Search categories..."
src\components\suppliers\SupplierBrandsTab.tsx:171:                    placeholder="Enter brand name"
src\components\suppliers\SupplierBrandsTab.tsx:181:                    placeholder="Enter brand description (optional)"
src\components\suppliers\SupplierBrandsTab.tsx:193:                    placeholder="https://example.com/logo.png"
src\components\suppliers\SupplierBrandsTab.tsx:204:                    placeholder="https://example.com"
src\components\suppliers\SupplierBrandsTab.tsx:233:              placeholder="Search brands..."
src\components\suppliers\ProductToInventoryWizard.tsx:580:                                    placeholder="Add any notes about this product..."
src\components\suppliers\ProductToInventoryWizard.tsx:662:                              <SelectValue placeholder="Select warehouse" />
src\components\suppliers\ProductToInventoryWizard.tsx:703:                                  placeholder="e.g., A-1-2-B"
src\lib\supplier-discovery\ai-analytics.ts:530:      reliability: baseScore * 0.9 + Math.random() * 10, // Placeholder logic
src\lib\supplier-discovery\ai-analytics.ts:531:      quality: baseScore * 0.95 + Math.random() * 5,
src\lib\supplier-discovery\ai-analytics.ts:532:      communication: baseScore * 0.85 + Math.random() * 15,
src\lib\supplier-discovery\ai-analytics.ts:533:      pricing: baseScore * 0.8 + Math.random() * 20,
src\lib\supplier-discovery\ai-analytics.ts:534:      delivery: baseScore * 0.9 + Math.random() * 10,
src\app\api\auth\login\route.ts:17:// JWT secret - allow a harmless placeholder only during static build so Vercel can compile
src\app\api\auth\login\route.ts:20:  process.env.JWT_SECRET || (isBuildPhase ? 'build-placeholder-secret' : undefined);
src\app\sales\quotations\new\page.tsx:65:    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
src\app\sales\quotations\new\page.tsx:384:                        placeholder="Search customers by name, email, company, phone..."
src\app\sales\quotations\new\page.tsx:420:                        placeholder="Search products by name, SKU, category, brand..."
src\app\sales\quotations\new\page.tsx:503:                                    placeholder="0.15"
src\app\sales\quotations\new\page.tsx:557:                      placeholder="ZAR"
src\app\sales\quotations\new\page.tsx:588:                        placeholder="REF-2025-XXXXXX"
src\app\logistics\deliveries\[id]\edit\page.tsx:167:                    placeholder="e.g. PN123456789"
src\app\logistics\deliveries\[id]\edit\page.tsx:177:                    placeholder="e.g. 125.50"
src\app\logistics\deliveries\page.tsx:107:                    placeholder="Search by delivery number, customer, or tracking number..."
src\app\logistics\deliveries\page.tsx:118:                    <SelectValue placeholder="Filter by status" />
src\app\logistics\deliveries\new\page.tsx:200:                placeholder="Start typing pickup address..."
src\app\logistics\deliveries\new\page.tsx:240:                placeholder="Start typing delivery address..."
src\app\logistics\deliveries\new\page.tsx:283:                      <SelectValue placeholder="Select type" />
src\app\logistics\deliveries\new\page.tsx:435:                  placeholder="Any special instructions for the courier provider..."
src\app\api\catalog\products\route.ts:414:        '[API] /api/catalog/products primary query failed, attempting fallback without optional tables:',
src\app\api\catalog\products\route.ts:432:      const fallbackSql = `
src\app\api\catalog\products\route.ts:487:      const fallbackRes = await dbQuery<unknown>(fallbackSql, dataParams);
src\app\api\catalog\products\route.ts:488:      dataRows = fallbackRes.rows;
src\lib\config\currency-config.ts:31:  fallbackRates: Record<string, number>;
src\lib\config\currency-config.ts:107:  // Initialize with fallback exchange rates
src\lib\config\currency-config.ts:110:      { from: 'USD', to: 'ZAR', rate: 18.5, source: 'fallback' },
src\lib\config\currency-config.ts:111:      { from: 'EUR', to: 'ZAR', rate: 20.2, source: 'fallback' },
src\lib\config\currency-config.ts:112:      { from: 'GBP', to: 'ZAR', rate: 23.1, source: 'fallback' },
src\lib\config\currency-config.ts:113:      { from: 'ZAR', to: 'USD', rate: 0.054, source: 'fallback' },
src\lib\config\currency-config.ts:114:      { from: 'ZAR', to: 'EUR', rate: 0.049, source: 'fallback' },
src\lib\config\currency-config.ts:115:      { from: 'ZAR', to: 'GBP', rate: 0.043, source: 'fallback' },
src\lib\config\currency-config.ts:284:      fallbackRates: Object.fromEntries(this.exchangeRates),
src\app\api\catalog\products\export\route.ts:397:        '[API] /api/catalog/products/export primary query failed, attempting fallback:',
src\app\api\catalog\products\export\route.ts:415:      const fallbackSql = `
src\app\api\catalog\products\export\route.ts:460:      const fallbackRes = await dbQuery<ExportRow>(fallbackSql, params);
src\app\api\catalog\products\export\route.ts:461:      rows = fallbackRes.rows;
src\app\api\brands\route.ts:14: * Tries: body -> header -> query -> env -> database -> fallback
src\app\api\brands\route.ts:46:  const envOrgId = process.env.DEFAULT_ORG_ID;
src\app\api\brands\route.ts:83:    // Try public.supplier as fallback
src\app\inventory\locations\page.tsx:121:                  placeholder="Search by name or address..."
src\app\inventory\locations\page.tsx:131:                  <SelectValue placeholder="All Types" />
src\app\inventory\locations\page.tsx:156:                  <SelectValue placeholder="Status" />
src\app\sales\proforma-invoices\page.tsx:98:                    placeholder="Search..."
src\app\logistics\couriers\page.tsx:253:                      placeholder="e.g., PostNet, FastWay"
src\app\logistics\couriers\page.tsx:265:                      placeholder="e.g., postnet, fastway"
src\app\logistics\couriers\page.tsx:277:                    placeholder="https://api.provider.com"
src\app\logistics\couriers\page.tsx:294:                        placeholder="Leave blank to keep existing"
src\app\logistics\couriers\page.tsx:304:                        placeholder="Leave blank to keep existing"
src\app\logistics\couriers\page.tsx:315:                        placeholder="Optional"
src\app\logistics\couriers\page.tsx:325:                        placeholder="Optional"
src\app\logistics\couriers\page.tsx:391:                placeholder="Search providers by name or code..."
database\migrations\0022_critical_security_fixes.sql:246:        -- This is a placeholder - actual hashing happens in application layer
src\app\project-management\settings\page.tsx:284:                    placeholder="Enter your Dart-AI API token"
src\app\project-management\page.tsx:445:                    <SelectValue placeholder="All Projects" />
src\app\project-management\page.tsx:767:                  placeholder="Task title"
src\app\project-management\page.tsx:777:                    placeholder="Project name"
src\app\project-management\page.tsx:786:                    placeholder="e.g., unstarted, in-progress"
src\app\project-management\page.tsx:796:                  placeholder="Task description (markdown supported)"
src\app\project-management\page.tsx:807:                    placeholder="User email or name"
src\app\sales\invoices\page.tsx:100:                    placeholder="Search..."
src\components\suppliers\EnhancedSupplierForm.tsx:795:                                placeholder="Enter supplier name"
src\components\suppliers\EnhancedSupplierForm.tsx:820:                                placeholder="e.g., TECH001"
src\components\suppliers\EnhancedSupplierForm.tsx:846:                                  <SelectValue placeholder="Select status" />
src\components\suppliers\EnhancedSupplierForm.tsx:877:                                  <SelectValue placeholder="Select tier" />
src\components\suppliers\EnhancedSupplierForm.tsx:905:                              placeholder="Add a category"
src\components\suppliers\EnhancedSupplierForm.tsx:963:                            placeholder="Add a tag"
src\components\suppliers\EnhancedSupplierForm.tsx:1012:                            placeholder="Add a brand"
src\components\suppliers\EnhancedSupplierForm.tsx:1064:                              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-sm border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
src\components\suppliers\EnhancedSupplierForm.tsx:1065:                              placeholder="Additional notes about this supplier..."
src\components\suppliers\EnhancedSupplierForm.tsx:1105:                                placeholder="Enter legal company name"
src\components\suppliers\EnhancedSupplierForm.tsx:1130:                                placeholder="Enter trading name"
src\components\suppliers\EnhancedSupplierForm.tsx:1156:                                placeholder="Enter tax identification number"
src\components\suppliers\EnhancedSupplierForm.tsx:1181:                                placeholder="Enter business registration number"
src\components\suppliers\EnhancedSupplierForm.tsx:1204:                                placeholder="https://example.com"
src\components\suppliers\EnhancedSupplierForm.tsx:1230:                                placeholder="e.g., 2010"
src\components\suppliers\EnhancedSupplierForm.tsx:1261:                                placeholder="Number of employees"
src\components\suppliers\EnhancedSupplierForm.tsx:1292:                                  <SelectValue placeholder="Select currency" />
src\components\suppliers\EnhancedSupplierForm.tsx:1370:                                      <SelectValue placeholder="Select type" />
src\components\suppliers\EnhancedSupplierForm.tsx:1394:                                    placeholder="Enter full name"
src\components\suppliers\EnhancedSupplierForm.tsx:1412:                                    placeholder="Enter job title"
src\components\suppliers\EnhancedSupplierForm.tsx:1430:                                    placeholder="Enter department"
src\components\suppliers\EnhancedSupplierForm.tsx:1450:                                    placeholder="Enter email address"
src\components\suppliers\EnhancedSupplierForm.tsx:1468:                                    placeholder="Enter phone number"
src\components\suppliers\EnhancedSupplierForm.tsx:1486:                                    placeholder="Enter mobile number"
src\components\suppliers\EnhancedSupplierForm.tsx:1598:                                      <SelectValue placeholder="Select type" />
src\components\suppliers\EnhancedSupplierForm.tsx:1622:                                    placeholder="e.g., Main Office"
src\components\suppliers\EnhancedSupplierForm.tsx:1641:                                    placeholder="Enter street address"
src\components\suppliers\EnhancedSupplierForm.tsx:1659:                                    placeholder="Apartment, suite, etc."
src\components\suppliers\EnhancedSupplierForm.tsx:1678:                                    placeholder="Enter city"
src\components\suppliers\EnhancedSupplierForm.tsx:1696:                                    placeholder="Enter state or province"
src\components\suppliers\EnhancedSupplierForm.tsx:1714:                                    placeholder="Enter postal code"
src\components\suppliers\EnhancedSupplierForm.tsx:1733:                                      <SelectValue placeholder="Select country" />
src\components\suppliers\EnhancedSupplierForm.tsx:1817:                          placeholder="Add a product or item"
src\components\suppliers\EnhancedSupplierForm.tsx:1864:                          placeholder="Add a service"
src\components\suppliers\EnhancedSupplierForm.tsx:1916:                                placeholder="Enter lead time in days"
src\components\suppliers\EnhancedSupplierForm.tsx:1945:                                  <SelectValue placeholder="Select payment terms" />
src\components\suppliers\EnhancedSupplierForm.tsx:1979:                                  <SelectValue placeholder="Select credit rating" />
src\components\suppliers\EnhancedSupplierForm.tsx:2013:                                  <SelectValue placeholder="Select currency" />
src\app\integrations\woocommerce\page.tsx:84:  // Validate organization context with fallback
src\app\integrations\woocommerce\page.tsx:901:                      placeholder="My WooCommerce Store"
src\app\integrations\woocommerce\page.tsx:913:                      placeholder="https://your-store.com"
src\app\integrations\woocommerce\page.tsx:928:                      placeholder={config.id ? "Leave blank to keep existing credentials" : "ck_..."}
src\app\integrations\woocommerce\page.tsx:946:                      placeholder={config.id ? "Leave blank to keep existing credentials" : "cs_..."}
src\app\pricing-optimization\optimization\[id]\page.tsx:315:                    <SelectValue placeholder="Filter by status" />
src\app\pricing-optimization\optimization\[id]\page.tsx:328:                  placeholder="Min confidence"
src\components\suppliers\EnhancedSupplierDashboard.tsx:440:  // Calculate dashboard metrics from real data or fallback to sample
src\components\suppliers\EnhancedSupplierDashboard.tsx:775:                        placeholder="Search suppliers by name, code, or industry..."
src\components\suppliers\EnhancedSupplierDashboard.tsx:785:                        <SelectValue placeholder="All Tiers" />
src\components\suppliers\EnhancedSupplierDashboard.tsx:797:                        <SelectValue placeholder="All Status" />
src\components\suppliers\DiscountRulesManager.tsx:226:      } catch (fallbackError) {
src\components\suppliers\DiscountRulesManager.tsx:227:        console.error('Error loading supplier brands:', fallbackError);
src\components\suppliers\DiscountRulesManager.tsx:535:                placeholder="0.00"
src\components\suppliers\DiscountRulesManager.tsx:541:              This is the fallback discount used when no category/brand/SKU rules apply
src\components\suppliers\DiscountRulesManager.tsx:648:                placeholder="e.g., Electronics Category Discount"
src\components\suppliers\DiscountRulesManager.tsx:681:                  placeholder="0"
src\components\suppliers\DiscountRulesManager.tsx:722:                    <SelectValue placeholder="Select a category" />
src\components\suppliers\DiscountRulesManager.tsx:755:                        placeholder="Search brands..."
src\components\suppliers\DiscountRulesManager.tsx:830:                      placeholder="Enter SKUs, one per line or separated by commas&#10;Example:&#10;SKU-001&#10;SKU-002, SKU-003&#10;SKU-004"
src\components\suppliers\DiscountRulesManager.tsx:848:                      placeholder="Enter supplier SKU"
src\components\suppliers\AISupplierDiscovery.tsx:165:      const mockRecommendations: AISupplierRecommendation[] = [
src\components\suppliers\AISupplierDiscovery.tsx:278:      setRecommendations(mockRecommendations);
src\components\suppliers\AISupplierDiscovery.tsx:281:      const mockInsights: AIInsight[] = [
src\components\suppliers\AISupplierDiscovery.tsx:309:      setInsights(mockInsights);
src\components\suppliers\AISupplierDiscovery.tsx:455:                    placeholder="Describe what you're looking for (e.g., 'sustainable tech suppliers in Africa')"
src\components\suppliers\AISupplierDiscovery.tsx:527:                  <SelectValue placeholder="Industry" />
src\components\suppliers\AISupplierDiscovery.tsx:542:                  <SelectValue placeholder="Location" />
src\app\integrations\odoo\page.tsx:493:    const jobId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
src\app\integrations\odoo\page.tsx:620:                    placeholder="My Odoo ERP"
src\app\integrations\odoo\page.tsx:630:                    placeholder="https://your-company.odoo.sh"
src\app\integrations\odoo\page.tsx:648:                    placeholder="your_database_name"
src\app\integrations\odoo\page.tsx:662:                    placeholder="admin@company.com"
src\app\integrations\odoo\page.tsx:674:                    placeholder="********************************"
src\components\suppliers\ai\AISupplierInsightsPanel.tsx:478:                  placeholder="Ask me anything about your suppliers..."
src\components\suppliers\ai\AISupplierInsightsPanel.tsx:515:                    placeholder="Search insights..."
src\app\pricing-optimization\competitive-intelligence\trends\page.tsx:159:                  <SelectValue placeholder="Select product..." />
src\components\suppliers\ai\AISupplierDiscoveryPanel.tsx:166:                  placeholder="Describe what type of supplier you need... (e.g., 'sustainable packaging suppliers in South Africa')"
src\components\suppliers\ai\AIEnhancedSupplierForm.tsx:363:                              placeholder="Enter company name"
src\components\suppliers\ai\AIEnhancedSupplierForm.tsx:381:                            <Input {...field} id="legalName" placeholder="Legal business name" />
src\components\suppliers\ai\AIEnhancedSupplierForm.tsx:397:                                placeholder="https://example.com"
src\components\suppliers\ai\AIEnhancedSupplierForm.tsx:422:                                placeholder="contact@supplier.com"
src\components\suppliers\ai\AIEnhancedSupplierForm.tsx:446:                                placeholder="+27 11 123 4567"
src\components\suppliers\ai\AIEnhancedSupplierForm.tsx:465:                            <Input {...field} id="taxId" placeholder="Tax identification number" />
src\components\suppliers\ai\AIEnhancedSupplierForm.tsx:479:                              placeholder="Business registration number"
src\components\suppliers\ai\AIEnhancedSupplierForm.tsx:499:                              placeholder="123 Business Street"
src\components\suppliers\ai\AIEnhancedSupplierForm.tsx:520:                              placeholder="Johannesburg"
src\components\suppliers\ai\AIEnhancedSupplierForm.tsx:539:                              placeholder="Gauteng"
src\components\suppliers\ai\AIEnhancedSupplierForm.tsx:560:                              placeholder="2001"
src\components\suppliers\ai\AIEnhancedSupplierForm.tsx:582:                                <SelectValue placeholder="Select country" />
src\components\suppliers\ai\AIEnhancedSupplierForm.tsx:618:                                <SelectValue placeholder="Select category" />
src\components\suppliers\ai\AIEnhancedSupplierForm.tsx:680:                              placeholder="5"
src\components\suppliers\ai\AIEnhancedSupplierForm.tsx:698:                              placeholder="25"
src\components\suppliers\ai\AIEnhancedSupplierForm.tsx:718:                                <SelectValue placeholder="Select payment terms" />
src\components\suppliers\ai\AIEnhancedSupplierForm.tsx:824:                                <SelectValue placeholder="Rate sustainability efforts" />
src\components\suppliers\ai\AIEnhancedSupplierForm.tsx:847:                              placeholder="https://example.com/sustainability-report.pdf"
src\components\supplier-portfolio\SupplierProductDataTable.tsx:670:                placeholder="Search products..."
src\components\supplier-portfolio\SupplierProductDataTable.tsx:692:                  placeholder="All Suppliers"
src\components\supplier-portfolio\SupplierProductDataTable.tsx:708:                    <SelectValue placeholder="All Categories" />
src\components\supplier-portfolio\SupplierProductDataTable.tsx:730:                    <SelectValue placeholder="All Brands" />
src\app\repairs\orders\[id]\page.tsx:297:                      placeholder="Enter diagnosis..."
src\components\supplier-portfolio\ISSohReports.tsx:407:                    placeholder="Search product name or SKU..."
src\components\supplier-portfolio\ISSohReports.tsx:434:                    <SelectValue placeholder="All suppliers" />
src\components\supplier-portfolio\ISSohReports.tsx:458:                    <SelectValue placeholder="All locations" />
src\app\repairs\orders\page.tsx:102:                  placeholder="Search repair orders..."
src\components\supplier-portfolio\ISIWizard.tsx:124:          created_by: '00000000-0000-0000-0000-000000000000', // System user placeholder
src\components\supplier-portfolio\ISIWizard.tsx:160:          selected_by: '00000000-0000-0000-0000-000000000000', // System user placeholder
src\components\supplier-portfolio\ISIWizard.tsx:365:                    <SelectValue placeholder="Select or create selection" />
src\components\supplier-portfolio\ISIWizard.tsx:503:                placeholder="e.g., Q1 2025 Inventory"
src\components\supplier-portfolio\EnhancedPricelistUpload.tsx.restored:368:                  <SelectValue placeholder="Select supplier" />
src\lib\cmm\tag-ai-service.ts:281:      // If name is SKU, try to extract from name or return a placeholder
src\components\supplier-portfolio\EnhancedPricelistUpload.tsx:301:        allow_ai_fallback: aiInfo?.enableFallback ?? true,
src\components\supplier-portfolio\EnhancedPricelistUpload.tsx:414:          allow_ai_fallback: aiInfo?.enableFallback ?? true,
src\components\supplier-portfolio\EnhancedPricelistUpload.tsx:617:                      placeholder="Search suppliers by name or code..."
src\components\supplier-portfolio\EnhancedPricelistUpload.tsx:673:                  id="ai-fallback"
src\components\supplier-portfolio\EnhancedPricelistUpload.tsx:681:                <Label htmlFor="ai-fallback">Allow AI fallback when no rules configured</Label>
src\components\supplier-portfolio\EnhancedPricelistUpload.tsx:742:                      {aiInfo.enableFallback ? '(fallback enabled)' : ''}
src\components\supplier-portfolio\EnhancedPricelistUpload.tsx:906:                              allow_ai_fallback: aiInfo?.enableFallback ?? true,
src\components\supplier-portfolio\EnhancedPricelistUpload.tsx:1242:                  <SelectValue placeholder="Select type" />
src\components\supplier-portfolio\AIPriceExtractionPanel.tsx:243:                placeholder="Example: Force ZAR currency; map 'Exclusive Price' to net_price; derive pack_size from size columns."
src\components\supplier-portfolio\AIPriceExtractionPanel.tsx:255:                    placeholder="Select supplier"
src\components\supplier-portfolio\AIPriceExtractionPanel.tsx:266:                      placeholder="00000000-0000-0000-0000-000000000000"
src\components\supplier-portfolio\AIPriceExtractionPanel.tsx:285:                    placeholder="Supplier Pricelist Data Extraction"
src\components\supplier-portfolio\AIPriceExtractionPanel.tsx:296:                    placeholder="Paste configured AI service ID"
src\app\repairs\orders\new\page.tsx:164:                    <SelectValue placeholder="Select equipment" />
src\app\repairs\orders\new\page.tsx:183:                    <SelectValue placeholder="Select customer" />
src\app\repairs\orders\new\page.tsx:244:                    <SelectValue placeholder="Select technician" />
src\app\repairs\orders\new\page.tsx:278:              placeholder="Describe the issue..."
src\components\subscription\SubscriptionUpgradeForm.tsx:206:                          placeholder="John Smith"
src\components\subscription\SubscriptionUpgradeForm.tsx:226:                          placeholder="john@example.com"
src\components\subscription\SubscriptionUpgradeForm.tsx:250:                        placeholder="1234 5678 9012 3456"
src\components\subscription\SubscriptionUpgradeForm.tsx:275:                          placeholder="MM/YY"
src\components\subscription\SubscriptionUpgradeForm.tsx:299:                          placeholder="123"
src\components\subscription\SubscriptionUpgradeForm.tsx:385:                      placeholder="Any special requests or questions?"
src\app\pricing-optimization\competitive-intelligence\positioning\page.tsx:163:                  <SelectValue placeholder="Select product..." />
src\app\api\suppliers\[id]\route.ts:117:    // If FK constraint error sneaks through, fallback to soft delete
src\app\rentals\reservations\page.tsx:100:                  placeholder="Search reservations..."
src\app\pricing-optimization\competitive-intelligence\matches\page.tsx:156:                  placeholder="Search matches..."
src\components\social-media\sales\ShoppingCart.tsx:87:                src={item.productImage || "/placeholder.svg"}
src\components\social-media\sales\ShoppingCart.tsx:140:                      placeholder="+27 82 123 4567"
src\components\social-media\sales\ProductCard.tsx:46:            src={product.image || "/placeholder.svg"}
src\components\social-media\sales\ProductCard.tsx:109:                  src={product.image || "/placeholder.svg"}
src\app\rentals\reservations\new\page.tsx:277:                    <SelectValue placeholder="Select customer" />
src\app\rentals\reservations\new\page.tsx:294:                  placeholder="Corporate event, wedding, etc."
src\app\rentals\reservations\new\page.tsx:303:                  placeholder="corporate, wedding, concert, etc."
src\app\rentals\reservations\new\page.tsx:352:                  <SelectValue placeholder={loading ? "Loading equipment..." : availableEquipment.length === 0 ? "No equipment available - Add equipment first" : "Select equipment"} />
src\app\rentals\reservations\new\page.tsx:372:                placeholder="Qty"
src\app\rentals\reservations\new\page.tsx:422:                  placeholder="Enter delivery address"
src\components\social-media\inbox\UnifiedInbox.tsx:210:              placeholder="Search conversations..."
src\components\social-media\inbox\UnifiedInbox.tsx:434:                  placeholder={`Reply on ${selectedConversation.platform}...`}
src\app\pricing-optimization\competitive-intelligence\history\page.tsx:222:                  <SelectValue placeholder="Select product..." />
src\lib\services\WooCommerceSyncQueue.ts:131:      : `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
src\lib\services\WooCommerceSyncQueue.ts:286:    const placeholders = lineIds.map((_, i) => `$${i + 1}`).join(',');
src\lib\services\WooCommerceSyncQueue.ts:291:       WHERE id IN (${placeholders}) AND org_id = $${lineIds.length + 1}`,
src\lib\services\WooCommerceSyncQueue.SECURE.ts:120:      : `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
src\lib\services\WooCommerceSyncQueue.SECURE.ts:275:    const placeholders = lineIds.map((_, i) => `$${i + 1}`).join(',');
src\lib\services\WooCommerceSyncQueue.SECURE.ts:280:       WHERE id IN (${placeholders}) AND org_id = $${lineIds.length + 1}`,
src\lib\services\UnifiedDataService.ts:406:        const envOrgId = process.env.DEFAULT_ORG_ID;
src\app\pricing-optimization\competitive-intelligence\competitors\page.tsx:401:                        <Input placeholder="Enter company name" {...field} />
src\app\pricing-optimization\competitive-intelligence\competitors\page.tsx:414:                        <Input placeholder="https://example.com" {...field} />
src\app\pricing-optimization\competitive-intelligence\competitors\page.tsx:427:                        <Input placeholder="USD" {...field} />
src\app\pricing-optimization\competitive-intelligence\competitors\page.tsx:441:                          placeholder="Additional notes about this competitor"
src\app\rentals\packages\page.tsx:99:                  placeholder="Search packages..."
src\components\social-media\channels\ConnectionModal.tsx:278:                      placeholder="Enter your username or email"
src\components\social-media\channels\ConnectionModal.tsx:289:                      placeholder="Enter your password"
database\migrations\003_critical_schema_fixes_VALIDATION.sql:554:-- 10.1 Test cost_price trigger (mock test)
src\components\sidebar\InventoryValueMeter.tsx:20:      const baseLoad = Math.random() * 50 + 30; // Base load between 30-80%
src\components\sidebar\InventoryValueMeter.tsx:22:      const randomSpike = Math.random() * 20; // Random spikes
src\components\sidebar\InventoryValueMeter.tsx:27:      setFlickerState(prev => prev.map((_, i) => Math.random() > 0.6));
src\app\pricing-optimization\competitive-intelligence\alerts\configure\page.tsx:225:                            placeholder="e.g., 5.0"
src\app\pricing-optimization\competitive-intelligence\alerts\configure\page.tsx:244:                            placeholder="e.g., 10.00"
src\app\financial\page.tsx:202:              Chart placeholder - Revenue trend visualization
src\components\shared\StandardFiltersBar.tsx:53:        placeholder={searchPlaceholder}
src\app\pricing-optimization\analytics\page.tsx:91:      // For now, using placeholder structure
src\app\pricing-optimization\analytics\page.tsx:108:      // For now, using placeholder structure
src\app\pricing-optimization\analytics\page.tsx:417:            placeholder="UUID"
src\app\pricing-optimization\analytics\page.tsx:427:            placeholder="Competitor name"
src\app\pricing-optimization\analytics\page.tsx:439:            placeholder="SKU"
src\app\pricing-optimization\analytics\page.tsx:450:            placeholder="0.00"
src\app\pricing-optimization\analytics\page.tsx:479:            placeholder="https://..."
src\components\shared\SearchableSupplierSelect.tsx:32:  placeholder?: string;
src\components\shared\SearchableSupplierSelect.tsx:50:  placeholder = 'Select supplier',
src\components\shared\SearchableSupplierSelect.tsx:98:      : placeholder;
src\components\shared\SearchableSupplierSelect.tsx:127:              placeholder="Search suppliers by name or code..."
src\lib\services\SupplierJsonSyncService.ts:501:    // Extract SKU - use product ID as fallback
src\app\rentals\equipment\[id]\page.tsx:218:                    placeholder="EQUIP-001"
src\app\rentals\equipment\[id]\page.tsx:228:                    placeholder="Equipment name"
src\app\rentals\equipment\[id]\page.tsx:237:                    placeholder="camera, microphone, speaker, etc."
src\app\rentals\equipment\page.tsx:134:                  placeholder="Search equipment..."
src\lib\services\supplier\AIPriceExtractionService.ts:84:  private ensureString(value: any, fallback: string): string {
src\lib\services\supplier\AIPriceExtractionService.ts:90:    return fallback;
src\components\sales-channels\StockAllocationManager.tsx:224:                        <SelectValue placeholder="Select a product" />
src\components\sales-channels\StockAllocationManager.tsx:242:                        <SelectValue placeholder="All locations" />
src\components\sales-channels\StockAllocationManager.tsx:283:                      placeholder="Enter quantity"
src\components\sales-channels\StockAllocationManager.tsx:298:                      placeholder="0"
src\components\sales-channels\StockAllocationManager.tsx:308:                      placeholder="Leave empty for unlimited"
src\components\sales-channels\StockAllocationManager.tsx:328:              placeholder="Search allocations..."
src\lib\services\StockService.ts:160:        const placeholders: string[] = [];
src\lib\services\StockService.ts:166:          placeholders.push(
src\lib\services\StockService.ts:185:            VALUES ${placeholders.join(', ')}
src\lib\services\StockService.ts:579:    // Otherwise, construct the query manually (fallback for Phase 1)
src\app\rentals\damage\page.tsx:143:                  placeholder="Search damage reports..."
src\app\rentals\damage\page.tsx:151:                  <SelectValue placeholder="Filter by status" />
src\lib\cmm\tag-ai\web-research.ts:101:      // Manual/fallback - return empty results
src\components\sales-channels\ProductMappingTable.tsx:254:                        <SelectValue placeholder="Select a product" />
src\components\sales-channels\ProductMappingTable.tsx:284:              placeholder="Search products..."
src\app\api\v2\suppliers\[id]\route.ts:13:const mockSupplierData: InternalSupplier[] = [];
src\app\api\v2\suppliers\[id]\route.ts:32:      const supplier = mockSupplierData.find(supplier => supplier.id === id);
src\app\api\v2\suppliers\[id]\route.ts:39:        // Performance trends (mock data - would be calculated from historical data)
src\app\api\v2\suppliers\[id]\route.ts:54:        // Recent orders (mock data)
src\app\api\v2\suppliers\[id]\route.ts:86:        // Active contracts (mock data)
src\app\api\v2\suppliers\[id]\route.ts:177:      const supplierIndex = mockSupplierData.findIndex(supplier => supplier.id === id);
src\app\api\v2\suppliers\[id]\route.ts:184:        const existingSupplier = mockSupplierData.find(
src\app\api\v2\suppliers\[id]\route.ts:197:        const existingEmail = mockSupplierData.find(
src\app\api\v2\suppliers\[id]\route.ts:208:      const existingSupplier = mockSupplierData[supplierIndex];
src\app\api\v2\suppliers\[id]\route.ts:260:      mockSupplierData[supplierIndex] = updatedSupplier;
src\app\api\v2\suppliers\[id]\route.ts:309:      const supplierIndex = mockSupplierData.findIndex(supplier => supplier.id === id);
src\app\api\v2\suppliers\[id]\route.ts:314:      const supplier = mockSupplierData[supplierIndex];
src\app\api\v2\suppliers\[id]\route.ts:326:      const hasInventoryItems = Math.random() > 0.7; // Mock check
src\app\api\v2\suppliers\[id]\route.ts:332:      const hasActiveContracts = Math.random() > 0.8; // Mock check
src\app\api\v2\suppliers\[id]\route.ts:338:      const hasOutstandingInvoices = Math.random() > 0.6; // Mock check
src\app\api\v2\suppliers\[id]\route.ts:372:      const deletedSupplier = mockSupplierData[supplierIndex];
src\app\api\v2\suppliers\[id]\route.ts:373:      mockSupplierData.splice(supplierIndex, 1);
src\components\sales-channels\ChannelOrdersList.tsx:187:              placeholder="Search orders..."
src\lib\cmm\tag-ai\resolver.ts:417:    console.log(`[tag-ai:resolver] Using fallback single provider config`);
src\components\sales-channels\ChannelConfigForm.tsx:239:                      placeholder="https://example.com/wp-json/wc/v3"
src\components\sales-channels\ChannelConfigForm.tsx:255:                    <Input type="password" placeholder="ck_..." {...field} />
src\components\sales-channels\ChannelConfigForm.tsx:268:                    <Input type="password" placeholder="cs_..." {...field} />
src\components\sales-channels\ChannelConfigForm.tsx:286:                    <Input type="password" placeholder="EAA..." {...field} />
src\components\sales-channels\ChannelConfigForm.tsx:299:                    <Input placeholder="1234567890" {...field} />
src\components\sales-channels\ChannelConfigForm.tsx:312:                    <Input placeholder="1234567890" {...field} />
src\components\sales-channels\ChannelConfigForm.tsx:330:                    <Input type="password" placeholder="EAA..." {...field} />
src\components\sales-channels\ChannelConfigForm.tsx:343:                    <Input placeholder="1234567890" {...field} />
src\components\sales-channels\ChannelConfigForm.tsx:361:                    <Input type="password" placeholder="EAA..." {...field} />
src\components\sales-channels\ChannelConfigForm.tsx:374:                    <Input placeholder="1234567890" {...field} />
src\components\sales-channels\ChannelConfigForm.tsx:387:                    <Input placeholder="1234567890" {...field} />
src\components\sales-channels\ChannelConfigForm.tsx:405:                    <Input type="password" placeholder="..." {...field} />
src\components\sales-channels\ChannelConfigForm.tsx:418:                    <Input placeholder="..." {...field} />
src\components\sales-channels\ChannelConfigForm.tsx:431:                    <Input type="password" placeholder="..." {...field} />
src\components\sales-channels\ChannelConfigForm.tsx:444:                    <Input placeholder="..." {...field} />
src\components\sales-channels\ChannelConfigForm.tsx:519:                            <SelectValue placeholder="Select channel type" />
src\components\sales-channels\ChannelConfigForm.tsx:541:                        <Input placeholder="My WooCommerce Store" {...field} />
src\components\sales-channels\ChannelConfigForm.tsx:658:                          placeholder="https://your-domain.com/api/v1/sales-channels/{id}/webhook"
src\components\sales-channels\ChannelConfigForm.tsx:677:                        <Input type="password" placeholder="Secret key" {...field} />
src\app\purchase-orders\page.tsx:96:const mockPurchaseOrders: PurchaseOrder[] = [
src\app\purchase-orders\page.tsx:356:  // Add more mock data...
src\app\purchase-orders\page.tsx:486:const mockMetrics: PODashboardMetrics = {
src\app\purchase-orders\page.tsx:502:  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(mockPurchaseOrders);
src\app\purchase-orders\page.tsx:503:  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>(mockPurchaseOrders);
src\app\purchase-orders\page.tsx:789:                <div className="text-2xl font-bold">{mockMetrics.totalOrders}</div>
src\app\purchase-orders\page.tsx:791:                  {formatCurrency(mockMetrics.totalValue)} total value
src\app\purchase-orders\page.tsx:802:                <div className="text-2xl font-bold">{mockMetrics.pendingApprovals}</div>
src\app\purchase-orders\page.tsx:813:                <div className="text-2xl font-bold">{mockMetrics.budgetUtilization}%</div>
src\app\purchase-orders\page.tsx:815:                  <Progress value={mockMetrics.budgetUtilization} className="h-2" />
src\app\purchase-orders\page.tsx:826:                <div className="text-2xl font-bold">{mockMetrics.onTimeDeliveryRate}%</div>
src\app\purchase-orders\page.tsx:839:                <div className="text-xl font-bold">{mockMetrics.qualityScore}%</div>
src\app\purchase-orders\page.tsx:848:                <div className="text-xl font-bold">{formatCurrency(mockMetrics.costSavings)}</div>
src\app\purchase-orders\page.tsx:857:                <div className="text-xl font-bold">{mockMetrics.averageCycleTime}h</div>
src\app\purchase-orders\page.tsx:866:                <div className="text-xl font-bold">{mockMetrics.contractCompliance}%</div>
src\app\purchase-orders\page.tsx:875:                <div className="text-xl font-bold">{mockMetrics.supplierPerformance}%</div>
src\app\purchase-orders\page.tsx:885:                  {mockMetrics.overdueDeliveries}
src\app\purchase-orders\page.tsx:905:                      placeholder="Search orders..."
src\app\purchase-orders\page.tsx:1329:                        <SelectValue placeholder={itemsPerPage} />
src\app\purchase-orders\page.tsx:1428:                  <SelectValue placeholder="Select supplier" />
src\app\purchase-orders\page.tsx:1442:                  <SelectValue placeholder="Select department" />
src\app\purchase-orders\page.tsx:1455:              <Input id="budgetCode" placeholder="e.g., IT-2024-Q1" />
src\app\purchase-orders\page.tsx:1462:                  <SelectValue placeholder="Select priority" />
src\app\purchase-orders\page.tsx:1492:                  <SelectValue placeholder="Select payment terms" />
src\app\purchase-orders\page.tsx:1505:              <Textarea id="notes" placeholder="Additional notes or requirements..." />
src\app\purchase-orders\page.tsx:1531:                  <Input id="deliveryName" placeholder="e.g., Main Office" />
src\app\purchase-orders\page.tsx:1535:                  <Input id="deliveryStreet" placeholder="123 Business St" />
src\app\purchase-orders\page.tsx:1540:                    <Input id="deliveryCity" placeholder="New York" />
src\app\purchase-orders\page.tsx:1544:                    <Input id="deliveryState" placeholder="NY" />
src\app\purchase-orders\page.tsx:1550:                    <Input id="deliveryZip" placeholder="10001" />
src\app\purchase-orders\page.tsx:1554:                    <Input id="deliveryCountry" placeholder="USA" />
src\app\purchase-orders\page.tsx:1569:                  <Input id="billingName" placeholder="e.g., Corporate HQ" />
src\app\purchase-orders\page.tsx:1573:                  <Input id="billingStreet" placeholder="123 Business St" />
src\app\purchase-orders\page.tsx:1578:                    <Input id="billingCity" placeholder="New York" />
src\app\purchase-orders\page.tsx:1582:                    <Input id="billingState" placeholder="NY" />
src\app\purchase-orders\page.tsx:1588:                    <Input id="billingZip" placeholder="10001" />
src\app\purchase-orders\page.tsx:1592:                    <Input id="billingCountry" placeholder="USA" />
src\app\purchase-orders\page.tsx:1739:            placeholder="Min amount"
src\app\purchase-orders\page.tsx:1754:            placeholder="Max amount"
src\lib\cmm\tag-ai\engine.ts:15:import { isReasoningModel, supportsJsonSchema } from './fallback';
src\lib\cmm\tag-ai\engine.ts:268:            `CLI mode is enabled but execution failed and no valid API key is provided for fallback. ` +
src\lib\cmm\tag-ai\engine.ts:385:      `openai enrichProduct JSON-fallback generateText (${modelName || 'default'})`
src\lib\cmm\tag-ai\engine.ts:520:      const fallbackMaxTokens = isTruncationError
src\lib\cmm\tag-ai\engine.ts:523:      const textOpts: unknown = { model, prompt: jsonPrompt, maxOutputTokens: fallbackMaxTokens };
src\lib\cmm\tag-ai\engine.ts:531:      // Check if fallback also truncated
src\lib\cmm\tag-ai\engine.ts:533:        console.warn(`[engine] suggestTagsBatch fallback also truncated. Attempting JSON repair.`);
src\lib\cmm\tag-ai\engine.ts:538:        `[engine] suggestTagsBatch success (anthropic JSON fallback) provider=${provider.provider} model=${modelName} suggestions=${parsed?.suggestions?.length ?? 0}`
src\lib\cmm\tag-ai\engine.ts:728:        `[engine] suggestTagsBatch truncation detected. Attempting fallback with higher token limit.`
src\lib\cmm\tag-ai\engine.ts:732:      const fallbackMaxTokens = Math.min(
src\lib\cmm\tag-ai\engine.ts:736:      const textOpts: unknown = { model, prompt: jsonPrompt, maxOutputTokens: fallbackMaxTokens };
src\lib\cmm\tag-ai\engine.ts:742:          `openai batch JSON-fallback generateText (${modelName || 'default'})`
src\lib\cmm\tag-ai\engine.ts:747:            `[engine] suggestTagsBatch success (openai fallback, partial) provider=${provider.provider} model=${modelName} suggestions=${parsed?.suggestions?.length ?? 0}`
src\lib\cmm\tag-ai\engine.ts:751:      } catch (fallbackErr) {
src\lib\cmm\tag-ai\engine.ts:752:        console.error(`[engine] suggestTagsBatch fallback also failed:`, fallbackErr);
src\lib\cmm\tag-ai\engine.ts:762:        `openai batch JSON-fallback generateText (${modelName || 'default'})`
src\lib\cmm\tag-ai\engine.ts:766:        `[engine] suggestTagsBatch success (openai fallback) provider=${provider.provider} model=${modelName} suggestions=${parsed?.suggestions?.length ?? 0}`
src\lib\cmm\supplier-rules-engine-enhanced.ts:362: * Extract category from section headers (placeholder - implement based on specific needs)
src\components\sales\CustomerSelector.tsx:63:        <SelectValue placeholder="Select customer..." />
src\components\sales\AdvancedProductSearch.tsx:37:  placeholder?: string;
src\components\sales\AdvancedProductSearch.tsx:44:  placeholder = 'Search products by name, SKU, category, brand...',
src\components\sales\AdvancedProductSearch.tsx:222:          <span className="text-muted-foreground">{placeholder}</span>
src\components\sales\AdvancedProductSearch.tsx:231:              placeholder={placeholder}
src\components\sales\AdvancedProductSearch.tsx:336:                    placeholder="Min price (ZAR)"
src\components\sales\AdvancedProductSearch.tsx:348:                    placeholder="Max price (ZAR)"
src\components\sales\AdvancedCustomerSearch.tsx:34:  placeholder?: string;
src\components\sales\AdvancedCustomerSearch.tsx:58:  placeholder = 'Search customers by name, email, company, phone...',
src\components\sales\AdvancedCustomerSearch.tsx:218:            <span className="text-muted-foreground">{placeholder}</span>
src\components\sales\AdvancedCustomerSearch.tsx:228:              placeholder={placeholder}
src\components\sales\AdvancedCustomerSearch.tsx:290:                    placeholder="Min lifetime value (ZAR)"
src\components\sales\AdvancedCustomerSearch.tsx:302:                    placeholder="Max lifetime value (ZAR)"
src\app\api\suppliers\v3\route.ts:245: * Tries: request body -> auth context -> env var -> database -> fallback
src\app\api\suppliers\v3\route.ts:279:  const envOrgId = process.env.DEFAULT_ORG_ID;
src\components\examples\ComprehensiveSupplierUI.tsx:76:    price: Math.round((Math.random() * 1000 + 50) * 100) / 100,
src\components\examples\ComprehensiveSupplierUI.tsx:77:    stock: Math.floor(Math.random() * 500),
src\components\examples\ComprehensiveSupplierUI.tsx:79:    lastUpdated: new Date(Date.now() - Math.random() * 86400000 * 30), // Random within 30 days
src\components\examples\ComprehensiveSupplierUI.tsx:81:      Math.random() > 0.1
src\components\examples\ComprehensiveSupplierUI.tsx:83:        : ((Math.random() > 0.5 ? 'inactive' : 'pending') as 'active' | 'inactive' | 'pending'),
src\components\examples\ComprehensiveSupplierUI.tsx:85:      priceChange: (Math.random() - 0.5) * 20,
src\components\examples\ComprehensiveSupplierUI.tsx:86:      demandChange: (Math.random() - 0.5) * 50,
src\components\examples\ComprehensiveSupplierUI.tsx:87:      stockMovement: Math.floor((Math.random() - 0.5) * 100),
src\components\examples\ComprehensiveSupplierUI.tsx:112:    phone: `+1-555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
src\components\examples\ComprehensiveSupplierUI.tsx:115:      Math.random() > 0.1
src\components\examples\ComprehensiveSupplierUI.tsx:117:        : ((Math.random() > 0.5 ? 'inactive' : 'pending') as 'active' | 'inactive' | 'pending'),
src\components\examples\ComprehensiveSupplierUI.tsx:118:    createdAt: new Date(Date.now() - Math.random() * 86400000 * 365), // Random within year
src\components\examples\ComprehensiveSupplierUI.tsx:119:    productsCount: Math.floor(Math.random() * 100) + 1,
src\components\examples\ComprehensiveSupplierUI.tsx:121:      Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 86400000 * 90) : undefined,
src\components\examples\ComprehensiveSupplierUI.tsx:134:  const mockProducts = useMemo(() => generateMockProducts(150), []);
src\components\examples\ComprehensiveSupplierUI.tsx:135:  const mockSuppliers = useMemo(() => generateMockSuppliers(25), []);
src\components\examples\ComprehensiveSupplierUI.tsx:528:                  data={mockProducts}
src\components\examples\ComprehensiveSupplierUI.tsx:530:                  placeholder="Search products by SKU, name, category, supplier..."
src\components\examples\ComprehensiveSupplierUI.tsx:541:                  products={searchResults.length > 0 ? searchResults : mockProducts}
src\components\examples\ComprehensiveSupplierUI.tsx:560:                  data={mockSuppliers}
src\components\examples\ComprehensiveSupplierUI.tsx:562:                  placeholder="Search suppliers by name, code, contact, category..."
src\components\examples\ComprehensiveSupplierUI.tsx:573:                    data={(searchResults.length > 0 ? searchResults : mockSuppliers) as Supplier[]}
src\components\examples\ComprehensiveSupplierUI.tsx:630:                    data={mockProducts}
src\lib\cmm\proposed-tags\repository.ts:9:const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';
src\lib\cmm\proposed-tags\repository.ts:23:  const orgId = params.orgId || DEFAULT_ORG_ID;
src\components\examples\BulletproofDashboardExample.tsx:55:  await new Promise(resolve => setTimeout(resolve, Math.random() * 2000));
src\components\examples\BulletproofDashboardExample.tsx:58:  if (Math.random() < 0.1) {
src\components\examples\BulletproofDashboardExample.tsx:78:  await new Promise(resolve => setTimeout(resolve, Math.random() * 1500));
src\components\examples\BulletproofDashboardExample.tsx:80:  if (Math.random() < 0.15) {
src\components\examples\BulletproofDashboardExample.tsx:122:  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
src\components\examples\BulletproofDashboardExample.tsx:124:  if (Math.random() < 0.05) {
src\components\examples\BulletproofDashboardExample.tsx:140:  await new Promise(resolve => setTimeout(resolve, Math.random() * 1200));
src\components\examples\BulletproofDashboardExample.tsx:257:              quantity: NumberValidator.validate(item.quantity, { fallback: 0, min: 0 }).data || 0,
src\components\examples\BulletproofDashboardExample.tsx:259:                NumberValidator.validate(item.price, { fallback: 0, min: 0, decimals: 2 }).data ||
src\components\examples\BulletproofDashboardExample.tsx:262:                TimestampValidator.validate(item.timestamp, { fallbackToNow: true }).data ||
src\components\examples\BulletproofDashboardExample.tsx:354:                NumberValidator.validate(supplier.rating, { min: 0, max: 5, fallback: 0 }).data ||
src\components\examples\BulletproofDashboardExample.tsx:428:          fallback={
src\components\examples\BulletproofDashboardExample.tsx:451:              fallback={
src\components\repairs\TestResultsForm.tsx:90:            placeholder="e.g., Functionality Test, Calibration Check"
src\components\repairs\TestResultsForm.tsx:99:            placeholder="functionality, calibration, stress_test, etc."
src\components\error-boundaries\GranularErrorBoundary.tsx:44:  fallbackComponent?: ReactNode;
src\components\error-boundaries\GranularErrorBoundary.tsx:66:    const errorId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
src\components\error-boundaries\GranularErrorBoundary.tsx:108:      fallbackComponent,
src\components\error-boundaries\GranularErrorBoundary.tsx:117:      if (fallbackComponent) {
src\components\error-boundaries\GranularErrorBoundary.tsx:118:        return fallbackComponent;
src\components\error-boundaries\GranularErrorBoundary.tsx:216:    fallbackComponent={
src\components\error-boundaries\GranularErrorBoundary.tsx:242:    fallbackComponent={
src\components\error-boundaries\DataErrorBoundary.tsx:17:  fallback?: ReactNode;
src\components\error-boundaries\DataErrorBoundary.tsx:188:    const { children, fallback, retryable = true, className = '' } = this.props;
src\components\error-boundaries\DataErrorBoundary.tsx:191:      // Use custom fallback if provided
src\components\error-boundaries\DataErrorBoundary.tsx:192:      if (fallback) {
src\components\error-boundaries\DataErrorBoundary.tsx:193:        return fallback;
src\components\repairs\PartsUsageForm.tsx:87:              <SelectValue placeholder="Select part" />
src\components\repairs\PartsUsageForm.tsx:103:            placeholder="Qty"
src\components\repairs\PartsUsageForm.tsx:111:            placeholder="Unit Cost"
src\components\docustore-sidebar.tsx:215:                    console.warn('Logo failed to load, using fallback');
src\app\api\suppliers\real-data\route.ts:91:      performanceScore: Math.round(75 + Math.random() * 25),
src\app\api\suppliers\real-data\route.ts:92:      onTimeDelivery: Math.round(85 + Math.random() * 15),
src\app\api\suppliers\real-data\route.ts:93:      qualityRating: Math.round((4 + Math.random()) * 10) / 10,
src\components\rentals\SendAgreementDialog.tsx:240:              placeholder="+27 82 123 4567"
database\migrations\0213_sync_view_compat.sql:106:-- Orders view (fallback to purchase orders)
database\migrations\0212_sync_preview_schema_restore.sql:11:-- 1. ENUM DEFINITIONS (idempotent with additive fallbacks)
src\lib\services\sales-channels\adapters\WhatsAppAdapter.ts:61:    // This is a placeholder implementation
src\lib\services\sales-channels\adapters\WhatsAppAdapter.ts:73:    // This is a placeholder implementation
src\app\api\suppliers\pricelists\upload\live-route.ts:359:    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
src\app\api\suppliers\pricelists\upload\live-route.ts:881:  const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
src\app\api\webhooks\clerk\route.ts:199:  // Note: We use a placeholder password hash since Clerk handles authentication
src\app\api\webhooks\clerk\route.ts:200:  const placeholderHash = '$clerk$' + id; // Not a real hash, just a marker
src\app\api\webhooks\clerk\route.ts:236:      placeholderHash,
src\components\purchase-orders\PurchaseOrdersManagement.tsx:169:const mockPurchaseOrders: PurchaseOrder[] = [
src\components\purchase-orders\PurchaseOrdersManagement.tsx:244:  // Add more mock data as needed
src\components\purchase-orders\PurchaseOrdersManagement.tsx:483:                  placeholder="Search by PO number, supplier, or department..."
src\components\purchase-orders\PurchaseOrdersManagement.tsx:492:                <SelectValue placeholder="Status" />
src\components\purchase-orders\PurchaseOrdersManagement.tsx:510:                <SelectValue placeholder="Priority" />
src\components\purchase-orders\PurchaseOrdersManagement.tsx:522:                <SelectValue placeholder="Department" />
src\lib\services\sales-channels\adapters\TikTokAdapter.ts:65:    // This is a placeholder implementation
src\lib\services\sales-channels\adapters\TikTokAdapter.ts:77:    // This is a placeholder implementation
src\components\purchase-orders\POTemplates.tsx:86:const mockTemplates: POTemplate[] = [
src\components\purchase-orders\POTemplates.tsx:184:  const filteredTemplates = mockTemplates.filter(template => {
src\components\purchase-orders\POTemplates.tsx:250:                    placeholder="Search templates..."
src\components\purchase-orders\POTemplates.tsx:431:                    <Input id="template-name" placeholder="e.g., Standard Laptop Setup" />
src\components\purchase-orders\POTemplates.tsx:437:                      className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-sm border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
src\components\purchase-orders\POTemplates.tsx:453:                    placeholder="Describe what this template is for..."
src\components\purchase-orders\POTemplates.tsx:460:                    <Input id="default-supplier" placeholder="Search suppliers..." />
src\components\purchase-orders\POTemplates.tsx:486:                            <Input placeholder="e.g., LAPTOP-001" />
src\components\purchase-orders\POTemplates.tsx:490:                            <Input placeholder="Item description" />
src\components\purchase-orders\POTemplates.tsx:494:                            <Input type="number" placeholder="1" />
src\components\purchase-orders\POTemplates.tsx:498:                            <Input type="number" placeholder="0.00" />
src\components\purchase-orders\POTemplates.tsx:503:                          <Textarea placeholder="Technical specifications or notes..." />
src\components\purchase-orders\POTemplates.tsx:522:                      <select className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-sm border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50">
src\components\purchase-orders\POTemplates.tsx:531:                      <select className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-sm border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50">
src\components\purchase-orders\POTemplates.tsx:540:                      <select className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-sm border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50">
src\components\purchase-orders\POTemplates.tsx:562:              {mockTemplates
src\components\purchase-orders\POTemplates.tsx:594:            {mockTemplates.filter(t => t.isFavorite).length === 0 && (
src\components\docustore\SignerManagement.tsx:153:                      <Input placeholder="John Doe" {...field} />
src\components\docustore\SignerManagement.tsx:167:                      <Input type="email" placeholder="john@example.com" {...field} />
src\components\docustore\SignerManagement.tsx:184:                        <SelectValue placeholder="Select role" />
src\lib\services\sales-channels\adapters\InstagramAdapter.ts:60:    // This is a placeholder implementation
src\lib\services\sales-channels\adapters\InstagramAdapter.ts:72:    // This is a placeholder implementation
src\components\purchase-orders\POCreationWizard.tsx:69:const mockSuppliers: Supplier[] = [
src\components\purchase-orders\POCreationWizard.tsx:184:  const selectedSupplier = mockSuppliers.find(s => s.id === formData.supplierId);
src\components\purchase-orders\POCreationWizard.tsx:307:  const filteredSuppliers = mockSuppliers.filter(
src\components\purchase-orders\POCreationWizard.tsx:453:                        placeholder="Search by name or code..."
src\components\purchase-orders\POCreationWizard.tsx:502:                        <SelectValue placeholder="Select department" />
src\components\purchase-orders\POCreationWizard.tsx:536:                      placeholder="e.g., BUDGET-2024-001"
src\components\purchase-orders\POCreationWizard.tsx:570:                    placeholder="Additional notes or special instructions..."
src\components\purchase-orders\POCreationWizard.tsx:607:                            placeholder="e.g., LAPTOP-001"
src\components\purchase-orders\POCreationWizard.tsx:619:                              <SelectValue placeholder="Select category" />
src\components\purchase-orders\POCreationWizard.tsx:635:                          placeholder="Detailed description of the item..."
src\components\purchase-orders\POCreationWizard.tsx:678:                          placeholder="Technical specifications or requirements..."
src\components\purchase-orders\POCreationWizard.tsx:728:                        <SelectValue placeholder="Select payment terms" />
src\lib\services\sales-channels\adapters\FacebookAdapter.ts:59:    // This is a placeholder implementation
src\lib\services\sales-channels\adapters\FacebookAdapter.ts:71:    // This is a placeholder implementation
src\components\purchase-orders\MultiSupplierProductPicker.tsx:212:                      placeholder="Search by SKU or product name..."
src\app\api\suppliers\pricelists\promote\route.ts:58:    // For now, I'll create a mock response based on the existing pricelist structure
src\app\api\suppliers\pricelists\promote\route.ts:59:    const mockPricelistItems = [
src\app\api\suppliers\pricelists\promote\route.ts:111:    const skusToCheck = mockPricelistItems.map(item => item.sku);
src\app\api\suppliers\pricelists\promote\route.ts:125:    const itemsWithStatus = mockPricelistItems.map(item => {
src\app\api\suppliers\pricelists\promote\route.deprecated.ts:94:    // For now, I'll create a mock response based on the existing pricelist structure
src\app\api\suppliers\pricelists\promote\route.deprecated.ts:95:    const mockPricelistItems = [
src\app\api\suppliers\pricelists\promote\route.deprecated.ts:147:    const skusToCheck = mockPricelistItems.map(item => item.sku);
src\app\api\suppliers\pricelists\promote\route.deprecated.ts:161:    const itemsWithStatus = mockPricelistItems.map(item => {
src\components\purchase-orders\BulkOperations.tsx:319:        if (Math.random() < 0.1) {
src\components\purchase-orders\BulkOperations.tsx:352:                placeholder="Enter reason for rejection/cancellation..."
src\components\purchase-orders\BulkOperations.tsx:369:                <SelectValue placeholder="Select new status" />
src\components\purchase-orders\BulkOperations.tsx:395:                <SelectValue placeholder="Select new priority" />
src\components\purchase-orders\BulkOperations.tsx:413:              placeholder="Enter notes to add to selected orders..."
src\components\purchase-orders\BulkOperations.tsx:427:                placeholder="Purchase Order Update"
src\components\purchase-orders\BulkOperations.tsx:436:                placeholder="Enter email message..."
src\components\purchase-orders\ApprovalWorkflow.tsx:219:                        placeholder="Add your comments here..."
src\components\docustore\FolderDialog.tsx:182:                    <Input placeholder="e.g., Contracts, Invoices" {...field} />
src\components\docustore\FolderDialog.tsx:202:                          <SelectValue placeholder="Select parent folder" />
database\migrations\0216_enforce_supplier_org_id.sql:10:-- Step 1: Get default org_id (use first org or fallback)
src\components\docustore\BulkActionsBar.tsx:178:                  <SelectValue placeholder="Select folder" />
src\components\docustore\BulkActionsBar.tsx:211:                placeholder="e.g., important, contract, q1-2024"
src\components\docustore\AdvancedSearchDialog.tsx:147:                placeholder="Search document title or description..."
src\components\docustore\AdvancedSearchDialog.tsx:168:                  <SelectValue placeholder="Select status" />
src\components\docustore\AdvancedSearchDialog.tsx:189:                  <SelectValue placeholder="Select type" />
src\components\docustore\AdvancedSearchDialog.tsx:210:                placeholder="Filter by signer name..."
src\components\docustore\AdvancedSearchDialog.tsx:223:                placeholder="Filter by email..."
src\components\docustore\AdvancedSearchDialog.tsx:239:                placeholder="From"
src\components\docustore\AdvancedSearchDialog.tsx:245:                placeholder="To"
src\components\docustore\AdvancedSearchDialog.tsx:265:                  <SelectValue placeholder="Sort by" />
src\components\docustore\AdvancedSearchDialog.tsx:286:                  <SelectValue placeholder="Order" />
src\lib\cmm\proposed-categories\repository.ts:9:const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';
src\lib\cmm\proposed-categories\repository.ts:23:  const orgId = params.orgId || DEFAULT_ORG_ID;
src\components\products\SKUComparisonPanel.tsx:242:                  placeholder="Search by SKU or product name..."
src\components\products\SKUComparisonPanel.tsx:310:                      placeholder="0"
src\components\products\SKUComparisonPanel.tsx:325:                      placeholder="8"
src\components\products\RealProductCatalog.tsx:384:                placeholder="Search products..."
src\components\products\RealProductCatalog.tsx:398:                <SelectValue placeholder="All Suppliers" />
src\components\products\RealProductCatalog.tsx:417:                <SelectValue placeholder="Any Price" />
src\components\products\ProductCatalogGrid.tsx:350:              placeholder="Search products by name, SKU, brand, or tags..."
src\components\pricing\PricingRuleManager.tsx:288:            placeholder="Search rules..."
src\components\pricing\PricingRuleManager.tsx:295:              <SelectValue placeholder="Filter by type" />
src\components\pricing\PricingRuleManager.tsx:506:  placeholder,
src\components\pricing\PricingRuleManager.tsx:511:  placeholder: string;
src\components\pricing\PricingRuleManager.tsx:593:            <span className="text-muted-foreground">{placeholder}</span>
src\components\pricing\PricingRuleManager.tsx:601:            placeholder={`Search ${ENTITY_CONFIG[entityType].label.toLowerCase()}...`}
src\components\pricing\PricingRuleManager.tsx:752:            placeholder="e.g., Premium Supplier Markup"
src\components\pricing\PricingRuleManager.tsx:762:            placeholder="Optional description of this pricing rule"
src\components\pricing\PricingRuleManager.tsx:861:              placeholder={`Choose a ${ENTITY_CONFIG[entityType].label.toLowerCase()}...`}
src\components\pricing\PricingRuleManager.tsx:927:              placeholder="No minimum"
src\components\dashboard\widgets\LoyaltyWidgets.tsx:13:// Helper to generate mock data (will be replaced with real data)
src\components\dashboard\widgets\LoyaltyWidgets.tsx:17:      total: Math.floor(Math.random() * 500) + 100,
src\components\dashboard\widgets\LoyaltyWidgets.tsx:18:      thisMonth: Math.floor(Math.random() * 50) + 10,
src\components\dashboard\widgets\LoyaltyWidgets.tsx:19:      trend: Math.random() > 0.5 ? 'up' : 'down',
src\components\dashboard\widgets\LoyaltyWidgets.tsx:20:      trendValue: `${(Math.random() * 20 + 5).toFixed(1)}%`,
src\components\dashboard\widgets\LoyaltyWidgets.tsx:23:      total: Math.floor(Math.random() * 2000) + 500,
src\components\dashboard\widgets\LoyaltyWidgets.tsx:24:      active: Math.floor(Math.random() * 1500) + 300,
src\components\dashboard\widgets\LoyaltyWidgets.tsx:25:      inactive: Math.floor(Math.random() * 500) + 100,
src\components\dashboard\widgets\LoyaltyWidgets.tsx:28:      accumulated: Math.floor(Math.random() * 500000) + 100000,
src\components\dashboard\widgets\LoyaltyWidgets.tsx:29:      redeemed: Math.floor(Math.random() * 200000) + 50000,
src\components\dashboard\widgets\LoyaltyWidgets.tsx:30:      pointsValue: Math.floor(Math.random() * 50000) + 10000,
src\components\dashboard\widgets\LoyaltyWidgets.tsx:31:      redemptionRate: (Math.random() * 30 + 10).toFixed(1),
src\app\api\warehouses\[id]\route.ts:6:// Import mock data from parent route
src\app\api\warehouses\[id]\route.ts:7:const mockWarehouseData = [
src\app\api\warehouses\[id]\route.ts:209:    const warehouse = mockWarehouseData.find(w => w.id === id);
src\app\api\warehouses\[id]\route.ts:221:    // Get recent warehouse activities (mock data)
src\app\api\warehouses\[id]\route.ts:251:    // Get performance trends (mock data)
src\app\api\warehouses\[id]\route.ts:309:    const warehouseIndex = mockWarehouseData.findIndex(w => w.id === id);
src\app\api\warehouses\[id]\route.ts:325:      const existingWarehouse = mockWarehouseData.find(
src\app\api\warehouses\[id]\route.ts:342:      mockWarehouseData.forEach(w => {
src\app\api\warehouses\[id]\route.ts:349:    const existingWarehouse = mockWarehouseData[warehouseIndex];
src\app\api\warehouses\[id]\route.ts:369:    mockWarehouseData[warehouseIndex] = updatedWarehouse;
src\app\api\warehouses\[id]\route.ts:408:    const warehouseIndex = mockWarehouseData.findIndex(w => w.id === id);
src\app\api\warehouses\[id]\route.ts:420:    const warehouse = mockWarehouseData[warehouseIndex];
src\app\api\warehouses\[id]\route.ts:449:    const deletedWarehouse = mockWarehouseData[warehouseIndex];
src\app\api\warehouses\[id]\route.ts:450:    mockWarehouseData.splice(warehouseIndex, 1);
src\app\api\warehouses\[id]\route.ts:479:    const warehouseIndex = mockWarehouseData.findIndex(w => w.id === id);
src\app\api\warehouses\[id]\route.ts:492:    const warehouse = mockWarehouseData[warehouseIndex];
src\app\api\warehouses\[id]\route.ts:544:    mockWarehouseData[warehouseIndex] = warehouse;
database\migrations\0252_add_supplier_discount_rules.sql:145:  0, -- Lowest priority as fallback
database\migrations\PRICING_SYSTEM_README.md:7:**No mock data. No shortcuts. Real algorithms and calculations.**
src\lib\services\sales\DocumentNumberingService.ts:1:// UPDATE: [2025-12-25] Added fallback logic and retry mechanism for document number generation
src\lib\services\sales\DocumentNumberingService.ts:42:      // If database function returns null, use fallback
src\lib\services\sales\DocumentNumberingService.ts:43:      console.warn(`Database function returned null for ${prefix}, using fallback`);
src\lib\services\sales\DocumentNumberingService.ts:55:        console.warn(`Database function not available for ${prefix}, using fallback`);
src\lib\services\sales\DocumentNumberingService.ts:59:      // For other errors, still try fallback
src\lib\services\sales\DocumentNumberingService.ts:60:      console.warn('Attempting fallback document number generation');
src\lib\services\sales\DocumentNumberingService.ts:63:      } catch (fallbackError) {
src\lib\services\sales\DocumentNumberingService.ts:64:        console.error('Fallback document number generation also failed:', fallbackError);
src\lib\services\sales\DocumentNumberingService.ts:116:    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
src\lib\services\sales\DocumentNumberingService.ts:152:    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
database\migrations\PRICING_SYSTEM_INDEX.md:449:- [x] No mock data
src\app\api\warehouses\route.ts:88:const mockWarehouseData: Array<Record<string, unknown>> = [
src\app\api\warehouses\route.ts:198:    const filteredWarehouses = mockWarehouseData.filter(warehouse => {
src\app\api\warehouses\route.ts:287:      totalWarehouses: mockWarehouseData.length,
src\app\api\warehouses\route.ts:288:      activeWarehouses: mockWarehouseData.filter(w => w.isActive).length,
src\app\api\warehouses\route.ts:289:      totalCapacity: mockWarehouseData.reduce((sum, w) => sum + w.capacity.volume, 0),
src\app\api\warehouses\route.ts:290:      totalUtilization: mockWarehouseData.reduce((sum, w) => sum + w.utilization.volume, 0),
src\app\api\warehouses\route.ts:292:        mockWarehouseData.length > 0
src\app\api\warehouses\route.ts:293:          ? (mockWarehouseData.reduce(
src\app\api\warehouses\route.ts:297:              mockWarehouseData.length) *
src\app\api\warehouses\route.ts:347:    const existingWarehouse = mockWarehouseData.find(w => w.code === validatedData.code);
src\app\api\warehouses\route.ts:361:      mockWarehouseData.forEach(w => {
src\app\api\warehouses\route.ts:387:    mockWarehouseData.push(newWarehouse);
src\app\api\warehouses\route.ts:450:        const warehouseIndex = mockWarehouseData.findIndex(w => w.id === id);
src\app\api\warehouses\route.ts:458:          mockWarehouseData.forEach(w => {
src\app\api\warehouses\route.ts:465:        const existingWarehouse = mockWarehouseData[warehouseIndex];
src\app\api\warehouses\route.ts:473:        mockWarehouseData[warehouseIndex] = updatedWarehouse;
src\app\api\warehouses\route.ts:525:      const warehouseIndex = mockWarehouseData.findIndex(w => w.id === id);
src\app\api\warehouses\route.ts:531:      const warehouse = mockWarehouseData[warehouseIndex];
src\app\api\warehouses\route.ts:545:      const deletedWarehouse = mockWarehouseData[warehouseIndex];
src\app\api\warehouses\route.ts:546:      mockWarehouseData.splice(warehouseIndex, 1);
src\lib\cmm\db-sql.ts:412:  const id = `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
src\lib\cmm\db-sql.ts:473:  const id = `upl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
src\components\pricing\admin\PricingReviewQueue.tsx:210:              <SelectValue placeholder="Priority" />
src\components\pricing\admin\PricingReviewQueue.tsx:567:                  placeholder={`Add notes about your decision to ${reviewAction}...`}
src\components\dashboard\RealDataDashboard.tsx:1046:    <Suspense fallback={<MetricCardSkeleton count={4} />}>
src\components\dashboard\DashboardErrorBoundary.tsx:104:  // Default fallback
database\migrations\0233_add_financial_aspects_rentals_repairs.sql:108:    -- Invoice Reference (replace the placeholder invoice_id)
database\migrations\0233_add_financial_aspects_rentals_repairs.sql:109:    DROP COLUMN IF EXISTS invoice_id, -- Remove old placeholder
src\components\pos-app\transaction-complete.tsx:322:                    placeholder="customer@email.com"
src\components\pos-app\pos-interface.tsx:452:                  placeholder="Search by name, SKU, barcode, supplier..."
src\components\pos-app\pos-interface.tsx:925:                        placeholder="Transaction reference..."
src\components\pos-app\pos-interface.tsx:936:                      placeholder="Order notes..."
src\lib\cmm\category-ai\resolver.ts:327:    console.log(`[category-ai:resolver] Using fallback single provider config`);
src\components\kokonutui\particle-button.tsx:50:            x: [0, (i % 2 ? 1 : -1) * (Math.random() * 50 + 20)],
src\components\kokonutui\particle-button.tsx:51:            y: [0, -Math.random() * 50 - 20],
database\migrations\0231_sales_services_financial_integration.sql:311:    -- For now, we'll use placeholder logic - in production, these should come from account configuration
src\components\customers\FilterPanel.tsx:163:                  placeholder="Min ($)"
src\components\customers\FilterPanel.tsx:177:                  placeholder="Max ($)"
src\components\kokonutui\particle-button-enhanced.tsx:41:            x: [0, (i % 2 ? 1 : -1) * (Math.random() * 50 + 20)],
src\components\kokonutui\particle-button-enhanced.tsx:42:            y: [0, -Math.random() * 50 - 20],
src\components\pos-app\customer-selector.tsx:287:                        placeholder="Search by name, email, phone..."
src\components\pos-app\customer-selector.tsx:402:                  placeholder="Customer name"
src\components\pos-app\customer-selector.tsx:412:                  placeholder="email@example.com"
src\components\pos-app\customer-selector.tsx:421:                  placeholder="Phone number"
src\components\pos-app\customer-selector.tsx:430:                  placeholder="Company name"
src\components\nav-user.tsx:35:  user: fallbackUser,
src\components\nav-user.tsx:47:  // Use auth user if available, otherwise fallback to passed user prop
src\components\nav-user.tsx:54:    : fallbackUser || {
src\components\nav-user.tsx:60:  // Get initials for avatar fallback
src\components\kokonutui\mouse-effect-card.tsx:105:            if (Math.random() > edgeFactor) {
src\lib\cmm\category-ai\README.md:30:- `AI_CATEGORIZATION_WARN_ON_FALLBACK=true`: Emit JSON-mode fallback warnings
src\lib\cmm\category-ai\README.md:39:- `fallback.ts`: Model capability detection
src\components\kokonutui\matrix-text.tsx:47:  const getRandomChar = useCallback(() => (Math.random() > 0.5 ? '1' : '0'), []);
src\components\cmm\ConflictResolutionQueue.tsx:400:                            <SelectValue placeholder="Select category…" />
database\migrations\neon\003_corrected_compatibility_views.sql:38:  -- Currency with fallback
src\components\marketplace-app\marketplace-header.tsx:51:              placeholder="Search audio visual equipment..."
src\lib\cmm\category-ai\engine.ts:15:import { isReasoningModel, supportsJsonSchema } from './fallback';
src\lib\cmm\category-ai\engine.ts:314:          `CLI execution failed: ${errorMessage}. CLI mode is enabled but execution failed and no valid API key is provided for fallback. Please check CLI installation and authentication, or provide an API key for fallback.`
src\lib\cmm\category-ai\engine.ts:345:      // JSON-mode fallback
src\lib\cmm\category-ai\engine.ts:359:        `[engine] runProviderBatch success (anthropic JSON fallback) provider=${provider.provider} model=${modelName} suggestions=${parsed?.suggestions?.length ?? 0}`
src\lib\cmm\category-ai\engine.ts:449:      `openai batch JSON-fallback generateText (${modelName || 'default'})`
src\lib\cmm\category-ai\engine.ts:453:      `[engine] runProviderBatch success (openai fallback) provider=${provider.provider} model=${modelName} suggestions=${parsed?.suggestions?.length ?? 0}`
src\lib\cmm\category-ai\engine.ts:577:            `CLI mode is enabled but execution failed and no valid API key is provided for fallback. ` +
src\lib\cmm\category-ai\engine.ts:578:            `Please check CLI installation and authentication, or provide an API key for fallback.`
src\lib\cmm\category-ai\engine.ts:683:      `openai single JSON-fallback generateText (${modelName || 'default'})`
src\components\catalog\CatalogTable.tsx:1190:            placeholder="Search by name or SKU"
src\components\catalog\CatalogTable.tsx:1203:            placeholder="All suppliers"
src\components\catalog\CatalogTable.tsx:1228:              <SelectValue placeholder="All brands" />
src\components\catalog\CatalogTable.tsx:1252:            placeholder="Min price"
src\components\catalog\CatalogTable.tsx:1258:            placeholder="Max price"
database\migrations\neon\001_fix_public_views.sql:27:  0::numeric AS rsp,         -- Recommended selling price placeholder
src\app\api\purchase-orders\route.ts:239:    const orgId = request.headers.get('x-org-id') || process.env.DEFAULT_ORG_ID || undefined;
src\app\api\purchase-orders\route.ts:292:    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
src\app\api\purchase-orders\route.ts:296:      WHERE id IN (${placeholders})
src\components\kokonutui\bento-grid.tsx:322:        Math.random() * 30 + 10
src\components\kokonutui\bento-grid.tsx:518:                      height: `${20 + Math.random() * 80}%`,
src\components\kokonutui\beams-background.tsx:37:  const angle = -35 + Math.random() * 10;
src\components\kokonutui\beams-background.tsx:42:    x: Math.random() * width * 1.5 - width * 0.25,
src\components\kokonutui\beams-background.tsx:43:    y: Math.random() * height * 1.5 - height * 0.25,
src\components\kokonutui\beams-background.tsx:44:    width: 30 + Math.random() * 60,
src\components\kokonutui\beams-background.tsx:47:    speed: 0.6 + Math.random() * 1.2,
src\components\kokonutui\beams-background.tsx:48:    opacity: 0.12 + Math.random() * 0.16,
src\components\kokonutui\beams-background.tsx:49:    hue: hueBase + Math.random() * hueRange,
src\components\kokonutui\beams-background.tsx:50:    pulse: Math.random() * Math.PI * 2,
src\components\kokonutui\beams-background.tsx:51:    pulseSpeed: 0.02 + Math.random() * 0.03,
src\components\kokonutui\beams-background.tsx:118:      beam.x = column * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.5;
src\components\kokonutui\beams-background.tsx:119:      beam.width = 100 + Math.random() * 100;
src\components\kokonutui\beams-background.tsx:120:      beam.speed = 0.5 + Math.random() * 0.4;
src\components\kokonutui\beams-background.tsx:122:      beam.opacity = 0.2 + Math.random() * 0.1;
src\components\kokonutui\background-paths.tsx:82:  `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
src\components\kokonutui\attract-button.tsx:43:      x: Math.random() * 360 - 180,
src\components\kokonutui\attract-button.tsx:44:      y: Math.random() * 360 - 180,
src\components\catalog\ai-tagging\ProductsTable.tsx:460:              placeholder="Search by SKU or name..."
src\components\catalog\ai-tagging\ProductsTable.tsx:472:              placeholder="All Suppliers"
src\components\catalog\ai-tagging\ProductsTable.tsx:480:                <SelectValue placeholder="All Statuses" />
src\components\catalog\ai-tagging\ProductsTable.tsx:510:            placeholder="Min confidence"
src\components\catalog\ai-tagging\ProductsTable.tsx:516:            placeholder="Max confidence"
src\components\catalog\ai-tagging\ProductsTable.tsx:560:              <SelectValue placeholder="Per page" />
src\components\catalog\ai-tagging\ProductsTable.tsx:586:  placeholder,
src\components\catalog\ai-tagging\ProductsTable.tsx:591:  placeholder?: string;
src\components\catalog\ai-tagging\ProductsTable.tsx:596:      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
src\components\catalog\ai-tagging\JobControlPanel.tsx:159:              placeholder="All"
src\components\catalog\ai-tagging\JobControlPanel.tsx:180:              placeholder="Supplier ID..."
src\lib\cmm\ai-categorization-service.ts:534:        // Handle "No object generated" error - fallback to generateText with JSON mode
src\lib\cmm\ai-categorization-service.ts:540:            'batch-fallback',
src\lib\cmm\ai-categorization-service.ts:541:            `?? Model did not return structured output for batch, using JSON mode fallback`
src\lib\cmm\ai-categorization-service.ts:579:              console.error('Unable to parse structured batch response from JSON mode fallback');
src\lib\cmm\ai-categorization-service.ts:582:          } catch (fallbackError) {
src\lib\cmm\ai-categorization-service.ts:583:            console.error(`JSON mode fallback also failed for batch:`, fallbackError);
src\lib\cmm\ai-categorization-service.ts:626:            'batch-fallback',
src\lib\cmm\ai-categorization-service.ts:627:            `?? Model does not support structured output, using JSON mode fallback`
src\lib\cmm\ai-categorization-service.ts:663:            console.error('Unable to parse structured batch response from JSON mode fallback');
src\lib\cmm\ai-categorization-service.ts:668:        // Handle "No object generated" error - fallback to generateText with JSON mode
src\lib\cmm\ai-categorization-service.ts:687:            'batch-fallback',
src\lib\cmm\ai-categorization-service.ts:688:            `?? Model did not return structured output for batch, using JSON mode fallback`
src\lib\cmm\ai-categorization-service.ts:722:              `openai batch JSON-fallback generateText (${compatibleModel})`
src\lib\cmm\ai-categorization-service.ts:731:              console.error('Unable to parse structured batch response from JSON mode fallback');
src\lib\cmm\ai-categorization-service.ts:734:          } catch (fallbackError) {
src\lib\cmm\ai-categorization-service.ts:735:            console.error(`JSON mode fallback also failed for batch:`, fallbackError);
src\lib\cmm\ai-categorization-service.ts:739:          // Honor configured model; fallback directly to JSON-mode for this batch
src\lib\cmm\ai-categorization-service.ts:742:              'batch-fallback',
src\lib\cmm\ai-categorization-service.ts:779:              console.error('Unable to parse structured batch response from JSON mode fallback');
src\lib\cmm\ai-categorization-service.ts:783:            console.error(`OpenAI JSON mode fallback failed for batch:`, retryOrFallbackError);
src\lib\cmm\ai-categorization-service.ts:958:        // Handle "No object generated" error - fallback to generateText with JSON mode
src\lib\cmm\ai-categorization-service.ts:964:            'single-fallback',
src\lib\cmm\ai-categorization-service.ts:965:            `?? Model did not return structured output, using JSON mode fallback`
src\lib\cmm\ai-categorization-service.ts:993:              throw new Error('Unable to parse JSON response from fallback');
src\lib\cmm\ai-categorization-service.ts:995:          } catch (fallbackError) {
src\lib\cmm\ai-categorization-service.ts:996:            console.error(`JSON mode fallback also failed:`, fallbackError);
src\lib\cmm\ai-categorization-service.ts:1040:            'single-fallback',
src\lib\cmm\ai-categorization-service.ts:1041:            `?? Model does not support structured output, using JSON mode fallback`
src\lib\cmm\ai-categorization-service.ts:1067:            throw new Error('Unable to parse JSON response from fallback');
src\lib\cmm\ai-categorization-service.ts:1071:        // Handle "No object generated" error - fallback to generateText with JSON mode
src\lib\cmm\ai-categorization-service.ts:1091:            'single-fallback',
src\lib\cmm\ai-categorization-service.ts:1092:            `?? Model did not return structured output, using JSON mode fallback`
src\lib\cmm\ai-categorization-service.ts:1119:              `openai single JSON-fallback generateText (${compatibleModel})`
src\lib\cmm\ai-categorization-service.ts:1125:              throw new Error('Unable to parse JSON response from fallback');
src\lib\cmm\ai-categorization-service.ts:1127:          } catch (fallbackError) {
src\lib\cmm\ai-categorization-service.ts:1128:            console.error(`JSON mode fallback also failed:`, fallbackError);
src\lib\cmm\ai-categorization-service.ts:1132:          // Honor configured model; fallback directly to JSON-mode
src\lib\cmm\ai-categorization-service.ts:1135:              'single-fallback',
src\lib\cmm\ai-categorization-service.ts:1162:              throw new Error('Unable to parse JSON response from fallback');
src\lib\cmm\ai-categorization-service.ts:1165:            console.error(`OpenAI JSON mode fallback failed:`, retryOrFallbackError);
src\components\kokonutui\ai-voice.tsx:121:                      height: `${20 + Math.random() * 80}%`,
src\app\api\spp\validate\route.ts:50:      const fallbackOrg = await query<{ id: string }>(
src\app\api\spp\validate\route.ts:53:      org_id = fallbackOrg.rows[0]?.id ?? null;
src\components\magicui\particles.tsx:112:    const x = Math.floor(Math.random() * canvasSize.w);
src\components\magicui\particles.tsx:113:    const y = Math.floor(Math.random() * canvasSize.h);
src\components\magicui\particles.tsx:116:    const pSize = Math.floor(Math.random() * 2) + size;
src\components\magicui\particles.tsx:118:    const targetAlpha = parseFloat((Math.random() * 0.6 + 0.1).toFixed(1));
src\components\magicui\particles.tsx:119:    const dx = (Math.random() - 0.5) * 0.1;
src\components\magicui\particles.tsx:120:    const dy = (Math.random() - 0.5) * 0.1;
src\components\magicui\particles.tsx:121:    const magnetism = 0.1 + Math.random() * 4;
src\components\kokonutui\ai-prompt.tsx:167:                  "w-full resize-none rounded-xl rounded-b-none border-none bg-black/5 px-4 py-3 placeholder:text-black/70 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-white/5 dark:text-white dark:placeholder:text-white/70",
src\components\kokonutui\ai-prompt.tsx:176:                placeholder={"What can I do for you?"}
src\components\kokonutui\ai-prompt.tsx:235:                            {/* Use mapped SVG or fallback */}
src\components\magicui\meteors.tsx:20:            top: Math.floor(Math.random() * 100) + '%',
src\components\magicui\meteors.tsx:21:            left: Math.floor(Math.random() * 100) + '%',
src\components\magicui\meteors.tsx:22:            animationDelay: Math.random() * (0.8 - 0.2) + 0.2 + 's',
src\components\magicui\meteors.tsx:23:            animationDuration: Math.floor(Math.random() * (10 - 2) + 2) + 's',
src\components\kokonutui\ai-input-search.tsx:71:              placeholder="Search the web..."
src\components\kokonutui\ai-input-search.tsx:72:              className="w-full resize-none rounded-xl rounded-b-none border-none bg-black/5 px-4 py-3 leading-[1.2] placeholder:text-black/70 focus-visible:ring-0 dark:bg-white/5 dark:text-white dark:placeholder:text-white/70"
src\components\kokonutui\action-search-bar.tsx:210:              placeholder="What's up?"
src\components\catalog\ai-categorization\ProductsTable.tsx:474:            placeholder="Search by name or SKU"
src\components\catalog\ai-categorization\ProductsTable.tsx:487:            placeholder="All suppliers"
src\components\catalog\ai-categorization\ProductsTable.tsx:525:            placeholder="Min confidence"
src\components\catalog\ai-categorization\ProductsTable.tsx:535:            placeholder="Max confidence"
src\components\catalog\ai-categorization\JobControlPanel.tsx:164:              placeholder="All"
src\components\catalog\ai-categorization\JobControlPanel.tsx:185:              placeholder="Supplier ID..."
src\components\auth\RoleBasedAccess.tsx:12:  fallback?: React.ReactNode;
src\components\auth\RoleBasedAccess.tsx:22:  fallback = null,
src\components\auth\RoleBasedAccess.tsx:37:  // No user - show fallback or nothing
src\components\auth\RoleBasedAccess.tsx:118:    fallback?: React.ReactNode;
src\components\app-sidebar.tsx:650:      if (!moduleKey) return true; // Show items without mapping (fallback)
src\components\app-sidebar.tsx:659:      if (!moduleKey) return true; // Show items without mapping (fallback)
src\components\app-sidebar.tsx:668:      if (!moduleKey) return true; // Show items without mapping (fallback)
src\components\app-sidebar.tsx:689:                    console.warn('Logo failed to load, using fallback');
src\lib\services\project-management\task-service.ts:163:        const fallbackStatus = await client.query<{ status_id: string }>(
src\lib\services\project-management\task-service.ts:167:        statusId = fallbackStatus.rows[0]?.status_id || null;
src\components\analytics\PredictiveCharts.tsx:130:  // Use provided charts — no mock fallback
src\components\inventory\WarehouseManagement.tsx:718:                      placeholder="Search movements by item, SKU, or reason..."
src\components\inventory\WarehouseManagement.tsx:728:                      <SelectValue placeholder="All Types" />
src\lib\bulletproof-fetch.ts:32:  fallbackData?: unknown;
src\lib\bulletproof-fetch.ts:271:    fallbackData,
src\lib\bulletproof-fetch.ts:359:        // Return fallback data if available
src\lib\bulletproof-fetch.ts:360:        if (fallbackData !== undefined) {
src\lib\bulletproof-fetch.ts:362:            data: fallbackData as T,
src\components\inventory\SupplierProductWorkflow.tsx:16:  // If legacy workflow is requested, show a placeholder
src\components\inventory\SupplierInventoryView.tsx:823:                          placeholder="Search products, SKUs, or descriptions..."
src\components\inventory\SupplierInventoryView.tsx:884:                          <SelectValue placeholder="All categories" />
src\components\inventory\SupplierInventoryView.tsx:907:                          <SelectValue placeholder="All statuses" />
src\components\inventory\StockAlertSystem.tsx:537:                      placeholder="Search alerts by item, SKU, or message..."
src\components\inventory\StockAlertSystem.tsx:547:                      <SelectValue placeholder="All Severity" />
src\components\inventory\StockAlertSystem.tsx:558:                      <SelectValue placeholder="All Types" />
src\components\inventory\StockAdjustmentDialog.tsx:223:                        <Input type="number" min="1" placeholder="Enter quantity" {...field} />
src\components\inventory\StockAdjustmentDialog.tsx:240:                        <Input type="number" step="0.01" placeholder="Enter unit cost" {...field} />
src\components\inventory\StockAdjustmentDialog.tsx:259:                            <SelectValue placeholder="Select reason" />
src\components\inventory\StockAdjustmentDialog.tsx:283:                          placeholder="Enter additional notes (optional)"
src\components\ai\ModelSelector.tsx:21:  placeholder?: string;
src\components\ai\ModelSelector.tsx:30:  placeholder = 'Select model...',
src\components\ai\ModelSelector.tsx:54:          <span className="truncate">{selectedModel || placeholder}</span>
src\components\ai\ModelSelector.tsx:63:              placeholder="Search models..."
src\components\ai\ModelSelector.tsx:66:              className="placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
src\app\api\spp\agent\route.ts:74:        const fallbackText = buffer.toString('utf-8');
src\app\api\spp\agent\route.ts:75:        const fallbackLines = fallbackText.split(/\r?\n/).slice(0, 100);
src\app\api\spp\agent\route.ts:76:        prompt += '\nPDF text sample (fallback): ' + JSON.stringify(fallbackLines);
src\app\api\spp\agent\route.ts:332:    let allow_ai_fallback = false;
src\app\api\spp\agent\route.ts:343:      allow_ai_fallback = form.get('allow_ai_fallback') === 'true';
src\app\api\spp\agent\route.ts:349:      allow_ai_fallback = body?.allow_ai_fallback ?? false;
src\app\api\spp\agent\route.ts:535:            ai_fallback_used: false,
src\app\api\spp\agent\route.ts:561:              ai_fallback_used: false,
src\app\api\spp\agent\route.ts:590:        if (isPDF && isAIEnabled() && allow_ai_fallback) {
src\app\api\spp\agent\route.ts:730:        const vatAuditId2 = await auditStart(supplier_id, upload_id, 'vat_normalization_fallback');
src\app\api\spp\agent\route.ts:979:        // Note: AI error correction should run even if allow_ai_fallback was false initially,
src\components\inventory\RecentMovements.tsx:12:            Movement #{i} placeholder
src\components\ai\MobileAIInterfaceV5.tsx:316:                      placeholder="Type your message..."
src\components\inventory\ProductStockManagement.tsx:437:                placeholder="Search products, SKUs..."
src\components\inventory\ProductStockManagement.tsx:450:                <SelectValue placeholder="All suppliers" />
src\components\inventory\ProductStockManagement.tsx:463:                <SelectValue placeholder="All categories" />
src\components\inventory\ProductStockManagement.tsx:476:                <SelectValue placeholder="All statuses" />
src\components\inventory\ProductStockManagement.tsx:858:                placeholder="Add any additional notes about this stock addition..."
src\components\inventory\ProductStockManagement.tsx:945:                    <SelectValue placeholder="Select reason" />
src\components\inventory\ProductStockManagement.tsx:965:                placeholder="Add notes for this bulk operation..."
src\app\api\v1\users\me\password\route.ts:69:    const { authProvider } = await import('@/lib/auth/mock-provider');
src\components\ai\InsightCards.tsx:139:  const mockInsights: AIInsight[] = [
src\components\ai\InsightCards.tsx:423:  // Use provided insights or mock data
src\components\ai\InsightCards.tsx:424:  const workingInsights = insights.length > 0 ? insights : mockInsights;
src\components\ai\ChatInterfaceV5.tsx:481:                  placeholder="Ask me anything about procurement, suppliers, or analytics..."
src\components\inventory\PriceListUploader.tsx:206:                          <SelectValue placeholder="Select column" />
src\components\ai\ChatInterface.tsx:725:                  placeholder="Ask me anything about procurement, suppliers, or analytics..."
src\components\inventory\NotificationSystem.tsx:137:      const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
src\components\inventory\NextJsXlsxConverter.tsx:840:                            <SelectValue placeholder="Select source column" />
src\components\inventory\NextJsXlsxConverter.tsx:1056:                    placeholder="Filter by supplier name (optional)"
src\components\inventory\NextJsXlsxConverter.tsx:1082:                    placeholder="One field per line"
src\lib\auth\neon-auth-service.ts:139:      console.warn('??  Stack Auth credentials not configured. Using fallback mode.');
src\components\inventory\MultiProductSelectorDialog.tsx:908:            sku: p.supplier_sku || String(p.supplier_product_id), // fallback to ID if SKU missing
src\components\inventory\MultiProductSelectorDialog.tsx:1123:                  placeholder="Search by name or SKU"
src\components\inventory\MultiProductSelectorDialog.tsx:1136:                  placeholder="All suppliers"
src\components\inventory\MultiProductSelectorDialog.tsx:1161:                    <SelectValue placeholder="All brands" />
src\components\inventory\MultiProductSelectorDialog.tsx:1185:                  placeholder="Min price"
src\components\inventory\MultiProductSelectorDialog.tsx:1191:                  placeholder="Max price"
src\lib\auth\multi-tenant-auth.ts:523:    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
src\lib\auth\mock-provider.ts:16:const mockUsers: User[] = [
src\lib\auth\mock-provider.ts:151:const mockOrganizations: Organization[] = [
src\lib\auth\mock-provider.ts:242:    let user = mockUsers.find(u => u.email === credentials.email);
src\lib\auth\mock-provider.ts:275:      mockUsers.push(newUser);
src\lib\auth\mock-provider.ts:305:    this.sessionToken = `mock-token-${user.id}-${Date.now()}`;
src\lib\auth\mock-provider.ts:335:    if (mockUsers.find(u => u.email === data.email)) {
src\lib\auth\mock-provider.ts:375:    mockOrganizations.push(newOrg);
src\lib\auth\mock-provider.ts:412:    mockUsers.push(newUser);
src\lib\auth\mock-provider.ts:414:    // For mock: auto-verify and sign in
src\lib\auth\mock-provider.ts:417:    this.sessionToken = `mock-token-${newUser.id}-${Date.now()}`;
src\lib\auth\mock-provider.ts:487:    this.sessionToken = `mock-token-${this.currentUser.id}-${Date.now()}`;
src\lib\auth\mock-provider.ts:511:    // Update in mock store
src\lib\auth\mock-provider.ts:512:    const userIndex = mockUsers.findIndex(u => u.id === this.currentUser!.id);
src\lib\auth\mock-provider.ts:514:      mockUsers[userIndex] = this.currentUser;
src\lib\auth\mock-provider.ts:560:    mockUsers.push(newUser);
src\lib\auth\mock-provider.ts:567:    const userIndex = mockUsers.findIndex(u => u.id === id);
src\lib\auth\mock-provider.ts:572:    Object.assign(mockUsers[userIndex], data);
src\lib\auth\mock-provider.ts:573:    return mockUsers[userIndex];
src\lib\auth\mock-provider.ts:579:    const userIndex = mockUsers.findIndex(u => u.id === id);
src\lib\auth\mock-provider.ts:584:    mockUsers.splice(userIndex, 1);
src\lib\auth\mock-provider.ts:589:    return mockUsers.filter(u => u.org_id === orgId);
src\lib\auth\mock-provider.ts:620:        if (mockUsers.find(u => u.email === email)) {
src\lib\auth\mock-provider.ts:624:        // Create mock user
src\lib\auth\mock-provider.ts:654:        mockUsers.push(newUser);
src\lib\auth\mock-provider.ts:672:    return [...mockUsers];
src\lib\auth\mock-provider.ts:676:    return [...mockOrganizations];
src\lib\auth\mock-provider.ts:684:    mockUsers.splice(3); // Remove any added users beyond the first 3
src\lib\auth\mock-provider.ts:692:export const mockAuthProvider = new MockAuthProvider();
src\components\inventory\LocationDialog.tsx:154:      const fallbackLabel = `Supplier ${supplierId.substring(0, 8)}…`;
src\components\inventory\LocationDialog.tsx:155:      return [...prev, { id: supplierId, name: fallbackLabel }];
src\components\inventory\LocationDialog.tsx:285:                placeholder="e.g., Main Warehouse, NYC Distribution Center"
src\components\inventory\LocationDialog.tsx:344:                  placeholder="Select supplier"
src\components\inventory\LocationDialog.tsx:363:                placeholder="Full address including street, city, state, and postal code"
src\lib\auth\middleware.ts:16:const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID ?? FALLBACK_ORG_ID;
src\lib\auth\middleware.ts:65:  // Development mode bypass - return mock user
src\lib\auth\middleware.ts:73:      organizationId: DEFAULT_ORG_ID,
src\lib\auth\jwt-secret.ts:4: * Phase A.1: Security hardening - removed hardcoded fallbacks
src\app\api\social-media\sales\products\route.ts:4:const mockProducts = [
src\app\api\social-media\sales\products\route.ts:128:    let products = mockProducts.filter(p => p.isActive)
src\app\api\social-media\sales\products\route.ts:168:      id: mockProducts.length + 1,
src\app\api\social-media\sales\products\route.ts:182:    mockProducts.push(newProduct)
src\components\inventory\InventoryManagement.tsx:732:                  placeholder="Search products, SKUs, or suppliers... (Ctrl+K)"
src\components\inventory\InventoryManagement.tsx:796:                        placeholder="Min"
src\components\inventory\InventoryManagement.tsx:804:                        placeholder="Max"
src\components\inventory\InventoryManagement.tsx:817:                        <SelectValue placeholder="All levels" />
src\components\inventory\InventoryManagement.tsx:842:                        <SelectValue placeholder="All categories" />
src\components\inventory\InventoryManagement.tsx:865:                      placeholder="All suppliers"
src\components\inventory\InventoryManagement.tsx:885:                        <SelectValue placeholder="All statuses" />
src\components\inventory\InventoryManagement.tsx:920:                        <SelectValue placeholder="All locations" />
src\components\inventory\InventoryFilters.tsx:11:      <Input placeholder="Search SKU, name..." className="max-w-sm" />
src\lib\auth\auth-helper.ts:162:      id: userId, // Use Clerk ID as fallback
src\lib\services\PricingRuleService.ts:13:const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';
src\lib\services\PricingRuleService.ts:142:        DEFAULT_ORG_ID,
src\lib\auth\auth-context.tsx:85:  // Safely get dates with fallbacks
src\lib\auth\auth-context.tsx:271:  fallback,
src\lib\auth\auth-context.tsx:278:  fallback?: React.ReactNode;
src\lib\auth\auth-context.tsx:298:    return fallback || null;
src\app\api\v1\sales-channels\[id]\webhook\route.ts:37:      // This is a placeholder - each adapter should implement its own validation
src\components\inventory\ErrorBoundary.tsx:34:  fallback?: ReactNode;
src\components\inventory\ErrorBoundary.tsx:67:    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
src\components\inventory\ErrorBoundary.tsx:132:      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
src\components\inventory\ErrorBoundary.tsx:216:    const { children, fallback, showDetails = true, enableReporting = true } = this.props;
src\components\inventory\ErrorBoundary.tsx:220:      if (fallback) {
src\components\inventory\ErrorBoundary.tsx:221:        return fallback;
src\components\inventory\EnhancedInventoryDashboard.tsx:909:                      placeholder="Search items by name, SKU, or description..."
src\components\inventory\EnhancedInventoryDashboard.tsx:917:                      <SelectValue placeholder="Category" />
src\components\inventory\EnhancedInventoryDashboard.tsx:930:                      <SelectValue placeholder="Supplier" />
src\components\inventory\EnhancedInventoryDashboard.tsx:943:                      <SelectValue placeholder="Status" />
src\components\inventory\EditProductDialog.tsx:321:                        <Input placeholder="Enter product name" {...field} />
src\components\inventory\EditProductDialog.tsx:336:                          placeholder="Enter product description"
src\components\inventory\EditProductDialog.tsx:356:                              placeholder={
src\components\inventory\EditProductDialog.tsx:397:                              placeholder={
src\components\inventory\EditProductDialog.tsx:436:                        <Input placeholder="Enter SKU" {...field} />
src\components\inventory\EditProductDialog.tsx:450:                        <Input placeholder="Enter barcode" {...field} />
src\components\inventory\EditProductDialog.tsx:464:                        <Input placeholder="Enter brand name" {...field} />
src\components\inventory\EditProductDialog.tsx:478:                        <Input placeholder="Enter model number" {...field} />
src\components\inventory\EditProductDialog.tsx:499:                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
src\components\inventory\EditProductDialog.tsx:515:                            <SelectValue placeholder="Select unit" />
src\components\inventory\EditProductDialog.tsx:540:                          placeholder="Enter minimum order quantity"
src\components\inventory\EditProductDialog.tsx:564:                          placeholder="Enter weight in kg"
src\components\inventory\EditProductDialog.tsx:580:                        <Input placeholder="L x W x H (e.g., 10x20x5)" {...field} />
src\components\inventory\EditProductDialog.tsx:594:                        <Input type="number" placeholder="Enter shelf life in days" {...field} />
src\components\inventory\EditProductDialog.tsx:613:                        <Input placeholder="Enter country of origin" {...field} />
src\components\inventory\EditProductDialog.tsx:627:                        <Input type="number" placeholder="Enter lead time in days" {...field} />
src\components\inventory\EditProductDialog.tsx:642:                          placeholder="Enter storage requirements"
src\components\inventory\DetailedInventoryModal.tsx:535:                              placeholder="Add notes about this item..."
src\components\inventory\AddProductDialog.tsx:161:                        <Input placeholder="Enter product name" {...field} />
src\components\inventory\AddProductDialog.tsx:176:                          placeholder="Enter product description"
src\components\inventory\AddProductDialog.tsx:195:                            <SelectValue placeholder="Select category" />
src\components\inventory\AddProductDialog.tsx:221:                          placeholder="Select supplier"
src\components\inventory\AddProductDialog.tsx:244:                        <Input placeholder="Enter SKU (optional)" {...field} />
src\components\inventory\AddProductDialog.tsx:261:                        <Input placeholder="Enter barcode (optional)" {...field} />
src\components\inventory\AddProductDialog.tsx:275:                        <Input placeholder="Enter brand name" {...field} />
src\components\inventory\AddProductDialog.tsx:289:                        <Input placeholder="Enter model number" {...field} />
src\components\inventory\AddProductDialog.tsx:310:                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
src\components\inventory\AddProductDialog.tsx:326:                            <SelectValue placeholder="Select unit" />
src\components\inventory\AddProductDialog.tsx:352:                          placeholder="Enter minimum order quantity"
src\components\inventory\AddProductDialog.tsx:376:                          placeholder="Enter weight in kg"
src\components\inventory\AddProductDialog.tsx:392:                        <Input placeholder="L x W x H (e.g., 10x20x5)" {...field} />
src\components\inventory\AddProductDialog.tsx:406:                        <Input type="number" placeholder="Enter shelf life in days" {...field} />
src\components\inventory\AddProductDialog.tsx:425:                        <Input placeholder="Enter country of origin" {...field} />
src\components\inventory\AddProductDialog.tsx:439:                        <Input type="number" placeholder="Enter lead time in days" {...field} />
src\components\inventory\AddProductDialog.tsx:454:                          placeholder="Enter storage requirements"
src\components\loyalty\customer\TransactionHistory.tsx:146:                  placeholder="Search transactions..."
src\lib\audit\audit-logger.ts:341:   * Query audit logs - from database first, fallback to in-memory
src\lib\audit\audit-logger.ts:434:    // In-memory fallback
src\lib\audit\audit-logger.ts:595:    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
src\lib\api-client.ts:4: * Provides resilient API communication with automatic retries and fallback mechanisms
src\lib\api-client.ts:168:    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
src\lib\api-client.ts:192:    requestId: string = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
src\lib\api-client.ts:253:      options.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
src\components\loyalty\customer\RewardCatalog.tsx:205:                placeholder="Search rewards..."
src\components\loyalty\customer\RewardCatalog.tsx:318:                    {/* Image placeholder */}
src\components\integrations\XeroAccountMappingForm.tsx:266:                    <SelectValue placeholder="Select an account...">
src\components\loyalty\customer\ReferralProgram.tsx:475:                placeholder="friend@example.com"
src\components\loyalty\customer\ReferralProgram.tsx:485:                placeholder="Friend's name"
src\components\integrations\SyncPreview.tsx:388:                placeholder="Search by name or ID..."
src\components\loyalty\customer\README.md:134:- Export to PDF/CSV (placeholder)
src\components\ai\assistant\ChatAssistant.tsx:121:            placeholder="Ask something... (Enter to send, Shift+Enter for new line)"
src\components\integrations\ActivityLog.tsx:507:                  placeholder="Search by ID, entity type..."
src\components\ai\AIErrorHandler.tsx:188:  const [fallbackStrategies, setFallbackStrategies] = useState<FallbackStrategy[]>([]);
src\components\ai\AIErrorHandler.tsx:194:  // Initialize mock data
src\components\ai\AIErrorHandler.tsx:268:      // Auto-activate fallbacks for critical errors
src\components\ai\AIErrorHandler.tsx:286:        const success = Math.random() > 0.3; // 70% success rate simulation
src\components\ai\AIErrorHandler.tsx:308:  // Activate fallback strategy
src\components\ai\AIErrorHandler.tsx:387:    // Add some mock errors
src\components\ai\AIErrorHandler.tsx:554:        {enableFallbacks && fallbackStrategies.some(s => s.enabled) && (
src\components\ai\AIErrorHandler.tsx:574:                  {fallbackStrategies
src\app\financial\gl\journal-entries\new\page.tsx:193:                              placeholder="Account ID"
src\app\financial\gl\journal-entries\new\page.tsx:201:                              placeholder="Line description"
src\lib\api\middleware.ts:23:const mockUsers = new Map([
src\lib\api\middleware.ts:408:      for (const [email, userData] of mockUsers) {
src\lib\api\middleware.ts:423:      if (email && mockUsers.has(email)) {
src\lib\api\middleware.ts:424:        const user = mockUsers.get(email)!;
src\lib\api\middleware.ts:438:        const user = mockUsers.get('admin@company.com')!;
src\app\financial\gl\accounts\page.tsx:34:        // Note: This endpoint may not exist yet, but we'll create a placeholder
src\lib\api\error-handler.ts:47:  const random = Math.random().toString(36).substring(2, 9);
src\lib\api\base.ts:56:      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
src\lib\api\base.ts:60:        VALUES (${placeholders})
src\lib\api\base.ts:399:    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
src\components\loyalty\admin\RuleEngineBuilder.tsx:508:                          <SelectValue placeholder="Select program" />
src\components\loyalty\admin\RuleEngineBuilder.tsx:531:                      <Input placeholder="e.g., Double Points on Orders Over $100" {...field} />
src\components\loyalty\admin\RuleEngineBuilder.tsx:546:                        placeholder="Describe when this rule applies..."
src\components\loyalty\admin\RuleEngineBuilder.tsx:663:                            placeholder="0"
src\components\loyalty\admin\RuleEngineBuilder.tsx:687:                            placeholder="Unlimited"
src\components\loyalty\admin\RuleEngineBuilder.tsx:710:                            placeholder="0"
src\components\loyalty\admin\RuleEngineBuilder.tsx:733:                            placeholder="Unlimited"
src\components\fallbacks\FallbackComponents.tsx:64:          <Skeleton key={i} className={`w-8 h-${Math.floor(Math.random() * 40) + 10}`} />
src\components\fallbacks\FallbackComponents.tsx:303:  fallbackValue?: number | string;
src\components\fallbacks\FallbackComponents.tsx:305:}> = ({ originalValue, fallbackValue = 0, className = '' }) => (
src\components\fallbacks\FallbackComponents.tsx:307:    {fallbackValue}
src\components\loyalty\admin\RewardCatalogManager.tsx:358:                  placeholder="Search rewards..."
src\components\loyalty\admin\RewardCatalogManager.tsx:372:                    <SelectValue placeholder="All Types" />
src\components\loyalty\admin\RewardCatalogManager.tsx:391:                    <SelectValue placeholder="All Status" />
src\components\loyalty\admin\RewardCatalogManager.tsx:609:                      <Input placeholder="e.g., $10 Gift Card" {...field} />
src\components\loyalty\admin\RewardCatalogManager.tsx:623:                      <Textarea placeholder="Reward description..." rows={3} {...field} />
src\components\loyalty\admin\RewardCatalogManager.tsx:689:                          placeholder="Optional"
src\components\loyalty\admin\RewardCatalogManager.tsx:712:                          placeholder="Unlimited"
src\components\loyalty\admin\RewardCatalogManager.tsx:736:                        placeholder="Unlimited"
src\components\loyalty\admin\RewardCatalogManager.tsx:756:                      <Input placeholder="https://..." {...field} value={field.value || ''} />
src\components\loyalty\admin\RedemptionQueue.tsx:316:                  placeholder="Search by customer, reward, or code..."
src\components\loyalty\admin\RedemptionQueue.tsx:624:                placeholder="Add any fulfillment notes..."
src\components\loyalty\admin\RedemptionQueue.tsx:665:                placeholder="Explain why this redemption is being cancelled..."
src\components\loyalty\admin\CustomerLoyaltyProfile.tsx:516:                        placeholder="Enter points amount"
src\components\loyalty\admin\CustomerLoyaltyProfile.tsx:537:                        placeholder="Explain the reason for this adjustment..."
src\components\loyalty\admin\ProgramConfiguration.tsx:358:                          <Input placeholder="e.g., VIP Rewards Program" {...field} />
src\components\loyalty\admin\ProgramConfiguration.tsx:373:                            placeholder="Describe your loyalty program..."
src\components\loyalty\admin\ProgramConfiguration.tsx:394:                            placeholder="1.0"
src\components\loyalty\admin\ProgramConfiguration.tsx:456:                                placeholder="Points threshold"
src\components\loyalty\admin\ProgramConfiguration.tsx:599:                          placeholder="365"
src\lib\analytics\automated-optimization.ts:672:    const caseId = `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
src\lib\analytics\automated-optimization.ts:1242:    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
src\lib\analytics\analytics-service.ts:249:      // Get competitor pricing data (mock for now)
src\components\ai\admin\WidgetConfiguration.tsx:367:                placeholder="Enter widget title..."
src\components\ai\admin\WidgetConfiguration.tsx:465:                          placeholder="Field name"
src\components\ai\admin\WidgetConfiguration.tsx:486:                            placeholder="Value"
src\lib\analytics\advanced-ml-models.ts:76:          neuronWeights.push((Math.random() - 0.5) * 2);
src\lib\analytics\advanced-ml-models.ts:81:      this.biases.push(new Array(this.layers[i + 1]).fill(0).map(() => (Math.random() - 0.5) * 2));
src\lib\analytics\advanced-ml-models.ts:488:      prediction += 0.1 * (Math.random() - 0.5); // Noise term
src\lib\analytics\real-time-anomaly-detection.ts:222:      const randomIndex = Math.floor(Math.random() * data.length);
src\lib\analytics\real-time-anomaly-detection.ts:234:    const featureIndex = Math.floor(Math.random() * data[0].length);
src\lib\analytics\real-time-anomaly-detection.ts:243:    const splitValue = min + Math.random() * (max - min);
src\lib\analytics\real-time-anomaly-detection.ts:343:      predicted += (Math.random() - 0.5) * 0.1 * Math.abs(predicted);
src\lib\analytics\real-time-anomaly-detection.ts:479:    const modelId = `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
src\lib\analytics\real-time-anomaly-detection.ts:767:    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
src\components\ai\admin\UnifiedServicePanel.tsx:406:        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
src\components\ai\admin\UnifiedServicePanel.tsx:867:                      placeholder={getDefaultBaseUrl(form.provider) || 'https://api.example.com'}
src\components\ai\admin\UnifiedServicePanel.tsx:876:                      placeholder="sk-..."
src\components\ai\admin\UnifiedServicePanel.tsx:888:                      placeholder="Select or type a model"
src\components\ai\admin\UnifiedServicePanel.tsx:898:                      placeholder="Not required for web search"
src\components\ai\admin\UnifiedServicePanel.tsx:925:                            placeholder="my-gcp-project"
src\components\ai\admin\UnifiedServicePanel.tsx:936:                            placeholder="us-central1"
src\components\ai\admin\UnifiedServicePanel.tsx:952:                            placeholder={
src\components\ai\admin\UnifiedServicePanel.tsx:1039:                                placeholder="gemini"
src\components\ai\admin\UnifiedServicePanel.tsx:1047:                                placeholder="/path/to/project"
src\components\ai\admin\UnifiedServicePanel.tsx:1058:                              placeholder="--verbose, --output json"
src\components\ai\admin\UnifiedServicePanel.tsx:1125:                                  placeholder="GEMINI_API_KEY or GOOGLE_API_KEY"
src\components\ai\admin\UnifiedServicePanel.tsx:1134:                                  placeholder="GCP Project ID"
src\components\ai\admin\UnifiedServicePanel.tsx:1141:                                  placeholder="Location (default: us-central1)"
src\components\ai\admin\UnifiedServicePanel.tsx:1236:                              placeholder="codex"
src\components\ai\admin\UnifiedServicePanel.tsx:1244:                              placeholder="/path/to/project"
src\components\ai\admin\UnifiedServicePanel.tsx:1255:                            placeholder="--verbose, --output json"
src\components\ai\admin\UnifiedServicePanel.tsx:1301:                                placeholder="OPENAI_API_KEY"
src\components\ai\admin\UnifiedServicePanel.tsx:1344:                      placeholder="Not required for Google Search"
src\components\ai\admin\UnifiedServicePanel.tsx:1349:                        placeholder="..."
src\components\ai\admin\UnifiedServicePanel.tsx:1640:                                  placeholder="Select or type a model"
src\components\ai\admin\UnifiedServicePanel.tsx:1653:                                    placeholder="Not required for web search"
src\components\ai\admin\UnifiedServicePanel.tsx:1666:                                    placeholder="Not required for Google Search"
src\components\ai\admin\UnifiedServicePanel.tsx:1709:                                        placeholder="my-gcp-project"
src\components\ai\admin\UnifiedServicePanel.tsx:1721:                                        placeholder="us-central1"
src\components\ai\admin\UnifiedServicePanel.tsx:1745:                                        placeholder={
src\components\ai\admin\UnifiedServicePanel.tsx:1825:                                            placeholder="gemini"
src\components\ai\admin\UnifiedServicePanel.tsx:1839:                                            placeholder="/path/to/project"
src\components\ai\admin\UnifiedServicePanel.tsx:1854:                                          placeholder="--verbose, --output json"
src\components\ai\admin\UnifiedServicePanel.tsx:1952:                                              placeholder="GEMINI_API_KEY or GOOGLE_API_KEY"
src\components\ai\admin\UnifiedServicePanel.tsx:1965:                                              placeholder="GCP Project ID"
src\components\ai\admin\UnifiedServicePanel.tsx:1976:                                              placeholder="Location (default: us-central1)"
src\components\ai\admin\UnifiedServicePanel.tsx:2036:                                          placeholder="codex"
src\components\ai\admin\UnifiedServicePanel.tsx:2048:                                          placeholder="/path/to/project"
src\components\ai\admin\UnifiedServicePanel.tsx:2063:                                        placeholder="--verbose, --output json"
src\components\ai\admin\UnifiedServicePanel.tsx:2123:                                            placeholder="OPENAI_API_KEY"
src\lib\analytics\query-optimizer.ts:261:      .replace(/\d+/g, '?') // Replace numbers with placeholders
src\components\ai\admin\providers\ProviderRegistryPanel.tsx:115:              placeholder="OpenRouter (prod)"
src\components\ai\admin\providers\ProviderRegistryPanel.tsx:142:              placeholder="https://openrouter.ai/api/v1"
src\components\ai\admin\providers\ProviderRegistryPanel.tsx:150:              placeholder="gpt-4.1-mini"
src\app\api\social-media\messages\route.ts:4:const mockConversations = [
src\app\api\social-media\messages\route.ts:73:const mockMessages = {
src\app\api\social-media\messages\route.ts:149:      const messages = mockMessages[conversationIdNum as keyof typeof mockMessages] || [];
src\app\api\social-media\messages\route.ts:155:    return NextResponse.json({ conversations: mockConversations });
src\app\api\social-media\messages\route.ts:206:    // Add to mock messages
src\app\api\social-media\messages\route.ts:208:    if (!mockMessages[conversationIdNum as keyof typeof mockMessages]) {
src\app\api\social-media\messages\route.ts:209:      mockMessages[conversationIdNum as keyof typeof mockMessages] = [];
src\app\api\social-media\messages\route.ts:211:    mockMessages[conversationIdNum as keyof typeof mockMessages].push(newMessage);
src\app\api\social-media\messages\route.ts:214:    const conversation = mockConversations.find(c => c.id === conversationIdNum);
src\components\ai\admin\providers\ModelSelector.tsx:18:  placeholder?: string;
src\components\ai\admin\providers\ModelSelector.tsx:28:  placeholder = 'Select or type a model',
src\components\ai\admin\providers\ModelSelector.tsx:37:  // Static models from config (fallback)
src\components\ai\admin\providers\ModelSelector.tsx:86:  // Use dynamic models for OpenRouter if available, else fallback to static
src\components\ai\admin\providers\ModelSelector.tsx:118:          placeholder={placeholder}
src\components\ai\admin\providers\ModelSelector.tsx:145:              {isLoading ? 'Loading models...' : value || defaultModel || placeholder}
src\components\ai\admin\providers\ModelSelector.tsx:158:              placeholder="Search models..."
src\components\ai\admin\providers\ModelSelector.tsx:210:                placeholder="Custom model name..."
src\app\api\social-media\channels\route.ts:4:const mockChannels = [
src\app\api\social-media\channels\route.ts:74:    return NextResponse.json({ channels: mockChannels });
src\app\api\social-media\channels\route.ts:85:    // Create new channel with mock data
src\app\api\social-media\channels\route.ts:87:      id: mockChannels.length + 1,
src\app\api\social-media\channels\route.ts:104:    mockChannels.push(newChannel);
src\app\api\social-media\channels\route.ts:122:    // Find and update the channel in mock data
src\app\api\social-media\channels\route.ts:123:    const channelIndex = mockChannels.findIndex(c => c.id === id);
src\app\api\social-media\channels\route.ts:128:    mockChannels[channelIndex] = { ...mockChannels[channelIndex], ...updateData };
src\app\api\social-media\channels\route.ts:130:    return NextResponse.json({ channel: mockChannels[channelIndex] });
src\app\api\social-media\channels\route.ts:146:    // Remove from mock data
src\app\api\social-media\channels\route.ts:147:    const channelIndex = mockChannels.findIndex(c => c.id === parseInt(id));
src\app\api\social-media\channels\route.ts:149:      mockChannels.splice(channelIndex, 1);
src\lib\analytics\performance-monitor.ts:231:          await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
src\lib\analytics\performance-monitor.ts:237:      const frontendTime = Math.random() * 200 + 100; // Simulate frontend rendering time
src\lib\analytics\performance-monitor.ts:264:        Math.random() * 100 + 20, // Typical query time
src\lib\analytics\performance-monitor.ts:265:        Math.random() * 200 + 50, // Complex query time
src\lib\analytics\performance-monitor.ts:266:        Math.random() * 50 + 10, // Simple query time
src\lib\analytics\performance-monitor.ts:271:      const connectionCount = Math.floor(Math.random() * 20) + 5;
src\lib\analytics\performance-monitor.ts:272:      const cacheHitRatio = 0.85 + Math.random() * 0.1; // 85-95%
src\lib\analytics\performance-monitor.ts:299:      cpu: Math.random() * 80 + 10, // 10-90% CPU usage
src\lib\analytics\performance-monitor.ts:300:      memory: Math.random() * 70 + 20, // 20-90% memory usage
src\lib\analytics\performance-monitor.ts:301:      disk: Math.random() * 60 + 30, // 30-90% disk usage
src\lib\analytics\performance-monitor.ts:302:      network: Math.random() * 50 + 10, // 10-60% network usage
src\lib\analytics\performance-monitor.ts:311:      transactionThroughput: Math.floor(Math.random() * 1000) + 100, // 100-1100 transactions/hour
src\lib\analytics\performance-monitor.ts:312:      userConcurrency: Math.floor(Math.random() * 50) + 5, // 5-55 concurrent users
src\lib\analytics\performance-monitor.ts:313:      errorRate: Math.random() * 0.05, // 0-5% error rate
src\lib\analytics\performance-monitor.ts:314:      availability: 0.95 + Math.random() * 0.049, // 95-99.9% availability
src\components\ai\admin\providers\CustomServicesPanel.tsx:405:      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
src\components\ai\admin\providers\CustomServicesPanel.tsx:783:                      placeholder={getDefaultBaseUrl(form.provider) || 'https://api.example.com'}
src\components\ai\admin\providers\CustomServicesPanel.tsx:792:                      placeholder="sk-..."
src\components\ai\admin\providers\CustomServicesPanel.tsx:801:                        placeholder="gpt-4o-mini"
src\components\ai\admin\providers\CustomServicesPanel.tsx:811:                        placeholder="Not required for web search"
src\components\ai\admin\providers\CustomServicesPanel.tsx:850:                          placeholder="Not required for Google Search"
src\components\ai\admin\providers\CustomServicesPanel.tsx:858:                          placeholder="..."
src\components\ai\admin\providers\CustomServicesPanel.tsx:889:                            placeholder="my-gcp-project"
src\components\ai\admin\providers\CustomServicesPanel.tsx:897:                            placeholder="us-central1"
src\components\ai\admin\providers\CustomServicesPanel.tsx:912:                            placeholder={
src\components\ai\admin\providers\CustomServicesPanel.tsx:1002:                                placeholder="gemini"
src\components\ai\admin\providers\CustomServicesPanel.tsx:1010:                                placeholder="/path/to/project"
src\components\ai\admin\providers\CustomServicesPanel.tsx:1021:                              placeholder="--verbose, --output json"
src\components\ai\admin\providers\CustomServicesPanel.tsx:1088:                                  placeholder="GEMINI_API_KEY or GOOGLE_API_KEY"
src\components\ai\admin\providers\CustomServicesPanel.tsx:1097:                                  placeholder="GCP Project ID"
src\components\ai\admin\providers\CustomServicesPanel.tsx:1102:                                  placeholder="Location (default: us-central1)"
src\components\ai\admin\providers\CustomServicesPanel.tsx:1214:                              placeholder="codex"
src\components\ai\admin\providers\CustomServicesPanel.tsx:1222:                              placeholder="/path/to/project"
src\components\ai\admin\providers\CustomServicesPanel.tsx:1231:                            placeholder="--verbose, --output json"
src\components\ai\admin\providers\CustomServicesPanel.tsx:1277:                                placeholder="OPENAI_API_KEY"
src\components\ai\admin\providers\CustomServicesPanel.tsx:1572:                                      placeholder="Not required for web search"
src\components\ai\admin\providers\CustomServicesPanel.tsx:1672:                                        placeholder="my-gcp-project"
src\components\ai\admin\providers\CustomServicesPanel.tsx:1684:                                        placeholder="us-central1"
src\components\ai\admin\providers\CustomServicesPanel.tsx:1708:                                        placeholder={
src\components\ai\admin\providers\CustomServicesPanel.tsx:1814:                                            placeholder="gemini"
src\components\ai\admin\providers\CustomServicesPanel.tsx:1828:                                            placeholder="/path/to/project"
src\components\ai\admin\providers\CustomServicesPanel.tsx:1843:                                          placeholder="--verbose, --output json"
src\components\ai\admin\providers\CustomServicesPanel.tsx:1941:                                              placeholder="GEMINI_API_KEY or GOOGLE_API_KEY"
src\components\ai\admin\providers\CustomServicesPanel.tsx:1954:                                              placeholder="GCP Project ID"
src\components\ai\admin\providers\CustomServicesPanel.tsx:1965:                                              placeholder="Location (default: us-central1)"
src\components\ai\admin\providers\CustomServicesPanel.tsx:2081:                                          placeholder="codex"
src\components\ai\admin\providers\CustomServicesPanel.tsx:2093:                                          placeholder="/path/to/project"
src\components\ai\admin\providers\CustomServicesPanel.tsx:2108:                                        placeholder="--verbose, --output json"
src\components\ai\admin\providers\CustomServicesPanel.tsx:2168:                                            placeholder="OPENAI_API_KEY"
src\components\ai\admin\ForecastViewer.tsx:243:                  <SelectValue placeholder="Select a product..." />
src\lib\analytics\enhanced-analytics-dashboard.ts:739:    const dashboardId = `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
src\components\ai\admin\DashboardBuilder.tsx:308:        type: 'mock',
src\components\ai\admin\DashboardBuilder.tsx:391:                    placeholder="My Dashboard"
src\components\ai\admin\DashboardBuilder.tsx:402:                    placeholder="Dashboard description..."
src\components\ai\admin\ConversationHistory.tsx:418:                  placeholder="Search conversations by content, ID, or user..."
src\components\ai\admin\ConversationHistory.tsx:440:                <SelectValue placeholder="All Users" />
src\components\ai\admin\AnomalyDetector.tsx:333:            placeholder="Search anomalies..."
src\components\ai\admin\AnomalyDetector.tsx:342:            <SelectValue placeholder="Severity" />
src\components\ai\admin\AnomalyDetector.tsx:355:            <SelectValue placeholder="Entity Type" />
src\components\ai\admin\AnomalyDetector.tsx:370:            <SelectValue placeholder="Status" />
src\components\ai\admin\AnomalyDetector.tsx:709:                  placeholder="Add investigation notes..."
src\components\ai\admin\AIServiceConfiguration.tsx:364:        // maintain fallback options too
src\components\ai\admin\AIServiceConfiguration.tsx:562:                  placeholder="e.g. Demand Forecasting"
src\components\ai\admin\AIServiceConfiguration.tsx:607:                      placeholder={
src\components\ai\admin\AIServiceConfiguration.tsx:624:                  placeholder={
src\components\ai\admin\AIServiceConfiguration.tsx:639:                  placeholder={`Enter ${createForm.provider.replace('_', ' ')} API key`}
src\components\ai\admin\AIServiceConfiguration.tsx:652:                      <SelectValue placeholder="Select model" />
src\components\ai\admin\AIServiceConfiguration.tsx:831:                        <SelectValue placeholder="Select provider" />
src\components\ai\admin\AIServiceConfiguration.tsx:880:                          placeholder={
src\components\ai\admin\AIServiceConfiguration.tsx:924:                        <SelectValue placeholder={info.defaultModel} />
src\components\ai\admin\AIServiceConfiguration.tsx:1028:                              placeholder={
src\components\ai\admin\AIServiceConfiguration.tsx:1066:                              placeholder={`Enter ${p} API key`}
src\components\ai\admin\AIServiceConfiguration.tsx:1135:                                <SelectValue placeholder="Select model" />
src\components\ai\admin\AIServiceConfiguration.tsx:1188:                                  <SelectValue placeholder="Select model" />
src\components\ai\admin\AIServiceConfiguration.tsx:1213:                              placeholder="e.g., gpt-4, claude-3-5-sonnet"
src\components\ai\admin\AIServiceConfiguration.tsx:1257:                              placeholder="sk_xxxxxxxxxxxxxxxxxxxxx"
src\components\ai\admin\AIServiceConfiguration.tsx:1317:                              placeholder="tvly-xxxxxxxxxxxxxxxxxxxxx"
src\components\ai\admin\AIServiceConfiguration.tsx:1379:                              placeholder="AIzaSyxxxxxxxxxxxxxxxxxxxxx"
src\components\ai\admin\AIServiceConfiguration.tsx:1430:                              placeholder="xxxxxxxxxxxxxxxxxxxxx"
src\components\ai\admin\AIServiceConfiguration.tsx:1478:                          DuckDuckGo (free, no API key required) as a fallback.
src\components\ai\admin\AIServiceConfiguration.tsx:1559:                                        placeholder="Provider Name (e.g., CustomSearchAPI)"
src\components\ai\admin\AIServiceConfiguration.tsx:1690:                                        placeholder="Enter API key"
src\components\ai\admin\AIServiceConfiguration.tsx:1748:                                        placeholder="https://api.example.com/v1"
src\components\ai\admin\AIServiceConfiguration.tsx:1807:                                      placeholder="e.g., gpt-4, claude-3-5-sonnet, llama-3.1-70b"
src\components\ai\admin\AIServiceConfiguration.tsx:1865:                                      placeholder="Brief description of this provider"
src\components\ai\admin\AIServiceConfiguration.tsx:1942:                    placeholder="60"
src\components\ai\admin\AIServiceConfiguration.tsx:2001:                          placeholder="{}"
src\components\admin-sidebar.tsx:327:                    console.warn('Logo failed to load, using fallback');
src\lib\services\pricing-intel\MarketIntelligenceService.ts:797:    // Get our shipping cost (placeholder - should come from actual shipping config)
src\lib\ai\tools\mcp-bridge.ts:10:// MCP Server Response Schemas (placeholder for actual MCP protocol)
src\lib\ai\tools\executor.ts:196:    // This is a placeholder - actual tool implementations would be registered separately
src\lib\ai\tools\executor.ts:214:   * Get tool handler implementation (placeholder)
src\lib\ai\tools\executor.ts:218:    // This is a placeholder implementation
src\lib\ai\tools\executor.ts:224:   * Get user permissions (placeholder)
src\components\admin\users\UserFilters.tsx:63:              placeholder="Search by name, email, or department..."
src\components\admin\users\UserFilters.tsx:74:                <SelectValue placeholder="All Roles" />
src\components\admin\users\UserFilters.tsx:88:                <SelectValue placeholder="All Status" />
src\components\admin\users\UserFilters.tsx:141:                    <SelectValue placeholder="All Departments" />
src\components\logistics\DeliverySelector.tsx:292:            placeholder="Start typing to search..."
src\components\logistics\DeliverySelector.tsx:303:                placeholder="123 Main Street"
src\components\logistics\DeliverySelector.tsx:314:                  placeholder="Suburb"
src\components\logistics\DeliverySelector.tsx:323:                  placeholder="City"
src\components\logistics\DeliverySelector.tsx:333:                    <SelectValue placeholder="Select province" />
src\components\logistics\DeliverySelector.tsx:354:                  placeholder="0000"
src\components\logistics\DeliverySelector.tsx:369:                placeholder="John Doe"
src\components\logistics\DeliverySelector.tsx:379:                placeholder="+27 12 345 6789"
src\components\logistics\DeliverySelector.tsx:389:                placeholder="email@example.com"
src\components\logistics\DeliverySelector.tsx:409:                placeholder="0.0"
src\components\logistics\DeliverySelector.tsx:441:                placeholder="30"
src\components\logistics\DeliverySelector.tsx:453:                placeholder="20"
src\components\logistics\DeliverySelector.tsx:465:                placeholder="15"
src\components\logistics\DeliverySelector.tsx:476:              placeholder="Brief description of contents"
src\components\logistics\DeliverySelector.tsx:495:                placeholder="0.00"
src\components\logistics\DeliverySelector.tsx:593:            placeholder="Any special delivery instructions for the courier..."
src\components\logistics\DeliveryRoutePlanner.tsx:38:  const mockStops: RouteStop[] = [
src\components\logistics\DeliveryRoutePlanner.tsx:106:        stops: [mockStops[0], mockStops[1], mockStops[4], mockStops[5]],
src\components\logistics\DeliveryRoutePlanner.tsx:114:        stops: [mockStops[2], mockStops[3]],
src\components\logistics\DeliveryRoutePlanner.tsx:122:        stops: [mockStops[0], mockStops[1]],
src\components\logistics\DeliveryRoutePlanner.tsx:138:          efficiency: Math.min(100, route.efficiency + Math.random() * 5),
src\components\logistics\DeliveryRoutePlanner.tsx:139:          totalTime: Math.max(15, route.totalTime - Math.random() * 10),
src\app\api\unmatched\route.ts:11:      // Return mock unmatched items for demo
src\components\logistics\CourierMapAdvanced.tsx:170:          const newLat = courier.lat + (Math.random() - 0.5) * 0.002;
src\components\logistics\CourierMapAdvanced.tsx:171:          const newLng = courier.lng + (Math.random() - 0.5) * 0.002;
src\components\logistics\CourierMapAdvanced.tsx:179:              speed: courier.speed! + (Math.random() - 0.5) * 5,
src\components\logistics\CourierMapAdvanced.tsx:180:              heading: courier.heading! + (Math.random() - 0.5) * 20,
src\components\logistics\CourierMapAdvanced.tsx:401:              <SelectValue placeholder="Select courier" />
src\components\logistics\CourierMap.tsx:46:          lat: courier.lat + (Math.random() - 0.5) * 0.001,
src\components\logistics\CourierMap.tsx:47:          lng: courier.lng + (Math.random() - 0.5) * 0.001,
src\components\logistics\CostComparison.tsx:111:                    {/* Provider logo placeholder */}
src\components\logistics\AddressAutocomplete.tsx:17:  placeholder?: string;
src\components\logistics\AddressAutocomplete.tsx:42:  placeholder = 'Start typing an address...',
src\components\logistics\AddressAutocomplete.tsx:174:          placeholder={placeholder}
src\components\layout\AppHeader.tsx:76:      const mockSuggestions = [
src\components\layout\AppHeader.tsx:84:      setSuggestions(mockSuggestions);
src\components\layout\AppHeader.tsx:124:            placeholder="Search suppliers, products, inventory..."
src\components\logistics\LiveMetrics.tsx:42:        deliveriesPerHour: prev.deliveriesPerHour + (Math.random() > 0.5 ? 1 : -1),
src\components\logistics\LiveMetrics.tsx:43:        avgDeliveryTime: Math.max(15, prev.avgDeliveryTime + (Math.random() > 0.5 ? 1 : -1)),
src\components\logistics\LiveMetrics.tsx:46:          prev.activeRoutes + (Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0)
src\components\logistics\LiveMetrics.tsx:50:          Math.max(3, prev.customerSatisfaction + (Math.random() - 0.5) * 0.1)
src\components\logistics\DeliveryStatusWidget.tsx:54:      if (deliveryIds.length > 0 && Math.random() > 0.8) {
src\components\logistics\DeliveryStatusWidget.tsx:55:        const randomId = deliveryIds[Math.floor(Math.random() * deliveryIds.length)];
src\components\logistics\DeliveryStatusWidget.tsx:57:        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
src\lib\services\PricelistService.ts:86:      const fallback = await dbQuery<{ upload_id: string }>(
src\lib\services\PricelistService.ts:90:      normalizedUploadId = fallback.rows?.[0]?.upload_id;
src\lib\services\PricelistService.ts:119:        const placeholders: string[] = [];
src\lib\services\PricelistService.ts:124:          placeholders.push(
src\lib\services\PricelistService.ts:130:          // Ensure price is never null - use cost_price_ex_vat as fallback, default to 0
src\lib\services\PricelistService.ts:168:          ) VALUES ${placeholders.join(', ')}
src\lib\services\PricelistService.ts:426:   * Merge pricelist using inline SQL (Phase 2 fallback implementation)
src\lib\services\PricelistService.ts:429:   * This is the fallback when stored procedure is not yet available.
src\components\logistics\MapControls.tsx:52:            <SelectValue placeholder="Layer" />
src\components\logistics\MapControls.tsx:65:            <SelectValue placeholder="View" />
src\components\logistics\LiveTracking.tsx:91:      if (isConnected && Math.random() > 0.7) {
src\components\logistics\LiveTracking.tsx:98:              lat: -26.2041 + (Math.random() - 0.5) * 0.01,
src\components\logistics\LiveTracking.tsx:99:              lng: 28.0473 + (Math.random() - 0.5) * 0.01,
src\components\logistics\LiveTracking.tsx:100:              address: `${Math.floor(Math.random() * 999)} Commissioner St, Johannesburg`,
src\lib\services\PriceListProcessor.ts:625:    return `pricelist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
src\lib\services\PriceListProcessor.ts:872:    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
src\lib\ai\providers.ts:261:  return Math.random() < analytics.sampleRate;
src\lib\ai\providers.ts:1121:      // Continue to next provider in fallback chain
src\lib\ai\services\response.ts:8:  fallback?: unknown;
src\lib\ai\services\response.ts:44:      return { data: options.fallback, issues: ['Empty response payload.'], raw: '' };
src\lib\ai\services\response.ts:56:          return { data: options.fallback, issues, raw };
src\lib\ai\services\response.ts:70:    return { data: options.fallback, issues, raw };
src\lib\ai\services\README.md:3:Production-ready AI Prediction Service for MantisNXT that replaces all mock implementations with real database integration.
src\lib\ai\services\README.md:484:This service **replaces all mock implementations** in:
src\lib\ai\services\prompts.ts:284:    let offset = Math.random() * totalWeight;
src\lib\services\PlusPortalSyncService.ts:223:          placeholder: input.placeholder,
src\lib\services\PlusPortalSyncService.ts:476:      // Try with details first, fallback without if column doesn't exist
src\lib\services\PlusPortalSyncService.ts:873:    // Try to get logs with details, fallback without if column doesn't exist
src\lib\services\docustore\templates\pos-receipt.ts:235:    .barcode-placeholder {
src\lib\ai\preferences\learner.ts:199:    const suggestionId = `suggestion_${userId}_${Date.now()}_${Math.random()}`;
src\lib\ai\preferences\calibrator.ts:125:    // For now, this is a placeholder. In a real implementation,
src\lib\ai\preferences\calibrator.ts:225:        patternId: `pattern_${Date.now()}_${Math.random()}`,
src\lib\services\PlusPortalCSVProcessor.ts:131:      console.log('[PlusPortal CSV] Attempting fallback parsing...');
src\lib\services\PlusPortalCSVProcessor.ts:164:      } catch (fallbackError) {
src\lib\ai\services\dashboard-service.ts:917:    // For now, return mock structure based on widget type
src\lib\ai\services\dashboard-service.ts:918:    const mockData = this.generateMockWidgetData(widget);
src\lib\ai\services\dashboard-service.ts:921:      data: mockData,
src\lib\ai\services\dashboard-service.ts:932:   * Generate mock data based on widget type
src\lib\ai\services\dashboard-service.ts:939:          value: Math.random() * 100,
src\lib\ai\services\dashboard-service.ts:941:          trend: Math.random() > 0.5 ? 'up' : 'down',
src\lib\ai\services\dashboard-service.ts:942:          change: (Math.random() * 20 - 10).toFixed(2),
src\lib\ai\services\dashboard-service.ts:948:          value: Math.random() * 100,
src\lib\ai\services\dashboard-service.ts:953:          value: Math.random() * 100,
src\lib\ai\services\dashboard-service.ts:957:          { name: 'Category A', value: Math.random() * 100 },
src\lib\ai\services\dashboard-service.ts:958:          { name: 'Category B', value: Math.random() * 100 },
src\lib\ai\services\dashboard-service.ts:959:          { name: 'Category C', value: Math.random() * 100 },
src\lib\ai\services\dashboard-service.ts:960:          { name: 'Category D', value: Math.random() * 100 },
src\lib\ai\services\dashboard-service.ts:966:          value: Math.random() * 100,
src\lib\ai\services\dashboard-service.ts:967:          status: Math.random() > 0.5 ? 'active' : 'inactive',
src\app\api\v1\customers\[id]\loyalty\transactions\route.ts:50:    const mockData = {
src\app\api\v1\customers\[id]\loyalty\transactions\route.ts:56:      formatPaginatedResponse(mockData.transactions, mockData.total, page, limit)
src\lib\ai\services\conversation-service.ts:280:  const random = Math.random().toString(36).slice(2, 8);
src\app\financial\ar\receipts\new\page.tsx:110:                  <Input id="invoice_id" name="invoice_id" placeholder="Link to specific invoice" />
src\app\api\v1\customers\[id]\loyalty\summary\route.ts:35:    const mockResult = {
src\app\api\v1\customers\[id]\loyalty\summary\route.ts:92:      data: mockResult,
src\app\api\tags\enrich\batch\route.ts:18:      console.warn('[tag-enrich] Auth failed, using fallback orgId:', authError);
src\app\api\tags\enrich\batch\route.ts:19:      // Continue with undefined orgId - will use default fallback
src\lib\services\docustore\pdf-service.ts:189:    // Create artifact record (link to first document if available, or create a placeholder)
src\lib\services\docustore\pdf-service.ts:235:   * This is a placeholder that generates HTML which can be converted to PDF using puppeteer
src\lib\ai\orchestrator\types.ts:12:  // Provider preferences and fallback rules
src\lib\ai\orchestrator\types.ts:14:  fallbackChain: z.array(z.string() as z.ZodType<AIProviderId>).default([]),
src\lib\ai\services\chat.ts:298:    const hash = createHash('md5').update(`${seed}-${Date.now()}-${Math.random()}`).digest('hex');
src\lib\ai\database-integration.ts:155:  private fallbackModel = openai('gpt-4.1');
src\app\api\v1\customers\[id]\loyalty\route.ts:34:    const mockResult = {
src\app\api\v1\customers\[id]\loyalty\route.ts:74:      data: mockResult,
src\lib\ai\orchestrator\tool-call-utils.ts:23:  const fallbackArgs = (toolCall as Record<string, unknown>).args;
src\lib\ai\orchestrator\tool-call-utils.ts:24:  if (fallbackArgs !== undefined) return fallbackArgs;
src\lib\ai\config.ts:31:    fallback: ['anthropic', 'vercel'],
src\lib\ai\config.ts:37:    fallback: ['openai', 'vercel'],
src\lib\ai\config.ts:44:    fallback: ['openai', 'anthropic'],
src\lib\ai\config.ts:51:    fallback: ['openai', 'vercel'],
src\lib\ai\config.ts:58:    fallback: ['openai', 'anthropic'],
src\lib\ai\config.ts:64:    fallback: [],
src\lib\ai\config.ts:110:  fallback: z.array(ProviderIdSchema).optional(),
src\lib\ai\config.ts:281:    fallbackOrder: z.array(ProviderIdSchema).nonempty(),
src\lib\ai\config.ts:295:      if (!value.fallbackOrder.includes(providerId as AIProviderId)) {
src\lib\ai\config.ts:298:          path: ['fallbackOrder'],
src\lib\ai\config.ts:309:const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
src\lib\ai\config.ts:310:  if (value == null) return fallback;
src\lib\ai\config.ts:315:const parseNumber = (value: string | undefined, fallback: number): number => {
src\lib\ai\config.ts:316:  if (value == null) return fallback;
src\lib\ai\config.ts:318:  return Number.isFinite(parsed) ? parsed : fallback;
src\lib\ai\config.ts:335:  fallback: overrides?.fallback ?? DEFAULT_MODELS[provider].fallback,
src\lib\ai\config.ts:495:  const fallbackKey = getProviderEnvKey(provider, 'FALLBACK');
src\lib\ai\config.ts:499:  const modelOverrides = parseProviderList(env[fallbackKey]);
src\lib\ai\config.ts:534:      ...(modelOverrides.length ? { fallback: modelOverrides } : {}),
src\lib\ai\config.ts:560:  const order = config.fallbackOrder;
src\lib\ai\config.ts:630:  const fallbackOrder = ensureFallbackOrder(
src\lib\ai\config.ts:648:    fallbackOrder,
src\lib\ai\config.ts:722:  const order = ensureFallbackOrder(preferred ?? config.defaultProvider, config.fallbackOrder);
src\lib\ai\services\base.ts:559:    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
src\lib\ai\orchestrator\index.ts:20:  fallbackChain: [],
src\lib\ai\model-utils.ts:19:export const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID ?? FALLBACK_ORG_ID;
src\lib\ai\model-utils.ts:23:  return DEFAULT_ORG_ID;
src\lib\ai\services\AIServiceConfigService.ts:148:        const fallback = await db.query(
src\lib\ai\services\AIServiceConfigService.ts:160:        if (fallback.rows.length > 0) {
src\lib\ai\services\AIServiceConfigService.ts:161:          return this.mapConfigRow(fallback.rows[0]);
src\lib\ai\services\AIServiceConfigService.ts:164:        // Fuzzy fallback (partial match) across orgs
src\app\api\v1\customers\[id]\loyalty\rewards\redeem\route.ts:45:    const mockResult = {
src\app\api\v1\customers\[id]\loyalty\rewards\redeem\route.ts:46:      redemption_id: 'mock-redemption-id',
src\app\api\v1\customers\[id]\loyalty\rewards\redeem\route.ts:59:        data: mockResult,
src\lib\services\DiscountCalculationService.ts:117:      // Supplier-level rule (fallback, lowest priority)
src\lib\ai\api-utils.ts:263:const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID ?? FALLBACK_ORG_ID;
src\lib\ai\api-utils.ts:270:  return DEFAULT_ORG_ID;
src\lib\ai\api-utils.ts:278:      org_id: DEFAULT_ORG_ID,
src\lib\services\CustomerSyncService.ts:311:    const idempotencyKey = `customer-sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
src\app\api\v1\customers\[id]\loyalty\rewards\available\route.ts:49:    const mockData = {
src\app\api\v1\customers\[id]\loyalty\rewards\available\route.ts:55:      formatPaginatedResponse(mockData.rewards, mockData.total, page, limit)
src\lib\ai\errors\recovery.ts:6: * Provides automatic retry, timeout, and fallback mechanisms
src\lib\ai\errors\recovery.ts:240:   * Execute with fallback
src\lib\ai\errors\recovery.ts:242:  async withFallback<T>(fn: () => Promise<T>, fallback: T | (() => T)): Promise<T> {
src\lib\ai\errors\recovery.ts:248:      // Only fallback for non-fatal errors
src\lib\ai\errors\recovery.ts:253:      return typeof fallback === 'function' ? (fallback as () => T)() : fallback;
src\lib\ai\errors\recovery.ts:266:      fallback?: T | (() => T);
src\lib\ai\errors\recovery.ts:287:    // Apply fallback (outermost)
src\lib\ai\errors\recovery.ts:288:    if (strategies.fallback !== undefined) {
src\lib\ai\errors\recovery.ts:289:      wrappedFn = () => this.withFallback(wrappedFn, strategies.fallback!);
src\app\api\v1\customers\[id]\loyalty\referrals\route.ts:51:    const mockData = {
src\app\api\v1\customers\[id]\loyalty\referrals\route.ts:63:      data: mockData,
src\app\api\v1\customers\[id]\loyalty\referrals\route.ts:95:    const mockResult = {
src\app\api\v1\customers\[id]\loyalty\referrals\route.ts:96:      referral_id: 'mock-referral-id',
src\app\api\v1\customers\[id]\loyalty\referrals\route.ts:109:        data: mockResult,
src\lib\ai\errors\handler.ts:141:    const jitter = Math.random() * 0.1; // 10% jitter
src\lib\services\ConflictResolver.ts:277:    const jitter = Math.random() * 1000; // Add up to 1s jitter
src\lib\loyalty\README.md:5:The AI-Powered Loyalty Analytics Service provides comprehensive, real-time analytics for loyalty programs using advanced AI models (Claude 3.5 Sonnet) and database integration. This service replaces all mock data with live database queries and AI-generated insights.
src\app\api\v1\customers\[id]\loyalty\redemptions\[redemptionId]\route.ts:35:    const mockResult = {
src\app\api\v1\customers\[id]\loyalty\redemptions\[redemptionId]\route.ts:56:      data: mockResult,
src\app\api\v1\customers\[id]\loyalty\redemptions\route.ts:49:    const mockData = {
src\app\api\v1\customers\[id]\loyalty\redemptions\route.ts:55:      formatPaginatedResponse(mockData.redemptions, mockData.total, page, limit)
src\lib\logging\error-logger.ts:181:    const random = Math.random().toString(36).substring(2, 9);
src\app\api\v1\customers\[id]\loyalty\enroll\route.ts:47:    const mockResult = {
src\app\api\v1\customers\[id]\loyalty\enroll\route.ts:60:        data: mockResult,
src\lib\pos-app\neon.ts:65:    // Check if query has parameter placeholders ($1, $2, etc.)
src\lib\pos-app\neon.ts:69:      // Use sql.query() for parameterized queries with $1, $2 placeholders
src\lib\pos-app\neon.ts:73:      // For queries without placeholders, use tagged template literal with unsafe()
src\lib\pos-app\neon.ts:77:      // Has placeholders but no params provided - this is an error
src\lib\pos-app\neon.ts:78:      throw new Error('Query contains placeholders but no parameters provided');
src\lib\mock-data\index.ts:3: * Central export for all South African Rand (ZAR) mock data
src\lib\pipeline\cache-manager.ts:205:    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
src\lib\security\index.ts:153:    password += charset.charAt(Math.floor(Math.random() * charset.length));
src\app\api\v1\integrations\woocommerce\schedule\customers\route.ts:56:      console.warn(`[WooCommerce Schedule Customers] No users found for org ${resolvedOrgId}, using org ID as fallback`);
src\lib\middleware\rate-limiter.ts:108:        const requestId = `${now}:${Math.random()}`;
src\hooks\useWebSocket.ts:37:  const clientIdRef = useRef(Math.random().toString(36).substring(2, 11));
src\app\api\v1\integrations\woocommerce\table\route.ts:22:    const fallbackOrg = await query<{ id: string }>(
src\app\api\v1\integrations\woocommerce\table\route.ts:25:    if (fallbackOrg.rows.length > 0) {
src\app\api\v1\integrations\woocommerce\table\route.ts:26:      orgId = fallbackOrg.rows[0].id;
src\app\api\v1\integrations\woocommerce\preview\refresh\route.ts:31:        const fallbackOrg = await query<{ id: string }>(
src\app\api\v1\integrations\woocommerce\preview\refresh\route.ts:34:        if (fallbackOrg.rows.length > 0) {
src\app\api\v1\integrations\woocommerce\preview\refresh\route.ts:35:          validOrgId = fallbackOrg.rows[0].id;
src\app\api\v1\integrations\woocommerce\preview\refresh\route.ts:46:      const fallbackOrg = await query<{ id: string }>(
src\app\api\v1\integrations\woocommerce\preview\refresh\route.ts:49:      if (fallbackOrg.rows.length > 0) {
src\app\api\v1\integrations\woocommerce\preview\refresh\route.ts:50:        validOrgId = fallbackOrg.rows[0].id;
src\hooks\useRealTimeDataFixed.ts:23:  fallbackRefreshInterval: 45 * 1000, // 45 seconds for fallback
src\hooks\useRealTimeDataFixed.ts:157:    placeholderData: keepPreviousData,
src\hooks\useRealTimeDataFixed.ts:223:    placeholderData: keepPreviousData,
src\hooks\useRealTimeDataFixed.ts:279:    staleTime: API_CONFIG.fallbackRefreshInterval,
src\hooks\useRealTimeDataFixed.ts:382:    staleTime: API_CONFIG.fallbackRefreshInterval,
src\hooks\useRealTimeDataFixed.ts:458:    placeholderData: keepPreviousData,
src\lib\marketplace-app\db.ts:8:// Use a valid placeholder URL that neon() will accept for type checking
src\lib\realtime\websocket-server.ts:318:    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
src\lib\services\LocationService.ts:173:    const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
src\lib\services\LocationService.ts:179:      VALUES (${placeholders})
src\lib\services\IntegrationMappingService.ts:220:    const placeholders: string[] = [];
src\lib\services\IntegrationMappingService.ts:224:      placeholders.push(
src\lib\services\IntegrationMappingService.ts:244:      ) VALUES ${placeholders.join(', ')}
src\lib\services\IntegrationMappingService.ts:318:    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
src\lib\services\IntegrationMappingService.ts:323:         VALUES (${placeholders})`,
src\lib\services\IntegrationSyncService.ts:652:          console.warn(`[IntegrationSyncService] No users found for org ${this.orgId}, using org ID as fallback`);
src\app\api\v1\integrations\woocommerce\bulk-sync\route.ts:42:        const fallbackOrg = await query<{ id: string }>(
src\app\api\v1\integrations\woocommerce\bulk-sync\route.ts:45:        if (fallbackOrg.rows.length > 0) {
src\app\api\v1\integrations\woocommerce\bulk-sync\route.ts:46:          validOrgId = fallbackOrg.rows[0].id;
src\app\api\v1\integrations\woocommerce\bulk-sync\route.ts:57:      const fallbackOrg = await query<{ id: string }>(
src\app\api\v1\integrations\woocommerce\bulk-sync\route.ts:60:      if (fallbackOrg.rows.length > 0) {
src\app\api\v1\integrations\woocommerce\bulk-sync\route.ts:61:        validOrgId = fallbackOrg.rows[0].id;
src\app\api\v1\integrations\woocommerce\bulk-sync\route.ts:99:      console.warn(`[WooCommerce Bulk Sync] No users found for org ${resolvedOrgId}, using org ID as fallback`);
src\lib\notifications\live-notifications.ts:542:    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
src\lib\services\ExtractionWorker.ts:875:    // If no name, use SKU as fallback
src\lib\services\ExtractionWorker.ts:881:        message: 'Product name missing, using SKU as fallback',
src\lib\services\ExtractionJobQueue.ts:347:      const jitter = Math.random() * 0.25 * exponentialDelay;
src\lib\services\ExtractionJobQueue.ts:498:    // Average job duration (fallback to 30s)
src\lib\services\EmailService.ts:5: * with nodemailer SMTP fallback for reliability.
src\lib\services\EmailService.ts:155:   * Send an email using Resend (primary) or SMTP (fallback)
src\app\api\v1\integrations\sync\progress\[jobId]\route.ts:163:          // Polling fallback: fetch progress if no updates for 2 seconds
src\lib\services\logistics\CourierProviderClients\CourierGuyClient.ts:32:    const trackingNumber = `CG${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
src\lib\services\logistics\CourierProviderClients\FastWayClient.ts:32:    const trackingNumber = `FW${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
src\lib\services\logistics\CourierProviderClients\DHLClient.ts:32:    const trackingNumber = `DHL${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
src\lib\services\logistics\CourierProviderClients\ShiplogicClient.ts:404:      // Generate fallback tracking number
src\lib\services\logistics\CourierProviderClients\ShiplogicClient.ts:405:      const trackingNumber = `SL${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
src\lib\services\logistics\CourierProviderClients\ShiplogicClient.ts:439:      // Return mock tracking for fallback
src\lib\services\logistics\CourierProviderClients\PostNetClient.ts:17:    // For now, return mock quote based on weight and distance
src\lib\services\logistics\CourierProviderClients\PostNetClient.ts:33:    const trackingNumber = `PN${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
src\lib\offline-manager.ts:226:      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
src\app\api\system-health\route.ts:37:      responseTime: 95 + Math.random() * 50,
src\app\api\system-health\route.ts:39:      requestsPerSecond: Math.floor(Math.random() * 100) + 50,
src\app\api\system-health\route.ts:40:      errors: Math.floor(Math.random() * 5),
src\app\api\system-health\route.ts:46:      status: Math.random() > 0.8 ? 'warning' : 'healthy',
src\app\api\system-health\route.ts:47:      responseTime: 120 + Math.random() * 80,
src\app\api\system-health\route.ts:49:      requestsPerSecond: Math.floor(Math.random() * 200) + 100,
src\app\api\system-health\route.ts:50:      errors: Math.floor(Math.random() * 3),
src\app\api\system-health\route.ts:56:      status: Math.random() > 0.9 ? 'error' : 'healthy',
src\app\api\system-health\route.ts:57:      responseTime: 80 + Math.random() * 40,
src\app\api\system-health\route.ts:59:      requestsPerSecond: Math.floor(Math.random() * 150) + 75,
src\app\api\system-health\route.ts:60:      errors: Math.floor(Math.random() * 8),
src\app\api\system-health\route.ts:67:      responseTime: 150 + Math.random() * 100,
src\app\api\system-health\route.ts:69:      requestsPerSecond: Math.floor(Math.random() * 300) + 200,
src\app\api\system-health\route.ts:76:      status: Math.random() > 0.7 ? 'error' : 'healthy',
src\app\api\system-health\route.ts:77:      responseTime: 200 + Math.random() * 300,
src\app\api\system-health\route.ts:79:      requestsPerSecond: Math.floor(Math.random() * 50) + 25,
src\app\api\system-health\route.ts:80:      errors: Math.floor(Math.random() * 12),
src\app\api\system-health\route.ts:87:      responseTime: 2 + Math.random() * 8,
src\app\api\system-health\route.ts:89:      requestsPerSecond: Math.floor(Math.random() * 1000) + 500,
src\app\api\system-health\route.ts:102:      responseTime: 8 + Math.random() * 15,
src\app\api\system-health\route.ts:104:        active: Math.floor(Math.random() * 45) + 20,
src\app\api\system-health\route.ts:109:        avgQueryTime: 12 + Math.random() * 20,
src\app\api\system-health\route.ts:110:        slowQueries: Math.floor(Math.random() * 3),
src\app\api\system-health\route.ts:111:        totalQueries: Math.floor(Math.random() * 10000) + 5000,
src\app\api\system-health\route.ts:115:        lag: Math.random() * 100,
src\app\api\system-health\route.ts:119:        lastBackup: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
src\app\api\system-health\route.ts:127:      responseTime: 1 + Math.random() * 5,
src\app\api\system-health\route.ts:129:        active: Math.floor(Math.random() * 25) + 5,
src\app\api\system-health\route.ts:134:        avgQueryTime: 1 + Math.random() * 3,
src\app\api\system-health\route.ts:136:        totalQueries: Math.floor(Math.random() * 50000) + 25000,
src\app\api\system-health\route.ts:139:        used: Math.floor(Math.random() * 1000) + 500,
src\app\api\system-health\route.ts:141:        percentage: Math.floor(Math.random() * 60) + 30,
src\app\api\system-health\route.ts:147:      status: Math.random() > 0.8 ? 'slow' : 'connected',
src\app\api\system-health\route.ts:148:      responseTime: 150 + Math.random() * 200,
src\app\api\system-health\route.ts:150:        active: Math.floor(Math.random() * 15) + 3,
src\app\api\system-health\route.ts:155:        avgQueryTime: 100 + Math.random() * 150,
src\app\api\system-health\route.ts:156:        slowQueries: Math.floor(Math.random() * 8) + 1,
src\app\api\system-health\route.ts:157:        totalQueries: Math.floor(Math.random() * 5000) + 2000,
src\app\api\system-health\route.ts:160:        used: Math.floor(Math.random() * 500) + 200,
src\app\api\system-health\route.ts:162:        percentage: Math.floor(Math.random() * 70) + 25,
src\app\api\system-health\route.ts:170:      usage: Math.floor(Math.random() * 100),
src\app\api\system-health\route.ts:172:      loadAverage: [Math.random() * 2, Math.random() * 1.5, Math.random() * 1],
src\app\api\system-health\route.ts:173:      temperature: 35 + Math.random() * 25,
src\app\api\system-health\route.ts:176:      used: Math.floor(Math.random() * 32) + 24,
src\app\api\system-health\route.ts:178:      percentage: Math.floor(Math.random() * 70) + 20,
src\app\api\system-health\route.ts:179:      swapUsed: Math.floor(Math.random() * 10),
src\app\api\system-health\route.ts:183:      used: Math.floor(Math.random() * 500) + 300,
src\app\api\system-health\route.ts:185:      percentage: Math.floor(Math.random() * 80) + 10,
src\app\api\system-health\route.ts:186:      readSpeed: Math.random() * 1000 + 200,
src\app\api\system-health\route.ts:187:      writeSpeed: Math.random() * 800 + 150,
src\app\api\system-health\route.ts:190:      inbound: Math.random() * 100 + 10,
src\app\api\system-health\route.ts:191:      outbound: Math.random() * 50 + 5,
src\app\api\system-health\route.ts:192:      packetsIn: Math.floor(Math.random() * 10000) + 5000,
src\app\api\system-health\route.ts:193:      packetsOut: Math.floor(Math.random() * 5000) + 2500,
src\app\api\system-health\route.ts:194:      errors: Math.floor(Math.random() * 5),
src\app\api\system-health\route.ts:212:      lastScan: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
src\app\api\system-health\route.ts:216:      activeSessions: Math.floor(Math.random() * 150) + 50,
src\app\api\system-health\route.ts:217:      failedAttempts: Math.floor(Math.random() * 20),
src\app\api\system-health\route.ts:218:      lockouts: Math.floor(Math.random() * 3),
src\app\api\system-health\route.ts:240:      p50: Math.floor(Math.random() * 100) + 50,
src\app\api\system-health\route.ts:241:      p95: Math.floor(Math.random() * 200) + 100,
src\app\api\system-health\route.ts:242:      p99: Math.floor(Math.random() * 500) + 250,
src\app\api\system-health\route.ts:245:      requestsPerSecond: Math.floor(Math.random() * 1000) + 500,
src\app\api\system-health\route.ts:246:      peakRequestsPerSecond: Math.floor(Math.random() * 2000) + 1000,
src\app\api\system-health\route.ts:248:    errorRate: Math.random() * 0.1,
src\app\api\system-health\route.ts:249:    availability: 99.5 + Math.random() * 0.4,
src\lib\services\file-extraction\ValidationEngine.ts:131:  // Check for placeholder values
src\lib\services\file-extraction\ValidationEngine.ts:132:  const placeholders = ['test', 'sample', 'example', 'xxx', 'tbd', 'n/a', 'null', 'none'];
src\lib\services\file-extraction\ValidationEngine.ts:133:  if (placeholders.includes(name.toLowerCase().trim())) {
src\lib\services\file-extraction\ValidationEngine.ts:134:    warnings.push('Name appears to be a placeholder value');
src\app\api\v1\ai\config\_store.ts:269:    console.log(`?? Checking fallback: looking for chatbot records...`);
src\app\api\v1\ai\config\_store.ts:270:    const { rows: fallbackRows } = await query<DbConfigRow>(
src\app\api\v1\ai\config\_store.ts:274:    console.log(`?? Fallback result: ${fallbackRows.length} chatbot rows found`);
src\app\api\v1\ai\config\_store.ts:275:    if (fallbackRows.length > 0) {
src\app\api\v1\ai\config\_store.ts:276:      const config = parseConfig(fallbackRows[0].config);
src\app\api\v1\ai\config\_store.ts:280:        return mapRow(fallbackRows[0]);
src\app\financial\ar\credit-notes\page.tsx:34:        // Note: This endpoint may not exist yet, but we'll create a placeholder
src\app\api\v1\integrations\sync\preview\route.ts:39:  process.env.DEFAULT_ORG_ID && UUID_REGEX.test(process.env.DEFAULT_ORG_ID)
src\app\api\v1\integrations\sync\preview\route.ts:40:    ? process.env.DEFAULT_ORG_ID
src\app\api\v1\integrations\sync\preview\route.ts:149:  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
src\app\api\v1\integrations\sync\preview\route.ts:214:          `[Sync Preview] Fallback org_id ${orgId} not found in database. Proceeding with fallback context.`
src\app\api\v1\integrations\sync\preview\route.ts:285:  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
src\app\api\v1\integrations\sync\preview\route.ts:351:          `[Sync Preview] Fallback org_id ${orgId} not found in database. Proceeding with fallback context.`
src\app\api\v1\sales\_helpers.ts:20: * Get organization ID from request with fallback
src\app\api\v1\sales\_helpers.ts:52:  const envOrgId = process.env.DEFAULT_ORG_ID;
src\app\api\v1\integrations\woocommerce\sync\customers\route.SECURE.ts:131:  // For now, placeholder that shows the pattern:
src\app\api\v1\integrations\woocommerce\sync\customers\route.SECURE.ts:175:  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
src\app\api\v1\admin\users\bulk\route.ts:88:    const { authProvider } = await import('@/lib/auth/mock-provider');
src\app\api\v1\admin\loyalty\rules\[id]\test\route.ts:48:    const mockResult = {
src\app\api\v1\admin\loyalty\rules\[id]\test\route.ts:66:      data: mockResult,
src\app\api\v1\admin\loyalty\rules\[id]\route.ts:58:    const mockResult = {
src\app\api\v1\admin\loyalty\rules\[id]\route.ts:80:      data: mockResult,
src\app\api\v1\admin\loyalty\rules\[id]\route.ts:112:    const mockResult = {
src\app\api\v1\admin\loyalty\rules\[id]\route.ts:121:      data: mockResult,
src\app\api\v1\admin\loyalty\rules\[id]\deactivate\route.ts:34:    const mockResult = {
src\app\api\v1\admin\loyalty\rules\[id]\deactivate\route.ts:42:      data: mockResult,
src\app\api\v1\admin\loyalty\rules\[id]\activate\route.ts:31:    const mockResult = {
src\app\api\v1\admin\loyalty\rules\[id]\activate\route.ts:39:      data: mockResult,
src\app\financial\ap\payments\new\page.tsx:110:                  <Input id="invoice_id" name="invoice_id" placeholder="Link to specific invoice" />
src\app\api\v1\admin\loyalty\rules\route.ts:72:    const mockData = {
src\app\api\v1\admin\loyalty\rules\route.ts:77:    return NextResponse.json(formatPaginatedResponse(mockData.rules, mockData.total, page, limit));
src\app\api\v1\admin\loyalty\rules\route.ts:102:    const mockResult = {
src\app\api\v1\admin\loyalty\rules\route.ts:103:      id: 'mock-rule-id',
src\app\api\v1\admin\loyalty\rules\route.ts:113:        data: mockResult,
src\app\api\v1\integrations\woocommerce\secure-bulk-sync\route.ts:140:        const fallbackOrg = await query<{ id: string }>(
src\app\api\v1\integrations\woocommerce\secure-bulk-sync\route.ts:143:        if (fallbackOrg.rows.length > 0) {
src\app\api\v1\integrations\woocommerce\secure-bulk-sync\route.ts:144:          validOrgId = fallbackOrg.rows[0].id;
src\app\api\v1\integrations\woocommerce\secure-bulk-sync\route.ts:158:      const fallbackOrg = await query<{ id: string }>(
src\app\api\v1\integrations\woocommerce\secure-bulk-sync\route.ts:161:      if (fallbackOrg.rows.length > 0) {
src\app\api\v1\integrations\woocommerce\secure-bulk-sync\route.ts:162:        validOrgId = fallbackOrg.rows[0].id;
src\app\api\v1\admin\loyalty\rewards\[id]\stock\route.ts:47:    const mockResult = {
src\app\api\v1\admin\loyalty\rewards\[id]\stock\route.ts:55:      data: mockResult,
src\app\financial\ap\credit-notes\page.tsx:34:        // Note: This endpoint may not exist yet, but we'll create a placeholder
src\app\api\v1\admin\loyalty\rewards\[id]\route.ts:56:    const mockResult = {
src\app\api\v1\admin\loyalty\rewards\[id]\route.ts:83:      data: mockResult,
src\app\api\v1\admin\loyalty\rewards\[id]\route.ts:115:    const mockResult = {
src\app\api\v1\admin\loyalty\rewards\[id]\route.ts:124:      data: mockResult,
src\app\api\v1\admin\loyalty\rewards\route.ts:73:    const mockData = {
src\app\api\v1\admin\loyalty\rewards\route.ts:79:      formatPaginatedResponse(mockData.rewards, mockData.total, page, limit)
src\app\api\v1\admin\loyalty\rewards\route.ts:105:    const mockResult = {
src\app\api\v1\admin\loyalty\rewards\route.ts:106:      id: 'mock-reward-id',
src\app\api\v1\admin\loyalty\rewards\route.ts:117:        data: mockResult,
src\app\api\v1\products\pos\route.ts:218:    const placeholders = product_ids.map((_, i) => `$${i + 1}`).join(', ');
src\app\api\v1\products\pos\route.ts:229:      WHERE sp.supplier_product_id IN (${placeholders})
src\app\api\v1\admin\loyalty\rewards\analytics\route.ts:34:    const mockResult = {
src\app\api\v1\admin\loyalty\rewards\analytics\route.ts:91:      data: mockResult,
src\app\api\v1\pricing-intel\_helpers.ts:7: * Get organization ID from request with fallback
src\app\api\v1\pricing-intel\_helpers.ts:40:  const envOrgId = process.env.DEFAULT_ORG_ID;
src\app\api\v1\admin\loyalty\redemptions\[id]\route.ts:42:    const mockResult = {
src\app\api\v1\admin\loyalty\redemptions\[id]\route.ts:65:      data: mockResult,
src\app\api\v1\admin\loyalty\redemptions\[id]\route.ts:97:    const mockResult = {
src\app\api\v1\admin\loyalty\redemptions\[id]\route.ts:105:      data: mockResult,
src\app\api\v1\integrations\odoo\preview\[entityType]\route.ts:147:        // Try the base name first, but keep original as fallback
src\app\api\v1\financial\_helpers.ts:23: * Get organization ID from request with fallback
src\app\api\v1\financial\_helpers.ts:55:  const envOrgId = process.env.DEFAULT_ORG_ID;
src\app\api\v1\admin\loyalty\redemptions\[id]\fulfill\route.ts:46:    const mockResult = {
src\app\api\v1\admin\loyalty\redemptions\[id]\fulfill\route.ts:57:      data: mockResult,
src\app\api\v1\admin\loyalty\redemptions\[id]\cancel\route.ts:48:    const mockResult = {
src\app\api\v1\admin\loyalty\redemptions\[id]\cancel\route.ts:58:      data: mockResult,
src\app\api\v1\admin\loyalty\redemptions\[id]\approve\route.ts:46:    const mockResult = {
src\app\api\v1\admin\loyalty\redemptions\[id]\approve\route.ts:55:      data: mockResult,
src\app\api\v1\admin\loyalty\redemptions\route.ts:55:    const mockData = {
src\app\api\v1\admin\loyalty\redemptions\route.ts:61:      formatPaginatedResponse(mockData.redemptions, mockData.total, page, limit)
src\app\api\v1\admin\loyalty\redemptions\bulk-fulfill\route.ts:42:    const mockResult = {
src\app\api\v1\admin\loyalty\redemptions\bulk-fulfill\route.ts:51:      data: mockResult,
src\app\api\v1\admin\loyalty\redemptions\bulk-fulfill\route.ts:52:      message: `Successfully fulfilled ${mockResult.fulfilled_count} redemptions`,
src\app\api\v1\admin\loyalty\redemptions\bulk-approve\route.ts:42:    const mockResult = {
src\app\api\v1\admin\loyalty\redemptions\bulk-approve\route.ts:51:      data: mockResult,
src\app\api\v1\admin\loyalty\redemptions\bulk-approve\route.ts:52:      message: `Successfully approved ${mockResult.approved_count} redemptions`,
src\app\api\v1\admin\loyalty\programs\[id]\tiers\route.ts:54:    const mockResult = {
src\app\api\v1\admin\loyalty\programs\[id]\tiers\route.ts:84:      data: mockResult,
src\app\api\v1\admin\loyalty\programs\[id]\tiers\route.ts:116:    const mockResult = {
src\app\api\v1\admin\loyalty\programs\[id]\tiers\route.ts:124:      data: mockResult,
src\app\api\v1\admin\loyalty\programs\[id]\stats\route.ts:34:    const mockResult = {
src\app\api\v1\admin\loyalty\programs\[id]\stats\route.ts:74:      data: mockResult,
src\app\api\v1\admin\loyalty\programs\[id]\route.ts:46:    const mockResult = {
src\app\api\v1\admin\loyalty\programs\[id]\route.ts:86:      data: mockResult,
src\app\api\v1\admin\loyalty\programs\[id]\route.ts:118:    const mockResult = {
src\app\api\v1\admin\loyalty\programs\[id]\route.ts:127:      data: mockResult,
src\app\api\v1\admin\loyalty\programs\[id]\customers\route.ts:51:    const mockData = {
src\app\api\v1\admin\loyalty\programs\[id]\customers\route.ts:57:      formatPaginatedResponse(mockData.customers, mockData.total, page, limit)
src\app\api\v1\logistics\websocket\route.ts:14:    const clientId = searchParams.get('clientId') || Math.random().toString(36).substring(2, 11);
src\app\api\v1\admin\loyalty\programs\route.ts:59:    // For now, return mock data structure
src\app\api\v1\admin\loyalty\programs\route.ts:60:    const mockData = {
src\app\api\v1\admin\loyalty\programs\route.ts:66:      formatPaginatedResponse(mockData.programs, mockData.total, page, limit)
src\app\api\v1\admin\loyalty\programs\route.ts:92:    const mockResult = {
src\app\api\v1\admin\loyalty\programs\route.ts:93:      id: 'mock-program-id',
src\app\api\v1\admin\loyalty\programs\route.ts:103:        data: mockResult,
src\app\api\v1\admin\loyalty\analytics\tier-distribution\route.ts:32:    const mockResult = {
src\app\api\v1\admin\loyalty\analytics\tier-distribution\route.ts:87:      data: mockResult,
src\hooks\useErrorRecovery.ts:80:  return delayWithCap + (Math.random() - 0.5) * 2 * jitterAmount;
src\hooks\useNeonSpp.ts:139:      allow_ai_fallback?: boolean;
src\hooks\useNeonSpp.ts:149:      if (typeof request.allow_ai_fallback === 'boolean') {
src\hooks\useNeonSpp.ts:150:        formData.append('allow_ai_fallback', request.allow_ai_fallback ? 'true' : 'false');
src\app\api\v1\admin\loyalty\analytics\expire-points\route.ts:41:    const mockResult = {
src\app\api\v1\admin\loyalty\analytics\expire-points\route.ts:59:      data: mockResult,
src\app\api\v1\admin\loyalty\analytics\expire-points\route.ts:61:        ? `Dry run: Would expire ${mockResult.total_points_expired} points`
src\app\api\v1\admin\loyalty\analytics\expire-points\route.ts:62:        : `Successfully expired ${mockResult.total_points_expired} points`,
src\app\api\v1\admin\loyalty\analytics\leaderboard\route.ts:44:    const mockData = {
src\app\api\v1\admin\loyalty\analytics\leaderboard\route.ts:50:      formatPaginatedResponse(mockData.leaderboard, mockData.total, page, limit)
src\app\api\v1\admin\loyalty\analytics\points-flow\route.ts:33:    const mockResult = {
src\app\api\v1\admin\loyalty\analytics\points-flow\route.ts:80:      data: mockResult,
src\app\api\v1\inventory\pos\route.ts:147:    const placeholders = product_ids.map((_, i) => `$${i + 1}`).join(', ');
src\app\api\v1\inventory\pos\route.ts:157:      WHERE id IN (${placeholders})
src\hooks\useRealTimeData.ts:4: * Comprehensive hooks for replacing mock data with live database connections
src\app\api\v1\organizations\current\route.ts:27:    const envOrgId = process.env.DEFAULT_ORG_ID;
src\app\api\v1\organizations\current\route.ts:66:      // Continue to fallback
src\app\api\v1\organizations\current\route.ts:73:    console.warn('?? Set DEFAULT_ORG_ID environment variable or create organization in database');
src\app\api\v1\organizations\current\route.ts:81:        source: 'fallback',
src\app\api\v1\organizations\current\route.ts:84:        'Using emergency fallback org_id. Please configure DEFAULT_ORG_ID environment variable.',
src\app\api\v1\docustore\[id]\preview\route.ts:33:    // For now, return a placeholder response
