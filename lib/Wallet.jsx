"use client";

// Migrated from the Vite app unchanged apart from this directive. It owns all
// the interactive state (localStorage, keydown listeners, recharts), so it
// runs entirely on the client.

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Wallet as WalletIcon, TrendingUp, Target, Briefcase, Music2, Gift, PiggyBank,
  Plane, Laptop, Car, ShoppingCart, HeartPulse, Receipt, ArrowUpRight, ArrowDownRight,
  Sparkles, LayoutDashboard, LineChart as LineChartIcon, CircleDollarSign, Calendar,
  Flame, Shield, Plus, ChevronLeft, Pencil, Trash2, X, Search, Download, RotateCcw, Languages,
  Landmark, CreditCard, Scale, ArrowDownLeft, Upload, Loader2,
} from "lucide-react";
import { loadFromServer, saveToServer } from "./serverSync";

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────
const FREEDOM_TARGET_ILS = 5_500_000;
const FREEDOM_TARGET_STRETCH = 6_000_000;
const PASSIVE_INCOME_TARGET = 20_000;
const SWR = 0.04;
const STORAGE_KEY = "wallet.expenses.v3";

// ────────────────────────────────────────────────────────────────────────────
// i18n — bilingual strings. T is a Proxy backed by CURRENT_LANG, mutated when
// the user clicks the language toggle. After mutation we setState() in <Wallet/>
// which re-renders all consumers; their JSX evaluates fresh strings from T.
// ────────────────────────────────────────────────────────────────────────────
const LANG_KEY = "wallet.lang.v1";
// Guarded against any stored value other than the two real language codes —
// STRINGS isn't declared yet at this point in the module, so the check is a
// literal list rather than `in STRINGS`. Without this, a stray/legacy value
// left over from another page on the same origin makes every T.<key> read
// below throw (STRINGS[CURRENT_LANG] is undefined), blanking the whole app
// with no way to recover through the UI.
let CURRENT_LANG = (() => {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return v === "he" || v === "en" ? v : "he";
  } catch { return "he"; }
})();

const STRINGS = {
  he: {
    appName: "ארנק", tagline: "מערכת הפעלה לחופש כלכלי",
    freedomTracker: "מעקב חופש כלכלי",
    headlineA: "בדרך ל", headlineB: "בחודש", headlineC: "של הכנסה פסיבית",
    swrLineA: "לפי כלל המשיכה הבטוחה של 4%, נדרש תיק של", swrLineB: "— יעד מתיחה",
    currentPortfolio: "תיק נוכחי", perMonth: "/ חודש",
    passiveRunRate: "הכנסה פסיבית משוערת", ofMonthlyGoal: "מהיעד החודשי",
    target55: "יעד 5.5M", stretch6: "מתיחה 6M",
    freedomProgress: "מהיעד הכלכלי", remaining: "נותרו",
    netIncomeJune: "הכנסה נטו", inOf: "נכנס", outOf: "יצא",
    savingsRate: "שיעור חיסכון", savingsRateSub: "חיסכון נטו / הכנסה נטו",
    emergencyBuffer: "כרית ביטחון", months: "חודשים", liquidCash: "מזומן נזיל",
    passiveKpi: "קצב הכנסה פסיבית",
    tabDashboard: "סקירה", tabCashflow: "תזרים", tabExpenses: "הוצאות",
    tabBudgets: "תקציבים", tabEngine: "מנוע השקעות",
    salaryTitle: "משכורת תעסוקתית", salarySub: "הכנסה חודשית והפרשות פטורות ממס",
    autoTracked: "מעקב אוטומטי",
    gross: "ברוטו", netInBank: "נטו לחשבון", pension: "פנסיה",
    pensionSub: "מעסיק + עובד", studyFund: "קרן השתלמות", studyFundSub: "פטור ממס",
    taxShelteredRate: "אחוז הפרשות פטורות ממס",
    sideTitle: "פרילנס וצד", sideSub: "DJ, אירועים, מוצרים דיגיטליים",
    hideLedger: "הסתר יומן", showLedger: "הצג יומן",
    monthRevenue: "הכנסות החודש", gigs: "הופעות", avg: "ממוצע",
    windfallsTitle: "הכנסות חד-פעמיות", windfallsSub: "פיצויים, מענקים, החזרי מס",
    toInvestment: "← לתיק השקעות", toEmergency: "← לקרן חירום",
    budgetTitle: "תקציב מול מציאות", budgetSub: "עמודות הליבה · סטייה צבועה",
    surplus: "עודף", deficit: "גירעון",
    colCategory: "קטגוריה", colActual: "בפועל", colTarget: "יעד",
    colVariance: "סטייה", colUtil: "ניצול", total: "סה״כ", ofBudget: "מהתקציב",
    spendingMix: "פיזור הוצאות", spendingMixSub: "לאן הלך הכסף ב",
    thisMonth: "החודש הנוכחי", viewingMonth: "מציג נתונים עבור",
    prevMonth: "חודש קודם", nextMonth: "חודש הבא",
    editTargetHint: "לחץ כדי לערוך", noCategoryItems: "אין הוצאות בקטגוריה זו בחודש זה",
    engineTitle: "מנוע התיק · תחזית 15 שנה", engineSub: "מתי הכנסה פסיבית עוברת ₪20,000 בחודש?",
    freedomIn: "חופש בעוד", beyond15: "מעבר ל-15 שנה — שנה את הקלט",
    initialPortfolio: "תיק התחלתי", monthlyContribution: "הפקדה חודשית", expectedReturn: "תשואה שנתית צפויה",
    yearsToFreedom: "שנים לחופש", portfolioAtGoal: "תיק ביעד",
    portfolio: "תיק", passivePerMo: "פסיבית / חודש",
    goal20k: "יעד ₪20K", freedomLabel: "חופש", yearWord: "שנה", yearsWord: "שנים", monthsWord: "חודשים",
    cashflowSummary: "סיכום תזרים · יוני", cashflowSummarySub: "נכנס מול יוצא במבט מהיר",
    salaryNet: "משכורת נטו", sideTotal: "הכנסות צד", expenses: "הוצאות", netToInvest: "נטו להשקעה",
    savingsRateShort: "שיעור חיסכון", income: "הכנסה",
    expensesTitle: "הוצאות החודש", expensesSub: "כל החיובים — נטענו מדף הפירוט של ישראכרט",
    addExpense: "הוסף הוצאה", searchPh: "חפש בית עסק או הערה…",
    allCategories: "הכל", exportCsv: "ייצא ל-CSV",
    resetSeed: "אפס לנתוני דמו", resetConfirm: "לאפס את כל ההוצאות לנתוני הדמו? פעולה זו תמחק כל עריכה.",
    addNote: "הוסף הערה", allMonths: "כל החודשים", byMonth: "לפי חודש", monthTotal: "סה״כ לחודש",
    serverConnected: "שרת מחובר", serverOffline: "מקומי בלבד",
    importSync: "ייבוא מסנכרון", importBadFile: "קובץ לא תקין — בחר PDF של ישראכרט או wallet-sync.json",
    importParsing: "מפענח PDF…", importDone: (a, s, z) => `נוספו ${a} · דולגו ${s} כפולים · אשראי עודכן ל-₪${z}`,
    colDate: "תאריך", colMerchant: "שם בית עסק", colAmount: "סכום", colActions: "פעולות",
    noteOptional: "הערה (אופציונלי)",
    empty: "אין הוצאות בתצוגה זו", emptyCta: "הוסף את ההוצאה הראשונה",
    totalShowing: "סה״כ בתצוגה", items: "פריטים", avgPerItem: "ממוצע / פריט",
    editorAddTitle: "הוסף הוצאה", editorEditTitle: "ערוך הוצאה",
    fieldDate: "תאריך", fieldMerchant: "שם בית עסק", fieldMerchantPh: "לדוגמה: שופרסל הוד השרון",
    fieldCategory: "קטגוריה", fieldAmount: "סכום (₪)", fieldNote: "הערה", fieldNotePh: "הערה חופשית",
    errMerchant: "שם בית עסק חובה", errAmount: "סכום חייב להיות גדול מ-0", errDate: "תאריך חובה",
    cancel: "ביטול", save: "שמור", delete: "מחק", confirmDelete: "מחק?",
    yes: "כן", no: "לא", edit: "ערוך",
    bankTitle: "חשבון בנק", bankSub: "עו״ש מול הוצאות אשראי",
    checking: "יתרת עו״ש", creditOutstanding: "הוצאות אשראי", available: "זמין בפועל",
    overdraft: "מינוס", bankAvailableNote: "עו״ש פחות הוצאות אשראי צפויות",
    editAccount: "ערוך חשבון", editSalaryT: "ערוך משכורת",
    addGig: "הוסף הופעה", editGig: "ערוך הופעה",
    addWindfall: "הוסף הכנסה", editWindfall: "ערוך הכנסה",
    fieldLabel: "תיאור", fieldLabelPh: "לדוגמה: הופעה בקפה לנדוור",
    fieldAllocation: "יעוד", allocInvestment: "תיק השקעות", allocEmergency: "כרית ביטחון",
    errLabel: "תיאור חובה", noGigs: "אין הופעות עדיין",
    monthlyBalance: "מאזן חודשי", monthlyBalanceSub: "הכנסות מול הוצאות ·",
    totalIncomeLabel: "סך הכנסות", totalExpensesLabel: "סך הוצאות", netBalance: "נטו במאזן",
    statusSurplus: "במאזן חיובי 🎉", statusDeficit: "במאזן שלילי",
    oneTime: "חד-פעמי", transactions: "תנועות",
    recurringNet: "נטו שוטף (ללא חד-פעמי)", ofIncomeSaved: "מההכנסות נחסך",
    footer: "ארנק · מערכת פיננסית אישית · כלל 4% · נבנה ליעד החופש הכלכלי",
    langSwitchTo: "EN",
    monthsAbbr: ["ינו", "פבר", "מרץ", "אפר", "מאי", "יונ", "יול", "אוג", "ספט", "אוק", "נוב", "דצמ"],
    chartMonths: ["מרץ", "אפר", "מאי", "יוני"],
  },
  en: {
    appName: "Wallet", tagline: "Financial Freedom OS",
    freedomTracker: "Financial Freedom Tracker",
    headlineA: "On the road to", headlineB: "/ month", headlineC: "of passive income",
    swrLineA: "Using the 4% safe withdrawal rule, you need a portfolio of", swrLineB: "— stretch to",
    currentPortfolio: "Current Portfolio", perMonth: "/ mo",
    passiveRunRate: "Run-rate Passive Income", ofMonthlyGoal: "of monthly goal",
    target55: "5.5M target", stretch6: "6M stretch",
    freedomProgress: "of freedom milestone", remaining: "remaining",
    netIncomeJune: "Net Income", inOf: "in", outOf: "out",
    savingsRate: "Savings Rate", savingsRateSub: "Net savings / net income",
    emergencyBuffer: "Emergency Buffer", months: "months", liquidCash: "liquid",
    passiveKpi: "Passive Income Run-rate",
    tabDashboard: "Dashboard", tabCashflow: "Cash Flow", tabExpenses: "Expenses",
    tabBudgets: "Budgets", tabEngine: "Engine",
    salaryTitle: "Active Tech Salary", salarySub: "Monthly W-2 income & tax-sheltered savings",
    autoTracked: "Auto-tracked",
    gross: "Gross", netInBank: "Net in Bank", pension: "Pension",
    pensionSub: "Employer + Employee", studyFund: "Study Fund", studyFundSub: "Tax-sheltered",
    taxShelteredRate: "Tax-sheltered savings rate",
    sideTitle: "Side Business / Freelance", sideSub: "DJ sets, events, digital products",
    hideLedger: "Hide ledger", showLedger: "Show ledger",
    monthRevenue: "June revenue", gigs: "gigs", avg: "avg",
    windfallsTitle: "One-time Windfalls", windfallsSub: "Severance, grants, refunds",
    toInvestment: "→ Investment", toEmergency: "→ Emergency Fund",
    budgetTitle: "Budget vs. Reality", budgetSub: "Core pillars · color-coded variance",
    surplus: "Surplus", deficit: "Deficit",
    colCategory: "Category", colActual: "Actual", colTarget: "Target",
    colVariance: "Variance", colUtil: "Utilization", total: "Total", ofBudget: "of budget",
    spendingMix: "Spending Mix", spendingMixSub: "Where the money went in",
    thisMonth: "This month", viewingMonth: "Showing data for",
    prevMonth: "Previous month", nextMonth: "Next month",
    editTargetHint: "Click to edit", noCategoryItems: "No expenses in this category this month",
    engineTitle: "Portfolio Engine · 15-Year Projection", engineSub: "When does passive income cross ₪20,000 / month?",
    freedomIn: "Freedom in", beyond15: "Beyond 15 years — adjust inputs",
    initialPortfolio: "Initial Portfolio", monthlyContribution: "Monthly Contribution", expectedReturn: "Expected Annual Return",
    yearsToFreedom: "Years to freedom", portfolioAtGoal: "Portfolio at goal",
    portfolio: "Portfolio", passivePerMo: "Passive / mo",
    goal20k: "₪20K goal", freedomLabel: "Freedom", yearWord: "year", yearsWord: "years", monthsWord: "months",
    cashflowSummary: "June Cash Flow Summary", cashflowSummarySub: "In vs. out, at a glance",
    salaryNet: "Salary (net)", sideTotal: "Side hustle", expenses: "Expenses", netToInvest: "Net to invest",
    savingsRateShort: "savings rate", income: "Income",
    expensesTitle: "This Month's Expenses", expensesSub: "All charges — loaded from your Isracard statement",
    addExpense: "Add Expense", searchPh: "Search merchant or note…",
    allCategories: "All", exportCsv: "Export CSV",
    resetSeed: "Reset to demo data", resetConfirm: "Reset all expenses to demo data? This will erase your edits.",
    addNote: "Add note", allMonths: "All months", byMonth: "By month", monthTotal: "Month total",
    serverConnected: "Server connected", serverOffline: "Local only",
    importSync: "Import sync", importBadFile: "Invalid file — pick an Isracard PDF or wallet-sync.json",
    importParsing: "Parsing PDF…", importDone: (a, s, z) => `Added ${a} · skipped ${s} dupes · credit set to ₪${z}`,
    colDate: "Date", colMerchant: "Merchant", colAmount: "Amount", colActions: "Actions",
    noteOptional: "Note (optional)",
    empty: "No expenses match this view", emptyCta: "Add your first expense",
    totalShowing: "Total showing", items: "items", avgPerItem: "Avg / item",
    editorAddTitle: "Add expense", editorEditTitle: "Edit expense",
    fieldDate: "Date", fieldMerchant: "Merchant", fieldMerchantPh: "e.g. Shufersal Hod HaSharon",
    fieldCategory: "Category", fieldAmount: "Amount (₪)", fieldNote: "Note", fieldNotePh: "Optional note",
    errMerchant: "Merchant is required", errAmount: "Amount must be greater than 0", errDate: "Date is required",
    cancel: "Cancel", save: "Save", delete: "Delete", confirmDelete: "Delete?",
    yes: "Yes", no: "No", edit: "Edit",
    bankTitle: "Bank Account", bankSub: "Checking vs. credit charges",
    checking: "Checking balance", creditOutstanding: "Credit card charges", available: "Available",
    overdraft: "Overdraft", bankAvailableNote: "Checking minus upcoming credit charges",
    editAccount: "Edit account", editSalaryT: "Edit salary",
    addGig: "Add gig", editGig: "Edit gig",
    addWindfall: "Add windfall", editWindfall: "Edit windfall",
    fieldLabel: "Description", fieldLabelPh: "e.g. Gig at Café Landwer",
    fieldAllocation: "Allocation", allocInvestment: "Investment", allocEmergency: "Emergency Fund",
    errLabel: "Description is required", noGigs: "No gigs yet",
    monthlyBalance: "Monthly Balance", monthlyBalanceSub: "Income vs expenses ·",
    totalIncomeLabel: "Total income", totalExpensesLabel: "Total expenses", netBalance: "Net balance",
    statusSurplus: "In surplus 🎉", statusDeficit: "In deficit",
    oneTime: "One-time", transactions: "transactions",
    recurringNet: "Recurring net (excl. one-time)", ofIncomeSaved: "of income saved",
    footer: "Wallet · Personal finance OS · 4% safe withdrawal · Built for the freedom milestone",
    langSwitchTo: "עב",
    monthsAbbr: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    chartMonths: ["Mar", "Apr", "May", "Jun"],
  },
};

