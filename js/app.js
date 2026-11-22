
/* =========================================
   FINANCE MANAGER
   APP.JS - ĐIỀU HƯỚNG ỨNG DỤNG
   ========================================= */

"use strict";

// 1. CẤU HÌNH CÁC TRANG

const APP_PAGES = {
  dashboard: {
    title: "Tổng quan tài chính",
    description: "Theo dõi thu nhập và chi tiêu của bạn"
  },

  transactions: {
    title: "Quản lý giao dịch",
    description: "Ghi chép và theo dõi các khoản thu chi"
  },

  categories: {
    title: "Quản lý danh mục",
    description: "Quản lý các danh mục thu nhập và chi tiêu"
  },

  accounts: {
    title: "Quản lý tài khoản",
    description: "Theo dõi tiền mặt, ngân hàng và ví điện tử"
  },

  statistics: {
    title: "Thống kê tài chính",
    description: "Phân tích thu nhập và chi tiêu"
  },
  budgets: {
    title: "Ngân sách theo tháng",
    description: "Theo dõi hạn mức chi tiêu cho từng danh mục"
  }
};

// 2. CHUYỂN TRANG

function navigateTo(pageName) {

  if (!Object.hasOwn(APP_PAGES, pageName)) {
    console.warn("Trang không tồn tại:", pageName);
    return;
  }

  // Ẩn các trang
  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
    page.hidden = true;
  });

  // Hiển thị trang được chọn
  const selectedPage = document.getElementById(
    "page-" + pageName
  );

  if (!selectedPage) {
    console.error("Không tìm thấy trang:", pageName);
    return;
  }

  selectedPage.hidden = false;
  selectedPage.classList.add("active");

  // Cập nhật trạng thái menu
  document.querySelectorAll(".nav-item").forEach(button => {

    const isActive = button.dataset.page === pageName;

    button.classList.toggle("active", isActive);

    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  // Cập nhật tiêu đề
  const pageConfig = APP_PAGES[pageName];

  const titleElement = document.querySelector(
    ".top-header h1"
  );

  const descriptionElement = document.querySelector(
    ".top-header p"
  );

  if (titleElement) {
    titleElement.textContent = pageConfig.title;
  }

  if (descriptionElement) {
    descriptionElement.textContent = pageConfig.description;
  }

  // Ghi nhớ trang đang mở
  try {
    sessionStorage.setItem("finance_current_page", pageName);
  } catch (error) {
    console.warn("Không thể lưu trang hiện tại:", error);
  }

  // Trở về đầu nội dung
  window.scrollTo({
    top: 0,
    behavior: "instant"
  });


  // Tải KPI khi chuyển sang Dashboard
  if (pageName === "dashboard") {

    if (typeof window.renderDashboardKPIs === "function") {

      window.renderDashboardKPIs().catch(error => {
        console.error(
          "[Finance Manager] Lỗi tải Dashboard:",
          error
        );
      });

    } else {

      console.error(
        "[Finance Manager] Chưa tìm thấy renderDashboardKPIs()"
      );

    }

  }

// Tải danh sách khi mở trang Tài khoản
if (pageName === "accounts") {
  window.renderAccounts().catch(error => {
    console.error(
      "[Finance Manager] Lỗi tải tài khoản:",
      error
    );
  });
}


  // Tải dữ liệu khi mở trang Giao dịch
  if (pageName === "transactions") {
    window.loadTransactionsPage().catch(error => {
      console.error(
        "[Finance Manager] Lỗi tải giao dịch:",
        error
      );
    });
  }
if (pageName === "categories") {
  window.renderCategories().catch(error => {
    console.error("[Categories] Lỗi tải danh mục:", error);
  });
}

if (pageName === "statistics") {
  window.renderCategoryStatistics().catch(error => {
    console.error(
      "[Statistics] Không thể tải thống kê:",
      error
    );
  });
}
if (pageName === "statistics" && window.FinanceCompactLayout) {
  void window.FinanceCompactLayout.renderStatisticsVisuals();
}
if (pageName === "budgets" && window.FinanceBudgets) {
  void window.FinanceBudgets.render();
}

  console.log("[Finance Manager] Đã mở:", pageName);
}

// 3. KHỞI TẠO MENU

function initNavigation() {

  document.querySelectorAll(".nav-item").forEach(button => {

    button.addEventListener("click", () => {
      const pageName = button.dataset.page;
      navigateTo(pageName);
    });

  });

  // Nút Xem tất cả
  const viewAllButton = document.getElementById(
    "btn-view-all"
  );

  if (viewAllButton) {
    viewAllButton.addEventListener("click", () => {
      navigateTo("transactions");
    });
  }

  // Nút Thêm giao dịch
  const addTransactionButton = document.getElementById(
    "btn-add-transaction"
  );

  if (addTransactionButton) {
    addTransactionButton.addEventListener("click", () => {
      navigateTo("transactions");

    });
  }
}

/* =========================================
   LÀM MỚI GIAO DIỆN SAU KHI DỮ LIỆU ĐỔI

   - Trang Giao dịch/Tài khoản/Danh mục đã tự cập nhật
     danh sách ngay trong handler lưu thành công.
   - Dashboard/Thống kê thường chỉ đọc dữ liệu:
     nếu đang mở thì tải lại tự động.
   - Khi chuyển trang, navigateTo() vẫn tải dữ liệu mới.
   - Gộp nhiều sự kiện ghi liên tiếp thành một lần tải,
     tránh gọi lặp nếu tạo nhiều danh mục gợi ý.
   ========================================= */
let financeRefreshQueued = false;
let financeRefreshInProgress = false;
let financeRefreshPending = false;

function currentFinancePage() {
  const active = document.querySelector(".page.active");
  return active ? active.id.replace(/^page-/, "") : null;
}

async function refreshVisibleFinanceSummary() {
  const page = currentFinancePage();
  if (page === "dashboard" && typeof window.renderDashboardKPIs === "function") {
    await window.renderDashboardKPIs();
  } else if (page === "statistics") {
    if (typeof window.renderCategoryStatistics === "function") await window.renderCategoryStatistics();
    if (window.FinanceCompactLayout) await window.FinanceCompactLayout.renderStatisticsVisuals();
  }
}

function queueFinanceRefresh() {
  if (financeRefreshQueued) return;
  financeRefreshQueued = true;
  // Gom những thông báo trong cùng lượt JavaScript.
  queueMicrotask(async () => {
    financeRefreshQueued = false;
    if (financeRefreshInProgress) {
      financeRefreshPending = true;
      return;
    }
    financeRefreshInProgress = true;
    try {
      do {
        financeRefreshPending = false;
        await refreshVisibleFinanceSummary();
      } while (financeRefreshPending);
    } catch (error) {
      console.error("[Finance Manager] Không thể làm mới số liệu:", error);
    } finally {
      financeRefreshInProgress = false;
    }
  });
}

window.addEventListener("finance:data-changed", queueFinanceRefresh);

// 4. KHỞI ĐỘNG ỨNG DỤNG

function initApp() {

  console.log("[Finance Manager] Khởi động ứng dụng...");

  initNavigation();

  let savedPage = "dashboard";

  try {
    savedPage = sessionStorage.getItem(
      "finance_current_page"
    ) || "dashboard";
  } catch (error) {
    console.warn("Không thể đọc trang đã lưu:", error);
  }

  if (!Object.hasOwn(APP_PAGES, savedPage)) {
    savedPage = "dashboard";
  }

  navigateTo(savedPage);

  console.log("[Finance Manager] Khởi động thành công!");
}


// 5. CHỜ HTML TẢI XONG

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

/* =========================================
   FINANCE MANAGER - LIVE CLOCK
   ========================================= */

(function () {
  "use strict";

  function updateFinanceClock() {
    const dateEl = document.getElementById("fm-clock-date");
    const timeEl = document.getElementById("fm-clock-time");

    if (!dateEl || !timeEl) return;

    const now = new Date();

    const date = new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(now);

    const time = new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }).format(now);

    dateEl.textContent = "📅 " + date;
    timeEl.textContent = "🕒 " + time;
  }

  function initFinanceClock() {
    updateFinanceClock();

    // Chỉ tạo một bộ đếm cho mỗi lần tải trang.
    setInterval(updateFinanceClock, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initFinanceClock,
      { once: true }
    );
  } else {
    initFinanceClock();
  }

  // Cho phép kiểm tra trực tiếp từ Console.
  window.updateFinanceClock = updateFinanceClock;
})();
