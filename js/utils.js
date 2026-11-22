
/* =========================================
   FINANCE MANAGER
   UTILS.JS - FINANCIAL CALCULATOR
   ========================================= */

"use strict";

/**
 * Bộ máy tính toán tài chính.
 *
 * Quy tắc:
 * - income: cộng vào tài khoản.
 * - expense: trừ khỏi tài khoản.
 * - transfer: chuyển giữa hai tài khoản.
 * - deletedAt khác null: bỏ qua.
 * - Không thay đổi dữ liệu đầu vào.
 *
 * Phiên bản đầu tiên sử dụng VNĐ nguyên.
 */

const FinanceCalculator = (() => {

  // 1. KIỂM TRA SỐ TIỀN

  function isValidMoney(value) {
    return (
      typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value >= 0
    );
  }

  function assertMoney(value, fieldName) {
    if (!isValidMoney(value)) {
      throw new Error(
        "Số tiền không hợp lệ: " + fieldName
      );
    }
  }

  // 2. KIỂM TRA PHÉP TÍNH AN TOÀN

  function safeAdd(a, b) {
    const result = a + b;

    if (!Number.isSafeInteger(result)) {
      throw new Error(
        "Số tiền vượt phạm vi số nguyên an toàn"
      );
    }

    return result;
  }

  // 3. TÍNH TOÁN TỔNG HỢP

  function calculate(accounts, transactions) {

    if (!Array.isArray(accounts)) {
      throw new Error("accounts phải là một mảng");
    }

    if (!Array.isArray(transactions)) {
      throw new Error("transactions phải là một mảng");
    }

    const balances = {};
    const accountIds = new Set();

    let totalIncome = 0;
    let totalExpense = 0;
    let openingTotal = 0;
    let processedCount = 0;

    // 4. KHỞI TẠO SỐ DƯ TÀI KHOẢN

    for (const account of accounts) {

      if (
        !account ||
        typeof account.id !== "string" ||
        !account.id.trim() ||
        accountIds.has(account.id)
      ) {
        throw new Error(
          "ID tài khoản không hợp lệ hoặc bị trùng"
        );
      }

      assertMoney(
        Math.abs(account.openingBalance),
        "openingBalance"
      );

      if (!Number.isSafeInteger(account.openingBalance)) {
        throw new Error("Số dư ban đầu không hợp lệ");
      }

      accountIds.add(account.id);

      balances[account.id] = {
        id: account.id,
        name: account.name,
        openingBalance: account.openingBalance,
        balance: account.openingBalance
      };

      openingTotal = safeAdd(
        openingTotal,
        account.openingBalance
      );
    }

    // 5. XỬ LÝ CÁC GIAO DỊCH

    for (const tx of transactions) {

      // Không tính giao dịch đã xóa mềm
      if (tx.deletedAt != null) {
        continue;
      }

      // Kiểm tra số tiền
      assertMoney(tx.amount, "transaction.amount");

      if (tx.amount === 0) {
        throw new Error(
          "Giao dịch phải có số tiền lớn hơn 0"
        );
      }

      // Kiểm tra tài khoản nguồn
      if (!accountIds.has(tx.accountId)) {
        throw new Error(
          "Giao dịch tham chiếu tài khoản không tồn tại: " +
          tx.id
        );
      }

      // Giao dịch thu
      if (tx.type === "income") {

        balances[tx.accountId].balance = safeAdd(
          balances[tx.accountId].balance,
          tx.amount
        );

        totalIncome = safeAdd(
          totalIncome,
          tx.amount
        );

      }

      // Giao dịch chi
      else if (tx.type === "expense") {

        balances[tx.accountId].balance = safeAdd(
          balances[tx.accountId].balance,
          -tx.amount
        );

        totalExpense = safeAdd(
          totalExpense,
          tx.amount
        );

      }

      // Chuyển tiền nội bộ
      else if (tx.type === "transfer") {

        if (!accountIds.has(tx.toAccountId)) {
          throw new Error(
            "Tài khoản nhận không tồn tại: " + tx.id
          );
        }

        if (tx.accountId === tx.toAccountId) {
          throw new Error(
            "Không thể chuyển tiền trong cùng tài khoản"
          );
        }

        balances[tx.accountId].balance = safeAdd(
          balances[tx.accountId].balance,
          -tx.amount
        );

        balances[tx.toAccountId].balance = safeAdd(
          balances[tx.toAccountId].balance,
          tx.amount
        );

      }

      else {
        throw new Error(
          "Loại giao dịch không hợp lệ: " + tx.type
        );
      }

      processedCount++;
    }

    // 6. TÍNH TỔNG SỐ DƯ HIỆN TẠI

    const accountList = Object.values(balances);

    const totalBalance = accountList.reduce(
      (sum, account) => safeAdd(
        sum,
        account.balance
      ),
      0
    );

    const netIncome = safeAdd(
      totalIncome,
      -totalExpense
    );

    // 7. KIỂM TRA TÍNH NHẤT QUÁN

    const expectedBalance = safeAdd(
      openingTotal,
      netIncome
    );

    if (totalBalance !== expectedBalance) {
      throw new Error(
        "Sai lệch số dư: dữ liệu không nhất quán"
      );
    }

    // 8. TRẢ VỀ KẾT QUẢ

    return {
      openingTotal,
      totalIncome,
      totalExpense,
      netIncome,
      totalBalance,
      processedCount,
      accounts: accountList
    };
  }

  // 9. ĐỊNH DẠNG TIỀN VNĐ

  function formatMoney(amount) {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0
    }).format(amount);
  }

/* =========================================
   10. PHÁT HIỆN TÀI KHOẢN CÓ SỐ DƯ ÂM
   ========================================= */

function detectNegativeBalances(accountList) {

  if (!Array.isArray(accountList)) {
    throw new Error(
      "Danh sách tài khoản không hợp lệ"
    );
  }

  const warnings = [];

  for (const account of accountList) {

    if (
      !account ||
      typeof account.id !== "string" ||
      !account.id.trim() ||
      !Number.isSafeInteger(account.balance)
    ) {
      throw new Error(
        "Dữ liệu số dư tài khoản không hợp lệ"
      );
    }

    if (account.balance < 0) {

      warnings.push({
        type: "negative_balance",
        severity: "warning",
        accountId: account.id,
        accountName: account.name || account.id,
        balance: account.balance,
        shortage: -account.balance,
        message:
          "Tài khoản " +
          (account.name || account.id) +
          " đang có số dư âm " +
          formatMoney(-account.balance)
      });

    }
  }

  // Tài khoản âm nhiều nhất được hiển thị trước
  warnings.sort(
    (a, b) => b.shortage - a.shortage
  );

  return warnings;
}

    return {
    calculate,
    formatMoney,
    detectNegativeBalances
    };

})();

// Cho phép kiểm tra qua Console
window.FinanceCalculator = FinanceCalculator;
