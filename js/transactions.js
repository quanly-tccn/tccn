"use strict";

/* FINANCE MANAGER — Thu, Chi, Chuyển tiền; thêm/sửa/xóa mềm */
let transactionSaving = false;
let editingTransactionId = null;
let transactionPageLoadId = 0;
let transactionCategoryLoadId = 0;
let transactionEditLoadId = 0;

function localDateToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function validTransactionDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T00:00:00");
  return !Number.isNaN(d.getTime()) &&
    d.getFullYear() === Number(value.slice(0, 4)) &&
    d.getMonth() + 1 === Number(value.slice(5, 7)) &&
    d.getDate() === Number(value.slice(8, 10));
}

function txElement(id) {
  return document.getElementById(id);
}

function txMoney(value) {
  return FinanceCalculator.formatMoney(value);
}

// Tiền VND: chỉ lưu chữ số, hiển thị dấu chấm ngăn cách hàng nghìn.
function formatAmountDigits(raw) {
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return "";
  const normalized = digits.replace(/^0+(?=\d)/, "");
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function setupAmountFormatting() {
  const input = txElement("tx-amount");
  if (!input) return;
  input.addEventListener("input", () => {
    // Giữ con trỏ theo số chữ số đứng trước nó để gõ/sửa ở giữa số vẫn thuận tiện.
    const original = input.value;
    const caret = input.selectionStart ?? original.length;
    const digitsBefore = (original.slice(0, caret).match(/\d/g) || []).length;
    const formatted = formatAmountDigits(original);
    input.value = formatted;
    let nextPos = 0;
    let seenDigits = 0;
    if (digitsBefore === 0) {
      nextPos = 0;
    } else {
      while (nextPos < formatted.length && seenDigits < digitsBefore) {
        if (/\d/.test(formatted[nextPos])) seenDigits++;
        nextPos++;
      }
    }
    input.setSelectionRange(nextPos, nextPos);
  });
}

// Giao diện chọn một: dùng radio, vẫn giữ select ẩn để tương thích logic cũ.
function syncTransactionChoiceUI() {
  const current = txElement("tx-type").value;
  document.querySelectorAll('input[name="tx-kind"]').forEach(radio => {
    radio.checked = radio.value === current;
  });
}

function renderAccountChoices(selectId) {
  const select = txElement(selectId);
  const group = txElement(selectId + "-choices");
  if (!select || !group) return;
  group.replaceChildren();
  const items = [...select.options].filter(option => option.value);
  if (items.length === 0) {
    const message = document.createElement("small");
    message.textContent = "Chưa có tài khoản khả dụng.";
    group.appendChild(message);
    return;
  }
  items.forEach(option => {
    const label = document.createElement("label");
    label.className = "tx-choice";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = selectId + "-radio";
    input.value = option.value;
    input.checked = option.value === select.value;
    const text = document.createElement("span");
    text.textContent = option.textContent;
    input.addEventListener("change", () => {
      if (input.checked) {
        select.value = input.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    label.append(input, text);
    group.appendChild(label);
  });
}

function syncAccountChoices(selectId) {
  const select = txElement(selectId);
  document.querySelectorAll(`input[name="${selectId}-radio"]`).forEach(radio => {
    radio.checked = radio.value === select.value;
  });
}

function syncTransactionTypeUI() {
  const isTransfer = txElement("tx-type").value === "transfer";
  const destinationGroup = txElement("tx-destination-group");
  const destination = txElement("tx-to-account");
  const sourceLabel = txElement("tx-source-label");
  if (destinationGroup) destinationGroup.hidden = !isTransfer;
  if (destination) {
    destination.required = isTransfer;
    if (!isTransfer) destination.value = "";
  }
  if (sourceLabel) sourceLabel.textContent = isTransfer ? "Tài khoản chuyển" : "Tài khoản";
  syncTransactionChoiceUI();
  syncAccountChoices("tx-to-account");
}

async function loadTransactionAccounts() {
  const accounts = await FinanceDB.getAll("accounts");
  for (const selectId of ["tx-account", "tx-to-account"]) {
    const select = txElement(selectId);
    if (!select) continue;
    const selected = select.value;
    select.replaceChildren(new Option(
      selectId === "tx-account" ? "Chọn tài khoản" : "Chọn tài khoản nhận", ""
    ));
    accounts.filter(a => a.status !== "inactive").forEach(a => {
      select.appendChild(new Option(a.name, a.id));
    });
    if ([...select.options].some(o => o.value === selected)) select.value = selected;
    renderAccountChoices(selectId);
  }
  return accounts;
}

// Danh mục tùy chọn cho Thu/Chi; Chuyển tiền không cần danh mục.
async function loadTransactionCategories(selectedId = undefined) {
  const requestId = ++transactionCategoryLoadId;
  const group = txElement("tx-category-group");
  const choiceBox = txElement("tx-category-choices");
  const select = txElement("tx-category");
  if (!group || !choiceBox || !select) return;
  const type = txElement("tx-type").value;
  // Khi mở lại tab hoặc làm mới danh sách, giữ nguyên danh mục đang chọn.
  // Khi chủ động đổi loại Thu/Chi, caller truyền null để bỏ chọn danh mục cũ.
  const initialSelection = select.value;
  const desired = selectedId === undefined ? (initialSelection || null) : selectedId;
  group.hidden = type === "transfer";
  if (type === "transfer") {
    select.replaceChildren(new Option("Không phân loại", ""));
    choiceBox.replaceChildren();
    return;
  }
  const cats = await FinanceDB.getAll("categories");
  // Một yêu cầu cũ không được ghi đè thay đổi mới của người dùng.
  if (requestId !== transactionCategoryLoadId || txElement("tx-type").value !== type) return;
  // Không ghi đè nếu người dùng vừa chọn một mục trong lúc IndexedDB đọc.
  if (selectedId === undefined && select.value !== initialSelection) return;
  const options = cats.filter(c => c.type === type && (c.status !== "inactive" || c.id === desired))
    .sort((a,b) => a.name.localeCompare(b.name, "vi"));
  select.replaceChildren(new Option("Không phân loại", ""));
  for (const cat of options) {
    select.appendChild(new Option(cat.name + (cat.status === "inactive" ? " (Lưu trữ)" : ""), cat.id));
  }
  if (desired && options.some(c => c.id === desired)) select.value = desired;
  choiceBox.replaceChildren();
  for (const option of [...select.options]) {
    const label = document.createElement("label");
    label.className = "tx-choice";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "tx-category-radio";
    radio.value = option.value;
    radio.checked = select.value === option.value;
    const text = document.createElement("span");
    text.textContent = option.textContent;
    radio.addEventListener("change", () => {
      if (radio.checked) select.value = radio.value;
    });
    label.append(radio, text);
    choiceBox.appendChild(label);
  }
}

function resetTransactionForm() {
  ++transactionEditLoadId;
  ++transactionCategoryLoadId;
  editingTransactionId = null;
  const form = txElement("transaction-form");
  if (!form) return;
  form.reset();
  txElement("tx-date").value = localDateToday();
  txElement("tx-type").value = "expense";
  txElement("tx-submit").textContent = "Lưu giao dịch";
  const cancel = txElement("btn-cancel-tx-edit");
  if (cancel) cancel.hidden = true;
  syncTransactionTypeUI();
  txElement("tx-category").value = "";
  syncAccountChoices("tx-account");
  void loadTransactionCategories(null).catch(e => console.error("[Categories]", e));
}

async function editTransaction(id) {
  if (transactionSaving) return;
  const requestId = ++transactionEditLoadId;
  try {
    const tx = await FinanceDB.get("transactions", id);
    if (requestId !== transactionEditLoadId) return;
    if (!tx || tx.deletedAt != null) {
      alert("Giao dịch không tồn tại hoặc đã bị xóa.");
      return;
    }
    if (!["income", "expense", "transfer"].includes(tx.type)) {
      alert("Loại giao dịch chưa được hỗ trợ.");
      return;
    }
    await loadTransactionAccounts();
    if (requestId !== transactionEditLoadId) return;
    const source = txElement("tx-account");
    const destination = txElement("tx-to-account");
    if (![...source.options].some(o => o.value === tx.accountId) ||
        (tx.type === "transfer" && ![...destination.options].some(o => o.value === tx.toAccountId))) {
      alert("Tài khoản liên quan không còn khả dụng để chỉnh sửa.");
      return;
    }
    editingTransactionId = id;
    txElement("tx-type").value = tx.type;
    syncTransactionTypeUI();
    await loadTransactionCategories(tx.categoryId || null);
    if (requestId !== transactionEditLoadId) return;
    txElement("tx-amount").value = formatAmountDigits(tx.amount);
    source.value = tx.accountId;
    destination.value = tx.type === "transfer" ? tx.toAccountId : "";
    syncAccountChoices("tx-account");
    syncAccountChoices("tx-to-account");
    txElement("tx-date").value = tx.date;
    txElement("tx-note").value = tx.note || "";
    txElement("tx-submit").textContent = "Lưu thay đổi";
    txElement("btn-cancel-tx-edit").hidden = false;
    txElement("transaction-form").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error("[Transactions] Không thể sửa:", error);
    alert("Không thể mở giao dịch để chỉnh sửa.");
  }
}

async function deleteTransaction(id) {
  if (transactionSaving) return;
  try {
    const tx = await FinanceDB.get("transactions", id);
    if (!tx || tx.deletedAt != null) {
      alert("Giao dịch không tồn tại hoặc đã bị xóa.");
      return;
    }
    const prompt = `Xóa mềm giao dịch ${tx.note || tx.type} (${txMoney(tx.amount)})?\n\nSố dư các tài khoản sẽ được tính lại.`;
    if (!confirm(prompt)) return;
    transactionSaving = true;
    await FinanceDB.softDeleteTransaction(id);
    if (editingTransactionId === id) resetTransactionForm();
    try {
      await renderTransactions();
      alert("Đã xóa giao dịch thành công.");
    } catch (refreshError) {
      console.error("[Transactions] Đã xóa nhưng tải lại thất bại:", refreshError);
      alert("Giao dịch đã xóa. Hãy mở lại trang để cập nhật danh sách.");
    }
  } catch (error) {
    console.error("[Transactions] Lỗi xóa:", error);
    alert("Không thể xóa giao dịch: " + (error.message || String(error)));
  } finally {
    transactionSaving = false;
  }
}

async function renderTransactions() {
  const container = txElement("transactions-list");
  if (!container) return;
  container.textContent = "Đang tải giao dịch...";
  try {
    const { accounts, transactions } = await FinanceDB.getFinancialSnapshot();
    const names = new Map(accounts.map(a => [a.id, a.name]));
    const categories = await FinanceDB.getAll("categories");
    const categoryNames = new Map(categories.map(c => [c.id,c.name]));
    const active = transactions.filter(tx => tx.deletedAt == null).sort((a, b) =>
      (b.date || "").localeCompare(a.date || "") ||
      (b.createdAt || "").localeCompare(a.createdAt || "")
    );
    container.replaceChildren();
    if (!active.length) {
      container.textContent = "Chưa có giao dịch.";
      return;
    }
    for (const tx of active) {
      const item = document.createElement("div");
      item.className = "transaction-history-item";
      
      const info = document.createElement("div");
      const title = document.createElement("strong");
      const kind = tx.type === "income" ? "Thu nhập" : tx.type === "expense" ? "Chi tiêu" : "Chuyển tiền";
      title.textContent = tx.note || kind;
      const details = document.createElement("div");
      details.className = "fm-transaction-details";
      const source = names.get(tx.accountId) || "Tài khoản không xác định";
      if (tx.type === "transfer") {
        const target = names.get(tx.toAccountId) || "Tài khoản không xác định";
        details.textContent = `${tx.date} · ${source} → ${target} · Chuyển tiền`;
      } else {
        const catName = tx.categoryId ? (categoryNames.get(tx.categoryId) || "Danh mục không xác định") : "Chưa phân loại";
        details.textContent = `${tx.date} · ${source} · ${kind} · ${catName}`;
      }
      info.append(title, details);

      const right = document.createElement("div");
      right.className = "fm-transaction-right";
      const amount = document.createElement("strong");
      amount.textContent = tx.type === "expense" ? txMoney(-tx.amount) :
        tx.type === "income" ? "+" + txMoney(tx.amount) : txMoney(tx.amount);
      amount.className = "fm-transaction-amount " +
        (tx.type === "income" ? "is-income" :
          tx.type === "expense" ? "is-expense" : "is-transfer");
      const actions = document.createElement("div");
      actions.className = "transaction-actions";
      
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "transaction-action-btn edit";
      edit.textContent = "✏️ Chỉnh sửa";
      edit.addEventListener("click", () => editTransaction(tx.id));
      const del = document.createElement("button");
      del.type = "button";
      del.className = "transaction-action-btn delete";
      del.textContent = "🗑️ Xóa";
      del.addEventListener("click", () => deleteTransaction(tx.id));
      actions.append(edit, del);
      right.append(amount, actions);
      item.append(info, right);
      container.appendChild(item);
    }
  } catch (error) {
    console.error("[Transactions] Không thể tải lịch sử:", error);
    container.textContent = "Không thể tải lịch sử giao dịch.";
    throw error;
  }
}

function initTransactionForm() {
  const form = txElement("transaction-form");
  if (!form) return;
  txElement("tx-date").value = localDateToday();
  setupAmountFormatting();
  txElement("tx-type").addEventListener("change", () => {
    syncTransactionTypeUI();
    void loadTransactionCategories(null).catch(e => console.error("[Categories]",e));
  });
  document.querySelectorAll('input[name="tx-kind"]').forEach(radio => {
    radio.addEventListener("change", () => {
      if (!radio.checked || transactionSaving) return;
      txElement("tx-type").value = radio.value;
      syncTransactionTypeUI();
      void loadTransactionCategories(null).catch(e => console.error("[Categories]",e));
    });
  });
  txElement("btn-cancel-tx-edit").addEventListener("click", () => {
    if (!transactionSaving) resetTransactionForm();
  });
  syncTransactionTypeUI();
  void loadTransactionCategories(null).catch(e => console.error("[Categories]",e));

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (transactionSaving) return;

    const type = txElement("tx-type").value;
    const rawAmount = txElement("tx-amount").value.trim();
    const amount = Number(rawAmount.replace(/\./g, ""));
    const accountId = txElement("tx-account").value;
    const toAccountId = txElement("tx-to-account").value;
    const date = txElement("tx-date").value;
    const note = txElement("tx-note").value.trim();
    const categoryId = type === "transfer" ? null : (txElement("tx-category")?.value || null);

    if (!["income", "expense", "transfer"].includes(type)) {
      alert("Loại giao dịch không hợp lệ."); return;
    }
    if (!/^[0-9]{1,3}(\.[0-9]{3})*$/.test(rawAmount) || !Number.isSafeInteger(amount) || amount <= 0) {
      alert("Số tiền phải là số nguyên dương hợp lệ."); return;
    }
    if (!validTransactionDate(date)) {
      alert("Ngày giao dịch không hợp lệ."); return;
    }
    if (!accountId || (type === "transfer" && (!toAccountId || accountId === toAccountId))) {
      alert(type === "transfer" ? "Hãy chọn hai tài khoản khác nhau." : "Hãy chọn tài khoản.");
      return;
    }

    transactionSaving = true;
    const submit = txElement("tx-submit");
    submit.disabled = true;
    let saved = false;
    try {
      await FinanceDB.saveTransaction({
        type, amount, accountId, toAccountId, categoryId, date, note
      }, editingTransactionId);
      saved = true;
      resetTransactionForm();
      await renderTransactions();
    } catch (error) {
      console.error("[Transactions] Lỗi lưu:", error);
      alert(saved
        ? "Đã lưu vào dữ liệu, nhưng chưa tải lại được lịch sử. Bạn hãy mở lại trang để kiểm tra."
        : "Không thể lưu giao dịch: " + (error.message || String(error)));
    } finally {
      transactionSaving = false;
      submit.disabled = false;
    }
  });
}

async function loadTransactionsPage() {
  const id = ++transactionPageLoadId;
  try {
    await loadTransactionAccounts();
    if (id !== transactionPageLoadId) return;
    await loadTransactionCategories();
    if (id !== transactionPageLoadId) return;
    await renderTransactions();
  } catch (error) {
    console.error("[Transactions] Lỗi mở trang:", error);
  }
}

window.loadTransactionsPage = loadTransactionsPage;
window.renderTransactions = renderTransactions;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTransactionForm, { once: true });
} else {
  initTransactionForm();
}
