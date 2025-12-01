/**
 * CLI-Based AI Provider Execution Layer
 *
 * Supports AI providers accessible via command-line interfaces:
 * - Google Gemini CLI (@google/gemini-cli)
 * - Anthropic Claude Code (via CLI)
 * - Other CLI-based AI tools
 *
 * This enables free-tier usage and local execution where available.
 */

import { spawn } from 'child_process';
import type { AIProviderId } from '@/types/ai';

export interface CLIProviderConfig {
  provider: AIProviderId;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  /**
   * Optional per-command extra args (e.g., --max-tokens) that precede the prompt.
   */
  timeout?: number;
  workingDirectory?: string;
  useShell?: boolean;
}

export interface CLIExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  duration: number;
  error?: string;
}

export interface CLIProviderCapabilities {
  supportsStreaming: boolean;
  supportsChat: boolean;
  supportsTextGeneration: boolean;
  supportsEmbeddings: boolean;
  requiresAuth: boolean;
  authMethods: ('oauth' | 'api-key' | 'gcloud-adc' | 'env')[];
}

export class CLIProviderExecutor {
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private static readonly CLI_CHECK_CACHE = new Map<
    string,
    { installed: boolean; version?: string; timestamp: number }
  >();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if a CLI tool is installed and accessible
   */
  static async checkCLIInstalled(
    command: string,
    versionFlag: string = '--version'
  ): Promise<{ installed: boolean; version?: string }> {
    const cacheKey = command;
    const cached = this.CLI_CHECK_CACHE.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return { installed: cached.installed, version: cached.version };
    }

