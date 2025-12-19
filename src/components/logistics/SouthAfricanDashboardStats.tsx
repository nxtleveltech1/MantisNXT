'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, TrendingUp } from 'lucide-react';

export function SouthAfricanDashboardStats() {
  const provinceStats = [
    {
      province: 'Gauteng',
      activeCouriers: 12,
      totalDeliveries: 156,
      avgDeliveryTime: '28 min',
      successRate: 94.2,
      cities: ['Johannesburg', 'Pretoria', 'Midrand'],
    },
    {
      province: 'Western Cape',
      activeCouriers: 8,
      totalDeliveries: 98,
      avgDeliveryTime: '32 min',
      successRate: 92.8,
      cities: ['Cape Town', 'Stellenbosch', 'Paarl'],
    },
    {
      province: 'KwaZulu-Natal',
      activeCouriers: 6,
      totalDeliveries: 67,
      avgDeliveryTime: '35 min',
      successRate: 91.5,
      cities: ['Durban', 'Pietermaritzburg', 'Newcastle'],
    },
  ];

  const topPerformingAreas = [
    { area: 'Sandton', deliveries: 45, efficiency: 96 },
    { area: 'V&A Waterfront', deliveries: 38, efficiency: 94 },
    { area: 'Umhlanga', deliveries: 29, efficiency: 93 },
    { area: 'Menlyn', deliveries: 31, efficiency: 92 },
  ];

  return (
    <div className="space-y-6">
      {/* Province Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            South African Operations Overview
          </CardTitle>
          <CardDescription>Performance across major provinces</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {provinceStats.map((province) => (
              <div key={province.province} className="p-4 border rounded-lg">
                <h3 className="font-semibold text-lg mb-2">{province.province}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Active Couriers:</span>
                    <Badge variant="outline">{province.activeCouriers}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Deliveries Today:</span>
                    <span className="font-medium">{province.totalDeliveries}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg. Time:</span>
                    <span className="font-medium">{province.avgDeliveryTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Success Rate:</span>
                    <span className="font-medium text-green-600">{province.successRate}%</span>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-gray-600">Coverage:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {province.cities.map((city) => (
                      <Badge key={city} variant="secondary" className="text-xs">
                        {city}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Areas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Performing Areas
          </CardTitle>
          <CardDescription>Highest efficiency delivery zones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topPerformingAreas.map((area, index) => (
              <div key={area.area} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{area.area}</p>
                    <p className="text-sm text-gray-600">{area.deliveries} deliveries today</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-green-100 text-green-800">{area.efficiency}% efficient</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Language Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Multi-Language Support
          </CardTitle>
          <CardDescription>Courier language capabilities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { language: 'English', couriers: 15 },
              { language: 'Afrikaans', couriers: 8 },
              { language: 'Zulu', couriers: 6 },
              { language: 'Xhosa', couriers: 4 },
              { language: 'Sotho', couriers: 3 },
              { language: 'Tswana', couriers: 2 },
              { language: 'Arabic', couriers: 1 },
              { language: 'French', couriers: 1 },
            ].map((lang) => (
              <div key={lang.language} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="font-semibold">{lang.couriers}</div>
                <div className="text-sm text-gray-600">{lang.language}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}





