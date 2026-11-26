"use client";

import { useState, type FormEvent } from "react";

const inputStyle = {
  boxSizing: "border-box" as const,
  width: "100%",
  padding: "12px 13px",
  borderRadius: 7,
  border: "1px solid #d9d5d1",
  fontSize: 16,
};

export function AdminLoginForm({ registrationUrl }: { registrationUrl?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error("Не удалось войти. Проверьте данные.");
      window.location.replace("/admin");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Не удалось войти. Проверьте данные.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame title="Вход администратора" onSubmit={handleSubmit}>
      <label htmlFor="admin-email" className="auth-label">
        Email
      </label>
      <input
        id="admin-email"
        name="email"
        type="email"
        autoComplete="username"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        style={inputStyle}
      />
      <label htmlFor="admin-password" className="auth-label">
        Пароль
      </label>
      <input
        id="admin-password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        style={inputStyle}
      />
      {error && <p role="alert" className="auth-error">{error}</p>}
      <button className="auth-submit" type="submit" disabled={busy}>
        {busy ? "Входим…" : "Войти"}
      </button>
      {registrationUrl && <p><a href={registrationUrl}>Первая регистрация</a></p>}
    </AuthFrame>
  );
}

export function AdminRegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bootstrapToken, setBootstrapToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/admin/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, bootstrapToken }),
      });
      if (!response.ok)
        throw new Error("Не удалось создать администратора. Проверьте данные.");

      const loginPath = window.location.pathname.replace(/\/register\/?$/, "");
      window.location.replace(loginPath);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Не удалось создать администратора. Проверьте данные.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame title="Создать администратора" onSubmit={handleSubmit}>
      <label htmlFor="register-email" className="auth-label">
        Email
      </label>
      <input
        id="register-email"
        name="email"
        type="email"
        autoComplete="username"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        style={inputStyle}
      />
      <label htmlFor="register-password" className="auth-label">
        Пароль
      </label>
      <input
        id="register-password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={15}
        maxLength={256}
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        style={inputStyle}
      />
      <label htmlFor="register-bootstrap" className="auth-label">
        Код регистрации
      </label>
      <input
        id="register-bootstrap"
        name="bootstrapToken"
        type="password"
        autoComplete="off"
        minLength={64}
        maxLength={64}
        pattern="[A-Fa-f0-9]{64}"
        required
        value={bootstrapToken}
        onChange={(event) => setBootstrapToken(event.target.value)}
        style={inputStyle}
      />
      {error && <p role="alert" className="auth-error">{error}</p>}
      <button className="auth-submit" type="submit" disabled={busy}>
        {busy ? "Создаём…" : "Создать администратора"}
      </button>
    </AuthFrame>
  );
}

function AuthFrame({
  title,
  onSubmit,
  children,
}: {
  title: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <main className="admin-auth-page">
      <form className="admin-auth-card" onSubmit={onSubmit}>
        <h1>{title}</h1>
        <p className="admin-auth-brand">Завод «Фаворит»</p>
        {children}
      </form>
      <style jsx>{`
        .admin-auth-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 18px;
          box-sizing: border-box;
          background: #f4f1ed;
          font-family: Arial, sans-serif;
        }
        .admin-auth-card {
          width: min(420px, 100%);
          padding: 32px;
          box-sizing: border-box;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 12px 36px #29201218;
        }
        .admin-auth-card h1 {
          margin: 0;
          font-size: 24px;
        }
        .admin-auth-brand {
          margin: 8px 0 22px;
          color: #6d6a66;
        }
        .auth-label {
          display: block;
          margin: 16px 0 6px;
        }
        .auth-submit {
          width: 100%;
          margin-top: 22px;
          padding: 12px 13px;
          border: 0;
          border-radius: 7px;
          background: #851d2a;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }
        .auth-submit:disabled {
          opacity: 0.7;
          cursor: wait;
        }
        .auth-error {
          color: #a3182b;
        }
      `}</style>
    </main>
  );
}
