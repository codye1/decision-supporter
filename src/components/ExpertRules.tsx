import React, { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import { Criterion, ExpertRule, RuleAction, RuleOperator } from '../types';
import { decisionService } from '../services/decisionService';

type VotingMethod = 'plurality' | 'borda' | 'copeland' | 'condorcet';

interface ExpertRulesProps {
  criteria: Criterion[];
  rules: ExpertRule[];
}

interface ScalePreset {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
}

interface ParsedProfile {
  criteriaNames: string[];
  expertsCount: number;
  ranksByCriterion: Record<string, number[]>;
  missingCriteria: string[];
  unknownCriteria: string[];
  invalidCells: number;
}

const SCALE_PRESETS: ScalePreset[] = [
  { id: 'scale-01-1', label: '0.1 - 1.0', min: 0.1, max: 1, step: 0.1 },
  { id: 'scale-0-1', label: '0 - 1', min: 0, max: 1, step: 0.05 },
  { id: 'scale-1-9', label: '1 - 9', min: 1, max: 9, step: 1 },
  { id: 'scale-1-10', label: '1 - 10', min: 1, max: 10, step: 1 },
];

const METHOD_DESCRIPTIONS: Record<VotingMethod, string> = {
  plurality:
    'Рахує лише перші місця. Перемагає критерій з найбільшою кількістю «1».',
  borda:
    'Кожне місце дає бали (останнє = 0, перше = m-1). Враховує всі ранги.',
  copeland:
    'Попарні порівняння критеріїв. Перемоги дають +1, поразки -1.',
  condorcet:
    'Переможець має виграти кожного суперника в попарних голосуваннях.',
};

const normalizeName = (value: string) => value.trim().toLowerCase();

const roundToStep = (value: number, step: number) => {
  if (!step || step <= 0) return value;
  const factor = 1 / step;
  return Math.round(value * factor) / factor;
};

const rankToWeight = (rank: number, total: number, scale: ScalePreset) => {
  if (total <= 0) return scale.min;
  const raw = (total - rank + 1) / total;
  const scaled = scale.min + raw * (scale.max - scale.min);
  return roundToStep(scaled, scale.step);
};

const buildProfile = (
  csvText: string,
  criteria: Criterion[]
): ParsedProfile => {
  const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
  const rows = parsed.data;
  if (!rows || rows.length === 0) {
    return {
      criteriaNames: [],
      expertsCount: 0,
      ranksByCriterion: {},
      missingCriteria: criteria.map((crit) => crit.name),
      unknownCriteria: [],
      invalidCells: 0,
    };
  }

  const header = rows[0] || [];
  const expertsCount = Math.max(header.length - 1, 0);
  const criteriaLookup = new Map(
    criteria.map((crit) => [normalizeName(crit.name), crit.name])
  );

  const ranksByCriterion: Record<string, number[]> = {};
  const unknownCriteria: string[] = [];
  let invalidCells = 0;

  rows.slice(1).forEach((row) => {
    const rawName = String(row[0] ?? '').trim();
    if (!rawName) return;
    const normalized = normalizeName(rawName);
    const canonicalName = criteriaLookup.get(normalized);
    if (!canonicalName) {
      unknownCriteria.push(rawName);
      return;
    }

    const ranks: number[] = [];
    for (let i = 1; i < header.length; i += 1) {
      const value = Number.parseInt(String(row[i] ?? '').trim(), 10);
      if (Number.isNaN(value)) {
        invalidCells += 1;
        ranks.push(NaN);
      } else {
        ranks.push(value);
      }
    }
    ranksByCriterion[canonicalName] = ranks;
  });

  const criteriaNames = Object.keys(ranksByCriterion);
  const missingCriteria = criteria
    .map((crit) => crit.name)
    .filter((name) => !criteriaNames.includes(name));

  return {
    criteriaNames,
    expertsCount,
    ranksByCriterion,
    missingCriteria,
    unknownCriteria,
    invalidCells,
  };
};

const computePlurality = (profile: ParsedProfile) => {
  const scores = profile.criteriaNames.map((name) => {
    const ranks = profile.ranksByCriterion[name] || [];
    const count = ranks.filter((rank) => rank === 1).length;
    return { name, score: count };
  });
  return scores.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
};

const computeBorda = (profile: ParsedProfile) => {
  const total = profile.criteriaNames.length;
  const scores = profile.criteriaNames.map((name) => {
    const ranks = profile.ranksByCriterion[name] || [];
    const score = ranks.reduce((sum, rank) => {
      if (Number.isNaN(rank)) return sum;
      return sum + (total - rank);
    }, 0);
    return { name, score };
  });
  return scores.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
};

const computePairwise = (profile: ParsedProfile) => {
  const names = profile.criteriaNames;
  const wins = new Map<string, number>();
  const scores = new Map<string, number>();

  names.forEach((name) => {
    wins.set(name, 0);
    scores.set(name, 0);
  });

  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const a = names[i];
      const b = names[j];
      const ranksA = profile.ranksByCriterion[a] || [];
      const ranksB = profile.ranksByCriterion[b] || [];
      let aBetter = 0;
      let bBetter = 0;
      const count = Math.min(ranksA.length, ranksB.length);
      for (let k = 0; k < count; k += 1) {
        const rankA = ranksA[k];
        const rankB = ranksB[k];
        if (Number.isNaN(rankA) || Number.isNaN(rankB)) continue;
        if (rankA < rankB) aBetter += 1;
        if (rankB < rankA) bBetter += 1;
      }
      if (aBetter > bBetter) {
        wins.set(a, (wins.get(a) || 0) + 1);
        scores.set(a, (scores.get(a) || 0) + 1);
        scores.set(b, (scores.get(b) || 0) - 1);
      } else if (bBetter > aBetter) {
        wins.set(b, (wins.get(b) || 0) + 1);
        scores.set(b, (scores.get(b) || 0) + 1);
        scores.set(a, (scores.get(a) || 0) - 1);
      }
    }
  }

  return { wins, scores };
};

