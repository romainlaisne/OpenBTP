'use client'

import { tx } from '@/lib/i18n/translate'
import { UiText } from '@/contexts/LocaleContext'
import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const VARIABLES = {
  entreprise: [
    { var: '{{nomEntreprise}}', desc: 'Nom de l\'entreprise principale' },
    { var: '{{adresseEntreprise}}', desc: 'Adresse de l\'entreprise' },
    { var: '{{zipCodeEntreprise}}', desc: 'Code postal de l\'entreprise' },
    { var: '{{villeEntreprise}}', desc: 'Ville de l\'entreprise' },
    { var: '{{tvaEntreprise}}', desc: 'Numéro de TVA de l\'entreprise' },
    { var: '{{telephoneEntreprise}}', desc: 'Téléphone de l\'entreprise' },
    { var: '{{emailEntreprise}}', desc: 'Email de l\'entreprise' },
    { var: '{{representantEntreprise}}', desc: 'Représentant légal de l\'entreprise' },
    { var: '{{logoBase64}}', desc: 'Logo de l\'entreprise en base64 (pour img src)' },
    { var: '{{signatureBase64}}', desc: 'Signature de l\'entreprise en base64 (pour img src)' },
  ],
  sousTraitant: [
    { var: '{{nomSousTraitant}}', desc: 'Nom du sous-traitant' },
    { var: '{{adresseSousTraitant}}', desc: 'Adresse du sous-traitant' },
    { var: '{{tvaSousTraitant}}', desc: 'Numéro de TVA du sous-traitant' },
    { var: '{{telephoneSousTraitant}}', desc: 'Téléphone du sous-traitant' },
    { var: '{{emailSousTraitant}}', desc: 'Email du sous-traitant' },
    { var: '{{representantSousTraitant}}', desc: 'Représentant du sous-traitant' },
  ],
  contrat: [
    { var: '{{referenceContrat}}', desc: 'Référence unique du contrat' },
    { var: '{{dateGeneration}}', desc: 'Date de génération du contrat' },
    { var: '{{dateDebut}}', desc: 'Date de début du contrat' },
    { var: '{{dateFin}}', desc: 'Date de fin du contrat' },
  ],
}

export default function TemplateVariablesHelp() {
  const [isOpen, setIsOpen] = useState(false)

  const copyToClipboard = (variable: string) => {
    navigator.clipboard.writeText(variable)
    toast.success(`Variable ${variable} copiée !`)
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium text-blue-900 dark:text-blue-100">
            Variables disponibles dans le template
          </span>
        </div>
        {isOpen ? (
          <ChevronUpIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <UiText>Utilisez ces variables dans votre template HTML. Elles seront automatiquement remplacées par les données réelles lors de la génération du contrat.
          </UiText></p>

          {/* Informations de l'entreprise */}
          <div>
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              <UiText>📋 Informations de l'entreprise
            </UiText></h4>
            <div className="space-y-1">
              {VARIABLES.entreprise.map((v) => (
                <div
                  key={v.var}
                  className="flex items-center justify-between py-1 px-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 group"
                >
                  <div className="flex-1">
                    <code className="text-xs font-mono text-blue-700 dark:text-blue-300">
                      {v.var}
                    </code>
                    <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">
                      - {v.desc}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(v.var)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 rounded transition-opacity"
                    title={tx("Copier")}
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Informations du sous-traitant */}
          <div>
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              <UiText>👷 Informations du sous-traitant
            </UiText></h4>
            <div className="space-y-1">
              {VARIABLES.sousTraitant.map((v) => (
                <div
                  key={v.var}
                  className="flex items-center justify-between py-1 px-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 group"
                >
                  <div className="flex-1">
                    <code className="text-xs font-mono text-blue-700 dark:text-blue-300">
                      {v.var}
                    </code>
                    <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">
                      - {v.desc}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(v.var)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 rounded transition-opacity"
                    title={tx("Copier")}
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Informations du contrat */}
          <div>
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              📝 Informations du contrat
            </h4>
            <div className="space-y-1">
              {VARIABLES.contrat.map((v) => (
                <div
                  key={v.var}
                  className="flex items-center justify-between py-1 px-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 group"
                >
                  <div className="flex-1">
                    <code className="text-xs font-mono text-blue-700 dark:text-blue-300">
                      {v.var}
                    </code>
                    <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">
                      - {v.desc}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(v.var)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 rounded transition-opacity"
                    title={tx("Copier")}
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Exemple d'utilisation */}
          <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              <UiText>💡 Exemple d'utilisation
            </UiText></h4>
            <div className="bg-gray-800 text-gray-100 p-3 rounded text-xs font-mono overflow-x-auto">
              <pre>{`<div class="header">
  <img src="data:image/png;base64,{{logoBase64}}" alt="Logo">
  <h1>{{nomEntreprise}}</h1>
  <p>{{adresseEntreprise}}</p>
</div>

<div class="contract-info">
  <p>Référence: {{referenceContrat}}</p>
  <p>Date: {{dateGeneration}}</p>
  <p>Sous-traitant: {{nomSousTraitant}}</p>
</div>`}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

