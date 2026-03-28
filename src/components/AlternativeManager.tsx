import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { Alternative } from '../types';
import { decisionService } from '../services/decisionService';

interface AlternativeManagerProps {
  alternatives: Alternative[];
}

export const AlternativeManager: React.FC<AlternativeManagerProps> = ({ alternatives }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleAdd = async () => {
    console.log(name);

    if (!name.trim()) return;
    await decisionService.addAlternative(name, description);
    setName('');
    setDescription('');
    setIsAdding(false);
  };

  const handleUpdate = async (id: string) => {
    if (!name.trim()) return;
    await decisionService.updateAlternative(id, name, description);
    setEditingId(null);
    setName('');
    setDescription('');
  };

  const startEdit = (alt: Alternative) => {
    setEditingId(alt.id);
    setName(alt.name);
    setDescription(alt.description || '');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h2 className="text-lg font-semibold text-slate-800">Альтернативи</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <Plus size={16} /> Додати альтернативу
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {isAdding && (
          <div className="p-4 bg-indigo-50/30 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Назва альтернативи"
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <textarea
                placeholder="Опис (необов'язково)"
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-20"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded-lg text-sm">Скасувати</button>
                <button onClick={handleAdd} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">Зберегти</button>
              </div>
            </div>
          </div>
        )}

        {alternatives.length === 0 && !isAdding && (
          <div className="p-8 text-center text-slate-400 italic">Альтернатив поки немає.</div>
        )}

        {alternatives.map((alt) => (
          <div key={alt.id} className="p-4 hover:bg-slate-50 transition-colors group">
            {editingId === alt.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <textarea
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-20"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:text-slate-600"><X size={20} /></button>
                  <button onClick={() => handleUpdate(alt.id)} className="p-1.5 text-emerald-500 hover:text-emerald-600"><Check size={20} /></button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-slate-900">{alt.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{alt.description || 'Опис відсутній.'}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(alt)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md"><Edit2 size={16} /></button>
                  <button onClick={() => decisionService.deleteAlternative(alt.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"><Trash2 size={16} /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
