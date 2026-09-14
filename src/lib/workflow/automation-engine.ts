/**
 * Advanced Workflow Automation Engine
 * Handles complex multi-step processes with state machines, triggers, and actions
 */

export type WorkflowEventType =
  | "appointment_created"
  | "appointment_confirmed"
  | "appointment_completed"
  | "patient_registered"
  | "vitals_recorded"
  | "medication_prescribed"
  | "lab_result_received"
  | "admission_created"
  | "discharge_initiated"
  | "payment_received"
  | "custom_event";

export type WorkflowState =
  | "pending"
  | "active"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export interface WorkflowDefinition {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  version: number;
  trigger: WorkflowTrigger;
  states: WorkflowState[];
  initialState: WorkflowState;
  transitions: StateTransition[];
  actions: WorkflowAction[];
  parallelActions?: boolean;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowTrigger {
  eventType: WorkflowEventType;
  conditions?: ConditionGroup[];
}

export interface ConditionGroup {
  operator: "and" | "or";
  conditions: Condition[];
}

export interface Condition {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than";
  value: unknown;
}

export interface StateTransition {
  from: WorkflowState;
  to: WorkflowState;
  condition?: ConditionGroup;
  onTransition?: WorkflowAction[];
}

export interface WorkflowAction {
  id: string;
  type:
    | "send_notification"
    | "send_email"
    | "create_task"
    | "update_record"
    | "call_api"
    | "assign_user"
    | "schedule_appointment"
    | "execute_script"
    | "trigger_workflow"
    | "log_event";
  config: Record<string, unknown>;
  enabled: boolean;
  retryCount?: number;
  retryInterval?: number;
}

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  organizationId: string;
  state: WorkflowState;
  data: Record<string, unknown>;
  triggeredAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failureReason?: string;
  executedActions: ExecutedAction[];
}

export interface ExecutedAction {
  actionId: string;
  type: string;
  executedAt: Date;
  status: "pending" | "success" | "failed";
  result?: unknown;
  error?: string;
}

/**
 * Workflow Automation Engine
 */
export class WorkflowAutomationEngine {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private instances: Map<string, WorkflowInstance> = new Map();
  private executionHistory: WorkflowExecution[] = [];
  private eventListeners: Map<
    WorkflowEventType,
    ((event: WorkflowEvent) => void)[]
  > = new Map();

  constructor() {
    this.setupDefaultEventListeners();
  }

  /**
   * Register workflow definition
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
  }

  /**
   * Trigger workflow based on event
   */
  async triggerOnEvent(event: WorkflowEvent): Promise<WorkflowInstance[]> {
    const triggeredWorkflows: WorkflowInstance[] = [];

    // Find matching workflows
    for (const workflow of this.workflows.values()) {
      if (!workflow.enabled) continue;

      // Check if trigger matches
      if (this.triggerMatches(workflow.trigger, event)) {
        // Check trigger conditions
        if (
          workflow.trigger.conditions &&
          !this.evaluateConditions(
            workflow.trigger.conditions,
            event.data
          )
        ) {
          continue;
        }

        // Create and start instance
        const instance = await this.createInstance(
          workflow.id,
          event.organizationId,
          event.data
        );
        triggeredWorkflows.push(instance);

        // Start workflow execution
        this.executeWorkflow(instance).catch((error) => {
          console.error(
            `Workflow execution error for ${instance.id}:`,
            error
          );
        });
      }
    }

    // Notify listeners
    const listeners = this.eventListeners.get(event.eventType) || [];
    listeners.forEach((listener) => {
      listener(event);
    });

    return triggeredWorkflows;
  }

  /**
   * Create workflow instance
   */
  private async createInstance(
    workflowId: string,
    organizationId: string,
    data: Record<string, unknown>
  ): Promise<WorkflowInstance> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error("Workflow not found");

