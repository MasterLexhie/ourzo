"use client";

import { useState } from "react";
import { Bell, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNotifications, useUnreadNotificationCount, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from "@/hooks";
import { useOrganizationStore } from "@/stores/organization.store";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export function NotificationsBell() {
  const { currentOrganization } = useOrganizationStore();
  const workspaceId = currentOrganization?.id;
  const [isOpen, setIsOpen] = useState(false);

  const { data: notificationsData, isLoading, error } = useNotifications(workspaceId ?? "", { limit: 20 });
  const { data: unreadCountData } = useUnreadNotificationCount(workspaceId ?? "");
  const notifications = notificationsData?.notifications ?? [];
  const unreadCount = unreadCountData?.unreadCount ?? 0;
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const handleMarkAsRead = async (notificationId: string) => {
    if (!workspaceId) return;
    await markAsRead.mutateAsync({ workspaceId, notificationId });
  };

  const handleMarkAllAsRead = async () => {
    if (!workspaceId) return;
    await markAllAsRead.mutateAsync(workspaceId);
  };

  if (!workspaceId) return null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-10 w-10 rounded-full"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5" />
        {(unreadCount ?? 0) > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="fixed right-4 top-16 z-50 w-96 bg-background border shadow-lg rounded-lg">
          <Card className="h-full">
            <CardHeader className="flex items-center justify-between p-4 border-b">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <div className="flex items-center gap-2">
                {(unreadCount ?? 0) > 0 && (
                  <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    {unreadCount} unread
                  </Badge>
                )}
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-64 text-red-500">
                  Failed to load notifications
                </div>
              ) : notifications && notifications.length > 0 ? (
                <div className="flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b">
                    <p className="text-sm text-muted-foreground">
                      {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
                    </p>
                    {(unreadCount ?? 0) > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkAllAsRead}
                        disabled={markAllAsRead.isPending}
                      >
                        {markAllAsRead.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-1" />
                        )}
                        Mark all as read
                      </Button>
                    )}
                  </div>
                  <Separator />
                  <ScrollArea className="h-[400px]">
                    <div className="divide-y divide-border">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={cn(
                            "p-4 hover:bg-muted/50 transition-colors",
                            !notification.readAt && "bg-blue-50/50 dark:bg-blue-900/20"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={cn("font-medium", !notification.readAt && "text-foreground")}>
                                  {notification.title}
                                </h4>
                                {!notification.readAt && (
                                  <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">
                                    New
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>{format(new Date(notification.createdAt), "MMM d, yyyy HH:mm")}</span>
                                <Badge variant="outline">{notification.type}</Badge>
                              </div>
                            </div>
                            {!notification.readAt && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-primary"
                                onClick={() => handleMarkAsRead(notification.id)}
                                disabled={markAsRead.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                  <div className="text-center">
                    <h3 className="text-lg font-medium mb-1">No notifications</h3>
                    <p className="text-muted-foreground">You're all caught up!</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}