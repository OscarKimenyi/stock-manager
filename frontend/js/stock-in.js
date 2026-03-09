let currentPage = 1;

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
    
    // Calculate totals on input change
    const quantityInput = document.getElementById('quantity');
    const priceInput = document.getElementById('buying_price');
    const paidInput = document.getElementById('amount_paid');
    
    if (quantityInput) quantityInput.addEventListener('input', calculateTotals);
    if (priceInput) priceInput.addEventListener('input', calculateTotals);
    if (paidInput) paidInput.addEventListener('input', calculateTotals);
});

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
        showToast('Failed to load products', 'error');
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
        showToast('Failed to load suppliers', 'error');
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
        tbody.innerHTML = '<tr><td colspan="11" class="text-center"><div class="spinner"></div> Loading...</td></tr>';
        
        const data = await API.stockIn.getAll(currentPage);
        console.log('Stock in data received:', data);
        
        if (!data.transactions || data.transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="text-center">No transactions found</td></tr>';
            return;
        }
        
        displayStockIn(data.transactions);
        setupPagination(data.pagination);
        
    } catch (error) {
        console.error('Failed to load stock in transactions:', error);
        const tbody = document.getElementById('stockInTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="11" class="text-center text-danger">Failed to load transactions</td></tr>';
        }
        showToast('Failed to load stock in transactions', 'error');
    }
}

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
            <td class="${t.balance > 0 ? 'text-danger fw-bold' : ''}">${formatCurrency(t.balance)}</td>
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
                ${t.balance > 0 ? 
                    `<button class="btn btn-sm btn-warning" onclick="makePayment(${t.id})">
                        <i class="fas fa-credit-card"></i>
                    </button>` : 
                    '-'
                }
            </td>
        </tr>
    `).join('');
}

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
        if (typeof loadDashboardData === 'function') {
            loadDashboardData();
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
        showToast('Failed to load unpaid balances', 'error');
    }
}

function displayUnpaidBalances(unpaid) {
    const tbody = document.getElementById('unpaidTableBody');
    const totalEl = document.getElementById('totalUnpaid');
    
    if (!unpaid || unpaid.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No unpaid balances found</td></tr>';
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
            </tr>
        `;
    }).join('');
    
    if (totalEl) totalEl.textContent = formatCurrency(total);
}

function viewReceipt(filePath) {
    window.open(filePath, '_blank');
}

function makePayment(id) {
    showToast('Payment functionality coming soon', 'info');
}

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

function resetStockInForm() {
    const form = document.getElementById('stockInForm');
    if (form) form.reset();
    
    const dateInput = document.getElementById('purchase_date');
    if (dateInput) dateInput.valueAsDate = new Date();
}

function getPaymentStatusColor(status) {
    switch(status) {
        case 'Paid': return 'success';
        case 'Partial': return 'warning';
        case 'Unpaid': return 'danger';
        default: return 'secondary';
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'TZS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        currencyDisplay: 'code'
    }).format(amount || 0).replace('TZS', 'Tsh').trim();
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