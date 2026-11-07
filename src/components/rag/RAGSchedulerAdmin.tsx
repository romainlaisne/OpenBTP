'use client';
import { getActiveLocale, intlLocale } from '@/lib/i18n/locale'

import { UiText } from '@/contexts/LocaleContext'
import { useState, useEffect } from 'react';
import { PlayIcon, StopIcon, ClockIcon } from '@heroicons/react/24/outline';

interface TaskStatus {
  running: boolean;
  nextRun?: Date;
}

interface SchedulerStatus {
  tasks: Record<string, TaskStatus>;
  timezone: string;
  timestamp: string;
}

export default function RAGSchedulerAdmin() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/rag/scheduler');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du statut:', error);
    }
  };

  const executeAction = async (action: string, data?: Record<string, unknown>) => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/rag/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data })
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessage(`✅ ${result.message}`);
        await fetchStatus(); // Rafraîchir le statut
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch {
      setMessage('❌ Erreur lors de l\'exécution');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Rafraîchir toutes les 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4 dark:text-white flex items-center">
        <ClockIcon className="h-5 w-5 mr-2" />
        <UiText>Planificateur d'indexation RAG
      </UiText></h3>

      {message && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <p className="text-blue-800 dark:text-blue-200 text-sm">{message}</p>
        </div>
      )}

      {/* Statut des tâches */}
      {status && (
        <div className="mb-6">
          <h4 className="text-md font-medium mb-3 dark:text-gray-200"><UiText>Statut des tâches</UiText></h4>
          <div className="grid gap-3">
            {Object.entries(status.tasks).map(([taskName, taskStatus]) => (
              <div key={taskName} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {taskName === 'daily-full' && 'Indexation complète quotidienne'}
                    {taskName === 'incremental' && 'Indexation incrémentale (6h)'}
                    {taskName === 'hourly' && 'Indexation horaire'}
                  </div>
                  {taskStatus.nextRun && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <UiText>Prochaine exécution: </UiText>{new Date(taskStatus.nextRun).toLocaleString(intlLocale(getActiveLocale()))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    taskStatus.running 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                  }`}>
                    {taskStatus.running ? 'Actif' : 'Inactif'}
                  </span>
                  <button
                    onClick={() => executeAction('stop', { taskName })}
                    className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    disabled={loading || !taskStatus.running}
                  >
                    <StopIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <h4 className="text-md font-medium dark:text-gray-200"><UiText>Actions</UiText></h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => executeAction('start-default')}
            disabled={loading}
            className="flex items-center justify-center gap-2 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <PlayIcon className="h-4 w-4" />
            <UiText>Démarrer les tâches par défaut
          </UiText></button>

          <button
            onClick={() => executeAction('stop-all')}
            disabled={loading}
            className="flex items-center justify-center gap-2 p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <StopIcon className="h-4 w-4" />
            <UiText>Arrêter toutes les tâches
          </UiText></button>

          <button
            onClick={() => executeAction('run-full-now')}
            disabled={loading}
            className="flex items-center justify-center gap-2 p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <PlayIcon className="h-4 w-4" />
            <UiText>Indexation complète maintenant
          </UiText></button>

          <button
            onClick={() => executeAction('run-incremental-now')}
            disabled={loading}
            className="flex items-center justify-center gap-2 p-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
          >
            <PlayIcon className="h-4 w-4" />
            <UiText>Indexation incrémentale maintenant
          </UiText></button>
        </div>
      </div>

      {/* Configuration */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="text-md font-medium mb-2 dark:text-gray-200"><UiText>Configuration par défaut</UiText></h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• <strong><UiText>Indexation complète:</UiText></strong> <UiText>Tous les jours à 02:00</UiText></li>
          <li>• <strong><UiText>Indexation incrémentale:</UiText></strong> Toutes les 6 heures</li>
          <li>• <strong>Fuseau horaire:</strong> Europe/Brussels</li>
          <li>• <strong><UiText>Données indexées:</UiText></strong> <UiText>Chantiers, notes libres, documents, remarques</UiText></li>
        </ul>
      </div>
    </div>
  );
}


