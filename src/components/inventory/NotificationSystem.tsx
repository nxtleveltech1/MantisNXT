import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  Clock,
  RefreshCw,
  Bell,
  BellOff,
} from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'progress';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'default' | 'outline' | 'destructive';
}

export interface BaseNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: Date;
  duration?: number; // Auto-dismiss after milliseconds (0 = persist)
  actions?: NotificationAction[];
  dismissible?: boolean;
  persistent?: boolean;
  groupId?: string; // For grouping related notifications
  data?: unknown; // Additional data for the notification
}

export interface ProgressNotification extends BaseNotification {
  type: 'progress';
  progress: number; // 0-100
  stage?: string;
  estimatedTime?: number;
  throughput?: number;
}

export type Notification = BaseNotification | ProgressNotification;

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string;
  updateNotification: (id: string, updates: Partial<Notification>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: (groupId?: string) => void;
  clearAll: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  getUnreadCount: () => number;
  getNotificationsByPriority: (priority: NotificationPriority) => Notification[];
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
  maxNotifications?: number;
  defaultDuration?: number;
  enablePersistence?: boolean;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  maxNotifications = 10,
  defaultDuration = 5000,
  enablePersistence = true,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

  // Load persisted notifications on mount
  useEffect(() => {
    if (enablePersistence) {
      try {
        const stored = localStorage.getItem('notifications');
        if (stored) {
          const parsedNotifications = JSON.parse(stored).map((n: unknown) => ({
            ...n,
            timestamp: new Date(n.timestamp),
          }));
          setNotifications(parsedNotifications);
        }

        const storedRead = localStorage.getItem('notifications-read');
        if (storedRead) {
          setReadNotifications(new Set(JSON.parse(storedRead)));
        }
      } catch (error) {
        console.error('Failed to load persisted notifications:', error);
      }
    }
  }, [enablePersistence]);

  // Persist notifications when they change
  useEffect(() => {
    if (enablePersistence) {
      try {
        localStorage.setItem('notifications', JSON.stringify(notifications));
        localStorage.setItem('notifications-read', JSON.stringify([...readNotifications]));
      } catch (error) {
        console.error('Failed to persist notifications:', error);
      }
    }
  }, [notifications, readNotifications, enablePersistence]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setReadNotifications(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const addNotification = useCallback(
    (notificationData: Omit<Notification, 'id' | 'timestamp'>): string => {
      const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const notification: Notification = {
        ...notificationData,
        id,
        timestamp: new Date(),
        duration: notificationData.duration ?? (notificationData.persistent ? 0 : defaultDuration),
        dismissible: notificationData.dismissible ?? true,
      };

      setNotifications(prev => {
        const newNotifications = [notification, ...prev];

        // Remove excess notifications if we exceed the limit
        if (newNotifications.length > maxNotifications) {
          return newNotifications.slice(0, maxNotifications);
        }

        return newNotifications;
      });

      // Auto-dismiss if duration is set
      if (notification.duration && notification.duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, notification.duration);
      }

      return id;
    },
    [defaultDuration, maxNotifications, removeNotification]
  );

  const updateNotification = useCallback((id: string, updates: Partial<Notification>) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, ...updates } : notification
      )
    );
  }, []);

  const clearNotifications = useCallback((groupId?: string) => {
    if (groupId) {
      setNotifications(prev => prev.filter(n => n.groupId !== groupId));
    } else {
      setNotifications([]);
      setReadNotifications(new Set());
    }
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setReadNotifications(new Set());
  }, []);

  const markAsRead = useCallback((id: string) => {
    setReadNotifications(prev => new Set([...prev, id]));
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadNotifications(new Set(notifications.map(n => n.id)));
  }, [notifications]);

  const getUnreadCount = useCallback(() => {
    return notifications.filter(n => !readNotifications.has(n.id)).length;
  }, [notifications, readNotifications]);

  const getNotificationsByPriority = useCallback(
    (priority: NotificationPriority) => {
      return notifications.filter(n => n.priority === priority);
    },
    [notifications]
  );

  const contextValue: NotificationContextType = {
    notifications,
    addNotification,
    updateNotification,
    removeNotification,
    clearNotifications,
    clearAll,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    getNotificationsByPriority,
  };

  return (
    <NotificationContext.Provider value={contextValue}>{children}</NotificationContext.Provider>
  );
};

