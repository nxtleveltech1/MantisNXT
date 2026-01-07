import { NextRequest, NextResponse } from "next/server";

// Mock products data - South African ZAR pricing
const mockProducts = [
  {
    id: 1,
    name: "Premium Bluetooth Headphones",
    description: "Wireless headphones with active noise cancellation and long-lasting battery. Perfect for music, calls, and work.",
    price: 2999.99,
    currency: "ZAR",
    image: "/marketing/bluetooth-headphones.jpg",
    category: "Audio",
    features: ["Bluetooth 5.0", "Active Noise Cancellation", "30h Battery Life", "IPX4 Water Resistant"],
    specifications: {
      Connectivity: "Bluetooth 5.0",
      Battery: "30 hours",
      Resistance: "IPX4",
      Weight: "250g",
      Warranty: "1 year",
    },
    availability: "in stock",
    isActive: true,
  },
  {
    id: 2,
    name: "USB-C Fast Charger 65W",
    description: "Universal fast charger compatible with smartphones, tablets, and laptops. Smart charging technology.",
    price: 899.99,
    currency: "ZAR",
    image: "/marketing/usb-c-charger.jpg",
    category: "Chargers",
    features: ["65W Fast Charging", "USB-C PD", "Overcharge Protection", "Compact & Portable"],
    specifications: {
      Power: "65W",
      Input: "100-240V",
      Output: "USB-C PD",
      Dimensions: "6x6x3cm",
      Warranty: "2 years",
    },
    availability: "in stock",
    isActive: true,
  },
  {
    id: 3,
    name: "Original USB-C Cable 2m",
    description: "High-quality original USB-C cable for charging and data transfer. Premium and durable materials.",
    price: 499.99,
    currency: "ZAR",
    image: "/marketing/usb-c-cable.jpg",
    category: "Cables",
    features: ["2 Metre Length", "USB-C to USB-C", "Fast Data Transfer", "Durable Build"],
    specifications: {
      Length: "2 metres",
      Type: "USB-C to USB-C",
      Speed: "480 Mbps",
      Material: "Braided Nylon",
      Warranty: "1 year",
    },
    availability: "in stock",
    isActive: true,
  },
  {
    id: 4,
    name: "Wireless Charging Pad 15W",
    description: "Wireless charging base compatible with all Qi devices. Elegant design with efficient charging.",
    price: 1299.99,
    currency: "ZAR",
    image: "/marketing/wireless-charger.jpg",
    category: "Chargers",
    features: ["15W Charging", "Qi Compatible", "LED Indicator", "Elegant Design"],
    specifications: {
      Power: "15W maximum",
      Compatibility: "Qi universal",
      Dimensions: "10x10x1cm",
      Material: "Premium Aluminium",
      Warranty: "2 years",
    },
    availability: "in stock",
    isActive: true,
  },
  {
    id: 5,
    name: "RGB Gaming Headset",
    description: "Gaming headset with RGB lighting and detachable microphone. Surround sound for the ultimate gaming experience.",
    price: 1999.99,
    currency: "ZAR",
    image: "/marketing/gaming-headset.jpg",
    category: "Audio",
    features: ["7.1 Surround Sound", "Detachable Microphone", "RGB Lighting", "Comfortable Ear Cushions"],
    specifications: {
      Connectivity: "USB + 3.5mm",
      Drivers: "50mm",
      Frequency: "20Hz-20kHz",
      Weight: "320g",
      Warranty: "1 year",
    },
    availability: "in stock",
    isActive: true,
  },
  {
    id: 6,
    name: "Power Bank 20000mAh",
    description: "High-capacity power bank with fast charging and multiple ports. Perfect for travel and everyday use.",
    price: 1599.99,
    currency: "ZAR",
    image: "/marketing/power-bank.jpg",
    category: "Chargers",
    features: ["20000mAh", "Fast Charging", "3 USB Ports", "Digital Display"],
    specifications: {
      Capacity: "20000mAh",
      Ports: "2x USB-A + 1x USB-C",
      Input: "USB-C 18W",
      Output: "22.5W maximum",
      Warranty: "1 year",
    },
    availability: "in stock",
    isActive: true,
  },
];

// GET /api/social-media/sales/products - List all active products
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const channelId = searchParams.get("channelId")
    const category = searchParams.get("category")

    let products = mockProducts.filter(p => p.isActive)

    if (channelId) {
      // Filter by channel if needed
    }

    // Filter by category if provided
    if (category) {
      products = products.filter((p) => p.category === category)
    }

    return NextResponse.json(products)
  } catch (error: any) {
    console.error("Error fetching products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

// POST /api/social-media/sales/products - Create a new product
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      channelId,
      name,
      description,
      price,
      currency = "ZAR",
      image,
      category,
      features,
      specifications,
      availability = "in stock",
    } = body

    if (!name || !price) {
      return NextResponse.json({ error: "Name and price are required" }, { status: 400 })
    }

    const newProduct = {
      id: mockProducts.length + 1,
      channelId: channelId ? parseInt(channelId) : null,
      name,
      description,
      price: Math.round(price * 100), // Convert to cents
      currency,
      image,
      category,
      features: features || [],
      specifications: specifications || {},
      availability,
      isActive: true,
    }

    mockProducts.push(newProduct)

    return NextResponse.json(newProduct, { status: 201 })
  } catch (error: any) {
    console.error("Error creating product:", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}
