import React from 'react';
import { Alternative, Criterion, Evaluation } from '../types';
import { AnalyticalService } from './AnalyticalService';
import { EvaluationMatrix } from './EvaluationMatrix';

interface DashboardProps {
  alternatives: Alternative[];
  criteria: Criterion[];
  evaluations: Record<string, Evaluation>;
}

export const Dashboard: React.FC<DashboardProps> = ({ alternatives, criteria, evaluations }) => (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex justify-between items-end">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Дашборд рішень</h1>
        <p className="text-slate-500 mt-1">Огляд вашої поточної структури прийняття рішень.</p>
      </div>
      <div className="flex gap-4">
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Альтернативи</div>
          <div className="text-xl font-bold text-indigo-600">{alternatives.length}</div>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Критерії</div>
          <div className="text-xl font-bold text-emerald-600">{criteria.length}</div>
        </div>
      </div>
    </div>

    <AnalyticalService 
      alternatives={alternatives} 
      criteria={criteria} 
      evaluations={evaluations} 
    />

    <EvaluationMatrix 
      alternatives={alternatives} 
      criteria={criteria} 
      evaluations={evaluations} 
    />
  </div>
);
