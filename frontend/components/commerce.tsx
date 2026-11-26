"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/catalog-shared";
import { formatPrice } from "@/lib/catalog-shared";
import { Breadcrumbs } from "@/components/storefront";
import { ContentTitleBand } from "@/components/page-title";

type CartLine = { lineId:string; productId:string; variantId?:string|null; product:Product; quantity:number; unitPrice:number; total:number };
type Cart = { items:CartLine[]; subtotal:number; count:number };
type DeliveryOption = { id:"courier"|"pickup"; name:string; description?:string; price:number; freeFrom?:number|null };
type CheckoutOptions = { delivery:DeliveryOption[]; payment:{id:"cash"|"online";name:string}[] };
const blankCart: Cart = { items:[], subtotal:0, count:0 };

export function CartPage() {
  const [cart,setCart] = useState<Cart>(blankCart);
  const [busy,setBusy] = useState("");
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(true);
  async function refresh() { try { const response = await fetch("/api/cart"); if (response.ok) setCart(await response.json()); } catch {} finally { setLoading(false); } }
  useEffect(() => { void refresh(); }, []);
  async function mutate(line:CartLine, method:"PATCH"|"DELETE", quantity?:number) {
    setBusy(line.lineId); setError("");
    try { const response = await fetch(`/api/cart/items/${encodeURIComponent(line.lineId)}`, {method,headers:{"Content-Type":"application/json"},...(method === "PATCH" ? {body:JSON.stringify({quantity})} : {})}); const data=await response.json(); if(!response.ok) throw new Error(data.error||"Не удалось изменить корзину"); setCart(data); window.dispatchEvent(new CustomEvent("favorit:cart",{detail:data.count})); }
    catch(err){setError(err instanceof Error?err.message:"Не удалось изменить корзину");} finally {setBusy("");}
  }
  return <><ContentTitleBand title="Моя корзина" /><main className="cart-page">
    {loading ? <div className="cart-empty-state">Загружаем корзину…</div> : !cart.items.length ? <div className="cart-empty-state"><svg aria-hidden="true" viewBox="0 0 48 48"><path d="M10 17h28l-2 25H12l-2-25Z"/><path d="M17 18v-5a7 7 0 0 1 14 0v5"/></svg><p>Ваша корзина пуста</p><Link className="v-btn outline" href="/catalog/">вернуться к покупкам</Link></div> : <>
      <div className="cart-list">{cart.items.map(line => <article className="cart-row" key={line.lineId} data-testid="cart-item">
        <Link href={line.product.path}>{line.product.images?.[0] && <img src={line.product.images[0]} alt="" />}</Link>
        <div><h3><Link href={line.product.path}>{line.product.name}</Link></h3><span>{formatPrice(line.unitPrice)}</span></div>
        <div className="cart-actions"><div className="quantity-control"><button aria-label={`Уменьшить количество ${line.product.name}`} onClick={() => void mutate(line,"PATCH",Math.max(1,line.quantity-1))} disabled={busy===line.lineId||line.quantity<=1}>−</button><span>{line.quantity}</span><button aria-label={`Увеличить количество ${line.product.name}`} onClick={() => void mutate(line,"PATCH",line.quantity+1)} disabled={busy===line.lineId}>+</button></div><strong>{formatPrice(line.total)}</strong><button className="remove-line" onClick={() => void mutate(line,"DELETE")} disabled={busy===line.lineId}>Удалить</button></div>
      </article>)}</div>
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="cart-summary"><strong>Итого: {formatPrice(cart.subtotal)}</strong><Link className="v-btn green" href="/personal/order/make/">Перейти к оформлению</Link></div>
    </>}
  </main></>;
}

