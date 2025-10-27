07:44:48.757 Running build in Washington, D.C., USA (East) – iad1

07:44:48.758 Build machine configuration: 2 cores, 8 GB

07:44:48.795 Cloning github.com/nxtleveltech1/MantisNXT (Branch: main, Commit: 22cd455)

07:44:49.062 Previous build caches not available

07:44:49.860 Cloning completed: 1.064s

07:44:50.335 Running "vercel build"

07:44:50.722 Vercel CLI 48.2.9

07:44:51.159 Installing dependencies...

07:44:56.250 npm warn deprecated rimraf@2.7.1: Rimraf versions prior to v4 are no longer supported

07:44:57.336 npm warn deprecated lodash.isequal@4.5.0: This package is deprecated. Use require('node:util').isDeepStrictEqual instead.

07:44:57.815 npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.

07:44:58.721 npm warn deprecated domexception@4.0.0: Use your platform's native DOMException instead

07:44:58.908 npm warn deprecated fstream@1.0.12: This package is no longer supported.

07:44:59.618 npm warn deprecated abab@2.0.6: Use your platform's native atob() and btoa() methods instead

07:45:02.705 npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported

07:45:02.868 npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported

07:45:02.869 npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported

07:45:03.215 npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported

07:45:03.324 npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported

07:45:03.538 npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported

07:45:03.598 npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported

07:45:03.676 npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported

07:45:03.676 npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported

07:45:30.855 

07:45:30.856 > mantisnxt@1.0.0 prepare

07:45:30.857 > husky install

07:45:30.857 

07:45:30.900 husky - Git hooks installed

07:45:30.933 

07:45:30.933 added 1526 packages in 40s

07:45:30.933 

07:45:30.937 283 packages are looking for funding

07:45:30.938   run `npm fund` for details

07:45:31.389 Detected Next.js version: 15.5.3

07:45:31.401 Running "npm run build"

07:45:31.609 

07:45:31.611 > mantisnxt@1.0.0 build

07:45:31.611 > npm run type-check \&\& next build

07:45:31.611 

07:45:31.727 

07:45:31.728 > mantisnxt@1.0.0 type-check

07:45:31.728 > tsc --noEmit

07:45:31.728 

07:46:03.160 lib/database/neon-connection.ts(130,3): error TS2345: Argument of type '(...args: any\[]) => NeonQueryPromise<false, false, Record<string, any>\[]>' is not assignable to parameter of type 'NeonQueryFunction<false, false> \& { query: <T = any>(queryText: string, params?: any\[] | undefined) => Promise<{ rows: T\[]; rowCount: number; }>; }'.

07:46:03.161   Type '(...args: any\[]) => NeonQueryPromise<false, false, Record<string, any>\[]>' is missing the following properties from type 'NeonQueryFunction<false, false>': query, unsafe, transaction

07:46:03.161 lib/database/neon-connection.ts(131,16): error TS2556: A spread argument must either have a tuple type or be passed to a rest parameter.

07:46:03.161 lib/database/neon-connection.ts(141,18): error TS2556: A spread argument must either have a tuple type or be passed to a rest parameter.

07:46:03.161 scripts/import\_master\_dataset.ts(161,21): error TS2538: Type 'undefined' cannot be used as an index type.

07:46:03.161 scripts/import\_master\_dataset.ts(223,35): error TS2769: No overload matches this call.

07:46:03.162   Overload 1 of 2, '(o: {}): string\[]', gave the following error.

07:46:03.162     Argument of type 'unknown' is not assignable to parameter of type '{}'.

07:46:03.162   Overload 2 of 2, '(o: object): string\[]', gave the following error.

07:46:03.162     Argument of type 'unknown' is not assignable to parameter of type 'object'.

07:46:03.163 scripts/import\_master\_dataset.ts(247,13): error TS18046: 'row' is of type 'unknown'.

07:46:03.163 scripts/test-pricelist-upload.ts(39,24): error TS2339: Property 'rows' does not exist on type 'Record<string, any>\[]'.

07:46:03.163 scripts/test-pricelist-upload.ts(43,37): error TS2339: Property 'rows' does not exist on type 'Record<string, any>\[]'.

07:46:03.163 scripts/test-pricelist-upload.ts(63,56): error TS2345: Argument of type '{ supplier\_id: any; filename: string; currency: string; valid\_from: Date; }' is not assignable to parameter of type 'PricelistUploadRequest'.

07:46:03.164   Property 'file' is missing in type '{ supplier\_id: any; filename: string; currency: string; valid\_from: Date; }' but required in type 'PricelistUploadRequest'.

07:46:03.164 scripts/test-pricelist-upload.ts(165,61): error TS2339: Property 'rows' does not exist on type 'Record<string, any>\[]'.

07:46:03.164 scripts/test-pricelist-upload.ts(166,56): error TS2339: Property 'rows' does not exist on type 'Record<string, any>\[]'.

07:46:03.165 scripts/test-pricelist-upload.ts(185,18): error TS2339: Property 'rows' does not exist on type 'Record<string, any>\[]'.

07:46:03.165 scripts/test-pricelist-upload.ts(185,32): error TS7006: Parameter 'row' implicitly has an 'any' type.

07:46:03.166 scripts/test-pricelist-upload.ts(185,37): error TS7006: Parameter 'idx' implicitly has an 'any' type.

07:46:03.166 scripts/validate-api-endpoints.ts(473,24): error TS1205: Re-exporting a type when 'isolatedModules' is enabled requires using 'export type'.

07:46:03.166 scripts/validate-api-endpoints.ts(473,42): error TS1205: Re-exporting a type when 'isolatedModules' is enabled requires using 'export type'.

07:46:03.166 scripts/validate-api-endpoints.ts(473,58): error TS1205: Re-exporting a type when 'isolatedModules' is enabled requires using 'export type'.

07:46:03.166 scripts/validate-database.ts(24,52): error TS18047: 'contactPerson.rowCount' is possibly 'null'.

07:46:03.166 scripts/verify\_integration.ts(49,25): error TS18046: 'error' is of type 'unknown'.

07:46:03.166 scripts/verify\_integration.ts(92,25): error TS18046: 'error' is of type 'unknown'.

07:46:03.166 scripts/verify\_integration.ts(149,25): error TS18046: 'error' is of type 'unknown'.

07:46:03.166 scripts/verify\_integration.ts(194,25): error TS18046: 'error' is of type 'unknown'.

07:46:03.167 scripts/verify\_integration.ts(236,25): error TS18046: 'error' is of type 'unknown'.

07:46:03.167 scripts/verify\_integration.ts(283,25): error TS18046: 'error' is of type 'unknown'.

07:46:03.167 scripts/verify\_integration.ts(318,18): error TS18046: 'error' is of type 'unknown'.

07:46:03.167 scripts/verify\_integration.ts(346,25): error TS18046: 'error' is of type 'unknown'.

07:46:03.167 scripts/verify\_integration.ts(394,27): error TS18046: 'error' is of type 'unknown'.

07:46:03.167 src/app/admin/audit/page.tsx(415,19): error TS2322: Type '{ from?: Date | undefined; to?: Date | undefined; }' is not assignable to type 'DateRange'.

07:46:03.167   Property 'from' is optional in type '{ from?: Date | undefined; to?: Date | undefined; }' but required in type 'DateRange'.

07:46:03.167 src/app/admin/organization/page.tsx(15,24): error TS2305: Module '"@/types/auth"' has no exported member 'SouthAfricanBusinessInfo'.

07:46:03.167 src/app/admin/organization/page.tsx(247,37): error TS2339: Property 'code' does not exist on type 'Organization'.

07:46:03.167 src/app/admin/organization/page.tsx(248,45): error TS2345: Argument of type '"code"' is not assignable to parameter of type 'keyof Organization'.

07:46:03.168 src/app/admin/organization/page.tsx(260,35): error TS2339: Property 'website' does not exist on type 'Organization'.

07:46:03.168 src/app/admin/organization/page.tsx(261,43): error TS2345: Argument of type '"website"' is not assignable to parameter of type 'keyof Organization'.

07:46:03.168 src/app/admin/organization/page.tsx(270,38): error TS2551: Property 'createdAt' does not exist on type 'Organization'. Did you mean 'created\_at'?

07:46:03.168 src/app/admin/organization/page.tsx(273,37): error TS2339: Property 'status' does not exist on type 'Organization'.

07:46:03.168 src/app/admin/organization/page.tsx(296,37): error TS2551: Property 'registrationNumber' does not exist on type 'Organization'. Did you mean 'registration\_number'?

07:46:03.168 src/app/admin/organization/page.tsx(297,45): error TS2345: Argument of type '"registrationNumber"' is not assignable to parameter of type 'keyof Organization'.

07:46:03.173 src/app/admin/organization/page.tsx(308,37): error TS2551: Property 'vatNumber' does not exist on type 'Organization'. Did you mean 'vat\_number'?

07:46:03.174 src/app/admin/organization/page.tsx(309,45): error TS2345: Argument of type '"vatNumber"' is not assignable to parameter of type 'keyof Organization'.

07:46:03.174 src/app/admin/organization/page.tsx(321,37): error TS2551: Property 'beeLevel' does not exist on type 'Organization'. Did you mean 'bee\_level'?

07:46:03.174 src/app/admin/organization/page.tsx(354,38): error TS2339: Property 'vatRate' does not exist on type 'Organization'.

07:46:03.174 src/app/admin/organization/page.tsx(390,37): error TS2339: Property 'email' does not exist on type 'Organization'.

07:46:03.174 src/app/admin/organization/page.tsx(391,45): error TS2345: Argument of type '"email"' is not assignable to parameter of type 'keyof Organization'.

07:46:03.174 src/app/admin/organization/page.tsx(402,37): error TS2339: Property 'phoneNumber' does not exist on type 'Organization'.

07:46:03.174 src/app/admin/organization/page.tsx(403,45): error TS2345: Argument of type '"phoneNumber"' is not assignable to parameter of type 'keyof Organization'.

07:46:03.174 src/app/admin/organization/page.tsx(428,43): error TS2551: Property 'street1' does not exist on type 'Address'. Did you mean 'street'?

07:46:03.174 src/app/admin/organization/page.tsx(429,45): error TS2345: Argument of type '"street1"' is not assignable to parameter of type 'keyof Address'.

07:46:03.174 src/app/admin/organization/page.tsx(439,43): error TS2551: Property 'street2' does not exist on type 'Address'. Did you mean 'street'?

07:46:03.174 src/app/admin/organization/page.tsx(440,45): error TS2345: Argument of type '"street2"' is not assignable to parameter of type 'keyof Address'.

07:46:03.174 src/app/admin/organization/page.tsx(473,45): error TS2551: Property 'postalCode' does not exist on type 'Address'. Did you mean 'postal\_code'?

07:46:03.175 src/app/admin/organization/page.tsx(474,47): error TS2345: Argument of type '"postalCode"' is not assignable to parameter of type 'keyof Address'.

07:46:03.175 src/app/admin/organization/page.tsx(486,33): error TS2345: Argument of type '(prev: Organization | null) => { address: { province: string; street: string; suburb: string; city: string; postal\_code: string; country: string; }; updatedAt: Date; id: string; ... 12 more ...; settings: OrganizationSettings; }' is not assignable to parameter of type 'SetStateAction<Organization | null>'.

07:46:03.175   Type '(prev: Organization | null) => { address: { province: string; street: string; suburb: string; city: string; postal\_code: string; country: string; }; updatedAt: Date; id: string; ... 12 more ...; settings: OrganizationSettings; }' is not assignable to type '(prevState: Organization | null) => Organization | null'.

07:46:03.175     Call signature return types '{ address: { province: string; street: string; suburb: string; city: string; postal\_code: string; country: string; }; updatedAt: Date; id: string; name: string; legal\_name: string; registration\_number: string; ... 9 more ...; settings: OrganizationSettings; }' and 'Organization | null' are incompatible.

07:46:03.175       The types of 'address.province' are incompatible between these types.

07:46:03.175         Type 'string' is not assignable to type 'SouthAfricanProvince'.

07:46:03.175 src/app/admin/organization/page.tsx(540,33): error TS2339: Property 'timezone' does not exist on type 'Organization'.

07:46:03.176 src/app/admin/organization/page.tsx(564,62): error TS2339: Property 'vatRate' does not exist on type 'Organization'.

07:46:03.176 src/app/admin/users/page.tsx(36,7): error TS2448: Block-scoped variable 'loadUsers' used before its declaration.

07:46:03.178 src/app/admin/users/page.tsx(36,7): error TS2454: Variable 'loadUsers' is used before being assigned.

07:46:03.178 src/app/admin/users/page.tsx(40,7): error TS2448: Block-scoped variable 'filterUsers' used before its declaration.

07:46:03.178 src/app/admin/users/page.tsx(40,7): error TS2454: Variable 'filterUsers' is used before being assigned.

07:46:03.178 src/app/ai-insights/page.tsx(392,13): error TS2719: Type 'AIInsight\[]' is not assignable to type 'AIInsight\[]'. Two different types with this name exist, but they are unrelated.

07:46:03.178   Type 'AIInsight' is missing the following properties from type 'AIInsight': actions, metrics, relatedInsights, updatedAt, and 2 more.

07:46:03.178 src/app/api/activities/recent/route.ts(77,11): error TS7034: Variable 'activities' implicitly has type 'any\[]' in some locations where its type cannot be determined.

07:46:03.179 src/app/api/activities/recent/route.ts(140,46): error TS7005: Variable 'activities' implicitly has an 'any\[]' type.

07:46:03.179 src/app/api/ai/analytics/anomalies/route.ts(82,51): error TS2339: Property 'monitorSupplierRisk' does not exist on type 'PredictiveAnalyticsService'.

07:46:03.179 src/app/api/ai/analyze/route.ts(57,6): error TS2456: Type alias 'ResolvedSchedule' circularly references itself.

07:46:03.179 src/app/api/ai/analyze/route.ts(59,6): error TS2456: Type alias 'VisualizationSuggestion' circularly references itself.

07:46:03.179 src/app/api/ai/analyze/route.ts(173,3): error TS2353: Object literal may only specify known properties, and 'requiredPermissions' does not exist in type '{ validateQuery?: boolean | undefined; validateBody?: boolean | undefined; }'.

07:46:03.179 src/app/api/ai/analyze/route.ts(256,26): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.179 src/app/api/ai/analyze/route.ts(266,3): error TS2353: Object literal may only specify known properties, and 'requiredPermissions' does not exist in type '{ validateQuery?: boolean | undefined; validateBody?: boolean | undefined; }'.

07:46:03.179 src/app/api/ai/analyze/route.ts(273,28): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.179 src/app/api/ai/analyze/route.ts(298,16): error TS2349: This expression is not callable.

07:46:03.179   Type 'Promise<(request: NextRequest) => Promise<NextResponse<unknown>>>' has no call signatures.

07:46:03.179 src/app/api/ai/analyze/route.ts(302,16): error TS2349: This expression is not callable.

07:46:03.179   Type 'Promise<(request: NextRequest) => Promise<NextResponse<unknown>>>' has no call signatures.

07:46:03.179 src/app/api/ai/analyze/route.ts(464,76): error TS2577: Return type annotation circularly references itself.

07:46:03.179 src/app/api/ai/analyze/route.ts(564,69): error TS2577: Return type annotation circularly references itself.

07:46:03.180 src/app/api/ai/chat/route.ts(24,16): error TS2554: Expected 2-3 arguments, but got 1.

07:46:03.180 src/app/api/ai/chat/route.ts(79,30): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.180 src/app/api/ai/chat/route.ts(111,58): error TS2345: Argument of type '{ id?: string | undefined; systemPrompt?: string | undefined; templateId?: string | undefined; variables?: Record<string | number | symbol, unknown> | undefined; context?: Record<string, any> | undefined; ... 5 more ...; maxHistory?: number | undefined; }' is not assignable to parameter of type 'ConversationOptions'.

07:46:03.180   Types of property 'variables' are incompatible.

07:46:03.180     Type 'Record<string | number | symbol, unknown> | undefined' is not assignable to type 'Record<string, string | number | boolean> | undefined'.

07:46:03.180       Type 'Record<string | number | symbol, unknown>' is not assignable to type 'Record<string, string | number | boolean>'.

07:46:03.180         'string' index signatures are incompatible.

07:46:03.180           Type 'unknown' is not assignable to type 'string | number | boolean'.

07:46:03.180 src/app/api/ai/chat/route.ts(121,56): error TS2345: Argument of type '{ id?: string | undefined; systemPrompt?: string | undefined; templateId?: string | undefined; variables?: Record<string | number | symbol, unknown> | undefined; context?: Record<string, any> | undefined; ... 5 more ...; maxHistory?: number | undefined; }' is not assignable to parameter of type 'ConversationOptions'.

07:46:03.180   Types of property 'variables' are incompatible.

07:46:03.180     Type 'Record<string | number | symbol, unknown> | undefined' is not assignable to type 'Record<string, string | number | boolean> | undefined'.

07:46:03.180       Type 'Record<string | number | symbol, unknown>' is not assignable to type 'Record<string, string | number | boolean>'.

07:46:03.180         'string' index signatures are incompatible.

07:46:03.180           Type 'unknown' is not assignable to type 'string | number | boolean'.

07:46:03.180 src/app/api/ai/chat/route.ts(127,30): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.180 src/app/api/ai/chat/route.ts(161,30): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.181 src/app/api/ai/chat/route.ts(181,11): error TS2353: Object literal may only specify known properties, and 'provider' does not exist in type 'Partial<{ timestamp: string; requestId: string; version: string; processingTime: number; }>'.

07:46:03.182 src/app/api/ai/chat/route.ts(186,28): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.182 src/app/api/ai/chat/route.ts(219,28): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.182 src/app/api/ai/chat/route.ts(230,16): error TS2349: This expression is not callable.

07:46:03.182   Type 'Promise<(request: NextRequest) => Promise<NextResponse<unknown>>>' has no call signatures.

07:46:03.182 src/app/api/ai/chat/route.ts(234,16): error TS2349: This expression is not callable.

07:46:03.182   Type 'Promise<(request: NextRequest) => Promise<NextResponse<unknown>>>' has no call signatures.

07:46:03.182 src/app/api/ai/generate/route.ts(93,16): error TS2554: Expected 2-3 arguments, but got 1.

07:46:03.182 src/app/api/ai/generate/route.ts(156,3): error TS2353: Object literal may only specify known properties, and 'requiredPermissions' does not exist in type '{ validateQuery?: boolean | undefined; validateBody?: boolean | undefined; }'.

07:46:03.182 src/app/api/ai/generate/route.ts(160,26): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.182 src/app/api/ai/generate/route.ts(235,26): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.182 src/app/api/ai/generate/route.ts(245,3): error TS2353: Object literal may only specify known properties, and 'requiredPermissions' does not exist in type '{ validateQuery?: boolean | undefined; validateBody?: boolean | undefined; }'.

07:46:03.182 src/app/api/ai/generate/route.ts(251,28): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.182 src/app/api/ai/generate/route.ts(276,16): error TS2349: This expression is not callable.

07:46:03.182   Type 'Promise<(request: NextRequest) => Promise<NextResponse<unknown>>>' has no call signatures.

07:46:03.183 src/app/api/ai/generate/route.ts(280,16): error TS2349: This expression is not callable.

07:46:03.183   Type 'Promise<(request: NextRequest) => Promise<NextResponse<unknown>>>' has no call signatures.

07:46:03.183 src/app/api/ai/generate/route.ts(344,5): error TS2322: Type 'Record<string | number | symbol, unknown> | undefined' is not assignable to type 'Record<string, string | number | boolean> | undefined'.

07:46:03.183   Type 'Record<string | number | symbol, unknown>' is not assignable to type 'Record<string, string | number | boolean>'.

07:46:03.183     'string' index signatures are incompatible.

07:46:03.183       Type 'unknown' is not assignable to type 'string | number | boolean'.

07:46:03.183 src/app/api/ai/generate/route.ts(380,11): error TS2322: Type 'Record<string | number | symbol, unknown> | undefined' is not assignable to type 'Record<string, string | number | boolean> | undefined'.

07:46:03.183   Type 'Record<string | number | symbol, unknown>' is not assignable to type 'Record<string, string | number | boolean>'.

07:46:03.183     'string' index signatures are incompatible.

07:46:03.183       Type 'unknown' is not assignable to type 'string | number | boolean'.

07:46:03.183 src/app/api/ai/generate/route.ts(506,5): error TS2561: Object literal may only specify known properties, but 'provider' does not exist in type 'GenerationHistoryRecord'. Did you mean to write '\_provider'?

07:46:03.183 src/app/api/ai/generate/route.ts(657,14): error TS2551: Property 'provider' does not exist on type 'GenerationHistoryRecord'. Did you mean '\_provider'?

07:46:03.183 src/app/api/ai/insights/generate/route.ts(178,54): error TS2339: Property 'monitorSupplierRisk' does not exist on type 'PredictiveAnalyticsService'.

07:46:03.183 src/app/api/ai/insights/generate/route.ts(243,47): error TS7006: Parameter 'alert' implicitly has an 'any' type.

07:46:03.186 src/app/api/ai/suppliers/discover/route.ts(56,23): error TS7053: Element implicitly has an 'any' type because expression of type 'any' can't be used to index type '{ low: number; medium: number; high: number; }'.

07:46:03.186 src/app/api/ai/suppliers/discover/route.v5.example.ts(289,7): error TS2322: Type 'LanguageModelV1' is not assignable to type 'LanguageModel'.

07:46:03.186   Property 'supportedUrls' is missing in type 'LanguageModelV1' but required in type 'LanguageModelV2'.

07:46:03.186 src/app/api/ai/suppliers/discover/route.v5.example.ts(349,40): error TS2339: Property 'promptTokens' does not exist on type 'LanguageModelV2Usage'.

07:46:03.186 src/app/api/ai/suppliers/discover/route.v5.example.ts(350,44): error TS2339: Property 'completionTokens' does not exist on type 'LanguageModelV2Usage'.

07:46:03.186 src/app/api/ai/suppliers/discover/route.v5.example.ts(361,31): error TS18048: 'result.usage.totalTokens' is possibly 'undefined'.

07:46:03.186 src/app/api/ai/suppliers/discover/route.v5.example.ts(443,7): error TS2322: Type 'LanguageModelV1' is not assignable to type 'LanguageModel'.

07:46:03.186   Property 'supportedUrls' is missing in type 'LanguageModelV1' but required in type 'LanguageModelV2'.

07:46:03.186 src/app/api/alerts/route.optimized.ts(317,28): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.

07:46:03.186   Type 'undefined' is not assignable to type 'string'.

07:46:03.186 src/app/api/alerts/route.ts(173,11): error TS7034: Variable 'alerts' implicitly has type 'any\[]' in some locations where its type cannot be determined.

07:46:03.186 src/app/api/alerts/route.ts(242,12): error TS7005: Variable 'alerts' implicitly has an 'any\[]' type.

07:46:03.186 src/app/api/analytics/dashboard/route.ts(85,79): error TS2552: Cannot find name 'inventoryResult'. Did you mean 'inventoryCountResult'?

07:46:03.186 src/app/api/analytics/recommendations/route.ts(165,8): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ high: number; medium: number; low: number; }'.

07:46:03.187   No index signature with a parameter of type 'string' was found on type '{ high: number; medium: number; low: number; }'.

07:46:03.187 src/app/api/analytics/recommendations/route.ts(165,43): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ high: number; medium: number; low: number; }'.

07:46:03.187   No index signature with a parameter of type 'string' was found on type '{ high: number; medium: number; low: number; }'.

07:46:03.187 src/app/api/analytics/system/route.ts(75,29): error TS2339: Property 'inventory' does not exist on type '{}'.

07:46:03.187 src/app/api/analytics/system/route.ts(77,13): error TS18048: 'analytics.comparisons' is possibly 'undefined'.

07:46:03.187 src/app/api/analytics/system/route.ts(77,35): error TS2339: Property 'inventory' does not exist on type '{}'.

07:46:03.187 src/app/api/analytics/system/route.ts(82,29): error TS2339: Property 'suppliers' does not exist on type '{}'.

07:46:03.187 src/app/api/analytics/system/route.ts(84,13): error TS18048: 'analytics.comparisons' is possibly 'undefined'.

07:46:03.187 src/app/api/analytics/system/route.ts(84,35): error TS2339: Property 'suppliers' does not exist on type '{}'.

07:46:03.187 src/app/api/analytics/system/route.ts(89,29): error TS2339: Property 'movements' does not exist on type '{}'.

07:46:03.187 src/app/api/analytics/system/route.ts(93,29): error TS2339: Property 'processing' does not exist on type '{}'.

07:46:03.187 src/app/api/analytics/system/route.ts(97,29): error TS2339: Property 'performance' does not exist on type '{}'.

07:46:03.187 src/app/api/analytics/system/route.ts(101,29): error TS2339: Property 'alerts' does not exist on type '{}'.

07:46:03.187 src/app/api/analytics/system/route.ts(255,5): error TS7053: Element implicitly has an 'any' type because expression of type '`by\_${string}`' can't be used to index type '{ overview: { totalItems: number; activeItems: number; outOfStockItems: number; lowStockItems: number; overstockItems: number; totalQuantity: number; totalValue: number; avgItemValue: number; totalCategories: number; suppliersWithProducts: number; dataFreshness: { ...; }; } | null; }'.

07:46:03.187 src/app/api/analytics/system/route.ts(282,13): error TS2339: Property 'stockDistribution' does not exist on type '{ overview: { totalItems: number; activeItems: number; outOfStockItems: number; lowStockItems: number; overstockItems: number; totalQuantity: number; totalValue: number; avgItemValue: number; totalCategories: number; suppliersWithProducts: number; dataFreshness: { ...; }; } | null; }'.

07:46:03.187 src/app/api/analytics/system/route.ts(345,13): error TS2339: Property 'topSuppliers' does not exist on type '{ overview: { totalSuppliers: number; activeSuppliers: number; preferredSuppliers: number; avgPerformanceScore: number; categoriesCovered: number; totalInventoryValue: number; } | null; }'.

07:46:03.188 src/app/api/analytics/system/route.ts(375,13): error TS2339: Property 'performanceDistribution' does not exist on type '{ overview: { totalSuppliers: number; activeSuppliers: number; preferredSuppliers: number; avgPerformanceScore: number; categoriesCovered: number; totalInventoryValue: number; } | null; }'.

07:46:03.188 src/app/api/analytics/system/route.ts(437,13): error TS2339: Property 'dailyTrends' does not exist on type '{ overview: { totalMovements: number; inboundMovements: number; outboundMovements: number; adjustmentMovements: number; transferMovements: number; totalInboundQuantity: number; totalOutboundQuantity: number; inboundValue: number; itemsWithMovements: number; activeDays: number; } | null; }'.

07:46:03.188 src/app/api/core/selections/route.ts(18,71): error TS2345: Argument of type '{ selection\_name: string; created\_by: string; status: "active" | "draft" | "archived"; selection\_id?: string | undefined; description?: string | undefined; valid\_from?: Date | undefined; valid\_to?: Date | ... 1 more ... | undefined; }' is not assignable to parameter of type '{ selection\_name: string; description?: string | undefined; created\_by: string; valid\_from?: Date | undefined; valid\_to?: Date | undefined; }'.

07:46:03.188   Types of property 'valid\_to' are incompatible.

07:46:03.188     Type 'Date | null | undefined' is not assignable to type 'Date | undefined'.

07:46:03.188       Type 'null' is not assignable to type 'Date | undefined'.

07:46:03.188 src/app/api/core/selections/workflow/route.ts(18,7): error TS2783: 'success' is specified more than once, so this usage will be overwritten.

07:46:03.189 src/app/api/health/database/route.ts(8,23): error TS2307: Cannot find module '@/lib/database/enterprise-connection-manager' or its corresponding type declarations.

07:46:03.189 src/app/api/health/database/route.ts(56,9): error TS7053: Element implicitly has an 'any' type because expression of type 'any' can't be used to index type '{}'.

07:46:03.189 src/app/api/health/database/route.ts(58,9): error TS7053: Element implicitly has an 'any' type because expression of type 'any' can't be used to index type '{}'.

07:46:03.189 src/app/api/health/frontend/route.ts(42,9): error TS2353: Object literal may only specify known properties, and 'version' does not exist in type '{ status: string; responseTime: number; error: null; }'.

07:46:03.189 src/app/api/health/frontend/route.ts(49,16): error TS18046: 'error' is of type 'unknown'.

07:46:03.189 src/app/api/health/frontend/route.ts(78,11): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ suppliers: { status: string; responseTime: number; error: null; }; inventory: { status: string; responseTime: number; error: null; }; analytics: { status: string; responseTime: number; error: null; }; alerts: { ...; }; }'.

07:46:03.189   No index signature with a parameter of type 'string' was found on type '{ suppliers: { status: string; responseTime: number; error: null; }; inventory: { status: string; responseTime: number; error: null; }; analytics: { status: string; responseTime: number; error: null; }; alerts: { ...; }; }'.

07:46:03.189 src/app/api/health/frontend/route.ts(85,11): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ suppliers: { status: string; responseTime: number; error: null; }; inventory: { status: string; responseTime: number; error: null; }; analytics: { status: string; responseTime: number; error: null; }; alerts: { ...; }; }'.

07:46:03.189   No index signature with a parameter of type 'string' was found on type '{ suppliers: { status: string; responseTime: number; error: null; }; inventory: { status: string; responseTime: number; error: null; }; analytics: { status: string; responseTime: number; error: null; }; alerts: { ...; }; }'.

07:46:03.189 src/app/api/health/frontend/route.ts(93,9): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ suppliers: { status: string; responseTime: number; error: null; }; inventory: { status: string; responseTime: number; error: null; }; analytics: { status: string; responseTime: number; error: null; }; alerts: { ...; }; }'.

07:46:03.189   No index signature with a parameter of type 'string' was found on type '{ suppliers: { status: string; responseTime: number; error: null; }; inventory: { status: string; responseTime: number; error: null; }; analytics: { status: string; responseTime: number; error: null; }; alerts: { ...; }; }'.

07:46:03.189 src/app/api/health/frontend/route.ts(96,18): error TS18046: 'error' is of type 'unknown'.

07:46:03.189 src/app/api/health/frontend/route.ts(148,16): error TS18046: 'error' is of type 'unknown'.

07:46:03.189 src/app/api/health/query-metrics/route.ts(2,27): error TS2307: Cannot find module '@/lib/database/enterprise-connection-manager' or its corresponding type declarations.

07:46:03.189 src/app/api/health/route.ts(48,30): error TS2339: Property 'details' does not exist on type '{ success: boolean; error?: string | undefined; }'.

07:46:03.189 src/app/api/health/route.ts(50,24): error TS2339: Property 'details' does not exist on type '{ success: boolean; error?: string | undefined; }'.

07:46:03.189 src/app/api/health/route.ts(51,34): error TS2339: Property 'details' does not exist on type '{ success: boolean; error?: string | undefined; }'.

07:46:03.189 src/app/api/health/route.ts(52,28): error TS2339: Property 'details' does not exist on type '{ success: boolean; error?: string | undefined; }'.

07:46:03.189 src/app/api/health/route.ts(64,24): error TS2339: Property 'details' does not exist on type '{ success: boolean; error?: string | undefined; }'.

07:46:03.189 src/app/api/health/route.ts(65,34): error TS2339: Property 'details' does not exist on type '{ success: boolean; error?: string | undefined; }'.

07:46:03.189 src/app/api/inventory/detailed/\[itemId]/route.ts(212,9): error TS7034: Variable 'stockHistory' implicitly has type 'any\[]' in some locations where its type cannot be determined.

07:46:03.189 src/app/api/inventory/detailed/\[itemId]/route.ts(315,9): error TS7034: Variable 'relatedItems' implicitly has type 'any\[]' in some locations where its type cannot be determined.

07:46:03.190 src/app/api/inventory/detailed/\[itemId]/route.ts(388,37): error TS2304: Cannot find name 'client'.

07:46:03.190 src/app/api/inventory/detailed/\[itemId]/route.ts(401,9): error TS7005: Variable 'stockHistory' implicitly has an 'any\[]' type.

07:46:03.190 src/app/api/inventory/detailed/\[itemId]/route.ts(403,9): error TS7005: Variable 'relatedItems' implicitly has an 'any\[]' type.

07:46:03.190 src/app/api/inventory/detailed/\[itemId]/route.ts(441,24): error TS2304: Cannot find name 'pool'.

07:46:03.190 src/app/api/inventory/enhanced/route.ts(231,9): error TS18048: 'validatedParams.priceRange' is possibly 'undefined'.

07:46:03.190 src/app/api/inventory/enhanced/route.ts(233,24): error TS18048: 'validatedParams.priceRange' is possibly 'undefined'.

07:46:03.190 src/app/api/inventory/enhanced/route.ts(237,9): error TS18048: 'validatedParams.priceRange' is possibly 'undefined'.

07:46:03.190 src/app/api/inventory/enhanced/route.ts(239,24): error TS18048: 'validatedParams.priceRange' is possibly 'undefined'.

07:46:03.190 src/app/api/inventory/enhanced/route.ts(244,9): error TS18048: 'validatedParams.lastUpdated' is possibly 'undefined'.

07:46:03.190 src/app/api/inventory/enhanced/route.ts(246,24): error TS18048: 'validatedParams.lastUpdated' is possibly 'undefined'.

07:46:03.190 src/app/api/inventory/enhanced/route.ts(250,9): error TS18048: 'validatedParams.lastUpdated' is possibly 'undefined'.

07:46:03.190 src/app/api/inventory/enhanced/route.ts(252,24): error TS18048: 'validatedParams.lastUpdated' is possibly 'undefined'.

07:46:03.190 src/app/api/inventory/enhanced/route.ts(381,14): error TS2339: Property 'recentMovements' does not exist on type '{ id: any; sku: any; name: any; description: any; category: any; subcategory: any; brand: any; supplierId: any; supplierName: any; supplierCode: any; supplierSku: any; costPrice: number; salePrice: number | null; ... 25 more ...; updatedAt: any; }'.

07:46:03.190 src/app/api/inventory/enhanced/route.ts(413,14): error TS2339: Property 'alerts' does not exist on type '{ id: any; sku: any; name: any; description: any; category: any; subcategory: any; brand: any; supplierId: any; supplierName: any; supplierCode: any; supplierSku: any; costPrice: number; salePrice: number | null; ... 25 more ...; updatedAt: any; }'.

07:46:03.190 src/app/api/pricelists/process/route.ts(29,23): error TS2554: Expected 2-3 arguments, but got 1.