    try {
      // On Windows with shell: true, try 'cmd /c where' or just the command directly
      // First try --version with a shorter timeout for faster failure
      let result = await this.executeCommand({
        provider: 'openai' as AIProviderId, // Dummy provider for checking
        command,
        args: [versionFlag],
        timeout: 3000, // Reduced from 5000 for faster response
        useShell: true,
      });

      // If --version fails, try --help (most CLIs support this)
      if (!result.success || result.exitCode !== 0) {
        result = await this.executeCommand({
          provider: 'openai' as AIProviderId,
          command,
          args: ['--help'],
          timeout: 5000,
          useShell: true,
        });
      }

      // For gemini CLI specifically, try npm check if direct check failed (Windows PATH issues)
      if ((!result.success || result.exitCode !== 0) && command === 'gemini') {
        console.log(`[CLIProviderExecutor] Gemini direct check failed, trying npm check...`);
        try {
          // Check if installed via npm (more reliable on Windows)
          const npmCheck = await this.executeCommand({
            provider: 'google' as AIProviderId,
            command: 'npm',
            args: ['list', '-g', '@google/gemini-cli', '--depth=0'],
            timeout: 5000,
            useShell: true,
          });

          console.log(`[CLIProviderExecutor] Gemini npm check result:`, {
            success: npmCheck.success,
            exitCode: npmCheck.exitCode,
            stdout: npmCheck.stdout?.substring(0, 200),
            stderr: npmCheck.stderr?.substring(0, 200),
          });

          if (npmCheck.success && npmCheck.stdout.includes('@google/gemini-cli')) {
            // Found via npm - CLI is installed
            console.log(`[CLIProviderExecutor] Gemini found via npm, checking version...`);
            // Try to get actual version by running gemini --version
            const versionCheck = await this.executeCommand({
              provider: 'google' as AIProviderId,
              command,
              args: ['--version'],
              timeout: 5000,
              useShell: true,
            });

            if (versionCheck.success) {
              console.log(
                `[CLIProviderExecutor] Gemini version check succeeded:`,
                versionCheck.stdout
              );
              result = versionCheck;
            } else {
              // npm shows it's installed, extract version from npm output
              const versionMatch = npmCheck.stdout.match(/@google\/gemini-cli@([\d.]+)/);
              const extractedVersion = versionMatch ? versionMatch[1] : '0.17.1';
              console.log(
                `[CLIProviderExecutor] Gemini version extracted from npm:`,
                extractedVersion
              );
              result = {
                success: true,
                exitCode: 0,
                stdout: extractedVersion,
                stderr: '',
                duration: 0,
              };
            }
          } else {
            console.log(`[CLIProviderExecutor] Gemini not found via npm check`);
          }
        } catch (npmError) {
          console.error(`[CLIProviderExecutor] Gemini npm check error:`, npmError);
          // Continue with original result
        }
      }

      // For codex CLI specifically, try without args
      if ((!result.success || result.exitCode !== 0) && command === 'codex') {
        result = await this.executeCommand({
          provider: 'openai' as AIProviderId,
          command: 'npm',
          args: ['list', '-g', '@openai/codex'],
          timeout: 5000,
          useShell: true,
        });

        if (result.success && result.stdout.includes('@openai/codex')) {
          result = await this.executeCommand({
            provider: 'openai' as AIProviderId,
            command,
            args: ['--help'],
            timeout: 5000,
            useShell: true,
          });
        }
      }

      const installed = result.success && (result.exitCode === 0 || result.exitCode === null);
      let version = undefined;

      if (installed) {
        // Try to extract version from output
        const output = result.stdout.trim();
        const versionMatch =
          output.match(/version[:\s]+([\d.]+)/i) ||
          output.match(/v([\d.]+)/i) ||
          output.split('\n')[0].match(/([\d.]+)/);
        version = versionMatch ? versionMatch[1] : output.substring(0, 50);
      }

      this.CLI_CHECK_CACHE.set(cacheKey, {
        installed,
        version: version?.substring(0, 50), // Limit version length
        timestamp: Date.now(),
      });

      return { installed, version: version?.substring(0, 50) };
    } catch (error: unknown) {
      console.error(`[CLIProviderExecutor] CLI check failed for ${command}:`, error);
      // Clear cache on error so we can retry
      this.CLI_CHECK_CACHE.delete(cacheKey);
      return { installed: false };
    }
  }

  /**
   * Execute a CLI command for an AI provider
   */
  static async executeCommand(config: CLIProviderConfig): Promise<CLIExecutionResult> {
    const startTime = Date.now();
    const timeout = config.timeout || this.DEFAULT_TIMEOUT;

    return new Promise(resolve => {
      // Use shell mode on Windows for better PATH resolution, or if explicitly requested
      const useShell = config.useShell ?? process.platform === 'win32';
      const child = spawn(config.command, config.args || [], {
        env: { ...process.env, ...config.env },
        cwd: config.workingDirectory,
        shell: useShell,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let completed = false;

      const cleanup = (exitCode: number | null, error?: string) => {
        if (completed) return;
        completed = true;

        const duration = Date.now() - startTime;
        resolve({
          success: exitCode === 0 && !error,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode,
          duration,
          error,
        });
      };

      // Set timeout
      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        cleanup(null, `Command timeout after ${timeout}ms`);
      }, timeout);

      // Capture stdout
      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      // Capture stderr
      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      // Handle process completion
      child.on('close', code => {
        clearTimeout(timeoutId);
        cleanup(code, code !== 0 ? stderr || 'Command failed' : undefined);
      });

      // Handle process errors (e.g., command not found - ENOENT)
      child.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        // Clear cache on ENOENT (command not found) so we can retry later
        if (error.message.includes('ENOENT') || error.code === 'ENOENT') {
          const cacheKey = config.command;
          this.CLI_CHECK_CACHE.delete(cacheKey);
        }
        cleanup(null, error.message);
      });
    });
  }

  /**
   * Get provider capabilities for CLI-based execution
   */
  static getProviderCapabilities(provider: AIProviderId): CLIProviderCapabilities {
    switch (provider) {
      case 'google':
        return {
          supportsStreaming: true,
          supportsChat: true,
          supportsTextGeneration: true,
          supportsEmbeddings: false, // Check Gemini CLI docs
          requiresAuth: true,
          authMethods: ['oauth', 'api-key', 'gcloud-adc', 'env'],
        };
      case 'anthropic':
        return {
          supportsStreaming: true,
          supportsChat: true,
          supportsTextGeneration: true,
          supportsEmbeddings: false,
          requiresAuth: true,
          authMethods: ['api-key', 'env'],
        };
      case 'openai':
      case 'openai-compatible':
        return {
          supportsStreaming: true,
          supportsChat: true,
          supportsTextGeneration: true,
          supportsEmbeddings: false,
          requiresAuth: true,
          authMethods: ['api-key', 'oauth', 'env'],
        };
      default:
        return {
          supportsStreaming: false,
          supportsChat: false,
          supportsTextGeneration: false,
          supportsEmbeddings: false,
          requiresAuth: false,
          authMethods: [],
        };
    }
  }

  /**
   * Build command configuration for a provider
   */
  static buildCommandConfig(
    provider: AIProviderId,
    action: 'generate' | 'chat' | 'stream',
    options: {
      prompt?: string;
      messages?: Array<{ role: string; content: string }>;
      model?: string;
      apiKey?: string;
      project?: string;
      location?: string;
      useCLI?: boolean;
      useOAuth?: boolean;
      useGCloudADC?: boolean;
      cliArgs?: string[];
    }
  ): CLIProviderConfig | null {
    switch (provider) {
      case 'google': {
        if (!options.useCLI) return null;

        // Use Gemini CLI if installed
        const env: Record<string, string> = {};

        if (options.useOAuth || options.useGCloudADC) {
          // Use OAuth or gcloud ADC - no API key needed
          if (options.useGCloudADC && options.project) {
            env.GOOGLE_CLOUD_PROJECT = options.project;
            env.GOOGLE_CLOUD_LOCATION = options.location || 'us-central1';
          }
        } else if (options.apiKey) {
          env.GEMINI_API_KEY = options.apiKey;
          env.GOOGLE_API_KEY = options.apiKey; // Fallback
        }

        const model = options.model || 'gemini-2.0-flash-exp';
        const prompt =
          options.prompt || options.messages?.map(m => `${m.role}: ${m.content}`).join('\n') || '';

        // Gemini CLI command structure
        // Note: Actual CLI usage may vary - this is a template
        const extraArgs = options.cliArgs ?? [];
        return {
          provider: 'google',
          command: 'gemini',
          args: ['generate', '--model', model, ...extraArgs, '--prompt', prompt],
          env,
          timeout: 60000,
          // Run without shell so prompts with spaces/newlines stay a single argument
          useShell: false,
        };
      }
      case 'anthropic': {
        if (!options.useCLI) return null;

        const env: Record<string, string> = {};
        if (options.apiKey) {
          env.ANTHROPIC_API_KEY = options.apiKey;
        }

        const model = options.model || 'claude-3-5-sonnet-20241022';
        const prompt =
          options.prompt || options.messages?.map(m => `${m.role}: ${m.content}`).join('\n') || '';

        // Claude Code CLI command structure
        // Note: This is a template - actual CLI usage may vary
        return {
          provider: 'anthropic',
          command: 'claude',
          args: ['--model', model, prompt],
          env,
          timeout: 60000,
          // Avoid shell so the full prompt is passed as one argument
          useShell: false,
        };
      }
      case 'openai':
      case 'openai-compatible': {
        if (!options.useCLI) return null;

        // Use OpenAI Codex CLI if installed
        const env: Record<string, string> = {};
        if (options.apiKey) {
          env.OPENAI_API_KEY = options.apiKey;
        }

        // Codex CLI default model is gpt-5.1-codex-max (medium) based on CLI version
        // Clean model name to remove suffixes like "medium", "high", etc.
        let model = options.model || 'gpt-5.1-codex-max';
        model = model
          .trim()
          .replace(/\s+(medium|high|low|fast|slow)$/i, '')
          .replace(/\(medium\)|\(high\)|\(low\)/gi, '')
          .trim();

        const prompt =
          options.prompt || options.messages?.map(m => `${m.role}: ${m.content}`).join('\n') || '';

        // OpenAI Codex CLI command structure
        // Codex CLI syntax: codex [OPTIONS] [PROMPT]
        // Use -m or --model flag for model selection
        // The prompt should be passed as the last argument
        return {
          provider: 'openai',
          command: 'codex',
          args: [
            '--model',
            model,
            prompt, // Prompt as last argument
          ],
          env,
          timeout: 60000,
          // Avoid shell so the full prompt remains a single argument
          useShell: false,
        };
      }
      default:
        return null;
    }
  }
}

