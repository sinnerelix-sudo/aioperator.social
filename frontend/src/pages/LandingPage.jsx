import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowRight,
  MessageSquare,
  Package,
  GraduationCap,
  Target,
  Plug,
  UserCog,
  Check,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { PublicHeader } from '../components/PublicHeader';
import { Footer } from '../components/Footer';
import { PLANS, formatPrice } from '../lib/utils';

const FEATURE_ICONS = {
  inbox: MessageSquare,
  catalog: Package,
  training: GraduationCap,
  leads: Target,
  channels: Plug,
  handoff: UserCog,
};

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const { lng = 'az' } = useParams();
  const features = t('features.items', { returnObjects: true });
  const plans = t('pricing.plans', { returnObjects: true });
  const faq = t('faq.items', { returnObjects: true });

  return (
    <div className="min-h-screen bg-ink-50" data-testid="landing-page">
      <PublicHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          aria-hidden
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 0%, rgba(124,58,237,0.15) 0, transparent 50%), radial-gradient(circle at 80% 30%, rgba(79,70,229,0.12) 0, transparent 45%)',
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-16 sm:py-24 lg:py-28 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <span
              className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase px-3 py-1.5 rounded-full bg-white border border-ink-200 text-brand-600"
              data-testid="hero-badge"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t('hero.badge')}
            </span>
            <h1
              className="mt-5 font-display font-semibold text-4xl sm:text-5xl lg:text-6xl tracking-tighter leading-[1.05] text-ink-900"
              data-testid="hero-title"
            >
              {t('hero.title').split(' ').slice(0, -1).join(' ')}{' '}
              <span className="bg-clip-text text-transparent bg-brand-gradient">
                {t('hero.title').split(' ').slice(-1)}
              </span>
            </h1>
            <p
              className="mt-5 text-base sm:text-lg text-ink-500 leading-relaxed max-w-xl"
              data-testid="hero-subtitle"
            >
              {t('hero.subtitle')}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to={`/${lng}/register`}
                data-testid="hero-cta-primary"
                className="btn-primary text-base px-6 py-3"
              >
                {t('hero.ctaPrimary')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#pricing" data-testid="hero-cta-secondary" className="btn-ghost text-base px-6 py-3">
                {t('hero.ctaSecondary')}
              </a>
            </div>

            <div className="mt-10 grid grid-cols-3 max-w-lg gap-4 sm:gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border-l-2 border-brand-600/30 pl-3 sm:pl-4">
                  <div className="font-display font-semibold text-xl sm:text-2xl text-ink-900">
                    {t(`hero.stat${i}`)}
                  </div>
                  <div className="text-[11px] sm:text-xs text-ink-500 mt-0.5">
                    {t(`hero.stat${i}Label`)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 sm:py-24 bg-white border-y border-ink-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-brand-600">
              {t('nav.features')}
            </span>
            <h2 className="mt-3 font-display font-semibold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-ink-900">
              {t('features.title')}
            </h2>
            <p className="mt-3 text-ink-500">{t('features.subtitle')}</p>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(features).map(([key, item]) => {
              const Icon = FEATURE_ICONS[key] || Sparkles;
              return (
                <div
                  key={key}
                  data-testid={`feature-${key}`}
                  className="group relative p-6 rounded-2xl border border-ink-200 bg-white hover:border-brand-600/40 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="h-10 w-10 rounded-xl bg-brand-gradient-soft flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-brand-600" />
                  </div>
                  <h3 className="font-display font-semibold text-lg text-ink-900">{item.title}</h3>
                  <p className="mt-1.5 text-sm text-ink-500 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-brand-600">
              {t('nav.pricing')}
            </span>
            <h2 className="mt-3 font-display font-semibold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-ink-900">
              {t('pricing.title')}
            </h2>
            <p className="mt-3 text-ink-500">{t('pricing.subtitle')}</p>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS.map((plan) => {
              const meta = plans[plan.id];
              return (
                <div
                  key={plan.id}
                  data-testid={`pricing-card-${plan.id}`}
                  className={`group relative flex flex-col p-6 sm:p-7 rounded-2xl bg-white border transition-all duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:active:translate-y-0 motion-safe:active:scale-[0.99] ${
                    plan.popular
                      ? 'border-brand-600/40 popular-glow hover:border-brand-600/60 hover:shadow-[0_0_0_1px_rgba(79,70,229,0.45),0_30px_70px_-15px_rgba(124,58,237,0.45)]'
                      : 'border-ink-200 hover:border-brand-600/40 hover:shadow-xl'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-brand-gradient text-white shadow-sm transition-all duration-300 motion-safe:group-hover:scale-105 motion-safe:group-hover:shadow-md">
                      {t('pricing.popular')}
                    </span>
                  )}
                  <h3 className="font-display font-semibold text-lg text-ink-900">{meta.name}</h3>
                  <p className="text-sm text-ink-500 mt-1">{meta.desc}</p>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="font-display font-bold text-3xl sm:text-4xl text-ink-900">
                      {formatPrice(plan.price, i18n.language)}
                    </span>
                    <span className="text-xs text-ink-500">{t('pricing.perMonth')}</span>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-brand-gradient-soft text-brand-600 transition-all duration-300 motion-safe:group-hover:bg-brand-100">
                    {plan.messageLimit.toLocaleString(i18n.language === 'tr' ? 'tr-TR' : 'az-AZ')} {i18n.language === 'tr' ? 'mesaj/ay' : 'mesaj/ay'}
                  </div>
                  <ul className="mt-6 space-y-2.5 flex-1">
                    {meta.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-ink-700">
                        <Check className="h-4 w-4 text-brand-600 shrink-0 mt-0.5 transition-transform duration-300 motion-safe:group-hover:scale-110" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={`/${lng}/register?plan=${plan.id}`}
                    data-testid={`pricing-cta-${plan.id}`}
                    className={`mt-6 inline-flex items-center justify-center gap-1.5 font-medium rounded-lg px-4 py-2.5 text-sm transition-all duration-200 ease-out motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2 ${
                      plan.popular
                        ? 'bg-brand-gradient text-white hover:opacity-90 hover:shadow-lg hover:shadow-brand-600/25'
                        : 'bg-ink-900 text-white hover:bg-ink-700 hover:shadow-md'
                    }`}
                  >
                    {t('pricing.cta')}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 sm:py-24 bg-white border-t border-ink-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="text-center">
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-brand-600">
              {t('nav.faq')}
            </span>
            <h2 className="mt-3 font-display font-semibold text-3xl sm:text-4xl tracking-tight text-ink-900">
              {t('faq.title')}
            </h2>
          </div>
          <div className="mt-10 space-y-3">
            {faq.map((item, idx) => (
              <FaqItem key={idx} q={item.q} a={item.a} idx={idx} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="rounded-3xl bg-brand-gradient p-8 sm:p-12 lg:p-16 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20" aria-hidden style={{
              backgroundImage:
                'radial-gradient(circle at 80% 20%, white 0, transparent 40%)',
            }} />
            <div className="relative">
              <h2 className="font-display font-semibold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white max-w-2xl">
                {t('hero.title')}
              </h2>
              <p className="mt-4 text-white/80 max-w-xl text-base sm:text-lg">{t('hero.subtitle')}</p>
              <Link
                to={`/${lng}/register`}
                data-testid="cta-bottom"
                className="mt-8 inline-flex items-center gap-2 bg-white text-ink-900 font-medium rounded-lg px-6 py-3 hover:bg-ink-100 transition-colors"
              >
                {t('hero.ctaPrimary')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function FaqItem({ q, a, idx }) {
  const [open, setOpen] = useState(idx === 0);
  return (
    <div
      data-testid={`faq-item-${idx}`}
      className="border border-ink-200 rounded-xl bg-white overflow-hidden"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left"
        data-testid={`faq-toggle-${idx}`}
        aria-expanded={open}
      >
        <span className="font-display font-medium text-base text-ink-900">{q}</span>
        <ChevronDown
          className={`h-4 w-4 text-ink-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-ink-500 leading-relaxed -mt-1 animate-fade-in">{a}</div>
      )}
    </div>
  );
}

function HeroVisual() {
  const { t } = useTranslation();
  return (
    <div className="relative w-full max-w-md mx-auto lg:ml-auto aspect-[5/6] sm:aspect-square">
      <div className="absolute inset-2 sm:inset-4 rounded-3xl bg-brand-gradient opacity-90 rotate-1 sm:rotate-3" />
      <div className="absolute inset-0 rounded-3xl bg-white border border-ink-200 shadow-soft p-4 sm:p-5 rotate-0 sm:-rotate-2 flex flex-col">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 text-xs text-ink-500 font-mono">aioperator.chat</span>
        </div>
        <div className="space-y-2.5 sm:space-y-3 flex-1 min-h-0 overflow-hidden">
          <ChatBubble side="left" name={t('hero.preview.customer')}>{t('hero.preview.msg1')}</ChatBubble>
          <ChatBubble side="right" name={t('hero.preview.ai')}>{t('hero.preview.ai1')}</ChatBubble>
          <ChatBubble side="left" name={t('hero.preview.customer')}>{t('hero.preview.msg2')}</ChatBubble>
          <ChatBubble side="right" name={t('hero.preview.ai')}>{t('hero.preview.ai2')}</ChatBubble>
        </div>
        <div className="mt-3 pt-3 border-t border-ink-200 flex items-center gap-2 text-xs text-ink-500 shrink-0">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          {t('hero.preview.active')}
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ side, name, children }) {
  const isRight = side === 'right';
  return (
    <div className={`flex ${isRight ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
          isRight ? 'bg-brand-gradient text-white' : 'bg-ink-100 text-ink-900'
        }`}
      >
        <div className={`text-[10px] font-semibold mb-0.5 ${isRight ? 'text-white/70' : 'text-ink-500'}`}>
          {name}
        </div>
        {children}
      </div>
    </div>
  );
}
