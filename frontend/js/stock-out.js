let currentPage = 1;

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    loadStockOut();
    
    // Set today's date as default
    document.getElementById('date').valueAsDate = new Date();
    
    // Check stock when product or quantity changes
    document.getElementById('product_id').addEventListener('change', checkStock);
    document.getElementById('quantity').addEventListener('input', checkStock);
});

async function loadProducts() {
    try {
        const data = await API.products.getAll(1, '');
        const select = document.getElementById('product_id');
        select.innerHTML = '<option value="">Select Product</option>' + 
            data.products.map(p => `<option value="${p.id}" data-stock="${p.quantity}">${p.product_name} (${p.product_code}) - Stock: ${p.quantity}</option>`).join('');
    } catch (error) {
        showToast('Failed to load products', 'error');
    }
}

async function loadStockOut() {
    try {
        const data = await API.stockOut.getAll(currentPage);
        displayStockOut(data.transactions);
        setupPagination(data.pagination);
    } catch (error) {
        showToast('Failed to load stock out transactions', 'error');
    }
}

function displayStockOut(transactions) {
    const tbody = document.getElementById('stockOutTableBody');
    
    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No transactions found</td></tr>';
        return;
    }
    
    tbody.innerHTML = transactions.map(t => `
        <tr>
            <td>${new Date(t.date).toLocaleDateString()}</td>
            <td>${escapeHtml(t.product_name)} (${escapeHtml(t.product_code)})</td>
            <td class="fw-bold">${t.quantity}</td>
            <td>${escapeHtml(t.notes || '-')}</td>
            <td>${new Date(t.created_at).toLocaleString()}</td>
        </tr>
    `).join('');
}

function checkStock() {
    const productSelect = document.getElementById('product_id');
    const quantity = parseInt(document.getElementById('quantity').value) || 0;
    const availableEl = document.getElementById('availableStock');
    
    if (!productSelect.value) {
        availableEl.textContent = '';
        return;
    }
    
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    const availableStock = parseInt(selectedOption.dataset.stock) || 0;
    
    if (quantity > availableStock) {
        availableEl.innerHTML = `<span class="text-danger">Insufficient stock! Available: ${availableStock}</span>`;
        return false;
    } else {
        availableEl.innerHTML = `<span class="text-success">Available stock: ${availableStock}</span>`;
        return true;
    }
}

async function saveStockOut() {
    if (!checkStock()) {
        Toast.warning('Insufficient stock available', 'Stock Error');
        return;
    }
    
    const product_id = document.getElementById('product_id').value;
    const quantity = document.getElementById('quantity').value;
    const date = document.getElementById('date').value;
    const notes = document.getElementById('notes').value;
    
    // Validate
    if (!product_id) {
        Toast.warning('Please select a product', 'Missing Information');
        return;
    }
    if (!quantity || quantity <= 0) {
        Toast.warning('Please enter a valid quantity', 'Invalid Input');
        return;
    }
    if (!date) {
        Toast.warning('Please select a date', 'Missing Information');
        return;
    }
    
    const formData = {
        product_id: parseInt(product_id),
        quantity: parseInt(quantity),
        date: date,
        notes: notes
    };
    
    // Show loading toast
    const loader = Toast.loading('Processing stock out transaction...');
    
    try {
        const response = await API.stockOut.create(formData);
        
        loader.success('Stock out transaction saved successfully!');
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('stockOutModal')).hide();
        
        // Reset form
        document.getElementById('stockOutForm').reset();
        document.getElementById('date').valueAsDate = new Date();
        
        // Refresh the list
        currentPage = 1;
        await loadStockOut();
        await loadProducts(); // Refresh product list with updated stock
        
        // Also refresh dashboard if needed
        if (typeof loadDashboardData === 'function') {
            loadDashboardData();
        }
        
    } catch (error) {
        console.error('Save error:', error);
        loader.error(error.message || 'Failed to save transaction');
    }
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
    loadStockOut();
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}