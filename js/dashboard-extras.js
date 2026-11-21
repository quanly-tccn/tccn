/* FINANCE MANAGER 1.1 — Phím tắt giao dịch và nhận xét tài chính.
   Chỉ đọc dữ liệu. Không thay đổi IndexedDB hoặc thuật toán số dư. */
"use strict";
(() => {
  let insightSerial = 0;
  const $ = id => document.getElementById(id);
  const formatMoney = n => FinanceCalculator.formatMoney(n);
  const safeAdd = (a, b) => {
    const result = a + b;
    if (!Number.isSafeInteger(result)) throw new Error("Tổng tiền vượt số nguyên an toàn");
    return result;
  };
  function makeInsight(symbol, message, tone = "neutral") {
    const row = document.createElement("div");
    row.className = "fm-insight-row fm-insight-" + tone;
    const icon = document.createElement("span");
    icon.className = "fm-insight-icon";
    icon.textContent = symbol;
    icon.setAttribute("aria-hidden", "true");
    const text = document.createElement("p");
    text.textContent = message;
    row.append(icon, text);
    return row;
  }
  function validMonth(value) {
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
  }
  function priorMonth(month) {
    const [year, mm] = month.split("-").map(Number);
    const d = new Date(Date.UTC(year, mm - 2, 1));
    return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
  }
  function samePeriod(a, b) {
    return a?.start === b?.start && a?.end === b?.end && a?.description === b?.description;
  }
  function isValidIsoDate(v) {
    return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  }
  async function renderInsights(snapshot, periodArg, knownCategories = null) {
    // Lời gọi cũ từ Dashboard dùng chuỗi YYYY-MM: bỏ qua vì khối
    // Nhận xét đã chuyển sang Thống kê và dùng bộ lọc đa kỳ.
    if (typeof periodArg === "string") return;
    const period = periodArg;
    const output = $("fm-insight-list");
    if (!output || !period || !window.FinanceStatistics ||
        !$("page-statistics")?.classList.contains("active")) return;
    const serial = ++insightSerial;
    const rangeValid = (period.start === null || isValidIsoDate(period.start)) &&
                       (period.end === null || isValidIsoDate(period.end));
    if (!rangeValid || (period.start && period.end && period.start > period.end)) return;
    output.textContent = "Đang tổng hợp nhận xét...";
    const expensesByCategory = new Map();
    const sums = {income: 0, expense: 0};
    let transactionCount = 0;
    for (const tx of snapshot.transactions) {
      if (tx.deletedAt != null || !["income", "expense"].includes(tx.type)) continue;
      if (!isValidIsoDate(tx.date) || (period.start && tx.date < period.start) ||
          (period.end && tx.date > period.end)) continue;
      if (!Number.isSafeInteger(tx.amount) || tx.amount <= 0) {
        throw new Error("Số tiền giao dịch không hợp lệ");
      }
      transactionCount++;
      sums[tx.type] = safeAdd(sums[tx.type], tx.amount);
      if (tx.type === "expense") {
        const key = tx.categoryId || "__uncategorized__";
        expensesByCategory.set(key, safeAdd(expensesByCategory.get(key) || 0, tx.amount));
      }
    }
    const categories = knownCategories || await FinanceDB.getAll("categories");
    if (serial !== insightSerial || !$("page-statistics")?.classList.contains("active")) return;
    let currentPeriod;
    try { currentPeriod = window.FinanceStatistics.resolvePeriod(); } catch { return; }
    if (!samePeriod(currentPeriod, period)) return;
    const categoryNames = new Map(categories.map(c => [c.id, c]));
    const nodes = [];
    const label = String(period.description || "giai đoạn đã chọn");
    if (transactionCount === 0) {
      nodes.push(makeInsight("ℹ️", `Chưa có khoản Thu hoặc Chi trong ${label}.`, "neutral"));
    } else {
      const net = safeAdd(sums.income, -sums.expense);
      if (net > 0) nodes.push(makeInsight("✓", "Thu lớn hơn chi " + formatMoney(net) + " trong " + label + ".", "positive"));
      else if (net < 0) nodes.push(makeInsight("!", "Chi lớn hơn thu " + formatMoney(-net) + " trong " + label + ".", "warning"));
      else nodes.push(makeInsight("=", "Tổng thu và tổng chi bằng nhau trong " + label + ".", "neutral"));
      if (sums.expense > 0 && expensesByCategory.size) {
        const [id, amount] = [...expensesByCategory].sort((a,b) => b[1]-a[1])[0];
        const category = categoryNames.get(id);
        const name = id === "__uncategorized__" || !category || category.type !== "expense"
          ? "Không phân loại" : String(category.name || "Không phân loại");
        const percentage = (amount / sums.expense * 100).toLocaleString("vi-VN", {maximumFractionDigits: 1});
        nodes.push(makeInsight("▰", `Khoản chi lớn nhất: ${name} — ${formatMoney(amount)} (${percentage}% tổng chi).`, "neutral"));
      }
      if (sums.income > 0) {
        const pct = sums.expense / sums.income * 100;
        const labelPct = pct.toLocaleString("vi-VN", {maximumFractionDigits:1});
        nodes.push(makeInsight("◉", `Tổng chi bằng ${labelPct}% tổng thu trong ${label}.`, pct > 100 ? "warning" : "neutral"));
      } else if (sums.expense > 0) {
        nodes.push(makeInsight("ℹ️", "Chưa có khoản thu trong giai đoạn này; chưa thể tính tỷ lệ chi/thu.", "neutral"));
      }
    }
    output.replaceChildren(...nodes);
  }
  function goToNewTransaction(type) {
    if (typeof window.navigateTo !== "function") {
      console.error("[Quick Actions] Chưa có hàm navigateTo");
      return;
    }
    if (typeof transactionSaving !== "undefined" && transactionSaving) {
      alert("Hãy hoàn tất thao tác lưu giao dịch hiện tại trước.");
      return;
    }
    if (typeof editingTransactionId !== "undefined" && editingTransactionId) {
      if (!confirm("Bạn đang chỉnh sửa giao dịch khác. Hủy thay đổi đang nhập để tạo giao dịch mới?")) return;
    }
    const form = $("transaction-form");
    const hasUnsavedDraft = form && (($("tx-amount")?.value || "").trim() || ($("tx-note")?.value || "").trim());
    if ((typeof editingTransactionId === "undefined" || !editingTransactionId) && hasUnsavedDraft) {
      if (!confirm("Biểu mẫu Giao dịch đang có nội dung chưa lưu. Xóa nội dung đó để tạo giao dịch mới?")) return;
    }
    if (typeof resetTransactionForm === "function") resetTransactionForm();
    window.navigateTo("transactions");
    const radio = document.querySelector(`input[name="tx-kind"][value="${type}"]`);
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event("change", {bubbles:true}));
    } else {
      const select = $("tx-type");
      if (select) { select.value = type; select.dispatchEvent(new Event("change", {bubbles:true})); }
    }
    $("transaction-form")?.scrollIntoView({behavior:"smooth", block:"start"});
    $("tx-amount")?.focus({preventScroll:true});
  }
  function initActions() {
    document.querySelectorAll("[data-fm-quick-kind]").forEach(button => {
      if (button.dataset.fmQuickBound === "1") return;
      button.dataset.fmQuickBound = "1";
      button.addEventListener("click", () => goToNewTransaction(button.dataset.fmQuickKind));
    });
  }
  window.FinanceDashboardExtras = {renderInsights, initActions};
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initActions, {once:true});
  } else initActions();
})();
