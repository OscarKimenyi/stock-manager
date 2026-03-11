let currentPage = 1;
let currentPaymentStockInId = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('Stock-In page loaded');
    loadProducts();
    loadSuppliers();
    loadStockIn();
    
    // Set today's date as default
    const dateInput = document.getElementById('purchase_date');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
    
    // Set today's date for payment modal
    const paymentDateInput = document.getElementById('payment_date');
    if (paymentDateInput) {
        paymentDateInput.valueAsDate = new Date();
    }
    
    // Calculate totals on input change
    const quantityInput = document.getElementById('quantity');
    const priceInput = document.getElementById('buying_price');
    const paidInput = document.getElementById('amount_paid');
    
    if (quantityInput) quantityInput.addEventListener('input', calculateTotals);
    if (priceInput) priceInput.addEventListener('input', calculateTotals);
    if (paidInput) paidInput.addEventListener('input', calculateTotals);
});

// ============================================
// LOADING FUNCTIONS
// ============================================

async function loadProducts() {
    try {
        console.log('Loading products...');
        const data = await API.products.getAll(1, '');
        console.log('Products loaded:', data);
        
        const select = document.getElementById('product_id');
        if (!select) {
            console.error('Product select element not found');
            return;
        }
        
        if (!data.products || data.products.length === 0) {
            select.innerHTML = '<option value="">No products available</option>';
            return;
        }
        
        select.innerHTML = '<option value="">Select Product</option>' + 
            data.products.map(p => `<option value="${p.id}">${p.product_name} (${p.product_code}) - Stock: ${p.quantity}</option>`).join('');
            
    } catch (error) {
        console.error('Failed to load products:', error);
        Toast.error('Failed to load products', 'Error');
    }
}

async function loadSuppliers() {
    try {
        console.log('Loading suppliers...');
        const suppliers = await API.suppliers.getAll();
        console.log('Suppliers loaded:', suppliers);
        
        const select = document.getElementById('supplier_id');
        if (!select) {
            console.error('Supplier select element not found');
            return;
        }
        
        if (!suppliers || suppliers.length === 0) {
            select.innerHTML = '<option value="">No suppliers available</option>';
            return;
        }
        
        select.innerHTML = '<option value="">Select Supplier</option>' + 
            suppliers.map(s => `<option value="${s.id}">${s.supplier_name}</option>`).join('');
            
    } catch (error) {
        console.error('Failed to load suppliers:', error);
        Toast.error('Failed to load suppliers', 'Error');
    }
}

async function loadStockIn() {
    try {
        console.log('Loading stock in transactions, page:', currentPage);
        
        const tbody = document.getElementById('stockInTableBody');
        if (!tbody) {
            console.error('Stock in table body not found');
            return;
        }
        
        // Show loading state
        tbody.innerHTML = '<tr><td colspan="12" class="text-center"><div class="spinner"></div> Loading...</td></tr>';
        
        const data = await API.stockIn.getAll(currentPage);
        console.log('Stock in data received:', data);
        
        if (!data.transactions || data.transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="12" class="text-center">No transactions found</td></tr>';
            return;
        }
        
        displayStockIn(data.transactions);
        setupPagination(data.pagination);
        
    } catch (error) {
        console.error('Failed to load stock in transactions:', error);
        const tbody = document.getElementById('stockInTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="12" class="text-center text-danger">Failed to load transactions</td></tr>';
        }
        Toast.error('Failed to load stock in transactions', 'Error');
    }
}

// ============================================
// DISPLAY FUNCTIONS
// ============================================

