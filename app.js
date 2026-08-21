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

// Hàm xử lý khi nhập số tiền
function handleAmountInput(event) {
    const input = event.target;
    const formattedValue = formatNumberInput(input.value);
    input.value = formattedValue;
}

// Hàm lấy giá trị số từ input đã format
function getAmountValue() {
    const amountInput = document.getElementById('amount-input');
    return parseFloat(amountInput.value.replace(/\./g, '')) || 0;
}

// State management
let transactions = [...sampleTransactions];
let currentPage = 'dashboard';
let selectedType = 'expense';

// Khởi tạo ứng dụng
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initCharts();
    renderTransactions();
    setDefaultDate();
    updateCategorySelect('expense');  // ← Thêm dòng này để khởi tạo danh mục mặc định
    // Thêm event listener cho input số tiền
    const amountInput = document.getElementById('amount-input');
    if (amountInput) {
        amountInput.addEventListener('input', handleAmountInput);
    }
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
    renderTransactions();
    closeModal('transaction-modal');
    
    // Reset form
    document.getElementById('amount-input').value = '';
    document.getElementById('note-input').value = '';
    setDefaultDate();
    selectType('expense');  // Reset về mặc định là chi tiêu
    
    // Hiển thị thông báo thành công
    showNotification('Đã thêm giao dịch thành công!');
}
function handleAmountInput(event) {
    const input = event.target;
    let value = input.value.replace(/[^0-9]/g, '');
    
    if (value) {
        input.value = formatNumberInput(value) + ' đ';
    } else {
        input.value = '';
    }
}

function getAmountValue() {
    const amountInput = document.getElementById('amount-input');
    return parseFloat(amountInput.value.replace(/[^0-9]/g, '')) || 0;
}
function renderTransactions() {
    const recentContainer = document.getElementById('recent-transactions');
    const allContainer = document.getElementById('all-transactions');
    
    const recentTransactions = transactions.slice(0, 5);
    
    recentContainer.innerHTML = renderTransactionList(recentTransactions);
    allContainer.innerHTML = renderTransactionList(transactions);
}

function renderTransactionList(transactionList) {
    if (transactionList.length === 0) {
        return '<p class="text-center text-secondary">Không có giao dịch nào</p>';
    }
    
    return transactionList.map(transaction => `
        <div class="transaction-item">
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
                <button class="action-btn" onclick="editTransaction(${transaction.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn" onclick="deleteTransaction(${transaction.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
        alert(`Chỉnh sửa giao dịch: ${transaction.note}\n(Sẽ được phát triển trong phiên bản sau)`);
    }
}

function deleteTransaction(id) {
    if (confirm('Bạn có chắc muốn xóa giao dịch này?')) {
        transactions = transactions.filter(t => t.id !== id);
        renderTransactions();
        showNotification('Đã xóa giao dịch!');
    }
}

// Chart functions
function initCharts() {
    // Category Chart
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
            labels: ['Ăn uống', 'Di chuyển', 'Mua sắm', 'Hóa đơn', 'Giải trí'],
            datasets: [{
                data: [1500000, 500000, 800000, 1000000, 700000],
                backgroundColor: [
                    '#3b82f6',
                    '#10b981',
                    '#f59e0b',
                    '#ef4444',
                    '#8b5cf6'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
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