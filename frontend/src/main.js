const apiBase = `https://variable-bat-flowa-4508b71a.koyeb.app/api/v1`;

const pageMeta = {
  dashboard: ["لوحة التحكم", "نظرة سريعة على الأداء اليومي للمصنع"],
  accounting: ["المحاسبة", "إدارة الدليل والقيود الافتتاحية"],
  sales: ["المبيعات", "فواتير البيع والترحيل المحاسبي"],
  purchases: ["المشتريات", "فواتير الشراء والتوريد"],
  inventory: ["المخزون", "الأصناف والمخازن والحركات"],
  production: ["الإنتاج", "أوامر الإنتاج والتحويلات"],
  distribution: ["العهدة", "العربات وتحميلاتها وتسويتها"],
  crm: ["العملاء والموردون", "إدارة البيانات والحدود الائتمانية"],
  messages: ["الرسائل", "SMS و WhatsApp وسجل الإرسال"],
  reports: ["التقارير", "ملخصات مالية وتشغيلية"],
  backup: ["نسخ احتياطي", "تحميل النسخ الاحتياطية وسجل العمليات"],
  settings: ["الإعدادات", "الملف الشخصي وإدارة إعادة التعيين"],
  teams: ["فريق العمل", "إدارة المستخدمين والأدوار"],
};

function $(id) {
  return document.getElementById(id);
}

const state = {
  items: [],
  warehouses: [],
  customers: [],
  suppliers: [],
  vehicles: [],
  productionOrders: [],
  roles: [],
  users: [],
  permissions: [],
};

const fmtMoney = new Intl.NumberFormat("ar-EG", {
  style: "currency",
  currency: "EGP",
});
const fmtNum2 = new Intl.NumberFormat("ar-EG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function money(value) {
  return fmtMoney.format(Number(value || 0));
}

