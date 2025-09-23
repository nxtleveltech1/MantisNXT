import { useState, useCallback, useRef, useEffect } from 'react'

export interface ProgressStage {
  id: string
  name: string
  description: string
  weight: number // 0-1, used to calculate overall progress
  status: 'pending' | 'running' | 'completed' | 'error' | 'warning'
  startTime?: Date
  endTime?: Date
  error?: string
  data?: any
}

export interface ProgressTracker {
  id: string
  name: string
  stages: ProgressStage[]
  currentStageIndex: number
  overallProgress: number
  status: 'idle' | 'running' | 'completed' | 'error' | 'paused'
  startTime?: Date
  endTime?: Date
  estimatedCompletion?: Date
  timeRemaining?: number
  throughput?: number
  errors: string[]
  warnings: string[]
}

export interface ProgressUpdate {
  stageId?: string
  status?: ProgressStage['status']
  progress?: number // 0-100 for current stage
  message?: string
  error?: string
  data?: any
}

export interface UseProgressTrackerOptions {
  estimateThroughput?: boolean
  autoStart?: boolean
  persistProgress?: boolean
  onStageComplete?: (stage: ProgressStage) => void
  onComplete?: (tracker: ProgressTracker) => void
  onError?: (error: string, stage?: ProgressStage) => void
}

