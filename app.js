// Danh mục cho từng loại giao dịch
const categories = {
    expense: [
        { value: 'food', label: '🍜 Ăn uống' },
        { value: 'transport', label: '🚗 Di chuyển' },
        { value: 'shopping', label: '🛍️ Mua sắm' },
        { value: 'bills', label: '📄 Hóa đơn' },
        { value: 'entertainment', label: '🎮 Giải trí' },
        { value: 'health', label: '💊 Y tế' },
        { value: 'education', label: '📚 Giáo dục' },
        { value: 'other', label: '📦 Khác' }
    ],
    income: [
        { value: 'salary', label: '💰 Lương' },
        { value: 'bonus', label: '🎁 Thưởng' },
        { value: 'investment', label: '📈 Đầu tư' },
        { value: 'freelance', label: '💻 Freelance' },
        { value: 'business', label: '🏪 Kinh doanh' },
        { value: 'gift', label: '🎀 Quà tặng' },
        { value: 'other_income', label: '📦 Thu nhập khác' }
    ]
};
// Hàm cập nhật danh mục theo loại giao dịch
function updateCategorySelect(type) {
    const categorySelect = document.getElementById('category-select');
    const categoriesList = categories[type] || categories.expense;
    
    categorySelect.innerHTML = categoriesList.map(cat => 
        `<option value="${cat.value}">${cat.label}</option>`
    ).join('');
}
// Dữ liệu mẫu
const sampleTransactions = [
    {
        id: 1,
        type: 'expense',
        category: 'food',
        categoryName: 'Ăn uống',
        icon: '🍜',
        amount: 45000,
        note: 'Ăn trưa',
        date: '2026-01-15'
    },
    {
        id: 2,
        type: 'expense',
        category: 'transport',
        categoryName: 'Di chuyển',
        icon: '🚗',
        amount: 100000,
        note: 'Đổ xăng',
        date: '2026-01-14'
    },
    {
        id: 3,
        type: 'income',
        category: 'salary',
        categoryName: 'Lương',
        icon: '💰',
        amount: 15000000,
        note: 'Lương tháng 1',
        date: '2026-01-10'
    },
    {
        id: 4,
        type: 'expense',
        category: 'shopping',
        categoryName: 'Mua sắm',
        icon: '🛍️',
        amount: 350000,
        note: 'Mua quần áo',
        date: '2026-01-12'
    },
    {
        id: 5,
        type: 'expense',
        category: 'bills',
        categoryName: 'Hóa đơn',
        icon: '📄',
        amount: 500000,
        note: 'Tiền điện nước',
        date: '2026-01-05'
    }
];

// Hàm format số với dấu phân cách
function formatNumberInput(value) {
    // Loại bỏ tất cả ký tự không phải số
    let numbers = value.replace(/[^0-9]/g, '');
    
    // Thêm dấu phân cách hàng nghìn
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Thêm event listener cho input số tiền
function setupAmountInput() {
    const amountInput = document.getElementById('amount-input');
    
    if (amountInput) {
        // Xóa event listener cũ nếu có
        amountInput.removeEventListener('input', handleAmountInput);
        
        // Thêm event listener mới
        amountInput.addEventListener('input', function(e) {
            // Lưu vị trí con trỏ
            const cursorPos = this.selectionStart;
            
            // Lấy giá trị, loại bỏ dấu chấm
            let value = this.value.replace(/\./g, '');
            
            // Loại bỏ ký tự không phải số
            value = value.replace(/[^0-9]/g, '');
            
            // Format nếu có giá trị
            if (value) {
                this.value = parseInt(value, 10).toLocaleString('vi-VN');
            } else {
                this.value = '';
            }
            
            // Đặt con trỏ ở cuối
            const newPos = this.value.length;
            this.setSelectionRange(newPos, newPos);
        });
    }
}
// Hàm lấy giá trị số
function getAmountValue() {
    const amountInput = document.getElementById('amount-input');
    return parseInt(amountInput.value.replace(/\./g, '')) || 0;
}

// ==================== STATE MANAGEMENT ====================
const STORAGE_KEY = 'expense_tracker_transactions';

// Hàm lấy dữ liệu từ LocalStorage
function loadTransactions() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        console.error('Lỗi khi đọc LocalStorage:', error);
    }
    return [...sampleTransactions]; // Dùng dữ liệu mẫu nếu chưa có
}

