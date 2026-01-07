"use client"

import { useState } from "react"
import { Download, ImageIcon, FileText, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function DownloadGenerator() {
  const [isGenerating, setIsGenerating] = useState(false)
  const baseUrl = process.env.NEXT_PUBLIC_MARKETING_APP_URL || `${window.location.origin}/marketing-app`
  const storeName = process.env.NEXT_PUBLIC_MARKETING_STORE_NAME || "Luizinho"

  // Function to generate and download promotional image
  const generatePromoImage = async (format: "square" | "story" | "banner") => {
    setIsGenerating(true)

    try {
      // Create canvas to generate image
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      if (!ctx) return

      // Define dimensions based on format
      const dimensions = {
        square: { width: 1080, height: 1080 },
        story: { width: 1080, height: 1920 },
        banner: { width: 1200, height: 630 },
      }

      const { width, height } = dimensions[format]
      canvas.width = width
      canvas.height = height

      // Create background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height)
      gradient.addColorStop(0, "#10b981")
      gradient.addColorStop(1, "#059669")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      // Configure text
      ctx.textAlign = "center"
      ctx.fillStyle = "white"

      if (format === "story") {
        // Layout for Stories
        // Logo
        ctx.fillStyle = "white"
        ctx.fillRect(width / 2 - 80, 150, 160, 160)
        ctx.fillStyle = "#10b981"
        ctx.font = "bold 80px Arial"
        ctx.fillText("L", width / 2, 260)

        // Title
        ctx.fillStyle = "white"
        ctx.font = "bold 60px Arial"
        ctx.fillText("Luizinho", width / 2, 380)
        ctx.font = "40px Arial"
        ctx.fillText("Electronics Store", width / 2, 430)

        // Products
        ctx.font = "bold 45px Arial"
        ctx.fillText("Available Products:", width / 2, 600)

        const products = [
          "🎧 Bluetooth Headphones - R 2,999.99",
          "🔌 Chargers - R 899.99",
          "🔗 USB-C Cables - R 499.99",
          "🔋 Power Banks - R 1,599.99",
        ]

        ctx.font = "35px Arial"
        products.forEach((product, index) => {
          ctx.fillText(product, width / 2, 700 + index * 80)
        })

        // Call to action
        ctx.font = "bold 50px Arial"
        ctx.fillText("Access our online store!", width / 2, 1200)

        // URL
        ctx.font = "30px Arial"
        ctx.fillText("/marketing-app", width / 2, 1300)

        // WhatsApp info
        ctx.font = "35px Arial"
        ctx.fillText("📱 Orders via WhatsApp", width / 2, 1450)
        ctx.fillText("Fast delivery • Original products", width / 2, 1500)
      } else if (format === "square") {
        // Layout for square post
        // Logo
        ctx.fillStyle = "white"
        ctx.fillRect(width / 2 - 60, 100, 120, 120)
        ctx.fillStyle = "#10b981"
        ctx.font = "bold 60px Arial"
        ctx.fillText("L", width / 2, 180)

        // Title
        ctx.fillStyle = "white"
        ctx.font = "bold 50px Arial"
        ctx.fillText("Luizinho - Electronics", width / 2, 280)

        // Grid of products
        const productGrid = [
          ["🎧 Headphones", "R 2,999.99"],
          ["🔌 Chargers", "R 899.99"],
          ["🔗 Cables", "R 499.99"],
          ["🔋 Power Banks", "R 1,599.99"],
        ]

        ctx.font = "30px Arial"
        productGrid.forEach((product, index) => {
          const x = (index % 2) * (width / 2) + width / 4
          const y = Math.floor(index / 2) * 150 + 450
          ctx.fillText(product[0], x, y)
          ctx.fillText(product[1], x, y + 40)
        })

        // Call to action
        ctx.font = "bold 40px Arial"
        ctx.fillText("Access our online store!", width / 2, 800)

        // URL
        ctx.font = "25px Arial"
        ctx.fillText("/marketing-app", width / 2, 850)
      } else {
        // Layout for banner
        // Logo on the left
        ctx.fillStyle = "white"
        ctx.fillRect(50, height / 2 - 60, 120, 120)
        ctx.fillStyle = "#10b981"
        ctx.font = "bold 60px Arial"
        ctx.textAlign = "center"
        ctx.fillText("L", 110, height / 2 + 20)

        // Title
        ctx.fillStyle = "white"
        ctx.font = "bold 45px Arial"
        ctx.textAlign = "left"
        ctx.fillText("Luizinho - Electronics Store", 200, height / 2 - 80)

        // Products
        ctx.font = "30px Arial"
        ctx.fillText("🎧 Headphones • 🔌 Chargers • 🔗 Cables • 🔋 Power Banks", 200, height / 2 - 30)

        // Call to action
        ctx.font = "bold 35px Arial"
        ctx.fillText("Access: /marketing-app", 200, height / 2 + 30)

        // WhatsApp
        ctx.font = "25px Arial"
        ctx.fillText("📱 Orders via WhatsApp • Fast delivery", 200, height / 2 + 70)
      }

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `luizinho-promo-${format}.png`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }
      }, "image/png")
    } catch (error) {
      console.error("Error generating image:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Function to generate text file with information
  const generateTextFile = () => {
    const content = `
🛒 ${storeName.toUpperCase()}'S ONLINE STORE
Electronics and Accessories

📱 ACCESS OUR STORE:
${baseUrl}

🎯 AVAILABLE PRODUCTS:
• 🎧 Premium Bluetooth Headphones - R 2,999.99
• 🔌 USB-C Fast Charger 65W - R 899.99
• 🔗 Original USB-C Cable 2m - R 499.99
• 📱 Wireless Charging Pad 15W - R 1,299.99
• 🎮 RGB Gaming Headset - R 1,999.99
• 🔋 Power Bank 20000mAh - R 1,599.99

📞 HOW TO PLACE ORDERS:
1. Access our online store
2. Choose your products
3. Add to cart
4. Send order via WhatsApp

✅ ADVANTAGES:
• Original products
• Fast delivery
• WhatsApp support
• Competitive prices
• Guaranteed quality

📲 CONTACT:
WhatsApp: ${process.env.NEXT_PUBLIC_MARKETING_WHATSAPP_NUMBER || "(11) 93216-2209"}

🌐 SHARE:
Send this link to your friends:
${baseUrl}

---
Luizinho - Your trusted electronics store
    `.trim()

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "luizinho-store-info.txt"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-800">Promotional Materials for Download</h1>
        <p className="text-gray-600">Download images and files to share Luizinho's store</p>
      </div>

      {/* Promotional Images */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ImageIcon className="h-5 w-5" />
            <span>Promotional Images</span>
          </CardTitle>
          <CardDescription>Download optimized images for different platforms and uses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Square Post */}
            <div className="border rounded-lg p-4 text-center space-y-3">
              <div className="w-full h-32 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center">
                <div className="text-white font-bold text-2xl">1:1</div>
              </div>
              <div>
                <h3 className="font-semibold">Square Post</h3>
                <p className="text-sm text-gray-600">1080x1080px</p>
                <Badge variant="secondary" className="text-xs">
                  Instagram • Facebook
                </Badge>
              </div>
              <Button onClick={() => generatePromoImage("square")} disabled={isGenerating} className="w-full" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Download PNG
              </Button>
            </div>

            {/* Stories */}
            <div className="border rounded-lg p-4 text-center space-y-3">
              <div className="w-full h-32 bg-gradient-to-b from-green-500 to-green-700 rounded-lg flex items-center justify-center">
                <div className="text-white font-bold text-2xl">9:16</div>
              </div>
              <div>
                <h3 className="font-semibold">Stories</h3>
                <p className="text-sm text-gray-600">1080x1920px</p>
                <Badge variant="secondary" className="text-xs">
                  Instagram • WhatsApp
                </Badge>
              </div>
              <Button onClick={() => generatePromoImage("story")} disabled={isGenerating} className="w-full" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Download PNG
              </Button>
            </div>

            {/* Banner */}
            <div className="border rounded-lg p-4 text-center space-y-3">
              <div className="w-full h-32 bg-gradient-to-r from-green-500 to-green-700 rounded-lg flex items-center justify-center">
                <div className="text-white font-bold text-2xl">16:9</div>
              </div>
              <div>
                <h3 className="font-semibold">Banner</h3>
                <p className="text-sm text-gray-600">1200x630px</p>
                <Badge variant="secondary" className="text-xs">
                  Websites • Blogs
                </Badge>
              </div>
              <Button onClick={() => generatePromoImage("banner")} disabled={isGenerating} className="w-full" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Download PNG
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Text File */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Store Information</span>
          </CardTitle>
          <CardDescription>Text file with all information for sharing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-semibold">Information File</h3>
              <p className="text-sm text-gray-600">Contains store link, products, prices and instructions</p>
              <Badge variant="outline" className="text-xs mt-1">
                TXT • For WhatsApp
              </Badge>
            </div>
            <Button onClick={generateTextFile}>
              <Download className="h-4 w-4 mr-1" />
              Download TXT
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Share2 className="h-5 w-5" />
            <span>How to Use</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-green-600">📱 For Social Media:</h4>
              <ul className="text-sm text-gray-600 ml-4 space-y-1">
                <li>• Use square format for Instagram and Facebook posts</li>
                <li>• Use Stories format for Instagram Stories and WhatsApp Status</li>
                <li>• Add personalized text in captions</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-green-600">🌐 For Websites and Blogs:</h4>
              <ul className="text-sm text-gray-600 ml-4 space-y-1">
                <li>• Use banner format for website headers</li>
                <li>• Include store link in buttons near the image</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-green-600">💬 For WhatsApp:</h4>
              <ul className="text-sm text-gray-600 ml-4 space-y-1">
                <li>• Use TXT file to copy and paste information</li>
                <li>• Send images along with store link</li>
                <li>• Share in groups and contacts</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {isGenerating && (
        <div className="text-center text-gray-600">
          <p>Generating image... Please wait.</p>
        </div>
      )}
    </div>
  )
}
