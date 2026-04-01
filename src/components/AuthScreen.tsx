import React from 'react';
import { LogIn, Scale } from 'lucide-react';
import { signInWithGoogle } from '../firebase';

export const AuthScreen: React.FC = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center animate-in fade-in zoom-in duration-500">
      <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Scale className="text-indigo-600" size={40} />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">
        Decision Supporter
      </h1>
      <p className="text-slate-500 mb-8">
        Основа для структурованого прийняття рішень. Будь ласка, увійдіть, щоб
        керувати своїми альтернативами та критеріями.
      </p>
      <button
        onClick={signInWithGoogle}
        className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-[0.98]"
      >
        <LogIn size={20} /> Увійти через Google
      </button>
    </div>
  </div>
);
