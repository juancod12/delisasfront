import React, { useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import {
  Activity,
  AlertCircle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  MessageSquareText,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Smartphone,
  Trash2,
  Wallet,
} from "lucide-react";
import "react-calendar/dist/Calendar.css";

const API = "http://localhost:8080";
const SECTIONS = {
  open: "Apertura",
  moves: "Movimientos",
  close: "Cierre",
  history: "Historial",
};

export default function Box_Money({ formatCOP }) {
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const today = new Date().toISOString().split("T")[0];

  const [activeSection, setActiveSection] = useState("open");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openingSaving, setOpeningSaving] = useState(false);
  const [closingSaving, setClosingSaving] = useState(false);

  const [openingCash, setOpeningCash] = useState("");
  const [openingComment, setOpeningComment] = useState("");
  const [manualStartingCash, setManualStartingCash] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [bankWithdrawal, setBankWithdrawal] = useState("");
  const [closingComment, setClosingComment] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseComment, setExpenseComment] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyDate, setHistoryDate] = useState(new Date());
  const [historySummary, setHistorySummary] = useState(null);
  const [editingClosure, setEditingClosure] = useState(null);
  const [printSummary, setPrintSummary] = useState(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    const cleanupPrint = () => document.body.classList.remove("box-print-mode");
    window.addEventListener("afterprint", cleanupPrint);
    return () => window.removeEventListener("afterprint", cleanupPrint);
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/box-closures/summary?date=${today}`);
      const data = await res.json();
      const base = Math.round(data.currentOpening?.startingCash ?? data.suggestedStartingCash ?? 0);

      setSummary(data);
      setOpeningCash(String(base));
      setManualStartingCash(String(base));
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const numberValue = (value) => Number(String(value || "").replace(/\D/g, ""));
  const moneyInput = (value) => (value ? formatCOP(numberValue(value)) : "");
  const onMoneyChange = (setter) => (event) => setter(event.target.value.replace(/\D/g, ""));

  const currentOpening = summary?.currentOpening;
  const openings = summary?.openings || [];
  const closures = summary?.closures || [];
  const expenses = summary?.expenses || [];

  const totals = useMemo(() => {
    const base = currentOpening?.startingCash ?? numberValue(manualStartingCash);
    const cashSales = summary?.cashSales || 0;
    const totalExpenses = summary?.totalExpenses || 0;
    const counted = numberValue(countedCash);
    const withdrawal = numberValue(bankWithdrawal);
    const expected = base + cashSales - totalExpenses;
    const difference = countedCash ? counted - expected : 0;
    const remaining = Math.max(0, counted - withdrawal);

    return { base, cashSales, totalExpenses, counted, withdrawal, expected, difference, remaining };
  }, [summary, currentOpening, manualStartingCash, countedCash, bankWithdrawal]);

  const sortedProducts = Object.entries(summary?.products || {}).sort((a, b) => b[1] - a[1]);
  const closedToday = closures.length > 0;
  const varianceTone = !countedCash ? "idle" : totals.difference === 0 ? "ok" : "bad";

  const saveOpening = async () => {
    if (!user.id) return alert("No hay empleado en sesion.");
    if (closedToday) return alert("La caja ya fue cerrada hoy. No se pueden registrar mas aperturas para este dia.");
    if (!openingCash) return alert("Ingresa la base inicial para abrir caja.");

    setOpeningSaving(true);
    try {
      const res = await fetch(`${API}/box-closures/openings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessDate: today,
          startingCash: numberValue(openingCash),
          openingComment: openingComment.trim(),
          employeeId: user.id,
        }),
      });

      if (!res.ok) throw new Error();

      setOpeningComment("");
      setActiveSection("moves");
      await fetchSummary();
      alert("Caja abierta");
    } catch {
      alert("Error guardando apertura");
    } finally {
      setOpeningSaving(false);
    }
  };

  const addExpense = async () => {
    if (!numberValue(expenseAmount)) return;
    if (!expenseComment.trim()) return alert("Agrega un comentario para saber en que se gasto.");

    await fetch(`${API}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: numberValue(expenseAmount),
        comment: expenseComment.trim(),
        employeeId: user.id,
      }),
    });

    setExpenseAmount("");
    setExpenseComment("");
    fetchSummary();
  };

  const deleteExpense = async (id) => {
    await fetch(`${API}/expenses/${id}`, { method: "DELETE" });
    fetchSummary();
  };

  const saveClosure = async () => {
    if (!user.id) return alert("No hay empleado en sesion.");
    if (closedToday) return alert("La caja ya tiene un cierre guardado para hoy. Puedes editar el cierre desde el historial.");
    if (!currentOpening && !manualStartingCash) return alert("Primero abre caja o ingresa una base inicial.");
    if (!countedCash) return alert("Primero cuenta el efectivo real de la caja.");

    setClosingSaving(true);
    try {
      const res = await fetch(`${API}/box-closures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessDate: today,
          startingCash: totals.base,
          countedCash: totals.counted,
          bankWithdrawal: totals.withdrawal,
          remainingCash: totals.remaining,
          closingComment: closingComment.trim(),
          employeeId: user.id,
        }),
      });

      if (!res.ok) throw new Error();

      setClosingComment("");
      setCountedCash("");
      setBankWithdrawal("");
      setActiveSection("history");
      await fetchSummary();
      alert("Cierre de caja guardado");
    } catch {
      alert("Error guardando el cierre");
    } finally {
      setClosingSaving(false);
    }
  };

  const fetchHistoryDate = async (date) => {
    const dateText = toInputDate(date);
    const res = await fetch(`${API}/box-closures/summary?date=${dateText}`);
    const data = await res.json();
    setHistorySummary(data);
  };

  const openHistoryModal = async () => {
    setHistoryOpen(true);
    await fetchHistoryDate(historyDate);
  };

  const editClosure = async (payload) => {
    const res = await fetch(`${API}/box-closures/${payload.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        countedCash: payload.countedCash,
        bankWithdrawal: payload.bankWithdrawal,
        remainingCash: payload.remainingCash,
        closingComment: payload.closingComment,
        editReason: payload.editReason,
        employeeId: user.id,
      }),
    });

    if (!res.ok) {
      alert("No se pudo editar el cierre");
      return;
    }

    setEditingClosure(null);
    await fetchSummary();
    if (historyOpen) await fetchHistoryDate(historyDate);
    alert("Cierre editado y auditado");
  };

  const printBoxSummary = (targetSummary = summary, targetDate = today) => {
    if (!targetSummary) return alert("No hay resumen para imprimir.");
    setPrintSummary({ summary: targetSummary, date: targetDate });
    document.body.classList.add("box-print-mode");
    setTimeout(() => window.print(), 80);
  };

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-50 text-slate-500">
        <RefreshCw className="mr-2 animate-spin" size={18} />
        Cargando caja...
      </div>
    );
  }

  return (
    <div
      className="min-h-full bg-slate-50 text-slate-900"
      style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
    >
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50/95 px-4 py-4 shadow-sm backdrop-blur md:px-6">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Box Money</p>
              <h1 className="m-0 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">Control de caja</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl value={activeSection} onChange={setActiveSection} options={SECTIONS} />
            <StatusPill currentOpening={currentOpening} closedToday={closedToday} />
            <button
              onClick={openHistoryModal}
              className="flex h-10 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100"
            >
              <CalendarDays size={16} />
              Ver otra fecha
            </button>
            <button
              onClick={fetchSummary}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              <RefreshCw size={16} />
              Actualizar
            </button>
            <button
              onClick={() => printBoxSummary(summary, today)}
              className="flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Printer size={16} />
              Imprimir
            </button>
          </div>
        </div>

      </header>

      <main className="space-y-5 overflow-x-hidden p-4 md:p-6">
        <SessionOverview
          currentOpening={currentOpening}
          user={user}
          today={today}
          salesCount={summary?.salesCount || 0}
          totals={totals}
          cashSales={summary?.cashSales || 0}
          expenses={summary?.totalExpenses || 0}
          totalSales={summary?.totalSales || 0}
          formatCOP={formatCOP}
        />

        <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 space-y-5">

          {activeSection === "open" && (
            <Panel
              eyebrow="Apertura"
              title="Inicio de turno"
              caption="Cuenta la base inicial antes de vender. Este registro queda asociado al empleado que abre caja."
              action={currentOpening ? <Badge tone="green">Registrada</Badge> : <Badge tone="amber">Pendiente</Badge>}
              tone="amber"
            >
              {currentOpening ? (
                <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Apertura activa</p>
                    <p className="mt-3 text-3xl font-bold text-slate-950">{formatCOP(currentOpening.startingCash || 0)}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <InfoLine label="Empleado" value={currentOpening.employeeName || "Empleado"} />
                      <InfoLine label="Hora" value={formatTime(currentOpening.openedAt)} />
                    </div>
                    {currentOpening.openingComment && (
                      <p className="mt-4 rounded-lg bg-white p-3 text-sm font-medium text-slate-600">{currentOpening.openingComment}</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-sky-100 bg-sky-50/80 p-4">
                    <p className="text-sm font-bold text-slate-900">Siguiente paso</p>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                      Registra gastos en movimientos durante el turno. Al finalizar, pasa a cierre para comparar esperado contra contado.
                    </p>
                    <button
                      onClick={() => setActiveSection("moves")}
                      className="mt-4 h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
                    >
                      Ir a movimientos
                    </button>
                  </div>
                </div>
              ) : (
                closedToday ? (
                  <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                    <CheckCircle2 className="shrink-0" size={20} />
                    <p className="text-sm font-semibold">
                      La caja ya fue cerrada hoy. Para mantener el control del dia, no se pueden registrar mas aperturas.
                    </p>
                  </div>
                ) : (
                <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                  <MoneyField label="Base inicial" value={openingCash} onChange={onMoneyChange(setOpeningCash)} format={moneyInput} />
                  <TextField label="Comentario de apertura" value={openingComment} onChange={setOpeningComment} placeholder="Ej: base recibida del cierre anterior, sencillo contado..." />
                  <button
                    onClick={saveOpening}
                    disabled={openingSaving}
                    className="lg:col-span-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF9F1C] to-[#FF4040] font-bold text-white shadow-md disabled:opacity-60"
                  >
                    <Save size={18} />
                    {openingSaving ? "Abriendo caja..." : "Abrir caja"}
                  </button>
                </div>
                )
              )}
            </Panel>
          )}

          {activeSection === "moves" && (
            <Panel
              eyebrow="Movimientos"
              title="Gastos y flujo del turno"
              caption="Los gastos reducen el efectivo esperado. Cada gasto debe tener comentario para auditoria."
              action={<Badge tone="red">{formatCOP(summary?.totalExpenses || 0)}</Badge>}
              tone="rose"
            >
              <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
                <div className="rounded-xl border border-rose-100 bg-rose-50/80 p-4">
                  <h3 className="text-base font-bold text-slate-900">Agregar gasto</h3>
                  <div className="mt-4 space-y-3">
                    <MoneyField label="Valor" value={expenseAmount} onChange={onMoneyChange(setExpenseAmount)} format={moneyInput} />
                    <TextField label="Comentario" value={expenseComment} onChange={setExpenseComment} placeholder="Ej: compra de servilletas, domicilio, insumo urgente..." />
                    <button onClick={addExpense} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 font-bold text-white">
                      <Plus size={18} />
                      Registrar gasto
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
                    <h3 className="text-base font-bold text-slate-900">Gastos registrados</h3>
                    <span className="text-xs font-bold text-slate-500">{expenses.length} movimientos</span>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto bg-white">
                    {expenses.length === 0 && <EmptyState text="No hay gastos en este turno." />}
                    {expenses.map((expense) => (
                      <div key={expense.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-slate-100 p-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-slate-950">{formatCOP(expense.amount || 0)}</p>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">{formatTime(expense.date)}</span>
                          </div>
                          <p className="mt-1 text-sm font-medium text-slate-600">{expense.comment || "Sin comentario"}</p>
                          <p className="mt-1 text-xs font-bold text-slate-400">{expense.employeeName || "Empleado"}</p>
                        </div>
                        <button
                          onClick={() => deleteExpense(expense.id)}
                          aria-label="Eliminar gasto"
                          className="h-9 w-9 rounded-lg text-rose-600 transition hover:bg-rose-50"
                        >
                          <Trash2 className="mx-auto" size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          )}

          {activeSection === "close" && (
            <Panel
              eyebrow="Cierre"
              title="Arqueo final"
              caption="Cuenta el efectivo fisico, registra retiro o saldo de caja y deja comentario si hay diferencia."
              action={<VarianceBadge tone={varianceTone} difference={totals.difference} formatCOP={formatCOP} />}
              tone="sky"
            >
              {!currentOpening && (
                <div className="mb-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                  <AlertCircle className="shrink-0" size={18} />
                  <p className="text-sm font-semibold">No hay apertura registrada hoy. Puedes cerrar con base manual, pero lo profesional es registrar apertura primero.</p>
                </div>
              )}

              <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {currentOpening ? (
                      <ReadOnlyBox label="Base de apertura" value={formatCOP(currentOpening.startingCash || 0)} />
                    ) : (
                      <MoneyField label="Base manual" value={manualStartingCash} onChange={onMoneyChange(setManualStartingCash)} format={moneyInput} />
                    )}
                    <ReadOnlyBox label="Efectivo vendido" value={formatCOP(summary?.cashSales || 0)} />
                    <ReadOnlyBox label="Gastos" value={formatCOP(summary?.totalExpenses || 0)} tone="red" />
                    <ReadOnlyBox label="Efectivo esperado" value={formatCOP(totals.expected)} tone="dark" />
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <MoneyField label="Efectivo contado" value={countedCash} onChange={onMoneyChange(setCountedCash)} format={moneyInput} />
                    <MoneyField label="Retiro / deposito" value={bankWithdrawal} onChange={onMoneyChange(setBankWithdrawal)} format={moneyInput} />
                    <ReadOnlyBox label="Queda en caja" value={formatCOP(totals.remaining)} tone="green" />
                  </div>
                  <TextArea label="Comentario del cierre" value={closingComment} onChange={setClosingComment} placeholder="Ej: sobrante por propina, faltante revisado, retiro al banco..." />
                  <button
                    onClick={saveClosure}
                    disabled={closingSaving || closedToday}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={18} />
                    {closedToday ? "Cierre ya guardado" : closingSaving ? "Guardando cierre..." : "Guardar cierre oficial"}
                  </button>
                </div>

                <CashFormula totals={totals} formatCOP={formatCOP} counted={Boolean(countedCash)} />
              </div>
            </Panel>
          )}

          {activeSection === "history" && (
            <Panel
              eyebrow="Historial"
              title="Registro de caja"
              caption="Aperturas y cierres del dia, con empleado, hora y comentarios."
              action={<Badge tone="dark">{openings.length + closures.length} registros</Badge>}
              tone="slate"
            >
              <div className="grid gap-4 xl:grid-cols-2">
                <HistoryList title="Aperturas" empty="No hay aperturas registradas." items={openings} formatCOP={formatCOP} type="opening" />
                <HistoryList title="Cierres" empty="No hay cierres registrados." items={closures} formatCOP={formatCOP} type="closure" onEdit={setEditingClosure} />
              </div>
            </Panel>
          )}
          </section>

          <aside className="min-w-0 space-y-5">
            <Panel title="Resumen operativo" compact tone="blue">
              <div className="grid grid-cols-3 gap-2">
                <MiniStat label="Ventas" value={summary?.salesCount || 0} />
                <MiniStat label="Productos" value={summary?.productsSold || 0} />
                <MiniStat label="Total" value={formatCOP(summary?.totalSales || 0)} />
              </div>
              <div className="mt-4 rounded-xl border border-slate-200">
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="text-sm font-bold text-slate-900">Productos vendidos</p>
                </div>
                <div className="max-h-[300px] overflow-y-auto overflow-x-hidden">
                  {sortedProducts.length === 0 && <EmptyState text="Todavia no hay productos vendidos." />}
                  {sortedProducts.map(([name, qty]) => (
                    <div key={name} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-sm">
                      <span className="min-w-0 truncate font-semibold text-slate-700">{name}</span>
                      <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel title="Checklist de turno" compact tone="green">
              <ChecklistRow done={Boolean(currentOpening)} label="Caja abierta" />
              <ChecklistRow done={expenses.every((expense) => expense.comment)} label="Gastos comentados" />
              <ChecklistRow done={Boolean(countedCash) || closedToday} label="Efectivo contado" />
              <ChecklistRow done={closedToday} label="Cierre guardado" />
            </Panel>
          </aside>
        </section>
      </main>

      {historyOpen && (
        <DateClosureModal
          date={historyDate}
          setDate={(date) => {
            setHistoryDate(date);
            fetchHistoryDate(date);
          }}
          summary={historySummary}
          onClose={() => setHistoryOpen(false)}
          formatCOP={formatCOP}
          onEdit={setEditingClosure}
          onPrint={() => printBoxSummary(historySummary, toInputDate(historyDate))}
        />
      )}

      {editingClosure && (
        <EditClosureModal closure={editingClosure} onClose={() => setEditingClosure(null)} onSave={editClosure} formatCOP={formatCOP} />
      )}

      <BoxPrintSummary data={printSummary} formatCOP={formatCOP} />
    </div>
  );
}

function SegmentedControl({ value, onChange, options }) {
  return (
    <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      {Object.entries(options).map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`h-8 rounded-md px-3 text-sm font-semibold transition ${
            value === key ? "bg-[#ff8a00] text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function StatusPill({ currentOpening, closedToday }) {
  if (closedToday) {
    return <span className="rounded-xl bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-700">Cerrada hoy</span>;
  }

  if (currentOpening) {
    return <span className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-bold text-amber-800">Abierta</span>;
  }

  return <span className="rounded-xl bg-rose-100 px-3 py-2 text-sm font-bold text-rose-700">Sin apertura</span>;
}

function SessionOverview({ currentOpening, user, today, salesCount, totals, cashSales, expenses, totalSales, formatCOP }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(300px,1.35fr)_repeat(5,minmax(0,1fr))] lg:items-stretch">
        <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                {new Date(today).toLocaleDateString("es-CO", { weekday: "long", day: "2-digit", month: "long" })}
              </p>
              <h2 className="m-0 mt-2 text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
                {currentOpening ? "Caja abierta" : "Apertura pendiente"}
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-600">
                {user?.nombre || "Empleado"} · {salesCount} ventas registradas
              </p>
            </div>
            <span className={`rounded-lg px-3 py-1 text-xs font-bold ${currentOpening ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
              {currentOpening ? "Activa" : "Pendiente"}
            </span>
          </div>
        </div>

        <OverviewNumber label="Base" value={formatCOP(totals.base)} tone="amber" />
        <OverviewNumber label="Efectivo" value={formatCOP(cashSales)} tone="green" />
        <OverviewNumber label="Gastos" value={formatCOP(expenses)} tone="rose" />
        <OverviewNumber label="Esperado" value={formatCOP(totals.expected)} tone="blue" />
        <OverviewNumber label="Ventas totales" value={formatCOP(totalSales)} tone="purple" />
      </div>
    </section>
  );
}

function Panel({ eyebrow, title, caption, action, children, compact = false, tone = "white" }) {
  const tones = {
    white: "border-slate-200 bg-white",
    amber: "border-amber-100 bg-amber-50/45",
    rose: "border-rose-100 bg-rose-50/45",
    sky: "border-sky-100 bg-sky-50/45",
    slate: "border-slate-200 bg-slate-50/80",
    blue: "border-blue-100 bg-blue-50/45",
    green: "border-emerald-100 bg-emerald-50/45",
  };

  return (
    <section className={`rounded-2xl border shadow-sm ${tones[tone] || tones.white}`}>
      <div className={`flex items-start justify-between gap-3 border-b border-slate-100 ${compact ? "px-4 py-3" : "px-5 py-4"}`}>
        <div>
          {eyebrow && <p className="text-xs font-bold uppercase tracking-wide text-amber-700">{eyebrow}</p>}
          {title && <h3 className="m-0 text-lg font-bold text-slate-950">{title}</h3>}
          {caption && <p className="mt-1 text-sm font-medium text-slate-500">{caption}</p>}
        </div>
        {action}
      </div>
      <div className={compact ? "p-4" : "p-5"}>{children}</div>
    </section>
  );
}

function OverviewNumber({ label, value, tone }) {
  const tones = {
    amber: "border-amber-100 bg-amber-50 text-amber-900",
    green: "border-emerald-100 bg-emerald-50 text-emerald-900",
    rose: "border-rose-100 bg-rose-50 text-rose-900",
    blue: "border-blue-100 bg-blue-50 text-blue-950",
    purple: "border-violet-100 bg-violet-50 text-violet-950",
  };

  return (
    <div className={`min-w-0 rounded-xl border p-4 ${tones[tone] || tones.blue}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-3 min-w-0 truncate text-lg font-bold xl:text-xl" title={String(value)}>{value}</p>
    </div>
  );
}

function MetricCard({ icon, label, value, hint, tone }) {
  const tones = {
    orange: "border-[#fed7aa] bg-[#fff7ed] text-[#7c2d12]",
    red: "border-[#fecdd3] bg-[#fff1f2] text-[#881337]",
    blue: "border-[#bfdbfe] bg-[#eff6ff] text-[#0f172a]",
    dark: "border-slate-200 bg-[#f8fafc] text-slate-900",
  };

  return (
    <div className={`rounded-xl border ${tones[tone]} p-4 shadow-sm`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold opacity-80">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm">{icon}</span>
      </div>
      <p className="mt-4 truncate text-2xl font-semibold tracking-normal">{value}</p>
      <p className="mt-1 text-xs font-bold opacity-75">{hint}</p>
    </div>
  );
}

function MoneyField({ label, value, onChange, format }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-bold text-slate-600">{label}</span>
      <input
        value={format(value)}
        onChange={onChange}
        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-[#FF9F1C] focus:ring-4 focus:ring-amber-100"
        placeholder="$ 0"
      />
    </label>
  );
}

function TextField({ label, value, onChange, placeholder }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-bold text-slate-600">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#FF9F1C] focus:ring-4 focus:ring-amber-100"
        placeholder={placeholder}
      />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-600">
        <MessageSquareText size={16} />
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#FF9F1C] focus:ring-4 focus:ring-amber-100"
        placeholder={placeholder}
      />
    </label>
  );
}

function ReadOnlyBox({ label, value, tone = "neutral" }) {
  const tones = {
    neutral: "border border-slate-200 bg-white text-slate-950",
    dark: "border border-slate-900 bg-slate-950 text-white",
    green: "border border-emerald-100 bg-emerald-50 text-emerald-700",
    red: "border border-rose-100 bg-rose-50 text-rose-700",
  };

  return (
    <div>
      <span className="mb-1 block text-sm font-bold text-slate-600">{label}</span>
      <div className={`flex h-12 items-center rounded-xl px-3 text-sm font-bold ${tones[tone] || tones.neutral}`}>{value}</div>
    </div>
  );
}

function CashFormula({ totals, formatCOP, counted }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Lectura de caja</p>
      <div className="mt-4 space-y-3">
        <FormulaLine label="Base" value={formatCOP(totals.base)} />
        <FormulaLine label="+ Efectivo vendido" value={formatCOP(totals.cashSales)} />
        <FormulaLine label="- Gastos" value={formatCOP(totals.totalExpenses)} />
        <FormulaLine label="= Esperado" value={formatCOP(totals.expected)} strong />
        <FormulaLine label="Contado" value={counted ? formatCOP(totals.counted) : "Pendiente"} />
        <FormulaLine label="Diferencia" value={counted ? formatCOP(totals.difference) : "Pendiente"} strong danger={counted && totals.difference !== 0} />
      </div>
    </div>
  );
}