const T = new Proxy({}, {
  // Falls back to the Hebrew pack, not just the Hebrew key, in case
  // CURRENT_LANG is ever something other than "he"/"en" despite the guard
  // above (setLang() writes it directly too).
  get: (_, key) => (STRINGS[CURRENT_LANG] ?? STRINGS.he)[key] ?? STRINGS.he[key],
});

const isHe = () => CURRENT_LANG === "he";

// Categories — bilingual names. Resolve via catName(c) at render time.
const CATEGORIES = [
  { id: "travel",    names: { he: "טיולים וחוויות",    en: "Travel & Experiences" }, icon: Plane,        color: "#22d3ee", target: 4500 },
  { id: "workspace", names: { he: "ציוד וסביבת עבודה", en: "Workspace & Equipment" }, icon: Laptop,       color: "#2dd4bf", target: 6500 },
  { id: "car",       names: { he: "רכב ותחבורה",       en: "Car & Transport" },       icon: Car,          color: "#a78bfa", target: 1200 },
  { id: "groceries", names: { he: "מזון ובית",         en: "Groceries & Home" },      icon: ShoppingCart, color: "#34d399", target: 800 },
  { id: "health",    names: { he: "בריאות ופארם",      en: "Health & Pharmacy" },     icon: HeartPulse,   color: "#fb7185", target: 250 },
  { id: "financial", names: { he: "פיננסי ואחר",       en: "Financial & Other" },     icon: Receipt,      color: "#fbbf24", target: 400 },
];
const CAT_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
const catName = (c) => c?.names?.[CURRENT_LANG] ?? c?.names?.he ?? "";

// Remember the last category the user picked so new/imported expenses default to it.
const LAST_CATEGORY_KEY = "wallet.lastCategory.v1";
const getLastCategory = () => {
  try { return localStorage.getItem(LAST_CATEGORY_KEY) || "groceries"; } catch { return "groceries"; }
};
const rememberCategory = (id) => {
  try { localStorage.setItem(LAST_CATEGORY_KEY, id); } catch {}
};

// Keyword → category-id (mirrors wallet-sync/categorize.mjs). First match wins.
const CATEGORIZE_RULES = [
  { cat: "groceries", re: /שופרסל|טיב טעם|רמי לוי|ויקטורי|יוחננוף|מגה|אושר עד|tiv ?taam|shufersal|סופרמרקט|מכולת|am ?:?pm/i },
  { cat: "car",       re: /דלק|פז|סונול|דור אלון|ten|yellow|פנגו|pango|cellopark|חניון|חניה|ביטוח חובה|רכב חובה|הפניקס רכב|הפול|טסט|מוסך/i },
  { cat: "health",    re: /סופר.{0,4}פארם|super.?pharm|ניו.{0,2}פארם|לאומית|כללית|מכבי|מאוחדת|בית מרקחת|pharm|רופא|מרפאה|tif/i },
  { cat: "travel",    re: /airbnb|booking|expedia|ארקיע|אל על|el ?al|ryanair|wizz|טיסה|פסטיבל|festival|hotel|מלון|hostel|נופש|חופשה/i },
  { cat: "workspace", re: /kygini|aws|amazon web|google|adobe|microsoft|github|openai|anthropic|notion|figma|jetbrains|הגברה|pioneer|ציוד|apple\.com|app ?store/i },
  { cat: "financial", re: /ישראכרט|isracard|מקס איט|max|כאל|cal|עמלה|ריבית|העברה|bit|paybox|ביטוח לאומי/i },
];
const categorize = (desc = "") => {
  for (const { cat, re } of CATEGORIZE_RULES) if (re.test(desc)) return cat;
  return "financial";
};

// Expenses start empty — the real data comes from importing your Isracard PDF
// ("ייבוא מסנכרון"). This avoids duplicating transactions that the import provides.
const SEED_EXPENSES = [];

// Asset base — starting point
const INITIAL_PORTFOLIO = 127_440;   // אלטשולר שחם + אילון מן (מסלול מנייתי, ללא נגיעה)
// מיטב טרייד — חשבון מסחר עצמאי חדש בשלבי הקמה (0 ₪ נכון לעכשיו)
const CASH_RESERVES = 6_464;          // יתרה נזילה נוכחית בעו"ש
const SALARY = { gross: 23_000, netInBank: 14_500, pension: 0, studyFund: 2_300, taxesAndSocial: 6_200 };
// Side hustle — music & events business
const SIDE_HUSTLE = [
  { id: 1, label: { he: "אירוע דיג'יי (חתונה)", en: "DJ wedding gig"     }, date: "08.06", amount: 4000 },
  { id: 2, label: { he: "אירוע קריוקי",          en: "Karaoke event"      }, date: "21.06", amount: 1900 },
  { id: 3, label: { he: "הופעה — קפה לנדוור",    en: "Gig — Café Landwer" }, date: "28.06", amount: 2660 },
];
// One-time injections this month
const WINDFALLS_SEED = [
  { id: 1, label: { he: "פיצויים נטו (חוזה הייטק)", en: "Severance (net)"      }, date: "01.06", amount: 17_280, allocation: "investment" },
  { id: 2, label: { he: "דמי ביטוח לאומי",          en: "National insurance"  }, date: "10.06", amount: 5_374,  allocation: "emergency"  },
];
const labelFor = (item) =>
  typeof item.label === "string" ? item.label : (item.label?.[CURRENT_LANG] ?? item.label?.he ?? "");

// Formatters — locale follows CURRENT_LANG
const locale = () => (CURRENT_LANG === "he" ? "he-IL" : "en-IL");
const fmt = (n) =>
  new Intl.NumberFormat(locale(), { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(Math.round(n));
const fmtMoney = (n) =>
  new Intl.NumberFormat(locale(), { style: "currency", currency: "ILS", maximumFractionDigits: 2 }).format(n);
const fmtCompact = (n) =>
  new Intl.NumberFormat(locale(), { notation: "compact", maximumFractionDigits: 1 }).format(n);
const pct = (n, digits = 1) => `${(n * 100).toFixed(digits)}%`;
const fmtDate = (iso) =>
  new Intl.DateTimeFormat(locale(), { day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(iso));
const monthKey = (iso) => (iso || "").slice(0, 7); // "YYYY-MM"
const monthLabel = (key) => {
  const [y, m] = key.split("-");
  return new Intl.DateTimeFormat(locale(), { month: "long", year: "numeric" }).format(new Date(+y, +m - 1, 1));
};

// LTR wrapper for currency / numbers inside an RTL page
const Money = ({ children, className = "" }) => (
  <span dir="ltr" className={`inline-block tabular-nums ${className}`}>{children}</span>
);

// ────────────────────────────────────────────────────────────────────────────
// Expenses store (localStorage-backed)
// ────────────────────────────────────────────────────────────────────────────
function loadExpenses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_EXPENSES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED_EXPENSES;
  } catch { return SEED_EXPENSES; }
}
function useExpenses() {
  const [expenses, setExpenses] = useState(loadExpenses);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses)); } catch {}
  }, [expenses]);
  const addExpense = (e) => setExpenses((p) => [{ ...e, id: crypto.randomUUID() }, ...p]);
  const updateExpense = (id, patch) => setExpenses((p) => p.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const deleteExpense = (id) => setExpenses((p) => p.filter((e) => e.id !== id));
  const resetToSeed = () => setExpenses(SEED_EXPENSES);

  // Merge a synced batch, de-duplicating by extId. Returns { added, skipped }.
  const importExpenses = (incoming = []) => {
    let added = 0, skipped = 0;
    setExpenses((prev) => {
      const seen = new Set(prev.map((e) => e.extId).filter(Boolean));
      const fresh = [];
      for (const e of incoming) {
        if (e.extId && seen.has(e.extId)) { skipped++; continue; }
        if (e.extId) seen.add(e.extId);
        fresh.push({ id: crypto.randomUUID(), note: "", category: "financial", ...e });
        added++;
      }
      return [...fresh, ...prev];
    });
    return { added, skipped };
  };

  return { expenses, addExpense, updateExpense, deleteExpense, resetToSeed, importExpenses, _setExpenses: setExpenses };
}

