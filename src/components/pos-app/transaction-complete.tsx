"use client"

import { useState } from "react"
import { 
  CheckCircle, Printer, Mail, FileText, Receipt, 
  ArrowRight, Copy
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"

export interface POSTransactionResult {
  success: boolean
  transaction_id: string
  sales_order_id: string
  sales_order_number: string
  invoice_id: string
  invoice_number: string
  subtotal: number
  tax_amount: number
  total: number
  payment_method: string
  payment_reference?: string
  documents: {
    sales_order_url?: string
    invoice_url?: string
    receipt_url?: string
  }
  customer: {
    id: string
    name?: string
    email?: string
  }
  items: Array<{
    product_id: string
    name: string
    quantity: number
    unit_price: number
    subtotal: number
  }>
  created_at: string
}

interface TransactionCompleteProps {
  transaction: POSTransactionResult
  onNewSale: () => void
}

export default function TransactionComplete({
  transaction,
  onNewSale,
}: TransactionCompleteProps) {
  const [emailAddress, setEmailAddress] = useState(transaction.customer?.email || "")
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount)
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const copyTransactionId = () => {
    navigator.clipboard.writeText(transaction.transaction_id)
    toast.success("Transaction ID copied")
  }

  const handlePrint = () => {
    const printContent = generatePrintableReceipt()
    const printWindow = window.open("", "_blank", "width=400,height=600")
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.onload = () => {
        printWindow.print()
        printWindow.close()
      }
    }
  }

  const generatePrintableReceipt = () => {
    const itemsHtml = transaction.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 4px 0; border-bottom: 1px dashed #ccc;">
            ${item.name}<br>
            <small style="color: #666;">${item.quantity} x ${formatCurrency(item.unit_price)}</small>
          </td>
          <td style="padding: 4px 0; text-align: right; border-bottom: 1px dashed #ccc;">
            ${formatCurrency(item.subtotal)}
          </td>
        </tr>
      `
      )
      .join("")

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Receipt - ${transaction.invoice_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 12px; 
            width: 80mm; 
            padding: 5mm;
          }
          .header { text-align: center; margin-bottom: 10px; }
          .store-name { font-size: 16px; font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; }
          .total { font-size: 14px; font-weight: bold; }
          .footer { text-align: center; margin-top: 15px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-name">NXT Store</div>
          <div>Point of Sale</div>
        </div>
        <div class="divider"></div>
        <div style="margin-bottom: 8px;">
          <strong>Invoice:</strong> ${transaction.invoice_number}<br>
          <strong>Date:</strong> ${formatDateTime(transaction.created_at)}<br>
          ${transaction.customer?.name ? `<strong>Customer:</strong> ${transaction.customer.name}` : ""}
        </div>
        <div class="divider"></div>
        <table>${itemsHtml}</table>
        <div class="divider"></div>
        <table>
          <tr>
            <td>Subtotal:</td>
            <td style="text-align: right;">${formatCurrency(transaction.subtotal)}</td>
          </tr>
          ${transaction.tax_amount > 0 ? `
          <tr>
            <td>VAT (15%):</td>
            <td style="text-align: right;">${formatCurrency(transaction.tax_amount)}</td>
          </tr>` : ""}
          <tr class="total">
            <td style="padding-top: 8px; border-top: 2px solid #000;">TOTAL:</td>
            <td style="padding-top: 8px; border-top: 2px solid #000; text-align: right;">${formatCurrency(transaction.total)}</td>
          </tr>
        </table>
        <div class="divider"></div>
        <div style="text-align: center;">
          <strong>Paid by ${transaction.payment_method.toUpperCase()}</strong>
          ${transaction.payment_reference ? `<br>Ref: ${transaction.payment_reference}` : ""}
        </div>
        <div class="footer">
          <p>Thank you for your purchase!</p>
          <p style="margin-top: 5px;">ID: ${transaction.transaction_id.substring(0, 8).toUpperCase()}</p>
        </div>
      </body>
      </html>
    `
  }

  const handleSendEmail = async () => {
    if (!emailAddress) {
      toast.error("Please enter an email address")
      return
    }

    setIsSendingEmail(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      toast.success(`Receipt sent to ${emailAddress}`)
      setShowEmailDialog(false)
    } catch {
      toast.error("Failed to send email")
    } finally {
      setIsSendingEmail(false)
    }
  }

  const getPaymentMethodDisplay = (method: string) => {
    const displays: Record<string, string> = {
      cash: "Cash",
      card: "Card",
      digital: "Digital / EFT",
      account: "On Account",
    }
    return displays[method] || method
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mx-auto">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-green-800">Sale Complete!</h1>
          <p className="text-gray-600">Transaction processed successfully</p>
        </div>

        <Card className="border-green-200 shadow-lg">
          <CardHeader className="pb-3 bg-green-50 rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Transaction Summary</CardTitle>
              <Badge className="bg-green-600">Paid</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Invoice Number</span>
                <div className="font-semibold">{transaction.invoice_number}</div>
              </div>
              <div>
                <span className="text-gray-500">Date & Time</span>
                <div className="font-semibold">{formatDateTime(transaction.created_at)}</div>
              </div>
              <div>
                <span className="text-gray-500">Customer</span>
                <div className="font-semibold">{transaction.customer?.name || "Walk-in"}</div>
              </div>
              <div>
                <span className="text-gray-500">Payment Method</span>
                <div className="font-semibold">{getPaymentMethodDisplay(transaction.payment_method)}</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-500">Items</div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {transaction.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm py-1 border-b border-dashed last:border-0"
                  >
                    <div>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-gray-500 ml-2">
                        {item.quantity} x {formatCurrency(item.unit_price)}
                      </span>
                    </div>
                    <span className="font-semibold">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(transaction.subtotal)}</span>
              </div>
              {transaction.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">VAT</span>
                  <span>{formatCurrency(transaction.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold pt-2 border-t">
                <span>Total Paid</span>
                <span className="text-green-600">{formatCurrency(transaction.total)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
              <span className="text-gray-500">Transaction ID:</span>
              <button
                onClick={copyTransactionId}
                className="flex items-center gap-1 font-mono text-gray-700 hover:text-blue-600"
              >
                {transaction.transaction_id.substring(0, 12)}...
                <Copy className="h-3 w-3" />
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={handlePrint} className="h-12">
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>

          <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-12">
                <Mail className="h-4 w-4 mr-2" />
                Email Receipt
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Email Receipt</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email Address</label>
                  <Input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="customer@email.com"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowEmailDialog(false)}
                    disabled={isSendingEmail}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSendEmail} disabled={isSendingEmail}>
                    {isSendingEmail ? "Sending..." : "Send Receipt"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {transaction.documents?.invoice_url && (
            <Button
              variant="outline"
              className="h-12"
              onClick={() => window.open(transaction.documents.invoice_url, "_blank")}
            >
              <FileText className="h-4 w-4 mr-2" />
              View Invoice
            </Button>
          )}

          {transaction.documents?.sales_order_url && (
            <Button
              variant="outline"
              className="h-12"
              onClick={() => window.open(transaction.documents.sales_order_url, "_blank")}
            >
              <Receipt className="h-4 w-4 mr-2" />
              View Order
            </Button>
          )}
        </div>

        <Button
          onClick={onNewSale}
          className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        >
          <ArrowRight className="h-5 w-5 mr-2" />
          Start New Sale
        </Button>
      </div>
    </div>
  )
}

