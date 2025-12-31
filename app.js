/* Amazark Corporation • Payout Manager (Final)
   - Loading screen -> login card
   - Hardcoded login (local-only)
   - Dashboard: create/edit payouts, cards, details actions
   - Auto calculations + fade breakdown
   - Search/filter/sort
   - Export/import/wipe
   - LocalStorage persistence
*/

const CONFIG = {
  AUTH_EMAIL: "admin@amazarkco.com",
  AUTH_PASSWORD: "amazarkstaff2026",

  STORAGE_KEY: "amazark_payouts_final_v1",
  AUTH_KEY: "amazark_auth_ok_v1",

  RATES: {
    MARKETING_PER: 2,
    REACH_PER: 25,
    AFFILIATE_PER: 135, // you never gave a rate; set it here if you want Affiliate paid
    TICKET_MAP: { 0:0, 1:10, 2:20, 3:30, 4:40, 5:50 }
  }
};

const $ = (id) => document.getElementById(id);

/* Boot */
const boot = $("boot");
const bootFill = $("bootFill");
const bootHint = $("bootHint");

/* Login */
const loginOverlay = $("loginOverlay");
const loginEmail = $("loginEmail");
const loginPass = $("loginPass");
const loginBtn = $("loginBtn");
const loginError = $("loginError");
const closeLoginError = $("closeLoginError");

/* App */
const app = $("app");
const logoutBtn = $("logoutBtn");

/* Controls */
const searchInput = $("searchInput");
const statusFilter = $("statusFilter");
const sortBy = $("sortBy");
const newBtn = $("newBtn");
const newBtn2 = $("newBtn2");

/* Stats */
const unpaidTotalEl = $("unpaidTotal");
const countAllEl = $("countAll");
const countUnpaidEl = $("countUnpaid");
const countPaidEl = $("countPaid");
const affiliateRateText = $("affiliateRateText");

/* Cards + empty */
const cardsEl = $("cards");
const emptyStateEl = $("emptyState");

/* Top actions */
const exportBtn = $("exportBtn");
const importBtn = $("importBtn");
const importFile = $("importFile");
const wipeBtn = $("wipeBtn");

/* Toast */
const toastHost = $("toastHost");

/* Form modal */
const formOverlay = $("formOverlay");
const payoutForm = $("payoutForm");
const closeFormBtn = $("closeFormBtn");
const cancelBtn = $("cancelBtn");
const submitBtn = $("submitBtn");
const formTitle = $("formTitle");

const editingIdEl = $("editingId");
const discordUsernameEl = $("discordUsername");
const robloxUsernameEl = $("robloxUsername");
const affiliateCountEl = $("affiliateCount");
const marketingCountEl = $("marketingCount");
const ticketRatingEl = $("ticketRating");
const reachCountEl = $("reachCount");
const statusEl = $("status");
const notesEl = $("notes");

const totalValueEl = $("totalValue");
const fadeBoxEl = $("fadeBox");
const breakdownTextEl = $("breakdownText");

/* Details modal */
const detailsOverlay = $("detailsOverlay");
const closeDetailsBtn = $("closeDetailsBtn");
const detailsTitle = $("detailsTitle");
const detailsSub = $("detailsSub");

const profileInitials = $("profileInitials");
const detailsRoblox = $("detailsRoblox");
const detailsDiscord = $("detailsDiscord");

const statusTag = $("statusTag");
const detailsAmount = $("detailsAmount");

const detailsCreated = $("detailsCreated");
const detailsUpdated = $("detailsUpdated");
const detailsRoblox2 = $("detailsRoblox2");
const detailsDiscord2 = $("detailsDiscord2");

const dAffiliate = $("dAffiliate");
const dMarketing = $("dMarketing");
const dReach = $("dReach");
const dTicket = $("dTicket");
const dNotes = $("dNotes");

const markPaidBtn = $("markPaidBtn");
const markCancelledBtn = $("markCancelledBtn");
const editBtn = $("editBtn");
const removeBtn = $("removeBtn");

let selectedId = null;

/* ---------- Helpers ---------- */

