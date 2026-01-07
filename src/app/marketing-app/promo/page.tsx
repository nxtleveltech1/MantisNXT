import AppPromoCard from "@/components/marketing/app-promo-card"

export default function PromoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-800">🛒 Luizinho's Online Store</h1>
          <p className="text-gray-600">Access our online store and place orders via WhatsApp</p>
        </div>

        <AppPromoCard />

        <div className="text-sm text-gray-500 max-w-md mx-auto">
          <p>✨ Click the button above to access our complete online store</p>
          <p className="mt-2">📱 Choose your products and send the order directly via WhatsApp</p>
        </div>
      </div>
    </div>
  )
}