// Notification Display Component
interface NotificationItemProps {
  notification: Notification;
  onDismiss?: (id: string) => void;
  onAction?: (action: NotificationAction) => void;
  compact?: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onDismiss,
  onAction,
  compact = false,
}) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />;
      case 'progress':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'progress':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const getPriorityBadge = () => {
    if (notification.priority === 'low') return null;

    const colors = {
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };

    return (
      <Badge className={`text-xs ${colors[notification.priority as keyof typeof colors]}`}>
        {notification.priority}
      </Badge>
    );
  };

  return (
    <Card className={`${getBackgroundColor()} transition-all duration-200 hover:shadow-md`}>
      <CardContent className={`p-${compact ? '3' : '4'}`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0">{getIcon()}</div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <h4 className={`font-medium ${compact ? 'text-sm' : ''}`}>
                    {notification.title}
                  </h4>
                  {getPriorityBadge()}
                </div>
                <p className={`text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
                  {notification.message}
                </p>

                {/* Progress notification specific content */}
                {notification.type === 'progress' && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>{(notification as ProgressNotification).stage || 'Processing...'}</span>
                      <span>{(notification as ProgressNotification).progress}%</span>
                    </div>
                    <Progress
                      value={(notification as ProgressNotification).progress}
                      className="h-2"
                    />
                    {(notification as ProgressNotification).estimatedTime && (
                      <div className="text-muted-foreground flex items-center gap-2 text-xs">
                        <Clock className="h-3 w-3" />
                        <span>
                          {Math.round((notification as ProgressNotification).estimatedTime! / 1000)}
                          s remaining
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {notification.dismissible && onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismiss(notification.id)}
                  className="h-6 w-6 flex-shrink-0 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Actions */}
            {notification.actions && notification.actions.length > 0 && (
              <div className="mt-3 flex gap-2">
                {notification.actions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant || 'outline'}
                    size="sm"
                    onClick={() => {
                      action.action();
                      onAction?.(action);
                    }}
                    className="text-xs"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}

            {!compact && (
              <div className="text-muted-foreground mt-2 flex items-center justify-between text-xs">
                <span>{notification.timestamp.toLocaleTimeString()}</span>
                {notification.groupId && (
                  <Badge variant="outline" className="text-xs">
                    {notification.groupId}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Notification List Component
interface NotificationListProps {
  notifications?: Notification[];
  compact?: boolean;
  maxVisible?: number;
  onDismiss?: (id: string) => void;
  onClearAll?: () => void;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications: propNotifications,
  compact = false,
  maxVisible = 5,
  onDismiss,
  onClearAll,
}) => {
  const { notifications: contextNotifications, removeNotification, clearAll } = useNotifications();
  const notifications = propNotifications || contextNotifications;

  const handleDismiss = onDismiss || removeNotification;
  const handleClearAll = onClearAll || clearAll;

  const visibleNotifications = notifications.slice(0, maxVisible);
  const hasMore = notifications.length > maxVisible;

  if (notifications.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        <BellOff className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p>No notifications</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <Bell className="h-4 w-4" />
          Notifications ({notifications.length})
        </h3>
        {notifications.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearAll}>
            Clear All
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {visibleNotifications.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onDismiss={handleDismiss}
            compact={compact}
          />
        ))}
      </div>

      {hasMore && (
        <div className="text-center">
          <Button variant="ghost" size="sm">
            Show {notifications.length - maxVisible} more
          </Button>
        </div>
      )}
    </div>
  );
};

// Notification Hook Helpers
export const useNotificationHelpers = () => {
  const { addNotification, updateNotification } = useNotifications();

  const showSuccess = useCallback(
    (title: string, message: string, options?: Partial<Notification>) => {
      return addNotification({
        type: 'success',
        priority: 'medium',
        title,
        message,
        ...options,
      });
    },
    [addNotification]
  );

  const showError = useCallback(
    (title: string, message: string, options?: Partial<Notification>) => {
      return addNotification({
        type: 'error',
        priority: 'high',
        title,
        message,
        persistent: true,
        ...options,
      });
    },
    [addNotification]
  );

  const showWarning = useCallback(
    (title: string, message: string, options?: Partial<Notification>) => {
      return addNotification({
        type: 'warning',
        priority: 'medium',
        title,
        message,
        ...options,
      });
    },
    [addNotification]
  );

  const showInfo = useCallback(
    (title: string, message: string, options?: Partial<Notification>) => {
      return addNotification({
        type: 'info',
        priority: 'low',
        title,
        message,
        ...options,
      });
    },
    [addNotification]
  );

  const showProgress = useCallback(
    (
      title: string,
      message: string,
      progress: number = 0,
      options?: Partial<ProgressNotification>
    ) => {
      return addNotification({
        type: 'progress',
        priority: 'medium',
        title,
        message,
        progress,
        persistent: true,
        dismissible: false,
        ...options,
      } as ProgressNotification);
    },
    [addNotification]
  );

  const updateProgress = useCallback(
    (id: string, progress: number, stage?: string, estimatedTime?: number) => {
      updateNotification(id, {
        progress,
        stage,
        estimatedTime,
      } as Partial<ProgressNotification>);
    },
    [updateNotification]
  );

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showProgress,
    updateProgress,
  };
};

export default NotificationItem;
