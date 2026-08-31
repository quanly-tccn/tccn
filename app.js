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

function getCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

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
    renderAdvancedStatistics();
    initNotifications();
    updateNotificationBadge();
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
    renderBudgets();
    setupBudgetInput();
    initDarkMode();
    renderGoals();
    
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
    
    // Đóng sidebar trên mobile - FIX
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
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
        showToast('Vui lòng nhập đầy đủ thông tin!', 'error')
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
    updateAllCharts();
    renderBudgets();
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
    // Tổng tiền đã tiết kiệm từ tất cả mục tiêu
    const totalSavings = goals.reduce((sum, goal) => sum + (goal.current || 0), 0);
    return totalSavings;
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
    const totalSavings = calculateSavings();
    document.querySelector('.savings-card .card-value').textContent = formatCurrency(totalSavings);
    
    // Cập nhật số lượng giao dịch
    const incomeCount = transactions.filter(t => 
        t.type === 'income' && t.date.startsWith(getCurrentMonth())
    ).length;
    document.querySelector('.income-card .card-change').textContent = `${incomeCount} giao dịch`;
    
    const expenseCount = transactions.filter(t => 
        t.type === 'expense' && t.date.startsWith(getCurrentMonth())
    ).length;
    document.querySelector('.expense-card .card-change').textContent = `${expenseCount} giao dịch`;

     // Cập nhật tiết kiệm
    const savings = calculateSavings();
    document.querySelector('.savings-card .card-value').textContent = formatCurrency(savings);
    
    // Cập nhật % mục tiêu
    const totalTarget = goals.reduce((sum, goal) => sum + goal.target, 0);
    if (totalTarget > 0) {
        const percentage = Math.round((savings / totalTarget) * 100);
        document.querySelector('.savings-card .card-change').textContent = `Đạt ${percentage}% mục tiêu`;
    }
    updateAllCharts();
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
    
    // Lấy từ khóa tìm kiếm hiện tại
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    
    return transactionList.map(transaction => {
        // Highlight tên danh mục và ghi chú
        const categoryName = highlightText(transaction.categoryName, searchTerm);
        const note = highlightText(transaction.note, searchTerm);
        
        return `
        <div class="transaction-item" data-id="${transaction.id}">
            <div class="transaction-info">
                <div class="transaction-icon">${transaction.icon}</div>
                <div class="transaction-details">
                    <p class="transaction-name">${categoryName}</p>
                    <p class="transaction-date">${formatDate(transaction.date)} - ${note}</p>
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
        `;
    }).join('');
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
        renderBudgets();
        updateAllCharts();
        showNotification('Đã xóa giao dịch!');
    }
}

// Khai báo biến toàn cục cho charts
let categoryChart = null;
let trendChart = null;
let comparisonChart = null;

function initCharts() {
    // Category Chart
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    const categoryData = calculateExpenseByCategory();
    
    categoryChart = new Chart(categoryCtx, {
        type: 'bar',
        data: {
            labels: categoryData.labels,
            datasets: [{
                label: 'Chi tiêu',
                data: categoryData.data,
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(236, 72, 153, 0.8)',
                    'rgba(14, 165, 233, 0.8)',
                    'rgba(168, 85, 247, 0.8)'
                ],
                borderRadius: 8,
                maxBarThickness: 50
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatChartValue(value);
                        }
                    }
                }
            }
        }
    });
    
    // Trend Chart
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    const trendData = calculateSixMonthTrend();
    
    trendChart = new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: trendData.months,
            datasets: [
                {
                    label: 'Thu nhập',
                    data: trendData.incomeData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Chi tiêu',
                    data: trendData.expenseData,
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
                             return formatChartValue(value);
                        }
                    }
                }
            }
        }
    });
    
    // Comparison Chart
    const comparisonCtx = document.getElementById('comparisonChart').getContext('2d');
    const comparisonData = calculateComparison();
    
    comparisonChart = new Chart(comparisonCtx, {
        type: 'bar',
        data: {
            labels: comparisonData.months,
            datasets: [
                {
                    label: 'Thu nhập',
                    data: comparisonData.incomeData,
                    backgroundColor: '#10b981'
                },
                {
                    label: 'Chi tiêu',
                    data: comparisonData.expenseData,
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
                            return formatChartValue(value);
                        }
                    }
                }
            }
        }
    });
}

// ==================== HÀM CẬP NHẬT BIỀU ĐỒ ====================

function updateAllCharts() {
    // Cập nhật biểu đồ danh mục
    if (categoryChart) {
        const categoryData = calculateExpenseByCategory();
        categoryChart.data.labels = categoryData.labels;
        categoryChart.data.datasets[0].data = categoryData.data;
        categoryChart.update();
    }
    
    // Cập nhật biểu đồ xu hướng
    if (trendChart) {
        const trendData = calculateSixMonthTrend();
        trendChart.data.labels = trendData.months;
        trendChart.data.datasets[0].data = trendData.incomeData;
        trendChart.data.datasets[1].data = trendData.expenseData;
        trendChart.update();
    }
    
    // Cập nhật biểu đồ so sánh
    if (comparisonChart) {
        const comparisonData = calculateComparison();
        comparisonChart.data.labels = comparisonData.months;
        comparisonChart.data.datasets[0].data = comparisonData.incomeData;
        comparisonChart.data.datasets[1].data = comparisonData.expenseData;
        comparisonChart.update();
    }
}

