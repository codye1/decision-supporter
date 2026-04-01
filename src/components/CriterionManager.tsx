import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Criterion, CriterionType } from '../types';
import { decisionService } from '../services/decisionService';

interface CriterionManagerProps {
  criteria: Criterion[];
}

export const CriterionManager: React.FC<CriterionManagerProps> = ({
  criteria,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<CriterionType>('maximize');
  const [weight, setWeight] = useState(1);
  const [description, setDescription] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;
    const finalWeight = isNaN(weight) ? 1 : weight;
    await decisionService.addCriterion(name, type, finalWeight, description);
    setName('');
    setType('maximize');
    setWeight(1);
    setDescription('');
    setIsAdding(false);
  };

  const handleUpdate = async (id: string) => {
    if (!name.trim()) return;
    const finalWeight = isNaN(weight) ? 1 : weight;
    await decisionService.updateCriterion(
      id,
      name,
      type,
      finalWeight,
      description
    );
    setEditingId(null);
    setName('');
    setType('maximize');
    setWeight(1);
    setDescription('');
  };

  const startEdit = (crit: Criterion) => {
    setEditingId(crit.id);
    setName(crit.name);
    setType(crit.type);
    setWeight(crit.weight || 1);
    setDescription(crit.description || '');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h2 className="text-lg font-semibold text-slate-800">Критерії</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <Plus size={16} /> Додати критерій
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {isAdding && (
          <div className="p-4 bg-emerald-50/30 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Назва критерію"
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType('maximize')}
                  className={`flex-1 p-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${type === 'maximize' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  <ArrowUp size={16} /> Максимізувати
                </button>
                <button
                  type="button"
                  onClick={() => setType('minimize')}
                  className={`flex-1 p-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${type === 'minimize' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  <ArrowDown size={16} /> Мінімізувати
                </button>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">
                  Вага (0.1 - 1.0)
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="1"
                  step="0.1"
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={isNaN(weight) ? '' : weight}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setWeight(val);
                  }}
                />
              </div>
              <textarea
                placeholder="Опис (необов'язково)"
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-20"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded-lg text-sm"
                >
                  Скасувати
                </button>
                <button
                  onClick={handleAdd}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
                >
                  Зберегти
                </button>
              </div>
            </div>
          </div>
        )}

        {criteria.length === 0 && !isAdding && (
          <div className="p-8 text-center text-slate-400 italic">
            Критеріїв поки немає.
          </div>
        )}

        {criteria.map((crit) => (
          <div
            key={crit.id}
            className="p-4 hover:bg-slate-50 transition-colors group"
          >
            {editingId === crit.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setType('maximize')}
                    className={`flex-1 p-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${type === 'maximize' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                  >
                    <ArrowUp size={16} /> Максимізувати
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('minimize')}
                    className={`flex-1 p-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${type === 'minimize' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                  >
                    <ArrowDown size={16} /> Мінімізувати
                  </button>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">
                    Вага (0.1 - 1.0)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    max="1"
                    step="0.1"
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={isNaN(weight) ? '' : weight}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setWeight(val);
                    }}
                  />
                </div>
                <textarea
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-20"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600"
                  >
                    <X size={20} />
                  </button>
                  <button
                    onClick={() => handleUpdate(crit.id)}
                    className="p-1.5 text-emerald-500 hover:text-emerald-600"
                  >
                    <Check size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-900">{crit.name}</h3>
                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full ${crit.type === 'maximize' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}
                    >
                      {crit.type === 'maximize'
                        ? 'максимізація'
                        : 'мінімізація'}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      вага: {crit.weight || 1}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {crit.description || 'Опис відсутній.'}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(crit)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => decisionService.deleteCriterion(crit.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