const computeCopeland = (profile: ParsedProfile) => {
  const { scores } = computePairwise(profile);
  const results = profile.criteriaNames.map((name) => ({
    name,
    score: scores.get(name) || 0,
  }));
  return results.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
};

const computeCondorcet = (profile: ParsedProfile) => {
  const { wins, scores } = computePairwise(profile);
  const totalOpponents = Math.max(profile.criteriaNames.length - 1, 0);
  const winner = profile.criteriaNames.find(
    (name) => (wins.get(name) || 0) === totalOpponents
  );
  const results = profile.criteriaNames.map((name) => ({
    name,
    score: scores.get(name) || 0,
  }));
  const ordered = results.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  if (!winner) return { winner: null, ranking: ordered };
  const reordered = [
    ...ordered.filter((item) => item.name === winner),
    ...ordered.filter((item) => item.name !== winner),
  ];
  return { winner, ranking: reordered };
};

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

export const ExpertRules: React.FC<ExpertRulesProps> = ({ criteria, rules }) => {
  const [draftWeights, setDraftWeights] = useState<Record<string, number>>({});
  const [scalePresetId, setScalePresetId] = useState<string>('scale-01-1');
  const [selectedMethod, setSelectedMethod] = useState<VotingMethod>('borda');
  const [sheetId, setSheetId] = useState('');
  const [sheetGid, setSheetGid] = useState('0');
  const [csvUrl, setCsvUrl] = useState('');
  const [csvText, setCsvText] = useState('');
  const [importError, setImportError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [ruleCriterionId, setRuleCriterionId] = useState('');
  const [ruleOperator, setRuleOperator] = useState<RuleOperator>('>');
  const [ruleValue, setRuleValue] = useState<number | ''>('');
  const [ruleAction, setRuleAction] = useState<RuleAction>('exclude');
  const [ruleAdjustment, setRuleAdjustment] = useState<number | ''>('');
  const [ruleActive, setRuleActive] = useState(true);

  useEffect(() => {
    setDraftWeights((prev) => {
      const next = { ...prev };
      criteria.forEach((crit) => {
        if (typeof next[crit.id] !== 'number') {
          next[crit.id] = crit.weight ?? 1;
        }
      });
      return next;
    });
  }, [criteria]);

  useEffect(() => {
    if (!ruleCriterionId && criteria.length > 0) {
      setRuleCriterionId(criteria[0].id);
    }
  }, [criteria, ruleCriterionId]);

  const scalePreset = useMemo(
    () =>
      SCALE_PRESETS.find((preset) => preset.id === scalePresetId) ||
      SCALE_PRESETS[0],
    [scalePresetId]
  );

  const parsedProfile = useMemo(() => {
    if (!csvText.trim()) return null;
    return buildProfile(csvText, criteria);
  }, [csvText, criteria]);

  const voteResults = useMemo(() => {
    if (!parsedProfile || parsedProfile.criteriaNames.length === 0) return null;
    if (parsedProfile.invalidCells > 0) return null;
    switch (selectedMethod) {
      case 'plurality':
        return { ranking: computePlurality(parsedProfile), winner: null };
      case 'borda':
        return { ranking: computeBorda(parsedProfile), winner: null };
      case 'copeland':
        return { ranking: computeCopeland(parsedProfile), winner: null };
      case 'condorcet': {
        const result = computeCondorcet(parsedProfile);
        return { ranking: result.ranking, winner: result.winner };
      }
      default:
        return { ranking: computeBorda(parsedProfile), winner: null };
    }
  }, [parsedProfile, selectedMethod]);

  const weightResults = useMemo(() => {
    if (!voteResults) return null;
    const total = voteResults.ranking.length;
    return voteResults.ranking.map((item, index) => ({
      ...item,
      rank: index + 1,
      weight: rankToWeight(index + 1, total, scalePreset),
    }));
  }, [voteResults, scalePreset]);

  const handleResetWeights = () => {
    const next: Record<string, number> = {};
    criteria.forEach((crit) => {
      next[crit.id] = crit.weight ?? 1;
    });
    setDraftWeights(next);
  };

  const handleSaveWeights = async () => {
    if (criteria.length === 0) return;
    setIsSaving(true);
    try {
      await Promise.all(
        criteria.map((crit) =>
          decisionService.updateCriterion(
            crit.id,
            crit.name,
            crit.type,
            draftWeights[crit.id] ?? crit.weight ?? 1,
            crit.description,
            crit.thresholdMin,
            crit.thresholdMax
          )
        )
      );
    } finally {
      setIsSaving(false);
    }
  };

  const applyVotingWeights = async () => {
    if (!weightResults) return;
    if (selectedMethod === 'condorcet' && !voteResults?.winner) return;

    const criteriaMap = new Map(
      criteria.map((crit) => [normalizeName(crit.name), crit])
    );

    setIsSaving(true);
    try {
      await Promise.all(
        weightResults.map((item) => {
          const criterion = criteriaMap.get(normalizeName(item.name));
          if (!criterion) return Promise.resolve();
          return decisionService.updateCriterion(
            criterion.id,
            criterion.name,
            criterion.type,
            item.weight,
            criterion.description,
            criterion.thresholdMin,
            criterion.thresholdMax
          );
        })
      );
      setDraftWeights((prev) => {
        const next = { ...prev };
        weightResults.forEach((item) => {
          const criterion = criteriaMap.get(normalizeName(item.name));
          if (criterion) next[criterion.id] = item.weight;
        });
        return next;
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFetchCsv = async () => {
    setImportError('');
    setIsLoading(true);
    try {
      const url = csvUrl.trim()
        ? toCsvExportUrl(csvUrl)
        : sheetId.trim()
          ? `https://docs.google.com/spreadsheets/d/${sheetId.trim()}/export?format=csv&gid=${sheetGid.trim() || '0'}`
          : '';
      if (!url) {
        setImportError('Вкажіть посилання на таблицю або ID таблиці та GID.');
        setIsLoading(false);
        return;
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Не вдалося завантажити таблицю.');
      }
      const text = await response.text();
      setCsvText(text);
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : 'Помилка завантаження таблиці.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetRuleForm = () => {
    setRuleName('');
    setRuleCriterionId(criteria[0]?.id || '');
    setRuleOperator('>');
    setRuleValue('');
    setRuleAction('exclude');
    setRuleAdjustment('');
    setRuleActive(true);
  };

  const handleAddRule = async () => {
    if (!ruleCriterionId || ruleValue === '') return;
    const payload: Omit<ExpertRule, 'id' | 'createdAt' | 'name' | 'adjustmentPercent'> &
      Partial<Pick<ExpertRule, 'name' | 'adjustmentPercent'>> = {
      criterionId: ruleCriterionId,
      operator: ruleOperator,
      value: Number(ruleValue),
      action: ruleAction,
      active: ruleActive,
    };
    const trimmedName = ruleName.trim();
    if (trimmedName) {
      payload.name = trimmedName;
    }
    const adjustmentPercent =
      ruleAction === 'adjust' && ruleAdjustment !== ''
        ? Number(ruleAdjustment)
        : undefined;
    if (typeof adjustmentPercent === 'number') {
      payload.adjustmentPercent = adjustmentPercent;
    }
    await decisionService.addRule(payload);
    resetRuleForm();
    setIsAddingRule(false);
  };

  const startEditRule = (rule: ExpertRule) => {
    setEditingRuleId(rule.id);
    setRuleName(rule.name || '');
    setRuleCriterionId(rule.criterionId);
    setRuleOperator(rule.operator);
    setRuleValue(rule.value);
    setRuleAction(rule.action);
    setRuleAdjustment(
      typeof rule.adjustmentPercent === 'number' ? rule.adjustmentPercent : ''
    );
    setRuleActive(rule.active);
    setIsAddingRule(true);
  };

  const handleUpdateRule = async () => {
    if (!editingRuleId || !ruleCriterionId || ruleValue === '') return;
    const patch: Partial<ExpertRule> = {
      criterionId: ruleCriterionId,
      operator: ruleOperator,
      value: Number(ruleValue),
      action: ruleAction,
      active: ruleActive,
    };
    const trimmedName = ruleName.trim();
    patch.name = trimmedName ? trimmedName : '';
    const adjustmentPercent =
      ruleAction === 'adjust' && ruleAdjustment !== ''
        ? Number(ruleAdjustment)
        : undefined;
    if (typeof adjustmentPercent === 'number') {
      patch.adjustmentPercent = adjustmentPercent;
    }
    await decisionService.updateRule(editingRuleId, patch);
    setEditingRuleId(null);
    resetRuleForm();
    setIsAddingRule(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Формування моделі
        </h1>
        <p className="text-slate-500 mt-1">
          Керуйте вагами критеріїв вручну або через експертне голосування.
        </p>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Ваги критеріїв
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Задайте або відкоригуйте ваги вручну.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 uppercase">
              Шкала
            </label>
            <select
              value={scalePresetId}
              onChange={(event) => setScalePresetId(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              {SCALE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {criteria.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
              Додайте критерії, щоб керувати вагами.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {criteria.map((crit) => (
                <div
                  key={crit.id}
                  className="rounded-lg border border-slate-200 p-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-medium text-slate-900">{crit.name}</p>
                    <p className="text-xs text-slate-400">
                      Поточна вага: {crit.weight ?? 1}
                    </p>
                  </div>
                  <input
                    type="number"
                    min={scalePreset.min}
                    max={scalePreset.max}
                    step={scalePreset.step}
                    className="w-28 p-2 text-center border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={
                      typeof draftWeights[crit.id] === 'number'
                        ? draftWeights[crit.id]
                        : ''
                    }
                    onChange={(event) => {
                      const value = Number.parseFloat(event.target.value);
                      setDraftWeights((prev) => ({
                        ...prev,
                        [crit.id]: value,
                      }));
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={handleResetWeights}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              disabled={criteria.length === 0}
            >
              Скинути
            </button>
            <button
              type="button"
              onClick={handleSaveWeights}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              disabled={criteria.length === 0 || isSaving}
            >
              {isSaving ? 'Збереження...' : 'Зберегти ваги'}
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <h2 className="text-lg font-semibold text-slate-800">
            Визначення ваг через голосування
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Імпортуйте ранги експертів з Google Таблиць та виберіть метод
            агрегування.
          </p>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-500 uppercase">
                Метод голосування
              </label>
              <select
                value={selectedMethod}
                onChange={(event) =>
                  setSelectedMethod(event.target.value as VotingMethod)
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="plurality">Відносна більшість</option>
                <option value="borda">Метод Борда</option>
                <option value="copeland">Метод Копленда</option>
                <option value="condorcet">Метод Кондорсе</option>
              </select>
              <p className="text-xs text-slate-500">
                {METHOD_DESCRIPTIONS[selectedMethod]}
              </p>
              <p className="text-xs text-slate-400">
                Результат буде конвертовано у ваги за шкалою
                {` ${scalePreset.label}`}.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-500 uppercase">
                Посилання на Google Таблицю
              </label>
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/.../edit?gid=0"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={csvUrl}
                onChange={(event) => setCsvUrl(event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">
                Sheet ID
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={sheetId}
                onChange={(event) => setSheetId(event.target.value)}
                placeholder="1Abc..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">
                GID
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={sheetGid}
                onChange={(event) => setSheetGid(event.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleFetchCsv}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                disabled={isLoading}
              >
                {isLoading ? 'Завантаження...' : 'Завантажити таблицю'}
              </button>
            </div>
          </div>

          {importError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {importError}
            </div>
          )}

          {parsedProfile && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 space-y-1">
              <div>
                Експертів: <span className="font-semibold">{parsedProfile.expertsCount}</span>
              </div>
              <div>
                Критеріїв у таблиці: <span className="font-semibold">{parsedProfile.criteriaNames.length}</span>
              </div>
              {parsedProfile.missingCriteria.length > 0 && (
                <div>
                  Відсутні критерії: {parsedProfile.missingCriteria.join(', ')}
                </div>
              )}
              {parsedProfile.unknownCriteria.length > 0 && (
                <div>
                  Невідомі критерії: {parsedProfile.unknownCriteria.join(', ')}
                </div>
              )}
              {parsedProfile.invalidCells > 0 && (
                <div className="text-rose-600">
                  Некоректні значення рангу: {parsedProfile.invalidCells}
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-white flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">
                Результат голосування
              </h3>
              {selectedMethod === 'condorcet' && voteResults && !voteResults.winner && (
                <span className="text-xs text-rose-600">
                  Переможця Кондорсе немає, оберіть інший метод.
                </span>
              )}
              {selectedMethod === 'condorcet' && voteResults?.winner && (
                <span className="text-xs text-emerald-600">
                  Переможець: {voteResults.winner}
                </span>
              )}
            </div>

            {weightResults ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Критерій
                      </th>
                      <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Ранг
                      </th>
                      <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Бал
                      </th>
                      <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Вага
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {weightResults.map((item) => (
                      <tr key={item.name} className="hover:bg-slate-50/60">
                        <td className="p-3 text-sm text-slate-700">
                          {item.name}
                        </td>
                        <td className="p-3 text-center text-sm text-slate-600">
                          {item.rank}
                        </td>
                        <td className="p-3 text-center text-sm text-slate-600">
                          {item.score}
                        </td>
                        <td className="p-3 text-center text-sm text-slate-800 font-semibold">
                          {item.weight}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-3 text-xs text-slate-500">
                  Вага залежить від рангу (місця), а не від кількості балів.
                </div>
              </div>
            ) : (
              <div className="p-5 text-sm text-slate-400">
                Імпортуйте таблицю, щоб побачити розрахунок.
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setCsvText('')}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Очистити імпорт
            </button>
            <button
              type="button"
              onClick={applyVotingWeights}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              disabled={
                !weightResults ||
                (selectedMethod === 'condorcet' && !voteResults?.winner) ||
                isSaving
              }
            >
              {isSaving ? 'Застосування...' : 'Застосувати ваги'}
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Експертні правила (IF-THEN)
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Правила впливають на фільтрацію альтернатив або корекцію оцінок.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsAddingRule((prev) => !prev);
              if (!isAddingRule) {
                resetRuleForm();
                setEditingRuleId(null);
              }
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            {isAddingRule ? 'Скасувати' : 'Додати правило'}
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isAddingRule && (
            <div className="rounded-lg border border-slate-200 p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Назва правила (необов'язково)"
                  value={ruleName}
                  onChange={(event) => setRuleName(event.target.value)}
                />
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={ruleCriterionId || ''}
                  onChange={(event) => setRuleCriterionId(event.target.value)}
                >
                  {criteria.length === 0 && (
                    <option value="" disabled>
                      Додайте критерії
                    </option>
                  )}
                  {criteria.map((crit) => (
                    <option key={crit.id} value={crit.id}>
                      {crit.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={ruleOperator}
                  onChange={(event) =>
                    setRuleOperator(event.target.value as RuleOperator)
                  }
                >
                  <option value=">">&gt;</option>
                  <option value=">=">&gt;=</option>
                  <option value="<">&lt;</option>
                  <option value="<=">&lt;=</option>
                  <option value="=">=</option>
                </select>
                <input
                  type="number"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Порогове значення"
                  value={ruleValue === '' ? '' : ruleValue}
                  onChange={(event) =>
                    setRuleValue(
                      event.target.value === ''
                        ? ''
                        : Number.parseFloat(event.target.value)
                    )
                  }
                />
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={ruleAction}
                  onChange={(event) =>
                    setRuleAction(event.target.value as RuleAction)
                  }
                >
                  <option value="exclude">Відсікати альтернативу</option>
                  <option value="adjust">Корекція оцінки</option>
                </select>
              </div>

              {ruleAction === 'adjust' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Зміна, % (наприклад -20)"
                    value={ruleAdjustment === '' ? '' : ruleAdjustment}
                    onChange={(event) =>
                      setRuleAdjustment(
                        event.target.value === ''
                          ? ''
                          : Number.parseFloat(event.target.value)
                      )
                    }
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={ruleActive}
                      onChange={(event) => setRuleActive(event.target.checked)}
                      className="h-4 w-4"
                    />
                    Активне правило
                  </label>
                </div>
              )}

              {ruleAction === 'exclude' && (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={ruleActive}
                    onChange={(event) => setRuleActive(event.target.checked)}
                    className="h-4 w-4"
                  />
                  Активне правило
                </label>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetRuleForm();
                    setIsAddingRule(false);
                    setEditingRuleId(null);
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Скасувати
                </button>
                <button
                  type="button"
                  onClick={editingRuleId ? handleUpdateRule : handleAddRule}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  {editingRuleId ? 'Оновити правило' : 'Зберегти правило'}
                </button>
              </div>
            </div>
          )}

          {rules.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
              Правил поки немає.
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => {
                const criterion = criteria.find(
                  (crit) => crit.id === rule.criterionId
                );
                const conditionLabel = `${criterion?.name || 'Критерій'} ${rule.operator} ${rule.value}`;
                const actionLabel =
                  rule.action === 'exclude'
                    ? 'відсікати альтернативу'
                    : `змінити оцінку на ${rule.adjustmentPercent ?? 0}%`;
                return (
                  <div
                    key={rule.id}
                    className="rounded-lg border border-slate-200 p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">
                          {rule.name || 'Без назви'}
                        </div>
                        <div className="text-sm text-slate-600">
                          IF {conditionLabel} THEN {actionLabel}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {rule.active ? 'Активне' : 'Вимкнене'} правило
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            decisionService.updateRule(rule.id, {
                              active: !rule.active,
                            })
                          }
                          className="text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          {rule.active ? 'Вимкнути' : 'Увімкнути'}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditRule(rule)}
                          className="text-xs text-slate-600 hover:text-slate-800"
                        >
                          Редагувати
                        </button>
                        <button
                          type="button"
                          onClick={() => decisionService.deleteRule(rule.id)}
                          className="text-xs text-rose-600 hover:text-rose-700"
                        >
                          Видалити
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};