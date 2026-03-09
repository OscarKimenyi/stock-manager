document.addEventListener('DOMContentLoaded', async () => {
    await loadDashboardData();
});

async function loadDashboardData() {
    try {
        const data = await API.reports.dashboard();
        
        // Update statistics
        document.getElementById('totalProducts').textContent = data.statistics.total_products;
        document.getElementById('totalSuppliers').textContent = data.statistics.total_suppliers;
        document.getElementById('totalStock').textContent = data.statistics.total_stock;
        document.getElementById('totalUnpaid').textContent = formatCurrency(data.statistics.total_unpaid);
        document.getElementById('totalStockIn').textContent = data.statistics.total_stock_in;
        document.getElementById('totalStockOut').textContent = data.statistics.total_stock_out;
        
        // Update recent stock in
        updateRecentStockIn(data.recent_stock_in);
        
        // Update low stock alerts
        updateLowStockAlerts(data.low_stock_alerts);
        
    } catch (error) {
        showToast('Failed to load dashboard data', 'error');
    }
}

function updateRecentStockIn(transactions) {
    const tbody = document.getElementById('recentStockIn');
    
    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No recent transactions</td></tr>';
        return;
    }
    
    tbody.innerHTML = transactions.map(t => `
        <tr>
            <td>${t.product_name}</td>
            <td>${t.supplier_name}</td>
            <td>${t.quantity}</td>
            <td>${new Date(t.purchase_date).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

function updateLowStockAlerts(products) {
    const tbody = document.getElementById('lowStockAlerts');
    
    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No low stock items</td></tr>';
        return;
    }
    
    tbody.innerHTML = products.map(p => `
        <tr>
            <td>${p.product_name}</td>
            <td class="text-danger fw-bold">${p.quantity}</td>
            <td>${p.minimum_stock_level}</td>
            <td><span class="badge bg-danger">Low Stock</span></td>
        </tr>
    `).join('');
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'TZS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        currencyDisplay: 'code'
    }).format(amount).replace('TZS', 'Tsh').trim();
}