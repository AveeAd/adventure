import { Link } from '@tanstack/react-router';
import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authFetch, authPatch, authPost } from '../lib/auth/auth-fetch';
import { formatDateTime } from '../lib/format';

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    const res = await authFetch('/notifications?pageSize=10');
    if (!res.ok) return;
    const body: { data: NotificationItem[]; unreadCount: number } = await res.json();
    setItems(body.data);
    setUnreadCount(body.unreadCount);
    setLoaded(true);
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, []);

  async function handleOpen() {
    setOpen((wasOpen) => !wasOpen);
    if (!loaded) {
      await refresh();
    }
  }

  async function handleItemClick(item: NotificationItem) {
    if (!item.isRead) {
      setItems((current) => current.map((i) => (i.id === item.id ? { ...i, isRead: true } : i)));
      setUnreadCount((count) => Math.max(0, count - 1));
      await authPatch(`/notifications/${item.id}/read`);
    }
    setOpen(false);
  }

  async function markAllRead() {
    setItems((current) => current.map((i) => ({ ...i, isRead: true })));
    setUnreadCount(0);
    await authPost('/notifications/read-all');
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label={t('notifications.bellLabel')}
        className="relative inline-flex items-center justify-center rounded-lg p-2 text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-600 px-1 text-[10px] font-medium text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="glass-3 absolute right-0 z-20 mt-2 w-80 rounded-lg border border-[color:var(--glass-border)] backdrop-blur-lg">
          <div className="flex items-center justify-between border-b border-[color:var(--glass-border)] px-3 py-2">
            <span className="text-sm font-medium text-stone-900 dark:text-stone-50">{t('notifications.heading')}</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-primary-700 hover:underline dark:text-primary-400"
              >
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-4 text-sm text-stone-500 dark:text-stone-400">{t('notifications.empty')}</li>
            ) : (
              items.map((item) => (
                <li key={item.id} className="border-b border-stone-100 last:border-0 dark:border-stone-800">
                  <Link
                    to={item.linkUrl ?? '#'}
                    onClick={() => handleItemClick(item)}
                    className={`block px-3 py-2.5 text-sm hover:bg-stone-50 dark:hover:bg-stone-800 ${
                      item.isRead ? 'text-stone-500 dark:text-stone-400' : 'font-medium text-stone-900 dark:text-stone-50'
                    }`}
                  >
                    {item.message}
                    <div className="mt-0.5 text-xs text-stone-400 dark:text-stone-500">
                      {formatDateTime(item.createdAt)}
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