function num2(value) {
  return fmtNum2.format(Number(value || 0));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function autoCode(prefix) {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rnd = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${yy}${mm}${dd}-${rnd}`;
}

function ensureToastHost() {
  let host = $("toastHost");
  if (host) return host;
  host = document.createElement("div");
  host.id = "toastHost";
  host.className = "toast-host";
  document.body.appendChild(host);
  return host;
}

function toast(message, type = "info") {
  const host = ensureToastHost();
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => el.classList.remove("show"), 3200);
  setTimeout(() => el.remove(), 3600);
}

function applyModalMode(modal, mode) {
  if (!modal) return;
  const titleEl = modal.querySelector(".modal-header h2");
  const submitBtn = modal.querySelector("button[type='submit']");
  const titleNew = modal.dataset.titleNew;
  const titleEdit = modal.dataset.titleEdit;
  const submitNew = modal.dataset.submitNew;
  const submitEdit = modal.dataset.submitEdit;

  if (mode === "edit") {
    if (titleEl && titleEdit) titleEl.textContent = titleEdit;
    if (submitBtn && submitEdit) submitBtn.textContent = submitEdit;
  } else {
    if (titleEl && titleNew) titleEl.textContent = titleNew;
    if (submitBtn && submitNew) submitBtn.textContent = submitNew;
  }
}

// Modal helpers (exposed to inline HTML handlers)
function openModal(id) {
  const modal = $(id);
  if (!modal) return;

  // Always refresh select options before opening any modal.
  if (typeof hydrateSelects === "function") {
    hydrateSelects();
  }

  // Reset form if not editing
  const form = modal.querySelector("form");
  const mode = form?.dataset.mode === "edit" ? "edit" : "new";
  if (form && mode !== "edit") {
    form.reset();
    const hiddenId = form.querySelector("input[name='id']");
    if (hiddenId) hiddenId.value = "";
  }
  applyModalMode(modal, mode);

  // Set defaults (dates / codes)
  modal.querySelectorAll("input[type='date']").forEach((input) => {
    if (!input.value) input.value = todayISO();
  });

  if (id === "modalSalesInvoice") {
    const inv = modal.querySelector("input[name='invoiceNo']");
    const date = modal.querySelector("input[name='invoiceDate']");
    if (inv && !inv.value) inv.value = autoCode("S");
    if (date && !date.value) date.value = todayISO();
  }

  if (id === "modalPurchaseInvoice") {
    const inv = modal.querySelector("input[name='invoiceNo']");
    const date = modal.querySelector("input[name='invoiceDate']");
    if (inv && !inv.value) inv.value = autoCode("P");
    if (date && !date.value) date.value = todayISO();
  }

  if (id === "modalProductionOrder") {
    const inv = modal.querySelector("input[name='orderNo']");
    const date = modal.querySelector("input[name='productionDate']");
    if (inv && !inv.value) inv.value = autoCode("PR");
    if (date && !date.value) date.value = todayISO();
  }

  if (id === "modalItem") {
    const sku = modal.querySelector("input[name='sku']");
    if (sku && !sku.value) sku.value = autoCode("SKU");
  }

  if (id === "modalWarehouse") {
    const code = modal.querySelector("input[name='code']");
    if (code && !code.value) code.value = autoCode("WH");
  }

  if (id === "modalCustomer") {
    const code = modal.querySelector("input[name='code']");
    if (code && !code.value) code.value = autoCode("C");
  }

  if (id === "modalSupplier") {
    const code = modal.querySelector("input[name='code']");
    if (code && !code.value) code.value = autoCode("SUP");
  }

  if (id === "modalVehicle") {
    const code = modal.querySelector("input[name='code']");
    if (code && !code.value) code.value = autoCode("V");
  }

  if (id === "modalResetData") {
    syncResetModal();
  }

  if (id === "modalTeamRole") {
    renderPermissionsGrid();
  }

  modal.classList.add("open");
}

function closeModal(id) {
  const modal = $(id);
  if (modal) modal.classList.remove("open");
  const form = modal?.querySelector("form");
  if (form) form.dataset.mode = "new";
  applyModalMode(modal, "new");
}

window.openModal = openModal;
window.closeModal = closeModal;

// Table Search (exposed to inline handlers)
function filterTable(input, tableId) {
  const filter = input.value.toUpperCase();
  const tbody = $(tableId);
  if (!tbody) return;
  const rows = tbody.getElementsByTagName("tr");
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].getElementsByTagName("td");
    let match = false;
    for (let j = 0; j < cells.length; j++) {
      if (cells[j]) {
        const txt = cells[j].textContent || cells[j].innerText;
        if (txt.toUpperCase().indexOf(filter) > -1) {
          match = true;
          break;
        }
      }
    }
    rows[i].style.display = match ? "" : "none";
  }
}

window.filterTable = filterTable;

// Global Page Insights Renderer
function renderPageInsights(containerId, items) {
  const container = $(containerId);
  if (!container) return;
  container.innerHTML = "";
  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "insight-card";
    card.innerHTML = `
      <span class="insight-label">${item.label}</span>
      <span class="insight-value">${item.value}</span>
    `;
    container.appendChild(card);
  });
}

function renderCrmInsights() {
  const customers = state.customers || [];
  const suppliers = state.suppliers || [];
  renderPageInsights("crmInsights", [
    { label: "إجمالي العملاء", value: customers.length },
    { label: "عملاء نشطون", value: customers.filter((c) => c.is_active !== false).length },
    { label: "حدود ائتمانية", value: customers.filter((c) => Number(c.credit_limit || 0) > 0).length },
    { label: "إجمالي الموردين", value: suppliers.length },
  ]);
}

// Filter Status (exposed to inline handlers)
function filterStatus(select, tableId) {
  const filter = (select.value || "").toLowerCase();
  const tbody = $(tableId);
  if (!tbody) return;
  const rows = tbody.getElementsByTagName("tr");
  for (let i = 0; i < rows.length; i++) {
    const status = (rows[i].dataset.status || "").toLowerCase();
    if (filter === "" || status === filter) {
      rows[i].style.display = "";
    } else {
      rows[i].style.display = "none";
    }
  }
}

window.filterStatus = filterStatus;

// Status Translation Map
const statusMap = {
  posted: "مرحلة",
  draft: "مسودة",
  planned: "مخطط",
  in_progress: "قيد التنفيذ",
  done: "مكتمل",
  raw: "خام",
  finished: "تام",
  in: "وارد",
  out: "منصرف",
  transfer: "تحويل",
  load: "تحميل",
  return: "مرتجع",
  sold: "مباع",
  queued: "في الانتظار",
  sent: "تم الإرسال",
  failed: "فشل",
  sms: "SMS",
  whatsapp: "WhatsApp",
  asset: "أصل",
  liability: "التزام",
  equity: "حقوق ملكية",
  revenue: "إيراد",
  expense: "مصروف",
  low: "منخفض",
  ok: "آمن",
  vehicle: "مخزن عربة",
  main: "مخزن رئيسي",
  active: "نشط",
  inactive: "غير نشط",
  opening: "افتتاحي",
  adjustment: "تسوية",
  sales_invoice: "مبيعات",
  purchase_invoice: "مشتريات",
  production: "إنتاج",
  custody: "عهدة",
  low_stock: "مخزون منخفض",
  near_expiry: "قرب انتهاء الصلاحية",
  inactive_customer: "عميل غير نشط",
  credit_limit: "تجاوز حد الائتمان",
  seed: "تهيئة",
  running: "قيد التنفيذ",
  completed: "مكتمل",
  // Add more as needed
};

function translateStatus(status) {
  return statusMap[status] || status;
}

// Global Confirmation Modal
window.openConfirmModal = function (message, onConfirm) {
  const modal = $("modalConfirm");
  const msgEl = $("confirmMessage");
  const btn = $("confirmActionBtn");

  if (modal && msgEl && btn) {
    msgEl.textContent = message;
    // Remove old listeners to avoid duplicates
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener("click", () => {
      onConfirm();
      closeModal("modalConfirm");
    });

    openModal("modalConfirm");
  }
};

function downloadBackup() {
  openConfirmModal("بدء إنشاء نسخة احتياطية جديدة؟", async () => {
    try {
      await postJSON(`${apiBase}/backup/run`, {});
      toast("تم إنشاء نسخة احتياطية جديدة", "success");
      await loadBackupHistory();
    } catch (err) {
      toast(`تعذر إنشاء النسخة: ${err.message || err}`, "error");
    }
  });
}

window.downloadBackup = downloadBackup;

function toggleAccountsTable() {
  const section = $("accountsSection");
  if (section) {
    section.style.display = section.style.display === "none" ? "block" : "none";
  }
}

window.toggleAccountsTable = toggleAccountsTable;

// Close modal when clicking outside
window.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("open");
  }
});

// Page switching (exposed to inline handlers)
function setPage(page) {
  document.querySelectorAll(".page").forEach((section) => {
    section.classList.toggle("active", section.dataset.page === page);
  });
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.page === page);
  });
  const meta = pageMeta[page] || ["لوحة التحكم", ""];
  $("pageTitle").textContent = meta[0];
  $("pageSubtitle").textContent = meta[1];
  const pageSection = document.querySelector(`.page[data-page='${page}']`);
  activateSubtabs(pageSection);
  const content = document.querySelector(".content");
  if (content) content.scrollTop = 0;
  const menu = $("profileMenu");
  if (menu) menu.classList.remove("open");
  const notifMenu = $("notifMenu");
  if (notifMenu) notifMenu.classList.remove("open");
  closeSidebar();
}

window.setPage = setPage;

function openSidebar() {
  const sidebar = $("sidebar");
  const overlay = $("sidebarOverlay");
  if (sidebar) sidebar.classList.add("open");
  if (overlay) overlay.classList.add("open");
  document.body.classList.add("no-scroll");
}

function closeSidebar() {
  const sidebar = $("sidebar");
  const overlay = $("sidebarOverlay");
  if (sidebar) sidebar.classList.remove("open");
  if (overlay) overlay.classList.remove("open");
  document.body.classList.remove("no-scroll");
}

function initMobileNav() {
  const toggle = $("menuToggle");
  const overlay = $("sidebarOverlay");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const sidebar = $("sidebar");
      if (!sidebar) return;
      if (sidebar.classList.contains("open")) closeSidebar();
      else openSidebar();
    });
  }
  if (overlay) {
    overlay.addEventListener("click", closeSidebar);
  }
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSidebar();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) closeSidebar();
    applySidebarCollapse();
    syncStickyActions();
  });
}

function setSidebarCollapsed(collapsed) {
  const app = document.querySelector(".app");
  const sidebar = $("sidebar");
  const btn = $("collapseSidebarBtn");
  if (app) app.classList.toggle("sidebar-collapsed", collapsed);
  if (sidebar) sidebar.classList.toggle("collapsed", collapsed);
  if (btn) {
    btn.title = collapsed ? "توسيع القائمة" : "تصغير القائمة";
  }
}

function applySidebarCollapse() {
  const saved = localStorage.getItem("sidebarCollapsed") === "1";
  if (window.innerWidth <= 768) {
    setSidebarCollapsed(false);
  } else {
    setSidebarCollapsed(saved);
  }
}

function initSidebarCollapse() {
  const btn = $("collapseSidebarBtn");
  const sidebar = $("sidebar");
  if (!btn || !sidebar) return;
  applySidebarCollapse();
  btn.addEventListener("click", () => {
    const next = !sidebar.classList.contains("collapsed");
    setSidebarCollapsed(next);
    localStorage.setItem("sidebarCollapsed", next ? "1" : "0");
  });
}

function syncStickyActions() {
  const sticky = $("stickyActions");
  const userActions = $("userActions");
  const menuToggle = $("menuToggle");
  const topbarActions = document.querySelector(".topbar-actions");
  const topbarTitle = document.querySelector(".topbar-title");
  if (!sticky || !userActions || !menuToggle || !topbarActions || !topbarTitle) return;

  const titleBlock = topbarTitle.querySelector("div");
  if (window.innerWidth <= 1100) {
    if (!sticky.contains(menuToggle)) sticky.appendChild(menuToggle);
    if (!sticky.contains(userActions)) sticky.appendChild(userActions);
  } else {
    if (titleBlock && !topbarTitle.contains(menuToggle)) {
      topbarTitle.insertBefore(menuToggle, titleBlock);
    }
    if (!topbarActions.contains(userActions)) {
      topbarActions.appendChild(userActions);
    }
  }
}

function activateSubtabs(pageSection) {
  if (!pageSection) return;
  const tabs = pageSection.querySelectorAll(".subtab");
  const panels = pageSection.querySelectorAll(".subtab-panel");
  if (!tabs.length || !panels.length) return;
  let activeTab = pageSection.querySelector(".subtab.active");
  if (!activeTab) activeTab = tabs[0];
  const target = activeTab.dataset.subtab;
  tabs.forEach((tab) => tab.classList.toggle("active", tab === activeTab));
  panels.forEach((panel) =>
    panel.classList.toggle("active", panel.dataset.subtabPanel === target)
  );
}

function initSubtabs() {
  document.querySelectorAll(".subtabs").forEach((nav) => {
    nav.querySelectorAll(".subtab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const pageSection = tab.closest(".page");
        if (!pageSection) return;
        pageSection.querySelectorAll(".subtab").forEach((t) =>
          t.classList.toggle("active", t === tab)
        );
        const target = tab.dataset.subtab;
        pageSection.querySelectorAll(".subtab-panel").forEach((panel) =>
          panel.classList.toggle("active", panel.dataset.subtabPanel === target)
        );
      });
    });
  });
}

function clampDropdown(dropdown, baseTransform = "") {
  if (!dropdown) return;
  dropdown.style.transform = baseTransform || "none";
  const rect = dropdown.getBoundingClientRect();
  const pad = 12;
  let shiftX = 0;
  if (rect.right > window.innerWidth - pad) {
    shiftX = window.innerWidth - pad - rect.right;
  }
  if (rect.left < pad) {
    shiftX = pad - rect.left;
  }
  if (shiftX !== 0) {
    const extra = `translateX(${shiftX}px)`;
    dropdown.style.transform = baseTransform ? `${baseTransform} ${extra}` : extra;
  }
}

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      text ||
      `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  return data ?? {};
}

async function postJSON(url, data) {
  return fetchJSON(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

async function putJSON(url, data) {
  return fetchJSON(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

async function deleteJSON(url) {
  return fetchJSON(url, {
    method: "DELETE",
  });
}

async function postForm(url, formData) {
  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      text ||
      `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return data ?? {};
}

function setSelectOptions(selectEl, options, cfg) {
  if (!selectEl) return;
  const {
    placeholder = "اختر...",
    getValue = (o) => o.id,
    getLabel = (o) => o.name,
    allowEmpty = true,
  } = cfg || {};

  const prev = selectEl.value;
  const opts = Array.isArray(options) ? options : [];

  selectEl.innerHTML = "";
  if (allowEmpty || opts.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = placeholder;
    selectEl.appendChild(opt);
  }

  opts.forEach((o) => {
    const opt = document.createElement("option");
    opt.value = String(getValue(o));
    opt.textContent = String(getLabel(o));
    selectEl.appendChild(opt);
  });

  // Restore previous selection if still available.
  if (prev && Array.from(selectEl.options).some((o) => o.value === prev)) {
    selectEl.value = prev;
  }
}

function hydrateSelects() {
  // Sales
  setSelectOptions($("salesCustomerSelect"), state.customers, {
    placeholder: "بدون (بيع نقدي/عام)",
    getLabel: (c) => `${c.code} — ${c.name}`,
    allowEmpty: true,
  });
  setSelectOptions($("salesItemSelect"), state.items, {
    placeholder: "اختر الصنف",
    getLabel: (i) => `${i.sku} — ${i.name}`,
    allowEmpty: true,
  });
  setSelectOptions($("salesWarehouseSelect"), state.warehouses, {
    placeholder: "اختر المخزن",
    getLabel: (w) => `${w.code} — ${w.name}`,
    allowEmpty: true,
  });

  // Purchases
  setSelectOptions($("purchaseSupplierSelect"), state.suppliers, {
    placeholder: "بدون",
    getLabel: (s) => `${s.code} — ${s.name}`,
    allowEmpty: true,
  });
  setSelectOptions($("purchaseItemSelect"), state.items, {
    placeholder: "اختر الصنف",
    getLabel: (i) => `${i.sku} — ${i.name}`,
    allowEmpty: true,
  });
  setSelectOptions($("purchaseWarehouseSelect"), state.warehouses, {
    placeholder: "اختر المخزن",
    getLabel: (w) => `${w.code} — ${w.name}`,
    allowEmpty: true,
  });

  // Production
  setSelectOptions(
    $("productionMaterialSelect"),
    state.items.filter((i) => i.type === "raw"),
    {
      placeholder: "اختر مادة خام",
      getLabel: (i) => `${i.sku} — ${i.name}`,
      allowEmpty: true,
    }
  );
  setSelectOptions(
    $("productionOutputSelect"),
    state.items.filter((i) => i.type === "finished"),
    {
      placeholder: "اختر منتج تام",
      getLabel: (i) => `${i.sku} — ${i.name}`,
      allowEmpty: true,
    }
  );
  setSelectOptions(
    $("executeWarehouseSelect"),
    state.warehouses,
    {
      placeholder: "اختر المخزن",
      getLabel: (w) => `${w.code} — ${w.name}`,
      allowEmpty: true,
    }
  );

  // Distribution
  setSelectOptions($("loadVehicleSelect"), state.vehicles, {
    placeholder: "اختر العربة",
    getLabel: (v) => `${v.code} — ${v.plate_no}`,
    allowEmpty: true,
  });
  setSelectOptions($("settleVehicleSelect"), state.vehicles, {
    placeholder: "اختر العربة",
    getLabel: (v) => `${v.code} — ${v.plate_no}`,
    allowEmpty: true,
  });
  setSelectOptions($("loadItemSelect"), state.items, {
    placeholder: "اختر الصنف",
    getLabel: (i) => `${i.sku} — ${i.name}`,
    allowEmpty: true,
  });
  setSelectOptions($("settleItemSelect"), state.items, {
    placeholder: "اختر الصنف",
    getLabel: (i) => `${i.sku} — ${i.name}`,
    allowEmpty: true,
  });

  // Vehicle warehouse selects disabled (single inventory view)
  setSelectOptions($("loadSourceWhSelect"), state.warehouses, {
    placeholder: "اختر المخزن",
    getLabel: (w) => `${w.code} — ${w.name}`,
    allowEmpty: true,
  });
  setSelectOptions($("settleMainWhSelect"), state.warehouses, {
    placeholder: "اختر المخزن",
    getLabel: (w) => `${w.code} — ${w.name}`,
    allowEmpty: true,
  });

  // Teams
  setSelectOptions($("teamRoleSelect"), state.roles, {
    placeholder: "اختر الدور",
    getLabel: (r) => r.name,
    allowEmpty: true,
  });
}

const resetPhrases = {
  transactions: "إعادة تعيين الحركة",
  all: "حذف كل البيانات التشغيلية",
};

function syncResetModal() {
  const form = $("resetDataForm");
  const phraseEl = $("resetPhrase");
  const textInput = $("resetConfirmText");
  const backupChk = $("ackBackup");
  const irrChk = $("ackIrreversible");
  const confirmBtn = $("resetConfirmBtn");
  if (!form) return;
  const modeInput = form.querySelector("input[name='mode']:checked");
  const mode = modeInput ? modeInput.value : "transactions";
  const phrase = resetPhrases[mode] || resetPhrases.transactions;

  if (phraseEl) phraseEl.textContent = phrase;
  if (textInput) textInput.placeholder = `اكتب: ${phrase}`;

  const valid =
    (textInput?.value || "").trim() === phrase &&
    Boolean(backupChk?.checked) &&
    Boolean(irrChk?.checked);

  if (confirmBtn) confirmBtn.disabled = !valid;
}

const viewFieldLabels = {
  common: {
    id: "المعرّف",
    created_at: "تاريخ الإنشاء",
    updated_at: "تاريخ التحديث",
    status: "الحالة",
    notes: "ملاحظات",
    item_id: "معرّف الصنف",
    warehouse_id: "معرّف المخزن",
    customer_id: "معرّف العميل",
    supplier_id: "معرّف المورد",
    vehicle_id: "معرّف العربة",
    source_id: "معرّف المصدر",
    parent_id: "الحساب الأب",
    line_note: "ملاحظة السطر",
    provider_message_id: "معرّف الرسالة",
    is_read: "مقروء",
  },
  account: {
    code: "كود الحساب",
    name: "اسم الحساب",
    type: "النوع",
    is_active: "نشط",
  },
  journal: {
    entry_date: "تاريخ القيد",
    description: "الوصف",
    account_code: "كود الحساب",
    account_name: "اسم الحساب",
    debit: "مدين",
    credit: "دائن",
    source_type: "المصدر",
    journal_entry_id: "رقم القيد",
  },
  item: {
    sku: "SKU",
    name: "الاسم",
    type: "النوع",
    unit: "الوحدة",
    min_stock: "الحد الأدنى",
    is_active: "نشط",
  },
  inventory_summary: {
    sku: "SKU",
    name: "الصنف",
    unit: "الوحدة",
    on_hand: "المتاح",
    min_stock: "الحد الأدنى",
    status: "الحالة",
  },
  inventory_movement: {
    movement_date: "تاريخ الحركة",
    sku: "SKU",
    item_name: "الصنف",
    warehouse_name: "المخزن",
    warehouse_code: "كود المخزن",
    qty: "الكمية",
    direction: "الاتجاه",
    source_type: "المصدر",
    unit_cost: "تكلفة الوحدة",
    batch_no: "رقم التشغيلة",
    expiry_date: "تاريخ الصلاحية",
  },
  warehouse: {
    code: "الكود",
    name: "الاسم",
    is_vehicle: "مخزن عربة",
  },
  sales_invoice: {
    invoice_no: "رقم الفاتورة",
    customer_name: "العميل",
    invoice_date: "تاريخ الفاتورة",
    total_amount: "الإجمالي",
    status: "الحالة",
    notes: "ملاحظات",
    customer_id: "العميل (ID)",
    items: "تفاصيل الأصناف",
  },
  purchase_invoice: {
    invoice_no: "رقم الفاتورة",
    supplier_name: "المورد",
    invoice_date: "تاريخ الفاتورة",
    total_amount: "الإجمالي",
    status: "الحالة",
    notes: "ملاحظات",
    supplier_id: "المورد (ID)",
    items: "تفاصيل الأصناف",
  },
  production_order: {
    order_no: "رقم الأمر",
    production_date: "تاريخ الإنتاج",
    status: "الحالة",
    notes: "ملاحظات",
    qty_produced: "الكمية المنتجة",
    total_cost: "تكلفة الإنتاج",
  },
  vehicle: {
    code: "الكود",
    plate_no: "لوحة السيارة",
    driver_name: "السائق",
    is_active: "نشطة",
  },
  customer: {
    code: "الكود",
    name: "الاسم",
    phone: "الهاتف",
    address: "العنوان",
    credit_limit: "الحد الائتماني",
    is_active: "نشط",
  },
  supplier: {
    code: "الكود",
    name: "الاسم",
    phone: "الهاتف",
    address: "العنوان",
    is_active: "نشط",
  },
  message: {
    channel: "القناة",
    recipient: "المستلم",
    body: "نص الرسالة",
    status: "الحالة",
    created_at: "وقت الإرسال",
  },
  report_debt: {
    name: "العميل",
    total_sales: "إجمالي المديونية",
  },
  report_production: {
    order_no: "رقم الأمر",
    total_cost: "تكلفة الإنتاج",
  },
  report_custody: {
    code: "العربة",
    loaded: "المحمّل",
    returned: "المرتجع",
    sold: "المباع",
  },
  backup: {
    backup_date: "تاريخ النسخة",
    file_name: "اسم الملف",
    size_mb: "الحجم (MB)",
    status: "الحالة",
    notes: "ملاحظات",
    last_restored_at: "آخر استعادة",
    restore_count: "عدد مرات الاستعادة",
  },
  role: {
    name: "اسم الدور",
    description: "الوصف",
    permissions: "الصلاحيات",
  },
  user: {
    full_name: "الاسم الكامل",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    roles: "الأدوار",
    is_active: "نشط",
  },
};

const viewOrderMap = {
  account: ["code", "name", "type", "is_active"],
  journal: ["entry_date", "description", "account_code", "account_name", "debit", "credit", "source_type"],
  item: ["sku", "name", "type", "unit", "min_stock", "is_active"],
  inventory_summary: ["sku", "name", "unit", "on_hand", "min_stock", "status"],
  inventory_movement: ["movement_date", "item_name", "sku", "warehouse_name", "warehouse_code", "qty", "direction", "unit_cost", "source_type"],
  warehouse: ["code", "name", "is_vehicle"],
  sales_invoice: ["invoice_no", "customer_name", "invoice_date", "status", "total_amount", "notes", "items"],
  purchase_invoice: ["invoice_no", "supplier_name", "invoice_date", "status", "total_amount", "notes", "items"],
  production_order: ["order_no", "production_date", "qty_produced", "total_cost", "status", "notes"],
  vehicle: ["code", "plate_no", "driver_name", "is_active"],
  customer: ["code", "name", "phone", "address", "credit_limit", "is_active"],
  supplier: ["code", "name", "phone", "address", "is_active"],
  message: ["channel", "recipient", "body", "status", "created_at"],
  report_debt: ["name", "total_sales"],
  report_production: ["order_no", "total_cost"],
  report_custody: ["code", "loaded", "returned", "sold"],
  role: ["name", "description", "permissions"],
  user: ["full_name", "email", "phone", "roles", "is_active"],
  backup: ["backup_date", "file_name", "size_mb", "status", "last_restored_at", "restore_count", "notes"],
};

const hiddenViewKeys = new Set(["password_hash"]);

function formatValueForKey(key, value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "نعم" : "لا";

  if (Array.isArray(value)) {
    return value.length ? value.join("، ") : "—";
  }

  const keyLower = key.toLowerCase();
  if (
    keyLower.includes("date") ||
    keyLower.includes("created_at") ||
    keyLower.includes("movement_date") ||
    keyLower.includes("entry_date")
  ) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("ar-EG");
  }

  if (["status", "type", "direction", "channel", "source_type"].includes(keyLower)) {
    return translateStatus(String(value));
  }

  if (typeof value === "number") {
    if (
      keyLower.includes("amount") ||
      keyLower.includes("total") ||
      keyLower.includes("price") ||
      keyLower.includes("cost") ||
      keyLower.includes("credit") ||
      keyLower.includes("debit")
    ) {
      return money(value);
    }
    return num2(value);
  }

  return String(value);
}

function normalizeViewData(obj, type) {
  if (!obj || typeof obj !== "object") return [];
  const labels = { ...(viewFieldLabels.common || {}), ...(viewFieldLabels[type] || {}) };
  const order = viewOrderMap[type] || [];
  const used = new Set();
  const rows = [];

  order.forEach((key) => {
    if (hiddenViewKeys.has(key)) return;
    if (obj[key] === undefined || obj[key] === null || obj[key] === "") return;
    used.add(key);
    rows.push({
      key: labels[key] || key,
      value: formatValueForKey(key, obj[key]),
    });
  });

  Object.entries(obj).forEach(([key, value]) => {
    if (used.has(key) || hiddenViewKeys.has(key)) return;
    if (value === undefined || value === null || value === "") return;
    rows.push({
      key: labels[key] || key,
      value: formatValueForKey(key, value),
    });
  });

  return rows;
}

function openViewModal(title, data, type) {
  const body = $("viewBody");
  const header = $("viewTitle");
  if (!body || !header) return;
  header.textContent = title || "عرض البيانات";
  body.innerHTML = "";
  const rows = normalizeViewData(data, type);
  if (rows.length === 0) {
    body.innerHTML = "<tr><td>لا توجد بيانات لعرضها</td></tr>";
  } else {
    rows.forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td class="view-key">${r.key}</td><td class="view-value">${r.value}</td>`;
      body.appendChild(tr);
    });
  }
  openModal("modalView");
}

function attachViewHandlers(container, dataById) {
  if (!container) return;
  container.querySelectorAll("[data-view-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.viewId;
      const title = btn.dataset.viewTitle || "عرض البيانات";
      const type = btn.dataset.viewType || "";
      if (type === "sales_invoice" || type === "purchase_invoice") {
        const url =
          type === "sales_invoice"
            ? `${apiBase}/sales/invoices/${id}`
            : `${apiBase}/purchases/invoices/${id}`;
        fetchJSON(url)
          .then((res) => {
            const invoice = res.data?.invoice || {};
            const items = res.data?.items || [];
            const details = items.map((item) => {
              const name = item.item_name || item.sku || item.item_id || "—";
              const wh = item.warehouse_name || item.warehouse_code || item.warehouse_id || "";
              const qty = Number(item.qty || 0);
              const price = Number(item.unit_price || 0);
              const total = Number(item.line_total || 0);
              const whText = wh ? ` — ${wh}` : "";
              return `${name}${whText}: ${num2(qty)} × ${money(price)} = ${money(total)}`;
            });
            openViewModal(title, { ...invoice, items: details }, type);
          })
          .catch((err) => {
            toast(`تعذر تحميل تفاصيل الفاتورة: ${err.message || err}`, "error");
          });
        return;
      }
      const data = dataById.get(id);
      openViewModal(title, data, type);
    });
  });
}

