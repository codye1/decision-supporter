import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Alternative, Criterion, Evaluation } from './types';
import { decisionService } from './services/decisionService';
import { AlternativeManager } from './components/AlternativeManager';
import { CriterionManager } from './components/CriterionManager';
import { Dashboard } from './components/Dashboard';
import { Sidebar } from './components/Sidebar';
import { AuthScreen } from './components/AuthScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { ExpertRules } from './components/ExpertRules';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'alternatives' | 'criteria' | 'expert-rules'
  >('dashboard');

  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, Evaluation>>(
    {}
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubAlts = decisionService.subscribeToAlternatives(setAlternatives);
    const unsubCrits = decisionService.subscribeToCriteria(setCriteria);
    const unsubEvals = decisionService.subscribeToEvaluations(setEvaluations);

    return () => {
      unsubAlts();
      unsubCrits();
      unsubEvals();
    };
  }, [user]);

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthScreen />;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar user={user} activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {activeTab === 'dashboard' && (
            <Dashboard
              alternatives={alternatives}
              criteria={criteria}
              evaluations={evaluations}
            />
          )}

          {activeTab === 'alternatives' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Управління альтернативами
                </h1>
                <p className="text-slate-500 mt-1">
                  Визначте варіанти, між якими ви обираєте.
                </p>
              </div>
              <AlternativeManager alternatives={alternatives} />
            </div>
          )}

          {activeTab === 'criteria' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Управління критеріями
                </h1>
                <p className="text-slate-500 mt-1">
                  Визначте фактори, які впливають на ваше рішення.
                </p>
              </div>
              <CriterionManager criteria={criteria} />
            </div>
          )}

          {activeTab === 'expert-rules' && <ExpertRules />}
        </div>
      </main>
    </div>
  );
};

export default App;