// ==================== CHART VALUE FORMAT ====================
function formatChartValue(value) {
    if (value === 0) return '0';
    if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'tr';
    } else if (value >= 1000) {
        return (value / 1000).toFixed(0) + 'k';
    } else {
        return value.toString();
    }
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
    renderBudgets();
    updateAllCharts();
    closeModal('edit-transaction-modal');
    
    showNotification('Đã cập nhật giao dịch!');
}

/// Hàm chuẩn hóa chuỗi - bỏ dấu tiếng Việt
function normalizeString(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')  // Bỏ dấu
        .replace(/đ/g, 'd')                // Chuyển đ -> d
        .replace(/Đ/g, 'd');
}

// Hàm kiểm tra chuỗi có chứa từ khóa (không phân biệt dấu)
function containsSearchTerm(text, searchTerm) {
    const normalizedText = normalizeString(text);
    const normalizedSearch = normalizeString(searchTerm);
    return normalizedText.includes(normalizedSearch);
}

// Hàm kiểm tra chuỗi bắt đầu bằng từ khóa
function startsWithSearchTerm(text, searchTerm) {
    const normalizedText = normalizeString(text);
    const normalizedSearch = normalizeString(searchTerm);
    return normalizedText.startsWith(normalizedSearch);
}

// Hàm highlight từ khóa tìm kiếm
function highlightText(text, searchTerm) {
    if (!searchTerm || !text) return text;
    
    const normalizedText = normalizeString(text);
    const normalizedSearch = normalizeString(searchTerm);
    
    if (normalizedText.includes(normalizedSearch)) {
        const index = normalizedText.indexOf(normalizedSearch);
        return text.slice(0, index) + 
               '<strong class="highlight">' + 
               text.slice(index, index + searchTerm.length) + 
               '</strong>' + 
               text.slice(index + searchTerm.length);
    }
    return text;
}

function filterTransactions() {
    const searchTerm = document.getElementById('search-input').value.trim();
    const filterType = document.getElementById('filter-type').value;
    const filterCategory = document.getElementById('filter-category').value;
    const filterDate = document.getElementById('filter-date').value;
    
    let filteredTransactions = [...transactions];
    
    // Lọc theo từ khóa tìm kiếm (không phân biệt dấu)
    if (searchTerm) {
        filteredTransactions = filteredTransactions.filter(t => {
            // Kiểm tra trong ghi chú
            if (containsSearchTerm(t.note, searchTerm)) return true;
            
            // Kiểm tra trong danh mục
            if (containsSearchTerm(t.categoryName, searchTerm)) return true;
            
            // Kiểm tra trong số tiền
            if (t.amount.toString().includes(searchTerm.replace(/\./g, ''))) return true;
            
            return false;
        });
        
        // Ưu tiên kết quả bắt đầu bằng từ khóa
        filteredTransactions.sort((a, b) => {
            const aStartsWith = startsWithSearchTerm(a.categoryName, searchTerm) || 
                               startsWithSearchTerm(a.note, searchTerm);
            const bStartsWith = startsWithSearchTerm(b.categoryName, searchTerm) || 
                               startsWithSearchTerm(b.note, searchTerm);
            
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;
            return 0;
        });
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
    
    // Sắp xếp
    const sortBy = document.getElementById('sort-by').value;
    switch(sortBy) {
        case 'newest':
            filteredTransactions.sort((a, b) => b.date.localeCompare(a.date));
            break;
        case 'oldest':
            filteredTransactions.sort((a, b) => a.date.localeCompare(b.date));
            break;
        case 'amount-desc':
            filteredTransactions.sort((a, b) => b.amount - a.amount);
            break;
        case 'amount-asc':
            filteredTransactions.sort((a, b) => a.amount - b.amount);
            break;
    }
    
    // Hiển thị kết quả
    const container = document.getElementById('all-transactions');
    container.innerHTML = renderTransactionList(filteredTransactions);
    
    // Hiển thị số lượng kết quả
    const resultCount = document.createElement('div');
    resultCount.className = 'result-count';
    resultCount.innerHTML = `<p>Tìm thấy <strong>${filteredTransactions.length}</strong> giao dịch</p>`;
    
    container.insertBefore(resultCount, container.firstChild);
    
}


// Hàm format số tiền cho ô khoảng giá
function handlePriceInput(input) {
    // Lấy giá trị hiện tại, loại bỏ tất cả trừ số
    let value = input.value.replace(/[^0-9]/g, '');
    
    // Format nếu có giá trị
    if (value) {
        const formatted = parseInt(value, 10).toLocaleString('vi-VN');
        input.value = formatted;
    } else {
        input.value = '';
    }
}

// Hàm xóa tất cả bộ lọc
function clearFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('filter-type').value = 'all';
    document.getElementById('filter-category').value = 'all';
    document.getElementById('filter-date').value = '';
    document.getElementById('sort-by').value = 'newest';
    
    filterTransactions();
}

