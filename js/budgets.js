/* Finance Manager 1.2 - Ngân sách theo tháng.
   Chỉ sử dụng các object store hiện hữu: settings, categories, transactions.
   Không thay đổi giao dịch hay số dư tài khoản. */
"use strict";
(() => {
  const PREFIX = "fm:budget:v1:";
  const $ = id => document.getElementById(id);
  const money = n => new Intl.NumberFormat("vi-VN").format(n) + " đ";
  const validMonth = m => typeof m === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
  const currentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const chosenMonth = () => {
    const value = $("fm-budget-month")?.value;
    return validMonth(value) ? value : currentMonth();
  };
  const keyFor = (month, categoryId) => `${PREFIX}${month}:${categoryId}`;
  const parseAmount = value => {
    const raw = String(value).trim();
    if (!/^\d{1,3}(?:\.\d{3})*$/.test(raw) && !/^\d+$/.test(raw)) return null;
    const n = Number(raw.replaceAll(".", ""));
    return Number.isSafeInteger(n) && n > 0 ? n : null;
  };
  let renderingId = 0;
  let submitting = false;
  let editingMonth = null;

  function buildPanel() {
    if ($("fm-budget-panel")) return;
    const page = $("page-budgets");
    if (!page) return;
    const section = document.createElement("section");
    section.id = "fm-budget-panel";
    section.className = "fm-budget-panel content-card";
    section.innerHTML = `
      <header class="fm-budget-heading">
        <div><h2>🎯 Ngân sách tháng</h2><p>Hạn mức chi tiêu theo từng danh mục</p></div>
        <button id="fm-budget-add" type="button" class="fm-budget-primary">+ Đặt ngân sách</button>
      </header>
      <p id="fm-budget-month-label" class="fm-budget-period"></p>
      <div id="fm-budget-list" class="fm-budget-list" aria-live="polite">Đang tải ngân sách...</div>
      <div id="fm-budget-editor" class="fm-budget-editor" hidden>
        <form id="fm-budget-form" novalidate>
          <h3 id="fm-budget-form-title">Đặt ngân sách</h3>
          <p id="fm-budget-form-period" class="fm-budget-period"></p>
          <label for="fm-budget-category">Danh mục chi tiêu</label>
          <select id="fm-budget-category" required></select>
          <label for="fm-budget-amount">Hạn mức (VNĐ)</label>
          <input id="fm-budget-amount" type="text" inputmode="numeric" autocomplete="off" placeholder="Ví dụ: 2.000.000" required>
          <div class="fm-budget-form-actions">
            <button type="button" id="fm-budget-cancel" class="fm-budget-secondary">Hủy</button>
            <button type="submit" id="fm-budget-save" class="fm-budget-primary">Lưu ngân sách</button>
          </div>
        </form>
      </div>`;
    page.appendChild(section);

    $("fm-budget-add").addEventListener("click", () => openEditor());
    $("fm-budget-cancel").addEventListener("click", closeEditor);
    $("fm-budget-amount").addEventListener("input", e => {
      const input = e.currentTarget;
      const digits = input.value.replace(/\D/g, "").slice(0, 15);
      input.value = digits ? new Intl.NumberFormat("vi-VN").format(Number(digits)) : "";
    });
    $("fm-budget-form").addEventListener("submit", saveEditor);
    $("fm-budget-list").addEventListener("click", async event => {
      const button = event.target.closest("button[data-budget-action]");
      if (!button || submitting) return;
      const { budgetAction: action, categoryId: categoryId } = button.dataset;
      if (!categoryId) return;
      if (action === "edit") await openEditor(categoryId);
      if (action === "remove") await removeBudget(categoryId);
    });
  }

  function statusFor(used, limit) {
    const ratio = used / limit;
    if (ratio >= 1) return { text: "Đã đạt/vượt hạn mức", className: "over" };
    if (ratio >= 0.8) return { text: "Sắp hết ngân sách", className: "near" };
    return { text: "Trong hạn mức", className: "ok" };
  }

  async function readBudgetData(month) {
    const [settings, categories, transactions] = await Promise.all([
      FinanceDB.getAll("settings"), FinanceDB.getAll("categories"), FinanceDB.getAll("transactions")
    ]);
    const categoryMap = new Map(categories.map(c => [c.id, c]));
    const budgets = settings.filter(s => typeof s.key === "string" && s.key.startsWith(PREFIX + month + ":"))
      .map(s => ({ ...s, categoryId: s.categoryId || s.key.slice((PREFIX + month + ":").length) }))
      .filter(s => Number.isSafeInteger(s.limit) && s.limit > 0);
    const spent = new Map();
    for (const tx of transactions) {
      if (tx.deletedAt != null || tx.type !== "expense" || !tx.categoryId ||
          typeof tx.date !== "string" || !tx.date.startsWith(month + "-")) continue;
      if (!Number.isSafeInteger(tx.amount) || tx.amount <= 0) {
        throw new Error("Có giao dịch chi tiêu có số tiền không hợp lệ.");
      }
      const total = (spent.get(tx.categoryId) || 0) + tx.amount;
      if (!Number.isSafeInteger(total)) throw new Error("Tổng chi vượt giới hạn số nguyên an toàn.");
      spent.set(tx.categoryId, total);
    }
    return { budgets, categories, categoryMap, spent };
  }

  async function render() {
    buildPanel();
    const panel = $("fm-budget-panel");
    if (!panel) return;
    const requestId = ++renderingId;
    const month = chosenMonth();
    const box = $("fm-budget-list");
    $("fm-budget-month-label").textContent = `Tháng ${month.slice(5)}/${month.slice(0, 4)} · Chi tiêu được tính từ giao dịch thực tế`;
    box.textContent = "Đang tải ngân sách...";
    try {
      const data = await readBudgetData(month);
      if (requestId !== renderingId || chosenMonth() !== month) return;
      box.replaceChildren();
      if (data.budgets.length === 0) {
        const p = document.createElement("p");
        p.className = "fm-budget-empty";
        p.textContent = "Chưa đặt ngân sách cho tháng này. Nhấn ‘+ Đặt ngân sách’ để bắt đầu.";
        box.appendChild(p);
        return;
      }
      data.budgets.sort((a, b) => {
        const an = data.categoryMap.get(a.categoryId)?.name || "";
        const bn = data.categoryMap.get(b.categoryId)?.name || "";
        return an.localeCompare(bn, "vi");
      });
      for (const item of data.budgets) {
        const used = data.spent.get(item.categoryId) || 0;
        const status = statusFor(used, item.limit);
        const row = document.createElement("article");
        row.className = "fm-budget-row " + status.className;
        const heading = document.createElement("div");
        heading.className = "fm-budget-row-heading";
        const name = document.createElement("strong");
        name.textContent = data.categoryMap.get(item.categoryId)?.name || "Danh mục đã xóa";
        const actions = document.createElement("div");
        actions.className = "fm-budget-actions";
        for (const [action, label] of [["edit", "Sửa"], ["remove", "Xóa"]]) {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = label;
          button.dataset.budgetAction = action;
          button.dataset.categoryId = item.categoryId;
          actions.appendChild(button);
        }
        heading.append(name, actions);
        const value = document.createElement("p");
        value.className = "fm-budget-values";
        value.textContent = `${money(used)} / ${money(item.limit)}`;
        const track = document.createElement("div");
        track.className = "fm-budget-track";
        track.setAttribute("role", "progressbar");
        track.setAttribute("aria-label", "Tỷ lệ sử dụng ngân sách " + name.textContent);
        track.setAttribute("aria-valuemin", "0");
        track.setAttribute("aria-valuemax", "100");
        track.setAttribute("aria-valuenow", String(Math.min(100, Math.round(used / item.limit * 100))));
        const fill = document.createElement("div");
        fill.className = "fm-budget-fill";
        fill.style.width = Math.min(100, used / item.limit * 100) + "%";
        track.appendChild(fill);
        const footer = document.createElement("div");
        footer.className = "fm-budget-row-footer";
        const state = document.createElement("span");
        state.textContent = status.text;
        const ratio = document.createElement("strong");
        ratio.textContent = `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(used / item.limit * 100)}%`;
        footer.append(state, ratio);
        row.append(heading, value, track, footer);
        box.appendChild(row);
      }
    } catch (e) {
      if (requestId !== renderingId) return;
      console.error("[Budget] Không thể hiển thị:", e);
      box.textContent = "Không thể tải ngân sách. Vui lòng thử lại.";
    }
  }

  async function openEditor(categoryId = null) {
    if (submitting) return;
    const month = chosenMonth();
    const select = $("fm-budget-category");
    const amount = $("fm-budget-amount");
    try {
      const data = await readBudgetData(month);
      // Không mở biểu mẫu cũ sau khi người dùng đổi tháng.
      if (chosenMonth() !== month) return;
      const available = data.categories.filter(c => c.type === "expense" && c.status !== "inactive");
      if (categoryId && !available.some(c => c.id === categoryId)) {
        // Cho phép sửa hạn mức của danh mục đã lưu trữ (giữ tính nhất quán lịch sử).
        const old = data.categoryMap.get(categoryId);
        if (old && old.type === "expense") available.push(old);
      }
      if (!available.length) {
        alert("Chưa có danh mục Chi tiêu. Hãy tạo danh mục trong tab Danh mục trước.");
        return;
      }
      available.sort((a, b) => a.name.localeCompare(b.name, "vi"));
      select.replaceChildren();
      for (const cat of available) select.appendChild(new Option(cat.name, cat.id));
      const old = data.budgets.find(b => b.categoryId === categoryId);
      select.value = categoryId || available.find(c => !data.budgets.some(b => b.categoryId === c.id))?.id || available[0].id;
      select.disabled = Boolean(categoryId);
      amount.value = old ? new Intl.NumberFormat("vi-VN").format(old.limit) : "";
      editingMonth = month;
      $("fm-budget-form-title").textContent = categoryId ? "Sửa hạn mức" : "Đặt ngân sách mới";
      $("fm-budget-form-period").textContent = `Áp dụng cho tháng ${month.slice(5)}/${month.slice(0,4)} (không làm thay đổi số dư)`;
      $("fm-budget-editor").hidden = false;
      amount.focus();
      $("fm-budget-editor").scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (e) {
      console.error("[Budget] Lỗi mở biểu mẫu:", e);
      alert("Không thể tải danh mục/ngân sách. Vui lòng thử lại.");
    }
  }

  function closeEditor() {
    if (submitting) return;
    $("fm-budget-editor").hidden = true;
    $("fm-budget-form").reset();
    editingMonth = null;
  }

  async function saveEditor(event) {
    event.preventDefault();
    if (submitting) return;
    const month = editingMonth;
    const categoryId = $("fm-budget-category").value;
    const limit = parseAmount($("fm-budget-amount").value);
    if (!validMonth(month) || chosenMonth() !== month) {
      alert("Tháng thống kê đã thay đổi. Vui lòng mở lại biểu mẫu."); return;
    }
    if (!categoryId || limit === null) {
      alert("Vui lòng chọn danh mục và nhập hạn mức nguyên dương hợp lệ."); return;
    }
    submitting = true;
    $("fm-budget-save").disabled = true;
    try {
      const category = await FinanceDB.get("categories", categoryId);
      if (!category || category.type !== "expense") throw new Error("Danh mục Chi tiêu không hợp lệ.");
      const key = keyFor(month, categoryId);
      const old = await FinanceDB.get("settings", key);
      if (old) await FinanceDB.update("settings", key, {month, categoryId, limit});
      else await FinanceDB.add("settings", {key, month, categoryId, limit, createdAt: new Date().toISOString()});
      $("fm-budget-editor").hidden = true;
      editingMonth = null;
      await render();
    } catch (e) {
      console.error("[Budget] Không thể lưu:", e);
      alert("Không thể hoàn tất. Hãy kiểm tra ngân sách trước khi thử lại: " + e.message);
    } finally {
      submitting = false;
      $("fm-budget-save").disabled = false;
    }
  }

  async function removeBudget(categoryId) {
    const month = chosenMonth();
    if (!confirm(`Xóa hạn mức của danh mục này trong tháng ${month.slice(5)}/${month.slice(0,4)}?\nCác giao dịch và số dư sẽ được giữ nguyên.`)) return;
    submitting = true;
    try {
      const key = keyFor(month, categoryId);
      const old = await FinanceDB.get("settings", key);
      if (!old) return;
      await FinanceDB.delete("settings", key);
      await render();
    } catch (e) {
      console.error("[Budget] Không thể xóa hạn mức:", e);
      alert("Không thể xóa hạn mức. Vui lòng kiểm tra lại.");
    } finally { submitting = false; }
  }

  function init() {
    buildPanel();
    // Ngân sách có bộ chọn tháng độc lập, không phụ thuộc Dashboard.
    $("fm-budget-month")?.addEventListener("change", () => {
      if (!submitting && $("fm-budget-editor") && !$("fm-budget-editor").hidden) closeEditor();
      void render();
    });
    window.addEventListener("finance:data-changed", () => {
      if (document.getElementById("page-budgets")?.classList.contains("active")) void render();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
  window.FinanceBudgets = {render};
})();