07:46:03.190 src/app/api/pricelists/process/route.ts(180,64): error TS2345: Argument of type 'Record<string, unknown>' is not assignable to parameter of type 'Record<string, string>'.

07:46:03.190   'string' index signatures are incompatible.

07:46:03.190     Type 'unknown' is not assignable to type 'string'.

07:46:03.190 src/app/api/purchase-orders/analytics/route.ts(106,82): error TS7006: Parameter 'l' implicitly has an 'any' type.

07:46:03.190 src/app/api/stock-movements/route.ts(157,22): error TS2339: Property 'errors' does not exist on type 'ZodError<unknown>'.

07:46:03.190 src/app/api/stock-movements/route.ts(158,14): error TS7006: Parameter 'err' implicitly has an 'any' type.

07:46:03.190 src/app/api/suppliers/bulk-import/route.ts(377,5): error TS2322: Type '{ id: any; uploads: any; status: any; config: { batchSize: any; parallelProcessing: true; validateBeforeImport: true; stopOnError: false; }; progress: { uploadsProcessed: any; totalUploads: any; currentPhase: "completed"; percentage: any; }; ... 5 more ...; duration: any; }\[]' is not assignable to type 'BulkImportJob\[]'.

07:46:03.191   Type '{ id: any; uploads: any; status: any; config: { batchSize: any; parallelProcessing: true; validateBeforeImport: true; stopOnError: false; }; progress: { uploadsProcessed: any; totalUploads: any; currentPhase: "completed"; percentage: any; }; ... 5 more ...; duration: any; }' is not assignable to type 'BulkImportJob'.

07:46:03.191     The types of 'progress.currentPhase' are incompatible between these types.

07:46:03.191       Type '"completed"' is not assignable to type '"import" | "cleanup" | "validation" | "transformation"'.

07:46:03.191 src/app/api/suppliers/bulk-import/route.ts(383,21): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

07:46:03.191 src/app/api/suppliers/enhanced/route.ts(294,24): error TS2339: Property 'metrics' does not exist on type '{ id: any; name: any; code: any; description: any; email: any; phone: any; website: any; address: any; contact: any; businessInfo: any; paymentTerms: any; capabilities: any; categories: any; tags: any; notes: any; ... 10 more ...; lastOrderDate: any; }'.

07:46:03.191 src/app/api/suppliers/enhanced/route.ts(314,22): error TS2339: Property 'recentProducts' does not exist on type '{ id: any; name: any; code: any; description: any; email: any; phone: any; website: any; address: any; contact: any; businessInfo: any; paymentTerms: any; capabilities: any; categories: any; tags: any; notes: any; ... 10 more ...; lastOrderDate: any; }'.

07:46:03.191 src/app/api/suppliers/pricelists/import/route.ts(84,19): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

07:46:03.191 src/app/api/suppliers/pricelists/import/route.ts(519,9): error TS7034: Variable 'updateFields' implicitly has type 'any\[]' in some locations where its type cannot be determined.

07:46:03.191 src/app/api/suppliers/pricelists/import/route.ts(520,9): error TS7034: Variable 'values' implicitly has type 'any\[]' in some locations where its type cannot be determined.

07:46:03.191 src/app/api/suppliers/pricelists/import/route.ts(536,13): error TS7005: Variable 'updateFields' implicitly has an 'any\[]' type.

07:46:03.191 src/app/api/suppliers/pricelists/import/route.ts(538,8): error TS7005: Variable 'values' implicitly has an 'any\[]' type.

07:46:03.191 src/app/api/suppliers/pricelists/route.ts(112,24): error TS2349: This expression is not callable.

07:46:03.191   Type 'String' has no call signatures.

07:46:03.191 src/app/api/suppliers/pricelists/route.ts(132,24): error TS2349: This expression is not callable.

07:46:03.191   Type 'String' has no call signatures.

07:46:03.191 src/app/api/suppliers/pricelists/route.ts(252,29): error TS7006: Parameter 'pricelist' implicitly has an 'any' type.

07:46:03.191 src/app/api/suppliers/pricelists/route.ts(344,33): error TS2304: Cannot find name 'pool'.

07:46:03.191 src/app/api/suppliers/pricelists/upload/enhanced-route.ts(5,30): error TS2307: Cannot find module '@/lib/supabase/server' or its corresponding type declarations.

07:46:03.191 src/app/api/suppliers/pricelists/upload/enhanced-route.ts(7,10): error TS2305: Module '"@/lib/integrations/inventory-integration"' has no exported member 'PricelistIntegrationService'.

07:46:03.191 src/app/api/suppliers/pricelists/upload/enhanced-route.ts(56,14): error TS2769: No overload matches this call.

07:46:03.191   Overload 1 of 2, '(def: { skipEmptyRows: boolean; validateSkus: boolean; checkDuplicates: boolean; validatePrices: boolean; normalizeText: boolean; createBackup: boolean; }): ZodDefault<ZodObject<{ skipEmptyRows: ZodDefault<ZodBoolean>; ... 4 more ...; createBackup: ZodDefault<...>; }, $strip>>', gave the following error.

07:46:03.191     Argument of type '{}' is not assignable to parameter of type '{ skipEmptyRows: boolean; validateSkus: boolean; checkDuplicates: boolean; validatePrices: boolean; normalizeText: boolean; createBackup: boolean; }'.

07:46:03.192       Type '{}' is missing the following properties from type '{ skipEmptyRows: boolean; validateSkus: boolean; checkDuplicates: boolean; validatePrices: boolean; normalizeText: boolean; createBackup: boolean; }': skipEmptyRows, validateSkus, checkDuplicates, validatePrices, and 2 more.

07:46:03.192   Overload 2 of 2, '(def: () => { skipEmptyRows: boolean; validateSkus: boolean; checkDuplicates: boolean; validatePrices: boolean; normalizeText: boolean; createBackup: boolean; }): ZodDefault<ZodObject<{ skipEmptyRows: ZodDefault<ZodBoolean>; ... 4 more ...; createBackup: ZodDefault<...>; }, $strip>>', gave the following error.

07:46:03.192     Argument of type '{}' is not assignable to parameter of type '() => { skipEmptyRows: boolean; validateSkus: boolean; checkDuplicates: boolean; validatePrices: boolean; normalizeText: boolean; createBackup: boolean; }'.

07:46:03.192       Type '{}' provides no match for the signature '(): { skipEmptyRows: boolean; validateSkus: boolean; checkDuplicates: boolean; validatePrices: boolean; normalizeText: boolean; createBackup: boolean; }'.

07:46:03.192 src/app/api/suppliers/pricelists/upload/enhanced-route.ts(551,11): error TS2353: Object literal may only specify known properties, and 'rollbackId' does not exist in type 'Partial<ErrorContext>'.

07:46:03.192 src/app/api/suppliers/pricelists/upload/live-route.ts(57,14): error TS2769: No overload matches this call.

07:46:03.192   Overload 1 of 2, '(def: { skipEmptyRows: boolean; validateSkus: boolean; checkDuplicates: boolean; validatePrices: boolean; normalizeText: boolean; createBackup: boolean; }): ZodDefault<ZodObject<{ skipEmptyRows: ZodDefault<ZodBoolean>; ... 4 more ...; createBackup: ZodDefault<...>; }, $strip>>', gave the following error.

07:46:03.192     Argument of type '{}' is not assignable to parameter of type '{ skipEmptyRows: boolean; validateSkus: boolean; checkDuplicates: boolean; validatePrices: boolean; normalizeText: boolean; createBackup: boolean; }'.

07:46:03.192       Type '{}' is missing the following properties from type '{ skipEmptyRows: boolean; validateSkus: boolean; checkDuplicates: boolean; validatePrices: boolean; normalizeText: boolean; createBackup: boolean; }': skipEmptyRows, validateSkus, checkDuplicates, validatePrices, and 2 more.

07:46:03.192   Overload 2 of 2, '(def: () => { skipEmptyRows: boolean; validateSkus: boolean; checkDuplicates: boolean; validatePrices: boolean; normalizeText: boolean; createBackup: boolean; }): ZodDefault<ZodObject<{ skipEmptyRows: ZodDefault<ZodBoolean>; ... 4 more ...; createBackup: ZodDefault<...>; }, $strip>>', gave the following error.

07:46:03.192     Argument of type '{}' is not assignable to parameter of type '() => { skipEmptyRows: boolean; validateSkus: boolean; checkDuplicates: boolean; validatePrices: boolean; normalizeText: boolean; createBackup: boolean; }'.

07:46:03.192       Type '{}' provides no match for the signature '(): { skipEmptyRows: boolean; validateSkus: boolean; checkDuplicates: boolean; validatePrices: boolean; normalizeText: boolean; createBackup: boolean; }'.

07:46:03.192 src/app/api/suppliers/pricelists/upload/live-route.ts(288,20): error TS2339: Property 'some' does not exist on type '{}'.

07:46:03.192 src/app/api/suppliers/pricelists/upload/live-route.ts(288,25): error TS7006: Parameter 'cell' implicitly has an 'any' type.

07:46:03.192 src/app/api/suppliers/pricelists/upload/live-route.ts(545,38): error TS7006: Parameter 'item' implicitly has an 'any' type.

07:46:03.192 src/app/api/suppliers/pricelists/upload/live-route.ts(807,72): error TS7006: Parameter 'r' implicitly has an 'any' type.

07:46:03.192 src/app/api/suppliers/pricelists/upload/live-route.ts(808,64): error TS7006: Parameter 'r' implicitly has an 'any' type.

07:46:03.192 src/app/api/suppliers/pricelists/upload/route.ts(52,14): error TS2769: No overload matches this call.

07:46:03.192   Overload 1 of 2, '(def: { skipEmptyRows: boolean; validateSkus: boolean; checkDuplicates: boolean; validatePrices: boolean; normalizeText: boolean; createBackup: boolean; }): ZodDefault<ZodObject<{ skipEmptyRows: ZodDefault<ZodBoolean>; ... 4 more ...; createBackup: ZodDefault<...>; }, $strip>>', gave the following error.

07:46:03.192     Argument of type '{}' is not assignable to parameter of type '{ skipEmptyRows: boolean; validateSkus: boolean; checkDuplicates: boolean; validatePrices: boolean; normalizeText: boolean; createBackup: boolean; }'.

07:46:03.192       Type '{}' is missing the following properties from type '{ skipEmptyRows: boolean; validateSkus: boolean; checkDuplicates: boolean; validatePrices: boolean; normalizeText: boolean; createBackup: boolean; }': skipEmptyRows, validateSkus, checkDuplicates, validatePrices, and 2 more.

07:46:03.192   Overload 2 of 2, '(def: () => { skipEmptyRows: boolean; validateSkus: boolean; checkDuplicates: boolean; validatePrices: boolean; normalizeText: boolean; createBackup: boolean; }): ZodDefault<ZodObject<{ skipEmptyRows: ZodDefault<ZodBoolean>; ... 4 more ...; createBackup: ZodDefault<...>; }, $strip>>', gave the following error.

07:46:03.192     Argument of type '{}' is not assignable to parameter of type '() => { skipEmptyRows: boolean; validateSkus: boolean; checkDuplicates: boolean; validatePrices: boolean; normalizeText: boolean; createBackup: boolean; }'.

07:46:03.193       Type '{}' provides no match for the signature '(): { skipEmptyRows: boolean; validateSkus: boolean; checkDuplicates: boolean; validatePrices: boolean; normalizeText: boolean; createBackup: boolean; }'.

07:46:03.193 src/app/api/suppliers/pricelists/upload/route.ts(324,34): error TS2353: Object literal may only specify known properties, and 'headers' does not exist in type 'any\[]'.

07:46:03.193 src/app/api/suppliers/pricelists/upload/route.ts(384,16): error TS2339: Property 'data' does not exist on type 'any\[]'.

07:46:03.193 src/app/api/suppliers/pricelists/upload/route.ts(385,16): error TS2339: Property 'headers' does not exist on type 'any\[]'.

07:46:03.193 src/app/api/suppliers/pricelists/upload/route.ts(904,5): error TS2322: Type 'string' is not assignable to type 'Date'.

07:46:03.193 src/app/api/suppliers/pricelists/upload/route.ts(950,34): error TS2345: Argument of type '{ supplier\_id: string; created\_at: Date; updated\_at: Date; id: string; }' is not assignable to parameter of type '{ id: string; sku: string; name: string; category: string; cost\_price: number; stock\_qty: number; supplier\_id: string; }'.

07:46:03.193   Type '{ supplier\_id: string; created\_at: Date; updated\_at: Date; id: string; }' is missing the following properties from type '{ id: string; sku: string; name: string; category: string; cost\_price: number; stock\_qty: number; supplier\_id: string; }': sku, name, category, cost\_price, stock\_qty

07:46:03.193 src/app/api/suppliers/pricelists/upload/route.ts(961,17): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ id: string; sku: string; name: string; category: string; cost\_price: number; stock\_qty: number; supplier\_id: string; }'.

07:46:03.193   No index signature with a parameter of type 'string' was found on type '{ id: string; sku: string; name: string; category: string; cost\_price: number; stock\_qty: number; supplier\_id: string; }'.

07:46:03.193 src/app/api/suppliers/pricelists/upload/route.ts(964,46): error TS2339: Property 'updated\_at' does not exist on type '{ id: string; sku: string; name: string; category: string; cost\_price: number; stock\_qty: number; supplier\_id: string; }'.

07:46:03.193 src/app/api/suppliers/route.optimized.ts(51,23): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.

07:46:03.194   Type 'undefined' is not assignable to type 'string'.

07:46:03.194 src/app/api/suppliers/route.optimized.ts(221,26): error TS2349: This expression is not callable.

07:46:03.194   Type 'String' has no call signatures.

07:46:03.194 src/app/api/suppliers/route.optimized.ts(228,41): error TS7006: Parameter 'row' implicitly has an 'any' type.

07:46:03.194 src/app/api/suppliers/route.optimized.ts(289,11): error TS2451: Cannot redeclare block-scoped variable 'results'.

07:46:03.194 src/app/api/suppliers/route.optimized.ts(289,11): error TS7034: Variable 'results' implicitly has type 'any\[]' in some locations where its type cannot be determined.

07:46:03.194 src/app/api/suppliers/route.optimized.ts(290,11): error TS2451: Cannot redeclare block-scoped variable 'errors'.

07:46:03.194 src/app/api/suppliers/route.optimized.ts(290,11): error TS7034: Variable 'errors' implicitly has type 'any\[]' in some locations where its type cannot be determined.

07:46:03.194 src/app/api/suppliers/route.optimized.ts(293,11): error TS2451: Cannot redeclare block-scoped variable 'results'.

07:46:03.194 src/app/api/suppliers/route.optimized.ts(294,11): error TS2451: Cannot redeclare block-scoped variable 'errors'.

07:46:03.194 src/app/api/suppliers/route.optimized.ts(356,43): error TS7005: Variable 'results' implicitly has an 'any\[]' type.

07:46:03.194 src/app/api/suppliers/route.optimized.ts(356,58): error TS7005: Variable 'results' implicitly has an 'any\[]' type.

07:46:03.194 src/app/api/suppliers/route.optimized.ts(361,13): error TS7005: Variable 'results' implicitly has an 'any\[]' type.

07:46:03.194 src/app/api/suppliers/route.optimized.ts(362,35): error TS7005: Variable 'errors' implicitly has an 'any\[]' type.

07:46:03.195 src/app/api/suppliers/v3/\[id]/route.ts(72,5): error TS2322: Type 'string' is not assignable to type 'Date'.

07:46:03.195 src/app/api/suppliers/v3/\[id]/route.ts(76,14): error TS2339: Property 'details' does not exist on type 'APIResponse<null>'.

07:46:03.195 src/app/api/suppliers/v3/\[id]/route.ts(87,5): error TS2322: Type 'string' is not assignable to type 'Date'.

07:46:03.195 src/app/api/suppliers/v3/ai/discover/route.ts(47,5): error TS2322: Type 'string' is not assignable to type 'Date'.

07:46:03.195 src/app/api/suppliers/v3/ai/discover/route.ts(58,5): error TS2322: Type 'string' is not assignable to type 'Date'.

07:46:03.195 src/app/api/suppliers/v3/ai/discover/route.ts(85,39): error TS2551: Property 'discoverSuppliers' does not exist on type 'AISupplierDiscoveryService'. Did you mean 'discoverSupplier'?

07:46:03.195 src/app/api/suppliers/v3/ai/discover/route.ts(88,41): error TS7006: Parameter 'match' implicitly has an 'any' type.

07:46:03.195 src/app/api/suppliers/v3/ai/discover/route.ts(96,44): error TS7006: Parameter 'a' implicitly has an 'any' type.

07:46:03.195 src/app/api/suppliers/v3/ai/discover/route.ts(96,47): error TS7006: Parameter 'b' implicitly has an 'any' type.

07:46:03.195 src/app/api/suppliers/v3/ai/discover/route.ts(100,63): error TS2339: Property 'maxResults' does not exist on type 'AISupplierDiscovery'.

07:46:03.195 src/app/api/suppliers/v3/ai/discover/route.ts(105,35): error TS2339: Property 'sources' does not exist on type 'AISupplierDiscovery'.

07:46:03.195 src/app/api/suppliers/v3/ai/discover/route.ts(106,45): error TS2551: Property 'toISOString' does not exist on type 'string'. Did you mean 'toString'?

07:46:03.195 src/app/api/suppliers/v3/ai/discover/route.ts(141,73): error TS2554: Expected 1 arguments, but got 2.

07:46:03.195 src/app/api/suppliers/v3/ai/discover/route.ts(175,41): error TS2339: Property 'getDiscoverySuggestions' does not exist on type 'AISupplierDiscoveryService'.

07:46:03.195 src/app/api/suppliers/v3/export/route.ts(55,5): error TS2322: Type 'string' is not assignable to type 'Date'.

07:46:03.195 src/app/api/suppliers/v3/export/route.ts(73,11): error TS2322: Type '{ format: "json" | "csv" | "pdf" | "excel"; template: "basic" | "compliance" | "performance" | "detailed"; filters: { search?: string | undefined; status?: ("active" | "inactive" | "suspended" | "pending")\[] | undefined; ... 7 more ...; createdBefore?: string | undefined; }; ... 4 more ...; description?: string | un...' is not assignable to type 'ExportRequest'.

07:46:03.195   The types of 'filters.createdAfter' are incompatible between these types.

07:46:03.195     Type 'string | undefined' is not assignable to type 'Date | undefined'.

07:46:03.195       Type 'string' is not assignable to type 'Date'.

07:46:03.195 src/app/api/suppliers/v3/export/route.ts(86,29): error TS2345: Argument of type 'Buffer<ArrayBufferLike>' is not assignable to parameter of type 'BodyInit | null | undefined'.

07:46:03.195   Type 'Buffer<ArrayBufferLike>' is missing the following properties from type 'URLSearchParams': size, append, delete, get, and 2 more.

07:46:03.195 src/app/api/suppliers/v3/export/route.ts(141,29): error TS2345: Argument of type 'Buffer<ArrayBufferLike>' is not assignable to parameter of type 'BodyInit | null | undefined'.

07:46:03.195   Type 'Buffer<ArrayBufferLike>' is missing the following properties from type 'URLSearchParams': size, append, delete, get, and 2 more.

07:46:03.196 src/app/api/suppliers/v3/route.ts(99,5): error TS2322: Type 'string' is not assignable to type 'Date'.

07:46:03.196 src/app/api/suppliers/v3/route.ts(103,14): error TS2339: Property 'details' does not exist on type 'APIResponse<null>'.

07:46:03.196 src/app/api/suppliers/v3/route.ts(114,5): error TS2322: Type 'string' is not assignable to type 'Date'.

07:46:03.196 src/app/api/suppliers/v3/route.ts(125,5): error TS2322: Type 'string' is not assignable to type 'Date'.

07:46:03.196 src/app/api/suppliers/v3/route.ts(166,11): error TS2322: Type '{ page: number; limit: number; sortBy: "status" | "name" | "code" | "createdAt" | "tier" | "rating"; sortOrder: "asc" | "desc"; search?: string | undefined; status?: ("active" | "inactive" | "suspended" | "pending")\[] | undefined; ... 9 more ...; createdBefore?: string | undefined; }' is not assignable to type 'SupplierFilters'.

07:46:03.196   Types of property 'createdAfter' are incompatible.

07:46:03.196     Type 'string | undefined' is not assignable to type 'Date | undefined'.

07:46:03.196       Type 'string' is not assignable to type 'Date'.

07:46:03.196 src/app/api/v2/inventory/\[id]/route.ts(14,3): error TS2345: Argument of type '(request: NextRequest, context: RequestContext, { params }: { params: Promise<{ id: string; }>; }) => Promise<NextResponse<unknown>>' is not assignable to parameter of type '(request: NextRequest, context: RequestContext) => Promise<NextResponse<unknown>>'.

07:46:03.196   Target signature provides too few arguments. Expected 3 or more, but got 2.

07:46:03.196 src/app/api/v2/inventory/\[id]/route.ts(18,56): error TS2339: Property 'id' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.196 src/app/api/v2/inventory/\[id]/route.ts(20,30): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.196 src/app/api/v2/inventory/\[id]/route.ts(36,24): error TS2339: Property 'id' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.196 src/app/api/v2/inventory/\[id]/route.ts(47,24): error TS2339: Property 'id' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.196 src/app/api/v2/inventory/\[id]/route.ts(73,58): error TS2339: Property 'id' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.196 src/app/api/v2/inventory/\[id]/route.ts(73,70): error TS2339: Property 'id' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.196 src/app/api/v2/inventory/\[id]/route.ts(76,19): error TS2339: Property 'id' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.196 src/app/api/v2/inventory/\[id]/route.ts(103,57): error TS7006: Parameter 'validatedData' implicitly has an 'any' type.

07:46:03.196 src/app/api/v2/inventory/\[id]/route.ts(107,66): error TS2339: Property 'id' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.196 src/app/api/v2/inventory/\[id]/route.ts(109,30): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.196 src/app/api/v2/inventory/\[id]/route.ts(119,50): error TS2339: Property 'id' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.197 src/app/api/v2/inventory/\[id]/route.ts(122,32): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.197 src/app/api/v2/inventory/\[id]/route.ts(127,44): error TS2339: Property 'id' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.197 src/app/api/v2/inventory/\[id]/route.ts(137,32): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.197   No index signature with a parameter of type 'string' was found on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.197 src/app/api/v2/inventory/\[id]/route.ts(165,32): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.197 src/app/api/v2/inventory/\[id]/route.ts(187,31): error TS2339: Property 'id' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.197 src/app/api/v2/inventory/\[id]/route.ts(198,31): error TS2339: Property 'id' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.197 src/app/api/v2/inventory/\[id]/route.ts(207,29): error TS2339: Property 'id' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.197 src/app/api/v2/inventory/\[id]/route.ts(211,46): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.197   No index signature with a parameter of type 'string' was found on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.197 src/app/api/v2/inventory/\[id]/route.ts(214,46): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.197   No index signature with a parameter of type 'string' was found on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.197 src/app/api/v2/inventory/\[id]/route.ts(237,3): error TS2554: Expected 1 arguments, but got 2.

07:46:03.197 src/app/api/v2/inventory/\[id]/route.ts(242,3): error TS2345: Argument of type '(request: NextRequest, context: RequestContext, { params }: { params: Promise<{ id: string; }>; }) => Promise<NextResponse<unknown>>' is not assignable to parameter of type '(request: NextRequest, context: RequestContext) => Promise<NextResponse<unknown>>'.

07:46:03.197   Target signature provides too few arguments. Expected 3 or more, but got 2.

07:46:03.197 src/app/api/v2/inventory/\[id]/route.ts(246,66): error TS2339: Property 'id' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.197 src/app/api/v2/inventory/\[id]/route.ts(248,30): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.197 src/app/api/v2/inventory/\[id]/route.ts(281,30): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.197 src/app/api/v2/inventory/\[id]/route.ts(301,14): error TS2339: Property 'updatedAt' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.197 src/app/api/v2/inventory/\[id]/route.ts(313,30): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.198 src/app/api/v2/inventory/\[id]/route.ts(331,29): error TS2339: Property 'id' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.198 src/app/api/v2/inventory/route.ts(18,5): error TS2353: Object literal may only specify known properties, and 'id' does not exist in type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.198 src/app/api/v2/inventory/route.ts(79,5): error TS2353: Object literal may only specify known properties, and 'id' does not exist in type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.198 src/app/api/v2/inventory/route.ts(152,20): error TS2339: Property 'id' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.198 src/app/api/v2/inventory/route.ts(163,20): error TS2339: Property 'id' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.198 src/app/api/v2/inventory/route.ts(263,47): error TS2339: Property 'createdAt' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.199 src/app/api/v2/inventory/route.ts(264,48): error TS2339: Property 'createdAt' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.199 src/app/api/v2/inventory/route.ts(265,47): error TS2339: Property 'updatedAt' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.199 src/app/api/v2/inventory/route.ts(266,48): error TS2339: Property 'updatedAt' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.199 src/app/api/v2/inventory/route.ts(308,29): error TS2339: Property 'createdAt' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.199 src/app/api/v2/inventory/route.ts(309,29): error TS2339: Property 'createdAt' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.202 src/app/api/v2/inventory/route.ts(312,29): error TS2339: Property 'updatedAt' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.202 src/app/api/v2/inventory/route.ts(313,29): error TS2339: Property 'updatedAt' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.203 src/app/api/v2/inventory/route.ts(387,30): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.203 src/app/api/v2/inventory/route.ts(392,42): error TS2339: Property 'id' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.203 src/app/api/v2/inventory/route.ts(398,74): error TS2339: Property 'reservedStock' does not exist on type '{ currency: string; name: string; sku: string; category: string; tags: string\[]; certifications: string\[]; unit: string; currentStock: number; reorderPoint: number; maxStock: number; minStock: number; ... 22 more ...; storageRequirements?: string | undefined; }'.

07:46:03.203 src/app/api/v2/inventory/route.ts(410,9): error TS2353: Object literal may only specify known properties, and 'id' does not exist in type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.203 src/app/api/v2/inventory/route.ts(412,38): error TS2339: Property 'reservedStock' does not exist on type '{ currency: string; name: string; sku: string; category: string; tags: string\[]; certifications: string\[]; unit: string; currentStock: number; reorderPoint: number; maxStock: number; minStock: number; ... 22 more ...; storageRequirements?: string | undefined; }'.

07:46:03.203 src/app/api/v2/inventory/route.ts(464,30): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.203 src/app/api/v2/inventory/route.ts(482,70): error TS2339: Property 'id' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.203 src/app/api/v2/inventory/route.ts(494,13): error TS2353: Object literal may only specify known properties, and 'updatedAt' does not exist in type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.203 src/app/api/v2/inventory/route.ts(544,30): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.203 src/app/api/v2/inventory/route.ts(555,68): error TS2339: Property 'id' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.203 src/app/api/v2/inventory/upload/route.ts(344,9): error TS2353: Object literal may only specify known properties, and 'id' does not exist in type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.203 src/app/api/v2/inventory/upload/route.ts(467,30): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.203 src/app/api/v2/inventory/upload/route.ts(512,30): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.203 src/app/api/v2/inventory/upload/route.ts(526,30): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.203 src/app/api/v2/inventory/upload/route.ts(569,17): error TS2353: Object literal may only specify known properties, and 'id' does not exist in type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.203 src/app/api/v2/inventory/upload/route.ts(569,54): error TS2339: Property 'id' does not exist on type '{ sku: string; name: string; category: string; currentStock: number; reservedStock: number; reorderPoint: number; maxStock: number; minStock: number; unitCost: number; unitPrice: number; currency: string; ... 27 more ...; nextDeliveryDate?: string | undefined; }'.

07:46:03.203 src/app/api/v2/inventory/upload/route.ts(613,28): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.203 src/app/api/v2/inventory/upload/route.ts(635,3): error TS2345: Argument of type '(request: NextRequest, context: RequestContext) => Promise<Response>' is not assignable to parameter of type '(request: NextRequest, context: RequestContext) => Promise<NextResponse<unknown>>'.

07:46:03.203   Type 'Promise<Response>' is not assignable to type 'Promise<NextResponse<unknown>>'.

07:46:03.203     Type 'Response' is missing the following properties from type 'NextResponse<unknown>': cookies, \[INTERNALS]

07:46:03.203 src/app/api/v2/suppliers/\[id]/route.ts(8,34): error TS2307: Cannot find module '../route' or its corresponding type declarations.

07:46:03.204 src/app/api/v2/suppliers/\[id]/route.ts(12,3): error TS2345: Argument of type '(request: NextRequest, context: RequestContext, { params }: { params: Promise<{ id: string; }>; }) => Promise<NextResponse<unknown>>' is not assignable to parameter of type '(request: NextRequest, context: RequestContext) => Promise<NextResponse<unknown>>'.

07:46:03.204   Target signature provides too few arguments. Expected 3 or more, but got 2.

07:46:03.204 src/app/api/v2/suppliers/\[id]/route.ts(16,46): error TS7006: Parameter 'supplier' implicitly has an 'any' type.

07:46:03.204 src/app/api/v2/suppliers/\[id]/route.ts(18,30): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.204 src/app/api/v2/suppliers/\[id]/route.ts(149,57): error TS7006: Parameter 'validatedData' implicitly has an 'any' type.

07:46:03.204 src/app/api/v2/suppliers/\[id]/route.ts(153,56): error TS7006: Parameter 'supplier' implicitly has an 'any' type.

07:46:03.204 src/app/api/v2/suppliers/\[id]/route.ts(155,30): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.204 src/app/api/v2/suppliers/\[id]/route.ts(164,56): error TS7006: Parameter 'supplier' implicitly has an 'any' type.

07:46:03.204 src/app/api/v2/suppliers/\[id]/route.ts(168,32): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.204 src/app/api/v2/suppliers/\[id]/route.ts(181,53): error TS7006: Parameter 'supplier' implicitly has an 'any' type.

07:46:03.204 src/app/api/v2/suppliers/\[id]/route.ts(185,32): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.204 src/app/api/v2/suppliers/\[id]/route.ts(208,63): error TS7006: Parameter 'c' implicitly has an 'any' type.

07:46:03.204 src/app/api/v2/suppliers/\[id]/route.ts(210,32): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.204 src/app/api/v2/suppliers/\[id]/route.ts(222,62): error TS7006: Parameter 'contact' implicitly has an 'any' type.

07:46:03.204 src/app/api/v2/suppliers/\[id]/route.ts(222,71): error TS7006: Parameter 'index' implicitly has an 'any' type.

07:46:03.204 src/app/api/v2/suppliers/\[id]/route.ts(247,37): error TS2339: Property 'id' does not exist on type '{ name: string; code: string; email: string; address: { street: string; city: string; state: string; postalCode: string; country: string; }; contacts: { name: string; role: string; email: string; isPrimary: boolean; isActive: boolean; id?: string | undefined; phone?: string | undefined; department?: string | undefin...'.

07:46:03.204 src/app/api/v2/suppliers/\[id]/route.ts(276,3): error TS2554: Expected 1 arguments, but got 2.

07:46:03.204 src/app/api/v2/suppliers/\[id]/route.ts(281,3): error TS2345: Argument of type '(request: NextRequest, context: RequestContext, { params }: { params: Promise<{ id: string; }>; }) => Promise<NextResponse<unknown>>' is not assignable to parameter of type '(request: NextRequest, context: RequestContext) => Promise<NextResponse<unknown>>'.

07:46:03.204   Target signature provides too few arguments. Expected 3 or more, but got 2.

07:46:03.204 src/app/api/v2/suppliers/\[id]/route.ts(285,56): error TS7006: Parameter 'supplier' implicitly has an 'any' type.

07:46:03.204 src/app/api/v2/suppliers/\[id]/route.ts(287,30): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.204 src/app/api/v2/suppliers/\[id]/route.ts(328,30): error TS2341: Property 'createErrorResponse' is private and only accessible within class 'ApiMiddleware'.

07:46:03.205 src/app/api/warehouses/route.ts(361,28): error TS2345: Argument of type '{ utilization: { volume: number; weight: number; pallets: number; }; zones: never\[]; performance: { pickingAccuracy: number; averagePickTime: number; shippingAccuracy: number; receivingEfficiency: number; inventoryTurnover: number; }; ... 12 more ...; id: string; }' is not assignable to parameter of type '{ id: string; name: string; code: string; address: { street: string; city: string; state: string; postalCode: string; country: string; }; capacity: { volume: number; weight: number; pallets: number; }; utilization: { ...; }; ... 9 more ...; createdBy: string; }'.

07:46:03.205   Types of property 'operatingHours' are incompatible.

07:46:03.205     Type '{ monday: { open: string; close: string; isOpen: boolean; }; tuesday: { open: string; close: string; isOpen: boolean; }; wednesday: { open: string; close: string; isOpen: boolean; }; thursday: { open: string; close: string; isOpen: boolean; }; friday: { ...; }; saturday: { ...; }; sunday: { ...; }; } | undefined' is not assignable to type '{ monday: { open: string; close: string; isOpen: boolean; }; tuesday: { open: string; close: string; isOpen: boolean; }; wednesday: { open: string; close: string; isOpen: boolean; }; thursday: { open: string; close: string; isOpen: boolean; }; friday: { ...; }; saturday: { ...; }; sunday: { ...; }; }'.

07:46:03.205       Type 'undefined' is not assignable to type '{ monday: { open: string; close: string; isOpen: boolean; }; tuesday: { open: string; close: string; isOpen: boolean; }; wednesday: { open: string; close: string; isOpen: boolean; }; thursday: { open: string; close: string; isOpen: boolean; }; friday: { ...; }; saturday: { ...; }; sunday: { ...; }; }'.

07:46:03.205 src/app/api/warehouses/route.ts(407,28): error TS2339: Property 'id' does not exist on type '{ name?: string | undefined; code?: string | undefined; address?: { street: string; city: string; state: string; postalCode: string; country: string; } | undefined; capacity?: { volume: number; weight: number; pallets: number; } | undefined; ... 4 more ...; contactInfo?: { ...; } | undefined; }'.

07:46:03.205 src/app/api/warehouses/route.ts(412,88): error TS2339: Property 'id' does not exist on type '{ name?: string | undefined; code?: string | undefined; address?: { street: string; city: string; state: string; postalCode: string; country: string; } | undefined; capacity?: { volume: number; weight: number; pallets: number; } | undefined; ... 4 more ...; contactInfo?: { ...; } | undefined; }'.

