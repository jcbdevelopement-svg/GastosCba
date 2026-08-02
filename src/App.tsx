import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Download,
  FileBarChart,
  LayoutDashboard,
  Loader2,
  Menu,
  Plus,
  Receipt,
  Search,
  Settings,
  ShoppingBag,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { Auth } from "./components/Auth";
import { useFinancialData } from "./hooks/useFinancialData";
import type { Expense, Payment, Product, Sale } from "./lib/types";
type Page =
  | "Dashboard"
  | "Ventas"
  | "Productos"
  | "Gastos"
  | "Pagos"
  | "Estadísticas"
  | "Reportes"
  | "Configuración";
type Modal = {
  kind: "sale" | "product" | "expense" | "payment";
  item?: any;
} | null;
type Period = "today" | "7" | "15" | "30";
const nav = [
  ["Dashboard", LayoutDashboard],
  ["Ventas", ShoppingBag],
  ["Productos", Boxes],
  ["Gastos", Receipt],
  ["Pagos", WalletCards],
  ["Estadísticas", BarChart3],
  ["Reportes", FileBarChart],
] as const;
const ars = { format(value: number) {
  const currency = localStorage.getItem("jcb-currency") || "ARS";
  return new Intl.NumberFormat(currency === "USD" ? "es-US" : "es-AR", { style: "currency", currency, maximumFractionDigits: currency === "USD" ? 2 : 0 }).format(value);
} };
const date = (v: string) =>
  new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(v.length === 10 ? v + "T12:00:00-03:00" : v));