function FormulaLine({ label, value, strong, danger }) {
  return (
    <div className={`flex items-center justify-between border-b border-slate-200 pb-2 text-sm ${strong ? "font-bold text-slate-950" : "font-semibold text-slate-600"}`}>
      <span>{label}</span>
      <span className={danger ? "text-rose-600" : ""}>{value}</span>
    </div>
  );
}

function InfoLine({ label, value }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-950">{value}</p>
    </div>
  );
}

function VarianceBadge({ tone, difference, formatCOP }) {
  if (tone === "idle") return <Badge tone="dark">Pendiente</Badge>;
  if (tone === "ok") return <Badge tone="green">Caja cuadrada</Badge>;
  return <Badge tone="red">{formatCOP(difference)}</Badge>;
}

function Badge({ children, tone = "dark" }) {
  const tones = {
    dark: "bg-slate-100 text-slate-700",
    amber: "bg-amber-100 text-amber-800",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-rose-100 text-rose-700",
  };

  return <span className={`rounded-md px-2 py-1 text-xs font-bold ${tones[tone] || tones.dark}`}>{children}</span>;
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/70 bg-white/80 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ChecklistRow({ done, label }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {done ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertCircle size={18} className="text-amber-600" />}
    </div>
  );
}

function HistoryList({ title, empty, items, type, formatCOP, onEdit }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="border-b border-slate-100 bg-white/80 px-4 py-3">
        <h3 className="text-base font-bold text-slate-950">{title}</h3>
      </div>
      <div className="divide-y divide-slate-100 bg-white">
        {items.length === 0 && <EmptyState text={empty} />}
        {items.map((item) => {
          const isOpening = type === "opening";
          const amount = isOpening ? item.startingCash : item.countedCash;
          const date = isOpening ? item.openedAt : item.closedAt;
          const comment = isOpening ? item.openingComment : item.closingComment;

          return (
            <div key={item.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-950">{isOpening ? "Apertura" : "Cierre"} #{item.id}</p>
                  <p className="text-xs font-bold text-slate-400">{formatTime(date)} · {item.employeeName || "Empleado"}</p>
                </div>
                <p className="font-bold text-slate-950">{formatCOP(amount || 0)}</p>
              </div>
              {!isOpening && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-500">
                  <span>Diferencia</span>
                  <span className={`text-right ${(item.difference || 0) === 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatCOP(item.difference || 0)}</span>
                  <span>Queda en caja</span>
                  <span className="text-right text-slate-800">{formatCOP(item.remainingCash || 0)}</span>
                </div>
              )}
              {comment && <p className="mt-3 rounded-lg bg-slate-100/80 p-3 text-sm font-medium text-slate-600">{comment}</p>}
              {!isOpening && onEdit && (
                <button
                  onClick={() => onEdit(item)}
                  className="mt-3 h-9 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-800 hover:bg-amber-100"
                >
                  Editar cierre
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="p-6 text-center text-sm font-bold text-slate-400">{text}</div>;
}

function formatTime(value) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function DateClosureModal({ date, setDate, summary, onClose, formatCOP, onEdit, onPrint }) {
  const closures = summary?.closures || [];
  const openings = summary?.openings || [];

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="grid max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl lg:grid-cols-[340px_1fr]">
        <aside className="border-r border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-950">Buscar cierre</h3>
            <button onClick={onClose} className="rounded-lg px-3 py-1 text-sm font-bold text-slate-500 hover:bg-slate-200">Cerrar</button>
          </div>
          <div className="stats-calendar rounded-xl border border-slate-200 bg-white p-2">
            <Calendar value={date} onChange={setDate} locale="es-CO" maxDetail="month" />
          </div>
        </aside>

        <section className="overflow-y-auto p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">{toInputDate(date)}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="m-0 mt-1 text-2xl font-bold text-slate-950">Caja de la fecha seleccionada</h2>
            <button
              onClick={onPrint}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800"
            >
              <Printer size={16} />
              Imprimir
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <OverviewNumber label="Ventas" value={formatCOP(summary?.totalSales || 0)} tone="purple" />
            <OverviewNumber label="Efectivo" value={formatCOP(summary?.cashSales || 0)} tone="green" />
            <OverviewNumber label="Gastos" value={formatCOP(summary?.totalExpenses || 0)} tone="rose" />
            <OverviewNumber label="Cierres" value={closures.length} tone="blue" />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <HistoryList title="Aperturas" empty="No hay aperturas en esta fecha." items={openings} formatCOP={formatCOP} type="opening" />
            <HistoryList title="Cierres" empty="No hay cierres en esta fecha." items={closures} formatCOP={formatCOP} type="closure" onEdit={onEdit} />
          </div>
        </section>
      </div>
    </div>
  );
}

function BoxPrintSummary({ data, formatCOP }) {
  if (!data?.summary) return null;

  const target = data.summary;
  const closures = target.closures || [];
  const openings = target.openings || [];
  const expenses = target.expenses || [];
  const products = Object.entries(target.products || {}).sort((a, b) => b[1] - a[1]);
  const mainClosure = closures[0];

  return (
    <section id="box-print-summary" className="hidden bg-white p-8 text-slate-950">
      <header className="border-b border-slate-300 pb-4">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Resumen de cierre de caja</p>
        <h1 className="m-0 mt-1 text-3xl font-bold text-slate-950">Caja {data.date}</h1>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <PrintLine label="Ventas totales" value={formatCOP(target.totalSales || 0)} />
        <PrintLine label="Efectivo" value={formatCOP(target.cashSales || 0)} />
        <PrintLine label="Tarjeta" value={formatCOP(target.cardSales || 0)} />
        <PrintLine label="Nequi" value={formatCOP(target.nequiSales || 0)} />
        <PrintLine label="Gastos" value={formatCOP(target.totalExpenses || 0)} />
        <PrintLine label="Ventas registradas" value={target.salesCount || 0} />
        <PrintLine label="Productos vendidos" value={target.productsSold || 0} />
        <PrintLine label="Cierres guardados" value={closures.length} />
      </div>

      {mainClosure && (
        <div className="mt-6 rounded-xl border border-slate-300 p-4">
          <h2 className="m-0 text-xl font-bold text-slate-950">Cierre oficial</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <PrintLine label="Base inicial" value={formatCOP(mainClosure.startingCash || 0)} />
            <PrintLine label="Efectivo esperado" value={formatCOP(mainClosure.expectedCash || 0)} />
            <PrintLine label="Efectivo contado" value={formatCOP(mainClosure.countedCash || 0)} />
            <PrintLine label="Diferencia" value={formatCOP(mainClosure.difference || 0)} />
            <PrintLine label="Retiro/deposito" value={formatCOP(mainClosure.bankWithdrawal || 0)} />
            <PrintLine label="Queda en caja" value={formatCOP(mainClosure.remainingCash || 0)} />
            <PrintLine label="Empleado" value={mainClosure.employeeName || "Empleado"} />
            <PrintLine label="Hora" value={formatTime(mainClosure.closedAt)} />
          </div>
          {mainClosure.closingComment && <p className="mt-3 text-sm font-semibold text-slate-700">{mainClosure.closingComment}</p>}
        </div>
      )}

      <PrintTable title="Aperturas" headers={["Hora", "Empleado", "Base", "Comentario"]} rows={openings.map(item => [
        formatTime(item.openedAt),
        item.employeeName || "Empleado",
        formatCOP(item.startingCash || 0),
        item.openingComment || ""
      ])} />

      <PrintTable title="Gastos" headers={["Hora", "Empleado", "Valor", "Comentario"]} rows={expenses.map(item => [
        formatTime(item.date),
        item.employeeName || "Empleado",
        formatCOP(item.amount || 0),
        item.comment || ""
      ])} />

      <PrintTable title="Productos vendidos" headers={["Producto", "Cantidad"]} rows={products.map(([name, qty]) => [name, qty])} />
    </section>
  );
}

function PrintLine({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-950">{value}</p>
    </div>
  );
}

function PrintTable({ title, headers, rows }) {
  return (
    <div className="mt-6">
      <h2 className="m-0 mb-2 text-lg font-bold text-slate-950">{title}</h2>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>{headers.map(header => <th key={header} className="border border-slate-300 bg-slate-100 px-2 py-2 text-left">{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td className="border border-slate-300 px-2 py-3 text-center text-slate-500" colSpan={headers.length}>Sin registros</td></tr>
          ) : rows.map((row, index) => (
            <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className="border border-slate-300 px-2 py-2">{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EditClosureModal({ closure, onClose, onSave, formatCOP }) {
  const [countedCash, setCountedCash] = useState(String(Math.round(closure.countedCash || 0)));
  const [bankWithdrawal, setBankWithdrawal] = useState(String(Math.round(closure.bankWithdrawal || 0)));
  const [remainingCash, setRemainingCash] = useState(String(Math.round(closure.remainingCash || 0)));
  const [closingComment, setClosingComment] = useState(closure.closingComment || "");
  const [editReason, setEditReason] = useState("");
  const money = (value) => (value ? formatCOP(cleanMoney(value)) : "");
  const changeMoney = (setter) => (event) => setter(event.target.value.replace(/\D/g, ""));

  const handleSave = () => {
    if (!editReason.trim()) {
      alert("Escribe el motivo de la edicion.");
      return;
    }

    onSave({
      id: closure.id,
      countedCash: cleanMoney(countedCash),
      bankWithdrawal: cleanMoney(bankWithdrawal),
      remainingCash: cleanMoney(remainingCash),
      closingComment,
      editReason,
    });
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Edicion auditada</p>
            <h3 className="text-xl font-bold text-slate-950">Cierre #{closure.id}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg px-3 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100">Cerrar</button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label>
            <span className="mb-1 block text-sm font-bold text-slate-600">Contado</span>
            <input value={money(countedCash)} onChange={changeMoney(setCountedCash)} className="h-11 w-full rounded-xl border border-slate-200 px-3 font-bold" />
          </label>
          <label>
            <span className="mb-1 block text-sm font-bold text-slate-600">Retiro</span>
            <input value={money(bankWithdrawal)} onChange={changeMoney(setBankWithdrawal)} className="h-11 w-full rounded-xl border border-slate-200 px-3 font-bold" />
          </label>
          <label>
            <span className="mb-1 block text-sm font-bold text-slate-600">Queda</span>
            <input value={money(remainingCash)} onChange={changeMoney(setRemainingCash)} className="h-11 w-full rounded-xl border border-slate-200 px-3 font-bold" />
          </label>
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-sm font-bold text-slate-600">Comentario del cierre</span>
          <textarea value={closingComment} onChange={(e) => setClosingComment(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 p-3 font-semibold" />
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-sm font-bold text-rose-700">Motivo de edicion</span>
          <textarea value={editReason} onChange={(e) => setEditReason(e.target.value)} rows={3} className="w-full rounded-xl border border-rose-200 bg-rose-50 p-3 font-semibold" placeholder="Ej: se corrigio el efectivo contado despues de revisar el cajon..." />
        </label>

        <button onClick={handleSave} className="mt-4 h-12 w-full rounded-xl bg-slate-950 font-bold text-white">
          Guardar edicion auditada
        </button>
      </div>
    </div>
  );
}

function cleanMoney(value) {
  return Number(String(value || "").replace(/\D/g, ""));
}

function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
