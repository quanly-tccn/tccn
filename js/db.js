
/* =========================================
   FINANCE MANAGER
   DB.JS - INDEXEDDB DATABASE
   ========================================= */

"use strict";

// 1. CẤU HÌNH DATABASE

const DB_CONFIG = {
  name: "FinanceManagerDB",
  version: 1
};

// 2. CẤU HÌNH OBJECT STORES

const DB_STORES = {
  accounts: {
    keyPath: "id",
    indexes: [
      ["type", "type"],
      ["status", "status"]
    ]
  },

  categories: {
    keyPath: "id",
    indexes: [
      ["type", "type"],
      ["parentId", "parentId"],
      ["status", "status"]
    ]
  },

  transactions: {
    keyPath: "id",
    indexes: [
      ["date", "date"],
      ["type", "type"],
      ["accountId", "accountId"],
      ["toAccountId", "toAccountId"],
      ["categoryId", "categoryId"],
      ["deletedAt", "deletedAt"]
    ]
  },

  transaction_audits: {
    keyPath: "id",
    indexes: [
      ["transactionId", "transactionId"],
      ["createdAt", "createdAt"]
    ]
  },

  attachments: {
    keyPath: "id",
    indexes: [
      ["transactionId", "transactionId"]
    ]
  },

  settings: {
    keyPath: "key",
    indexes: []
  }
};

// 3. BIẾN KẾT NỐI

let financeDB = null;
let dbOpeningPromise = null;

// 4. MỞ DATABASE

function openFinanceDB() {

  if (financeDB) {
    return Promise.resolve(financeDB);
  }

  if (dbOpeningPromise) {
    return dbOpeningPromise;
  }

  dbOpeningPromise = new Promise((resolve, reject) => {

    if (!("indexedDB" in window)) {
      reject(new Error(
        "Trình duyệt không hỗ trợ IndexedDB"
      ));
      return;
    }

    const request = indexedDB.open(
      DB_CONFIG.name,
      DB_CONFIG.version
    );

    // Tạo object stores khi database mới được tạo
    request.onupgradeneeded = (event) => {

      const db = event.target.result;
      const upgradeTransaction = event.target.transaction;

      console.log(
        "[DB] Đang khởi tạo database phiên bản:",
        DB_CONFIG.version
      );

      Object.entries(DB_STORES).forEach(
        ([storeName, config]) => {

          let store;

          if (!db.objectStoreNames.contains(storeName)) {

            store = db.createObjectStore(
              storeName,
              { keyPath: config.keyPath }
            );

          } else {

            store = upgradeTransaction.objectStore(
              storeName
            );

          }

          config.indexes.forEach(([indexName, keyPath]) => {

            if (!store.indexNames.contains(indexName)) {
              store.createIndex(indexName, keyPath, {
                unique: false
              });
            }

          });

        }
      );

    };

    request.onsuccess = () => {

      const db = request.result;

      // Đóng kết nối khi cần nâng cấp database
      db.onversionchange = () => {
        console.warn(
          "[DB] Có phiên bản database mới. Đóng kết nối cũ."
        );

        db.close();

        if (financeDB === db) {
          financeDB = null;
        }
      };

      financeDB = db;

      console.log(
        "[DB] Kết nối IndexedDB thành công!"
      );

      resolve(db);
    };

    request.onerror = () => {
      reject(
        request.error ||
        new Error("Không thể mở IndexedDB")
      );
    };

    request.onblocked = () => {
      console.warn(
        "[DB] Database bị chặn bởi kết nối cũ."
      );
    };

  }).finally(() => {
    dbOpeningPromise = null;
  });

  return dbOpeningPromise;
}

// 5. TẠO ID DUY NHẤT

function generateId() {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error(
      "Trình duyệt không hỗ trợ crypto.randomUUID()."
    );
  }

  return crypto.randomUUID();
}

// 6. HIỂN THỊ THÔNG TIN DATABASE