07:46:03.205 src/app/api/warehouses/route.ts(414,43): error TS2339: Property 'id' does not exist on type '{ name?: string | undefined; code?: string | undefined; address?: { street: string; city: string; state: string; postalCode: string; country: string; } | undefined; capacity?: { volume: number; weight: number; pallets: number; } | undefined; ... 4 more ...; contactInfo?: { ...; } | undefined; }'.

07:46:03.205 src/app/api/warehouses/route.ts(421,40): error TS2339: Property 'id' does not exist on type '{ name?: string | undefined; code?: string | undefined; address?: { street: string; city: string; state: string; postalCode: string; country: string; } | undefined; capacity?: { volume: number; weight: number; pallets: number; } | undefined; ... 4 more ...; contactInfo?: { ...; } | undefined; }'.

07:46:03.206 src/app/api/warehouses/route.ts(434,9): error TS2322: Type '{ updatedAt: Date; name: string; code: string; address: { street: string; city: string; state: string; postalCode: string; country: string; }; capacity: { volume: number; weight: number; pallets: number; }; ... 10 more ...; createdBy: string; }' is not assignable to type '{ id: string; name: string; code: string; address: { street: string; city: string; state: string; postalCode: string; country: string; }; capacity: { volume: number; weight: number; pallets: number; }; utilization: { ...; }; ... 9 more ...; createdBy: string; }'.

07:46:03.206   The types of 'contactInfo.phone' are incompatible between these types.

07:46:03.206     Type 'string | undefined' is not assignable to type 'string'.

07:46:03.206       Type 'undefined' is not assignable to type 'string'.

07:46:03.206 src/app/auth/login/page.tsx(32,5): error TS2322: Type 'Resolver<{ email: string; password: string; remember\_me?: boolean | undefined; }, any, { email: string; password: string; remember\_me: boolean; }>' is not assignable to type 'Resolver<{ email: string; password: string; remember\_me: boolean; }, any, { email: string; password: string; remember\_me: boolean; }>'.

07:46:03.206   Types of parameters 'options' and 'options' are incompatible.

07:46:03.206     Type 'ResolverOptions<{ email: string; password: string; remember\_me: boolean; }>' is not assignable to type 'ResolverOptions<{ email: string; password: string; remember\_me?: boolean | undefined; }>'.

07:46:03.206       Type 'boolean | undefined' is not assignable to type 'boolean'.

07:46:03.206         Type 'undefined' is not assignable to type 'boolean'.

07:46:03.206 src/app/auth/login/page.tsx(199,49): error TS2345: Argument of type '(data: LoginFormData) => Promise<void>' is not assignable to parameter of type 'SubmitHandler<TFieldValues>'.

07:46:03.206   Types of parameters 'data' and 'data' are incompatible.

07:46:03.206     Type 'TFieldValues' is not assignable to type '{ email: string; password: string; remember\_me: boolean; }'.

07:46:03.206       Type 'FieldValues' is missing the following properties from type '{ email: string; password: string; remember\_me: boolean; }': email, password, remember\_me

07:46:03.206 src/app/auth/login/page.tsx(208,19): error TS2322: Type 'Control<{ email: string; password: string; remember\_me: boolean; }, any, TFieldValues>' is not assignable to type 'Control<{ email: string; password: string; remember\_me: boolean; }, any, { email: string; password: string; remember\_me: boolean; }>'.

07:46:03.206   The types of '\_options.resolver' are incompatible between these types.

07:46:03.206     Type 'Resolver<{ email: string; password: string; remember\_me: boolean; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ email: string; password: string; remember\_me: boolean; }, any, { email: string; password: string; remember\_me: boolean; }> | undefined'.

07:46:03.206       Type 'Resolver<{ email: string; password: string; remember\_me: boolean; }, any, TFieldValues>' is not assignable to type 'Resolver<{ email: string; password: string; remember\_me: boolean; }, any, { email: string; password: string; remember\_me: boolean; }>'.

07:46:03.207         Type 'TFieldValues' is not assignable to type '{ email: string; password: string; remember\_me: boolean; }'.

07:46:03.207           Type 'FieldValues' is missing the following properties from type '{ email: string; password: string; remember\_me: boolean; }': email, password, remember\_me

07:46:03.207 src/app/auth/login/page.tsx(226,19): error TS2322: Type 'Control<{ email: string; password: string; remember\_me: boolean; }, any, TFieldValues>' is not assignable to type 'Control<{ email: string; password: string; remember\_me: boolean; }, any, { email: string; password: string; remember\_me: boolean; }>'.

07:46:03.207   The types of '\_options.resolver' are incompatible between these types.

07:46:03.207     Type 'Resolver<{ email: string; password: string; remember\_me: boolean; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ email: string; password: string; remember\_me: boolean; }, any, { email: string; password: string; remember\_me: boolean; }> | undefined'.

07:46:03.207       Type 'Resolver<{ email: string; password: string; remember\_me: boolean; }, any, TFieldValues>' is not assignable to type 'Resolver<{ email: string; password: string; remember\_me: boolean; }, any, { email: string; password: string; remember\_me: boolean; }>'.

07:46:03.207         Type 'TFieldValues' is not assignable to type '{ email: string; password: string; remember\_me: boolean; }'.

07:46:03.207           Type 'FieldValues' is missing the following properties from type '{ email: string; password: string; remember\_me: boolean; }': email, password, remember\_me

07:46:03.207 src/app/auth/login/page.tsx(260,21): error TS2322: Type 'Control<{ email: string; password: string; remember\_me: boolean; }, any, TFieldValues>' is not assignable to type 'Control<{ email: string; password: string; remember\_me: boolean; }, any, { email: string; password: string; remember\_me: boolean; }>'.

07:46:03.207   The types of '\_options.resolver' are incompatible between these types.

07:46:03.207     Type 'Resolver<{ email: string; password: string; remember\_me: boolean; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ email: string; password: string; remember\_me: boolean; }, any, { email: string; password: string; remember\_me: boolean; }> | undefined'.

07:46:03.207       Type 'Resolver<{ email: string; password: string; remember\_me: boolean; }, any, TFieldValues>' is not assignable to type 'Resolver<{ email: string; password: string; remember\_me: boolean; }, any, { email: string; password: string; remember\_me: boolean; }>'.

07:46:03.207         Type 'TFieldValues' is not assignable to type '{ email: string; password: string; remember\_me: boolean; }'.

07:46:03.207           Type 'FieldValues' is missing the following properties from type '{ email: string; password: string; remember\_me: boolean; }': email, password, remember\_me

07:46:03.207 src/app/auth/register/page.tsx(41,5): error TS2322: Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; marketing\_consent?: boolean | undefined; }, any, { ...; }>' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.207   Types of parameters 'options' and 'options' are incompatible.

07:46:03.207     Type 'ResolverOptions<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }>' is not assignable to type 'ResolverOptions<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; marketing\_consent?: boolean | undefined; }>'.

07:46:03.207       Type 'string | undefined' is not assignable to type 'string'.

07:46:03.207         Type 'undefined' is not assignable to type 'string'.

07:46:03.208 src/app/auth/register/page.tsx(105,50): error TS2345: Argument of type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }' is not assignable to parameter of type 'RegistrationData'.

07:46:03.208   Types of property 'province' are incompatible.

07:46:03.208     Type 'string' is not assignable to type 'SouthAfricanProvince'.

07:46:03.208 src/app/auth/register/page.tsx(205,49): error TS2345: Argument of type '(data: RegisterFormData) => Promise<void>' is not assignable to parameter of type 'SubmitHandler<TFieldValues>'.

07:46:03.208   Types of parameters 'data' and 'data' are incompatible.

07:46:03.208     Type 'TFieldValues' is not assignable to type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }'.

07:46:03.208       Type 'FieldValues' is missing the following properties from type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }': organization\_name, organization\_legal\_name, registration\_number, bee\_level, and 11 more.

07:46:03.208 src/app/auth/register/page.tsx(218,25): error TS2322: Type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.208   The types of '\_options.resolver' are incompatible between these types.

07:46:03.208     Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.208       Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.208         Type 'TFieldValues' is not assignable to type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }'.

07:46:03.208           Type 'FieldValues' is missing the following properties from type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }': organization\_name, organization\_legal\_name, registration\_number, bee\_level, and 11 more.

07:46:03.208 src/app/auth/register/page.tsx(232,25): error TS2322: Type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.208   The types of '\_options.resolver' are incompatible between these types.

07:46:03.208     Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.209       Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.209         Type 'TFieldValues' is not assignable to type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }'.

07:46:03.209           Type 'FieldValues' is missing the following properties from type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }': organization\_name, organization\_legal\_name, registration\_number, bee\_level, and 11 more.

07:46:03.209 src/app/auth/register/page.tsx(246,25): error TS2322: Type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.209   The types of '\_options.resolver' are incompatible between these types.

07:46:03.209     Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.209       Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.209         Type 'TFieldValues' is not assignable to type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }'.

07:46:03.209           Type 'FieldValues' is missing the following properties from type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }': organization\_name, organization\_legal\_name, registration\_number, bee\_level, and 11 more.

07:46:03.209 src/app/auth/register/page.tsx(261,25): error TS2322: Type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.209   The types of '\_options.resolver' are incompatible between these types.

07:46:03.209     Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.209       Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.209         Type 'TFieldValues' is not assignable to type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }'.

07:46:03.209           Type 'FieldValues' is missing the following properties from type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }': organization\_name, organization\_legal\_name, registration\_number, bee\_level, and 11 more.

07:46:03.209 src/app/auth/register/page.tsx(276,25): error TS2322: Type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.209   The types of '\_options.resolver' are incompatible between these types.

07:46:03.210     Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.210       Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.210         Type 'TFieldValues' is not assignable to type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }'.

07:46:03.210           Type 'FieldValues' is missing the following properties from type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }': organization\_name, organization\_legal\_name, registration\_number, bee\_level, and 11 more.

07:46:03.210 src/app/auth/register/page.tsx(301,25): error TS2322: Type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.210   The types of '\_options.resolver' are incompatible between these types.

07:46:03.210     Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.210       Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.210         Type 'TFieldValues' is not assignable to type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }'.

07:46:03.210           Type 'FieldValues' is missing the following properties from type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }': organization\_name, organization\_legal\_name, registration\_number, bee\_level, and 11 more.

07:46:03.210 src/app/auth/register/page.tsx(327,23): error TS2322: Type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.210   The types of '\_options.resolver' are incompatible between these types.

07:46:03.210     Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.210       Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.210         Type 'TFieldValues' is not assignable to type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }'.

07:46:03.210           Type 'FieldValues' is missing the following properties from type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }': organization\_name, organization\_legal\_name, registration\_number, bee\_level, and 11 more.

07:46:03.210 src/app/auth/register/page.tsx(347,25): error TS2322: Type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.210   The types of '\_options.resolver' are incompatible between these types.

07:46:03.211     Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.211       Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.211         Type 'TFieldValues' is not assignable to type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }'.

07:46:03.211           Type 'FieldValues' is missing the following properties from type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }': organization\_name, organization\_legal\_name, registration\_number, bee\_level, and 11 more.

07:46:03.211 src/app/auth/register/page.tsx(361,25): error TS2322: Type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.211   The types of '\_options.resolver' are incompatible between these types.

07:46:03.211     Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.211       Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.211         Type 'TFieldValues' is not assignable to type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }'.

07:46:03.211           Type 'FieldValues' is missing the following properties from type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }': organization\_name, organization\_legal\_name, registration\_number, bee\_level, and 11 more.

07:46:03.211 src/app/auth/register/page.tsx(375,25): error TS2322: Type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.211   The types of '\_options.resolver' are incompatible between these types.

07:46:03.211     Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.211       Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.211         Type 'TFieldValues' is not assignable to type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }'.

07:46:03.211           Type 'FieldValues' is missing the following properties from type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }': organization\_name, organization\_legal\_name, registration\_number, bee\_level, and 11 more.

07:46:03.212 src/app/auth/register/page.tsx(389,25): error TS2322: Type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.212   The types of '\_options.resolver' are incompatible between these types.

07:46:03.212     Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.212       Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.212         Type 'TFieldValues' is not assignable to type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }'.

07:46:03.212           Type 'FieldValues' is missing the following properties from type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }': organization\_name, organization\_legal\_name, registration\_number, bee\_level, and 11 more.

07:46:03.212 src/app/auth/register/page.tsx(404,25): error TS2322: Type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.212   The types of '\_options.resolver' are incompatible between these types.

07:46:03.212     Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.212       Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.212         Type 'TFieldValues' is not assignable to type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }'.

07:46:03.212           Type 'FieldValues' is missing the following properties from type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }': organization\_name, organization\_legal\_name, registration\_number, bee\_level, and 11 more.

07:46:03.212 src/app/auth/register/page.tsx(440,25): error TS2322: Type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.212   The types of '\_options.resolver' are incompatible between these types.

07:46:03.212     Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.212       Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.212         Type 'TFieldValues' is not assignable to type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }'.

07:46:03.213           Type 'FieldValues' is missing the following properties from type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }': organization\_name, organization\_legal\_name, registration\_number, bee\_level, and 11 more.

07:46:03.213 src/app/auth/register/page.tsx(479,23): error TS2322: Type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.213   The types of '\_options.resolver' are incompatible between these types.

07:46:03.213     Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.213       Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.213         Type 'TFieldValues' is not assignable to type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }'.

07:46:03.213           Type 'FieldValues' is missing the following properties from type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }': organization\_name, organization\_legal\_name, registration\_number, bee\_level, and 11 more.

07:46:03.213 src/app/auth/register/page.tsx(494,25): error TS2322: Type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.213   The types of '\_options.resolver' are incompatible between these types.

07:46:03.213     Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.213       Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.213         Type 'TFieldValues' is not assignable to type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }'.

07:46:03.213           Type 'FieldValues' is missing the following properties from type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }': organization\_name, organization\_legal\_name, registration\_number, bee\_level, and 11 more.

07:46:03.213 src/app/auth/register/page.tsx(508,25): error TS2322: Type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.213   The types of '\_options.resolver' are incompatible between these types.

07:46:03.213     Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.213       Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.214         Type 'TFieldValues' is not assignable to type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }'.

07:46:03.214           Type 'FieldValues' is missing the following properties from type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }': organization\_name, organization\_legal\_name, registration\_number, bee\_level, and 11 more.

07:46:03.214 src/app/auth/register/page.tsx(522,25): error TS2322: Type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.214   The types of '\_options.resolver' are incompatible between these types.

07:46:03.214     Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.214       Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.214         Type 'TFieldValues' is not assignable to type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }'.

07:46:03.219           Type 'FieldValues' is missing the following properties from type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }': organization\_name, organization\_legal\_name, registration\_number, bee\_level, and 11 more.

07:46:03.219 src/app/auth/register/page.tsx(547,25): error TS2322: Type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.219   The types of '\_options.resolver' are incompatible between these types.

07:46:03.219     Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.219       Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.219         Type 'TFieldValues' is not assignable to type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }'.

07:46:03.219           Type 'FieldValues' is missing the following properties from type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }': organization\_name, organization\_legal\_name, registration\_number, bee\_level, and 11 more.

07:46:03.219 src/app/auth/register/page.tsx(568,25): error TS2322: Type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.219   The types of '\_options.resolver' are incompatible between these types.

07:46:03.219     Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.219       Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.219         Type 'TFieldValues' is not assignable to type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }'.

07:46:03.219           Type 'FieldValues' is missing the following properties from type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }': organization\_name, organization\_legal\_name, registration\_number, bee\_level, and 11 more.

07:46:03.219 src/app/auth/register/page.tsx(591,25): error TS2322: Type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.219   The types of '\_options.resolver' are incompatible between these types.

07:46:03.219     Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.219       Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.219         Type 'TFieldValues' is not assignable to type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }'.

07:46:03.219           Type 'FieldValues' is missing the following properties from type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }': organization\_name, organization\_legal\_name, registration\_number, bee\_level, and 11 more.

07:46:03.220 src/app/auth/register/page.tsx(614,25): error TS2322: Type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.220   The types of '\_options.resolver' are incompatible between these types.

07:46:03.220     Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.220       Type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }, any, { ...; }>'.

07:46:03.220         Type 'TFieldValues' is not assignable to type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }'.

07:46:03.220           Type 'FieldValues' is missing the following properties from type '{ organization\_name: string; organization\_legal\_name: string; registration\_number: string; bee\_level: number; province: string; industry: string; name: string; email: string; password: string; ... 7 more ...; id\_number?: string | undefined; }': organization\_name, organization\_legal\_name, registration\_number, bee\_level, and 11 more.

07:46:03.220 src/app/auth/two-factor/page.tsx(204,19): error TS2367: This comparison appears to be unintentional because the types '"setup"' and '"complete"' have no overlap.

07:46:03.220 src/app/auth/two-factor/page.tsx(206,20): error TS2367: This comparison appears to be unintentional because the types '"setup" | "verify"' and '"complete"' have no overlap.

07:46:03.220 src/app/auth/verify-email/page.tsx(19,17): error TS18047: 'searchParams' is possibly 'null'.

07:46:03.220 src/app/auth/verify-email/page\_fixed.tsx(17,17): error TS18047: 'searchParams' is possibly 'null'.

07:46:03.220 src/app/invoices/page.tsx(1438,22): error TS2304: Cannot find name 'getMatchingStatusIcon'.

07:46:03.220 src/app/messages/page.tsx(358,64): error TS2339: Property '0' does not exist on type '{ id: string; name: string; type: "image" | "document" | "other"; size: string; url: string; }\[] | undefined'.

07:46:03.220 src/app/nxt-spp/page.tsx(29,21): error TS18047: 'searchParams' is possibly 'null'.

07:46:03.220 src/app/page\_broken.tsx(17,3): error TS2440: Import declaration conflicts with local declaration of 'Home'.

07:46:03.220 src/app/purchase-orders/page.tsx(2156,22): error TS2304: Cannot find name 'getThreeWayMatchIcon'.

07:46:03.220 src/app/suppliers/pricelists/\[id]/promote/page.tsx(12,23): error TS18047: 'params' is possibly 'null'.

07:46:03.220 src/app/suppliers/pricelists/\[id]/promote/page.tsx(13,22): error TS18047: 'searchParams' is possibly 'null'.

07:46:03.220 src/app/suppliers/pricelists/\[id]/promote/page.tsx(14,24): error TS18047: 'searchParams' is possibly 'null'.

07:46:03.220 src/components/ai/ChatInterface.tsx(597,31): error TS2322: Type '"default" | "destructive" | "secondary" | "outline" | "primary"' is not assignable to type '"default" | "link" | "destructive" | "secondary" | "outline" | "ghost" | null | undefined'.

07:46:03.220   Type '"primary"' is not assignable to type '"default" | "link" | "destructive" | "secondary" | "outline" | "ghost" | null | undefined'.

07:46:03.220 src/components/ai/ChatInterfaceV5.tsx(104,15): error TS7006: Parameter 'error' implicitly has an 'any' type.

07:46:03.220 src/components/dashboard/InventoryDashboard.tsx(119,41): error TS2339: Property 'lowStockCount' does not exist on type 'InventoryMetrics'.

07:46:03.220 src/components/dashboard/InventoryDashboard.tsx(120,43): error TS2339: Property 'outOfStockCount' does not exist on type 'InventoryMetrics'.

07:46:03.220 src/components/dashboard/InventoryDashboard.tsx(121,39): error TS2339: Property 'avgTurnover' does not exist on type 'InventoryMetrics'.

07:46:03.220 src/components/dashboard/InventoryDashboard.tsx(122,41): error TS2339: Property 'topCategories' does not exist on type 'InventoryMetrics'.

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(123,43): error TS2339: Property 'recentMovements' does not exist on type 'InventoryMetrics'.

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(126,36): error TS2339: Property 'delivery\_performance\_score' does not exist on type 'DatabaseSupplier'.

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(127,34): error TS2339: Property 'quality\_rating' does not exist on type 'DatabaseSupplier'.

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(132,75): error TS2339: Property 'lowStockCount' does not exist on type 'InventoryMetrics'.

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(132,115): error TS2339: Property 'outOfStockCount' does not exist on type 'InventoryMetrics'.

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(137,37): error TS2339: Property 'lowStockCount' does not exist on type 'InventoryMetrics'.

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(142,37): error TS2339: Property 'outOfStockCount' does not exist on type 'InventoryMetrics'.

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(167,31): error TS2339: Property 'stock\_qty' does not exist on type 'DatabaseInventoryItem'.

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(167,55): error TS2339: Property 'cost\_price' does not exist on type 'DatabaseInventoryItem'.

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(173,13): error TS2339: Property 'stock\_qty' does not exist on type 'DatabaseInventoryItem'.

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(173,38): error TS2551: Property 'reorder\_point' does not exist on type 'DatabaseInventoryItem'. Did you mean 'reorderPoint'?

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(173,67): error TS2339: Property 'stock\_qty' does not exist on type 'DatabaseInventoryItem'.

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(175,56): error TS2339: Property 'stock\_qty' does not exist on type 'DatabaseInventoryItem'.

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(348,68): error TS18046: 'percentage' is of type 'unknown'.

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(392,47): error TS7006: Parameter 'movement' implicitly has an 'any' type.

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(392,57): error TS7006: Parameter 'index' implicitly has an 'any' type.

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(512,47): error TS2339: Property 'stock\_qty' does not exist on type 'DatabaseInventoryItem'.

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(521,47): error TS2339: Property 'stock\_qty' does not exist on type 'DatabaseInventoryItem'.

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(535,27): error TS2339: Property 'stock\_qty' does not exist on type 'DatabaseInventoryItem'.

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(535,52): error TS2551: Property 'reorder\_point' does not exist on type 'DatabaseInventoryItem'. Did you mean 'reorderPoint'?

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(535,81): error TS2339: Property 'stock\_qty' does not exist on type 'DatabaseInventoryItem'.

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(541,42): error TS2339: Property 'stock\_qty' does not exist on type 'DatabaseInventoryItem'.

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(541,75): error TS2551: Property 'reorder\_point' does not exist on type 'DatabaseInventoryItem'. Did you mean 'reorderPoint'?

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(549,47): error TS2339: Property 'stock\_qty' does not exist on type 'DatabaseInventoryItem'.

07:46:03.221 src/components/dashboard/InventoryDashboard.tsx(549,72): error TS2551: Property 'reorder\_point' does not exist on type 'DatabaseInventoryItem'. Did you mean 'reorderPoint'?

07:46:03.222 src/components/dashboard/InventoryDashboard.tsx(549,101): error TS2339: Property 'stock\_qty' does not exist on type 'DatabaseInventoryItem'.

07:46:03.222 src/components/dashboard/RealDataDashboard.tsx(346,38): error TS2339: Property 'data' does not exist on type '{}'.

07:46:03.222 src/components/dashboard/RealDataDashboard.tsx(347,38): error TS2339: Property 'data' does not exist on type '{}'.

07:46:03.222 src/components/dashboard/RealDataDashboard.tsx(348,36): error TS2339: Property 'metrics' does not exist on type '{}'.

07:46:03.222 src/components/dashboard/RealDataDashboard.tsx(352,41): error TS7006: Parameter 's' implicitly has an 'any' type.

07:46:03.222 src/components/dashboard/RealDataDashboard.tsx(353,43): error TS7006: Parameter 's' implicitly has an 'any' type.

07:46:03.222 src/components/dashboard/RealDataDashboard.tsx(355,29): error TS7006: Parameter 'sum' implicitly has an 'any' type.

07:46:03.222 src/components/dashboard/RealDataDashboard.tsx(355,34): error TS7006: Parameter 's' implicitly has an 'any' type.

07:46:03.222 src/components/dashboard/RealDataDashboard.tsx(383,9): error TS18046: 'suppliersData' is of type 'unknown'.

07:46:03.222 src/components/dashboard/RealDataDashboard.tsx(384,9): error TS18046: 'inventoryData' is of type 'unknown'.

07:46:03.222 src/components/dashboard/RealTimeDashboard.tsx(258,65): error TS18046: 'percent' is of type 'unknown'.

07:46:03.222 src/components/dashboard/RealTimeDashboard.tsx(263,53): error TS7006: Parameter 'entry' implicitly has an 'any' type.

07:46:03.222 src/components/dashboard/RealTimeDashboard.tsx(263,60): error TS7006: Parameter 'index' implicitly has an 'any' type.

07:46:03.222 src/components/dashboard/RealTimeDashboard.tsx(272,49): error TS7006: Parameter 'category' implicitly has an 'any' type.

07:46:03.222 src/components/dashboard/RealTimeDashboard.tsx(272,59): error TS7006: Parameter 'index' implicitly has an 'any' type.

07:46:03.222 src/components/examples/ComprehensiveSupplierUI.tsx(8,10): error TS2614: Module '"../products/ProductCatalogGrid"' has no exported member 'ProductCatalogGrid'. Did you mean to use 'import ProductCatalogGrid from "../products/ProductCatalogGrid"' instead?

07:46:03.222 src/components/examples/ComprehensiveSupplierUI.tsx(9,47): error TS2307: Cannot find module '../supplier/EnhancedPricelistUploadWizard' or its corresponding type declarations.

07:46:03.222 src/components/examples/ComprehensiveSupplierUI.tsx(10,10): error TS2724: '"../ui/data-table/EnhancedDataTable"' has no exported member named 'EnhancedDataTable'. Did you mean 'EnhancedDataTableProps'?

07:46:03.222 src/components/examples/ComprehensiveSupplierUI.tsx(11,10): error TS2724: '"../ui/loading/LoadingStates"' has no exported member named 'LoadingStates'. Did you mean 'LoadingState'?

07:46:03.222 src/components/examples/ComprehensiveSupplierUI.tsx(189,7): error TS2322: Type 'string' is not assignable to type '(row: Product) => any'.

07:46:03.222 src/components/examples/ComprehensiveSupplierUI.tsx(198,7): error TS2322: Type 'string' is not assignable to type '(row: Product) => any'.

07:46:03.222 src/components/examples/ComprehensiveSupplierUI.tsx(207,7): error TS2322: Type 'string' is not assignable to type '(row: Product) => any'.

07:46:03.222 src/components/examples/ComprehensiveSupplierUI.tsx(216,7): error TS2322: Type 'string' is not assignable to type '(row: Product) => any'.

07:46:03.222 src/components/examples/ComprehensiveSupplierUI.tsx(225,7): error TS2322: Type 'string' is not assignable to type '(row: Product) => any'.

07:46:03.222 src/components/examples/ComprehensiveSupplierUI.tsx(234,7): error TS2322: Type 'string' is not assignable to type '(row: Product) => any'.

07:46:03.222 src/components/examples/ComprehensiveSupplierUI.tsx(243,7): error TS2322: Type 'string' is not assignable to type '(row: Product) => any'.

07:46:03.223 src/components/examples/ComprehensiveSupplierUI.tsx(253,7): error TS2353: Object literal may only specify known properties, and 'actions' does not exist in type 'ColumnDef<Product>'.

07:46:03.223 src/components/examples/ComprehensiveSupplierUI.tsx(265,7): error TS2322: Type 'string' is not assignable to type '(row: Supplier) => any'.

07:46:03.223 src/components/examples/ComprehensiveSupplierUI.tsx(274,7): error TS2322: Type 'string' is not assignable to type '(row: Supplier) => any'.

07:46:03.223 src/components/examples/ComprehensiveSupplierUI.tsx(283,7): error TS2322: Type 'string' is not assignable to type '(row: Supplier) => any'.

07:46:03.223 src/components/examples/ComprehensiveSupplierUI.tsx(292,7): error TS2322: Type 'string' is not assignable to type '(row: Supplier) => any'.

07:46:03.223 src/components/examples/ComprehensiveSupplierUI.tsx(301,7): error TS2322: Type 'string' is not assignable to type '(row: Supplier) => any'.

07:46:03.223 src/components/examples/ComprehensiveSupplierUI.tsx(310,7): error TS2322: Type 'string' is not assignable to type '(row: Supplier) => any'.

07:46:03.223 src/components/examples/ComprehensiveSupplierUI.tsx(318,7): error TS2322: Type 'string' is not assignable to type '(row: Supplier) => any'.

07:46:03.223 src/components/examples/ComprehensiveSupplierUI.tsx(360,47): error TS2339: Property 'background' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.223 src/components/examples/ComprehensiveSupplierUI.tsx(361,42): error TS2339: Property 'foreground' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.223 src/components/examples/ComprehensiveSupplierUI.tsx(365,47): error TS2339: Property 'card' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.223 src/components/examples/ComprehensiveSupplierUI.tsx(366,60): error TS2339: Property 'border' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.223 src/components/examples/ComprehensiveSupplierUI.tsx(367,45): error TS2339: Property 'lg' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.223 src/components/examples/ComprehensiveSupplierUI.tsx(372,41): error TS2339: Property 'sm' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.223 src/components/examples/ComprehensiveSupplierUI.tsx(373,48): error TS2339: Property 'md' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.223 src/components/examples/ComprehensiveSupplierUI.tsx(379,41): error TS2339: Property 'sm' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.223 src/components/examples/ComprehensiveSupplierUI.tsx(380,45): error TS2339: Property 'sm' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.223 src/components/examples/ComprehensiveSupplierUI.tsx(380,72): error TS2339: Property 'md' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.223 src/components/examples/ComprehensiveSupplierUI.tsx(382,53): error TS2339: Property 'border' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.223 src/components/examples/ComprehensiveSupplierUI.tsx(384,42): error TS2339: Property 'muted' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.223 src/components/examples/ComprehensiveSupplierUI.tsx(392,47): error TS2339: Property 'muted' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.223 src/components/examples/ComprehensiveSupplierUI.tsx(393,42): error TS2339: Property 'foreground' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.223 src/components/examples/ComprehensiveSupplierUI.tsx(397,55): error TS2339: Property 'DEFAULT' does not exist on type '{ readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }'.

07:46:03.223 src/components/examples/ComprehensiveSupplierUI.tsx(398,50): error TS2339: Property 'foreground' does not exist on type '{ readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }'.

07:46:03.224 src/components/examples/ComprehensiveSupplierUI.tsx(399,57): error TS2339: Property 'DEFAULT' does not exist on type '{ readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }'.

07:46:03.224 src/components/examples/ComprehensiveSupplierUI.tsx(403,45): error TS2339: Property 'lg' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.224 src/components/examples/ComprehensiveSupplierUI.tsx(407,51): error TS2339: Property 'lg' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.224 src/components/examples/ComprehensiveSupplierUI.tsx(411,47): error TS2339: Property 'card' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.224 src/components/examples/ComprehensiveSupplierUI.tsx(412,53): error TS2339: Property 'border' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.224 src/components/examples/ComprehensiveSupplierUI.tsx(503,37): error TS7006: Parameter 'product' implicitly has an 'any' type.

07:46:03.224 src/components/examples/ComprehensiveSupplierUI.tsx(504,37): error TS7006: Parameter 'product' implicitly has an 'any' type.

07:46:03.224 src/components/fallbacks/FallbackComponents.tsx(297,5): error TS2322: Type 'unknown' is not assignable to type 'ReactNode'.

07:46:03.224 src/components/fallbacks/FallbackComponents.tsx(310,5): error TS2322: Type 'unknown' is not assignable to type 'ReactNode'.

07:46:03.224 src/components/inventory/AddProductDialog.tsx(40,15): error TS2769: No overload matches this call.

07:46:03.224   Overload 1 of 2, '(values: readonly \["raw\_materials", "components", "finished\_goods", "consumables", "services", "packaging", "tools", "safety\_equipment"], params?: string | { error?: string | $ZodErrorMap<$ZodIssueInvalidValue<unknown>> | undefined; message?: string | undefined; } | undefined): ZodEnum<...>', gave the following error.

07:46:03.224     Object literal may only specify known properties, and 'required\_error' does not exist in type '{ error?: string | $ZodErrorMap<$ZodIssueInvalidValue<unknown>> | undefined; message?: string | undefined; }'.

07:46:03.224   Overload 2 of 2, '(entries: Readonly<Record<string, EnumValue>>, params?: string | { error?: string | $ZodErrorMap<$ZodIssueInvalidValue<unknown>> | undefined; message?: string | undefined; } | undefined): ZodEnum<...>', gave the following error.

07:46:03.224     Argument of type 'string\[]' is not assignable to parameter of type 'Readonly<Record<string, EnumValue>>'.

07:46:03.224       Index signature for type 'string' is missing in type 'string\[]'.

07:46:03.224 src/components/inventory/AddProductDialog.tsx(76,5): error TS2322: Type 'Resolver<{ name: string; category: "services" | "raw\_materials" | "components" | "finished\_goods" | "consumables" | "packaging" | "tools" | "safety\_equipment"; unit\_of\_measure: string; ... 13 more ...; model\_number?: string | undefined; }, any, { ...; }>' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData>'.

07:46:03.224   Types of parameters 'options' and 'options' are incompatible.

07:46:03.224     Type 'ResolverOptions<ProductFormData>' is not assignable to type 'ResolverOptions<{ name: string; category: "services" | "raw\_materials" | "components" | "finished\_goods" | "consumables" | "packaging" | "tools" | "safety\_equipment"; unit\_of\_measure: string; ... 13 more ...; model\_number?: string | undefined; }>'.

07:46:03.224       Type 'unknown' is not assignable to type 'number'.

07:46:03.224 src/components/inventory/AddProductDialog.tsx(137,45): error TS2345: Argument of type '(data: ProductFormData) => Promise<void>' is not assignable to parameter of type 'SubmitHandler<TFieldValues>'.

07:46:03.224   Types of parameters 'data' and 'data' are incompatible.

07:46:03.224     Type 'TFieldValues' is not assignable to type 'ProductFormData'.

07:46:03.224       Type 'FieldValues' is missing the following properties from type 'ProductFormData': name, category, unit\_of\_measure, unit\_cost\_zar, supplier\_id

07:46:03.224 src/components/inventory/AddProductDialog.tsx(144,19): error TS2322: Type 'Control<ProductFormData, any, TFieldValues>' is not assignable to type 'Control<ProductFormData, any, ProductFormData>'.

07:46:03.224   The types of '\_options.resolver' are incompatible between these types.

07:46:03.225     Type 'Resolver<ProductFormData, any, TFieldValues> | undefined' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData> | undefined'.

07:46:03.225       Type 'Resolver<ProductFormData, any, TFieldValues>' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData>'.

07:46:03.225         Type 'TFieldValues' is not assignable to type 'ProductFormData'.

07:46:03.225           Type 'FieldValues' is missing the following properties from type 'ProductFormData': name, category, unit\_of\_measure, unit\_cost\_zar, supplier\_id

07:46:03.225 src/components/inventory/AddProductDialog.tsx(158,19): error TS2322: Type 'Control<ProductFormData, any, TFieldValues>' is not assignable to type 'Control<ProductFormData, any, ProductFormData>'.

