"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    const form = new FormData(event.currentTarget);
    const formElement = event.currentTarget;
    try {
      const response = await fetch("/api/contact-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name") || ""),
          phone: String(form.get("phone") || ""),
          email: String(form.get("email") || ""),
          message: String(form.get("message") || ""),
          consent: form.get("consent") === "on",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Не удалось отправить обращение");
      formElement.reset();
      setMessage("Обращение отправлено. Мы свяжемся с вами по указанному телефону.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось отправить обращение");
    } finally {
      setBusy(false);
    }
  }

  return <section className="contact-form-wrap">
    <h2>Обратная связь</h2>
    <form className="contact-request-form" onSubmit={submit}>
      <label className="sr-only" htmlFor="contact-name">Имя</label>
      <input id="contact-name" name="name" placeholder="Имя" required maxLength={120} autoComplete="name" />
      <label className="sr-only" htmlFor="contact-phone">Телефон</label>
      <input id="contact-phone" name="phone" type="tel" placeholder="+7 (XXX) XXX - XX - XX" required maxLength={40} autoComplete="tel" />
      <label className="sr-only" htmlFor="contact-email">Email</label>
      <input id="contact-email" name="email" type="email" placeholder="Email" required maxLength={254} autoComplete="email" />
      <label className="sr-only" htmlFor="contact-message">Сообщение</label>
      <textarea id="contact-message" name="message" placeholder="Сообщение" required maxLength={3000} />
      <label className="contact-consent"><input name="consent" type="checkbox" required /> <span>Даю согласие на <Link href="/politika-bezopasnosti/">обработку своих персональных данных</Link></span></label>
      {error && <p className="error-message" role="alert">{error}</p>}
      {message && <p className="contact-success" role="status">{message}</p>}
      <button className="v-btn green" type="submit" disabled={busy}>{busy ? "Отправляем…" : "Отправить"}</button>
    </form>
  </section>;
}
