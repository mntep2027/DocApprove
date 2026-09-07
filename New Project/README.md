# DocApprove

Приложение для согласования документов командами и организациями.

## Быстрый старт

1. Установите Node.js LTS.
2. Создайте проект в Supabase и скопируйте значения из его настроек в `.env.local` по шаблону `.env.example`.
3. Установите зависимости и запустите приложение:


```bash
npm install
npm run dev
```

Откройте http://localhost:3000.

## Команды

- `npm run dev` — локальная разработка.
- `npm run lint` — ESLint.
- `npm run typecheck` — проверка TypeScript.
- `npm run build` — production-сборка.
- `npm run seed` — заполнение базы демо-данными после настройки Supabase.
- `npm run test:security` — проверка изоляции данных между пользователями.

Изменения базы данных добавляются отдельными SQL-файлами в `supabase/migrations/`. Уже применённые миграции не изменяются.
