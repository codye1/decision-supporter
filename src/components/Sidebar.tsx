import React from 'react';
import { LogOut, LayoutDashboard, Settings, BarChart3, Scale } from 'lucide-react';
import { User } from 'firebase/auth';
import { logout } from '../firebase';

interface SidebarProps {
  user: User;
  activeTab: 'dashboard' | 'alternatives' | 'criteria';
  setActiveTab: (tab: 'dashboard' | 'alternatives' | 'criteria') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, activeTab, setActiveTab }) => (
  <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-20">
    <div className="p-6 flex items-center gap-3 border-b border-slate-100">
      <div className="p-2 bg-indigo-600 rounded-lg">
        <Scale className="text-white" size={20} />
      </div>
      <span className="font-bold text-slate-800 tracking-tight">Decision Supporter</span>
    </div>

    <nav className="flex-1 p-4 space-y-2">
      <button
        onClick={() => setActiveTab('dashboard')}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
      >
        <LayoutDashboard size={20} /> Дашборд
      </button>
      <button
        onClick={() => setActiveTab('alternatives')}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'alternatives' ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
      >
        <Settings size={20} /> Альтернативи
      </button>
      <button
        onClick={() => setActiveTab('criteria')}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'criteria' ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
      >
        <BarChart3 size={20} /> Критерії
      </button>
    </nav>

    <div className="p-4 border-t border-slate-100">
      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-4">
        <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-slate-200" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-900 truncate">{user.displayName}</p>
          <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
        </div>
      </div>
      <button
        onClick={logout}
        className="w-full flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all text-sm font-medium"
      >
        <LogOut size={18} /> Вийти
      </button>
    </div>
  </aside>
);
