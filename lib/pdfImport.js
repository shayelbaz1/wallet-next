// In-browser Isracard PDF parser.
// Reads the "פירוט עסקאות" PDF entirely client-side (no upload, no server) and
// returns the same payload shape the importer already understands.
import * as pdfjsLib from "pdfjs-dist";

// Vite resolved the worker with a `?url` import; Next has no equivalent, so the
// worker is copied into public/ (see scripts/sync-pdf-worker.mjs) and served
// from the app's own origin.
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

// Keyword → category id. Mirrors CATEGORIZE_RULES in Wallet.jsx (kept local so
// this module is self-contained).
const RULES = [
  { cat: "groceries", re: /שופרסל|טיב טעם|רמי לוי|ויקטורי|יוחננוף|מגה|אושר עד|tiv ?taam|shufersal|סופרמרקט|מכולת|am ?:?pm/i },
  { cat: "car",       re: /דלק|פז|סונול|דור אלון|ten|yellow|פנגו|pango|cellopark|חניון|חניה|ביטוח חובה|רכב חובה|הפניקס רכב|הפול|טסט|מוסך/i },
  { cat: "health",    re: /סופר.{0,4}פארם|super.?pharm|ניו.{0,2}פארם|לאומית|כללית|מכבי|מאוחדת|בית מרקחת|pharm|רופא|מרפאה|tif/i },
  { cat: "travel",    re: /airbnb|booking|expedia|ארקיע|אל על|el ?al|ryanair|wizz|טיסה|פסטיבל|festival|hotel|מלון|hostel|נופש|חופשה/i },
  { cat: "workspace", re: /kygini|aws|amazon web|google|adobe|microsoft|github|openai|anthropic|notion|figma|jetbrains|הגברה|pioneer|ציוד|apple\.com|app ?store/i },
  { cat: "financial", re: /ישראכרט|isracard|מקס איט|max|כאל|cal|עמלה|ריבית|העברה|bit|paybox|ביטוח לאומי/i },
];
const categorize = (d = "") => RULES.find((r) => r.re.test(d))?.cat || "financial";

// Hebrew text comes out of pdf.js ordered left-to-right by x-position, which
// reverses RTL word order. Reverse word order back when a segment has Hebrew.
const HEB = /[֐-׿]/;
const fixHeb = (s) => (HEB.test(s) ? s.trim().split(/\s+/).reverse().join(" ") : s.trim());

const DATE = /(\d{2})\.(\d{2})\.(\d{2})/;
const AMT = /₪([\d,]+\.\d{2})/g;
const toNum = (s) => parseFloat(s.replace(/,/g, ""));
const slug = (s) => s.replace(/\s+/g, "-").slice(0, 24);

// Turn one PDF page's text items into clean, single-spaced lines (bidi stripped).
async function pageLines(page) {
  const tc = await page.getTextContent();
  const byRow = new Map();
  for (const it of tc.items) {
    if (!it.str.trim()) continue;
    const y = Math.round(it.transform[5]);
    if (!byRow.has(y)) byRow.set(y, []);
    byRow.get(y).push({ x: it.transform[4], s: it.str });
  }
  return [...byRow.keys()]
    .sort((a, b) => b - a) // top to bottom
    .map((y) =>
      byRow.get(y)
        .sort((a, b) => a.x - b.x)
        .map((p) => p.s)
        .join(" ")
        .replace(/[‎‏‪-‮⁦-⁩]/g, "")
        .replace(/₪\s+/g, "₪")
        .replace(/(\d)\.\s+(\d{2})\b/g, "$1.$2") // fix split decimals like "7,194. 47"
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
}

export async function parseIsracardPdf(arrayBuffer, filename = "") {
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    disableFontFace: true,
    isEvalSupported: false,
  }).promise;
  const lines = [];
  for (let p = 1; p <= doc.numPages; p++) lines.push(...(await pageLines(await doc.getPage(p))));

  const card = filename.match(/(\d{4})/)?.[1] || lines.join(" ").match(/(\d{4})\s*\|/)?.[1] || "card";

  // Headline total — the amount that will actually be debited from the bank
  // ("לחיוב ב-…", e.g. ₪7,194.47). It's the first ₪ amount at the top of the page.
  const headline = lines.join("\n").match(/₪([\d,]+\.\d{2})/);
  const billedToBank = headline ? toNum(headline[1]) : null;

  let section = null; // pending | charged | outofcycle
  let chargedTotal = 0;
  const expenses = [];

  for (const line of lines) {
    const hasTotal = /סה"?כ/.test(line);
    if (/עסקאות/.test(line) && /נקלטו/.test(line) && !hasTotal) { section = "pending"; continue; }
    if (/מחוץ/.test(line) && /למועד/.test(line)) { section = "outofcycle"; continue; }
    if (/עסקאות/.test(line) && /למועד/.test(line) && /חיוב/.test(line) && !/מחוץ/.test(line)) { section = "charged"; continue; }
    if (!section) continue;

    const dm = line.match(DATE);
    if (!dm) continue; // skips totals / footnotes / continuation lines
    const amts = [...line.matchAll(AMT)];
    if (!amts.length) continue;

    const firstAmt = amts[0];
    const lastAmt = amts[amts.length - 1];
    const head = line.slice(0, firstAmt.index);
    const voucher = head.match(/(?<![\d.])\d{6,10}(?![\d.])/)?.[0] || null;

    // Outside the pending block, a real transaction always has a voucher number.
    // This filters summary rows like "חיוב בחשבון הבנק ב 10.06.26".
    if (section !== "pending" && !voucher) continue;

    const merchant = fixHeb(line.slice(lastAmt.index + lastAmt[0].length, dm.index));
    let note = fixHeb(head.replace(/\d{6,10}/, ""))
      .replace(/תשלום\s*(\d+)\s*מתוך\s*(\d+)/, "תשלום $1/$2")
      .replace(/(\d+)\s*מתוך\s*(\d+)\s*תשלום/, "תשלום $1/$2");

    const charge = toNum(amts[0][1]); // סכום חיוב (this cycle) is the first amount
    const [, dd, mm, yy] = dm;
    const date = `20${yy}-${mm}-${dd}`;

    expenses.push({
      extId: voucher ? `isracard:${card}:${voucher}` : `isracard:${card}:${date}-${charge}-${slug(merchant)}`,
      date,
      merchant,
      amount: charge,
      category: categorize(merchant),
      note,
      status: section === "pending" ? "pending" : "completed",
    });

    if (section === "charged") chargedTotal += charge;
  }

  if (!expenses.length) throw new Error("no-transactions");

  return {
    generatedAt: new Date().toISOString(),
    source: "isracard",
    card,
    // Amount actually debited from the bank ("לחיוב ב-…"); fall back to the
    // charged-section sum if the headline couldn't be read.
    creditCardOutstanding: billedToBank ?? Math.round(chargedTotal * 100) / 100,
    cardChargeThisCycle: Math.round(chargedTotal * 100) / 100,
    expenses,
  };
}
