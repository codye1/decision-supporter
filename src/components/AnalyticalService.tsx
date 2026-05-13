import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Zap,
  AlertCircle,
  TrendingUp,
  ShieldAlert,
  Layers,
} from 'lucide-react';
import { Alternative, Criterion, Evaluation, ExpertRule, RuleOperator } from '../types';

interface AnalyticalServiceProps {
  alternatives: Alternative[];
  criteria: Criterion[];
  evaluations: Record<string, Evaluation>;
  rules: ExpertRule[];
}

type CalculationMethod = 'additive' | 'multiplicative' | 'cautious';

interface MethodInfo {
  id: CalculationMethod;
  name: string;
  icon: React.ReactNode;
  description: string;
  formula: string;
}

const METHODS: MethodInfo[] = [
  {
    id: 'additive',
    name: 'Адитивна згортка',
    icon: <Layers size={18} />,
    description: 'Критерії компенсують один одного. Проста і найпоширеніша.',
    formula: 'Q(Ai) = Σ (wj * xij)',
  },
  {
    id: 'multiplicative',
    name: 'Мультиплікативна згортка',
    icon: <TrendingUp size={18} />,
    description:
      'Слабкі значення сильніше впливають. Менше компенсації ніж у сумі.',
    formula: 'Q(Ai) = Π (xij ^ wj)',
  },
  {
    id: 'cautious',
    name: 'Обережна стратегія',
    icon: <ShieldAlert size={18} />,
    description:
      'Оцінка за найгіршим критерієм. Підходить для критичних систем.',
    formula: 'Q(Ai) = min(wj * xij)',
  },
];

