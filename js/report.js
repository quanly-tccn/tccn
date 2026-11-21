"use strict";
/* Finance Manager: báo cáo thu chi theo khoảng thời gian, in/lưu PDF từ trình duyệt.
   Chỉ đọc IndexedDB; không sửa dữ liệu. */
(() => {
  const money = value => {
    if (!Number.isSafeInteger(value)) throw new Error("Số tiền không hợp lệ.");
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
  };
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);
  const pad = n => String(n).padStart(2, "0");
  const monthNow = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  };
  const monthValid = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
  const yearValid = value => /^\d{4}$/.test(String(value)) && Number(value) >= 1900 && Number(value) <= 2100;
  const dateValid = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return year >= 1900 && year <= 2100 &&
      date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
  };
  const lastDay = (y, m) => pad(new Date(Date.UTC(y, m, 0)).getUTCDate());
  const viDate = value => `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;

  function resolvePeriod() {
    const mode = document.getElementById("report-period").value;
    const make = (start, end, label) => ({ start, end, label });
    if (mode === "all") return make(null, null, "Toàn bộ thời gian có dữ liệu");
    if (mode === "month") {
      const value = document.getElementById("report-month").value;
      if (!monthValid(value) || !yearValid(value.slice(0, 4))) throw new Error("Tháng báo cáo không hợp lệ.");
      const [y, m] = value.split("-").map(Number);
      return make(value + "-01", value + "-" + lastDay(y, m), `Tháng ${pad(m)}/${y}`);
    }
    if (mode === "custom") {
      const start = document.getElementById("report-from").value;
      const end = document.getElementById("report-to").value;
      if (!dateValid(start) || !dateValid(end)) throw new Error("Vui lòng chọn khoảng ngày hợp lệ.");
      if (start > end) throw new Error("Ngày bắt đầu không được sau ngày kết thúc.");
      return make(start, end, `Từ ${viDate(start)} đến ${viDate(end)}`);
    }
    const yearValue = document.getElementById("report-year").value.trim();
    if (!yearValid(yearValue)) throw new Error("Năm báo cáo phải từ 1900 đến 2100.");
    const year = Number(yearValue);
    if (mode === "year") return make(`${year}-01-01`, `${year}-12-31`, `Năm ${year}`);
    if (mode === "half1") return make(`${year}-01-01`, `${year}-06-30`, `6 tháng đầu năm ${year}`);
    if (mode === "half2") return make(`${year}-07-01`, `${year}-12-31`, `6 tháng cuối năm ${year}`);
    if (mode === "quarter") {
      const q = Number(document.getElementById("report-quarter").value);
      if (![1, 2, 3, 4].includes(q)) throw new Error("Quý báo cáo không hợp lệ.");
      const startMonth = (q - 1) * 3 + 1;
      const endMonth = startMonth + 2;
      return make(`${year}-${pad(startMonth)}-01`, `${year}-${pad(endMonth)}-${lastDay(year, endMonth)}`, `Quý ${q} năm ${year}`);
    }
    throw new Error("Chế độ báo cáo không được hỗ trợ.");
  }

  function updatePeriodFields() {
    const mode = document.getElementById("report-period").value;
    document.getElementById("report-month-field").hidden = mode !== "month";
    document.getElementById("report-year-field").hidden = !["quarter", "half1", "half2", "year"].includes(mode);
    document.getElementById("report-quarter-field").hidden = mode !== "quarter";
    document.getElementById("report-custom-fields").hidden = mode !== "custom";
  }
  function safeSum(total, amount) {
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Có số tiền giao dịch không hợp lệ.");
    const n = total + amount;
    if (!Number.isSafeInteger(n)) throw new Error("Tổng tiền vượt phạm vi cho phép.");
    return n;
  }
  function buildReport(selectedPeriod, snapshot, categories) {
    const accounts = snapshot.accounts;
    const transactions = snapshot.transactions;
    const accountNames = new Map(accounts.map(a => [a.id, a.name]));
    const categoryNames = new Map(categories.map(c => [c.id, c]));
    const categoryName = tx => {
      if (tx.type === "transfer") return "—";
      const cat = categoryNames.get(tx.categoryId);
      return cat && cat.type === tx.type ? String(cat.name || "Danh mục chưa đặt tên") : "Không phân loại";
    };
    const active = transactions.filter(tx => tx.deletedAt == null);
    // Validate all active data against app's financial rules, including transfers.
    FinanceCalculator.calculate(accounts, active);
    const period = active.filter(tx => typeof tx.date === "string" && dateValid(tx.date) &&
      (selectedPeriod.start === null || tx.date >= selectedPeriod.start) &&
      (selectedPeriod.end === null || tx.date <= selectedPeriod.end))
      .sort((a, b) => b.date.localeCompare(a.date) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    let income = 0, expense = 0, transfer = 0;
    for (const tx of period) {
      if (tx.type === "income") income = safeSum(income, tx.amount);
      else if (tx.type === "expense") expense = safeSum(expense, tx.amount);
      else if (tx.type === "transfer") transfer = safeSum(transfer, tx.amount);
    }
    const net = income - expense;
    if (!Number.isSafeInteger(net)) throw new Error("Chênh lệch không hợp lệ.");
    const breakdown = type => {
      const groups = new Map();
      const total = type === "income" ? income : expense;
      for (const tx of period) {
        if (tx.type !== type) continue;
        const category = categoryNames.get(tx.categoryId);
        const valid = category && category.type === type;
        const key = valid ? String(category.id) : "__unclassified__";
        const name = valid ? String(category.name || "Danh mục chưa đặt tên") : "Không phân loại";
        const current = groups.get(key) || { name, amount: 0, count: 0 };
        current.amount = safeSum(current.amount, tx.amount);
        current.count += 1;
        groups.set(key, current);
      }
      const list = [...groups.values()].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, "vi"));
      const transactionCount = list.reduce((sum, item) => sum + item.count, 0);
      const groupTotal = list.reduce((sum, item) => {
        const result = sum + item.amount;
        if (!Number.isSafeInteger(result)) throw new Error("Tổng danh mục vượt phạm vi cho phép.");
        return result;
      }, 0);
      if (groupTotal !== total) throw new Error("Tổng danh mục không khớp với tổng giao dịch.");
      const totalTitle = type === "income" ? "TỔNG THU" : "TỔNG CHI";
      const totalClass = type === "income" ? "income" : "expense";
      const percent = data => (data.amount / total * 100).toLocaleString("vi-VN", {
        minimumFractionDigits: 1, maximumFractionDigits: 1
      }) + "%";
      return '<table class="category-table"><thead><tr><th>Danh mục</th><th>Số giao dịch</th><th>Số tiền</th><th>Tỷ trọng</th></tr></thead><tbody>' +
        (list.length
          ? list.map(data => `<tr><td>${escapeHTML(data.name)}</td><td>${data.count}</td><td class="num">${money(data.amount)}</td><td class="num">${percent(data)}</td></tr>`).join("")
          : '<tr><td colspan="4" class="empty-row">Không có giao dịch trong khoảng thời gian này.</td></tr>') +
        `</tbody><tfoot><tr class="category-total ${totalClass}"><th scope="row">${totalTitle}</th><td>${transactionCount}</td><td class="num">${money(groupTotal)}</td><td class="num">${total ? "100,0%" : "—"}</td></tr></tfoot></table>`;
    };
    const rows = period.map((tx, idx) => {
      const typeText = tx.type === "income" ? "Thu" : tx.type === "expense" ? "Chi" : "Chuyển tiền";
      const from = accountNames.get(tx.accountId) || "(Không rõ tài khoản)";
      const to = tx.type === "transfer" ? " → " + (accountNames.get(tx.toAccountId) || "(Không rõ tài khoản)") : "";
      const signed = tx.type === "expense" ? "−" : tx.type === "income" ? "+" : "";
      const cls = tx.type === "expense" ? "expense" : tx.type === "income" ? "income" : "transfer";
      return `<tr><td>${escapeHTML(tx.date)}</td><td>${typeText}</td>` +
        `<td>${escapeHTML(from + to)}</td><td>${escapeHTML(categoryName(tx))}</td><td>${escapeHTML(tx.note || "—")}</td>` +
        `<td class="num ${cls}">${signed}${money(tx.amount)}</td></tr>`;
    }).join("");
    const styles = `
      :root { color-scheme: light; } * {box-sizing:border-box}
      body {font-family:Arial,"Helvetica Neue",sans-serif;color:#172334;max-width:1000px;margin:0 auto;padding:28px;background:white}
      h1 {margin:0;font-size:24px} .sub {color:#64748b;margin:8px 0 20px;font-size:13px}
      .toolbar {display:flex;gap:10px;margin-bottom:18px;align-items:center;flex-wrap:wrap}
      button {padding:10px 16px;border:0;border-radius:9px;background:#2563eb;color:white;font-weight:700;cursor:pointer}
      .hint {font-size:12px;color:#64748b}
      .summary {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:20px 0}
      .metric {border:1px solid #dbe4ef;border-radius:10px;padding:14px}
      .metric small {display:block;color:#64748b;margin-bottom:8px}
      .metric strong {font-size:19px;white-space:nowrap}
      .income {color:#15803d}.expense {color:#dc2626}.transfer {color:#2563eb}
      table {width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed}
      th {background:#f1f5f9;text-align:left;color:#334155}
      th,td {padding:10px 7px;border-bottom:1px solid #e2e8f0;vertical-align:top;overflow-wrap:anywhere}
      .detail-table th:nth-child(1){width:12%}.detail-table th:nth-child(2){width:10%}
      .detail-table th:nth-child(3){width:23%}.detail-table th:nth-child(4){width:17%}
      .detail-table th:nth-child(5){width:21%}.detail-table th:nth-child(6){width:17%}
      .category-table th:nth-child(1){width:42%}.category-table th:nth-child(2){width:18%}
      .category-table th:nth-child(3){width:24%}.category-table th:nth-child(4){width:16%}
      .report-grid {display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:22px 0}
      .report-grid section {min-width:0}.report-grid h2{font-size:16px;margin:0 0 8px}
      .empty {font-size:12px;color:#64748b}.category-table{font-size:11px}
      .num {text-align:right;font-weight:600;white-space:nowrap}
      /* Đầu cột và giá trị có cùng quy tắc căn lề. */
      .category-table th:nth-child(2),.category-table td:nth-child(2){text-align:center}
      .category-table th:nth-child(3),.category-table td:nth-child(3),
      .category-table th:nth-child(4),.category-table td:nth-child(4),
      .detail-table th:last-child,.detail-table td:last-child{text-align:right}
      .category-table th:nth-child(3),.category-table th:nth-child(4),
      .category-table td:nth-child(3),.category-table td:nth-child(4),
      .detail-table th:last-child,.detail-table td:last-child{white-space:nowrap}
      /* Tổng thu/chi tại cuối bảng: rõ ràng nhưng không lấn át số liệu. */
      .category-table tfoot th,.category-table tfoot td{font-weight:700;border-top:2px solid #cbd5e1;border-bottom:0;padding-top:11px;padding-bottom:11px}
      .category-table tfoot .expense{color:#b91c1c}
      .category-table .category-total.expense{background:#fff1f2;color:#9f1239}
      .category-table .category-total.income{background:#f0fdf4;color:#166534}
      .empty-row{text-align:center!important;color:#64748b;font-style:italic}
      /* Tổng kết dưới bảng giao dịch, tách chuyển nội bộ khỏi thu/chi. */
      .detail-totals{margin-top:14px;border:1px solid #dbe4ef;border-radius:10px;padding:13px 16px;background:#f8fafc;break-inside:avoid}
      .detail-totals h3{margin:0 0 9px;font-size:14px;color:#172334}
      .totals-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid #e2e8f0;font-size:12px}
      .totals-row strong{white-space:nowrap;font-variant-numeric:tabular-nums}
      .totals-row:last-child{border-bottom:0;padding-top:10px;font-weight:700}
      .foot {font-size:11px;color:#64748b;margin-top:16px}
      @page {size:A4; margin:14mm}
      @media print {body{max-width:none;padding:0} .toolbar{display:none!important} .metric{break-inside:avoid} .report-grid section{break-inside:avoid} thead{display:table-header-group}tr{break-inside:avoid}}
      @media(max-width:700px){.summary{grid-template-columns:1fr}.report-grid{grid-template-columns:1fr}body{padding:14px}.wide{overflow-x:auto}.detail-table{min-width:720px}}
    `;
    return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Báo cáo thu chi - ${escapeHTML(selectedPeriod.label)}</title><style>${styles}</style></head><body>` +
      `<div class="toolbar"><button type="button" onclick="window.print()">In / Lưu PDF</button><span class="hint">Trong hộp thoại in, chọn “Lưu dưới dạng PDF” (Save as PDF).</span></div>` +
      `<h1>BÁO CÁO THU CHI</h1><div class="sub">Finance Manager · ${escapeHTML(selectedPeriod.label)} · Xuất ngày ${escapeHTML(new Date().toLocaleString("vi-VN"))}</div>` +
      `<div class="summary"><div class="metric"><small>Tổng thu trong kỳ</small><strong class="income">${money(income)}</strong></div>` +
      `<div class="metric"><small>Tổng chi trong kỳ</small><strong class="expense">${money(expense)}</strong></div>` +
      `<div class="metric"><small>Chênh lệch thu − chi</small><strong>${money(net)}</strong></div></div>` +
      `<p><b>${period.length}</b> giao dịch còn hiệu lực · Tổng tiền chuyển nội bộ: <b>${money(transfer)}</b> (không tính vào thu/chi).</p>` +
      `<div class="report-grid"><section><h2>Chi tiêu theo danh mục</h2>${breakdown("expense")}</section>` +
      `<section><h2>Thu nhập theo danh mục</h2>${breakdown("income")}</section></div>` +
      `<h2 style="font-size:17px">Chi tiết giao dịch</h2><div class="wide"><table class="detail-table"><thead><tr><th>Ngày</th><th>Loại</th><th>Tài khoản</th><th>Danh mục</th><th>Ghi chú</th><th>Số tiền</th></tr></thead>` +
      `<tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:22px">Không có giao dịch trong khoảng thời gian này.</td></tr>'}</tbody></table></div>` +
      `<section class="detail-totals"><h3>Tổng kết giao dịch trong kỳ</h3>` +
      `<div class="totals-row"><span>Tổng thu nhập</span><strong class="income">${money(income)}</strong></div>` +
      `<div class="totals-row"><span>Tổng chi tiêu</span><strong class="expense">${money(expense)}</strong></div>` +
      `<div class="totals-row"><span>Chuyển tiền nội bộ (không tính vào thu/chi)</span><strong class="transfer">${money(transfer)}</strong></div>` +
      `<div class="totals-row"><span>Chênh lệch thu − chi</span><strong>${money(net)}</strong></div></section>` +
      `<p class="foot">Báo cáo phản ánh các giao dịch còn hiệu lực tại thời điểm xuất. Giao dịch đã xóa mềm không được tính. Chuyển tiền nội bộ được liệt kê nhưng không tính vào tổng thu hoặc tổng chi.</p>` +
      `</body></html>`;
  }
  async function exportReport(button) {
    let selectedPeriod;
    try { selectedPeriod = resolvePeriod(); }
    catch (error) { alert(error.message); return; }
    // Open synchronously on click so browsers won't block the preview after IndexedDB awaits.
    const preview = window.open("", "_blank");
    if (!preview) { alert("Trình duyệt đang chặn cửa sổ xem báo cáo. Hãy cho phép pop-up rồi thử lại."); return; }
    preview.document.open();
    preview.document.write('<!doctype html><html lang="vi"><meta charset="utf-8"><title>Đang tạo báo cáo</title><body style="font-family:Arial;padding:30px">Đang chuẩn bị báo cáo…</body></html>');
    preview.document.close();
    button.disabled = true;
    try {
      if (!window.FinanceDB?.getFinancialSnapshot || !window.FinanceCalculator?.calculate) {
        throw new Error("Chưa tải xong thành phần dữ liệu tài chính.");
      }
      const [snapshot, categories] = await Promise.all([
        FinanceDB.getFinancialSnapshot(),
        FinanceDB.getAll("categories")
      ]);
      const html = buildReport(selectedPeriod, snapshot, categories);
      if (preview.closed) return;
      preview.document.open(); preview.document.write(html); preview.document.close();
      preview.focus();
    } catch (error) {
      console.error("[Finance Report] Lỗi tạo báo cáo:", error);
      if (!preview.closed) {
        preview.document.open();
        preview.document.write('<!doctype html><html lang="vi"><meta charset="utf-8"><body style="font-family:Arial;padding:30px">Không thể tạo báo cáo. Vui lòng quay lại ứng dụng và kiểm tra dữ liệu.</body></html>');
        preview.document.close();
      }
      alert("Không thể xuất báo cáo: " + (error?.message || "Lỗi không xác định"));
    } finally { button.disabled = false; }
  }
  function initReport() {
    const page = document.getElementById("page-statistics");
    if (!page || document.getElementById("finance-pdf-export")) return;
    const section = document.createElement("section");
    section.id = "finance-pdf-export";
    section.className = "content-card";
    section.style.cssText = "padding:22px;margin-top:18px";
    const title = document.createElement("h2"); title.textContent = "Xuất báo cáo PDF";
    title.style.marginBottom = "12px";
    const desc = document.createElement("p");
    desc.textContent = "Xuất tổng Thu/Chi, danh mục và chi tiết giao dịch theo tháng, quý, nửa năm, năm hoặc toàn bộ thời gian.";
    desc.style.cssText = "color:#64748b;margin-bottom:16px";

    const css = document.createElement("style");
    css.textContent = `
      .fm-report-form{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap}
      .fm-report-field{display:flex;flex-direction:column;gap:6px;min-width:0}
      .fm-report-field label{font-size:12px;font-weight:700;color:#475569}
      .fm-report-field input,.fm-report-field select{box-sizing:border-box;font:inherit;font-size:13px;min-height:42px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#0f172a;max-width:100%;min-width:0}
      .fm-report-custom{display:flex;gap:10px;flex-wrap:wrap}
      .fm-report-form [hidden],.fm-report-custom[hidden]{display:none!important}
      @media(max-width:700px){.fm-report-field{flex:1 1 135px}.fm-report-field input,.fm-report-field select{width:100%}.fm-report-custom{width:100%}.fm-report-custom .fm-report-field{flex:1 1 135px}}
    `;
    section.append(title, desc, css);
    const form = document.createElement("form"); form.className = "fm-report-form";

    function field(id, text, control, parent = form) {
      const box = document.createElement("div");
      box.className = "fm-report-field"; box.id = id + "-field";
      const label = document.createElement("label"); label.htmlFor = id; label.textContent = text;
      control.id = id;
      box.append(label, control); parent.appendChild(box);
      return box;
    }
    function select(options) {
      const sel = document.createElement("select");
      for (const [value, text] of options) sel.appendChild(new Option(text, value));
      return sel;
    }
    function input(type, value = "") {
      const el = document.createElement("input"); el.type = type; el.value = value;
      return el;
    }
    const mode = select([
      ["month", "Theo tháng"], ["quarter", "Theo quý"],
      ["half1", "6 tháng đầu năm"], ["half2", "6 tháng cuối năm"],
      ["year", "Theo năm"], ["all", "Toàn bộ dữ liệu"],
      ["custom", "Khoảng ngày tùy chọn"]
    ]);
    field("report-period", "Khoảng thời gian", mode);
    field("report-month", "Chọn tháng", input("month", monthNow()));
    const now = new Date();
    const year = input("number", String(now.getFullYear()));
    year.min = "1900"; year.max = "2100"; year.step = "1";
    field("report-year", "Năm", year);
    field("report-quarter", "Chọn quý", select([
      ["1", "Quý I (01–03)"], ["2", "Quý II (04–06)"],
      ["3", "Quý III (07–09)"], ["4", "Quý IV (10–12)"]
    ]));
    const custom = document.createElement("div");
    custom.id = "report-custom-fields"; custom.className = "fm-report-custom";
    field("report-from", "Từ ngày", input("date", String(now.getFullYear()) + "-01-01"), custom);
    field("report-to", "Đến ngày", input("date", `${monthNow()}-${lastDay(now.getFullYear(), now.getMonth() + 1)}`), custom);
    form.appendChild(custom);
    const button = document.createElement("button");
    button.type = "submit"; button.className = "btn-primary"; button.textContent = "Xuất PDF";
    button.style.cssText = "min-height:42px;padding:10px 17px";
    form.appendChild(button); section.appendChild(form); page.appendChild(section);
    mode.addEventListener("change", updatePeriodFields);
    updatePeriodFields();
    form.addEventListener("submit", event => {
      event.preventDefault();
      if (!button.disabled) void exportReport(button);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",initReport,{once:true});
  else initReport();
})();