07:46:03.225   The types of '\_options.resolver' are incompatible between these types.

07:46:03.225     Type 'Resolver<ProductFormData, any, TFieldValues> | undefined' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData> | undefined'.

07:46:03.225       Type 'Resolver<ProductFormData, any, TFieldValues>' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData>'.

07:46:03.225         Type 'TFieldValues' is not assignable to type 'ProductFormData'.

07:46:03.226           Type 'FieldValues' is missing the following properties from type 'ProductFormData': name, category, unit\_of\_measure, unit\_cost\_zar, supplier\_id

07:46:03.226 src/components/inventory/AddProductDialog.tsx(176,19): error TS2322: Type 'Control<ProductFormData, any, TFieldValues>' is not assignable to type 'Control<ProductFormData, any, ProductFormData>'.

07:46:03.226   The types of '\_options.resolver' are incompatible between these types.

07:46:03.226     Type 'Resolver<ProductFormData, any, TFieldValues> | undefined' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData> | undefined'.

07:46:03.226       Type 'Resolver<ProductFormData, any, TFieldValues>' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData>'.

07:46:03.226         Type 'TFieldValues' is not assignable to type 'ProductFormData'.

07:46:03.226           Type 'FieldValues' is missing the following properties from type 'ProductFormData': name, category, unit\_of\_measure, unit\_cost\_zar, supplier\_id

07:46:03.226 src/components/inventory/AddProductDialog.tsx(201,19): error TS2322: Type 'Control<ProductFormData, any, TFieldValues>' is not assignable to type 'Control<ProductFormData, any, ProductFormData>'.

07:46:03.226   The types of '\_options.resolver' are incompatible between these types.

07:46:03.226     Type 'Resolver<ProductFormData, any, TFieldValues> | undefined' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData> | undefined'.

07:46:03.226       Type 'Resolver<ProductFormData, any, TFieldValues>' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData>'.

07:46:03.226         Type 'TFieldValues' is not assignable to type 'ProductFormData'.

07:46:03.226           Type 'FieldValues' is missing the following properties from type 'ProductFormData': name, category, unit\_of\_measure, unit\_cost\_zar, supplier\_id

07:46:03.226 src/components/inventory/AddProductDialog.tsx(231,19): error TS2322: Type 'Control<ProductFormData, any, TFieldValues>' is not assignable to type 'Control<ProductFormData, any, ProductFormData>'.

07:46:03.226   The types of '\_options.resolver' are incompatible between these types.

07:46:03.226     Type 'Resolver<ProductFormData, any, TFieldValues> | undefined' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData> | undefined'.

07:46:03.226       Type 'Resolver<ProductFormData, any, TFieldValues>' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData>'.

07:46:03.226         Type 'TFieldValues' is not assignable to type 'ProductFormData'.

07:46:03.226           Type 'FieldValues' is missing the following properties from type 'ProductFormData': name, category, unit\_of\_measure, unit\_cost\_zar, supplier\_id

07:46:03.226 src/components/inventory/AddProductDialog.tsx(248,19): error TS2322: Type 'Control<ProductFormData, any, TFieldValues>' is not assignable to type 'Control<ProductFormData, any, ProductFormData>'.

07:46:03.226   The types of '\_options.resolver' are incompatible between these types.

07:46:03.226     Type 'Resolver<ProductFormData, any, TFieldValues> | undefined' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData> | undefined'.

07:46:03.227       Type 'Resolver<ProductFormData, any, TFieldValues>' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData>'.

07:46:03.227         Type 'TFieldValues' is not assignable to type 'ProductFormData'.

07:46:03.227           Type 'FieldValues' is missing the following properties from type 'ProductFormData': name, category, unit\_of\_measure, unit\_cost\_zar, supplier\_id

07:46:03.227 src/components/inventory/AddProductDialog.tsx(262,19): error TS2322: Type 'Control<ProductFormData, any, TFieldValues>' is not assignable to type 'Control<ProductFormData, any, ProductFormData>'.

07:46:03.227   The types of '\_options.resolver' are incompatible between these types.

07:46:03.227     Type 'Resolver<ProductFormData, any, TFieldValues> | undefined' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData> | undefined'.

07:46:03.227       Type 'Resolver<ProductFormData, any, TFieldValues>' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData>'.

07:46:03.227         Type 'TFieldValues' is not assignable to type 'ProductFormData'.

07:46:03.227           Type 'FieldValues' is missing the following properties from type 'ProductFormData': name, category, unit\_of\_measure, unit\_cost\_zar, supplier\_id

07:46:03.227 src/components/inventory/AddProductDialog.tsx(276,19): error TS2322: Type 'Control<ProductFormData, any, TFieldValues>' is not assignable to type 'Control<ProductFormData, any, ProductFormData>'.

07:46:03.227   The types of '\_options.resolver' are incompatible between these types.

07:46:03.227     Type 'Resolver<ProductFormData, any, TFieldValues> | undefined' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData> | undefined'.

07:46:03.227       Type 'Resolver<ProductFormData, any, TFieldValues>' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData>'.

07:46:03.228         Type 'TFieldValues' is not assignable to type 'ProductFormData'.

07:46:03.228           Type 'FieldValues' is missing the following properties from type 'ProductFormData': name, category, unit\_of\_measure, unit\_cost\_zar, supplier\_id

07:46:03.228 src/components/inventory/AddProductDialog.tsx(297,19): error TS2322: Type 'Control<ProductFormData, any, TFieldValues>' is not assignable to type 'Control<ProductFormData, any, ProductFormData>'.

07:46:03.228   The types of '\_options.resolver' are incompatible between these types.

07:46:03.228     Type 'Resolver<ProductFormData, any, TFieldValues> | undefined' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData> | undefined'.

07:46:03.228       Type 'Resolver<ProductFormData, any, TFieldValues>' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData>'.

07:46:03.229         Type 'TFieldValues' is not assignable to type 'ProductFormData'.

07:46:03.229           Type 'FieldValues' is missing the following properties from type 'ProductFormData': name, category, unit\_of\_measure, unit\_cost\_zar, supplier\_id

07:46:03.229 src/components/inventory/AddProductDialog.tsx(316,19): error TS2322: Type 'Control<ProductFormData, any, TFieldValues>' is not assignable to type 'Control<ProductFormData, any, ProductFormData>'.

07:46:03.229   The types of '\_options.resolver' are incompatible between these types.

07:46:03.229     Type 'Resolver<ProductFormData, any, TFieldValues> | undefined' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData> | undefined'.

07:46:03.229       Type 'Resolver<ProductFormData, any, TFieldValues>' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData>'.

07:46:03.229         Type 'TFieldValues' is not assignable to type 'ProductFormData'.

07:46:03.229           Type 'FieldValues' is missing the following properties from type 'ProductFormData': name, category, unit\_of\_measure, unit\_cost\_zar, supplier\_id

07:46:03.229 src/components/inventory/AddProductDialog.tsx(344,19): error TS2322: Type 'Control<ProductFormData, any, TFieldValues>' is not assignable to type 'Control<ProductFormData, any, ProductFormData>'.

07:46:03.229   The types of '\_options.resolver' are incompatible between these types.

07:46:03.229     Type 'Resolver<ProductFormData, any, TFieldValues> | undefined' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData> | undefined'.

07:46:03.229       Type 'Resolver<ProductFormData, any, TFieldValues>' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData>'.

07:46:03.229         Type 'TFieldValues' is not assignable to type 'ProductFormData'.

07:46:03.229           Type 'FieldValues' is missing the following properties from type 'ProductFormData': name, category, unit\_of\_measure, unit\_cost\_zar, supplier\_id

07:46:03.229 src/components/inventory/AddProductDialog.tsx(367,19): error TS2322: Type 'Control<ProductFormData, any, TFieldValues>' is not assignable to type 'Control<ProductFormData, any, ProductFormData>'.

07:46:03.229   The types of '\_options.resolver' are incompatible between these types.

07:46:03.229     Type 'Resolver<ProductFormData, any, TFieldValues> | undefined' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData> | undefined'.

07:46:03.229       Type 'Resolver<ProductFormData, any, TFieldValues>' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData>'.

07:46:03.229         Type 'TFieldValues' is not assignable to type 'ProductFormData'.

07:46:03.229           Type 'FieldValues' is missing the following properties from type 'ProductFormData': name, category, unit\_of\_measure, unit\_cost\_zar, supplier\_id

07:46:03.229 src/components/inventory/AddProductDialog.tsx(386,19): error TS2322: Type 'Control<ProductFormData, any, TFieldValues>' is not assignable to type 'Control<ProductFormData, any, ProductFormData>'.

07:46:03.229   The types of '\_options.resolver' are incompatible between these types.

07:46:03.230     Type 'Resolver<ProductFormData, any, TFieldValues> | undefined' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData> | undefined'.

07:46:03.230       Type 'Resolver<ProductFormData, any, TFieldValues>' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData>'.

07:46:03.230         Type 'TFieldValues' is not assignable to type 'ProductFormData'.

07:46:03.230           Type 'FieldValues' is missing the following properties from type 'ProductFormData': name, category, unit\_of\_measure, unit\_cost\_zar, supplier\_id

07:46:03.230 src/components/inventory/AddProductDialog.tsx(403,19): error TS2322: Type 'Control<ProductFormData, any, TFieldValues>' is not assignable to type 'Control<ProductFormData, any, ProductFormData>'.

07:46:03.230   The types of '\_options.resolver' are incompatible between these types.

07:46:03.230     Type 'Resolver<ProductFormData, any, TFieldValues> | undefined' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData> | undefined'.

07:46:03.230       Type 'Resolver<ProductFormData, any, TFieldValues>' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData>'.

07:46:03.230         Type 'TFieldValues' is not assignable to type 'ProductFormData'.

07:46:03.230           Type 'FieldValues' is missing the following properties from type 'ProductFormData': name, category, unit\_of\_measure, unit\_cost\_zar, supplier\_id

07:46:03.230 src/components/inventory/AddProductDialog.tsx(426,19): error TS2322: Type 'Control<ProductFormData, any, TFieldValues>' is not assignable to type 'Control<ProductFormData, any, ProductFormData>'.

07:46:03.230   The types of '\_options.resolver' are incompatible between these types.

07:46:03.230     Type 'Resolver<ProductFormData, any, TFieldValues> | undefined' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData> | undefined'.

07:46:03.230       Type 'Resolver<ProductFormData, any, TFieldValues>' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData>'.

07:46:03.230         Type 'TFieldValues' is not assignable to type 'ProductFormData'.

07:46:03.230           Type 'FieldValues' is missing the following properties from type 'ProductFormData': name, category, unit\_of\_measure, unit\_cost\_zar, supplier\_id

07:46:03.230 src/components/inventory/AddProductDialog.tsx(440,19): error TS2322: Type 'Control<ProductFormData, any, TFieldValues>' is not assignable to type 'Control<ProductFormData, any, ProductFormData>'.

07:46:03.230   The types of '\_options.resolver' are incompatible between these types.

07:46:03.230     Type 'Resolver<ProductFormData, any, TFieldValues> | undefined' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData> | undefined'.

07:46:03.230       Type 'Resolver<ProductFormData, any, TFieldValues>' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData>'.

07:46:03.230         Type 'TFieldValues' is not assignable to type 'ProductFormData'.

07:46:03.230           Type 'FieldValues' is missing the following properties from type 'ProductFormData': name, category, unit\_of\_measure, unit\_cost\_zar, supplier\_id

07:46:03.230 src/components/inventory/AddProductDialog.tsx(458,19): error TS2322: Type 'Control<ProductFormData, any, TFieldValues>' is not assignable to type 'Control<ProductFormData, any, ProductFormData>'.

07:46:03.231   The types of '\_options.resolver' are incompatible between these types.

07:46:03.231     Type 'Resolver<ProductFormData, any, TFieldValues> | undefined' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData> | undefined'.

07:46:03.231       Type 'Resolver<ProductFormData, any, TFieldValues>' is not assignable to type 'Resolver<ProductFormData, any, ProductFormData>'.

07:46:03.231         Type 'TFieldValues' is not assignable to type 'ProductFormData'.

07:46:03.238           Type 'FieldValues' is missing the following properties from type 'ProductFormData': name, category, unit\_of\_measure, unit\_cost\_zar, supplier\_id

07:46:03.238 src/components/inventory/DetailedInventoryModal.tsx(829,58): error TS2322: Type '{ children: any; variant: "outline"; size: string; className: string; }' is not assignable to type 'IntrinsicAttributes \& ClassAttributes<HTMLSpanElement> \& HTMLAttributes<HTMLSpanElement> \& VariantProps<...> \& { ...; }'.

07:46:03.238   Property 'size' does not exist on type 'IntrinsicAttributes \& ClassAttributes<HTMLSpanElement> \& HTMLAttributes<HTMLSpanElement> \& VariantProps<...> \& { ...; }'.

07:46:03.238 src/components/inventory/EditProductDialog.tsx(40,15): error TS2769: No overload matches this call.

07:46:03.238   Overload 1 of 2, '(values: readonly \["raw\_materials", "components", "finished\_goods", "consumables", "services", "packaging", "tools", "safety\_equipment"], params?: string | { error?: string | $ZodErrorMap<$ZodIssueInvalidValue<unknown>> | undefined; message?: string | undefined; } | undefined): ZodEnum<...>', gave the following error.

07:46:03.238     Object literal may only specify known properties, and 'required\_error' does not exist in type '{ error?: string | $ZodErrorMap<$ZodIssueInvalidValue<unknown>> | undefined; message?: string | undefined; }'.

07:46:03.238   Overload 2 of 2, '(entries: Readonly<Record<string, EnumValue>>, params?: string | { error?: string | $ZodErrorMap<$ZodIssueInvalidValue<unknown>> | undefined; message?: string | undefined; } | undefined): ZodEnum<...>', gave the following error.

07:46:03.238     Argument of type 'string\[]' is not assignable to parameter of type 'Readonly<Record<string, EnumValue>>'.

07:46:03.238       Index signature for type 'string' is missing in type 'string\[]'.

07:46:03.238 src/components/inventory/EditProductDialog.tsx(76,5): error TS2322: Type 'Resolver<{ name?: string | undefined; description?: string | undefined; category?: "services" | "raw\_materials" | "components" | "finished\_goods" | "consumables" | "packaging" | "tools" | "safety\_equipment" | undefined; ... 12 more ...; model\_number?: string | undefined; }, any, { ...; }>' is not assignable to type 'Resolver<Partial<ProductFormData>, any, Partial<ProductFormData>>'.

07:46:03.238   Types of parameters 'options' and 'options' are incompatible.

07:46:03.239     Type 'ResolverOptions<Partial<ProductFormData>>' is not assignable to type 'ResolverOptions<{ name?: string | undefined; description?: string | undefined; category?: "services" | "raw\_materials" | "components" | "finished\_goods" | "consumables" | "packaging" | "tools" | "safety\_equipment" | undefined; ... 12 more ...; model\_number?: string | undefined; }>'.

07:46:03.239       Types of property 'names' are incompatible.

07:46:03.239         Type '(keyof ProductFormData)\[] | undefined' is not assignable to type '("name" | "brand" | "barcode" | "description" | "sku" | "category" | "unit\_of\_measure" | "unit\_cost\_zar" | "lead\_time\_days" | "minimum\_order\_quantity" | "weight\_kg" | "dimensions\_cm" | "shelf\_life\_days" | "storage\_requirements" | "country\_of\_origin" | "model\_number")\[] | undefined'.

07:46:03.239           Type '(keyof ProductFormData)\[]' is not assignable to type '("name" | "brand" | "barcode" | "description" | "sku" | "category" | "unit\_of\_measure" | "unit\_cost\_zar" | "lead\_time\_days" | "minimum\_order\_quantity" | "weight\_kg" | "dimensions\_cm" | "shelf\_life\_days" | "storage\_requirements" | "country\_of\_origin" | "model\_number")\[]'.

07:46:03.239             Type 'keyof ProductFormData' is not assignable to type '"name" | "brand" | "barcode" | "description" | "sku" | "category" | "unit\_of\_measure" | "unit\_cost\_zar" | "lead\_time\_days" | "minimum\_order\_quantity" | "weight\_kg" | "dimensions\_cm" | "shelf\_life\_days" | "storage\_requirements" | "country\_of\_origin" | "model\_number"'.

07:46:03.239               Type '"supplier\_id"' is not assignable to type '"name" | "brand" | "barcode" | "description" | "sku" | "category" | "unit\_of\_measure" | "unit\_cost\_zar" | "lead\_time\_days" | "minimum\_order\_quantity" | "weight\_kg" | "dimensions\_cm" | "shelf\_life\_days" | "storage\_requirements" | "country\_of\_origin" | "model\_number"'.

07:46:03.239 src/components/inventory/EnhancedInventoryDashboard.tsx(265,52): error TS7006: Parameter 'm' implicitly has an 'any' type.

07:46:03.239 src/components/inventory/EnhancedInventoryDashboard.tsx(266,28): error TS2345: Argument of type 'unknown\[]' is not assignable to parameter of type 'SetStateAction<string\[]>'.

07:46:03.239   Type 'unknown\[]' is not assignable to type 'string\[]'.

07:46:03.239     Type 'unknown' is not assignable to type 'string'.

07:46:03.239 src/components/inventory/EnhancedInventoryDashboard.tsx(290,18): error TS2345: Argument of type '{ id: any; sku: any; name: any; description: string; category: any; subcategory: string; currentStock: number; reorderPoint: number; maxStock: number; unitCost: number; unitPrice: number; totalValue: number; ... 7 more ...; movements: never\[]; }\[]' is not assignable to parameter of type 'SetStateAction<InventoryItem\[]>'.

07:46:03.239   Type '{ id: any; sku: any; name: any; description: string; category: any; subcategory: string; currentStock: number; reorderPoint: number; maxStock: number; unitCost: number; unitPrice: number; totalValue: number; ... 7 more ...; movements: never\[]; }\[]' is not assignable to type 'InventoryItem\[]'.

07:46:03.239     Type '{ id: any; sku: any; name: any; description: string; category: any; subcategory: string; currentStock: number; reorderPoint: number; maxStock: number; unitCost: number; unitPrice: number; totalValue: number; ... 7 more ...; movements: never\[]; }' is not assignable to type 'InventoryItem'.

07:46:03.239       Types of property 'velocity' are incompatible.

07:46:03.239         Type 'string' is not assignable to type '"low" | "medium" | "high" | "dead"'.

07:46:03.239 src/components/inventory/EnhancedInventoryDashboard.tsx(318,52): error TS7006: Parameter 'm' implicitly has an 'any' type.

07:46:03.239 src/components/inventory/EnhancedInventoryDashboard.tsx(319,28): error TS2345: Argument of type 'unknown\[]' is not assignable to parameter of type 'SetStateAction<string\[]>'.

07:46:03.239   Type 'unknown\[]' is not assignable to type 'string\[]'.

07:46:03.239     Type 'unknown' is not assignable to type 'string'.

07:46:03.239 src/components/inventory/ErrorBoundary.tsx(100,9): error TS2322: Type 'string | null | undefined' is not assignable to type 'string | undefined'.

07:46:03.239   Type 'null' is not assignable to type 'string | undefined'.

07:46:03.239 src/components/inventory/InventoryChart.tsx(163,60): error TS18046: 'percent' is of type 'unknown'.

07:46:03.239 src/components/inventory/InventoryDetailView.tsx(208,7): error TS2740: Type '{ id: string; inventory\_item\_id: string; movement\_type: "receipt"; quantity: number; unit\_cost\_zar: number; total\_value\_zar: number; reference\_document: string; created\_at: string; notes: string; created\_by: string; }' is missing the following properties from type 'StockMovement': location\_from, location\_to, reason\_code, batch\_number, and 3 more.

07:46:03.239 src/components/inventory/InventoryDetailView.tsx(220,7): error TS2740: Type '{ id: string; inventory\_item\_id: string; movement\_type: "issue"; quantity: number; unit\_cost\_zar: number; total\_value\_zar: number; reference\_document: string; created\_at: string; notes: string; created\_by: string; }' is missing the following properties from type 'StockMovement': location\_from, location\_to, reason\_code, batch\_number, and 3 more.

07:46:03.239 src/components/inventory/InventoryDetailView.tsx(642,64): error TS2322: Type '{ children: string; key: number; variant: "outline"; size: string; }' is not assignable to type 'IntrinsicAttributes \& ClassAttributes<HTMLSpanElement> \& HTMLAttributes<HTMLSpanElement> \& VariantProps<...> \& { ...; }'.

07:46:03.239   Property 'size' does not exist on type 'IntrinsicAttributes \& ClassAttributes<HTMLSpanElement> \& HTMLAttributes<HTMLSpanElement> \& VariantProps<...> \& { ...; }'.

07:46:03.239 src/components/inventory/InventoryDetailView.tsx(1021,28): error TS2304: Cannot find name 'XCircle'.

07:46:03.239 src/components/inventory/InventoryDetailView.tsx(1029,28): error TS2304: Cannot find name 'XCircle'.

07:46:03.239 src/components/inventory/InventoryDetailView.tsx(1037,28): error TS2304: Cannot find name 'XCircle'.

07:46:03.239 src/components/inventory/InventoryDetailView.tsx(1153,23): error TS2304: Cannot find name 'cn'.

07:46:03.239 src/components/inventory/InventoryManagement.tsx(501,54): error TS2322: Type '{ children: any; variant: "outline"; size: string; }' is not assignable to type 'IntrinsicAttributes \& ClassAttributes<HTMLSpanElement> \& HTMLAttributes<HTMLSpanElement> \& VariantProps<...> \& { ...; }'.

07:46:03.239   Property 'size' does not exist on type 'IntrinsicAttributes \& ClassAttributes<HTMLSpanElement> \& HTMLAttributes<HTMLSpanElement> \& VariantProps<...> \& { ...; }'.

07:46:03.239 src/components/inventory/NextJsXlsxConverter.tsx(661,55): error TS2345: Argument of type 'File | null' is not assignable to parameter of type 'File'.

07:46:03.240   Type 'null' is not assignable to type 'File'.

07:46:03.240 src/components/inventory/ProductStockManagement.tsx(57,8): error TS2307: Cannot find module '@/components/ui/command' or its corresponding type declarations.

07:46:03.240 src/components/inventory/ProductStockManagement.tsx(254,9): error TS2561: Object literal may only specify known properties, but 'inventory\_item\_id' does not exist in type '{ inventoryItemId: string; delta: number; reason: string; }'. Did you mean to write 'inventoryItemId'?

07:46:03.240 src/components/inventory/ProductStockManagement.tsx(331,11): error TS2561: Object literal may only specify known properties, but 'inventory\_item\_id' does not exist in type '{ inventoryItemId: string; delta: number; reason: string; }'. Did you mean to write 'inventoryItemId'?

07:46:03.240 src/components/inventory/ProductStockManagement.tsx(605,32): error TS2304: Cannot find name 'Star'.

07:46:03.240 src/components/inventory/StockAdjustmentDialog.tsx(41,22): error TS2769: No overload matches this call.

07:46:03.240   Overload 1 of 2, '(values: readonly \["increase", "decrease"], params?: string | { error?: string | $ZodErrorMap<$ZodIssueInvalidValue<unknown>> | undefined; message?: string | undefined; } | undefined): ZodEnum<...>', gave the following error.

07:46:03.240     Object literal may only specify known properties, and 'required\_error' does not exist in type '{ error?: string | $ZodErrorMap<$ZodIssueInvalidValue<unknown>> | undefined; message?: string | undefined; }'.

07:46:03.240   Overload 2 of 2, '(entries: Readonly<Record<string, EnumValue>>, params?: string | { error?: string | $ZodErrorMap<$ZodIssueInvalidValue<unknown>> | undefined; message?: string | undefined; } | undefined): ZodEnum<...>', gave the following error.

07:46:03.240     Argument of type 'string\[]' is not assignable to parameter of type 'Readonly<Record<string, EnumValue>>'.

07:46:03.240       Index signature for type 'string' is missing in type 'string\[]'.

07:46:03.240 src/components/inventory/StockAdjustmentDialog.tsx(67,5): error TS2322: Type 'Resolver<{ adjustment\_type: "increase" | "decrease"; quantity: unknown; reason\_code: string; notes?: string | undefined; unit\_cost\_zar?: unknown; }, any, { adjustment\_type: "increase" | "decrease"; quantity: number; reason\_code: string; notes?: string | undefined; unit\_cost\_zar?: number | undefined; }>' is not assignable to type 'Resolver<InventoryAdjustmentFormData, any, InventoryAdjustmentFormData>'.

07:46:03.240   Types of parameters 'options' and 'options' are incompatible.

07:46:03.240     Type 'ResolverOptions<InventoryAdjustmentFormData>' is not assignable to type 'ResolverOptions<{ adjustment\_type: "increase" | "decrease"; quantity: unknown; reason\_code: string; notes?: string | undefined; unit\_cost\_zar?: unknown; }>'.

07:46:03.240       Types of property 'names' are incompatible.

07:46:03.240         Type '(keyof InventoryAdjustmentFormData)\[] | undefined' is not assignable to type '("notes" | "quantity" | "unit\_cost\_zar" | "adjustment\_type" | "reason\_code")\[] | undefined'.

07:46:03.240           Type '(keyof InventoryAdjustmentFormData)\[]' is not assignable to type '("notes" | "quantity" | "unit\_cost\_zar" | "adjustment\_type" | "reason\_code")\[]'.

07:46:03.240             Type 'keyof InventoryAdjustmentFormData' is not assignable to type '"notes" | "quantity" | "unit\_cost\_zar" | "adjustment\_type" | "reason\_code"'.

07:46:03.240               Type '"inventory\_item\_id"' is not assignable to type '"notes" | "quantity" | "unit\_cost\_zar" | "adjustment\_type" | "reason\_code"'.

07:46:03.240 src/components/inventory/StockAdjustmentDialog.tsx(90,29): error TS2345: Argument of type 'InventoryAdjustmentFormData' is not assignable to parameter of type '{ inventoryItemId: string; delta: number; reason: string; }'.

07:46:03.240   Type 'InventoryAdjustmentFormData' is missing the following properties from type '{ inventoryItemId: string; delta: number; reason: string; }': inventoryItemId, delta, reason

07:46:03.240 src/components/inventory/StockAdjustmentDialog.tsx(178,45): error TS2345: Argument of type '(data: InventoryAdjustmentFormData) => Promise<void>' is not assignable to parameter of type 'SubmitHandler<TFieldValues>'.

07:46:03.240   Types of parameters 'data' and 'data' are incompatible.

07:46:03.240     Type 'TFieldValues' is not assignable to type 'InventoryAdjustmentFormData'.

07:46:03.240       Type 'FieldValues' is missing the following properties from type 'InventoryAdjustmentFormData': inventory\_item\_id, adjustment\_type, quantity, reason\_code

07:46:03.240 src/components/inventory/StockAdjustmentDialog.tsx(182,19): error TS2322: Type 'Control<InventoryAdjustmentFormData, any, TFieldValues>' is not assignable to type 'Control<InventoryAdjustmentFormData, any, InventoryAdjustmentFormData>'.

07:46:03.240   The types of '\_options.resolver' are incompatible between these types.

07:46:03.241     Type 'Resolver<InventoryAdjustmentFormData, any, TFieldValues> | undefined' is not assignable to type 'Resolver<InventoryAdjustmentFormData, any, InventoryAdjustmentFormData> | undefined'.

07:46:03.241       Type 'Resolver<InventoryAdjustmentFormData, any, TFieldValues>' is not assignable to type 'Resolver<InventoryAdjustmentFormData, any, InventoryAdjustmentFormData>'.

07:46:03.241         Type 'TFieldValues' is not assignable to type 'InventoryAdjustmentFormData'.

07:46:03.241           Type 'FieldValues' is missing the following properties from type 'InventoryAdjustmentFormData': inventory\_item\_id, adjustment\_type, quantity, reason\_code

07:46:03.244 src/components/inventory/StockAdjustmentDialog.tsx(214,19): error TS2322: Type 'Control<InventoryAdjustmentFormData, any, TFieldValues>' is not assignable to type 'Control<InventoryAdjustmentFormData, any, InventoryAdjustmentFormData>'.

07:46:03.244   The types of '\_options.resolver' are incompatible between these types.

07:46:03.244     Type 'Resolver<InventoryAdjustmentFormData, any, TFieldValues> | undefined' is not assignable to type 'Resolver<InventoryAdjustmentFormData, any, InventoryAdjustmentFormData> | undefined'.

07:46:03.244       Type 'Resolver<InventoryAdjustmentFormData, any, TFieldValues>' is not assignable to type 'Resolver<InventoryAdjustmentFormData, any, InventoryAdjustmentFormData>'.

07:46:03.244         Type 'TFieldValues' is not assignable to type 'InventoryAdjustmentFormData'.

07:46:03.244           Type 'FieldValues' is missing the following properties from type 'InventoryAdjustmentFormData': inventory\_item\_id, adjustment\_type, quantity, reason\_code

07:46:03.244 src/components/inventory/StockAdjustmentDialog.tsx(236,19): error TS2322: Type 'Control<InventoryAdjustmentFormData, any, TFieldValues>' is not assignable to type 'Control<InventoryAdjustmentFormData, any, InventoryAdjustmentFormData>'.

07:46:03.244   The types of '\_options.resolver' are incompatible between these types.

07:46:03.244     Type 'Resolver<InventoryAdjustmentFormData, any, TFieldValues> | undefined' is not assignable to type 'Resolver<InventoryAdjustmentFormData, any, InventoryAdjustmentFormData> | undefined'.

07:46:03.244       Type 'Resolver<InventoryAdjustmentFormData, any, TFieldValues>' is not assignable to type 'Resolver<InventoryAdjustmentFormData, any, InventoryAdjustmentFormData>'.

07:46:03.244         Type 'TFieldValues' is not assignable to type 'InventoryAdjustmentFormData'.

07:46:03.244           Type 'FieldValues' is missing the following properties from type 'InventoryAdjustmentFormData': inventory\_item\_id, adjustment\_type, quantity, reason\_code

07:46:03.244 src/components/inventory/StockAdjustmentDialog.tsx(260,19): error TS2322: Type 'Control<InventoryAdjustmentFormData, any, TFieldValues>' is not assignable to type 'Control<InventoryAdjustmentFormData, any, InventoryAdjustmentFormData>'.

07:46:03.244   The types of '\_options.resolver' are incompatible between these types.

07:46:03.244     Type 'Resolver<InventoryAdjustmentFormData, any, TFieldValues> | undefined' is not assignable to type 'Resolver<InventoryAdjustmentFormData, any, InventoryAdjustmentFormData> | undefined'.

07:46:03.244       Type 'Resolver<InventoryAdjustmentFormData, any, TFieldValues>' is not assignable to type 'Resolver<InventoryAdjustmentFormData, any, InventoryAdjustmentFormData>'.

07:46:03.244         Type 'TFieldValues' is not assignable to type 'InventoryAdjustmentFormData'.

07:46:03.244           Type 'FieldValues' is missing the following properties from type 'InventoryAdjustmentFormData': inventory\_item\_id, adjustment\_type, quantity, reason\_code

07:46:03.244 src/components/inventory/StockAdjustmentDialog.tsx(285,19): error TS2322: Type 'Control<InventoryAdjustmentFormData, any, TFieldValues>' is not assignable to type 'Control<InventoryAdjustmentFormData, any, InventoryAdjustmentFormData>'.

07:46:03.244   The types of '\_options.resolver' are incompatible between these types.

07:46:03.244     Type 'Resolver<InventoryAdjustmentFormData, any, TFieldValues> | undefined' is not assignable to type 'Resolver<InventoryAdjustmentFormData, any, InventoryAdjustmentFormData> | undefined'.

07:46:03.244       Type 'Resolver<InventoryAdjustmentFormData, any, TFieldValues>' is not assignable to type 'Resolver<InventoryAdjustmentFormData, any, InventoryAdjustmentFormData>'.

07:46:03.244         Type 'TFieldValues' is not assignable to type 'InventoryAdjustmentFormData'.

07:46:03.244           Type 'FieldValues' is missing the following properties from type 'InventoryAdjustmentFormData': inventory\_item\_id, adjustment\_type, quantity, reason\_code

07:46:03.244 src/components/inventory/StockAlertSystem.tsx(68,3): error TS2305: Module '"lucide-react"' has no exported member 'Warning'.

07:46:03.244 src/components/inventory/SupplierInventoryView.tsx(12,10): error TS2440: Import declaration conflicts with local declaration of 'Skeleton'.

07:46:03.244 src/components/inventory/SupplierInventoryView.tsx(13,10): error TS2440: Import declaration conflicts with local declaration of 'Alert'.

07:46:03.245 src/components/inventory/SupplierInventoryView.tsx(13,17): error TS2440: Import declaration conflicts with local declaration of 'AlertDescription'.

07:46:03.245 src/components/inventory/UploadFeedbackSystem.tsx(10,69): error TS2307: Cannot find module '@/components/ui/collapsible' or its corresponding type declarations.

07:46:03.245 src/components/layout/SelfContainedLayout.tsx(164,12): error TS18047: 'pathname' is possibly 'null'.

07:46:03.245 src/components/purchase-orders/BulkOperations.tsx(634,67): error TS2304: Cannot find name 'getStatusColor'.

07:46:03.245 src/components/purchase-orders/PurchaseOrdersManagement.tsx(63,28): error TS2307: Cannot find module './PODetailsModal' or its corresponding type declarations.

07:46:03.245 src/components/purchase-orders/PurchaseOrdersManagement.tsx(67,29): error TS2307: Cannot find module './CurrencyManager' or its corresponding type declarations.

07:46:03.245 src/components/purchase-orders/PurchaseOrdersManagement.tsx(759,9): error TS2322: Type 'DatabasePurchaseOrder\[]' is not assignable to type 'PurchaseOrder\[]'.

07:46:03.245   Type 'DatabasePurchaseOrder' is missing the following properties from type 'PurchaseOrder': poNumber, supplierId, supplierName, priority, and 15 more.

07:46:03.245 src/components/spp/AnimatedComponents.tsx(8,22): error TS7016: Could not find a declaration file for module 'canvas-confetti'. '/vercel/path0/node\_modules/canvas-confetti/src/confetti.js' implicitly has an 'any' type.

07:46:03.245   Try `npm i --save-dev @types/canvas-confetti` if it exists or add a new declaration (.d.ts) file containing `declare module 'canvas-confetti';`

07:46:03.245 src/components/spp/MetricsDashboard.tsx(153,9): error TS2322: Type 'Element' is not assignable to type 'string'.