/**
 * CLI Provider Wrapper for AI SDK Integration
 */
export class CLIProviderClient {
  private config: CLIProviderConfig;
  private capabilities: CLIProviderCapabilities;

  constructor(config: CLIProviderConfig) {
    this.config = config;
    this.capabilities = CLIProviderExecutor.getProviderCapabilities(config.provider);
  }

  /**
   * Generate text using CLI
   */
  async generateText(prompt: string, options?: { model?: string }): Promise<string> {
    const cmdConfig = CLIProviderExecutor.buildCommandConfig(this.config.provider, 'generate', {
      ...this.config.env,
      prompt,
      model: options?.model,
      useCLI: true,
      apiKey:
        this.config.env?.GEMINI_API_KEY ||
        this.config.env?.GOOGLE_API_KEY ||
        this.config.env?.ANTHROPIC_API_KEY ||
        this.config.env?.OPENAI_API_KEY,
      project: this.config.env?.GOOGLE_CLOUD_PROJECT,
      location: this.config.env?.GOOGLE_CLOUD_LOCATION,
      useOAuth: !this.config.env?.GEMINI_API_KEY && !this.config.env?.GOOGLE_API_KEY,
      useGCloudADC: Boolean(this.config.env?.GOOGLE_CLOUD_PROJECT),
      cliArgs: this.config.args,
    });

    if (!cmdConfig) {
      throw new Error(`CLI execution not supported for provider: ${this.config.provider}`);
    }

    const result = await CLIProviderExecutor.executeCommand(cmdConfig);

    if (!result.success) {
      throw new Error(`CLI execution failed: ${result.error || result.stderr}`);
    }

    // Parse response based on provider
    return this.parseResponse(result.stdout);
  }

