'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import FormInput from '@/components/ui/FormInput'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Building, User } from 'lucide-react'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { useLocale } from '@/contexts/LocaleContext'

export default function SetupPage() {
  const router = useRouter()
  const { t } = useLocale()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)
  const [checkingSetup, setCheckingSetup] = useState(true)

  // Vérifier si l'application est déjà configurée au chargement
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const response = await fetch('/api/setup')
        if (response.ok) {
          const data = await response.json()
          // Si des utilisateurs existent, rediriger vers login
          if (data.userCount > 0) {
            router.push('/login')
            return
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du statut du setup:', error)
      } finally {
        setCheckingSetup(false)
      }
    }

    checkSetupStatus()
  }, [router])

  // État pour les informations de la société
  const [companyData, setCompanyData] = useState({
    name: '',
    address: '',
    zipCode: '',
    city: '',
    phone: '',
    email: '',
    tva: '',
    iban: ''
  })

  // État pour l'utilisateur administrateur
  const [adminData, setAdminData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    prenom: '',
    nom: ''
  })

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStep(2)
  }

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (adminData.password !== adminData.confirmPassword) {
      setError('setup.passwordMismatch')
      return
    }

    if (adminData.password.length < 8) {
      setError('setup.passwordTooShort')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company: companyData,
          admin: adminData
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const apiErrorKeys: Record<string, string> = {
          "L'application est déjà configurée": 'setup.alreadyConfigured',
          "Toutes les informations obligatoires de la société sont requises (nom, adresse, email, TVA)": 'setup.companyRequired',
          "Toutes les informations de l'administrateur sont requises": 'setup.adminRequired',
          'Cet email est déjà utilisé': 'setup.emailInUse',
          'Des données en conflit existent déjà': 'setup.dataConflict',
          'Erreur interne du serveur lors de la configuration': 'setup.serverError',
        }
        throw new Error(apiErrorKeys[errorData.code] || apiErrorKeys[errorData.error] || 'setup.configurationError')
      }

      setStep(3)
      setTimeout(() => {
        router.push('/login?message=setup-complete')
      }, 2000)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      setError(message.startsWith('setup.') ? message : 'setup.unexpectedError')
    } finally {
      setLoading(false)
    }
  }

  // Afficher un loader pendant la vérification
  if (checkingSetup) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="absolute right-4 top-4 z-20"><LanguageSwitch /></div>
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="pt-8 pb-8">
            <div className="text-center">
              <div className="mb-6">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
              </div>
              <p className="text-gray-600 text-lg">{t('setup.checking')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 3) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="absolute right-4 top-4 z-20"><LanguageSwitch /></div>
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="pt-8 pb-8">
            <div className="text-center">
              <div className="mb-6">
                <CheckCircle className="h-20 w-20 text-green-500 mx-auto animate-in fade-in zoom-in duration-500" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">{t('setup.completeTitle')}</h1>
              <p className="text-gray-600 mb-6 text-lg">
                {t('setup.completeDescription')}
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600"></div>
                <span>{t('setup.redirecting')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4 py-12">
      <div className="absolute right-4 top-4 z-20"><LanguageSwitch /></div>
      <div className="w-full max-w-3xl">
        {/* En-tête */}
        <div className="text-center mb-10">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mb-4 shadow-lg">
              <Building className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">{t('setup.title')}</h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            {t('setup.intro')}
        </p>
      </div>

        {/* Indicateur d'étapes */}
        <div className="flex items-center justify-center mb-10">
          <div className={`flex items-center transition-all duration-300 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`rounded-full h-10 w-10 flex items-center justify-center border-2 font-semibold transition-all duration-300 ${
              step >= 1 ? 'border-blue-600 bg-blue-600 text-white shadow-md scale-110' : 'border-gray-300 bg-white'
            }`}>1</div>
            <span className="ml-3 font-semibold text-base">{t('setup.companyStep')}</span>
                </div>
          <div className="h-1 w-20 mx-6 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 rounded-full ${step >= 2 ? 'w-full' : 'w-0'}`}></div>
                </div>
          <div className={`flex items-center transition-all duration-300 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`rounded-full h-10 w-10 flex items-center justify-center border-2 font-semibold transition-all duration-300 ${
              step >= 2 ? 'border-blue-600 bg-blue-600 text-white shadow-md scale-110' : 'border-gray-300 bg-white'
            }`}>2</div>
            <span className="ml-3 font-semibold text-base">{t('setup.adminStep')}</span>
              </div>
            </div>

        {error && (
          <div className="mb-6 p-4 border border-red-200 bg-red-50 dark:bg-red-900/10 rounded-lg shadow-sm">
            <p className="text-red-700 dark:text-red-400 font-medium">{t(error)}</p>
                </div>
        )}

        {/* Étape 1: Informations de la société */}
        {step === 1 && (
          <Card className="shadow-xl border-0">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-2xl">
                <div className="mr-3 p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Building className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                {t('setup.companyTitle')}
              </CardTitle>
              <CardDescription className="text-base mt-2">
                {t('setup.companyDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCompanySubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormInput
                    label={t('setup.companyName')}
                    type="text"
                    value={companyData.name}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder={t('setup.companyNamePlaceholder')}
                  />
                  <FormInput
                    label={t('setup.vatNumber')}
                    type="text"
                    value={companyData.tva}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, tva: e.target.value }))}
                    required
                    placeholder={t('setup.vatPlaceholder')}
                  />
                </div>

                <FormInput
                  label={t('setup.address')}
                  type="text"
                  value={companyData.address}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, address: e.target.value }))}
                  required
                  placeholder={t('setup.addressPlaceholder')}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormInput
                    label={t('setup.postalCode')}
                    type="text"
                    value={companyData.zipCode}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, zipCode: e.target.value }))}
                    required
                    placeholder={t('setup.postalCodePlaceholder')}
                  />
                  <FormInput
                    label={t('setup.city')}
                    type="text"
                    value={companyData.city}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, city: e.target.value }))}
                    required
                    placeholder={t('setup.cityPlaceholder')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormInput
                    label={t('setup.phone')}
                    type="tel"
                    value={companyData.phone}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                    placeholder={t('setup.phonePlaceholder')}
                  />
                  <FormInput
                    label={t('setup.email')}
                    type="email"
                    value={companyData.email}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    placeholder={t('setup.emailPlaceholder')}
                  />
                </div>

                <FormInput
                  label={t('setup.iban')}
                  type="text"
                  value={companyData.iban}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, iban: e.target.value }))}
                  placeholder={t('setup.ibanPlaceholder')}
                />

                <div className="pt-4">
                  <Button type="submit" fullWidth className="h-12 text-base font-semibold">
                  {t('setup.continue')}
                </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Étape 2: Création de l'administrateur */}
        {step === 2 && (
          <Card className="shadow-xl border-0">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-2xl">
                <div className="mr-3 p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <User className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                {t('setup.adminTitle')}
              </CardTitle>
              <CardDescription className="text-base mt-2">
                {t('setup.adminDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdminSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormInput
                    label={t('setup.firstName')}
                    type="text"
                    value={adminData.prenom}
                    onChange={(e) => setAdminData(prev => ({ ...prev, prenom: e.target.value }))}
                    required
                    placeholder={t('setup.firstNamePlaceholder')}
                  />
                  <FormInput
                    label={t('setup.lastName')}
                    type="text"
                    value={adminData.nom}
                    onChange={(e) => setAdminData(prev => ({ ...prev, nom: e.target.value }))}
                    required
                    placeholder={t('setup.lastNamePlaceholder')}
                  />
                </div>

                <FormInput
                  label={t('setup.loginEmail')}
                  type="email"
                  value={adminData.email}
                  onChange={(e) => setAdminData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  placeholder={t('setup.loginEmailPlaceholder')}
                />

                <FormInput
                  label={t('setup.password')}
                  type="password"
                  value={adminData.password}
                  onChange={(e) => setAdminData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  placeholder={t('setup.passwordPlaceholder')}
                />

                <FormInput
                  label={t('setup.confirmPassword')}
                  type="password"
                  value={adminData.confirmPassword}
                  onChange={(e) => setAdminData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  placeholder={t('setup.confirmPasswordPlaceholder')}
                />

                <div className="flex gap-4 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setStep(1)}
                    fullWidth
                    className="h-12 text-base font-semibold"
                  >
                    {t('setup.back')}
                  </Button>
                  <Button 
                    type="submit" 
                    isLoading={loading}
                    fullWidth
                    className="h-12 text-base font-semibold"
                  >
                    {loading ? t('setup.submitting') : t('setup.finish')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 