function displayStockIn(transactions) {
    const tbody = document.getElementById('stockInTableBody');
    
    tbody.innerHTML = transactions.map(t => `
        <tr>
            <td>${new Date(t.purchase_date).toLocaleDateString()}</td>
            <td>${escapeHtml(t.product_name || 'N/A')}</td>
            <td>${escapeHtml(t.supplier_name || 'N/A')}</td>
            <td>${t.quantity}</td>
            <td>${formatCurrency(t.buying_price)}</td>
            <td>${formatCurrency(t.total_amount)}</td>
            <td>${formatCurrency(t.amount_paid)}</td>
            <td class="${t.balance > 0 ? 'text-danger fw-bold' : 'text-success fw-bold'}">${formatCurrency(t.balance)}</td>
            <td>
                <span class="badge bg-${getPaymentStatusColor(t.payment_status)}">
                    ${t.payment_status || 'Unknown'}
                </span>
            </td>
            <td>
                ${t.receipt_file ? 
                    `<button class="btn btn-sm btn-primary" onclick="viewReceipt('${t.receipt_file}')">
                        <i class="fas fa-eye"></i>
                    </button>` : 
                    '<span class="text-muted">No file</span>'
                }
            </td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    ${t.balance > 0 ? 
                        `<button class="btn btn-warning" onclick="makePayment(${t.id})" title="Make Payment">
                            <i class="fas fa-credit-card"></i>
                        </button>` : 
                        `<button class="btn btn-success" disabled title="Fully Paid">
                            <i class="fas fa-check"></i>
                        </button>`
                    }
                    <button class="btn btn-info" onclick="viewPaymentHistory(${t.id})" title="View Payment History">
                        <i class="fas fa-history"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function displayUnpaidBalances(unpaid) {
    const tbody = document.getElementById('unpaidTableBody');
    const totalEl = document.getElementById('totalUnpaid');
    
    if (!unpaid || unpaid.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No unpaid balances found</td></tr>';
        if (totalEl) totalEl.textContent = formatCurrency(0);
        return;
    }
    
    let total = 0;
    tbody.innerHTML = unpaid.map(item => {
        total += parseFloat(item.balance || 0);
        return `
            <tr>
                <td>${new Date(item.purchase_date).toLocaleDateString()}</td>
                <td>${escapeHtml(item.supplier_name || 'N/A')}</td>
                <td>${escapeHtml(item.product_name || 'N/A')}</td>
                <td>${formatCurrency(item.total_amount || 0)}</td>
                <td>${formatCurrency(item.amount_paid || 0)}</td>
                <td class="text-danger fw-bold">${formatCurrency(item.balance || 0)}</td>
                <td>
                    <span class="badge bg-${getPaymentStatusColor(item.payment_status)}">
                        ${item.payment_status || 'Unknown'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="makePayment(${item.id})">
                        <i class="fas fa-credit-card"></i> Pay
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    if (totalEl) totalEl.textContent = formatCurrency(total);
}

// ============================================
// STOCK IN OPERATIONS
// ============================================

function calculateTotals() {
    const quantity = parseFloat(document.getElementById('quantity')?.value) || 0;
    const price = parseFloat(document.getElementById('buying_price')?.value) || 0;
    const paid = parseFloat(document.getElementById('amount_paid')?.value) || 0;
    
    const total = quantity * price;
    const balance = total - paid;
    
    // You can display these values somewhere if you want
    console.log('Calculated - Total:', total, 'Balance:', balance);
}

async function saveStockIn() {
    console.log('Saving stock in transaction...');
    
    const form = document.getElementById('stockInForm');
    const formData = new FormData(form);
    
    // Validate required fields
    const product_id = document.getElementById('product_id')?.value;
    const supplier_id = document.getElementById('supplier_id')?.value;
    const quantity = document.getElementById('quantity')?.value;
    const buying_price = document.getElementById('buying_price')?.value;
    const payment_method = document.getElementById('payment_method')?.value;
    const purchase_date = document.getElementById('purchase_date')?.value;
    
    if (!product_id) {
        Toast.warning('Please select a product', 'Missing Information');
        return;
    }
    if (!supplier_id) {
        Toast.warning('Please select a supplier', 'Missing Information');
        return;
    }
    if (!quantity || quantity <= 0) {
        Toast.warning('Please enter a valid quantity', 'Invalid Input');
        return;
    }
    if (!buying_price || buying_price <= 0) {
        Toast.warning('Please enter a valid buying price', 'Invalid Input');
        return;
    }
    if (!payment_method) {
        Toast.warning('Please select a payment method', 'Missing Information');
        return;
    }
    if (!purchase_date) {
        Toast.warning('Please select a purchase date', 'Missing Information');
        return;
    }
    
    // Show loading toast
    const loader = Toast.loading('Processing stock in transaction...');
    
    try {
        const response = await fetch('/api/stock-in', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.errors?.[0]?.msg || 'Failed to save');
        }
        
        loader.success('Stock in transaction saved successfully!');
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('stockInModal'));
        if (modal) modal.hide();
        
        // Reset form
        form.reset();
        document.getElementById('purchase_date').valueAsDate = new Date();
        
        // Refresh the list
        currentPage = 1;
        await loadStockIn();
        
        // Also refresh dashboard if needed
        if (typeof window.loadDashboardData === 'function') {
            window.loadDashboardData();
        }
        
    } catch (error) {
        console.error('Save error:', error);
        loader.error(error.message);
    }
}

async function showUnpaidBalances() {
    try {
        const unpaid = await API.stockIn.getUnpaid();
        displayUnpaidBalances(unpaid);
        new bootstrap.Modal(document.getElementById('unpaidModal')).show();
    } catch (error) {
        console.error('Failed to load unpaid balances:', error);
        Toast.error('Failed to load unpaid balances', 'Error');
    }
}