async function inspectFinanceDB() {

  const db = await openFinanceDB();

  const stores = Array.from(db.objectStoreNames);

  console.log(
    "[DB] Database:",
    db.name
  );

  console.log(
    "[DB] Phiên bản:",
    db.version
  );

  console.table(
    stores.map(name => ({
      objectStore: name
    }))
  );

  return {
    name: db.name,
    version: db.version,
    stores
  };
}

/* =========================================
   6A. THÊM MỘT BẢN GHI
   ========================================= */

async function dbAdd(storeName, data) {

  const db = await openFinanceDB();

  if (!db.objectStoreNames.contains(storeName)) {
    throw new Error(
      "Object store không tồn tại: " + storeName
    );
  }

  return new Promise((resolve, reject) => {

    const tx = db.transaction(
      storeName,
      "readwrite"
    );

    const store = tx.objectStore(storeName);

    let insertedId;

    // Không thay đổi dữ liệu gốc
    const record = structuredClone(data);

    const request = store.add(record);

    request.onsuccess = () => {
      insertedId = request.result;
    };

    // Chỉ xác nhận khi transaction hoàn tất
    tx.oncomplete = () => {
      resolve(insertedId);
    };

    tx.onerror = () => {
    reject(
        request.error ||
        tx.error ||
        new Error("Không thể thêm bản ghi")
    );
    };

    tx.onabort = () => {
    reject(
        request.error ||
        tx.error ||
        new Error("Giao dịch đã bị hủy")
    );
    };

  });
}


/* =========================================
   6B. ĐỌC MỘT BẢN GHI THEO ID
   ========================================= */

async function dbGet(storeName, id) {

  const db = await openFinanceDB();

  if (!db.objectStoreNames.contains(storeName)) {
    throw new Error(
      "Object store không tồn tại: " + storeName
    );
  }

  return new Promise((resolve, reject) => {

    const tx = db.transaction(
      storeName,
      "readonly"
    );

    const store = tx.objectStore(storeName);

    let result;

    const request = store.get(id);

    request.onsuccess = () => {
      result = request.result;
    };

    tx.oncomplete = () => {
      resolve(result ?? null);
    };

    tx.onerror = () => {
      reject(
        tx.error ||
        new Error("Không thể đọc bản ghi")
      );
    };

    tx.onabort = () => {
      reject(
        tx.error ||
        new Error("Giao dịch đọc đã bị hủy")
      );
    };

  });
}

// 7. ĐƯA HÀM VÀO PHẠM VI GLOBAL
// Chỉ dùng trong giai đoạn phát triển.

/* =========================================
   6C. LẤY TOÀN BỘ BẢN GHI
   ========================================= */

async function dbGetAll(storeName) {

  const db = await openFinanceDB();

  if (!db.objectStoreNames.contains(storeName)) {
    throw new Error(
      "Object store không tồn tại: " + storeName
    );
  }

  return new Promise((resolve, reject) => {

    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);

    let records = [];

    const request = store.getAll();

    request.onsuccess = () => {
      records = request.result;
    };

    tx.oncomplete = () => {
      resolve(records);
    };

    tx.onerror = () => {
      reject(tx.error || new Error("Không thể đọc danh sách"));
    };

    tx.onabort = () => {
      reject(tx.error || new Error("Giao dịch đọc bị hủy"));
    };

  });
}

/* =========================================
   ĐỌC DỮ LIỆU TÀI CHÍNH NHẤT QUÁN
   ========================================= */

