
"use strict";

/* =========================================
   FINANCE MANAGER - QUẢN LÝ TÀI KHOẢN
   ========================================= */

let editingAccountId = null;
let accountFormBusy = false;

// 1. HIỂN THỊ DANH SÁCH TÀI KHOẢN
async function renderAccounts() {

  const container =
    document.getElementById("accounts-list");

  if (!container) return;

  container.textContent = "Đang tải tài khoản...";

  try {
    const result =
      await FinanceDataService.getFinancialSummary();

    if (!result.success) {
      throw new Error(
        String(result.error || "Không thể đọc dữ liệu")
      );
    }

    container.replaceChildren();

    const accounts = result.summary.accounts;

    if (accounts.length === 0) {
      container.textContent = "Chưa có tài khoản nào.";
      return;
    }

    accounts.forEach(account => {

      const item = document.createElement("div");

      item.className = "fm-account-item";

      const top = document.createElement("div");

      top.className = "fm-account-top";

      const name = document.createElement("strong");
      name.textContent = account.name;

      const balance = document.createElement("strong");

      balance.textContent =
        FinanceCalculator.formatMoney(account.balance);

      balance.className = "fm-account-balance " +
        (account.balance < 0 ? "is-negative" : "is-positive");

      top.append(name, balance);

      // Các nút thao tác
      const actions = document.createElement("div");

      actions.className = "fm-account-actions";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.textContent = "✏️ Sửa";

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "🗑️ Xóa";

      editButton.className = "fm-account-btn fm-account-btn-edit";
      deleteButton.className = "fm-account-btn fm-account-btn-delete";

      editButton.addEventListener("click", () => {
        editAccount(account.id);
      });

      deleteButton.addEventListener("click", () => {
        deleteAccount(account.id, account.name);
      });

      actions.append(editButton, deleteButton);
      item.append(top, actions);
      container.appendChild(item);

    });

  } catch (error) {
    console.error("[Accounts] Lỗi tải tài khoản:", error);

    container.textContent =
      "Không thể tải danh sách tài khoản.";
  }
}

// 2. MỞ BIỂU MẪU THÊM HOẶC SỬA
function openAccountForm(account = null) {

  const container =
    document.getElementById("account-form-container");

  const form =
    document.getElementById("account-form");

  if (!container || !form || accountFormBusy) return;

  form.reset();

  const title = container.querySelector("h3");
  const submitButton = form.querySelector(
    'button[type="submit"]'
  );

  if (account) {

    editingAccountId = account.id;

    document.getElementById("account-name").value =
      account.name;

    document.getElementById("account-type").value =
      account.type;

    document.getElementById(
      "account-opening-balance"
    ).value = account.openingBalance;

    if (title) title.textContent = "Chỉnh sửa tài khoản";

    if (submitButton) {
      submitButton.textContent = "Lưu thay đổi";
    }

  } else {

    editingAccountId = null;

    if (title) title.textContent = "Thêm tài khoản mới";

    if (submitButton) {
      submitButton.textContent = "Lưu tài khoản";
    }

  }

  container.hidden = false;

  document.getElementById("account-name").focus();

  container.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
}

// 3. ĐÓNG BIỂU MẪU
function closeAccountForm() {

  if (accountFormBusy) return;

  const container =
    document.getElementById("account-form-container");

  const form =
    document.getElementById("account-form");

  if (container) container.hidden = true;
  if (form) form.reset();

  editingAccountId = null;
}

// 4. SỬA TÀI KHOẢN
async function editAccount(id) {

  if (accountFormBusy) return;

  try {

    const account =
      await FinanceDB.get("accounts", id);

    if (!account) {
      alert("Không tìm thấy tài khoản.");
      return;
    }

    openAccountForm(account);

  } catch (error) {

    console.error("[Accounts] Lỗi mở sửa:", error);
    alert("Không thể mở thông tin tài khoản.");

  }
}

