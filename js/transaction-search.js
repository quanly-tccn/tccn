"use strict";

/* Finance Manager — Tìm kiếm lịch sử giao dịch (chỉ đọc / lọc giao diện). */
(() => {
  const rootId = "fm-transaction-search";
  const normalize = value => String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLocaleLowerCase("vi-VN")
    .trim();

  function buildUI(list) {
    const wrapper = document.createElement("section");
    wrapper.id = rootId;
    wrapper.className = "fm-search";
    wrapper.setAttribute("aria-label", "Tìm kiếm và lọc giao dịch");

    const heading = document.createElement("div");
    heading.className = "fm-search-heading";
    const title = document.createElement("strong");
    title.textContent = "Tìm kiếm giao dịch";
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "fm-search-clear";
    clear.textContent = "Xóa bộ lọc";
    heading.append(title, clear);

    const fields = document.createElement("div");
    fields.className = "fm-search-fields";

    function field(labelText, control, className = "") {
      const label = document.createElement("label");
      label.className = "fm-search-field " + className;
      const span = document.createElement("span");
      span.textContent = labelText;
      label.append(span, control);
      return label;
    }
    function select(options) {
      const element = document.createElement("select");
      for (const [value, label] of options) {
        element.add(new Option(label, value));
      }
      return element;
    }
    const query = document.createElement("input");
    query.type = "search";
    query.placeholder = "Danh mục, ghi chú, tên giao dịch, tài khoản…";
    query.autocomplete = "off";
    query.setAttribute("aria-label", "Từ khóa tìm kiếm giao dịch");
    const kind = select([["", "Tất cả loại"], ["income", "Thu nhập"], ["expense", "Chi tiêu"], ["transfer", "Chuyển tiền"]]);
    const category = select([["", "Tất cả danh mục"]]);
    const start = document.createElement("input");
    start.type = "date";
    const end = document.createElement("input");
    end.type = "date";
    fields.append(
      field("Từ khóa", query, "fm-search-query"),
      field("Loại giao dịch", kind),
      field("Danh mục", category),
      field("Từ ngày", start),
      field("Đến ngày", end)
    );

    const status = document.createElement("p");
    status.className = "fm-search-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    const noMatches = document.createElement("p");
    noMatches.className = "fm-search-no-matches";
    noMatches.textContent = "Không tìm thấy giao dịch phù hợp. Bạn hãy thử thay đổi bộ lọc.";
    noMatches.hidden = true;

    wrapper.append(heading, fields, status);
    list.parentNode.insertBefore(wrapper, list);
    list.insertAdjacentElement("afterend", noMatches);
    return { query, kind, category, start, end, clear, status, noMatches };
  }

  async function init() {
    const list = document.getElementById("transactions-list");
    if (!list || document.getElementById(rootId)) return;
    const ui = buildUI(list);
    let generation = 0;

    // Giá trị danh mục được so theo tên xuất hiện trong lịch sử, kể cả danh mục lưu trữ.
    async function loadCategories() {
      if (!window.FinanceDB?.getAll) return;
      const request = ++generation;
      try {
        const categories = await FinanceDB.getAll("categories");
        if (request !== generation) return;
        const selected = ui.category.value;
        const names = [...new Set(categories.map(c => c.name).filter(Boolean))]
          .sort((a, b) => a.localeCompare(b, "vi"));
        ui.category.replaceChildren(new Option("Tất cả danh mục", ""));
        ui.category.add(new Option("Không phân loại", "__none__"));
        for (const name of names) ui.category.add(new Option(name, name));
        if ([...ui.category.options].some(o => o.value === selected)) ui.category.value = selected;
        applyFilters();
      } catch (error) {
        console.error("[Transaction Search] Không đọc được danh mục:", error);
      }
    }

    function applyFilters() {
      const rows = [...list.querySelectorAll(".transaction-history-item")];
      const words = normalize(ui.query.value).split(/\s+/).filter(Boolean);
      const selectedCategory = normalize(ui.category.value);
      const type = ui.kind.value;
      const from = ui.start.value;
      const to = ui.end.value;
      let count = 0;

      for (const row of rows) {
        const details = row.querySelector(".fm-transaction-details")?.textContent || "";
        const amount = row.querySelector(".fm-transaction-amount");
        const rowType = amount?.classList.contains("is-income") ? "income" :
          amount?.classList.contains("is-expense") ? "expense" :
          amount?.classList.contains("is-transfer") ? "transfer" : "";
        const date = details.slice(0, 10);
        const lastSeparator = details.lastIndexOf(" · ");
        const cat = rowType === "transfer" ? "" :
          (lastSeparator >= 0 ? details.slice(lastSeparator + 3) : "");
        const categoryMatch = !selectedCategory ||
          (ui.category.value === "__none__" && normalize(cat) === "chua phan loai") ||
          (ui.category.value !== "__none__" && normalize(cat) === selectedCategory);
        const text = normalize(row.textContent);
        const visible = words.every(word => text.includes(word)) &&
          (!type || type === rowType) && categoryMatch &&
          (!from || date >= from) && (!to || date <= to);
        row.hidden = !visible;
        if (visible) count++;
      }
      ui.status.textContent = rows.length
        ? `Hiển thị ${count} / ${rows.length} giao dịch`
        : "Chưa có giao dịch để tìm kiếm.";
      ui.noMatches.hidden = rows.length === 0 || count !== 0;
    }

    for (const control of [ui.query, ui.kind, ui.category, ui.start, ui.end]) {
      control.addEventListener("input", applyFilters);
      control.addEventListener("change", applyFilters);
    }
    ui.clear.addEventListener("click", () => {
      ui.query.value = "";
      ui.kind.value = "";
      ui.category.value = "";
      ui.start.value = "";
      ui.end.value = "";
      applyFilters();
      ui.query.focus();
    });

    // renderTransactions() thay toàn bộ danh sách khi thêm/sửa/xóa/chuyển trang.
    // Theo dõi việc thay hàng thay vì sửa lại nghiệp vụ tài chính.
    new MutationObserver(applyFilters).observe(list, { childList: true });
    window.addEventListener("finance:data-changed", () => {
      void loadCategories();
    });
    void loadCategories();
    applyFilters();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    void init();
  }
})();
