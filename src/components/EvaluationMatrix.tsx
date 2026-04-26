import React from 'react';
import { Alternative, Criterion, Evaluation } from '../types';
import { decisionService } from '../services/decisionService';

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
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M6 3.75h8.25L19.5 9v11.25a1.5 1.5 0 0 1-1.5 1.5h-12a1.5 1.5 0 0 1-1.5-1.5v-15a1.5 1.5 0 0 1 1.5-1.5Z" />
            <path d="M14.25 3.75V9h5.25" />
            <path d="m8.25 16.5 2.25 2.25 5.25-5.25" />
          </svg>
          Завантажити з Excel
        </button>
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