// ────────────────────────────────────────────────────────────────────────────
// Budget targets — per-category overrides of CATEGORIES[].target (localStorage)
// ────────────────────────────────────────────────────────────────────────────
const BUDGETS_KEY = "wallet.budgets.v1";
function loadBudgets() {
  let saved = {};
  try {
    const raw = localStorage.getItem(BUDGETS_KEY);
    if (raw) saved = JSON.parse(raw) || {};
  } catch {}
  return Object.fromEntries(CATEGORIES.map((c) => [c.id, typeof saved[c.id] === "number" ? saved[c.id] : c.target]));
}
function useBudgets() {
  const [budgets, setBudgets] = useState(loadBudgets);
  useEffect(() => {
    try { localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets)); } catch {}
  }, [budgets]);
  const setBudget = (id, value) => setBudgets((b) => ({ ...b, [id]: value }));
  return { budgets, setBudget };
}

// ────────────────────────────────────────────────────────────────────────────
// Finance store — salary, side hustle, windfalls, bank account (localStorage)
// ────────────────────────────────────────────────────────────────────────────
const FINANCE_KEY = "wallet.finance.v1";
const DEFAULT_FINANCE = {
  salary: { ...SALARY },
  sideHustle: SIDE_HUSTLE.map((g) => ({ ...g })),
  windfalls: WINDFALLS_SEED.map((w) => ({ ...w })),
  bank: { checking: 6464.81, creditCardOutstanding: 7660 },
};

function loadFinance() {
  try {
    const raw = localStorage.getItem(FINANCE_KEY);
    if (!raw) return DEFAULT_FINANCE;
    const p = JSON.parse(raw);
    return {
      salary: { ...DEFAULT_FINANCE.salary, ...(p.salary || {}) },
      bank: { ...DEFAULT_FINANCE.bank, ...(p.bank || {}) },
      sideHustle: Array.isArray(p.sideHustle) ? p.sideHustle : DEFAULT_FINANCE.sideHustle,
      windfalls: Array.isArray(p.windfalls) ? p.windfalls : DEFAULT_FINANCE.windfalls,
    };
  } catch { return DEFAULT_FINANCE; }
}

