# AI Category Service Setup

## Status
✅ Database tables created  
✅ Service registered  
⚠️ **ACTION REQUIRED**: Add your OpenAI API key

## Quick Setup

### Option 1: Update via SQL (Recommended)

Run this SQL command on your `mantis_issoh` database:

```sql
UPDATE ai_service_config 
SET config = jsonb_set(
    config, 
    '{providers,openai,apiKey}', 
    '"YOUR_ACTUAL_OPENAI_API_KEY_HERE"'::jsonb
)
WHERE service_id = 'aaaaaaaa-0000-0000-0000-000000000001'
AND org_id = '00000000-0000-0000-0000-000000000000';
```

**Get your API key from**: https://platform.openai.com/api-keys

### Option 2: Update via Neon Console

1. Go to https://console.neon.tech
2. Select project: **NXT-SPP-Supplier Inventory Portfolio**
3. Open SQL Editor
4. Select database: `mantis_issoh`
5. Run the SQL command above (replacing `YOUR_ACTUAL_OPENAI_API_KEY_HERE`)

### Verify Setup

After adding your API key, verify the configuration:

```sql
SELECT 
    service_label,
    config->'providers'->'openai'->>'model' as model,
    CASE 
        WHEN config->'providers'->'openai'->>'apiKey' LIKE 'sk-proj-%' 
        THEN '✅ API Key Set' 
        ELSE '❌ API Key Missing' 
    END as api_key_status
FROM ai_service s
JOIN ai_service_config c ON c.service_id = s.id
WHERE s.service_key = 'product_categories';
```

## Test Categorization

Once your API key is set:

1. Navigate to: http://localhost:3000/catalog/categories/7892
2. Click **"Start Full Categorization"**
3. Watch the progress in real-time
4. Check the server console for logs:
   - `[category-ai:resolver] Resolved orgId: ...`
   - `[suggestCategoriesBatch] Found X providers`
   - `[CategorizationEngine] Requesting AI suggestions for X products`

## Configuration Details

The service is configured with:
- **Provider**: OpenAI
- **Model**: gpt-4o-mini
- **Batch Size**: 50 products
- **Timeout**: 45 seconds
- **Org ID**: `00000000-0000-0000-0000-000000000000` (default)

## Troubleshooting

### No AI suggestions returned?
1. Check API key is valid: `SELECT config->'providers'->'openai'->>'apiKey' FROM ai_service_config WHERE service_id = 'aaaaaaaa-0000-0000-0000-000000000001';`
2. Check service is enabled: `SELECT is_enabled FROM ai_service_config WHERE service_id = 'aaaaaaaa-0000-0000-0000-000000000001';`
3. Check OpenAI API key has credits: https://platform.openai.com/usage

### Products still showing "pending"?
Run this to reset stuck products:
```sql
UPDATE core.supplier_product 
SET ai_categorization_status = 'pending' 
WHERE ai_categorization_status = 'processing';
```

## Cost Estimation

Using `gpt-4o-mini`:
- **Input**: ~$0.15 per 1M tokens
- **Output**: ~$0.60 per 1M tokens  
- **Estimate**: ~$0.10-0.20 per 1000 products

## Support

Need help? Check:
1. Server console logs for detailed error messages
2. Browser console for API errors
3. OpenAI platform status: https://status.openai.com