  /**
   * Parse CLI response into text
   */
  private parseResponse(stdout: string): string {
    // Try to extract JSON if present
    try {
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.text || parsed.content || parsed.response || stdout;
      }
    } catch {
      // Not JSON, return as-is
    }

    return stdout;
  }

  /**
   * Check if CLI is available for this provider
   */
  static async isCLIAvailable(provider: AIProviderId): Promise<boolean> {
    const commands: Record<AIProviderId, string> = {
      google: 'gemini',
      anthropic: 'claude',
      openai: 'codex',
      'openai-compatible': 'codex',
      vercel: '',
      firecrawl: '',
    };

    const command = commands[provider];
    if (!command) return false;

    const { installed } = await CLIProviderExecutor.checkCLIInstalled(command);
    return installed;
  }
}

/**
 * Check and report CLI availability for all providers
 */
export async function checkCLIAvailability(): Promise<
  Record<AIProviderId, { available: boolean; version?: string; installationHint?: string }>
> {
  const providers: AIProviderId[] = ['google', 'anthropic', 'openai'];
  const results: Record<
    string,
    { available: boolean; version?: string; installationHint?: string }
  > = {};

  for (const provider of providers) {
    try {
      switch (provider) {
        case 'google': {
          console.log('[CLI Availability] Checking Gemini CLI...');
          try {
            const { installed, version } = await CLIProviderExecutor.checkCLIInstalled('gemini');
            console.log('[CLI Availability] Gemini CLI result:', { installed, version });
            results.google = {
              available: installed,
              version,
              installationHint: installed
                ? undefined
                : 'Install with: npm install -g @google/gemini-cli\nThen run: gemini (for interactive auth)',
            };
          } catch (geminiError) {
            console.error('[CLI Availability] Gemini check threw error:', geminiError);
            results.google = {
              available: false,
              installationHint: `Error: ${geminiError instanceof Error ? geminiError.message : String(geminiError)}`,
            };
          }
          break;
        }
        case 'anthropic': {
          console.log('[CLI Availability] Checking Claude CLI...');
          try {
            const { installed, version } = await CLIProviderExecutor.checkCLIInstalled('claude');
            console.log('[CLI Availability] Claude CLI result:', { installed, version });
            results.anthropic = {
              available: installed,
              version,
              installationHint: installed
                ? undefined
                : 'Install Claude Code CLI from Anthropic\nSet ANTHROPIC_API_KEY environment variable',
            };
          } catch (claudeError) {
            console.error('[CLI Availability] Claude check threw error:', claudeError);
            results.anthropic = {
              available: false,
              installationHint: `Error: ${claudeError instanceof Error ? claudeError.message : String(claudeError)}`,
            };
          }
          break;
        }
        case 'openai': {
          console.log('[CLI Availability] Checking Codex CLI...');
          try {
            const { installed, version } = await CLIProviderExecutor.checkCLIInstalled('codex');
            console.log('[CLI Availability] Codex CLI result:', { installed, version });
            results.openai = {
              available: installed,
              version,
              installationHint: installed
                ? undefined
                : 'Install with: npm i -g @openai/codex\nAuthenticate with: codex login --with-api-key\nOr use ChatGPT account: codex (then select "Sign in with ChatGPT")',
            };
          } catch (codexError) {
            console.error('[CLI Availability] Codex check threw error:', codexError);
            results.openai = {
              available: false,
              installationHint: `Error: ${codexError instanceof Error ? codexError.message : String(codexError)}`,
            };
          }
          break;
        }
      }
    } catch (error) {
      console.error(`[CLI Availability] Outer error checking ${provider}:`, error);
      // Set as unavailable on error - ensure we always return something
      if (!results[provider]) {
        results[provider] = {
          available: false,
          installationHint: `Error checking CLI: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }
  }

  // Ensure all providers are in results (even if check failed)
  if (!results.google) {
    results.google = { available: false, installationHint: 'Check failed or timed out' };
  }
  if (!results.openai) {
    results.openai = { available: false, installationHint: 'Check failed or timed out' };
  }
  if (!results.anthropic) {
    results.anthropic = { available: false, installationHint: 'Check failed or timed out' };
  }

  console.log('[CLI Availability] Final results:', results);
  return results as Record<
    AIProviderId,
    { available: boolean; version?: string; installationHint?: string }
  >;
}