export function useProgressTracker(
  stages: Omit<ProgressStage, 'status' | 'startTime' | 'endTime'>[],
  options: UseProgressTrackerOptions = {}
) {
  const {
    estimateThroughput = true,
    autoStart = false,
    persistProgress = false,
    onStageComplete,
    onComplete,
    onError
  } = options

  const [tracker, setTracker] = useState<ProgressTracker>(() => ({
    id: `tracker_${Date.now()}`,
    name: 'Progress Tracker',
    stages: stages.map(stage => ({
      ...stage,
      status: 'pending'
    })),
    currentStageIndex: 0,
    overallProgress: 0,
    status: 'idle',
    errors: [],
    warnings: []
  }))

  const throughputRef = useRef<Array<{ timestamp: Date; progress: number }>>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate overall progress based on stage weights and completion
  const calculateOverallProgress = useCallback((stages: ProgressStage[], currentIndex: number, currentStageProgress: number = 0): number => {
    let totalWeight = 0
    let completedWeight = 0

    stages.forEach((stage, index) => {
      totalWeight += stage.weight

      if (index < currentIndex) {
        // Completed stages
        completedWeight += stage.weight
      } else if (index === currentIndex) {
        // Current stage - partial completion
        completedWeight += stage.weight * (currentStageProgress / 100)
      }
    })

    return totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0
  }, [])

  // Calculate time estimates based on throughput
  const calculateTimeEstimates = useCallback((currentProgress: number): { timeRemaining?: number; estimatedCompletion?: Date; throughput?: number } => {
    if (!estimateThroughput || throughputRef.current.length < 2) {
      return {}
    }

    const samples = throughputRef.current.slice(-10) // Use last 10 samples
    if (samples.length < 2) return {}

    // Calculate average progress rate (progress per millisecond)
    let totalRate = 0
    for (let i = 1; i < samples.length; i++) {
      const timeDiff = samples[i].timestamp.getTime() - samples[i - 1].timestamp.getTime()
      const progressDiff = samples[i].progress - samples[i - 1].progress
      if (timeDiff > 0 && progressDiff > 0) {
        totalRate += progressDiff / timeDiff
      }
    }

    const averageRate = totalRate / (samples.length - 1)
    const throughput = averageRate * 1000 // progress per second

    if (averageRate > 0 && currentProgress < 100) {
      const remainingProgress = 100 - currentProgress
      const timeRemaining = remainingProgress / averageRate // milliseconds
      const estimatedCompletion = new Date(Date.now() + timeRemaining)

      return {
        timeRemaining: Math.round(timeRemaining / 1000), // seconds
        estimatedCompletion,
        throughput: Math.round(throughput * 100) / 100
      }
    }

    return { throughput: Math.round(throughput * 100) / 100 }
  }, [estimateThroughput])

  // Start the tracker
  const start = useCallback((name?: string) => {
    setTracker(prev => ({
      ...prev,
      name: name || prev.name,
      status: 'running',
      startTime: new Date(),
      currentStageIndex: 0,
      overallProgress: 0,
      errors: [],
      warnings: [],
      stages: prev.stages.map((stage, index) => ({
        ...stage,
        status: index === 0 ? 'running' : 'pending',
        startTime: index === 0 ? new Date() : undefined,
        endTime: undefined,
        error: undefined
      }))
    }))

    // Start throughput tracking
    if (estimateThroughput) {
      throughputRef.current = [{ timestamp: new Date(), progress: 0 }]

      intervalRef.current = setInterval(() => {
        setTracker(current => {
          const now = new Date()
          throughputRef.current.push({ timestamp: now, progress: current.overallProgress })

          // Keep only recent samples (last 2 minutes)
          const cutoff = now.getTime() - 120000
          throughputRef.current = throughputRef.current.filter(sample => sample.timestamp.getTime() > cutoff)

          const estimates = calculateTimeEstimates(current.overallProgress)
          return { ...current, ...estimates }
        })
      }, 2000) // Update every 2 seconds
    }
  }, [estimateThroughput, calculateTimeEstimates])

  // Update progress for current stage
  const updateProgress = useCallback((update: ProgressUpdate) => {
    setTracker(prev => {
      const newStages = [...prev.stages]
      let currentIndex = prev.currentStageIndex
      let newStatus = prev.status

      // Find target stage
      const targetStageIndex = update.stageId
        ? newStages.findIndex(s => s.id === update.stageId)
        : currentIndex

      if (targetStageIndex === -1) {
        console.warn(`Stage ${update.stageId} not found`)
        return prev
      }

      const targetStage = newStages[targetStageIndex]

      // Update stage
      if (update.status) {
        targetStage.status = update.status

        if (update.status === 'running' && !targetStage.startTime) {
          targetStage.startTime = new Date()
        }

        if (update.status === 'completed' || update.status === 'error') {
          targetStage.endTime = new Date()

          if (update.status === 'completed') {
            onStageComplete?.(targetStage)

            // Move to next stage if this was the current stage
            if (targetStageIndex === currentIndex) {
              currentIndex = Math.min(currentIndex + 1, newStages.length - 1)

              // Start next stage if available
              if (currentIndex < newStages.length - 1) {
                newStages[currentIndex + 1].status = 'running'
                newStages[currentIndex + 1].startTime = new Date()
              } else {
                // All stages completed
                newStatus = 'completed'
              }
            }
          } else if (update.status === 'error') {
            newStatus = 'error'
            onError?.(update.error || 'Unknown error', targetStage)
          }
        }
      }

      if (update.error) {
        targetStage.error = update.error
      }

      if (update.data) {
        targetStage.data = { ...targetStage.data, ...update.data }
      }

      // Calculate overall progress
      const stageProgress = update.progress || 0
      const overallProgress = calculateOverallProgress(newStages, currentIndex, stageProgress)

      // Collect errors and warnings
      const errors = newStages.filter(s => s.status === 'error').map(s => s.error || 'Unknown error')
      const warnings = newStages.filter(s => s.status === 'warning').map(s => s.error || 'Warning')

      const newTracker = {
        ...prev,
        stages: newStages,
        currentStageIndex: currentIndex,
        overallProgress,
        status: newStatus,
        errors,
        warnings,
        endTime: newStatus === 'completed' || newStatus === 'error' ? new Date() : prev.endTime
      }

      // Add throughput sample
      if (estimateThroughput && newStatus === 'running') {
        throughputRef.current.push({ timestamp: new Date(), progress: overallProgress })
      }

      // Call completion callback
      if (newStatus === 'completed') {
        onComplete?.(newTracker)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }

      return newTracker
    })
  }, [calculateOverallProgress, estimateThroughput, onStageComplete, onComplete, onError])

  // Complete current stage and move to next
  const completeCurrentStage = useCallback((data?: any) => {
    updateProgress({
      status: 'completed',
      progress: 100,
      data
    })
  }, [updateProgress])

  // Mark current stage as error
  const errorCurrentStage = useCallback((error: string, data?: any) => {
    updateProgress({
      status: 'error',
      error,
      data
    })
  }, [updateProgress])

  // Skip current stage
  const skipCurrentStage = useCallback((reason?: string) => {
    updateProgress({
      status: 'completed',
      progress: 100,
      data: { skipped: true, reason }
    })
  }, [updateProgress])

  // Pause the tracker
  const pause = useCallback(() => {
    setTracker(prev => ({ ...prev, status: 'paused' }))
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Resume the tracker
  const resume = useCallback(() => {
    setTracker(prev => ({ ...prev, status: 'running' }))
    // Restart throughput tracking if needed
    if (estimateThroughput && !intervalRef.current) {
      // Implementation for resume throughput tracking
    }
  }, [estimateThroughput])

  // Reset the tracker
  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    setTracker(prev => ({
      ...prev,
      stages: prev.stages.map(stage => ({
        ...stage,
        status: 'pending',
        startTime: undefined,
        endTime: undefined,
        error: undefined
      })),
      currentStageIndex: 0,
      overallProgress: 0,
      status: 'idle',
      startTime: undefined,
      endTime: undefined,
      estimatedCompletion: undefined,
      timeRemaining: undefined,
      throughput: undefined,
      errors: [],
      warnings: []
    }))

    throughputRef.current = []
  }, [])

  // Get current stage
  const getCurrentStage = useCallback((): ProgressStage | null => {
    return tracker.stages[tracker.currentStageIndex] || null
  }, [tracker])

  // Get completed stages
  const getCompletedStages = useCallback((): ProgressStage[] => {
    return tracker.stages.filter(stage => stage.status === 'completed')
  }, [tracker])

  // Get remaining stages
  const getRemainingStages = useCallback((): ProgressStage[] => {
    return tracker.stages.filter(stage => stage.status === 'pending')
  }, [tracker])

  // Auto-start if configured
  useEffect(() => {
    if (autoStart) {
      start()
    }
  }, [autoStart, start])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    tracker,
    start,
    updateProgress,
    completeCurrentStage,
    errorCurrentStage,
    skipCurrentStage,
    pause,
    resume,
    reset,
    getCurrentStage,
    getCompletedStages,
    getRemainingStages,

    // Computed values
    isRunning: tracker.status === 'running',
    isCompleted: tracker.status === 'completed',
    isError: tracker.status === 'error',
    isPaused: tracker.status === 'paused',
    hasErrors: tracker.errors.length > 0,
    hasWarnings: tracker.warnings.length > 0,
    currentStage: getCurrentStage(),
    progressPercentage: Math.round(tracker.overallProgress),

    // Time estimates
    timeRemaining: tracker.timeRemaining,
    estimatedCompletion: tracker.estimatedCompletion,
    throughput: tracker.throughput,

    // Helper methods
    getStageById: (id: string) => tracker.stages.find(s => s.id === id),
    getStageProgress: (stageId: string) => {
      const stage = tracker.stages.find(s => s.id === stageId)
      if (!stage) return 0

      switch (stage.status) {
        case 'completed': return 100
        case 'running': return 50 // Assume halfway if no specific progress
        case 'error': return 0
        default: return 0
      }
    }
  }
}