function toast(type, title, text) {
  const t = document.createElement("div");
  t.className = `toast ${type || ""}`.trim();
  t.innerHTML = `
    <div class="dot"></div>
    <div>
      <div class="tTitle">${escapeHtml(title)}</div>
      <div class="tText">${escapeHtml(text)}</div>
    </div>
  `;
  toastHost.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function safeInt(v) {
  const n = Number.parseInt(String(v ?? "0"), 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function clampInt(v, min, max) {
  const n = safeInt(v);
  return Math.min(Math.max(n, min), max);
}

function fmtDate(ts) {
  try {
    return new Date(ts).toLocaleString(undefined, {
      year:"numeric", month:"short", day:"2-digit",
      hour:"2-digit", minute:"2-digit"
    });
  } catch {
    return "—";
  }
}

function initialsFrom(name) {
  const raw = String(name || "").trim();
  if (!raw) return "A";
  const parts = raw.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "A";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] || "") : (raw[1] || "");
  return (first + last).toUpperCase();
}

/* ---------- Auth ---------- */

function isAuthed() {
  return localStorage.getItem(CONFIG.AUTH_KEY) === "true";
}

function setAuthed(val) {
  localStorage.setItem(CONFIG.AUTH_KEY, val ? "true" : "false");
}

function showOverlay(el) {
  el.classList.remove("hidden");
  el.classList.add("show");
  el.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function hideOverlay(el) {
  el.classList.add("hidden");
  el.classList.remove("show");
  el.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

/* ---------- Storage ---------- */

function loadAll() {
  const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(list) {
  localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(list));
}

/* ---------- Calculations ---------- */

function calcTotal({ affiliateCount, marketingCount, reachCount, ticketRating }) {
  const a = safeInt(affiliateCount);
  const m = safeInt(marketingCount);
  const r = safeInt(reachCount);
  const t = clampInt(ticketRating, 0, 5);

  const affiliate = a * CONFIG.RATES.AFFILIATE_PER;
  const marketing = m * CONFIG.RATES.MARKETING_PER;
  const reach = r * CONFIG.RATES.REACH_PER;
  const ticket = CONFIG.RATES.TICKET_MAP[t] ?? 0;

  return { total: affiliate + marketing + reach + ticket, affiliate, marketing, reach, ticket };
}

function updateTotalPreview() {
  const payload = {
    affiliateCount: affiliateCountEl.value,
    marketingCount: marketingCountEl.value,
    reachCount: reachCountEl.value,
    ticketRating: ticketRatingEl.value
  };

  const { total, affiliate, marketing, reach, ticket } = calcTotal(payload);
  totalValueEl.textContent = String(total);

  const hasAny =
    safeInt(affiliateCountEl.value) > 0 ||
    safeInt(marketingCountEl.value) > 0 ||
    safeInt(reachCountEl.value) > 0 ||
    clampInt(ticketRatingEl.value, 0, 5) > 0;

  let parts = [
    `Marketing: ${marketing} R$`,
    `Reach Outs: ${reach} R$`,
    `Ticket: ${ticket} R$`
  ];
  if (CONFIG.RATES.AFFILIATE_PER > 0) parts.push(`Affiliate: ${affiliate} R$`);

  breakdownTextEl.textContent = parts.join(" • ");
  fadeBoxEl.classList.toggle("show", hasAny);
}

function setStatusSelectStyle() {
  statusEl.classList.remove("unpaid", "paid", "cancelled");
  statusEl.classList.add(statusEl.value);
}

/* ---------- Filters / Sort ---------- */

function applyFiltersSort(list) {
  const q = String(searchInput.value || "").trim().toLowerCase();
  const f = statusFilter.value;
  const s = sortBy.value;

  let out = [...list];

  if (f !== "all") out = out.filter(x => (x.status || "unpaid") === f);

  if (q) {
    out = out.filter(x => {
      const blob = [
        x.discordUsername, x.robloxUsername, x.notes, x.status, String(x.total || 0)
      ].join(" ").toLowerCase();
      return blob.includes(q);
    });
  }

  if (s === "newest") out.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
  if (s === "oldest") out.sort((a,b) => (a.createdAt||0) - (b.createdAt||0));
  if (s === "amountHigh") out.sort((a,b) => (b.total||0) - (a.total||0));
  if (s === "amountLow") out.sort((a,b) => (a.total||0) - (b.total||0));

  return out;
}

/* ---------- UI Render ---------- */

function tagForStatus(status) {
  const s = (status || "unpaid").toLowerCase();
  if (s === "paid") return { text: "PAID", cls: "paid" };
  if (s === "cancelled") return { text: "CANCELLED", cls: "cancelled" };
  return { text: "UNPAID", cls: "unpaid" };
}

function updateStats(all) {
  const unpaid = all.filter(x => (x.status || "unpaid") === "unpaid");
  const paid = all.filter(x => x.status === "paid");
  const unpaidSum = unpaid.reduce((acc, x) => acc + (x.total || 0), 0);

  unpaidTotalEl.textContent = String(unpaidSum);
  countAllEl.textContent = String(all.length);
  countUnpaidEl.textContent = String(unpaid.length);
  countPaidEl.textContent = String(paid.length);

  emptyStateEl.classList.toggle("hidden", all.length !== 0);
}

function render() {
  const all = loadAll();
  updateStats(all);

  const list = applyFiltersSort(all);
  cardsEl.innerHTML = "";

  for (const item of list) {
    const { text, cls } = tagForStatus(item.status);
    const mono = initialsFrom(item.robloxUsername || item.discordUsername);

    const card = document.createElement("div");
    card.className = "card";
    card.dataset.id = item.id;

    card.innerHTML = `
      <div class="cardTop">
        <div class="cardMonogram">${escapeHtml(mono)}</div>
      </div>
      <div class="cardBody">
        <div class="rowBetween">
          <div class="nameLine">${escapeHtml(item.robloxUsername || "Unknown Roblox User")}</div>
          <div class="amountPill">${escapeHtml(String(item.total ?? 0))} R$</div>
        </div>

        <div class="rowBetween">
          <div class="smallMuted">${escapeHtml(item.discordUsername || "—")}</div>
          <div class="badge ${cls}">${text}</div>
        </div>

        <div class="metaMini">
          <div class="metaChip"><div class="k">Marketing</div><div class="v">${safeInt(item.marketingCount)}</div></div>
          <div class="metaChip"><div class="k">Reach Outs</div><div class="v">${safeInt(item.reachCount)}</div></div>
        </div>
      </div>
    `;

    card.addEventListener("click", () => openDetails(item.id));
    cardsEl.appendChild(card);
  }
}

/* ---------- Form ---------- */

function resetForm() {
  editingIdEl.value = "";
  discordUsernameEl.value = "";
  robloxUsernameEl.value = "";
  affiliateCountEl.value = "0";
  marketingCountEl.value = "0";
  ticketRatingEl.value = "0";
  reachCountEl.value = "0";
  notesEl.value = "";
  statusEl.value = "unpaid";
  setStatusSelectStyle();
  updateTotalPreview();
  formTitle.textContent = "New Payout";
  submitBtn.textContent = "Submit";
}

function openNewForm() {
  resetForm();
  showOverlay(formOverlay);
  setTimeout(() => discordUsernameEl.focus(), 30);
}

function openEditForm(item) {
  editingIdEl.value = item.id;
  discordUsernameEl.value = item.discordUsername || "";
  robloxUsernameEl.value = item.robloxUsername || "";
  affiliateCountEl.value = String(item.affiliateCount ?? 0);
  marketingCountEl.value = String(item.marketingCount ?? 0);
  ticketRatingEl.value = String(item.ticketRating ?? 0);
  reachCountEl.value = String(item.reachCount ?? 0);
  notesEl.value = item.notes || "";
  statusEl.value = item.status || "unpaid";
  setStatusSelectStyle();
  updateTotalPreview();
  formTitle.textContent = "Edit Payout";
  submitBtn.textContent = "Save";
  showOverlay(formOverlay);
  setTimeout(() => discordUsernameEl.focus(), 30);
}

function upsertPayout(e) {
  e.preventDefault();

  const discordUsername = String(discordUsernameEl.value || "").trim();
  const robloxUsername = String(robloxUsernameEl.value || "").trim();
  if (!discordUsername || !robloxUsername) {
    toast("danger", "Missing fields", "Username and Roblox Username are required.");
    return;
  }

  const affiliateCount = safeInt(affiliateCountEl.value);
  const marketingCount = safeInt(marketingCountEl.value);
  const ticketRating = clampInt(ticketRatingEl.value, 0, 5);
  const reachCount = safeInt(reachCountEl.value);
  const notes = String(notesEl.value || "").trim();
  const status = statusEl.value;

  const { total, affiliate, marketing, reach, ticket } = calcTotal({
    affiliateCount, marketingCount, reachCount, ticketRating
  });

  const now = Date.now();
  const all = loadAll();
  const editingId = String(editingIdEl.value || "").trim();

  if (editingId) {
    const idx = all.findIndex(x => x.id === editingId);
    if (idx !== -1) {
      const prev = all[idx];
      all[idx] = {
        ...prev,
        discordUsername,
        robloxUsername,
        affiliateCount,
        marketingCount,
        ticketRating,
        reachCount,
        notes,
        status,
        total,
        breakdown: { affiliate, marketing, reach, ticket },
        updatedAt: now
      };
      saveAll(all);
      toast("success", "Saved", "Payout updated.");
    }
  } else {
    const id = crypto.randomUUID ? crypto.randomUUID() : String(now) + Math.random().toString(16).slice(2);
    all.unshift({
      id,
      discordUsername,
      robloxUsername,
      affiliateCount,
      marketingCount,
      ticketRating,
      reachCount,
      notes,
      status,
      total,
      breakdown: { affiliate, marketing, reach, ticket },
      createdAt: now,
      updatedAt: now
    });
    saveAll(all);
    toast("success", "Created", "New payout added.");
  }

  hideOverlay(formOverlay);
  render();
}

/* ---------- Details ---------- */

function setStatusTag(status) {
  const { text, cls } = tagForStatus(status);
  statusTag.textContent = text;
  statusTag.classList.remove("unpaid", "paid", "cancelled");
  statusTag.classList.add(cls);
}

function openDetails(id) {
  const all = loadAll();
  const item = all.find(x => x.id === id);
  if (!item) return;

  selectedId = id;

  const mono = initialsFrom(item.robloxUsername || item.discordUsername);
  profileInitials.textContent = mono;

  detailsRoblox.textContent = item.robloxUsername || "—";
  detailsDiscord.textContent = item.discordUsername || "—";

  detailsRoblox2.textContent = item.robloxUsername || "—";
  detailsDiscord2.textContent = item.discordUsername || "—";

  detailsTitle.textContent = "Payout Details";
  detailsSub.textContent = (item.breakdown)
    ? `Marketing: ${item.breakdown.marketing} • Reach: ${item.breakdown.reach} • Ticket: ${item.breakdown.ticket}` +
      (CONFIG.RATES.AFFILIATE_PER > 0 ? ` • Affiliate: ${item.breakdown.affiliate}` : "")
    : "—";

  setStatusTag(item.status);
  detailsAmount.textContent = String(item.total ?? 0);

  detailsCreated.textContent = fmtDate(item.createdAt);
  detailsUpdated.textContent = fmtDate(item.updatedAt);

  dAffiliate.textContent = String(safeInt(item.affiliateCount));
  dMarketing.textContent = String(safeInt(item.marketingCount));
  dReach.textContent = String(safeInt(item.reachCount));
  dTicket.textContent = String(clampInt(item.ticketRating, 0, 5));
  dNotes.textContent = item.notes ? item.notes : "—";

  showOverlay(detailsOverlay);
}

function updateStatus(id, status) {
  const all = loadAll();
  const idx = all.findIndex(x => x.id === id);
  if (idx === -1) return;

  all[idx].status = status;
  all[idx].updatedAt = Date.now();
  saveAll(all);
  toast("success", "Updated", `Marked as ${status}.`);
  render();
  openDetails(id);
}

function removePayout(id) {
  const all = loadAll();
  const next = all.filter(x => x.id !== id);
  saveAll(next);
  toast("danger", "Removed", "Payout entry deleted.");
  hideOverlay(detailsOverlay);
  render();
}

/* ---------- Export / Import / Wipe ---------- */

function exportJson() {
  const all = loadAll();
  const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `amazark_payouts_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast("success", "Exported", "JSON backup downloaded.");
}

function importJsonFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || "[]"));
      if (!Array.isArray(parsed)) throw new Error("Invalid");
      const normalized = parsed.map(x => ({
        id: String(x.id || (crypto.randomUUID ? crypto.randomUUID() : Date.now())),
        discordUsername: String(x.discordUsername || ""),
        robloxUsername: String(x.robloxUsername || ""),
        affiliateCount: safeInt(x.affiliateCount),
        marketingCount: safeInt(x.marketingCount),
        ticketRating: clampInt(x.ticketRating, 0, 5),
        reachCount: safeInt(x.reachCount),
        notes: String(x.notes || ""),
        status: String(x.status || "unpaid"),
        total: safeInt(x.total),
        breakdown: x.breakdown || null,
        createdAt: x.createdAt || Date.now(),
        updatedAt: x.updatedAt || Date.now(),
      }));
      saveAll(normalized);
      render();
      toast("success", "Imported", "Your payouts were imported.");
    } catch {
      toast("danger", "Import failed", "That file wasn’t valid payout JSON.");
    }
  };
  reader.readAsText(file);
}

function wipeAll() {
  const ok = confirm("Wipe ALL payouts? This cannot be undone.");
  if (!ok) return;
  localStorage.removeItem(CONFIG.STORAGE_KEY);
  render();
  toast("danger", "Wiped", "All payout entries removed.");
}

/* ---------- Boot ---------- */

async function bootSequence() {
  affiliateRateText.textContent = `${CONFIG.RATES.AFFILIATE_PER} R$ each`;

  const steps = [
    ["Loading storage…", 22],
    ["Preparing UI…", 48],
    ["Starting dashboard…", 72],
    ["Done.", 100],
  ];

  for (const [msg, pct] of steps) {
    bootHint.textContent = msg;
    bootFill.style.width = `${pct}%`;
    await new Promise(r => setTimeout(r, 220));
  }

  boot.classList.remove("show");
  boot.setAttribute("aria-hidden", "true");
}

/* ---------- Login flow ---------- */

function showLogin() {
  hideOverlay(detailsOverlay);
  hideOverlay(formOverlay);
  loginError.classList.add("hidden");
  showOverlay(loginOverlay);
  setTimeout(() => loginEmail.focus(), 50);
}

function showApp() {
  hideOverlay(loginOverlay);
  app.classList.remove("hidden");
  document.body.style.overflow = "";
  render();
}

/* ---------- Bind events ---------- */

function bindEvents() {
  // Login error close
  closeLoginError.addEventListener("click", () => loginError.classList.add("hidden"));

  // Login submit
  loginBtn.addEventListener("click", () => {
    const email = String(loginEmail.value || "").trim();
    const pass = String(loginPass.value || "");
    if (email === CONFIG.AUTH_EMAIL && pass === CONFIG.AUTH_PASSWORD) {
      setAuthed(true);
      toast("success", "Welcome", "Access granted.");
      showApp();
    } else {
      loginError.classList.remove("hidden");
    }
  });

  // Enter key on password triggers login
  loginPass.addEventListener("keydown", (e) => {
    if (e.key === "Enter") loginBtn.click();
  });

  // Logout
  logoutBtn.addEventListener("click", () => {
    setAuthed(false);
    location.reload();
  });

  // Open new payout
  newBtn.addEventListener("click", openNewForm);
  newBtn2.addEventListener("click", openNewForm);

  // Close form
  closeFormBtn.addEventListener("click", () => hideOverlay(formOverlay));
  cancelBtn.addEventListener("click", () => hideOverlay(formOverlay));
  formOverlay.addEventListener("click", (e) => {
    if (e.target === formOverlay) hideOverlay(formOverlay);
  });

  // Form submit
  payoutForm.addEventListener("submit", upsertPayout);

  // Total preview + status styling
  [affiliateCountEl, marketingCountEl, ticketRatingEl, reachCountEl].forEach(el => {
    el.addEventListener("input", updateTotalPreview);
  });
  statusEl.addEventListener("change", setStatusSelectStyle);

  // Filters
  searchInput.addEventListener("input", render);
  statusFilter.addEventListener("change", render);
  sortBy.addEventListener("change", render);

  // Top actions
  exportBtn.addEventListener("click", exportJson);
  importBtn.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (f) importJsonFile(f);
    importFile.value = "";
  });
  wipeBtn.addEventListener("click", wipeAll);

  // Details close
  closeDetailsBtn.addEventListener("click", () => hideOverlay(detailsOverlay));
  detailsOverlay.addEventListener("click", (e) => {
    if (e.target === detailsOverlay) hideOverlay(detailsOverlay);
  });

  // Details actions
  markPaidBtn.addEventListener("click", () => { if (selectedId) updateStatus(selectedId, "paid"); });
  markCancelledBtn.addEventListener("click", () => { if (selectedId) updateStatus(selectedId, "cancelled"); });
  editBtn.addEventListener("click", () => {
    if (!selectedId) return;
    const all = loadAll();
    const item = all.find(x => x.id === selectedId);
    if (!item) return;
    hideOverlay(detailsOverlay);
    openEditForm(item);
  });
  removeBtn.addEventListener("click", () => {
    if (!selectedId) return;
    const ok = confirm("Remove this payout entry?");
    if (!ok) return;
    removePayout(selectedId);
  });

  // Esc closes overlays
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (formOverlay.classList.contains("show")) hideOverlay(formOverlay);
      if (detailsOverlay.classList.contains("show")) hideOverlay(detailsOverlay);
      // login overlay should NOT close with escape (security feel)
    }
  });
}

/* ---------- Init ---------- */

async function init() {
  bindEvents();
  setStatusSelectStyle();
  updateTotalPreview();

  await bootSequence();

  // After loading screen: show login card, then app
  if (!isAuthed()) {
    showLogin();
  } else {
    showApp();
  }
}

init();
