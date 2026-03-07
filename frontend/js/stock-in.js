let currentPage = 1;

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    loadSuppliers();
    loadStockIn();
    
    // Set today's date as default
    document.getElementById('purchase_date').valueAsDate = new Date();
    
    // Calculate totals on input change
    document.getElementById('quantity').addEventListener('input', calculateTotals);
    document.getElementById('buying_price').addEventListener('input', calculateTotals);
    document.getElementById('amount_paid').addEventListener('input', calculateTotals);
});

async function loadProducts() {
    try {
        const data = await API.products.getAll(1, '');
        const select = document.getElementById('product_id');
        select.innerHTML = '<option value="">Select Product</option>' + 
            data.products.map(p => `<option value="${p.id}">${p.product_name} (${p.product_code})</option>`).join('');
    } catch (error) {
        showToast('Failed to load products', 'error');
    }
}

async function loadSuppliers() {
    try {
        const suppliers = await API.suppliers.getAll();
        const select = document.getElementById('supplier_id');
        select.innerHTML = '<option value="">Select Supplier</option>' + 
            suppliers.map(s => `<option value="${s.id}">${s.supplier_name}</option>`).join('');
    } catch (error) {
        showToast('Failed to load suppliers', 'error');
    }
}

async function loadStockIn() {
    try {
        const data = await API.stockIn.getAll(currentPage);
        displayStockIn(data.transactions);
        setupPagination(data.pagination);
    } catch (error) {
        showToast('Failed to load stock in transactions', 'error');
    }
}

