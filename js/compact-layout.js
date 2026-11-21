/* Finance Manager 1.2 — Bố cục gọn: dashboard, thống kê, ngân sách riêng.
   Chỉ di chuyển DOM, không thay đổi dữ liệu hoặc các giao dịch. */
"use strict";
(() => {
  const $ = id => document.getElementById(id);
  let request = 0;
  const currentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  };
  const monthValid = v => /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

  function setup() {
    const dashboard = $("page-dashboard");
    const statistics = $("page-statistics");
    const nav = document.querySelector(".sidebar-nav");
    if (!dashboard || !statistics || !nav) return;

    // Chỉ di chuyển khối Nhận xét, không di chuyển hai biểu đồ.
    // Không tạo bộ chọn tháng thứ hai: dùng chung bộ lọc đa kỳ của Thống kê.
    const insights = dashboard.querySelector("#fm-insight-list")?.closest(".fm-extra-card");
    if (insights && !statistics.contains(insights)) {
      const extras = insights.closest(".fm-dashboard-extras");
      const section = document.createElement("section");
      section.className = "fm-analysis-section";
      section.id = "fm-unified-insights";
      insights.classList.add("fm-analysis-insights");
      section.appendChild(insights);
      const anchor = statistics.querySelector(".fm-stats-panels") || $("stats-data-note");
      if (anchor) anchor.insertAdjacentElement("afterend", section);
      else statistics.appendChild(section);
      if (extras && !extras.children.length) extras.remove();
    }
    // Tương thích trường hợp đã có thanh tháng riêng trong DOM.
    const oldSection = statistics.querySelector(".fm-analysis-section:not(#fm-unified-insights)");
    if (oldSection) {
      const existing = oldSection.querySelector("#fm-insight-list")?.closest(".fm-extra-card");
      if (existing) {
        let target = $("fm-unified-insights");
        if (!target) {
          target = document.createElement("section");
          target.id = "fm-unified-insights";
          target.className = "fm-analysis-section";
          oldSection.insertAdjacentElement("beforebegin", target);
        }
        target.appendChild(existing);
      }
      oldSection.remove();
    }
    // Thao tác nhanh đã trùng với nút Thêm giao dịch, bỏ khỏi trang chủ.
    dashboard.querySelectorAll("[data-fm-quick-kind]").forEach(button => button.closest(".fm-extra-card")?.remove());
    dashboard.querySelectorAll(".fm-dashboard-extras").forEach(el => { if (!el.children.length) el.remove(); });

    // Chuyển Ngân sách thành trang thực thụ; chỉ một nút menu.
    if (!$("page-budgets")) {
      const page = document.createElement("section");
      page.id = "page-budgets";
      page.className = "page";
      page.hidden = true;
      page.innerHTML = `<div class="fm-budget-toolbar content-card"><div><h2>Ngân sách theo tháng</h2><p>Đặt hạn mức và theo dõi chi tiêu theo danh mục.</p></div><label for="fm-budget-month">Chọn tháng <input type="month" id="fm-budget-month"></label></div>`;
      $("fm-budget-month");
      page.querySelector("#fm-budget-month").value = currentMonth();
      statistics.insertAdjacentElement("afterend", page);
    }
    if (!nav.querySelector('[data-page="budgets"]')) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "nav-item";
      button.dataset.page = "budgets";
      button.textContent = "🎯 Ngân sách";
      const statsButton = nav.querySelector('[data-page="statistics"]');
      if (statsButton) statsButton.insertAdjacentElement("afterend", button);
      else nav.appendChild(button);
    }
  }

  async function renderStatisticsVisuals(existing = null) {
    const page = $("page-statistics");
    if (!page?.classList.contains("active") || !$("fm-insight-list")) return;
    const token = ++request;
    try {
      // Ưu tiên cùng snapshot + cùng khoảng thời gian của bảng Thống kê.
      const period = existing?.period || window.FinanceStatistics?.resolvePeriod();
      if (!period) return;
      const snapshot = existing?.snapshot || await FinanceDB.getFinancialSnapshot();
      const categories = existing?.categories || await FinanceDB.getAll("categories");
      if (token !== request || !page.classList.contains("active")) return;
      await window.FinanceDashboardExtras?.renderInsights(snapshot, period, categories);
    } catch (error) {
      if (token !== request) return;
      console.error("[Finance Insights] Không thể tải nhận xét:", error);
      const output = $("fm-insight-list");
      if (output) output.textContent = "Không thể tổng hợp nhận xét cho khoảng thời gian đã chọn.";
    }
  }

  window.FinanceCompactLayout = {setup, renderStatisticsVisuals};
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup, {once:true});
  else setup();
})();
