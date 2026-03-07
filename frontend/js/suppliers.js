let deleteId = null;
let currentSupplierId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadSuppliers();
    
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', debounce(() => {
        loadSuppliers();
    }, 500));
});

async function loadSuppliers() {
    try {
        const search = document.getElementById('searchInput').value;
        const suppliers = await API.suppliers.getAll();
        
        // Filter locally if search term exists
        const filteredSuppliers = search 
            ? suppliers.filter(s => 
                s.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
                (s.email && s.email.toLowerCase().includes(search.toLowerCase())) ||
                (s.phone && s.phone.includes(search))
              )
            : suppliers;
        
        displaySuppliers(filteredSuppliers);
    } catch (error) {
        showToast('Failed to load suppliers', 'error');
    }
}

function displaySuppliers(suppliers) {
    const tbody = document.getElementById('suppliersTableBody');
    
    if (!suppliers || suppliers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No suppliers found</td></tr>';
        return;
    }
    
    tbody.innerHTML = suppliers.map(supplier => `
        <tr>
            <td><strong>${escapeHtml(supplier.supplier_name)}</strong></td>
            <td>${escapeHtml(supplier.phone || '-')}</td>
            <td>${escapeHtml(supplier.email || '-')}</td>
            <td>${escapeHtml(supplier.address || '-')}</td>
            <td>${new Date(supplier.created_at).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="editSupplier(${supplier.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-success" onclick="viewHistory(${supplier.id})">
                    <i class="fas fa-history"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="showDeleteModal(${supplier.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function editSupplier(id) {
    API.suppliers.getOne(id).then(supplier => {
        document.getElementById('supplierId').value = supplier.id;
        document.getElementById('supplierName').value = supplier.supplier_name;
        document.getElementById('phone').value = supplier.phone || '';
        document.getElementById('email').value = supplier.email || '';
        document.getElementById('address').value = supplier.address || '';
        
        document.getElementById('modalTitle').textContent = 'Edit Supplier';
        
        new bootstrap.Modal(document.getElementById('supplierModal')).show();
    }).catch(error => {
        showToast('Failed to load supplier details', 'error');
    });
}

function showDeleteModal(id) {
    deleteId = id;
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

async function confirmDelete() {
    if (!deleteId) return;
    
    try {
        await API.suppliers.delete(deleteId);
        showToast('Supplier deleted successfully', 'success');
        bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
        loadSuppliers();
    } catch (error) {
        showToast(error.message || 'Failed to delete supplier', 'error');
    } finally {
        deleteId = null;
    }
}

async function viewHistory(id) {
    currentSupplierId = id;
    
    try {
        const history = await API.suppliers.getHistory(id);
        displayPurchaseHistory(history);
        new bootstrap.Modal(document.getElementById('historyModal')).show();
    } catch (error) {
        showToast('Failed to load purchase history', 'error');
    }
}

function displayPurchaseHistory(history) {
    const tbody = document.getElementById('historyTableBody');
    
    if (!history || history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No purchase history found</td></tr>';
        return;
    }
    
    tbody.innerHTML = history.map(item => `
        <tr>
            <td>${new Date(item.purchase_date).toLocaleDateString()}</td>
            <td>${escapeHtml(item.product_name)}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.total_amount)}</td>
            <td>${formatCurrency(item.amount_paid)}</td>
            <td>${formatCurrency(item.balance)}</td>
            <td>
                <span class="badge bg-${getPaymentStatusColor(item.payment_status)}">
                    ${item.payment_status}
                </span>
            </td>
        </tr>
    `).join('');
}

function saveSupplier() {
    const supplierId = document.getElementById('supplierId').value;
    const supplierData = {
        supplier_name: document.getElementById('supplierName').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        address: document.getElementById('address').value
    };
    
    // Validate
    if (!supplierData.supplier_name) {
        showToast('Supplier name is required', 'warning');
        return;
    }
    
    const promise = supplierId 
        ? API.suppliers.update(supplierId, supplierData)
        : API.suppliers.create(supplierData);
    
    promise.then(() => {
        showToast(`Supplier ${supplierId ? 'updated' : 'created'} successfully`, 'success');
        bootstrap.Modal.getInstance(document.getElementById('supplierModal')).hide();
        resetSupplierForm();
        loadSuppliers();
    }).catch(error => {
        showToast(error.message || `Failed to ${supplierId ? 'update' : 'create'} supplier`, 'error');
    });
}

function resetSupplierForm() {
    document.getElementById('supplierId').value = '';
    document.getElementById('supplierForm').reset();
    document.getElementById('modalTitle').textContent = 'Add New Supplier';
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