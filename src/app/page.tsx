
"use client"

import { useEffect, useState, useRef, useCallback, FormEvent } from "react"
import { db, getLocalDateString, DB_UPDATE_EVENT } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltipContent } from "@/components/ui/chart"
import * as RechartsPrimitive from "recharts"
import { DollarSign, BarChart2, Download, Upload, TrendingUp, ArrowUpRight, ShoppingBag, Box, Wallet } from "lucide-react"
import { useTranslation } from "@/context/language-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"

export default function Dashboard() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSalesToday: 0,
    revenueToday: 0,
    profitToday: 0,
    profitMonth: 0,
    revenueMonth: 0,
    revenueLastMonth: 0,
    profitLastMonth: 0,
    debtIssuedToday: 0,
    debtPaidToday: 0,
  })
  const [monthlyChartData, setMonthlyChartData] = useState<{
    month: string;
    revenue: number;
    profit: number;
    expenses?: number;
    debtCollected?: number;
    debtIssued?: number;
  }[]>([])
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [enteredPin, setEnteredPin] = useState("")
  const [pinError, setPinError] = useState(false)
  const [backupSettings, setBackupSettings] = useState({ localAutoBackup: false, backupIntervalMinutes: 30, backupOnExit: false })
  const [backupState, setBackupState] = useState({ lastBackupAt: null as number | null, lastChangeAt: null as number | null })
  const [autoBackupDirectoryName, setAutoBackupDirectoryName] = useState<string | null>(null)
  const pinInputRef = useRef<HTMLInputElement>(null)
  const DASHBOARD_PIN = "201499" // عدل هذا الرقم السري كما تريد

  const loadStats = useCallback(() => {
    const products = db.getProducts();
    const allSales = db.getSales();
    const allPayments = db.getPayments();
    const allDebtPayments = db.getDebtPayments();
    const allExpenses = db.getExpenses();

    const todayStr = getLocalDateString();
    const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM

    // حساب الشهر الماضي
    const today = new Date();
    let lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthYear = lastMonthDate.getFullYear();
    const lastMonthMonth = lastMonthDate.getMonth() + 1; // شهر من 1 إلى 12
    const lastMonthPrefix = `${lastMonthYear}-${String(lastMonthMonth).padStart(2, '0')}`; // YYYY-MM

    // 1. إحصائيات اليوم (بناءً على مبيعات اليوم)
    const salesToday = allSales.filter(s => s.date === todayStr);
    const revenueToday = salesToday.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);
    const profitToday = salesToday.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);
    const debtIssuedToday = salesToday.reduce((sum, s) => sum + (Number(s.debtAmount) || 0), 0);

    // 2. الديون المسددة اليوم (من سجل المدفوعات الفعلي)
    const paymentsToday = allPayments.filter(p => p.date === todayStr);
    const debtPaymentsToday = allDebtPayments.filter(p => p.date === todayStr);
    const debtPaidToday = [...paymentsToday, ...debtPaymentsToday]
      .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

    // 3. إحصائيات الشهر الحالي (تشمل اليوم الحالي)
    const salesMonth = allSales.filter(s => s.date && s.date.startsWith(currentMonthPrefix));
    const revenueMonthTotal = salesMonth.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);
    const profitMonthTotal = salesMonth.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);

    // 4. إحصائيات الشهر الماضي
    const salesLastMonth = allSales.filter(s => s.date && s.date.startsWith(lastMonthPrefix));
    const revenueLastMonthTotal = salesLastMonth.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);
    const profitLastMonthTotal = salesLastMonth.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);

    const lastMonthsCount = 6
    const monthlyData = Array.from({ length: lastMonthsCount }, (_, index) => {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - (lastMonthsCount - 1) + index, 1)
      const monthPrefix = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`
      const monthSales = allSales.filter(s => s.date?.startsWith(monthPrefix))
      const monthExpenses = allExpenses.filter(e => e.date?.startsWith(monthPrefix))
      const monthDebtCollected = [...allPayments, ...allDebtPayments]
        .filter(payment => payment.date?.startsWith(monthPrefix))
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
      const monthDebtIssued = monthSales
        .filter(s => s.paymentType === 'credit' && Number(s.debtAmount) > 0)
        .reduce((sum, s) => sum + Number(s.debtAmount || 0), 0)
      return {
        month: monthDate.toLocaleString("ar-EG", { month: "short", year: "numeric" }),
        revenue: monthSales.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0),
        profit: monthSales.reduce((sum, s) => sum + (Number(s.profit) || 0), 0),
        expenses: monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
        debtCollected: monthDebtCollected,
        debtIssued: monthDebtIssued,
      }
    })

    setStats({
      totalProducts: products.length,
      totalSalesToday: salesToday.length,
      revenueToday: revenueToday,
      profitToday: profitToday,
      profitMonth: profitMonthTotal,
      revenueMonth: revenueMonthTotal,
      revenueLastMonth: revenueLastMonthTotal,
      profitLastMonth: profitLastMonthTotal,
      debtIssuedToday: debtIssuedToday,
      debtPaidToday: debtPaidToday,
    });

    setMonthlyChartData(monthlyData)
  }, []);

  useEffect(() => {
    const syncDashboardState = () => {
      loadStats()
      setBackupSettings(db.getSyncSettings())
      setBackupState(db.getBackupState())
      void db.getAutoBackupDirectoryName().then(setAutoBackupDirectoryName)
    }

    syncDashboardState()
    window.addEventListener(DB_UPDATE_EVENT, syncDashboardState)
    window.addEventListener('storage', syncDashboardState)
    return () => {
      window.removeEventListener(DB_UPDATE_EVENT, syncDashboardState)
      window.removeEventListener('storage', syncDashboardState)
    }
  }, [loadStats])

  useEffect(() => {
    if (!backupSettings.backupOnExit || typeof window === 'undefined') return

    const handleBeforeClose = () => {
      const state = db.getBackupState()
      const hasUnbackedChanges = Boolean(state.lastChangeAt && (!state.lastBackupAt || state.lastChangeAt > state.lastBackupAt))
      if (hasUnbackedChanges) {
        db.downloadBackup({ saveToAutoDirectory: true })
      }
    }

    window.addEventListener('pagehide', handleBeforeClose)
    window.addEventListener('beforeunload', handleBeforeClose)
    return () => {
      window.removeEventListener('pagehide', handleBeforeClose)
      window.removeEventListener('beforeunload', handleBeforeClose)
    }
  }, [backupSettings.backupOnExit])

  useEffect(() => {
    if (!backupSettings.localAutoBackup) return

    const intervalMs = Math.max(60_000, Number(backupSettings.backupIntervalMinutes || 30) * 60_000)
    const timer = window.setInterval(() => {
      const settings = db.getSyncSettings()
      if (!settings.localAutoBackup) return

      const currentBackupState = db.getBackupState()
      const hasPendingChanges = Boolean(
        currentBackupState.lastChangeAt &&
        (!currentBackupState.lastBackupAt || currentBackupState.lastChangeAt > currentBackupState.lastBackupAt)
      )
      const lastRelevantTime = currentBackupState.lastBackupAt ?? currentBackupState.lastChangeAt ?? 0
      const isDue = hasPendingChanges && Date.now() - lastRelevantTime >= intervalMs

      if (isDue) {
        db.downloadBackup({ saveToAutoDirectory: true })
        setBackupState(db.getBackupState())
      }
    }, 60_000)

    return () => window.clearInterval(timer)
  }, [backupSettings.localAutoBackup, backupSettings.backupIntervalMinutes])

  useEffect(() => {
    if (!isUnlocked) {
      pinInputRef.current?.focus()
    }
  }, [isUnlocked])

  const handlePinSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (enteredPin.trim() === DASHBOARD_PIN) {
      setIsUnlocked(true)
      setPinError(false)
      setEnteredPin("")
    } else {
      setPinError(true)
    }
  }

  const handleExport = async () => {
    const saved = await db.downloadBackup({ selectLocation: true })
    if (!saved) return
    toast({ title: t.success, description: t.exportData })
  }

  const handleBackupToggle = (checked: boolean) => {
    const nextSettings = db.setSyncSettings({ localAutoBackup: checked })
    setBackupSettings(nextSettings)
    toast({ title: t.success, description: checked ? "تم تفعيل النسخ الاحتياطي التلقائي" : "تم إيقاف النسخ الاحتياطي التلقائي" })
  }

  const handleAutoBackupDirectorySelect = async () => {
    try {
      const directoryName = await db.chooseAutoBackupDirectory()
      if (!directoryName) return
      setAutoBackupDirectoryName(directoryName)
      toast({ title: t.success, description: `سيتم حفظ النسخ التلقائية في مجلد ${directoryName}` })
    } catch {
      toast({ title: t.error, description: "تعذر حفظ المجلد المختار للنسخ التلقائي.", variant: "destructive" })
    }
  }

  const handleBackupIntervalChange = (value: string) => {
    const nextSettings = db.setSyncSettings({ backupIntervalMinutes: Number(value) })
    setBackupSettings(nextSettings)
  }

  const handleBackupOnExitToggle = (checked: boolean) => {
    const nextSettings = db.setSyncSettings({ backupOnExit: checked })
    setBackupSettings(nextSettings)
    toast({ title: t.success, description: checked ? "سيتم النسخ عند إغلاق التطبيق" : "تم إيقاف النسخ عند الإغلاق" })
  }

  const handleManualBackup = async () => {
    const saved = await db.downloadBackup({ selectLocation: true })
    if (!saved) return
    setBackupState(db.getBackupState())
    toast({ title: t.success, description: t.exportData })
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        db.importAll(data)
        toast({ title: t.success, description: t.importSuccess })
        loadStats()
      } catch (err) {
        toast({ title: t.error, description: t.importError, variant: "destructive" })
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  return (
    <div
      className="relative p-8 min-h-screen bg-center bg-cover bg-no-repeat"
      style={{
        backgroundImage: "url('/king2.png')",
        backgroundSize: "450px",
        backgroundPosition: "bottom center"
      }}
    >
      <div className="relative">
        {!isUnlocked && (
          <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-slate-950/85 px-4 backdrop-blur-sm">
            <div className="pointer-events-auto w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900/95 p-6 shadow-2xl">
              <h2 className="text-xl font-semibold text-white">ادخل الرقم السري</h2>
              <p className="mt-2 text-sm text-slate-400">هذا الداشبورد محمي برقم سري. لا يمكن رؤية البيانات إلا بعد إدخاله.</p>
              <form onSubmit={handlePinSubmit} className="mt-5 space-y-4">
                <label className="block text-sm font-medium text-slate-200">الرقم السري</label>
                <input
                  ref={pinInputRef}
                  type="password"
                  value={enteredPin}
                  onChange={(e) => {
                    setEnteredPin(e.target.value)
                    if (pinError) setPinError(false)
                  }}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-white placeholder:text-slate-500 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/40"
                  placeholder="••••"
                />
                {pinError && <p className="text-sm text-red-400">الرقم غير صحيح، حاول مرة أخرى.</p>}
                <div className="flex flex-col gap-2">
                  <Button type="submit" className="w-full">دخول</Button>
                  <Button type="button" variant="outline" className="w-full" onClick={() => router.push('/sales-entry')}>سجل مبيعاتك الان</Button>

                </div>
              </form>
            </div>
          </div>
        )}
        <div className={`${!isUnlocked ? "blur-2xl" : ""} space-y-12`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 ">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-headline font-bold text-primary">{t.dashboard}</h1>
          <p className="text-muted-foreground">{t.welcome}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleManualBackup} className="gap-2">
            <Download className="h-4 w-4" /> نسخة احتياطية الآن
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" /> {t.exportData}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" /> {t.importData}
          </Button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
        </div>
      </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_0.8fr]">
        <Card className="border border-emerald-200 bg-emerald-50/90 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-900/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
              <span>{t.autoLocalBackup}</span>
              <Download className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">{t.enableAutoLocalBackup}</p>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">{t.localBackupDesc}</p>
              </div>
              <Switch checked={backupSettings.localAutoBackup} onCheckedChange={handleBackupToggle} />
            </div>
            <div className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-white/70 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-emerald-900/50 dark:bg-slate-900/40">
              <div>
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">مجلد النسخ التلقائية</p>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                  {autoBackupDirectoryName ? `المجلد الحالي: ${autoBackupDirectoryName}` : "لم يتم اختيار مجلد بعد"}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAutoBackupDirectorySelect}>
                اختيار مجلد
              </Button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">{t.backupInterval}</p>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">{t.backupIntervalHint}</p>
              </div>
              <Select value={String(backupSettings.backupIntervalMinutes)} onValueChange={handleBackupIntervalChange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="اختر الفترة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">{t.every15Minutes}</SelectItem>
                  <SelectItem value="30">{t.every30Minutes}</SelectItem>
                  <SelectItem value="60">{t.every60Minutes}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-start justify-between gap-4 rounded-lg border border-emerald-200 bg-white/70 p-3 dark:border-emerald-900/50 dark:bg-slate-900/40">
              <div>
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">{t.backupOnExit}</p>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">{t.backupOnExitHint}</p>
              </div>
              <Switch checked={backupSettings.backupOnExit} onCheckedChange={handleBackupOnExitToggle} />
            </div>
            <Button variant="outline" size="sm" onClick={handleManualBackup} className="gap-2">
              <Download className="h-4 w-4" /> {t.exportData}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white/80 dark:bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">حالة النسخ الاحتياطي</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>التفعيل التلقائي</span>
              <span className={backupSettings.localAutoBackup ? "font-semibold text-emerald-600" : "font-semibold text-slate-500"}>
                {backupSettings.localAutoBackup ? "مفعل" : "متوقف"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>{t.lastBackup}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {backupState.lastBackupAt ? new Date(backupState.lastBackupAt).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" }) : t.never}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* الصف العلوي: إحصائيات اليوم */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-10 mt-8">
        <Card className="border-none shadow-md bg-blue-50 dark:bg-blue-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between text-blue-800 dark:text-blue-300">
              {t.todayRevenue}
              <DollarSign className="w-4 h-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">${stats.revenueToday.toFixed(2)}</div>
            <p className="text-[10px] text-blue-600/80">إجمالي قيمة مبيعات اليوم</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-green-50 dark:bg-green-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between text-green-800 dark:text-green-300">
              {t.todayProfit}
              <TrendingUp className="w-4 h-4 text-green-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">${stats.profitToday.toFixed(2)}</div>
            <p className="text-[10px] text-green-600/80">صافي ربح مبيعات اليوم</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-red-50 dark:bg-red-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between text-red-800 dark:text-red-300">
              {t.debtIssuedToday}
              <ArrowUpRight className="w-4 h-4 text-red-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">${stats.debtIssuedToday.toFixed(2)}</div>
            <p className="text-[10px] text-red-600/80">الديون التي خرجت اليوم</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-amber-50 dark:bg-amber-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between text-amber-800 dark:text-amber-300">
              {t.debtCollectedToday}
              <Wallet className="w-4 h-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">${stats.debtPaidToday.toFixed(2)}</div>
            <p className="text-[10px] text-amber-600/80">ديون قام العملاء بسدادها اليوم</p>
          </CardContent>
        </Card>
      </div>

      {/* الصف السفلي: إحصائيات الشهر والمخزون */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-6">
        <Card className="border-none shadow-sm bg-white dark:bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              {t.monthRevenue}
              <BarChart2 className="h-4 w-4 text-slate-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">${stats.revenueMonth.toFixed(2)}</div>
            <p className="text-[10px] text-muted-foreground">إجمالي مبيعات الشهر</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              {t.monthProfit}
              <TrendingUp className="h-4 w-4 text-primary-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">${stats.profitMonth.toFixed(2)}</div>
            <p className="text-[10px] opacity-80">صافي أرباح الشهر</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-slate-100 dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between text-slate-700 dark:text-slate-300">
              إيرادات الشهر الماضي
              <BarChart2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100">${stats.revenueLastMonth.toFixed(2)}</div>
            <p className="text-[10px] text-slate-600 dark:text-slate-400">مبيعات الشهر السابق</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-indigo-50 dark:bg-indigo-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between text-indigo-700 dark:text-indigo-300">
              ربح الشهر الماضي
              <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-indigo-700 dark:text-indigo-300">${stats.profitLastMonth.toFixed(2)}</div>
            <p className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80">صافي الأرباح السابقة</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Box className="h-4 w-4 text-slate-500" />
              {t.totalProducts}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.totalProducts}</div>
            <p className="text-[10px] text-muted-foreground">{t.productCatalog}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-slate-500" />
              {t.todaySales}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.totalSalesToday}</div>
            <p className="text-[10px] text-muted-foreground">{t.salesRecorded}</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-3xl bg-white/90 dark:bg-slate-900/80 shadow-2xl shadow-slate-200/60 dark:shadow-slate-950/60 p-6 backdrop-blur-sm mt-10 border border-slate-200/80 dark:border-slate-800/80">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">مخطط الشهور السابقة</h2>
            <p className="mt-1 text-sm text-muted-foreground">قف على العمود أو اضغط لتعرف قيمة كل عنصر.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 dark:border-slate-700/80 dark:bg-slate-950/60">
              <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" />
              <span>إيرادات</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 dark:border-slate-700/80 dark:bg-slate-950/60">
              <span className="h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
              <span>الربح</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 dark:border-slate-700/80 dark:bg-slate-950/60">
              <span className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />
              <span>المصروفات</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 dark:border-slate-700/80 dark:bg-slate-950/60">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
              <span>{t.debtIssuedMonth}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 dark:border-slate-700/80 dark:bg-slate-950/60">
              <span className="h-2.5 w-2.5 rounded-full bg-[#a855f7]" />
              <span>{t.debtCollectedMonth}</span>
            </div>
          </div>
        </div>

        <ChartContainer
          config={{
            revenue: { label: "الإيرادات", color: "#2563eb" },
            profit: { label: "الربح", color: "#16a34a" },
            expenses: { label: "المصروفات", color: "#f97316" },
            debtIssued: { label: t.debtIssuedMonth, color: "#ef4444" },
            debtCollected: { label: t.debtCollectedMonth, color: "#a855f7" },
          }}
          className="mt-4 h-[420px] w-full bg-transparent"
          style={{ direction: "ltr" }}
        >
          <RechartsPrimitive.BarChart
            data={monthlyChartData}
            margin={{ top: 36, right: 18, left: 0, bottom: 16 }}
            barGap={14}
            barCategoryGap="14%"
          >
            <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <RechartsPrimitive.XAxis
              dataKey="month"
              type="category"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#64748b" }}
              tickMargin={10}
            />
            <RechartsPrimitive.YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#64748b" }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <RechartsPrimitive.Legend
              verticalAlign="top"
              align="center"
              height={36}
              iconType="circle"
              wrapperStyle={{ paddingBottom: 12 }}
              content={
                <ChartLegendContent className="justify-center flex-wrap gap-4 px-2" />
              }
            />
            <RechartsPrimitive.Tooltip
              cursor={{ fill: "rgba(15, 23, 42, 0.05)" }}
              content={
                <ChartTooltipContent
                  hideLabel={false}
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, ""]}
                />
              }
            />
            <RechartsPrimitive.Bar dataKey="revenue" name="الإيرادات" fill="#2563eb" radius={[8, 8, 0, 0]} barSize={36}>
              {monthlyChartData.map((entry, index) => (
                <RechartsPrimitive.Cell
                  key={`revenue-cell-${index}`}
                  fill={entry.revenue === 0 ? "#9ca3af" : "#2563eb"}
                />
              ))}
            </RechartsPrimitive.Bar>
            <RechartsPrimitive.Bar dataKey="expenses" name="المصروفات" fill="#f97316" radius={[8, 8, 0, 0]} barSize={36}>
              {monthlyChartData.map((entry, index) => (
                <RechartsPrimitive.Cell
                  key={`expenses-cell-${index}`}
                  fill={entry.expenses === 0 ? "#9ca3af" : "#f97316"}
                />
              ))}
            </RechartsPrimitive.Bar>
            <RechartsPrimitive.Bar dataKey="debtIssued" name={t.debtIssuedMonth} fill="#ef4444" radius={[8, 8, 0, 0]} barSize={36}>
              {monthlyChartData.map((entry, index) => (
                <RechartsPrimitive.Cell
                  key={`debt-issued-cell-${index}`}
                  fill={!entry.debtIssued ? "#9ca3af" : "#ef4444"}
                />
              ))}
            </RechartsPrimitive.Bar>
            <RechartsPrimitive.Bar dataKey="debtCollected" name={t.debtCollectedMonth} fill="#a855f7" radius={[8, 8, 0, 0]} barSize={36}>
              {monthlyChartData.map((entry, index) => (
                <RechartsPrimitive.Cell
                  key={`debt-collected-cell-${index}`}
                  fill={!entry.debtCollected ? "#cbd5e1" : "#a855f7"}
                />
              ))}
            </RechartsPrimitive.Bar>
            <RechartsPrimitive.Bar dataKey="profit" name="الربح" fill="#16a34a" radius={[8, 8, 0, 0]} barSize={36}>
              {monthlyChartData.map((entry, index) => (
                <RechartsPrimitive.Cell
                  key={`profit-cell-${index}`}
                  fill={entry.profit === 0 ? "#9ca3af" : "#16a34a"}
                />
              ))}
            </RechartsPrimitive.Bar>
          </RechartsPrimitive.BarChart>
        </ChartContainer>
      </div>
    </div>
  </div>
  )
}
