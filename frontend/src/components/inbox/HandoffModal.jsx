import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

/**
 * Two flavours, driven by `direction`:
 *   - 'to-human' (from Inbox):  Step1 → humanOnly / humanAndBot,
 *                                Step2 (if humanOnly) → always / temporary,
 *                                Step3 (if temporary) → pick duration.
 *   - 'to-bot'   (from Assigned): Step1 → botOnly / humanAndBot / botTemporary,
 *                                 Step2 (if botTemporary) → pick duration.
 *
 * onConfirm({ mode, until }) is called once the seller finalises a choice.
 *
 * This is visual + local-state only. No backend call is made.
 */
export default function HandoffModal({ open, onClose, onConfirm, direction = 'to-human', currentMode, t }) {
  const [step, setStep] = useState(1);
  const [choice, setChoice] = useState(null); // primary choice
  const [timingChoice, setTimingChoice] = useState(null); // always | temporary (for to-human flow)
  const [unit, setUnit] = useState('hours');
  const [amount, setAmount] = useState(2);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setChoice(null);
    setTimingChoice(null);
    setUnit('hours');
    setAmount(2);
  }, [open]);

  if (!open) return null;

  const title = direction === 'to-bot' ? t('dashboard.inbox.handoffModal.titleToBot') : t('dashboard.inbox.handoffModal.title');

  const computeUntil = () => {
    const d = new Date();
    const n = Number(amount) > 0 ? Number(amount) : 1;
    if (unit === 'hours') d.setHours(d.getHours() + n);
    else if (unit === 'days') d.setDate(d.getDate() + n);
    else if (unit === 'months') d.setMonth(d.getMonth() + n);
    return d.toISOString();
  };

  const finalise = (mode, withUntil = false) => {
    onConfirm({ mode, until: withUntil ? computeUntil() : null });
  };

  const selectPrimary = (val) => {
    setChoice(val);
    if (direction === 'to-human') {
      if (val === 'human_and_bot') {
        finalise('human_and_bot');
        return;
      }
      // humanOnly → go to step 2 (always vs temporary)
      setStep(2);
    } else {
      // to-bot
      if (val === 'bot_only' || val === 'human_and_bot') {
        finalise(val);
        return;
      }
      // bot_temporary → go to duration picker
      setStep(2);
    }
  };

  const selectTiming = (val) => {
    setTimingChoice(val);
    if (val === 'always') {
      finalise('human_only');
      return;
    }
    // temporary → pick duration
    setStep(3);
  };

  const confirmDuration = () => {
    if (direction === 'to-human') {
      finalise('human_only_until', true);
    } else {
      // to-bot temporary → bot answers for a period; UI stays in bot mode.
      finalise('bot_only_until', true);
    }
  };

  const back = () => {
    if (step === 3) setStep(2);
    else if (step === 2) {
      setStep(1);
      setTimingChoice(null);
      setChoice(null);
    }
  };

  const btnBase = 'w-full text-left px-4 py-3 rounded-lg border transition font-medium';
  const btnIdle = 'border-ink-200 bg-white hover:border-brand-400 hover:bg-brand-50';
  const btnActive = 'border-brand-500 bg-brand-50 text-brand-800';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      data-testid="handoff-modal"
    >
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-ink-200 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-200">
          <h3 className="font-display font-semibold text-base text-ink-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-500 hover:bg-ink-100"
            data-testid="handoff-modal-close"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {step === 1 && direction === 'to-human' && (
            <>
              <button
                type="button"
                onClick={() => selectPrimary('human_only')}
                data-testid="handoff-option-human-only"
                className={`${btnBase} ${currentMode === 'human_only' || currentMode === 'human_only_until' ? btnActive : btnIdle}`}
              >
                {t('dashboard.inbox.handoffModal.humanOnly')}
              </button>
              <button
                type="button"
                onClick={() => selectPrimary('human_and_bot')}
                data-testid="handoff-option-human-and-bot"
                className={`${btnBase} ${currentMode === 'human_and_bot' ? btnActive : btnIdle}`}
              >
                {t('dashboard.inbox.handoffModal.humanAndBot')}
              </button>
            </>
          )}

          {step === 1 && direction === 'to-bot' && (
            <>
              <button
                type="button"
                onClick={() => selectPrimary('bot_only')}
                data-testid="handoff-option-bot-only"
                className={`${btnBase} ${currentMode === 'bot_only' ? btnActive : btnIdle}`}
              >
                {t('dashboard.inbox.handoffModal.botOnly')}
              </button>
              <button
                type="button"
                onClick={() => selectPrimary('human_and_bot')}
                data-testid="handoff-option-bot-human-and-bot"
                className={`${btnBase} ${currentMode === 'human_and_bot' ? btnActive : btnIdle}`}
              >
                {t('dashboard.inbox.handoffModal.humanAndBot')}
              </button>
              <button
                type="button"
                onClick={() => selectPrimary('bot_temporary')}
                data-testid="handoff-option-bot-temporary"
                className={`${btnBase} ${btnIdle}`}
              >
                {t('dashboard.inbox.handoffModal.botTemporary')}
              </button>
            </>
          )}

          {step === 2 && direction === 'to-human' && (
            <>
              <button
                type="button"
                onClick={() => selectTiming('always')}
                data-testid="handoff-option-always"
                className={`${btnBase} ${btnIdle}`}
              >
                {t('dashboard.inbox.handoffModal.always')}
              </button>
              <button
                type="button"
                onClick={() => selectTiming('temporary')}
                data-testid="handoff-option-temporary"
                className={`${btnBase} ${btnIdle}`}
              >
                {t('dashboard.inbox.handoffModal.temporary')}
              </button>
            </>
          )}

          {(step === 3 || (step === 2 && direction === 'to-bot' && choice === 'bot_temporary')) && (
            <div data-testid="handoff-duration-picker" className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                {t('dashboard.inbox.handoffModal.pickDuration')}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  data-testid="handoff-duration-amount"
                  className="w-20 px-3 py-2 border border-ink-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  data-testid="handoff-duration-unit"
                  className="flex-1 px-3 py-2 border border-ink-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  <option value="hours">{t('dashboard.inbox.handoffModal.duration.hours')}</option>
                  <option value="days">{t('dashboard.inbox.handoffModal.duration.days')}</option>
                  <option value="months">{t('dashboard.inbox.handoffModal.duration.months')}</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-ink-200 bg-ink-50/50 rounded-b-2xl">
          {step > 1 ? (
            <button
              type="button"
              onClick={back}
              data-testid="handoff-modal-back"
              className="text-xs font-semibold px-3 py-2 rounded-lg border border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
            >
              {t('dashboard.inbox.handoffModal.back')}
            </button>
          ) : (
            <span />
          )}
          {(step === 3 || (step === 2 && direction === 'to-bot' && choice === 'bot_temporary')) && (
            <button
              type="button"
              onClick={confirmDuration}
              data-testid="handoff-modal-confirm"
              className="text-xs font-semibold px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700"
            >
              {t('dashboard.inbox.handoffModal.confirm')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
