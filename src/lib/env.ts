import { z } from 'zod'

/**
 * Schéma de validation des variables d'environnement
 * Utilise Zod pour valider les variables d'environnement au démarrage de l'application
 */
const envSchema = z.object({
  // Base de données (OBLIGATOIRE)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL est obligatoire'),

  // NextAuth (OBLIGATOIRE)
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET doit faire au moins 32 caractères'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL doit être une URL valide'),

  // Application
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  // Runtime origin (not inlined at image build). Preferred over NEXT_PUBLIC_APP_URL.
  APP_PUBLIC_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // PDF Service (OPTIONNEL)
  PDF_SERVICE_URL: z.string().url().optional(),
  PDF_SERVICE_PROVIDER: z.enum(['browserless', 'custom', 'puppeteer']).optional(),

  // Ollama / IA (OPTIONNEL)
  OLLAMA_BASE_URL: z.string().url().optional(),
  OLLAMA_MODEL: z.string().optional(),
  OLLAMA_EMBEDDING_MODEL: z.string().optional(),

  // Email SMTP (OPTIONNEL - peut être configuré en base de données)
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.string().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_SECURE: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_FROM_NAME: z.string().optional(),

  // Logging (OPTIONNEL)
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
})

/**
 * Type des variables d'environnement validées
 */
export type Env = z.infer<typeof envSchema>

/**
 * Valider et parser les variables d'environnement
 * @throws {z.ZodError} Si les variables d'environnement sont invalides
 */
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => {
        const path = err.path.join('.')
        return `  ❌ ${path}: ${err.message}`
      })

      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error('❌ ERREUR DE CONFIGURATION - Variables d\'environnement invalides')
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error('\n❗ Les variables d\'environnement suivantes sont manquantes ou invalides :\n')
      console.error(errors.join('\n'))
      console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error('📝 Veuillez vérifier votre fichier .env')
      console.error('📖 Consultez ENV_TEMPLATE.md pour un exemple de configuration')
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

      throw new Error('Configuration invalide - Impossible de démarrer l\'application')
    }
    throw error
  }
}

/**
 * Variables d'environnement validées
 * À importer partout où vous avez besoin d'accéder aux variables d'environnement
 * 
 * @example
 * ```ts
 * import { env } from '@/lib/env'
 * 
 * const dbUrl = env.DATABASE_URL
 * ```
 */
export const env = validateEnv()

/**
 * Afficher un résumé de la configuration (sans les secrets)
 */
export function logEnvSummary() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ Configuration validée')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  🌍 Environnement: ${env.NODE_ENV}`)
  console.log(`  🔗 URL: ${env.NEXTAUTH_URL}`)
  if (env.APP_PUBLIC_URL) {
    console.log(`  🔗 URL publique: ${env.APP_PUBLIC_URL}`)
  }
  console.log(`  🗄️  Base de données: ${env.DATABASE_URL ? '✅ Configurée' : '❌ Manquante'}`)
  console.log(`  🔐 NextAuth: ${env.NEXTAUTH_SECRET ? '✅ Configuré' : '❌ Manquant'}`)
  
  if (env.PDF_SERVICE_URL) {
    console.log(`  📄 Service PDF: ${env.PDF_SERVICE_PROVIDER || 'custom'}`)
  }
  
  if (env.OLLAMA_BASE_URL) {
    console.log(`  🤖 Ollama: ${env.OLLAMA_MODEL || 'non configuré'}`)
  }
  
  if (env.EMAIL_HOST) {
    console.log(`  📧 Email SMTP: ${env.EMAIL_HOST}`)
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}
