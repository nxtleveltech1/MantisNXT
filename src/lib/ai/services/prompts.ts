import crypto from 'crypto';
import type { AIProviderId } from '@/types/ai';

export interface PromptTemplateVariant {
  id: string;
  template: string;
  description?: string;
  weight?: number;
  version?: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description?: string;
  template: string;
  tags: string[];
  version: string;
  createdAt: string;
  updatedAt: string;
  providerHints?: AIProviderId[];
  variants?: Record<string, PromptTemplateVariant>;
  metadata?: Record<string, any>;
}

export interface PromptTemplateInput {
  id: string;
  name: string;
  template: string;
  description?: string;
  tags?: string[];
  providerHints?: AIProviderId[];
  variants?: Record<string, PromptTemplateVariant>;
  metadata?: Record<string, any>;
}

export interface RenderPromptOptions {
  variables?: Record<string, string | number | boolean>;
  context?: Record<string, any>;
  provider?: AIProviderId;
  variantId?: string;
  sanitize?: boolean;
}

export interface PromptRenderResult {
  templateId: string;
  prompt: string;
  version: string;
  metadata?: Record<string, any>;
}

interface PromptPerformanceMetrics {
  usage: number;
  success: number;
  failure: number;
  lastUsed?: string;
  variants: Record<string, PromptPerformanceMetrics>;
  metadata?: Record<string, any>;
}

const DEFAULT_TEMPLATES: PromptTemplateInput[] = [
  {
    id: 'supplier-analysis',
    name: 'Supplier Performance Analysis',
    description: 'Analyse supplier performance and highlight risks.',
    tags: ['supplier', 'analysis', 'risk'],
    template: `You are an AI operations analyst. Using the following supplier metrics, provide a concise performance assessment.

Supplier: {{supplier_name}}
Region: {{region}}
On-time Delivery: {{on_time_delivery}}%
Quality Score: {{quality_score}}/100
Spend Change (30d): {{spend_change}}%
Outstanding Issues: {{open_issues}}

Provide: 1) risk summary, 2) improvement recommendations, and 3) watchlist signals.`,
  },
  {
    id: 'inventory-optimization',
    name: 'Inventory Optimization Advisor',
    description: 'Suggest optimization actions for the inventory portfolio.',
    tags: ['inventory', 'optimization'],
    template: `You are assisting an inventory planner. Review the portfolio metrics and produce actionable insights.

Portfolio KPIs:
- Stockouts (14d): {{stockouts}}
- Overstock Value: {{overstock_value}}
- Demand Variance: {{demand_variance}}
- Aging Inventory (%): {{aging_inventory_pct}}

Return: bullet list with (a) quick wins, (b) structural fixes, (c) monitoring alerts.`,
  },
  {
    id: 'data-analysis-notebook',
    name: 'Data Analysis Notebook',
    description: 'Guide for multi-step data exploration with SQL and interpretation.',
    tags: ['analytics', 'sql', 'insights'],
    template: `You are generating a lightweight analysis notebook. Dataset summary: {{dataset_description}}.

Respond with sections:
1. Clarifying questions (if data insufficient).
2. SQL query with annotations addressing the objective: {{objective}}.
3. Result interpretation with KPIs and anomalies.
4. Recommended follow-up analyses.`,
  },
];

const FORBIDDEN_PATTERNS = [
  /ignore previous/i,
  /disregard earlier/i,
  /forget all/i,
  /system override/i,
  /you are no longer/i,
];

export class PromptManager {
  private readonly templates = new Map<string, PromptTemplate>();
  private readonly metrics = new Map<string, PromptPerformanceMetrics>();

  constructor(initialTemplates: PromptTemplateInput[] = DEFAULT_TEMPLATES) {
    initialTemplates.forEach((template) => this.registerTemplate(template, { overwrite: false }));
  }

