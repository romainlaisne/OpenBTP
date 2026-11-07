import { getActiveLocale, intlLocale } from '@/lib/i18n/locale'
import { tx } from '@/lib/i18n/translate'
import { UiText } from '@/contexts/LocaleContext'
import UserNotepad from '@/components/dashboard/UserNotepad'
import { headers } from 'next/headers'
import Link from 'next/link'
import KPICard from '@/components/dashboard/KPICard'
import QuickActionsWidget from '@/components/dashboard/QuickActionsWidget'
import BonsRegieWidget from '@/components/dashboard/BonsRegieWidget'
import MiniCalendarWidget from '@/components/dashboard/MiniCalendarWidget'
import BarChart from '@/components/charts/BarChart'
import {
  ChartBarIcon,
  BuildingOffice2Icon,
  ClipboardDocumentListIcon,
  CurrencyEuroIcon
} from '@heroicons/react/24/outline'

export const dynamic = 'force-dynamic'

const DashboardTestPage = async () => {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const baseUrl = `${proto}://${host}`
  const [statsRes, alertsRes] = await Promise.all([
    fetch(`${baseUrl}/api/dashboard/stats`, { cache: 'no-store' }),
    fetch(`${baseUrl}/api/dashboard/alertes`, { cache: 'no-store' })
  ])
  type AlertItem = { id: string; severity: string; type: string; message: string; date: string }
  type Stats = {
    kpis?: {
      chiffreAffaires?: number
      chantiersEnCours?: number
      tachesEnAttente?: number
      totalChantiers?: number
    }
    chantiersByCategory?: Record<string, number>
    chantiersMap?: Array<{ id: string; nom: string; client: string; etat: string; montant: number; progression: number; latitude?: number; longitude?: number }>
  }
  const stats: Stats | null = statsRes.ok ? await statsRes.json() : null
  const alertes: AlertItem[] = alertsRes.ok ? await alertsRes.json() : []

  const chartLabels = stats?.chantiersByCategory ? Object.keys(stats.chantiersByCategory) : []
  const chartValues = stats?.chantiersByCategory ? Object.values(stats.chantiersByCategory) : []
  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Chantiers par statut',
        data: chartValues,
        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6', '#A855F7'].slice(0, chartLabels.length)
      }
    ]
  }
  const chartOptions = { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  return (
    <div className="space-y-6">
      {/* Notepad sticky pour cohérence avec l'application */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-[1600px] mx-auto p-4">
          <UserNotepad userId="me" />
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-4 space-y-8">
        {/* En-tête + actions principales */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold"><UiText>Tableau de bord</UiText></h1>
            <p className="text-muted-foreground"><UiText>Vue synthétique et actions rapides</UiText></p>
          </div>
          <div className="flex gap-2">
            <Link href="/chantiers/nouveau" className="px-3 py-2 rounded bg-blue-600 text-white"><UiText>Nouveau chantier</UiText></Link>
            <Link href="/chantiers/reception/nouveau" className="px-3 py-2 rounded bg-emerald-600 text-white"><UiText>Nouvelle réception</UiText></Link>
            <Link href="/sav/nouveau" className="px-3 py-2 rounded bg-orange-600 text-white"><UiText>Nouveau ticket SAV</UiText></Link>
          </div>
        </header>

        {/* KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KPICard
            title={tx("Chiffre d’affaires (mois)")}
            value={stats?.kpis?.chiffreAffaires ? new Intl.NumberFormat(intlLocale(getActiveLocale()), { style: 'currency', currency: 'EUR' }).format(stats.kpis.chiffreAffaires) : '—'}
            subtitle={tx("Commandes validées")}
            accentColor="indigo"
            icon={<CurrencyEuroIcon className="w-8 h-8" />}
          />
          <KPICard
            title={tx("Chantiers en cours")}
            value={stats?.kpis?.chantiersEnCours ?? '—'}
            accentColor="blue"
            icon={<BuildingOffice2Icon className="w-8 h-8" />}
          />
          <KPICard
            title={tx("Tâches en attente")}
            value={stats?.kpis?.tachesEnAttente ?? '—'}
            accentColor="yellow"
            icon={<ClipboardDocumentListIcon className="w-8 h-8" />}
          />
          <KPICard
            title={tx("Total chantiers")}
            value={stats?.kpis?.totalChantiers ?? '—'}
            accentColor="purple"
            icon={<ChartBarIcon className="w-8 h-8" />}
          />
        </section>

        {/* Actions rapides */}
        <section className="rounded-lg border p-4 bg-white dark:bg-gray-800">
          <h2 className="font-semibold mb-4">Actions rapides</h2>
          <QuickActionsWidget />
        </section>

        {/* Graphique synthétique */}
        {chartLabels.length > 0 && (
          <section className="rounded-lg border p-4 bg-white dark:bg-gray-800">
            <h2 className="font-semibold mb-4"><UiText>Répartition des chantiers</UiText></h2>
            <BarChart data={chartData} options={chartOptions as unknown} />
          </section>
        )}

        {/* Alerte (carte désactivée) */}
        <section className="grid gap-6 lg:grid-cols-1">
          <div className="rounded-lg border overflow-hidden bg-white dark:bg-gray-800">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold"><UiText>À surveiller</UiText></h2>
            </div>
            <div className="p-4">
              {Array.isArray(alertes) && alertes.length > 0 ? (
                <ul className="space-y-3">
                  {alertes.map((a: { id: string; severity: string; type: string; message: string; date: string }) => (
                    <li key={a.id} className={`flex items-center p-3 rounded-md border ${
                      a.severity === 'high' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                      a.severity === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
                      'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    }`}>
                      <span className="font-medium mr-2">[{String(a.type).toUpperCase()}]</span>
                      <span className="flex-1">{a.message}</span>
                      <span className="ml-2 text-xs opacity-70 whitespace-nowrap">{a.date}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground"><UiText>Aucune alerte</UiText></div>
              )}
            </div>
          </div>

          {/* Carte désactivée: composant supprimé */}
        </section>

        {/* Planning + Bons de régie */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border overflow-hidden">
            <MiniCalendarWidget />
          </div>
          <div className="rounded-lg border overflow-hidden">
            <BonsRegieWidget />
          </div>
        </section>
      </div>
    </div>
  )
}

export default DashboardTestPage

