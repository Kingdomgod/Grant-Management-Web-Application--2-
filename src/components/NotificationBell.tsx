import React from 'react';
import { Bell, X, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useNotifications } from '../contexts/NotificationContext';

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markRead, markAllRead, remove } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-white hover:bg-white/10 border-2 border-white/30">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-600 text-white text-xs">{unreadCount}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => markAllRead()}>Mark all read</Button>
          </div>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {notifications.length === 0 && (
            <div className="text-sm text-muted-foreground">No notifications</div>
          )}
          {notifications.map(n => (
            <div key={n.id} className={`p-2 rounded border ${n.read ? 'bg-muted' : 'bg-card'} flex items-start justify-between`}> 
              <div className="pr-2">
                <div className="text-sm font-medium">{n.title}</div>
                {n.message && <div className="text-xs text-muted-foreground">{n.message}</div>}
                <div className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-1">
                  {!n.read && <Button size="icon" variant="ghost" onClick={() => markRead(n.id)}><Check className="h-3 w-3" /></Button>}
                  <Button size="icon" variant="ghost" onClick={() => remove(n.id)}><X className="h-3 w-3" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
