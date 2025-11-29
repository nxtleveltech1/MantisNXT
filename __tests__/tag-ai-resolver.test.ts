import { describe, expect, test } from 'bun:test';

process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://local:local@localhost:5432/mantisnxt';

const { extractProviders } = await import('../src/lib/cmm/tag-ai/resolver');

describe('extractProviders', () => {
  test('strips console log noise and keeps first sk-* token', () => {
    const noisyKey =
      'sk-or-v1-abc1234567890   ' +
      'K:\\00Project\\MantisNXT\\src\\components\\ai\\admin\\UnifiedServicePanel.tsx:219 ➕ Adding provider instance';

    const providers = extractProviders({
      providerInstances: [
        {
          id: 'inst-1',
          provider: 'openrouter',
          providerType: 'openrouter',
          enabled: true,
          apiKey: noisyKey,
          model: 'openai/gpt-5.1',
          baseUrl: 'https://openrouter.ai/api/v1',
        },
      ],
    });

    expect(providers).toHaveLength(1);
    expect(providers[0].apiKey).toBe('sk-or-v1-abc1234567890');
  });

  test('allows CLI providers to omit apiKey', () => {
    const providers = extractProviders({
      providerInstances: [
        {
          id: 'inst-cli',
          provider: 'openai',
          enabled: true,
          useCLI: true,
          cliCommand: 'codex',
        },
      ],
    });

    expect(providers).toHaveLength(1);
    expect(providers[0].apiKey).toBe('');
  });

  test('skips providers with invalid key when not using CLI', () => {
    const providers = extractProviders({
      providerInstances: [
        {
          id: 'inst-bad',
          provider: 'openrouter',
          enabled: true,
          apiKey: '<<<<logs only>>>>',
        },
      ],
    });

    expect(providers).toHaveLength(0);
  });
});