export function CheckoutPage() {
  const router=useRouter();
  const [cart,setCart]=useState<Cart>(blankCart);
  const [cartLoaded,setCartLoaded]=useState(false);
  const [options,setOptions]=useState<CheckoutOptions>({delivery:[{id:"courier",name:"Курьер",price:0},{id:"pickup",name:"Самовывоз",price:0}],payment:[{id:"cash",name:"Оплата при получении"}]});
  const [delivery,setDelivery]=useState<"courier"|"pickup">("courier");
  const [payment,setPayment]=useState<"cash"|"online">("cash");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  useEffect(()=>{Promise.all([fetch("/api/cart").then(r=>r.ok?r.json():blankCart),fetch("/api/checkout/options").then(r=>r.ok?r.json():null)]).then(([cartData,optionData])=>{setCart(cartData);setCartLoaded(true);if(!cartData.items.length){router.replace("/personal/cart/");return;}if(optionData?.delivery?.length){setOptions(optionData);setDelivery(optionData.delivery[0].id);setPayment(optionData.payment?.[0]?.id||"cash");}}).catch(()=>setCartLoaded(true));},[router]);
  const selectedDelivery=options.delivery.find(item=>item.id===delivery);
  const deliveryPrice=selectedDelivery?.freeFrom && cart.subtotal >= selectedDelivery.freeFrom ? 0 : selectedDelivery?.price || 0;
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError("");const form=new FormData(event.currentTarget);const idempotencyKey=crypto.randomUUID();const payload={name:String(form.get("name")||""),email:String(form.get("email")||""),phone:String(form.get("phone")||""),city:String(form.get("city")||""),address:String(form.get("address")||""),delivery,payment,comment:String(form.get("comment")||""),consent:form.get("consent")==="on",idempotencyKey};try{const response=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":idempotencyKey},body:JSON.stringify(payload)});const result=await response.json();if(!response.ok)throw new Error(result.error||"Не удалось оформить заказ");if(result.paymentUrl){window.location.href=result.paymentUrl;return;}router.push(`/order/${encodeURIComponent(result.id)}/`);}catch(err){setError(err instanceof Error?err.message:"Не удалось оформить заказ");}finally{setBusy(false);}}
  return <><ContentTitleBand title="Оформление заказа" /><main className="page-wrap checkout-page">
    {!cartLoaded ? <div className="empty-state">Загружаем оформление…</div> : !cart.items.length ? <div className="empty-state">Корзина пуста. <Link href="/catalog/">Перейти в каталог</Link></div> : <div className="checkout-layout"><form className="checkout-form" data-testid="checkout-form" onSubmit={submit}>
      <h2>Контактные данные</h2><div className="form-grid"><label className="form-field">Имя<input name="name" required autoComplete="name" /></label><label className="form-field">Email<input name="email" type="email" required autoComplete="email" /></label><label className="form-field">Телефон<input name="phone" type="tel" defaultValue="+7" required autoComplete="tel" /></label><label className="form-field">Город<input name="city" defaultValue="Москва" required autoComplete="address-level2" /></label>{delivery==="courier"&&<label className="form-field full">Адрес<input name="address" required autoComplete="street-address" /></label>}<label className="form-field full">Комментарий<textarea name="comment" /></label></div>
      <h2>Способ доставки</h2><div className="radio-list" role="group" aria-label="Способ доставки">{options.delivery.map(option=><label className="radio-card" key={option.id}><input type="radio" name="delivery" value={option.id} checked={delivery===option.id} onChange={()=>setDelivery(option.id)} /><span><strong>{option.name}</strong>{option.description&&<><br/>{option.description}</>}</span></label>)}</div>
      <h2>Способ оплаты</h2><div className="radio-list" role="group" aria-label="Способ оплаты">{options.payment.map(option=><label className="radio-card" key={option.id}><input type="radio" name="payment" value={option.id} checked={payment===option.id} onChange={()=>setPayment(option.id)} /><span>{option.name}{option.id==="online"&&<small className="notice">Только тестовая оплата. Деньги не списываются.</small>}</span></label>)}</div>
      <label className="consent"><input name="consent" type="checkbox" required /> Соглашаюсь на <Link href="/politika-bezopasnosti/">обработку персональных данных</Link></label>{error&&<p className="error-message" role="alert">{error}</p>}<button className="v-btn green" disabled={busy} data-testid="checkout-submit">{busy?"Оформляем…":"Подтвердить заказ"}</button>
    </form><aside className="order-summary"><h2>Ваш заказ</h2>{cart.items.map(line=><div className="summary-line" key={line.lineId}><span>{line.product.name} × {line.quantity}</span><strong>{formatPrice(line.total)}</strong></div>)}<div className="summary-line"><span>Доставка</span><strong>{deliveryPrice?formatPrice(deliveryPrice):"Бесплатно"}</strong></div><div className="summary-total"><span>Итого</span><strong>{formatPrice(cart.subtotal+deliveryPrice)}</strong></div></aside></div>}
  </main></>;
}

export function PaymentPage({ reference }: { reference:string }) {
  const [status,setStatus]=useState("Загружаем тестовый платёж…");
  const [busy,setBusy]=useState(false);
  useEffect(()=>{fetch(`/api/payments/test/${encodeURIComponent(reference)}`).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||"Недоступно");setStatus(data.status==="paid"?"Оплата прошла успешно":"Тестовый платёж ожидает подтверждения");}).catch(err=>setStatus(err.message));},[reference]);
  async function pay(result:"paid"|"failed"){setBusy(true);try{const response=await fetch(`/api/payments/test/${encodeURIComponent(reference)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({result})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Недоступно");setStatus(data.status==="paid"?"Оплата прошла успешно":"Платёж не завершён");}catch(err){setStatus(err instanceof Error?err.message:"Недоступно");}finally{setBusy(false);}}
  return <div className="page-wrap"><Breadcrumbs items={[{name:"Тестовая оплата"}]} /><section className="payment-result"><h1 className="page-title">Тестовая оплата</h1><p data-testid="test-payment-status">{status}</p>{status.includes("ожидает")&&<div className="product-actions"><button className="v-btn green" disabled={busy} onClick={()=>void pay("paid")}>Оплатить тестовый заказ</button><button className="v-btn outline" disabled={busy} onClick={()=>void pay("failed")}>Отметить как неуспешный</button></div>}{status.includes("успешно")&&<Link className="v-btn green" href="/personal/cart/">Вернуться в магазин</Link>}</section></div>;
}

export function OrderResultPage({ id }: {id:string}) {
  const [order,setOrder]=useState<{number:string;status:string;paymentStatus:string;total:number}|null>(null);
  const [message,setMessage]=useState("Загружаем заказ…");
  useEffect(()=>{fetch(`/api/orders/${encodeURIComponent(id)}`).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||"Заказ не найден");setOrder(data);setMessage("");}).catch(err=>setMessage(err.message));},[id]);
  return <div className="page-wrap"><Breadcrumbs items={[{name:"Заказ"}]} /><section className="order-success"><h1 className="page-title">Заказ принят</h1>{order?<><p>Номер заказа: <strong>{order.number}</strong></p><p>Статус: {order.status}</p><p>Оплата: {order.paymentStatus}</p><p>Сумма: {formatPrice(order.total)}</p></>:<p role="status">{message}</p>}<Link className="v-btn outline" href="/catalog/">Вернуться в каталог</Link></section></div>;
}
