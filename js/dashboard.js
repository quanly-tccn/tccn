
/* =========================================
   FINANCE MANAGER
   DASHBOARD.JS - FINANCIAL DATA SERVICE
   ========================================= */

"use strict";

const FinanceDataService = (() => {

  async function getFinancialSummary(snapshotOverride = null) {

    // 1. Kiểm tra các thành phần cần thiết
    if (
      !window.FinanceDB ||
      !window.FinanceCalculator
    ) {
      throw new Error(
        "FinanceDB hoặc FinanceCalculator chưa sẵn sàng"
      );
    }

    // 2. Đọc dữ liệu IndexedDB
    
    const snapshot = snapshotOverride ||
    await FinanceDB.getFinancialSnapshot();

    const accounts = snapshot.accounts;
    const transactions = snapshot.transactions;


    // 3. Lấy giao dịch đang hoạt động
    const activeTransactions = transactions.filter(
      tx => tx.deletedAt == null
    );

    // 4. Kiểm tra tính hợp lệ của dữ liệu
    const accountIds = new Set(
      accounts.map(account => account.id)
    );

    const invalidTransactions = activeTransactions.filter(
      tx => {

        const validAmount =
          typeof tx.amount === "number" &&
          Number.isSafeInteger(tx.amount) &&
          tx.amount > 0;

        const validType = [
          "income",
          "expense",
          "transfer"
        ].includes(tx.type);

        const validAccount =
          accountIds.has(tx.accountId);

        const validDestination =
          tx.type !== "transfer" ||
          (
            accountIds.has(tx.toAccountId) &&
            tx.accountId !== tx.toAccountId
          );

        return !(
          validAmount &&
          validType &&
          validAccount &&
          validDestination
        );
      }
    );

    // 5. Không tính toán nếu dữ liệu hoạt động sai
    if (invalidTransactions.length > 0) {
      return {
        success: false,
        error: "Phát hiện giao dịch không hợp lệ",
        invalidTransactions,
        totalAccounts: accounts.length,
        totalTransactions: transactions.length
      };
    }

  
    // 6. GỌI BỘ MÁY TÍNH TOÁN
    const summary = FinanceCalculator.calculate(
      accounts,
      activeTransactions
    );

    // 7. TỰ ĐỘNG PHÁT HIỆN TÀI KHOẢN ÂM
    const warnings =
      FinanceCalculator.detectNegativeBalances(
        summary.accounts
      );

    const warningCount = warnings.length;

    // 8. TRẢ KẾT QUẢ CHO ỨNG DỤNG
    return {
      success: true,

      summary,

      // Thông tin cảnh báo
      warnings,
      warningCount,
      hasWarnings: warningCount > 0,

      // Thông tin dữ liệu
      totalAccounts: accounts.length,
      totalTransactions: transactions.length,
      activeTransactions: activeTransactions.length,
      deletedTransactions:
        transactions.length - activeTransactions.length
    };

  }

  return {
    getFinancialSummary
  };

})();

/* =========================================
   ĐỊNH DẠNG TIỀN CHO DASHBOARD
   ========================================= */

function formatDashboardMoney(amount) {

  // Không chấp nhận giá trị sai hoặc thiếu
  if (!Number.isSafeInteger(amount)) {
    throw new Error(
      "Giá trị tiền Dashboard không hợp lệ"
    );
  }

  // Sử dụng bộ định dạng đã có
  return FinanceCalculator.formatMoney(amount);
}

// Cho phép kiểm tra từ Console
window.formatDashboardMoney = formatDashboardMoney;


/* =========================================
   DASHBOARD THEO THÁNG
   - Số dư: toàn bộ lịch sử
   - Thu/Chi: chỉ tháng được chọn
   - Giao dịch: 5 mục gần nhất trong tháng
   ========================================= */
let dashboardKPIRequestId = 0;

function getLocalMonth() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function getSelectedDashboardMonth() {
  const field = document.getElementById("dashboard-month");
  if (field && /^\d{4}-(0[1-9]|1[0-2])$/.test(field.value)) {
    return field.value;
  }
  return getLocalMonth();
}

function addSafeMoney(a, b) {
  const result = a + b;
  if (!Number.isSafeInteger(result)) {
    throw new Error("Tổng số tiền vượt phạm vi số nguyên an toàn");
  }
  return result;
}