// ==================== HIGHLIGHT SEARCH ====================
function highlightText(text, searchTerm) {
    if (!searchTerm || !text) return text;
    
    const normalizedText = normalizeString(text);
    const normalizedSearch = normalizeString(searchTerm);
    
    if (normalizedText.includes(normalizedSearch)) {
        const index = normalizedText.indexOf(normalizedSearch);
        return text.slice(0, index) + 
               '<strong class="highlight">' + 
               text.slice(index, index + searchTerm.length) + 
               '</strong>' + 
               text.slice(index + searchTerm.length);
    }
    return text;
}

// ==================== CHART DATA CALCULATIONS ====================

// Tính toán chi tiêu theo danh mục
function calculateExpenseByCategory() {
    const categoryExpenses = {};
    
    // Lấy tất cả chi tiêu
    const allExpenses = transactions.filter(t => t.type === 'expense');
    
    allExpenses.forEach(t => {
        if (categoryExpenses[t.categoryName]) {
            categoryExpenses[t.categoryName] += t.amount;
        } else {
            categoryExpenses[t.categoryName] = t.amount;
        }
    });
    
    // Chuyển thành mảng các cặp [label, data]
    const entries = Object.entries(categoryExpenses);
    
    // Sắp xếp tăng dần theo giá trị
    entries.sort((a, b) => a[1] - b[1]);
    
    // Tách thành labels và data
    return {
        labels: entries.map(entry => entry[0]),
        data: entries.map(entry => entry[1])
    };
}

// Tính toán xu hướng 6 tháng
function calculateSixMonthTrend() {
    const months = [];
    const incomeData = [];
    const expenseData = [];
    
    // Lấy tất cả dữ liệu (không lọc theo tháng)
    const allIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const allExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    // Tạo dữ liệu cho 6 tháng (tạm thời dùng dữ liệu tổng)
    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthLabel = `T${date.getMonth() + 1}`;
        
        months.push(monthLabel);
        
        // Nếu là tháng hiện tại thì dùng dữ liệu thực, còn lại là 0
        if (i === 0) {
            incomeData.push(allIncome);
            expenseData.push(allExpense);
        } else {
            incomeData.push(0);
            expenseData.push(0);
        }
    }
    
    return { months, incomeData, expenseData };
}

// Tính toán so sánh thu nhập và chi tiêu
function calculateComparison() {
    const months = [];
    const incomeData = [];
    const expenseData = [];
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = `T${date.getMonth() + 1}`;
        
        months.push(monthLabel);
        
        const monthlyIncome = transactions
            .filter(t => t.type === 'income' && t.date.startsWith(monthStr))
            .reduce((sum, t) => sum + t.amount, 0);
        incomeData.push(monthlyIncome);
        
        const monthlyExpense = transactions
            .filter(t => t.type === 'expense' && t.date.startsWith(monthStr))
            .reduce((sum, t) => sum + t.amount, 0);
        expenseData.push(monthlyExpense);
    }
    
    return { months, incomeData, expenseData };
}

// ==================== BÁO CÁO PDF ====================

// Mở modal báo cáo PDF
function openPDFReport() {
    preparePDFReport();
    openModal('pdf-report-modal');
}