07:46:03.245 src/components/supplier-portfolio/EnhancedPricelistUpload.tsx(349,39): error TS2339: Property 'id' does not exist on type 'Supplier'.

07:46:03.245 src/components/supplier-portfolio/EnhancedPricelistUpload.tsx(350,41): error TS2339: Property 'id' does not exist on type 'Supplier'.

07:46:03.245 src/components/supplier-portfolio/ISSohReports.tsx(271,32): error TS2339: Property 'metrics' does not exist on type 'InventorySelection'.

07:46:03.245 src/components/supplier-portfolio/ISSohReports.tsx(273,37): error TS2339: Property 'metrics' does not exist on type 'InventorySelection'.

07:46:03.245 src/components/supplier-portfolio/ISSohReports.tsx(273,88): error TS2339: Property 'metrics' does not exist on type 'InventorySelection'.

07:46:03.245 src/components/supplier-portfolio/ISSohReports.tsx(577,38): error TS18046: 'percent' is of type 'unknown'.

07:46:03.245 src/components/supplier-portfolio/PortfolioDashboard.tsx(360,80): error TS2345: Argument of type 'boolean' is not assignable to parameter of type 'string'.

07:46:03.245 src/components/supplier-portfolio/SupplierProductDataTable.tsx(691,36): error TS18048: 'product.price\_change\_percent' is possibly 'undefined'.

07:46:03.245 src/components/supplier-portfolio/SupplierProductDataTable.tsx(692,36): error TS18048: 'product.price\_change\_percent' is possibly 'undefined'.

07:46:03.245 src/components/supplier/EnhancedSupplierForm.tsx(94,5): error TS2322: Type 'Resolver<{ name: string; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; address?: string | undefined; city?: string | undefined; ... 16 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.245   Types of parameters 'options' and 'options' are incompatible.

07:46:03.245     Type 'ResolverOptions<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }>' is not assignable to type 'ResolverOptions<{ name: string; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; address?: string | undefined; city?: string | undefined; ... 16 more ...; discovery\_sources?: string\[] | undefined; }>'.

07:46:03.245       Type 'string | undefined' is not assignable to type 'string'.

07:46:03.245         Type 'undefined' is not assignable to type 'string'.

07:46:03.245 src/components/supplier/EnhancedSupplierForm.tsx(213,43): error TS2345: Argument of type '(data: SupplierFormValues) => Promise<void>' is not assignable to parameter of type 'SubmitHandler<TFieldValues>'.

07:46:03.245   Types of parameters 'data' and 'data' are incompatible.

07:46:03.245     Type 'TFieldValues' is not assignable to type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }'.

07:46:03.245       Type 'FieldValues' is missing the following properties from type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }': name, country, preferred\_supplier, ai\_discovered

07:46:03.245 src/components/supplier/EnhancedSupplierForm.tsx(239,23): error TS2322: Type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.245   The types of '\_options.resolver' are incompatible between these types.

07:46:03.246     Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }> | undefined'.

07:46:03.246       Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.246         Type 'TFieldValues' is not assignable to type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }'.

07:46:03.246           Type 'FieldValues' is missing the following properties from type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }': name, country, preferred\_supplier, ai\_discovered

07:46:03.246 src/components/supplier/EnhancedSupplierForm.tsx(253,23): error TS2322: Type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.246   The types of '\_options.resolver' are incompatible between these types.

07:46:03.246     Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }> | undefined'.

07:46:03.246       Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.246         Type 'TFieldValues' is not assignable to type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }'.

07:46:03.246           Type 'FieldValues' is missing the following properties from type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }': name, country, preferred\_supplier, ai\_discovered

07:46:03.246 src/components/supplier/EnhancedSupplierForm.tsx(267,23): error TS2322: Type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.246   The types of '\_options.resolver' are incompatible between these types.

07:46:03.246     Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }> | undefined'.

07:46:03.246       Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.246         Type 'TFieldValues' is not assignable to type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }'.

07:46:03.246           Type 'FieldValues' is missing the following properties from type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }': name, country, preferred\_supplier, ai\_discovered

07:46:03.246 src/components/supplier/EnhancedSupplierForm.tsx(281,23): error TS2322: Type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.246   The types of '\_options.resolver' are incompatible between these types.

07:46:03.246     Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }> | undefined'.

07:46:03.246       Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.246         Type 'TFieldValues' is not assignable to type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }'.

07:46:03.246           Type 'FieldValues' is missing the following properties from type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }': name, country, preferred\_supplier, ai\_discovered

07:46:03.246 src/components/supplier/EnhancedSupplierForm.tsx(296,21): error TS2322: Type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.246   The types of '\_options.resolver' are incompatible between these types.

07:46:03.246     Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }> | undefined'.

07:46:03.246       Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.246         Type 'TFieldValues' is not assignable to type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }'.

07:46:03.246           Type 'FieldValues' is missing the following properties from type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }': name, country, preferred\_supplier, ai\_discovered

07:46:03.246 src/components/supplier/EnhancedSupplierForm.tsx(331,23): error TS2322: Type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.246   The types of '\_options.resolver' are incompatible between these types.

07:46:03.246     Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }> | undefined'.

07:46:03.246       Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.246         Type 'TFieldValues' is not assignable to type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }'.

07:46:03.247           Type 'FieldValues' is missing the following properties from type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }': name, country, preferred\_supplier, ai\_discovered

07:46:03.247 src/components/supplier/EnhancedSupplierForm.tsx(345,23): error TS2322: Type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.247   The types of '\_options.resolver' are incompatible between these types.

07:46:03.247     Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }> | undefined'.

07:46:03.247       Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.247         Type 'TFieldValues' is not assignable to type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }'.

07:46:03.247           Type 'FieldValues' is missing the following properties from type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }': name, country, preferred\_supplier, ai\_discovered

07:46:03.247 src/components/supplier/EnhancedSupplierForm.tsx(359,23): error TS2322: Type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.247   The types of '\_options.resolver' are incompatible between these types.

07:46:03.247     Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }> | undefined'.

07:46:03.247       Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.247         Type 'TFieldValues' is not assignable to type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }'.

07:46:03.247           Type 'FieldValues' is missing the following properties from type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }': name, country, preferred\_supplier, ai\_discovered

07:46:03.247 src/components/supplier/EnhancedSupplierForm.tsx(373,23): error TS2322: Type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.247   The types of '\_options.resolver' are incompatible between these types.

07:46:03.247     Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }> | undefined'.

07:46:03.247       Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.247         Type 'TFieldValues' is not assignable to type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }'.

07:46:03.247           Type 'FieldValues' is missing the following properties from type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }': name, country, preferred\_supplier, ai\_discovered

07:46:03.247 src/components/supplier/EnhancedSupplierForm.tsx(396,23): error TS2322: Type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.247   The types of '\_options.resolver' are incompatible between these types.

07:46:03.247     Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }> | undefined'.

07:46:03.247       Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.247         Type 'TFieldValues' is not assignable to type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }'.

07:46:03.247           Type 'FieldValues' is missing the following properties from type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }': name, country, preferred\_supplier, ai\_discovered

07:46:03.247 src/components/supplier/EnhancedSupplierForm.tsx(411,25): error TS2322: Type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.247   The types of '\_options.resolver' are incompatible between these types.

07:46:03.247     Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }> | undefined'.

07:46:03.247       Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.247         Type 'TFieldValues' is not assignable to type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }'.

07:46:03.247           Type 'FieldValues' is missing the following properties from type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }': name, country, preferred\_supplier, ai\_discovered

07:46:03.247 src/components/supplier/EnhancedSupplierForm.tsx(425,25): error TS2322: Type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.247   The types of '\_options.resolver' are incompatible between these types.

07:46:03.247     Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }> | undefined'.

07:46:03.247       Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.247         Type 'TFieldValues' is not assignable to type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }'.

07:46:03.247           Type 'FieldValues' is missing the following properties from type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }': name, country, preferred\_supplier, ai\_discovered

07:46:03.247 src/components/supplier/EnhancedSupplierForm.tsx(454,25): error TS2322: Type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.248   The types of '\_options.resolver' are incompatible between these types.

07:46:03.248     Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }> | undefined'.

07:46:03.248       Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.248         Type 'TFieldValues' is not assignable to type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }'.

07:46:03.248           Type 'FieldValues' is missing the following properties from type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }': name, country, preferred\_supplier, ai\_discovered

07:46:03.248 src/components/supplier/EnhancedSupplierForm.tsx(484,23): error TS2322: Type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.248   The types of '\_options.resolver' are incompatible between these types.

07:46:03.248     Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }> | undefined'.

07:46:03.248       Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.248         Type 'TFieldValues' is not assignable to type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }'.

07:46:03.248           Type 'FieldValues' is missing the following properties from type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }': name, country, preferred\_supplier, ai\_discovered

07:46:03.248 src/components/supplier/EnhancedSupplierForm.tsx(498,23): error TS2322: Type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.248   The types of '\_options.resolver' are incompatible between these types.

07:46:03.248     Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }> | undefined'.

07:46:03.248       Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.248         Type 'TFieldValues' is not assignable to type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }'.

07:46:03.248           Type 'FieldValues' is missing the following properties from type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }': name, country, preferred\_supplier, ai\_discovered

07:46:03.250 src/components/supplier/EnhancedSupplierForm.tsx(512,23): error TS2322: Type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.250   The types of '\_options.resolver' are incompatible between these types.

07:46:03.250     Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }> | undefined'.

07:46:03.250       Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.250         Type 'TFieldValues' is not assignable to type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }'.

07:46:03.250           Type 'FieldValues' is missing the following properties from type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }': name, country, preferred\_supplier, ai\_discovered

07:46:03.251 src/components/supplier/EnhancedSupplierForm.tsx(539,23): error TS2322: Type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.251   The types of '\_options.resolver' are incompatible between these types.

07:46:03.251     Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }> | undefined'.

07:46:03.251       Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.251         Type 'TFieldValues' is not assignable to type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }'.

07:46:03.251           Type 'FieldValues' is missing the following properties from type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }': name, country, preferred\_supplier, ai\_discovered

07:46:03.251 src/components/supplier/EnhancedSupplierForm.tsx(568,23): error TS2322: Type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.251   The types of '\_options.resolver' are incompatible between these types.

07:46:03.251     Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }> | undefined'.

07:46:03.251       Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.251         Type 'TFieldValues' is not assignable to type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }'.

07:46:03.251           Type 'FieldValues' is missing the following properties from type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }': name, country, preferred\_supplier, ai\_discovered

07:46:03.251 src/components/supplier/EnhancedSupplierForm.tsx(597,23): error TS2322: Type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.251   The types of '\_options.resolver' are incompatible between these types.

07:46:03.251     Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }> | undefined'.

07:46:03.252       Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.252         Type 'TFieldValues' is not assignable to type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }'.

07:46:03.252           Type 'FieldValues' is missing the following properties from type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }': name, country, preferred\_supplier, ai\_discovered

07:46:03.252 src/components/supplier/EnhancedSupplierForm.tsx(618,23): error TS2322: Type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.252   The types of '\_options.resolver' are incompatible between these types.

07:46:03.252     Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }> | undefined'.

07:46:03.252       Type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }, any, { ...; }>'.

07:46:03.252         Type 'TFieldValues' is not assignable to type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }'.

07:46:03.252           Type 'FieldValues' is missing the following properties from type '{ name: string; country: string; preferred\_supplier: boolean; ai\_discovered: boolean; legal\_name?: string | undefined; email?: string | undefined; phone?: string | undefined; website?: string | undefined; ... 15 more ...; discovery\_sources?: string\[] | undefined; }': name, country, preferred\_supplier, ai\_discovered

07:46:03.252 src/components/supplier/SupplierDashboard.tsx(41,3): error TS2741: Property 'name' is missing in type '{ id: string; code: string; status: "active"; tier: "strategic"; category: string; tags: string\[]; contacts: { id: string; type: "primary"; name: string; title: string; email: string; phone: string; isPrimary: true; isActive: true; }\[]; ... 8 more ...; lastContactDate: Date; }' but required in type 'Supplier'.

07:46:03.252 src/components/supplier/SupplierDashboard.tsx(121,3): error TS2741: Property 'name' is missing in type '{ id: string; code: string; status: "active"; tier: "preferred"; category: string; tags: string\[]; contacts: { id: string; type: "primary"; name: string; title: string; email: string; phone: string; isPrimary: true; isActive: true; }\[]; ... 8 more ...; lastContactDate: Date; }' but required in type 'Supplier'.

07:46:03.252 src/components/suppliers/AIEnhancedSupplierDashboard.tsx(349,19): error TS2322: Type '(recommendation: AISupplierRecommendation) => void' is not assignable to type '(supplier: AISupplierRecommendation) => void'.

07:46:03.252   Types of parameters 'recommendation' and 'supplier' are incompatible.

07:46:03.252     Type 'AISupplierRecommendation' is missing the following properties from type 'AISupplierRecommendation': generatedAt, lastUpdated, dataSourcesUsed, algorithmVersion

07:46:03.252 src/components/suppliers/AIEnhancedSupplierDashboard.tsx(350,19): error TS2322: Type '(insight: AISupplierInsight, action: string) => Promise<void>' is not assignable to type '(insight: AISupplierInsight, action: string) => void'.

07:46:03.252   Types of parameters 'insight' and 'insight' are incompatible.

07:46:03.252     Type 'AISupplierInsight' is missing the following properties from type 'AISupplierInsight': category, details, urgency, evidencePoints, and 4 more.

07:46:03.252 src/components/suppliers/AIEnhancedSupplierDashboard.tsx(363,19): error TS2322: Type '(insight: AISupplierInsight, action: string) => Promise<void>' is not assignable to type '(insight: AIInsightCard, action: string) => void'.

07:46:03.253   Types of parameters 'insight' and 'insight' are incompatible.

07:46:03.253     Type 'AIInsightCard' is missing the following properties from type 'AISupplierInsight': category, description, evidencePoints, actionable, and 4 more.

07:46:03.253 src/components/suppliers/EnhancedSupplierDashboard.tsx(373,24): error TS2339: Property 'code' does not exist on type 'DatabaseSupplier'.

07:46:03.253 src/components/suppliers/EnhancedSupplierDashboard.tsx(375,29): error TS2339: Property 'businessInfo' does not exist on type 'DatabaseSupplier'.

07:46:03.253 src/components/suppliers/EnhancedSupplierDashboard.tsx(376,27): error TS2339: Property 'businessInfo' does not exist on type 'DatabaseSupplier'.

07:46:03.253 src/components/suppliers/EnhancedSupplierDashboard.tsx(377,28): error TS2339: Property 'category' does not exist on type 'DatabaseSupplier'.

07:46:03.253 src/components/suppliers/EnhancedSupplierDashboard.tsx(378,24): error TS2339: Property 'tier' does not exist on type 'DatabaseSupplier'.

07:46:03.253 src/components/suppliers/EnhancedSupplierDashboard.tsx(382,26): error TS2339: Property 'contacts' does not exist on type 'DatabaseSupplier'.

07:46:03.253 src/components/suppliers/EnhancedSupplierDashboard.tsx(383,27): error TS2339: Property 'contacts' does not exist on type 'DatabaseSupplier'.

07:46:03.253 src/components/suppliers/EnhancedSupplierDashboard.tsx(384,27): error TS2339: Property 'contacts' does not exist on type 'DatabaseSupplier'.

07:46:03.253 src/components/suppliers/EnhancedSupplierDashboard.tsx(385,26): error TS2339: Property 'contacts' does not exist on type 'DatabaseSupplier'.

07:46:03.253 src/components/suppliers/EnhancedSupplierDashboard.tsx(387,29): error TS2339: Property 'businessInfo' does not exist on type 'DatabaseSupplier'.

07:46:03.253 src/components/suppliers/EnhancedSupplierDashboard.tsx(388,38): error TS2339: Property 'businessInfo' does not exist on type 'DatabaseSupplier'.

07:46:03.253 src/components/suppliers/EnhancedSupplierDashboard.tsx(389,32): error TS2339: Property 'financial' does not exist on type 'DatabaseSupplier'.

07:46:03.253 src/components/suppliers/EnhancedSupplierDashboard.tsx(390,28): error TS2339: Property 'financial' does not exist on type 'DatabaseSupplier'.

07:46:03.253 src/components/suppliers/EnhancedSupplierDashboard.tsx(391,24): error TS2339: Property 'tags' does not exist on type 'DatabaseSupplier'.

07:46:03.253 src/components/suppliers/EnhancedSupplierDashboard.tsx(392,25): error TS2339: Property 'notes' does not exist on type 'DatabaseSupplier'.

07:46:03.253 src/components/suppliers/EnhancedSupplierDashboard.tsx(393,29): error TS2551: Property 'createdAt' does not exist on type 'DatabaseSupplier'. Did you mean 'created\_at'?

07:46:03.254 src/components/suppliers/EnhancedSupplierDashboard.tsx(394,29): error TS2551: Property 'updatedAt' does not exist on type 'DatabaseSupplier'. Did you mean 'updated\_at'?

07:46:03.254 src/components/suppliers/EnhancedSupplierDashboard.tsx(582,14): error TS2304: Cannot find name 'Brain'.

07:46:03.254 src/components/suppliers/EnhancedSupplierDashboard.tsx(586,14): error TS2304: Cannot find name 'Sparkles'.

07:46:03.254 src/components/suppliers/EnhancedSupplierDashboard.tsx(1146,24): error TS2552: Cannot find name 'User'. Did you mean 'Users'?

07:46:03.254 src/components/suppliers/EnhancedSupplierForm.tsx(167,9): error TS2739: Type '{ legalName: string; tradingName: string; website: string; currency: string; foundedYear: number; employeeCount: number; }' is missing the following properties from type '{ legalName: string; taxId: string; registrationNumber: string; currency: string; tradingName?: string | undefined; website?: string | undefined; foundedYear?: number | undefined; employeeCount?: number | undefined; annualRevenue?: number | undefined; }': taxId, registrationNumber

07:46:03.254 src/components/suppliers/EnhancedSupplierForm.tsx(335,5): error TS2322: Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; businessInfo: { ...; }; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.254   Types of parameters 'options' and 'options' are incompatible.

07:46:03.254     Type 'ResolverOptions<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }>' is not assignable to type 'ResolverOptions<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; businessInfo: { ...; }; ... 7 more ...; notes?: string | undefined; }>'.

07:46:03.254       Type 'string\[] | undefined' is not assignable to type 'string\[]'.

07:46:03.254         Type 'undefined' is not assignable to type 'string\[]'.

07:46:03.254 src/components/suppliers/EnhancedSupplierForm.tsx(586,42): error TS2345: Argument of type '(data: SupplierFormData) => Promise<void>' is not assignable to parameter of type 'SubmitHandler<TFieldValues>'.

07:46:03.254   Types of parameters 'data' and 'data' are incompatible.

07:46:03.255     Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.255       Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.255 src/components/suppliers/EnhancedSupplierForm.tsx(632,45): error TS2345: Argument of type '(data: SupplierFormData) => Promise<void>' is not assignable to parameter of type 'SubmitHandler<TFieldValues>'.

07:46:03.255   Types of parameters 'data' and 'data' are incompatible.