async function openSalesEdit(id) {
  const modal = $("modalSalesInvoice");
  const form = $("salesInvoiceForm");
  if (!modal || !form) return;
  form.dataset.mode = "edit";
  form.dataset.invoiceId = id;
  try {
    const res = await fetchJSON(`${apiBase}/sales/invoices/${id}`);
    const invoice = res.data?.invoice;
    const items = res.data?.items || [];
    const item = items[0] || {};
    openModal("modalSalesInvoice");
    form.querySelector("input[name='invoiceNo']").value = invoice?.invoice_no || "";
    form.querySelector("select[name='customerId']").value = invoice?.customer_id || "";
    form.querySelector("input[name='invoiceDate']").value = invoice?.invoice_date?.slice(0, 10) || todayISO();
    form.querySelector("select[name='itemId']").value = item?.item_id || "";
    form.querySelector("select[name='warehouseId']").value = item?.warehouse_id || "";
    form.querySelector("input[name='qty']").value = item?.qty || 1;
    form.querySelector("input[name='unitPrice']").value = item?.unit_price || 0;
    form.querySelector("textarea[name='notes']").value = invoice?.notes || "";
  } catch (err) {
    toast(`تعذر تحميل الفاتورة: ${err.message || err}`, "error");
  }
}

async function openPurchaseEdit(id) {
  const modal = $("modalPurchaseInvoice");
  const form = $("purchaseInvoiceForm");
  if (!modal || !form) return;
  form.dataset.mode = "edit";
  form.dataset.invoiceId = id;
  try {
    const res = await fetchJSON(`${apiBase}/purchases/invoices/${id}`);
    const invoice = res.data?.invoice;
    const items = res.data?.items || [];
    const item = items[0] || {};
    openModal("modalPurchaseInvoice");
    form.querySelector("input[name='invoiceNo']").value = invoice?.invoice_no || "";
    form.querySelector("select[name='supplierId']").value = invoice?.supplier_id || "";
    form.querySelector("input[name='invoiceDate']").value = invoice?.invoice_date?.slice(0, 10) || todayISO();
    form.querySelector("select[name='itemId']").value = item?.item_id || "";
    form.querySelector("select[name='warehouseId']").value = item?.warehouse_id || "";
    form.querySelector("input[name='qty']").value = item?.qty || 1;
    form.querySelector("input[name='unitPrice']").value = item?.unit_price || 0;
    form.querySelector("textarea[name='notes']").value = invoice?.notes || "";
  } catch (err) {
    toast(`تعذر تحميل الفاتورة: ${err.message || err}`, "error");
  }
}

async function openProductionEdit(id) {
  const modal = $("modalProductionOrder");
  const form = $("productionOrderForm");
  if (!modal || !form) return;
  form.dataset.mode = "edit";
  form.dataset.orderId = id;
  try {
    const res = await fetchJSON(`${apiBase}/production/orders/${id}`);
    const order = res.data?.order;
    const materials = res.data?.materials || [];
    const outputs = res.data?.outputs || [];
    const material = materials[0] || {};
    const output = outputs[0] || {};
    openModal("modalProductionOrder");
    form.querySelector("input[name='orderNo']").value = order?.order_no || "";
    form.querySelector("input[name='productionDate']").value = order?.production_date?.slice(0, 10) || todayISO();
    form.querySelector("select[name='materialItemId']").value = material?.item_id || "";
    form.querySelector("input[name='materialQty']").value = material?.qty_used || 1;
    form.querySelector("input[name='materialUnitCost']").value = material?.unit_cost || 0;
    form.querySelector("select[name='outputItemId']").value = output?.item_id || "";
    form.querySelector("input[name='outputQty']").value = output?.qty_produced || 1;
  } catch (err) {
    toast(`تعذر تحميل أمر الإنتاج: ${err.message || err}`, "error");
  }
}

document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();
    if (item.classList.contains("nav-item")) {
      const page = item.dataset.page;
      if (page) {
        window.location.hash = page;
        setPage(page);
        if (page === "dashboard") loadDashboard();
        closeSidebar();
      }
    }
  });
});

async function loadAlerts() {
  const list = $("alertsList");
  const dropdownList = $("notifAlertsList");
  const dot = $("notifDot");
  if (!list) return;
  try {
    const json = await fetchJSON(`${apiBase}/alerts`);
    const items = json.data || [];
    list.innerHTML = "";
    if (dropdownList) dropdownList.innerHTML = "";
    if (dot) dot.classList.toggle("active", items.length > 0);
    if (items.length === 0) {
      list.innerHTML = '<div class="alert-empty">لا توجد تنبيهات حالياً</div>';
      if (dropdownList) dropdownList.innerHTML = '<div class="alert-empty">لا توجد تنبيهات حالياً</div>';
      return;
    }
    items.forEach((a) => {
      const card = document.createElement("div");
      card.className = `alert-card ${a.alert_type || ""}`;
      const title = translateStatus(a.alert_type || "alert");
      const time = a.created_at
        ? new Date(a.created_at).toLocaleString("ar-EG")
        : "";
      card.innerHTML = `
        <div class="alert-icon"><i class='bx bx-bell'></i></div>
        <div class="alert-content">
          <strong>${title}</strong>
          <p>${a.message}</p>
          <span class="alert-meta">${time}</span>
        </div>
      `;
      list.appendChild(card);
      if (dropdownList) dropdownList.appendChild(card.cloneNode(true));
    });
  } catch {
    list.innerHTML = '<div class="alert-empty">تعذر تحميل التنبيهات</div>';
    if (dropdownList) dropdownList.innerHTML = '<div class="alert-empty">تعذر تحميل التنبيهات</div>';
    if (dot) dot.classList.remove("active");
  }
}

async function loadLatestSales() {
  const body = $("latestSalesBody");
  if (!body) return;
  try {
    const json = await fetchJSON(`${apiBase}/sales/invoices`);
    const items = (json.data || []).slice(0, 5);
    body.innerHTML = "";
    if (items.length === 0) {
      body.innerHTML = "<tr><td colspan='5'>لا توجد فواتير</td></tr>";
      return;
    }
    const viewMap = new Map(items.map((i) => [String(i.id), i]));
    items.forEach((inv) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${inv.invoice_no}</td>
        <td>${inv.customer_name || "—"}</td>
        <td>${money(inv.total_amount)}</td>
        <td><span class="badge ${inv.status === "posted" ? "success" : "warn"}">${translateStatus(inv.status)}</span></td>
        <td><button class="icon-btn" title="عرض" data-view-id="${inv.id}" data-view-type="sales_invoice" data-view-title="بيانات الفاتورة"><i class='bx bx-show'></i></button></td>
      `;
      body.appendChild(row);
    });

    attachViewHandlers(body, viewMap);
  } catch {
    body.innerHTML = "<tr><td colspan='5'>تعذر التحميل</td></tr>";
  }
}

async function loadKpis() {
  try {
    const profit = await fetchJSON(`${apiBase}/reports/profit`);
    const inventory = await fetchJSON(`${apiBase}/reports/inventory`);
    const debt = await fetchJSON(`${apiBase}/reports/customer-debt`);
    const lastBackup = await fetchJSON(`${apiBase}/backup/last`);

    $("kpiSales").textContent = money(profit.data.sales || 0);
    $("kpiCogs").textContent = money(profit.data.cogs || 0);
    $("kpiStock").textContent = (inventory.data || []).length;
    const totalDebt = (debt.data || []).reduce(
      (sum, r) => sum + Number(r.total_sales || 0),
      0
    );
    $("kpiDebt").textContent = money(totalDebt);


  } catch {
    $("kpiSales").textContent = "—";
    $("kpiCogs").textContent = "—";
    $("kpiStock").textContent = "—";
    $("kpiDebt").textContent = "—";
    $("kpiBackupStatus").textContent = "—";
  }
}

async function loadAccounts() {
  const body = $("accountsBody");
  if (!body) return;
  try {
    const json = await fetchJSON(`${apiBase}/accounting/accounts`);
    body.innerHTML = "";
    const data = json.data || [];
    if (data.length === 0) {
      body.innerHTML = "<tr><td colspan='4'>لا توجد حسابات</td></tr>";
      return;
    }
    const viewMap = new Map(data.map((a) => [String(a.id), a]));
    data.forEach((a) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${a.code}</td>
        <td>${a.name}</td>
        <td>${translateStatus(a.type)}</td>
        <td><button class="icon-btn" title="عرض" data-view-id="${a.id}" data-view-type="account" data-view-title="بيانات الحساب"><i class='bx bx-show'></i></button></td>
      `;
      body.appendChild(row);
    });

    attachViewHandlers(body, viewMap);
  } catch {
    body.innerHTML = "<tr><td colspan='4'>تعذر التحميل</td></tr>";
  }
}

async function loadJournal() {
  const body = $("journalBody");
  if (!body) return;
  try {
    const json = await fetchJSON(`${apiBase}/accounting/journal-entries`);
    body.innerHTML = "";
    let totalDebit = 0;
    let totalCredit = 0;
    const data = json.data || [];
    if (data.length === 0) {
      body.innerHTML = "<tr><td colspan='6'>لا توجد قيود</td></tr>";
      return;
    }
    const viewMap = new Map(data.map((j) => [String(j.journal_line_id || j.journal_entry_id), j]));
    data.forEach((j) => {
      const d = Number(j.debit || 0);
      const c = Number(j.credit || 0);
      totalDebit += d;
      totalCredit += c;

      const accountLabel =
        j.account_code && j.account_name
          ? `${j.account_code} — ${j.account_name}`
          : j.account_code || j.account_name || "—";

      const row = document.createElement("tr");
      row.dataset.status = j.source_type || "";
      row.innerHTML = `
        <td>
          <div class="data-cell">
            <span class="data-main">${new Date(j.entry_date).toLocaleDateString("ar-EG")}</span>
            <span class="data-info">#${j.journal_entry_id || "—"}</span>
          </div>
        </td>
        <td>${j.description || "—"}</td>
        <td>${accountLabel}</td>
        <td>${num2(d)}</td>
        <td>${num2(c)}</td>
        <td><button class="icon-btn" title="عرض" data-view-id="${j.journal_line_id || j.journal_entry_id}" data-view-type="journal" data-view-title="بيانات القيد"><i class='bx bx-show'></i></button></td>
      `;
      body.appendChild(row);
    });

    const td = $("accTotalDebit");
    const tc = $("accTotalCredit");
    if (td) td.textContent = num2(totalDebit);
    if (tc) tc.textContent = num2(totalCredit);

    attachViewHandlers(body, viewMap);

  } catch {
    body.innerHTML = "<tr><td colspan='6'>تعذر التحميل</td></tr>";
  }
}

