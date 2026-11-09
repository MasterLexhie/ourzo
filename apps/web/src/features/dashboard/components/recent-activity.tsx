import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import type { AuditLog } from "@/types/audit.types"
import type { Notification } from "@/types/notification.types"

interface RecentActivityProps {
  /** Owners/Admins see the workspace audit trail; Members see their notifications. */
  mode: "audit" | "notifications"
  isLoading: boolean
  auditLogs?: AuditLog[]
  notifications?: Notification[]
}

interface ActivityItem {
  id: string
  title: string
  detail?: string
  createdAt: string
}

function describeAction(action: string): string {
  const [resource, verb] = action.split(".")
  const readable = (verb ?? "").replace(/_/g, " ")
  return `${resource.charAt(0).toUpperCase()}${resource.slice(1).replace(/_/g, " ")} ${readable}`.trim()
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function RecentActivity({ mode, isLoading, auditLogs, notifications }: RecentActivityProps) {
  const items: ActivityItem[] =
    mode === "audit"
      ? (auditLogs ?? []).map((log) => ({
          id: log.id,
          title: describeAction(log.action),
          detail: log.actor ? `by ${log.actor.firstName} ${log.actor.lastName}` : undefined,
          createdAt: log.createdAt,
        }))
      : (notifications ?? []).map((n) => ({
          id: n.id,
          title: n.title,
          detail: n.message,
          createdAt: n.createdAt,
        }))

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Spinner />
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No recent activity. Create your first project to get started!
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="py-2">
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                {item.detail && <p className="text-sm text-muted-foreground break-words">{item.detail}</p>}
              </div>
              <time className="shrink-0 text-xs text-muted-foreground" dateTime={item.createdAt}>
                {formatWhen(item.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
