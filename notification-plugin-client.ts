import type { BetterAuthClientPlugin } from "better-auth/client";
import type { BetterFetchOption } from "@better-fetch/fetch";
import { atom } from "nanostores";
import type { notificationPlugin } from "./notification-plugin";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  readAt?: Date | null;
  createdAt: Date;
  data?: Record<string, any>;
}

export interface NotificationFilter {
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}

export const notificationPluginClient = () => {
  return {
    id: "notifications",
    $InferServerPlugin: {} as ReturnType<typeof notificationPlugin>,
    getActions: ($fetch) => {
      return {
        createNotification: async (
          data: {
            title: string;
            message: string;
            type: string;
            data?: Record<string, any>;
          },
          fetchOptions?: BetterFetchOption
        ) => {
          return $fetch("/notifications/create", {
            method: "POST",
            body: data,
            ...fetchOptions,
          });
        },
        listNotifications: async (
          filter?: NotificationFilter,
          fetchOptions?: BetterFetchOption
        ) => {
          const params = new URLSearchParams();
          if (filter?.unreadOnly !== undefined) {
            params.set("unreadOnly", filter.unreadOnly.toString());
          }
          if (filter?.limit !== undefined) {
            params.set("limit", filter.limit.toString());
          }
          if (filter?.offset !== undefined) {
            params.set("offset", filter.offset.toString());
          }

          return $fetch(`/notifications/list?${params.toString()}`, {
            method: "GET",
            ...fetchOptions,
          });
        },
        markAsRead: async (
          notificationIds: string[],
          fetchOptions?: BetterFetchOption
        ) => {
          return $fetch("/notifications/mark-read", {
            method: "POST",
            body: { notificationIds },
            ...fetchOptions,
          });
        },
        deleteNotification: async (
          notificationId: string,
          fetchOptions?: BetterFetchOption
        ) => {
          return $fetch("/notifications/delete", {
            method: "POST",
            body: { notificationId },
            ...fetchOptions,
          });
        },
        getUnreadCount: async (fetchOptions?: BetterFetchOption) => {
          return $fetch("/notifications/unread-count", {
            method: "GET",
            ...fetchOptions,
          });
        },
      };
    },
    getAtoms: ($fetch) => {
      const notificationsAtom = atom<{
        notifications: Notification[];
        pagination: {
          limit: number;
          offset: number;
          total: number;
          hasMore: boolean;
        };
        loading: boolean;
        error: Error | null;
      }>({
        notifications: [],
        pagination: {
          limit: 20,
          offset: 0,
          total: 0,
          hasMore: false,
        },
        loading: false,
        error: null,
      });

      const unreadCountAtom = atom<number>(0);

      // Auto-refresh unread count
      let unreadCountInterval: NodeJS.Timeout | null = null;
      
      const startPolling = () => {
        if (unreadCountInterval) return;
        
        const refreshUnreadCount = async () => {
          try {
            const response = await $fetch("/notifications/unread-count", {
              method: "GET",
            });
            if (response.data && typeof response.data === 'object' && 'count' in response.data) {
              unreadCountAtom.set(Number(response.data.count));
            }
          } catch (error) {
            console.error("Failed to fetch unread count:", error);
          }
        };

        refreshUnreadCount();
        unreadCountInterval = setInterval(refreshUnreadCount, 30000);
      };

      // Start polling when atom is first subscribed
      const originalSubscribe = unreadCountAtom.subscribe.bind(unreadCountAtom);
      let subscriberCount = 0;
      
      unreadCountAtom.subscribe = (callback: any) => {
        subscriberCount++;
        if (subscriberCount === 1) {
          startPolling();
        }
        
        const unsubscribe = originalSubscribe(callback);
        return () => {
          subscriberCount--;
          if (subscriberCount === 0 && unreadCountInterval) {
            clearInterval(unreadCountInterval);
            unreadCountInterval = null;
          }
          unsubscribe();
        };
      };

      return {
        notifications: notificationsAtom,
        unreadCount: unreadCountAtom,
      };
    },
  } satisfies BetterAuthClientPlugin;
};