import React, { createContext, useContext, useState } from 'react';

export type Notification = {
  id: string;
  title: string;
  message?: string;
  read?: boolean;
  createdAt: number;
  type?: 'info' | 'success' | 'warning' | 'error';
};

type NotificationContextValue = {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Partial<Notification>, 'id' | 'createdAt' | 'read'> & { title: string }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (n: Omit<Partial<Notification>, 'id' | 'createdAt' | 'read'> & { title: string }) => {
    const notification: Notification = {
      id: Math.random().toString(36).slice(2, 9),
      title: n.title,
      message: n.message,
      type: n.type || 'info',
      read: false,
      createdAt: Date.now(),
    };
    setNotifications(prev => [notification, ...prev]);
  };

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const remove = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markRead, markAllRead, remove }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider');
  return ctx;
};

export default NotificationContext;