function viewReceipt(filePath) {
    window.open(filePath, '_blank');
}

function resetStockInForm() {
    const form = document.getElementById('stockInForm');
    if (form) form.reset();
    
    const dateInput = document.getElementById('purchase_date');
    if (dateInput) dateInput.valueAsDate = new Date();
}

// ============================================
// PAYMENT FUNCTIONS
// ============================================

// Function to open payment modal
// In stock-in.js - Update the makePayment function

// Complete working makePayment function with default payment method
async function makePayment(stockInId) {
    console.log('Opening payment modal for stock in ID:', stockInId);
    currentPaymentStockInId = stockInId;
    
    try {
        const response = await fetch(`/api/stock-in/${stockInId}`);
        const transaction = await response.json();
        
        if (!response.ok) {
            throw new Error(transaction.error || 'Failed to load transaction');
        }
        
        // Set all form values
        document.getElementById('payment_stock_in_id').value = stockInId;
        document.getElementById('transactionDetails').innerHTML = `
            Product: ${escapeHtml(transaction.product_name)}<br>
            Supplier: ${escapeHtml(transaction.supplier_name)}<br>
            Total Amount: ${formatCurrency(transaction.total_amount)}<br>
            Paid: ${formatCurrency(transaction.amount_paid)}<br>
            <strong class="text-danger">Balance: ${formatCurrency(transaction.balance)}</strong>
        `;
        
        document.getElementById('balanceInfo').innerHTML = `Remaining balance: ${formatCurrency(transaction.balance)}`;
        document.getElementById('payment_amount').max = transaction.balance;
        document.getElementById('payment_amount').value = transaction.balance;
        document.getElementById('payment_date').valueAsDate = new Date();
        document.getElementById('payment_notes').value = '';
        
        // IMPORTANT: Pre-select a default payment method
        const paymentMethodSelect = document.getElementById('payment_method');
        if (paymentMethodSelect) {
            paymentMethodSelect.value = 'Cash'; // Default to Cash
        }
        
        new bootstrap.Modal(document.getElementById('paymentModal')).show();
        
    } catch (error) {
        console.error('Error loading transaction:', error);
        Toast.error(error.message || 'Failed to load transaction details');
    }
}

// Function to process payment
async function processPayment() {
    console.log('=== PROCESS PAYMENT STARTED ===');
    
    // Get values from form
    const stock_in_id = document.getElementById('payment_stock_in_id').value;
    const amount = parseFloat(document.getElementById('payment_amount').value);
    const payment_method = document.getElementById('payment_method').value;
    const payment_date = document.getElementById('payment_date').value;
    const notes = document.getElementById('payment_notes').value;
    
    // Log all values to see what's being captured
    console.log('Raw values from form:');
    console.log('stock_in_id element:', document.getElementById('payment_stock_in_id'));
    console.log('stock_in_id value:', stock_in_id);
    console.log('amount element:', document.getElementById('payment_amount'));
    console.log('amount value:', amount);
    console.log('payment_method element:', document.getElementById('payment_method'));
    console.log('payment_method value:', payment_method);
    console.log('payment_method selected index:', document.getElementById('payment_method')?.selectedIndex);
    console.log('payment_method options:', document.getElementById('payment_method')?.innerHTML);
    console.log('payment_date element:', document.getElementById('payment_date'));
    console.log('payment_date value:', payment_date);
    console.log('notes value:', notes);
    
    // Validate
    if (!stock_in_id) {
        console.log('Validation failed: No stock_in_id');
        Toast.warning('Transaction ID missing', 'Error');
        return;
    }
    
    if (!amount || amount <= 0) {
        console.log('Validation failed: Invalid amount', amount);
        Toast.warning('Please enter a valid amount', 'Invalid Amount');
        return;
    }
    
    if (!payment_method) {
        console.log('Validation failed: No payment method selected');
        console.log('payment_method element exists:', !!document.getElementById('payment_method'));
        console.log('payment_method value type:', typeof payment_method);
        console.log('payment_method length:', payment_method ? payment_method.length : 0);
        
        // Try to get value again using different methods
        const selectEl = document.getElementById('payment_method');
        const selectedOption = selectEl.options[selectEl.selectedIndex];
        console.log('Selected option text:', selectedOption ? selectedOption.text : 'none');
        console.log('Selected option value:', selectedOption ? selectedOption.value : 'none');
        
        Toast.warning('Please select a payment method', 'Missing Information');
        return;
    }
    
    if (!payment_date) {
        console.log('Validation failed: No payment date');
        Toast.warning('Please select a payment date', 'Missing Information');
        return;
    }
    
    console.log('Validation passed! All fields are filled.');
    console.log('Final payment data:', {
        stock_in_id: parseInt(stock_in_id),
        amount: amount,
        payment_method: payment_method,
        payment_date: payment_date,
        notes: notes
    });
    
    // Show loading
    const loader = Toast.loading('Processing payment...');
    
    try {
        const response = await fetch('/api/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                stock_in_id: parseInt(stock_in_id),
                amount: amount,
                payment_method: payment_method,
                payment_date: payment_date,
                notes: notes
            })
        });
        
        const data = await response.json();
        console.log('Payment response:', data);
        
        if (!response.ok) {
            throw new Error(data.error || data.errors?.[0]?.msg || 'Payment failed');
        }
        
        loader.success('Payment processed successfully!');
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
        
        // Reset form
        document.getElementById('paymentForm').reset();
        document.getElementById('payment_date').valueAsDate = new Date();
        
        // Refresh stock in list
        await loadStockIn();
        
        // Refresh unpaid balances if modal is open
        const unpaidModal = document.getElementById('unpaidModal');
        if (unpaidModal && unpaidModal.classList.contains('show')) {
            showUnpaidBalances();
        }
        
        // Refresh dashboard if needed
        if (typeof window.loadDashboardData === 'function') {
            window.loadDashboardData();
        }
        
    } catch (error) {
        console.error('Payment error:', error);
        loader.error(error.message);
    }
}

