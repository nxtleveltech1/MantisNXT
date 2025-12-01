'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Package } from 'lucide-react';

interface AddProductsModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (mode: 'single' | 'multi') => void;
}

export default function AddProductsModeDialog({
  open,
  onOpenChange,
  onChoose,
}: AddProductsModeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select Add Product Mode</DialogTitle>
          <DialogDescription>
            Choose how you’d like to add products to your inventory.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div
            className="cursor-pointer rounded-lg border p-6 transition hover:shadow-sm"
            onClick={() => onChoose('single')}
          >
            <div className="mb-3 flex items-center">
              <Plus className="mr-2 h-5 w-5 text-blue-600" />
              <h3 className="font-semibold">Add Singular Product</h3>
            </div>
            <p className="text-muted-foreground mb-4 text-sm">
              Create a single product by entering details manually.
            </p>
            <Button className="w-full" onClick={() => onChoose('single')}>
              Add Single Product
            </Button>
          </div>

          <div
            className="cursor-pointer rounded-lg border p-6 transition hover:shadow-sm"
            onClick={() => onChoose('multi')}
          >
            <div className="mb-3 flex items-center">
              <Package className="mr-2 h-5 w-5 text-green-600" />
              <h3 className="font-semibold">Add Multiple Products</h3>
            </div>
            <p className="text-muted-foreground mb-4 text-sm">
              Browse supplier portfolio, filter, select, and set quantities.
            </p>
            <Button className="w-full" variant="secondary" onClick={() => onChoose('multi')}>
              Select Multiple Products
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
