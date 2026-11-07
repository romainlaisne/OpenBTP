import { tx } from '@/lib/i18n/translate'
import { UiText } from '@/contexts/LocaleContext'
import React, { useState } from 'react';
import { RichTextEditor } from '../ui';

/**
 * Exemple d'utilisation du composant RichTextEditor
 */
const RichTextExample: React.FC = () => {
  const [content, setContent] = useState<string>('');

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    // Ici, vous pouvez faire d'autres opérations avec le contenu, 
    // comme l'enregistrer dans une base de données
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold"><UiText>Éditeur de texte riche</UiText></h2>
      
      <RichTextEditor 
        value={content}
        onChange={handleContentChange}
        placeholder={tx("Écrivez votre contenu ici...")}
      />
      
      <div className="mt-4">
        <h3 className="text-lg font-semibold"><UiText>Prévisualisation :</UiText></h3>
        {content ? (
          <div 
            className="p-4 border rounded-md bg-gray-50"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <p className="text-gray-500 italic"><UiText>Aucun contenu pour le moment</UiText></p>
        )}
      </div>
    </div>
  );
};

export default RichTextExample; 