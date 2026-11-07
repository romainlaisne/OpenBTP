'use client'
import { UiText } from '@/contexts/LocaleContext'
import { useEffect } from 'react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  useEffect(() => {
    console.error('Erreur:', error)
  }, [error])

  return (
    <div className="p-8">
      <h2><UiText>Une erreur est survenue</UiText></h2>
      <button onClick={reset}><UiText>Réessayer</UiText></button>
    </div>
  )
} 