let brandMarkPromise: Promise<string> | null = null;
function loadBrandMark() {
  brandMarkPromise ||= fetch("/brand/jb-mark.png").then((response) => response.blob()).then((blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob);
  }));
  return brandMarkPromise;
}
function addPdfBranding(doc: any, mark: string) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setGState(new doc.GState({ opacity: 0.09 })); doc.addImage(mark, "PNG", 65, 102, 80, 80, "jb-watermark", "FAST"); doc.setGState(new doc.GState({ opacity: 1 }));
    doc.addImage(mark, "PNG", 181, 7, 15, 15, "jb-header", "FAST");
  }
}
function since(p: Period) {
  const n = new Date(),
    d = new Date(n);
  if (p === "today") d.setHours(0, 0, 0, 0);
  if (p === "7") d.setDate(n.getDate() - 6);
  if (p === "15") d.setDate(n.getDate() - 14);
  if (p === "30") d.setDate(n.getDate() - 29);
  return d;
}
export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(),
    [page, setPage] = useState<Page>("Dashboard"),
    [menu, setMenu] = useState(false),
    [modal, setModal] = useState<Modal>(null),
    [period, setPeriod] = useState<Period>("30"),
    [toast, setToast] = useState("");
  const data = useFinancialData();
  useEffect(() => {
    const color = localStorage.getItem("jcb-brand-color") || "#8b2cf5";
    document.documentElement.style.setProperty("--brand", color);
  }, []);
  useEffect(() => {
    supabase.auth.getSession().then((x) => setSession(x.data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (session === undefined) return <div className="auth-page" />;
  if (!session) return <Auth />;
  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2500);
  };
  return (
    <div className="shell">
      <aside className={menu ? "open" : ""}>
        <div className="logo">
          <img src="/brand/jcb-wordmark.png" />
          <button onClick={() => setMenu(false)}>
            <X />
          </button>
        </div>
        <div className="nav-label">GESTIÓN</div>
        <nav>
          {nav.map(([n, I]) => (
            <button
              className={page === n ? "active" : ""}
              onClick={() => {
                setPage(n);
                setMenu(false);
              }}
            >
              <I />
              {n}
            </button>
          ))}
        </nav>
        <div className="aside-bottom">
          <button className={page === "Configuración" ? "active" : ""} onClick={() => { setPage("Configuración"); setMenu(false); }}>
            <Settings />
            Configuración
          </button>
          <button onClick={() => supabase.auth.signOut()}>
            <UserRound />
            Cerrar sesión
          </button>
          <div className="user">
            <div>
              <img src="/brand/jb-mark.png" />
            </div>
            <span>
              <b>{session.user.user_metadata.name || "JCB Developement"}</b>
              <small>{session.user.email}</small>
            </span>
          </div>
        </div>
      </aside>
      <main>
        <header>
          <button className="hamb" onClick={() => setMenu(true)}>
            <Menu />
          </button>
          <div>
            <h1>{page}</h1>
            <p>
              {page === "Dashboard"
                ? "Todo lo importante de tu negocio, en un solo lugar."
                : "Datos reales, seguros y actualizados."}
            </p>
          </div>
          <div className="header-actions">
            <span className="sync live">
              <i />
              Supabase
            </span>
            <PeriodSelect value={period} set={setPeriod} />
            {(page === "Dashboard" || page === "Ventas") && (
              <button
                className="primary"
                onClick={() => setModal({ kind: "sale" })}
              >
                <Plus />
                Agregar venta
              </button>
            )}
          </div>
        </header>
        {data.error && (
          <div className="error-state">
            {data.error}
            <button onClick={data.reload}>Reintentar</button>
          </div>
        )}
        {!data.loading && (
          <MonthlyRetentionAlert sales={data.sales} expenses={data.expenses} payments={data.payments} reload={data.reload} notify={notify} />
        )}
        {data.loading ? (
          <Loading />
        ) : (
          <Content
            page={page}
            data={data}
            period={period}
            modal={setModal}
            notify={notify}
            session={session}
          />
        )}
      </main>
      {modal && (
        <DataModal
          modal={modal}
          products={data.products}
          userId={session.user.id}
          close={() => setModal(null)}
          done={async (m) => {
            setModal(null);
            await data.reload();
            notify(m);
          }}
        />
      )}
      {toast && (
        <div className="toast">
          <Check />
          {toast}
        </div>
      )}
    </div>
  );
}

function MonthlyRetentionAlert({ sales, expenses, payments, reload, notify }: {
  sales: Sale[]; expenses: Expense[]; payments: Payment[];
  reload: () => Promise<void>; notify: (message: string) => void;
}) {
  const [visible, setVisible] = useState(false), [working, setWorking] = useState(false);
  const argentina = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
  const month = new Date(argentina.getFullYear(), argentina.getMonth() - 1, 1), next = new Date(argentina.getFullYear(), argentina.getMonth(), 1);
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-01`;
  const monthLabel = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(month);
  useEffect(() => {
    if (argentina.getDate() > 2) return;
    supabase.from("monthly_archives").select("id").eq("period_month", monthKey).maybeSingle().then(({ data }) => setVisible(!data));
  }, [monthKey]);
  if (!visible) return null;
  const inMonth = (value: string) => { const d = new Date(value.length === 10 ? `${value}T12:00:00-03:00` : value); return d >= month && d < next; };
  const downloadAndDelete = async () => {
    setWorking(true);
    const oldSales = sales.filter((x) => inMonth(x.sold_at)), oldExpenses = expenses.filter((x) => inMonth(x.expense_date)), oldPayments = payments.filter((x) => inMonth(x.payment_date));
    try {
      const [{ jsPDF }, { default: autoTable }, brandMark] = await Promise.all([import("jspdf"), import("jspdf-autotable"), loadBrandMark()]);
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      doc.setProperties({ title: `Respaldo ${monthLabel}`, subject: "Respaldo financiero mensual", author: "JCB Developement" });
      doc.setFillColor(116, 35, 204); doc.rect(0, 0, 210, 34, "F");
      doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.text("Respaldo financiero", 14, 16);
      doc.setFontSize(10); doc.text(monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1), 14, 24);
      doc.setTextColor(35, 38, 46); doc.setFontSize(9);
      const totalSales = oldSales.reduce((sum, x) => sum + Number(x.total), 0), totalExpenses = oldExpenses.reduce((sum, x) => sum + Number(x.amount), 0);
      doc.text(`Ventas: ${ars.format(totalSales)}   |   Gastos: ${ars.format(totalExpenses)}   |   Resultado: ${ars.format(totalSales - totalExpenses)}`, 14, 43);
      let cursor = 52;
      const addTable = (title: string, headers: string[], rows: string[][]) => {
        if (cursor > 245) { doc.addPage(); cursor = 18; }
        doc.setFontSize(12); doc.setTextColor(116, 35, 204); doc.text(`${title} (${rows.length})`, 14, cursor);
        autoTable(doc, { startY: cursor + 4, head: [headers], body: rows.length ? rows : [["Sin registros", ...headers.slice(1).map(() => "")]], theme: "grid", styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" }, headStyles: { fillColor: [116, 35, 204], textColor: 255 }, alternateRowStyles: { fillColor: [248, 245, 252] }, margin: { left: 14, right: 14 } });
        cursor = (doc as any).lastAutoTable.finalY + 12;
      };
      addTable("Ventas", ["Fecha", "Total", "Costo", "Ganancia", "Método", "Estado"], oldSales.map((x) => [date(x.sold_at), ars.format(Number(x.total)), ars.format(Number(x.total_cost)), ars.format(Number(x.profit)), x.payment_method, x.status]));
      addTable("Gastos", ["Fecha", "Nombre", "Categoría", "Monto"], oldExpenses.map((x) => [date(x.expense_date), x.name, x.category, ars.format(Number(x.amount))]));
      addTable("Pagos", ["Fecha", "Concepto", "Método", "Estado", "Monto"], oldPayments.map((x) => [date(x.payment_date), x.concept, x.payment_method, x.status, ars.format(Number(x.amount))]));
      const pages = doc.getNumberOfPages();
      addPdfBranding(doc, brandMark);
      for (let page = 1; page <= pages; page++) { doc.setPage(page); doc.setFontSize(7); doc.setTextColor(130); doc.text(`JCB Developement - Página ${page} de ${pages}`, 105, 291, { align: "center" }); }
      doc.save(`respaldo-${monthKey.slice(0, 7)}.pdf`);
    } catch (error) {
      notify(`No se pudo crear el PDF: ${error instanceof Error ? error.message : "error desconocido"}`); setWorking(false); return;
    }
    const { error } = await supabase.rpc("export_and_delete_month", { p_month: monthKey });
    if (error) { notify(`El respaldo se descargó, pero no se borraron los datos: ${error.message}`); setWorking(false); return; }
    setVisible(false); await reload(); notify("Respaldo descargado y datos mensuales eliminados.");
  };
  return <section className="retention-alert" role="alert"><AlertTriangle /><div><strong>Descargá el respaldo de {monthLabel}</strong><p>Se descargará un PDF. Después, los datos de ese mes se eliminarán. Si no lo hacés, se borrarán automáticamente el día 2.</p></div><button onClick={downloadAndDelete} disabled={working}>{working ? <Loader2 className="spin" /> : <Download />}{working ? "Procesando..." : "Descargar PDF"}</button></section>;
}
function Content({
  page,
  data,
  period,
  modal,
  notify,
  session,
}: {
  page: Page;
  data: ReturnType<typeof useFinancialData>;
  period: Period;
  modal: (m: Modal) => void;
  notify: (m: string) => void;
  session: Session;
}) {
  const start = since(period),
    sales = data.sales.filter((x) => !start || new Date(x.sold_at) >= start),
    expenses = data.expenses.filter(
      (x) => !start || new Date(x.expense_date + "T12:00:00-03:00") >= start,
    );
  if (page === "Dashboard")
    return <Dashboard sales={sales} expenses={expenses} />;
  if (page === "Ventas")
    return <SalesPage sales={sales} open={(sale) => modal({ kind: "sale", item: sale })} reload={data.reload} notify={notify} />;
  if (page === "Productos")
    return (
      <ProductsPage
        items={data.products}
        open={(x) => modal({ kind: "product", item: x })}
        reload={data.reload}
        notify={notify}
      />
    );
  if (page === "Gastos")
    return (
      <ExpensesPage
        items={data.expenses}
        open={(x) => modal({ kind: "expense", item: x })}
        reload={data.reload}
        notify={notify}
      />
    );
  if (page === "Pagos")
    return (
      <PaymentsPage
        items={data.payments}
        open={(x) => modal({ kind: "payment", item: x })}
        reload={data.reload}
        notify={notify}
      />
    );
  if (page === "Estadísticas")
    return <Stats sales={sales} expenses={expenses} products={data.products} />;
  if (page === "Configuración")
    return <SettingsPage session={session} notify={notify} />;
  return <Reports sales={sales} expenses={expenses} notify={notify} />;
}

const themeColors = ["#8b2cf5", "#2563eb", "#059669", "#dc2626", "#ea580c", "#db2777", "#111827"];
const expenseCategoryLabels = ["📢 Publicidad y Marketing", "🖥️ Hosting", "🌐 Dominios", "🧩 Software y Herramientas", "📦 Productos / Mercadería", "🚚 Envíos y Logística", "🏭 Proveedores", "💳 Comisiones de Pago", "🛍️ Comisiones de Marketplace", "💼 Servicios Profesionales", "👥 Sueldos y Personal", "🏢 Alquiler", "💡 Servicios e Infraestructura", "📞 Telefonía e Internet", "🎨 Diseño y Contenido", "📸 Fotografía / Video", "🔄 Devoluciones y Reembolsos", "🧾 Impuestos", "🏦 Gastos Bancarios", "💸 Otros"];

function SettingsPage({ session, notify }: { session: Session; notify: (message: string) => void }) {
  const [name, setName] = useState(session.user.user_metadata.name || "JCB Developement");
  const [password, setPassword] = useState("");
  const [color, setColor] = useState(localStorage.getItem("jcb-brand-color") || "#8b2cf5");
  const [currency, setCurrency] = useState(localStorage.getItem("jcb-currency") || "ARS");
  const [saving, setSaving] = useState(false);
  const changeColor = (next: string) => {
    setColor(next); localStorage.setItem("jcb-brand-color", next);
    document.documentElement.style.setProperty("--brand", next);
  };
  const saveAccount = async (event: FormEvent) => {
    event.preventDefault();
    if (password && password.length < 6) { notify("La contraseña debe tener al menos 6 caracteres."); return; }
    setSaving(true);
    const changes: { data: { name: string }; password?: string } = { data: { name: name.trim() || "JCB Developement" } };
    if (password) changes.password = password;
    const { error } = await supabase.auth.updateUser(changes);
    setSaving(false);
    if (error) { notify(error.message); return; }
    setPassword(""); notify("Configuración guardada.");
  };
  return <div className="settings-grid">
    <form className="panel settings-card" onSubmit={saveAccount}>
      <div className="panel-head"><div><h2>Cuenta y negocio</h2><p>Información principal de tu perfil.</p></div></div>
      <label>Nombre del negocio<input value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label>Email<input value={session.user.email || ""} disabled /></label>
      <label>Nueva contraseña<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Dejá vacío para no cambiarla" minLength={6} /></label>
      <label>Moneda del dashboard<select value={currency} onChange={(e) => { setCurrency(e.target.value); localStorage.setItem("jcb-currency", e.target.value); }}><option value="ARS">Pesos argentinos (ARS)</option><option value="USD">Dólares (USD)</option></select></label>
      <button className="primary settings-save" disabled={saving}>{saving ? <Loader2 className="spin" /> : <Check />}{saving ? "Guardando..." : "Guardar cambios"}</button>
    </form>
    <section className="panel settings-card">
      <div className="panel-head"><div><h2>Colores de la página</h2><p>Elegí el color principal del dashboard.</p></div></div>
      <div className="color-picker">{themeColors.map((item) => <button key={item} aria-label={`Usar color ${item}`} className={color === item ? "selected" : ""} style={{ background: item }} onClick={() => changeColor(item)}>{color === item && <Check />}</button>)}</div>
      <label>Color personalizado<div className="custom-color"><input type="color" value={color} onChange={(e) => changeColor(e.target.value)} /><span>{color.toUpperCase()}</span></div></label>
    </section>
    <section className="panel settings-card">
      <div className="panel-head"><div><h2>Respaldos automáticos</h2><p>Protección mensual de tus datos.</p></div></div>
      <div className="setting-info"><b>Días 1 y 2</b><span>Aparece el aviso para descargar el PDF del mes anterior.</span></div>
      <div className="setting-info"><b>Día 2, 03:00</b><span>Si no se descargó, ventas, gastos y pagos del mes vencido se eliminan automáticamente.</span></div>
      <div className="setting-info"><b>Siempre conservados</b><span>Productos y cuenta de usuario.</span></div>
    </section>
    <section className="panel settings-card categories-card">
      <div className="panel-head"><div><h2>Categorías de gastos</h2><p>Categorías disponibles al registrar gastos.</p></div></div>
      <div className="settings-categories">{expenseCategoryLabels.map((item) => <span key={item}>{item}</span>)}</div>
    </section>
  </div>;
}
function PeriodSelect({
  value,
  set,
}: {
  value: Period;
  set: (p: Period) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const options: Array<{ value: Period; label: string }> = [
    { value: "today", label: "Hoy" },
    { value: "7", label: "Últimos 7 días" },
    { value: "15", label: "Últimos 15 días" },
    { value: "30", label: "Últimos 30 días" },
  ];
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div className="period" ref={root}>
      <button
        type="button"
        className="period-trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <CalendarDays />
        <span>{options.find((item) => item.value === value)?.label}</span>
        <ChevronDown className={open ? "open" : ""} />
      </button>
      {open && (
        <div className="period-menu">
          {options.map((item) => (
            <button
              type="button"
              key={item.value}
              className={item.value === value ? "selected" : ""}
              onClick={() => {
                set(item.value);
                setOpen(false);
              }}
            >
              {item.label}
              {item.value === value && <Check />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function totals(sales: Sale[], expenses: Expense[]) {
  const valid = sales.filter((s) => s.status === "completed"),
    revenue = valid.reduce((a, s) => a + Number(s.total), 0),
    cost = valid.reduce((a, s) => a + Number(s.total_cost), 0),
    expense = expenses.reduce((a, e) => a + Number(e.amount), 0),
    gross = revenue - cost,
    net = gross - expense;
  return {
    revenue,
    cost,
    expense,
    gross,
    net,
    margin: revenue ? (net / revenue) * 100 : 0,
    count: valid.length,
  };
}
function Dashboard({
  sales,
  expenses,
}: {
  sales: Sale[];
  expenses: Expense[];
}) {
  const t = totals(sales, expenses),
    chart = groupSales(sales);
  return (
    <>
      <section className="metric-grid">
        <Metric title="Ventas" value={ars.format(t.revenue)} tone="brand" />
        <Metric title="Ganancia neta" value={ars.format(t.net)} tone="green" />
        <Metric title="Costos" value={ars.format(t.cost)} tone="red" />
        <Metric title="Gastos" value={ars.format(t.expense)} tone="orange" />
        <Metric title="Margen" value={t.margin.toFixed(1) + "%"} tone="brand" />
      </section>
      <section className="panel chart-panel">
        <div className="panel-head">
          <div>
            <h2>Rendimiento financiero</h2>
            <p>{t.count} ventas completadas</p>
          </div>
        </div>
        {chart.length ? (
          <>
            <div className="chart-legends">
              <span>
                <i className="purple" />
                Ventas
              </span>
              <span>
                <i className="amber" />
                Costos
              </span>
              <span>
                <i className="green" />
                Ganancia
              </span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chart}>
                <CartesianGrid vertical={false} stroke="#edf0f3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(v) => ars.format(Number(v))} />
                <Area dataKey="sales" stroke="#8b2cf5" fill="#8b2cf522" />
                <Area dataKey="cost" stroke="#aeb2bb" fill="transparent" />
                <Area dataKey="profit" stroke="#6120aa" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </>
        ) : (
          <Empty text="Todavía no registraste ventas." />
        )}
        <div className="chart-summary">
          <span>
            Ventas totales<b>{ars.format(t.revenue)}</b>
          </span>
          <span>
            Ganancia bruta<b>{ars.format(t.gross)}</b>
          </span>
          <span>
            Ganancia neta<b>{ars.format(t.net)}</b>
          </span>
        </div>
      </section>
      <SalesTable sales={sales.slice(0, 5)} title="Últimas ventas" />
    </>
  );
}
function Metric({ title, value, tone }: { title: string; value: string; tone?: "brand" | "green" | "red" | "orange" }) {
  return (
    <article className={`metric${tone ? ` metric-${tone}` : ""}`}>
      <div className="metric-top">
        <span>{title}</span>
        <CircleDollarSign />
      </div>
      <strong>{value}</strong>
      <div className="change good">
        <ArrowUpRight />
        <span>Datos del período</span>
      </div>
    </article>
  );
}
function groupSales(sales: Sale[]) {
  const m = new Map<
    string,
    { day: string; sales: number; cost: number; profit: number }
  >();
  sales
    .filter((x) => x.status === "completed")
    .forEach((s) => {
      const k = s.sold_at.slice(0, 10),
        v = m.get(k) || { day: date(k), sales: 0, cost: 0, profit: 0 };
      v.sales += +s.total;
      v.cost += +s.total_cost;
      v.profit += +s.profit;
      m.set(k, v);
    });
  return [...m.values()].slice(-31);
}
function GroupSummary({ count, groups, collapsed, setCollapsed, label }: { count: number; groups: string[]; collapsed: Set<string>; setCollapsed: (value: Set<string>) => void; label: string }) {
  return <div className="products-summary"><span><b>{count}</b> {label} en <b>{groups.length}</b> grupos</span>{groups.length > 0 && <div><button onClick={() => setCollapsed(new Set())}>Expandir todas</button><button onClick={() => setCollapsed(new Set(groups))}>Minimizar todas</button></div>}</div>;
}
function CollapsibleGroup({ title, count, noun, collapsed, toggle, children }: { title: string; count: number; noun: string; collapsed: boolean; toggle: () => void; children: any }) {
  return <section className="panel table-panel product-category"><button className="category-bar" onClick={toggle} aria-expanded={!collapsed}><span><b>{title}</b><small>{count} {count === 1 ? noun.replace(/s$/, "") : noun}</small></span><ChevronDown className={collapsed ? "" : "open"} /></button>{!collapsed && children}</section>;
}
function SalesPage({ sales, open, reload, notify }: { sales: Sale[]; open: (sale?: Sale) => void; reload: () => Promise<void>; notify: (message: string) => void }) {
  const [q, setQ] = useState(""), [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const list = sales.filter((s) =>
    (s.payment_method + s.status + (s.notes || "") + (s.sale_items?.map((i) => i.products?.name).join(" ") || "")).toLowerCase().includes(q.toLowerCase()),
  );
  const groups = Object.entries(list.reduce<Record<string, Sale[]>>((all, sale) => { const key = statusLabel(sale.status); (all[key] ||= []).push(sale); return all; }, {})).sort(([a], [b]) => a.localeCompare(b, "es")).map(([key, group]) => [key, group.sort((a, b) => (a.sale_items?.map((i) => i.products?.name).join(" ") || "Venta").localeCompare(b.sale_items?.map((i) => i.products?.name).join(" ") || "Venta", "es"))] as [string, Sale[]]);
  const toggle = (key: string) => setCollapsed((current) => { const next = new Set(current); next.has(key) ? next.delete(key) : next.add(key); return next; });
  return (
    <>
      <Toolbar q={q} setQ={setQ} button="Nueva venta" action={() => open()} />
      <GroupSummary count={list.length} groups={groups.map(([key]) => key)} collapsed={collapsed} setCollapsed={setCollapsed} label="ventas" />
      {list.length ? groups.map(([key, group]) => <CollapsibleGroup key={key} title={key} count={group.length} noun="ventas" collapsed={!q && collapsed.has(key)} toggle={() => toggle(key)}><SalesRows sales={group} open={open} reload={reload} notify={notify} /></CollapsibleGroup>) : <section className="panel"><Empty text="No hay ventas para mostrar." /></section>}
    </>
  );
}
function SalesRows({ sales, open, reload, notify }: { sales: Sale[]; open?: (sale: Sale) => void; reload?: () => Promise<void>; notify?: (message: string) => void }) { return <div className="table-wrap"><table><thead><tr><th>FECHA</th><th>PRODUCTOS</th><th>TOTAL</th><th>COSTO</th><th>GANANCIA</th><th>MÉTODO</th><th>ESTADO</th>{open && <th>ACCIONES</th>}</tr></thead><tbody>{sales.map((s) => <tr key={s.id}><td>{date(s.sold_at)}</td><td><b>{s.sale_items?.map((i) => i.products?.name).join(", ") || "Venta"}</b></td><td>{ars.format(s.total)}</td><td>{ars.format(s.total_cost)}</td><td className="profit">{ars.format(s.profit)}</td><td>{s.payment_method}</td><td><Status value={s.status} /></td>{open && reload && notify && <td><button className="row-action" onClick={() => open(s)}>Editar</button><Delete table="sales" id={s.id} reload={reload} notify={notify} /></td>}</tr>)}</tbody></table></div>; }
function SalesTable({ sales, title }: { sales: Sale[]; title: string }) {
  return (
    <section className="panel table-panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p>{sales.length} registros</p>
        </div>
      </div>
      {sales.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>FECHA</th>
                <th>PRODUCTOS</th>
                <th>TOTAL</th>
                <th>COSTO</th>
                <th>GANANCIA</th>
                <th>MÉTODO</th>
                <th>ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr>
                  <td>{date(s.sold_at)}</td>
                  <td>
                    <b>
                      {s.sale_items?.map((i) => i.products?.name).join(", ") ||
                        "Venta"}
                    </b>
                  </td>
                  <td>{ars.format(s.total)}</td>
                  <td>{ars.format(s.total_cost)}</td>
                  <td className="profit">{ars.format(s.profit)}</td>
                  <td>{s.payment_method}</td>
                  <td>
                    <Status value={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty text="No hay ventas para mostrar." />
      )}
    </section>
  );
}
function ProductsPage({ items, open, reload, notify }: { items: Product[]; open: (x?: Product) => void; reload: () => Promise<void>; notify: (s: string) => void }) {
  const [q, setQ] = useState(""), [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false); const fileInput = useRef<HTMLInputElement>(null);
  const list = items.filter((x) => (x.name + " " + x.category).toLowerCase().includes(q.trim().toLowerCase()));
  const groups = useMemo(() => Object.entries(list.reduce<Record<string, Product[]>>((all, product) => {
    const category = product.category?.trim() || "Sin categoría";
    (all[category] ||= []).push(product); return all;
  }, {})).sort(([a], [b]) => a.localeCompare(b, "es")), [list]);
  groups.forEach(([, products]) => products.sort((a, b) => a.name.localeCompare(b.name, "es")));
  const toggle = (category: string) => setCollapsed((current) => { const next = new Set(current); next.has(category) ? next.delete(category) : next.add(category); return next; });
  const importProducts = async (file?: File) => {
    if (!file) return; setImporting(true);
    try {
      let rows: unknown[][] = [];
      if (/\.pdf$/i.test(file.name)) {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs"); const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) { const page = await pdf.getPage(pageNumber), content = await page.getTextContent(); const lines = new Map<number, any[]>(); (content.items as any[]).forEach((item) => { const y = Math.round(item.transform[5] / 3) * 3; (lines.get(y) || lines.set(y, []).get(y)!).push(item); }); [...lines.entries()].sort((a, b) => b[0] - a[0]).forEach(([, line]) => rows.push(line.sort((a, b) => a.transform[4] - b.transform[4]).map((item) => item.str))); }
      } else { const { default: readXlsxFile } = await import("read-excel-file/browser"); rows = await readXlsxFile(file) as unknown as unknown[][]; }
      if (rows.length < 2) throw new Error("No se encontró una tabla con productos.");
      const normalize = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      const headers = rows[0].map(normalize), find = (...names: string[]) => headers.findIndex((header) => names.some((name) => header.includes(name)));
      const nameCol = find("nombre", "producto", "name"), categoryCol = find("categoria", "category", "cat"), priceCol = find("precio venta", "precio", "price", "venta"), costCol = find("costo", "cost");
      if (nameCol < 0 || priceCol < 0) throw new Error("El archivo necesita columnas Producto/Nombre y Precio.");
      const existing = new Set(items.map((item) => `${normalize(item.name)}|${normalize(item.category)}`)), seen = new Set<string>();
      const products = rows.slice(1).map((row) => ({ name: String(row[nameCol] ?? "").trim(), category: categoryCol >= 0 ? String(row[categoryCol] ?? "Sin categoría").trim() : "Sin categoría", sale_price: Number(String(row[priceCol] ?? 0).replace(/[^0-9,.-]/g, "").replace(",", ".")), cost_price: costCol >= 0 ? Number(String(row[costCol] ?? 0).replace(/[^0-9,.-]/g, "").replace(",", ".")) : 0, tier_prices: [] })).filter((product) => product.name && Number.isFinite(product.sale_price)).filter((product) => { const key = `${normalize(product.name)}|${normalize(product.category)}`; if (existing.has(key) || seen.has(key)) return false; seen.add(key); return true; });
      const skipped = rows.length - 1 - products.length; if (!products.length) throw new Error("No hay productos nuevos; todos están duplicados o son inválidos.");
      const { data: auth } = await supabase.auth.getUser(); const { error } = await supabase.from("products").insert(products.map((product) => ({ ...product, user_id: auth.user?.id }))); if (error) throw error;
      await reload(); notify(`${products.length} productos importados. ${skipped} omitidos.`);
    } catch (error) { notify(error instanceof Error ? error.message : "No se pudo importar el archivo."); } finally { setImporting(false); if (fileInput.current) fileInput.current.value = ""; }
  };
  return <>
    <Toolbar q={q} setQ={setQ} button="Agregar producto" action={() => open()} extra={<><input ref={fileInput} hidden type="file" accept=".xlsx,.xls,.pdf" onChange={(e) => importProducts(e.target.files?.[0])} /><button onClick={() => fileInput.current?.click()} disabled={importing}>{importing ? <Loader2 className="spin" /> : <Download />}{importing ? "Importando..." : "Importar Excel/PDF"}</button></>} />
    <div className="products-summary"><span><b>{list.length}</b> productos en <b>{groups.length}</b> categorías</span>{groups.length > 0 && <div><button onClick={() => setCollapsed(new Set())}>Expandir todas</button><button onClick={() => setCollapsed(new Set(groups.map(([category]) => category)))}>Minimizar todas</button></div>}</div>
    {list.length ? groups.map(([category, products]) => {
      const isCollapsed = !q && collapsed.has(category);
      return <section className="panel table-panel product-category" key={category}>
        <button className="category-bar" onClick={() => toggle(category)} aria-expanded={!isCollapsed}><span><b>{category}</b><small>{products.length} {products.length === 1 ? "producto" : "productos"}</small></span><ChevronDown className={isCollapsed ? "" : "open"} /></button>
        {!isCollapsed && <div className="table-wrap"><table><thead><tr><th>PRODUCTO</th><th>PRECIO BASE</th><th>PRECIOS X CANTIDAD</th><th>COSTO</th><th>GANANCIA/U.</th><th>MARGEN</th><th>ACCIONES</th></tr></thead><tbody>
          {products.map((p) => <tr key={p.id}><td><b>{p.name}</b></td><td>{ars.format(p.sale_price)}</td><td>{p.tier_prices?.length ? <div className="tier-chips">{p.tier_prices.map((tier, i) => <span key={i}>Desde {tier.minQty}: {ars.format(tier.unitPrice)}</span>)}</div> : <small>Precio único</small>}</td><td>{ars.format(p.cost_price)}</td><td className="profit">{ars.format(p.sale_price - p.cost_price)}</td><td>{p.sale_price ? (((p.sale_price - p.cost_price) / p.sale_price) * 100).toFixed(1) : 0}%</td><td><button className="row-action" onClick={() => open(p)}>Editar</button><Delete table="products" id={p.id} reload={reload} notify={notify} /></td></tr>)}
        </tbody></table></div>}
      </section>;
    }) : <section className="panel"><Empty text={q ? "No encontramos productos con esa búsqueda." : "Creá tu primer producto para comenzar."} /></section>}
  </>;
}
function ExpensesPage({
  items,
  open,
  reload,
  notify,
}: {
  items: Expense[];
  open: (x?: Expense) => void;
  reload: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const [q, setQ] = useState(""), [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const list = items.filter((x) =>
      (x.name + x.category).toLowerCase().includes(q.toLowerCase()),
    ),
    sum = list.reduce((a, x) => a + Number(x.amount), 0);
  const groups = Object.entries(list.reduce<Record<string, Expense[]>>((all, expense) => { const key = expense.category || "Sin categoría"; (all[key] ||= []).push(expense); return all; }, {})).sort(([a], [b]) => a.localeCompare(b, "es")).map(([key, group]) => [key, group.sort((a, b) => a.name.localeCompare(b.name, "es"))] as [string, Expense[]]);
  const toggle = (key: string) => setCollapsed((current) => { const next = new Set(current); next.has(key) ? next.delete(key) : next.add(key); return next; });
  return (
    <>
      <Toolbar
        q={q}
        setQ={setQ}
        button="Registrar gasto"
        action={() => open()}
      />
      <section className="metric-grid four">
        <Metric title="Total gastos" value={ars.format(sum)} />
        <Metric title="Hoy" value={ars.format(daySum(items, 0))} />
        <Metric title="Últimos 7 días" value={ars.format(daySum(items, 6))} />
        <Metric title="Últimos 30 días" value={ars.format(daySum(items, 29))} />
      </section>
      <GroupSummary count={list.length} groups={groups.map(([key]) => key)} collapsed={collapsed} setCollapsed={setCollapsed} label="gastos" />
      {list.length ? groups.map(([key, group]) => <CollapsibleGroup key={key} title={key} count={group.length} noun="gastos" collapsed={!q && collapsed.has(key)} toggle={() => toggle(key)}><div className="table-wrap"><table><thead><tr><th>GASTO</th><th>FECHA</th><th>MONTO</th><th>ACCIONES</th></tr></thead><tbody>{group.map((e) => <tr key={e.id}><td><b>{e.name}</b></td><td>{date(e.expense_date)}</td><td>{ars.format(e.amount)}</td><td><button className="row-action" onClick={() => open(e)}>Editar</button><Delete table="expenses" id={e.id} reload={reload} notify={notify} /></td></tr>)}</tbody></table></div></CollapsibleGroup>) : <section className="panel"><Empty text="No hay gastos registrados." /></section>}
    </>
  );
}
function PaymentsPage({
  items,
  open,
  reload,
  notify,
}: {
  items: Payment[];
  open: (x?: Payment) => void;
  reload: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const [q, setQ] = useState(""), [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const list = items.filter((x) =>
    (x.concept + x.payment_method + x.status)
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  const groups = Object.entries(list.reduce<Record<string, Payment[]>>((all, payment) => { const key = statusLabel(payment.status); (all[key] ||= []).push(payment); return all; }, {})).sort(([a], [b]) => a.localeCompare(b, "es")).map(([key, group]) => [key, group.sort((a, b) => a.concept.localeCompare(b.concept, "es"))] as [string, Payment[]]);
  const toggle = (key: string) => setCollapsed((current) => { const next = new Set(current); next.has(key) ? next.delete(key) : next.add(key); return next; });
  return (
    <>
      <Toolbar
        q={q}
        setQ={setQ}
        button="Registrar pago"
        action={() => open()}
      />
      <GroupSummary count={list.length} groups={groups.map(([key]) => key)} collapsed={collapsed} setCollapsed={setCollapsed} label="pagos" />
      {list.length ? groups.map(([key, group]) => <CollapsibleGroup key={key} title={key} count={group.length} noun="pagos" collapsed={!q && collapsed.has(key)} toggle={() => toggle(key)}><div className="table-wrap"><table><thead><tr><th>CONCEPTO</th><th>MÉTODO</th><th>FECHA</th><th>MONTO</th><th>ESTADO</th><th>ACCIONES</th></tr></thead><tbody>{group.map((p) => <tr key={p.id}><td><b>{p.concept}</b></td><td>{p.payment_method}</td><td>{date(p.payment_date)}</td><td>{ars.format(p.amount)}</td><td><Status value={p.status} /></td><td><button className="row-action" onClick={() => open(p)}>Editar</button><Delete table="payments" id={p.id} reload={reload} notify={notify} /></td></tr>)}</tbody></table></div></CollapsibleGroup>) : <section className="panel"><Empty text="No hay pagos registrados." /></section>}
    </>
  );
}
function Stats({
  sales,
  expenses,
  products,
}: {
  sales: Sale[];
  expenses: Expense[];
  products: Product[];
}) {
  const t = totals(sales, expenses),
    chart = groupSales(sales),
    rank = new Map<
      string,
      { name: string; units: number; revenue: number; profit: number }
    >();
  sales.forEach((s) =>
    s.sale_items?.forEach((i) => {
      const n = i.products?.name || "Producto",
        v = rank.get(i.product_id) || {
          name: n,
          units: 0,
          revenue: 0,
          profit: 0,
        };
      v.units += i.quantity;
      v.revenue += +i.subtotal;
      v.profit += +i.profit;
      rank.set(i.product_id, v);
    }),
  );
  return (
    <>
      <section className="metric-grid four">
        <Metric title="Ventas" value={ars.format(t.revenue)} />
        <Metric title="Ganancia neta" value={ars.format(t.net)} />
        <Metric title="Costos" value={ars.format(t.cost)} />
        <Metric title="Margen" value={t.margin.toFixed(1) + "%"} />
      </section>
      <section className="two-cols">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Evolución real</h2>
              <p>Según el período seleccionado</p>
            </div>
          </div>
          {chart.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chart}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sales" fill="#8b2cf5" />
                <Bar dataKey="profit" fill="#b997df" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty text="No hay datos suficientes." />
          )}
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Productos destacados</h2>
              <p>Por unidades vendidas</p>
            </div>
          </div>
          {[...rank.values()]
            .sort((a, b) => b.units - a.units)
            .slice(0, 5)
            .map((x) => (
              <div className="ranking">
                <span>
                  <b>{x.name}</b>
                  <small>{x.units} unidades</small>
                </span>
                <strong>{ars.format(x.revenue)}</strong>
              </div>
            ))}
          {!rank.size && <Empty text="Sin ventas de productos." />}
        </section>
      </section>
    </>
  );
}
function Reports({
  sales,
  expenses,
  notify,
}: {
  sales: Sale[];
  expenses: Expense[];
  notify: (s: string) => void;
}) {
  const t = totals(sales, expenses),
    rows = [
      ["Ventas", t.revenue],
      ["Costos", t.cost],
      ["Gastos", t.expense],
      ["Ganancia bruta", t.gross],
      ["Ganancia neta", t.net],
      ["Margen", t.margin],
    ];
  async function exportPdf() {
    try {
      const [{ jsPDF }, { default: autoTable }, brandMark] = await Promise.all([import("jspdf"), import("jspdf-autotable"), loadBrandMark()]);
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      doc.setProperties({ title: "Reporte financiero", author: "JCB Developement" });
      doc.setFillColor(116, 35, 204); doc.rect(0, 0, 210, 36, "F");
      doc.setTextColor(255); doc.setFontSize(20); doc.text("Reporte financiero", 14, 17); doc.setFontSize(9); doc.text(`Generado el ${date(new Date().toISOString())}`, 14, 25);
      autoTable(doc, { startY: 48, head: [["Indicador", "Resultado"]], body: rows.map(([name, value]) => [String(name), name === "Margen" ? `${Number(value).toFixed(1)}%` : ars.format(Number(value))]), theme: "grid", styles: { fontSize: 10, cellPadding: 5 }, headStyles: { fillColor: [116, 35, 204] }, alternateRowStyles: { fillColor: [248, 245, 252] } });
      addPdfBranding(doc, brandMark);
      doc.setFontSize(7); doc.setTextColor(120); doc.text("JCB Developement - Documento de marca", 105, 291, { align: "center" });
      doc.save("reporte-financiero-jb.pdf"); notify("Reporte PDF exportado con marca de agua.");
    } catch (error) { notify(`No se pudo crear el PDF: ${error instanceof Error ? error.message : "error desconocido"}`); }
  }
  return (
    <>
      <section className="report-hero panel">
        <div>
          <span>REPORTE FINANCIERO</span>
          <h2>Resumen del período</h2>
          <p>Información obtenida directamente de Supabase.</p>
        </div>
        <div className="export">
          <button className="primary" onClick={exportPdf}>
            <Download />
            Descargar PDF con marca JB
          </button>
        </div>
      </section>
      <section className="report-grid">
        {rows.map(([n, v]) => (
          <article>
            <span>{n}</span>
            <b>
              {n === "Margen"
                ? Number(v).toFixed(1) + "%"
                : ars.format(Number(v))}
            </b>
          </article>
        ))}
      </section>
    </>
  );
}
function DataModal({
  modal,
  products,
  userId,
  close,
  done,
}: {
  modal: Exclude<Modal, null>;
  products: Product[];
  userId: string;
  close: () => void;
  done: (s: string) => void;
}) {
  const [tiers, setTiers] = useState<Array<{ minQty: number; maxQty?: number; unitPrice: number }>>(modal.item?.tier_prices || []);
  if (modal.kind === "sale")
    return <SaleModal products={products} item={modal.item} close={close} done={done} />;
  const item = modal.item || {},
    isProduct = modal.kind === "product",
    isExpense = modal.kind === "expense";
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      payload: any = { user_id: userId };
    if (isProduct)
      Object.assign(payload, {
        name: f.get("name"),
        category: f.get("category"),
        sale_price: +String(f.get("sale_price")),
        cost_price: +String(f.get("cost_price")),
        tier_prices: tiers.filter((tier) => tier.minQty > 0 && tier.unitPrice >= 0),
      });
    else if (isExpense)
      Object.assign(payload, {
        name: f.get("name"),
        category: f.get("category"),
        amount: +String(f.get("amount")),
        description: f.get("description"),
        expense_date: f.get("date"),
      });
    else
      Object.assign(payload, {
        concept: f.get("concept"),
        amount: +String(f.get("amount")),
        payment_method: f.get("method"),
        status: f.get("status"),
        payment_date: f.get("date"),
        notes: f.get("notes"),
      });
    const table = isProduct ? "products" : isExpense ? "expenses" : "payments",
      q = item.id
        ? supabase.from(table).update(payload).eq("id", item.id)
        : supabase.from(table).insert(payload),
      { error } = await q;
    if (error) alert(error.message);
    else done(item.id ? "Registro actualizado" : "Registro creado");
  }
  return (
    <div className="backdrop">
      <form className="modal" onSubmit={submit}>
        <ModalHead
          title={
            (item.id ? "Editar " : "Nuevo ") +
            (isProduct ? "producto" : isExpense ? "gasto" : "pago")
          }
          close={close}
        />
        {isProduct ? (
          <>
            <Field name="name" label="Nombre" value={item.name} />
            <div className="form-grid">
              <Field name="category" label="Categoría" value={item.category} />
              <Field
                name="sale_price"
                label="Precio de venta"
                type="number"
                value={item.sale_price ?? 0}
              />
              <Field
                name="cost_price"
                label="Costo"
                type="number"
                value={item.cost_price ?? 0}
              />
            </div>
            <div className="tier-editor"><div className="tier-editor-head"><span><b>Precios por cantidad</b><small>Opcional: reemplazan el precio normal según las unidades.</small></span><button type="button" onClick={() => setTiers([...tiers, { minQty: 1, unitPrice: Number(item.sale_price) || 0 }])}><Plus />Agregar</button></div>{tiers.map((tier, index) => <div className="tier-row" key={index}><label>Desde<input type="number" min="1" value={tier.minQty} onChange={(e) => setTiers(tiers.map((x, i) => i === index ? { ...x, minQty: +e.target.value } : x))} /></label><label>Hasta<input type="number" min={tier.minQty} placeholder="Sin límite" value={tier.maxQty ?? ""} onChange={(e) => setTiers(tiers.map((x, i) => i === index ? { ...x, maxQty: e.target.value ? +e.target.value : undefined } : x))} /></label><label>Precio c/u<input type="number" min="0" step="0.01" value={tier.unitPrice} onChange={(e) => setTiers(tiers.map((x, i) => i === index ? { ...x, unitPrice: +e.target.value } : x))} /></label><button type="button" className="tier-delete" onClick={() => setTiers(tiers.filter((_, i) => i !== index))}><Trash2 /></button></div>)}</div>
          </>
        ) : isExpense ? (
          <>
            <Field name="name" label="Nombre" value={item.name} />
            <div className="form-grid">
              <Select
                name="category"
                label="Categoría"
                options={[
                  "📢 Publicidad y Marketing",
                  "🖥️ Hosting",
                  "🌐 Dominios",
                  "🧩 Software y Herramientas",
                  "📦 Productos / Mercadería",
                  "🚚 Envíos y Logística",
                  "🏭 Proveedores",
                  "💳 Comisiones de Pago",
                  "🛍️ Comisiones de Marketplace",
                  "💼 Servicios Profesionales",
                  "👥 Sueldos y Personal",
                  "🏢 Alquiler",
                  "💡 Servicios e Infraestructura",
                  "📞 Telefonía e Internet",
                  "🎨 Diseño y Contenido",
                  "📸 Fotografía / Video",
                  "🔄 Devoluciones y Reembolsos",
                  "🧾 Impuestos",
                  "🏦 Gastos Bancarios",
                  "💸 Otros",
                ]}
                value={item.category}
              />
              <Field
                name="amount"
                label="Monto"
                type="number"
                value={item.amount ?? 0}
              />
              <Field
                name="date"
                label="Fecha"
                type="date"
                value={item.expense_date || today()}
              />
            </div>
            <Field
              name="description"
              label="Descripción"
              value={item.description}
            />
          </>
        ) : (
          <>
            <Field name="concept" label="Concepto" value={item.concept} />
            <div className="form-grid">
              <Field
                name="amount"
                label="Monto"
                type="number"
                value={item.amount ?? 0}
              />
              <Select
                name="method"
                label="Método"
                options={methods}
                value={item.payment_method}
              />
              <Select
                name="status"
                label="Estado"
                options={["paid", "pending", "cancelled"]}
                value={item.status}
              />
              <Field
                name="date"
                label="Fecha"
                type="date"
                value={item.payment_date || today()}
              />
            </div>
            <Field name="notes" label="Notas" value={item.notes} />
          </>
        )}
        <Actions close={close} />
      </form>
    </div>
  );
}
function SaleModal({
  products,
  item,
  close,
  done,
}: {
  products: Product[];
  item?: Sale;
  close: () => void;
  done: (s: string) => void;
}) {
  const [lines, setLines] = useState([
      { product_id: products[0]?.id || "", quantity: 1 },
    ]),
    [busy, setBusy] = useState(false),
    [productSearch, setProductSearch] = useState(""),
    [productCategory, setProductCategory] = useState("all");
  const categories = [...new Set(products.map((p) => p.category || "Sin categoría"))].sort((a, b) => a.localeCompare(b, "es"));
  const visibleProducts = products.filter((p) => (productCategory === "all" || p.category === productCategory) && (p.name + " " + p.category).toLowerCase().includes(productSearch.trim().toLowerCase()));
  const priceFor = (product: Product | undefined, quantity: number) => product ? [...(product.tier_prices || [])].sort((a, b) => b.minQty - a.minQty).find((tier) => quantity >= tier.minQty && (!tier.maxQty || quantity <= tier.maxQty))?.unitPrice ?? product.sale_price : 0;
  const total = lines.reduce((a, l) => {
    const p = products.find((x) => x.id === l.product_id);
    return a + priceFor(p, l.quantity) * l.quantity;
  }, 0);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    if (item) {
      const { error } = await supabase.from("sales").update({ payment_method: f.get("method"), status: f.get("status"), notes: f.get("notes") || null, sold_at: new Date(String(f.get("date")) + "T12:00:00-03:00").toISOString() }).eq("id", item.id);
      setBusy(false); if (error) alert(error.message); else done("Venta actualizada correctamente"); return;
    }
    const
      { error } = await supabase.rpc("create_sale", {
        p_items: lines,
        p_payment_method: f.get("method"),
        p_status: f.get("status"),
        p_notes: f.get("notes") || null,
        p_sold_at: new Date(
          String(f.get("date")) + "T12:00:00-03:00",
        ).toISOString(),
      });
    setBusy(false);
    if (error) alert(error.message);
    else done("Venta registrada correctamente");
  }
  return (
    <div className="backdrop">
      <form className="modal" onSubmit={submit}>
        <ModalHead title={item ? "Editar venta" : "Nueva venta"} close={close} />
        {item ? <><div className="sale-edit-summary"><span>Productos<b>{item.sale_items?.map((i) => `${i.quantity}x ${i.products?.name}`).join(", ") || "Venta"}</b></span><span>Total<b>{ars.format(item.total)}</b></span></div><div className="form-grid"><Select name="method" label="Método" options={methods} value={item.payment_method} /><Select name="status" label="Estado" options={["completed", "pending", "cancelled"]} value={item.status} /><Field name="date" label="Fecha" type="date" value={item.sold_at.slice(0, 10)} /></div><Field name="notes" label="Notas" value={item.notes} /><Actions close={close} busy={busy} /></> :
        !products.length ? (
          <Empty text="Primero tenés que crear un producto." />
        ) : (
          <>
            <div className="sale-product-filters">
              <label><span><Search /> Buscar producto</span><input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Escribí nombre o categoría..." /></label>
              <label>Categoría<select value={productCategory} onChange={(e) => setProductCategory(e.target.value)}><option value="all">Todas las categorías</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
            </div>
            <div className="sale-results">{visibleProducts.length} productos encontrados</div>
            {lines.map((l, i) => (
              <div className="sale-line" key={i}>
                <label>
                  Producto
                  <select
                    value={l.product_id}
                    onChange={(e) =>
                      setLines(
                        lines.map((x, j) =>
                          j === i ? { ...x, product_id: e.target.value } : x,
                        ),
                      )
                    }
                  >
                    {!visibleProducts.some((p) => p.id === l.product_id) && products.filter((p) => p.id === l.product_id).map((p) => <option key={p.id} value={p.id}>{p.name} - {ars.format(p.sale_price)}</option>)}
                    {categories.map((category) => { const options = visibleProducts.filter((p) => (p.category || "Sin categoría") === category); return options.length ? <optgroup key={category} label={category}>{options.map((p) => <option key={p.id} value={p.id}>{p.name} - {ars.format(p.sale_price)}</option>)}</optgroup> : null; })}
                  </select>
                </label>
                <label>
                  Cantidad
                  <input
                    type="number"
                    min="1"
                    value={l.quantity}
                    onChange={(e) =>
                      setLines(
                        lines.map((x, j) =>
                          j === i ? { ...x, quantity: +e.target.value } : x,
                        ),
                      )
                    }
                  />
                </label>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLines(lines.filter((_, j) => j !== i))}
                  >
                    <X />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="row-action"
              disabled={!visibleProducts.length}
              onClick={() =>
                setLines([
                  ...lines,
                  { product_id: visibleProducts[0].id, quantity: 1 },
                ])
              }
            >
              <Plus />
              Agregar producto
            </button>
            <div className="form-grid">
              <Select name="method" label="Método" options={methods} />
              <Select
                name="status"
                label="Estado"
                options={["completed", "pending", "cancelled"]}
              />
              <Field name="date" label="Fecha" type="date" value={today()} />
            </div>
            <Field name="notes" label="Notas" />
            <div className="calculation">
              <span>
                Productos<b>{lines.reduce((sum, line) => sum + line.quantity, 0)}</b>
              </span>
              <span>
                Total de venta<b>{ars.format(total)}</b>
              </span>
            </div>
            <Actions close={close} busy={busy} />
          </>
        )}
      </form>
    </div>
  );
}
const methods = [
  "Mercado Pago",
  "Transferencia",
  "Efectivo",
  "Tarjeta",
  "Otro",
];
const optionLabels: Record<string, string> = {
  paid: "Pagado",
  pending: "Pendiente",
  cancelled: "Cancelado",
  completed: "Completada",
};
function Field({
  name,
  label,
  type = "text",
  value = "",
}: {
  name: string;
  label: string;
  type?: string;
  value?: any;
}) {
  return (
    <label>
      {label}
      <input
        required={name !== "description" && name !== "notes"}
        name={name}
        type={type}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "0.01" : undefined}
        defaultValue={value ?? ""}
      />
    </label>
  );
}
function Select({
  name,
  label,
  options,
  value,
}: {
  name: string;
  label: string;
  options: string[];
  value?: string;
}) {
  return (
    <label>
      {label}
      <select name={name} defaultValue={value}>
        {options.map((x) => (
          <option key={x} value={x}>
            {optionLabels[x] ?? x}
          </option>
        ))}
      </select>
    </label>
  );
}
function ModalHead({ title, close }: { title: string; close: () => void }) {
  return (
    <div className="modal-head">
      <div>
        <h2>{title}</h2>
      </div>
      <button type="button" onClick={close}>
        <X />
      </button>
    </div>
  );
}
function Actions({ close, busy }: { close: () => void; busy?: boolean }) {
  return (
    <div className="modal-actions">
      <button type="button" onClick={close}>
        Cancelar
      </button>
      <button className="primary" disabled={busy}>
        {busy ? <Loader2 className="spin" /> : "Guardar"}
      </button>
    </div>
  );
}
function Delete({
  table,
  id,
  reload,
  notify,
}: {
  table: string;
  id: string;
  reload: () => Promise<void>;
  notify: (s: string) => void;
}) {
  return (
    <button
      className="delete-action"
      title="Eliminar"
      onClick={async () => {
        if (!confirm("¿Estás seguro de que deseas eliminar este registro?"))
          return;
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (error) alert(error.message);
        else {
          await reload();
          notify("Registro eliminado");
        }
      }}
    >
      <Trash2 />
    </button>
  );
}
function Toolbar({
  q,
  setQ,
  button,
  action,
  extra,
}: {
  q: string;
  setQ: (s: string) => void;
  button: string;
  action: () => void;
  extra?: any;
}) {
  return (
    <div className="toolbar">
      <div className="search">
        <Search />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar..."
        />
      </div>
      {extra}
      <button className="primary" onClick={action}>
        <Plus />
        {button}
      </button>
    </div>
  );
}
function statusLabel(value: string) {
  const names: Record<string, string> = {
    completed: "Completada",
    pending: "Pendiente",
    cancelled: "Cancelada",
    paid: "Pagado",
  };
  return names[value] || value;
}
function Status({ value }: { value: string }) {
  return (
    <span className={"badge " + value}>
      <i />
      {statusLabel(value)}
    </span>
  );
}
function SimpleTable({
  heads,
  children,
  empty,
}: {
  heads: string[];
  children: any;
  empty: string;
}) {
  const has = Array.isArray(children) ? children.length : !!children;
  return (
    <section className="panel table-panel">
      {has ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {heads.map((h) => (
                  <th>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      ) : (
        <Empty text={empty} />
      )}
    </section>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty compact">
      <Boxes />
      <h2>Sin datos</h2>
      <p>{text}</p>
    </div>
  );
}
function Loading() {
  return (
    <div className="loading">
      <Loader2 className="spin" />
      Cargando información...
    </div>
  );
}
function daySum(items: Expense[], days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return items
    .filter((x) => new Date(x.expense_date + "T12:00:00-03:00") >= d)
    .reduce((a, x) => a + Number(x.amount), 0);
}
function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
}
