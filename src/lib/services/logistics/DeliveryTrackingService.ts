/**
 * Delivery Tracking Service
 *
 * Handles delivery tracking and status updates
 */

import { query } from '@/lib/database/unified-connection';
import { DeliveryService } from './DeliveryService';
import { CourierProviderService } from './CourierProviderService';
import { createCourierClient } from './CourierProviderClients';
import type {
  DeliveryStatusHistory,
  DeliveryStatus,
  Delivery,
  CourierProvider,
} from '@/types/logistics';

// Map courier provider statuses to our delivery statuses
const statusMapping: Record<string, DeliveryStatus> = {
  'pending': 'pending',
  'confirmed': 'confirmed',
  'scheduled': 'confirmed', // Map scheduled to confirmed
  'picked_up': 'picked_up',
  'pickup': 'picked_up', // Alternative provider status
  'in_transit': 'in_transit',
  'in-transit': 'in_transit', // Alternative provider status
  'out_for_delivery': 'out_for_delivery',
  'out-for-delivery': 'out_for_delivery', // Alternative provider status
  'delivered': 'delivered',
  'failed': 'failed',
  'cancelled': 'cancelled',
  'canceled': 'cancelled', // Alternative provider status
  'returned': 'returned',
};

export class DeliveryTrackingService {
  /**
   * Get tracking history for a delivery
   */
  static async getTrackingHistory(
    deliveryId: string
  ): Promise<DeliveryStatusHistory[]> {
    try {
      const result = await query<DeliveryStatusHistory>(
        'SELECT * FROM delivery_status_history WHERE delivery_id = $1 ORDER BY timestamp DESC',
        [deliveryId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching tracking history:', error);
      throw error;
    }
  }

  /**
   * Add status update to tracking history
   */
  static async addStatusUpdate(
    deliveryId: string,
    status: DeliveryStatus,
    data?: {
      location_lat?: number;
      location_lng?: number;
      location_address?: string;
      notes?: string;
      courier_name?: string;
      courier_phone?: string;
      created_by?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<DeliveryStatusHistory> {
    try {
      const insertSql = `
        INSERT INTO delivery_status_history (
          delivery_id, status, location_lat, location_lng, location_address,
          notes, courier_name, courier_phone, created_by, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
        RETURNING *
      `;

      const result = await query<DeliveryStatusHistory>(insertSql, [
        deliveryId,
        status,
        data?.location_lat || null,
        data?.location_lng || null,
        data?.location_address || null,
        data?.notes || null,
        data?.courier_name || null,
        data?.courier_phone || null,
        data?.created_by || null,
        data?.metadata ? JSON.stringify(data.metadata) : '{}',
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error adding status update:', error);
      throw error;
    }
  }

  /**
   * Poll courier provider API for status updates
   */
  static async pollProviderForStatus(
    deliveryId: string,
    orgId: string
  ): Promise<{ statusUpdated: boolean; newStatus?: DeliveryStatus }> {
    try {
      // Get delivery details
      const delivery = await DeliveryService.getDeliveryById(deliveryId, orgId);
      if (!delivery) {
        throw new Error('Delivery not found');
      }

      if (!delivery.tracking_number || !delivery.courier_provider_id) {
        return { statusUpdated: false };
      }

      // Get courier provider
      const provider = await CourierProviderService.getCourierProviderById(
        delivery.courier_provider_id,
        orgId
      );
      if (!provider) {
        throw new Error('Courier provider not found');
      }

      // Create courier client
      const client = createCourierClient(
        provider,
        provider.api_credentials || {}
      );

      if (!client.supportsTracking()) {
        return { statusUpdated: false };
      }

      // Poll provider API
      const trackingInfo = await client.trackShipment(delivery.tracking_number);

      // Map provider status to our status
      const providerStatus = trackingInfo.status.toLowerCase();
      const mappedStatus = statusMapping[providerStatus] || delivery.status;

      // Check if status has changed
      if (mappedStatus !== delivery.status) {
        // Update delivery status
        await DeliveryService.updateDeliveryStatus(
          deliveryId,
          orgId,
          mappedStatus
        );

        // Add status update to history
        await this.addStatusUpdate(deliveryId, mappedStatus, {
          location_lat: trackingInfo.location?.lat,
          location_lng: trackingInfo.location?.lng,
          location_address: trackingInfo.location?.address,
          notes: `Status updated from provider: ${providerStatus}`,
          metadata: {
            provider_status: providerStatus,
            provider_events: trackingInfo.events,
            estimated_delivery_date: trackingInfo.estimated_delivery_date,
          },
        });

        // Trigger customer notification
        await this.notifyCustomer(delivery, mappedStatus, trackingInfo);

        return { statusUpdated: true, newStatus: mappedStatus };
      }

      // Even if status hasn't changed, update location if available
      if (trackingInfo.location) {
        await this.addStatusUpdate(deliveryId, delivery.status, {
          location_lat: trackingInfo.location.lat,
          location_lng: trackingInfo.location.lng,
          location_address: trackingInfo.location.address,
          notes: 'Location update from provider',
          metadata: {
            provider_status: providerStatus,
            estimated_delivery_date: trackingInfo.estimated_delivery_date,
          },
        });
      }

      return { statusUpdated: false };
    } catch (error) {
      console.error('Error polling provider for status:', error);
      throw error;
    }
  }

  /**
   * Poll all active deliveries for status updates
   */
  static async pollAllActiveDeliveries(orgId: string): Promise<void> {
    try {
      // Get all deliveries with tracking numbers and active statuses
      const result = await query<Delivery>(
        `SELECT * FROM deliveries 
         WHERE org_id = $1 
           AND tracking_number IS NOT NULL 
           AND courier_provider_id IS NOT NULL
           AND status NOT IN ('delivered', 'cancelled', 'failed', 'returned')
         ORDER BY created_at DESC
         LIMIT 100`,
        [orgId]
      );

      // Poll each delivery
      for (const delivery of result.rows) {
        try {
          await this.pollProviderForStatus(delivery.id, orgId);
        } catch (error) {
          console.error(
            `Error polling delivery ${delivery.id}:`,
            error
          );
          // Continue with next delivery
        }
      }
    } catch (error) {
      console.error('Error polling all active deliveries:', error);
      throw error;
    }
  }

  /**
   * Notify customer about status update
   * TODO: Implement actual notification system (email, SMS, push, etc.)
   */
  static async notifyCustomer(
    delivery: Delivery,
    newStatus: DeliveryStatus,
    trackingInfo: any
  ): Promise<void> {
    try {
      // TODO: Implement customer notification
      // This could be:
      // - Email notification
      // - SMS notification
      // - Push notification
      // - Webhook to customer system
      // - Integration with customer portal

      console.log(
        `Notifying customer ${delivery.customer_email} about delivery ${delivery.delivery_number} status: ${newStatus}`
      );

      // Example notification payload
      const notificationPayload = {
        delivery_number: delivery.delivery_number,
        tracking_number: delivery.tracking_number,
        status: newStatus,
        location: trackingInfo.location,
        estimated_delivery_date: trackingInfo.estimated_delivery_date,
      };

      // TODO: Send notification via preferred channel
      // await sendEmail(delivery.customer_email, 'Delivery Status Update', notificationPayload);
      // await sendSMS(delivery.customer_phone, `Your delivery ${delivery.delivery_number} is now ${newStatus}`);
    } catch (error) {
      console.error('Error notifying customer:', error);
      // Don't throw - notification failure shouldn't block status update
    }
  }

  /**
   * Get tracking information for a delivery
   * Combines delivery data with tracking history and provider info
   */
  static async getTrackingInfo(
    deliveryId: string,
    orgId: string
  ): Promise<{
    delivery: Delivery;
    history: DeliveryStatusHistory[];
    provider_tracking?: any;
  }> {
    try {
      const delivery = await DeliveryService.getDeliveryById(deliveryId, orgId);
      if (!delivery) {
        throw new Error('Delivery not found');
      }

      const history = await this.getTrackingHistory(deliveryId);

      // Optionally fetch latest from provider
      let providerTracking = null;
      if (
        delivery.tracking_number &&
        delivery.courier_provider_id &&
        delivery.status !== 'delivered' &&
        delivery.status !== 'cancelled'
      ) {
        try {
          const provider = await CourierProviderService.getCourierProviderById(
            delivery.courier_provider_id,
            orgId
          );
          if (provider) {
            const client = createCourierClient(
              provider,
              provider.api_credentials || {}
            );
            if (client.supportsTracking()) {
              providerTracking = await client.trackShipment(
                delivery.tracking_number
              );
            }
          }
        } catch (error) {
          console.error('Error fetching provider tracking:', error);
          // Continue without provider tracking
        }
      }

      return {
        delivery,
        history,
        provider_tracking: providerTracking,
      };
    } catch (error) {
      console.error('Error getting tracking info:', error);
      throw error;
    }
  }
}

