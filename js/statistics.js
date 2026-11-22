"use strict";
/* Finance Manager - Thống kê theo danh mục / khoảng thời gian. CHỈ ĐỌC IndexedDB. */
(() => {
  const el = id => document.getElementById(id);
  let requestId = 0;

  const localMonth = () => {
    const date = new Date();
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
  };
  const monthValid = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
  const dateValid = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return year >= 1900 && year <= 2100 &&
      date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month &&
      date.getUTCDate() === day;
  };
  const yValid = value => /^\d{4}$/.test(String(value)) && Number(value) >= 1900 && Number(value) <= 2100;
  const endOfMonth = (year, month) => String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0");
  const pad = number => String(number).padStart(2, "0");

  function resolvePeriod() {
    const mode = el("stats-period").value;
    const yearValue = el("stats-year").value.trim();
    const year = Number(yearValue);
    const fromTo = (start, end, description) => ({ start, end, description });
    const monthRange = value => {
      if (!monthValid(value)) throw new Error("Tháng thống kê không hợp lệ.");
      const [y, m] = value.split("-").map(Number);
      if (!yValid(String(y).padStart(4, "0"))) throw new Error("Năm thống kê phải từ 1900 đến 2100.");
      return fromTo(value + "-01", `${value}-${endOfMonth(y, m)}`, `tháng ${pad(m)}/${y}`);
    };
    if (mode === "month") return monthRange(el("stats-month").value);
    if (mode === "all") return fromTo(null, null, "toàn bộ thời gian có dữ liệu");
    if (mode === "custom") {
      const start = el("stats-from").value;
      const end = el("stats-to").value;
      if (!dateValid(start) || !dateValid(end)) throw new Error("Vui lòng chọn hai ngày hợp lệ.");
      if (start > end) throw new Error("Ngày bắt đầu phải trước hoặc trùng ngày kết thúc.");
      return fromTo(start, end, `từ ${start.slice(8,10)}/${start.slice(5,7)}/${start.slice(0,4)} đến ${end.slice(8,10)}/${end.slice(5,7)}/${end.slice(0,4)}`);
    }
    if (!yValid(yearValue)) throw new Error("Năm thống kê phải từ 1900 đến 2100.");
    if (mode === "year") return fromTo(`${year}-01-01`, `${year}-12-31`, `năm ${year}`);
    if (mode === "half1") return fromTo(`${year}-01-01`, `${year}-06-30`, `6 tháng đầu năm ${year}`);
    if (mode === "half2") return fromTo(`${year}-07-01`, `${year}-12-31`, `6 tháng cuối năm ${year}`);
    if (mode === "quarter") {
      const q = Number(el("stats-quarter").value);
      if (![1, 2, 3, 4].includes(q)) throw new Error("Quý thống kê không hợp lệ.");
      const m1 = (q - 1) * 3 + 1;
      const m2 = m1 + 2;
      return fromTo(`${year}-${pad(m1)}-01`, `${year}-${pad(m2)}-${endOfMonth(year,m2)}`, `quý ${q} năm ${year}`);
    }
    throw new Error("Chế độ thống kê không được hỗ trợ.");
  }

  function updatePeriodFields() {
    const mode = el("stats-period").value;
    el("stats-month-field").hidden = mode !== "month";
    el("stats-year-field").hidden = !["quarter", "half1", "half2", "year"].includes(mode);
    el("stats-quarter-field").hidden = mode !== "quarter";
    el("stats-custom-fields").hidden = mode !== "custom";
  }

  const money = amount => FinanceCalculator.formatMoney(amount);
  const safeSum = (a, b) => {
    const value = a + b;
    if (!Number.isSafeInteger(value)) throw new Error("Tổng tiền vượt giới hạn số nguyên an toàn.");
    return value;
  };

  function aggregate(transactions, categories, type) {
    const index = new Map(categories.map(category => [category.id, category]));
    const totals = new Map();
    let total = 0;
    for (const tx of transactions) {
      if (tx.type !== type) continue;
      if (!Number.isSafeInteger(tx.amount) || tx.amount <= 0) {
        throw new Error("Có giao dịch với số tiền không hợp lệ.");
      }
      const category = index.get(tx.categoryId);
      // Danh mục cũ đã lưu trữ vẫn giữ nguyên tên. ID lạ/sai loại -> Không phân loại.
      const key = category && category.type === type ? String(category.id) : "__unclassified__";
      const name = key === "__unclassified__" ? "Không phân loại" : String(category.name || "Danh mục chưa đặt tên");
      const current = totals.get(key) || { key, name, amount: 0, count: 0 };
      current.amount = safeSum(current.amount, tx.amount);
      current.count++;
      totals.set(key, current);
      total = safeSum(total, tx.amount);
    }
    return { total, entries: [...totals.values()].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, "vi")) };
  }

  function showRows(target, result, mode) {
    target.replaceChildren();
    if (result.total === 0) {
      const empty = document.createElement("p");
      empty.className = "fm-stats-empty";
      empty.textContent = mode === "expense" ? "Không có chi tiêu trong khoảng thời gian này." : "Không có thu nhập trong khoảng thời gian này.";
      target.appendChild(empty);
      return;
    }
    for (const item of result.entries) {
      const row = document.createElement("div");
      row.className = "fm-stats-item";
      const header = document.createElement("div");
      header.className = "fm-stats-item-head";
      const name = document.createElement("strong");
      name.textContent = item.name;
      const meta = document.createElement("span");
      const percentage = item.amount / result.total * 100;
      meta.textContent = `${money(item.amount)} · ${percentage.toLocaleString("vi-VN", {minimumFractionDigits: 1,maximumFractionDigits: 1})}%`;
      header.append(name, meta);
      const track = document.createElement("div");
      track.className = "fm-stats-track";
      const bar = document.createElement("div");
      bar.className = "fm-stats-bar " + mode;
      bar.style.width = Math.max(0, Math.min(100, percentage)) + "%";
      bar.setAttribute("aria-label", item.name + ": " + percentage.toFixed(1) + "%");
      track.appendChild(bar);
      const count = document.createElement("small");
      count.textContent = item.count + " giao dịch";
      row.append(header, track, count);
      target.appendChild(row);
    }
  }

  async function renderCategoryStatistics() {
    const expenseBox = el("stats-expense-list");
    const incomeBox = el("stats-income-list");
    if (!expenseBox || !incomeBox || !el("stats-period")) return;
    const currentId = ++requestId;
    expenseBox.textContent = "Đang tải thống kê...";
    incomeBox.textContent = "Đang tải thống kê...";
    try {
      const period = resolvePeriod();
      // Một snapshot nhất quán của tài khoản và giao dịch; danh mục chỉ làm nhãn thống kê.
      const [snapshot, categories] = await Promise.all([
        FinanceDB.getFinancialSnapshot(),
        FinanceDB.getAll("categories")
      ]);
      if (currentId !== requestId) return;
      const inPeriod = snapshot.transactions.filter(tx =>
        tx.deletedAt == null &&
        typeof tx.date === "string" &&
        dateValid(tx.date) &&
        (period.start === null || tx.date >= period.start) &&
        (period.end === null || tx.date <= period.end) &&
        (tx.type === "expense" || tx.type === "income")
      );
      const expenses = aggregate(inPeriod, categories, "expense");
      const incomes = aggregate(inPeriod, categories, "income");
      const net = safeSum(incomes.total, -expenses.total);
      el("stats-total-income").textContent = money(incomes.total);
      el("stats-total-expense").textContent = money(expenses.total);
      el("stats-net").textContent = money(net);
      showRows(expenseBox, expenses, "expense");
      showRows(incomeBox, incomes, "income");
      el("stats-data-note").textContent = `Đang xem ${period.description}. Chỉ tính giao dịch còn hiệu lực; chuyển tiền nội bộ không tính vào Thu/Chi.`;
      if (window.FinanceCompactLayout) {
        await window.FinanceCompactLayout.renderStatisticsVisuals({snapshot, categories, period});
      }
    } catch (error) {
      if (currentId !== requestId) return;
      console.error("[Statistics] Lỗi thống kê danh mục:", error);
      expenseBox.textContent = "Không thể tải thống kê. Vui lòng thử lại.";
      incomeBox.textContent = "Không thể tải thống kê. Vui lòng thử lại.";
      for (const id of ["stats-total-income", "stats-total-expense", "stats-net"]) el(id).textContent = "—";
      el("stats-data-note").textContent = String(error.message || "Không thể đọc dữ liệu cho khoảng thời gian đã chọn.");
      const insight = el("fm-insight-list");
      if (insight) insight.textContent = "Vui lòng chọn khoảng thời gian hợp lệ để xem nhận xét.";
    }
  }

  function init() {
    const monthInput = el("stats-month");
    const periodInput = el("stats-period");
    if (!monthInput || !periodInput) return;
    if (!monthValid(monthInput.value)) monthInput.value = localMonth();
    const currentYear = String(new Date().getFullYear());
    if (!yValid(el("stats-year").value)) el("stats-year").value = currentYear;
    if (!dateValid(el("stats-from").value)) el("stats-from").value = currentYear + "-01-01";
    if (!dateValid(el("stats-to").value)) el("stats-to").value = localMonth() + "-" + endOfMonth(Number(currentYear), Number(localMonth().slice(5)));
    const update = () => { updatePeriodFields(); void renderCategoryStatistics(); };
    periodInput.addEventListener("change", update);
    for (const id of ["stats-month", "stats-year", "stats-quarter", "stats-from", "stats-to"]) {
      el(id).addEventListener("change", () => { void renderCategoryStatistics(); });
    }
    updatePeriodFields();
  }
  window.FinanceStatistics = { resolvePeriod };
  window.renderCategoryStatistics = renderCategoryStatistics;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
