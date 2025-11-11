"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  MessageSquare,
  Calendar,
  AlertTriangle,
  FileText
} from 'lucide-react'

import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { ApprovalStep } from './PurchaseOrdersManagement'

interface ApprovalWorkflowProps {
  workflow: ApprovalStep[]
  status: string
  totalAmount: number
  currency: string
}

const ApprovalWorkflow: React.FC<ApprovalWorkflowProps> = ({
  workflow,
  status,
  totalAmount,
  currency
}) => {
  const getStepIcon = (stepStatus: string) => {
    switch (stepStatus) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'skipped':
        return <AlertTriangle className="h-5 w-5 text-gray-400" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStepColor = (stepStatus: string) => {
    switch (stepStatus) {
      case 'approved':
        return 'border-green-200 bg-green-50'
      case 'rejected':
        return 'border-red-200 bg-red-50'
      case 'pending':
        return 'border-yellow-200 bg-yellow-50'
      case 'skipped':
        return 'border-gray-200 bg-gray-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const getCurrentStep = () => {
    return workflow.findIndex(step => step.status === 'pending') + 1 || workflow.length + 1
  }

  const getOverallStatus = () => {
    if (workflow.some(step => step.status === 'rejected')) {
      return { status: 'rejected', message: 'Approval workflow rejected' }
    }
    if (workflow.every(step => step.status === 'approved' || step.status === 'skipped')) {
      return { status: 'approved', message: 'All approvals completed' }
    }
    if (workflow.some(step => step.status === 'pending')) {
      return { status: 'pending', message: 'Awaiting approval' }
    }
    return { status: 'draft', message: 'Not yet submitted for approval' }
  }

  const approvalStatus = getOverallStatus()

  return (
    <div className="space-y-6">
      {/* Approval Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Approval Workflow Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{getCurrentStep()}</div>
              <div className="text-sm text-muted-foreground">Current Step</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{workflow.length}</div>
              <div className="text-sm text-muted-foreground">Total Steps</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatCurrency(totalAmount, currency)}</div>
              <div className="text-sm text-muted-foreground">Amount</div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {approvalStatus.status === 'approved' && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {approvalStatus.status === 'rejected' && (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              {approvalStatus.status === 'pending' && (
                <Clock className="h-5 w-5 text-yellow-500" />
              )}
              <span className="font-medium">{approvalStatus.message}</span>
            </div>
            <Badge
              variant="outline"
              className={cn(
                approvalStatus.status === 'approved' && 'border-green-200 text-green-800',
                approvalStatus.status === 'rejected' && 'border-red-200 text-red-800',
                approvalStatus.status === 'pending' && 'border-yellow-200 text-yellow-800'
              )}
            >
              {approvalStatus.status.charAt(0).toUpperCase() + approvalStatus.status.slice(1)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Approval Steps */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Approval Steps</h3>

        {workflow.map((step, index) => {
          const commentFieldId = `approval-comment-${step.id}`
          return (
            <Card key={step.id} className={cn('transition-colors', getStepColor(step.status))}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStepIcon(step.status)}
                  <div>
                    <CardTitle className="text-base">
                      Step {step.stepNumber}: {step.approverRole}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{step.approverName}</span>
                      {step.required && (
                        <Badge variant="secondary" className="text-xs">Required</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    step.status === 'approved' && 'border-green-200 text-green-800',
                    step.status === 'rejected' && 'border-red-200 text-red-800',
                    step.status === 'pending' && 'border-yellow-200 text-yellow-800',
                    step.status === 'skipped' && 'border-gray-200 text-gray-600'
                  )}
                >
                  {step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>

            {(step.approvedDate || step.comments) && (
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {step.approvedDate && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {step.status === 'approved' ? 'Approved' :
                         step.status === 'rejected' ? 'Rejected' : 'Processed'} on {formatDate(step.approvedDate)}
                      </span>
                    </div>
                  )}

                  {step.comments && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MessageSquare className="h-4 w-4" />
                        <span>Comments:</span>
                      </div>
                      <div className="bg-background/50 rounded-md p-3 text-sm">
                        {step.comments}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}

            {/* Action Buttons for Pending Steps */}
            {step.status === 'pending' && (
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <label htmlFor={commentFieldId} className="text-sm text-muted-foreground">Add Comments (Optional)</label>
                    <Textarea
                      id={commentFieldId}
                      placeholder="Add your comments here..."
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button variant="destructive" size="sm">
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    {!step.required && (
                      <Button variant="outline" size="sm">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Skip
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            )}
            </Card>
          )
        })}
      </div>

      {/* Approval Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Amount Threshold (Manager Approval):</span>
              <span className="font-medium">{formatCurrency(5000, currency)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Amount Threshold (Director Approval):</span>
              <span className="font-medium">{formatCurrency(10000, currency)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Amount Threshold (CFO Approval):</span>
              <span className="font-medium">{formatCurrency(25000, currency)}</span>
            </div>
            <Separator />
            <div className="text-muted-foreground">
              <p>• All purchase orders require department manager approval</p>
              <p>• Orders above {formatCurrency(10000, currency)} require director approval</p>
              <p>• Orders above {formatCurrency(25000, currency)} require CFO approval</p>
              <p>• Emergency orders may skip non-essential approvals</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workflow
              .filter(step => step.approvedDate)
              .sort((a, b) => new Date(a.approvedDate!).getTime() - new Date(b.approvedDate!).getTime())
              .map((step, index) => (
                <div key={step.id} className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">
                          {step.status === 'approved' ? 'Approved' :
                           step.status === 'rejected' ? 'Rejected' : 'Processed'} by {step.approverName}
                        </p>
                        <p className="text-sm text-muted-foreground">{step.approverRole}</p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(step.approvedDate!)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ApprovalWorkflow
