import { Bell } from "lucide-react";

// Sidebar entry (AppShell, above Logout) that opens the notifications panel.
export default function NotificationBell({ unreadCount, collapsed, onClick, onMouseMove }) {
  const badge = unreadCount > 99 ? "99+" : unreadCount;
  return (
    <button
      type="button"
      className="sidebar-link notif-bell"
      onClick={onClick}
      onMouseMove={onMouseMove}
      aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
      title={collapsed ? "Notifications" : undefined}
    >
      <span className="notif-bell__icon">
        <Bell size={18} className="sidebar-link-icon" />
        {unreadCount > 0 && collapsed && <span className="notif-bell__dot" aria-hidden="true" />}
      </span>
      <span>Notifications</span>
      {unreadCount > 0 && !collapsed && <span className="notif-bell__badge">{badge}</span>}
    </button>
  );
}
