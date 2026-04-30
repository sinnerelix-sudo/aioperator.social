import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { botsApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

export default function CreateBotPage() {
  const { t } = useTranslation();
  const { lng = 'az' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const styles = t('dashboard.createBot.salesStyles', { returnObjects: true });
  const [form, setForm] = useState({
    name: '',
    niche: '',
    salesStyle: 'friendly',
    instructions: '',
    discountRule: '',
    handoffRule: '',
    instagramHandle: '',
    whatsappNumber: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) {
      toast.error(t('auth.errors.required'));
      return;
    }
    setSubmitting(true);
    try {
      await botsApi.create(form);
      toast.success(t('dashboard.createBot.created'));
      navigate(`/${lng}/dashboard/bots`);
    } catch (err) {
      const code = err?.response?.data?.error;
      if (code === 'bot_limit_reached') toast.error(t('dashboard.bots.limitReached'));
      else toast.error(err?.response?.data?.message || t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="create-bot-page">
      <div>
        <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight text-ink-900">
          {t('dashboard.createBot.title')}
        </h1>
        <p className="text-sm text-ink-500 mt-1">{t('dashboard.createBot.subtitle')}</p>
      </div>

      <form onSubmit={onSubmit} className="mt-6 bg-white border border-ink-200 rounded-xl p-5 sm:p-7 max-w-2xl space-y-4" data-testid="create-bot-form">
        <div>
          <label className="label-base">{t('dashboard.createBot.name')}</label>
          <input
            data-testid="bot-name"
            className="input-base"
            value={form.name}
            onChange={onChange('name')}
            placeholder={t('dashboard.createBot.namePlaceholder')}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label-base">{t('dashboard.createBot.niche')}</label>
            <input
              data-testid="bot-niche"
              className="input-base"
              value={form.niche}
              onChange={onChange('niche')}
              placeholder={t('dashboard.createBot.nichePlaceholder')}
            />
          </div>
          <div>
            <label className="label-base">{t('dashboard.createBot.salesStyle')}</label>
            <select
              data-testid="bot-salesStyle"
              className="input-base"
              value={form.salesStyle}
              onChange={onChange('salesStyle')}
            >
              {Object.entries(styles).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label-base">{t('dashboard.createBot.instructions')}</label>
          <textarea
            data-testid="bot-instructions"
            className="input-base min-h-[110px] resize-y"
            value={form.instructions}
            onChange={onChange('instructions')}
            placeholder={t('dashboard.createBot.instructionsPlaceholder')}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label-base">{t('dashboard.createBot.discountRule')}</label>
            <input
              data-testid="bot-discountRule"
              className="input-base"
              value={form.discountRule}
              onChange={onChange('discountRule')}
              placeholder={t('dashboard.createBot.discountRulePlaceholder')}
            />
          </div>
          <div>
            <label className="label-base">{t('dashboard.createBot.handoffRule')}</label>
            <input
              data-testid="bot-handoffRule"
              className="input-base"
              value={form.handoffRule}
              onChange={onChange('handoffRule')}
              placeholder={t('dashboard.createBot.handoffRulePlaceholder')}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label-base">{t('dashboard.createBot.instagramHandle')}</label>
            <input
              data-testid="bot-instagramHandle"
              className="input-base"
              value={form.instagramHandle}
              onChange={onChange('instagramHandle')}
              placeholder="@brand_az"
            />
          </div>
          <div>
            <label className="label-base">{t('dashboard.createBot.whatsappNumber')}</label>
            <input
              data-testid="bot-whatsappNumber"
              className="input-base"
              value={form.whatsappNumber}
              onChange={onChange('whatsappNumber')}
              placeholder="+994501112233"
            />
          </div>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary mt-2" data-testid="create-bot-submit">
          {submitting ? t('common.loading') : t('dashboard.createBot.submit')}
          {!submitting && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