// Hàm lưu dữ liệu vào LocalStorage
function saveTransactions() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
        console.error('Lỗi khi lưu LocalStorage:', error);
    }
}

// Khởi tạo state
let transactions = loadTransactions();
let currentPage = 'dashboard';
let selectedType = 'expense';

// Khởi tạo ứng dụng
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initCharts();
    renderTransactions();
    setDefaultDate();
    updateCategorySelect('expense');  // ← Thêm dòng này để khởi tạo danh mục mặc định
    setupAmountInput();
    updateDashboardStats(); // Cập nhật số liệu thống kê

    // Thêm event listener cho input số tiền
    const amountInput = document.getElementById('amount-input');
    if (amountInput) {
        amountInput.addEventListener('input', handleAmountInput);
    }
    // Event delegation cho các nút action
    document.addEventListener('click', function(e) {
        // Tìm nút edit được click
        if (e.target.closest('.edit-btn')) {
            const id = parseInt(e.target.closest('.edit-btn').dataset.id);
            editTransaction(id);
        }
        
        // Tìm nút delete được click
        if (e.target.closest('.delete-btn')) {
            const id = parseInt(e.target.closest('.delete-btn').dataset.id);
            deleteTransaction(id);
        }
    });
});

// Navigation
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const pageName = item.dataset.page;
            switchPage(pageName);
        });
    });
}

function switchPage(pageName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });
    
    // Update pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Kiểm tra xem page có tồn tại không
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
    } else {
        console.error(`Page "${pageName}" không tồn tại!`);
        return;
    }
    
    // Update title
    const pageTitles = {
        dashboard: 'Tổng quan',
        transactions: 'Giao dịch',
        budget: 'Ngân sách',
        reports: 'Báo cáo',
        goals: 'Mục tiêu',
        settings: 'Cài đặt'
    };
    
    const titleElement = document.getElementById('page-title');
    if (titleElement) {
        titleElement.textContent = pageTitles[pageName] || pageName;
    }
    
    // Đóng sidebar trên mobile (quan trọng!)
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.remove('active');
    }
}

function toggleSidebar(forceClose = null) {
    const sidebar = document.getElementById('sidebar');
    if (forceClose !== null) {
        if (forceClose) {
            sidebar.classList.remove('active');
        } else {
            sidebar.classList.add('active');
        }
    } else {
        sidebar.classList.toggle('active');
    }
}

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function selectType(type) {
    selectedType = type;
    
    // Cập nhật UI cho buttons
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        }
    });
    
    // Cập nhật danh mục tương ứng
    updateCategorySelect(type);
}

// Transaction functions
function saveTransaction() {
    // Sử dụng getAmountValue() thay vì parseFloat trực tiếp
    const amount = getAmountValue();
    const category = document.getElementById('category-select').value;
    const note = document.getElementById('note-input').value;
    const date = document.getElementById('date-input').value;
    
    if (!amount || !date) {
        alert('Vui lòng nhập đầy đủ thông tin!');
        return;
    }
    
    // Tìm thông tin danh mục dựa trên selectedType và category value
    const categoriesList = categories[selectedType] || categories.expense;
    const selectedCategory = categoriesList.find(cat => cat.value === category);
    
    const newTransaction = {
        id: Date.now(),
        type: selectedType,
        category: category,
        categoryName: selectedCategory ? selectedCategory.label.split(' ').slice(1).join(' ') : 'Khác',
        icon: selectedCategory ? selectedCategory.label.split(' ')[0] : '📦',
        amount: amount,
        note: note || 'Không có ghi chú',
        date: date
    };
    
    transactions.unshift(newTransaction);
    saveTransactions(); // Lưu vào LocalStorage
    renderTransactions();
    updateDashboardStats(); // Cập nhật số liệu mới
    closeModal('transaction-modal');
    
    // Reset form
    document.getElementById('amount-input').value = '';
    document.getElementById('note-input').value = '';
    setDefaultDate();
    selectType('expense');  // Reset về mặc định là chi tiêu
    
    // Hiển thị thông báo thành công
    showNotification('Đã thêm giao dịch thành công!');
}
// Hàm xử lý input
function handleAmountInput(event) {
    const input = event.target;
    
    // Cho phép xóa tự do
    if (event.inputType === 'deleteContentBackward' || 
        event.inputType === 'deleteContentForward') {
        // Không format, để người dùng xóa tự nhiên
        return;
    }
    
    // Lấy giá trị, loại bỏ dấu chấm
    let value = input.value.replace(/\./g, '');
    value = value.replace(/[^0-9]/g, '');
    
    // Format nếu có giá trị
    if (value) {
        const formatted = parseInt(value, 10).toLocaleString('vi-VN');
        input.value = formatted + ' đ';
        
         // Đặt con trỏ trước chữ "đ"
        const pos = formatted.length;
        input.setSelectionRange(pos, pos);
    } else {
        input.value = '';
    }
}

