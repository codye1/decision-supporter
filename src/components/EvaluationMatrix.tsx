import React, { useMemo, useState } from 'react';
import Papa from 'papaparse';
import { Alternative, Criterion, Evaluation } from '../types';
import { decisionService } from '../services/decisionService';

type ConsensusMethod = 'algebraic' | 'statistical' | 'pairwise';

interface ExpertSheet {
  id: string;
  name: string;
  url: string;
  weight: number;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
  parsed?: ParsedMatrix;
}

interface ParsedMatrix {
  values: Record<string, Record<string, number>>;
  missingAlternatives: string[];
  missingCriteria: string[];
  unknownAlternatives: string[];
  unknownCriteria: string[];
  invalidCells: number;
}

const METHOD_DESCRIPTIONS: Record<ConsensusMethod, string> = {
  algebraic:
    'Алгебраїчний (E7/E8): для кожної пари альтернатива-критерій шукаємо значення, яке мінімізує суму зважених відхилень. Це зважена медіана за компетентністю експертів і вона стійка до викидів.',
  statistical:
    'Статистичний (E1): рахуємо зважене середнє значень експертів як підсумкову оцінку, а також дисперсію для оцінки узгодженості. Висока дисперсія означає низьку згоду.',
  pairwise:
    'Попарні порівняння (E6): для кожного критерію порівнюємо альтернативи між собою у кожного експерта. Підсумкова оцінка - це кількість перемог у рядку матриці попарних порівнянь.',
};

const normalizeName = (value: string) => value.trim().toLowerCase();

const toCsvExportUrl = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (trimmed.includes('/export?format=csv')) return trimmed;

  try {
    const url = new URL(trimmed);
    if (!url.hostname.includes('docs.google.com')) return trimmed;
    const pathMatch = url.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
    if (!pathMatch) return trimmed;
    const sheetId = pathMatch[1];
    const gid = url.searchParams.get('gid') || url.hash.replace('#gid=', '') || '0';
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  } catch {
    return trimmed;
  }
};

const parseExpertSheet = (
  csvText: string,
  alternatives: Alternative[],
  criteria: Criterion[]
): ParsedMatrix => {
  const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
  const rows = parsed.data;
  const altLookup = new Map(
    alternatives.map((alt) => [normalizeName(alt.name), alt.id])
  );
  const critLookup = new Map(
    criteria.map((crit) => [normalizeName(crit.name), crit.id])
  );

  const values: Record<string, Record<string, number>> = {};
  const unknownAlternatives: string[] = [];
  const unknownCriteria: string[] = [];
  let invalidCells = 0;

  if (!rows || rows.length === 0) {
    return {
      values,
      missingAlternatives: alternatives.map((alt) => alt.name),
      missingCriteria: criteria.map((crit) => crit.name),
      unknownAlternatives,
      unknownCriteria,
      invalidCells,
    };
  }

  const header = rows[0] || [];
  const criteriaIds: string[] = [];

  for (let col = 1; col < header.length; col += 1) {
    const rawName = String(header[col] ?? '').trim();
    if (!rawName) continue;
    const mapped = critLookup.get(normalizeName(rawName));
    if (!mapped) {
      unknownCriteria.push(rawName);
      continue;
    }
    criteriaIds.push(mapped);
  }

  rows.slice(1).forEach((row) => {
    const rawAlt = String(row[0] ?? '').trim();
    if (!rawAlt) return;
    const altId = altLookup.get(normalizeName(rawAlt));
    if (!altId) {
      unknownAlternatives.push(rawAlt);
      return;
    }
    if (!values[altId]) values[altId] = {};

    for (let col = 1; col < header.length; col += 1) {
      const critId = criteriaIds[col - 1];
      if (!critId) continue;
      const val = Number.parseFloat(String(row[col] ?? '').trim());
      if (Number.isNaN(val)) {
        invalidCells += 1;
        continue;
      }
      values[altId][critId] = val;
    }
  });

  const missingAlternatives = alternatives
    .filter((alt) => !values[alt.id])
    .map((alt) => alt.name);
  const missingCriteria = criteria
    .filter((crit) => !criteriaIds.includes(crit.id))
    .map((crit) => crit.name);

  return {
    values,
    missingAlternatives,
    missingCriteria,
    unknownAlternatives,
    unknownCriteria,
    invalidCells,
  };
};

