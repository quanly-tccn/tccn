/* Finance Manager 1.1 — biểu đồ Thu/Chi theo ngày và cơ cấu chi tiêu.
   Chỉ đọc IndexedDB, không thêm/sửa/xóa giao dịch. */
"use strict";
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const palette = ["#2563eb", "#f59e0b", "#22c55e", "#a855f7", "#ef4444", "#06b6d4", "#64748b", "#e879f9"];
  let serial = 0;
  const money = n => FinanceCalculator.formatMoney(n);
  const el = id => document.getElementById(id);
  const safeAdd = (a, b) => {
    const result = a + b;
    if (!Number.isSafeInteger(result)) throw new Error("Số tiền trong biểu đồ vượt phạm vi an toàn.");
    return result;
  };
  function svgEl(tag, props = {}, text) {
    const node = document.createElementNS(NS, tag);
    Object.entries(props).forEach(([k, v]) => node.setAttribute(k, String(v)));
    if (text !== undefined) node.textContent = String(text);
    return node;
  }
  function showError(id, text) {
    const box = el(id);
    if (!box) return;
    box.replaceChildren();
    const p = document.createElement("p");
    p.className = "fm-chart-empty";
    p.textContent = text;
    box.appendChild(p);
  }
  function dailySeries(transactions, month) {
    const [year, m] = month.split("-").map(Number);
    const length = new Date(year, m, 0).getDate();
    const days = Array.from({length}, (_, i) => ({day: i + 1, income: 0, expense: 0}));
    for (const tx of transactions) {
      if (tx.deletedAt != null || !tx.date?.startsWith(month + "-")) continue;
      if (!["income", "expense"].includes(tx.type)) continue;
      if (!Number.isSafeInteger(tx.amount) || tx.amount <= 0) throw new Error("Số tiền giao dịch không hợp lệ.");
      const d = Number(tx.date.slice(8, 10));
      if (d < 1 || d > length) continue;
      days[d - 1][tx.type] = safeAdd(days[d - 1][tx.type], tx.amount);
    }
    return days;
  }
  function renderDaily(transactions, month) {
    const container = el("fm-daily-chart");
    if (!container) return;
    container.replaceChildren();
    const series = dailySeries(transactions, month);
    const max = Math.max(0, ...series.flatMap(row => [row.income, row.expense]));
    if (!max) return showError("fm-daily-chart", "Chưa có giao dịch Thu/Chi trong tháng này.");
    const W = 940, H = 286, left = 79, right = 15, top = 18, bottom = 35;
    const plotW = W - left - right, plotH = H - top - bottom;
    const chart = svgEl("svg", {viewBox:`0 0 ${W} ${H}`, role:"img", "aria-label":`Biểu đồ thu nhập và chi tiêu theo ngày trong tháng ${month}`, preserveAspectRatio:"xMidYMid meet"});
    const cap = max * 1.07;
    const gridCount = 4;
    for (let i = 0; i <= gridCount; i++) {
      const value = cap * i / gridCount;
      const y = top + plotH * (1 - i / gridCount);
      chart.appendChild(svgEl("line", {x1:left, y1:y, x2:W-right, y2:y, stroke:"#e2e8f0", "stroke-width":1}));
      chart.appendChild(svgEl("text", {x:left-9, y:y+4, "text-anchor":"end", fill:"#64748b", "font-size":12}, new Intl.NumberFormat("vi-VN", {notation:"compact", maximumFractionDigits:1}).format(value)));
    }
    const step = plotW / series.length;
    const barW = Math.min(12, step * 0.33);
    series.forEach((row, index) => {
      const xCenter = left + index*step + step/2;
      for (const [key, color, offset] of [["income", "#22c55e", -barW-1], ["expense", "#f87171", 1]]) {
        const height = row[key] / cap * plotH;
        const bar = svgEl("rect", {x:xCenter+offset, y:top+plotH-height, width:barW, height:height, rx:2, fill:color});
        bar.appendChild(svgEl("title", {}, `Ngày ${String(row.day).padStart(2,"0")}: ${key === "income" ? "Thu" : "Chi"} ${money(row[key])}`));
        chart.appendChild(bar);
      }
      if (row.day === 1 || row.day % 5 === 0 || row.day === series.length) {
        chart.appendChild(svgEl("text", {x:xCenter, y:H-12, "text-anchor":"middle", fill:"#64748b", "font-size":12}, String(row.day).padStart(2, "0")));
      }
    });
    container.appendChild(chart);
  }
  function categoriesSummary(transactions, categories, month) {
    const byId = new Map(categories.map(cat => [cat.id, cat]));
    const amounts = new Map();
    let total = 0;
    for (const tx of transactions) {
      if (tx.deletedAt != null || tx.type !== "expense" || !tx.date?.startsWith(month + "-")) continue;
      if (!Number.isSafeInteger(tx.amount) || tx.amount <= 0) throw new Error("Số tiền giao dịch không hợp lệ.");
      const category = byId.get(tx.categoryId);
      const key = category?.type === "expense" ? String(category.id) : "__none__";
      const name = key === "__none__" ? "Không phân loại" : String(category.name || "Danh mục chưa đặt tên");
      const old = amounts.get(key) || {name, amount:0};
      old.amount = safeAdd(old.amount, tx.amount);
      amounts.set(key, old);
      total = safeAdd(total, tx.amount);
    }
    const entries = [...amounts.values()].sort((a,b) => b.amount-a.amount || a.name.localeCompare(b.name,"vi"));
    return {total, entries};
  }
  function renderCategoryDonut(transactions, categories, month) {
    const container = el("fm-category-chart");
    if (!container) return;
    container.replaceChildren();
    const {total, entries} = categoriesSummary(transactions, categories, month);
    if (!total) return showError("fm-category-chart", "Chưa có chi tiêu trong tháng này.");
    // Gộp các danh mục nhỏ vào "Khác" khi có quá 7 nhóm.
    const shown = entries.length > 8
      ? [...entries.slice(0,7), {name:"Các danh mục khác", amount:entries.slice(7).reduce((sum,x)=>safeAdd(sum,x.amount),0)}]
      : entries;
    const wrapper = document.createElement("div");
    wrapper.className = "fm-donut-layout";
    const donut = document.createElement("div");
    donut.className = "fm-donut";
    donut.setAttribute("role","img");
    donut.setAttribute("aria-label", `Cơ cấu chi tiêu: ${shown.map(e=>e.name + " " + (e.amount/total*100).toFixed(1) + "%").join(", ")}`);
    let fraction = 0;
    const stops = shown.map((item,index) => {
      const from = fraction;
      fraction += item.amount/total*100;
      return `${palette[index%palette.length]} ${from.toFixed(6)}% ${fraction.toFixed(6)}%`;
    });
    donut.style.background = `conic-gradient(${stops.join(", ")})`;
    const center = document.createElement("div");
    center.className = "fm-donut-center";
    const caption = document.createElement("small"); caption.textContent = "Tổng chi";
    const amount = document.createElement("strong"); amount.textContent = money(total);
    center.append(caption,amount); donut.appendChild(center);
    const legend = document.createElement("div"); legend.className = "fm-donut-legend";
    shown.forEach((item,index) => {
      const row = document.createElement("div"); row.className = "fm-donut-legend-row";
      const label = document.createElement("span"); label.className = "fm-donut-legend-label";
      const dot = document.createElement("i"); dot.style.background = palette[index%palette.length];
      const name = document.createElement("span"); name.textContent = item.name;
      const value = document.createElement("strong");
      value.textContent = (item.amount/total*100).toLocaleString("vi-VN", {minimumFractionDigits:1,maximumFractionDigits:1}) + "%";
      value.title = money(item.amount);
      label.append(dot,name); row.append(label,value); legend.appendChild(row);
    });
    wrapper.append(donut, legend); container.appendChild(wrapper);
  }
  async function render(snapshot, month) {
    const token = ++serial;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return;
    const transactions = snapshot.transactions;
    // Vẽ biểu đồ theo ngày ngay, danh mục đọc thêm một lần từ IndexedDB.
    try { renderDaily(transactions,month); }
    catch(e) {console.error("[Dashboard daily]",e);showError("fm-daily-chart","Không thể tính biểu đồ theo ngày.");}
    if (!el("fm-category-chart")) return;
    try {
      const categories = await FinanceDB.getAll("categories");
      // Kiểm tra tháng của chính trang đang chứa biểu đồ.
      // Không dùng bộ chọn tháng nhận xét ở trang Thống kê để chặn Dashboard.
      const chartPage = el("fm-category-chart")?.closest(".page")?.id;
      const selectedMonth = chartPage === "page-dashboard"
        ? el("dashboard-month")?.value
        : el("fm-analytics-month")?.value;
      if (token !== serial || selectedMonth !== month) return;
      renderCategoryDonut(transactions,categories,month);
    } catch(e) {
      if (token !== serial) return;
      console.error("[Dashboard categories]",e);
      showError("fm-category-chart", "Không thể tải cơ cấu chi tiêu.");
    }
  }
  window.FinanceDashboardVisuals = {render};
})();
