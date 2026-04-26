import React from 'react';

export const ExpertRules: React.FC = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div>
      <h1 className="text-3xl font-bold text-slate-900">
        Експертна логіка (Правила)
      </h1>
      <p className="text-slate-500 mt-1">
        Візуальний розділ для майбутнього налаштування порогів та IF-THEN
        правил.
      </p>
    </div>

    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      Це попередній UI без функціоналу збереження та застосування правил.
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <h2 className="text-lg font-semibold text-slate-800">
            Порогові значення (відтинання)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Умови для відсікання альтернатив за ключовими критеріями.
          </p>
        </div>
        <div className="p-5 space-y-3">
          <div className="rounded-lg border border-slate-200 p-3 flex items-center justify-between gap-3">
            <div className="text-sm text-slate-700">
              Якщо <span className="font-semibold">Ціна</span>{' '}
              <span className="font-semibold">&gt;</span>{' '}
              <span className="font-semibold">50000</span>, виключити
              альтернативу
            </div>
            <span className="text-[11px] px-2 py-1 rounded-full bg-rose-100 text-rose-700 whitespace-nowrap">
              Відтинання
            </span>
          </div>

          <button
            type="button"
            disabled
            className="w-full rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-400 cursor-not-allowed"
          >
            + Додати поріг (скоро)
          </button>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <h2 className="text-lg font-semibold text-slate-800">IF-THEN правила</h2>
          <p className="text-sm text-slate-500 mt-1">
            Гнучкі експертні правила для автоматичної корекції оцінок.
          </p>
        </div>
        <div className="p-5 space-y-3">
          <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
            IF Надійність <span className="font-semibold">&lt; 6</span> THEN
            знизити підсумковий бал на{' '}
            <span className="font-semibold">15%</span>
          </div>

          <button
            type="button"
            disabled
            className="w-full rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-400 cursor-not-allowed"
          >
            + Створити IF-THEN правило (скоро)
          </button>
        </div>
      </section>
    </div>

    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <h2 className="text-lg font-semibold text-slate-800 mb-3">
        Підтримка правил (експертна логіка)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
            1
          </p>
          <p className="text-sm font-medium text-slate-800">
            Фільтрація альтернатив
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
            2
          </p>
          <p className="text-sm font-medium text-slate-800">Корекція оцінок</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
            3
          </p>
          <p className="text-sm font-medium text-slate-800">
            Вплив на фінальний результат
          </p>
        </div>
      </div>
    </section>
  </div>
);