function displayStockIn(transactions) {
    const tbody = document.getElementById('stockInTableBody');
    
    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="text-center">No transactions found</td></tr>';
        return;
    }
    
    tbody.innerHTML = transactions.map(t => `
        <tr>
            <td>${new Date(t.purchase_date).toLocaleDateString()}</td>
            <td>${escapeHtml(t.product_name)}</td>
            <td>${escapeHtml(t.supplier_name)}</td>
            <td>${t.quantity}</td>
            <td>${formatCurrency(t.buying_price)}</td>
            <td>${formatCurrency(t.total_amount)}</td>
            <td>${formatCurrency(t.amount_paid)}</td>
            <td class="${t.balance > 0 ? 'text-danger fw-bold' : ''}">${formatCurrency(t.balance)}</td>
            <td>
                <span class="badge bg-${getPaymentStatusColor(t.payment_status)}">
                    ${t.payment_status}
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
    const quantity = parseFloat(document.getElementById('quantity').value) || 0;
    const price = parseFloat(document.getElementById('buying_price').value) || 0;
    const paid = parseFloat(document.getElementById('amount_paid').value) || 0;
    
    const total = quantity * price;
    const balance = total - paid;
    
    // Update UI with calculated values (optional)
}

async function saveStockIn() {
    console.log('=== SAVE STOCK IN STARTED ===');
    
    const form = document.getElementById('stockInForm');
    const formData = new FormData(form);
    
    // Log all form data being sent
    console.log('Form Data Contents:');
    for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1] + ' (type: ' + typeof pair[1] + ')');
    }
    
    // Manual validation before sending
    const product_id = document.getElementById('product_id').value;
    const supplier_id = document.getElementById('supplier_id').value;
    const quantity = document.getElementById('quantity').value;
    const buying_price = document.getElementById('buying_price').value;
    const amount_paid = document.getElementById('amount_paid').value;
    const payment_method = document.getElementById('payment_method').value;
    const purchase_date = document.getElementById('purchase_date').value;
    
    console.log('Manual Validation Check:', {
        product_id: product_id,
        supplier_id: supplier_id,
        quantity: quantity,
        buying_price: buying_price,
        amount_paid: amount_paid,
        payment_method: payment_method,
        purchase_date: purchase_date
    });
    
    // Validate each field
    if (!product_id || product_id === '') {
        showToast('Please select a product', 'warning');
        return;
    }
    if (!supplier_id || supplier_id === '') {
        showToast('Please select a supplier', 'warning');
        return;
    }
    if (!quantity || quantity <= 0) {
        showToast('Please enter a valid quantity (must be greater than 0)', 'warning');
        return;
    }
    if (!buying_price || buying_price <= 0) {
        showToast('Please enter a valid buying price (must be greater than 0)', 'warning');
        return;
    }
    if (amount_paid === '' || amount_paid < 0) {
        showToast('Please enter a valid amount paid (cannot be negative)', 'warning');
        return;
    }
    if (!payment_method || payment_method === '') {
        showToast('Please select a payment method', 'warning');
        return;
    }
    if (!purchase_date || purchase_date === '') {
        showToast('Please select a purchase date', 'warning');
        return;
    }
    
    try {
        console.log('Sending request to server...');
        
        const response = await fetch('/api/stock-in', {
            method: 'POST',
            body: formData
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('Failed to parse JSON response:', e);
            showToast('Server returned invalid response', 'error');
            return;
        }
        
        console.log('Parsed response data:', data);
        
        if (!response.ok) {
            if (data.errors) {
                // Handle validation errors from express-validator
                console.error('Validation errors:', data.errors);
                const errorMessages = data.errors.map(e => e.msg).join('. ');
                showToast('Validation failed: ' + errorMessages, 'error');
            } else if (data.error) {
                console.error('Server error:', data.error);
                showToast(data.error, 'error');
            } else {
                showToast('Failed to save transaction (Status: ' + response.status + ')', 'error');
            }
            return;
        }
        
        // Success
        console.log('Transaction saved successfully:', data);
        showToast('Stock in transaction saved successfully', 'success');
        
        // Close modal
        const modalElement = document.getElementById('stockInModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
        
        // Reset form
        form.reset();
        document.getElementById('purchase_date').valueAsDate = new Date();
        
        // Refresh the list
        currentPage = 1;
        await loadStockIn();
        
    } catch (error) {
        console.error('Network or other error:', error);
        showToast('Error: ' + error.message, 'error');
    }
}

async function showUnpaidBalances() {
    try {
        const unpaid = await API.stockIn.getUnpaid();
        displayUnpaidBalances(unpaid);
        new bootstrap.Modal(document.getElementById('unpaidModal')).show();
    } catch (error) {
        showToast('Failed to load unpaid balances', 'error');
    }
}

function displayUnpaidBalances(unpaid) {
    const tbody = document.getElementById('unpaidTableBody');
    const totalEl = document.getElementById('totalUnpaid');
    
    if (!unpaid || unpaid.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No unpaid balances found</td></tr>';
        totalEl.textContent = formatCurrency(0);
        return;
    }
    
    let total = 0;
    tbody.innerHTML = unpaid.map(item => {
        total += parseFloat(item.balance);
        return `
            <tr>
                <td>${new Date(item.purchase_date).toLocaleDateString()}</td>
                <td>${escapeHtml(item.supplier_name)}</td>
                <td>${escapeHtml(item.product_name)}</td>
                <td>${formatCurrency(item.total_amount)}</td>
                <td>${formatCurrency(item.amount_paid)}</td>
                <td class="text-danger fw-bold">${formatCurrency(item.balance)}</td>
                <td>
                    <span class="badge bg-${getPaymentStatusColor(item.payment_status)}">
                        ${item.payment_status}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
    
    totalEl.textContent = formatCurrency(total);
}

function viewReceipt(filePath) {
    window.open(filePath, '_blank');
}

function makePayment(id) {
    // Implement payment modal
    showToast('Payment functionality coming soon', 'info');
}

function setupPagination(pagination) {
    const paginationEl = document.getElementById('pagination');
    if (!pagination || pagination.pages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `
        <li class="page-item ${pagination.page === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${pagination.page - 1})">Previous</a>
        </li>
    `;
    
    for (let i = 1; i <= pagination.pages; i++) {
        if (i === 1 || i === pagination.pages || (i >= pagination.page - 2 && i <= pagination.page + 2)) {
            html += `
                <li class="page-item ${i === pagination.page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
                </li>
            `;
        } else if (i === pagination.page - 3 || i === pagination.page + 3) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    html += `
        <li class="page-item ${pagination.page === pagination.pages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${pagination.page + 1})">Next</a>
        </li>
    `;
    
    paginationEl.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    loadStockIn();
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
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(amount);
}