  registerTemplate(template: PromptTemplateInput, options: { overwrite?: boolean } = {}): PromptTemplate {
    const existing = this.templates.get(template.id);
    if (existing && !options.overwrite) {
      throw new Error(`Prompt template '${template.id}' already exists.`);
    }

    const now = new Date().toISOString();
    const record: PromptTemplate = {
      id: template.id,
      name: template.name,
      description: template.description,
      template: template.template,
      tags: template.tags ?? [],
      version: existing ? this.bumpVersion(existing.version) : '1.0.0',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      providerHints: template.providerHints,
      variants: template.variants,
      metadata: template.metadata,
    };

    this.templates.set(template.id, record);
    this.ensureMetrics(template.id);
    return record;
  }

  updateTemplate(id: string, update: Partial<Omit<PromptTemplateInput, 'id'>>): PromptTemplate {
    const existing = this.getTemplate(id);
    const now = new Date().toISOString();
    const record: PromptTemplate = {
      ...existing,
      name: update.name ?? existing.name,
      description: update.description ?? existing.description,
      template: update.template ?? existing.template,
      tags: update.tags ?? existing.tags,
      providerHints: update.providerHints ?? existing.providerHints,
      variants: update.variants ?? existing.variants,
      metadata: update.metadata ?? existing.metadata,
      version: this.bumpVersion(existing.version),
      updatedAt: now,
    };

    this.templates.set(id, record);
    return record;
  }

  removeTemplate(id: string): void {
    this.templates.delete(id);
    this.metrics.delete(id);
  }

  listTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values()).map((template) => ({ ...template }));
  }

  getTemplate(id: string): PromptTemplate {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Prompt template '${id}' not found.`);
    }
    return template;
  }

  hasTemplate(id: string): boolean {
    return this.templates.has(id);
  }

  renderTemplate(id: string, options: RenderPromptOptions = {}): PromptRenderResult {
    const template = this.getTemplate(id);
    const variant = options.variantId ? template.variants?.[options.variantId] : this.selectVariantForABTest(template);
    const source = variant?.template ?? template.template;
    const sanitized = options.sanitize === false ? source : this.sanitizePrompt(source);
    const prompt = this.applyVariables(sanitized, options.variables, options.context);

    this.recordUsage(template.id, variant?.id, options.provider);

    return {
      templateId: template.id,
      prompt,
      version: variant?.version ?? template.version,
      metadata: {
        provider: options.provider,
        variant: variant?.id,
        tags: template.tags,
      },
    };
  }

  validatePrompt(prompt: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    if (!prompt || prompt.trim().length === 0) {
      issues.push('Prompt is empty.');
    }
    if (prompt.length > 8000) {
      issues.push('Prompt exceeds recommended length (8000 characters).');
    }
    FORBIDDEN_PATTERNS.forEach((pattern) => {
      if (pattern.test(prompt)) {
        issues.push(`Prompt contains discouraged pattern: ${pattern.source}`);
      }
    });
    return { valid: issues.length === 0, issues };
  }

  sanitizePrompt(prompt: string): string {
    let sanitized = prompt.trim();
    for (const pattern of FORBIDDEN_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[redacted]');
    }
    return sanitized;
  }

  recordPerformance(
    id: string,
    outcome: { success: boolean; tokensUsed?: number; variantId?: string; provider?: AIProviderId },
  ): void {
    const metrics = this.ensureMetrics(id);
    metrics.usage += 1;
    metrics.lastUsed = new Date().toISOString();
    if (outcome.success) {
      metrics.success += 1;
    } else {
      metrics.failure += 1;
    }

    if (outcome.variantId) {
      const variantMetrics = metrics.variants[outcome.variantId] ?? this.createEmptyMetrics();
      variantMetrics.usage += 1;
      if (outcome.success) {
        variantMetrics.success += 1;
      } else {
        variantMetrics.failure += 1;
      }
      variantMetrics.lastUsed = metrics.lastUsed;
      metrics.variants[outcome.variantId] = variantMetrics;
    }
  }

  getTemplatePerformance(id: string): PromptPerformanceMetrics | undefined {
    const metrics = this.metrics.get(id);
    if (!metrics) {
      return undefined;
    }
    return JSON.parse(JSON.stringify(metrics));
  }

  selectVariantForABTest(template: PromptTemplate): PromptTemplateVariant | undefined {
    if (!template.variants) {
      return undefined;
    }
    const variants = Object.values(template.variants);
    if (variants.length === 0) {
      return undefined;
    }
    const totalWeight = variants.reduce((sum, variant) => sum + (variant.weight ?? 1), 0);
    let offset = Math.random() * totalWeight;
    for (const variant of variants) {
      offset -= variant.weight ?? 1;
      if (offset <= 0) {
        return variant;
      }
    }
    return variants[variants.length - 1];
  }

  trackVariantOutcome(templateId: string, variantId: string, success: boolean): void {
    this.recordPerformance(templateId, { success, variantId });
  }

  listTemplatesByTag(tag: string): PromptTemplate[] {
    return this.listTemplates().filter((template) => template.tags.includes(tag));
  }

  generateAdaptivePrompt(
    baseId: string,
    signal: { context: Record<string, any>; emphasis?: string[] },
  ): PromptRenderResult {
    const template = this.getTemplate(baseId);
    const contextBlock = Object.entries(signal.context)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    const emphasis = signal.emphasis?.length ? `
Focus priorities: ${signal.emphasis.join(', ')}` : '';
    const prompt = `${template.template}

Context:
${contextBlock}${emphasis}`;
    const sanitized = this.sanitizePrompt(prompt);
    this.recordUsage(template.id, undefined, undefined);
    return {
      templateId: template.id,
      prompt: sanitized,
      version: this.bumpVersion(template.version),
    };
  }

  private applyVariables(
    template: string,
    variables: Record<string, string | number | boolean> = {},
    context?: Record<string, any>,
  ): string {
    let prompt = template;
    Object.entries(variables).forEach(([key, value]) => {
      const pattern = new RegExp(`{{\s*${this.escapeRegExp(key)}\s*}}`, 'gi');
      prompt = prompt.replace(pattern, String(value));
    });

    if (context && Object.keys(context).length > 0) {
      const contextLines = Object.entries(context)
        .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
        .join('\n');
      prompt = `${prompt.trim()}

Contextual Signals:
${contextLines}`;
    }

    return prompt;
  }

  private recordUsage(id: string, variantId?: string, provider?: AIProviderId): void {
    const metrics = this.ensureMetrics(id);
    metrics.usage += 1;
    metrics.lastUsed = new Date().toISOString();
    if (variantId) {
      const variantMetrics = metrics.variants[variantId] ?? this.createEmptyMetrics();
      variantMetrics.usage += 1;
      variantMetrics.lastUsed = metrics.lastUsed;
      metrics.variants[variantId] = variantMetrics;
    }
    if (provider) {
      metrics.metadata = metrics.metadata ?? {};
      metrics.metadata.lastProvider = provider;
    }
  }

  private ensureMetrics(id: string): PromptPerformanceMetrics {
    let metrics = this.metrics.get(id);
    if (!metrics) {
      metrics = { ...this.createEmptyMetrics(), variants: {} };
      this.metrics.set(id, metrics);
    }
    return metrics;
  }

  private createEmptyMetrics(): PromptPerformanceMetrics {
    return {
      usage: 0,
      success: 0,
      failure: 0,
      variants: {},
      metadata: {},
    };
  }

  private bumpVersion(current: string): string {
    const [major, minor, patch] = current.split('.').map((value) => parseInt(value || '0', 10));
    const nextPatch = Number.isFinite(patch) ? patch + 1 : 0;
    return `${major}.${minor}.${nextPatch}`;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\$&');
  }

  generateTemplateId(name: string): string {
    const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `${normalized}-${crypto.randomBytes(2).toString('hex')}`;
  }
}