async function loadWarehouses() {
  const body = $("warehousesBody");
  try {
    const json = await fetchJSON(`${apiBase}/inventory/warehouses`);
    const warehouses = json.data || [];
    state.warehouses = warehouses;
    if (!body) {
      hydrateSelects();
      return;
    }
    body.innerHTML = "";
    if (warehouses.length === 0) {
      body.innerHTML = "<tr><td colspan='4'>لا توجد مخازن</td></tr>";
      hydrateSelects();
      return;
    }
    const viewMap = new Map(warehouses.map((w) => [String(w.id), w]));
    warehouses.forEach((w) => {
      const row = document.createElement("tr");
      row.dataset.status = "main";
      row.innerHTML = `
        <td>${w.code}</td>
        <td>${w.name}</td>
        <td><span class="badge ok">مخزن</span></td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" title="عرض" data-view-id="${w.id}" data-view-type="warehouse" data-view-title="بيانات المخزن"><i class='bx bx-show'></i></button>
            <button class="icon-btn" title="تعديل" data-edit-warehouse="${w.id}"><i class='bx bx-edit'></i></button>
            <button class="icon-btn" title="حذف" data-delete-warehouse="${w.id}"><i class='bx bx-trash'></i></button>
          </div>
        </td>
      `;
      body.appendChild(row);
    });

    attachViewHandlers(body, viewMap);

    body.querySelectorAll("[data-edit-warehouse]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.editWarehouse;
        const w = warehouses.find((x) => String(x.id) === String(id));
        if (!w) return;
        const form = $("warehouseForm");
        if (!form) return;
        form.dataset.mode = "edit";
        form.querySelector("input[name='id']").value = w.id;
        form.querySelector("input[name='code']").value = w.code;
        form.querySelector("input[name='name']").value = w.name;
        form.querySelector("select[name='isVehicle']").value = w.is_vehicle ? "true" : "false";
        openModal("modalWarehouse");
      });
    });

    body.querySelectorAll("[data-delete-warehouse]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.deleteWarehouse;
        openConfirmModal("حذف هذا المخزن؟", async () => {
          try {
            await fetchJSON(`${apiBase}/inventory/warehouses/${id}`, { method: "DELETE" });
            toast("تم حذف المخزن", "success");
            await loadWarehouses();
          } catch (err) {
            toast(`تعذر حذف المخزن: ${err.message || err}`, "error");
          }
        });
      });
    });

    hydrateSelects();
  } catch {
    // Warehouses are mainly used for dropdowns; no UI table here.
    state.warehouses = [];
    if (body) {
      body.innerHTML = "<tr><td colspan='4'>تعذر التحميل</td></tr>";
    }
  }
}

async function loadItems() {
  const body = $("itemsBody");
  if (!body) return;
  try {
    const json = await fetchJSON(`${apiBase}/inventory/items`);
    const items = json.data || [];
    state.items = items;
    body.innerHTML = "";
    if (items.length === 0) {
      body.innerHTML = "<tr><td colspan='6'>لا توجد أصناف</td></tr>";
      hydrateSelects();
      return;
    }
    const viewMap = new Map(items.map((i) => [String(i.id), i]));
    items.forEach((i) => {
      const row = document.createElement("tr");
      row.dataset.status = i.type || "";
      row.innerHTML = `
        <td>${i.sku}</td>
        <td>${i.name}</td>
        <td>${translateStatus(i.type)}</td>
        <td>${i.unit}</td>
        <td>${num2(i.min_stock || 0)}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" title="عرض" data-view-id="${i.id}" data-view-type="item" data-view-title="بيانات الصنف"><i class='bx bx-show'></i></button>
            <button class="icon-btn" title="تعديل" data-edit-item="${i.id}"><i class='bx bx-edit'></i></button>
            <button class="icon-btn" title="حذف" data-delete-item="${i.id}"><i class='bx bx-trash'></i></button>
          </div>
        </td>
      `;
      body.appendChild(row);
    });

    hydrateSelects();
    attachViewHandlers(body, viewMap);

    body.querySelectorAll("[data-edit-item]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.editItem;
        const item = items.find((x) => String(x.id) === String(id));
        if (!item) return;
        const form = $("itemForm");
        if (!form) return;
        form.dataset.mode = "edit";
        form.querySelector("input[name='id']").value = item.id;
        form.querySelector("input[name='sku']").value = item.sku;
        form.querySelector("input[name='name']").value = item.name;
        form.querySelector("select[name='type']").value = item.type;
        form.querySelector("input[name='unit']").value = item.unit;
        form.querySelector("input[name='minStock']").value = item.min_stock || 0;
        openModal("modalItem");
      });
    });

    body.querySelectorAll("[data-delete-item]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.deleteItem;
        openConfirmModal("حذف هذا الصنف؟", async () => {
          try {
            await fetchJSON(`${apiBase}/inventory/items/${id}`, { method: "DELETE" });
            toast("تم حذف الصنف", "success");
            await Promise.all([loadItems(), loadInventoryReport()]);
          } catch (err) {
            toast(`تعذر حذف الصنف: ${err.message || err}`, "error");
          }
        });
      });
    });
  } catch {
    body.innerHTML = "<tr><td colspan='6'>تعذر التحميل</td></tr>";
  }
}

async function loadInventoryReport() {
  const body = $("inventoryBody");
  if (!body) return;
  try {
    const json = await fetchJSON(`${apiBase}/reports/inventory`);
    const data = json.data || [];
    body.innerHTML = "";
    if (data.length === 0) {
      body.innerHTML = "<tr><td colspan='6'>لا توجد حركة مخزون بعد</td></tr>";
      renderPageInsights("inventoryInsights", [
        { label: "إجمالي الأصناف", value: state.items.length },
        { label: "خام", value: state.items.filter((i) => i.type === "raw").length },
        { label: "تام", value: state.items.filter((i) => i.type === "finished").length },
        { label: "منخفض", value: 0 },
      ]);
      return;
    }
    const viewMap = new Map();
    data.forEach((i) => {
      const onHand = Number(i.on_hand || 0);
      const minStock = Number(i.min_stock || 0);
      const isLow = minStock > 0 && onHand < minStock;
      const viewData = { ...i, status: isLow ? "low" : "ok" };
      viewMap.set(String(i.id), viewData);
      const row = document.createElement("tr");
      row.dataset.status = isLow ? "low" : "ok";
      row.innerHTML = `
        <td>${i.name}</td>
        <td>${i.unit}</td>
        <td>${num2(onHand)}</td>
        <td>${num2(minStock)}</td>
        <td><span class="badge ${isLow ? "danger" : "ok"}">${isLow ? "منخفض" : "آمن"}</span></td>
        <td><button class="icon-btn" title="عرض" data-view-id="${i.id}" data-view-type="inventory_summary" data-view-title="بيانات المخزون"><i class='bx bx-show'></i></button></td>
      `;
      body.appendChild(row);
    });

    const rawCount = state.items.filter((i) => i.type === "raw").length;
    const finishedCount = state.items.filter((i) => i.type === "finished").length;
    const lowCount = data.filter((i) => {
      const onHand = Number(i.on_hand || 0);
      const minStock = Number(i.min_stock || 0);
      return minStock > 0 && onHand < minStock;
    }).length;

    renderPageInsights("inventoryInsights", [
      { label: "إجمالي الأصناف", value: state.items.length },
      { label: "خام", value: rawCount },
      { label: "تام", value: finishedCount },
      { label: "منخفض", value: lowCount },
    ]);

    attachViewHandlers(body, viewMap);
  } catch {
    body.innerHTML = "<tr><td colspan='6'>تعذر التحميل</td></tr>";
  }
}

async function loadInventoryMovements() {
  const body = $("movementsBody");
  if (!body) return;
  try {
    const json = await fetchJSON(`${apiBase}/inventory/movements`);
    const data = json.data || [];
    body.innerHTML = "";
    if (data.length === 0) {
      body.innerHTML = "<tr><td colspan='7'>لا توجد حركات</td></tr>";
      return;
    }
    const viewMap = new Map(data.map((m) => [String(m.id), m]));
    data.forEach((m) => {
      const direction = m.direction || "";
      const badgeClass =
        direction === "in" ? "success" : direction === "out" ? "danger" : "neutral";
      const row = document.createElement("tr");
      row.dataset.status = direction;
      row.innerHTML = `
        <td>${new Date(m.movement_date).toLocaleString("ar-EG")}</td>
        <td>${m.item_name ? `${m.item_name} (${m.sku || ""})` : m.item_id}</td>
        <td>${m.warehouse_name ? `${m.warehouse_name} (${m.warehouse_code || ""})` : m.warehouse_id}</td>
        <td>${num2(m.qty || 0)}</td>
        <td><span class="badge ${badgeClass}">${translateStatus(direction)}</span></td>
        <td>${money(m.unit_cost || 0)}</td>
        <td><button class="icon-btn" title="عرض" data-view-id="${m.id}" data-view-type="inventory_movement" data-view-title="بيانات حركة المخزون"><i class='bx bx-show'></i></button></td>
      `;
      body.appendChild(row);
    });
    attachViewHandlers(body, viewMap);
  } catch {
    body.innerHTML = "<tr><td colspan='7'>تعذر التحميل</td></tr>";
  }
}

async function loadSalesInvoices() {
  const body = $("salesInvoicesBody");
  if (!body) return;
  try {
    const json = await fetchJSON(`${apiBase}/sales/invoices`);
    const items = json.data || [];
    body.innerHTML = "";
    if (items.length === 0) {
      body.innerHTML = "<tr><td colspan='5'>لا توجد فواتير مبيعات</td></tr>";
      renderPageInsights("salesInsights", [
        { label: "إجمالي قيمة الفواتير", value: money(0) },
        { label: "عدد الفواتير", value: 0 },
        { label: "مرحلة", value: 0 },
        { label: "غير مرحلة", value: 0 },
      ]);
      return;
    }
    const viewMap = new Map(items.map((i) => [String(i.id), i]));
    items.forEach((inv) => {
      const row = document.createElement("tr");
      row.dataset.status = inv.status || "";
      const isPosted = inv.status === "posted";
      const isDraft = inv.status === "draft";
      row.innerHTML = `
        <td>
          <div class="data-cell">
            <span class="data-main">#${inv.invoice_no}</span>
            <span class="data-info"><i class='bx bx-calendar'></i> ${new Date(inv.invoice_date).toLocaleDateString("ar-EG")}</span>
          </div>
        </td>
        <td>${inv.customer_name || "—"}</td>
        <td>${money(inv.total_amount)}</td>
        <td><span class="badge ${isPosted ? "success" : "warn"}">${translateStatus(inv.status)}</span></td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" title="عرض" data-view-id="${inv.id}" data-view-type="sales_invoice" data-view-title="بيانات الفاتورة"><i class='bx bx-show'></i></button>
            <button class="icon-btn" title="تعديل" data-edit-sales="${inv.id}" ${isDraft ? "" : "disabled"}><i class='bx bx-edit-alt'></i></button>
            <button class="icon-btn" title="حذف" data-delete-sales="${inv.id}" ${isDraft ? "" : "disabled"}><i class='bx bx-trash'></i></button>
            <button class="icon-btn" title="ترحيل" data-post-sales="${inv.id}" data-entry-date="${inv.invoice_date}" ${isPosted ? "disabled" : ""}>
              <i class='bx ${isPosted ? "bx-check-circle" : "bx-check-double"}'></i>
            </button>
          </div>
        </td>
      `;
      body.appendChild(row);
    });

    // Insights
    const totalSales = items.reduce((sum, i) => sum + Number(i.total_amount), 0);
    const postedCount = items.filter((i) => i.status === "posted").length;
    renderPageInsights("salesInsights", [
      { label: "إجمالي قيمة الفواتير", value: money(totalSales) },
      { label: "عدد الفواتير", value: items.length },
      { label: "مرحلة", value: postedCount },
      { label: "غير مرحلة", value: items.length - postedCount },
    ]);

    body.querySelectorAll("[data-post-sales]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.postSales;
        if (btn.disabled) return;
        const form = $("postSalesForm");
        if (form) {
          form.querySelector("input[name='invoiceId']").value = id;
          const dateInput = form.querySelector("input[name='entryDate']");
          if (dateInput) dateInput.value = btn.dataset.entryDate || todayISO();
          const label = $("postSalesInvoiceNo");
          if (label) {
            const code = btn.closest("tr")?.querySelector(".data-main")?.textContent || "";
            label.textContent = code ? `#${code.replace("#", "").trim()}` : "";
          }
          window.openModal("modalPostSales");
        }
      });
    });

    body.querySelectorAll("[data-edit-sales]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (btn.disabled) return;
        const id = btn.dataset.editSales;
        if (!id) return;
        await openSalesEdit(id);
      });
    });

    body.querySelectorAll("[data-delete-sales]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (btn.disabled) return;
        const id = btn.dataset.deleteSales;
        if (!id) return;
        openConfirmModal("حذف فاتورة المبيعات؟ سيتم حذف المسودة نهائيًا.", async () => {
          try {
            await deleteJSON(`${apiBase}/sales/invoices/${id}`);
            toast("تم حذف الفاتورة", "success");
            await Promise.all([loadSalesInvoices(), loadLatestSales(), loadKpis(), loadReports()]);
          } catch (err) {
            toast(`تعذر الحذف: ${err.message || err}`, "error");
          }
        });
      });
    });

    attachViewHandlers(body, viewMap);
  } catch {
    body.innerHTML = "<tr><td colspan='5'>تعذر التحميل</td></tr>";
  }
}

