let deleteId = null;
let currentSupplierId = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('Suppliers page loaded');
    loadSuppliers();
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            loadSuppliers();
        }, 500));
    }
});

async function loadSuppliers() {
    try {
        console.log('Loading suppliers...');
        
        const tbody = document.getElementById('suppliersTableBody');
        if (!tbody) {
            console.error('Suppliers table body not found');
            return;
        }
        
        // Show loading state
        tbody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="spinner"></div> Loading suppliers...</td></tr>';
        
        const suppliers = await API.suppliers.getAll();
        console.log('Suppliers loaded:', suppliers);
        
        const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
        
        // Filter locally if search term exists
        const filteredSuppliers = search ? suppliers.filter(s => 
            (s.supplier_name && s.supplier_name.toLowerCase().includes(search)) ||
            (s.email && s.email.toLowerCase().includes(search)) ||
            (s.phone && s.phone.includes(search))
        ) : suppliers;
        
        displaySuppliers(filteredSuppliers);
        
    } catch (error) {
        console.error('Failed to load suppliers:', error);
        const tbody = document.getElementById('suppliersTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load suppliers</td></tr>';
        }
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
            <td><strong>${escapeHtml(supplier.supplier_name || 'N/A')}</strong></td>
            <td>${escapeHtml(supplier.phone || '-')}</td>
            <td>${escapeHtml(supplier.email || '-')}</td>
            <td>${escapeHtml(supplier.address || '-')}</td>
            <td>${supplier.created_at ? new Date(supplier.created_at).toLocaleDateString() : '-'}</td>
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
    console.log('Editing supplier:', id);
    
    API.suppliers.getOne(id).then(supplier => {
        console.log('Supplier data:', supplier);
        
        document.getElementById('supplierId').value = supplier.id || '';
        document.getElementById('supplierName').value = supplier.supplier_name || '';
        document.getElementById('phone').value = supplier.phone || '';
        document.getElementById('email').value = supplier.email || '';
        document.getElementById('address').value = supplier.address || '';
        
        document.getElementById('modalTitle').textContent = 'Edit Supplier';
        
        new bootstrap.Modal(document.getElementById('supplierModal')).show();
    }).catch(error => {
        console.error('Failed to load supplier details:', error);
        showToast('Failed to load supplier details', 'error');
    });
}

function showDeleteModal(id) {
    deleteId = id;
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

// Delete supplier function
async function confirmDelete() {
    if (!deleteId) {
        Toast.warning('No supplier selected', 'Warning');
        return;
    }
    
    Toast.confirm({
        title: 'Delete Supplier',
        message: 'Are you sure you want to delete this supplier? This action cannot be undone.',
        type: 'warning',
        confirmText: 'Yes, delete it',
        onConfirm: async () => {
            const loader = Toast.loading('Deleting supplier...');
            try {
                await API.suppliers.delete(deleteId);
                loader.success('Supplier deleted successfully!');
                
                bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
                await loadSuppliers();
                
            } catch (error) {
                console.error('Delete error:', error);
                loader.error(error.message || 'Failed to delete supplier');
            } finally {
                deleteId = null;
            }
        },
        onCancel: () => {
            Toast.info('Delete cancelled', 'Supplier not deleted');
        }
    });
}

async function viewHistory(id) {
    currentSupplierId = id;
    console.log('Viewing history for supplier:', id);
    
    try {
        const history = await API.suppliers.getHistory(id);
        console.log('Purchase history:', history);
        
        displayPurchaseHistory(history);
        new bootstrap.Modal(document.getElementById('historyModal')).show();
    } catch (error) {
        console.error('Failed to load purchase history:', error);
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
            <td>${item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : '-'}</td>
            <td>${escapeHtml(item.product_name || 'N/A')}</td>
            <td>${item.quantity || 0}</td>
            <td>${formatCurrency(item.total_amount || 0)}</td>
            <td>${formatCurrency(item.amount_paid || 0)}</td>
            <td class="${item.balance > 0 ? 'text-danger fw-bold' : ''}">${formatCurrency(item.balance || 0)}</td>
            <td>
                <span class="badge bg-${getPaymentStatusColor(item.payment_status)}">
                    ${item.payment_status || 'Unknown'}
                </span>
            </td>
        </tr>
    `).join('');
}

// Save supplier function
async function saveSupplier() {
    const supplierId = document.getElementById('supplierId').value;
    const supplierData = {
        supplier_name: document.getElementById('supplierName').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        address: document.getElementById('address').value
    };
    
    // Validate
    if (!supplierData.supplier_name) {
        Toast.warning('Supplier name is required', 'Missing Information');
        return;
    }
    
    // Validate email if provided
    if (supplierData.email && !isValidEmail(supplierData.email)) {
        Toast.warning('Please enter a valid email address', 'Invalid Email');
        return;
    }
    
    // Show loading toast
    const loader = Toast.loading(supplierId ? 'Updating supplier...' : 'Creating supplier...');
    
    try {
        let response;
        if (supplierId) {
            response = await API.suppliers.update(supplierId, supplierData);
            loader.success('Supplier updated successfully!');
        } else {
            response = await API.suppliers.create(supplierData);
            loader.success('Supplier created successfully!');
        }
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('supplierModal')).hide();
        
        // Reset form
        resetSupplierForm();
        
        // Refresh the list
        await loadSuppliers();
        
    } catch (error) {
        console.error('Save error:', error);
        loader.error(error.message || `Failed to ${supplierId ? 'update' : 'create'} supplier`);
    }
}

function resetSupplierForm() {
    document.getElementById('supplierId').value = '';
    document.getElementById('supplierForm').reset();
    document.getElementById('modalTitle').textContent = 'Add New Supplier';
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
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
        'style': 'currency',
        'currency': 'TZS',
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

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}