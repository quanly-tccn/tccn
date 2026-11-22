/* Finance Manager 1.2 - Canh bao ngan sach (doc-only).
   Dung cung settings/transactions/categories voi budgets.js.
   Khong thay doi du lieu hay so du. */
"use strict";
(() => {
  const PREFIX = "fm:budget:v1:";
  const $ = id => document.getElementById(id);
  const money = value => new Intl.NumberFormat("vi-VN").format(value) + " đ";
  const currentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  let previous = null; // baseline: khong thong bao lan dau khi mo trang
  let lastMonth = null;
  let requestNumber = 0;
  let refreshPending = false;
  let scheduled = false;
  let lastEventStore = null;
  let toastTimeout = null;

  function levelOf(used, limit) {
    if (used >= limit) return 2;
    if (used * 5 >= limit * 4) return 1;
    return 0;
  }

  async function readCurrentAlerts(month) {
    const [settings, transactions, categories] = await Promise.all([
      FinanceDB.getAll("settings"),
      FinanceDB.getAll("transactions"),
      FinanceDB.getAll("categories")
    ]);
    const labels = new Map(categories.map(c => [c.id, c.name]));
    const budgetPrefix = PREFIX + month + ":";
    const budgets = settings.filter(item =>
      typeof item.key === "string" &&
      item.key.startsWith(budgetPrefix) &&
      Number.isSafeInteger(item.limit) && item.limit > 0
    );
    const spent = new Map();
    for (const tx of transactions) {
      if (tx.type !== "expense" || tx.deletedAt != null || !tx.categoryId ||
          typeof tx.date !== "string" || !tx.date.startsWith(month + "-")) continue;
      if (!Number.isSafeInteger(tx.amount) || tx.amount <= 0) {
        throw new Error("Có giao dịch chi tiêu với số tiền không hợp lệ.");
      }
      const sum = (spent.get(tx.categoryId) || 0) + tx.amount;
      if (!Number.isSafeInteger(sum)) throw new Error("Tổng chi vượt giới hạn số nguyên an toàn.");
      spent.set(tx.categoryId, sum);
    }
    return budgets.map(b => {
      const categoryId = b.categoryId || b.key.slice(budgetPrefix.length);
      const used = spent.get(categoryId) || 0;
      return {
        id: b.key, categoryId,
        name: labels.get(categoryId) || "Danh mục đã lưu trữ",
        used, limit: b.limit, level: levelOf(used, b.limit)
      };
    }).sort((a, b) => b.level - a.level || b.used / b.limit - a.used / a.limit);
  }

  // Badge nam ngay trong nut dieu huong Ngan sach; khong tao chuong rieng.
  function install() {
    const navButton = document.querySelector('.sidebar-nav .nav-item[data-page="budgets"]');
    const budgetPage = document.getElementById('page-budgets');
    if (!navButton || !budgetPage) return false;

    if (!$('fm-budget-alert-badge')) {
      const count = document.createElement('span');
      count.id = 'fm-budget-alert-badge';
      count.className = 'fm-budget-alert-badge';
      count.hidden = true;
      count.setAttribute('aria-hidden', 'true');
      navButton.appendChild(count);
    }

    if (!$('fm-alert-panel')) {
      const panel = document.createElement('section');
      panel.id = 'fm-alert-panel';
      panel.className = 'fm-alert-panel';
      panel.hidden = true;
      panel.setAttribute('aria-label', 'Danh sách cảnh báo ngân sách');
      const header = document.createElement('div');
      header.className = 'fm-alert-heading';
      const h = document.createElement('strong');
      h.textContent = '⚠️ Cảnh báo ngân sách tháng hiện tại';
      header.appendChild(h);
      const content = document.createElement('div');
      content.id = 'fm-alert-items';
      content.className = 'fm-alert-items';
      panel.append(header, content);
      const toolbar = budgetPage.querySelector('.fm-budget-toolbar');
      if (toolbar) toolbar.insertAdjacentElement('afterend', panel);
      else budgetPage.prepend(panel);
    }

    if (!$('fm-alert-toast')) {
      const toast = document.createElement('div');
      toast.id = 'fm-alert-toast';
      toast.className = 'fm-alert-toast';
      toast.hidden = true;
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    return true;
  }

  function draw(items, month) {
    const warnings = items.filter(i => i.level > 0);
    const count = $("fm-budget-alert-badge");
    const budgetTab = document.querySelector('.sidebar-nav .nav-item[data-page="budgets"]');
    const hasOver = warnings.some(item => item.level === 2);
    if (budgetTab) {
      budgetTab.setAttribute("aria-label", warnings.length
        ? `Ngân sách, ${warnings.length} danh mục cần chú ý`
        : "Ngân sách, không có cảnh báo");
    }
    if (count) {
      count.hidden = warnings.length === 0;
      count.textContent = String(warnings.length);
      count.classList.toggle("over", hasOver);
      count.classList.toggle("near", !hasOver);
    }
    const panel = $("fm-alert-panel");
    if (panel) panel.hidden = warnings.length === 0;
    const box = $("fm-alert-items");
    if (!box) return;
    box.replaceChildren();
    const period = document.createElement("p");
    period.className = "fm-alert-period";
    period.textContent = `Tháng ${month.slice(5)}/${month.slice(0,4)} · ${warnings.length} danh mục cần chú ý`;
    box.appendChild(period);
    if (warnings.length === 0) {
      const empty = document.createElement("p");
      empty.className = "fm-alert-empty";
      empty.textContent = "Chưa có danh mục nào chạm 80% hạn mức tháng này.";
      box.appendChild(empty);
    }
    for (const b of warnings) {
      const item = document.createElement("div");
      item.className = "fm-alert-item " + (b.level === 2 ? "over" : "near");
      const title = document.createElement("strong");
      title.textContent = `${b.level === 2 ? "🔴" : "🟠"} ${b.name}`;
      const desc = document.createElement("span");
      const percent = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(b.used / b.limit * 100);
      const balance = b.limit - b.used;
      desc.textContent = `${percent}% · ${money(b.used)} / ${money(b.limit)} · ` +
        (balance >= 0 ? `Còn ${money(balance)}` : `Vượt ${money(-balance)}`);
      item.append(title, desc);
      box.appendChild(item);
    }
  }

  function showToast(item) {
    const toast = $("fm-alert-toast");
    if (!toast) return;
    const difference = item.limit - item.used;
    toast.className = "fm-alert-toast " + (item.level === 2 ? "over" : "near");
    toast.textContent = item.level === 2
      ? `🔴 ${item.name}: ngân sách đã đạt/vượt hạn mức (${money(item.used)} / ${money(item.limit)}).`
      : `🟠 ${item.name}: đã dùng từ 80% ngân sách. Còn ${money(Math.max(0, difference))}.`;
    toast.hidden = false;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toast.hidden = true; }, 6500);
  }

  async function refresh(trigger = null) {
    install();
    const token = ++requestNumber;
    const month = currentMonth();
    try {
      const items = await readCurrentAlerts(month);
      if (token !== requestNumber) return;
      const now = new Map(items.map(item => [item.id, item.level]));
      // Khi khoi dong / doi thang: chi cap nhat badge, khong bung thong bao cu.
      if (previous !== null && lastMonth === month && trigger === "transactions") {
        const crossed = items.filter(item =>
          item.level > 0 && item.level > (previous.get(item.id) ?? item.level)
        );
        // Toi da 1 toast / lan ghi; trang Ngan sach van liet ke tat ca canh bao.
        if (crossed.length) showToast(crossed.sort((a,b) => b.level-a.level)[0]);
      }
      previous = now;
      lastMonth = month;
      draw(items, month);
    } catch (error) {
      console.error("[Budget Alerts] Không tải được cảnh báo:", error);
      const box = $("fm-alert-items");
      if (box) box.textContent = "Không thể cập nhật cảnh báo. Hãy kiểm tra lại dữ liệu.";
    }
  }

  function schedule(trigger) {
    if (trigger === "transactions") lastEventStore = "transactions";
    else if (!lastEventStore) lastEventStore = trigger;
    if (scheduled) return;
    scheduled = true;
    // Gom cac su kien ghi tu thao tac thanh cong, khong can refresh lap.
    setTimeout(() => {
      scheduled = false;
      const reason = lastEventStore;
      lastEventStore = null;
      void refresh(reason);
    }, 100);
  }

  function init() {
    install();
    void refresh();
    window.addEventListener("finance:data-changed", event => {
      const store = event.detail?.store;
      if (["transactions", "settings", "categories"].includes(store)) schedule(store);
    });
    // Quay lai ung dung sau khi mo qua dem / cap nhat ngay.
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) schedule("visibility");
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {once: true});
  } else init();
  window.FinanceBudgetAlerts = { refresh };
})();