async function dbGetFinancialSnapshot() {

  const db = await openFinanceDB();

  return new Promise((resolve, reject) => {

    // 1. Tạo một readonly transaction
    // bao gồm hai object store
    const tx = db.transaction(
      ["accounts", "transactions"],
      "readonly"
    );

    // 2. Tạo hai yêu cầu đọc trong
    // cùng một transaction
    const accountsRequest = tx
      .objectStore("accounts")
      .getAll();

    const transactionsRequest = tx
      .objectStore("transactions")
      .getAll();

    let accounts = null;
    let transactions = null;

    // 3. Nhận kết quả đọc
    accountsRequest.onsuccess = () => {
      accounts = accountsRequest.result;
    };

    transactionsRequest.onsuccess = () => {
      transactions = transactionsRequest.result;
    };

    // 4. Chỉ trả dữ liệu khi toàn bộ
    // transaction hoàn tất
    tx.oncomplete = () => {

      resolve({
        accounts,
        transactions
      });

    };

    // 5. Giữ lỗi gốc nếu đọc thất bại
    tx.onerror = () => {
      reject(
        accountsRequest.error ||
        transactionsRequest.error ||
        tx.error ||
        new Error("Không thể đọc dữ liệu tài chính")
      );
    };

    tx.onabort = () => {
      reject(
        accountsRequest.error ||
        transactionsRequest.error ||
        tx.error ||
        new Error("Transaction đọc dữ liệu đã bị hủy")
      );
    };

  });
}


/* =========================================
   6D. TRUY VẤN THEO INDEX
   ========================================= */

async function dbGetByIndex(storeName, indexName, value) {

  const db = await openFinanceDB();

  if (!db.objectStoreNames.contains(storeName)) {
    throw new Error(
      "Object store không tồn tại: " + storeName
    );
  }

  return new Promise((resolve, reject) => {

    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);

    if (!store.indexNames.contains(indexName)) {
      reject(new Error(
        "Index không tồn tại: " + indexName
      ));
      return;
    }

    const index = store.index(indexName);

    let records = [];

    const request = index.getAll(value);

    request.onsuccess = () => {
      records = request.result;
    };

    tx.oncomplete = () => {
      resolve(records);
    };

    tx.onerror = () => {
      reject(tx.error || new Error("Không thể truy vấn index"));
    };

    tx.onabort = () => {
      reject(tx.error || new Error("Truy vấn index bị hủy"));
    };

  });
}

/* =========================================
   6E. CẬP NHẬT MỘT BẢN GHI
   ========================================= */

async function dbUpdate(storeName, id, changes) {

  const db = await openFinanceDB();

  // Kiểm tra object store
  if (!db.objectStoreNames.contains(storeName)) {
    throw new Error(
      "Object store không tồn tại: " + storeName
    );
  }

  // Kiểm tra dữ liệu cập nhật
  if (
    !changes ||
    typeof changes !== "object" ||
    Array.isArray(changes)
  ) {
    throw new Error(
      "Dữ liệu cập nhật phải là một object hợp lệ"
    );
  }

  // Không cho phép sửa khóa chính
  const keyPath = DB_STORES[storeName].keyPath;

  if (Object.hasOwn(changes, keyPath)) {
    throw new Error(
      "Không được thay đổi khóa chính: " + keyPath
    );
  }

  // Sao chép để tránh thay đổi object gốc
  const safeChanges = structuredClone(changes);

  return new Promise((resolve, reject) => {

    const tx = db.transaction(
      storeName,
      "readwrite"
    );

    const store = tx.objectStore(storeName);

    let updatedRecord = null;

    // Đọc dữ liệu cũ
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {

      const oldRecord = getRequest.result;

      // Không tự tạo bản ghi mới nếu ID không tồn tại
      if (!oldRecord) {
        tx.abort();
        return;
      }

      // Kết hợp dữ liệu cũ và dữ liệu mới
      updatedRecord = {
        ...oldRecord,
        ...safeChanges,
        [keyPath]: oldRecord[keyPath],
        updatedAt: new Date().toISOString()
      };

      // Lưu bản ghi đã cập nhật
      store.put(updatedRecord);
    };

    // Chỉ xác nhận sau khi transaction hoàn tất
    tx.oncomplete = () => {
      resolve(updatedRecord);
    };

    tx.onabort = () => {
      reject(
        tx.error ||
        new Error(
          "Không thể cập nhật. Bản ghi không tồn tại hoặc giao dịch bị hủy."
        )
      );
    };

    tx.onerror = () => {
      // Lỗi sẽ được xử lý tại onabort
    };

  });
}