07:46:03.255     Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.255       Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.255 src/components/suppliers/EnhancedSupplierForm.tsx(654,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.255   The types of '\_options.resolver' are incompatible between these types.

07:46:03.255     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.255       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.255         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.255           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.255 src/components/suppliers/EnhancedSupplierForm.tsx(679,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.255   The types of '\_options.resolver' are incompatible between these types.

07:46:03.256     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.256       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.256         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.256           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.256 src/components/suppliers/EnhancedSupplierForm.tsx(704,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.256   The types of '\_options.resolver' are incompatible between these types.

07:46:03.256     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.256       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.256         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.256           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.256 src/components/suppliers/EnhancedSupplierForm.tsx(735,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.256   The types of '\_options.resolver' are incompatible between these types.

07:46:03.256     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.256       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.256         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.256           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.256 src/components/suppliers/EnhancedSupplierForm.tsx(766,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.257   The types of '\_options.resolver' are incompatible between these types.

07:46:03.257     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.257       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.257         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.257           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.257 src/components/suppliers/EnhancedSupplierForm.tsx(800,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.257   The types of '\_options.resolver' are incompatible between these types.

07:46:03.257     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.257       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.257         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.257           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.257 src/components/suppliers/EnhancedSupplierForm.tsx(871,23): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.257   The types of '\_options.resolver' are incompatible between these types.

07:46:03.257     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.257       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.257         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.258           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.258 src/components/suppliers/EnhancedSupplierForm.tsx(912,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.258   The types of '\_options.resolver' are incompatible between these types.

07:46:03.258     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.258       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.258         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.258           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.258 src/components/suppliers/EnhancedSupplierForm.tsx(937,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.258   The types of '\_options.resolver' are incompatible between these types.

07:46:03.258     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.258       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.258         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.258           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.258 src/components/suppliers/EnhancedSupplierForm.tsx(963,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.258   The types of '\_options.resolver' are incompatible between these types.

07:46:03.258     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.259       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.259         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.259           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.259 src/components/suppliers/EnhancedSupplierForm.tsx(988,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.259   The types of '\_options.resolver' are incompatible between these types.

07:46:03.259     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.259       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.260         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.260           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.260 src/components/suppliers/EnhancedSupplierForm.tsx(1013,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.260   The types of '\_options.resolver' are incompatible between these types.

07:46:03.260     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.260       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.260         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.260           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.260 src/components/suppliers/EnhancedSupplierForm.tsx(1038,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.260   The types of '\_options.resolver' are incompatible between these types.

07:46:03.260     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.261       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.261         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.261           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.261 src/components/suppliers/EnhancedSupplierForm.tsx(1065,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.261   The types of '\_options.resolver' are incompatible between these types.

07:46:03.261     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.261       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.261         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.261           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.261 src/components/suppliers/EnhancedSupplierForm.tsx(1092,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.261   The types of '\_options.resolver' are incompatible between these types.

07:46:03.261     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.261       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.261         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.261           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.261 src/components/suppliers/EnhancedSupplierForm.tsx(1168,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.261   The types of '\_options.resolver' are incompatible between these types.

07:46:03.262     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.262       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.262         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.262           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.262 src/components/suppliers/EnhancedSupplierForm.tsx(1193,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.262   The types of '\_options.resolver' are incompatible between these types.

07:46:03.262     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.262       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.262         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.262           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.262 src/components/suppliers/EnhancedSupplierForm.tsx(1211,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.262   The types of '\_options.resolver' are incompatible between these types.

07:46:03.262     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.262       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.262         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.262           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.263 src/components/suppliers/EnhancedSupplierForm.tsx(1229,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.263   The types of '\_options.resolver' are incompatible between these types.

07:46:03.263     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.263       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.263         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.263           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.263 src/components/suppliers/EnhancedSupplierForm.tsx(1248,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.263   The types of '\_options.resolver' are incompatible between these types.

07:46:03.263     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.263       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.263         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.263           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.263 src/components/suppliers/EnhancedSupplierForm.tsx(1267,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.263   The types of '\_options.resolver' are incompatible between these types.

07:46:03.263     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.263       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.263         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.264           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.279 src/components/suppliers/EnhancedSupplierForm.tsx(1285,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.279   The types of '\_options.resolver' are incompatible between these types.

07:46:03.279     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.279       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.279         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.279           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.279 src/components/suppliers/EnhancedSupplierForm.tsx(1306,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.280   The types of '\_options.resolver' are incompatible between these types.

07:46:03.280     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.286       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.287         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.287           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.287 src/components/suppliers/EnhancedSupplierForm.tsx(1325,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.287   The types of '\_options.resolver' are incompatible between these types.

07:46:03.287     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.287       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.287         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.287           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.287 src/components/suppliers/EnhancedSupplierForm.tsx(1390,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.287   The types of '\_options.resolver' are incompatible between these types.

07:46:03.287     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.287       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.288         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.296           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.297 src/components/suppliers/EnhancedSupplierForm.tsx(1415,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.297   The types of '\_options.resolver' are incompatible between these types.

07:46:03.297     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.297       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.297         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.297           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.306 src/components/suppliers/EnhancedSupplierForm.tsx(1434,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.307   The types of '\_options.resolver' are incompatible between these types.

07:46:03.307     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.307       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.307         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.307           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.307 src/components/suppliers/EnhancedSupplierForm.tsx(1452,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.307   The types of '\_options.resolver' are incompatible between these types.

07:46:03.307     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.307       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.307         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.307           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.307 src/components/suppliers/EnhancedSupplierForm.tsx(1471,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.308   The types of '\_options.resolver' are incompatible between these types.

07:46:03.308     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.308       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.308         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.308           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.308 src/components/suppliers/EnhancedSupplierForm.tsx(1489,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.308   The types of '\_options.resolver' are incompatible between these types.

07:46:03.308     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.308       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.308         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.308           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.308 src/components/suppliers/EnhancedSupplierForm.tsx(1507,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.308   The types of '\_options.resolver' are incompatible between these types.

07:46:03.308     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.308       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.308         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.309           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.309 src/components/suppliers/EnhancedSupplierForm.tsx(1525,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.309   The types of '\_options.resolver' are incompatible between these types.

07:46:03.309     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.309       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.309         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.309           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.309 src/components/suppliers/EnhancedSupplierForm.tsx(1555,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.309   The types of '\_options.resolver' are incompatible between these types.

07:46:03.309     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.309       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.309         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.309           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.309 src/components/suppliers/EnhancedSupplierForm.tsx(1574,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.309   The types of '\_options.resolver' are incompatible between these types.

07:46:03.309     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.310       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.310         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.310           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.310 src/components/suppliers/EnhancedSupplierForm.tsx(1696,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.310   The types of '\_options.resolver' are incompatible between these types.

07:46:03.310     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.310       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.310         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.310           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.310 src/components/suppliers/EnhancedSupplierForm.tsx(1723,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.310   The types of '\_options.resolver' are incompatible between these types.

07:46:03.310     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.310       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.310         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.310           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.310 src/components/suppliers/EnhancedSupplierForm.tsx(1757,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.311   The types of '\_options.resolver' are incompatible between these types.

07:46:03.311     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.311       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.311         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.311           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.311 src/components/suppliers/EnhancedSupplierForm.tsx(1791,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.311   The types of '\_options.resolver' are incompatible between these types.

07:46:03.311     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.311       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.311         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.311           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.311 src/components/suppliers/SupplierDirectory.tsx(153,62): error TS2353: Object literal may only specify known properties, and 'issuer' does not exist in type 'Certification'.

07:46:03.311 src/components/suppliers/SupplierDirectory.tsx(229,60): error TS2353: Object literal may only specify known properties, and 'issuer' does not exist in type 'Certification'.

07:46:03.311 src/components/suppliers/SupplierDirectory.tsx(305,60): error TS2353: Object literal may only specify known properties, and 'issuer' does not exist in type 'Certification'.

07:46:03.311 src/components/suppliers/SupplierForm.tsx(152,5): error TS2322: Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; businessInfo: { ...; }; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.312   Types of parameters 'options' and 'options' are incompatible.

07:46:03.312     Type 'ResolverOptions<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }>' is not assignable to type 'ResolverOptions<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; businessInfo: { ...; }; ... 7 more ...; notes?: string | undefined; }>'.

07:46:03.312       Type 'string\[] | undefined' is not assignable to type 'string\[]'.

07:46:03.312         Type 'undefined' is not assignable to type 'string\[]'.

07:46:03.312 src/components/suppliers/SupplierForm.tsx(375,42): error TS2345: Argument of type '(data: SupplierFormData) => Promise<void>' is not assignable to parameter of type 'SubmitHandler<TFieldValues>'.

07:46:03.312   Types of parameters 'data' and 'data' are incompatible.

07:46:03.312     Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.312       Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.312 src/components/suppliers/SupplierForm.tsx(414,45): error TS2345: Argument of type '(data: SupplierFormData) => Promise<void>' is not assignable to parameter of type 'SubmitHandler<TFieldValues>'.

07:46:03.312   Types of parameters 'data' and 'data' are incompatible.

07:46:03.312     Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.312       Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.312 src/components/suppliers/SupplierForm.tsx(436,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.312   The types of '\_options.resolver' are incompatible between these types.

07:46:03.312     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.312       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.312         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.313           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.313 src/components/suppliers/SupplierForm.tsx(450,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.313   The types of '\_options.resolver' are incompatible between these types.

07:46:03.313     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.313       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.313         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.313           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.313 src/components/suppliers/SupplierForm.tsx(467,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.313   The types of '\_options.resolver' are incompatible between these types.

07:46:03.313     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.313       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.313         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.313           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.313 src/components/suppliers/SupplierForm.tsx(491,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.313   The types of '\_options.resolver' are incompatible between these types.

07:46:03.313     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.313       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.313         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.314           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.314 src/components/suppliers/SupplierForm.tsx(515,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.314   The types of '\_options.resolver' are incompatible between these types.

07:46:03.314     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.314       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.314         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.314           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.314 src/components/suppliers/SupplierForm.tsx(541,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.314   The types of '\_options.resolver' are incompatible between these types.

07:46:03.314     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.314       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.314         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.314           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.314 src/components/suppliers/SupplierForm.tsx(589,23): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.314   The types of '\_options.resolver' are incompatible between these types.

07:46:03.314     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.314       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.315         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.315           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.315 src/components/suppliers/SupplierForm.tsx(622,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.315   The types of '\_options.resolver' are incompatible between these types.

07:46:03.315     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.315       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.315         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.315           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.315 src/components/suppliers/SupplierForm.tsx(636,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.315   The types of '\_options.resolver' are incompatible between these types.

07:46:03.315     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.316       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.316         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.316           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.316 src/components/suppliers/SupplierForm.tsx(650,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.316   The types of '\_options.resolver' are incompatible between these types.

07:46:03.316     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.319       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.319         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.319           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.319 src/components/suppliers/SupplierForm.tsx(664,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.319   The types of '\_options.resolver' are incompatible between these types.

07:46:03.319     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.319       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.319         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.319           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.319 src/components/suppliers/SupplierForm.tsx(678,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.319   The types of '\_options.resolver' are incompatible between these types.

07:46:03.319     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.319       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.320         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.320           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.320 src/components/suppliers/SupplierForm.tsx(692,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.320   The types of '\_options.resolver' are incompatible between these types.

07:46:03.320     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.320       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.320         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.320           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.320 src/components/suppliers/SupplierForm.tsx(711,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.320   The types of '\_options.resolver' are incompatible between these types.

07:46:03.320     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.320       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.320         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.320           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.320 src/components/suppliers/SupplierForm.tsx(730,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.320   The types of '\_options.resolver' are incompatible between these types.

07:46:03.320     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.321       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.321         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.321           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.321 src/components/suppliers/SupplierForm.tsx(749,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.321   The types of '\_options.resolver' are incompatible between these types.

07:46:03.321     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.321       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.321         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.321           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.321 src/components/suppliers/SupplierForm.tsx(811,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.321   The types of '\_options.resolver' are incompatible between these types.

07:46:03.321     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.321       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.321         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.321           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.322 src/components/suppliers/SupplierForm.tsx(836,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.322   The types of '\_options.resolver' are incompatible between these types.

07:46:03.322     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.322       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.322         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.322           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.322 src/components/suppliers/SupplierForm.tsx(850,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.322   The types of '\_options.resolver' are incompatible between these types.

07:46:03.322     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.322       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.322         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.322           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.322 src/components/suppliers/SupplierForm.tsx(864,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.322   The types of '\_options.resolver' are incompatible between these types.

07:46:03.323     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.323       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.323         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.323           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.323 src/components/suppliers/SupplierForm.tsx(878,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.323   The types of '\_options.resolver' are incompatible between these types.

07:46:03.323     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.323       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.323         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.323           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.323 src/components/suppliers/SupplierForm.tsx(892,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.323   The types of '\_options.resolver' are incompatible between these types.

07:46:03.323     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.323       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.323         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.323           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.324 src/components/suppliers/SupplierForm.tsx(906,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.324   The types of '\_options.resolver' are incompatible between these types.

07:46:03.324     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.324       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.324         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.324           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.324 src/components/suppliers/SupplierForm.tsx(922,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.324   The types of '\_options.resolver' are incompatible between these types.

07:46:03.324     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.324       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.324         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.324           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.324 src/components/suppliers/SupplierForm.tsx(940,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.324   The types of '\_options.resolver' are incompatible between these types.

07:46:03.324     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.324       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.324         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.325           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.325 src/components/suppliers/SupplierForm.tsx(997,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.325   The types of '\_options.resolver' are incompatible between these types.

07:46:03.325     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.325       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.325         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.325           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.325 src/components/suppliers/SupplierForm.tsx(1022,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.325   The types of '\_options.resolver' are incompatible between these types.

07:46:03.325     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.325       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.325         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.325           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.325 src/components/suppliers/SupplierForm.tsx(1036,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.325   The types of '\_options.resolver' are incompatible between these types.

07:46:03.326     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.326       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.326         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.326           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.326 src/components/suppliers/SupplierForm.tsx(1050,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.327   The types of '\_options.resolver' are incompatible between these types.

07:46:03.327     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.327       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.327         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.327           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.327 src/components/suppliers/SupplierForm.tsx(1064,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.327   The types of '\_options.resolver' are incompatible between these types.

07:46:03.327     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.327       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.327         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.327           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.345 src/components/suppliers/SupplierForm.tsx(1078,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.345   The types of '\_options.resolver' are incompatible between these types.

07:46:03.345     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.345       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.345         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.346           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.346 src/components/suppliers/SupplierForm.tsx(1092,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.346   The types of '\_options.resolver' are incompatible between these types.

07:46:03.346     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.346       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.346         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.346           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.346 src/components/suppliers/SupplierForm.tsx(1106,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.346   The types of '\_options.resolver' are incompatible between these types.

07:46:03.347     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.347       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.348         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.348           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.348 src/components/suppliers/SupplierForm.tsx(1135,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.348   The types of '\_options.resolver' are incompatible between these types.

07:46:03.348     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.348       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.348         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.348           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.348 src/components/suppliers/SupplierForm.tsx(1153,29): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.348   The types of '\_options.resolver' are incompatible between these types.

07:46:03.348     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.348       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.348         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.348           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.348 src/components/suppliers/SupplierForm.tsx(1188,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.348   The types of '\_options.resolver' are incompatible between these types.

07:46:03.348     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.349       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.349         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.349           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.349 src/components/suppliers/SupplierForm.tsx(1207,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.349   The types of '\_options.resolver' are incompatible between these types.

07:46:03.349     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.349       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.349         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.349           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.349 src/components/suppliers/SupplierForm.tsx(1234,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.349   The types of '\_options.resolver' are incompatible between these types.

07:46:03.349     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.349       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.349         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.349           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.349 src/components/suppliers/SupplierForm.tsx(1261,25): error TS2322: Type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.349   The types of '\_options.resolver' are incompatible between these types.

07:46:03.356     Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues> | undefined' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }> | undefined'.

07:46:03.356       Type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Resolver<{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; ... 7 more ...; notes?: string | undefined; }, any, { ...; }>'.

07:46:03.356         Type 'TFieldValues' is not assignable to type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }'.

07:46:03.356           Type 'FieldValues' is missing the following properties from type '{ name: string; code: string; status: "active" | "inactive" | "suspended" | "pending"; tier: "strategic" | "approved" | "preferred" | "conditional"; category: string; tags: string\[]; businessInfo: { ...; }; ... 6 more ...; notes?: string | undefined; }': name, code, status, tier, and 7 more.

07:46:03.356 src/components/suppliers/SupplierManagement.tsx(409,54): error TS2322: Type 'string | null' is not assignable to type 'string'.

07:46:03.357   Type 'null' is not assignable to type 'string'.

07:46:03.357 src/components/suppliers/SupplierManagement.tsx(431,52): error TS2322: Type 'string | null' is not assignable to type 'string'.

07:46:03.357   Type 'null' is not assignable to type 'string'.

07:46:03.357 src/components/suppliers/SupplierManagement.tsx(453,51): error TS2322: Type 'string | null' is not assignable to type 'string'.

07:46:03.357   Type 'null' is not assignable to type 'string'.

07:46:03.357 src/components/suppliers/SupplierManagement\_backup.tsx(422,54): error TS2322: Type 'string | null' is not assignable to type 'string'.

07:46:03.357   Type 'null' is not assignable to type 'string'.

07:46:03.357 src/components/suppliers/SupplierManagement\_backup.tsx(446,52): error TS2322: Type 'string | null' is not assignable to type 'string'.

07:46:03.357   Type 'null' is not assignable to type 'string'.

07:46:03.357 src/components/suppliers/SupplierManagement\_backup.tsx(470,51): error TS2322: Type 'string | null' is not assignable to type 'string'.

07:46:03.357   Type 'null' is not assignable to type 'string'.

07:46:03.357 src/components/suppliers/UnifiedSupplierDashboard.tsx(196,5): error TS2353: Object literal may only specify known properties, and 'companyName' does not exist in type 'SupplierData'.

07:46:03.357 src/components/suppliers/ai/AIEnhancedSupplierForm.tsx(286,11): error TS18048: 'formData.businessDetails.certifications.length' is possibly 'undefined'.

07:46:03.357 src/components/suppliers/ai/AISupplierDiscoveryPanel.tsx(37,15): error TS2440: Import declaration conflicts with local declaration of 'AISupplierRecommendation'.

07:46:03.357 src/components/suppliers/ai/AISupplierDiscoveryPanel.tsx(37,41): error TS2440: Import declaration conflicts with local declaration of 'AISupplierInsight'.

07:46:03.357 src/components/suppliers/ai/AISupplierDiscoveryPanel.tsx(318,47): error TS2339: Property 'primary\_category' does not exist on type 'Partial<Supplier>'.

07:46:03.357 src/components/suppliers/ai/AISupplierDiscoveryPanel.tsx(318,81): error TS2339: Property 'geographic\_region' does not exist on type 'Partial<Supplier>'.

07:46:03.357 src/components/suppliers/ai/AISupplierInsightsPanel.tsx(171,9): error TS2322: Type '"system"' is not assignable to type '"analysis" | "recommendation" | "insight" | "query\_result" | undefined'.

07:46:03.357 src/components/suppliers/ai/AISupplierInsightsPanel.tsx(261,21): error TS2322: Type '"error"' is not assignable to type '"analysis" | "recommendation" | "insight" | "query\_result" | undefined'.

07:46:03.357 src/components/ui/ResponsiveUIManager.tsx(590,10): error TS1345: An expression of type 'void' cannot be tested for truthiness.

07:46:03.357 src/components/ui/SystemHealthMonitor.tsx(483,22): error TS2554: Expected 1 arguments, but got 0.

07:46:03.357 src/components/ui/accessibility/AccessibilityProvider.tsx(9,24): error TS2307: Cannot find module '@/components/ui/slider' or its corresponding type declarations.

07:46:03.357 src/components/ui/accessibility/AccessibilityProvider.tsx(277,7): error TS2322: Type '"secondary" | "ghost" | "primary"' is not assignable to type '"default" | "link" | "destructive" | "secondary" | "outline" | "ghost" | null | undefined'.

07:46:03.357   Type '"primary"' is not assignable to type '"default" | "link" | "destructive" | "secondary" | "outline" | "ghost" | null | undefined'.

07:46:03.357 src/components/ui/accessibility/AccessibilityProvider.tsx(422,50): error TS7031: Binding element 'value' implicitly has an 'any' type.

07:46:03.357 src/components/ui/accessibility/AccessibilityProvider.tsx(561,52): error TS7031: Binding element 'value' implicitly has an 'any' type.

07:46:03.357 src/components/ui/accessibility/AccessibilityProvider.tsx(581,52): error TS7031: Binding element 'value' implicitly has an 'any' type.

07:46:03.357 src/components/ui/accessibility/AccessibilityProvider.tsx(685,48): error TS7031: Binding element 'value' implicitly has an 'any' type.

07:46:03.357 src/components/ui/accessibility/AccessibilityProvider.tsx(708,48): error TS7031: Binding element 'value' implicitly has an 'any' type.

07:46:03.357 src/components/ui/accessibility/AccessibilityProvider.tsx(820,25): error TS2304: Cannot find name 'useCallback'.

07:46:03.357 src/components/ui/accessibility/AccessibilityProvider.tsx(827,25): error TS2304: Cannot find name 'useCallback'.

07:46:03.357 src/components/ui/accessibility/AccessibilityProvider.tsx(832,27): error TS2304: Cannot find name 'useCallback'.

07:46:03.357 src/components/ui/data-table/EnhancedDataTable.tsx(289,29): error TS2554: Expected 1 arguments, but got 0.

07:46:03.357 src/components/ui/empty-states.tsx(6,3): error TS2724: '"lucide-react"' has no exported member named 'AlertCircleOff'. Did you mean 'AlertCircle'?

07:46:03.358 src/components/ui/empty-states.tsx(8,3): error TS2305: Module '"lucide-react"' has no exported member 'InboxOff'.

07:46:03.358 src/components/ui/empty-states.tsx(10,3): error TS2724: '"lucide-react"' has no exported member named 'DatabaseOff'. Did you mean 'Database'?

07:46:03.358 src/components/ui/error-boundary.tsx(8,69): error TS2307: Cannot find module '@/components/ui/collapsible' or its corresponding type declarations.

07:46:03.358 src/components/ui/error-states.tsx(4,47): error TS2724: '"lucide-react"' has no exported member named 'DatabaseOff'. Did you mean 'Database'?

07:46:03.358 src/components/ui/indicators/DataFreshnessIndicators.tsx(95,59): error TS2339: Property 'DEFAULT' does not exist on type '{ readonly 50: "oklch(95.50% 0.0240 142.10)"; readonly 100: "oklch(89.60% 0.0518 145.20)"; readonly 500: "oklch(64.80% 0.1510 145.50)"; readonly 600: "oklch(57.30% 0.1370 145.70)"; readonly 700: "oklch(48.20% 0.1140 145.90)"; readonly 900: "oklch(27.10% 0.0650 148.70)"; }'.

07:46:03.358 src/components/ui/indicators/DataFreshnessIndicators.tsx(96,56): error TS2339: Property 'DEFAULT' does not exist on type '{ readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }'.

07:46:03.358 src/components/ui/indicators/DataFreshnessIndicators.tsx(97,56): error TS2339: Property 'DEFAULT' does not exist on type '{ readonly 50: "oklch(96.80% 0.0240 85.20)"; readonly 100: "oklch(93.00% 0.0520 90.40)"; readonly 500: "oklch(75.80% 0.1310 86.30)"; readonly 600: "oklch(69.20% 0.1200 82.70)"; readonly 700: "oklch(57.70% 0.1070 78.90)"; readonly 900: "oklch(35.60% 0.0650 75.60)"; }'.

07:46:03.358 src/components/ui/indicators/DataFreshnessIndicators.tsx(98,51): error TS2339: Property 'destructive' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.358 src/components/ui/indicators/DataFreshnessIndicators.tsx(99,43): error TS2339: Property 'muted' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.358 src/components/ui/indicators/DataFreshnessIndicators.tsx(231,45): error TS2339: Property 'popover' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.358 src/components/ui/indicators/DataFreshnessIndicators.tsx(232,51): error TS2339: Property 'border' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.358 src/components/ui/indicators/DataFreshnessIndicators.tsx(498,58): error TS2339: Property 'DEFAULT' does not exist on type '{ readonly 50: "oklch(95.50% 0.0240 142.10)"; readonly 100: "oklch(89.60% 0.0518 145.20)"; readonly 500: "oklch(64.80% 0.1510 145.50)"; readonly 600: "oklch(57.30% 0.1370 145.70)"; readonly 700: "oklch(48.20% 0.1140 145.90)"; readonly 900: "oklch(27.10% 0.0650 148.70)"; }'.

07:46:03.358 src/components/ui/indicators/DataFreshnessIndicators.tsx(499,58): error TS2339: Property 'DEFAULT' does not exist on type '{ readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }'.

07:46:03.358 src/components/ui/indicators/DataFreshnessIndicators.tsx(500,58): error TS2339: Property 'DEFAULT' does not exist on type '{ readonly 50: "oklch(96.80% 0.0240 85.20)"; readonly 100: "oklch(93.00% 0.0520 90.40)"; readonly 500: "oklch(75.80% 0.1310 86.30)"; readonly 600: "oklch(69.20% 0.1200 82.70)"; readonly 700: "oklch(57.70% 0.1070 78.90)"; readonly 900: "oklch(35.60% 0.0650 75.60)"; }'.

07:46:03.358 src/components/ui/indicators/DataFreshnessIndicators.tsx(501,32): error TS2339: Property 'destructive' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.358 src/components/ui/indicators/DataFreshnessIndicators.tsx(522,43): error TS2339: Property 'muted' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.358 src/components/ui/indicators/DataFreshnessIndicators.tsx(660,7): error TS7053: Element implicitly has an 'any' type because expression of type 'FreshnessLevel' can't be used to index type '{ realtime: number; fresh: number; stale: number; outdated: number; }'.

07:46:03.358   Property 'unknown' does not exist on type '{ realtime: number; fresh: number; stale: number; outdated: number; }'.

07:46:03.358 src/components/ui/loading/LoadingStates.tsx(315,9): error TS2322: Type '{ spin: { rotate: number; transition: { duration: number; repeat: number; ease: string; }; }; pulse: { scale: number\[]; opacity: number\[]; transition: { duration: number; repeat: number; ease: string; }; }; bounce: { ...; }; wave: { ...; }; }' is not assignable to type 'Variants'.

07:46:03.358   Property 'spin' is incompatible with index signature.

07:46:03.358     Type '{ rotate: number; transition: { duration: number; repeat: number; ease: string; }; }' is not assignable to type 'Variant'.

07:46:03.358       Type '{ rotate: number; transition: { duration: number; repeat: number; ease: string; }; }' is not assignable to type 'TargetAndTransition'.

07:46:03.358         Type '{ rotate: number; transition: { duration: number; repeat: number; ease: string; }; }' is not assignable to type '{ transition?: Transition<any> | undefined; transitionEnd?: ResolvedValues | undefined; }'.

07:46:03.358           Types of property 'transition' are incompatible.

07:46:03.358             Type '{ duration: number; repeat: number; ease: string; }' is not assignable to type 'Transition<any> | undefined'.

07:46:03.358               Type '{ duration: number; repeat: number; ease: string; }' is not assignable to type 'TransitionWithValueOverrides<any>'.

07:46:03.358                 Type '{ duration: number; repeat: number; ease: string; }' is not assignable to type 'ValueAnimationTransition<any>'.

07:46:03.358                   Types of property 'ease' are incompatible.

07:46:03.358                     Type 'string' is not assignable to type 'Easing | Easing\[] | undefined'.

07:46:03.358 src/components/ui/loading/LoadingStates.tsx(335,9): error TS2322: Type '{ spin: { rotate: number; transition: { duration: number; repeat: number; ease: string; }; }; pulse: { scale: number\[]; opacity: number\[]; transition: { duration: number; repeat: number; ease: string; }; }; bounce: { ...; }; wave: { ...; }; }' is not assignable to type 'Variants'.

07:46:03.359   Property 'spin' is incompatible with index signature.

07:46:03.360     Type '{ rotate: number; transition: { duration: number; repeat: number; ease: string; }; }' is not assignable to type 'Variant'.

07:46:03.360       Type '{ rotate: number; transition: { duration: number; repeat: number; ease: string; }; }' is not assignable to type 'TargetAndTransition'.

07:46:03.360         Type '{ rotate: number; transition: { duration: number; repeat: number; ease: string; }; }' is not assignable to type '{ transition?: Transition<any> | undefined; transitionEnd?: ResolvedValues | undefined; }'.

07:46:03.360           Types of property 'transition' are incompatible.

07:46:03.360             Type '{ duration: number; repeat: number; ease: string; }' is not assignable to type 'Transition<any> | undefined'.

07:46:03.360               Type '{ duration: number; repeat: number; ease: string; }' is not assignable to type 'TransitionWithValueOverrides<any>'.

07:46:03.360                 Type '{ duration: number; repeat: number; ease: string; }' is not assignable to type 'ValueAnimationTransition<any>'.

07:46:03.360                   Types of property 'ease' are incompatible.

07:46:03.360                     Type 'string' is not assignable to type 'Easing | Easing\[] | undefined'.

07:46:03.360 src/components/ui/loading/LoadingStates.tsx(344,11): error TS2322: Type '{ spin: { rotate: number; transition: { duration: number; repeat: number; ease: string; }; }; pulse: { scale: number\[]; opacity: number\[]; transition: { duration: number; repeat: number; ease: string; }; }; bounce: { ...; }; wave: { ...; }; }' is not assignable to type 'Variants'.

07:46:03.360   Property 'spin' is incompatible with index signature.

07:46:03.360     Type '{ rotate: number; transition: { duration: number; repeat: number; ease: string; }; }' is not assignable to type 'Variant'.

07:46:03.360       Type '{ rotate: number; transition: { duration: number; repeat: number; ease: string; }; }' is not assignable to type 'TargetAndTransition'.

07:46:03.361         Type '{ rotate: number; transition: { duration: number; repeat: number; ease: string; }; }' is not assignable to type '{ transition?: Transition<any> | undefined; transitionEnd?: ResolvedValues | undefined; }'.

07:46:03.361           Types of property 'transition' are incompatible.

07:46:03.361             Type '{ duration: number; repeat: number; ease: string; }' is not assignable to type 'Transition<any> | undefined'.

07:46:03.363               Type '{ duration: number; repeat: number; ease: string; }' is not assignable to type 'TransitionWithValueOverrides<any>'.

07:46:03.363                 Type '{ duration: number; repeat: number; ease: string; }' is not assignable to type 'ValueAnimationTransition<any>'.

07:46:03.363                   Types of property 'ease' are incompatible.

07:46:03.363                     Type 'string' is not assignable to type 'Easing | Easing\[] | undefined'.

07:46:03.363 src/components/ui/loading/LoadingStates.tsx(437,11): error TS2322: Type '{ spin: { rotate: number; transition: { duration: number; repeat: number; ease: string; }; }; pulse: { scale: number\[]; opacity: number\[]; transition: { duration: number; repeat: number; ease: string; }; }; bounce: { ...; }; wave: { ...; }; }' is not assignable to type 'Variants'.

07:46:03.363   Property 'spin' is incompatible with index signature.

07:46:03.363     Type '{ rotate: number; transition: { duration: number; repeat: number; ease: string; }; }' is not assignable to type 'Variant'.

07:46:03.363       Type '{ rotate: number; transition: { duration: number; repeat: number; ease: string; }; }' is not assignable to type 'TargetAndTransition'.

07:46:03.363         Type '{ rotate: number; transition: { duration: number; repeat: number; ease: string; }; }' is not assignable to type '{ transition?: Transition<any> | undefined; transitionEnd?: ResolvedValues | undefined; }'.

07:46:03.363           Types of property 'transition' are incompatible.

07:46:03.363             Type '{ duration: number; repeat: number; ease: string; }' is not assignable to type 'Transition<any> | undefined'.

07:46:03.363               Type '{ duration: number; repeat: number; ease: string; }' is not assignable to type 'TransitionWithValueOverrides<any>'.

07:46:03.363                 Type '{ duration: number; repeat: number; ease: string; }' is not assignable to type 'ValueAnimationTransition<any>'.

07:46:03.363                   Types of property 'ease' are incompatible.

07:46:03.367                     Type 'string' is not assignable to type 'Easing | Easing\[] | undefined'.

07:46:03.367 src/components/ui/search/UnifiedSearchSystem.tsx(314,23): error TS2554: Expected 1 arguments, but got 0.

07:46:03.367 src/components/ui/search/UnifiedSearchSystem.tsx(362,45): error TS2339: Property 'background' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.367 src/components/ui/search/UnifiedSearchSystem.tsx(365,51): error TS2339: Property 'border' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.367 src/components/ui/search/UnifiedSearchSystem.tsx(372,43): error TS2339: Property 'md' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.367 src/components/ui/search/UnifiedSearchSystem.tsx(373,58): error TS2339: Property 'border' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.367 src/components/ui/search/UnifiedSearchSystem.tsx(382,40): error TS2339: Property 'foreground' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.368 src/components/ui/search/UnifiedSearchSystem.tsx(383,48): error TS2339: Property 'lg' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.368 src/components/ui/search/UnifiedSearchSystem.tsx(387,40): error TS2339: Property 'muted' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.368 src/components/ui/search/UnifiedSearchSystem.tsx(393,39): error TS2339: Property 'sm' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.368 src/components/ui/search/UnifiedSearchSystem.tsx(399,40): error TS2339: Property 'muted' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.368 src/components/ui/search/UnifiedSearchSystem.tsx(401,43): error TS2339: Property 'xs' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.369 src/components/ui/search/UnifiedSearchSystem.tsx(407,40): error TS2339: Property 'foreground' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.369 src/components/ui/search/UnifiedSearchSystem.tsx(408,45): error TS2339: Property 'muted' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.369 src/components/ui/search/UnifiedSearchSystem.tsx(412,48): error TS2339: Property 'DEFAULT' does not exist on type '{ readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }'.

07:46:03.369 src/components/ui/search/UnifiedSearchSystem.tsx(413,53): error TS2339: Property 'DEFAULT' does not exist on type '{ readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }'.

07:46:03.369 src/components/ui/search/UnifiedSearchSystem.tsx(417,43): error TS2339: Property 'md' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.369 src/components/ui/search/UnifiedSearchSystem.tsx(418,55): error TS2339: Property 'border' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.369 src/components/ui/search/UnifiedSearchSystem.tsx(424,39): error TS2339: Property 'xs' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.369 src/components/ui/search/UnifiedSearchSystem.tsx(425,49): error TS2339: Property 'md' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.369 src/components/ui/search/UnifiedSearchSystem.tsx(431,39): error TS2339: Property 'xs' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.369 src/components/ui/search/UnifiedSearchSystem.tsx(432,43): error TS2339: Property 'xs' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.369 src/components/ui/search/UnifiedSearchSystem.tsx(432,70): error TS2339: Property 'sm' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.369 src/components/ui/search/UnifiedSearchSystem.tsx(433,45): error TS2339: Property 'muted' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.369 src/components/ui/search/UnifiedSearchSystem.tsx(441,53): error TS2339: Property 'DEFAULT' does not exist on type '{ readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }'.

07:46:03.369 src/components/ui/search/UnifiedSearchSystem.tsx(442,48): error TS2339: Property 'foreground' does not exist on type '{ readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }'.

07:46:03.369 src/components/ui/search/UnifiedSearchSystem.tsx(446,46): error TS2339: Property 'md' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.371 src/components/ui/search/UnifiedSearchSystem.tsx(452,39): error TS2339: Property 'sm' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.371 src/components/ui/search/UnifiedSearchSystem.tsx(453,43): error TS2339: Property 'sm' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.371 src/components/ui/search/UnifiedSearchSystem.tsx(454,45): error TS2339: Property 'muted' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.371 src/components/ui/search/UnifiedSearchSystem.tsx(456,49): error TS2339: Property 'xs' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.371 src/components/ui/search/UnifiedSearchSystem.tsx(466,39): error TS2339: Property 'sm' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.371 src/components/ui/search/UnifiedSearchSystem.tsx(467,46): error TS2339: Property 'md' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.372 src/components/ui/search/UnifiedSearchSystem.tsx(472,43): error TS2339: Property 'sm' does not exist on type '{ readonly 0: "0rem"; readonly px: "1px"; readonly 0.5: "0.125rem"; readonly 1: "0.25rem"; readonly 1.5: "0.375rem"; readonly 2: "0.5rem"; readonly 3: "0.75rem"; readonly 4: "1rem"; readonly 5: "1.25rem"; ... 11 more ...; readonly 64: "16rem"; }'.

07:46:03.372 src/components/ui/search/UnifiedSearchSystem.tsx(473,45): error TS2339: Property 'background' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.372 src/components/ui/search/UnifiedSearchSystem.tsx(474,51): error TS2339: Property 'border' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.372 src/components/ui/search/UnifiedSearchSystem.tsx(476,40): error TS2339: Property 'foreground' does not exist on type '{ readonly primary: { readonly 50: "oklch(96.27% 0.0217 238.66)"; readonly 100: "oklch(92.66% 0.0429 240.01)"; readonly 200: "oklch(86.40% 0.0827 241.45)"; readonly 300: "oklch(77.80% 0.1340 243.83)"; ... 6 more ...; readonly 950: "oklch(23.84% 0.0647 260.54)"; }; readonly success: { ...; }; readonly warning: { ...;...'.

07:46:03.372 src/hooks/useAISupplier.ts(153,9): error TS2322: Type '(AISupplierInsight | { userFeedback: { helpful?: number | undefined; notHelpful?: number | undefined; comments?: string\[] | undefined; }; id: string; supplierId?: string | undefined; ... 21 more ...; viewCount: number; })\[]' is not assignable to type 'AISupplierInsight\[]'.

07:46:03.372   Type 'AISupplierInsight | { userFeedback: { helpful?: number | undefined; notHelpful?: number | undefined; comments?: string\[] | undefined; }; id: string; supplierId?: string | undefined; ... 21 more ...; viewCount: number; }' is not assignable to type 'AISupplierInsight'.

07:46:03.372     Type '{ userFeedback: { helpful?: number | undefined; notHelpful?: number | undefined; comments?: string\[] | undefined; }; id: string; supplierId?: string; type: "opportunity" | "risk" | "trend" | "recommendation" | "anomaly" | "performance"; ... 20 more ...; viewCount: number; }' is not assignable to type 'AISupplierInsight'.

07:46:03.372       The types of 'userFeedback.helpful' are incompatible between these types.

07:46:03.372         Type 'number | undefined' is not assignable to type 'number'.

07:46:03.372           Type 'undefined' is not assignable to type 'number'.

07:46:03.372 src/hooks/useRealTimeData.ts(386,5): error TS2769: No overload matches this call.

07:46:03.372   Overload 1 of 3, '(options: DefinedInitialDataOptions<unknown, Error, unknown, {}\[]>, queryClient?: QueryClient | undefined): DefinedUseQueryResult<unknown, Error>', gave the following error.

07:46:03.372     Object literal may only specify known properties, and 'cacheTime' does not exist in type 'DefinedInitialDataOptions<unknown, Error, unknown, {}\[]>'.

07:46:03.372   Overload 2 of 3, '(options: UndefinedInitialDataOptions<any, Error, any, {}\[]>, queryClient?: QueryClient | undefined): UseQueryResult<any, Error>', gave the following error.

07:46:03.372     Object literal may only specify known properties, and 'cacheTime' does not exist in type 'UndefinedInitialDataOptions<any, Error, any, {}\[]>'.

07:46:03.372   Overload 3 of 3, '(options: UseQueryOptions<any, Error, any, {}\[]>, queryClient?: QueryClient | undefined): UseQueryResult<any, Error>', gave the following error.

07:46:03.372     Object literal may only specify known properties, and 'cacheTime' does not exist in type 'UseQueryOptions<any, Error, any, {}\[]>'.

07:46:03.372 src/hooks/useRealTimeData.ts(425,5): error TS2769: No overload matches this call.

07:46:03.372   Overload 1 of 3, '(options: DefinedInitialDataOptions<unknown, Error, unknown, {}\[]>, queryClient?: QueryClient | undefined): DefinedUseQueryResult<unknown, Error>', gave the following error.

07:46:03.372     Object literal may only specify known properties, and 'cacheTime' does not exist in type 'DefinedInitialDataOptions<unknown, Error, unknown, {}\[]>'.

07:46:03.372   Overload 2 of 3, '(options: UndefinedInitialDataOptions<any, Error, any, {}\[]>, queryClient?: QueryClient | undefined): UseQueryResult<any, Error>', gave the following error.

07:46:03.372     Object literal may only specify known properties, and 'cacheTime' does not exist in type 'UndefinedInitialDataOptions<any, Error, any, {}\[]>'.

07:46:03.372   Overload 3 of 3, '(options: UseQueryOptions<any, Error, any, {}\[]>, queryClient?: QueryClient | undefined): UseQueryResult<any, Error>', gave the following error.

07:46:03.372     Object literal may only specify known properties, and 'cacheTime' does not exist in type 'UseQueryOptions<any, Error, any, {}\[]>'.

07:46:03.372 src/hooks/useRealTimeData.ts(494,5): error TS2769: No overload matches this call.

07:46:03.372   Overload 1 of 3, '(options: DefinedInitialDataOptions<unknown, Error, unknown, (string | undefined)\[]>, queryClient?: QueryClient | undefined): DefinedUseQueryResult<unknown, Error>', gave the following error.

07:46:03.372     Object literal may only specify known properties, and 'keepPreviousData' does not exist in type 'DefinedInitialDataOptions<unknown, Error, unknown, (string | undefined)\[]>'.

07:46:03.372   Overload 2 of 3, '(options: UndefinedInitialDataOptions<any, Error, any, (string | undefined)\[]>, queryClient?: QueryClient | undefined): UseQueryResult<...>', gave the following error.

07:46:03.372     Object literal may only specify known properties, and 'keepPreviousData' does not exist in type 'UndefinedInitialDataOptions<any, Error, any, (string | undefined)\[]>'.

07:46:03.372   Overload 3 of 3, '(options: UseQueryOptions<any, Error, any, (string | undefined)\[]>, queryClient?: QueryClient | undefined): UseQueryResult<any, Error>', gave the following error.

07:46:03.372     Object literal may only specify known properties, and 'keepPreviousData' does not exist in type 'UseQueryOptions<any, Error, any, (string | undefined)\[]>'.

07:46:03.372 src/hooks/useRealTimeData.ts(524,37): error TS2559: Type 'string\[]' has no properties in common with type 'InvalidateQueryFilters<readonly unknown\[]>'.

07:46:03.372 src/hooks/useRealTimeData.ts(544,39): error TS2559: Type 'string\[]' has no properties in common with type 'QueryFilters<readonly unknown\[]>'.

07:46:03.372 src/hooks/useRealTimeData.ts(565,37): error TS2559: Type 'string\[]' has no properties in common with type 'InvalidateQueryFilters<readonly unknown\[]>'.

07:46:03.372 src/hooks/useRealTimeData.ts(578,15): error TS18046: 'pageParam' is of type 'unknown'.

07:46:03.373 src/hooks/useRealTimeData.ts(597,7): error TS18046: 'lastPage' is of type 'unknown'.

07:46:03.373 src/hooks/useRealTimeData.ts(597,39): error TS18046: 'lastPage' is of type 'unknown'.

07:46:03.373 src/hooks/useRealTimeData.ts(598,5): error TS2769: No overload matches this call.

07:46:03.373   Overload 1 of 3, '(options: DefinedInitialDataInfiniteOptions<unknown, Error, InfiniteData<unknown, unknown>, readonly unknown\[], unknown>, queryClient?: QueryClient | undefined): DefinedUseInfiniteQueryResult<...>', gave the following error.

07:46:03.373     Object literal may only specify known properties, and 'keepPreviousData' does not exist in type 'DefinedInitialDataInfiniteOptions<unknown, Error, InfiniteData<unknown, unknown>, readonly unknown\[], unknown>'.

07:46:03.373   Overload 2 of 3, '(options: UndefinedInitialDataInfiniteOptions<unknown, Error, InfiniteData<unknown, unknown>, readonly unknown\[], unknown>, queryClient?: QueryClient | undefined): UseInfiniteQueryResult<...>', gave the following error.

07:46:03.373     Object literal may only specify known properties, and 'keepPreviousData' does not exist in type 'UndefinedInitialDataInfiniteOptions<unknown, Error, InfiniteData<unknown, unknown>, readonly unknown\[], unknown>'.

07:46:03.373   Overload 3 of 3, '(options: UseInfiniteQueryOptions<unknown, Error, InfiniteData<unknown, unknown>, readonly unknown\[], unknown>, queryClient?: QueryClient | undefined): UseInfiniteQueryResult<...>', gave the following error.

07:46:03.373     Object literal may only specify known properties, and 'keepPreviousData' does not exist in type 'UseInfiniteQueryOptions<unknown, Error, InfiniteData<unknown, unknown>, readonly unknown\[], unknown>'.

07:46:03.373 src/hooks/useRealTimeDataFixed.ts(65,11): error TS18046: 'error' is of type 'unknown'.

07:46:03.373 src/hooks/useRealTimeDataFixed.ts(90,7): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{}'.

07:46:03.373   No index signature with a parameter of type 'string' was found on type '{}'.

07:46:03.373 src/hooks/useRealTimeDataFixed.ts(90,21): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{}'.

07:46:03.373   No index signature with a parameter of type 'string' was found on type '{}'.

07:46:03.373 src/hooks/useRealTimeDataFixed.ts(115,5): error TS2769: No overload matches this call.

07:46:03.373   Overload 1 of 3, '(options: DefinedInitialDataOptions<unknown, Error, unknown, {}\[]>, queryClient?: QueryClient | undefined): DefinedUseQueryResult<unknown, Error>', gave the following error.

07:46:03.373     Object literal may only specify known properties, and 'cacheTime' does not exist in type 'DefinedInitialDataOptions<unknown, Error, unknown, {}\[]>'.

07:46:03.373   Overload 2 of 3, '(options: UndefinedInitialDataOptions<any, Error, any, {}\[]>, queryClient?: QueryClient | undefined): UseQueryResult<any, Error>', gave the following error.

07:46:03.373     Object literal may only specify known properties, and 'cacheTime' does not exist in type 'UndefinedInitialDataOptions<any, Error, any, {}\[]>'.

07:46:03.373   Overload 3 of 3, '(options: UseQueryOptions<any, Error, any, {}\[]>, queryClient?: QueryClient | undefined): UseQueryResult<any, Error>', gave the following error.

07:46:03.373     Object literal may only specify known properties, and 'cacheTime' does not exist in type 'UseQueryOptions<any, Error, any, {}\[]>'.

07:46:03.373 src/hooks/useRealTimeDataFixed.ts(126,15): error TS7006: Parameter 'error' implicitly has an 'any' type.

07:46:03.373 src/hooks/useRealTimeDataFixed.ts(129,17): error TS7006: Parameter 'data' implicitly has an 'any' type.

07:46:03.373 src/hooks/useRealTimeDataFixed.ts(133,27): error TS7006: Parameter 'supplier' implicitly has an 'any' type.

07:46:03.373 src/hooks/useRealTimeDataFixed.ts(151,7): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{}'.

07:46:03.373   No index signature with a parameter of type 'string' was found on type '{}'.

07:46:03.373 src/hooks/useRealTimeDataFixed.ts(151,21): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{}'.

07:46:03.373   No index signature with a parameter of type 'string' was found on type '{}'.

07:46:03.373 src/hooks/useRealTimeDataFixed.ts(176,5): error TS2769: No overload matches this call.

07:46:03.373   Overload 1 of 3, '(options: DefinedInitialDataOptions<unknown, Error, unknown, {}\[]>, queryClient?: QueryClient | undefined): DefinedUseQueryResult<unknown, Error>', gave the following error.

07:46:03.373     Object literal may only specify known properties, and 'cacheTime' does not exist in type 'DefinedInitialDataOptions<unknown, Error, unknown, {}\[]>'.

07:46:03.373   Overload 2 of 3, '(options: UndefinedInitialDataOptions<any, Error, any, {}\[]>, queryClient?: QueryClient | undefined): UseQueryResult<any, Error>', gave the following error.

07:46:03.373     Object literal may only specify known properties, and 'cacheTime' does not exist in type 'UndefinedInitialDataOptions<any, Error, any, {}\[]>'.

07:46:03.373   Overload 3 of 3, '(options: UseQueryOptions<any, Error, any, {}\[]>, queryClient?: QueryClient | undefined): UseQueryResult<any, Error>', gave the following error.

07:46:03.373     Object literal may only specify known properties, and 'cacheTime' does not exist in type 'UseQueryOptions<any, Error, any, {}\[]>'.

07:46:03.373 src/hooks/useRealTimeDataFixed.ts(186,15): error TS7006: Parameter 'error' implicitly has an 'any' type.

07:46:03.373 src/hooks/useRealTimeDataFixed.ts(189,17): error TS7006: Parameter 'data' implicitly has an 'any' type.

07:46:03.374 src/hooks/useRealTimeDataFixed.ts(193,27): error TS7006: Parameter 'item' implicitly has an 'any' type.

07:46:03.374 src/hooks/useRealTimeDataFixed.ts(218,5): error TS2769: No overload matches this call.

07:46:03.374   Overload 1 of 3, '(options: DefinedInitialDataOptions<unknown, Error, unknown, string\[]>, queryClient?: QueryClient | undefined): DefinedUseQueryResult<unknown, Error>', gave the following error.

07:46:03.374     Object literal may only specify known properties, and 'cacheTime' does not exist in type 'DefinedInitialDataOptions<unknown, Error, unknown, string\[]>'.

07:46:03.374   Overload 2 of 3, '(options: UndefinedInitialDataOptions<any, Error, any, string\[]>, queryClient?: QueryClient | undefined): UseQueryResult<any, Error>', gave the following error.

07:46:03.374     Object literal may only specify known properties, and 'cacheTime' does not exist in type 'UndefinedInitialDataOptions<any, Error, any, string\[]>'.

07:46:03.374   Overload 3 of 3, '(options: UseQueryOptions<any, Error, any, string\[]>, queryClient?: QueryClient | undefined): UseQueryResult<any, Error>', gave the following error.

07:46:03.374     Object literal may only specify known properties, and 'cacheTime' does not exist in type 'UseQueryOptions<any, Error, any, string\[]>'.

07:46:03.374 src/hooks/useRealTimeDataFixed.ts(227,15): error TS7006: Parameter 'error' implicitly has an 'any' type.

07:46:03.374 src/hooks/useRealTimeDataFixed.ts(230,17): error TS7006: Parameter 'data' implicitly has an 'any' type.

07:46:03.374 src/hooks/useRealTimeDataFixed.ts(242,5): error TS2769: No overload matches this call.

07:46:03.375   Overload 1 of 3, '(options: DefinedInitialDataOptions<unknown, Error, unknown, string\[]>, queryClient?: QueryClient | undefined): DefinedUseQueryResult<unknown, Error>', gave the following error.

07:46:03.375     Object literal may only specify known properties, and 'cacheTime' does not exist in type 'DefinedInitialDataOptions<unknown, Error, unknown, string\[]>'.

07:46:03.375   Overload 2 of 3, '(options: UndefinedInitialDataOptions<any, Error, any, string\[]>, queryClient?: QueryClient | undefined): UseQueryResult<any, Error>', gave the following error.

07:46:03.375     Object literal may only specify known properties, and 'cacheTime' does not exist in type 'UndefinedInitialDataOptions<any, Error, any, string\[]>'.

07:46:03.375   Overload 3 of 3, '(options: UseQueryOptions<any, Error, any, string\[]>, queryClient?: QueryClient | undefined): UseQueryResult<any, Error>', gave the following error.

07:46:03.375     Object literal may only specify known properties, and 'cacheTime' does not exist in type 'UseQueryOptions<any, Error, any, string\[]>'.

07:46:03.375 src/hooks/useRealTimeDataFixed.ts(251,15): error TS7006: Parameter 'error' implicitly has an 'any' type.

07:46:03.379 src/hooks/useRealTimeDataFixed.ts(254,17): error TS7006: Parameter 'data' implicitly has an 'any' type.

07:46:03.379 src/hooks/useRealTimeDataFixed.ts(304,37): error TS2339: Property 'data' does not exist on type '{}'.

07:46:03.379 src/hooks/useRealTimeDataFixed.ts(314,11): error TS2339: Property 'priority' does not exist on type '{}'.

07:46:03.379 src/hooks/useRealTimeDataFixed.ts(314,29): error TS2339: Property 'unreadOnly' does not exist on type '{}'.

07:46:03.379 src/hooks/useRealTimeDataFixed.ts(333,5): error TS2769: No overload matches this call.

07:46:03.379   Overload 1 of 3, '(options: DefinedInitialDataOptions<unknown, Error, unknown, (string | { priority: any; unreadOnly: any; })\[]>, queryClient?: QueryClient | undefined): DefinedUseQueryResult<...>', gave the following error.

07:46:03.379     Object literal may only specify known properties, and 'cacheTime' does not exist in type 'DefinedInitialDataOptions<unknown, Error, unknown, (string | { priority: any; unreadOnly: any; })\[]>'.

07:46:03.379   Overload 2 of 3, '(options: UndefinedInitialDataOptions<any, Error, any, (string | { priority: any; unreadOnly: any; })\[]>, queryClient?: QueryClient | undefined): UseQueryResult<...>', gave the following error.

07:46:03.379     Object literal may only specify known properties, and 'cacheTime' does not exist in type 'UndefinedInitialDataOptions<any, Error, any, (string | { priority: any; unreadOnly: any; })\[]>'.

07:46:03.379   Overload 3 of 3, '(options: UseQueryOptions<any, Error, any, (string | { priority: any; unreadOnly: any; })\[]>, queryClient?: QueryClient | undefined): UseQueryResult<any, Error>', gave the following error.

07:46:03.379     Object literal may only specify known properties, and 'cacheTime' does not exist in type 'UseQueryOptions<any, Error, any, (string | { priority: any; unreadOnly: any; })\[]>'.

07:46:03.379 src/hooks/useRealTimeDataFixed.ts(342,15): error TS7006: Parameter 'error' implicitly has an 'any' type.

07:46:03.379 src/hooks/useRealTimeDataFixed.ts(345,17): error TS7006: Parameter 'data' implicitly has an 'any' type.

07:46:03.379 src/hooks/useRealTimeDataFixed.ts(368,57): error TS2339: Property 'isFetching' does not exist on type 'QueryState<unknown, Error>'.

07:46:03.379 src/hooks/useRealTimeDataFixed.ts(393,11): error TS2339: Property 'includeInactive' does not exist on type '{}'.

07:46:03.379 src/hooks/useRealTimeDataFixed.ts(393,36): error TS2339: Property 'categoryFilter' does not exist on type '{}'.

07:46:03.379 src/hooks/useRealTimeDataFixed.ts(416,5): error TS2769: No overload matches this call.

07:46:03.379   Overload 1 of 3, '(options: DefinedInitialDataOptions<unknown, Error, unknown, (string | { includeInactive: any; categoryFilter: any; } | undefined)\[]>, queryClient?: QueryClient | undefined): DefinedUseQueryResult<...>', gave the following error.

07:46:03.379     Object literal may only specify known properties, and 'cacheTime' does not exist in type 'DefinedInitialDataOptions<unknown, Error, unknown, (string | { includeInactive: any; categoryFilter: any; } | undefined)\[]>'.

07:46:03.379   Overload 2 of 3, '(options: UndefinedInitialDataOptions<any, Error, any, (string | { includeInactive: any; categoryFilter: any; } | undefined)\[]>, queryClient?: QueryClient | undefined): UseQueryResult<...>', gave the following error.

07:46:03.379     Object literal may only specify known properties, and 'cacheTime' does not exist in type 'UndefinedInitialDataOptions<any, Error, any, (string | { includeInactive: any; categoryFilter: any; } | undefined)\[]>'.

07:46:03.379   Overload 3 of 3, '(options: UseQueryOptions<any, Error, any, (string | { includeInactive: any; categoryFilter: any; } | undefined)\[]>, queryClient?: QueryClient | undefined): UseQueryResult<...>', gave the following error.

07:46:03.379     Object literal may only specify known properties, and 'cacheTime' does not exist in type 'UseQueryOptions<any, Error, any, (string | { includeInactive: any; categoryFilter: any; } | undefined)\[]>'.

07:46:03.380 src/hooks/useRealTimeDataFixed.ts(424,15): error TS7006: Parameter 'error' implicitly has an 'any' type.

07:46:03.380 src/hooks/useRealTimeDataFixed.ts(480,39): error TS2559: Type 'string\[]' has no properties in common with type 'QueryFilters<readonly unknown\[]>'.

07:46:03.380 src/hooks/useRealTimeDataFixed.ts(508,37): error TS2559: Type 'string\[]' has no properties in common with type 'InvalidateQueryFilters<readonly unknown\[]>'.

07:46:03.380 src/hooks/useRealTimeDataFixed.ts(527,39): error TS2559: Type 'string\[]' has no properties in common with type 'QueryFilters<readonly unknown\[]>'.

07:46:03.380 src/hooks/useRealTimeDataFixed.ts(528,39): error TS2559: Type 'string\[]' has no properties in common with type 'QueryFilters<readonly unknown\[]>'.

07:46:03.380 src/hooks/useRealTimeDataFixed.ts(572,37): error TS2559: Type 'string\[]' has no properties in common with type 'InvalidateQueryFilters<readonly unknown\[]>'.

07:46:03.380 src/hooks/useRealTimeDataFixed.ts(573,37): error TS2559: Type 'string\[]' has no properties in common with type 'InvalidateQueryFilters<readonly unknown\[]>'.

07:46:03.380 src/hooks/useRealTimeDataFixed.ts(586,39): error TS2559: Type 'string\[]' has no properties in common with type 'QueryFilters<readonly unknown\[]>'.

07:46:03.380 src/hooks/useRealTimeDataFixed.ts(602,33): error TS2559: Type 'string\[]' has no properties in common with type 'QueryFilters<readonly unknown\[]>'.

07:46:03.380 src/hooks/useRealTimeDataFixed.ts(603,37): error TS2559: Type 'string\[]' has no properties in common with type 'InvalidateQueryFilters<readonly unknown\[]>'.

07:46:03.380 src/hooks/useRealTimeDataFixed.ts(619,7): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{}'.

07:46:03.380   No index signature with a parameter of type 'string' was found on type '{}'.

07:46:03.380 src/hooks/useRealTimeDataFixed.ts(619,21): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{}'.

07:46:03.380   No index signature with a parameter of type 'string' was found on type '{}'.

07:46:03.380 src/hooks/useRealTimeDataFixed.ts(629,15): error TS18046: 'pageParam' is of type 'unknown'.

07:46:03.380 src/hooks/useRealTimeDataFixed.ts(645,7): error TS18046: 'lastPage' is of type 'unknown'.

07:46:03.380 src/hooks/useRealTimeDataFixed.ts(645,39): error TS18046: 'lastPage' is of type 'unknown'.

07:46:03.380 src/hooks/useRealTimeDataFixed.ts(646,5): error TS2769: No overload matches this call.

07:46:03.380   Overload 1 of 3, '(options: DefinedInitialDataInfiniteOptions<unknown, Error, InfiniteData<unknown, unknown>, readonly unknown\[], unknown>, queryClient?: QueryClient | undefined): DefinedUseInfiniteQueryResult<...>', gave the following error.

07:46:03.380     Object literal may only specify known properties, and 'keepPreviousData' does not exist in type 'DefinedInitialDataInfiniteOptions<unknown, Error, InfiniteData<unknown, unknown>, readonly unknown\[], unknown>'.

07:46:03.380   Overload 2 of 3, '(options: UndefinedInitialDataInfiniteOptions<unknown, Error, InfiniteData<unknown, unknown>, readonly unknown\[], unknown>, queryClient?: QueryClient | undefined): UseInfiniteQueryResult<...>', gave the following error.

07:46:03.380     Object literal may only specify known properties, and 'keepPreviousData' does not exist in type 'UndefinedInitialDataInfiniteOptions<unknown, Error, InfiniteData<unknown, unknown>, readonly unknown\[], unknown>'.

07:46:03.380   Overload 3 of 3, '(options: UseInfiniteQueryOptions<unknown, Error, InfiniteData<unknown, unknown>, readonly unknown\[], unknown>, queryClient?: QueryClient | undefined): UseInfiniteQueryResult<...>', gave the following error.

07:46:03.380     Object literal may only specify known properties, and 'keepPreviousData' does not exist in type 'UseInfiniteQueryOptions<unknown, Error, InfiniteData<unknown, unknown>, readonly unknown\[], unknown>'.

07:46:03.380 src/hooks/useRealTimeDataFixed.ts(655,15): error TS7006: Parameter 'error' implicitly has an 'any' type.

07:46:03.380 src/hooks/useSuppliers.ts(116,22): error TS2345: Argument of type '(prev: DatabaseSupplier\[]) => (DatabaseSupplier | Supplier)\[]' is not assignable to parameter of type 'SetStateAction<DatabaseSupplier\[]>'.

07:46:03.380   Type '(prev: DatabaseSupplier\[]) => (DatabaseSupplier | Supplier)\[]' is not assignable to type '(prevState: DatabaseSupplier\[]) => DatabaseSupplier\[]'.

07:46:03.380     Type '(DatabaseSupplier | Supplier)\[]' is not assignable to type 'DatabaseSupplier\[]'.

07:46:03.380       Type 'DatabaseSupplier | Supplier' is not assignable to type 'DatabaseSupplier'.

07:46:03.380         Type 'Supplier' is missing the following properties from type 'DatabaseSupplier': performance\_tier, preferred\_supplier, spend\_last\_12\_months, rating, and 2 more.

07:46:03.380 src/hooks/useSuppliers.ts(151,22): error TS2345: Argument of type '(prev: DatabaseSupplier\[]) => (DatabaseSupplier | Supplier)\[]' is not assignable to parameter of type 'SetStateAction<DatabaseSupplier\[]>'.

07:46:03.380   Type '(prev: DatabaseSupplier\[]) => (DatabaseSupplier | Supplier)\[]' is not assignable to type '(prevState: DatabaseSupplier\[]) => DatabaseSupplier\[]'.

07:46:03.380     Type '(DatabaseSupplier | Supplier)\[]' is not assignable to type 'DatabaseSupplier\[]'.

07:46:03.380       Type 'DatabaseSupplier | Supplier' is not assignable to type 'DatabaseSupplier'.

07:46:03.380         Type 'Supplier' is missing the following properties from type 'DatabaseSupplier': performance\_tier, preferred\_supplier, spend\_last\_12\_months, rating, and 2 more.

07:46:03.380 src/lib/ai/config.ts(439,6): error TS2345: Argument of type '{}' is not assignable to parameter of type 'Record<AIProvider, AIProviderConfig>'.

07:46:03.380   Type '{}' is missing the following properties from type 'Record<AIProvider, AIProviderConfig>': openai, anthropic, vercel, "openai-compatible"

07:46:03.381 src/lib/ai/config.ts(450,5): error TS2322: Type 'string' is not assignable to type 'Record<AIProvider, AIProviderConfig>'.

07:46:03.381   Type 'string' is not assignable to type 'Record<AIProvider, AIProviderConfig>'.

07:46:03.381 src/lib/ai/config.ts(453,29): error TS2339: Property 'openai' does not exist on type 'AIProvider'.

07:46:03.381   Property 'openai' does not exist on type '"openai"'.

07:46:03.381 src/lib/ai/config.ts(454,32): error TS2339: Property 'anthropic' does not exist on type 'AIProvider'.

07:46:03.381   Property 'anthropic' does not exist on type '"openai"'.

07:46:03.381 src/lib/ai/config.ts(455,35): error TS2339: Property 'vercel' does not exist on type 'AIProvider'.

07:46:03.381   Property 'vercel' does not exist on type '"openai"'.

07:46:03.382 src/lib/ai/config.ts(456,37): error TS2339: Property 'vercel' does not exist on type 'AIProvider'.

07:46:03.382   Property 'vercel' does not exist on type '"openai"'.

07:46:03.382 src/lib/ai/config.ts(457,40): error TS7015: Element implicitly has an 'any' type because index expression is not of type 'number'.

07:46:03.382 src/lib/ai/config.ts(458,39): error TS7015: Element implicitly has an 'any' type because index expression is not of type 'number'.

07:46:03.382 src/lib/ai/database-integration.ts(17,40): error TS2307: Cannot find module '@/lib/database/connection' or its corresponding type declarations.

07:46:03.382 src/lib/ai/database-integration.ts(146,9): error TS2322: Type 'LanguageModelV1' is not assignable to type 'LanguageModel'.

07:46:03.382   Property 'supportedUrls' is missing in type 'LanguageModelV1' but required in type 'LanguageModelV2'.

07:46:03.382 src/lib/ai/database-integration.ts(239,9): error TS2322: Type 'LanguageModelV1' is not assignable to type 'LanguageModel'.

07:46:03.382   Property 'supportedUrls' is missing in type 'LanguageModelV1' but required in type 'LanguageModelV2'.

07:46:03.382 src/lib/ai/database-integration.ts(298,9): error TS2322: Type 'LanguageModelV1' is not assignable to type 'LanguageModel'.

07:46:03.382   Property 'supportedUrls' is missing in type 'LanguageModelV1' but required in type 'LanguageModelV2'.

07:46:03.382 src/lib/ai/database-integration.ts(399,9): error TS2322: Type 'LanguageModelV1' is not assignable to type 'LanguageModel'.

07:46:03.382   Property 'supportedUrls' is missing in type 'LanguageModelV1' but required in type 'LanguageModelV2'.

07:46:03.382 src/lib/ai/database-integration.ts(438,44): error TS1064: The return type of an async function or method must be the global Promise<T> type. Did you mean to write 'Promise<AsyncIterable<string>>'?

07:46:03.382 src/lib/ai/database-integration.ts(440,7): error TS2322: Type 'LanguageModelV1' is not assignable to type 'LanguageModel'.

07:46:03.382   Property 'supportedUrls' is missing in type 'LanguageModelV1' but required in type 'LanguageModelV2'.

07:46:03.382 src/lib/ai/providers.ts(468,9): error TS2322: Type 'unknown' is not assignable to type 'LanguageModel'.

07:46:03.382 src/lib/ai/providers.ts(520,9): error TS2416: Property 'streamText' in type 'ProviderClient' is not assignable to the same property in base type 'AIClient'.

07:46:03.382   Type '(prompt: string, options?: AIProviderRuntimeOptions | undefined) => Promise<AsyncIterable<AIStreamChunk>>' is not assignable to type '(prompt: string, options?: AIProviderRuntimeOptions | undefined) => AsyncIterable<AIStreamChunk>'.

07:46:03.382     Property '\[Symbol.asyncIterator]' is missing in type 'Promise<AsyncIterable<AIStreamChunk>>' but required in type 'AsyncIterable<AIStreamChunk>'.

07:46:03.382 src/lib/ai/providers.ts(531,9): error TS2322: Type 'unknown' is not assignable to type 'LanguageModel'.

07:46:03.382 src/lib/ai/providers.ts(618,9): error TS2322: Type 'unknown' is not assignable to type 'LanguageModel'.

07:46:03.382 src/lib/ai/providers.ts(693,11): error TS2322: Type 'unknown' is not assignable to type 'EmbeddingModel<string>'.

07:46:03.382 src/lib/ai/providers.ts(701,65): error TS2559: Type 'EmbeddingModelUsage' has no properties in common with type '{ inputTokens?: number | undefined; outputTokens?: number | undefined; totalTokens?: number | undefined; }'.

07:46:03.382 src/lib/ai/providers.ts(722,9): error TS2322: Type 'unknown' is not assignable to type 'EmbeddingModel<string>'.

07:46:03.382 src/lib/ai/providers.ts(730,63): error TS2559: Type 'EmbeddingModelUsage' has no properties in common with type '{ inputTokens?: number | undefined; outputTokens?: number | undefined; totalTokens?: number | undefined; }'.

07:46:03.382 src/lib/ai/providers.ts(906,74): error TS2322: Type 'ProviderClient' is not assignable to type 'AIClient'.

07:46:03.382   The types returned by 'streamText(...)' are incompatible between these types.

07:46:03.382     Property '\[Symbol.asyncIterator]' is missing in type 'Promise<AsyncIterable<AIStreamChunk>>' but required in type 'AsyncIterable<AIStreamChunk>'.

07:46:03.382 src/lib/ai/providers.ts(910,3): error TS2322: Type 'ProviderClient\[]' is not assignable to type 'AIClient\[]'.

07:46:03.382   Type 'ProviderClient' is not assignable to type 'AIClient'.

07:46:03.383     The types returned by 'streamText(...)' are incompatible between these types.

07:46:03.383       Property '\[Symbol.asyncIterator]' is missing in type 'Promise<AsyncIterable<AIStreamChunk>>' but required in type 'AsyncIterable<AIStreamChunk>'.

07:46:03.383 src/lib/ai/services/base.ts(50,18): error TS2430: Interface 'AIUsageEventEnvelope' incorrectly extends interface 'AIUsageEvent'.

07:46:03.383   Types of property 'operation' are incompatible.

07:46:03.383     Type 'string' is not assignable to type '"chat" | "embed" | "generate" | "stream"'.

07:46:03.383 src/lib/ai/services/base.ts(239,32): error TS2345: Argument of type 'AIServiceResponse<TResult | undefined>' is not assignable to parameter of type 'AIServiceResponse<TResult>'.

07:46:03.383   Type 'TResult | undefined' is not assignable to type 'TResult'.

07:46:03.383     'TResult' could be instantiated with an arbitrary type which could be unrelated to 'TResult | undefined'.

07:46:03.383 src/lib/ai/services/chat.ts(64,17): error TS2339: Property 'templateId' does not exist on type 'ConversationOptions'.

07:46:03.383 src/lib/ai/services/chat.ts(65,66): error TS2339: Property 'templateId' does not exist on type 'ConversationOptions'.

07:46:03.383 src/lib/analytics/advanced-ml-models.ts(56,11): error TS2564: Property 'weights' has no initializer and is not definitely assigned in the constructor.

07:46:03.383 src/lib/analytics/advanced-ml-models.ts(57,11): error TS2564: Property 'biases' has no initializer and is not definitely assigned in the constructor.

07:46:03.383 src/lib/analytics/advanced-ml-models.ts(79,25): error TS2345: Argument of type 'number\[]\[]' is not assignable to parameter of type 'number\[]'.

07:46:03.383   Type 'number\[]' is not assignable to type 'number'.

07:46:03.383 src/lib/analytics/advanced-ml-models.ts(80,24): error TS2345: Argument of type 'number\[]' is not assignable to parameter of type 'number'.

07:46:03.383 src/lib/analytics/advanced-ml-models.ts(99,19): error TS7053: Element implicitly has an 'any' type because expression of type 'number' can't be used to index type 'Number'.

07:46:03.383   No index signature with a parameter of type 'number' was found on type 'Number'.

07:46:03.383 src/lib/analytics/advanced-ml-models.ts(101,35): error TS7053: Element implicitly has an 'any' type because expression of type 'number' can't be used to index type 'Number'.

07:46:03.383   No index signature with a parameter of type 'number' was found on type 'Number'.

07:46:03.383 src/lib/analytics/advanced-ml-models.ts(128,19): error TS7053: Element implicitly has an 'any' type because expression of type 'number' can't be used to index type 'Number'.

07:46:03.383   No index signature with a parameter of type 'number' was found on type 'Number'.

07:46:03.383 src/lib/analytics/advanced-ml-models.ts(130,36): error TS7053: Element implicitly has an 'any' type because expression of type 'number' can't be used to index type 'Number'.

07:46:03.383   No index signature with a parameter of type 'number' was found on type 'Number'.

07:46:03.383 src/lib/analytics/advanced-ml-models.ts(147,48): error TS2339: Property 'length' does not exist on type 'number'.

07:46:03.384 src/lib/analytics/advanced-ml-models.ts(148,11): error TS7053: Element implicitly has an 'any' type because expression of type 'number' can't be used to index type 'Number'.

07:46:03.384   No index signature with a parameter of type 'number' was found on type 'Number'.

07:46:03.384 src/lib/analytics/advanced-ml-models.ts(150,9): error TS7053: Element implicitly has an 'any' type because expression of type 'number' can't be used to index type 'Number'.

07:46:03.384   No index signature with a parameter of type 'number' was found on type 'Number'.

07:46:03.384 src/lib/analytics/analytics-integration.ts(113,11): error TS2564: Property 'mlModels' has no initializer and is not definitely assigned in the constructor.

07:46:03.384 src/lib/analytics/analytics-integration.ts(114,11): error TS2564: Property 'queryOptimizer' has no initializer and is not definitely assigned in the constructor.

07:46:03.384 src/lib/analytics/analytics-integration.ts(115,11): error TS2564: Property 'dbMonitor' has no initializer and is not definitely assigned in the constructor.

07:46:03.384 src/lib/analytics/analytics-integration.ts(116,11): error TS2564: Property 'predictiveService' has no initializer and is not definitely assigned in the constructor.

07:46:03.384 src/lib/analytics/analytics-integration.ts(117,11): error TS2564: Property 'recommendationEngine' has no initializer and is not definitely assigned in the constructor.

07:46:03.384 src/lib/analytics/analytics-integration.ts(118,11): error TS2564: Property 'anomalyDetection' has no initializer and is not definitely assigned in the constructor.

07:46:03.384 src/lib/analytics/analytics-integration.ts(119,11): error TS2564: Property 'workflowEngine' has no initializer and is not definitely assigned in the constructor.

07:46:03.384 src/lib/analytics/analytics-integration.ts(120,11): error TS2564: Property 'insightsGenerator' has no initializer and is not definitely assigned in the constructor.

07:46:03.384 src/lib/analytics/analytics-integration.ts(121,11): error TS2564: Property 'dashboardManager' has no initializer and is not definitely assigned in the constructor.

07:46:03.384 src/lib/analytics/analytics-integration.ts(122,11): error TS2564: Property 'performanceManager' has no initializer and is not definitely assigned in the constructor.

07:46:03.384 src/lib/analytics/analytics-integration.ts(211,40): error TS2339: Property 'enhanceDashboard' does not exist on type 'SmartDashboardManager'.

07:46:03.384 src/lib/analytics/analytics-integration.ts(289,46): error TS2339: Property 'optimizeQueriesForOrganization' does not exist on type 'QueryPerformanceAnalyzer'.

07:46:03.384 src/lib/analytics/analytics-integration.ts(331,7): error TS2559: Type 'string' has no properties in common with type '{ focus?: "risk\_reduction" | "sustainability" | "cost\_optimization" | "quality\_improvement" | undefined; urgency?: "immediate" | "short\_term" | "long\_term" | undefined; scope?: "supplier" | ... 3 more ... | undefined; }'.

07:46:03.384 src/lib/analytics/analytics-integration.ts(345,40): error TS2551: Property 'getRecentAnomalies' does not exist on type 'RealTimeAnomalyDetectionEngine'. Did you mean 'detectAnomalies'?

07:46:03.384 src/lib/analytics/analytics-integration.ts(394,7): error TS2554: Expected 0 arguments, but got 1.

07:46:03.384 src/lib/analytics/analytics-integration.ts(399,45): error TS2367: This comparison appears to be unintentional because the types '"failed" | "active" | "completed" | "paused"' and '"pending"' have no overlap.

07:46:03.384 src/lib/analytics/analytics-integration.ts(402,20): error TS2339: Property 'lastExecution' does not exist on type 'OptimizationWorkflow'.

07:46:03.384 src/lib/analytics/analytics-integration.ts(411,49): error TS2339: Property 'getWorkflowHistory' does not exist on type 'AutomatedWorkflowEngine'.

07:46:03.384 src/lib/analytics/analytics-integration.ts(417,36): error TS7006: Parameter 'w' implicitly has an 'any' type.

07:46:03.384 src/lib/analytics/analytics-integration.ts(418,33): error TS7006: Parameter 'w' implicitly has an 'any' type.

07:46:03.384 src/lib/analytics/analytics-integration.ts(503,21): error TS2554: Expected 1 arguments, but got 0.

07:46:03.384 src/lib/analytics/analytics-integration.ts(506,30): error TS2554: Expected 1 arguments, but got 0.

07:46:03.384 src/lib/analytics/analytics-integration.ts(507,33): error TS2554: Expected 1 arguments, but got 0.

07:46:03.384 src/lib/analytics/analytics-integration.ts(508,29): error TS2554: Expected 1 arguments, but got 0.

07:46:03.384 src/lib/analytics/analytics-integration.ts(509,27): error TS2554: Expected 1 arguments, but got 0.

07:46:03.384 src/lib/analytics/analytics-integration.ts(510,30): error TS2554: Expected 1 arguments, but got 0.

07:46:03.384 src/lib/analytics/analytics-integration.ts(511,29): error TS2554: Expected 1 arguments, but got 0.

07:46:03.384 src/lib/analytics/analytics-integration.ts(520,47): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

07:46:03.384 src/lib/analytics/analytics-integration.ts(521,12): error TS2339: Property 'then' does not exist on type 'void'.

07:46:03.384 src/lib/analytics/analytics-integration.ts(527,29): error TS2341: Property 'initializeWorkflows' is private and only accessible within class 'AutomatedWorkflowEngine'.

07:46:03.384 src/lib/analytics/analytics-integration.ts(527,49): error TS2554: Expected 0 arguments, but got 1.

07:46:03.384 src/lib/analytics/analytics-integration.ts(611,7): error TS2554: Expected 0 arguments, but got 1.

07:46:03.384 src/lib/analytics/analytics-integration.ts(615,11): error TS2367: This comparison appears to be unintentional because the types '"failed" | "active" | "completed" | "paused"' and '"pending"' have no overlap.

07:46:03.384 src/lib/analytics/analytics-integration.ts(615,53): error TS2339: Property 'automated' does not exist on type 'OptimizationWorkflow'.

07:46:03.384 src/lib/analytics/automated-optimization.ts(364,27): error TS18046: 'error' is of type 'unknown'.

07:46:03.384 src/lib/analytics/automated-optimization.ts(624,27): error TS18046: 'error' is of type 'unknown'.

07:46:03.384 src/lib/analytics/automated-optimization.ts(1057,12): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ supplier\_evaluation: string; inventory\_decision: string; contract\_renewal: string; budget\_allocation: string; risk\_assessment: string; }'.

07:46:03.384   No index signature with a parameter of type 'string' was found on type '{ supplier\_evaluation: string; inventory\_decision: string; contract\_renewal: string; budget\_allocation: string; risk\_assessment: string; }'.

07:46:03.384 src/lib/analytics/data-processor.ts(209,11): error TS7034: Variable 'priorityActions' implicitly has type 'any\[]' in some locations where its type cannot be determined.

07:46:03.384 src/lib/analytics/data-processor.ts(227,24): error TS7005: Variable 'priorityActions' implicitly has an 'any\[]' type.

07:46:03.384 src/lib/analytics/intelligent-recommendations.ts(153,66): error TS7006: Parameter 'item' implicitly has an 'any' type.

07:46:03.384 src/lib/analytics/intelligent-recommendations.ts(153,72): error TS7006: Parameter 'index' implicitly has an 'any' type.

07:46:03.384 src/lib/analytics/intelligent-recommendations.ts(163,61): error TS7006: Parameter 'item' implicitly has an 'any' type.

07:46:03.384 src/lib/analytics/intelligent-recommendations.ts(163,67): error TS7006: Parameter 'index' implicitly has an 'any' type.

07:46:03.384 src/lib/analytics/intelligent-recommendations.ts(898,24): error TS2322: Type 'string' is not assignable to type 'never'.

07:46:03.384 src/lib/analytics/intelligent-recommendations.ts(905,24): error TS2322: Type 'string' is not assignable to type 'never'.

07:46:03.384 src/lib/analytics/intelligent-recommendations.ts(913,24): error TS2322: Type 'string' is not assignable to type 'never'.

07:46:03.384 src/lib/analytics/ml-models.ts(291,31): error TS2339: Property 'unitPrice' does not exist on type 'InventoryItem'.

07:46:03.384 src/lib/analytics/ml-models.ts(432,36): error TS2339: Property 'maxStock' does not exist on type 'InventoryItem'.

07:46:03.384 src/lib/analytics/predictive-analytics.ts(301,48): error TS2339: Property 'next30Days' does not exist on type '{ date: Date; predicted: number; lowerBound: number; upperBound: number; seasonalComponent: number; trendComponent: number; }\[]'.

07:46:03.384 src/lib/analytics/predictive-analytics.ts(302,33): error TS2339: Property 'confidence' does not exist on type 'TimeSeriesForecast'.

07:46:03.384 src/lib/analytics/predictive-analytics.ts(323,38): error TS2339: Property 'next7Days' does not exist on type '{ date: Date; predicted: number; lowerBound: number; upperBound: number; seasonalComponent: number; trendComponent: number; }\[]'.

07:46:03.384 src/lib/analytics/predictive-analytics.ts(326,41): error TS2339: Property 'next7Days' does not exist on type '{ date: Date; predicted: number; lowerBound: number; upperBound: number; seasonalComponent: number; trendComponent: number; }\[]'.

07:46:03.384 src/lib/analytics/predictive-analytics.ts(331,41): error TS2339: Property 'next30Days' does not exist on type '{ date: Date; predicted: number; lowerBound: number; upperBound: number; seasonalComponent: number; trendComponent: number; }\[]'.

07:46:03.384 src/lib/analytics/predictive-analytics.ts(336,41): error TS2339: Property 'next90Days' does not exist on type '{ date: Date; predicted: number; lowerBound: number; upperBound: number; seasonalComponent: number; trendComponent: number; }\[]'.

07:46:03.384 src/lib/analytics/predictive-analytics.ts(342,31): error TS2339: Property 'seasonality' does not exist on type 'TimeSeriesForecast'.

07:46:03.384 src/lib/analytics/predictive-analytics.ts(343,33): error TS2339: Property 'seasonality' does not exist on type 'TimeSeriesForecast'.

07:46:03.384 src/lib/analytics/predictive-analytics.ts(343,67): error TS7006: Parameter 'sum' implicitly has an 'any' type.

07:46:03.384 src/lib/analytics/predictive-analytics.ts(343,72): error TS7006: Parameter 'val' implicitly has an 'any' type.

07:46:03.384 src/lib/analytics/predictive-analytics.ts(344,34): error TS2339: Property 'seasonality' does not exist on type 'TimeSeriesForecast'.

07:46:03.384 src/lib/analytics/predictive-analytics.ts(344,69): error TS7006: Parameter 'sum' implicitly has an 'any' type.

07:46:03.384 src/lib/analytics/predictive-analytics.ts(344,74): error TS7006: Parameter 'val' implicitly has an 'any' type.

07:46:03.384 src/lib/analytics/predictive-analytics.ts(385,9): error TS2739: Type '{ lower: number; upper: number; }' is missing the following properties from type '{ min: number; max: number; }': min, max

07:46:03.384 src/lib/analytics/predictive-analytics.ts(741,11): error TS7034: Variable 'riskAssessment' implicitly has type 'any\[]' in some locations where its type cannot be determined.

07:46:03.384 src/lib/analytics/predictive-analytics.ts(742,11): error TS7034: Variable 'performanceTrends' implicitly has type 'any\[]' in some locations where its type cannot be determined.

07:46:03.384 src/lib/analytics/predictive-analytics.ts(777,7): error TS7005: Variable 'riskAssessment' implicitly has an 'any\[]' type.

07:46:03.384 src/lib/analytics/predictive-analytics.ts(778,7): error TS7005: Variable 'performanceTrends' implicitly has an 'any\[]' type.

07:46:03.385 src/lib/analytics/query-optimizer.ts(125,82): error TS2345: Argument of type 'number | null' is not assignable to parameter of type 'number'.

07:46:03.385   Type 'null' is not assignable to type 'number'.

07:46:03.385 src/lib/analytics/query-optimizer.ts(289,11): error TS2564: Property 'optimizationPatterns' has no initializer and is not definitely assigned in the constructor.

07:46:03.385 src/lib/analytics/query-optimizer.ts(672,5): error TS2322: Type '{ type: string; priority: string; description: string; expectedImprovement: string; implementation: string; }\[]' is not assignable to type '{ type: "index" | "query" | "schema" | "configuration"; priority: "critical" | "low" | "medium" | "high"; description: string; expectedImprovement: string; implementation: string; }\[]'.

07:46:03.385   Type '{ type: string; priority: string; description: string; expectedImprovement: string; implementation: string; }' is not assignable to type '{ type: "index" | "query" | "schema" | "configuration"; priority: "critical" | "low" | "medium" | "high"; description: string; expectedImprovement: string; implementation: string; }'.

07:46:03.385     Types of property 'type' are incompatible.

07:46:03.385       Type 'string' is not assignable to type '"index" | "query" | "schema" | "configuration"'.

07:46:03.385 src/lib/analytics/real-time-anomaly-detection.ts(860,13): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ supplier\_performance: number; inventory\_movement: number; price\_fluctuation: number; }'.

07:46:03.385   No index signature with a parameter of type 'string' was found on type '{ supplier\_performance: number; inventory\_movement: number; price\_fluctuation: number; }'.

07:46:03.385 src/lib/analytics/real-time-anomaly-detection.ts(897,15): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ supplier\_performance: string; inventory\_movement: string; price\_fluctuation: string; }'.

07:46:03.385   No index signature with a parameter of type 'string' was found on type '{ supplier\_performance: string; inventory\_movement: string; price\_fluctuation: string; }'.

07:46:03.385 src/lib/api-client.ts(210,18): error TS18046: 'error' is of type 'unknown'.

07:46:03.385 src/lib/api-client.ts(211,26): error TS2339: Property 'response' does not exist on type '{}'.

07:46:03.385 src/lib/api/middleware.ts(233,11): error TS2741: Property 'endpoint' is missing in type '{ allowed: boolean; limit: number; remaining: number; resetTime: Date; }' but required in type '{ endpoint: string; limit: number; remaining: number; resetTime: Date; }'.

07:46:03.385 src/lib/api/middleware.ts(472,20): error TS2339: Property 'ip' does not exist on type 'NextRequest'.

07:46:03.385 src/lib/api/middleware.ts(570,15): error TS2484: Export declaration conflicts with exported declaration of 'RequestContext'.

07:46:03.385 src/lib/api/middleware.ts(570,31): error TS2484: Export declaration conflicts with exported declaration of 'ApiResponse'.

07:46:03.385 src/lib/api/middleware.ts(570,44): error TS2484: Export declaration conflicts with exported declaration of 'AuthenticatedUser'.

07:46:03.385 src/lib/api/supplier-portfolio-client-enhanced.ts(32,3): error TS2305: Module '"@/types/supplier-portfolio"' has no exported member 'SelectionWorkflowRequest'.

07:46:03.385 src/lib/api/supplier-portfolio-client-enhanced.ts(40,14): error TS2323: Cannot redeclare exported variable 'APIError'.

07:46:03.385 src/lib/api/supplier-portfolio-client-enhanced.ts(707,38): error TS2323: Cannot redeclare exported variable 'APIError'.

07:46:03.385 src/lib/api/supplier-portfolio-client-enhanced.ts(707,38): error TS2484: Export declaration conflicts with exported declaration of 'APIError'.

07:46:03.385 src/lib/api/suppliers.ts(90,28): error TS2304: Cannot find name 'pool'.

07:46:03.385 src/lib/api/suppliers.ts(92,30): error TS7006: Parameter 'row' implicitly has an 'any' type.

07:46:03.385 src/lib/api/suppliers.ts(102,28): error TS2304: Cannot find name 'pool'.

07:46:03.385 src/lib/api/suppliers.ts(331,9): error TS2322: Type 'null' is not assignable to type 'number | undefined'.

07:46:03.385 src/lib/api/suppliers.ts(332,9): error TS2322: Type 'null' is not assignable to type 'number | undefined'.

07:46:03.385 src/lib/api/suppliers.ts(341,9): error TS2322: Type 'null' is not assignable to type 'number | undefined'.

07:46:03.386 src/lib/api/suppliers.ts(343,9): error TS2322: Type 'null' is not assignable to type 'number | undefined'.

07:46:03.386 src/lib/auth.ts(9,20): error TS2307: Cannot find module './db' or its corresponding type declarations.

07:46:03.386 src/lib/auth/auth-context.tsx(4,10): error TS2305: Module '"@/types/auth"' has no exported member 'AuthContext'.

07:46:03.386 src/lib/auth/auth-context.tsx(4,63): error TS2724: '"@/types/auth"' has no exported member named 'SignInCredentials'. Did you mean 'LoginCredentials'?

07:46:03.386 src/lib/auth/auth-context.tsx(4,82): error TS2305: Module '"@/types/auth"' has no exported member 'SignUpData'.

07:46:03.386 src/lib/auth/auth-context.tsx(52,41): error TS2339: Property 'signIn' does not exist on type 'AuthProvider'.

07:46:03.386 src/lib/auth/auth-context.tsx(75,41): error TS2339: Property 'signUp' does not exist on type 'AuthProvider'.

07:46:03.386 src/lib/auth/auth-context.tsx(98,26): error TS2339: Property 'signOut' does not exist on type 'AuthProvider'.

07:46:03.386 src/lib/auth/auth-context.tsx(130,22): error TS2339: Property 'permissions' does not exist on type '"admin" | "manager" | "user" | "viewer" | "super\_admin"'.

07:46:03.386   Property 'permissions' does not exist on type '"admin"'.

07:46:03.386 src/lib/auth/auth-context.tsx(130,39): error TS7006: Parameter 'p' implicitly has an 'any' type.

07:46:03.386 src/lib/auth/auth-context.tsx(136,22): error TS2339: Property 'name' does not exist on type '"admin" | "manager" | "user" | "viewer" | "super\_admin"'.

07:46:03.386   Property 'name' does not exist on type '"admin"'.

07:46:03.386 src/lib/auth/auth-context.tsx(143,19): error TS2339: Property 'name' does not exist on type '"admin" | "manager" | "user" | "viewer" | "super\_admin"'.

07:46:03.386   Property 'name' does not exist on type '"admin"'.

07:46:03.386 src/lib/auth/auth-context.tsx(143,55): error TS2339: Property 'name' does not exist on type '"admin" | "manager" | "user" | "viewer" | "super\_admin"'.

07:46:03.386   Property 'name' does not exist on type '"admin"'.

07:46:03.386 src/lib/auth/multi-tenant-auth.ts(215,19): error TS2769: No overload matches this call.

07:46:03.386   Overload 1 of 5, '(payload: string | object | Buffer<ArrayBufferLike>, secretOrPrivateKey: null, options?: (SignOptions \& { algorithm: "none"; }) | undefined): string', gave the following error.

07:46:03.386     Argument of type 'string' is not assignable to parameter of type 'null'.

07:46:03.386   Overload 2 of 5, '(payload: string | object | Buffer<ArrayBufferLike>, secretOrPrivateKey: Buffer<ArrayBufferLike> | Secret | PrivateKeyInput | JsonWebKeyInput, options?: SignOptions | undefined): string', gave the following error.

07:46:03.386     Type 'string' is not assignable to type 'number | StringValue | undefined'.

07:46:03.386   Overload 3 of 5, '(payload: string | object | Buffer<ArrayBufferLike>, secretOrPrivateKey: Buffer<ArrayBufferLike> | Secret | PrivateKeyInput | JsonWebKeyInput, callback: SignCallback): void', gave the following error.

07:46:03.386     Object literal may only specify known properties, and 'expiresIn' does not exist in type 'SignCallback'.

07:46:03.386 src/lib/auth/multi-tenant-auth.ts(227,26): error TS2769: No overload matches this call.

07:46:03.386   Overload 1 of 5, '(payload: string | object | Buffer<ArrayBufferLike>, secretOrPrivateKey: null, options?: (SignOptions \& { algorithm: "none"; }) | undefined): string', gave the following error.

07:46:03.386     Argument of type 'string' is not assignable to parameter of type 'null'.

07:46:03.386   Overload 2 of 5, '(payload: string | object | Buffer<ArrayBufferLike>, secretOrPrivateKey: Buffer<ArrayBufferLike> | Secret | PrivateKeyInput | JsonWebKeyInput, options?: SignOptions | undefined): string', gave the following error.

07:46:03.386     Type 'string' is not assignable to type 'number | StringValue | undefined'.

07:46:03.386   Overload 3 of 5, '(payload: string | object | Buffer<ArrayBufferLike>, secretOrPrivateKey: Buffer<ArrayBufferLike> | Secret | PrivateKeyInput | JsonWebKeyInput, callback: SignCallback): void', gave the following error.

07:46:03.386     Object literal may only specify known properties, and 'expiresIn' does not exist in type 'SignCallback'.

07:46:03.386 src/lib/auth/multi-tenant-auth.ts(403,24): error TS2769: No overload matches this call.

07:46:03.386   Overload 1 of 5, '(payload: string | object | Buffer<ArrayBufferLike>, secretOrPrivateKey: null, options?: (SignOptions \& { algorithm: "none"; }) | undefined): string', gave the following error.

07:46:03.386     Argument of type 'string' is not assignable to parameter of type 'null'.

07:46:03.386   Overload 2 of 5, '(payload: string | object | Buffer<ArrayBufferLike>, secretOrPrivateKey: Buffer<ArrayBufferLike> | Secret | PrivateKeyInput | JsonWebKeyInput, options?: SignOptions | undefined): string', gave the following error.

07:46:03.386     Type 'string' is not assignable to type 'number | StringValue | undefined'.

07:46:03.386   Overload 3 of 5, '(payload: string | object | Buffer<ArrayBufferLike>, secretOrPrivateKey: Buffer<ArrayBufferLike> | Secret | PrivateKeyInput | JsonWebKeyInput, callback: SignCallback): void', gave the following error.

07:46:03.386     Object literal may only specify known properties, and 'expiresIn' does not exist in type 'SignCallback'.

07:46:03.386 src/lib/auth/validation.ts(143,15): error TS2769: No overload matches this call.

07:46:03.386   Overload 1 of 2, '(values: \[string, ...string\[]], params?: string | { error?: string | $ZodErrorMap<$ZodIssueInvalidValue<unknown>> | undefined; message?: string | undefined; } | undefined): ZodEnum<...>', gave the following error.

07:46:03.386     Object literal may only specify known properties, and 'errorMap' does not exist in type '{ error?: string | $ZodErrorMap<$ZodIssueInvalidValue<unknown>> | undefined; message?: string | undefined; }'.

07:46:03.386   Overload 2 of 2, '(entries: Readonly<Record<string, EnumValue>>, params?: string | { error?: string | $ZodErrorMap<$ZodIssueInvalidValue<unknown>> | undefined; message?: string | undefined; } | undefined): ZodEnum<...>', gave the following error.

07:46:03.386     Argument of type '\[string, ...string\[]]' is not assignable to parameter of type 'Readonly<Record<string, EnumValue>>'.

07:46:03.386       Index signature for type 'string' is missing in type '\[string, ...string\[]]'.

07:46:03.386 src/lib/auth/validation.ts(176,17): error TS2769: No overload matches this call.

07:46:03.386   Overload 1 of 2, '(values: \[string, ...string\[]], params?: string | { error?: string | $ZodErrorMap<$ZodIssueInvalidValue<unknown>> | undefined; message?: string | undefined; } | undefined): ZodEnum<...>', gave the following error.

07:46:03.386     Object literal may only specify known properties, and 'errorMap' does not exist in type '{ error?: string | $ZodErrorMap<$ZodIssueInvalidValue<unknown>> | undefined; message?: string | undefined; }'.

07:46:03.386   Overload 2 of 2, '(entries: Readonly<Record<string, EnumValue>>, params?: string | { error?: string | $ZodErrorMap<$ZodIssueInvalidValue<unknown>> | undefined; message?: string | undefined; } | undefined): ZodEnum<...>', gave the following error.

07:46:03.386     Argument of type '\[string, ...string\[]]' is not assignable to parameter of type 'Readonly<Record<string, EnumValue>>'.

07:46:03.386       Index signature for type 'string' is missing in type '\[string, ...string\[]]'.

07:46:03.386 src/lib/auth/validation.ts(229,11): error TS2769: No overload matches this call.

07:46:03.386   Overload 1 of 2, '(values: \[string, ...string\[]], params?: string | { error?: string | $ZodErrorMap<$ZodIssueInvalidValue<unknown>> | undefined; message?: string | undefined; } | undefined): ZodEnum<...>', gave the following error.

07:46:03.386     Object literal may only specify known properties, and 'errorMap' does not exist in type '{ error?: string | $ZodErrorMap<$ZodIssueInvalidValue<unknown>> | undefined; message?: string | undefined; }'.

07:46:03.386   Overload 2 of 2, '(entries: Readonly<Record<string, EnumValue>>, params?: string | { error?: string | $ZodErrorMap<$ZodIssueInvalidValue<unknown>> | undefined; message?: string | undefined; } | undefined): ZodEnum<...>', gave the following error.

07:46:03.386     Argument of type '\[string, ...string\[]]' is not assignable to parameter of type 'Readonly<Record<string, EnumValue>>'.

07:46:03.386       Index signature for type 'string' is missing in type '\[string, ...string\[]]'.

07:46:03.386 src/lib/auth/validation.ts(251,11): error TS2769: No overload matches this call.

07:46:03.386   Overload 1 of 2, '(values: \[string, ...string\[]], params?: string | { error?: string | $ZodErrorMap<$ZodIssueInvalidValue<unknown>> | undefined; message?: string | undefined; } | undefined): ZodEnum<...>', gave the following error.

07:46:03.386     Object literal may only specify known properties, and 'errorMap' does not exist in type '{ error?: string | $ZodErrorMap<$ZodIssueInvalidValue<unknown>> | undefined; message?: string | undefined; }'.

07:46:03.386   Overload 2 of 2, '(entries: Readonly<Record<string, EnumValue>>, params?: string | { error?: string | $ZodErrorMap<$ZodIssueInvalidValue<unknown>> | undefined; message?: string | undefined; } | undefined): ZodEnum<...>', gave the following error.

07:46:03.386     Argument of type '\[string, ...string\[]]' is not assignable to parameter of type 'Readonly<Record<string, EnumValue>>'.

07:46:03.386       Index signature for type 'string' is missing in type '\[string, ...string\[]]'.

07:46:03.386 src/lib/bulletproof-fetch.ts(337,22): error TS2339: Property 'message' does not exist on type '{}'.

07:46:03.386 src/lib/bulletproof-fetch.ts(340,22): error TS2339: Property 'code' does not exist on type '{}'.

07:46:03.387 src/lib/cache/event-invalidation.ts(14,25): error TS2459: Module '"./event-bus"' declares 'EventSubscription' locally, but it is not exported.

07:46:03.387 src/lib/cache/event-invalidation.ts(146,46): error TS2345: Argument of type 'readonly unknown\[]' is not assignable to parameter of type 'unknown\[]'.

07:46:03.387   The type 'readonly unknown\[]' is 'readonly' and cannot be assigned to the mutable type 'unknown\[]'.

07:46:03.387 src/lib/config/currency-config.ts(215,7): error TS2783: 'code' is specified more than once, so this usage will be overwritten.

07:46:03.387 src/lib/config/currency-config.ts(282,7): error TS2322: Type '{ \[k: string]: ExchangeRate; }' is not assignable to type 'Record<string, number>'.

07:46:03.387   'string' index signatures are incompatible.

07:46:03.387     Type 'ExchangeRate' is not assignable to type 'number'.

07:46:03.387 src/lib/database/connection-resolver.ts(7,22): error TS2307: Cannot find module './connection' or its corresponding type declarations.

07:46:03.387 src/lib/database/transaction-helper.ts(194,12): error TS2304: Cannot find name 'pool'.

07:46:03.387 src/lib/logging/error-logger.ts(56,7): error TS2739: Type 'Record<string, any>' is missing the following properties from type '{ name: string; message: string; type: string; severity: string; }': name, message, type, severity

07:46:03.387 src/lib/notifications/live-notifications.ts(161,14): error TS2339: Property 'listen' does not exist on type 'DatabaseManager'.

07:46:03.387 src/lib/notifications/live-notifications.ts(161,39): error TS7006: Parameter 'payload' implicitly has an 'any' type.

07:46:03.387 src/lib/offline-manager.ts(293,22): error TS2339: Property 'sync' does not exist on type 'ServiceWorkerRegistration'.

07:46:03.387 src/lib/offline-manager.ts(417,31): error TS2686: 'React' refers to a UMD global, but the current file is a module. Consider adding an import instead.

07:46:03.387 src/lib/offline-manager.ts(419,3): error TS2686: 'React' refers to a UMD global, but the current file is a module. Consider adding an import instead.

07:46:03.387 src/lib/realtime/websocket-server.ts(6,44): error TS7016: Could not find a declaration file for module 'ws'. '/vercel/path0/node\_modules/ws/wrapper.mjs' implicitly has an 'any' type.

07:46:03.387   Try `npm i --save-dev @types/ws` if it exists or add a new declaration (.d.ts) file containing `declare module 'ws';`

07:46:03.387 src/lib/realtime/websocket-server.ts(43,47): error TS7006: Parameter 'request' implicitly has an 'any' type.

07:46:03.394 src/lib/realtime/websocket-server.ts(58,25): error TS7006: Parameter 'data' implicitly has an 'any' type.

07:46:03.394 src/lib/realtime/websocket-server.ts(74,23): error TS7006: Parameter 'error' implicitly has an 'any' type.

07:46:03.394 src/lib/realtime/websocket-server.ts(188,14): error TS2339: Property 'listen' does not exist on type 'DatabaseManager'.

07:46:03.394 src/lib/realtime/websocket-server.ts(188,39): error TS7006: Parameter 'payload' implicitly has an 'any' type.

07:46:03.394 src/lib/security/index.ts(117,27): error TS2551: Property 'createCipher' does not exist on type 'typeof import("crypto")'. Did you mean 'createCipheriv'?

07:46:03.395 src/lib/security/index.ts(133,29): error TS2551: Property 'createDecipher' does not exist on type 'typeof import("crypto")'. Did you mean 'createDecipheriv'?

07:46:03.395 src/lib/services/InventorySelectionService.ts(131,20): error TS2551: Property 'withTransaction' does not exist on type 'NeonQueryFunction<false, false> \& { query: <T = any>(queryText: string, params?: any\[] | undefined) => Promise<{ rows: T\[]; rowCount: number; }>; }'. Did you mean 'transaction'?

07:46:03.395 src/lib/services/InventorySelectionService.ts(131,43): error TS7006: Parameter 'client' implicitly has an 'any' type.

07:46:03.395 src/lib/services/InventorySelectionService.ts(262,18): error TS2551: Property 'withTransaction' does not exist on type 'NeonQueryFunction<false, false> \& { query: <T = any>(queryText: string, params?: any\[] | undefined) => Promise<{ rows: T\[]; rowCount: number; }>; }'. Did you mean 'transaction'?

07:46:03.395 src/lib/services/InventorySelectionService.ts(262,41): error TS7006: Parameter 'client' implicitly has an 'any' type.

07:46:03.395 src/lib/services/InventorySelectionService.ts(300,18): error TS2551: Property 'withTransaction' does not exist on type 'NeonQueryFunction<false, false> \& { query: <T = any>(queryText: string, params?: any\[] | undefined) => Promise<{ rows: T\[]; rowCount: number; }>; }'. Did you mean 'transaction'?

07:46:03.395 src/lib/services/InventorySelectionService.ts(300,41): error TS7006: Parameter 'client' implicitly has an 'any' type.

07:46:03.395 src/lib/services/InventorySelectionService.ts(483,19): error TS2339: Property 'rowCount' does not exist on type 'Record<string, any>\[]'.

07:46:03.395 src/lib/services/InventorySelectionService.ts(498,25): error TS2551: Property 'withTransaction' does not exist on type 'NeonQueryFunction<false, false> \& { query: <T = any>(queryText: string, params?: any\[] | undefined) => Promise<{ rows: T\[]; rowCount: number; }>; }'. Did you mean 'transaction'?

07:46:03.395 src/lib/services/InventorySelectionService.ts(498,48): error TS7006: Parameter 'client' implicitly has an 'any' type.

07:46:03.395 src/lib/services/InventorySelectionService.ts(501,37): error TS2347: Untyped function calls may not accept type arguments.

07:46:03.395 src/lib/services/InventorySelectionService.ts(519,37): error TS2347: Untyped function calls may not accept type arguments.

07:46:03.395 src/lib/services/InventorySelectionService.ts(560,36): error TS2347: Untyped function calls may not accept type arguments.

07:46:03.395 src/lib/services/PriceListProcessor.ts(44,14): error TS2769: No overload matches this call.

07:46:03.395   Overload 1 of 2, '(def: { skipEmptyRows: boolean; validateData: boolean; createBackup: boolean; batchSize: number; duplicateHandling: "update" | "skip" | "create\_variant"; enableLogging: boolean; }): ZodDefault<...>', gave the following error.

07:46:03.395     Argument of type '{}' is not assignable to parameter of type '{ skipEmptyRows: boolean; validateData: boolean; createBackup: boolean; batchSize: number; duplicateHandling: "update" | "skip" | "create\_variant"; enableLogging: boolean; }'.

07:46:03.395       Type '{}' is missing the following properties from type '{ skipEmptyRows: boolean; validateData: boolean; createBackup: boolean; batchSize: number; duplicateHandling: "update" | "skip" | "create\_variant"; enableLogging: boolean; }': skipEmptyRows, validateData, createBackup, batchSize, and 2 more.

07:46:03.395   Overload 2 of 2, '(def: () => { skipEmptyRows: boolean; validateData: boolean; createBackup: boolean; batchSize: number; duplicateHandling: "update" | "skip" | "create\_variant"; enableLogging: boolean; }): ZodDefault<...>', gave the following error.

07:46:03.395     Argument of type '{}' is not assignable to parameter of type '() => { skipEmptyRows: boolean; validateData: boolean; createBackup: boolean; batchSize: number; duplicateHandling: "update" | "skip" | "create\_variant"; enableLogging: boolean; }'.

07:46:03.395       Type '{}' provides no match for the signature '(): { skipEmptyRows: boolean; validateData: boolean; createBackup: boolean; batchSize: number; duplicateHandling: "update" | "skip" | "create\_variant"; enableLogging: boolean; }'.

07:46:03.395 src/lib/services/PriceListProcessor.ts(107,5): error TS2322: Type 'Pool | { readonly totalCount: number; readonly idleCount: number; readonly waitingCount: number; query: <T extends QueryResultRow = any>(text: string, params?: any\[] | undefined, options?: QueryOptions | undefined) => Promise<...>; connect: () => Promise<...>; end: () => Promise<...>; }' is not assignable to type 'Pool'.

07:46:03.395   Type '{ readonly totalCount: number; readonly idleCount: number; readonly waitingCount: number; query: <T extends QueryResultRow = any>(text: string, params?: any\[] | undefined, options?: QueryOptions | undefined) => Promise<...>; connect: () => Promise<...>; end: () => Promise<...>; }' is missing the following properties from type 'Pool': expiredCount, ending, ended, options, and 15 more.

07:46:03.395 src/lib/services/PriceListProcessor.ts(717,47): error TS7006: Parameter 'tag' implicitly has an 'any' type.

07:46:03.404 src/lib/services/PriceListProcessor.ts(948,54): error TS7006: Parameter 'e' implicitly has an 'any' type.

07:46:03.404 src/lib/services/PriceListProcessor.ts(949,59): error TS7006: Parameter 'e' implicitly has an 'any' type.

07:46:03.404 src/lib/services/PricelistService.ts(65,25): error TS2551: Property 'withTransaction' does not exist on type 'NeonQueryFunction<false, false> \& { query: <T = any>(queryText: string, params?: any\[] | undefined) => Promise<{ rows: T\[]; rowCount: number; }>; }'. Did you mean 'transaction'?

07:46:03.404 src/lib/services/PricelistService.ts(65,48): error TS7006: Parameter 'client' implicitly has an 'any' type.

07:46:03.404 src/lib/services/PricelistService.ts(152,21): error TS2339: Property 'rows' does not exist on type 'Record<string, any>\[]'.

07:46:03.404 src/lib/services/PricelistService.ts(152,34): error TS7006: Parameter 'row' implicitly has an 'any' type.

07:46:03.404 src/lib/services/PricelistService.ts(192,18): error TS2339: Property 'rows' does not exist on type 'Record<string, any>\[]'.

07:46:03.404 src/lib/services/PricelistService.ts(192,31): error TS7006: Parameter 'dup' implicitly has an 'any' type.

07:46:03.404 src/lib/services/PricelistService.ts(210,29): error TS2339: Property 'rows' does not exist on type 'Record<string, any>\[]'.

07:46:03.404 src/lib/services/PricelistService.ts(241,46): error TS2339: Property 'rows' does not exist on type 'Record<string, any>\[]'.

07:46:03.404 src/lib/services/PricelistService.ts(242,77): error TS2339: Property 'rows' does not exist on type 'Record<string, any>\[]'.

07:46:03.404 src/lib/services/PricelistService.ts(370,18): error TS2551: Property 'withTransaction' does not exist on type 'NeonQueryFunction<false, false> \& { query: <T = any>(queryText: string, params?: any\[] | undefined) => Promise<{ rows: T\[]; rowCount: number; }>; }'. Did you mean 'transaction'?

07:46:03.404 src/lib/services/PricelistService.ts(370,41): error TS7006: Parameter 'client' implicitly has an 'any' type.

07:46:03.404 src/lib/services/PricelistService.ts(406,33): error TS7006: Parameter 'row' implicitly has an 'any' type.

07:46:03.404 src/lib/services/StockService.ts(22,3): error TS2724: '"../../types/nxt-spp"' has no exported member named 'NxtSohSchema'. Did you mean '\_NxtSohSchema'?

07:46:03.404 src/lib/services/StockService.ts(159,18): error TS2551: Property 'withTransaction' does not exist on type 'NeonQueryFunction<false, false> \& { query: <T = any>(queryText: string, params?: any\[] | undefined) => Promise<{ rows: T\[]; rowCount: number; }>; }'. Did you mean 'transaction'?

07:46:03.404 src/lib/services/StockService.ts(159,41): error TS7006: Parameter 'client' implicitly has an 'any' type.

07:46:03.404 src/lib/services/StockService.ts(415,19): error TS2339: Property 'rows' does not exist on type 'Record<string, any>\[]'.

07:46:03.404 src/lib/services/StockService.ts(415,29): error TS7006: Parameter 'row' implicitly has an 'any' type.

07:46:03.404 src/lib/services/StockService.ts(552,31): error TS2339: Property 'rows' does not exist on type 'Record<string, any>\[]'.

07:46:03.404 src/lib/services/StockService.ts(552,41): error TS7006: Parameter 'row' implicitly has an 'any' type.

07:46:03.404 src/lib/services/StockService.ts(559,43): error TS7006: Parameter 'sum' implicitly has an 'any' type.

07:46:03.404 src/lib/services/StockService.ts(559,48): error TS7006: Parameter 's' implicitly has an 'any' type.

07:46:03.404 src/lib/services/StockService.ts(560,41): error TS7006: Parameter 'sum' implicitly has an 'any' type.

07:46:03.404 src/lib/services/StockService.ts(560,46): error TS7006: Parameter 's' implicitly has an 'any' type.

07:46:03.404 src/lib/services/SupplierProductService.ts(226,18): error TS2551: Property 'withTransaction' does not exist on type 'NeonQueryFunction<false, false> \& { query: <T = any>(queryText: string, params?: any\[] | undefined) => Promise<{ rows: T\[]; rowCount: number; }>; }'. Did you mean 'transaction'?

07:46:03.404 src/lib/services/SupplierProductService.ts(226,40): error TS7006: Parameter 'client' implicitly has an 'any' type.

07:46:03.404 src/lib/services/SupplierProductService.ts(300,19): error TS2339: Property 'rowCount' does not exist on type 'Record<string, any>\[]'.

07:46:03.404 src/lib/services/SupplierProductService.ts(316,19): error TS2339: Property 'rowCount' does not exist on type 'Record<string, any>\[]'.

07:46:03.404 src/lib/services/SupplierProductService.ts(343,19): error TS2339: Property 'rows' does not exist on type 'Record<string, any>\[]'.

07:46:03.405 src/lib/stores/neon-spp-store.ts(119,31): error TS2769: No overload matches this call.

07:46:03.405   Overload 1 of 3, '(name: string, value: string | Blob): void', gave the following error.

07:46:03.405     Argument of type 'File | Buffer<ArrayBufferLike>' is not assignable to parameter of type 'string | Blob'.

07:46:03.405       Type 'Buffer<ArrayBufferLike>' is not assignable to type 'string | Blob'.

07:46:03.405         Type 'Buffer<ArrayBufferLike>' is missing the following properties from type 'Blob': size, type, arrayBuffer, bytes, and 2 more.

07:46:03.405   Overload 2 of 3, '(name: string, value: string): void', gave the following error.

07:46:03.405     Argument of type 'File | Buffer<ArrayBufferLike>' is not assignable to parameter of type 'string'.

07:46:03.405       Type 'File' is not assignable to type 'string'.

07:46:03.405   Overload 3 of 3, '(name: string, blobValue: Blob, filename?: string | undefined): void', gave the following error.

07:46:03.405     Argument of type 'File | Buffer<ArrayBufferLike>' is not assignable to parameter of type 'Blob'.

07:46:03.405       Type 'Buffer<ArrayBufferLike>' is missing the following properties from type 'Blob': size, type, arrayBuffer, bytes, and 2 more.

07:46:03.405 src/lib/upload/file-parser.ts(312,5): error TS2322: Type 'unknown\[]' is not assignable to type 'Record<string, any>\[]'.

07:46:03.405   Type 'unknown' is not assignable to type 'Record<string, any>'.

07:46:03.405 src/lib/utils/dataValidation.ts(176,77): error TS2339: Property 'toLowerCase' does not exist on type 'never'.

07:46:03.405 src/lib/utils/nxt-spp-helpers.ts(12,3): error TS2305: Module '"@/types/supplier-portfolio"' has no exported member 'SelectionWorkflowRequest'.

07:46:03.405 src/lib/utils/nxt-spp-helpers.ts(214,3): error TS2322: Type '{ id: string; sku: string; name: string; supplier\_name: string | undefined; category: string | null; current\_price: number; currency: string | undefined; is\_new: boolean; is\_mapped: boolean; is\_selected: boolean; selectable: boolean; validation\_status: "valid" | ... 1 more ... | "needs\_review"; }\[]' is not assignable to type '{ id: string; sku: string; name: string; supplier\_name: string; category: string | null; current\_price: number; currency: string; is\_new: boolean; is\_mapped: boolean; is\_selected: boolean; selectable: boolean; validation\_status: string; }\[]'.

07:46:03.405   Type '{ id: string; sku: string; name: string; supplier\_name: string | undefined; category: string | null; current\_price: number; currency: string | undefined; is\_new: boolean; is\_mapped: boolean; is\_selected: boolean; selectable: boolean; validation\_status: "valid" | ... 1 more ... | "needs\_review"; }' is not assignable to type '{ id: string; sku: string; name: string; supplier\_name: string; category: string | null; current\_price: number; currency: string; is\_new: boolean; is\_mapped: boolean; is\_selected: boolean; selectable: boolean; validation\_status: string; }'.

07:46:03.405     Types of property 'supplier\_name' are incompatible.

07:46:03.405       Type 'string | undefined' is not assignable to type 'string'.

07:46:03.405         Type 'undefined' is not assignable to type 'string'.

07:46:03.405 src/lib/utils/nxt-spp-helpers.ts(619,3): error TS2322: Type '{ Supplier: string | undefined; SKU: string; Name: string; Brand: string; Category: string; 'Current Price': number; 'Previous Price': number | null; 'Change %': number | null; Currency: string | undefined; 'Is New': string; 'Is Mapped': string; 'Is Selected': string; 'First Seen': string; }\[]' is not assignable to type '{ Supplier: string; SKU: string; Name: string; Brand: string; Category: string; 'Current Price': number; 'Previous Price': number | null; 'Change %': number | null; Currency: string; 'Is New': string; 'Is Mapped': string; 'Is Selected': string; 'First Seen': string; }\[]'.

07:46:03.405   Type '{ Supplier: string | undefined; SKU: string; Name: string; Brand: string; Category: string; 'Current Price': number; 'Previous Price': number | null; 'Change %': number | null; Currency: string | undefined; 'Is New': string; 'Is Mapped': string; 'Is Selected': string; 'First Seen': string; }' is not assignable to type '{ Supplier: string; SKU: string; Name: string; Brand: string; Category: string; 'Current Price': number; 'Previous Price': number | null; 'Change %': number | null; Currency: string; 'Is New': string; 'Is Mapped': string; 'Is Selected': string; 'First Seen': string; }'.

07:46:03.405     Types of property 'Supplier' are incompatible.

07:46:03.405       Type 'string | undefined' is not assignable to type 'string'.

07:46:03.405         Type 'undefined' is not assignable to type 'string'.

07:46:03.405 src/lib/utils/safe-data.ts(391,3): error TS2740: Type 'Record<string, unknown>' is missing the following properties from type 'SafeSupplier': id, name, email, status, and 4 more.

07:46:03.405 src/lib/utils/safe-data.ts(410,6): error TS2345: Argument of type 'SafeSupplier' is not assignable to parameter of type 'Record<string, unknown>'.

07:46:03.405   Index signature for type 'string' is missing in type 'SafeSupplier'.

07:46:03.405 src/lib/utils/safe-data.ts(441,3): error TS2740: Type 'Record<string, unknown>' is missing the following properties from type 'SafeInventoryItem': id, name, sku, quantity, and 5 more.

07:46:03.405 src/lib/utils/safe-data.ts(456,6): error TS2345: Argument of type 'SafeInventoryItem' is not assignable to parameter of type 'Record<string, unknown>'.

07:46:03.405   Index signature for type 'string' is missing in type 'SafeInventoryItem'.

07:46:03.405 src/types/supplier-portfolio.ts(142,18): error TS2430: Interface 'ProductTableBySupplier' incorrectly extends interface 'SupplierProduct'.

07:46:03.405   Types of property 'previous\_price' are incompatible.

07:46:03.405     Type 'number | null' is not assignable to type 'number | undefined'.

07:46:03.405       Type 'null' is not assignable to type 'number | undefined'.

07:46:03.405 src/utils/resilientApi.ts(265,7): error TS2322: Type 'Partial<RetryConfig> | undefined' is not assignable to type 'Partial<RetryConfig>'.

07:46:03.405   Type 'undefined' is not assignable to type 'Partial<RetryConfig>'.

07:46:03.542 Error: Command "npm run build" exited with 2

