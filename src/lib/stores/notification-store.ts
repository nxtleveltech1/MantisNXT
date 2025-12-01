import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Notification, NotificationStore } from '@/lib/types/inventory';

export const useNotificationStore = create<NotificationStore>()(
  devtools(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        const newNotification: Notification = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          read: false,
          ...notification,
        };

        set(state => ({
          notifications: [newNotification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));

        // Auto-remove info notifications after 5 seconds
        if (notification.type === 'info') {
          setTimeout(() => {
            get().removeNotification(newNotification.id);
          }, 5000);
        }
      },

      markAsRead: (id: string) => {
        set(state => {
          const notification = state.notifications.find((n: Notification) => n.id === id);
          if (!notification || notification.read) return state;

          return {
            notifications: state.notifications.map((n: Notification) =>
              n.id === id ? { ...n, read: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
          };
        });
      },

      markAllAsRead: () => {
        set(state => ({
          notifications: state.notifications.map((n: Notification) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      removeNotification: (id: string) => {
        set(state => {
          const notification = state.notifications.find((n: Notification) => n.id === id);
          const wasUnread = notification && !notification.read;

          return {
            notifications: state.notifications.filter((n: Notification) => n.id !== id),
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
          };
        });
      },

      clearAll: () => {
        set({
          notifications: [],
          unreadCount: 0,
        });
      },
    }),
    {
      name: 'notification-store',
    }
  )
);