// Chuẩn bị dữ liệu cho báo cáo
function preparePDFReport() {
    // Đảm bảo transactions là mới nhất
    transactions = loadTransactions();
    
    const currentMonth = getCurrentMonth();
    
    // Cập nhật tiêu đề tháng
    const now = new Date();
    document.getElementById('pdf-month-label').textContent = 
        `${now.getMonth() + 1}/${now.getFullYear()}`;
    
    // Cập nhật summary - Dùng đúng hàm tính toán
    const balance = calculateBalance();
    const monthlyIncome = calculateMonthlyIncome();
    const monthlyExpense = calculateMonthlyExpense();
    
    console.log('PDF Balance:', balance);
    console.log('PDF Income:', monthlyIncome);
    console.log('PDF Expense:', monthlyExpense);
    
    document.getElementById('pdf-balance').textContent = formatCurrency(balance);
    document.getElementById('pdf-income').textContent = formatCurrency(monthlyIncome);
    document.getElementById('pdf-expense').textContent = formatCurrency(monthlyExpense);
    
    // Cập nhật ngày xuất
    document.getElementById('pdf-date').textContent = 
        now.toLocaleDateString('vi-VN');
    
    // Điền bảng giao dịch
    const tbody = document.getElementById('pdf-transactions-body');
    const monthTransactions = transactions.filter(t => t.date.startsWith(currentMonth))
    .sort((a, b) => a.date.localeCompare(b.date));
    
    if (monthTransactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="padding: 15px; text-align: center; color: #666;">
                    Không có giao dịch trong tháng này
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = monthTransactions.map(t => `
            <tr>
                <td style="padding: 8px; border: 1px solid #d1d5db;">${formatDate(t.date)}</td>
                <td style="padding: 8px; border: 1px solid #d1d5db;">${t.icon} ${t.categoryName}</td>
                <td style="padding: 8px; border: 1px solid #d1d5db;">${t.note}</td>
                <td style="padding: 8px; border: 1px solid #d1d5db; color: ${t.type === 'income' ? '#10b981' : '#ef4444'}; font-weight: 500;">
                    ${t.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}
                </td>
                <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right; font-weight: 600;">
                    ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
                </td>
            </tr>
        `).join('');
    }
    
    // Điền Top 5 chi tiêu
    const topExpenses = transactions
        .filter(t => t.type === 'expense')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
    
    if (topExpenses.length === 0) {
        document.getElementById('pdf-top-expenses').innerHTML = 
            '<p style="text-align: center; color: #666;">Không có khoản chi tiêu nào</p>';
    } else {
        document.getElementById('pdf-top-expenses').innerHTML = topExpenses.map((t, index) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #e5e7eb;">
                <span style="font-size: 13px;">${index + 1}. ${t.icon} ${t.categoryName} - ${t.note}</span>
                <strong style="font-size: 13px; color: #ef4444;">${formatCurrency(t.amount)}</strong>
            </div>
        `).join('');
    }
}

// Xuất PDF
function exportToPDF() {
    const element = document.getElementById('pdf-report-content');
    
    const options = {
        margin: [10, 10, 10, 10],
        filename: `bao-cao-tai-chinh-${getCurrentMonth()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2,
            useCORS: true,
            logging: false,
            letterRendering: true,
            allowTaint: true
        },
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait' 
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    
    html2pdf().set(options).from(element).save();
}

// ==================== BUDGET MANAGEMENT ====================
const BUDGET_STORAGE_KEY = 'expense_tracker_budgets';

// State
let budgets = loadBudgets();

// Load budgets từ LocalStorage
function loadBudgets() {
    try {
        const saved = localStorage.getItem(BUDGET_STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        console.error('Lỗi khi đọc budgets:', error);
    }
    return {};
}

// Save budgets vào LocalStorage
function saveBudgets() {
    try {
        localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budgets));
    } catch (error) {
        console.error('Lỗi khi lưu budgets:', error);
    }
}

// Mở modal thêm ngân sách
function openBudgetModal() {
    document.getElementById('budget-amount-input').value = '';
    openModal('budget-modal');
}

// Lưu ngân sách mới
function saveBudget() {
    const category = document.getElementById('budget-category-select').value;
    const amountInput = document.getElementById('budget-amount-input');
    const amount = parseInt(amountInput.value.replace(/[^0-9]/g, '')) || 0;
    
    if (!amount) {
        alert('Vui lòng nhập số tiền ngân sách!');
        return;
    }
    
    // Lấy tên danh mục
    const categoryMap = {
        food: { name: 'Ăn uống', icon: '🍜' },
        transport: { name: 'Di chuyển', icon: '🚗' },
        shopping: { name: 'Mua sắm', icon: '🛍️' },
        bills: { name: 'Hóa đơn', icon: '📄' },
        entertainment: { name: 'Giải trí', icon: '🎮' },
        health: { name: 'Y tế', icon: '💊' },
        education: { name: 'Giáo dục', icon: '📚' },
        other: { name: 'Khác', icon: '📦' }
    };
    
    budgets[category] = {
        amount: amount,
        name: categoryMap[category].name,
        icon: categoryMap[category].icon
    };
    
    saveBudgets();
    renderBudgets();
    closeModal('budget-modal');
    
    showNotification('Đã lưu ngân sách!');
}

// Xóa ngân sách
function deleteBudget(category) {
    if (confirm('Bạn có chắc muốn xóa ngân sách này?')) {
        delete budgets[category];
        saveBudgets();
        renderBudgets();
        showNotification('Đã xóa ngân sách!');
    }
}

// Tính toán chi tiêu theo danh mục
function calculateSpentByCategory(category) {
    const currentMonth = getCurrentMonth();
    
    return transactions
        .filter(t => 
            t.type === 'expense' && 
            t.category === category && 
            t.date.startsWith(currentMonth)
        )
        .reduce((sum, t) => sum + t.amount, 0);
}

// Thêm vào hàm renderBudgets
function getBudgetStatus(percentage) {
    if (percentage >= 100) {
        return {
            text: '🔴 Vượt ngân sách!',
            class: 'danger',
            suggestion: 'Hãy dừng chi tiêu cho danh mục này!'
        };
    } else if (percentage >= 80) {
        return {
            text: '🟡 Sắp vượt ngân sách!',
            class: 'warning',
            suggestion: 'Chỉ còn ' + (100 - percentage) + '% ngân sách!'
        };
    } else if (percentage >= 50) {
        return {
            text: '🟢 Đã dùng ' + percentage + '% ngân sách',
            class: 'safe',
            suggestion: 'Vẫn còn ' + (100 - percentage) + '% ngân sách!'
        };
    } else {
        return {
            text: '✅ An toàn',
            class: 'safe',
            suggestion: 'Bạn đang kiểm soát tốt!'
        };
    }
}

// Render danh sách ngân sách
function renderBudgets() {
    const container = document.getElementById('budget-categories');
    
    if (Object.keys(budgets).length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-wallet" style="font-size: 3rem; margin-bottom: 20px; color: #ccc;"></i>
                <p>Chưa có ngân sách nào được thiết lập</p>
                <p style="font-size: 0.9rem;">Hãy thêm ngân sách để kiểm soát chi tiêu tốt hơn</p>
            </div>
        `;
        return;
    }
    
    let totalBudget = 0;
    let totalSpent = 0;
    
    container.innerHTML = Object.entries(budgets).map(([category, budget]) => {
        const spent = calculateSpentByCategory(category);
        const percentage = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;
        
        totalBudget += budget.amount;
        totalSpent += spent;
        
            // Lấy trạng thái ngân sách
            const status = getBudgetStatus(percentage);
            let progressClass = 'progress ' + status.class;
            let statusText = status.text;
        
        return `
            <div class="budget-item">
                <div class="budget-info">
                    <span class="category-icon">${budget.icon}</span>
                    <div>
                        <p class="budget-name">${budget.name}</p>
                        <p class="budget-amount">${formatCurrency(spent)} / ${formatCurrency(budget.amount)}</p>
                    </div>
                    <button class="action-btn" onclick="deleteBudget('${category}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="progress-bar">
                    <div class="${progressClass}" style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <p class="budget-percentage">${percentage}% - ${statusText}</p>
                </div>
                 <p style="font-size: 0.8rem; color: #666; margin-top: 5px;">
            💡      ${status.suggestion}
                </p>
            </div>
        `;
    }).join('');
    
    // Cập nhật tổng quan
    const remaining = totalBudget - totalSpent;
    document.getElementById('total-budget').textContent = formatCurrency(totalBudget);
    document.getElementById('total-spent').textContent = formatCurrency(totalSpent);
    
    const remainingElement = document.getElementById('total-remaining');
    remainingElement.textContent = formatCurrency(Math.abs(remaining));
    remainingElement.className = remaining >= 0 ? 'text-success' : 'text-danger';
    
    if (remaining < 0) {
        remainingElement.textContent = '-' + remainingElement.textContent;
    }

    // Cập nhật label tháng
    const now = new Date();
    document.getElementById('budget-month-label').textContent = 
    `${now.getMonth() + 1}/${now.getFullYear()}`;
}



// Format input ngân sách
function setupBudgetInput() {
    const budgetInput = document.getElementById('budget-amount-input');
    
    if (budgetInput) {
        budgetInput.addEventListener('input', function(e) {
            if (e.inputType === 'deleteContentBackward' || 
                e.inputType === 'deleteContentForward') {
                return;
            }
            
            let value = this.value.replace(/[^0-9]/g, '');
            if (value) {
                const formatted = parseInt(value, 10).toLocaleString('vi-VN');
                this.value = formatted + ' đ';
                const pos = formatted.length;
                this.setSelectionRange(pos, pos);
            } else {
                this.value = '';
            }
        });
    }
}

// ==================== DARK MODE ====================
const DARK_MODE_KEY = 'expense_tracker_dark_mode';

// Kiểm tra dark mode đã được bật chưa
function isDarkMode() {
    try {
        const saved = localStorage.getItem(DARK_MODE_KEY);
        if (saved !== null) {
            return saved === 'true';
        }
        // Mặc định theo giờ (tối từ 18h đến 6h)
        const hour = new Date().getHours();
        return hour >= 18 || hour < 6;
    } catch (error) {
        return false;
    }
}

// Bật/tắt dark mode
function toggleDarkMode() {
    const isDark = document.getElementById('dark-mode-toggle').checked;
    
    if (isDark) {
        document.body.classList.add('dark-mode');
        localStorage.setItem(DARK_MODE_KEY, 'true');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem(DARK_MODE_KEY, 'false');
    }
}

// Khởi tạo dark mode
function initDarkMode() {
    const isDark = isDarkMode();
    const toggle = document.getElementById('dark-mode-toggle');
    
    if (isDark) {
        document.body.classList.add('dark-mode');
        if (toggle) toggle.checked = true;
    } else {
        document.body.classList.remove('dark-mode');
        if (toggle) toggle.checked = false;
    }
}

// ==================== SAVINGS GOALS ====================
const GOALS_STORAGE_KEY = 'expense_tracker_goals';

// State
let goals = loadGoals();

// Load goals từ LocalStorage
function loadGoals() {
    try {
        const saved = localStorage.getItem(GOALS_STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        console.error('Lỗi khi đọc goals:', error);
    }
    return [];
}

// Save goals vào LocalStorage
function saveGoals() {
    try {
        localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
    } catch (error) {
        console.error('Lỗi khi lưu goals:', error);
    }
}

// Mở modal thêm mục tiêu
function openGoalModal() {
    document.getElementById('goal-name-input').value = '';
    document.getElementById('goal-target-input').value = '';
    document.getElementById('goal-current-input').value = '';
    document.getElementById('goal-deadline-input').value = '';
    openModal('goal-modal');
}

// Lưu mục tiêu mới
function saveGoal() {
   const name = document.getElementById('goal-name-input').value.trim();
    const icon = document.getElementById('goal-icon-select').value;
    const target = parseInt(document.getElementById('goal-target-input').value.replace(/[^0-9]/g, '')) || 0;
    const current = parseInt(document.getElementById('goal-current-input').value.replace(/[^0-9]/g, '')) || 0;
    const deadline = document.getElementById('goal-deadline-input').value;
    
    if (!name || !target) {
        alert('Vui lòng nhập đầy đủ thông tin!');
        return;
    }
    
    const newGoal = {
        id: Date.now(),
        name: name,
        icon: icon,
        target: target,
        current: current,
        deadline: deadline || 'Không có hạn'
    };
    
    goals.push(newGoal);
    saveGoals();
    renderGoals();
    closeModal('goal-modal');
    updateDashboardStats();
    
    showNotification('Đã thêm mục tiêu tiết kiệm!');
}

// Xóa mục tiêu
function deleteGoal(id) {
    if (confirm('Bạn có chắc muốn xóa mục tiêu này?')) {
        goals = goals.filter(g => g.id !== id);
        saveGoals();
        renderGoals();
        updateDashboardStats();
        showNotification('Đã xóa mục tiêu!');
    }
}

// Cập nhật số tiền đã tiết kiệm
function updateGoalProgress(id) {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    
    const newAmount = prompt('Nhập số tiền đã tiết kiệm:', goal.current);
    if (newAmount === null) return;
    
    const amount = parseInt(newAmount.replace(/[^0-9]/g, '')) || 0;
    goal.current = amount;
    saveGoals();
    renderGoals();
    updateDashboardStats();
    showNotification('Đã cập nhật tiến độ!');
}

// Render danh sách mục tiêu
function renderGoals() {
    const container = document.getElementById('goals-container');
    
    if (goals.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-bullseye" style="font-size: 3rem; margin-bottom: 20px; color: #ccc;"></i>
                <p>Chưa có mục tiêu tiết kiệm nào</p>
                <p style="font-size: 0.9rem;">Hãy đặt mục tiêu để có động lực tiết kiệm!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = goals.map(goal => {
        const percentage = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
        
        return `
            <div class="goal-card">
                <div class="goal-header">
                    <span class="goal-icon">${goal.icon}</span>
                    <div>
                        <h4>${goal.name}</h4>
                        <p class="goal-deadline">Hạn: ${goal.deadline}</p>
                    </div>
                    <button class="action-btn" onclick="deleteGoal(${goal.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="goal-progress">
                    <p>Tích lũy: <strong>${formatCurrency(goal.current)}</strong> / ${formatCurrency(goal.target)}</p>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${Math.min(percentage, 100)}%"></div>
                    </div>
                    <p class="goal-percentage">${percentage}% hoàn thành</p>
                </div>
                <button class="update-progress-btn" onclick="updateGoalProgress(${goal.id})">
                    <i class="fas fa-edit"></i> Cập nhật tiến độ
                </button>
            </div>
        `;
    }).join('');
}

function handleGoalAmountInput(input) {
    // Lưu vị trí con trỏ
    const cursorPos = input.selectionStart;
    
    // Lấy giá trị, loại bỏ tất cả trừ số
    let value = input.value.replace(/[^0-9]/g, '');
    
    // Format nếu có giá trị
    if (value) {
        const formatted = parseInt(value, 10).toLocaleString('vi-VN');
        
        // Chỉ thêm "đ" khi không đang xóa
        if (input.value.endsWith('đ') || cursorPos <= formatted.length) {
            input.value = formatted;
        } else {
            input.value = formatted + ' đ';
        }
    } else {
        input.value = '';
    }
}

// ==================== TOAST NOTIFICATIONS ====================

// Hàm hiển thị toast notification
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    
    if (!container) {
        console.warn('Toast container không tồn tại');
        return;
    }
    
    // Tạo toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Chọn icon dựa trên type
    let icon = '';
    switch(type) {
        case 'success':
            icon = '✓';
            break;
        case 'error':
            icon = '✕';
            break;
        case 'warning':
            icon = '⚠';
            break;
        case 'info':
            icon = 'ℹ';
            break;
    }
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <p class="toast-message">${message}</p>
        </div>
    `;
    
    // Thêm vào container
    container.appendChild(toast);
    
    // Tự động xóa sau 3 giây
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}

// Cập nhật hàm showNotification cũ (nếu có)
function showNotification(message, type = 'success') {
    showToast(message, type);
}

// ==================== EMPTY STATES ====================

// Hàm tạo empty state
function createEmptyState({ icon, title, description, actionText, actionFunction }) {
    return `
        <div class="empty-state">
            <div class="empty-state-icon">${icon}</div>
            <h3 class="empty-state-title">${title}</h3>
            <p class="empty-state-description">${description}</p>
            ${actionText ? `
                <button class="empty-state-action" onclick="${actionFunction}">
                    <i class="fas fa-plus"></i> ${actionText}
                </button>
            ` : ''}
        </div>
    `;
}

// ==================== ADVANCED STATISTICS ====================

// Lấy tháng trước
function getLastMonth() {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
}

// Tính chi tiêu tháng trước
function calculateLastMonthExpense() {
    const lastMonth = getLastMonth();
    return transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(lastMonth))
        .reduce((sum, t) => sum + t.amount, 0);
}

// Tính thu nhập tháng trước
function calculateLastMonthIncome() {
    const lastMonth = getLastMonth();
    return transactions
        .filter(t => t.type === 'income' && t.date.startsWith(lastMonth))
        .reduce((sum, t) => sum + t.amount, 0);
}

// So sánh tháng này vs tháng trước
function compareMonths() {
    const currentIncome = calculateMonthlyIncome();
    const lastIncome = calculateLastMonthIncome();
    const currentExpense = calculateMonthlyExpense();
    const lastExpense = calculateLastMonthExpense();
    
    const incomeChange = lastIncome > 0 ? ((currentIncome - lastIncome) / lastIncome) * 100 : 0;
    const expenseChange = lastExpense > 0 ? ((currentExpense - lastExpense) / lastExpense) * 100 : 0;
    
    return { currentIncome, lastIncome, incomeChange, currentExpense, lastExpense, expenseChange };
}

// Dự đoán chi tiêu tháng sau
function predictNextMonthExpense() {
    const currentMonth = getCurrentMonth();
    const currentMonthExpenses = transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth));
    
    if (currentMonthExpenses.length === 0) return 0;
    
    const now = new Date();
    const currentDay = now.getDate();
    const totalExpense = currentMonthExpenses.reduce((sum, t) => sum + t.amount, 0);
    const avgDailyExpense = totalExpense / currentDay;
    const predictedExpense = Math.round(avgDailyExpense * 30);
    
    return predictedExpense;
}

