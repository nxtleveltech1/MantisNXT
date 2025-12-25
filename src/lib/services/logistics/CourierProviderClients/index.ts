// UPDATE: [2025-12-25] Added ShiplogicClient export and factory registration

/**
 * Courier Provider Clients
 *
 * Export all courier provider client implementations
 */

export { BaseCourierClient } from './BaseCourierClient';
export type {
  CourierQuoteRequest,
  CourierQuoteResponse,
  CourierShipmentResponse,
  CourierTrackingResponse,
} from './BaseCourierClient';

export { PostNetClient } from './PostNetClient';
export { FastWayClient } from './FastWayClient';
export { CourierGuyClient } from './CourierGuyClient';
export { DHLClient } from './DHLClient';
export { ShiplogicClient } from './ShiplogicClient';
export type {
  ShiplogicAddress,
  ShiplogicContact,
  ShiplogicParcel,
  ShiplogicRateRequest,
  ShiplogicRate,
  ShiplogicRateResponse,
} from './ShiplogicClient';

/**
 * Factory function to create courier client instance
 */
import { PostNetClient } from './PostNetClient';
import { FastWayClient } from './FastWayClient';
import { CourierGuyClient } from './CourierGuyClient';
import { DHLClient } from './DHLClient';
import { ShiplogicClient } from './ShiplogicClient';
import type { BaseCourierClient } from './BaseCourierClient';
import type { CourierProvider } from '@/types/logistics';

export function createCourierClient(
  provider: CourierProvider,
  apiCredentials: Record<string, any>
): BaseCourierClient {
  switch (provider.code.toLowerCase()) {
    case 'postnet':
      return new PostNetClient(provider.id, provider.code, apiCredentials, provider.api_endpoint);
    case 'fastway':
      return new FastWayClient(provider.id, provider.code, apiCredentials, provider.api_endpoint);
    case 'courierguy':
      // CourierGuy now uses Shiplogic API
      return new ShiplogicClient(provider.id, provider.code, apiCredentials, provider.api_endpoint);
    case 'shiplogic':
      return new ShiplogicClient(provider.id, provider.code, apiCredentials, provider.api_endpoint);
    case 'dhl':
      return new DHLClient(provider.id, provider.code, apiCredentials, provider.api_endpoint);
    default:
      // Default to Shiplogic for unknown South African couriers
      if (provider.api_endpoint?.includes('shiplogic')) {
        return new ShiplogicClient(provider.id, provider.code, apiCredentials, provider.api_endpoint);
      }
      throw new Error(`Unsupported courier provider: ${provider.code}`);
  }
}