/* =========================================
   6F. XÓA VẬT LÝ CÓ KIỂM SOÁT
   ========================================= */

async function dbDelete(storeName, id) {

  const allowedStores = [
    "accounts",
    "categories",
    "settings"
  ];

  // Chỉ cho xóa ở những store được phép
  if (!allowedStores.includes(storeName)) {
    throw new Error(
      "Không cho phép xóa vật lý từ: " + storeName
    );
  }

  if (id === null || id === undefined || id === "") {
    throw new Error("ID không hợp lệ");
  }

  const db = await openFinanceDB();

  if (!db.objectStoreNames.contains(storeName)) {
    throw new Error(
      "Object store không tồn tại: " + storeName
    );
  }

  // Cùng transaction để kiểm tra tham chiếu và xóa
  return new Promise((resolve, reject) => {

    const tx = db.transaction(
      [storeName, "transactions"],
      "readwrite"
    );

    const store = tx.objectStore(storeName);
    const transactionStore = tx.objectStore("transactions");

    let deleted = false;
    let failureMessage = "";

    const abortWithMessage = (message) => {
      failureMessage = message;
      tx.abort();
    };

    // Kiểm tra bản ghi có tồn tại
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {

      if (getRequest.result === undefined) {
        abortWithMessage("Không tìm thấy bản ghi cần xóa");
        return;
      }

      // Với settings không cần kiểm tra giao dịch
      if (storeName === "settings") {
        store.delete(id);
        deleted = true;
        return;
      }

      // Kiểm tra giao dịch liên quan
      // Bao gồm cả giao dịch đã xóa mềm,
      // vì lịch sử vẫn phải giữ được tham chiếu.
      const indexes = storeName === "accounts"
        ? ["accountId", "toAccountId"]
        : ["categoryId"];

      let pending = indexes.length;
      let hasReference = false;

      indexes.forEach(indexName => {

        const index = transactionStore.index(indexName);

        const countRequest = index.count(id);

        countRequest.onsuccess = () => {

          if (countRequest.result > 0) {
            hasReference = true;
          }

          pending--;

          if (pending !== 0) return;

          if (hasReference) {
            abortWithMessage(
              "Bản ghi đang được giao dịch sử dụng. " +
              "Hãy lưu trữ thay vì xóa."
            );
            return;
          }

          // Kiểm tra danh mục cha còn danh mục con
          if (storeName === "categories") {

            const childIndex = store.index("parentId");
            const childRequest = childIndex.count(id);

            childRequest.onsuccess = () => {

              if (childRequest.result > 0) {
                abortWithMessage(
                  "Danh mục còn danh mục con, không thể xóa."
                );
                return;
              }

              store.delete(id);
              deleted = true;
            };

          } else {
            store.delete(id);
            deleted = true;
          }

        };

      });

    };

    tx.oncomplete = () => {
      resolve(deleted);
    };

    tx.onabort = () => {
      reject(new Error(
        failureMessage ||
        tx.error?.message ||
        "Không thể xóa bản ghi"
      ));
    };

    tx.onerror = () => {
      // Lỗi sẽ được xử lý tại onabort
    };

  });
}

/* =========================================
   6G. XÓA MỀM GIAO DỊCH
   ========================================= */

