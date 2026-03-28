import React from 'react';
import { Calculator, Zap, AlertCircle } from 'lucide-react';
import { Alternative, Criterion, Evaluation } from '../types';

interface AnalyticalServiceProps {
  alternatives: Alternative[];
  criteria: Criterion[];
  evaluations: Record<string, Evaluation>;
}

export const AnalyticalService: React.FC<AnalyticalServiceProps> = ({ alternatives, criteria, evaluations }) => {
  const hasData = alternatives.length > 0 && criteria.length > 0;
  const evaluationCount = Object.keys(evaluations).length;
  const totalPossibleEvaluations = alternatives.length * criteria.length;
  const completionPercentage = totalPossibleEvaluations > 0
    ? Math.round((evaluationCount / totalPossibleEvaluations) * 100)
    : 0;

  return (
    <div className="bg-indigo-900 text-white rounded-xl shadow-lg border border-indigo-800 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <Calculator size={120} />
      </div>

      <div className="p-6 relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-500/30 rounded-lg">
            <Zap className="text-indigo-200" size={24} />
          </div>
          <h2 className="text-xl font-bold">Аналітичний модуль</h2>
          <span className="text-[10px] uppercase font-bold px-2 py-1 bg-indigo-500/50 rounded-full border border-indigo-400/30">
            Математична модель
          </span>
        </div>

        <div className="space-y-4 max-w-2xl">

          {!hasData ? (
            <div className="flex items-start gap-3 p-4 bg-indigo-800/50 rounded-lg border border-indigo-700/50">
              <AlertCircle className="text-indigo-300 mt-0.5" size={18} />
              <p className="text-sm text-indigo-200">
                Додайте альтернативи та критерії, щоб побачити готовність даних до аналізу.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm mb-1">
                <span className="text-indigo-200">Готовність даних</span>
                <span className="font-mono font-bold">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-indigo-950 rounded-full h-2.5 border border-indigo-800/50">
                <div
                  className="bg-indigo-400 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(129,140,248,0.5)]"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <p className="text-xs text-indigo-300 italic">
                Заповнено {evaluationCount} з {totalPossibleEvaluations} оцінок.
              </p>
            </div>
          )}

          <div className="pt-4 flex flex-wrap gap-2">
            {['Обчислення балів', 'Аналіз ваг', 'Ранжування', 'Рекомендації'].map((feature) => (
              <span key={feature} className="text-[10px] px-2 py-1 bg-indigo-950/50 rounded-md border border-indigo-700/30 text-indigo-300">
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
