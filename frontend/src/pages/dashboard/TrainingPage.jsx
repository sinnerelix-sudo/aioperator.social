import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function TrainingPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const styles = t('dashboard.createBot.salesStyles', { returnObjects: true });
  const [form, setForm] = useState({
    role: 'satış məsləhətçisi',
    salesStyle: 'friendly',
    addressForm: 'Siz',
    priceQuestion: 'Qiyməti dərhal de, sonra fayda və endirim təklif et.',
    discountRule: 'Maksimum 10% endirim, yalnız sifariş etmək istəyəndə.',
    deliveryInfo: 'Bakı içi 24 saat pulsuz, regionlar 1-3 gün, 5₼ çatdırılma.',
    forbidden: 'Siyasət, din, rəqib brendlər haqqında danışma.',
    handoff: 'Ödəniş problemi, qaytarma, ölçü problemi olanda operatora ötür.',
    unhappyCustomer: 'Üzr istə, problemi qeydə al, operatorla əlaqəni təklif et.',
  });
  const [saved, setSaved] = useState(true);

  const onChange = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setSaved(false);
  };

  const onSave = () => {
    setSaved(true);
    toast.success(t('dashboard.training.saved'));
  };

  return (
    <div data-testid="training-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight text-ink-900">
            {t('dashboard.training.title')}
          </h1>
          <p className="text-sm text-ink-500 mt-1">{t('dashboard.training.subtitle')}</p>
        </div>
        <button onClick={onSave} className="btn-primary" data-testid="training-save">
          {t('dashboard.training.save')}
        </button>
      </div>

      <div className="mt-6 grid lg:grid-cols-[1fr_360px] gap-4">
        <div className="bg-white border border-ink-200 rounded-xl p-5 sm:p-7 space-y-4" data-testid="training-form">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label-base">{t('dashboard.training.role')}</label>
              <input className="input-base" value={form.role} onChange={onChange('role')} placeholder={t('dashboard.training.rolePlaceholder')} data-testid="training-role" />
            </div>
            <div>
              <label className="label-base">{t('dashboard.training.salesStyle')}</label>
              <select className="input-base" value={form.salesStyle} onChange={onChange('salesStyle')} data-testid="training-salesStyle">
                {Object.entries(styles).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-base">{t('dashboard.training.addressForm')}</label>
              <input className="input-base" value={form.addressForm} onChange={onChange('addressForm')} placeholder={t('dashboard.training.addressFormPlaceholder')} />
            </div>
            <div>
              <label className="label-base">{t('dashboard.training.priceQuestion')}</label>
              <input className="input-base" value={form.priceQuestion} onChange={onChange('priceQuestion')} placeholder={t('dashboard.training.priceQuestionPlaceholder')} />
            </div>
          </div>
          <div>
            <label className="label-base">{t('dashboard.training.discountRule')}</label>
            <textarea className="input-base min-h-[70px] resize-y" value={form.discountRule} onChange={onChange('discountRule')} />
          </div>
          <div>
            <label className="label-base">{t('dashboard.training.deliveryInfo')}</label>
            <textarea className="input-base min-h-[70px] resize-y" value={form.deliveryInfo} onChange={onChange('deliveryInfo')} placeholder={t('dashboard.training.deliveryInfoPlaceholder')} />
          </div>
          <div>
            <label className="label-base">{t('dashboard.training.forbidden')}</label>
            <textarea className="input-base min-h-[60px] resize-y" value={form.forbidden} onChange={onChange('forbidden')} placeholder={t('dashboard.training.forbiddenPlaceholder')} />
          </div>
          <div>
            <label className="label-base">{t('dashboard.training.handoff')}</label>
            <textarea className="input-base min-h-[60px] resize-y" value={form.handoff} onChange={onChange('handoff')} />
          </div>
          <div>
            <label className="label-base">{t('dashboard.training.unhappyCustomer')}</label>
            <textarea className="input-base min-h-[60px] resize-y" value={form.unhappyCustomer} onChange={onChange('unhappyCustomer')} />
          </div>
          {!saved && (
            <div className="text-[11px] text-amber-700 bg-amber-50 px-3 py-2 rounded-lg inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Yaddaşa yazılmamış dəyişikliklər var
            </div>
          )}
        </div>

        {/* Live chat preview */}
        <div className="bg-ink-50 border border-ink-200 rounded-xl p-4 sm:p-5 sticky top-20 self-start" data-testid="training-preview">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-7 w-7 rounded-lg bg-brand-gradient flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </span>
            <div>
              <div className="text-sm font-display font-semibold text-ink-900">{t('dashboard.training.preview')}</div>
              <div className="text-[11px] text-ink-500">{t('dashboard.training.previewSubtitle')}</div>
            </div>
          </div>
          <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1 text-xs">
            <Bubble side="left">Salam, mavi paltarın qiyməti nədir?</Bubble>
            <Bubble side="right">Salam {form.addressForm}! 79.90 ₼-dir. Bu həftə sizə uyğun model var.</Bubble>
            <Bubble side="left">Endirim ola bilərmi?</Bubble>
            <Bubble side="right">{form.discountRule.includes('15') ? '15%' : '10%'}-ə qədər endirim verə bilərəm – sifarişi indi rəsmiləşdirsəniz.</Bubble>
            <Bubble side="left">Çatdırılma necədir?</Bubble>
            <Bubble side="right">{form.deliveryInfo.split('.')[0]}.</Bubble>
            <Bubble side="left">Mənim kartımdan pul çəkilməyib amma sifariş təsdiqlənmir.</Bubble>
            <Bubble side="right" muted>Sizə kömək üçün insan operatoru cəlb edirəm — bir neçə saniyə gözləyin.</Bubble>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({ side, children, muted }) {
  const isRight = side === 'right';
  return (
    <div className={`flex ${isRight ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 leading-relaxed ${
        isRight
          ? muted ? 'bg-ink-900 text-white' : 'bg-brand-gradient text-white'
          : 'bg-white border border-ink-200 text-ink-900'
      }`}>
        {children}
      </div>
    </div>
  );
}
