# Decision Supporter — Документація проєкту

> Система підтримки прийняття рішень на базі React, TypeScript та Firebase

---

## Зміст

1. [Огляд проєкту](#1-огляд-проєкту)
2. [Технологічний стек](#2-технологічний-стек)
3. [Архітектура проєкту](#3-архітектура-проєкту)
4. [Структура файлів](#4-структура-файлів)
5. [Модель даних](#5-модель-даних)
6. [Компоненти](#6-компоненти)
7. [Сервіси](#7-сервіси)
8. [Firebase та автентифікація](#8-firebase-та-автентифікація)
9. [Аналітичний модуль](#9-аналітичний-модуль)
10. [Безпека (Firestore Rules)](#10-безпека-firestore-rules)
11. [Встановлення та запуск](#11-встановлення-та-запуск)
12. [Скрипти](#12-скрипти)

---

## 1. Огляд проєкту

**Decision Supporter** — це веб-застосунок для структурованого прийняття рішень. Він дозволяє користувачам:

- визначати **альтернативи** (варіанти вибору);
- задавати **критерії** оцінювання з вагами та типами (`максимізація` / `мінімізація`);
- заповнювати **матрицю оцінювання** — числові значення для кожної пари альтернатива / критерій;
- отримувати **автоматичний рейтинг** альтернатив за одним із трьох математичних методів.

Усі дані синхронізуються в реальному часі через **Cloud Firestore**, а доступ захищений автентифікацією через **Google OAuth**.

---

## 2. Технологічний стек

| Категорія        | Технологія                          |
| ---------------- | ----------------------------------- |
| UI-фреймворк     | React 19                            |
| Мова             | TypeScript 5.8                      |
| Збирач           | Vite 6                              |
| Стилізація       | Tailwind CSS 4                      |
| Іконки           | Lucide React                        |
| Анімації         | Motion (Framer Motion)              |
| База даних       | Firebase Firestore                  |
| Автентифікація   | Firebase Auth (Google Provider)     |
| Хостинг / деплой | Сумісний із Firebase Hosting / Vite |

---

## 3. Архітектура проєкту

```
Користувач
    │
    ▼
AuthScreen (Google OAuth)
    │
    ▼
App.tsx ──────────────────────────────────────┐
    │                                          │
    ├── Sidebar                                │
    │   ├── Дашборд                            │
    │   ├── Альтернативи                       │
    │   └── Критерії                           │
    │                                          │
    ├── Dashboard ◄──── Realtime Firestore     │
    │   ├── AnalyticalService                  │
    │   └── EvaluationMatrix                   │
    │                                          │
    ├── AlternativeManager ◄── decisionService │
    └── CriterionManager   ◄── decisionService │
                                               │
decisionService.ts ────────────────────────────┘
    │
    ▼
Cloud Firestore
  ├── /alternatives/{id}
  ├── /criteria/{id}
  └── /evaluations/{altId}_{critId}
```

### Потік даних

1. `App.tsx` підписується (`onSnapshot`) на три колекції Firestore через `decisionService`.
2. Стан (`alternatives`, `criteria`, `evaluations`) зберігається в React-стані та передається дочірнім компонентам через props.
3. Будь-яка зміна (додавання, редагування, видалення) негайно відображається у всіх з'єднаних вкладках.

---

## 4. Структура файлів

```
/
├── src/
│   ├── App.tsx                     # Корінь застосунку, стан, маршрутизація вкладок
│   ├── main.tsx                    # Точка входу React
│   ├── index.css                   # Глобальні стилі (імпорт Tailwind)
│   ├── types.ts                    # TypeScript-інтерфейси
│   ├── firebase.ts                 # Ініціалізація Firebase, допоміжні функції
│   ├── services/
│   │   └── decisionService.ts      # CRUD + Realtime subscriptions
│   └── components/
│       ├── App.tsx                 # (головний компонент)
│       ├── AuthScreen.tsx          # Екран входу
│       ├── LoadingScreen.tsx       # Екран завантаження
│       ├── Sidebar.tsx             # Бічна панель навігації
│       ├── Dashboard.tsx           # Головний дашборд
│       ├── AlternativeManager.tsx  # CRUD для альтернатив
│       ├── CriterionManager.tsx    # CRUD для критеріїв
│       ├── EvaluationMatrix.tsx    # Матриця оцінювання
│       └── AnalyticalService.tsx   # Розрахунок рейтингу
├── firebase-applet-config.json     # Конфігурація Firebase
├── firebase-blueprint.json         # Схема колекцій Firestore
├── firestore.rules                 # Правила безпеки Firestore
├── index.html                      # HTML-шаблон
├── vite.config.ts                  # Конфігурація Vite
├── tsconfig.json                   # Конфігурація TypeScript
└── package.json
```

---

## 5. Модель даних

### `Alternative` — Альтернатива

```typescript
interface Alternative {
  id: string; // Унікальний ідентифікатор (генерується Firestore)
  name: string; // Назва альтернативи (обов'язково)
  description?: string; // Опис (необов'язково)
  createdAt: Timestamp; // Час створення
}
```

**Колекція Firestore:** `/alternatives/{alternativeId}`

---

### `Criterion` — Критерій

```typescript
interface Criterion {
  id: string; // Унікальний ідентифікатор
  name: string; // Назва критерію (обов'язково)
  type: 'maximize' | 'minimize'; // Тип: максимізація або мінімізація
  weight: number; // Вага від 0.1 до 1.0
  description?: string; // Опис (необов'язково)
  createdAt: Timestamp;
}
```

**Колекція Firestore:** `/criteria/{criterionId}`

---

### `Evaluation` — Оцінка

```typescript
interface Evaluation {
  alternative_id: string; // ID альтернативи
  criterion_id: string; // ID критерію
  value: number; // Числова оцінка
  updatedAt: Timestamp; // Час останнього оновлення
}
```

**Колекція Firestore:** `/evaluations/{alternativeId}_{criterionId}`

> Ключ документа складається з двох ID, з'єднаних символом `_`.

---

## 6. Компоненти

### `App.tsx`

Кореневий компонент. Відповідає за:

- відстеження стану автентифікації (`onAuthStateChanged`);
- підписку на дані Firestore;
- перемикання між вкладками (`dashboard`, `alternatives`, `criteria`).

---

### `AuthScreen`

Екран входу. Показується неавтентифікованим користувачам.
Запускає `signInWithPopup` через Google OAuth.

---

### `LoadingScreen`

Анімований спінер, що відображається під час ініціалізації Firebase Auth.

---

### `Sidebar`

Фіксована бічна панель (ширина `256px`). Містить:

- логотип та назву застосунку;
- навігаційні кнопки;
- блок профілю користувача та кнопку виходу.

**Props:**
| Prop | Тип | Опис |
|------|-----|------|
| `user` | `User` | Об'єкт Firebase User |
| `activeTab` | `string` | Поточна активна вкладка |
| `setActiveTab` | `function` | Обробник зміни вкладки |

---

### `Dashboard`

Збирає та відображає:

- кількість альтернатив і критеріїв (статистичні картки);
- компонент `AnalyticalService`;
- компонент `EvaluationMatrix`.

---

### `AlternativeManager`

Повноцінний CRUD-менеджер для альтернатив.

**Функціонал:**

- додавання нової альтернативи через inline-форму;
- редагування назви та опису безпосередньо в списку;
- видалення альтернативи.

---

### `CriterionManager`

CRUD-менеджер для критеріїв. Розширює `AlternativeManager` додатковими полями:

- **Тип** (`maximize` / `minimize`) — обирається кнопками-перемикачами;
- **Вага** (від `0.1` до `1.0`) — числове поле з кроком `0.1`.

---

### `EvaluationMatrix`

Таблиця, де рядки — альтернативи, стовпці — критерії.
Кожна клітинка містить `<input type="number">`.

- Значення зберігається автоматично при введенні (`onChange`).
- Пустий стан показує підказку про необхідність додати дані.
- Горизонтальне прокручування для великих матриць.

---

### `AnalyticalService`

Головний модуль розрахунку рейтингу. Детальніше — у [розділі 9](#9-аналітичний-модуль).

---

## 7. Сервіси

### `decisionService` (`src/services/decisionService.ts`)

Централізований сервіс для роботи з Firestore. Усі методи є асинхронними або повертають функції відписки.

#### Альтернативи

```typescript
// Підписка на оновлення в реальному часі
subscribeToAlternatives(onUpdate: (alternatives: Alternative[]) => void): Unsubscribe

// Додати нову альтернативу
addAlternative(name: string, description?: string): Promise<void>

// Оновити альтернативу
updateAlternative(id: string, name: string, description?: string): Promise<void>

// Видалити альтернативу
deleteAlternative(id: string): Promise<void>
```

#### Критерії

```typescript
subscribeToCriteria(onUpdate: (criteria: Criterion[]) => void): Unsubscribe
addCriterion(name: string, type: 'maximize'|'minimize', weight: number, description?: string): Promise<void>
updateCriterion(id: string, name: string, type: 'maximize'|'minimize', weight: number, description?: string): Promise<void>
deleteCriterion(id: string): Promise<void>
```

#### Оцінки

```typescript
subscribeToEvaluations(onUpdate: (evaluations: Record<string, Evaluation>) => void): Unsubscribe
setEvaluation(alternativeId: string, criterionId: string, value: number): Promise<void>
```

> Метод `setEvaluation` використовує `setDoc` (upsert): створює запис, якщо він не існує, або перезаписує.

---

## 8. Firebase та автентифікація

### Конфігурація (`src/firebase.ts`)

```typescript
const app = initializeApp(firebaseConfig); // з firebase-applet-config.json
export const db = getFirestore(app, '(default)');
export const auth = getAuth(app);
```

### Автентифікація

```typescript
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => auth.signOut();
```

### Обробка помилок

Функція `handleFirestoreError` логує структуровану інформацію про помилку:

```typescript
{
  error: string,         // Текст помилки
  operationType: string, // CREATE | UPDATE | DELETE | GET | LIST | WRITE
  path: string | null,   // Шлях документа в Firestore
  authInfo: { ... }      // Інформація про поточного користувача
}
```

---

## 9. Аналітичний модуль

`AnalyticalService` підтримує три методи агрегації. Розрахунок відбувається у `useMemo` і запускається лише після заповнення **всіх** клітинок матриці.

### Крок 1 — Нормалізація значень

Для кожного критерію значення нормалізуються до діапазону `[0, 1]`:

```
maximize: normalized = (val - min) / (max - min)
minimize: normalized = (max - val) / (max - min)
```

Якщо всі значення однакові (range = 0), нормалізований результат дорівнює `1`.

Для мультиплікативного методу значення зміщуються у `[0.1, 1.0]`, щоб уникнути нуля:

```
normalized = normalized * 0.9 + 0.1
```

---

### Метод 1 — Адитивна згортка

**Формула:** `Q(Ai) = Σ (wj * xij)`

Зважена сума нормалізованих оцінок. Критерії можуть компенсувати один одного. Найбільш поширений метод.

---

### Метод 2 — Мультиплікативна згортка

**Формула:** `Q(Ai) = Π (xij ^ wj)`

Добуток нормалізованих оцінок, зведених до степеня ваги. Слабкі значення за будь-яким критерієм суттєво знижують загальний результат.

---

### Метод 3 — Обережна стратегія (мінімаксна)

**Формула:** `Q(Ai) = min(wj * xij)`

Оцінка визначається за найгіршим зваженим критерієм. Підходить для критично важливих рішень, де неприпустимий провал за будь-яким параметром.

---

### Крок 2 — Формування рейтингу

Усі альтернативи сортуються за спаданням нормалізованого балу. Перша альтернатива позначається як **«Найкращий вибір»**.

---

## 10. Безпека (Firestore Rules)

Правила визначені у файлі `firestore.rules`.

### Загальні принципи

| Колекція       | Read                  | Create           | Update           | Delete       |
| -------------- | --------------------- | ---------------- | ---------------- | ------------ |
| `alternatives` | auth                  | auth + валідація | auth + валідація | тільки admin |
| `criteria`     | auth                  | auth + валідація | auth + валідація | тільки admin |
| `evaluations`  | auth                  | auth + валідація | auth + валідація | тільки admin |
| `users`        | auth (свій) або admin | —                | —                | admin        |

### Визначення адміністратора

```javascript
function isAdmin() {
  return isAuthenticated() &&
    (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
     (request.auth.token.email == "misam5302@gmail.com" && request.auth.token.email_verified == true));
}
```

### Валідація даних

Кожна колекція має власний валідатор, що перевіряє:

- наявність обов'язкових полів (`hasRequiredFields`);
- відсутність зайвих полів (`hasOnlyAllowedFields`);
- типи та допустимі значення (`string`, `number`, `timestamp`, enum).

---

## 11. Встановлення та запуск

### Передумови

- Node.js ≥ 20
- npm або yarn
- Проєкт Firebase (Firestore + Authentication з Google Provider)

### Кроки

```bash
# 1. Клонувати репозиторій
git clone <repo-url>
cd decision-supporter

# 2. Встановити залежності
npm install

# 3. Налаштувати Firebase
# Відредагуйте firebase-applet-config.json або створіть .env.local
# зі змінними VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID тощо

# 4. Запустити в режимі розробки
npm run dev
# Застосунок доступний на http://localhost:5173

# 5. Продакшн-збірка
npm run build
```

### Конфігурація Firebase

Файл `firebase-applet-config.json` містить публічні параметри SDK:

```json
{
  "projectId": "...",
  "appId": "...",
  "apiKey": "...",
  "authDomain": "...",
  "storageBucket": "...",
  "messagingSenderId": "...",
  "measurementId": "..."
}
```

> **Увага:** `apiKey` у Firebase є публічним ідентифікатором і не є секретом. Безпека забезпечується правилами Firestore.

---

## 12. Скрипти

| Команда           | Опис                                             |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Запуск dev-сервера на порті 5173 (0.0.0.0)       |
| `npm run build`   | Продакшн-збірка у директорію `dist/`             |
| `npm run preview` | Перегляд продакшн-збірки локально                |
| `npm run lint`    | Перевірка TypeScript без емісії (`tsc --noEmit`) |
| `npm run clean`   | Видалення директорії `dist/`                     |
| `npm run format`  | Форматування коду за допомогою Prettier          |

---

## Форматування коду (Prettier)

У проєкті використовується [Prettier](https://prettier.io/) для автоматичного форматування коду.

- Конфігурація зберігається у файлі `.prettierrc`.
- Для форматування всіх файлів виконайте:

```bash
npm run format
```

Prettier автоматично застосовується до всіх `.ts`, `.tsx`, `.js`, `.json`, `.css` та інших підтримуваних файлів.

Рекомендується запускати форматування перед комітом змін для підтримки єдиного стилю коду.

---

## Pre-commit hook та lint-staged

У проєкті налаштовано автоматичну перевірку та форматування коду перед комітом за допомогою [Husky](https://typicode.github.io/husky/) та [lint-staged](https://github.com/okonet/lint-staged).

- Husky додає git-хук `pre-commit` (див. `.husky/pre-commit`), який запускає lint-staged.
- lint-staged застосовує ESLint та Prettier лише до змінених файлів:
  - `*.js` — ESLint з автофіксом
  - `*.js`, `*.css`, `*.md` — Prettier

Конфігурація lint-staged знаходиться у `package.json`:

```json
"lint-staged": {
  "*.js": "eslint --cache --fix",
  "*.{js,css,md}": "prettier --write"
}
```

Щоб husky працював, після встановлення залежностей виконайте:

```bash
npm run prepare
```

Тепер при кожному коміті код буде автоматично перевірятися та форматуватися.

## Додаток: типові сценарії використання

### Сценарій: вибір постачальника

1. **Альтернативи:** Постачальник A, Постачальник B, Постачальник C
2. **Критерії:**
   - Ціна (вага: 0.9, тип: мінімізація)
   - Якість (вага: 0.8, тип: максимізація)
   - Терміни доставки (вага: 0.6, тип: мінімізація)
3. **Матриця оцінювання:** заповнити числові значення для кожної пари
4. **Результат:** система автоматично нормалізує дані та визначить найкращого постачальника

### Сценарій: вибір технологічного стеку

1. Альтернативи: React, Vue, Angular
2. Критерії: Екосистема, Крива навчання, Продуктивність, Спільнота
3. Оцінки за шкалою 1–10
4. Аналіз за трьома методами для порівняння результатів

---

_Документація актуальна для версії `0.0.0` проєкту decision-supporter._
