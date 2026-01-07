"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import StoryPromo from "@/components/marketing/story-promo"
import { Button } from "@/components/ui/button"
import { Share2, ArrowLeft } from "lucide-react"

export default function StoriesPage() {
  const [showInstructions, setShowInstructions] = useState(true)
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" onClick={() => router.push("/marketing-app")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-bold">Stories</h1>
        </div>

        {showInstructions && (
          <div className="bg-white rounded-lg p-4 mb-4 shadow-md">
            <h1 className="text-xl font-bold text-gray-800 mb-2">Instagram/WhatsApp Stories</h1>
            <p className="text-gray-600 mb-4">
              Optimized version for Stories sharing. Preview how it will look and use the buttons below to share.
            </p>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => setShowInstructions(false)}>
                Hide instructions
              </Button>
              <Button size="sm">
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <div className="bg-gray-800 p-2 rounded-3xl shadow-xl">
            <StoryPromo />
          </div>
        </div>

        <div className="mt-4 text-center text-gray-500 text-sm">
          <p>Optimized format for Stories (9:16)</p>
          <p>Swipe or click indicators to view all slides</p>
        </div>
      </div>
    </div>
  )
}