    const instance: WorkflowInstance = {
      id: `wf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      workflowId,
      organizationId,
      state: workflow.initialState,
      data,
      triggeredAt: new Date(),
      executedActions: [],
    };

    this.instances.set(instance.id, instance);
    return instance;
  }

  /**
   * Execute workflow
   */
  private async executeWorkflow(instance: WorkflowInstance): Promise<void> {
    const startTime = Date.now();
    instance.startedAt = new Date();

    try {
      while (instance.state !== "completed" && instance.state !== "failed") {
        const workflow = this.workflows.get(instance.workflowId);
        if (!workflow) break;

        // Get applicable transitions
        const transitions = workflow.transitions.filter(
          (t) => t.from === instance.state
        );

        if (transitions.length === 0) {
          // No transitions, workflow completes
          instance.state = "completed";
          break;
        }

        // Find matching transition
        let nextState = null;
        for (const transition of transitions) {
          if (!transition.condition) {
            nextState = transition.to;
            break;
          }

          if (
            this.evaluateConditions(
              transition.condition,
              instance.data
            )
          ) {
            nextState = transition.to;
            break;
          }
        }

        if (!nextState) {
          // No valid transition
          instance.state = "completed";
          break;
        }

        // Execute transition actions
        const transition = transitions.find((t) => t.to === nextState);
        if (transition?.onTransition) {
          for (const action of transition.onTransition) {
            await this.executeAction(instance, action);
          }
        }

        // Update state
        instance.state = nextState;

        // Execute state actions
        const stateActions = workflow.actions.filter((a) =>
          workflow.states.includes(instance.state)
        );

        if (workflow.parallelActions) {
          await Promise.all(
            stateActions.map((action) =>
              this.executeAction(instance, action)
            )
          );
        } else {
          for (const action of stateActions) {
            await this.executeAction(instance, action);
          }
        }
      }

      instance.completedAt = new Date();
    } catch (error) {
      instance.state = "failed";
      instance.failureReason = error instanceof Error ? error.message : String(error);
      instance.completedAt = new Date();
    }

    // Record execution
    this.executionHistory.push({
      instanceId: instance.id,
      workflowId: instance.workflowId,
      duration: Date.now() - startTime,
      result: instance.state,
      executedAt: new Date(),
    });
  }

  /**
   * Execute action
   */
  private async executeAction(
    instance: WorkflowInstance,
    action: WorkflowAction
  ): Promise<void> {
    if (!action.enabled) return;

    const executedAction: ExecutedAction = {
      actionId: action.id,
      type: action.type,
      executedAt: new Date(),
      status: "pending",
    };

    try {
      let result: unknown;

      switch (action.type) {
        case "send_notification":
          result = await this.sendNotification(
            action.config,
            instance
          );
          break;

        case "send_email":
          result = await this.sendEmail(action.config, instance);
          break;

        case "create_task":
          result = await this.createTask(action.config, instance);
          break;

        case "update_record":
          result = await this.updateRecord(action.config, instance);
          break;

        case "call_api":
          result = await this.callApi(action.config, instance);
          break;

        case "assign_user":
          result = await this.assignUser(action.config, instance);
          break;

        case "schedule_appointment":
          result = await this.scheduleAppointment(
            action.config,
            instance
          );
          break;

        case "log_event":
          result = await this.logEvent(action.config, instance);
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      executedAction.status = "success";
      executedAction.result = result;
    } catch (error) {
      executedAction.status = "failed";
      executedAction.error =
        error instanceof Error ? error.message : String(error);

      // Retry logic
      if (action.retryCount && action.retryCount > 0) {
        const retryInterval = action.retryInterval || 60000;
        setTimeout(() => {
          this.executeAction(instance, action);
        }, retryInterval);
      }
    }

    instance.executedActions.push(executedAction);
  }

  /**
   * Check if trigger matches event
   */
  private triggerMatches(
    trigger: WorkflowTrigger,
    event: WorkflowEvent
  ): boolean {
    return trigger.eventType === event.eventType;
  }

  /**
   * Evaluate conditions
   */
  private evaluateConditions(
    groups: ConditionGroup[],
    data: Record<string, unknown>
  ): boolean {
    return groups.every((group) => {
      const results = group.conditions.map((condition) =>
        this.evaluateCondition(condition, data)
      );

      if (group.operator === "and") {
        return results.every((r) => r);
      } else {
        return results.some((r) => r);
      }
    });
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(
    condition: Condition,
    data: Record<string, unknown>
  ): boolean {
    const value = data[condition.field];

    switch (condition.operator) {
      case "equals":
        return value === condition.value;
      case "not_equals":
        return value !== condition.value;
      case "contains":
        return String(value).includes(String(condition.value));
      case "greater_than":
        return Number(value) > Number(condition.value);
      case "less_than":
        return Number(value) < Number(condition.value);
      default:
        return false;
    }
  }

  // Action handlers (stub implementations)
  private async sendNotification(
    config: Record<string, unknown>,
    instance: WorkflowInstance
  ): Promise<void> {
    console.log("Sending notification:", config);
  }

  private async sendEmail(
    config: Record<string, unknown>,
    instance: WorkflowInstance
  ): Promise<void> {
    console.log("Sending email:", config);
  }

  private async createTask(
    config: Record<string, unknown>,
    instance: WorkflowInstance
  ): Promise<void> {
    console.log("Creating task:", config);
  }

  private async updateRecord(
    config: Record<string, unknown>,
    instance: WorkflowInstance
  ): Promise<void> {
    console.log("Updating record:", config);
  }

  private async callApi(
    config: Record<string, unknown>,
    instance: WorkflowInstance
  ): Promise<void> {
    console.log("Calling API:", config);
  }

  private async assignUser(
    config: Record<string, unknown>,
    instance: WorkflowInstance
  ): Promise<void> {
    console.log("Assigning user:", config);
  }

  private async scheduleAppointment(
    config: Record<string, unknown>,
    instance: WorkflowInstance
  ): Promise<void> {
    console.log("Scheduling appointment:", config);
  }

  private async logEvent(
    config: Record<string, unknown>,
    instance: WorkflowInstance
  ): Promise<void> {
    console.log("Logging event:", config);
  }

  /**
   * Setup default event listeners
   */
  private setupDefaultEventListeners(): void {
    // Default listeners can be added here
  }

  /**
   * Subscribe to workflow events
   */
  on(
    eventType: WorkflowEventType,
    listener: (event: WorkflowEvent) => void
  ): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * Get execution history
   */
  getExecutionHistory(workflowId?: string, limit: number = 100): WorkflowExecution[] {
    let history = this.executionHistory;

    if (workflowId) {
      history = history.filter((h) => h.workflowId === workflowId);
    }

    return history
      .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime())
      .slice(0, limit);
  }
}

export interface WorkflowEvent {
  eventType: WorkflowEventType;
  organizationId: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface WorkflowExecution {
  instanceId: string;
  workflowId: string;
  duration: number; // milliseconds
  result: WorkflowState;
  executedAt: Date;
}

// Export singleton instance
export const workflowEngine = new WorkflowAutomationEngine();
