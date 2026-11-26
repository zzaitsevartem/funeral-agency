"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Category, Product } from "@/lib/catalog-shared";
import { formatPrice } from "@/lib/catalog-shared";
import { Breadcrumbs, ProductGrid } from "@/components/storefront";

const descriptionHeadings = new Set(["Основа", "Состав композиции", "Форма", "Размер", "Назначение"]);

export function ProductDetail({ product, categories, relatedProducts = [] }: { product: Product; categories: Category[]; relatedProducts?: Product[] }) {
  const router = useRouter();
  const [variantId, setVariantId] = useState(product.variants[0]?.id || "");
  const [imageIndex, setImageIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [quickOpen, setQuickOpen] = useState(false);
  const categoryTrail = useMemo(() => {
    const trail: Category[] = [];
    let category = categories.find(item => item.id === product.categoryId);
    while (category) {
      trail.unshift(category);
      category = category.parentId ? categories.find(item => item.id === category?.parentId) : undefined;
    }
    return trail;
  }, [categories, product.categoryId]);
  const selectedVariant = product.variants.find(variant => variant.id === variantId);
  const variantAxes = useMemo(() => [...new Set(product.variants.flatMap(variant => Object.keys(variant.attributes || {})))], [product.variants]);
  const currentAttributes = { ...product.attributes, ...(selectedVariant?.attributes || {}) };
  const price = selectedVariant?.price ?? product.price;
  const sku = product.sku;

  function selectVariantValue(key: string, value: string) {
    const selected = product.variants.find(variant =>
      variant.attributes[key] === value && Object.entries(selectedVariant?.attributes || {}).every(([other, selectedValue]) => other === key || variant.attributes[other] === selectedValue)
    ) || product.variants.find(variant => variant.attributes[key] === value);
    if (selected) setVariantId(selected.id);
  }

  async function addToCart() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/cart/items", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({productId:product.id,variantId:variantId || undefined,quantity:1}) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Не удалось добавить товар в корзину");
      setMessage("Товар добавлен в корзину"); window.dispatchEvent(new CustomEvent("favorit:cart", { detail:result.count }));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Не удалось добавить товар"); }
    finally { setBusy(false); }
  }

  return <div className="product-detail-page">
      <header className="product-detail-title-band"><div className="product-detail-title-inner">
        <Breadcrumbs items={[{name:"Каталог",href:"/catalog/"}, ...categoryTrail.map(item => ({name:item.name,href:item.path})), {name:product.name}]} />
        <h1>{product.name}</h1>
      </div></header>
      <div className="product-detail-layout">
        <section className="product-description" aria-label="Описание и характеристики">
          <div className="product-sku">Артикул: {sku || "—"}</div>
          {product.description && <div className="product-description-copy"><h2>Описание</h2>{product.description.split(/\n{2,}/).map((block,index) => {
            const text = block.trim();
            return text && (descriptionHeadings.has(text)
              ? <p key={`${index}-${text}`}><strong>{text}</strong></p>
              : <p key={`${index}-${text}`}>{text}</p>);
          })}</div>}
          {Object.keys(currentAttributes).length > 0 && <div className="product-specifications"><h2>Характеристики</h2><table className="attributes"><tbody>{Object.entries(currentAttributes).map(([name,value]) => <tr key={name}><th>{name}</th><td>{value}</td></tr>)}</tbody></table></div>}
        </section>
        <div className="product-gallery" aria-label="Фотографии товара">
          <div className="product-gallery-count">{product.images.length ? `${imageIndex + 1} / ${product.images.length}` : "0 / 0"}</div>
          <div className="product-gallery-stage">{product.images[imageIndex] && <img src={product.images[imageIndex]} alt={product.name} />}</div>
          {product.images.length > 1 && <div className="product-gallery-thumbnails">{product.images.map((image,index) => <button key={image} type="button" aria-label={`Фото ${index + 1}`} aria-pressed={imageIndex === index} onClick={() => setImageIndex(index)}><img src={image} alt="" /></button>)}</div>}
        </div>
        <aside className="product-purchase">
          {product.variants.length > 0 && <section className="variant-panel"><h2>Доступные варианты</h2>{variantAxes.length > 0 ? variantAxes.map(key => {
            const values = [...new Set(product.variants.map(variant => variant.attributes[key]).filter(Boolean))];
            return <div className="variant-axis" key={key}><strong>{key}</strong><div className="variant-list">{values.map(value => <button className={`variant-button ${selectedVariant?.attributes[key] === value ? "selected" : ""}`} key={value} type="button" onClick={() => selectVariantValue(key,value)} aria-pressed={selectedVariant?.attributes[key] === value}>{value}</button>)}</div></div>;
          }) : <div className="variant-list">{product.variants.map(variant => <button className={`variant-button ${variantId === variant.id ? "selected" : ""}`} key={variant.id} type="button" onClick={() => setVariantId(variant.id)} aria-pressed={variantId === variant.id}>{variant.name}</button>)}</div>}</section>}
          <section className="product-delivery-card"><h2>Фаворит Доставка</h2><p>Товар можно забрать самовывозом или заказать доставку</p><Link href="/company/usloviya-dostavki/">Подробнее о доставке</Link></section>
          <section className="product-buy-card"><div className="product-buy-heading"><strong>{formatPrice(price)}</strong><Link href="/contacts/">Нашли дешевле?</Link></div>
            <div className="product-actions"><button className="v-btn outline" onClick={() => setQuickOpen(true)}>Купить в 1 клик</button><button className="v-btn green" disabled={busy} onClick={addToCart}>{busy ? "Добавляем…" : "В корзину"}</button></div>
            <label className="product-assistance"><input type="checkbox" /> Нужна помощь с погребением</label>
            {message && <p className="message" role="status">{message} <Link href="/personal/cart/">Перейти в корзину</Link></p>}
          </section>
        </aside>
      </div>
      {relatedProducts.length > 0 && <section className="section-block"><div className="section-heading"><h2>Похожие товары</h2></div><ProductGrid products={relatedProducts} /></section>}
    {quickOpen && <QuickOrderModal product={product} variantId={variantId || undefined} onClose={() => setQuickOpen(false)} onDone={id => router.push(`/order/${encodeURIComponent(id)}/`)} />}
  </div>;
}

function QuickOrderModal({ product, variantId, onClose, onDone }: { product: Product; variantId?: string; onClose:()=>void; onDone:(id:string)=>void }) {
  const [phone, setPhone] = useState("");
  const [assistance, setAssistance] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/orders/quick", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId:product.id,variantId,phone,assistance,consent:true})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Не удалось отправить заявку");
      onDone(result.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Не удалось отправить заявку"); }
    finally { setBusy(false); }
  }
  return <div className="quick-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="quick-modal" role="dialog" aria-modal="true" aria-labelledby="quick-title"><div className="panel-header"><h2 id="quick-title">Купить в 1 клик</h2><button className="panel-close" aria-label="Закрыть" onClick={onClose}>×</button></div><p>{product.name}</p><form onSubmit={submit}><label className="form-field">Телефон<input required type="tel" autoComplete="tel" placeholder="+7" value={phone} onChange={event => setPhone(event.target.value)} /></label><label><input type="checkbox" checked={assistance} onChange={event => setAssistance(event.target.checked)} /> Нужна помощь с организацией погребения</label><label><input required type="checkbox" /> Согласен на обработку персональных данных</label><button className="v-btn green" disabled={busy}>{busy ? "Отправляем…" : "Отправить заявку"}</button>{error && <p className="error-message" role="alert">{error}</p>}</form></section></div>;
}
