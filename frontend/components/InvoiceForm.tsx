"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"

interface LineItem {
  description: string
  quantity: number
  rate: number
  amount: number
  quantityTouched?: boolean
  rateTouched?: boolean
}

interface InvoiceFormProps {
  onSubmit: (data: any) => void
  onCancel: () => void
}

export default function InvoiceForm({ onSubmit, onCancel }: InvoiceFormProps) {
  const [formData, setFormData] = useState({
    clientName: "",
    clientEmail: "",
    invoiceNumber: `INV-${Date.now()}`,
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  })

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, rate: 0, amount: 0, quantityTouched: false, rateTouched: false },
  ])

  const [tax, setTax] = useState(0)
  const [taxTouched, setTaxTouched] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleLineItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    const updatedItems = [...lineItems]

    if (field === "quantity") {
      if (!updatedItems[index].quantityTouched) {
        updatedItems[index] = {
          ...updatedItems[index],
          quantity: typeof value === "string" ? Number.parseInt(value) : value,
          quantityTouched: true,
        }
      } else {
        updatedItems[index] = {
          ...updatedItems[index],
          quantity: typeof value === "string" ? Number.parseInt(value) : value,
        }
      }
    } else if (field === "rate") {
      if (!updatedItems[index].rateTouched) {
        updatedItems[index] = {
          ...updatedItems[index],
          rate: typeof value === "string" ? Number.parseFloat(value) : value,
          rateTouched: true,
        }
      } else {
        updatedItems[index] = {
          ...updatedItems[index],
          rate: typeof value === "string" ? Number.parseFloat(value) : value,
        }
      }
    } else {
      updatedItems[index] = { ...updatedItems[index], [field]: value }
    }

    if (field === "quantity" || field === "rate") {
      updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].rate
    }

    setLineItems(updatedItems)
  }

  const handleNumberInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select()
  }

  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (!lineItems[index].quantityTouched && /^[0-9]$/.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const updatedItems = [...lineItems]
      updatedItems[index] = {
        ...updatedItems[index],
        quantity: Number.parseInt(e.key),
        quantityTouched: true,
      }
      updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].rate
      setLineItems(updatedItems)
      e.preventDefault()
    }
  }

  const handleRateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (!lineItems[index].rateTouched && /^[0-9]$/.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const updatedItems = [...lineItems]
      updatedItems[index] = {
        ...updatedItems[index],
        rate: Number.parseInt(e.key),
        rateTouched: true,
      }
      updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].rate
      setLineItems(updatedItems)
      e.preventDefault()
    }
  }

  const handleTaxKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!taxTouched && /^[0-9]$/.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
      setTax(Number.parseInt(e.key))
      setTaxTouched(true)
      e.preventDefault()
    }
  }

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        description: "",
        quantity: 1,
        rate: 0,
        amount: 0,
        quantityTouched: false,
        rateTouched: false,
      },
    ])
  }

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index))
    }
  }

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.amount, 0)
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    return subtotal + tax
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const subtotal = calculateSubtotal()
    const total = calculateTotal()

    const cleanLineItems = lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
    }))

    const invoiceData = {
      ...formData,
      lineItems: cleanLineItems.filter((item) => item.description && item.quantity > 0),
      subtotal,
      tax,
      total,
    }

    onSubmit(invoiceData)
  }

  const inputStyles =
    "bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/10 hover:bg-white/10 [&:not(:placeholder-shown)]:bg-white/10"

  return (
    <div className="relative max-w-4xl mx-auto h-[90vh] flex flex-col">
      {/* Purple background that sits behind the form */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/90 via-purple-800/80 to-slate-900/90 rounded-3xl shadow-2xl"></div>

      {/* Transparent form container */}
      <div className="relative backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl flex flex-col h-full">
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-8 pb-4 border-b border-white/10">
          <h1 className="text-3xl font-bold text-white mb-2">Create Invoice</h1>
          <p className="text-white/70">Generate professional invoices with ease</p>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-8 py-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20 hover:scrollbar-thumb-white/30">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client Information */}
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                  Client Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="clientName" className="text-white/90 font-medium">
                      Client Name
                    </Label>
                    <Input
                      id="clientName"
                      name="clientName"
                      value={formData.clientName}
                      onChange={handleInputChange}
                      className={`${inputStyles} focus:border-blue-400 focus:ring-blue-400/20`}
                      placeholder="Enter client name"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="clientEmail" className="text-white/90 font-medium">
                      Client Email
                    </Label>
                    <Input
                      id="clientEmail"
                      name="clientEmail"
                      type="email"
                      value={formData.clientEmail}
                      onChange={handleInputChange}
                      className={`${inputStyles} focus:border-blue-400 focus:ring-blue-400/20`}
                      placeholder="Enter client email"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Details */}
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                  Invoice Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="invoiceNumber" className="text-white/90 font-medium">
                      Invoice Number
                    </Label>
                    <Input
                      id="invoiceNumber"
                      name="invoiceNumber"
                      value={formData.invoiceNumber}
                      onChange={handleInputChange}
                      className={`${inputStyles} focus:border-green-400 focus:ring-green-400/20`}
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="issueDate" className="text-white/90 font-medium">
                      Issue Date
                    </Label>
                    <Input
                      id="issueDate"
                      name="issueDate"
                      type="date"
                      value={formData.issueDate}
                      onChange={handleInputChange}
                      className={`${inputStyles} focus:border-green-400 focus:ring-green-400/20 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert`}
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="dueDate" className="text-white/90 font-medium">
                      Due Date
                    </Label>
                    <Input
                      id="dueDate"
                      name="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={handleInputChange}
                      className={`${inputStyles} focus:border-green-400 focus:ring-green-400/20 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert`}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white flex items-center">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                    Line Items
                  </h3>
                  <Button
                    type="button"
                    onClick={addLineItem}
                    className="bg-purple-600 hover:bg-purple-700 text-white border-0 shadow-lg"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-4">
                  {lineItems.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-4 items-end p-4 bg-white/5 rounded-xl border border-white/10"
                    >
                      <div className="col-span-12 md:col-span-5">
                        <Label htmlFor={`description-${index}`} className="text-white/90 font-medium">
                          Description
                        </Label>
                        <Input
                          id={`description-${index}`}
                          value={item.description}
                          onChange={(e) => handleLineItemChange(index, "description", e.target.value)}
                          placeholder="Enter description"
                          className={`${inputStyles} focus:border-purple-400 focus:ring-purple-400/20`}
                          required
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <Label htmlFor={`quantity-${index}`} className="text-white/90 font-medium">
                          Qty
                        </Label>
                        <Input
                          id={`quantity-${index}`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onFocus={handleNumberInputFocus}
                          onChange={(e) => handleLineItemChange(index, "quantity", e.target.value)}
                          onKeyDown={(e) => handleQuantityKeyDown(e, index)}
                          className={`${inputStyles} focus:border-purple-400 focus:ring-purple-400/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                          required
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <Label htmlFor={`rate-${index}`} className="text-white/90 font-medium">
                          Rate (₹)
                        </Label>
                        <Input
                          id={`rate-${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onFocus={handleNumberInputFocus}
                          onChange={(e) => handleLineItemChange(index, "rate", e.target.value)}
                          onKeyDown={(e) => handleRateKeyDown(e, index)}
                          className={`${inputStyles} focus:border-purple-400 focus:ring-purple-400/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                          required
                        />
                      </div>
                      <div className="col-span-3 md:col-span-2">
                        <Label className="text-white/90 font-medium">Amount</Label>
                        <Input
                          value={`₹${item.amount.toFixed(2)}`}
                          readOnly
                          className="bg-white/5 border-white/10 text-white/80 cursor-not-allowed"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeLineItem(index)}
                          disabled={lineItems.length === 1}
                          className="bg-red-500/20 border-red-400/30 text-red-300 hover:bg-red-500/30 hover:text-red-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Totals */}
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></div>
                  Totals
                </h3>
                <div className="max-w-sm ml-auto space-y-4 p-6 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex justify-between text-white/90">
                    <span className="font-medium">Subtotal:</span>
                    <span className="font-semibold">₹{calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <Label htmlFor="tax" className="text-white/90 font-medium">
                      Tax (₹):
                    </Label>
                    <Input
                      id="tax"
                      type="number"
                      min="0"
                      step="0.01"
                      value={tax}
                      onFocus={handleNumberInputFocus}
                      onChange={(e) => setTax(Number.parseFloat(e.target.value) || 0)}
                      onKeyDown={handleTaxKeyDown}
                      className={`w-28 ${inputStyles} focus:border-yellow-400 focus:ring-yellow-400/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                    />
                  </div>
                  <div className="border-t border-white/20 pt-4">
                    <div className="flex justify-between font-bold text-xl text-white">
                      <span>Total:</span>
                      <span className="text-yellow-400">₹{calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Fixed Footer with Actions */}
        <div className="flex-shrink-0 p-8 pt-4 border-t border-white/10">
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg border-0"
            >
              Generate PDF Invoice
            </Button>
          </div>
        </div>
      </div>

      {/* Add a subtle glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-fuchsia-500/20 to-blue-600/20 rounded-[2rem] blur-xl -z-10"></div>
    </div>
  )
}
