# Better Auth Notification Plugin

A comprehensive notification system plugin for Better Auth that provides in-app notifications with customizable hooks and real-time updates.

## Features

- **Server-side endpoints** for creating, listing, marking as read, and deleting notifications
- **Automatic notifications** on auth events (sign up, sign in, password reset)
- **Client-side reactive state** with nanostores for real-time UI updates
- **Unread count with auto-refresh** (30-second intervals when subscribed)
- **Pagination support** for notification lists
- **Rate limiting** to prevent abuse
- **TypeScript support** with full type inference

## Installation

```bash
bun install better-auth nanostores
```

## Usage

### Server Setup

```typescript
import { betterAuth } from "better-auth";
import { notificationPlugin } from "./notification-plugin";

export const auth = betterAuth({
  plugins: [
    notificationPlugin({
      enableAuthHooks: true,
      onSignUpMessage: (user) => ({
        title: "Welcome!",
        message: `Welcome to our platform, ${user.name || user.email}!`,
        type: "welcome",
      }),
    }),
  ],
});
```

### Client Setup

```typescript
import { createAuthClient } from "better-auth/client";
import { notificationPluginClient } from "./notification-plugin-client";

const authClient = createAuthClient({
  plugins: [notificationPluginClient()],
});

// Use reactive atoms
const unreadCount = authClient.notifications.unreadCount;

// Call actions
await authClient.notifications.listNotifications({ unreadOnly: true });
await authClient.notifications.markAsRead(["notification-id"]);
```

## API Reference

### Server Endpoints

- `POST /notifications/create` - Create a new notification
- `GET /notifications/list` - List notifications with pagination
- `POST /notifications/mark-read` - Mark notifications as read
- `POST /notifications/delete` - Delete a notification
- `GET /notifications/unread-count` - Get unread notification count

### Client Actions

- `createNotification(data)` - Create a new notification
- `listNotifications(filter)` - List notifications with optional filters
- `markAsRead(notificationIds)` - Mark notifications as read
- `deleteNotification(notificationId)` - Delete a notification
- `getUnreadCount()` - Get unread count

### Atoms

- `notifications` - Reactive store for notification list and pagination
- `unreadCount` - Reactive store for unread count with auto-refresh

## Files

- `notification-plugin.ts` - Server plugin implementation
- `notification-plugin-client.ts` - Client plugin implementation
- `example-server.ts` - Example server setup
- `example-client.tsx` - Example React client usage
