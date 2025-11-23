/**
 * Test AI Service Configuration
 * POST /api/v1/ai/config/[service]/test
 */

import type { NextRequest } from 'next/server';
import {
  handleAIError,
  authenticateRequest,
  successResponse,
  extractServiceType,
} from '@/lib/ai/api-utils';
import { testConfigSchema } from '@/lib/ai/validation-schemas';
import { CLIProviderExecutor } from '@/lib/ai/cli-provider';

/**
 * POST /api/v1/ai/config/[service]/test
 * Test AI service configuration and connectivity
 */
export async function POST(
  request: NextRequest,

  context: { params: Promise<{ service: string }> }
) {
  try {
    const { service } = await context.params;
    const user = await authenticateRequest(request);
    const serviceType = extractServiceType({ service });
    const body = await request.json().catch(() => ({} as any));
    const validated = testConfigSchema.safeParse(body);

    // Test connectivity based on provider type
    let connectivity = 'skipped'
    try {
      if (validated.success && body?.config) {
        const provider = body.config.activeProvider || body.config.provider || body.config.providerType || 'openai'
        const section = body.config.providers?.[provider] || body.config
        const apiKey = section.apiKey || body.config.apiKey
        let baseUrl: string = section.baseUrl || body.config.baseUrl
        
        // Handle CLI mode with OAuth authentication
        if (body.config.useCLI && (body.config.useOAuth || body.config.useGCloudADC)) {
          const cliCommand = body.config.cliCommand || (provider === 'google' ? 'gemini' : provider === 'openai' ? 'codex' : '')
          
          if (!cliCommand) {
            connectivity = 'failed:CLI command not specified'
          } else {
            // Check if CLI is installed
            const cliCheck = await CLIProviderExecutor.checkCLIInstalled(cliCommand)
            if (!cliCheck.installed) {
              connectivity = 'failed:CLI not installed. Please install the CLI tool first.'
            } else {
              // Try to check auth status or execute a simple test command
              try {
                // For codex: check auth status
                if (provider === 'openai' && cliCommand === 'codex') {
                  try {
                    const authResult = await CLIProviderExecutor.executeCommand({
                      provider: 'openai' as any,
                      command: cliCommand,
                      args: ['auth', 'status'],
                      timeout: 5000,
                      workingDirectory: body.config.cliWorkingDirectory,
                      useShell: true,
                    })
                    
                    if (authResult.success && 
                        (authResult.stdout.toLowerCase().includes('logged in') || 
                         authResult.stdout.toLowerCase().includes('authenticated') ||
                         authResult.stdout.toLowerCase().includes('signed in'))) {
                      connectivity = 'ok'
                    } else {
                      connectivity = 'failed:Not authenticated. Please run "codex" in terminal and select "Sign in with ChatGPT" to log in first.'
                    }
                  } catch (authError: any) {
                    // Auth status command might not be available, try a simple test
                    try {
                      const testResult = await CLIProviderExecutor.executeCommand({
                        provider: 'openai' as any,
                        command: cliCommand,
                        args: ['--version'],
                        timeout: 5000,
                        workingDirectory: body.config.cliWorkingDirectory,
                        useShell: true,
                      })
                      
                      if (testResult.success) {
                        connectivity = 'ok:CLI is available. Authentication will be checked during actual usage.'
                      } else {
                        connectivity = 'failed:CLI command failed. Please ensure you are logged in via CLI.'
                      }
                    } catch {
                      connectivity = 'failed:CLI authentication check failed. Please run "codex" in terminal to authenticate first.'
                    }
                  }
                } 
                // For gemini: check auth status
                else if (provider === 'google' && cliCommand === 'gemini') {
                  try {
                    const authResult = await CLIProviderExecutor.executeCommand({
                      provider: 'google' as any,
                      command: cliCommand,
                      args: ['auth', 'status'],
                      timeout: 5000,
                      workingDirectory: body.config.cliWorkingDirectory,
                      useShell: true,
                    })
                    
                    if (authResult.success && 
                        (authResult.stdout.toLowerCase().includes('authenticated') || 
                         authResult.stdout.toLowerCase().includes('logged in') ||
                         authResult.stdout.toLowerCase().includes('signed in'))) {
                      connectivity = 'ok'
                    } else {
                      connectivity = 'failed:Not authenticated. Please run "gemini" in terminal to log in with your Google account first.'
                    }
                  } catch (authError: any) {
                    // Auth status command might not be available, try a simple test
                    try {
                      const testResult = await CLIProviderExecutor.executeCommand({
                        provider: 'google' as any,
                        command: cliCommand,
                        args: ['--version'],
                        timeout: 5000,
                        workingDirectory: body.config.cliWorkingDirectory,
                        useShell: true,
                      })
                      
                      if (testResult.success) {
                        connectivity = 'ok:CLI is available. Authentication will be checked during actual usage.'
                      } else {
                        connectivity = 'failed:CLI command failed. Please ensure you are logged in via CLI.'
                      }
                    } catch {
                      connectivity = 'failed:CLI authentication check failed. Please run "gemini" in terminal to authenticate first.'
                    }
                  }
                } else {
                  // Other CLI providers - just check if CLI works
                  const testResult = await CLIProviderExecutor.executeCommand({
                    provider: provider as any,
                    command: cliCommand,
                    args: ['--version'],
                    timeout: 5000,
                    workingDirectory: body.config.cliWorkingDirectory,
                    useShell: true,
                  })
                  
                  if (testResult.success) {
                    connectivity = 'ok:CLI is available'
                  } else {
                    connectivity = `failed:CLI command failed. ${testResult.stderr || testResult.error || 'Unknown error'}`
                  }
                }
              } catch (error: any) {
                connectivity = `failed:CLI execution error. ${error.message || 'Please ensure you are logged in via CLI.'}`
              }
            }
          }
          
          // Return early for CLI mode
          const testResult = {
            success: connectivity === 'ok' || connectivity.startsWith('ok:'),
            serviceType,
            latency: 0,
            provider: provider,
            message: connectivity === 'ok' || connectivity.startsWith('ok:') ? 'CLI Authentication OK' : 'CLI Test Failed',
            details: {
              connectivity,
              cliMode: true,
              authMethod: body.config.useOAuth ? 'OAuth' : body.config.useGCloudADC ? 'gcloud ADC' : 'API Key',
              cliCommand: cliCommand,
            },
            timestamp: new Date().toISOString(),
          };
          return successResponse(testResult);
        }
        
        // Handle CLI mode with OAuth authentication
        if (body.config.useCLI && (body.config.useOAuth || body.config.useGCloudADC)) {
          const cliCommand = body.config.cliCommand || (provider === 'google' ? 'gemini' : 'codex')
          
          // Test CLI authentication and availability
          try {
            // Check if CLI is installed
            const cliCheck = await CLIProviderExecutor.checkCLIInstalled(cliCommand)
            if (!cliCheck.installed) {
              connectivity = 'failed:CLI not installed. Please install the CLI tool first.'
            } else {
              // Try to check auth status or execute a simple test command
              // For codex: try to get auth status
              if (provider === 'openai' && cliCommand === 'codex') {
                try {
                  // Try a simple command to check auth status
                  const result = await CLIProviderExecutor.executeCommand({
                    provider: 'openai' as any,
                    command: cliCommand,
                    args: ['--help'],
                    timeout: 5000,
                    workingDirectory: body.config.cliWorkingDirectory,
                    useShell: true,
                  })
                  
                  if (result.success && result.exitCode === 0) {
                    // CLI is working, try to check auth status if possible
                    try {
                      const authResult = await CLIProviderExecutor.executeCommand({
                        provider: 'openai' as any,
                        command: cliCommand,
                        args: ['auth', 'status'],
                        timeout: 5000,
                        workingDirectory: body.config.cliWorkingDirectory,
                        useShell: true,
                      })
                      
                      if (authResult.success && (authResult.stdout.includes('logged in') || authResult.stdout.includes('authenticated'))) {
                        connectivity = 'ok'
                      } else {
                        connectivity = 'failed:Not authenticated. Please run the CLI login command in your terminal first.'
                      }
                    } catch {
                      // Auth status check not available, but CLI works
                      connectivity = 'ok:CLI is available. Authentication will be checked during actual usage.'
                    }
                  } else {
                    connectivity = `failed:CLI command failed. ${result.stderr || result.error || 'Unknown error'}`
                  }
                } catch (error: any) {
                  connectivity = `failed:CLI execution error. ${error.message || 'Please ensure you are logged in via CLI.'}`
                }
              } else if (provider === 'google' && cliCommand === 'gemini') {
                // For gemini CLI: similar approach
                try {
                  const result = await CLIProviderExecutor.executeCommand({
                    provider: 'google' as any,
                    command: cliCommand,
                    args: ['--help'],
                    timeout: 5000,
                    workingDirectory: body.config.cliWorkingDirectory,
                    useShell: true,
                  })
                  
                  if (result.success && result.exitCode === 0) {
                    // Try to check auth status
                    try {
                      const authResult = await CLIProviderExecutor.executeCommand({
                        provider: 'google' as any,
                        command: cliCommand,
                        args: ['auth', 'status'],
                        timeout: 5000,
                        workingDirectory: body.config.cliWorkingDirectory,
                        useShell: true,
                      })
                      
                      if (authResult.success && (authResult.stdout.includes('authenticated') || authResult.stdout.includes('logged in'))) {
                        connectivity = 'ok'
                      } else {
                        connectivity = 'failed:Not authenticated. Please run "gemini" in terminal to log in first.'
                      }
                    } catch {
                      // Auth status check not available, but CLI works
                      connectivity = 'ok:CLI is available. Authentication will be checked during actual usage.'
                    }
                  } else {
                    connectivity = `failed:CLI command failed. ${result.stderr || result.error || 'Unknown error'}`
                  }
                } catch (error: any) {
                  connectivity = `failed:CLI execution error. ${error.message || 'Please ensure you are logged in via CLI.'}`
                }
              } else {
                connectivity = 'ok:CLI mode enabled'
              }
            }
          } catch (error: any) {
            connectivity = `failed:CLI check error. ${error.message || 'Please install and configure the CLI tool.'}`
          }
          
          // Return early for CLI mode
          if (connectivity !== 'skipped') {
            const testResult = {
              success: true,
              serviceType,
              latency: 0,
              provider: provider,
              message: connectivity === 'ok' || connectivity.startsWith('ok:') ? 'CLI Authentication OK' : 'CLI Test Failed',
              details: {
                connectivity,
                cliMode: true,
                authMethod: body.config.useOAuth ? 'OAuth' : body.config.useGCloudADC ? 'gcloud ADC' : 'API Key',
              },
              timestamp: new Date().toISOString(),
            };
            return successResponse(testResult);
          }
        }
        
        // Set default base URLs for each provider
        if (!baseUrl) {
          switch (provider) {
            case 'openai':
            case 'openai_compatible':
              baseUrl = 'https://api.openai.com'
              break
            case 'anthropic':
              baseUrl = 'https://api.anthropic.com'
              break
            case 'google':
              baseUrl = 'https://generativelanguage.googleapis.com'
              break
            case 'serper':
              baseUrl = 'https://google.serper.dev'
              break
            case 'tavily':
              baseUrl = 'https://api.tavily.com'
              break
            case 'google_search':
              baseUrl = 'https://www.googleapis.com/customsearch/v1'
              break
            case 'brave':
              baseUrl = 'https://api.search.brave.com'
              break
            case 'exa':
              baseUrl = 'https://api.exa.ai'
              break
            case 'firecrawl':
              baseUrl = 'https://api.firecrawl.dev'
              break
          }
        }

        if (apiKey && baseUrl) {
          const controller = new AbortController()
          const t = setTimeout(() => controller.abort(), 8000)
          
          // Build test URL and headers based on provider
          let testUrl: string
          let headers: Record<string, string> = {}
          
          switch (provider) {
            case 'openai':
            case 'openai_compatible':
              testUrl = /\/v\d+$/.test(baseUrl.replace(/\/+$/, '')) 
                ? `${baseUrl.replace(/\/+$/, '')}/models` 
                : `${baseUrl.replace(/\/+$/, '')}/v1/models`
              headers = { Authorization: `Bearer ${apiKey}` }
              break
            case 'anthropic':
              testUrl = `${baseUrl.replace(/\/+$/, '')}/v1/messages`
              headers = { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }
              // Use OPTIONS or GET for health check
              break
            case 'google':
              testUrl = `${baseUrl.replace(/\/+$/, '')}/v1beta/models`
              headers = { 'x-goog-api-key': apiKey }
              break
            case 'serper':
              testUrl = `${baseUrl.replace(/\/+$/, '')}/search`
              headers = { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' }
              break
            case 'tavily':
              testUrl = `${baseUrl.replace(/\/+$/, '')}/search`
              headers = { 'Content-Type': 'application/json' }
              // Tavily uses api_key in body
              break
            case 'brave':
              testUrl = `${baseUrl.replace(/\/+$/, '')}/res/v1/web/search?q=test`
              headers = { 'X-Subscription-Token': apiKey, 'Accept': 'application/json' }
              break
            case 'exa':
              testUrl = `${baseUrl.replace(/\/+$/, '')}/v1/search`
              headers = { 'x-api-key': apiKey, 'Content-Type': 'application/json' }
              break
            case 'firecrawl':
              testUrl = `${baseUrl.replace(/\/+$/, '')}/v0/scrape`
              headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
              break
            default:
              testUrl = `${baseUrl.replace(/\/+$/, '')}/v1/models`
              headers = { Authorization: `Bearer ${apiKey}` }
          }

          // Perform health check
          const testBody = provider === 'tavily' ? JSON.stringify({ api_key: apiKey, query: 'test' }) 
            : provider === 'exa' ? JSON.stringify({ query: 'test', num_results: 1 })
            : provider === 'firecrawl' ? JSON.stringify({ url: 'https://example.com' })
            : undefined

          const res = await fetch(testUrl, { 
            method: testBody ? 'POST' : 'GET',
            headers, 
            ...(testBody && { body: testBody }),
            signal: controller.signal 
          })
          connectivity = res.ok ? 'ok' : `failed:${res.status}`
          clearTimeout(t)
        }
      }
    } catch (e: any) {
      connectivity = `failed:${e?.message || 'error'}`
    }

    const testResult = {
      success: true,
      serviceType,
      latency: 0,
      provider: body?.config?.activeProvider || body?.config?.provider || 'openai',
      message: connectivity === 'ok' ? 'Connectivity OK' : 'Test executed',
      details: {
        connectivity,
      },
      timestamp: new Date().toISOString(),
    };

    return successResponse(testResult);
  } catch (error) {
    return handleAIError(error);
  }
}