async function loadPurchaseInvoices() {
  const body = $("purchaseInvoicesBody");
  if (!body) return;
  try {
    const json = await fetchJSON(`${apiBase}/purchases/invoices`);
    const items = json.data || [];
    body.innerHTML = "";
    if (items.length === 0) {
      body.innerHTML = "<tr><td colspan='5'>لا توجد فواتير مشتريات</td></tr>";
      renderPageInsights("purchasesInsights", [
        { label: "إجمالي المشتريات", value: money(0) },
        { label: "عدد الفواتير", value: 0 },
      ]);
      return;
    }
    const viewMap = new Map(items.map((i) => [String(i.id), i]));
    items.forEach((inv) => {
      const row = document.createElement("tr");
      row.dataset.status = inv.status || "";
      const isPosted = inv.status === "posted";
      const isDraft = inv.status === "draft";
      row.innerHTML = `
        <td>
           <div class="data-cell">
             <span class="data-main">#${inv.invoice_no}</span>
             <span class="data-info"><i class='bx bx-calendar'></i> ${new Date(inv.invoice_date).toLocaleDateString("ar-EG")}</span>
           </div>
        </td>
        <td>${inv.supplier_name || "—"}</td>
        <td>${money(inv.total_amount)}</td>
        <td><span class="badge ${isPosted ? "success" : "warn"}">${translateStatus(inv.status)}</span></td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" title="عرض" data-view-id="${inv.id}" data-view-type="purchase_invoice" data-view-title="بيانات الفاتورة"><i class='bx bx-show'></i></button>
            <button class="icon-btn" title="تعديل" data-edit-purchase="${inv.id}" ${isDraft ? "" : "disabled"}><i class='bx bx-edit-alt'></i></button>
            <button class="icon-btn" title="حذف" data-delete-purchase="${inv.id}" ${isDraft ? "" : "disabled"}><i class='bx bx-trash'></i></button>
            <button class="icon-btn" title="ترحيل" data-post-purchase="${inv.id}" data-entry-date="${inv.invoice_date}" ${isPosted ? "disabled" : ""}>
              <i class='bx ${isPosted ? "bx-check-circle" : "bx-check-double"}'></i>
            </button>
          </div>
        </td>
      `;
      body.appendChild(row);
    });

    // Insights
    const totalPurchases = items.reduce((sum, i) => sum + Number(i.total_amount), 0);
    renderPageInsights("purchasesInsights", [
      { label: "إجمالي المشتريات", value: money(totalPurchases) },
      { label: "عدد الفواتير", value: items.length },
    ]);

    body.querySelectorAll("[data-post-purchase]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.postPurchase;
        if (btn.disabled) return;
        const form = $("postPurchaseForm");
        if (form) {
          form.querySelector("input[name='invoiceId']").value = id;
          const dateInput = form.querySelector("input[name='entryDate']");
          if (dateInput) dateInput.value = btn.dataset.entryDate || todayISO();
          const label = $("postPurchaseInvoiceNo");
          if (label) {
            const code = btn.closest("tr")?.querySelector(".data-main")?.textContent || "";
            label.textContent = code ? `#${code.replace("#", "").trim()}` : "";
          }
          window.openModal("modalPostPurchase");
        }
      });
    });

    body.querySelectorAll("[data-edit-purchase]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (btn.disabled) return;
        const id = btn.dataset.editPurchase;
        if (!id) return;
        await openPurchaseEdit(id);
      });
    });

    body.querySelectorAll("[data-delete-purchase]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (btn.disabled) return;
        const id = btn.dataset.deletePurchase;
        if (!id) return;
        openConfirmModal("حذف فاتورة المشتريات؟ سيتم حذف المسودة نهائيًا.", async () => {
          try {
            await deleteJSON(`${apiBase}/purchases/invoices/${id}`);
            toast("تم حذف الفاتورة", "success");
            await Promise.all([loadPurchaseInvoices(), loadKpis(), loadReports(), loadInventoryReport(), loadInventoryMovements()]);
          } catch (err) {
            toast(`تعذر الحذف: ${err.message || err}`, "error");
          }
        });
      });
    });

    attachViewHandlers(body, viewMap);
  } catch {
    body.innerHTML = "<tr><td colspan='5'>تعذر التحميل</td></tr>";
  }
}

async function loadProductionOrders() {
  const body = $("productionBody");
  if (!body) return;
  try {
    const json = await fetchJSON(`${apiBase}/production/orders`);
    const items = json.data || [];
    state.productionOrders = items;
    body.innerHTML = "";
    if (items.length === 0) {
      body.innerHTML = "<tr><td colspan='4'>لا توجد أوامر إنتاج</td></tr>";
      renderPageInsights("productionInsights", [
        { label: "إجمالي الأوامر", value: 0 },
        { label: "تم التنفيذ", value: 0 },
        { label: "قيد الانتظار", value: 0 },
      ]);
      hydrateSelects();
      return;
    }
    const viewMap = new Map(items.map((i) => [String(i.id), i]));
    items.forEach((o) => {
      const row = document.createElement("tr");
      const isDone = o.status === "done";
      const isPlanned = o.status === "planned";
      row.dataset.status = o.status || "";
      row.innerHTML = `
        <td>${o.order_no}</td>
        <td>${new Date(o.production_date).toLocaleDateString("ar-EG")}</td>
        <td>${num2(o.qty_produced || 0)}</td>
        <td>${money(o.total_cost || 0)}</td>
        <td><span class="badge ${isDone ? "success" : "warn"}">${translateStatus(o.status)}</span></td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" title="عرض" data-view-id="${o.id}" data-view-type="production_order" data-view-title="بيانات أمر الإنتاج"><i class='bx bx-show'></i></button>
            <button class="icon-btn" title="تعديل" data-edit-production="${o.id}" ${isPlanned ? "" : "disabled"}><i class='bx bx-edit-alt'></i></button>
            <button class="icon-btn" title="حذف" data-delete-production="${o.id}" ${isPlanned ? "" : "disabled"}><i class='bx bx-trash'></i></button>
            <button class="icon-btn" title="تنفيذ" data-exec-prod="${o.id}" data-order-no="${o.order_no}" ${isDone ? "disabled" : ""}><i class='bx bx-check-double'></i></button>
          </div>
        </td>
      `;
      body.appendChild(row);
    });

    // Insights
    const done = items.filter((o) => o.status === "done").length;
    renderPageInsights("productionInsights", [
      { label: "إجمالي الأوامر", value: items.length },
      { label: "تم التنفيذ", value: done },
      { label: "قيد الانتظار", value: items.length - done },
    ]);

    hydrateSelects();

    attachViewHandlers(body, viewMap);
    body.querySelectorAll("[data-exec-prod]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const id = btn.dataset.execProd;
        const hidden = $("executeOrderId");
        const orderNo = $("executeOrderNo");
        if (hidden) hidden.value = id || "";
        if (orderNo) orderNo.textContent = btn.dataset.orderNo || "";
        openModal("modalProductionExecute");
      });
    });

    body.querySelectorAll("[data-edit-production]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (btn.disabled) return;
        const id = btn.dataset.editProduction;
        if (!id) return;
        await openProductionEdit(id);
      });
    });

    body.querySelectorAll("[data-delete-production]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (btn.disabled) return;
        const id = btn.dataset.deleteProduction;
        if (!id) return;
        openConfirmModal("حذف أمر الإنتاج؟ سيتم حذف المسودة نهائيًا.", async () => {
          try {
            await deleteJSON(`${apiBase}/production/orders/${id}`);
            toast("تم حذف أمر الإنتاج", "success");
            await Promise.all([loadProductionOrders(), loadInventoryReport(), loadInventoryMovements(), loadJournal(), loadReports(), loadAlerts(), loadKpis()]);
          } catch (err) {
            toast(`تعذر الحذف: ${err.message || err}`, "error");
          }
        });
      });
    });
  } catch {
    body.innerHTML = "<tr><td colspan='4'>تعذر التحميل</td></tr>";
  }
}

async function loadVehicles() {
  const body = $("vehiclesBody");
  if (!body) return;
  try {
    const json = await fetchJSON(`${apiBase}/distribution/vehicles`);
    const vehicles = json.data || [];
    state.vehicles = vehicles;
    body.innerHTML = "";
    if (vehicles.length === 0) {
      body.innerHTML = "<tr><td colspan='3'>لا توجد عربات</td></tr>";
      hydrateSelects();
      return;
    }
    const viewMap = new Map(vehicles.map((v) => [String(v.id), v]));
    vehicles.forEach((v) => {
      const row = document.createElement("tr");
      row.dataset.status = v.is_active === false ? "inactive" : "active";
      row.innerHTML = `
        <td>
           <div class="data-cell">
             <span class="data-main">${v.code}</span>
             <span class="data-info">${v.plate_no}</span>
           </div>
        </td>
        <td>${v.driver_name || "—"}</td>
        <td>
          <div class="row-actions">
             <button class="icon-btn" title="عرض" data-view-id="${v.id}" data-view-type="vehicle" data-view-title="بيانات العربة"><i class='bx bx-show'></i></button>
             <button class="icon-btn" title="تحميل" data-load-vehicle="${v.id}"><i class='bx bx-package'></i></button>
             <button class="icon-btn" title="تسوية" data-settle-vehicle="${v.id}"><i class='bx bx-check-shield'></i></button>
             <button class="icon-btn" title="تعديل" data-edit-vehicle="${v.id}"><i class='bx bx-edit'></i></button>
             <button class="icon-btn" title="حذف" data-delete-vehicle="${v.id}"><i class='bx bx-trash'></i></button>
          </div>
        </td>
      `;
      body.appendChild(row);
    });

    hydrateSelects();

    renderPageInsights("distributionInsights", [
      { label: "عدد العربات", value: vehicles.length },
      { label: "نشطة", value: vehicles.filter((v) => v.is_active !== false).length },
    ]);

    attachViewHandlers(body, viewMap);

    body.querySelectorAll("[data-load-vehicle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const select = $("loadVehicleSelect");
        if (select) select.value = btn.dataset.loadVehicle || "";
        openModal("modalVehicleLoad");
      });
    });

    body.querySelectorAll("[data-settle-vehicle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const select = $("settleVehicleSelect");
        if (select) select.value = btn.dataset.settleVehicle || "";
        openModal("modalVehicleSettlement");
      });
    });

    body.querySelectorAll("[data-edit-vehicle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.editVehicle;
        const v = vehicles.find((x) => String(x.id) === String(id));
        if (!v) return;
        const form = $("vehicleForm");
        if (!form) return;
        form.dataset.mode = "edit";
        form.querySelector("input[name='id']").value = v.id;
        form.querySelector("input[name='code']").value = v.code;
        form.querySelector("input[name='plateNo']").value = v.plate_no;
        form.querySelector("input[name='driverName']").value = v.driver_name || "";
        openModal("modalVehicle");
      });
    });

    body.querySelectorAll("[data-delete-vehicle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.deleteVehicle;
        openConfirmModal("حذف هذه العربة؟", async () => {
          try {
            await fetchJSON(`${apiBase}/distribution/vehicles/${id}`, { method: "DELETE" });
            toast("تم حذف العربة", "success");
            await loadVehicles();
          } catch (err) {
            toast(`تعذر حذف العربة: ${err.message || err}`, "error");
          }
        });
      });
    });
  } catch {
    body.innerHTML = "<tr><td colspan='3'>تعذر التحميل</td></tr>";
  }
}

async function loadCustomers() {
  const body = $("customersBody");
  if (!body) return;
  try {
    const json = await fetchJSON(`${apiBase}/crm/customers`);
    const customers = json.data || [];
    state.customers = customers;
    body.innerHTML = "";
    if (customers.length === 0) {
      body.innerHTML = "<tr><td colspan='3'>لا يوجد عملاء</td></tr>";
      hydrateSelects();
      return;
    }
    const viewMap = new Map(customers.map((c) => [String(c.id), c]));
    customers.forEach((c) => {
      const row = document.createElement("tr");
      row.dataset.status = c.is_active === false ? "inactive" : "active";
      row.innerHTML = `
        <td>
           <div class="data-cell">
             <span class="data-main">${c.name}</span>
             <span class="data-info">كود: ${c.code} • ${c.address || "بدون عنوان"}</span>
           </div>
        </td>
        <td>
           <div class="data-cell">
             <span class="data-main">${c.phone || "—"}</span>
             <span class="data-info">حد: ${money(c.credit_limit || 0)}</span>
           </div>
        </td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" title="عرض" data-view-id="${c.id}" data-view-type="customer" data-view-title="بيانات العميل"><i class='bx bx-show'></i></button>
            <button class="icon-btn" title="تعديل" data-edit-customer="${c.id}"><i class='bx bx-edit'></i></button>
            <button class="icon-btn" title="حذف" data-delete-customer="${c.id}"><i class='bx bx-trash'></i></button>
          </div>
        </td>
      `;
      body.appendChild(row);
    });

    renderCrmInsights();

    attachViewHandlers(body, viewMap);
    body.querySelectorAll("[data-edit-customer]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.editCustomer;
        const c = customers.find((x) => String(x.id) === String(id));
        if (!c) return;
        const form = $("customerForm");
        if (!form) return;
        form.dataset.mode = "edit";
        form.querySelector("input[name='id']").value = c.id;
        form.querySelector("input[name='code']").value = c.code;
        form.querySelector("input[name='name']").value = c.name;
        form.querySelector("input[name='phone']").value = c.phone || "";
        form.querySelector("input[name='address']").value = c.address || "";
        form.querySelector("input[name='creditLimit']").value = c.credit_limit || 0;
        openModal("modalCustomer");
      });
    });

    body.querySelectorAll("[data-delete-customer]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.deleteCustomer;
        openConfirmModal("حذف هذا العميل؟", async () => {
          try {
            await fetchJSON(`${apiBase}/crm/customers/${id}`, { method: "DELETE" });
            toast("تم حذف العميل", "success");
            await loadCustomers();
          } catch (err) {
            toast(`تعذر حذف العميل: ${err.message || err}`, "error");
          }
        });
      });
    });

    hydrateSelects();
  } catch {
    body.innerHTML = "<tr><td colspan='3'>تعذر التحميل</td></tr>";
  }
}