// Render thống kê nâng cao
function renderAdvancedStatistics() {
    // So sánh tháng
    const comparison = compareMonths();
    const comparisonContainer = document.getElementById('month-comparison');
    if (comparisonContainer) {
        comparisonContainer.innerHTML = `
            <div class="comparison-item">
                <p class="label">Thu nhập tháng này</p>
                <p class="value text-success">${formatCurrency(comparison.currentIncome)}</p>
                <p class="change ${comparison.incomeChange >= 0 ? 'positive' : 'negative'}">
                    ${comparison.incomeChange >= 0 ? '+' : ''}${comparison.incomeChange.toFixed(1)}% so với tháng trước
                </p>
            </div>
            <div class="comparison-item">
                <p class="label">Chi tiêu tháng này</p>
                <p class="value text-danger">${formatCurrency(comparison.currentExpense)}</p>
                <p class="change ${comparison.expenseChange <= 0 ? 'positive' : 'negative'}">
                    ${comparison.expenseChange >= 0 ? '+' : ''}${comparison.expenseChange.toFixed(1)}% so với tháng trước
                </p>
            </div>
        `;
    }
    
    // Dự đoán chi tiêu
    const predicted = predictNextMonthExpense();
    const predictionContainer = document.getElementById('expense-prediction');
    if (predictionContainer) {
        predictionContainer.innerHTML = `
            <p class="prediction-note">Dựa trên chi tiêu trung bình của tháng này</p>
            <p class="prediction-amount">${formatCurrency(predicted)}</p>
            <p class="prediction-note">Dự kiến chi tiêu cho tháng sau</p>
        `;
    }
    
    // Top 5 khoản chi tiêu
    renderTopExpenses();
}

