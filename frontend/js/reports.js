let currentReportType = 'current-stock';
let filters = {};

document.addEventListener('DOMContentLoaded', () => {
    loadReport();
    updateFilterSection();
});

function changeReportType() {
    currentReportType = document.getElementById('reportType').value;
    filters = {};
    updateFilterSection();
    loadReport();
}

function updateFilterSection() {
    const filterSection = document.getElementById('filterSection');
    
    switch(currentReportType) {
        case 'current-stock':
            filterSection.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <select class="form-select" id="productFilter">
                            <option value="">All Products</option>
                        </select>
                    </div>
                </div>
            `;
            loadProductFilter();
            break;
            
        case 'stock-in':
        case 'stock-out':
            filterSection.innerHTML = `
                <div class="row g-2">
                    <div class="col-md-3">
                        <input type="date" class="form-control" id="startDate" placeholder="Start Date">
                    </div>
                    <div class="col-md-3">
                        <input type="date" class="form-control" id="endDate" placeholder="End Date">
                    </div>
                    <div class="col-md-3">
                        <select class="form-select" id="productFilter">
                            <option value="">All Products</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <button class="btn btn-primary w-100" onclick="applyFilters()">Apply Filters</button>
                    </div>
                </div>
            `;
            loadProductFilter();
            break;
            
        case 'supplier-purchases':
            filterSection.innerHTML = `
                <div class="row g-2">
                    <div class="col-md-3">
                        <select class="form-select" id="supplierFilter">
                            <option value="">All Suppliers</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <input type="date" class="form-control" id="startDate" placeholder="Start Date">
                    </div>
                    <div class="col-md-3">
                        <input type="date" class="form-control" id="endDate" placeholder="End Date">
                    </div>
                    <div class="col-md-3">
                        <button class="btn btn-primary w-100" onclick="applyFilters()">Apply Filters</button>
                    </div>
                </div>
            `;
            loadSupplierFilter();
            break;
            
        case 'unpaid':
            filterSection.innerHTML = `
                <div class="row g-2">
                    <div class="col-md-6">
                        <select class="form-select" id="supplierFilter">
                            <option value="">All Suppliers</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <button class="btn btn-primary" onclick="applyFilters()">Apply Filters</button>
                    </div>
                </div>
            `;
            loadSupplierFilter();
            break;
            
        case 'low-stock':
            filterSection.innerHTML = `
                <div class="row">
                    <div class="col-md-12">
                        <p class="text-muted">Showing products with quantity below minimum stock level</p>
                    </div>
                </div>
            `;
            break;
    }
}

async function loadProductFilter() {
    try {
        const data = await API.products.getAll(1, '');
        const select = document.getElementById('productFilter');
        if (select) {
            select.innerHTML = '<option value="">All Products</option>' + 
                data.products.map(p => `<option value="${p.id}">${p.product_name}</option>`).join('');
        }
    } catch (error) {
        console.error('Failed to load products for filter:', error);
    }
}

async function loadSupplierFilter() {
    try {
        const suppliers = await API.suppliers.getAll();
        const select = document.getElementById('supplierFilter');
        if (select) {
            select.innerHTML = '<option value="">All Suppliers</option>' + 
                suppliers.map(s => `<option value="${s.id}">${s.supplier_name}</option>`).join('');
        }
    } catch (error) {
        console.error('Failed to load suppliers for filter:', error);
    }
}

function applyFilters() {
    filters = {};
    
    if (document.getElementById('startDate')) {
        filters.start_date = document.getElementById('startDate').value;
    }
    if (document.getElementById('endDate')) {
        filters.end_date = document.getElementById('endDate').value;
    }
    if (document.getElementById('productFilter')) {
        filters.product_id = document.getElementById('productFilter').value;
    }
    if (document.getElementById('supplierFilter')) {
        filters.supplier_id = document.getElementById('supplierFilter').value;
    }
    
    loadReport();
}

async function loadReport() {
    document.getElementById('reportTitle').textContent = getReportTitle();
    
    try {
        let data;
        switch(currentReportType) {
            case 'current-stock':
                data = await API.reports.currentStock(filters);
                displayCurrentStockReport(data);
                break;
            case 'stock-in':
                data = await API.reports.stockIn(filters);
                displayStockInReport(data);
                break;
            case 'stock-out':
                data = await API.reports.stockOut(filters);
                displayStockOutReport(data);
                break;
            case 'supplier-purchases':
                data = await API.reports.supplierPurchases(filters);
                displaySupplierPurchaseReport(data);
                break;
            case 'unpaid':
                data = await API.reports.unpaid(filters);
                displayUnpaidReport(data);
                break;
            case 'low-stock':
                data = await API.reports.lowStock();
                displayLowStockReport(data);
                break;
        }
    } catch (error) {
        showToast('Failed to load report', 'error');
    }
}

function getReportTitle() {
    const titles = {
        'current-stock': 'Current Stock Report',
        'stock-in': 'Stock In Report',
        'stock-out': 'Stock Out Report',
        'supplier-purchases': 'Supplier Purchase Report',
        'unpaid': 'Unpaid Purchase Report',
        'low-stock': 'Low Stock Report'
    };
    return titles[currentReportType] || 'Report';
}

function displayCurrentStockReport(data) {
    const thead = document.getElementById('reportTableHead');
    const tbody = document.getElementById('reportTableBody');
    const tfoot = document.getElementById('reportTableFoot');
    
    thead.innerHTML = `
        <tr>
            <th>Product Code</th>
            <th>Product Name</th>
            <th>Unit Type</th>
            <th>Current Stock</th>
            <th>Min Level</th>
            <th>Status</th>
            <th>Total Purchased</th>
            <th>Total Sold</th>
        </tr>
    `;
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No data available</td></tr>';
        tfoot.innerHTML = '';
        return;
    }
    
    let totalStock = 0;
    tbody.innerHTML = data.map(item => {
        totalStock += item.quantity;
        return `
            <tr>
                <td><strong>${item.product_code}</strong></td>
                <td>${item.product_name}</td>
                <td>${item.unit_type}</td>
                <td class="${item.quantity <= item.minimum_stock_level ? 'text-danger fw-bold' : ''}">${item.quantity}</td>
                <td>${item.minimum_stock_level}</td>
                <td>
                    <span class="badge bg-${item.quantity <= item.minimum_stock_level ? 'danger' : 'success'}">
                        ${item.quantity <= item.minimum_stock_level ? 'Low Stock' : 'Normal'}
                    </span>
                </td>
                <td>${item.total_purchased || 0}</td>
                <td>${item.total_sold || 0}</td>
            </tr>
        `;
    }).join('');
    
    tfoot.innerHTML = `
        <tr class="table-info">
            <th colspan="3" class="text-end">Total Stock:</th>
            <th>${totalStock}</th>
            <th colspan="4"></th>
        </tr>
    `;
}

function displayStockInReport(data) {
    const thead = document.getElementById('reportTableHead');
    const tbody = document.getElementById('reportTableBody');
    const tfoot = document.getElementById('reportTableFoot');
    
    thead.innerHTML = `
        <tr>
            <th>Date</th>
            <th>Product</th>
            <th>Supplier</th>
            <th>Quantity</th>
            <th>Buying Price</th>
            <th>Total Amount</th>
            <th>Paid</th>
            <th>Balance</th>
            <th>Status</th>
        </tr>
    `;
    
    if (!data.transactions || data.transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No data available</td></tr>';
        tfoot.innerHTML = '';
        return;
    }
    
    tbody.innerHTML = data.transactions.map(item => `
        <tr>
            <td>${new Date(item.purchase_date).toLocaleDateString()}</td>
            <td>${item.product_name}</td>
            <td>${item.supplier_name}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.buying_price)}</td>
            <td>${formatCurrency(item.total_amount)}</td>
            <td>${formatCurrency(item.amount_paid)}</td>
            <td class="${item.balance > 0 ? 'text-danger fw-bold' : ''}">${formatCurrency(item.balance)}</td>
            <td>
                <span class="badge bg-${getPaymentStatusColor(item.payment_status)}">
                    ${item.payment_status}
                </span>
            </td>
        </tr>
    `).join('');
    
    tfoot.innerHTML = `
        <tr class="table-info">
            <th colspan="3" class="text-end">Totals:</th>
            <th>${data.summary.total_quantity}</th>
            <th></th>
            <th>${formatCurrency(data.summary.total_amount)}</th>
            <th>${formatCurrency(data.summary.total_paid)}</th>
            <th>${formatCurrency(data.summary.total_balance)}</th>
            <th></th>
        </tr>
    `;
}

function displayStockOutReport(data) {
    const thead = document.getElementById('reportTableHead');
    const tbody = document.getElementById('reportTableBody');
    const tfoot = document.getElementById('reportTableFoot');
    
    thead.innerHTML = `
        <tr>
            <th>Date</th>
            <th>Product</th>
            <th>Quantity</th>
            <th>Notes</th>
        </tr>
    `;
    
    if (!data.transactions || data.transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No data available</td></tr>';
        tfoot.innerHTML = '';
        return;
    }
    
    tbody.innerHTML = data.transactions.map(item => `
        <tr>
            <td>${new Date(item.date).toLocaleDateString()}</td>
            <td>${item.product_name} (${item.product_code})</td>
            <td class="fw-bold">${item.quantity}</td>
            <td>${item.notes || '-'}</td>
        </tr>
    `).join('');
    
    tfoot.innerHTML = `
        <tr class="table-info">
            <th colspan="2" class="text-end">Total Quantity:</th>
            <th>${data.summary.total_quantity}</th>
            <th></th>
        </tr>
    `;
}

function displaySupplierPurchaseReport(data) {
    const thead = document.getElementById('reportTableHead');
    const tbody = document.getElementById('reportTableBody');
    const tfoot = document.getElementById('reportTableFoot');
    
    thead.innerHTML = `
        <tr>
            <th>Supplier Name</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Total Purchases</th>
            <th>Total Quantity</th>
            <th>Total Amount</th>
            <th>Total Paid</th>
            <th>Balance</th>
        </tr>
    `;
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No data available</td></tr>';
        tfoot.innerHTML = '';
        return;
    }
    
    let totalAmount = 0, totalPaid = 0, totalBalance = 0;
    
    tbody.innerHTML = data.map(item => {
        totalAmount += parseFloat(item.total_amount || 0);
        totalPaid += parseFloat(item.total_paid || 0);
        totalBalance += parseFloat(item.total_balance || 0);
        
        return `
            <tr>
                <td><strong>${item.supplier_name}</strong></td>
                <td>${item.phone || '-'}</td>
                <td>${item.email || '-'}</td>
                <td>${item.total_purchases || 0}</td>
                <td>${item.total_quantity || 0}</td>
                <td>${formatCurrency(item.total_amount || 0)}</td>
                <td>${formatCurrency(item.total_paid || 0)}</td>
                <td class="${item.total_balance > 0 ? 'text-danger fw-bold' : ''}">${formatCurrency(item.total_balance || 0)}</td>
            </tr>
        `;
    }).join('');
    
    tfoot.innerHTML = `
        <tr class="table-info">
            <th colspan="5" class="text-end">Totals:</th>
            <th>${formatCurrency(totalAmount)}</th>
            <th>${formatCurrency(totalPaid)}</th>
            <th>${formatCurrency(totalBalance)}</th>
        </tr>
    `;
}

function displayUnpaidReport(data) {
    const thead = document.getElementById('reportTableHead');
    const tbody = document.getElementById('reportTableBody');
    const tfoot = document.getElementById('reportTableFoot');
    
    thead.innerHTML = `
        <tr>
            <th>Date</th>
            <th>Supplier</th>
            <th>Product</th>
            <th>Total Amount</th>
            <th>Paid</th>
            <th>Balance</th>
            <th>Status</th>
        </tr>
    `;
    
    if (!data.transactions || data.transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No unpaid balances found</td></tr>';
        tfoot.innerHTML = '';
        return;
    }
    
    tbody.innerHTML = data.transactions.map(item => `
        <tr>
            <td>${new Date(item.purchase_date).toLocaleDateString()}</td>
            <td>${item.supplier_name}</td>
            <td>${item.product_name}</td>
            <td>${formatCurrency(item.total_amount)}</td>
            <td>${formatCurrency(item.amount_paid)}</td>
            <td class="text-danger fw-bold">${formatCurrency(item.balance)}</td>
            <td>
                <span class="badge bg-${getPaymentStatusColor(item.payment_status)}">
                    ${item.payment_status}
                </span>
            </td>
        </tr>
    `).join('');
    
    tfoot.innerHTML = `
        <tr class="table-danger">
            <th colspan="5" class="text-end">Total Unpaid:</th>
            <th>${formatCurrency(data.total_unpaid)}</th>
            <th></th>
        </tr>
    `;
}

function displayLowStockReport(data) {
    const thead = document.getElementById('reportTableHead');
    const tbody = document.getElementById('reportTableBody');
    const tfoot = document.getElementById('reportTableFoot');
    
    thead.innerHTML = `
        <tr>
            <th>Product Code</th>
            <th>Product Name</th>
            <th>Unit Type</th>
            <th>Current Stock</th>
            <th>Min Level</th>
            <th>Required Quantity</th>
            <th>Status</th>
        </tr>
    `;
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-success">No low stock items found</td></tr>';
        tfoot.innerHTML = '';
        return;
    }
    
    tbody.innerHTML = data.map(item => `
        <tr>
            <td><strong>${item.product_code}</strong></td>
            <td>${item.product_name}</td>
            <td>${item.unit_type}</td>
            <td class="text-danger fw-bold">${item.quantity}</td>
            <td>${item.minimum_stock_level}</td>
            <td class="text-warning fw-bold">${item.required_quantity}</td>
            <td>
                <span class="badge bg-danger">Low Stock</span>
            </td>
        </tr>
    `).join('');
    
    tfoot.innerHTML = `
        <tr class="table-warning">
            <th colspan="3" class="text-end">Total Low Stock Items:</th>
            <th>${data.length}</th>
            <th colspan="3"></th>
        </tr>
    `;
}

function exportToExcel() {
    const table = document.getElementById('reportTable');
    const rows = table.querySelectorAll('tr');
    const csv = [];
    
    for (const row of rows) {
        const cells = row.querySelectorAll('td, th');
        const rowData = [];
        for (const cell of cells) {
            rowData.push('"' + cell.innerText.replace(/"/g, '""') + '"');
        }
        csv.push(rowData.join(','));
    }
    
    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentReportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showToast('Report exported successfully', 'success');
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