// Function to view payment history
async function viewPaymentHistory(stockInId) {
    try {
        console.log('Fetching payment history for stock in ID:', stockInId);
        
        // Show loading in modal
        const tbody = document.getElementById('paymentHistoryBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center"><div class="spinner"></div> Loading...</td></tr>';
        }
        
        const payments = await API.payments.getHistory(stockInId);
        console.log('Payment history received:', payments);
        
        displayPaymentHistory(payments, stockInId);
        new bootstrap.Modal(document.getElementById('paymentHistoryModal')).show();
        
    } catch (error) {
        console.error('Error loading payment history:', error);
        
        // Check if it's the "table doesn't exist" error
        if (error.message && error.message.includes('doesn\'t exist')) {
            // Show empty state gracefully
            displayPaymentHistory([], stockInId);
            new bootstrap.Modal(document.getElementById('paymentHistoryModal')).show();
            Toast.info('No payment history yet. Make your first payment to see history here.', 'Info');
        } else {
            Toast.error('Failed to load payment history');
        }
    }
}

// Function to display payment history
function displayPaymentHistory(payments, stockInId) {
    const tbody = document.getElementById('paymentHistoryBody');
    const totalEl = document.getElementById('totalPaid');
    
    if (!payments || payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No payment history found</td></tr>';
        if (totalEl) totalEl.textContent = formatCurrency(0);
        return;
    }
    
    let total = 0;
    tbody.innerHTML = payments.map(p => {
        total += parseFloat(p.amount || 0);
        return `
            <tr>
                <td>${new Date(p.payment_date).toLocaleDateString()}</td>
                <td class="fw-bold text-success">${formatCurrency(p.amount)}</td>
                <td><span class="badge bg-info">${p.payment_method}</span></td>
                <td>${escapeHtml(p.notes || '-')}</td>
            </tr>
        `;
    }).join('');
    
    if (totalEl) totalEl.textContent = formatCurrency(total);
}

// ============================================
// PAGINATION FUNCTIONS
// ============================================

function setupPagination(pagination) {
    const paginationEl = document.getElementById('pagination');
    if (!paginationEl) return;
    
    if (!pagination || pagination.pages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `
        <li class="page-item ${pagination.page === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${pagination.page - 1}); return false;">Previous</a>
        </li>
    `;
    
    for (let i = 1; i <= pagination.pages; i++) {
        if (i === 1 || i === pagination.pages || (i >= pagination.page - 2 && i <= pagination.page + 2)) {
            html += `
                <li class="page-item ${i === pagination.page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
                </li>
            `;
        } else if (i === pagination.page - 3 || i === pagination.page + 3) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    html += `
        <li class="page-item ${pagination.page === pagination.pages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${pagination.page + 1}); return false;">Next</a>
        </li>
    `;
    
    paginationEl.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    loadStockIn();
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getPaymentStatusColor(status) {
    switch(status) {
        case 'Paid': return 'success';
        case 'Partial': return 'warning';
        case 'Unpaid': return 'danger';
        default: return 'secondary';
    }
}

function formatCurrency(amount) {
    return 'Tsh ' + Number(amount || 0).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}