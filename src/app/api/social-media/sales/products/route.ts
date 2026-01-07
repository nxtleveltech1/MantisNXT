import { NextRequest, NextResponse } from "next/server";

// Mock products data
const mockProducts = [
  {
    id: 1,
    name: "Fone de Ouvido Bluetooth Premium",
    description: "Fone de ouvido sem fio com cancelamento de ruído ativo e bateria de longa duração. Ideal para música, chamadas e trabalho.",
    price: 29999, // in cents
    currency: "ZAR",
    image: "/marketing/fone-bluetooth-premium.jpg",
    category: "Áudio",
    features: ["Bluetooth 5.0", "Cancelamento de ruído", "30h de bateria", "Resistente à água IPX4"],
    specifications: {
      Conectividade: "Bluetooth 5.0",
      Bateria: "30 horas",
      Resistência: "IPX4",
      Peso: "250g",
      Garantia: "1 ano",
    },
    availability: "in stock",
    isActive: true,
  },
  {
    id: 2,
    name: "Carregador Rápido USB-C 65W",
    description: "Carregador rápido universal compatível com smartphones, tablets e notebooks. Tecnologia de carregamento inteligente.",
    price: 8999,
    currency: "ZAR",
    image: "/marketing/carregador-usb-c.jpg",
    category: "Carregadores",
    features: ["Carregamento rápido 65W", "USB-C PD", "Proteção contra sobrecarga", "Compacto e portátil"],
    specifications: {
      Potência: "65W",
      Entrada: "100-240V",
      Saída: "USB-C PD",
      Dimensões: "6x6x3cm",
      Garantia: "2 anos",
    },
    availability: "in stock",
    isActive: true,
  },
  {
    id: 3,
    name: "Cabo USB-C Original 2m",
    description: "Cabo USB-C original de alta qualidade para carregamento e transferência de dados. Material premium e durável.",
    price: 4999,
    currency: "ZAR",
    image: "/marketing/cabo-usb-c.jpg",
    category: "Cabos",
    features: ["2 metros de comprimento", "USB-C para USB-C", "Transferência rápida", "Material durável"],
    specifications: {
      Comprimento: "2 metros",
      Tipo: "USB-C para USB-C",
      Velocidade: "480 Mbps",
      Material: "Nylon trançado",
      Garantia: "1 ano",
    },
    availability: "in stock",
    isActive: true,
  },
  {
    id: 4,
    name: "Carregador de Indução Wireless 15W",
    description: "Base de carregamento sem fio compatível com todos os dispositivos Qi. Design elegante e carregamento eficiente.",
    price: 12999,
    currency: "ZAR",
    image: "/marketing/carregador-wireless.jpg",
    category: "Carregadores",
    features: ["Carregamento 15W", "Compatível Qi", "LED indicador", "Design elegante"],
    specifications: {
      Potência: "15W máximo",
      Compatibilidade: "Qi universal",
      Dimensões: "10x10x1cm",
      Material: "Alumínio premium",
      Garantia: "2 anos",
    },
    availability: "in stock",
    isActive: true,
  },
  {
    id: 5,
    name: "Fone de Ouvido Gaming RGB",
    description: "Headset gamer com iluminação RGB e microfone destacável. Som surround para a melhor experiência gaming.",
    price: 19999,
    currency: "ZAR",
    image: "/marketing/fone-gaming.jpg",
    category: "Áudio",
    features: ["Som surround 7.1", "Microfone destacável", "Iluminação RGB", "Almofadas confortáveis"],
    specifications: {
      Conectividade: "USB + P2",
      Drivers: "50mm",
      Frequência: "20Hz-20kHz",
      Peso: "320g",
      Garantia: "1 ano",
    },
    availability: "in stock",
    isActive: true,
  },
  {
    id: 6,
    name: "Carregador Portátil 20000mAh",
    description: "Power bank de alta capacidade com carregamento rápido e múltiplas portas. Ideal para viagens e uso diário.",
    price: 15999,
    currency: "ZAR",
    image: "/marketing/power-bank.jpg",
    category: "Carregadores",
    features: ["20000mAh", "Carregamento rápido", "3 portas USB", "Display digital"],
    specifications: {
      Capacidade: "20000mAh",
      Portas: "2x USB-A + 1x USB-C",
      Entrada: "USB-C 18W",
      Saída: "22.5W máximo",
      Garantia: "1 ano",
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