function useFinance() {
  const [finance, setFinance] = useState(loadFinance);
  useEffect(() => {
    try { localStorage.setItem(FINANCE_KEY, JSON.stringify(finance)); } catch {}
  }, [finance]);

  const setSalary = (patch) => setFinance((f) => ({ ...f, salary: { ...f.salary, ...patch } }));
  const setBank   = (patch) => setFinance((f) => ({ ...f, bank: { ...f.bank, ...patch } }));

  const addGig    = (g)        => setFinance((f) => ({ ...f, sideHustle: [{ ...g, id: crypto.randomUUID() }, ...f.sideHustle] }));
  const updateGig = (id, patch) => setFinance((f) => ({ ...f, sideHustle: f.sideHustle.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
  const deleteGig = (id)       => setFinance((f) => ({ ...f, sideHustle: f.sideHustle.filter((g) => g.id !== id) }));

  const addWindfall    = (w)        => setFinance((f) => ({ ...f, windfalls: [{ allocation: "investment", ...w, id: crypto.randomUUID() }, ...f.windfalls] }));
  const updateWindfall = (id, patch) => setFinance((f) => ({ ...f, windfalls: f.windfalls.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));
  const deleteWindfall = (id)       => setFinance((f) => ({ ...f, windfalls: f.windfalls.filter((w) => w.id !== id) }));
  const toggleWindfall = (id)       => setFinance((f) => ({ ...f, windfalls: f.windfalls.map((w) => (w.id === id ? { ...w, allocation: w.allocation === "investment" ? "emergency" : "investment" } : w)) }));

  return { finance, setSalary, setBank, addGig, updateGig, deleteGig, addWindfall, updateWindfall, deleteWindfall, toggleWindfall, _setFinance: setFinance };
}

// ────────────────────────────────────────────────────────────────────────────
// UI primitives
// ────────────────────────────────────────────────────────────────────────────
const Card = ({ className = "", children }) => (
  <div className={
    "rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900/70 to-slate-900/30 " +
    "backdrop-blur shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] " + className
  }>{children}</div>
);

const SectionTitle = ({ icon: Icon, title, subtitle, right }) => (
  <div className="flex items-end justify-between gap-4 mb-4">
    <div>
      <div className="flex items-center gap-2 text-slate-200">
        {Icon && <Icon className="w-4 h-4 text-teal-300" />}
        <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
      </div>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
    {right}
  </div>
);

const Pill = ({ tone = "neutral", children, className = "" }) => {
  const tones = {
    pos:     "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    neg:     "bg-rose-500/10    text-rose-300    border-rose-500/20",
    warn:    "bg-amber-500/10   text-amber-300   border-amber-500/20",
    info:    "bg-cyan-500/10    text-cyan-300    border-cyan-500/20",
    neutral: "bg-slate-700/30   text-slate-300   border-slate-700/60",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
};

const Kpi = ({ icon: Icon, label, value, sub, tone = "neutral", trend }) => {
  const ring = {
    pos: "from-emerald-500/20 to-teal-500/0",
    neg: "from-rose-500/20    to-rose-500/0",
    info:"from-cyan-500/20    to-cyan-500/0",
    neutral:"from-slate-500/10 to-slate-500/0",
  }[tone];
  return (
    <Card className="p-5 relative overflow-hidden">
      <div className={`pointer-events-none absolute -top-12 -left-10 w-40 h-40 rounded-full blur-2xl bg-gradient-to-br ${ring}`} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400 text-xs tracking-wide">
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {label}
        </div>
        {trend !== undefined && (
          <Pill tone={trend >= 0 ? "pos" : "neg"}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <Money>{Math.abs(trend).toFixed(1)}%</Money>
          </Pill>
        )}
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-50 tracking-tight"><Money>{value}</Money></div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </Card>
  );
};

const Stat = ({ label, value, sub, tone = "neutral" }) => {
  const valueColor = { pos: "text-emerald-300", neg: "text-rose-300", info: "text-cyan-300", neutral: "text-slate-100" }[tone];
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/30 p-3">
      <div className="text-[11px] tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${valueColor}`}><Money>{value}</Money></div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Freedom Hero
// ────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────
// Monthly Balance — the "where do I stand right now" panel (top of dashboard)
// ────────────────────────────────────────────────────────────────────────────
const BalanceBar = ({ label, value, max, tone, icon: Icon }) => {
  const grad = tone === "in" ? "from-emerald-400 to-teal-400" : "from-rose-400 to-amber-400";
  const txt  = tone === "in" ? "text-emerald-300" : "text-rose-300";
  return (
    <div>
      <div className="flex justify-between items-center text-xs mb-1.5">
        <span className="text-slate-400 inline-flex items-center gap-1.5">
          {Icon && <Icon className={`w-3.5 h-3.5 ${txt}`} />}{label}
        </span>
        <Money className="text-slate-100 font-semibold">{fmt(value)}</Money>
      </div>
      <div dir="ltr" className="h-2.5 rounded-full bg-slate-800/80 overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${grad} transition-all`}
          style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </div>
    </div>
  );
};

const MonthlyBalance = ({ salaryNet, sideTotal, windfallsTotal, expenses, month }) => {
  const monthExpenses = useMemo(() => expenses.filter((e) => monthKey(e.date) === month), [expenses, month]);
  const expensesTotal = useMemo(() => monthExpenses.reduce((s, e) => s + e.amount, 0), [monthExpenses]);
  const expenseCount = monthExpenses.length;
  const recurringIn = salaryNet + sideTotal;
  const totalIn = recurringIn + windfallsTotal;
  const net = totalIn - expensesTotal;
  const recurringNet = recurringIn - expensesTotal;
  const savingsRate = totalIn ? net / totalIn : 0;
  const max = Math.max(totalIn, expensesTotal, 1);
  const surplus = net >= 0;

  return (
    <Card className="p-6 relative overflow-hidden">
      <div className={`pointer-events-none absolute -top-28 -left-20 w-[420px] h-[420px] rounded-full blur-3xl bg-gradient-to-br ${surplus ? "from-emerald-500/15" : "from-rose-500/15"} to-transparent`} />
      <SectionTitle icon={Scale} title={T.monthlyBalance} subtitle={`${T.monthlyBalanceSub} ${monthLabel(month)}`}
        right={<Pill tone={surplus ? "pos" : "neg"}>{surplus ? T.statusSurplus : T.statusDeficit}</Pill>} />

      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4">
          <div className="text-[11px] tracking-wide text-emerald-300/80 inline-flex items-center gap-1.5"><ArrowDownLeft className="w-3.5 h-3.5" />{T.totalIncomeLabel}</div>
          <div className="mt-1 text-3xl font-semibold text-emerald-200"><Money>{fmt(totalIn)}</Money></div>
        </div>
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.05] p-4">
          <div className="text-[11px] tracking-wide text-rose-300/80 inline-flex items-center gap-1.5"><ArrowUpRight className="w-3.5 h-3.5" />{T.totalExpensesLabel}</div>
          <div className="mt-1 text-3xl font-semibold text-rose-200"><Money>{fmt(expensesTotal)}</Money></div>
          <div className="text-[11px] text-slate-500 mt-1">{expenseCount} {T.transactions}</div>
        </div>
        <div className={`rounded-xl border p-4 ${surplus ? "border-teal-500/30 bg-teal-500/[0.07]" : "border-rose-500/30 bg-rose-500/[0.07]"}`}>
          <div className="text-[11px] tracking-wide text-slate-400">{T.netBalance}</div>
          <div className={`mt-1 text-3xl font-semibold ${surplus ? "text-teal-200" : "text-rose-300"}`}>
            <Money>{net >= 0 ? "+" : "−"}{fmt(Math.abs(net))}</Money>
          </div>
          <div className="text-[11px] text-slate-500 mt-1"><Money>{pct(savingsRate, 0)}</Money> {T.ofIncomeSaved}</div>
        </div>
      </div>

      <div className="relative mt-5 space-y-3">
        <BalanceBar label={T.totalIncomeLabel}   value={totalIn}       max={max} tone="in"  icon={ArrowDownLeft} />
        <BalanceBar label={T.totalExpensesLabel} value={expensesTotal} max={max} tone="out" icon={ArrowUpRight} />
      </div>

      <div className="relative mt-5 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-slate-500">{T.totalIncomeLabel}:</span>
        <Pill tone="pos">{T.salaryNet} <Money>{fmt(salaryNet)}</Money></Pill>
        <Pill tone="pos">{T.sideTotal} <Money>{fmt(sideTotal)}</Money></Pill>
        {windfallsTotal > 0 && <Pill tone="warn">{T.oneTime} <Money>{fmt(windfallsTotal)}</Money></Pill>}
        <span className="mx-1 text-slate-700">·</span>
        <Pill tone="neutral">{T.recurringNet} <Money className={recurringNet >= 0 ? "text-emerald-300" : "text-rose-300"}>{fmt(recurringNet)}</Money></Pill>
      </div>
    </Card>
  );
};

const FreedomHero = ({ portfolio, monthlyContribution }) => {
  const monthlyPassive = (portfolio * SWR) / 12;
  const progress = Math.min(portfolio / FREEDOM_TARGET_ILS, 1);
  const progressStretch = Math.min(portfolio / FREEDOM_TARGET_STRETCH, 1);
  const remaining = Math.max(FREEDOM_TARGET_ILS - portfolio, 0);
  const passiveProgress = Math.min(monthlyPassive / PASSIVE_INCOME_TARGET, 1);

  return (
    <Card className="p-6 md:p-8 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full blur-3xl bg-gradient-to-br from-teal-500/25 via-cyan-500/10 to-transparent" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-[360px] h-[360px] rounded-full blur-3xl bg-gradient-to-tr from-emerald-500/15 to-transparent" />

      <div className="relative flex flex-col lg:flex-row gap-8 lg:items-end justify-between">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 text-teal-300/90 text-xs tracking-[0.2em]">
            <Sparkles className="w-3.5 h-3.5" /> {T.freedomTracker}
          </div>
          <h1 className="mt-3 text-3xl md:text-4xl font-semibold text-slate-50 leading-tight">
            {T.headlineA} <Money className="text-teal-300">{fmt(PASSIVE_INCOME_TARGET)}</Money> {T.headlineB}
            <span className="text-slate-500"> {T.headlineC}.</span>
          </h1>
          <p className="mt-3 text-slate-400 text-sm leading-relaxed">
            {T.swrLineA}{" "}
            <Money className="text-slate-200 font-medium">{fmt(FREEDOM_TARGET_ILS)}</Money>{" "}
            {T.swrLineB} <Money className="text-slate-200">{fmt(FREEDOM_TARGET_STRETCH)}</Money>.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 min-w-[280px]">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-[11px] tracking-wide text-slate-500">{T.currentPortfolio}</div>
            <div className="mt-1 text-2xl font-semibold text-slate-50"><Money>{fmt(portfolio)}</Money></div>
            <div className="text-[11px] text-slate-500 mt-1">+ <Money>{fmt(monthlyContribution)}</Money> {T.perMonth}</div>
          </div>
          <div className="rounded-xl border border-teal-500/30 bg-teal-500/[0.06] p-4">
            <div className="text-[11px] tracking-wide text-teal-300/80">{T.passiveRunRate}</div>
            <div className="mt-1 text-2xl font-semibold text-teal-200"><Money>{fmt(monthlyPassive)}</Money></div>
            <div className="text-[11px] text-teal-300/70 mt-1"><Money>{pct(passiveProgress)}</Money> {T.ofMonthlyGoal}</div>
          </div>
        </div>
      </div>

      <div className="relative mt-8">
        <div className="flex justify-between text-[11px] text-slate-500 mb-2">
          <span><Money>{fmt(0)}</Money></span>
          <span className="text-teal-300/70">{T.target55}</span>
          <span>{T.stretch6}</span>
        </div>
        <div dir="ltr" className="h-3 rounded-full bg-slate-800/80 overflow-hidden relative">
          <div className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-full transition-all"
               style={{ width: `${progressStretch * 100}%` }} />
          <div className="absolute top-0 bottom-0 w-px bg-teal-200/80"
               style={{ left: `${(FREEDOM_TARGET_ILS / FREEDOM_TARGET_STRETCH) * 100}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400">
          <span><Money className="text-slate-200 font-medium">{pct(progress)}</Money> {T.freedomProgress}</span>
          <span>{T.remaining} <Money>{fmt(remaining)}</Money></span>
        </div>
      </div>
    </Card>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Salary / Side hustle / Windfalls
// ────────────────────────────────────────────────────────────────────────────
// Shared modal + input primitives (also used by ExpenseEditor-style forms)
const todayDDMM = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const inputCls = "w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-teal-500/50 focus:outline-none";
const TextInput = (props) => <input type="text" className={inputCls} {...props} />;
const NumInput  = (props) => <input type="number" step="0.01" dir="ltr" className={`${inputCls} text-end`} {...props} />;
const ErrBox    = ({ children }) => <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{children}</div>;

const EditBtn = ({ onClick, label }) => (
  <button onClick={onClick} title={label}
    className="text-[11px] text-slate-400 hover:text-teal-300 inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-800 hover:border-teal-500/40">
    <Pencil className="w-3 h-3" /> {label}
  </button>
);
const AddBtn = ({ onClick, label }) => (
  <button onClick={onClick}
    className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-md bg-teal-400/10 text-teal-300 border border-teal-500/30 hover:bg-teal-400/20">
    <Plus className="w-3 h-3" /> {label}
  </button>
);

const Modal = ({ icon: Icon, title, onClose, children, maxW = "max-w-md" }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <Card className={`w-full ${maxW} p-5 relative`}>
        <button onClick={onClose} className="absolute top-3 left-3 p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-200">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 text-slate-100 font-semibold mb-4">
          {Icon && <Icon className="w-4 h-4 text-teal-300" />}{title}
        </div>
        {children}
      </Card>
    </div>
  );
};

const EditorFooter = ({ onDelete, onClose }) => (
  <div className="flex items-center justify-between gap-2 pt-2">
    {onDelete ? (
      <button type="button" onClick={onDelete}
        className="text-xs px-3 py-2 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 inline-flex items-center gap-1.5">
        <Trash2 className="w-3.5 h-3.5" /> {T.delete}
      </button>
    ) : <span />}
    <div className="flex items-center gap-2">
      <button type="button" onClick={onClose} className="text-xs px-3 py-2 rounded-lg bg-slate-800/60 text-slate-300 border border-slate-700 hover:bg-slate-800">{T.cancel}</button>
      <button type="submit" className="text-xs px-3 py-2 rounded-lg bg-teal-400 text-slate-950 font-medium hover:bg-teal-300">{T.save}</button>
    </div>
  </div>
);

const SalaryCard = ({ salary, onSave }) => {
  const [editing, setEditing] = useState(false);
  const taxShelteredPct = salary.gross ? (salary.pension + salary.studyFund) / salary.gross : 0;
  return (
    <Card className="p-5">
      <SectionTitle icon={Briefcase} title={T.salaryTitle} subtitle={T.salarySub}
        right={<EditBtn onClick={() => setEditing(true)} label={T.editSalaryT} />} />
      <div className="grid grid-cols-2 gap-3">
        <Stat label={T.gross}     value={fmt(salary.gross)} />
        <Stat label={T.netInBank} value={fmt(salary.netInBank)} tone="pos" />
        <Stat label={T.pension}   value={fmt(salary.pension)} sub={T.pensionSub} />
        <Stat label={T.studyFund} value={fmt(salary.studyFund)} sub={T.studyFundSub} tone="info" />
      </div>
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{T.taxShelteredRate}</span>
          <Money className="text-teal-300 font-medium">{pct(taxShelteredPct)}</Money>
        </div>
        <div dir="ltr" className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-teal-400 to-cyan-400" style={{ width: `${Math.min(taxShelteredPct, 1) * 100}%` }} />
        </div>
      </div>
      {editing && <SalaryEditor initial={salary} onClose={() => setEditing(false)} onSave={(d) => { onSave(d); setEditing(false); }} />}
    </Card>
  );
};

const SideHustleCard = ({ gigs, onAdd, onUpdate, onDelete }) => {
  const [open, setOpen] = useState(true);
  const [editor, setEditor] = useState(null); // null | gig | {} (new)
  const total = gigs.reduce((s, g) => s + g.amount, 0);
  const onSave = (data) => { if (data.id) onUpdate(data.id, data); else onAdd(data); setEditor(null); };
  return (
    <Card className="p-5">
      <SectionTitle icon={Music2} title={T.sideTitle} subtitle={T.sideSub}
        right={
          <div className="flex items-center gap-2">
            <AddBtn onClick={() => setEditor({ label: "", amount: "", date: todayDDMM() })} label={T.addGig} />
            <button onClick={() => setOpen((o) => !o)} className="text-[11px] text-slate-400 hover:text-teal-300 inline-flex items-center gap-1">
              {open ? T.hideLedger : T.showLedger}
              <ChevronLeft className={`w-3 h-3 transition-transform ${open ? "-rotate-90" : ""}`} />
            </button>
          </div>
        } />
      <div className="rounded-xl border border-teal-500/20 bg-teal-500/[0.05] p-4 mb-3">
        <div className="text-[11px] tracking-wide text-teal-300/80">{T.monthRevenue}</div>
        <div className="mt-1 text-2xl font-semibold text-teal-200"><Money>{fmt(total)}</Money></div>
        <div className="text-[11px] text-teal-300/70 mt-1">
          {gigs.length} {T.gigs} · {T.avg} <Money>{fmt(gigs.length ? total / gigs.length : 0)}</Money>
        </div>
      </div>
      {open && (
        <ul className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-950/30 overflow-hidden">
          {gigs.length === 0 && <li className="px-3 py-6 text-center text-xs text-slate-500">{T.noGigs}</li>}
          {gigs.map((g) => (
            <li key={g.id} className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-slate-900/40 group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                  <Music2 className="w-3.5 h-3.5 text-teal-300" />
                </div>
                <div className="min-w-0">
                  <div className="text-slate-200 truncate">{labelFor(g)}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {g.date}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Money className="text-emerald-300 font-medium">+{fmt(g.amount)}</Money>
                <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition">
                  <button onClick={() => setEditor(g)} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-teal-300" title={T.edit}><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => onDelete(g.id)} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-300" title={T.delete}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editor && <GigEditor initial={editor} onClose={() => setEditor(null)} onSave={onSave}
        onDelete={editor.id ? () => { onDelete(editor.id); setEditor(null); } : null} />}
    </Card>
  );
};

const WindfallsCard = ({ items, onAdd, onUpdate, onDelete, onToggle }) => {
  const [editor, setEditor] = useState(null);
  const total = items.reduce((s, w) => s + w.amount, 0);
  const onSave = (data) => { if (data.id) onUpdate(data.id, data); else onAdd(data); setEditor(null); };
  return (
    <Card className="p-5">
      <SectionTitle icon={Gift} title={T.windfallsTitle} subtitle={T.windfallsSub}
        right={
          <div className="flex items-center gap-2">
            <AddBtn onClick={() => setEditor({ label: "", amount: "", date: todayDDMM(), allocation: "investment" })} label={T.addWindfall} />
            <Pill tone="warn"><Money>{fmt(total)}</Money></Pill>
          </div>
        } />
      <div className="space-y-2">
        {items.map((w) => (
          <div key={w.id} className="rounded-xl border border-slate-800 bg-slate-950/30 p-3 flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Gift className="w-4 h-4 text-amber-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-slate-200 truncate">{labelFor(w)}</div>
              <div className="text-[11px] text-slate-500">{w.date} · <Money>{fmt(w.amount)}</Money></div>
            </div>
            <button onClick={() => onToggle(w.id)}
              className={"text-[11px] px-2.5 py-1 rounded-full border transition " +
                (w.allocation === "investment"
                  ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20"
                  : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20")}>
              {w.allocation === "investment" ? T.toInvestment : T.toEmergency}
            </button>
            <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition">
              <button onClick={() => setEditor(w)} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-teal-300" title={T.edit}><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => onDelete(w.id)} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-300" title={T.delete}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
      {editor && <WindfallEditor initial={editor} onClose={() => setEditor(null)} onSave={onSave}
        onDelete={editor.id ? () => { onDelete(editor.id); setEditor(null); } : null} />}
    </Card>
  );
};

const BankCard = ({ bank, onSave }) => {
  const [editing, setEditing] = useState(false);
  const available = bank.checking - bank.creditCardOutstanding;
  return (
    <Card className="p-5">
      <SectionTitle icon={Landmark} title={T.bankTitle} subtitle={T.bankSub}
        right={<EditBtn onClick={() => setEditing(true)} label={T.editAccount} />} />
      <div className="grid grid-cols-2 gap-3">
        <Stat label={T.checking} value={fmtMoney(bank.checking)} tone="pos" />
        <Stat label={T.creditOutstanding} value={fmtMoney(bank.creditCardOutstanding)} tone="neg" />
      </div>
      <div className={`mt-3 rounded-xl border p-4 ${available >= 0 ? "border-emerald-500/30 bg-emerald-500/[0.05]" : "border-rose-500/30 bg-rose-500/[0.05]"}`}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] tracking-wide text-slate-400 inline-flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" /> {T.available}
          </span>
          <Money className={`text-xl font-semibold ${available >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{fmtMoney(available)}</Money>
        </div>
        <div className="text-[11px] text-slate-500 mt-1">{T.bankAvailableNote}</div>
        {available < 0 && <div className="mt-2"><Pill tone="neg">{T.overdraft} <Money>{fmtMoney(Math.abs(available))}</Money></Pill></div>}
      </div>
      {editing && <BankEditor initial={bank} onClose={() => setEditing(false)} onSave={(d) => { onSave(d); setEditing(false); }} />}
    </Card>
  );
};

// ── Editors for the cash-flow / bank blocks ─────────────────────────────────
const SalaryEditor = ({ initial, onClose, onSave }) => {
  const [f, setF] = useState({
    gross: String(initial.gross), netInBank: String(initial.netInBank),
    pension: String(initial.pension), studyFund: String(initial.studyFund),
  });
  const submit = (e) => {
    e.preventDefault();
    onSave({
      ...initial,
      gross: parseFloat(f.gross) || 0, netInBank: parseFloat(f.netInBank) || 0,
      pension: parseFloat(f.pension) || 0, studyFund: parseFloat(f.studyFund) || 0,
    });
  };
  return (
    <Modal icon={Briefcase} title={T.editSalaryT} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label={T.gross}><NumInput autoFocus value={f.gross} onChange={(e) => setF({ ...f, gross: e.target.value })} /></Field>
          <Field label={T.netInBank}><NumInput value={f.netInBank} onChange={(e) => setF({ ...f, netInBank: e.target.value })} /></Field>
          <Field label={T.pension}><NumInput value={f.pension} onChange={(e) => setF({ ...f, pension: e.target.value })} /></Field>
          <Field label={T.studyFund}><NumInput value={f.studyFund} onChange={(e) => setF({ ...f, studyFund: e.target.value })} /></Field>
        </div>
        <EditorFooter onClose={onClose} />
      </form>
    </Modal>
  );
};

const GigEditor = ({ initial, onClose, onSave, onDelete }) => {
  const [f, setF] = useState({ label: labelFor(initial), amount: initial.amount === "" ? "" : String(initial.amount ?? ""), date: initial.date || todayDDMM() });
  const [err, setErr] = useState(null);
  const submit = (e) => {
    e.preventDefault();
    const amount = parseFloat(f.amount);
    if (!f.label.trim()) return setErr(T.errLabel);
    if (!amount || amount <= 0) return setErr(T.errAmount);
    // Seeded gigs carry a bilingual { he, en } label. If we blindly wrote back
    // the plain string the user just edited, the other language's text would
    // be gone for good the moment someone saved with no changes. Only the
    // language currently open gets overwritten; the rest of the object stays.
    const label = initial.label && typeof initial.label === "object"
      ? { ...initial.label, [CURRENT_LANG]: f.label.trim() }
      : f.label.trim();
    onSave({ ...initial, label, amount, date: f.date });
  };
  return (
    <Modal icon={Music2} title={initial.id ? T.editGig : T.addGig} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label={T.fieldLabel}><TextInput autoFocus value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder={T.fieldLabelPh} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={T.colDate}><TextInput value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} placeholder="28.06" /></Field>
          <Field label={T.fieldAmount}><NumInput value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="0.00" /></Field>
        </div>
        {err && <ErrBox>{err}</ErrBox>}
        <EditorFooter onClose={onClose} onDelete={onDelete} />
      </form>
    </Modal>
  );
};

const WindfallEditor = ({ initial, onClose, onSave, onDelete }) => {
  const [f, setF] = useState({ label: labelFor(initial), amount: initial.amount === "" ? "" : String(initial.amount ?? ""), date: initial.date || todayDDMM(), allocation: initial.allocation || "investment" });
  const [err, setErr] = useState(null);
  const submit = (e) => {
    e.preventDefault();
    const amount = parseFloat(f.amount);
    if (!f.label.trim()) return setErr(T.errLabel);
    if (!amount || amount <= 0) return setErr(T.errAmount);
    // Same bilingual-label merge as GigEditor — see comment there.
    const label = initial.label && typeof initial.label === "object"
      ? { ...initial.label, [CURRENT_LANG]: f.label.trim() }
      : f.label.trim();
    onSave({ ...initial, label, amount, date: f.date, allocation: f.allocation });
  };
  return (
    <Modal icon={Gift} title={initial.id ? T.editWindfall : T.addWindfall} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label={T.fieldLabel}><TextInput autoFocus value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder={T.fieldLabelPh} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={T.colDate}><TextInput value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} placeholder="01.06" /></Field>
          <Field label={T.fieldAmount}><NumInput value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="0.00" /></Field>
        </div>
        <Field label={T.fieldAllocation}>
          <select value={f.allocation} onChange={(e) => setF({ ...f, allocation: e.target.value })} className={inputCls}>
            <option value="investment">{T.allocInvestment}</option>
            <option value="emergency">{T.allocEmergency}</option>
          </select>
        </Field>
        {err && <ErrBox>{err}</ErrBox>}
        <EditorFooter onClose={onClose} onDelete={onDelete} />
      </form>
    </Modal>
  );
};

const BankEditor = ({ initial, onClose, onSave }) => {
  const [f, setF] = useState({ checking: String(initial.checking), credit: String(initial.creditCardOutstanding) });
  const submit = (e) => {
    e.preventDefault();
    onSave({ checking: parseFloat(f.checking) || 0, creditCardOutstanding: parseFloat(f.credit) || 0 });
  };
  return (
    <Modal icon={Landmark} title={T.editAccount} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label={T.checking}><NumInput autoFocus value={f.checking} onChange={(e) => setF({ ...f, checking: e.target.value })} /></Field>
        <Field label={T.creditOutstanding}><NumInput value={f.credit} onChange={(e) => setF({ ...f, credit: e.target.value })} /></Field>
        <EditorFooter onClose={onClose} />
      </form>
    </Modal>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Month navigator — prev/next month arrows + a jump-to-current-month shortcut.
// ────────────────────────────────────────────────────────────────────────────
const MonthNav = ({ month, onChange }) => {
  const shift = (delta) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, (m - 1) + delta, 1);
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const isCurrent = month === currentMonthKey();
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => shift(-1)} title={T.prevMonth}
        className="p-1.5 rounded-lg border border-slate-800 hover:border-teal-500/40 text-slate-400 hover:text-teal-300 transition">
        <ChevronLeft className={isHe() ? "w-3.5 h-3.5" : "w-3.5 h-3.5 rotate-180"} />
      </button>
      <span className="min-w-[130px] text-center text-sm text-slate-200 font-medium px-1"><Money>{monthLabel(month)}</Money></span>
      <button type="button" onClick={() => shift(1)} title={T.nextMonth}
        className="p-1.5 rounded-lg border border-slate-800 hover:border-teal-500/40 text-slate-400 hover:text-teal-300 transition">
        <ChevronLeft className={isHe() ? "w-3.5 h-3.5 rotate-180" : "w-3.5 h-3.5"} />
      </button>
      {!isCurrent && (
        <button type="button" onClick={() => onChange(currentMonthKey())}
          className="text-[11px] text-teal-300/80 hover:text-teal-200 px-2 py-1 rounded-md border border-teal-500/30 hover:border-teal-500/50 transition">
          {T.thisMonth}
        </button>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Budget table — derived from a single month's expenses
// ────────────────────────────────────────────────────────────────────────────
const buildBudgetRows = (expenses, budgets) =>
  CATEGORIES.map((c) => ({
    ...c,
    target: budgets?.[c.id] ?? c.target,
    actual: expenses.filter((e) => e.category === c.id).reduce((s, e) => s + e.amount, 0),
  }));

// Click-to-edit budget target amount.
const EditableTarget = ({ value, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef(null);

  useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select(); } }, [editing]);

  const commit = () => {
    setEditing(false);
    const n = parseFloat(draft);
    if (!isNaN(n) && n >= 0 && n !== value) onSave(n);
    else setDraft(String(value));
  };

  if (editing) {
    return (
      <input ref={inputRef} type="number" min="0" step="1" dir="ltr" value={draft}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(String(value)); setEditing(false); }
        }}
        className="w-24 bg-slate-950/60 border border-teal-500/40 rounded-md px-2 py-1 text-end text-sm text-slate-100 focus:outline-none" />
    );
  }
  return (
    <button type="button" title={T.editTargetHint}
      onClick={(e) => { e.stopPropagation(); setDraft(String(value)); setEditing(true); }}
      className="inline-flex items-center gap-1 text-slate-400 hover:text-teal-300 transition group">
      <Money>{fmt(value)}</Money>
      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-70" />
    </button>
  );
};

const BudgetTable = ({ expenses, month, budgets, onEditTarget, className = "" }) => {
  const [expanded, setExpanded] = useState(null);
  const monthExpenses = useMemo(() => expenses.filter((e) => monthKey(e.date) === month), [expenses, month]);
  const rows = useMemo(() => buildBudgetRows(monthExpenses, budgets), [monthExpenses, budgets]);
  const totals = useMemo(() => {
    const target = rows.reduce((s, r) => s + r.target, 0);
    const actual = rows.reduce((s, r) => s + r.actual, 0);
    return { target, actual, variance: target - actual };
  }, [rows]);

  return (
    <Card className={`p-5 lg:col-span-2 ${className}`}>
      <SectionTitle icon={Target} title={`${T.budgetTitle} · ${monthLabel(month)}`} subtitle={T.budgetSub}
        right={<Pill tone={totals.variance >= 0 ? "pos" : "neg"}>
          {totals.variance >= 0 ? T.surplus : T.deficit} <Money>{fmt(Math.abs(totals.variance))}</Money>
        </Pill>} />
      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60 text-[11px] tracking-wide text-slate-400">
            <tr>
              <th className="text-start px-4 py-2.5">{T.colCategory}</th>
              <th className="text-end   px-4 py-2.5">{T.colActual}</th>
              <th className="text-end   px-4 py-2.5">{T.colTarget}</th>
              <th className="text-end   px-4 py-2.5">{T.colVariance}</th>
              <th className="text-start px-4 py-2.5 w-[28%]">{T.colUtil}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {rows.map((r) => {
              const variance = r.target - r.actual;
              const over = variance < 0;
              const util = r.target ? Math.min(r.actual / r.target, 1.5) : 0;
              const Icon = r.icon;
              const isOpen = expanded === r.id;
              const catItems = monthExpenses
                .filter((e) => e.category === r.id)
                .sort((a, b) => (a.date < b.date ? 1 : -1));
              return (
                <React.Fragment key={r.id}>
                  <tr className="hover:bg-slate-900/40 transition cursor-pointer" onClick={() => setExpanded(isOpen ? null : r.id)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${over ? "bg-rose-500/10 border-rose-500/20" : "bg-emerald-500/10 border-emerald-500/20"}`}>
                          <Icon className={`w-4 h-4 ${over ? "text-rose-300" : "text-emerald-300"}`} />
                        </div>
                        <span className="text-slate-200">{catName(r)}</span>
                        <ChevronLeft className={`w-3.5 h-3.5 text-slate-600 transition-transform ${isOpen ? "-rotate-90" : "rotate-90"}`} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-end"><Money className="text-slate-100">{fmt(r.actual)}</Money></td>
                    <td className="px-4 py-3 text-end"><EditableTarget value={r.target} onSave={(v) => onEditTarget(r.id, v)} /></td>
                    <td className={`px-4 py-3 text-end font-medium ${over ? "text-rose-300" : "text-emerald-300"}`}>
                      <Money>{over ? "−" : "+"}{fmt(Math.abs(variance))}</Money>
                    </td>
                    <td className="px-4 py-3">
                      <div dir="ltr" className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className={`h-full rounded-full ${
                          util > 1 ? "bg-gradient-to-r from-rose-400 to-amber-400" :
                          util > 0.85 ? "bg-gradient-to-r from-amber-400 to-emerald-400" :
                          "bg-gradient-to-r from-emerald-400 to-teal-400"
                        }`} style={{ width: `${Math.min(util, 1) * 100}%` }} />
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        <Money>{pct(r.target ? r.actual / r.target : 0, 0)}</Money> {T.ofBudget}
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-slate-950/40">
                      <td colSpan={5} className="px-4 pb-3 pt-0">
                        <div className="ms-11 ps-3 border-s border-slate-800 space-y-1">
                          {catItems.length === 0 ? (
                            <div className="text-[11px] text-slate-500 py-2">{T.noCategoryItems}</div>
                          ) : catItems.map((e) => (
                            <div key={e.id} className="flex items-center justify-between gap-3 text-[12px] py-1.5 border-b border-slate-900/80 last:border-0">
                              <div className="flex items-center gap-2 min-w-0 text-slate-300">
                                <span className="text-slate-500 text-[11px] whitespace-nowrap"><Money>{fmtDate(e.date)}</Money></span>
                                <span className="truncate">{e.merchant}</span>
                                {e.note && <span className="text-slate-600 truncate">· {e.note}</span>}
                              </div>
                              <Money className="text-slate-200 font-medium shrink-0">{fmt(e.amount)}</Money>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900/40 text-sm">
              <td className="px-4 py-3 text-slate-300 font-medium">{T.total}</td>
              <td className="px-4 py-3 text-end"><Money className="text-slate-100">{fmt(totals.actual)}</Money></td>
              <td className="px-4 py-3 text-end"><Money className="text-slate-400">{fmt(totals.target)}</Money></td>
              <td className={`px-4 py-3 text-end font-semibold ${totals.variance >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                <Money>{totals.variance >= 0 ? "+" : "−"}{fmt(Math.abs(totals.variance))}</Money>
              </td>
              <td className="px-4 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
};

const ExpensePie = ({ expenses, month }) => {
  const monthExpenses = useMemo(() => expenses.filter((e) => monthKey(e.date) === month), [expenses, month]);
  const data = useMemo(() =>
    CATEGORIES.map((c) => ({
      name: catName(c),
      value: monthExpenses.filter((e) => e.category === c.id).reduce((s, e) => s + e.amount, 0),
      color: c.color,
    })).filter((d) => d.value > 0)
  , [monthExpenses, CURRENT_LANG]);
  return (
    <Card className="p-5">
      <SectionTitle icon={CircleDollarSign} title={T.spendingMix} subtitle={`${T.spendingMixSub} ${monthLabel(month)}`} />
      <div className="h-[260px]">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="rgb(15 23 42)" strokeWidth={2}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "rgb(2 6 23 / 0.95)", border: "1px solid rgb(30 41 59)", borderRadius: 12, color: "rgb(226 232 240)", fontSize: 12 }}
              formatter={(v) => fmt(v)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-1.5 mt-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
            <span className="truncate">{d.name}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Engine
// ────────────────────────────────────────────────────────────────────────────
const Slider = ({ label, value, onChange, min, max, step, format }) => (
  <div>
    <div className="flex justify-between items-baseline text-xs">
      <span className="text-slate-400">{label}</span>
      <Money className="text-slate-100 font-medium">{format(value)}</Money>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} dir="ltr"
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="mt-2 w-full accent-teal-400 h-1.5" />
    <div className="flex justify-between text-[10px] text-slate-600 mt-1">
      <Money>{format(min)}</Money>
      <Money>{format(max)}</Money>
    </div>
  </div>
);

const PortfolioEngine = ({ initial, contribution, returnRate, setInitial, setContribution, setReturnRate }) => {
  const { series, freedomYear, freedomMonth, valueAtFreedom } = useMemo(() => {
    const months = 15 * 12;
    const monthlyRate = returnRate / 12;
    const rows = [];
    let value = initial;
    let fy = null, fm = null, vf = null;
    for (let m = 0; m <= months; m++) {
      const passive = (value * SWR) / 12;
      if (fy === null && passive >= PASSIVE_INCOME_TARGET) { fy = Math.floor(m / 12); fm = m % 12; vf = value; }
      if (m % 3 === 0) rows.push({ month: m, year: +(m / 12).toFixed(2), value: Math.round(value), passive: Math.round(passive), target: PASSIVE_INCOME_TARGET });
      value = value * (1 + monthlyRate) + contribution;
    }
    return { series: rows, freedomYear: fy, freedomMonth: fm, valueAtFreedom: vf };
  }, [initial, contribution, returnRate]);

  const freedomLabel = freedomYear === null
    ? T.beyond15
    : (isHe()
        ? `${freedomYear} ${T.yearsWord} ו-${freedomMonth} ${T.monthsWord}`
        : `${freedomYear}y ${freedomMonth}m`);

  return (
    <Card className="p-5 lg:p-6">
      <SectionTitle icon={LineChartIcon} title={T.engineTitle} subtitle={T.engineSub}
        right={<Pill tone={freedomYear !== null ? "pos" : "warn"}><Flame className="w-3 h-3" />{T.freedomIn} {freedomLabel}</Pill>} />
      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <div className="space-y-5 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <Slider label={T.initialPortfolio}    value={initial}      min={100_000} max={3_000_000} step={10_000} format={fmt} onChange={setInitial} />
          <Slider label={T.monthlyContribution} value={contribution} min={1_000}   max={40_000}    step={500}    format={fmt} onChange={setContribution} />
          <Slider label={T.expectedReturn}      value={returnRate}   min={0.03}    max={0.12}      step={0.005}  format={(v) => pct(v)} onChange={setReturnRate} />
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] text-slate-500">{T.yearsToFreedom}</div>
              <div className="text-lg font-semibold text-teal-300">
                <Money>{freedomYear !== null ? `${freedomYear}.${Math.round((freedomMonth / 12) * 10)}` : "—"}</Money>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">{T.portfolioAtGoal}</div>
              <div className="text-lg font-semibold text-slate-100"><Money>{valueAtFreedom ? fmt(valueAtFreedom) : "—"}</Money></div>
            </div>
          </div>
        </div>
        <div dir="ltr" className="h-[340px]">
          <ResponsiveContainer>
            <AreaChart data={series} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="port" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="pass" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(30 41 59)" />
              <XAxis dataKey="year" stroke="rgb(100 116 139)" tick={{ fill: "rgb(148 163 184)", fontSize: 11 }} tickFormatter={(v) => `${Math.round(v)}y`} />
              <YAxis yAxisId="left"  stroke="rgb(100 116 139)" tick={{ fill: "rgb(148 163 184)", fontSize: 11 }} tickFormatter={(v) => `₪${fmtCompact(v)}`} />
              <YAxis yAxisId="right" orientation="right" stroke="rgb(100 116 139)" tick={{ fill: "rgb(148 163 184)", fontSize: 11 }} tickFormatter={(v) => `₪${fmtCompact(v)}`} />
              <Tooltip contentStyle={{ background: "rgb(2 6 23 / 0.95)", border: "1px solid rgb(30 41 59)", borderRadius: 12, color: "rgb(226 232 240)", fontSize: 12 }}
                formatter={(v, name) => [fmt(v), name === "value" ? T.portfolio : T.passivePerMo]}
                labelFormatter={(l) => `${T.yearWord} ${(+l).toFixed(1)}`} />
              <Area yAxisId="left"  type="monotone" dataKey="value"   stroke="#2dd4bf" strokeWidth={2} fill="url(#port)" name={T.portfolio} />
              <Area yAxisId="right" type="monotone" dataKey="passive" stroke="#22d3ee" strokeWidth={2} fill="url(#pass)" name={T.passivePerMo} />
              <ReferenceLine yAxisId="right" y={PASSIVE_INCOME_TARGET} stroke="#f59e0b" strokeDasharray="4 4"
                label={{ value: T.goal20k, fill: "#fbbf24", fontSize: 11, position: "insideTopRight" }} />
              {freedomYear !== null && (
                <ReferenceLine yAxisId="left" x={freedomYear + freedomMonth / 12} stroke="#34d399" strokeDasharray="3 3"
                  label={{ value: T.freedomLabel, fill: "#6ee7b7", fontSize: 11, position: "top" }} />
              )}
              <Legend wrapperStyle={{ fontSize: 12, color: "rgb(148 163 184)" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Expenses View
// ────────────────────────────────────────────────────────────────────────────
// Inline-editable note/comment cell — click to edit, Enter/blur saves, Esc cancels.
const NoteCell = ({ value, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value || "");
  const ref = useRef(null);
  useEffect(() => { setV(value || ""); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  const commit = () => { setEditing(false); const t = v.trim(); if (t !== (value || "")) onSave(t); };
  if (editing) {
    return (
      <input ref={ref} value={v} onChange={(e) => setV(e.target.value)} onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setV(value || ""); setEditing(false); }
        }}
        placeholder={T.addNote}
        className="w-full bg-slate-950/70 border border-teal-500/40 rounded px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none" />
    );
  }
  return (
    <button onClick={() => setEditing(true)} className="text-start w-full group/note" title={T.edit}>
      {value
        ? <span className="text-[12px] text-slate-300 group-hover/note:text-teal-200">{value}</span>
        : <span className="text-[11px] text-slate-600 group-hover/note:text-teal-300 inline-flex items-center gap-1"><Pencil className="w-3 h-3" /> {T.addNote}</span>}
    </button>
  );
};

// Month chip showing that month's total; doubles as the month filter.
const MonthChip = ({ active, label, total, count, onClick }) => (
  <button onClick={onClick}
    className={"shrink-0 text-start px-3 py-1.5 rounded-lg border transition " +
      (active
        ? "bg-teal-400/15 border-teal-500/40 text-teal-100"
        : "bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700")}>
    <div className="text-[11px] leading-tight opacity-80 whitespace-nowrap">{label}{count != null && <span className="text-slate-500"> · {count}</span>}</div>
    <div className="text-sm font-semibold"><Money>{fmt(total)}</Money></div>
  </button>
);

const CatChip = ({ active, color, children, onClick }) => (
  <button onClick={onClick}
    className={"text-[11px] inline-flex items-center gap-1 px-2.5 py-1 rounded-full border transition " +
      (active
        ? "bg-teal-400/15 text-teal-200 border-teal-500/40"
        : "bg-slate-900/40 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200")}
    style={active && color ? { background: `${color}1f`, borderColor: `${color}55`, color } : undefined}>
    {children}
  </button>
);

// Clickable category tag — click to open an instant category picker, no need to open the full editor.
const CategoryTag = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const cat = CAT_BY_ID[value];
  const Icon = cat?.icon || Receipt;
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] border hover:brightness-125 transition cursor-pointer"
        style={{ background: `${cat?.color}1a`, borderColor: `${cat?.color}40`, color: cat?.color }}>
        <Icon className="w-3 h-3" /> {catName(cat) || value}
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 start-0 flex flex-wrap gap-1 p-2 rounded-xl border border-slate-800 bg-slate-900 shadow-xl w-56">
          {CATEGORIES.map((c) => {
            const CIcon = c.icon;
            return (
              <button key={c.id} type="button"
                onClick={() => { onChange(c.id); setOpen(false); }}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] border hover:brightness-125 transition"
                style={{ background: `${c.color}1a`, borderColor: `${c.color}40`, color: c.color }}>
                <CIcon className="w-3 h-3" /> {catName(c)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};


const ExpensesView = ({ expenses, onAdd, onUpdate, onDelete, onReset, onImport }) => {
  const [editor, setEditor] = useState(null);
  const [filterCat, setFilterCat] = useState("all");
  const [monthFilter, setMonthFilter] = useState("latest"); // "latest" | "all" | "YYYY-MM"
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "date", dir: "desc" });
  const [confirmId, setConfirmId] = useState(null);
  const [importMsg, setImportMsg] = useState(null); // { ok, text }
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef(null);

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file
    if (!file) return;
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    try {
      let data;
      if (isPdf) {
        setParsing(true);
        // Loaded on demand: pdf.js can't be evaluated during server prerender,
        // and there's no reason to ship it to users who never import a PDF.
        const { parseIsracardPdf } = await import("./pdfImport");
        data = await parseIsracardPdf(await file.arrayBuffer(), file.name);
      } else {
        data = JSON.parse(await file.text());
      }
      if (data.source !== "isracard" || !Array.isArray(data.expenses) || !data.expenses.length) {
        setImportMsg({ ok: false, text: T.importBadFile });
        return;
      }
      const summary = onImport(data); // { added, skipped, outstanding }
      setImportMsg({ ok: true, text: T.importDone(summary.added, summary.skipped, Math.round(summary.outstanding).toLocaleString("he-IL")) });
    } catch (err) {
      console.error("[wallet import]", err);
      setImportMsg({ ok: false, text: `${T.importBadFile} (${err?.message || err})` });
    } finally {
      setParsing(false);
    }
  };

  // Rows after category + search filters (but NOT month) — used for the per-month breakdown.
  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e) => {
      if (filterCat !== "all" && e.category !== filterCat) return false;
      if (q && !e.merchant.toLowerCase().includes(q) && !(e.note || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [expenses, filterCat, search]);

  // Per-month totals (newest first) for the breakdown strip + the month dropdown.
  const months = useMemo(() => {
    const map = new Map();
    for (const e of baseFiltered) {
      const k = monthKey(e.date);
      if (!k) continue;
      const cur = map.get(k) || { key: k, total: 0, count: 0 };
      cur.total += e.amount; cur.count += 1;
      map.set(k, cur);
    }
    return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [baseFiltered]);

  // Resolve "latest" to the newest available month.
  const activeMonth = monthFilter === "latest" ? (months[0]?.key || "all") : monthFilter;

  const filtered = useMemo(() => {
    let rows = activeMonth === "all" ? baseFiltered : baseFiltered.filter((e) => monthKey(e.date) === activeMonth);
    rows = [...rows].sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "amount") return (a.amount - b.amount) * dir;
      if (sort.key === "category") {
        // Sort by the label the user actually sees, not the internal English
        // id — otherwise the header's sort arrow implies an order ("א׳-ת׳")
        // that doesn't match what's on screen, and clicking it in Hebrew vs.
        // English produces the identical row order despite different text.
        const an = catName(CAT_BY_ID[a.category]) || a.category;
        const bn = catName(CAT_BY_ID[b.category]) || b.category;
        return an.localeCompare(bn, locale()) * dir;
      }
      return (a.date < b.date ? -1 : 1) * dir;
    });
    return rows;
  }, [baseFiltered, activeMonth, sort]);

  const total = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);
  const toggleSort = (key) => setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" });
  const onSave = (data) => { if (data.id) onUpdate(data.id, data); else onAdd(data); setEditor(null); };

  const exportCsv = () => {
    const header = ["date", "merchant", "category", "amount", "note"];
    const rows = filtered.map((e) => [e.date, e.merchant, catName(CAT_BY_ID[e.category]) || e.category, e.amount, e.note || ""]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `wallet-expenses-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const blank = () => ({ date: new Date().toISOString().slice(0, 10), merchant: "", amount: "", category: getLastCategory(), note: "" });

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionTitle icon={Receipt} title={T.expensesTitle} subtitle={T.expensesSub}
          right={
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept="application/pdf,.pdf,application/json,.json" onChange={handleImportFile} className="hidden" />
              <button onClick={() => fileRef.current?.click()} disabled={parsing}
                className="text-[11px] text-cyan-300/80 hover:text-cyan-200 inline-flex items-center gap-1 px-2 py-1 rounded-md border border-cyan-500/30 hover:border-cyan-500/50 disabled:opacity-60">
                {parsing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                {parsing ? T.importParsing : T.importSync}
              </button>
              <button onClick={exportCsv} className="text-[11px] text-slate-400 hover:text-teal-300 inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-800 hover:border-teal-500/40">
                <Download className="w-3 h-3" /> {T.exportCsv}
              </button>
              <button onClick={() => setEditor(blank())}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-400 text-slate-950 text-xs font-medium hover:bg-teal-300 transition">
                <Plus className="w-3.5 h-3.5" /> {T.addExpense}
              </button>
            </div>
          } />

        {importMsg && (
          <div className={`mb-4 text-xs rounded-lg px-3 py-2 border flex items-center justify-between gap-2 ${importMsg.ok ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-rose-500/10 text-rose-300 border-rose-500/20"}`}>
            <span>{importMsg.text}</span>
            <button onClick={() => setImportMsg(null)} className="opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute top-2.5 right-3 w-3.5 h-3.5 text-slate-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={T.searchPh}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pr-9 pl-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-teal-500/50 focus:outline-none" />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <CatChip active={filterCat === "all"} onClick={() => setFilterCat("all")}>{T.allCategories}</CatChip>
            {CATEGORIES.map((c) => (
              <CatChip key={c.id} active={filterCat === c.id} color={c.color} onClick={() => setFilterCat(c.id)}>
                <c.icon className="w-3 h-3" /> {catName(c)}
              </CatChip>
            ))}
          </div>
        </div>

        {/* Per-month totals — click a month to focus the table on it */}
        {months.length > 0 && (
          <div className="mb-4">
            <div className="text-[11px] text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> {T.byMonth}
            </div>
            <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
              <MonthChip active={activeMonth === "all"} label={T.allMonths}
                total={baseFiltered.reduce((s, e) => s + e.amount, 0)} count={baseFiltered.length}
                onClick={() => setMonthFilter("all")} />
              {months.map((m) => (
                <MonthChip key={m.key} active={activeMonth === m.key} label={monthLabel(m.key)}
                  total={m.total} count={m.count} onClick={() => setMonthFilter(m.key)} />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Stat label={activeMonth === "all" ? T.totalShowing : T.monthTotal} value={fmt(total)}
            sub={activeMonth === "all" ? T.allMonths : monthLabel(activeMonth)} tone="neg" />
          <Stat label={T.items} value={filtered.length.toString()} />
          <Stat label={T.colCategory} value={filterCat === "all" ? T.allCategories : (catName(CAT_BY_ID[filterCat]) || filterCat)} />
          <Stat label={T.avgPerItem} value={filtered.length ? fmt(total / filtered.length) : fmt(0)} />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/60 text-[11px] tracking-wide text-slate-400">
              <tr>
                <th className="text-start px-4 py-2.5 cursor-pointer hover:text-slate-200" onClick={() => toggleSort("date")}>
                  {T.colDate} {sort.key === "date" && (sort.dir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-start px-4 py-2.5">{T.colMerchant}</th>
                <th className="text-start px-4 py-2.5 cursor-pointer hover:text-slate-200" onClick={() => toggleSort("category")}>
                  {T.colCategory} {sort.key === "category" && (sort.dir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-end px-4 py-2.5 cursor-pointer hover:text-slate-200" onClick={() => toggleSort("amount")}>
                  {T.colAmount} {sort.key === "amount" && (sort.dir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-start px-4 py-2.5">{T.fieldNote}</th>
                <th className="text-end px-4 py-2.5 w-28">{T.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="text-slate-400 text-sm mb-3">{T.empty}</div>
                    <button onClick={() => setEditor(blank())}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-400/10 text-teal-300 border border-teal-500/30 text-xs hover:bg-teal-400/20 transition">
                      <Plus className="w-3 h-3" /> {T.emptyCta}
                    </button>
                  </td>
                </tr>
              )}
              {filtered.map((e) => {
                return (
                  <tr key={e.id} className="hover:bg-slate-900/40 transition group">
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap"><Money>{fmtDate(e.date)}</Money></td>
                    <td className="px-4 py-3">
                      <div className="text-slate-200">{e.merchant}</div>
                    </td>
                    <td className="px-4 py-3">
                      <CategoryTag value={e.category} onChange={(cat) => { onUpdate(e.id, { category: cat }); rememberCategory(cat); }} />
                    </td>
                    <td className="px-4 py-3 text-end"><Money className="text-slate-100 font-medium">{fmtMoney(e.amount)}</Money></td>
                    <td className="px-4 py-3 max-w-[220px] align-middle">
                      <NoteCell value={e.note} onSave={(note) => onUpdate(e.id, { note })} />
                    </td>
                    <td className="px-4 py-3 text-end">
                      {confirmId === e.id ? (
                        <div className="inline-flex items-center gap-1">
                          <span className="text-[11px] text-rose-300 me-1">{T.confirmDelete}</span>
                          <button onClick={() => { onDelete(e.id); setConfirmId(null); }}
                            className="text-[11px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30">{T.yes}</button>
                          <button onClick={() => setConfirmId(null)}
                            className="text-[11px] px-2 py-0.5 rounded bg-slate-700/40 text-slate-300 hover:bg-slate-700/60">{T.no}</button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 opacity-60 group-hover:opacity-100 transition">
                          <button onClick={() => setEditor({ ...e })} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-teal-300" title={T.edit}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setConfirmId(e.id)} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-300" title={T.delete}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <button onClick={() => { if (confirm(T.resetConfirm)) onReset(); }}
            className="text-[11px] text-slate-500 hover:text-amber-300 inline-flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> {T.resetSeed}
          </button>
        </div>
      </Card>

      {editor && (
        <ExpenseEditor
          initial={editor}
          onCancel={() => setEditor(null)}
          onSave={onSave}
          onDelete={editor.id ? () => { onDelete(editor.id); setEditor(null); } : null}
        />
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Expense Editor Modal
// ────────────────────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <label className="block">
    <div className="text-[11px] text-slate-400 mb-1">{label}</div>
    {children}
  </label>
);

const ExpenseEditor = ({ initial, onCancel, onSave, onDelete }) => {
  const [form, setForm] = useState({ ...initial, amount: initial.amount === "" ? "" : String(initial.amount) });
  const [err, setErr] = useState(null);
  const firstInput = useRef(null);

  useEffect(() => {
    firstInput.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const submit = (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.merchant.trim()) return setErr(T.errMerchant);
    if (!amount || amount <= 0) return setErr(T.errAmount);
    if (!form.date) return setErr(T.errDate);
    onSave({ ...form, amount, merchant: form.merchant.trim(), note: form.note?.trim() || "" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <Card className="w-full max-w-md p-5 relative">
        <button onClick={onCancel} className="absolute top-3 left-3 p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-200">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 text-slate-100 font-semibold mb-4">
          <Receipt className="w-4 h-4 text-teal-300" />
          {initial.id ? T.editorEditTitle : T.editorAddTitle}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Field label={T.fieldDate}>
            <input ref={firstInput} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-teal-500/50 focus:outline-none" />
          </Field>
          <Field label={T.fieldMerchant}>
            <input type="text" value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })}
              placeholder={T.fieldMerchantPh}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-teal-500/50 focus:outline-none" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={T.fieldCategory}>
              <select value={form.category} onChange={(e) => { setForm({ ...form, category: e.target.value }); rememberCategory(e.target.value); }}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-teal-500/50 focus:outline-none">
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{catName(c)}</option>)}
              </select>
            </Field>
            <Field label={T.fieldAmount}>
              <input type="number" step="0.01" min="0" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00" dir="ltr"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-teal-500/50 focus:outline-none text-end" />
            </Field>
          </div>
          <Field label={T.noteOptional}>
            <input type="text" value={form.note || ""} onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder={T.fieldNotePh}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-teal-500/50 focus:outline-none" />
          </Field>

          {err && <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{err}</div>}

          <div className="flex items-center justify-between gap-2 pt-2">
            {onDelete ? (
              <button type="button" onClick={onDelete}
                className="text-xs px-3 py-2 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 inline-flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> {T.delete}
              </button>
            ) : <span />}
            <div className="flex items-center gap-2">
              <button type="button" onClick={onCancel}
                className="text-xs px-3 py-2 rounded-lg bg-slate-800/60 text-slate-300 border border-slate-700 hover:bg-slate-800">{T.cancel}</button>
              <button type="submit"
                className="text-xs px-3 py-2 rounded-lg bg-teal-400 text-slate-950 font-medium hover:bg-teal-300">{T.save}</button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Cash flow summary
// ────────────────────────────────────────────────────────────────────────────
const CashFlowSummary = ({ salary, sideHustleTotal, expenses }) => {
  const totalIn = salary.netInBank + sideHustleTotal;
  const net = totalIn - expenses;
  return (
    <Card className="p-5">
      <SectionTitle icon={TrendingUp} title={T.cashflowSummary} subtitle={T.cashflowSummarySub} />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Stat label={T.salaryNet}   value={fmt(salary.netInBank)} tone="pos" />
        <Stat label={T.sideTotal}   value={fmt(sideHustleTotal)} tone="pos" />
        <Stat label={T.expenses}    value={fmt(expenses)} tone="neg" />
        <Stat label={T.netToInvest} value={fmt(net)} sub={<><Money>{pct(totalIn ? net / totalIn : 0, 0)}</Money> {T.savingsRateShort}</>} tone={net >= 0 ? "pos" : "neg"} />
      </div>
      <div dir="ltr" className="h-[180px] mt-4">
        <ResponsiveContainer>
          <LineChart data={[
            { m: T.chartMonths[0], inc: 32800, exp: 14200 },
            { m: T.chartMonths[1], inc: 35100, exp: 13800 },
            { m: T.chartMonths[2], inc: 38400, exp: 15600 },
            { m: T.chartMonths[3], inc: totalIn, exp: expenses },
          ]}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(30 41 59)" />
            <XAxis dataKey="m" stroke="rgb(100 116 139)" tick={{ fill: "rgb(148 163 184)", fontSize: 11 }} />
            <YAxis stroke="rgb(100 116 139)" tick={{ fill: "rgb(148 163 184)", fontSize: 11 }} tickFormatter={(v) => `₪${fmtCompact(v)}`} />
            <Tooltip contentStyle={{ background: "rgb(2 6 23 / 0.95)", border: "1px solid rgb(30 41 59)", borderRadius: 12, color: "rgb(226 232 240)", fontSize: 12 }} formatter={(v) => fmt(v)} />
            <Line type="monotone" dataKey="inc" stroke="#2dd4bf" strokeWidth={2} dot={{ r: 3 }} name={T.income} />
            <Line type="monotone" dataKey="exp" stroke="#fb7185" strokeWidth={2} dot={{ r: 3 }} name={T.expenses} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// App shell
// ────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────
// Language toggle — segmented switch (HE / EN)
// ────────────────────────────────────────────────────────────────────────────
const LangToggle = ({ lang, setLang }) => (
  <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-slate-800 bg-slate-900/60" title="Language / שפה">
    <Languages className="w-3.5 h-3.5 text-slate-500 mx-1.5" />
    {["he", "en"].map((code) => {
      const active = lang === code;
      return (
        <button key={code} onClick={() => setLang(code)}
          className={"px-2 py-1 rounded-md text-[11px] font-semibold tracking-wide transition " +
            (active
              ? "bg-gradient-to-b from-teal-400/25 to-cyan-500/15 text-teal-200 border border-teal-500/40"
              : "text-slate-400 hover:text-slate-100 border border-transparent")}>
          {code === "he" ? "עב" : "EN"}
        </button>
      );
    })}
  </div>
);

// TABS computed inside <Wallet/> so labels re-evaluate when language changes.
const TAB_DEFS = [
  { id: "dashboard", labelKey: "tabDashboard", icon: LayoutDashboard },
  { id: "cashflow",  labelKey: "tabCashflow",  icon: WalletIcon },
  { id: "expenses",  labelKey: "tabExpenses",  icon: Receipt },
  { id: "budget",    labelKey: "tabBudgets",   icon: Target },
  { id: "engine",    labelKey: "tabEngine",    icon: LineChartIcon },
];
const TAB_IDS = new Set(TAB_DEFS.map((t) => t.id));
const TAB_KEY = "wallet.tab.v1";
const loadTab = () => {
  try {
    const saved = localStorage.getItem(TAB_KEY);
    return TAB_IDS.has(saved) ? saved : "dashboard";
  } catch { return "dashboard"; }
};
// The current calendar month, e.g. "2026-08" — used as the default month-selector value.
const currentMonthKey = () => monthKey(new Date().toISOString());

export default function Wallet() {
  const [tab, setTabState] = useState(loadTab);
  const setTab = (next) => {
    setTabState(next);
    try { localStorage.setItem(TAB_KEY, next); } catch {}
  };
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [lang, setLangState] = useState(CURRENT_LANG);
  const { expenses, addExpense, updateExpense, deleteExpense, resetToSeed, importExpenses, _setExpenses } = useExpenses();
  const { budgets, setBudget } = useBudgets();
  const { finance, setSalary, setBank, addGig, updateGig, deleteGig,
          addWindfall, updateWindfall, deleteWindfall, toggleWindfall, _setFinance } = useFinance();

  // Optional server sync (app/api/state). Falls back to localStorage when off.
  // `hydrated` gates the save effect below so the very first render (built
  // from localStorage, before we've heard from the server at all) can't PUT
  // over real server data. loadFromServer() now retries with rising timeouts
  // before giving up (see serverSync.js) — a plain 1.5s timeout used to treat
  // "server is up but this request was slow" identically to "no server",
  // arm the save effect either way, and let the very next edit overwrite the
  // whole remote store with whatever localStorage happened to hold.
  const [serverStatus, setServerStatus] = useState("offline"); // offline | connected
  const hydrated = useRef(false);
  // The savedAt this client last confirmed matches the server. Sent back with
  // every save so a write that would clobber a change made by another tab or
  // device gets rejected (409) instead of silently overwriting it.
  const lastSavedAt = useRef(undefined);
  useEffect(() => {
    (async () => {
      const res = await loadFromServer();
      if (res?.connected) {
        if (res.state?.expenses) _setExpenses(res.state.expenses);
        if (res.state?.finance) _setFinance(res.state.finance);
        lastSavedAt.current = res.state?.savedAt;
        setServerStatus("connected");
      }
      hydrated.current = true;
    })();
  }, []);
  useEffect(() => {
    if (!hydrated.current) return;
    const t = setTimeout(async () => {
      const result = await saveToServer({ expenses, finance }, lastSavedAt.current);
      if (result.ok) {
        lastSavedAt.current = result.savedAt;
        setServerStatus("connected");
      } else if (result.conflict) {
        // Another tab/device saved first. Accept their version rather than
        // discarding it — this edit is dropped, but the next change the user
        // makes will save cleanly on top of the now-current base.
        if (result.current?.expenses) _setExpenses(result.current.expenses);
        if (result.current?.finance) _setFinance(result.current.finance);
        lastSavedAt.current = result.current?.savedAt;
        setServerStatus("connected");
      } else {
        setServerStatus("offline");
      }
    }, 600);
    return () => clearTimeout(t);
  }, [expenses, finance]);

  const setLang = (next) => {
    CURRENT_LANG = next;
    try { localStorage.setItem(LANG_KEY, next); } catch {}
    document.documentElement.lang = next;
    document.documentElement.dir  = next === "he" ? "rtl" : "ltr";
    setLangState(next);
  };
  // Apply persisted lang to <html> on first render
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir  = lang === "he" ? "rtl" : "ltr";
  }, [lang]);

  const TABS = TAB_DEFS.map((t) => ({ ...t, label: T[t.labelKey] }));

  const sideHustleTotal = finance.sideHustle.reduce((s, g) => s + g.amount, 0);

  const [initial, setInitial]           = useState(INITIAL_PORTFOLIO);
  const [contribution, setContribution] = useState(() => Math.round((finance.salary.netInBank + sideHustleTotal) * 0.35));
  const [returnRate, setReturnRate]     = useState(0.08);

  const totalIncome   = finance.salary.netInBank + sideHustleTotal;
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const netIncome     = totalIncome - totalExpenses;
  const savingsRate   = totalIncome ? netIncome / totalIncome : 0;
  const runwayMonths  = finance.bank.checking / (totalExpenses || 1);
  const monthlyPassive = (initial * SWR) / 12;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-teal-400/30 font-sans">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-1/3 w-[700px] h-[700px] rounded-full blur-3xl bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-transparent" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-3xl bg-gradient-to-tr from-emerald-500/10 to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-6">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <WalletIcon className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-50 leading-tight">{T.appName}</div>
              <div className="text-[11px] text-slate-500 tracking-[0.18em]">{T.tagline}</div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl border border-slate-800 bg-slate-900/60">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={"px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition " +
                    (active ? "bg-gradient-to-b from-teal-400/20 to-cyan-500/10 text-teal-200 border border-teal-500/30"
                            : "text-slate-400 hover:text-slate-100 border border-transparent")}>
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <span title={serverStatus === "connected" ? T.serverConnected : T.serverOffline}
              className={"hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] " +
                (serverStatus === "connected"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-slate-700 bg-slate-900/60 text-slate-500")}>
              <span className={"w-1.5 h-1.5 rounded-full " + (serverStatus === "connected" ? "bg-emerald-400" : "bg-slate-500")} />
              {serverStatus === "connected" ? T.serverConnected : T.serverOffline}
            </span>
            <LangToggle lang={lang} setLang={setLang} />
            <button onClick={() => setTab("expenses")}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-400 text-slate-950 text-sm font-medium hover:bg-teal-300 transition">
              <Plus className="w-3.5 h-3.5" /> {T.addExpense}
            </button>
          </div>
        </header>

        <nav className="md:hidden flex items-center gap-1 p-1 rounded-xl border border-slate-800 bg-slate-900/60 mb-6 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={"px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 whitespace-nowrap transition " +
                  (active ? "bg-teal-400/20 text-teal-200 border border-teal-500/30" : "text-slate-400 border border-transparent")}>
                <Icon className="w-3 h-3" />
                {t.label}
              </button>
            );
          })}
        </nav>

        {tab === "dashboard" && (
          <div className="space-y-6">
            <MonthlyBalance
              salaryNet={finance.salary.netInBank}
              sideTotal={sideHustleTotal}
              windfallsTotal={finance.windfalls.reduce((s, w) => s + w.amount, 0)}
              expenses={expenses}
              month={selectedMonth}
            />
            <FreedomHero portfolio={initial} monthlyContribution={contribution} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Kpi icon={TrendingUp} label={T.netIncomeJune} value={fmt(netIncome)}
                sub={<><Money>{fmt(totalIncome)}</Money> {T.inOf} · <Money>{fmt(totalExpenses)}</Money> {T.outOf}</>}
                tone={netIncome >= 0 ? "pos" : "neg"} trend={+12.4} />
              <Kpi icon={PiggyBank} label={T.savingsRate} value={pct(savingsRate, 0)} sub={T.savingsRateSub} tone="info" trend={+3.1} />
              <Kpi icon={Shield} label={T.emergencyBuffer} value={`${runwayMonths.toFixed(1)} ${T.months}`}
                sub={<><Money>{fmt(finance.bank.checking)}</Money> {T.liquidCash}</>} tone={runwayMonths >= 3 ? "pos" : "neg"} />
              <Kpi icon={Sparkles} label={T.passiveKpi} value={fmt(monthlyPassive)}
                sub={<><Money>{pct(monthlyPassive / PASSIVE_INCOME_TARGET)}</Money> {T.ofMonthlyGoal}</>} tone="info" trend={+1.8} />
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm text-slate-400">{T.viewingMonth}</div>
              <MonthNav month={selectedMonth} onChange={setSelectedMonth} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <BudgetTable expenses={expenses} month={selectedMonth} budgets={budgets} onEditTarget={setBudget} />
              <ExpensePie expenses={expenses} month={selectedMonth} />
            </div>
          </div>
        )}

        {tab === "cashflow" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <SalaryCard salary={finance.salary} onSave={setSalary} />
              <SideHustleCard gigs={finance.sideHustle} onAdd={addGig} onUpdate={updateGig} onDelete={deleteGig} />
              <WindfallsCard items={finance.windfalls} onAdd={addWindfall} onUpdate={updateWindfall} onDelete={deleteWindfall} onToggle={toggleWindfall} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <BankCard bank={finance.bank} onSave={setBank} />
              <div className="lg:col-span-2">
                <CashFlowSummary salary={finance.salary} sideHustleTotal={sideHustleTotal} expenses={totalExpenses} />
              </div>
            </div>
          </div>
        )}

        {tab === "expenses" && (
          <ExpensesView expenses={expenses} onAdd={addExpense} onUpdate={updateExpense} onDelete={deleteExpense} onReset={resetToSeed}
            onImport={(data) => {
              const { added, skipped } = importExpenses(data.expenses);
              if (typeof data.creditCardOutstanding === "number") setBank({ creditCardOutstanding: data.creditCardOutstanding });
              return { added, skipped, outstanding: data.creditCardOutstanding ?? 0 };
            }} />
        )}

        {tab === "budget" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm text-slate-400">{T.viewingMonth}</div>
              <MonthNav month={selectedMonth} onChange={setSelectedMonth} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <BudgetTable expenses={expenses} month={selectedMonth} budgets={budgets} onEditTarget={setBudget} />
              <ExpensePie expenses={expenses} month={selectedMonth} />
            </div>
          </div>
        )}

        {tab === "engine" && (
          <PortfolioEngine initial={initial} contribution={contribution} returnRate={returnRate}
            setInitial={setInitial} setContribution={setContribution} setReturnRate={setReturnRate} />
        )}

        <footer className="mt-10 mb-2 text-[11px] text-slate-600 text-center">{T.footer}</footer>
      </div>
    </div>
  );
}
