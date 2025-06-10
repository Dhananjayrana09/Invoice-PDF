"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Plus, Download, LogOut, Clock, CheckCircle, XCircle, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import InvoiceForm from "@/components/InvoiceForm"

interface Invoice {
  _id: string
  clientName: string
  clientEmail: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  total: number
  status: "processing" | "ready" | "failed"
  createdAt: string
}

interface User {
  id: string
  email: string
  name?: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [showForm, setShowForm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("authToken")
    const userData = localStorage.getItem("user")

    if (!token || !userData) {
      router.push("/auth/login")
      return
    }

    const user = JSON.parse(userData)
    setUser(user)
    fetchInvoices()
    setupSSE()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  const fetchInvoices = async () => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/invoices`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setInvoices(data)
      } else {
        throw new Error("Failed to fetch invoices")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const setupSSE = () => {
    const token = localStorage.getItem("authToken")
    if (!token) return

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sse?authorization=${token}`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log("SSE connection opened")
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log("SSE message received:", data)

        if (data.type === "invoice_ready") {
          setInvoices((prev) =>
            prev.map((invoice) => (invoice._id === data.invoiceId ? { ...invoice, status: "ready" } : invoice))
          )
          toast({
            title: "PDF Ready!",
            description: "Your invoice PDF is ready for download.",
          })
        } else if (data.type === "invoice_failed") {
          setInvoices((prev) =>
            prev.map((invoice) => (invoice._id === data.invoiceId ? { ...invoice, status: "failed" } : invoice))
          )
          toast({
            title: "PDF Generation Failed",
            description: "There was an error generating your PDF.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error)
      }
    }

    eventSource.onerror = (error) => {
      console.error("SSE error:", error)
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          setupSSE()
        }
      }, 5000)
    }
  }

  const handleCreateInvoice = async (invoiceData: any) => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/invoices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(invoiceData),
      })

      if (response.ok) {
        const newInvoice = await response.json()
        setInvoices((prev) => [newInvoice, ...prev])
        setShowForm(false)
        toast({
          title: "Invoice Created",
          description: "Your invoice is being generated...",
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to create invoice")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleDownload = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/invoices/${invoiceId}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `invoice-${invoiceNumber}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        throw new Error("Download failed")
      }
    } catch (error) {
      toast({
        title: "Download Error",
        description: "Failed to download PDF",
        variant: "destructive",
      })
    }
  }

  const handleLogout = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    localStorage.removeItem("authToken")
    localStorage.removeItem("user")
    router.push("/")
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processing":
        return <Clock className="h-4 w-4" />
      case "ready":
        return <CheckCircle className="h-4 w-4" />
      case "failed":
        return <XCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "processing":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-400/30"
      case "ready":
        return "bg-green-500/20 text-green-300 border-green-400/30"
      case "failed":
        return "bg-red-500/20 text-red-300 border-red-400/30"
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-400/30"
    }
  }

  const getUserInitials = (user: User) => {
    if (user.name) {
      return user.name
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase())
        .join("")
        .slice(0, 2)
    }
    return user.email.split("@")[0].slice(0, 2).toUpperCase()
  }

  const getGradientFromEmail = (email: string) => {
    const gradients = [
      "from-purple-500 to-pink-500",
      "from-blue-500 to-cyan-500",
      "from-green-500 to-teal-500",
      "from-yellow-500 to-orange-500",
      "from-red-500 to-pink-500",
      "from-indigo-500 to-purple-500",
      "from-cyan-500 to-blue-500",
      "from-teal-500 to-green-500",
    ]

    const hash = email.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0)
      return a & a
    }, 0)

    return gradients[Math.abs(hash) % gradients.length]
  }

  const ProfileAvatar = () => {
    if (!user) return null

    const initials = getUserInitials(user)
    const gradient = getGradientFromEmail(user.email)

    return (
      <div
        className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center border-2 border-white/20 shadow-lg"
      >
        <span className="text-white font-semibold text-sm">{initials}</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto"></div>
          <p className="mt-4 text-white/70">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Glossy overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <header className="backdrop-blur-xl bg-white/10 border-b border-white/20">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-8 w-8 text-purple-400" />
                <span className="text-2xl font-bold text-white">InvoicePDF</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-white">{user?.name || user?.email.split("@")[0]}</p>
                    <p className="text-xs text-white/60">{user?.email}</p>
                  </div>
                  <ProfileAvatar />
                </div>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Dashboard Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Invoice Dashboard</h1>
              <p className="text-white/70">Create and manage your PDF invoices</p>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg border-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-500/20 rounded-xl">
                    <FileText className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-white/70">Total Invoices</p>
                    <p className="text-2xl font-bold text-white">{invoices.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-500/20 rounded-xl">
                    <Clock className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-white/70">Processing</p>
                    <p className="text-2xl font-bold text-white">
                      {invoices.filter((i) => i.status === "processing").length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-500/20 rounded-xl">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-white/70">Ready</p>
                    <p className="text-2xl font-bold text-white">
                      {invoices.filter((i) => i.status === "ready").length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-red-500/20 rounded-xl">
                    <XCircle className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-white/70">Failed</p>
                    <p className="text-2xl font-bold text-white">
                      {invoices.filter((i) => i.status === "failed").length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoices List */}
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-lg">
            <CardHeader>
              <CardTitle className="text-white text-xl">Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-white/40 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No invoices yet</h3>
                  <p className="text-white/70 mb-4">Create your first invoice to get started</p>
                  <Button
                    onClick={() => setShowForm(true)}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice._id}
                      className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-200"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h4 className="font-medium text-white">#{invoice.invoiceNumber}</h4>
                            <p className="text-sm text-white/70">{invoice.clientName}</p>
                          </div>
                          <Badge className={`${getStatusColor(invoice.status)} border`}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(invoice.status)}
                              <span className="capitalize">{invoice.status}</span>
                            </div>
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-medium text-white">₹{invoice.total.toFixed(2)}</p>
                          <p className="text-sm text-white/70">{new Date(invoice.createdAt).toLocaleDateString()}</p>
                        </div>
                        {invoice.status === "ready" && (
                          <Button
                            size="sm"
                            onClick={() => handleDownload(invoice._id, invoice.invoiceNumber)}
                            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg border-0"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Invoice Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="relative w-full max-w-2xl max-h-[95vh]">
              <Button
                variant="ghost"
                onClick={() => setShowForm(false)}
                className="absolute top-1 right-4 z-20 bg-black/20 hover:bg-black/40 text-white border border-white/20 rounded-full w-8 h-8 p-0 backdrop-blur-sm"
              >
                <X className="h-5 w-5" />
              </Button>
              <div className="max-h-[95vh] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/30 hover:scrollbar-thumb-white/50 pr-2">
                <InvoiceForm onSubmit={handleCreateInvoice} onCancel={() => setShowForm(false)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}