import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Package as PkgIcon, X } from 'lucide-react';
import { productsApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from './BotsPage';

const empty = {
  name: '',
  image: '',
  price: '',
  discountPrice: '',
  maxDiscount: '',
  stock: '',
  category: '',
  description: '',
};

export default function ProductsPage() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [confirmId, setConfirmId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await productsApi.list();
      setItems(data.products);
    } catch {
      toast.error(t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p.id);
    setForm({
      name: p.name || '',
      image: p.image || '',
      price: String(p.price ?? ''),
      discountPrice: p.discountPrice == null ? '' : String(p.discountPrice),
      maxDiscount: String(p.maxDiscount ?? ''),
      stock: String(p.stock ?? ''),
      category: p.category || '',
      description: p.description || '',
    });
    setOpen(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || form.price === '') {
      toast.error(t('auth.errors.required'));
      return;
    }
    const payload = {
      name: form.name,
      image: form.image || '',
      price: Number(form.price),
      discountPrice: form.discountPrice === '' ? null : Number(form.discountPrice),
      maxDiscount: form.maxDiscount === '' ? 0 : Number(form.maxDiscount),
      stock: form.stock === '' ? 0 : Number(form.stock),
      category: form.category || '',
      description: form.description || '',
    };
    try {
      if (editing) {
        await productsApi.update(editing, payload);
        toast.success(t('dashboard.products.updated'));
      } else {
        await productsApi.create(payload);
        toast.success(t('dashboard.products.created'));
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || t('errors.generic'));
    }
  };

  const onDelete = async (id) => {
    try {
      await productsApi.remove(id);
      toast.success(t('dashboard.products.deleted'));
      setConfirmId(null);
      load();
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  const currency = i18n.language === 'tr' ? '₺' : '₼';

  return (
    <div data-testid="products-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight text-ink-900">
            {t('dashboard.products.title')}
          </h1>
          <p className="text-sm text-ink-500 mt-1">{t('dashboard.products.subtitle')}</p>
        </div>
        <button onClick={openCreate} className="btn-primary" data-testid="products-add-new">
          <Plus className="h-4 w-4" />
          {t('dashboard.products.addNew')}
        </button>
      </div>

      {loading ? (
        <div className="mt-8 text-sm text-ink-500">{t('common.loading')}</div>
      ) : items.length === 0 ? (
        <div className="mt-8 bg-white border border-ink-200 rounded-xl p-10 text-center" data-testid="products-empty">
          <div className="mx-auto h-12 w-12 rounded-xl bg-brand-gradient-soft flex items-center justify-center mb-3">
            <PkgIcon className="h-5 w-5 text-brand-600" />
          </div>
          <p className="text-sm text-ink-500">{t('dashboard.products.empty')}</p>
          <button onClick={openCreate} className="btn-primary mt-5 inline-flex">
            <Plus className="h-4 w-4" />
            {t('dashboard.products.addNew')}
          </button>
        </div>
      ) : (
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="products-grid">
          {items.map((p) => (
            <div key={p.id} data-testid={`product-card-${p.id}`} className="bg-white border border-ink-200 rounded-xl overflow-hidden flex flex-col">
              <div className="aspect-[4/3] bg-ink-100 flex items-center justify-center overflow-hidden">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <PkgIcon className="h-8 w-8 text-ink-300" />
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display font-semibold text-sm text-ink-900 leading-snug">{p.name}</h3>
                  {p.category && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-ink-100 text-ink-500 shrink-0 uppercase tracking-wider">
                      {p.category}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  {p.discountPrice != null && p.discountPrice < p.price ? (
                    <>
                      <span className="font-display font-bold text-lg text-ink-900">
                        {p.discountPrice.toFixed(2)} {currency}
                      </span>
                      <span className="text-xs text-ink-500 line-through">
                        {p.price.toFixed(2)} {currency}
                      </span>
                    </>
                  ) : (
                    <span className="font-display font-bold text-lg text-ink-900">
                      {p.price.toFixed(2)} {currency}
                    </span>
                  )}
                </div>
                <div className="text-xs text-ink-500 mt-1">stock: {p.stock}</div>
                <div className="mt-auto pt-3 flex items-center justify-end gap-2 border-t border-ink-200 mt-3">
                  <button
                    onClick={() => openEdit(p)}
                    className="text-xs text-ink-500 hover:text-brand-600 inline-flex items-center gap-1"
                    data-testid={`product-edit-${p.id}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => setConfirmId(p.id)}
                    className="text-xs text-ink-500 hover:text-red-600 inline-flex items-center gap-1"
                    data-testid={`product-delete-${p.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal title={editing ? t('dashboard.products.edit') : t('dashboard.products.addNew')} onClose={() => setOpen(false)}>
          <form onSubmit={onSubmit} className="space-y-3" data-testid="product-form">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="label-base">{t('dashboard.products.name')}</label>
                <input
                  data-testid="product-name"
                  className="input-base"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label-base">{t('dashboard.products.image')}</label>
                <input
                  data-testid="product-image"
                  className="input-base"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="label-base">{t('dashboard.products.price')}</label>
                <input
                  data-testid="product-price"
                  className="input-base"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div>
                <label className="label-base">{t('dashboard.products.discountPrice')}</label>
                <input
                  data-testid="product-discountPrice"
                  className="input-base"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discountPrice}
                  onChange={(e) => setForm({ ...form, discountPrice: e.target.value })}
                />
              </div>
              <div>
                <label className="label-base">{t('dashboard.products.maxDiscount')}</label>
                <input
                  data-testid="product-maxDiscount"
                  className="input-base"
                  type="number"
                  min="0"
                  max="100"
                  value={form.maxDiscount}
                  onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                />
              </div>
              <div>
                <label className="label-base">{t('dashboard.products.stock')}</label>
                <input
                  data-testid="product-stock"
                  className="input-base"
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label-base">{t('dashboard.products.category')}</label>
                <input
                  data-testid="product-category"
                  className="input-base"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label-base">{t('dashboard.products.description')}</label>
                <textarea
                  data-testid="product-description"
                  className="input-base min-h-[90px] resize-y"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-sm py-2 px-4" data-testid="product-cancel">
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn-primary text-sm py-2 px-4" data-testid="product-submit">
                {t('common.save')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirmId && (
        <ConfirmModal
          message={t('dashboard.products.confirmDelete')}
          onConfirm={() => onDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          danger
        />
      )}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink-900/40 backdrop-blur-sm px-3 py-4 overflow-y-auto" data-testid="product-modal">
      <div className="bg-white rounded-2xl border border-ink-200 shadow-xl w-full max-w-lg p-5 sm:p-7 my-auto animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg text-ink-900">{title}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-ink-100 flex items-center justify-center" data-testid="modal-close">
            <X className="h-4 w-4 text-ink-500" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
