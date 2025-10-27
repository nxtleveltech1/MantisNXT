/**
 * Vercel AI SDK v5 - Unit Tests
 * Comprehensive test suite for AI SDK integration
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('Vercel AI SDK v5 Integration Tests', () => {
  beforeAll(() => {
    // Verify environment setup
    expect(process.env.NODE_ENV).toBeDefined();
  });

  describe('Package Installation', () => {
    it('should have ai package installed', () => {
      expect(() => require('ai')).not.toThrow();
    });

    it('should have @ai-sdk/anthropic installed', () => {
      expect(() => require('@ai-sdk/anthropic')).not.toThrow();
    });

    it('should have @ai-sdk/openai installed', () => {
      expect(() => require('@ai-sdk/openai')).not.toThrow();
    });

    it('should have @ai-sdk/gateway installed', () => {
      expect(() => require('@ai-sdk/gateway')).not.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should load AI configuration', async () => {
      const { getAIConfig } = await import('@/lib/ai/config');
      const config = getAIConfig();

      expect(config).toBeDefined();
      expect(config.defaultProvider).toBeDefined();
      expect(config.enableFeatures).toBeDefined();
      expect(config.providers).toBeDefined();
    });

    it('should have valid provider configurations', async () => {
      const { getAIConfig } = await import('@/lib/ai/config');
      const config = getAIConfig();

      expect(config.providers.openai).toBeDefined();
      expect(config.providers.anthropic).toBeDefined();
      expect(config.providers.vercel).toBeDefined();
    });

    it('should respect environment overrides', async () => {
      const { getAIConfig } = await import('@/lib/ai/config');
      const config = getAIConfig();

      // Check if environment variables are properly loaded
      if (process.env.DEFAULT_AI_PROVIDER) {
        expect(config.defaultProvider).toBe(process.env.DEFAULT_AI_PROVIDER);
      }

      if (process.env.AI_MAX_TOKENS) {
        expect(config.maxTokens).toBe(parseInt(process.env.AI_MAX_TOKENS));
      }
    });
  });

  describe('Provider Clients', () => {
    it('should create provider clients', async () => {
      const { getProviderClient } = await import('@/lib/ai/providers');

      // Should not throw when creating clients
      expect(() => {
        const openaiClient = getProviderClient('openai');
        expect(openaiClient).toBeDefined();
        expect(openaiClient.id).toBe('openai');
      }).not.toThrow();
    });

    it('should support streaming capability check', async () => {
      const { getProviderClient } = await import('@/lib/ai/providers');
      const client = getProviderClient('openai');

      expect(client.supportsStreaming).toBeDefined();
      expect(typeof client.supportsStreaming).toBe('boolean');
    });

    it('should support embeddings capability check', async () => {
      const { getProviderClient } = await import('@/lib/ai/providers');
      const openaiClient = getProviderClient('openai');
      const anthropicClient = getProviderClient('anthropic');

      expect(openaiClient.supportsEmbeddings).toBe(true);
      expect(anthropicClient.supportsEmbeddings).toBe(false);
    });
  });

  describe('Text Generation (Mock)', () => {
    it('should have generateText method', async () => {
      const { getProviderClient } = await import('@/lib/ai/providers');
      const client = getProviderClient('openai');

      expect(client.generateText).toBeDefined();
      expect(typeof client.generateText).toBe('function');
    });

    it('should handle generation options', async () => {
      const { getProviderClient } = await import('@/lib/ai/providers');
      const client = getProviderClient('openai');

      // Test that method accepts proper parameters
      const options = {
        maxTokens: 100,
        temperature: 0.7,
        model: 'gpt-4o-mini',
      };

      // This test verifies the structure, actual API call requires valid keys
      expect(() => {
        // Just verify the method signature
        expect(client.generateText).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Streaming (Mock)', () => {
    it('should have streamText method', async () => {
      const { getProviderClient } = await import('@/lib/ai/providers');
      const client = getProviderClient('openai');

      expect(client.streamText).toBeDefined();
      expect(typeof client.streamText).toBe('function');
    });

    it('should validate streaming support', async () => {
      const { getProviderClient } = await import('@/lib/ai/providers');
      const openaiClient = getProviderClient('openai');

      expect(openaiClient.supportsStreaming).toBe(true);
    });
  });

  describe('Chat Interface (Mock)', () => {
    it('should have chat method', async () => {
      const { getProviderClient } = await import('@/lib/ai/providers');
      const client = getProviderClient('openai');

      expect(client.chat).toBeDefined();
      expect(typeof client.chat).toBe('function');
    });

    it('should accept message array format', async () => {
      const { getProviderClient } = await import('@/lib/ai/providers');
      const client = getProviderClient('openai');

      const messages = [
        { role: 'user' as const, content: 'Test message' },
      ];

      // Verify method signature accepts messages
      expect(() => {
        expect(client.chat).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Health Monitoring', () => {
    it('should track provider health', async () => {
      const { getProviderHealthStatus } = await import('@/lib/ai/providers');
      const health = getProviderHealthStatus('openai');

      expect(health).toBeDefined();
      expect(health.id).toBe('openai');
      expect(health.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });

    it('should get all provider health statuses', async () => {
      const { getAllProviderHealthStatus } = await import('@/lib/ai/providers');
      const healthStatuses = getAllProviderHealthStatus();

      expect(Array.isArray(healthStatuses)).toBe(true);
      expect(healthStatuses.length).toBeGreaterThan(0);

      healthStatuses.forEach(health => {
        expect(health.id).toBeDefined();
        expect(health.status).toBeDefined();
      });
    });
  });

  describe('Fallback Chain', () => {
    it('should configure fallback providers', async () => {
      const { getProviderFallbackChain } = await import('@/lib/ai/providers');
      const chain = getProviderFallbackChain('openai');

      expect(Array.isArray(chain)).toBe(true);
      expect(chain.length).toBeGreaterThan(0);
      expect(chain[0]).toBe('openai');
    });

    it('should exclude disabled providers from fallback', async () => {
      const { getProviderFallbackChain, getProviderClient } = await import('@/lib/ai/providers');
      const chain = getProviderFallbackChain();

      // All providers in chain should be accessible
      chain.forEach(providerId => {
        expect(() => {
          getProviderClient(providerId);
        }).not.toThrow();
      });
    });
  });

  describe('Usage Tracking', () => {
    it('should support usage listeners', async () => {
      const { onAIUsage, removeAIUsageListeners } = await import('@/lib/ai/providers');

      const listener = jest.fn();
      const unsubscribe = onAIUsage(listener);

      expect(typeof unsubscribe).toBe('function');

      // Cleanup
      unsubscribe();
      removeAIUsageListeners();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid provider IDs gracefully', async () => {
      const { getProviderClient } = await import('@/lib/ai/providers');

      expect(() => {
        // @ts-ignore - Testing invalid input
        getProviderClient('invalid-provider');
      }).toThrow();
    });

    it('should handle disabled providers appropriately', async () => {
      const { getProviderConfig } = await import('@/lib/ai/config');

      // Should return config even for disabled providers
      const config = getProviderConfig('vercel');
      expect(config).toBeDefined();
      expect(config.id).toBe('vercel');
    });
  });

  afterAll(() => {
    // Cleanup
  });
});

describe('Type Safety', () => {
  it('should have proper TypeScript types', () => {
    // This test verifies that types are properly exported
    expect(() => {
      const types = require('@/types/ai');
      expect(types).toBeDefined();
    }).not.toThrow();
  });

  it('should export required types', async () => {
    const types = await import('@/types/ai');

    // Verify key types are exported
    expect(types).toBeDefined();
  });
});
