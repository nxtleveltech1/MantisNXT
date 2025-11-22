"use client"

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ColumnDef = {
  key: string
  label: string
  visible: boolean
  order: number
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
}

interface SortableColumnItemProps {
  column: ColumnDef
  onToggle: (key: string) => void
}

function SortableColumnItem({ column, onToggle }: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.key })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 rounded-md border bg-background',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-5 w-5" />
      </div>
      <Checkbox
        checked={column.visible}
        onCheckedChange={() => onToggle(column.key)}
        id={`col-${column.key}`}
      />
      <label
        htmlFor={`col-${column.key}`}
        className="flex-1 cursor-pointer text-sm font-medium"
      >
        {column.label}
      </label>
    </div>
  )
}

interface ColumnManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: ColumnDef[]
  onColumnsChange: (columns: ColumnDef[]) => void
  defaultColumns: ColumnDef[]
}

export function ColumnManagementDialog({
  open,
  onOpenChange,
  columns,
  onColumnsChange,
  defaultColumns,
}: ColumnManagementDialogProps) {
  const [localColumns, setLocalColumns] = useState<ColumnDef[]>(columns)

  // Update local state when dialog opens or columns prop changes
  React.useEffect(() => {
    if (open) {
      // When dialog opens, sync with current columns
      setLocalColumns([...columns])
    }
  }, [open, columns])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = localColumns.findIndex((col) => col.key === active.id)
      const newIndex = localColumns.findIndex((col) => col.key === over.id)

      const newColumns = arrayMove(localColumns, oldIndex, newIndex).map(
        (col, index) => ({
          ...col,
          order: index + 1,
        })
      )

      setLocalColumns(newColumns)
    }
  }

  const handleToggle = (key: string) => {
    const newColumns = localColumns.map((col) =>
      col.key === key ? { ...col, visible: !col.visible } : col
    )
    setLocalColumns(newColumns)
  }

  const handleReset = () => {
    setLocalColumns(
      defaultColumns.map((col) => ({
        ...col,
      }))
    )
  }

  const handleSave = () => {
    onColumnsChange(localColumns)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setLocalColumns(columns)
    onOpenChange(false)
  }

  const visibleCount = localColumns.filter((col) => col.visible).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Columns</DialogTitle>
          <DialogDescription>
            Drag to reorder columns. Use checkboxes to show or hide columns.
            {visibleCount > 0 && (
              <span className="block mt-1 text-sm font-medium">
                {visibleCount} column{visibleCount !== 1 ? 's' : ''} visible
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto pr-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localColumns.map((col) => col.key)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {localColumns.map((column) => (
                  <SortableColumnItem
                    key={column.key}
                    column={column}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button variant="outline" onClick={handleReset} size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