async function loadSuppliers() {
  const body = $("suppliersBody");
  if (!body) return;
  try {
    const json = await fetchJSON(`${apiBase}/crm/suppliers`);
    const suppliers = json.data || [];
    state.suppliers = suppliers;
    body.innerHTML = "";
    if (suppliers.length === 0) {
      body.innerHTML = "<tr><td colspan='3'>لا يوجد موردون</td></tr>";
      hydrateSelects();
      return;
    }
    const viewMap = new Map(suppliers.map((s) => [String(s.id), s]));
    suppliers.forEach((s) => {
      const row = document.createElement("tr");
      row.dataset.status = s.is_active === false ? "inactive" : "active";
      row.innerHTML = `
        <td>
           <div class="data-cell">
             <span class="data-main">${s.name}</span>
             <span class="data-info">كود: ${s.code} • ${s.address || "بدون عنوان"}</span>
           </div>
        </td>
        <td>
          <div class="data-cell">
            <span class="data-main">${s.phone || "—"}</span>
            <span class="data-info">${s.is_active === false ? "غير نشط" : "نشط"}</span>
          </div>
        </td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" title="عرض" data-view-id="${s.id}" data-view-type="supplier" data-view-title="بيانات المورد"><i class='bx bx-show'></i></button>
            <button class="icon-btn" title="تعديل" data-edit-supplier="${s.id}"><i class='bx bx-edit'></i></button>
            <button class="icon-btn" title="حذف" data-delete-supplier="${s.id}"><i class='bx bx-trash'></i></button>
          </div>
        </td>
      `;
      body.appendChild(row);
    });

    renderCrmInsights();

    attachViewHandlers(body, viewMap);
    body.querySelectorAll("[data-edit-supplier]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.editSupplier;
        const s = suppliers.find((x) => String(x.id) === String(id));
        if (!s) return;
        const form = $("supplierForm");
        if (!form) return;
        form.dataset.mode = "edit";
        form.querySelector("input[name='id']").value = s.id;
        form.querySelector("input[name='code']").value = s.code;
        form.querySelector("input[name='name']").value = s.name;
        form.querySelector("input[name='phone']").value = s.phone || "";
        form.querySelector("input[name='address']").value = s.address || "";
        openModal("modalSupplier");
      });
    });

    body.querySelectorAll("[data-delete-supplier]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.deleteSupplier;
        openConfirmModal("حذف هذا المورد؟", async () => {
          try {
            await fetchJSON(`${apiBase}/crm/suppliers/${id}`, { method: "DELETE" });
            toast("تم حذف المورد", "success");
            await loadSuppliers();
          } catch (err) {
            toast(`تعذر حذف المورد: ${err.message || err}`, "error");
          }
        });
      });
    });

    hydrateSelects();
  } catch {
    body.innerHTML = "<tr><td colspan='3'>تعذر التحميل</td></tr>";
  }
}

async function loadMessages() {
  const body = $("messagesBody");
  if (!body) return;
  try {
    const json = await fetchJSON(`${apiBase}/messages/logs`);
    body.innerHTML = "";
    const msgs = json.data || [];
    if (msgs.length === 0) {
      body.innerHTML = "<tr><td colspan='5'>لا توجد رسائل</td></tr>";
      return;
    }
    const viewMap = new Map(msgs.map((m) => [String(m.id), m]));
    msgs.forEach((m) => {
      const row = document.createElement("tr");
      row.dataset.status = m.status || "";
      row.innerHTML = `
        <td>${translateStatus(m.channel)}</td>
        <td>${m.recipient}</td>
        <td>${translateStatus(m.status)}</td>
        <td>${new Date(m.created_at).toLocaleString("ar-EG")}</td>
        <td><button class="icon-btn" title="عرض" data-view-id="${m.id}" data-view-type="message" data-view-title="بيانات الرسالة"><i class='bx bx-show'></i></button></td>
      `;
      body.appendChild(row);
    });

    attachViewHandlers(body, viewMap);
  } catch {
    body.innerHTML = "<tr><td colspan='5'>تعذر التحميل</td></tr>";
  }
}

