'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Workflow,
  Plus,
  Edit,
  Copy,
  Trash2,
  Play,
  Pause,
  Settings,
  Save,
  CheckCircle,
  Clock,
  ArrowRight,
  GitBranch,
  Zap,
  FileText,
  Bell,
  Shield,
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  type: 'approval' | 'notification' | 'condition' | 'action';
  name: string;
  description: string;
  assigneeType: 'user' | 'role' | 'department';
  assigneeId: string;
  assigneeName: string;
  conditions?: string[];
  timeoutHours?: number;
  escalationRules?: string[];
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  trigger: 'manual' | 'automatic';
  triggerConditions: string[];
  entityType: 'purchase_order' | 'invoice' | 'supplier' | 'contract';
  status: 'active' | 'draft' | 'disabled';
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  avgCompletionTime: string;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([
    {
      id: '1',
      name: 'Purchase Order Approval',
      description: 'Standard approval process for purchase orders above R10,000',
      trigger: 'automatic',
      triggerConditions: ['amount > 10000'],
      entityType: 'purchase_order',
      status: 'active',
      steps: [
        {
          id: 'step1',
          type: 'approval',
          name: 'Department Manager Approval',
          description: 'Requires approval from the requesting department manager',
          assigneeType: 'role',
          assigneeId: 'dept_manager',
          assigneeName: 'Department Manager',
          timeoutHours: 48,
          escalationRules: ['escalate_to_director'],
        },
        {
          id: 'step2',
          type: 'condition',
          name: 'Budget Check',
          description: 'Verify budget availability for the purchase',
          assigneeType: 'role',
          assigneeId: 'finance_manager',
          assigneeName: 'Finance Manager',
          conditions: ['budget_available = true'],
        },
        {
          id: 'step3',
          type: 'approval',
          name: 'Finance Approval',
          description: 'Final approval from finance team for orders above R50,000',
          assigneeType: 'role',
          assigneeId: 'finance_director',
          assigneeName: 'Finance Director',
          conditions: ['amount > 50000'],
          timeoutHours: 24,
        },
        {
          id: 'step4',
          type: 'notification',
          name: 'Approval Notification',
          description: 'Notify requester and supplier of approval',
          assigneeType: 'user',
          assigneeId: 'system',
          assigneeName: 'System',
        },
      ],
      createdAt: '2023-01-15',
      updatedAt: '2023-11-20',
      usageCount: 247,
      avgCompletionTime: '2.3 days',
    },
    {
      id: '2',
      name: 'Supplier Onboarding',
      description: 'Complete supplier verification and approval process',
      trigger: 'manual',
      triggerConditions: [],
      entityType: 'supplier',
      status: 'active',
      steps: [
        {
          id: 'step1',
          type: 'action',
          name: 'Document Verification',
          description: 'Verify supplier documentation and compliance',
          assigneeType: 'role',
          assigneeId: 'compliance_officer',
          assigneeName: 'Compliance Officer',
          timeoutHours: 72,
        },
        {
          id: 'step2',
          type: 'approval',
          name: 'Credit Check Approval',
          description: 'Review credit assessment and financial standing',
          assigneeType: 'role',
          assigneeId: 'finance_manager',
          assigneeName: 'Finance Manager',
          timeoutHours: 48,
        },
        {
          id: 'step3',
          type: 'approval',
          name: 'Final Approval',
          description: 'Final supplier approval by procurement head',
          assigneeType: 'role',
          assigneeId: 'procurement_head',
          assigneeName: 'Procurement Head',
          timeoutHours: 24,
        },
      ],
      createdAt: '2023-02-10',
      updatedAt: '2023-10-15',
      usageCount: 89,
      avgCompletionTime: '5.1 days',
    },
    {
      id: '3',
      name: 'Invoice Processing',
      description: 'Automated invoice validation and approval workflow',
      trigger: 'automatic',
      triggerConditions: ['invoice_received = true'],
      entityType: 'invoice',
      status: 'active',
      steps: [
        {
          id: 'step1',
          type: 'action',
          name: 'Auto Validation',
          description: 'Automatic validation of invoice data and matching',
          assigneeType: 'user',
          assigneeId: 'system',
          assigneeName: 'System',
        },
        {
          id: 'step2',
          type: 'condition',
          name: 'Validation Check',
          description: 'Check if invoice passed automatic validation',
          assigneeType: 'user',
          assigneeId: 'system',
          assigneeName: 'System',
          conditions: ['validation_passed = false'],
        },
        {
          id: 'step3',
          type: 'approval',
          name: 'Manual Review',
          description: 'Manual review for failed validations',
          assigneeType: 'role',
          assigneeId: 'ap_clerk',
          assigneeName: 'AP Clerk',
          timeoutHours: 24,
        },
      ],
      createdAt: '2023-03-05',
      updatedAt: '2023-12-01',
      usageCount: 1456,
      avgCompletionTime: '1.2 days',
    },
    {
      id: '4',
      name: 'Contract Renewal',
      description: 'Contract renewal notification and approval process',
      trigger: 'automatic',
      triggerConditions: ['contract_expiry_date < 30_days'],
      entityType: 'contract',
      status: 'draft',
      steps: [
        {
          id: 'step1',
          type: 'notification',
          name: 'Renewal Reminder',
          description: 'Send renewal reminder to contract owner',
          assigneeType: 'role',
          assigneeId: 'contract_manager',
          assigneeName: 'Contract Manager',
        },
        {
          id: 'step2',
          type: 'approval',
          name: 'Renewal Decision',
          description: 'Decide whether to renew or terminate contract',
          assigneeType: 'role',
          assigneeId: 'contract_manager',
          assigneeName: 'Contract Manager',
          timeoutHours: 168,
        },
      ],
      createdAt: '2023-11-01',
      updatedAt: '2023-11-15',
      usageCount: 0,
      avgCompletionTime: 'N/A',
    },
  ]);

  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
  const [isNewWorkflowDialogOpen, setIsNewWorkflowDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'disabled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStepTypeIcon = (type: string) => {
    switch (type) {
      case 'approval':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'notification':
        return <Bell className="h-4 w-4 text-green-500" />;
      case 'condition':
        return <GitBranch className="h-4 w-4 text-purple-500" />;
      case 'action':
        return <Zap className="h-4 w-4 text-orange-500" />;
      default:
        return <Settings className="h-4 w-4 text-gray-500" />;
    }
  };

  const duplicateWorkflow = (workflowId: string) => {
    const originalWorkflow = workflows.find(w => w.id === workflowId);
    if (originalWorkflow) {
      const newWorkflow: WorkflowDefinition = {
        ...originalWorkflow,
        id: Date.now().toString(),
        name: `${originalWorkflow.name} (Copy)`,
        status: 'draft',
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        usageCount: 0,
        avgCompletionTime: 'N/A',
      };
      setWorkflows(prev => [...prev, newWorkflow]);
    }
  };

  const toggleWorkflowStatus = (workflowId: string) => {
    setWorkflows(prev =>
      prev.map(workflow =>
        workflow.id === workflowId
          ? {
              ...workflow,
              status: workflow.status === 'active' ? 'disabled' : ('active' as const),
            }
          : workflow
      )
    );
  };

  const deleteWorkflow = (workflowId: string) => {
    setWorkflows(prev => prev.filter(workflow => workflow.id !== workflowId));
  };

  const editWorkflow = (workflow: WorkflowDefinition) => {
    setSelectedWorkflow(workflow);
    setIsEditDialogOpen(true);
  };

  const activeWorkflows = workflows.filter(w => w.status === 'active').length;
  const totalUsage = workflows.reduce((sum, w) => sum + w.usageCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workflow Builder</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage approval workflows for business processes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/admin/config/workflows/templates">
              <FileText className="mr-2 h-4 w-4" />
              Templates
            </a>
          </Button>
          <Dialog open={isNewWorkflowDialogOpen} onOpenChange={setIsNewWorkflowDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Workflow
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Workflow</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="workflowName">Workflow Name</Label>
                    <Input id="workflowName" placeholder="Enter workflow name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="entityType">Entity Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select entity type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="purchase_order">Purchase Order</SelectItem>
                        <SelectItem value="invoice">Invoice</SelectItem>
                        <SelectItem value="supplier">Supplier</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="Describe the workflow purpose" />
                </div>
                <div className="space-y-2">
                  <Label>Trigger Type</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="automatic" />
                      <label htmlFor="automatic" className="text-sm">
                        Automatic
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="manual" />
                      <label htmlFor="manual" className="text-sm">
                        Manual
                      </label>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button className="flex-1">Create & Configure Steps</Button>
                  <Button variant="outline" onClick={() => setIsNewWorkflowDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Workflows</p>
                <p className="text-2xl font-bold">{workflows.length}</p>
              </div>
              <Workflow className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Workflows</p>
                <p className="text-2xl font-bold">{activeWorkflows}</p>
              </div>
              <Play className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Executions</p>
                <p className="text-2xl font-bold">{totalUsage.toLocaleString()}</p>
              </div>
              <Zap className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Completion</p>
                <p className="text-2xl font-bold">2.1d</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow List */}
      <div className="space-y-4">
        {workflows.map(workflow => (
          <Card key={workflow.id} className="transition-shadow hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{workflow.name}</h3>
                    <Badge className={getStatusColor(workflow.status)} variant="secondary">
                      {workflow.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {workflow.entityType.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {workflow.trigger}
                    </Badge>
                  </div>

                  <p className="mb-4 text-sm text-gray-600">{workflow.description}</p>

                  {/* Workflow Steps Preview */}
                  <div className="mb-4 flex items-center gap-2">
                    <span className="text-sm text-gray-500">Steps:</span>
                    {workflow.steps.map((step, index) => (
                      <div key={step.id} className="flex items-center">
                        <div className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs">
                          {getStepTypeIcon(step.type)}
                          {step.name}
                        </div>
                        {index < workflow.steps.length - 1 && (
                          <ArrowRight className="mx-1 h-3 w-3 text-gray-400" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Workflow Stats */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Executions</p>
                      <p className="font-medium">{workflow.usageCount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Avg Completion</p>
                      <p className="font-medium">{workflow.avgCompletionTime}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Last Updated</p>
                      <p className="font-medium">
                        {new Date(workflow.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => editWorkflow(workflow)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => duplicateWorkflow(workflow.id)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleWorkflowStatus(workflow.id)}
                  >
                    {workflow.status === 'active' ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteWorkflow(workflow.id)}
                    disabled={workflow.status === 'active'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Workflow Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Workflow: {selectedWorkflow?.name}</DialogTitle>
          </DialogHeader>
          {selectedWorkflow && (
            <div className="space-y-6">
              {/* Basic Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editName">Workflow Name</Label>
                  <Input id="editName" defaultValue={selectedWorkflow.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editStatus">Status</Label>
                  <Select defaultValue={selectedWorkflow.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editDescription">Description</Label>
                <Textarea id="editDescription" defaultValue={selectedWorkflow.description} />
              </div>

              {/* Steps Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium">Workflow Steps</h4>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Step
                  </Button>
                </div>

                <div className="space-y-3">
                  {selectedWorkflow.steps.map((step, index) => (
                    <Card key={step.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <div className="mb-1 flex items-center gap-2">
                                {getStepTypeIcon(step.type)}
                                <span className="font-medium">{step.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {step.type}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">{step.description}</p>
                              <p className="mt-1 text-xs text-gray-500">
                                Assigned to: {step.assigneeName}
                                {step.timeoutHours && ` • Timeout: ${step.timeoutHours}h`}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Workflow Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-medium">Design Guidelines</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Keep workflows simple and easy to understand</li>
                <li>• Set appropriate timeouts for each approval step</li>
                <li>• Include escalation rules for critical processes</li>
                <li>• Test workflows thoroughly before activation</li>
                <li>• Document workflow purpose and step requirements</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">Performance Tips</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Monitor workflow completion times regularly</li>
                <li>• Review and optimize bottleneck steps</li>
                <li>• Use conditions to create efficient branching</li>
                <li>• Set up automated notifications for delays</li>
                <li>• Archive or disable unused workflows</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