async function dbSoftDeleteTransaction(id) {

  if (typeof id !== "string" || !id.trim()) {
    throw new Error("ID giao dịch không hợp lệ");
  }

  const db = await openFinanceDB();

  // Chuẩn bị ID và thời gian trước khi mở
  // transaction để tránh xử lý bất đồng bộ.
  const auditId = generateId();
  const deletedAt = new Date().toISOString();

  return new Promise((resolve, reject) => {

    // Hai object store trong cùng transaction
    const tx = db.transaction(
      ["transactions", "transaction_audits"],
      "readwrite"
    );

    const transactionStore =
      tx.objectStore("transactions");

    const auditStore =
      tx.objectStore("transaction_audits");

    let updatedRecord = null;
    let failureMessage = "";

    const abortWithMessage = (message) => {
      failureMessage = message;
      tx.abort();
    };

    // 1. Đọc giao dịch cũ
    const request = transactionStore.get(id);

    request.onsuccess = () => {

      const oldRecord = request.result;

      // Không tìm thấy giao dịch
      if (!oldRecord) {
        abortWithMessage(
          "Không tìm thấy giao dịch cần xóa"
        );
        return;
      }

      // Không cho xóa mềm nhiều lần
      if (oldRecord.deletedAt != null) {
        abortWithMessage(
          "Giao dịch này đã được xóa trước đó"
        );
        return;
      }

      // 2. Tạo bản ghi có trạng thái đã xóa
      updatedRecord = {
        ...oldRecord,
        deletedAt: deletedAt,
        updatedAt: deletedAt
      };

      // 3. Chuẩn bị bản ghi lịch sử
      const auditRecord = {
        id: auditId,
        transactionId: id,
        action: "soft_delete",
        before: structuredClone(oldRecord),
        after: structuredClone(updatedRecord),
        createdAt: deletedAt
      };

      // 4. Cập nhật trạng thái giao dịch
      transactionStore.put(updatedRecord);

      // 5. Ghi lịch sử trong cùng transaction
      auditStore.add(auditRecord);
    };

    // Chỉ thành công khi toàn bộ transaction hoàn tất
    tx.oncomplete = () => {
      resolve(updatedRecord);
    };

    // Nếu lỗi, toàn bộ thay đổi được rollback
    tx.onabort = () => {
      reject(
        new Error(
          failureMessage ||
          tx.error?.message ||
          "Không thể xóa mềm giao dịch"
        )
      );
    };

    tx.onerror = () => {
      // Xử lý lỗi tại tx.onabort
    };

  });
}

/* =========================================
   6H. KHÔI PHỤC GIAO DỊCH ĐÃ XÓA MỀM
   ========================================= */

async function dbRestoreTransaction(id) {

  // 1. Kiểm tra ID
  if (typeof id !== "string" || !id.trim()) {
    throw new Error("ID giao dịch không hợp lệ");
  }

  // 2. Chuẩn bị dữ liệu trước khi mở transaction
  const db = await openFinanceDB();

  const auditId = generateId();
  const restoredAt = new Date().toISOString();

  return new Promise((resolve, reject) => {

    // 3. Mở transaction chứa hai object store
    const tx = db.transaction(
      ["transactions", "transaction_audits"],
      "readwrite"
    );

    const transactionStore =
      tx.objectStore("transactions");

    const auditStore =
      tx.objectStore("transaction_audits");

    let restoredRecord = null;
    let failureMessage = "";

    function abortWithMessage(message) {
      failureMessage = message;
      tx.abort();
    }

    // 4. Đọc giao dịch cần khôi phục
    const request = transactionStore.get(id);

    request.onsuccess = () => {

      const oldRecord = request.result;

      // Không tìm thấy giao dịch
      if (!oldRecord) {
        abortWithMessage(
          "Không tìm thấy giao dịch cần khôi phục"
        );
        return;
      }

      // Giao dịch chưa bị xóa mềm
      if (oldRecord.deletedAt == null) {
        abortWithMessage(
          "Giao dịch đang hoạt động, không cần khôi phục"
        );
        return;
      }

      // 5. Khôi phục trạng thái
      restoredRecord = {
        ...oldRecord,
        deletedAt: null,
        updatedAt: restoredAt
      };

      // 6. Tạo lịch sử khôi phục
      const auditRecord = {
        id: auditId,
        transactionId: id,
        action: "restore",
        before: structuredClone(oldRecord),
        after: structuredClone(restoredRecord),
        createdAt: restoredAt
      };

      // 7. Cập nhật giao dịch
      transactionStore.put(restoredRecord);

      // 8. Ghi lịch sử
      auditStore.add(auditRecord);

    };

    // 9. Chỉ trả kết quả khi toàn bộ transaction hoàn tất
    tx.oncomplete = () => {
      resolve(restoredRecord);
    };

    // 10. Nếu lỗi, toàn bộ thay đổi được rollback
    tx.onabort = () => {
      reject(
        new Error(
          failureMessage ||
          tx.error?.message ||
          "Không thể khôi phục giao dịch"
        )
      );
    };

    tx.onerror = () => {
      // Lỗi được xử lý tại tx.onabort
    };

  });
}




