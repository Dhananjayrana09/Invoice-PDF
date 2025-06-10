"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FileText, Zap, Shield, Users } from "lucide-react"

interface User {
  name?: string
  email: string
  profilePicture?: string
}

export default function Home() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("authToken")
    const userData = localStorage.getItem("user")

    if (token && userData) {
      setIsAuthenticated(true)
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleGetStarted = () => {
    if (isAuthenticated) {
      router.push("/dashboard")
    } else {
      router.push("/auth/login")
    }
  }

  const getInitials = (name: string | undefined, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
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
    if (!user) {
      // Not logged in - show person icon with gradient
      return (
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
          <Users className="h-5 w-5 text-white" />
        </div>
      )
    }

    if (user.profilePicture) {
      // Has profile picture
      return (
        <img
          src={user.profilePicture || "/placeholder.svg"}
          alt="Profile"
          className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
        />
      )
    }

    // Show initials with gradient based on email
    const initials = getInitials(user.name, user.email)
    const gradient = getGradientFromEmail(user.email)

    return (
      <div
        className={`w-10 h-10 rounded-full bg-gradient-to-r ${gradient} flex items-center justify-center border-2 border-white/20`}
      >
        <span className="text-white font-semibold text-sm">{initials}</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Glossy overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <header className="border-b border-white/20 bg-white/5 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-purple-400" />
              <span className="text-2xl font-bold text-white">InvoicePDF</span>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={() => router.push("/dashboard")}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg border-0"
                  >
                    Go to Dashboard
                  </Button>
                  <div className="flex items-center space-x-2">
                    <ProfileAvatar />
                    {user && (
                      <div className="hidden sm:block">
                        <p className="text-white text-sm font-medium">{user.name || user.email.split("@")[0]}</p>
                        <p className="text-white/60 text-xs">{user.email}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    onClick={() => router.push("/auth/login")}
                    className="text-white hover:bg-white/10 border-white/20"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => router.push("/auth/register")}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg border-0"
                  >
                    Get Started
                  </Button>
                  <ProfileAvatar />
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold text-white mb-6">
              Generate Professional <span className="text-purple-400">PDF Invoices</span> in Seconds
            </h1>
            <p className="text-xl text-white/70 mb-8 leading-relaxed">
              Create, manage, and download professional invoices with our secure, scalable PDF generation service. Built
              for businesses that value efficiency and reliability.
            </p>
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-6 text-lg shadow-lg border-0"
            >
              {isAuthenticated ? "Go to Dashboard" : "Start Creating Invoices"}
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Why Choose InvoicePDF?</h2>
            <p className="text-lg text-white/70">
              Built with enterprise-grade architecture for reliability and security
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-lg hover:bg-white/10 transition-all duration-300">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-blue-400" />
                </div>
                <CardTitle className="text-xl text-white">Lightning Fast</CardTitle>
                <CardDescription className="text-white/70">
                  Asynchronous PDF generation with real-time status updates. No waiting, no freezing.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-lg hover:bg-white/10 transition-all duration-300">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-green-400" />
                </div>
                <CardTitle className="text-xl text-white">Secure & Private</CardTitle>
                <CardDescription className="text-white/70">
                  Bank-level security with user isolation. Your invoices are completely private and secure.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-lg hover:bg-white/10 transition-all duration-300">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-purple-400" />
                </div>
                <CardTitle className="text-xl text-white">Rate Limited</CardTitle>
                <CardDescription className="text-white/70">
                  Built-in abuse prevention with smart rate limiting. Protects against system overload.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-lg hover:bg-white/10 transition-all duration-300">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-yellow-400" />
                </div>
                <CardTitle className="text-xl text-white">Professional PDFs</CardTitle>
                <CardDescription className="text-white/70">
                  Clean, professional invoice templates that make your business look polished and credible.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 bg-white/5 backdrop-blur-sm">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
              <p className="text-lg text-white/70">Simple, efficient workflow designed for modern businesses</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Fill the Form</h3>
                <p className="text-white/70">
                  Enter client details, line items, and invoice information in our intuitive form.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Generate PDF</h3>
                <p className="text-white/70">
                  Click generate and watch real-time status updates as your PDF is created in the background.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Download</h3>
                <p className="text-white/70">Securely download your professional PDF invoice when it's ready.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
            <p className="text-lg text-white/70 mb-8">
              Join thousands of businesses using InvoicePDF to streamline their invoicing process.
            </p>
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-6 text-lg shadow-lg border-0"
            >
              {isAuthenticated ? "Go to Dashboard" : "Create Your First Invoice"}
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-black/30 backdrop-blur-sm text-white py-8 border-t border-white/10">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <FileText className="h-6 w-6 text-purple-400" />
              <span className="text-xl font-bold">InvoicePDF</span>
            </div>
            <p className="text-white/50">Professional PDF invoice generation service built for modern businesses.</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