// 5. XÓA TÀI KHOẢN
async function deleteAccount(id, name) {

  if (accountFormBusy) return;

  const confirmed = confirm(
    'Bạn có chắc chắn muốn xóa tài khoản "' +
    name +
    '"?\n\n' +
    "Tài khoản đã có giao dịch sẽ không được phép xóa."
  );

  if (!confirmed) return;

  accountFormBusy = true;

  try {

    await FinanceDB.delete("accounts", id);

    if (editingAccountId === id) {
      editingAccountId = null;

      const container = document.getElementById(
        "account-form-container"
      );

      if (container) container.hidden = true;
    }

    await renderAccounts();

    alert("Đã xóa tài khoản thành công.");

  } catch (error) {

    console.error("[Accounts] Lỗi xóa:", error);

    alert(
      "Không thể xóa tài khoản.\n\n" +
      "Nếu tài khoản đã có giao dịch, " +
      "hệ thống sẽ giữ lại để bảo toàn lịch sử tài chính.\n\n" +
      String(error.message || "")
    );

  } finally {

    accountFormBusy = false;

  }
}

// 6. KHỞI TẠO BIỂU MẪU
function initAccountForm() {

  const addButton =
    document.getElementById("btn-add-account");

  const cancelButton =
    document.getElementById("btn-cancel-account");

  const form =
    document.getElementById("account-form");

  if (!addButton || !cancelButton || !form) {
    console.error("[Accounts] Thiếu biểu mẫu tài khoản");
    return;
  }

  addButton.addEventListener("click", () => {
    openAccountForm();
  });

  cancelButton.addEventListener("click", () => {
    closeAccountForm();
  });

  // 7. LƯU TÀI KHOẢN
  form.addEventListener("submit", async event => {

    event.preventDefault();

    if (accountFormBusy) return;

    const name =
      document.getElementById("account-name").value.trim();

    const type =
      document.getElementById("account-type").value;

    const balanceInput =
      document.getElementById("account-opening-balance");

    const balanceText = balanceInput.value.trim();
    const openingBalance = Number(balanceText);

    if (!name || name.length > 100) {
      alert("Tên tài khoản không hợp lệ.");
      return;
    }

    if (!["cash", "bank", "ewallet"].includes(type)) {
      alert("Loại tài khoản không hợp lệ.");
      return;
    }

    if (
      balanceText === "" ||
      !Number.isSafeInteger(openingBalance)
    ) {
      alert("Số dư phải là số nguyên hợp lệ.");
      return;
    }

    const submitButton =
      form.querySelector('button[type="submit"]');

    accountFormBusy = true;
    submitButton.disabled = true;

    try {

      if (editingAccountId) {

        // Đọc thông tin cũ để đối chiếu
        const oldAccount = await FinanceDB.get(
          "accounts",
          editingAccountId
        );

        if (!oldAccount) {
          throw new Error("Tài khoản không còn tồn tại");
        }

        // Cảnh báo nếu thay đổi số dư ban đầu
        if (
          oldAccount.openingBalance !== openingBalance
        ) {

          const confirmed = confirm(
            "Bạn đang thay đổi số dư ban đầu.\n\n" +
            "Số dư cũ: " +
            FinanceCalculator.formatMoney(
              oldAccount.openingBalance
            ) +
            "\nSố dư mới: " +
            FinanceCalculator.formatMoney(openingBalance) +
            "\n\n" +
            "Thay đổi này sẽ ảnh hưởng tới số dư hiện tại. " +
            "Bạn có muốn tiếp tục?"
          );

          if (!confirmed) return;
        }

        // Không thay đổi ID và lịch sử giao dịch
        await FinanceDB.update(
          "accounts",
          editingAccountId,
          { name, type, openingBalance }
        );

      } else {

        const newAccount = {
          id: FinanceDB.generateId(),
          name,
          type,
          openingBalance,
          status: "active",
          createdAt: new Date().toISOString()
        };

        await FinanceDB.add(
          "accounts",
          newAccount
        );

      }

      const container =
        document.getElementById("account-form-container");

      if (container) container.hidden = true;

      form.reset();
      editingAccountId = null;

      await renderAccounts();

    } catch (error) {

      console.error("[Accounts] Lỗi lưu:", error);

      alert(
        "Không thể hoàn tất thao tác. " +
        "Hãy kiểm tra danh sách trước khi thử lại.\n\n" +
        String(error.message || "")
      );

    } finally {

      accountFormBusy = false;
      submitButton.disabled = false;

    }

  });
}

// 8. ĐĂNG KÝ CÁC HÀM
window.renderAccounts = renderAccounts;

// Khởi tạo sự kiện khi DOM sẵn sàng
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initAccountForm,
    { once: true }
  );
} else {
  initAccountForm();
}
