"use client"

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus, Package } from 'lucide-react'

interface AddProductsModeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChoose: (mode: 'single' | 'multi') => void
}

export default function AddProductsModeDialog({ open, onOpenChange, onChoose }: AddProductsModeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select Add Product Mode</DialogTitle>
          <DialogDescription>
            Choose how you’d like to add products to your inventory.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-6 hover:shadow-sm transition cursor-pointer" onClick={() => onChoose('single')}>
            <div className="flex items-center mb-3">
              <Plus className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="font-semibold">Add Singular Product</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Create a single product by entering details manually.
            </p>
            <Button className="w-full" onClick={() => onChoose('single')}>Add Single Product</Button>
          </div>

          <div className="border rounded-lg p-6 hover:shadow-sm transition cursor-pointer" onClick={() => onChoose('multi')}>
            <div className="flex items-center mb-3">
              <Package className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="font-semibold">Add Multiple Products</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Browse supplier portfolio, filter, select, and set quantities.
            </p>
            <Button className="w-full" variant="secondary" onClick={() => onChoose('multi')}>Select Multiple Products</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