/* =========================================
   6I. LƯU GIAO DỊCH AN TOÀN (THÊM / SỬA)
   - Kiểm tra tham chiếu trong cùng readwrite transaction
   - Không cho sửa giao dịch đã xóa mềm
   - Không cho ghi đè ID, deletedAt, createdAt
   - Không cần nâng phiên bản IndexedDB
   ========================================= */
async function dbSaveTransaction(data, editId = null) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Dữ liệu giao dịch không hợp lệ.");
  }
  const {type, amount, accountId, toAccountId, categoryId, date, note} = data;
  if (!["income", "expense", "transfer"].includes(type)) {
    throw new Error("Loại giao dịch không hợp lệ.");
  }
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("Số tiền phải là số nguyên dương hợp lệ.");
  }
  if (typeof accountId !== "string" || !accountId.trim()) {
    throw new Error("Chưa chọn tài khoản.");
  }
  const destinationId = type === "transfer" ? toAccountId : null;
  const selectedCategoryId = type === "transfer" ? null : (categoryId || null);
  if (type === "transfer" &&
      (typeof destinationId !== "string" || !destinationId.trim() || destinationId === accountId)) {
    throw new Error("Hai tài khoản chuyển và nhận phải khác nhau.");
  }
  if (selectedCategoryId !== null &&
      (typeof selectedCategoryId !== "string" || !selectedCategoryId.trim())) {
    throw new Error("Danh mục không hợp lệ.");
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Ngày giao dịch không hợp lệ.");
  }
  const parsedDate = new Date(date + "T00:00:00");
  if (Number.isNaN(parsedDate.getTime()) ||
      parsedDate.getFullYear() !== Number(date.slice(0, 4)) ||
      parsedDate.getMonth() + 1 !== Number(date.slice(5, 7)) ||
      parsedDate.getDate() !== Number(date.slice(8, 10))) {
    throw new Error("Ngày giao dịch không tồn tại.");
  }
  if (typeof note !== "string" || note.length > 200) {
    throw new Error("Ghi chú không hợp lệ (tối đa 200 ký tự).");
  }
  if (editId !== null && (typeof editId !== "string" || !editId.trim())) {
    throw new Error("ID giao dịch cần sửa không hợp lệ.");
  }

  const db = await openFinanceDB();
  const timestamp = new Date().toISOString();
  const newId = editId === null ? generateId() : null;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(["accounts", "categories", "transactions"], "readwrite");
    const accountStore = tx.objectStore("accounts");
    const categoryStore = tx.objectStore("categories");
    const transactionStore = tx.objectStore("transactions");
    let result = null;
    let failure = "";
    const abort = (message) => {
      failure = message;
      try { tx.abort(); } catch (_) { /* transaction may already be aborting */ }
    };
    const load = (store, id, callback) => {
      const request = store.get(id);
      request.onsuccess = () => callback(request.result);
    };
    const verifyReferences = (oldRecord) => {
      load(accountStore, accountId, (sourceAccount) => {
        if (!sourceAccount || sourceAccount.status === "inactive") {
          abort("Tài khoản nguồn không tồn tại hoặc đã ngừng hoạt động.");
          return;
        }
        const verifyCategory = () => {
          if (!selectedCategoryId) {
            persist(oldRecord);
            return;
          }
          load(categoryStore, selectedCategoryId, (category) => {
            if (!category || category.type !== type) {
              abort("Danh mục không tồn tại hoặc không khớp loại giao dịch.");
              return;
            }
            // Chỉ chấp nhận danh mục lưu trữ nếu giữ nguyên trên giao dịch cũ.
            if (category.status === "inactive" &&
                !(oldRecord && oldRecord.categoryId === selectedCategoryId)) {
              abort("Danh mục đã lưu trữ, không thể chọn cho giao dịch mới.");
              return;
            }
            persist(oldRecord);
          });
        };
        if (type !== "transfer") {
          verifyCategory();
          return;
        }
        load(accountStore, destinationId, (targetAccount) => {
          if (!targetAccount || targetAccount.status === "inactive") {
            abort("Tài khoản nhận không tồn tại hoặc đã ngừng hoạt động.");
            return;
          }
          verifyCategory();
        });
      });
    };
    const persist = (oldRecord) => {
      const fields = {
        type, amount, accountId,
        toAccountId: destinationId,
        categoryId: selectedCategoryId,
        date, note,
        updatedAt: timestamp
      };
      if (oldRecord) {
        // Giữ nguyên ID và lịch sử, tuyệt đối không sửa deletedAt.
        result = {...oldRecord, ...fields};
        transactionStore.put(result);
      } else {
        result = {
          id: newId, ...fields,
          deletedAt: null,
          createdAt: timestamp
        };
        transactionStore.add(result);
      }
    };
    if (editId !== null) {
      load(transactionStore, editId, (oldRecord) => {
        if (!oldRecord || oldRecord.deletedAt != null) {
          abort("Giao dịch đã bị xóa hoặc không còn tồn tại.");
          return;
        }
        verifyReferences(oldRecord);
      });
    } else {
      verifyReferences(null);
    }
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(new Error(failure || tx.error?.message || "Không thể lưu giao dịch."));
    tx.onerror = () => { /* xử lý chung tại onabort */ };
  });
}

