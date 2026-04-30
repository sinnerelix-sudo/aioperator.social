import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, MessagesSquare, Eye } from 'lucide-react';
import { botsApi, trainingApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import BotTesterPanel from '../../components/BotTesterPanel';
import CoachChatPanel from '../../components/CoachChatPanel';

const DEFAULT_FORM = {
  businessName: '',
  businessCategory: '',
  toneOfVoice: 'friendly',
  greetingMessage: '',
  salesInstructions: '',
  deliveryInfo: '',
  paymentInfo: '',
  returnPolicy: '',
  discountRules: '',
  maxDiscountPercent: 10,
  forbiddenTopics: '',
  handoffRules: '',
  fallbackMessage: '',
  languageMode: 'auto',
};

export default function TrainingPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const { setSubscription } = useAuth();
  const tones = t('dashboard.training.tones', { returnObjects: true });

  const [bots, setBots] = useState([]);
  const [botId, setBotId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saved, setSaved] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await botsApi.list();
        setBots(data.bots);
        if (data.bots.length > 0) setBotId(data.bots[0].id);
      } catch {
        toast.error(t('errors.generic'));
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!botId) return;
    (async () => {
      try {
        const { data } = await trainingApi.get(botId);
        setForm({ ...DEFAULT_FORM, ...data.training });
        setSaved(true);
      } catch {
        toast.error(t('errors.generic'));
      }
    })();
  }, [botId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onChange = (k) => (e) => {
    const v =
      k === 'maxDiscountPercent' ? Number(e.target.value || 0) : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };

  const onSave = async () => {
    if (!botId) return;
    setSaving(true);
    try {
      const { data } = await trainingApi.save(botId, form);
      setForm({ ...DEFAULT_FORM, ...data.training });
      setSaved(true);
      toast.success(t('dashboard.training.saved'));
    } catch {
      toast.error(t('errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  const selectedBot = bots.find((b) => b.id === botId) || null;
  const [rightTab, setRightTab] = useState('coach');

  const onUsage = (usage) => {
    setSubscription?.((prev) =>
      prev
        ? { ...prev, usedMessages: usage.usedMessages, monthlyMessageLimit: usage.monthlyMessageLimit }
        : prev
    );
  };

  // Coach chat applied a suggestion → refresh local form from server response.
  const onTrainingUpdated = (training) => {
    setForm({ ...DEFAULT_FORM, ...training });
    setSaved(true);
    toast.success(t('dashboard.coach.applied'));
  };

  if (loading) {
    return <div className="text-sm text-ink-500">{t('common.loading')}</div>;
  }

  if (bots.length === 0) {
    return (
      <div data-testid="training-page" className="bg-white border border-ink-200 rounded-xl p-10 text-center">
        <h1 className="font-display font-semibold text-2xl text-ink-900">
          {t('dashboard.training.title')}
        </h1>
        <p className="text-sm text-ink-500 mt-2">{t('dashboard.training.noBots')}</p>
      </div>
    );
  }

  return (
    <div data-testid="training-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight text-ink-900">
            {t('dashboard.training.title')}
          </h1>
          <p className="text-sm text-ink-500 mt-1">{t('dashboard.training.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={botId || ''}
            onChange={(e) => setBotId(e.target.value)}
            className="input-base !py-2 !px-3 text-sm"
            data-testid="training-bot-select"
          >
            {bots.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button
            onClick={onSave}
            disabled={saving || saved}
            className="btn-primary disabled:opacity-50"
            data-testid="training-save"
          >
            <Save className="h-4 w-4" />
            {saving ? t('common.loading') : t('dashboard.training.save')}
          </button>
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-[1fr_420px] gap-4">
        <div className="bg-white border border-ink-200 rounded-xl p-5 sm:p-7 space-y-4" data-testid="training-form">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label-base">{t('dashboard.training.businessName')}</label>
              <input
                className="input-base"
                value={form.businessName}
                onChange={onChange('businessName')}
                data-testid="training-businessName"
              />
            </div>
            <div>
              <label className="label-base">{t('dashboard.training.businessCategory')}</label>
              <input
                className="input-base"
                value={form.businessCategory}
                onChange={onChange('businessCategory')}
                data-testid="training-businessCategory"
              />
            </div>
            <div>
              <label className="label-base">{t('dashboard.training.toneOfVoice')}</label>
              <select
                className="input-base"
                value={form.toneOfVoice}
                onChange={onChange('toneOfVoice')}
                data-testid="training-toneOfVoice"
              >
                {Object.entries(tones).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-base">{t('dashboard.training.languageMode')}</label>
              <select
                className="input-base"
                value={form.languageMode}
                onChange={onChange('languageMode')}
                data-testid="training-languageMode"
              >
                <option value="auto">{t('dashboard.training.languageAuto')}</option>
                <option value="az">AZ</option>
                <option value="tr">TR</option>
              </select>
            </div>
            <div>
              <label className="label-base">{t('dashboard.training.maxDiscount')}</label>
              <input
                type="number"
                min="0"
                max="100"
                className="input-base"
                value={form.maxDiscountPercent}
                onChange={onChange('maxDiscountPercent')}
                data-testid="training-maxDiscount"
              />
            </div>
          </div>

          <TextBlock
            label={t('dashboard.training.greeting')}
            value={form.greetingMessage}
            onChange={onChange('greetingMessage')}
            testid="training-greeting"
          />
          <TextBlock
            label={t('dashboard.training.salesInstructions')}
            value={form.salesInstructions}
            onChange={onChange('salesInstructions')}
            testid="training-salesInstructions"
            rows={3}
          />
          <TextBlock
            label={t('dashboard.training.deliveryInfo')}
            value={form.deliveryInfo}
            onChange={onChange('deliveryInfo')}
            testid="training-deliveryInfo"
          />
          <TextBlock
            label={t('dashboard.training.paymentInfo')}
            value={form.paymentInfo}
            onChange={onChange('paymentInfo')}
            testid="training-paymentInfo"
          />
          <TextBlock
            label={t('dashboard.training.returnPolicy')}
            value={form.returnPolicy}
            onChange={onChange('returnPolicy')}
            testid="training-returnPolicy"
          />
          <TextBlock
            label={t('dashboard.training.discountRules')}
            value={form.discountRules}
            onChange={onChange('discountRules')}
            testid="training-discountRules"
          />
          <TextBlock
            label={t('dashboard.training.forbidden')}
            value={form.forbiddenTopics}
            onChange={onChange('forbiddenTopics')}
            testid="training-forbidden"
          />
          <TextBlock
            label={t('dashboard.training.handoff')}
            value={form.handoffRules}
            onChange={onChange('handoffRules')}
            testid="training-handoff"
          />
          <TextBlock
            label={t('dashboard.training.fallback')}
            value={form.fallbackMessage}
            onChange={onChange('fallbackMessage')}
            testid="training-fallback"
          />

          {!saved && (
            <div className="text-[11px] text-amber-700 bg-amber-50 px-3 py-2 rounded-lg inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {t('dashboard.training.unsaved')}
            </div>
          )}
        </div>

        <div className="sticky top-20 self-start space-y-3" data-testid="training-right-pane">
          <div
            className="inline-flex items-center gap-1 p-1 bg-white border border-ink-200 rounded-full shadow-sm"
            role="tablist"
            data-testid="training-tabs"
          >
            <button
              type="button"
              role="tab"
              aria-selected={rightTab === 'coach'}
              onClick={() => setRightTab('coach')}
              data-testid="tab-coach"
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                rightTab === 'coach'
                  ? 'bg-brand-gradient text-white shadow-sm'
                  : 'text-ink-700 hover:bg-ink-100'
              }`}
            >
              <MessagesSquare className="h-3.5 w-3.5" />
              {t('dashboard.coach.tabCoach')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={rightTab === 'preview'}
              onClick={() => setRightTab('preview')}
              data-testid="tab-preview"
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                rightTab === 'preview'
                  ? 'bg-brand-gradient text-white shadow-sm'
                  : 'text-ink-700 hover:bg-ink-100'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              {t('dashboard.coach.tabPreview')}
            </button>
          </div>

          {rightTab === 'coach' ? (
            <CoachChatPanel
              bot={selectedBot}
              onUsage={onUsage}
              onTrainingUpdate={onTrainingUpdated}
            />
          ) : (
            <BotTesterPanel bot={selectedBot} onUsage={onUsage} />
          )}
        </div>
      </div>
    </div>
  );
}

function TextBlock({ label, value, onChange, testid, rows = 2 }) {
  return (
    <div>
      <label className="label-base">{label}</label>
      <textarea
        className="input-base resize-y"
        style={{ minHeight: `${rows * 26}px` }}
        value={value}
        onChange={onChange}
        data-testid={testid}
      />
    </div>
  );
}
