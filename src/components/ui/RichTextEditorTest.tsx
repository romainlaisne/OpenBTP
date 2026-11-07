'use client'

import { UiText } from '@/contexts/LocaleContext'
import React, { useState } from 'react'
import RichTextEditor from './RichTextEditor'

export default function RichTextEditorTest() {
  const [content, setContent] = useState('')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6"><UiText>Test du RichTextEditor - Correction du texte inversé</UiText></h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Instructions de test :</h2>
        <ol className="list-decimal list-inside space-y-1 text-gray-700">
          <li><UiText>Tapez du texte normal dans l'éditeur ci-dessous</UiText></li>
          <li><UiText>Vérifiez que le texte s'affiche correctement (pas à l'envers)</UiText></li>
          <li><UiText>Testez avec des caractères spéciaux : é, à, ç, etc.</UiText></li>
          <li><UiText>Vérifiez que la sauvegarde et le rechargement fonctionnent</UiText></li>
        </ol>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2"><UiText>Éditeur :</UiText></h2>
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Tapez du texte ici pour tester..."
          className="min-h-[300px]"
        />
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2"><UiText>Prévisualisation :</UiText></h2>
        <div className="p-4 border rounded-md bg-gray-50 min-h-[100px]">
          {content ? (
            <div 
              className="rich-text-content"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <p className="text-gray-500 italic"><UiText>Aucun contenu pour le moment</UiText></p>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Contenu brut (HTML) :</h2>
        <pre className="p-4 bg-gray-900 text-green-400 rounded-md overflow-auto text-sm">
          {content || 'Aucun contenu'}
        </pre>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setContent('Test avec des caractères spéciaux : é à ç ù œ æ')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <UiText>Tester caractères spéciaux
        </UiText></button>
        
        <button
          onClick={() => setContent('Test avec du texte long : Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.')}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Tester texte long
        </button>
        
        <button
          onClick={() => setContent('')}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Effacer
        </button>
      </div>
    </div>
  )
}