/* Danh sách giao dịch gần đây theo phong cách thẻ: ngày, biểu tượng, danh mục và số tiền. */
function renderRecentMonthlyTransactions(transactions, accounts, month, categories = []) {
  const box = document.getElementById("recent-transactions");
  if (!box) return;

  box.replaceChildren();
  box.className = "fm-recent-list";

  if (!transactions.length) {
    const empty = document.createElement("p");
    empty.className = "dashboard-empty";
    empty.textContent = "Không có giao dịch trong tháng " + month.slice(5) + "/" + month.slice(0, 4) + ".";
    box.appendChild(empty);
    return;
  }

  const accountNames = new Map(accounts.map(a => [a.id, a.name]));
  const categoryNames = new Map(categories.map(c => [c.id, c.name]));
  const recent = [...transactions].sort((a, b) =>
    (b.date || "").localeCompare(a.date || "") ||
    (b.createdAt || "").localeCompare(a.createdAt || "") ||
    String(b.id).localeCompare(String(a.id))
  ).slice(0, 5);

  const iconByCategory = name => {
    const s = String(name || "").toLocaleLowerCase("vi-VN");
    if (/ăn|uống|thực phẩm/.test(s)) return "🍜";
    if (/mua sắm/.test(s)) return "🛒";
    if (/đi lại|di chuyển|xăng|xe/.test(s)) return "🚗";
    if (/hóa đơn|điện|nước|internet|sinh hoạt/.test(s)) return "🏠";
    if (/giải trí/.test(s)) return "🎮";
    if (/sức khỏe|y tế/.test(s)) return "💊";
    return "💸";
  };

  for (const tx of recent) {
    const type = ["income", "expense", "transfer"].includes(tx.type) ? tx.type : "expense";
    const kind = type === "income" ? "Thu nhập" : type === "expense" ? "Chi tiêu" : "Chuyển tiền";
    const categoryName = categoryNames.get(tx.categoryId);
    const from = accountNames.get(tx.accountId) || "Tài khoản không xác định";
    const to = accountNames.get(tx.toAccountId) || "Tài khoản không xác định";

    const row = document.createElement("div");
    row.className = "fm-recent-item";

    const [year = "", mon = "", day = ""] = String(tx.date || "").split("-");
    const dateEl = document.createElement("div");
    dateEl.className = "fm-recent-date";
    const dayEl = document.createElement("strong");
    dayEl.textContent = day || "--";
    const monthEl = document.createElement("span");
    monthEl.textContent = mon ? "Th" + Number(mon) : "--";
    dateEl.append(dayEl, monthEl);

    const note = typeof tx.note === "string" ? tx.note.trim() : "";
    const hasCategory = typeof categoryName === "string" && categoryName.trim() !== "";

    const icon = document.createElement("span");
    icon.className = "fm-recent-icon " + type;
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = type === "transfer" ? "🔄" :
      !hasCategory ? (type === "income" ? "💰" : "💸") :
      type === "income" ? "💵" : iconByCategory(categoryName);

    const main = document.createElement("div");
    main.className = "fm-recent-main";
    const title = document.createElement("strong");
    title.className = "fm-recent-title";
    // Có danh mục: tên danh mục. Chưa phân loại: ưu tiên ghi chú.
    title.textContent = type === "transfer" ? "Chuyển tiền" :
      hasCategory ? categoryName : (note || kind);

    const subtitle = document.createElement("small");
    subtitle.className = "fm-recent-subtitle";
    // Chuyển tiền luôn cho thấy cả hai tài khoản, kể cả khi có ghi chú.
    subtitle.textContent = type === "transfer" ? from + " → " + to :
      hasCategory ? (note || from) : (note ? from + " · " + kind : from);
    subtitle.title = subtitle.textContent;
    main.append(title, subtitle);

    if (type === "transfer" && note) {
      const noteEl = document.createElement("small");
      noteEl.className = "fm-recent-note";
      noteEl.textContent = note;
      noteEl.title = note;
      main.appendChild(noteEl);
    }

    const amount = document.createElement("strong");
    amount.className = "fm-recent-amount " + type;
    amount.textContent = (type === "income" ? "+" : type === "expense" ? "−" : "") + formatDashboardMoney(tx.amount);

    row.append(dateEl, icon, main, amount);
    box.appendChild(row);
  }
}

