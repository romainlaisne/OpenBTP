'use client'
import { getActiveLocale, intlLocale } from '@/lib/i18n/locale'

import { tx } from '@/lib/i18n/translate'
import { UiText } from '@/contexts/LocaleContext'
import Link from 'next/link'
import { 
  EyeIcon, 
  DocumentTextIcon, 
  FolderIcon,
  ClipboardDocumentListIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import ChantierStatus from '@/components/ChantierStatus'
import type { ChantierStatus as ChantierStatusType } from '@/components/ChantierStatus'

interface Chantier {
  id: number
  chantierId: string
  nomChantier: string
  dateCommencement: string
  etatChantier: ChantierStatusType
  budget: number
}

interface ChantiersTableProps {
  chantiers: Chantier[]
  loading?: boolean
  onStatusChange?: (chantierId: string, newStatus: ChantierStatusType) => void
}

export default function ChantiersTable({ 
  chantiers, 
  loading = false,
  onStatusChange
}: ChantiersTableProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden animate-pulse">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
        </div>
        <div className="p-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="py-3 flex items-center border-b border-gray-100 dark:border-gray-700">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              <div className="ml-auto flex space-x-2">
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-indigo-50 dark:bg-indigo-900/20 flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white"><UiText>Chantiers récents</UiText></h3>
        <Link 
          href="/chantiers/nouveau"
          className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
        >
          <UiText>Nouveau chantier
        </UiText></Link>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <UiText>Nom
              </UiText></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <UiText>Date de début
              </UiText></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <UiText>État
              </UiText></th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <UiText>Actions
              </UiText></th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {chantiers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  <UiText>Aucun chantier trouvé
                </UiText></td>
              </tr>
            ) : (
              chantiers.map((chantier) => (
                <tr key={chantier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {chantier.nomChantier}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(chantier.dateCommencement).toLocaleDateString(intlLocale(getActiveLocale()))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <ChantierStatus 
                      status={chantier.etatChantier}
                      chantierId={chantier.chantierId}
                      onStatusChange={(newStatus: ChantierStatusType) => {
                        if (onStatusChange) {
                          onStatusChange(chantier.chantierId, newStatus);
                        }
                      }}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Link 
                        href={`/chantiers/${chantier.chantierId}`}
                        className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                        title={tx("Voir le chantier")}
                      >
                        <EyeIcon className="h-5 w-5" />
                      </Link>
                      <Link 
                        href={`/chantiers/${chantier.chantierId}/notes`}
                        className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                        title={tx("Notes")}
                      >
                        <DocumentTextIcon className="h-5 w-5" />
                      </Link>
                      <Link 
                        href={`/chantiers/${chantier.chantierId}/documents`}
                        className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                        title={tx("Documents")}
                      >
                        <FolderIcon className="h-5 w-5" />
                      </Link>
                      <Link 
                        href={`/chantiers/${chantier.chantierId}/etats`}
                        className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors"
                        title={tx("États")}
                      >
                        <ClipboardDocumentListIcon className="h-5 w-5" />
                      </Link>
                      <Link
                        href={`/chantiers/${chantier.chantierId}/modifier`}
                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                        title={tx("Modifier")}
                      >
                        <PencilIcon className="h-5 w-5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
} 