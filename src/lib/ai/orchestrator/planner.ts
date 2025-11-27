/**
 * AI Planner
 * Handles multi-step planning and execution for complex AI operations
 */

import {
  ExecutionPlan,
  PlanStep,
  PlanExecutionResult,
  IntentAnalysis,
  ValidationResult,
  RecoveryAction,
  executionPlanSchema,
  planStepSchema,
  planExecutionResultSchema,
  intentAnalysisSchema,
  validationResultSchema,
  recoveryActionSchema,
} from './types';
import { toolRegistry } from '../tools/registry';
import { toolExecutor, ToolExecutor } from '../tools/executor';
import type { OrchestratorSession } from './types';

/**
 * Planner - Handles complex multi-step task planning and execution
 */
export class Planner {
  private static instance: Planner;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): Planner {
    if (!Planner.instance) {
      Planner.instance = new Planner();
    }
    return Planner.instance;
  }

  /**
   * Create an execution plan from user intent
   */
  public async createPlan(
    intent: string,
    session: OrchestratorSession
  ): Promise<ExecutionPlan> {
    // Analyze the user intent
    const intentAnalysis = await this.analyzeIntent(intent);

    // Decompose into steps
    const steps = await this.decomposeTask(intentAnalysis);

    // Create execution plan
    const plan: ExecutionPlan = {
      id: crypto.randomUUID(),
      sessionId: session.id,
      intent,
      steps,
      createdAt: new Date(),
      estimatedTotalDurationMs: this.estimateTotalDuration(steps),
      rollbackSteps: this.generateRollbackSteps(steps),
      metadata: {
        intentAnalysis,
        createdBy: 'planner',
        complexity: intentAnalysis.estimatedComplexity,
      },
    };

    // Validate the plan
    const validation = await this.validatePlan(plan);
    if (!validation.isValid) {
      throw new Error(`Plan validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    return executionPlanSchema.parse(plan);
  }

  /**
   * Execute an execution plan
   */
  public async executePlan(
    plan: ExecutionPlan,
    executor: ToolExecutor = toolExecutor
  ): Promise<PlanExecutionResult> {
    const validatedPlan = executionPlanSchema.parse(plan);
    const startTime = Date.now();
    const completedSteps: PlanExecutionResult['completedSteps'] = [];
    const failedSteps: PlanExecutionResult['failedSteps'] = [];

    let rollbackExecuted = false;

    try {
      for (const step of validatedPlan.steps) {
        try {
          const stepStartTime = Date.now();

          // Execute the step
          const result = await this.executeStep(step, executor);

          completedSteps.push({
            stepId: step.id,
            success: true,
            result,
            executionTimeMs: Date.now() - stepStartTime,
          });

        } catch (error) {
          const stepError = {
            stepId: step.id,
            error: {
              code: this.getErrorCode(error),
              message: error instanceof Error ? error.message : 'Step execution failed',
              details: error,
            },
            retryCount: 0, // TODO: Implement retry logic
          };

          failedSteps.push(stepError);

          // Handle step failure
          const recoveryAction = await this.handleStepFailure(validatedPlan, step, error);

          switch (recoveryAction) {
            case 'retry':
              // TODO: Implement retry with backoff
              break;
            case 'skip':
              continue;
            case 'rollback':
              await this.executeRollback(validatedPlan);
              rollbackExecuted = true;
              break;
            case 'abort':
            default:
              throw error;
          }
        }
      }

      return planExecutionResultSchema.parse({
        planId: validatedPlan.id,
        success: failedSteps.length === 0,
        completedSteps,
        failedSteps,
        totalExecutionTimeMs: Date.now() - startTime,
        rollbackExecuted,
      });

    } catch (error) {
      // Execute rollback on critical failure
      if (!rollbackExecuted) {
        try {
          await this.executeRollback(validatedPlan);
          rollbackExecuted = true;
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
        }
      }

      return planExecutionResultSchema.parse({
        planId: validatedPlan.id,
        success: false,
        completedSteps,
        failedSteps,
        totalExecutionTimeMs: Date.now() - startTime,
        rollbackExecuted,
      });
    }
  }

  /**
   * Analyze user intent from message
   */
  private async analyzeIntent(userMessage: string): Promise<IntentAnalysis> {
    // Simple intent analysis - in production, this would use NLP/ML
    const message = userMessage.toLowerCase();

    // Determine primary intent
    let primaryIntent = 'general_query';
    let confidence = 0.5;
    let requiresPlanning = false;
    let requiresTools = false;
    let estimatedComplexity: IntentAnalysis['estimatedComplexity'] = 'low';
    const entities: Record<string, unknown> = {};
    const suggestedTools: string[] = [];

    // Analyze for specific patterns
    if (message.includes('create') || message.includes('add') || message.includes('new')) {
      primaryIntent = 'create_entity';
      confidence = 0.8;
      requiresTools = true;
      suggestedTools.push('create_product', 'create_supplier');
    } else if (message.includes('update') || message.includes('change') || message.includes('modify')) {
      primaryIntent = 'update_entity';
      confidence = 0.8;
      requiresTools = true;
      suggestedTools.push('update_product', 'update_inventory');
    } else if (message.includes('delete') || message.includes('remove')) {
      primaryIntent = 'delete_entity';
      confidence = 0.8;
      requiresTools = true;
      suggestedTools.push('delete_product', 'archive_supplier');
    } else if (message.includes('analyze') || message.includes('report') || message.includes('dashboard')) {
      primaryIntent = 'generate_report';
      confidence = 0.8;
      requiresPlanning = true;
      requiresTools = true;
      estimatedComplexity = 'medium';
      suggestedTools.push('query_analytics', 'generate_report');
    } else if (message.includes('inventory') || message.includes('stock') || message.includes('quantity')) {
      primaryIntent = 'inventory_management';
      confidence = 0.8;
      requiresTools = true;
      suggestedTools.push('check_inventory', 'update_stock');
    }

    // Check for complex operations that require planning
    const complexIndicators = ['multiple', 'batch', 'bulk', 'all', 'every', 'comprehensive'];
    if (complexIndicators.some(indicator => message.includes(indicator))) {
      requiresPlanning = true;
      estimatedComplexity = 'high';
    }

    // Extract entities (simplified)
    const productMatch = message.match(/product[s]?\s+(.+?)(?:\s|$)/i);
    if (productMatch) {
      entities.product = productMatch[1].trim();
    }

    const supplierMatch = message.match(/supplier[s]?\s+(.+?)(?:\s|$)/i);
    if (supplierMatch) {
      entities.supplier = supplierMatch[1].trim();
    }

    return intentAnalysisSchema.parse({
      primaryIntent,
      confidence,
      entities,
      requiresPlanning,
      requiresTools,
      estimatedComplexity,
      suggestedTools,
    });
  }

  /**
   * Decompose intent into executable steps
   */
  private async decomposeTask(intentAnalysis: IntentAnalysis): Promise<PlanStep[]> {
    const steps: PlanStep[] = [];

    switch (intentAnalysis.primaryIntent) {
      case 'create_entity':
        steps.push(
          this.createStep('validate_input', 'Validate input data', undefined, [], 1),
          this.createStep('check_permissions', 'Check user permissions', undefined, ['validate_input'], 2),
          this.createStep('create_entity', 'Create the entity', intentAnalysis.suggestedTools[0], ['check_permissions'], 3),
          this.createStep('verify_creation', 'Verify entity was created successfully', 'query_entity', ['create_entity'], 4)
        );
        break;

      case 'update_entity':
        steps.push(
          this.createStep('find_entity', 'Find existing entity', 'query_entity', [], 1),
          this.createStep('validate_update', 'Validate update data', undefined, ['find_entity'], 2),
          this.createStep('update_entity', 'Update the entity', intentAnalysis.suggestedTools[0], ['validate_update'], 3),
          this.createStep('verify_update', 'Verify entity was updated', 'query_entity', ['update_entity'], 4)
        );
        break;

      case 'generate_report':
        steps.push(
          this.createStep('gather_data', 'Gather required data', 'query_analytics', [], 1),
          this.createStep('process_data', 'Process and analyze data', undefined, ['gather_data'], 2),
          this.createStep('format_report', 'Format report output', undefined, ['process_data'], 3),
          this.createStep('validate_report', 'Validate report completeness', undefined, ['format_report'], 4)
        );
        break;

      case 'inventory_management':
        steps.push(
          this.createStep('check_current_stock', 'Check current inventory levels', 'check_inventory', [], 1),
          this.createStep('analyze_demand', 'Analyze demand patterns', 'query_analytics', ['check_current_stock'], 2),
          this.createStep('calculate_reorder', 'Calculate reorder quantities', undefined, ['analyze_demand'], 3),
          this.createStep('update_inventory', 'Update inventory records', 'update_stock', ['calculate_reorder'], 4)
        );
        break;

      default:
        // Generic single-step plan
        steps.push(
          this.createStep('execute_query', 'Execute user request', intentAnalysis.suggestedTools[0], [], 1)
        );
    }

    return steps;
  }

  /**
   * Validate execution plan feasibility
   */
  private async validatePlan(plan: ExecutionPlan): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    // Check for circular dependencies
    if (this.hasCircularDependencies(plan.steps)) {
      errors.push({
        field: 'steps',
        code: 'CIRCULAR_DEPENDENCY',
        message: 'Plan contains circular dependencies between steps',
      });
    }

    // Validate tool availability
    for (const step of plan.steps) {
      if (step.toolName && !toolRegistry.hasTool(step.toolName)) {
        errors.push({
          field: `step_${step.id}`,
          code: 'TOOL_NOT_FOUND',
          message: `Tool '${step.toolName}' not found in registry`,
        });
      }
    }

    // Check dependency validity
    const stepIds = new Set(plan.steps.map(s => s.id));
    for (const step of plan.steps) {
      for (const depId of step.dependencies) {
        if (!stepIds.has(depId)) {
          errors.push({
            field: `step_${step.id}`,
            code: 'INVALID_DEPENDENCY',
            message: `Step depends on non-existent step '${depId}'`,
          });
        }
      }
    }

    // Check for unreachable steps
    const reachableSteps = this.getReachableSteps(plan.steps);
    for (const step of plan.steps) {
      if (!reachableSteps.has(step.id)) {
        warnings.push({
          field: `step_${step.id}`,
          code: 'UNREACHABLE_STEP',
          message: 'Step may not be executed due to dependency issues',
        });
      }
    }

    return validationResultSchema.parse({
      isValid: errors.length === 0,
      errors,
      warnings,
    });
  }

  /**
   * Handle step execution failure
   */
  private async handleStepFailure(
    plan: ExecutionPlan,
    failedStep: PlanStep,
    error: unknown
  ): Promise<RecoveryAction> {
    // Simple failure handling - in production, this would be more sophisticated
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Critical steps always trigger rollback
    if (failedStep.id.includes('validate') || failedStep.id.includes('check_permissions')) {
      return 'rollback';
    }

    // Non-critical steps can be skipped for some operations
    if (failedStep.id.includes('verify') || failedStep.id.includes('log')) {
      return 'skip';
    }

    // Default to abort for unknown failures
    return 'abort';
  }

  /**
   * Execute a single plan step
   */
  private async executeStep(
    step: PlanStep,
    executor: ToolExecutor
  ): Promise<unknown> {
    if (!step.toolName) {
      // Non-tool step - just return success
      return { status: 'completed', stepId: step.id };
    }

    // Create execution context
    const context = {
      orgId: 'system', // TODO: Get from session
      userId: 'system', // TODO: Get from session
      sessionId: 'system', // TODO: Get from session
      conversationId: 'system', // TODO: Get from session
      timestamp: new Date(),
    };

    // Execute the tool
    const result = await executor.execute(
      step.toolName,
      step.parameters,
      context,
      { timeout: 30000 } // 30 second timeout
    );

    if (!result.success) {
      throw new Error(result.error?.message || 'Tool execution failed');
    }

    return result.data;
  }

  /**
   * Execute rollback steps
   */
  private async executeRollback(plan: ExecutionPlan): Promise<void> {
    if (!plan.rollbackSteps || plan.rollbackSteps.length === 0) {
      return;
    }

    console.log(`Executing rollback for plan ${plan.id}`);

    // Execute rollback steps in reverse order
    for (const step of plan.rollbackSteps.reverse()) {
      try {
        await this.executeStep(step, toolExecutor);
      } catch (error) {
        console.error(`Rollback step ${step.id} failed:`, error);
        // Continue with other rollback steps even if one fails
      }
    }
  }

  /**
   * Create a plan step
   */
  private createStep(
    id: string,
    description: string,
    toolName?: string,
    dependencies: string[] = [],
    priority: number = 5
  ): PlanStep {
    return planStepSchema.parse({
      id,
      description,
      toolName,
      parameters: {},
      dependencies,
      estimatedDurationMs: 5000, // 5 seconds default
      priority,
      retryPolicy: {
        maxRetries: 1,
        backoffMs: 1000,
      },
    });
  }

  /**
   * Estimate total plan duration
   */
  private estimateTotalDuration(steps: PlanStep[]): number {
    // Simple estimation - sum all step durations
    return steps.reduce((total, step) => total + (step.estimatedDurationMs || 5000), 0);
  }

  /**
   * Generate rollback steps for a plan
   */
  private generateRollbackSteps(steps: PlanStep[]): PlanStep[] {
    // Simple rollback - reverse the steps with cleanup actions
    return steps
      .filter(step => step.toolName) // Only tool-based steps need rollback
      .reverse()
      .map(step => this.createStep(
        `rollback_${step.id}`,
        `Rollback ${step.description}`,
        `rollback_${step.toolName}`, // Assumes rollback tools exist
        [],
        1 // High priority for rollback
      ));
  }

  /**
   * Check for circular dependencies in steps
   */
  private hasCircularDependencies(steps: PlanStep[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) return true;
      if (visited.has(stepId)) return false;

      visited.add(stepId);
      recursionStack.add(stepId);

      const step = steps.find(s => s.id === stepId);
      if (step) {
        for (const depId of step.dependencies) {
          if (hasCycle(depId)) return true;
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const step of steps) {
      if (hasCycle(step.id)) return true;
    }

    return false;
  }

  /**
   * Get reachable steps from the dependency graph
   */
  private getReachableSteps(steps: PlanStep[]): Set<string> {
    const reachable = new Set<string>();
    const stepMap = new Map(steps.map(s => [s.id, s]));

    const visit = (stepId: string) => {
      if (reachable.has(stepId)) return;
      reachable.add(stepId);

      const step = stepMap.get(stepId);
      if (step) {
        for (const depId of step.dependencies) {
          visit(depId);
        }
      }
    };

    // Start from steps with no dependencies
    for (const step of steps) {
      if (step.dependencies.length === 0) {
        visit(step.id);
      }
    }

    return reachable;
  }

  /**
   * Extract error code from error
   */
  private getErrorCode(error: unknown): string {
    if (error instanceof Error) {
      // Check for specific error patterns
      if (error.message.includes('timeout')) return 'TIMEOUT';
      if (error.message.includes('permission')) return 'PERMISSION_DENIED';
      if (error.message.includes('not found')) return 'NOT_FOUND';
      if (error.message.includes('validation')) return 'VALIDATION_ERROR';
    }
    return 'EXECUTION_ERROR';
  }
}

// Export singleton instance
export const planner = Planner.getInstance();