async function loadReports() {
  try {
    const profit = await fetchJSON(`${apiBase}/reports/profit`);
    const inventory = await fetchJSON(`${apiBase}/reports/inventory`);
    const debt = await fetchJSON(`${apiBase}/reports/customer-debt`);
    const production = await fetchJSON(`${apiBase}/reports/production-cost`);
    const custody = await fetchJSON(`${apiBase}/reports/vehicle-custody`);

    const debtData = debt.data || [];
    const productionData = production.data || [];
    const custodyData = custody.data || [];
    const inventoryData = inventory.data || [];

    $("profitSummary").textContent = `المبيعات ${money(profit.data.sales || 0)} / الربح ${money(profit.data.profit || 0)}`;
    $("inventorySummary").textContent = `عدد الأصناف ${inventoryData.length}`;
    $("debtSummary").textContent = `إجمالي المديونيات ${money(debtData.reduce((s, r) => s + Number(r.total_sales || 0), 0))}`;
    $("productionSummary").textContent = `عدد الأوامر ${productionData.length}`;
    $("custodySummary").textContent = `عدد العربات ${custodyData.length}`;

    const debtBody = $("reportDebtBody");
    debtBody.innerHTML = "";
    if (debtData.length === 0) {
      debtBody.innerHTML = "<tr><td colspan='3'>لا توجد بيانات</td></tr>";
    }
    const debtMap = new Map(debtData.map((d) => [String(d.id || d.name), d]));
    debtData.forEach((r) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${r.name}</td>
        <td>${money(r.total_sales || 0)}</td>
        <td><button class="icon-btn" title="عرض" data-view-id="${r.id || r.name}" data-view-type="report_debt" data-view-title="بيانات المديونية"><i class='bx bx-show'></i></button></td>
      `;
      debtBody.appendChild(row);
    });

    const prodBody = $("reportProductionBody");
    prodBody.innerHTML = "";
    if (productionData.length === 0) {
      prodBody.innerHTML = "<tr><td colspan='3'>لا توجد بيانات</td></tr>";
    }
    const prodMap = new Map(productionData.map((p) => [String(p.id || p.order_no), p]));
    productionData.forEach((r) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${r.order_no}</td>
        <td>${money(r.total_cost || 0)}</td>
        <td><button class="icon-btn" title="عرض" data-view-id="${r.id || r.order_no}" data-view-type="report_production" data-view-title="بيانات تكلفة الإنتاج"><i class='bx bx-show'></i></button></td>
      `;
      prodBody.appendChild(row);
    });

    const custodyBody = $("reportCustodyBody");
    custodyBody.innerHTML = "";
    if (custodyData.length === 0) {
      custodyBody.innerHTML = "<tr><td colspan='5'>لا توجد بيانات</td></tr>";
    }
    const custodyMap = new Map(custodyData.map((c) => [String(c.id || c.code), c]));
    custodyData.forEach((r) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${r.code}</td>
        <td>${num2(r.loaded || 0)}</td>
        <td>${num2(r.returned || 0)}</td>
        <td>${num2(r.sold || 0)}</td>
        <td><button class="icon-btn" title="عرض" data-view-id="${r.id || r.code}" data-view-type="report_custody" data-view-title="بيانات العهدة"><i class='bx bx-show'></i></button></td>
      `;
      custodyBody.appendChild(row);
    });

    attachViewHandlers(debtBody, debtMap);
    attachViewHandlers(prodBody, prodMap);
    attachViewHandlers(custodyBody, custodyMap);
  } catch {
    $("profitSummary").textContent = "تعذر التحميل";
  }
}

async function loadBackupHistory() {
  const body = $("backupHistoryBody");
  if (!body) return;
  try {
    const json = await fetchJSON(`${apiBase}/backup/history`);
    const items = json.data || [];
    body.innerHTML = "";
    if (items.length === 0) {
      body.innerHTML = "<tr><td colspan='5'>لا يوجد سجل بعد</td></tr>";
      return;
    }
    const viewMap = new Map(items.map((b) => [String(b.id), b]));
    items.forEach((b) => {
      const row = document.createElement("tr");
      row.dataset.status = b.status || "";
      const isCompleted = b.status === "completed";
      row.innerHTML = `
        <td>${new Date(b.backup_date).toLocaleString("ar-EG")}</td>
        <td>${b.file_name || "—"}</td>
        <td>${num2(b.size_mb || 0)}</td>
        <td><span class="badge ${b.status === "completed" ? "success" : b.status === "failed" ? "danger" : "warn"}">${translateStatus(b.status || "—")}</span></td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" title="عرض" data-view-id="${b.id}" data-view-type="backup" data-view-title="بيانات النسخة"><i class='bx bx-show'></i></button>
            <button class="icon-btn" title="تنزيل" data-download-backup="${b.id}" ${isCompleted ? "" : "disabled"}><i class='bx bx-download'></i></button>
            <button class="icon-btn" title="استعادة" data-restore-backup="${b.id}" ${isCompleted ? "" : "disabled"}><i class='bx bx-undo'></i></button>
          </div>
        </td>
      `;
      body.appendChild(row);
    });
    attachViewHandlers(body, viewMap);

    body.querySelectorAll("[data-download-backup]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.downloadBackup;
        if (!id) return;
        window.open(`${apiBase}/backup/history/${id}/download`, "_blank");
      });
    });

    body.querySelectorAll("[data-restore-backup]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const id = btn.dataset.restoreBackup;
        const form = $("restoreBackupForm");
        if (!form) return;
        form.reset();
        form.querySelector("input[name='backupId']").value = id;
        $("restoreConfirmBtn").disabled = true;
        openModal("modalRestoreBackup");
      });
    });
  } catch {
    body.innerHTML = "<tr><td colspan='5'>تعذر التحميل</td></tr>";
  }
}

function renderPermissionsGrid() {
  const grid = $("permissionsGrid");
  if (!grid) return;
  grid.innerHTML = "";
  const perms = state.permissions || [];
  if (perms.length === 0) {
    grid.innerHTML = "<div class='alert-empty'>لا توجد صلاحيات بعد.</div>";
    return;
  }
  perms.forEach((p) => {
    const label = document.createElement("label");
    label.innerHTML = `
      <input type="checkbox" name="permission" value="${p.code}">
      <span>${p.description || p.code}</span>
    `;
    grid.appendChild(label);
  });
}

function renderTeamsInsights() {
  renderPageInsights("teamsInsights", [
    { label: "إجمالي المستخدمين", value: state.users.length },
    { label: "نشط", value: state.users.filter((u) => u.is_active !== false).length },
    { label: "إجمالي الأدوار", value: state.roles.length },
    { label: "إجمالي الصلاحيات", value: state.permissions.length },
  ]);
}

async function loadPermissions() {
  try {
    const json = await fetchJSON(`${apiBase}/teams/permissions`);
    state.permissions = json.data || [];
    renderPermissionsGrid();
  } catch {
    state.permissions = [];
    renderPermissionsGrid();
  }
}

async function loadRoles() {
  const body = $("teamsRolesBody");
  if (!body) return;
  try {
    const json = await fetchJSON(`${apiBase}/teams/roles`);
    const roles = json.data || [];
    state.roles = roles;
    body.innerHTML = "";
    if (roles.length === 0) {
      body.innerHTML = "<tr><td colspan='4'>لا توجد أدوار</td></tr>";
      hydrateSelects();
      renderTeamsInsights();
      return;
    }
    const permLabelMap = new Map(
      (state.permissions || []).map((p) => [p.code, p.description || p.code])
    );
    const viewMap = new Map(
      roles.map((r) => [
        String(r.id),
        {
          ...r,
          permissions: (r.permissions || []).map(
            (code) => permLabelMap.get(code) || code
          ),
        },
      ])
    );
    roles.forEach((r) => {
      const perms = r.permissions || [];
      const row = document.createElement("tr");
      row.dataset.status = r.is_system ? "system" : "custom";
      row.innerHTML = `
        <td>${r.name}</td>
        <td>${r.description || "—"}</td>
        <td>${perms.length}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" title="عرض" data-view-id="${r.id}" data-view-type="role" data-view-title="بيانات الدور"><i class='bx bx-show'></i></button>
            <button class="icon-btn" title="تعديل" data-edit-role="${r.id}" ${r.is_system ? "disabled" : ""}><i class='bx bx-edit'></i></button>
            <button class="icon-btn" title="حذف" data-delete-role="${r.id}" ${r.is_system ? "disabled" : ""}><i class='bx bx-trash'></i></button>
          </div>
        </td>
      `;
      body.appendChild(row);
    });
    attachViewHandlers(body, viewMap);
    hydrateSelects();
    renderTeamsInsights();

    body.querySelectorAll("[data-edit-role]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const id = btn.dataset.editRole;
        const role = roles.find((x) => String(x.id) === String(id));
        if (!role) return;
        const form = $("teamRoleForm");
        if (!form) return;
        form.dataset.mode = "edit";
        form.querySelector("input[name='id']").value = role.id;
        form.querySelector("input[name='name']").value = role.name;
        form.querySelector("input[name='description']").value = role.description || "";
        renderPermissionsGrid();
        const selected = new Set(role.permissions || []);
        form.querySelectorAll("input[name='permission']").forEach((el) => {
          el.checked = selected.has(el.value);
        });
        openModal("modalTeamRole");
      });
    });

    body.querySelectorAll("[data-delete-role]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const id = btn.dataset.deleteRole;
        openConfirmModal("حذف هذا الدور؟", async () => {
          try {
            await fetchJSON(`${apiBase}/teams/roles/${id}`, { method: "DELETE" });
            toast("تم حذف الدور", "success");
            await loadRoles();
          } catch (err) {
            toast(`تعذر حذف الدور: ${err.message || err}`, "error");
          }
        });
      });
    });
  } catch {
    body.innerHTML = "<tr><td colspan='4'>تعذر التحميل</td></tr>";
  }
}

async function loadUsers() {
  const body = $("teamsUsersBody");
  if (!body) return;
  try {
    const json = await fetchJSON(`${apiBase}/teams/users`);
    const users = json.data || [];
    state.users = users;
    body.innerHTML = "";
    if (users.length === 0) {
      body.innerHTML = "<tr><td colspan='4'>لا توجد حسابات</td></tr>";
      renderTeamsInsights();
      return;
    }
    const viewMap = new Map(users.map((u) => [String(u.id), u]));
    users.forEach((u) => {
      const roles = u.roles || [];
      const row = document.createElement("tr");
      row.dataset.status = u.is_active === false ? "inactive" : "active";
      row.innerHTML = `
        <td>
          <div class="data-cell">
            <span class="data-main">${u.full_name || "—"}</span>
            <span class="data-info">${u.is_active === false ? "غير نشط" : "نشط"}</span>
          </div>
        </td>
        <td>
          <div class="data-cell">
            <span class="data-main">${u.email || "—"}</span>
            <span class="data-info">${u.phone || "—"}</span>
          </div>
        </td>
        <td>${roles.length ? roles.join("، ") : "—"}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" title="عرض" data-view-id="${u.id}" data-view-type="user" data-view-title="بيانات المستخدم"><i class='bx bx-show'></i></button>
            <button class="icon-btn" title="تعديل" data-edit-user="${u.id}" ${u.is_system ? "disabled" : ""}><i class='bx bx-edit'></i></button>
            <button class="icon-btn" title="حذف" data-delete-user="${u.id}" ${u.is_system ? "disabled" : ""}><i class='bx bx-trash'></i></button>
          </div>
        </td>
      `;
      body.appendChild(row);
    });

    attachViewHandlers(body, viewMap);
    renderTeamsInsights();

    body.querySelectorAll("[data-delete-user]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.deleteUser;
        if (btn.disabled) return;
        openConfirmModal("حذف هذا المستخدم؟", async () => {
          try {
            await fetchJSON(`${apiBase}/teams/users/${id}`, { method: "DELETE" });
            toast("تم حذف المستخدم", "success");
            await loadUsers();
          } catch (err) {
            toast(`تعذر حذف المستخدم: ${err.message || err}`, "error");
          }
        });
      });
    });

    body.querySelectorAll("[data-edit-user]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const id = btn.dataset.editUser;
        const user = users.find((x) => String(x.id) === String(id));
        if (!user) return;
        const form = $("teamUserForm");
        if (!form) return;
        form.dataset.mode = "edit";
        form.querySelector("input[name='id']").value = user.id;
        form.querySelector("input[name='fullName']").value = user.full_name || "";
        form.querySelector("input[name='email']").value = user.email || "";
        form.querySelector("input[name='phone']").value = user.phone || "";
        const roleSelect = form.querySelector("select[name='roleId']");
        if (roleSelect && user.role_id) roleSelect.value = user.role_id;
        const statusSelect = form.querySelector("select[name='isActive']");
        if (statusSelect) statusSelect.value = user.is_active === false ? "false" : "true";
        openModal("modalTeamUser");
      });
    });
  } catch {
    body.innerHTML = "<tr><td colspan='4'>تعذر التحميل</td></tr>";
  }
}

function bindForms() {
  const refreshBtn = $("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      refreshBtn.disabled = true;
      await loadAll();
      refreshBtn.disabled = false;
      toast("تم تحديث البيانات", "success");
    });
  }

  const notificationsBtn = $("notificationsBtn");
  if (notificationsBtn) {
    notificationsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = $("notifMenu");
      if (menu) menu.classList.toggle("open");
      const dropdown = $("notifDropdown");
      if (menu && menu.classList.contains("open") && dropdown) {
        requestAnimationFrame(() => clampDropdown(dropdown, "translateX(-50%)"));
      }
      loadAlerts();
    });
  }

  const openAllAlerts = $("openAllAlerts");
  if (openAllAlerts) {
    openAllAlerts.addEventListener("click", () => {
      setPage("dashboard");
      const menu = $("notifMenu");
      if (menu) menu.classList.remove("open");
    });
  }

  const profileBtn = $("profileBtn");
  if (profileBtn) {
    profileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = $("profileMenu");
      if (menu) menu.classList.toggle("open");
      const dropdown = $("profileDropdown");
      if (menu && menu.classList.contains("open") && dropdown) {
        requestAnimationFrame(() => clampDropdown(dropdown));
      }
    });
  }

  document.addEventListener("click", (e) => {
    const menu = $("profileMenu");
    const notifMenu = $("notifMenu");
    if (menu && !menu.contains(e.target)) menu.classList.remove("open");
    if (notifMenu && !notifMenu.contains(e.target)) notifMenu.classList.remove("open");
  });

  const logoutBtn = $("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      openConfirmModal("تسجيل الخروج من النظام؟", () => {
        toast("تم تسجيل الخروج (وضع تجريبي).", "info");
      });
    });
  }

  const logoutBtnSettings = $("logoutBtnSettings");
  if (logoutBtnSettings) {
    logoutBtnSettings.addEventListener("click", () => {
      openConfirmModal("تسجيل الخروج من النظام؟", () => {
        toast("تم تسجيل الخروج (وضع تجريبي).", "info");
      });
    });
  }

  const openNotificationsFromSettings = $("openNotificationsFromSettings");
  if (openNotificationsFromSettings) {
    openNotificationsFromSettings.addEventListener("click", () => {
      const menu = $("notifMenu");
      if (menu) menu.classList.add("open");
      loadAlerts();
    });
  }

  const newInvoiceBtn = $("newInvoiceBtn");
  if (newInvoiceBtn) {
    newInvoiceBtn.addEventListener("click", () => {
      setPage("sales");
      window.openModal("modalSalesInvoice");
    });
  }

  const quickActionBtn = $("quickActionBtn");
  if (quickActionBtn) {
    quickActionBtn.addEventListener("click", () => {
      window.openModal("modalQuickAction");
    });
  }

  const openingForm = $("openingCapitalForm");
  if (openingForm) {
    openingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(openingForm));
      try {
        await postJSON(`${apiBase}/accounting/opening-capital`, {
          entryDate: data.entryDate,
          amount: Number(data.amount),
        });
        toast("تم ترحيل رأس المال", "success");
        openingForm.reset();
        closeModal("modalOpeningCapital");
        await Promise.all([loadJournal(), loadKpis(), loadReports()]);
      } catch (err) {
        toast(`تعذر الترحيل: ${err.message || err}`, "error");
      }
    });
  }

  const salesForm = $("salesInvoiceForm");
  if (salesForm) {
    salesForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(salesForm));
      try {
        const isEdit = salesForm.dataset.mode === "edit";
        const invoiceId = salesForm.dataset.invoiceId;
        const payload = {
          invoiceNo: data.invoiceNo,
          customerId: data.customerId || null,
          invoiceDate: data.invoiceDate,
          notes: data.notes || null,
          items: [
            {
              itemId: data.itemId,
              warehouseId: data.warehouseId,
              qty: Number(data.qty),
              unitPrice: Number(data.unitPrice),
            },
          ],
        };
        if (isEdit && invoiceId) {
          await putJSON(`${apiBase}/sales/invoices/${invoiceId}`, payload);
        } else {
          await postJSON(`${apiBase}/sales/invoices`, payload);
        }
        toast(isEdit ? "تم تحديث فاتورة المبيعات" : "تم حفظ فاتورة المبيعات", "success");
        salesForm.reset();
        closeModal("modalSalesInvoice");
        await Promise.all([loadSalesInvoices(), loadLatestSales(), loadKpis()]);
      } catch (err) {
        toast(`تعذر حفظ الفاتورة: ${err.message || err}`, "error");
      }
    });
  }

  const purchaseForm = $("purchaseInvoiceForm");
  if (purchaseForm) {
    purchaseForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(purchaseForm));
      try {
        const isEdit = purchaseForm.dataset.mode === "edit";
        const invoiceId = purchaseForm.dataset.invoiceId;
        const payload = {
          invoiceNo: data.invoiceNo,
          supplierId: data.supplierId || null,
          invoiceDate: data.invoiceDate,
          notes: data.notes || null,
          items: [
            {
              itemId: data.itemId,
              warehouseId: data.warehouseId,
              qty: Number(data.qty),
              unitPrice: Number(data.unitPrice),
            },
          ],
        };
        if (isEdit && invoiceId) {
          await putJSON(`${apiBase}/purchases/invoices/${invoiceId}`, payload);
        } else {
          await postJSON(`${apiBase}/purchases/invoices`, payload);
        }
        toast(isEdit ? "تم تحديث فاتورة المشتريات" : "تم حفظ فاتورة المشتريات", "success");
        purchaseForm.reset();
        closeModal("modalPurchaseInvoice");
        await Promise.all([loadPurchaseInvoices(), loadKpis()]);
      } catch (err) {
        toast(`تعذر حفظ الفاتورة: ${err.message || err}`, "error");
      }
    });
  }

  const productionForm = $("productionOrderForm");
  if (productionForm) {
    productionForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(productionForm));
      try {
        const isEdit = productionForm.dataset.mode === "edit";
        const orderId = productionForm.dataset.orderId;
        const payload = {
          orderNo: data.orderNo,
          productionDate: data.productionDate,
          notes: data.notes || null,
          materials: [
            {
              itemId: data.materialItemId,
              qtyUsed: Number(data.materialQty),
              unitCost: Number(data.materialUnitCost),
            },
          ],
          outputs: [
            {
              itemId: data.outputItemId,
              qtyProduced: Number(data.outputQty),
            },
          ],
        };
        if (isEdit && orderId) {
          await putJSON(`${apiBase}/production/orders/${orderId}`, payload);
        } else {
          await postJSON(`${apiBase}/production/orders`, payload);
        }
        toast(isEdit ? "تم تحديث أمر الإنتاج" : "تم حفظ أمر الإنتاج", "success");
        productionForm.reset();
        closeModal("modalProductionOrder");
        await Promise.all([loadProductionOrders(), loadInventoryReport(), loadInventoryMovements(), loadJournal(), loadReports(), loadAlerts(), loadKpis()]);
      } catch (err) {
        toast(`تعذر حفظ أمر الإنتاج: ${err.message || err}`, "error");
      }
    });
  }

  const postSalesForm = $("postSalesForm");
  if (postSalesForm) {
    postSalesForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(postSalesForm));
      if (!data.invoiceId) return;

      try {
        await postJSON(`${apiBase}/sales/invoices/${data.invoiceId}/post`, {
          entryDate: data.entryDate,
        });
        toast("تم ترحيل فاتورة المبيعات", "success");
        postSalesForm.reset();
        closeModal("modalPostSales");
        await Promise.all([loadSalesInvoices(), loadJournal(), loadReports(), loadKpis(), loadInventoryReport(), loadInventoryMovements()]);
      } catch (err) {
        toast(`تعذر الترحيل: ${err.message || err}`, "error");
      }
    });
  }

  const postPurchaseForm = $("postPurchaseForm");
  if (postPurchaseForm) {
    postPurchaseForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(postPurchaseForm));
      if (!data.invoiceId) return;

      try {
        await postJSON(`${apiBase}/purchases/invoices/${data.invoiceId}/post`, {
          entryDate: data.entryDate,
        });
        toast("تم ترحيل فاتورة المشتريات", "success");
        postPurchaseForm.reset();
        closeModal("modalPostPurchase");
        await Promise.all([loadPurchaseInvoices(), loadJournal(), loadInventoryReport(), loadInventoryMovements(), loadReports(), loadKpis()]);
      } catch (err) {
        toast(`تعذر الترحيل: ${err.message || err}`, "error");
      }
    });
  }

  const itemForm = $("itemForm");
  if (itemForm) {
    itemForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(itemForm));
      const isEdit = Boolean(data.id);
      try {
        if (isEdit) {
          await postJSON(`${apiBase}/inventory/items/${data.id}`, {
            sku: data.sku,
            name: data.name,
            type: data.type,
            unit: data.unit,
            minStock: Number(data.minStock || 0),
          });
          toast("تم تحديث الصنف", "success");
        } else {
          await postJSON(`${apiBase}/inventory/items`, {
            sku: data.sku,
            name: data.name,
            type: data.type,
            unit: data.unit,
            minStock: Number(data.minStock || 0),
          });
          toast("تم إضافة الصنف", "success");
        }
        itemForm.reset();
        closeModal("modalItem");
        await Promise.all([loadItems(), loadInventoryReport(), loadAlerts()]);
      } catch (err) {
        toast(`تعذر إضافة الصنف: ${err.message || err}`, "error");
      }
    });
  }

  const warehouseForm = $("warehouseForm");
  if (warehouseForm) {
    warehouseForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(warehouseForm));
      const isEdit = Boolean(data.id);
      try {
        if (isEdit) {
          await postJSON(`${apiBase}/inventory/warehouses/${data.id}`, {
            code: data.code,
            name: data.name,
            isVehicle: data.isVehicle === "true",
          });
          toast("تم تحديث المخزن", "success");
        } else {
          await postJSON(`${apiBase}/inventory/warehouses`, {
            code: data.code,
            name: data.name,
            isVehicle: data.isVehicle === "true",
          });
          toast("تم إضافة المخزن", "success");
        }
        warehouseForm.reset();
        closeModal("modalWarehouse");
        await loadWarehouses();
      } catch (err) {
        toast(`تعذر إضافة المخزن: ${err.message || err}`, "error");
      }
    });
  }

  const executeForm = $("productionExecuteForm");
  if (executeForm) {
    executeForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(executeForm));
      try {
        await postJSON(`${apiBase}/production/orders/${data.orderId}/execute`, {
          entryDate: data.entryDate,
          warehouseId: data.warehouseId,
        });
        toast("تم تنفيذ أمر الإنتاج", "success");
        executeForm.reset();
        closeModal("modalProductionExecute");
        await Promise.all([loadProductionOrders(), loadInventoryReport(), loadInventoryMovements(), loadJournal(), loadReports(), loadAlerts(), loadKpis()]);
      } catch (err) {
        toast(`تعذر تنفيذ الأمر: ${err.message || err}`, "error");
      }
    });
  }

  const vehicleForm = $("vehicleForm");
  if (vehicleForm) {
    vehicleForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(vehicleForm));
      const isEdit = Boolean(data.id);
      try {
        if (isEdit) {
          await postJSON(`${apiBase}/distribution/vehicles/${data.id}`, {
            code: data.code,
            plateNo: data.plateNo,
            driverName: data.driverName,
          });
          toast("تم تحديث العربة", "success");
        } else {
          await postJSON(`${apiBase}/distribution/vehicles`, {
            code: data.code,
            plateNo: data.plateNo,
            driverName: data.driverName,
          });
          toast("تم إضافة العربة", "success");
        }
        vehicleForm.reset();
        closeModal("modalVehicle");
        await loadVehicles();
      } catch (err) {
        toast(`تعذر إضافة العربة: ${err.message || err}`, "error");
      }
    });
  }

  const loadForm = $("vehicleLoadForm");
  if (loadForm) {
    loadForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(loadForm));
      try {
        await postJSON(`${apiBase}/distribution/loads`, {
          vehicleId: data.vehicleId,
          itemId: data.itemId,
          qty: Number(data.qty),
          sourceWarehouseId: data.sourceWarehouseId,
        });
        toast("تم تحميل العربة", "success");
        loadForm.reset();
        closeModal("modalVehicleLoad");
        await Promise.all([loadInventoryReport(), loadInventoryMovements(), loadAlerts()]);
      } catch (err) {
        toast(`تعذر التحميل: ${err.message || err}`, "error");
      }
    });
  }

  const settlementForm = $("vehicleSettlementForm");
  if (settlementForm) {
    settlementForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(settlementForm));
      try {
        await postJSON(`${apiBase}/distribution/settlements`, {
          vehicleId: data.vehicleId,
          itemId: data.itemId,
          qtyReturn: Number(data.qtyReturn),
          qtySold: Number(data.qtySold),
          mainWarehouseId: data.mainWarehouseId,
        });
        toast("تمت تسوية العهدة", "success");
        settlementForm.reset();
        closeModal("modalVehicleSettlement");
        await Promise.all([loadInventoryReport(), loadInventoryMovements(), loadAlerts()]);
      } catch (err) {
        toast(`تعذر التسوية: ${err.message || err}`, "error");
      }
    });
  }

  const customerForm = $("customerForm");
  if (customerForm) {
    customerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(customerForm));
      const isEdit = Boolean(data.id);
      try {
        if (isEdit) {
          await postJSON(`${apiBase}/crm/customers/${data.id}`, {
            code: data.code,
            name: data.name,
            phone: data.phone,
            address: data.address,
            creditLimit: Number(data.creditLimit || 0),
          });
          toast("تم تحديث العميل", "success");
        } else {
          await postJSON(`${apiBase}/crm/customers`, {
            code: data.code,
            name: data.name,
            phone: data.phone,
            address: data.address,
            creditLimit: Number(data.creditLimit || 0),
          });
          toast("تم إضافة العميل", "success");
        }
        customerForm.reset();
        closeModal("modalCustomer");
        await loadCustomers();
      } catch (err) {
        toast(`تعذر إضافة العميل: ${err.message || err}`, "error");
      }
    });
  }

  const supplierForm = $("supplierForm");
  if (supplierForm) {
    supplierForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(supplierForm));
      const isEdit = Boolean(data.id);
      try {
        if (isEdit) {
          await postJSON(`${apiBase}/crm/suppliers/${data.id}`, {
            code: data.code,
            name: data.name,
            phone: data.phone,
            address: data.address,
          });
          toast("تم تحديث المورد", "success");
        } else {
          await postJSON(`${apiBase}/crm/suppliers`, {
            code: data.code,
            name: data.name,
            phone: data.phone,
            address: data.address,
          });
          toast("تم إضافة المورد", "success");
        }
        supplierForm.reset();
        closeModal("modalSupplier");
        await loadSuppliers();
      } catch (err) {
        toast(`تعذر إضافة المورد: ${err.message || err}`, "error");
      }
    });
  }

  const smsForm = $("smsForm");
  if (smsForm) {
    smsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(smsForm));
      try {
        await postJSON(`${apiBase}/messages/sms`, {
          recipient: data.recipient,
          body: data.body,
        });
        toast("تمت إضافة الرسالة إلى قائمة الإرسال (SMS)", "success");
        smsForm.reset();
        closeModal("modalSms");
        await loadMessages();
      } catch (err) {
        toast(`تعذر الإرسال: ${err.message || err}`, "error");
      }
    });
  }

  const whatsappForm = $("whatsappForm");
  if (whatsappForm) {
    whatsappForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(whatsappForm));
      try {
        await postJSON(`${apiBase}/messages/whatsapp`, {
          recipient: data.recipient,
          body: data.body,
        });
        toast("تمت إضافة الرسالة إلى قائمة الإرسال (WhatsApp)", "success");
        whatsappForm.reset();
        closeModal("modalWhatsapp");
        await loadMessages();
      } catch (err) {
        toast(`تعذر الإرسال: ${err.message || err}`, "error");
      }
    });
  }

  const seedRolesBtn = $("seedRolesBtn");
  if (seedRolesBtn) {
    seedRolesBtn.addEventListener("click", async () => {
      try {
        await postJSON(`${apiBase}/teams/seed`, {});
        toast("تم تفعيل القوالب الجاهزة", "success");
        await Promise.all([loadPermissions(), loadRoles(), loadUsers()]);
      } catch (err) {
        toast(`تعذر تفعيل القوالب: ${err.message || err}`, "error");
      }
    });
  }

  const teamRoleForm = $("teamRoleForm");
  if (teamRoleForm) {
    teamRoleForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(teamRoleForm));
      const selected = Array.from(
        teamRoleForm.querySelectorAll("input[name='permission']:checked")
      ).map((el) => el.value);
      const isEdit = Boolean(data.id);
      try {
        if (isEdit) {
          await postJSON(`${apiBase}/teams/roles/${data.id}`, {
            name: data.name,
            description: data.description,
            permissions: selected,
          });
          toast("تم تحديث الدور", "success");
        } else {
          await postJSON(`${apiBase}/teams/roles`, {
            name: data.name,
            description: data.description,
            permissions: selected,
          });
          toast("تم إنشاء الدور", "success");
        }
        teamRoleForm.reset();
        closeModal("modalTeamRole");
        await loadRoles();
      } catch (err) {
        toast(`تعذر إنشاء الدور: ${err.message || err}`, "error");
      }
    });
  }

  const teamUserForm = $("teamUserForm");
  if (teamUserForm) {
    teamUserForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(teamUserForm));
      const isEdit = Boolean(data.id);
      try {
        if (isEdit) {
          await postJSON(`${apiBase}/teams/users/${data.id}`, {
            fullName: data.fullName,
            email: data.email,
            phone: data.phone || null,
            roleId: data.roleId,
            isActive: data.isActive === "true",
          });
          toast("تم تحديث المستخدم", "success");
        } else {
          await postJSON(`${apiBase}/teams/users`, {
            fullName: data.fullName,
            email: data.email,
            phone: data.phone || null,
            roleId: data.roleId,
          });
          toast("تم إنشاء المستخدم", "success");
        }
        teamUserForm.reset();
        closeModal("modalTeamUser");
        await loadUsers();
      } catch (err) {
        toast(`تعذر إنشاء المستخدم: ${err.message || err}`, "error");
      }
    });
  }

  const resetForm = $("resetDataForm");
  if (resetForm) {
    const phraseUpdate = () => syncResetModal();
    resetForm.addEventListener("change", phraseUpdate);
    resetForm.addEventListener("input", phraseUpdate);
    resetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(resetForm));
      const ackBackup = $("ackBackup")?.checked;
      const ackIrreversible = $("ackIrreversible")?.checked;
      const mode = data.mode || "transactions";
      const phrase = resetPhrases[mode] || resetPhrases.transactions;
      if ((data.confirmText || "").trim() !== phrase) {
        toast("عبارة التأكيد غير مطابقة.", "error");
        return;
      }
      if (!ackBackup || !ackIrreversible) {
        toast("يرجى تأكيد جميع الخانات قبل المتابعة.", "error");
        return;
      }
      try {
        await postJSON(`${apiBase}/settings/reset`, {
          mode,
          confirmText: data.confirmText,
        });
        toast("تمت إعادة تعيين البيانات بنجاح", "success");
        resetForm.reset();
        closeModal("modalResetData");
        await loadAll();
      } catch (err) {
        toast(`تعذر إعادة التعيين: ${err.message || err}`, "error");
      }
    });
  }

  const restoreForm = $("restoreBackupForm");
  if (restoreForm) {
    const toggle = () => {
      const text = $("restoreConfirmText")?.value?.trim();
      const ack = $("ackRestoreRisk")?.checked;
      $("restoreConfirmBtn").disabled = !(text === "استعادة النسخة" && ack);
    };
    restoreForm.addEventListener("input", toggle);
    restoreForm.addEventListener("change", toggle);
    restoreForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(restoreForm));
      if ((data.confirmText || "").trim() !== "استعادة النسخة") {
        toast("عبارة التأكيد غير مطابقة.", "error");
        return;
      }
      if (!$("ackRestoreRisk")?.checked) {
        toast("يرجى تأكيد فهم المخاطر.", "error");
        return;
      }
      try {
        await postJSON(`${apiBase}/backup/history/${data.backupId}/restore`, {});
        toast("تمت استعادة النسخة بنجاح", "success");
        closeModal("modalRestoreBackup");
        await loadAll();
      } catch (err) {
        toast(`تعذر الاستعادة: ${err.message || err}`, "error");
      }
    });
  }

  const uploadRestoreForm = $("uploadRestoreForm");
  if (uploadRestoreForm) {
    const toggle = () => {
      const text = $("uploadRestoreConfirmText")?.value?.trim();
      const ack = $("ackUploadRestoreRisk")?.checked;
      $("uploadRestoreConfirmBtn").disabled = !(text === "استعادة النسخة" && ack);
    };
    uploadRestoreForm.addEventListener("input", toggle);
    uploadRestoreForm.addEventListener("change", toggle);
    uploadRestoreForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fileInput = $("backupFileInput");
      const file = fileInput?.files?.[0];
      if (!file) {
        toast("يرجى اختيار ملف النسخة.", "error");
        return;
      }
      if (!file.name.toLowerCase().endsWith(".sql")) {
        toast("يسمح فقط بملفات .sql", "error");
        return;
      }
      if (($("uploadRestoreConfirmText")?.value || "").trim() !== "استعادة النسخة") {
        toast("عبارة التأكيد غير مطابقة.", "error");
        return;
      }
      if (!$("ackUploadRestoreRisk")?.checked) {
        toast("يرجى تأكيد فهم المخاطر.", "error");
        return;
      }

      try {
        const formData = new FormData();
        formData.append("backupFile", file);
        await postForm(`${apiBase}/backup/restore-upload`, formData);
        toast("تمت استعادة النسخة بنجاح", "success");
        closeModal("modalUploadRestore");
        await loadAll();
      } catch (err) {
        toast(`تعذر الاستعادة: ${err.message || err}`, "error");
      }
    });
  }
}

async function loadDashboard() {
  await Promise.all([loadAlerts(), loadLatestSales(), loadKpis()]);
}

async function loadAll() {
  await loadDashboard();
  await loadPermissions();
  await Promise.all([
    loadAccounts(),
    loadJournal(),
    loadWarehouses(),
    loadItems(),
    loadInventoryReport(),
    loadInventoryMovements(),
    loadSalesInvoices(),
    loadPurchaseInvoices(),
    loadProductionOrders(),
    loadVehicles(),
    loadCustomers(),
    loadSuppliers(),
    loadMessages(),
    loadReports(),
    loadBackupHistory(),
    loadRoles(),
    loadUsers(),
  ]);
}

function setInitialPage() {
  const page = (window.location.hash || "").replace("#", "");
  if (page && pageMeta[page]) setPage(page);
  else setPage("dashboard");
}

window.addEventListener("hashchange", () => {
  const page = (window.location.hash || "").replace("#", "");
  if (page && pageMeta[page]) setPage(page);
});

window.addEventListener("resize", () => {
  const dropdown = $("profileDropdown");
  const menu = $("profileMenu");
  if (dropdown && menu && menu.classList.contains("open")) {
    clampDropdown(dropdown);
  }
  const notifDropdown = $("notifDropdown");
  const notifMenu = $("notifMenu");
  if (notifDropdown && notifMenu && notifMenu.classList.contains("open")) {
    clampDropdown(notifDropdown, "translateX(-50%)");
  }
});

setInitialPage();
bindForms();
initSubtabs();
initMobileNav();
initSidebarCollapse();
syncStickyActions();
loadAll();
