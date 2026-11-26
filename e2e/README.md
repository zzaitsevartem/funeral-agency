# Локальные E2E

Запускаются через nginx с настоящими PostgreSQL и Redis на отдельном тестовом стенде. Требуется Google Chrome, Node.js, `PAYMENT_MODE=test` и `SEED_DEMO=true` на сервере; тестовая учётная запись администратора задаётся переменными. Тесты создают уникальные данные и не очищают общую базу. Никогда не указывайте production.

```sh
npm ci --prefix e2e
set -a
. /path/to/private-e2e.env
set +a
npm test --prefix e2e
```

Для запуска стенда используйте собственный закрытый env-файл и отдельный проект Compose.

```sh
docker compose --env-file /path/to/private-e2e.env -p favorit-e2e up --build --wait
```

Укажите `APP_PORT=8081`, `BACKEND_PORT=4001`, `E2E_BASE_URL=http://127.0.0.1:8081`, `ADMIN_ORIGIN=http://127.0.0.1:8081`, `PAYMENT_MODE=test`, `SEED_DEMO=true` и отдельные `ADMIN_ENTRY_SLUG`, `ADMIN_JWT_SECRET`, `ADMIN_BOOTSTRAP_TOKEN`. Формат переменных описан в корневом README. `ADMIN_EMAIL` и `ADMIN_PASSWORD` — данные тестовой регистрации. Тестовый пароль должен содержать минимум 15 символов.

Тесты ограничивают адрес стенда локальным HTTP. Трассы и снимки отключены, чтобы не сохранять секреты регистрации и входа. На новой тестовой базе первый прогон регистрирует администратора. При повторе используется существующая тестовая учётная запись.
