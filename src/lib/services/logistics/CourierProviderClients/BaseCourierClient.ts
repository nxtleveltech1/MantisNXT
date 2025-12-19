/**
 * Base Courier Client
 *
 * Abstract base class for all courier provider API clients
 */

import type {
  Delivery,
  DeliveryCostQuote,
  DeliveryServiceTier,
  Address,
} from '@/types/logistics';

export interface CourierQuoteRequest {
  pickup_address: Address;
  delivery_address: Address;
  weight_kg: number;
  dimensions?: {
    length_cm: number;
    width_cm: number;
    height_cm: number;
  };
  service_tier?: DeliveryServiceTier;
  declared_value?: number;
  requires_signature?: boolean;
  is_fragile?: boolean;
  is_insured?: boolean;
}

export interface CourierQuoteResponse {
  cost: number;
  currency: string;
  estimated_delivery_days?: number;
  estimated_delivery_date?: string;
  base_cost?: number;
  fuel_surcharge?: number;
  insurance_cost?: number;
  other_fees?: number;
  tracking_number?: string;
  quote_id?: string;
  expires_at?: string;
}

export interface CourierShipmentResponse {
  tracking_number: string;
  label_url?: string;
  shipment_id?: string;
  cost?: number;
}

export interface CourierTrackingResponse {
  status: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  estimated_delivery_date?: string;
  events?: Array<{
    timestamp: string;
    status: string;
    location?: string;
    notes?: string;
  }>;
}

/**
 * Abstract base class for courier provider clients
 */
export abstract class BaseCourierClient {
  protected providerId: string;
  protected providerCode: string;
  protected apiCredentials: Record<string, any>;
  protected apiEndpoint?: string;

  constructor(
    providerId: string,
    providerCode: string,
    apiCredentials: Record<string, any>,
    apiEndpoint?: string
  ) {
    this.providerId = providerId;
    this.providerCode = providerCode;
    this.apiCredentials = apiCredentials;
    this.apiEndpoint = apiEndpoint;
  }

  /**
   * Get a cost quote for a delivery
   */
  abstract getQuote(request: CourierQuoteRequest): Promise<CourierQuoteResponse>;

  /**
   * Create a shipment/booking with the courier
   */
  abstract createShipment(delivery: Delivery): Promise<CourierShipmentResponse>;

  /**
   * Track a shipment by tracking number
   */
  abstract trackShipment(trackingNumber: string): Promise<CourierTrackingResponse>;

  /**
   * Cancel a shipment
   */
  abstract cancelShipment(trackingNumber: string): Promise<boolean>;

  /**
   * Validate API credentials
   */
  abstract validateCredentials(): Promise<boolean>;

  /**
   * Get provider name
   */
  abstract getProviderName(): string;

  /**
   * Check if provider supports a specific feature
   */
  supportsTracking(): boolean {
    return true; // Default implementation
  }

  supportsQuotes(): boolean {
    return true; // Default implementation
  }

  /**
   * Helper method to calculate distance between two addresses
   * This is a simplified implementation - in production, use a geocoding service
   */
  protected calculateDistance(
    pickup: Address,
    delivery: Address
  ): number | null {
    if (!pickup.lat || !pickup.lng || !delivery.lat || !delivery.lng) {
      return null;
    }

    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(delivery.lat! - pickup.lat!);
    const dLon = this.toRad(delivery.lng! - pickup.lng!);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(pickup.lat!)) *
        Math.cos(this.toRad(delivery.lat!)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}