// Khởi tạo
function setupAmountInput() {
    const amountInput = document.getElementById('amount-input');
    
    if (amountInput) {
        amountInput.addEventListener('input', handleAmountInput);
    }
}

function getAmountValue() {
    const amountInput = document.getElementById('amount-input');
    return parseFloat(amountInput.value.replace(/[^0-9]/g, '')) || 0;
}

// ==================== CALCULATIONS ====================
// Lấy tháng hiện tại (định dạng YYYY-MM)
function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Tính tổng thu nhập tháng hiện tại
function calculateMonthlyIncome() {
    const currentMonth = getCurrentMonth();
    
    return transactions
        .filter(t => t.type === 'income' && t.date.startsWith(currentMonth))
        .reduce((sum, t) => sum + t.amount, 0);
}

// Tính tổng chi tiêu tháng hiện tại
function calculateMonthlyExpense() {
    const currentMonth = getCurrentMonth();
    
    return transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
        .reduce((sum, t) => sum + t.amount, 0);
}

// Tính số dư hiện tại
function calculateBalance() {
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    return totalIncome - totalExpense;
}

// Tính tổng tiết kiệm (ví dụ: 20% thu nhập)
function calculateSavings() {
    const monthlyIncome = calculateMonthlyIncome();
    return Math.round(monthlyIncome * 0.2); // Giả định tiết kiệm 20% thu nhập
}

// Cập nhật tất cả số liệu trên dashboard
function updateDashboardStats() {
    // Cập nhật số dư
    const balance = calculateBalance();
    document.querySelector('.balance-card .card-value').textContent = formatCurrency(balance);
    
    // Cập nhật thu nhập tháng
    const monthlyIncome = calculateMonthlyIncome();
    document.querySelector('.income-card .card-value').textContent = formatCurrency(monthlyIncome);
    
    // Cập nhật chi tiêu tháng
    const monthlyExpense = calculateMonthlyExpense();
    document.querySelector('.expense-card .card-value').textContent = formatCurrency(monthlyExpense);
    
    // Cập nhật tiết kiệm
    const savings = calculateSavings();
    document.querySelector('.savings-card .card-value').textContent = formatCurrency(savings);
    
    // Cập nhật số lượng giao dịch
    const incomeCount = transactions.filter(t => 
        t.type === 'income' && t.date.startsWith(getCurrentMonth())
    ).length;
    document.querySelector('.income-card .card-change').textContent = `${incomeCount} giao dịch`;
    
    const expenseCount = transactions.filter(t => 
        t.type === 'expense' && t.date.startsWith(getCurrentMonth())
    ).length;
    document.querySelector('.expense-card .card-change').textContent = `${expenseCount} giao dịch`;
}

function renderTransactions() {
    const recentContainer = document.getElementById('recent-transactions');
    const allContainer = document.getElementById('all-transactions');
    
    const recentTransactions = transactions.slice(0, 5);
    
    recentContainer.innerHTML = renderTransactionList(recentTransactions);
    allContainer.innerHTML = renderTransactionList(transactions);
    
    // Reset filters khi render lại
    if (document.getElementById('search-input')) {
        document.getElementById('search-input').value = '';
        document.getElementById('filter-type').value = 'all';
        document.getElementById('filter-category').value = 'all';
        document.getElementById('filter-date').value = '';
    }
}

