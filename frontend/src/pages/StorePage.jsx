import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Instagram, MessageCircle, Package, ShieldOff, Sparkles } from 'lucide-react';
import { publicApi } from '../lib/api';

export default function StorePage({ slug: slugProp }) {
  const params = useParams();
  const slug = slugProp || params.slug || params.lng;
  const [state, setState] = useState({ loading: true, store: null, products: [], notFound: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await publicApi.getStore(slug);
        if (cancelled) return;
        setState({ loading: false, store: data.store, products: data.products, notFound: false });
      } catch (err) {
        if (cancelled) return;
        const notFound = err?.response?.status === 404;
        setState({ loading: false, store: null, products: [], notFound });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50" data-testid="store-loading">
        <div className="h-8 w-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (state.notFound || !state.store) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6 bg-ink-50"
        data-testid="store-not-found"
      >
        <div className="max-w-sm w-full bg-white border border-ink-200 rounded-2xl p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-ink-100 flex items-center justify-center mb-4">
            <ShieldOff className="h-5 w-5 text-ink-500" />
          </div>
          <h1 className="font-display font-semibold text-lg text-ink-900">Mağaza tapılmadı</h1>
          <p className="text-sm text-ink-500 mt-1">
            /{slug} ünvanında aktiv mağaza yoxdur.
          </p>
        </div>
      </div>
    );
  }

  const { store, products } = state;
  const igUrl = store.instagramHandle
    ? `https://instagram.com/${store.instagramHandle.replace(/^@/, '')}`
    : null;
  const waUrl = store.whatsappNumber
    ? `https://wa.me/${store.whatsappNumber.replace(/[^0-9]/g, '')}`
    : null;

  return (
    <div className="min-h-screen bg-ink-50" data-testid="store-page">
      <header className="bg-white border-b border-ink-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex items-center gap-4 flex-wrap">
          <div className="h-14 w-14 rounded-xl bg-brand-gradient flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-semibold text-2xl sm:text-3xl text-ink-900" data-testid="store-name">
              {store.name}
            </h1>
            <p className="text-sm text-ink-500 mt-1">@{store.slug}</p>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            {igUrl && (
              <a
                href={igUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-ink-900 text-white hover:bg-ink-700"
                data-testid="store-ig-btn"
              >
                <Instagram className="h-3.5 w-3.5" />
                Instagramda yaz
              </a>
            )}
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                data-testid="store-wa-btn"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp-da yaz
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {products.length === 0 ? (
          <div className="bg-white border border-ink-200 rounded-xl p-10 text-center" data-testid="store-empty">
            <div className="mx-auto h-12 w-12 rounded-xl bg-ink-100 flex items-center justify-center mb-3">
              <Package className="h-5 w-5 text-ink-500" />
            </div>
            <p className="text-sm text-ink-500">Bu mağazada hələ aktiv məhsul yoxdur.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} igUrl={igUrl} waUrl={waUrl} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-ink-200 py-6 text-center text-[11px] text-ink-500">
        AI Operator · aioperator.social
      </footer>
    </div>
  );
}

function ProductCard({ p, igUrl, waUrl }) {
  const hasDiscount = p.discountPrice && p.discountPrice < p.price;
  const outOfStock = !p.stock || p.stock <= 0;
  const img = p.imageUrl || p.image;
  return (
    <div className="bg-white border border-ink-200 rounded-xl overflow-hidden flex flex-col" data-testid={`store-product-${p.id}`}>
      <div className="aspect-square bg-ink-100 flex items-center justify-center overflow-hidden">
        {img ? (
          <img src={img} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <Package className="h-8 w-8 text-ink-300" />
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-display font-semibold text-sm text-ink-900 line-clamp-2">{p.name}</h3>
        {p.category && <div className="text-[11px] text-ink-500 mt-0.5">{p.category}</div>}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display font-bold text-base text-ink-900">
            {hasDiscount ? p.discountPrice : p.price} ₼
          </span>
          {hasDiscount && (
            <span className="text-xs text-ink-500 line-through">{p.price} ₼</span>
          )}
        </div>
        <div className="mt-1">
          {outOfStock ? (
            <span className="text-[11px] font-semibold text-red-600">Stokda yoxdur</span>
          ) : (
            <span className="text-[11px] font-semibold text-emerald-700">Stokda var</span>
          )}
        </div>
        <div className="mt-auto pt-3 grid grid-cols-2 gap-1.5">
          {igUrl ? (
            <a
              href={igUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-semibold px-2 py-1.5 rounded-md bg-ink-900 text-white text-center hover:bg-ink-700"
            >
              Instagram
            </a>
          ) : (
            <span className="text-[11px] font-semibold px-2 py-1.5 rounded-md bg-ink-100 text-ink-400 text-center">
              Instagram
            </span>
          )}
          {waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-semibold px-2 py-1.5 rounded-md bg-emerald-600 text-white text-center hover:bg-emerald-700"
            >
              WhatsApp
            </a>
          ) : (
            <span className="text-[11px] font-semibold px-2 py-1.5 rounded-md bg-ink-100 text-ink-400 text-center">
              WhatsApp
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
