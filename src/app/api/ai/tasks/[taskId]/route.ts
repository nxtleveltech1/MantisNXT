import { NextRequest, NextResponse } from 'next/server'
import { getTask } from '@/lib/queue/taskQueue'

export async function GET(
  _request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const taskId = params.taskId
  if (!taskId) {
    return NextResponse.json(
      { success: false, error: 'Task ID is required' },
      { status: 400 }
    )
  }

  const record = getTask(taskId)
  if (!record) {
    return NextResponse.json(
      { success: false, error: 'Task not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    taskId,
    status: record.status,
    result: record.result,
    error: record.error,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
  })
}

