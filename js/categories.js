"use strict";
/* Finance Manager - danh mục Thu/Chi. Không sửa dữ liệu tài chính khi quản lý danh mục. */
(() => {
  const $ = id => document.getElementById(id);
  const presets = {
    expense: ["Ăn uống", "Đi lại", "Mua sắm", "Hóa đơn", "Sức khỏe", "Giải trí", "Khác"],
    income: ["Lương", "Thưởng", "Kinh doanh", "Thu nhập khác"]
  };
  let editingId = null;
  let busy = false;
  const safeText = (v) => String(v ?? "").trim();

  function setMode(type) {
    $("cat-type").value = type;
    document.querySelectorAll('input[name="cat-type-radio"]').forEach(r => r.checked = r.value === type);
  }
  function cancelEdit() {
    if (busy) return;
    editingId = null;
    $("category-form").reset();
    setMode("expense");
    $("cat-save").textContent = "Thêm danh mục";
    $("cat-cancel").hidden = true;
  }

  async function renderCategories() {
    const box = $("categories-list");
    if (!box) return;
    box.textContent = "Đang tải danh mục...";
    try {
      const categories = await FinanceDB.getAll("categories");
      const list = categories.slice().sort((a,b) => (a.type === b.type ? a.name.localeCompare(b.name,"vi") : a.type === "expense" ? -1 : 1));
      box.replaceChildren();
      for (const type of ["expense", "income"]) {
        const heading = document.createElement("h3");
        heading.textContent = type === "expense" ? "Chi tiêu" : "Thu nhập";
        heading.style.cssText = "font-size:16px;margin:15px 0 9px";
        box.appendChild(heading);
        const subset = list.filter(c => c.type === type);
        if (!subset.length) {
          const p = document.createElement("p");
          p.textContent = "Chưa có danh mục.";
          p.style.color = "#64748b";
          box.appendChild(p);
        }
        for (const cat of subset) {
          const row = document.createElement("div");
          row.className = "category-item";
          const title = document.createElement("span");
          title.textContent = cat.name + (cat.status === "inactive" ? " (Đã lưu trữ)" : "");
          if (cat.status === "inactive") title.style.color = "#64748b";
          const actions = document.createElement("div");
          actions.className = "category-actions";
          const edit = document.createElement("button");
          edit.type = "button"; edit.textContent = "✏️ Sửa";
          edit.addEventListener("click", () => {
            if (busy) return;
            editingId = cat.id;
            $("cat-name").value = cat.name;
            setMode(cat.type);
            $("cat-save").textContent = "Lưu thay đổi";
            $("cat-cancel").hidden = false;
            $("category-form").scrollIntoView({behavior:"smooth",block:"center"});
            $("cat-name").focus();
          });
          const remove = document.createElement("button");
          remove.type = "button";
          remove.textContent = cat.status === "inactive" ? "↩ Khôi phục" : "🗑 Xóa";
          remove.addEventListener("click", async () => {
            if (busy) return;
            if (cat.status === "inactive") {
              busy = true;
              try { await FinanceDB.update("categories", cat.id, {status:"active"}); await renderCategories(); }
              catch(e) { alert("Không thể khôi phục: " + e.message); }
              finally { busy = false; }
              return;
            }
            if (!confirm(`Xóa danh mục “${cat.name}”?\n\nDanh mục đã được giao dịch sử dụng sẽ được lưu trữ thay vì xóa.`)) return;
            busy = true;
            try {
              const transactions = await FinanceDB.getByIndex("transactions","categoryId",cat.id);
              const children = await FinanceDB.getByIndex("categories","parentId",cat.id);
              if (transactions.length || children.length) {
                await FinanceDB.update("categories",cat.id,{status:"inactive"});
                alert("Danh mục đã được lưu trữ để bảo toàn các giao dịch cũ.");
              } else await FinanceDB.delete("categories",cat.id);
              if (editingId === cat.id) {
                editingId = null;
                $("category-form").reset();
                setMode("expense");
                $("cat-save").textContent = "Thêm danh mục";
                $("cat-cancel").hidden = true;
              }
              await renderCategories();
            } catch(e) { alert("Không thể xử lý danh mục: " + e.message); }
            finally { busy = false; }
          });
          actions.append(edit,remove); row.append(title,actions); box.appendChild(row);
        }
      }
    } catch(e) { console.error("[Categories]",e); box.textContent = "Không thể tải danh mục."; }
  }

  async function saveCategory(event) {
    event.preventDefault();
    if (busy) return;
    const name = safeText($("cat-name").value);
    const type = $("cat-type").value;
    if (!name || name.length > 80 || !["expense","income"].includes(type)) {
      alert("Vui lòng nhập tên danh mục hợp lệ (tối đa 80 ký tự)."); return;
    }
    busy = true; $("cat-save").disabled = true;
    let persisted = false;
    try {
      const list = await FinanceDB.getAll("categories");
      if (list.some(c => c.id !== editingId && c.type === type && c.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi"))) {
        throw new Error("Danh mục cùng tên và loại đã tồn tại.");
      }
      if (editingId) {
        const old = await FinanceDB.get("categories",editingId);
        if (!old) throw new Error("Danh mục không còn tồn tại.");
        if (old.type !== type) {
          const referenced = await FinanceDB.getByIndex("transactions","categoryId",editingId);
          if (referenced.length) throw new Error("Danh mục đã được sử dụng, không thể đổi giữa Thu và Chi.");
        }
        await FinanceDB.update("categories",editingId,{name,type});
      } else {
        await FinanceDB.add("categories",{
          id:FinanceDB.generateId(),name,type,parentId:null,status:"active",createdAt:new Date().toISOString()
        });
      }
      persisted = true;
      editingId = null; $("category-form").reset(); setMode("expense");
      $("cat-save").textContent = "Thêm danh mục"; $("cat-cancel").hidden = true;
      await renderCategories();
    } catch(e) {
      console.error("[Categories]",e);
      alert(persisted ? "Đã lưu nhưng chưa tải lại danh sách; hãy mở lại trang." : "Không thể lưu danh mục: " + e.message);
    } finally { busy = false; $("cat-save").disabled = false; }
  }

  async function insertPresets() {
    if (busy) return;
    if (!confirm("Thêm các danh mục gợi ý chưa có? Các danh mục hiện tại được giữ nguyên.")) return;
    busy = true;
    const button = $("cat-presets"); button.disabled = true;
    let inserted = 0;
    try {
      const existing = await FinanceDB.getAll("categories");
      for (const [type,names] of Object.entries(presets)) {
        for (const name of names) {
          if (existing.some(c => c.type === type && c.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi"))) continue;
          await FinanceDB.add("categories",{id:FinanceDB.generateId(),name,type,parentId:null,status:"active",createdAt:new Date().toISOString()});
          existing.push({name,type}); inserted++;
        }
      }
      await renderCategories();
      alert(`Đã thêm ${inserted} danh mục mới.`);
    } catch(e) { alert(`Đã thêm ${inserted} danh mục trước khi gặp lỗi. Hãy kiểm tra danh sách: ${e.message}`); }
    finally { busy = false; button.disabled = false; }
  }

  function init() {
    if (!$("category-form")) return;
    document.querySelectorAll('input[name="cat-type-radio"]').forEach(r => r.addEventListener("change",()=>{if(r.checked) setMode(r.value);}));
    $("category-form").addEventListener("submit",saveCategory);
    $("cat-cancel").addEventListener("click",cancelEdit);
    $("cat-presets").addEventListener("click",insertPresets);
  }
  window.renderCategories = renderCategories;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
