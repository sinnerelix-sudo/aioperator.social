import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Save, ClipboardList } from 'lucide-react';
import { trainingApi } from '../lib/api';
import { useToast } from '../context/ToastContext';

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

/**
 * Structured training fields for a single bot. Collapsed by default inside
 * single-bot mode (shown via "Təlimatları göstər" button in the chat header)
 * and fully inline inside group mode. Accepts `externalTraining` so the
 * parent can push a fresh payload after the coach chat applies a suggestion.
 */
export default function TrainingFieldsPanel({
  bot,
  externalTraining,
  initiallyOpen = false,
  embedded = false,
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const tones = t('dashboard.training.tones', { returnObjects: true });

  const [form, setForm] = useState(DEFAULT_FORM);
  const [saved, setSaved] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(initiallyOpen);

  useEffect(() => {
    if (!bot?.id) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data } = await trainingApi.get(bot.id);
        if (cancelled) return;
        setForm({ ...DEFAULT_FORM, ...data.training });
        setSaved(true);
      } catch {
        if (!cancelled) toast.error(t('errors.generic'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bot?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Parent can push a fresh training object (e.g. after Apply in coach chat).
  useEffect(() => {
    if (externalTraining && externalTraining.botId === bot?.id) {
      setForm({ ...DEFAULT_FORM, ...externalTraining });
      setSaved(true);
    }
  }, [externalTraining, bot?.id]);

  const onChange = (k) => (e) => {
    const v = k === 'maxDiscountPercent' ? Number(e.target.value || 0) : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };

  const onSave = async () => {
    if (!bot?.id) return;
    setSaving(true);
    try {
      const { data } = await trainingApi.save(bot.id, form);
      setForm({ ...DEFAULT_FORM, ...data.training });
      setSaved(true);
      toast.success(t('dashboard.training.saved'));
    } catch {
      toast.error(t('errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  if (!bot) return null;

  const Header = (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-ink-50 hover:bg-ink-100 transition-colors border-b border-ink-200"
      data-testid="training-panel-toggle"
    >
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
        <ClipboardList className="h-4 w-4 text-brand-600" />
        {open ? t('dashboard.trainingInbox.hideInstructions') : t('dashboard.trainingInbox.showInstructions')}
      </span>
      {open ? (
        <ChevronUp className="h-4 w-4 text-ink-500" />
      ) : (
        <ChevronDown className="h-4 w-4 text-ink-500" />
      )}
    </button>
  );

  const Body = (
    <div className={open ? 'p-4 space-y-3' : 'hidden'} data-testid="training-fields-body">
      {loading ? (
        <div className="text-xs text-ink-500">{t('common.loading')}</div>
      ) : (
        <>
          <Row>
            <Field label={t('dashboard.training.businessName')}>
              <input
                className="input-base"
                value={form.businessName}
                onChange={onChange('businessName')}
                data-testid="tf-businessName"
              />
            </Field>
            <Field label={t('dashboard.training.businessCategory')}>
              <input
                className="input-base"
                value={form.businessCategory}
                onChange={onChange('businessCategory')}
                data-testid="tf-businessCategory"
              />
            </Field>
          </Row>
          <Row>
            <Field label={t('dashboard.training.toneOfVoice')}>
              <select
                className="input-base"
                value={form.toneOfVoice}
                onChange={onChange('toneOfVoice')}
                data-testid="tf-toneOfVoice"
              >
                {Object.entries(tones).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('dashboard.training.languageMode')}>
              <select
                className="input-base"
                value={form.languageMode}
                onChange={onChange('languageMode')}
                data-testid="tf-languageMode"
              >
                <option value="auto">{t('dashboard.training.languageAuto')}</option>
                <option value="az">AZ</option>
                <option value="tr">TR</option>
              </select>
            </Field>
            <Field label={t('dashboard.training.maxDiscount')}>
              <input
                type="number"
                min="0"
                max="100"
                className="input-base"
                value={form.maxDiscountPercent}
                onChange={onChange('maxDiscountPercent')}
                data-testid="tf-maxDiscount"
              />
            </Field>
          </Row>
          <TextArea label={t('dashboard.training.greeting')} value={form.greetingMessage} onChange={onChange('greetingMessage')} testid="tf-greeting" />
          <TextArea label={t('dashboard.training.salesInstructions')} value={form.salesInstructions} onChange={onChange('salesInstructions')} testid="tf-salesInstructions" rows={3} />
          <TextArea label={t('dashboard.training.deliveryInfo')} value={form.deliveryInfo} onChange={onChange('deliveryInfo')} testid="tf-deliveryInfo" />
          <TextArea label={t('dashboard.training.paymentInfo')} value={form.paymentInfo} onChange={onChange('paymentInfo')} testid="tf-paymentInfo" />
          <TextArea label={t('dashboard.training.returnPolicy')} value={form.returnPolicy} onChange={onChange('returnPolicy')} testid="tf-returnPolicy" />
          <TextArea label={t('dashboard.training.discountRules')} value={form.discountRules} onChange={onChange('discountRules')} testid="tf-discountRules" />
          <TextArea label={t('dashboard.training.forbidden')} value={form.forbiddenTopics} onChange={onChange('forbiddenTopics')} testid="tf-forbidden" />
          <TextArea label={t('dashboard.training.handoff')} value={form.handoffRules} onChange={onChange('handoffRules')} testid="tf-handoff" />
          <TextArea label={t('dashboard.training.fallback')} value={form.fallbackMessage} onChange={onChange('fallbackMessage')} testid="tf-fallback" />

          <div className="flex items-center justify-between gap-2 pt-1">
            {!saved ? (
              <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                {t('dashboard.training.unsaved')}
              </span>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={onSave}
              disabled={saving || saved}
              className="btn-primary text-xs disabled:opacity-50"
              data-testid="tf-save"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? t('common.loading') : t('dashboard.training.save')}
            </button>
          </div>
        </>
      )}
    </div>
  );

  if (embedded) return Body;

  return (
    <div className="bg-white border border-ink-200 rounded-xl overflow-hidden" data-testid="training-fields-panel">
      {Header}
      {Body}
    </div>
  );
}

function Row({ children }) {
  return <div className="grid sm:grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label-base">{label}</label>
      {children}
    </div>
  );
}

function TextArea({ label, value, onChange, testid, rows = 2 }) {
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
