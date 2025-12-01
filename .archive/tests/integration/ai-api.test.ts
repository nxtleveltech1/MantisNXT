/**
 * AI API Integration Tests
 * Tests all AI API endpoints with real requests
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const API_TIMEOUT = 30000;

describe('AI API Integration Tests', () => {
  beforeAll(async () => {
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('GET /api/health', () => {
    it(
      'should return healthy status',
      async () => {
        const response = await fetch(`${BASE_URL}/api/health`, {
          method: 'GET',
        });

        expect(response.ok).toBe(true);
        const data = await response.json();

        expect(data).toBeDefined();
        expect(data.status || data.healthy).toBeDefined();
      },
      API_TIMEOUT
    );
  });

  describe('POST /api/ai/chat', () => {
    it(
      'should handle simple chat request',
      async () => {
        const response = await fetch(`${BASE_URL}/api/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'Say hello in exactly 3 words' }],
          }),
        });

        expect(response.ok).toBe(true);
        const data = await response.json();

        expect(data).toBeDefined();
        expect(data.text || data.message || data.response).toBeDefined();
      },
      API_TIMEOUT
    );

    it(
      'should handle multi-turn conversation',
      async () => {
        const response = await fetch(`${BASE_URL}/api/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              { role: 'user', content: 'My name is Alice' },
              { role: 'assistant', content: 'Nice to meet you, Alice!' },
              { role: 'user', content: 'What is my name?' },
            ],
          }),
        });

        expect(response.ok).toBe(true);
        const data = await response.json();

        expect(data).toBeDefined();
        expect(data.text || data.message || data.response).toBeDefined();
      },
      API_TIMEOUT
    );

    it(
      'should reject invalid requests',
      async () => {
        const response = await fetch(`${BASE_URL}/api/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // Missing messages
          }),
        });

        expect(response.status).toBeGreaterThanOrEqual(400);
      },
      API_TIMEOUT
    );
  });

  describe('POST /api/ai/generate', () => {
    it(
      'should generate text from prompt',
      async () => {
        const response = await fetch(`${BASE_URL}/api/ai/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: 'Write a haiku about testing',
            mode: 'concise',
          }),
        });

        expect(response.ok).toBe(true);
        const data = await response.json();

        expect(data).toBeDefined();
        expect(data.text || data.generated || data.result).toBeDefined();
      },
      API_TIMEOUT
    );

    it(
      'should support different generation modes',
      async () => {
        const modes = ['concise', 'detailed', 'creative'];

        for (const mode of modes) {
          const response = await fetch(`${BASE_URL}/api/ai/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prompt: 'Test prompt',
              mode,
            }),
          });

          expect(response.ok).toBe(true);
        }
      },
      API_TIMEOUT * 3
    );
  });

  describe('POST /api/ai/analyze', () => {
    it(
      'should analyze data with context',
      async () => {
        const response = await fetch(`${BASE_URL}/api/ai/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              sales: [100, 150, 200, 250],
              trend: 'increasing',
            },
            context: 'quarterly sales analysis',
          }),
        });

        expect(response.ok).toBe(true);
        const data = await response.json();

        expect(data).toBeDefined();
        expect(data.analysis || data.insights || data.result).toBeDefined();
      },
      API_TIMEOUT
    );
  });

  describe('POST /api/ai/insights/generate', () => {
    it(
      'should generate insights from inventory data',
      async () => {
        const response = await fetch(`${BASE_URL}/api/ai/insights/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inventoryData: [
              { sku: 'A001', quantity: 50, reorderPoint: 20 },
              { sku: 'B002', quantity: 5, reorderPoint: 20 },
            ],
            context: { period: 'monthly' },
          }),
        });

        expect(response.ok).toBe(true);
        const data = await response.json();

        expect(data).toBeDefined();
        expect(data.insights || data.recommendations).toBeDefined();
      },
      API_TIMEOUT
    );
  });

  describe('POST /api/ai/suppliers/discover', () => {
    it(
      'should discover suppliers based on requirements',
      async () => {
        const response = await fetch(`${BASE_URL}/api/ai/suppliers/discover`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requirements: {
              products: ['electronics', 'components'],
              location: 'North America',
              certifications: ['ISO 9001'],
            },
          }),
        });

        expect(response.ok).toBe(true);
        const data = await response.json();

        expect(data).toBeDefined();
        expect(data.suppliers || data.recommendations || data.matches).toBeDefined();
      },
      API_TIMEOUT
    );
  });

  describe('POST /api/ai/analytics/predictive', () => {
    it(
      'should predict future trends',
      async () => {
        const response = await fetch(`${BASE_URL}/api/ai/analytics/predictive`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            historicalData: [
              { date: '2024-01', value: 100 },
              { date: '2024-02', value: 120 },
              { date: '2024-03', value: 140 },
            ],
            predictionWindow: 3,
          }),
        });

        expect(response.ok).toBe(true);
        const data = await response.json();

        expect(data).toBeDefined();
        expect(data.predictions || data.forecast).toBeDefined();
      },
      API_TIMEOUT
    );
  });

  describe('POST /api/ai/analytics/anomalies', () => {
    it(
      'should detect anomalies in data',
      async () => {
        const response = await fetch(`${BASE_URL}/api/ai/analytics/anomalies`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: [
              { timestamp: '2024-01-01', value: 100 },
              { timestamp: '2024-01-02', value: 105 },
              { timestamp: '2024-01-03', value: 500 }, // Anomaly
              { timestamp: '2024-01-04', value: 110 },
            ],
          }),
        });

        expect(response.ok).toBe(true);
        const data = await response.json();

        expect(data).toBeDefined();
        expect(data.anomalies || data.detections || data.alerts).toBeDefined();
      },
      API_TIMEOUT
    );
  });

  describe('Error Handling', () => {
    it(
      'should return proper error for invalid JSON',
      async () => {
        const response = await fetch(`${BASE_URL}/api/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: 'invalid json',
        });

        expect(response.ok).toBe(false);
        expect(response.status).toBeGreaterThanOrEqual(400);
      },
      API_TIMEOUT
    );

    it(
      'should handle missing required fields',
      async () => {
        const response = await fetch(`${BASE_URL}/api/ai/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });

        expect(response.ok).toBe(false);
        expect(response.status).toBeGreaterThanOrEqual(400);
      },
      API_TIMEOUT
    );

    it(
      'should handle unsupported HTTP methods',
      async () => {
        const response = await fetch(`${BASE_URL}/api/ai/chat`, {
          method: 'GET',
        });

        expect(response.status).toBe(405); // Method Not Allowed
      },
      API_TIMEOUT
    );
  });

  describe('Performance', () => {
    it(
      'should respond within acceptable time',
      async () => {
        const start = Date.now();

        const response = await fetch(`${BASE_URL}/api/ai/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: 'Quick test',
            mode: 'concise',
          }),
        });

        const duration = Date.now() - start;

        expect(response.ok).toBe(true);
        expect(duration).toBeLessThan(5000); // Should respond in less than 5 seconds
      },
      API_TIMEOUT
    );
  });
});