export const AnalyticalService: React.FC<AnalyticalServiceProps> = ({
  alternatives,
  criteria,
  evaluations,
  rules = [],
}) => {
  const [selectedMethod, setSelectedMethod] =
    useState<CalculationMethod>('additive');

  const hasData = alternatives.length > 0 && criteria.length > 0;

  const {
    feasibleAlternatives,
    rejectedAlternatives,
    thresholdCriteria,
    ruleFilteredAlternatives,
    activeRules,
  } =
    useMemo(() => {
      const activeThresholds = criteria.filter(
        (crit) =>
          typeof crit.thresholdMin === 'number' ||
          typeof crit.thresholdMax === 'number'
      );

      const enabledRules = rules.filter((rule) => rule.active);

      const feasible =
        activeThresholds.length === 0
          ? alternatives
          : alternatives.filter((alt) =>
              activeThresholds.every((crit) => {
                const value = evaluations[`${alt.id}_${crit.id}`]?.value;
                if (value === undefined || Number.isNaN(value)) return false;
                const minOk =
                  typeof crit.thresholdMin === 'number'
                    ? value >= crit.thresholdMin
                    : true;
                const maxOk =
                  typeof crit.thresholdMax === 'number'
                    ? value <= crit.thresholdMax
                    : true;
                return minOk && maxOk;
              })
            );

      const compare = (operator: RuleOperator, left: number, right: number) => {
        switch (operator) {
          case '>':
            return left > right;
          case '>=':
            return left >= right;
          case '<':
            return left < right;
          case '<=':
            return left <= right;
          case '=':
            return Math.abs(left - right) < 1e-6;
          default:
            return false;
        }
      };

      const ruleFiltered = feasible.filter((alt) =>
        enabledRules.every((rule) => {
          if (rule.action !== 'exclude') return true;
          const value = evaluations[`${alt.id}_${rule.criterionId}`]?.value;
          if (value === undefined || Number.isNaN(value)) return true;
          return !compare(rule.operator, value, rule.value);
        })
      );

      const rejected = alternatives.filter(
        (alt) => !ruleFiltered.some((item) => item.id === alt.id)
      );

      return {
        feasibleAlternatives: ruleFiltered,
        rejectedAlternatives: rejected,
        thresholdCriteria: activeThresholds,
        ruleFilteredAlternatives: feasible.filter(
          (alt) => !ruleFiltered.some((item) => item.id === alt.id)
        ),
        activeRules: enabledRules,
      };
    }, [alternatives, criteria, evaluations, rules]);

  const { evaluationCount, totalPossibleEvaluations, completionPercentage } =
    useMemo(() => {
      const total = alternatives.length * criteria.length;
      let count = 0;

      if (total > 0) {
        alternatives.forEach((alt) => {
          criteria.forEach((crit) => {
            if (evaluations[`${alt.id}_${crit.id}`]) {
              count++;
            }
          });
        });
      }

      return {
        evaluationCount: count,
        totalPossibleEvaluations: total,
        completionPercentage: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    }, [alternatives, criteria, evaluations]);

  const results = useMemo(() => {
    if (!hasData || completionPercentage < 100) return [];
    if (feasibleAlternatives.length === 0) return [];

    // 1. Normalize values for each criterion
    const normalizedEvaluations: Record<string, number> = {};

    const compare = (operator: RuleOperator, left: number, right: number) => {
      switch (operator) {
        case '>':
          return left > right;
        case '>=':
          return left >= right;
        case '<':
          return left < right;
        case '<=':
          return left <= right;
        case '=':
          return Math.abs(left - right) < 1e-6;
        default:
          return false;
      }
    };

    const adjustmentFactors: Record<string, number> = {};
    feasibleAlternatives.forEach((alt) => {
      let factor = 1;
      activeRules
        .filter((rule) => rule.action === 'adjust')
        .forEach((rule) => {
          const value = evaluations[`${alt.id}_${rule.criterionId}`]?.value;
          if (value === undefined || Number.isNaN(value)) return;
          if (!compare(rule.operator, value, rule.value)) return;
          const percent = rule.adjustmentPercent ?? 0;
          factor *= 1 + percent / 100;
        });
      adjustmentFactors[alt.id] = factor;
    });

    criteria.forEach((crit) => {
      const values = feasibleAlternatives.map((alt) => {
        const raw = evaluations[`${alt.id}_${crit.id}`]?.value || 0;
        return raw * (adjustmentFactors[alt.id] ?? 1);
      });
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min;

      feasibleAlternatives.forEach((alt) => {
        const raw = evaluations[`${alt.id}_${crit.id}`]?.value || 0;
        const val = raw * (adjustmentFactors[alt.id] ?? 1);
        let normalized = 0;

        if (range === 0) {
          // If all values are the same (or only 1 alternative), we treat it as 1.0 (perfect)
          normalized = 1;
        } else {
          if (crit.type === 'maximize') {
            normalized = (val - min) / range;
          } else {
            normalized = (max - val) / range;
          }
        }

        // For multiplicative, we avoid zeros to prevent the whole product from becoming zero
        if (selectedMethod === 'multiplicative') {
          normalized = normalized * 0.9 + 0.1;
        }
        normalizedEvaluations[`${alt.id}_${crit.id}`] = normalized;
      });
    });

    const scores = feasibleAlternatives.map((alt) => {
      let score = 0;
      let maxPossibleScore = 1;

      const contributions = criteria.map((crit) => ({
        criterionId: crit.id,
        name: crit.name,
        contribution: (crit.weight || 1) * normalizedEvaluations[`${alt.id}_${crit.id}`],
      }));

      const appliedRules = activeRules
        .filter((rule) => rule.action === 'adjust')
        .filter((rule) => {
          const value = evaluations[`${alt.id}_${rule.criterionId}`]?.value;
          if (value === undefined || Number.isNaN(value)) return false;
          return compare(rule.operator, value, rule.value);
        })
        .map((rule) => {
          const criterion = criteria.find((crit) => crit.id === rule.criterionId);
          const label = `${criterion?.name || 'Критерій'} ${rule.operator} ${rule.value}`;
          const percent = rule.adjustmentPercent ?? 0;
          return `IF ${label} THEN ${percent}%`;
        });

      if (selectedMethod === 'additive') {
        score = criteria.reduce((sum, crit) => {
          const val = normalizedEvaluations[`${alt.id}_${crit.id}`];
          return sum + (crit.weight || 1) * val;
        }, 0);
        maxPossibleScore = criteria.reduce(
          (sum, crit) => sum + (crit.weight || 1),
          0
        );
      } else if (selectedMethod === 'multiplicative') {
        score = criteria.reduce((prod, crit) => {
          const val = normalizedEvaluations[`${alt.id}_${crit.id}`];
          return prod * Math.pow(val, crit.weight || 1);
        }, 1);
        maxPossibleScore = 1; // 1^w is always 1, product of 1s is 1
      } else if (selectedMethod === 'cautious') {
        const weightedVals = criteria.map((crit) => {
          const val = normalizedEvaluations[`${alt.id}_${crit.id}`];
          return (crit.weight || 1) * val;
        });
        score = Math.min(...weightedVals);
        maxPossibleScore = Math.min(
          ...criteria.map((crit) => crit.weight || 1)
        );
      }

      return {
        id: alt.id,
        name: alt.name,
        score: score / (maxPossibleScore || 1),
        contributions,
        appliedRules,
      };
    });

    // 3. Sort by score descending
    return scores.sort((a, b) => b.score - a.score);
  }, [
    alternatives,
    criteria,
    evaluations,
    activeRules,
    selectedMethod,
    hasData,
    completionPercentage,
    feasibleAlternatives,
  ]);

  return (
    <div className="bg-indigo-900 text-white rounded-xl shadow-lg border border-indigo-800 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <Calculator size={120} />
      </div>

      <div className="p-6 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/30 rounded-lg">
              <Zap className="text-indigo-200" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Аналітичний модуль</h2>
              <p className="text-xs text-indigo-300">
                Математичне обґрунтування вибору
              </p>
            </div>
          </div>
          <div className="flex bg-indigo-950/50 p-1 rounded-lg border border-indigo-700/30">
            {METHODS.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  selectedMethod === method.id
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-indigo-300 hover:text-white hover:bg-indigo-800/50'
                }`}
                title={method.description}
              >
                {method.icon}
                <span className="hidden sm:inline">{method.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-indigo-950/40 p-4 rounded-xl border border-indigo-700/30">
              <h3 className="text-sm font-bold text-indigo-200 mb-2 flex items-center gap-2">
                {METHODS.find((m) => m.id === selectedMethod)?.icon}
                {METHODS.find((m) => m.id === selectedMethod)?.name}
              </h3>
              <p className="text-xs text-indigo-300 mb-3 leading-relaxed">
                {METHODS.find((m) => m.id === selectedMethod)?.description}
              </p>
              <div className="bg-indigo-900/50 p-2 rounded font-mono text-[10px] text-indigo-400 border border-indigo-800/50">
                {METHODS.find((m) => m.id === selectedMethod)?.formula}
              </div>
            </div>

            {!hasData ? (
              <div className="flex items-start gap-3 p-4 bg-indigo-800/50 rounded-lg border border-indigo-700/50">
                <AlertCircle className="text-indigo-300 mt-0.5" size={18} />
                <p className="text-sm text-indigo-200">
                  Додайте альтернативи та критерії для аналізу.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-indigo-200">Готовність даних</span>
                  <span className="font-mono font-bold">
                    {completionPercentage}%
                  </span>
                </div>
                <div className="w-full bg-indigo-950 rounded-full h-2.5 border border-indigo-800/50">
                  <div
                    className="bg-indigo-400 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(129,140,248,0.5)]"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-indigo-300 italic">
                  Заповнено {evaluationCount} з {totalPossibleEvaluations}{' '}
                  оцінок.
                </p>
                {(thresholdCriteria.length > 0 || activeRules.length > 0) && (
                  <div className="mt-4 rounded-lg border border-indigo-700/40 bg-indigo-950/40 p-3 text-xs text-indigo-200">
                    <div className="font-semibold text-indigo-100">
                      Порогова обробка та правила активні
                    </div>
                    <div className="mt-1 text-indigo-300">
                      Допустимі альтернативи: {feasibleAlternatives.length} з{' '}
                      {alternatives.length}
                    </div>
                    {ruleFilteredAlternatives.length > 0 && (
                      <div className="mt-1 text-indigo-300">
                        Відсічені правилами: {ruleFilteredAlternatives
                          .map((alt) => alt.name)
                          .join(', ')}
                      </div>
                    )}
                    {rejectedAlternatives.length > 0 && (
                      <div className="mt-1 text-indigo-300">
                        Відсічені: {rejectedAlternatives
                          .map((alt) => alt.name)
                          .join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            {completionPercentage < 100 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 bg-indigo-950/20 rounded-xl border border-dashed border-indigo-700/30 text-center">
                <Calculator className="text-indigo-700 mb-3" size={48} />
                <h4 className="text-indigo-200 font-medium mb-1">
                  Очікування даних
                </h4>
                <p className="text-xs text-indigo-400 max-w-xs">
                  Будь ласка, заповніть всі оцінки в матриці, щоб отримати
                  результати розрахунків.
                </p>
              </div>
            ) : thresholdCriteria.length > 0 && feasibleAlternatives.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 bg-indigo-950/20 rounded-xl border border-dashed border-indigo-700/30 text-center">
                <AlertCircle className="text-indigo-700 mb-3" size={48} />
                <h4 className="text-indigo-200 font-medium mb-1">
                  Немає допустимих альтернатив
                </h4>
                <p className="text-xs text-indigo-400 max-w-xs">
                  Усі альтернативи відсічені пороговими обмеженнями. Перевірте
                  значення порогів або оцінки.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-indigo-200 px-1">
                  Рейтинг альтернатив
                </h3>
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <div
                      key={result.id}
                      className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
                        index === 0
                          ? 'bg-indigo-500/20 border-indigo-400/50 shadow-[0_0_15px_rgba(129,140,248,0.1)]'
                          : 'bg-indigo-950/30 border-indigo-800/50'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0
                            ? 'bg-indigo-400 text-indigo-950'
                            : 'bg-indigo-800 text-indigo-300'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium">{result.name}</span>
                          <span className="font-mono text-xs text-indigo-300">
                            {result.score.toFixed(4)}
                          </span>
                        </div>
                        <div className="w-full bg-indigo-950/50 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${index === 0 ? 'bg-indigo-400' : 'bg-indigo-600'}`}
                            style={{
                              width: `${Math.max(0, isNaN(result.score) ? 0 : (result.score / (results[0]?.score || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                        <div className="mt-2 text-[11px] text-indigo-300">
                          {(() => {
                            const topCriteria = [...result.contributions]
                              .sort((a, b) => b.contribution - a.contribution)
                              .slice(0, 2)
                              .map((item) => item.name);
                            const ruleText =
                              result.appliedRules.length > 0
                                ? `Правила: ${result.appliedRules.join('; ')}`
                                : 'Правила: не застосовано';
                            return (
                              <>
                                <span>
                                  Найбільший вплив: {topCriteria.join(', ') || '—'}.
                                </span>
                                <span className="ml-2">{ruleText}</span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      {index === 0 && (
                        <div className="px-2 py-1 bg-indigo-400/20 text-indigo-300 text-[10px] font-bold uppercase rounded border border-indigo-400/30">
                          Найкращий вибір
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