const weightedMedian = (values: number[], weights: number[]) => {
  const pairs = values
    .map((value, index) => ({ value, weight: weights[index] }))
    .filter((item) => !Number.isNaN(item.value) && item.weight > 0)
    .sort((a, b) => a.value - b.value);
  const totalWeight = pairs.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0 || pairs.length === 0) return null;
  let cumulative = 0;
  for (const item of pairs) {
    cumulative += item.weight;
    if (cumulative >= totalWeight / 2) {
      return item.value;
    }
  }
  return pairs[pairs.length - 1].value;
};

const weightedMean = (values: number[], weights: number[]) => {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight <= 0) return null;
  const sum = values.reduce((acc, value, index) => acc + value * weights[index], 0);
  return sum / totalWeight;
};

const weightedVariance = (values: number[], weights: number[], mean: number) => {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight <= 0) return null;
  const sum = values.reduce(
    (acc, value, index) => acc + weights[index] * (value - mean) ** 2,
    0
  );
  return sum / totalWeight;
};

interface EvaluationMatrixProps {
  alternatives: Alternative[];
  criteria: Criterion[];
  evaluations: Record<string, Evaluation>;
}

export const EvaluationMatrix: React.FC<EvaluationMatrixProps> = ({
  alternatives,
  criteria,
  evaluations,
}) => {
  const [experts, setExperts] = useState<ExpertSheet[]>([]);
  const [consensusMethod, setConsensusMethod] = useState<ConsensusMethod>('statistical');
  const [isImporting, setIsImporting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const addExpert = () => {
    setExperts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: `Експерт ${prev.length + 1}`,
        url: '',
        weight: 1,
        status: 'idle',
      },
    ]);
  };

  const updateExpert = (id: string, patch: Partial<ExpertSheet>) => {
    setExperts((prev) =>
      prev.map((expert) =>
        expert.id === id ? { ...expert, ...patch } : expert
      )
    );
  };

  const removeExpert = (id: string) => {
    setExperts((prev) => prev.filter((expert) => expert.id !== id));
  };

  const loadExperts = async () => {
    if (experts.length === 0) return;
    setIsImporting(true);
    try {
      await Promise.all(
        experts.map(async (expert) => {
          updateExpert(expert.id, { status: 'loading', error: undefined });
          try {
            const url = toCsvExportUrl(expert.url);
            if (!url) {
              updateExpert(expert.id, {
                status: 'error',
                error: 'Вкажіть посилання на таблицю.',
              });
              return;
            }
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error('Не вдалося завантажити таблицю.');
            }
            const text = await response.text();
            const parsed = parseExpertSheet(text, alternatives, criteria);
            updateExpert(expert.id, {
              status: 'ready',
              parsed,
              error: undefined,
            });
          } catch (error) {
            updateExpert(expert.id, {
              status: 'error',
              error:
                error instanceof Error
                  ? error.message
                  : 'Помилка завантаження таблиці.',
            });
          }
        })
      );
    } finally {
      setIsImporting(false);
    }
  };

  const consensusResults = useMemo(() => {
    if (experts.length === 0) return null;
    const readyExperts = experts.filter((expert) => expert.parsed);
    if (readyExperts.length === 0) return null;

    const values: Record<string, number> = {};
    const variance: Record<string, number> = {};

    if (consensusMethod === 'pairwise') {
      criteria.forEach((crit) => {
        const scores: Record<string, number> = {};
        alternatives.forEach((alt) => {
          scores[alt.id] = 0;
        });

        readyExperts.forEach((expert) => {
          const matrix = expert.parsed?.values || {};
          for (let i = 0; i < alternatives.length; i += 1) {
            for (let j = i + 1; j < alternatives.length; j += 1) {
              const altA = alternatives[i];
              const altB = alternatives[j];
              const valA = matrix[altA.id]?.[crit.id];
              const valB = matrix[altB.id]?.[crit.id];
              if (valA === undefined || valB === undefined) continue;

              if (valA === valB) {
                scores[altA.id] += 0.5;
                scores[altB.id] += 0.5;
              } else if (
                (crit.type === 'maximize' && valA > valB) ||
                (crit.type === 'minimize' && valA < valB)
              ) {
                scores[altA.id] += 1;
              } else {
                scores[altB.id] += 1;
              }
            }
          }
        });

        alternatives.forEach((alt) => {
          values[`${alt.id}_${crit.id}`] = scores[alt.id];
        });
      });

      return { values, variance };
    }

    alternatives.forEach((alt) => {
      criteria.forEach((crit) => {
        const itemValues: number[] = [];
        const itemWeights: number[] = [];

        readyExperts.forEach((expert) => {
          const value = expert.parsed?.values?.[alt.id]?.[crit.id];
          if (value === undefined) return;
          itemValues.push(value);
          itemWeights.push(expert.weight || 1);
        });

        if (itemValues.length === 0) return;

        if (consensusMethod === 'algebraic') {
          const median = weightedMedian(itemValues, itemWeights);
          if (median !== null) {
            values[`${alt.id}_${crit.id}`] = median;
          }
        } else {
          const mean = weightedMean(itemValues, itemWeights);
          if (mean !== null) {
            values[`${alt.id}_${crit.id}`] = mean;
            const varValue = weightedVariance(itemValues, itemWeights, mean);
            if (varValue !== null) {
              variance[`${alt.id}_${crit.id}`] = varValue;
            }
          }
        }
      });
    });

    return { values, variance };
  }, [experts, alternatives, criteria, consensusMethod]);

  const applyConsensus = async () => {
    if (!consensusResults) return;
    setIsApplying(true);
    try {
      const entries = Object.entries(consensusResults.values);
      await Promise.all(
        entries.map(([key, value]) => {
          const [altId, critId] = key.split('_');
          return decisionService.setEvaluation(altId, critId, value);
        })
      );
    } finally {
      setIsApplying(false);
    }
  };

  const formatValue = (value: number | undefined) => {
    if (value === undefined || Number.isNaN(value)) return '-';
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  };
  const handleValueChange = (altId: string, critId: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      decisionService.setEvaluation(altId, critId, numValue);
    }
  };

  if (alternatives.length === 0 || criteria.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <div className="max-w-md mx-auto">
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            Матриця оцінювання
          </h3>
          <p className="text-slate-500">
            Будь ласка, додайте хоча б одну **Альтернативу** та один
            **Критерій**, щоб почати оцінювання.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-800">
          Матриця оцінювання
        </h2>
        <span className="text-xs text-slate-400">
          Імпорт оцінок доступний нижче
        </span>
      </div>

      <div className="border-b border-slate-100 bg-white">
        <button
          type="button"
          onClick={() => setIsImportOpen((prev) => !prev)}
          className="w-full px-5 py-4 flex items-center justify-between text-left"
        >
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Імпорт оцінок експертів
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Кожен експерт має окрему Google Таблицю з матрицею
              альтернатив × критеріїв.
            </p>
          </div>
          <span className="text-xs font-semibold text-indigo-600">
            {isImportOpen ? 'Згорнути' : 'Розгорнути'}
          </span>
        </button>

        {isImportOpen && (
          <div className="px-5 pb-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                Додайте експертів і завантажте їхні таблиці.
              </div>
              <button
                type="button"
                onClick={addExpert}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Додати експерта
              </button>
            </div>

            <div className="text-xs text-slate-500">
              Ваги компетентності задаються у стовпці з числовим полем поруч із
              посиланням на таблицю (для кожного експерта окремо).
            </div>

          {experts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
              Додайте експертів, щоб завантажити оцінки.
            </div>
          ) : (
            <div className="space-y-3">
              {experts.map((expert) => (
                <div
                  key={expert.id}
                  className="rounded-lg border border-slate-200 p-3 grid grid-cols-1 lg:grid-cols-[160px_1fr_120px_120px] gap-3 items-center"
                >
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                    value={expert.name}
                    onChange={(event) =>
                      updateExpert(expert.id, { name: event.target.value })
                    }
                    placeholder="Експерт"
                  />
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                    value={expert.url}
                    onChange={(event) =>
                      updateExpert(expert.id, { url: event.target.value })
                    }
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit?gid=0"
                  />
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-center"
                    value={Number.isNaN(expert.weight) ? '' : expert.weight}
                    onChange={(event) =>
                      updateExpert(expert.id, {
                        weight: Number.parseFloat(event.target.value) || 1,
                      })
                    }
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] uppercase font-semibold ${
                        expert.status === 'ready'
                          ? 'text-emerald-600'
                          : expert.status === 'error'
                            ? 'text-rose-600'
                            : 'text-slate-400'
                      }`}
                    >
                      {expert.status === 'ready'
                        ? 'готово'
                        : expert.status === 'error'
                          ? 'помилка'
                          : expert.status === 'loading'
                            ? 'завантаження'
                            : 'очікування'}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeExpert(expert.id)}
                      className="text-xs text-rose-500 hover:text-rose-600"
                    >
                      Видалити
                    </button>
                  </div>
                  {expert.error && (
                    <div className="lg:col-span-4 text-xs text-rose-600">
                      {expert.error}
                    </div>
                  )}
                  {expert.parsed && (
                    <div className="lg:col-span-4 text-[11px] text-slate-500">
                      Пропущені альтернативи: {expert.parsed.missingAlternatives.length};
                      пропущені критерії: {expert.parsed.missingCriteria.length};
                      невідомі альтернативи: {expert.parsed.unknownAlternatives.length};
                      невідомі критерії: {expert.parsed.unknownCriteria.length};
                      некоректні клітинки: {expert.parsed.invalidCells}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-4 items-start">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">
                Метод узгодження
              </label>
              <select
                value={consensusMethod}
                onChange={(event) =>
                  setConsensusMethod(event.target.value as ConsensusMethod)
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="algebraic">Алгебраїчний (зважена медіана)</option>
                <option value="statistical">Статистичний (середнє + дисперсія)</option>
                <option value="pairwise">Попарні порівняння (E6)</option>
              </select>
              <p className="text-xs text-slate-500">
                {METHOD_DESCRIPTIONS[consensusMethod]}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={loadExperts}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                disabled={isImporting || experts.length === 0}
              >
                {isImporting ? 'Завантаження...' : 'Завантажити таблиці'}
              </button>
              <button
                type="button"
                onClick={applyConsensus}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                disabled={!consensusResults || isApplying}
              >
                {isApplying ? 'Застосування...' : 'Застосувати узгоджені оцінки'}
              </button>
            </div>
          </div>

          {consensusResults && (
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                Отримано узгоджені оцінки для {Object.keys(consensusResults.values).length} комірок.
                {consensusMethod === 'statistical' && (
                  <span> Дисперсія доступна як індикатор узгодженості.</span>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-white flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800">
                    Попередній перегляд узгоджених оцінок
                  </h4>
                  <span className="text-xs text-slate-400">
                    Ще не застосовано
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-r border-slate-100 min-w-[180px]">
                          Альтернатива / Критерій
                        </th>
                        {criteria.map((crit) => (
                          <th
                            key={crit.id}
                            className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 min-w-[120px]"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <span>{crit.name}</span>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                                  crit.type === 'maximize'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-indigo-100 text-indigo-700'
                                }`}
                              >
                                {crit.type === 'maximize' ? 'макс' : 'мін'}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {alternatives.map((alt) => (
                        <tr key={alt.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 border-r border-slate-100">
                            <div className="font-medium text-slate-900">{alt.name}</div>
                          </td>
                          {criteria.map((crit) => {
                            const key = `${alt.id}_${crit.id}`;
                            const value = consensusResults.values[key];
                            return (
                              <td key={crit.id} className="p-3 text-center text-sm text-slate-700">
                                {formatValue(value)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="p-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-r border-slate-100 min-w-[200px]">
                Альтернатива / Критерій
              </th>
              {criteria.map((crit) => (
                <th
                  key={crit.id}
                  className="p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 min-w-[120px]"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span>{crit.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full ${crit.type === 'maximize' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}
                    >
                      {crit.type === 'maximize' ? 'макс' : 'мін'}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {alternatives.map((alt) => (
              <tr
                key={alt.id}
                className="hover:bg-slate-50/50 transition-colors"
              >
                <td className="p-4 border-r border-slate-100">
                  <div className="font-medium text-slate-900">{alt.name}</div>
                  {alt.description && (
                    <div className="text-xs text-slate-400 truncate max-w-[180px]">
                      {alt.description}
                    </div>
                  )}
                </td>
                {criteria.map((crit) => {
                  const evalKey = `${alt.id}_${crit.id}`;
                  const evaluation = evaluations[evalKey];
                  return (
                    <td key={crit.id} className="p-2 text-center">
                      <input
                        type="number"
                        className="w-full max-w-[100px] p-2 text-center border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all hover:border-slate-300"
                        value={evaluation?.value ?? ''}
                        onChange={(e) =>
                          handleValueChange(alt.id, crit.id, e.target.value)
                        }
                        placeholder="-"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
        Значення зберігаються автоматично під час введення.
      </div>
    </div>
  );
};