/* =========================================
   6J. THÔNG BÁO THAY ĐỔI DỮ LIỆU
   Chỉ phát sau khi thao tác ghi đã commit thành công.
   Không gửi sự kiện cho thao tác đọc hoặc ghi thất bại.
   ========================================= */
function notifyFinanceDataChanged(store, action) {
  window.dispatchEvent(new CustomEvent("finance:data-changed", {
    detail: { store, action }
  }));
}

function notifyAfterSuccessfulWrite(write, store, action) {
  return async (...args) => {
    const result = await write(...args);
    notifyFinanceDataChanged(store ?? args[0], action);
    return result;
  };
}

window.FinanceDB = {
  open: openFinanceDB,
  inspect: inspectFinanceDB,
  generateId,

  add: notifyAfterSuccessfulWrite(dbAdd, null, "add"),
  saveTransaction: notifyAfterSuccessfulWrite(dbSaveTransaction, "transactions", "save"),
  get: dbGet,
  getAll: dbGetAll,
  getByIndex: dbGetByIndex,
  update: notifyAfterSuccessfulWrite(dbUpdate, null, "update"),
  delete: notifyAfterSuccessfulWrite(dbDelete, null, "delete"),
  getFinancialSnapshot: dbGetFinancialSnapshot,

  softDeleteTransaction: notifyAfterSuccessfulWrite(dbSoftDeleteTransaction, "transactions", "soft-delete"),
  restoreTransaction: notifyAfterSuccessfulWrite(dbRestoreTransaction, "transactions", "restore")
};