// Render Top 5 khoản chi tiêu
function renderTopExpenses() {
    const container = document.getElementById('top-expenses');
    if (!container) return;
    
    const topExpenses = transactions
        .filter(t => t.type === 'expense')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
    
    if (topExpenses.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #64748b;">Không có dữ liệu chi tiêu</p>';
        return;
    }
    
    container.innerHTML = topExpenses.map((t, index) => `
        <div class="expense-item">
            <span>${index + 1}. ${t.icon} ${t.categoryName} - ${t.note}</span>
            <strong>${formatCurrency(t.amount)}</strong>
        </div>
    `).join('');
}

// ==================== NOTIFICATIONS ====================
var NOTIFICATIONS_KEY = 'expense_tracker_notifications';

var notifications = loadNotifications();

function loadNotifications() {
    try {
        var saved = localStorage.getItem(NOTIFICATIONS_KEY);
        if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
}

function saveNotifications() {
    try {
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    } catch (e) {}
}

function addNotification(message, icon) {
    icon = icon || '🔔';
    notifications.unshift({
        id: Date.now(),
        message: message,
        icon: icon,
        read: false,
        time: new Date().toISOString()
    });
    
    if (notifications.length > 20) notifications.pop();
    
    saveNotifications();
    updateNotificationBadge();
    renderNotifications();
}

function toggleNotifications() {
    var dropdown = document.getElementById('notification-dropdown');
    if (!dropdown) return;
    
    dropdown.classList.toggle('active');
    
    if (dropdown.classList.contains('active')) {
        renderNotifications();
    }
}

function updateNotificationBadge() {
    var badge = document.getElementById('notification-badge');
    var unreadCount = notifications.filter(function(n) { return !n.read; }).length;
    
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'block' : 'none';
    }
}

