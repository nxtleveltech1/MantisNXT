"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppHeader } from "@/components/layout/AppHeader"
import StoryPromo from "@/components/marketing/story-promo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Share2, ArrowLeft, Smartphone, Download, Copy, CheckCircle } from "lucide-react"
import { toast } from "sonner"

export default function StoriesPage() {
  const [showInstructions, setShowInstructions] = useState(true)
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('')
  const router = useRouter()

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${origin}/marketing-app`)
      setCopied(true)
      toast.success("Link copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error("Failed to copy link")
    }
  }

  const handleDownload = () => {
    // Create a canvas from the StoryPromo component
    const storyElement = document.querySelector('[data-story-preview]')
    if (storyElement) {
      // This would require more complex implementation to capture the component as image
      toast.info("Download functionality coming soon - use browser screenshot for now")
    }
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        <AppHeader title="Stories Generator" subtitle="Create optimized content for Instagram & WhatsApp Stories" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" onClick={() => router.push("/marketing-app")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Store
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Preview Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Stories Preview
                </CardTitle>
                <CardDescription>
                  Preview how your promotional content will look on mobile devices
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <div className="bg-gray-800 p-2 rounded-3xl shadow-xl" data-story-preview>
                  <StoryPromo />
                </div>
              </CardContent>
              <div className="px-6 pb-6 text-center text-gray-500 text-sm">
                <p>Optimized format for Stories (9:16)</p>
                <p>Swipe or click indicators to view all slides</p>
              </div>
            </Card>

            {/* Actions & Instructions */}
            <div className="space-y-4">
              {showInstructions && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Share2 className="h-5 w-5" />
                      How to Share
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-green-600 mb-2">📱 For Social Media:</h4>
                      <ul className="text-sm text-gray-600 space-y-1 ml-4">
                        <li>• Take a screenshot of the preview above</li>
                        <li>• Upload to Instagram Stories or WhatsApp Status</li>
                        <li>• Add relevant hashtags and location tags</li>
                        <li>• Include a call-to-action in your caption</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-green-600 mb-2">🔗 Share Store Link:</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Include this link in your bio or stories for easy access to your store.
                      </p>
                      <div className="flex gap-2">
                        <code className="flex-1 bg-gray-100 p-2 rounded text-xs font-mono">
                          {origin}/marketing-app
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyLink}
                          className="gap-1"
                        >
                          {copied ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                          {copied ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowInstructions(false)}
                      className="w-full"
                    >
                      Hide instructions
                    </Button>
                  </CardContent>
                </Card>
              )}

              {!showInstructions && (
                <Button
                  variant="outline"
                  onClick={() => setShowInstructions(true)}
                  className="w-full"
                >
                  Show instructions
                </Button>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Generate and share your promotional content
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={handleDownload}
                    className="w-full gap-2"
                    variant="outline"
                  >
                    <Download className="h-4 w-4" />
                    Download as Image
                  </Button>

                  <Button
                    onClick={() => router.push("/marketing-app/download")}
                    className="w-full gap-2"
                    variant="outline"
                  >
                    <Share2 className="h-4 w-4" />
                    More Download Options
                  </Button>

                  <Button
                    onClick={() => router.push("/marketing-app/promo")}
                    className="w-full gap-2"
                    variant="outline"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Campaign Management
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      Post stories during peak hours (7-9 PM)
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      Use engaging hooks in the first slide
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      Include clear call-to-action buttons
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      Add location tags to increase visibility
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
