import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";

interface NotificationSchema {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  readAt?: Date | null;
  createdAt: Date;
  data?: Record<string, any>;
}

const sendNotification = async (
  ctx: any,
  userId: string,
  title: string,
  message: string,
  type: string,
  data?: Record<string, any>
) => {
  return await ctx.context.adapter.create({
    model: "notification",
    data: {
      userId,
      title,
      message,
      type,
      data: data ? JSON.stringify(data) : null,
      readAt: null,
    },
  });
};

export const notificationPlugin = () => {
  return {
    id: "basic-notifications",
    schema: {
      notification: {
        fields: {
          userId: {
            type: "string",
            required: true,
            references: {
              model: "user",
              field: "id",
              onDelete: "cascade",
            },
          },
          title: {
            type: "string",
            required: true,
          },
          message: {
            type: "string",
            required: true,
          },
          type: {
            type: "string",
            required: true,
          },
          readAt: {
            type: "date",
            required: false,
          },
          data: {
            type: "string",
            required: false,
          },
        },
      },
    },
    endpoints: {
      createNotification: createAuthEndpoint(
        "/notifications/create",
        {
          method: "POST",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const { title, message, type, data } = ctx.body as {
            title: string;
            message: string;
            type: string;
            data?: Record<string, any>;
          };

          const session = ctx.context.session;
          if (!session?.session?.userId) {
            throw new Error("Unauthorized");
          }

          const notification = await ctx.context.adapter.create({
            model: "notification",
            data: {
              userId: session.session.userId,
              title,
              message,
              type,
              data: data ? JSON.stringify(data) : null,
              readAt: null,
            },
          });

          return ctx.json({
            notification: {
              ...notification,
              data: notification.data ? JSON.parse(notification.data) : null,
            },
          });
        }
      ),
      listNotifications: createAuthEndpoint(
        "/notifications/list",
        {
          method: "GET",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const session = ctx.context.session;
          if (!session?.session?.userId) {
            throw new Error("Unauthorized");
          }

          const limit = parseInt(ctx.query?.limit as string) || 20;
          const offset = parseInt(ctx.query?.offset as string) || 0;
          const unreadOnly = ctx.query?.unreadOnly === "true";

          const where: any = { userId: session.session.userId };
          if (unreadOnly) {
            where.readAt = null;
          }

          const notifications = await ctx.context.adapter.findMany({
            model: "notification",
            where,
            limit,
            offset,
            sortBy: { field: "createdAt", direction: "desc" },
          });

          const total = await ctx.context.adapter.count({
            model: "notification",
            where,
          });

          return ctx.json({
            notifications: notifications.map((n: any) => ({
              ...n,
              data: n.data ? JSON.parse(n.data) : null,
            })),
            pagination: {
              limit,
              offset,
              total,
              hasMore: offset + limit < total,
            },
          });
        }
      ),
      markAsRead: createAuthEndpoint(
        "/notifications/mark-read",
        {
          method: "POST",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const session = ctx.context.session;
          if (!session?.session?.userId) {
            throw new Error("Unauthorized");
          }

          const { notificationIds } = ctx.body as { notificationIds: string[] };

          if (
            !notificationIds ||
            !Array.isArray(notificationIds) ||
            notificationIds.length === 0
          ) {
            throw new Error("Invalid notification IDs");
          }

          await ctx.context.adapter.updateMany({
            model: "notification",
            where: [
              { field: "userId", value: session.session.userId },
              { field: "id", operator: "in", value: notificationIds },
            ],
            update: {
              readAt: new Date(),
            },
          });

          return ctx.json({ success: true });
        }
      ),
      deleteNotification: createAuthEndpoint(
        "/notifications/delete",
        {
          method: "POST",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const session = ctx.context.session;
          if (!session?.session?.userId) {
            throw new Error("Unauthorized");
          }

          const { notificationId } = ctx.body as { notificationId: string };

          if (!notificationId) {
            throw new Error("Notification ID is required");
          }

          await ctx.context.adapter.delete({
            model: "notification",
            where: [
              { field: "userId", value: session.session.userId },
              { field: "id", value: notificationId },
            ],
          });

          return ctx.json({ success: true });
        }
      ),
      getUnreadCount: createAuthEndpoint(
        "/notifications/unread-count",
        {
          method: "GET",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const session = ctx.context.session;
          if (!session?.session?.userId) {
            throw new Error("Unauthorized");
          }

          const count = await ctx.context.adapter.count({
            model: "notification",
            where: [
              { field: "userId", value: session.session.userId },
              { field: "readAt", value: null },
            ],
          });

          return ctx.json({ count });
        }
      ),
    },
    rateLimit: [
      {
        pathMatcher: (path) => path === "/notifications/create",
        max: 30,
        window: 60,
      },
      {
        pathMatcher: (path) => path === "/notifications/list",
        max: 60,
        window: 60,
      },
    ],
  } satisfies BetterAuthPlugin;
};