// Render notifications
function renderNotifications() {
    var list = document.getElementById('notification-list');
    if (!list) return;
    
    // Lọc notifications theo tab
    var filteredNotifications = notifications;
    if (currentNotifTab === 'unread') {
        filteredNotifications = notifications.filter(function(n) {
            return !n.read;
        });
    }
    
    // Cập nhật badge count
    var unreadCount = notifications.filter(function(n) { return !n.read; }).length;
    var countBadge = document.getElementById('notif-count-badge');
    if (countBadge) {
        countBadge.textContent = unreadCount;
        countBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }
    
    if (filteredNotifications.length === 0) {
        list.innerHTML = '<div class="notif-empty">' +
            '<i class="fas fa-bell-slash"></i>' +
            '<p>' + (currentNotifTab === 'unread' ? 'Không có thông báo chưa đọc' : 'Không có thông báo nào') + '</p>' +
            '</div>';
        return;
    }
    
    list.innerHTML = filteredNotifications.map(function(n) {
        return '<div class="notification-item ' + (n.read ? '' : 'unread') + '" onclick="markNotificationRead(' + n.id + ')">' +
            '<div class="notif-icon">' + n.icon + '</div>' +
            '<div class="notif-content">' +
            '<p class="notif-message">' + n.message + '</p>' +
            '<span class="notif-time">' + formatTimeAgo(n.time) + '</span>' +
            '</div>' +
            (n.read ? '' : '<div class="notif-unread-dot"></div>') +
            '</div>';
    }).join('');
}

        // Chuyển tab thông báo
    function switchNotifTab(tab) {
        currentNotifTab = tab;
            
        // Cập nhật class active cho tabs
        document.querySelectorAll('.notif-tab').forEach(function(btn) {
            btn.classList.remove('active');
            if (btn.dataset.tab === tab) {
                btn.classList.add('active');
            }
        });
            
            // Render lại danh sách
            renderNotifications();
    }

    function viewNotificationDetail(id) {
        var notification = notifications.find(function(n) { return n.id === id; });
        if (!notification) return;
        
        markNotificationRead(id);
        alert(notification.message);
    }