function renderTransactionList(transactionList) {
    if (transactionList.length === 0) {
        return '<p class="text-center text-secondary">Không có giao dịch nào</p>';
    }
    
    return transactionList.map(transaction => `
        <div class="transaction-item" data-id="${transaction.id}">
            <div class="transaction-info">
                <div class="transaction-icon">${transaction.icon}</div>
                <div class="transaction-details">
                    <p class="transaction-name">${transaction.categoryName}</p>
                    <p class="transaction-date">${formatDate(transaction.date)} - ${transaction.note}</p>
                </div>
            </div>
            <div class="transaction-amount ${transaction.type}">
                ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
            </div>
            <div class="transaction-actions">
                <button class="action-btn edit-btn" data-id="${transaction.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" data-id="${transaction.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function editTransaction(id) {
    openEditModal(id);
}

function deleteTransaction(id) {
    if (confirm('Bạn có chắc muốn xóa giao dịch này?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveTransactions(); // Lưu vào LocalStorage
        renderTransactions();
        updateDashboardStats(); // Cập nhật số liệu mới
        showNotification('Đã xóa giao dịch!');
    }
}

// Chart functions
function initCharts() {
    // Category Chart - Biểu đồ cột
const categoryCtx = document.getElementById('categoryChart').getContext('2d');
new Chart(categoryCtx, {
    type: 'bar',
    data: {
        labels: ['Ăn uống', 'Di chuyển', 'Mua sắm', 'Hóa đơn', 'Giải trí'],
        datasets: [{
            label: 'Chi tiêu',
            data: [1500000, 500000, 800000, 1000000, 700000],
            backgroundColor: [
                'rgba(59, 130, 246, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(245, 158, 11, 0.8)',
                'rgba(239, 68, 68, 0.8)',
                'rgba(139, 92, 246, 0.8)'
            ],
            borderColor: [
                '#3b82f6',
                '#10b981',
                '#f59e0b',
                '#ef4444',
                '#8b5cf6'
            ],
            borderWidth: 2,
            borderRadius: 8,
            maxBarThickness: 50,
            hoverBackgroundColor: [
                'rgba(59, 130, 246, 1)',
                'rgba(16, 185, 129, 1)',
                'rgba(245, 158, 11, 1)',
                'rgba(239, 68, 68, 1)',
                'rgba(139, 92, 246, 1)'
            ]
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return context.parsed.y.toLocaleString('vi-VN') + 'đ';
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        return value / 1000000 + 'tr';
                    }
                }
            }
        }
    }
});
    
    // Trend Chart
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: ['T8', 'T9', 'T10', 'T11', 'T12', 'T1'],
            datasets: [
                {
                    label: 'Thu nhập',
                    data: [18000000, 18000000, 20000000, 20000000, 20000000, 20000000],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Chi tiêu',
                    data: [5200000, 4800000, 5300000, 5000000, 4600000, 4500000],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value / 1000000 + 'tr';
                        }
                    }
                }
            }
        }
    });
    
    // Comparison Chart
    const comparisonCtx = document.getElementById('comparisonChart').getContext('2d');
    new Chart(comparisonCtx, {
        type: 'bar',
        data: {
            labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
            datasets: [
                {
                    label: 'Thu nhập',
                    data: [20000000, 20000000, 20000000, 20000000, 20000000, 20000000],
                    backgroundColor: '#10b981'
                },
                {
                    label: 'Chi tiêu',
                    data: [4500000, 5000000, 4800000, 5200000, 4900000, 4600000],
                    backgroundColor: '#ef4444'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value / 1000000 + 'tr';
                        }
                    }
                }
            }
        }
    });
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function setDefaultDate() {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    document.getElementById('date-input').value = formattedDate;
}

function showNotification(message) {
    // Tạo notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 3000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Thêm animation cho notification
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
// ==================== EDIT TRANSACTION ====================
let editingTransactionId = null;
let editSelectedType = 'expense';

// Hàm mở modal chỉnh sửa
function openEditModal(id) {
    // Tìm giao dịch
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) {
        console.error('Không tìm thấy giao dịch:', id);
        return;
    }
    
    // Lưu ID đang chỉnh sửa
    editingTransactionId = id;
    editSelectedType = transaction.type;
    
    // Cập nhật type buttons
    document.querySelectorAll('#edit-transaction-modal .type-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === transaction.type) {
            btn.classList.add('active');
        }
    });
    
    // Điền dữ liệu vào form
    const amountInput = document.getElementById('edit-amount-input');
    const noteInput = document.getElementById('edit-note-input');
    const dateInput = document.getElementById('edit-date-input');
    
    if (amountInput) amountInput.value = transaction.amount.toLocaleString('vi-VN');
    if (noteInput) noteInput.value = transaction.note || '';
    if (dateInput) dateInput.value = transaction.date;
    
    // Cập nhật danh mục
    updateEditCategorySelect(transaction.type);
    
    const categorySelect = document.getElementById('edit-category-select');
    if (categorySelect) categorySelect.value = transaction.category;
    
    // Mở modal
    openModal('edit-transaction-modal');
}

// Hàm chọn loại giao dịch khi chỉnh sửa
function selectEditType(type) {
    editSelectedType = type;
    
    document.querySelectorAll('#edit-transaction-modal .type-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        }
    });
    
    updateEditCategorySelect(type);
}

// Hàm cập nhật danh mục khi chỉnh sửa
function updateEditCategorySelect(type) {
    const categorySelect = document.getElementById('edit-category-select');
    if (!categorySelect) {
        console.error('Không tìm thấy edit-category-select');
        return;
    }
    
    const categoriesList = categories[type] || categories.expense;
    categorySelect.innerHTML = categoriesList.map(cat => 
        `<option value="${cat.value}">${cat.label}</option>`
    ).join('');
}

// Hàm cập nhật giao dịch
function updateTransaction() {
    const amountInput = document.getElementById('edit-amount-input');
    const amount = parseInt(amountInput.value.replace(/[^0-9]/g, '')) || 0;
    const category = document.getElementById('edit-category-select').value;
    const note = document.getElementById('edit-note-input').value;
    const date = document.getElementById('edit-date-input').value;
    
    if (!amount || !date) {
        alert('Vui lòng nhập đầy đủ thông tin!');
        return;
    }
    
    const categoriesList = categories[editSelectedType] || categories.expense;
    const selectedCategory = categoriesList.find(cat => cat.value === category);
    
    transactions = transactions.map(t => {
        if (t.id === editingTransactionId) {
            return {
                ...t,
                type: editSelectedType,
                category: category,
                categoryName: selectedCategory ? selectedCategory.label.split(' ').slice(1).join(' ') : 'Khác',
                icon: selectedCategory ? selectedCategory.label.split(' ')[0] : '📦',
                amount: amount,
                note: note || 'Không có ghi chú',
                date: date
            };
        }
        return t;
    });
    
    saveTransactions();
    renderTransactions();
    updateDashboardStats();
    closeModal('edit-transaction-modal');
    
    showNotification('Đã cập nhật giao dịch!');
}

// ==================== FILTER & SEARCH ====================

// Hàm lọc và tìm kiếm giao dịch
function filterTransactions() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    const filterType = document.getElementById('filter-type').value;
    const filterCategory = document.getElementById('filter-category').value;
    const filterDate = document.getElementById('filter-date').value;
    
    let filteredTransactions = [...transactions];
    
    // Lọc theo từ khóa tìm kiếm
    if (searchTerm) {
        filteredTransactions = filteredTransactions.filter(t => 
            t.note.toLowerCase().includes(searchTerm) ||
            t.categoryName.toLowerCase().includes(searchTerm) ||
            t.amount.toString().includes(searchTerm)
        );
    }
    
    // Lọc theo loại (thu/chi)
    if (filterType !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.type === filterType);
    }
    
    // Lọc theo danh mục
    if (filterCategory !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.category === filterCategory);
    }
    
    // Lọc theo ngày
    if (filterDate) {
        filteredTransactions = filteredTransactions.filter(t => t.date === filterDate);
    }
    
    // Hiển thị kết quả
    const container = document.getElementById('all-transactions');
    container.innerHTML = renderTransactionList(filteredTransactions);
    
    // Hiển thị số lượng kết quả
    const resultCount = document.createElement('div');
    resultCount.className = 'result-count';
    resultCount.innerHTML = `<p>Tìm thấy <strong>${filteredTransactions.length}</strong> giao dịch</p>`;
    
    // Thêm vào đầu container
    container.insertBefore(resultCount, container.firstChild);
}

// Hàm xóa tất cả bộ lọc
function clearFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('filter-type').value = 'all';
    document.getElementById('filter-category').value = 'all';
    document.getElementById('filter-date').value = '';
    
    filterTransactions();
}