async function renderDashboardKPIs() {
  const requestId = ++dashboardKPIRequestId;
  const recentEl = document.getElementById("recent-transactions");
  const period = getSelectedDashboardMonth();

  try {
    setDashboardKPIState("loading");
    if (recentEl) {
      recentEl.className = "dashboard-recent-list";
      recentEl.textContent = "Đang tải giao dịch...";
    }

    // Một snapshot duy nhất để KPI và danh sách luôn nhất quán.
    const snapshot = await FinanceDB.getFinancialSnapshot();
    const result = await FinanceDataService.getFinancialSummary(snapshot);
    if (requestId !== dashboardKPIRequestId) return false;
    if (!result || !result.success || !result.summary) {
      throw new Error(result?.error || "Không thể tính số liệu tài chính");
    }

    const activeInMonth = snapshot.transactions.filter(tx =>
      tx.deletedAt == null &&
      typeof tx.date === "string" &&
      tx.date.startsWith(period + "-")
    );

    let totalIncome = 0;
    let totalExpense = 0;
    for (const tx of activeInMonth) {
      if (tx.type === "income") {
        totalIncome = addSafeMoney(totalIncome, tx.amount);
      } else if (tx.type === "expense") {
        totalExpense = addSafeMoney(totalExpense, tx.amount);
      }
      // transfer KHÔNG phải thu nhập hoặc chi tiêu.
    }
    const netIncome = addSafeMoney(totalIncome, -totalExpense);
    const values = {
      "total-balance": formatDashboardMoney(result.summary.totalBalance),
      "total-income": formatDashboardMoney(totalIncome),
      "total-expense": formatDashboardMoney(totalExpense),
      "net-income": formatDashboardMoney(netIncome)
    };

    Object.entries(values).forEach(([id, value]) => {
      document.getElementById(id).textContent = value;
    });
    setDashboardKPIState("success");

    // Danh mục phục vụ hiển thị: nếu đọc lỗi, KPI và lịch sử vẫn hoạt động.
    let recentCategories = [];
    try {
      recentCategories = await FinanceDB.getAll("categories");
    } catch (categoryError) {
      console.warn("[Dashboard] Không đọc được tên danh mục:", categoryError);
    }
    if (requestId !== dashboardKPIRequestId) return false;
    renderRecentMonthlyTransactions(activeInMonth, snapshot.accounts, period, recentCategories);
    // Hai biểu đồ được giữ trên Dashboard và dùng cùng tháng với KPI.
    // Không chặn KPI nếu biểu đồ gặp lỗi.
    if (window.FinanceDashboardVisuals && document.getElementById("fm-daily-chart")) {
      void window.FinanceDashboardVisuals.render(snapshot, period).catch(error => {
        console.error("[Dashboard Charts] Không thể hiển thị biểu đồ:", error);
      });
    }
    return true;
  } catch (error) {
    if (requestId !== dashboardKPIRequestId) return false;
    console.error("[Dashboard] Không thể tải tháng", period, error);
    setDashboardKPIState("error");
    if (recentEl) {
      recentEl.className = "dashboard-recent-list";
      recentEl.textContent = "Không thể tải giao dịch. Vui lòng thử lại.";
    }
    return false;
  }
}

window.renderDashboardKPIs = renderDashboardKPIs;

function initDashboardMonth() {
  const field = document.getElementById("dashboard-month");
  if (!field) return;
  if (!field.value) field.value = getLocalMonth();
  field.addEventListener("change", () => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(field.value)) return;
    renderDashboardKPIs().catch(error => console.error("[Dashboard] Lỗi đổi tháng", error));
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDashboardMonth, { once: true });
} else {
  initDashboardMonth();
}

/* =========================================
   QUẢN LÝ TRẠNG THÁI DASHBOARD KPI
   ========================================= */

function setDashboardKPIState(state) {

  const validStates = [
    "loading",
    "success",
    "error"
  ];

  if (!validStates.includes(state)) {
    throw new Error(
      "Trạng thái Dashboard không hợp lệ: " + state
    );
  }

  const ids = [
    "total-balance",
    "total-income",
    "total-expense",
    "net-income"
  ];

  // Kiểm tra đầy đủ phần tử trước khi thay đổi
  const elements = ids.map(id =>
    document.getElementById(id)
  );

  if (elements.some(element => !element)) {
    throw new Error(
      "Không tìm thấy đầy đủ 4 phần tử KPI Dashboard"
    );
  }

  const displayText = {
    loading: "Đang tải...",
    error: "Không có dữ liệu"
  };

  elements.forEach(element => {

    // Lưu trạng thái để kiểm tra
    element.dataset.kpiState = state;

    // Chỉ ghi nội dung khi loading hoặc error
    // success giữ nguyên số tiền đã được render
    if (state !== "success") {
      element.textContent = displayText[state];
    }

    // Hỗ trợ nhận biết trạng thái
    element.setAttribute(
      "aria-busy",
      state === "loading" ? "true" : "false"
    );

  });

  return true;
}

// Cho phép kiểm tra thủ công từ Console
window.setDashboardKPIState =
  setDashboardKPIState;

// Cung cấp cho ứng dụng và Console
window.FinanceDataService = FinanceDataService;