function markNotificationRead(id) {
    notifications = notifications.map(function(n) {
        return n.id === id ? { ...n, read: true } : n;
    });
    saveNotifications();
    updateNotificationBadge();
    renderNotifications();
}

function markAllNotificationsRead() {
    notifications = notifications.map(function(n) { return { ...n, read: true }; });
    saveNotifications();
    updateNotificationBadge();
    renderNotifications();
}

function clearAllNotifications() {
    if (confirm('Xóa tất cả thông báo?')) {
        notifications = [];
        saveNotifications();
        updateNotificationBadge();
        renderNotifications();
    }
}

function formatTimeAgo(timeString) {
    var now = new Date();
    var time = new Date(timeString);
    var diffMs = now - time;
    var diffMin = Math.floor(diffMs / 60000);
    var diffHour = Math.floor(diffMin / 60);
    var diffDay = Math.floor(diffHour / 24);
    
    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return diffMin + ' phút trước';
    if (diffHour < 24) return diffHour + ' giờ trước';
    return diffDay + ' ngày trước';
}

function initNotifications() {
    if (notifications.length === 0) {
        addNotification('Chào mừng bạn đến với ứng dụng quản lý tài chính!', '👋');
        addNotification('Hãy thêm giao dịch đầu tiên của bạn', '💰');
    }
}

// Khởi tạo tab notifications
var currentNotifTab = 'all';