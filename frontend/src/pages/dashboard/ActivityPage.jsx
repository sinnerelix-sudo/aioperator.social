import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { activitiesApi } from '../../lib/api';
import { Activity as ActivityIcon } from 'lucide-react';

export default function ActivityPage() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await activitiesApi.list(50);
        setItems(data.activities);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div data-testid="activity-page">
      <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight text-ink-900">
        {t('dashboard.activity.title')}
      </h1>
      <p className="text-sm text-ink-500 mt-1">{t('dashboard.activity.subtitle')}</p>

      <div className="mt-6 bg-white border border-ink-200 rounded-xl">
        {loading ? (
          <div className="p-6 text-sm text-ink-500">{t('common.loading')}</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-brand-gradient-soft flex items-center justify-center mb-3">
              <ActivityIcon className="h-5 w-5 text-brand-600" />
            </div>
            <p className="text-sm text-ink-500">{t('dashboard.overview.noActivity')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-ink-200">
            {items.map((a) => (
              <li key={a.id} className="px-5 py-3.5 flex items-start justify-between gap-4 text-sm">
                <span className="text-ink-700">{a.message}</span>
                <span className="text-xs text-ink-500 shrink-0">
                  {new Date(a.createdAt).toLocaleString(i18n.language === 'tr' ? 'tr-TR' : 'az-AZ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
