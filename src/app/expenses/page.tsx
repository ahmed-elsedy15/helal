
"use client"

import { useEffect, useState, useCallback } from "react"
import { db, Expense, DB_UPDATE_EVENT, getLocalDateString } from "@/lib/db"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, Search, Receipt, Trash2, Calendar, Edit2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/context/language-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function ExpensesPage() {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [search, setSearch] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [formData, setFormData] = useState({ description: "", amount: "", category: "" })

  const loadExpenses = useCallback(() => {
    setExpenses(db.getExpenses())
  }, [])

  useEffect(() => {
    loadExpenses()
    window.addEventListener(DB_UPDATE_EVENT, loadExpenses)
    window.addEventListener('storage', loadExpenses)
    return () => {
      window.removeEventListener(DB_UPDATE_EVENT, loadExpenses)
      window.removeEventListener('storage', loadExpenses)
    }
  }, [loadExpenses])

  const handleSave = () => {
    if (!formData.description || !formData.amount) {
      toast({ title: t.error, description: "Please fill all fields.", variant: "destructive" })
      return
    }

    if (editingExpense) {
      db.updateExpense(editingExpense.id, {
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
      })
      toast({ title: t.success, description: "Expense updated successfully." })
    } else {
      db.addExpense({
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: getLocalDateString()
      })
      toast({ title: t.success, description: "Expense added successfully." })
    }

    loadExpenses()
    setIsModalOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({ description: "", amount: "", category: "" })
    setEditingExpense(null)
  }

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setFormData({ description: expense.description, amount: expense.amount.toString(), category: expense.category })
    setIsModalOpen(true)
  }

  const handleDelete = () => {
    if (!expenseToDelete) return
    db.deleteExpense(expenseToDelete)
    loadExpenses()
    toast({ title: t.success, description: "Expense removed." })
    setExpenseToDelete(null)
  }

  const filteredExpenses = expenses.filter(e => 
    e.description.toLowerCase().includes(search.toLowerCase()) || 
    e.category.toLowerCase().includes(search.toLowerCase())
  )

  const totalExpensesToday = expenses
    .filter(e => e.date === getLocalDateString())
    .reduce((sum, e) => sum + e.amount, 0)

  const getCurrentMonthExpenses = () => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    return expenses
      .filter(e => {
        const expenseDate = new Date(e.date)
        return expenseDate.getFullYear() === currentYear && expenseDate.getMonth() === currentMonth
      })
      .reduce((sum, e) => sum + e.amount, 0)
  }

  const getLastMonthExpenses = () => {
    const now = new Date()
    let year = now.getFullYear()
    let month = now.getMonth() - 1
    if (month < 0) {
      month = 11
      year -= 1
    }
    return expenses
      .filter(e => {
        const expenseDate = new Date(e.date)
        return expenseDate.getFullYear() === year && expenseDate.getMonth() === month
      })
      .reduce((sum, e) => sum + e.amount, 0)
  }

  const totalCurrentMonth = getCurrentMonthExpenses()
  const totalLastMonth = getLastMonthExpenses()

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-8 space-y-8" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">{t.expenses}</h1>
          <p className="text-muted-foreground">{t.welcome}</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> {t.addExpense}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingExpense ? "تعديل المصروف" : t.addExpense}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="description">{t.expenseDescription}</Label>
                <Input 
                  id="description" 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} 
                  placeholder="مثال: فاتورة كهرباء، إيجار..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">{t.amount}</Label>
                <Input 
                  id="amount" 
                  type="number"
                  value={formData.amount} 
                  onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">{t.expenseCategory}</Label>
                <Input 
                  id="category" 
                  value={formData.category} 
                  onChange={(e) => setFormData({...formData, category: e.target.value})} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>{t.cancel}</Button>
              <Button onClick={handleSave} className="bg-red-600 hover:bg-red-700 text-white">{t.save}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-md bg-red-50 dark:bg-red-900/10 col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400">{t.todayExpenses}</CardTitle>
            <Receipt className="w-4 h-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">${totalExpensesToday.toFixed(2)}</div>
            <p className="text-xs text-red-600/80 dark:text-red-400/80">إجمالي مصروفات اليوم</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-blue-50 dark:bg-blue-900/10 col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">مصروفات الشهر الحالي</CardTitle>
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">${totalCurrentMonth.toFixed(2)}</div>
            <p className="text-xs text-blue-600/80 dark:text-blue-400/80">إجمالي مصروفات الشهر</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-green-50 dark:bg-green-900/10 col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">مصروفات الشهر الماضي</CardTitle>
            <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">${totalLastMonth.toFixed(2)}</div>
            <p className="text-xs text-green-600/80 dark:text-green-400/80">إجمالي مصروفات الشهر الماضي</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className={`absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
        <Input 
          className="ltr:pl-10 rtl:pr-10" 
          placeholder={t.searchExpenses} 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>{t.expenseDescription}</TableHead>
              <TableHead>{t.expenseCategory}</TableHead>
              <TableHead>{t.amount}</TableHead>
              <TableHead>{t.time}</TableHead>
              <TableHead className="text-center">{t.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.length > 0 ? (
              filteredExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-red-500" />
                      {expense.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-slate-600">
                      {expense.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-red-600">
                      ${expense.amount.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    <div className="flex flex-col">
                      <span className="whitespace-nowrap font-medium text-blue-500">{formatDate(expense.timestamp)}</span>
                      <span className="opacity-90 text-[10px]">{formatTime(expense.timestamp)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(expense)}>
                      <Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setExpenseToDelete(expense.id)}>
                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  لا توجد مصروفات مسجلة.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteConfirm}</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا المصروف نهائياً من السجلات.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExpenseToDelete(null)}>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              {t.save}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
