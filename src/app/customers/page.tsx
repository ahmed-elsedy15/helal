
"use client"

import { useEffect, useState, useCallback } from "react"
import { db, Customer, DB_UPDATE_EVENT } from "@/lib/db"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, Search, Phone, User, DollarSign, Edit2, Trash2, Wallet, Star, Eye, ChevronDown, History } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/context/language-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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

export default function CustomersPage() {
  const { t } = useTranslation()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPayModalOpen, setIsPayModalOpen] = useState(false)
  const [isDebtDetailsOpen, setIsDebtDetailsOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState("")
  const [selectedDebtSaleId, setSelectedDebtSaleId] = useState<string | null>(null)
  const [debtPayAmount, setDebtPayAmount] = useState("")
  const [formData, setFormData] = useState({ name: "", phone: "", type: "regular" as "regular" | "special" })
  const { toast } = useToast()

  const loadCustomers = useCallback(() => {
    setCustomers(db.getCustomers())
  }, [])

  useEffect(() => {
    loadCustomers()
    
    window.addEventListener(DB_UPDATE_EVENT, loadCustomers)
    window.addEventListener('storage', loadCustomers)
    
    return () => {
      window.removeEventListener(DB_UPDATE_EVENT, loadCustomers)
      window.removeEventListener('storage', loadCustomers)
    };
  }, [loadCustomers])

  const handleSave = () => {
    if (!formData.name) {
      toast({ title: t.error, description: "Please enter customer name.", variant: "destructive" })
      return
    }

    if (editingCustomer) {
      db.updateCustomer(editingCustomer.id, formData)
      toast({ title: t.success, description: "Customer updated successfully." })
    } else {
      db.addCustomer(formData)
      toast({ title: t.success, description: "Customer added successfully." })
    }

    loadCustomers()
    setIsModalOpen(false)
    resetForm()
  }

  const handleDelete = () => {
    if (!customerToDelete) return
    db.deleteCustomer(customerToDelete)
    loadCustomers()
    toast({ title: t.success, description: "Customer removed." })
    setCustomerToDelete(null)
  }

  const handlePayDebt = () => {
    if (!selectedCustomer || !payAmount) return
    const amount = parseFloat(payAmount)
    if (isNaN(amount) || amount <= 0) return

    db.updateCustomerDebt(selectedCustomer.id, -amount)
    toast({ title: t.success, description: t.debtCleared })
    loadCustomers()
    setIsPayModalOpen(false)
    setPayAmount("")
    setSelectedCustomer(null)
  }

  const handlePaySingleDebt = () => {
    if (!selectedCustomer || !selectedDebtSaleId || !debtPayAmount) return
    const amount = parseFloat(debtPayAmount)
    if (isNaN(amount) || amount <= 0) return

    db.payDebtForSale(selectedDebtSaleId, selectedCustomer.id, amount)
    toast({ title: t.success, description: "Debt payment recorded successfully." })
    loadCustomers()
    setDebtPayAmount("")
    setSelectedDebtSaleId(null)
  }

  const resetForm = () => {
    setFormData({ name: "", phone: "", type: "regular" })
    setEditingCustomer(null)
  }

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({ name: customer.name, phone: customer.phone, type: customer.type || "regular" })
    setIsModalOpen(true)
  }

  const openDebtDetails = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsDebtDetailsOpen(true)
  }

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  )

  const totalDebt = customers.reduce((sum, c) => sum + (Number(c.totalDebt) || 0), 0)

  const currentTotalDebt = Number(selectedCustomer?.totalDebt) || 0;
  const currentPayAmount = parseFloat(payAmount) || 0;
  const remainingDebtAmount = Math.max(0, currentTotalDebt - currentPayAmount);

  const unpaidDebts = selectedCustomer ? db.getUnpaidDebts(selectedCustomer.id) : [];
  const totalUnpaidDebt = unpaidDebts.reduce((sum, d) => sum + Number(d.remainingDebt), 0);
  const monthlyDebts = selectedCustomer ? db.getMonthlyDebts(selectedCustomer.id) : 0;
  const paymentHistory = selectedCustomer ? db.getCustomerPaymentHistory(selectedCustomer.id) : [];
  const allDebtHistory = selectedCustomer ? db.getCustomerDebtHistory(selectedCustomer.id) : [];

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">{t.customers}</h1>
          <p className="text-muted-foreground">{t.welcome}</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="mr-2 h-4 w-4" /> {t.addCustomer}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCustomer ? t.editCustomer : t.addCustomer}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label>{t.customerType}</Label>
                <RadioGroup 
                  value={formData.type} 
                  onValueChange={(val) => setFormData({...formData, type: val as any})}
                  className="grid grid-cols-2 gap-4"
                >
                  <Label htmlFor="regular" className={cn("flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer", formData.type === 'regular' ? "border-primary bg-primary/5" : "border-slate-100")}>
                    <RadioGroupItem value="regular" id="regular" />
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">{t.regularCustomer}</span>
                  </Label>
                  <Label htmlFor="special" className={cn("flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer", formData.type === 'special' ? "border-amber-500 bg-amber-500/5" : "border-slate-100")}>
                    <RadioGroupItem value="special" id="special" />
                    <Star className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">{t.specialCustomer}</span>
                  </Label>
                </RadioGroup>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">{t.customerName}</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">{t.phone}</Label>
                <Input 
                  id="phone" 
                  value={formData.phone} 
                  onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>{t.cancel}</Button>
              <Button onClick={handleSave}>{t.save}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-md bg-red-50 dark:bg-red-900/10 col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400">{t.totalDebt}</CardTitle>
            <DollarSign className="w-4 h-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">${totalDebt.toFixed(2)}</div>
            <p className="text-xs text-red-600/80 dark:text-red-400/80">{t.topDebtors}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className={`absolute ${t.lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
        <Input 
          className={t.lang === 'ar' ? 'pr-10' : 'pl-10'} 
          placeholder={t.searchCustomers} 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>{t.customerName}</TableHead>
              <TableHead>{t.customerType}</TableHead>
              <TableHead>{t.phone}</TableHead>
              {/* <TableHead>الديون هذا الشهر</TableHead> */}
              <TableHead>{t.totalDebt}</TableHead>
              <TableHead className={t.lang === 'ar' ? 'text-left' : 'text-right'}>{t.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {customer.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {customer.type === 'special' ? (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                        <Star className="h-3 w-3 mr-1 fill-amber-500" /> {t.specialCustomer}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-600">
                        {t.regularCustomer}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {customer.phone || "-"}
                    </div>
                  </TableCell>
                  {/* <TableCell>
                    <span className={`font-bold ${db.getMonthlyDebts(customer.id) > 0 ? 'text-orange-600' : 'text-slate-600'}`}>
                      ${(db.getMonthlyDebts(customer.id) || 0).toFixed(2)}
                    </span>
                  </TableCell> */}
                  <TableCell>
                    <span className={`font-bold ${customer.totalDebt > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600'}`}>
                      ${(Number(customer.totalDebt) || 0).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className={`${t.lang === 'ar' ? 'text-left' : 'text-right'} space-x-2 rtl:space-x-reverse`}>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(customer)}>
                      <Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setCustomerToDelete(customer.id)}>
                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </Button>
                    {customer.totalDebt > 0 && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                          onClick={() => openDebtDetails(customer)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {t.debtDetails}
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {t.noCustomers}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDebtDetailsOpen} onOpenChange={setIsDebtDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.debtDetails} - {selectedCustomer?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {unpaidDebts.length > 0 ? (
              <>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground uppercase">إجمالي الديون</Label>
                    <div className="text-xl font-bold text-red-600">
                      ${totalUnpaidDebt.toFixed(2)}
                    </div>
                  </div>
                  <div className="h-10 w-px bg-border mx-4" />
                  <div className="grid gap-1 text-right">
                    <Label className="text-xs text-muted-foreground uppercase">عدد الديون</Label>
                    <div className="text-xl font-bold text-orange-600">
                      {unpaidDebts.length}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {unpaidDebts.map((debt) => (
                    <Collapsible key={debt.id} className="border rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <button className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-4 flex-1 text-left">
                            <div className="flex-1">
                              <h4 className="font-bold text-primary">{debt.productName}</h4>
                              <p className="text-sm text-muted-foreground">{debt.date}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-red-600">${debt.remainingDebt.toFixed(2)}</p>
                              {debt.paidAmount > 0 && (
                                <p className="text-xs text-green-600">تم دفع: ${debt.paidAmount.toFixed(2)}</p>
                              )}
                            </div>
                          </div>
                          <ChevronDown className="h-4 w-4 ml-2 transition-transform" />
                        </button>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="border-t px-4 py-3 bg-muted/20 space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <Label className="text-muted-foreground">الكمية</Label>
                            <p className="font-bold">{debt.quantitySold}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">السعر للوحدة</Label>
                            <p className="font-bold">${debt.sellingPriceAtSale.toFixed(2)}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">الإجمالي</Label>
                            <p className="font-bold">${debt.debtAmount.toFixed(2)}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">المدفوع</Label>
                            <p className="font-bold text-green-600">${debt.paidAmount.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`payAmount-${debt.id}`} className="font-bold">تسديد جزء من الدين</Label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input 
                                id={`payAmount-${debt.id}`}
                                type="number"
                                className="pl-9"
                                placeholder={`0.00 (الحد الأقصى: ${debt.remainingDebt.toFixed(2)})`}
                                value={selectedDebtSaleId === debt.id ? debtPayAmount : ""}
                                onChange={(e) => {
                                  setSelectedDebtSaleId(debt.id)
                                  setDebtPayAmount(e.target.value)
                                }}
                              />
                            </div>
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => {
                                setSelectedDebtSaleId(debt.id)
                                handlePaySingleDebt()
                              }}
                              disabled={selectedDebtSaleId !== debt.id || !debtPayAmount}
                            >
                              دفع
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t space-y-3">
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-green-600" />
                    سجل الدفعات المسددة
                  </h4>
                  {paymentHistory.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {paymentHistory.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex-1">
                            <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">{payment.productName}</p>
                            <p className="text-xs text-muted-foreground">التاريخ: {payment.date}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">+${payment.amount.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">لم يتم تسديد أي مبالغ بعد</p>
                  )}
                </div>
              </>
            ) : allDebtHistory.length > 0 ? (
              // لا توجد ديون متبقية لكن هناك ديون سابقة
              <div className="space-y-4">
                <div className="flex items-center justify-center p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-center">
                    <p className="font-bold text-green-700 dark:text-green-400 mb-1">✓ لا توجد ديون متبقية</p>
                    <p className="text-sm text-muted-foreground">جميع الديون تم تسديدها بنجاح</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <History className="h-4 w-4 text-slate-600" />
                    سجل الديون السابقة (مسددة)
                  </h4>
                  <div className="space-y-3">
                    {allDebtHistory.map((debt) => (
                      <Collapsible key={debt.id} className="border rounded-lg overflow-hidden">
                        <CollapsibleTrigger asChild>
                          <button className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-4 flex-1 text-left">
                              <div className="flex-1">
                                <h4 className="font-bold text-primary">{debt.productName}</h4>
                                <p className="text-sm text-muted-foreground">{debt.date}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-green-600">✓ مسدد</p>
                                <p className="text-sm font-semibold">${debt.debtAmount.toFixed(2)}</p>
                              </div>
                            </div>
                            <ChevronDown className="h-4 w-4 ml-2 transition-transform" />
                          </button>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent className="border-t px-4 py-3 bg-muted/20 space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <Label className="text-muted-foreground">الكمية</Label>
                              <p className="font-bold">{debt.quantitySold}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">السعر للوحدة</Label>
                              <p className="font-bold">${debt.sellingPriceAtSale.toFixed(2)}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">الإجمالي</Label>
                              <p className="font-bold">${debt.debtAmount.toFixed(2)}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">المدفوع</Label>
                              <p className="font-bold text-green-600">${debt.paidAmount.toFixed(2)}</p>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-6 border-t">
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-green-600" />
                    سجل الدفعات المسددة
                  </h4>
                  {paymentHistory.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {paymentHistory.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex-1">
                            <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">{payment.productName}</p>
                            <p className="text-xs text-muted-foreground">التاريخ: {payment.date}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">+${payment.amount.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">لم يتم تسجيل دفعات</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">لا توجد ديون أو سجل للعميل</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDebtDetailsOpen(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.payDebt} - {selectedCustomer?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground uppercase">{t.totalDebt}</Label>
                <div className="text-xl font-bold text-red-600">
                  ${currentTotalDebt.toFixed(2)}
                </div>
              </div>
              <div className="h-10 w-px bg-border mx-4" />
              <div className="grid gap-1 text-right">
                <Label className="text-xs text-muted-foreground uppercase">{t.remainingDebt}</Label>
                <div className={`text-xl font-bold ${remainingDebtAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  ${remainingDebtAmount.toFixed(2)}
                </div>
              </div>
            </div>
            
            <div className="grid gap-3">
              <Label htmlFor="payAmount" className="font-bold">{t.amountToPay}</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="payAmount" 
                  type="number"
                  className="pl-9 h-12 text-lg font-bold"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPayModalOpen(false)}>{t.cancel}</Button>
            <Button onClick={handlePayDebt} className="bg-green-600 hover:bg-green-700 text-white font-bold px-8">
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteConfirm}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.deleteConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCustomerToDelete(null)}>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t.save}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
