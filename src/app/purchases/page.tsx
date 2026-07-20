"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { db, DB_UPDATE_EVENT, Product, Purchase, PurchaseItem } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/context/language-context"
import { Eye, Pencil, Plus, Search, Trash2, Truck, X } from "lucide-react"

type DraftItem = { productId: string; quantity: string; purchasePrice: string; sellingPrice: string }

const emptyItem = (): DraftItem => ({ productId: "", quantity: "", purchasePrice: "", sellingPrice: "" })

// Simple searchable dropdown for picking a product out of a long list.
// The results list is portaled into `containerRef` (a wrapper inside the Dialog,
// positioned `relative`) rather than document.body. Portaling to document.body made
// Radix's Dialog treat clicks on the list as "outside the dialog" and swallow them
// before the click could register - selecting a product silently did nothing.
// Portaling inside the Dialog's own DOM fixes that, while `position: absolute`
// (computed from the container's rect) still lets the list escape the ScrollArea's
// clipping, since the container itself sits outside the scrollable viewport.
function ProductCombobox({ products, value, onChange, containerRef }: { products: Product[]; value: string; onChange: (id: string) => void; containerRef: React.RefObject<HTMLDivElement> }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selected = products.find(p => p.id === value)

  useEffect(() => {
    // keep the visible text in sync with the selected product when not actively typing
    if (!open) setQuery(selected ? selected.name : "")
  }, [selected, open])

  const updatePos = useCallback(() => {
    const inputEl = wrapperRef.current
    const containerEl = containerRef.current
    if (!inputEl || !containerEl) return
    const inputRect = inputEl.getBoundingClientRect()
    const containerRect = containerEl.getBoundingClientRect()
    setPos({ top: inputRect.bottom - containerRect.top + 4, left: inputRect.left - containerRect.left, width: inputRect.width })
  }, [containerRef])

  useEffect(() => {
    if (!open) return
    updatePos()
    const onScrollOrResize = () => updatePos()
    // capture:true so this fires for scroll inside the ScrollArea viewport too, not just window
    window.addEventListener("scroll", onScrollOrResize, true)
    window.addEventListener("resize", onScrollOrResize)
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true)
      window.removeEventListener("resize", onScrollOrResize)
    }
  }, [open, updatePos])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (wrapperRef.current?.contains(target)) return
      if (listRef.current?.contains(target)) return
      setOpen(false)
      setQuery(selected ? selected.name : "")
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [selected])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter(p => p.name.toLowerCase().includes(q))
  }, [products, query])

  return (
    <div className="relative" ref={wrapperRef}>
      <Search className="absolute rtl:right-2 ltr:left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        className="rtl:pr-7 ltr:pl-7 h-10"
        placeholder="ابحث عن منتج..."
        value={query}
        onFocus={() => setOpen(true)}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
      />
      {open && pos && containerRef.current && createPortal(
        <div
          ref={listRef}
          className="absolute z-50 max-h-56 overflow-auto rounded-md border bg-popover shadow-lg"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          {filtered.length ? filtered.map(p => (
            <button
              type="button"
              key={p.id}
              className={`w-full flex items-center justify-between gap-2 text-right rtl:text-right ltr:text-left px-3 py-2 text-sm hover:bg-muted ${p.id === value ? "bg-muted font-bold" : ""}`}
              onClick={() => { onChange(p.id); setQuery(p.name); setOpen(false) }}
            >
              <span>{p.name}</span>
              <span className={`text-xs shrink-0 ${Number(p.quantity) > 0 ? "text-muted-foreground" : "text-red-600"}`}>المخزون: {p.quantity}</span>
            </button>
          )) : <div className="px-3 py-2 text-sm text-muted-foreground">لا توجد نتائج</div>}
        </div>,
        containerRef.current
      )}
    </div>
  )
}

export default function PurchasesPage() {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Purchase | null>(null)
  const [invoiceToDelete, setInvoiceToDelete] = useState<Purchase | null>(null)
  const [supplierName, setSupplierName] = useState("")
  const [items, setItems] = useState<DraftItem[]>([emptyItem()])
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null)
  const invoiceBodyRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(() => {
    setPurchases(db.getPurchases())
    setProducts(db.getProducts())
  }, [])

  useEffect(() => {
    loadData()
    window.addEventListener(DB_UPDATE_EVENT, loadData)
    window.addEventListener("storage", loadData)
    return () => { window.removeEventListener(DB_UPDATE_EVENT, loadData); window.removeEventListener("storage", loadData) }
  }, [loadData])

  const resetInvoice = () => { setSupplierName(""); setItems([emptyItem()]); setEditingInvoiceId(null) }
  const updateItem = (index: number, field: keyof DraftItem, value: string) => {
    setItems(current => current.map((item, i) => {
      if (i !== index) return item
      if (field === "productId") {
        const product = products.find(p => p.id === value)
        return { ...item, productId: value, purchasePrice: product ? String(product.purchasePrice || 0) : "", sellingPrice: product ? String(product.sellingPrice || product.price || 0) : "" }
      }
      return { ...item, [field]: value }
    }))
  }

  const invoiceItems = (purchase: Purchase): PurchaseItem[] => purchase.items || [{ productId: purchase.productId, productName: purchase.productName, quantityAdded: purchase.quantityAdded, purchasePrice: purchase.purchasePrice, sellingPrice: purchase.sellingPrice }]
  const invoiceTotal = (purchase: Purchase) => invoiceItems(purchase).reduce((sum, item) => sum + Number(item.quantityAdded) * Number(item.purchasePrice), 0)

  const openNewInvoice = () => { resetInvoice(); setIsInvoiceOpen(true) }

  const openEditInvoice = (purchase: Purchase) => {
    setSupplierName(purchase.supplierName || "")
    setItems(invoiceItems(purchase).map(item => ({
      productId: item.productId,
      quantity: String(item.quantityAdded),
      purchasePrice: String(item.purchasePrice),
      sellingPrice: String(item.sellingPrice),
    })))
    setEditingInvoiceId(purchase.id)
    setIsInvoiceOpen(true)
  }

  const saveInvoice = () => {
    if (!supplierName.trim() || items.some(item => !item.productId || !item.quantity || !item.purchasePrice || !item.sellingPrice)) {
      toast({ title: t.error, description: "اكتب اسم المورد وأكمل بيانات كل الأصناف.", variant: "destructive" })
      return
    }
    if (new Set(items.map(item => item.productId)).size !== items.length) {
      toast({ title: t.error, description: "لا يمكن إضافة نفس المنتج أكثر من مرة في الفاتورة.", variant: "destructive" })
      return
    }
    try {
      const invoiceItemsToSave: PurchaseItem[] = items.map(item => {
        const product = products.find(p => p.id === item.productId)!
        return { productId: product.id, productName: product.name, quantityAdded: Number(item.quantity), purchasePrice: Number(item.purchasePrice), sellingPrice: Number(item.sellingPrice) }
      })
      if (editingInvoiceId) {
        db.updatePurchaseInvoice(editingInvoiceId, invoiceItemsToSave, supplierName.trim())
        toast({ title: t.success, description: "تم تعديل فاتورة المشتريات وتحديث المخزون." })
      } else {
        db.recordPurchaseInvoice(invoiceItemsToSave, supplierName.trim())
        toast({ title: t.success, description: "تم حفظ فاتورة المشتريات وتحديث المخزون." })
      }
      setIsInvoiceOpen(false); resetInvoice(); loadData()
    } catch (error: any) { toast({ title: t.error, description: error.message, variant: "destructive" }) }
  }

  const filteredPurchases = useMemo(() => purchases.filter(p => p.supplierName?.toLowerCase().includes(search.toLowerCase()) || invoiceItems(p).some(item => item.productName.toLowerCase().includes(search.toLowerCase()))), [purchases, search])
  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString("ar-EG")

  const deleteInvoice = () => {
    if (!invoiceToDelete) return
    try { db.deletePurchase(invoiceToDelete.id); toast({ title: t.success, description: "تم حذف الفاتورة وتعديل المخزون." }); setInvoiceToDelete(null); loadData() }
    catch (error: any) { toast({ title: t.error, description: error.message, variant: "destructive" }); setInvoiceToDelete(null) }
  }

  return (
    <div className="p-8 space-y-8" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-headline font-bold text-primary">{t.purchases}</h1><p className="text-muted-foreground">سجّل كل أصناف المورد في فاتورة واحدة.</p></div>
        <Dialog open={isInvoiceOpen} onOpenChange={(open) => { setIsInvoiceOpen(open); if (!open) resetInvoice() }}>
          <DialogTrigger asChild><Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={openNewInvoice}><Plus className="h-4 w-4" /> {t.addPurchase}</Button></DialogTrigger>
          <DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{editingInvoiceId ? "تعديل فاتورة مشتريات" : "فاتورة مشتريات جديدة"}</DialogTitle></DialogHeader>
            <div className="relative grid gap-3 py-3" ref={invoiceBodyRef}><div className="grid gap-2"><Label>اسم المورد</Label><Input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="اسم المورد" /></div>
              <ScrollArea className="max-h-[48vh] border rounded-lg"><div className="p-3 space-y-3">
                {items.map((item, index) => <div key={index} className="space-y-2 rounded-lg bg-muted/40 p-3">
                  <div className="grid gap-1"><Label>المنتج</Label><ProductCombobox products={products} value={item.productId} onChange={(id) => updateItem(index, "productId", id)} containerRef={invoiceBodyRef} />
                    {item.productId && (() => { const p = products.find(pr => pr.id === item.productId); return p ? <span className={`text-xs ${Number(p.quantity) > 0 ? "text-muted-foreground" : "text-red-600"}`}>المخزون الحالي: {p.quantity}</span> : null })()}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                    <div className="grid gap-1"><Label>الكمية</Label><Input type="number" min="1" value={item.quantity} onChange={e => updateItem(index, "quantity", e.target.value)} /></div>
                    <div className="grid gap-1"><Label>سعر الشراء</Label><Input type="number" min="0" value={item.purchasePrice} onChange={e => updateItem(index, "purchasePrice", e.target.value)} /></div>
                    <div className="grid gap-1"><Label>سعر البيع</Label><Input type="number" min="0" value={item.sellingPrice} onChange={e => updateItem(index, "sellingPrice", e.target.value)} /></div>
                    <Button type="button" variant="ghost" size="icon" disabled={items.length === 1} onClick={() => setItems(current => current.filter((_, i) => i !== index))}><X className="h-4 w-4 text-red-600" /></Button>
                  </div>
                </div>)}
              </div></ScrollArea>
              <div className="flex items-center justify-between"><Button type="button" variant="outline" onClick={() => setItems(current => [...current, emptyItem()])}><Plus className="h-4 w-4 ml-1" /> إضافة منتج</Button><span className="font-bold">إجمالي الفاتورة: ${items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0), 0).toFixed(2)}</span></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsInvoiceOpen(false)}>{t.cancel}</Button><Button onClick={saveInvoice} className="bg-indigo-600 text-white">{editingInvoiceId ? "حفظ التعديلات" : "حفظ الفاتورة"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="relative"><Search className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="rtl:pr-10 ltr:pl-10 h-12" placeholder="ابحث باسم المورد أو المنتج..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="rounded-2xl border-2 bg-card shadow-sm overflow-hidden"><Table><TableHeader><TableRow className="bg-muted/50"><TableHead>المورد</TableHead><TableHead>الأصناف</TableHead><TableHead>إجمالي الفاتورة</TableHead><TableHead>{t.time}</TableHead><TableHead className="text-center">{t.actions}</TableHead></TableRow></TableHeader><TableBody>
        {filteredPurchases.length ? filteredPurchases.map(purchase => <TableRow key={purchase.id}><TableCell className="font-bold"><div className="flex items-center gap-2"><Truck className="h-4 w-4 text-indigo-500" />{purchase.supplierName || "-"}</div></TableCell><TableCell><Badge variant="secondary">{invoiceItems(purchase).length} صنف</Badge></TableCell><TableCell className="font-black text-indigo-600">${invoiceTotal(purchase).toFixed(2)}</TableCell><TableCell className="text-xs"><div>{formatDate(purchase.timestamp)}</div><div className="text-muted-foreground">{new Date(purchase.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div></TableCell><TableCell className="text-center"><Button variant="ghost" size="icon" onClick={() => { setSelectedInvoice(purchase); setIsDetailsOpen(true) }} aria-label="تفاصيل الفاتورة"><Eye className="h-4 w-4 text-blue-600" /></Button><Button variant="ghost" size="icon" onClick={() => openEditInvoice(purchase)} aria-label="تعديل الفاتورة"><Pencil className="h-4 w-4 text-amber-600" /></Button><Button variant="ghost" size="icon" onClick={() => setInvoiceToDelete(purchase)} aria-label="حذف الفاتورة"><Trash2 className="h-4 w-4 text-red-600" /></Button></TableCell></TableRow>) : <TableRow><TableCell colSpan={5} className="h-40 text-center text-muted-foreground">لا توجد فواتير مشتريات مسجلة بعد.</TableCell></TableRow>}
      </TableBody></Table></div>
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>تفاصيل فاتورة المشتريات</DialogTitle></DialogHeader>{selectedInvoice && <div className="space-y-4"><div className="flex justify-between text-sm"><span>المورد: <b>{selectedInvoice.supplierName || "-"}</b></span><span>{formatDate(selectedInvoice.timestamp)}</span></div><Table><TableHeader><TableRow><TableHead>المنتج</TableHead><TableHead>الكمية</TableHead><TableHead>سعر الشراء</TableHead><TableHead>الإجمالي</TableHead></TableRow></TableHeader><TableBody>{invoiceItems(selectedInvoice).map(item => <TableRow key={item.productId}><TableCell>{item.productName}</TableCell><TableCell>{item.quantityAdded}</TableCell><TableCell>${item.purchasePrice.toFixed(2)}</TableCell><TableCell className="font-bold">${(item.quantityAdded * item.purchasePrice).toFixed(2)}</TableCell></TableRow>)}</TableBody></Table><div className="text-left font-black text-lg">إجمالي الفاتورة: ${invoiceTotal(selectedInvoice).toFixed(2)}</div></div>}</DialogContent></Dialog>
      <AlertDialog open={!!invoiceToDelete} onOpenChange={open => !open && setInvoiceToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t.deleteConfirm}</AlertDialogTitle><AlertDialogDescription>سيتم حذف الفاتورة وخصم جميع أصنافها من المخزون.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t.cancel}</AlertDialogCancel><AlertDialogAction onClick={deleteInvoice} className="bg-red-600 hover:bg-red-700">حذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  )
}
