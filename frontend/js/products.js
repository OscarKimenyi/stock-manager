let currentPage = 1;
let deleteId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', debounce(() => {
        currentPage = 1;
        loadProducts();
    }, 500));
});

async function loadProducts() {
    try {
        const search = document.getElementById('searchInput').value;
        const data = await API.products.getAll(currentPage, search);
        
        displayProducts(data.products);
        setupPagination(data.pagination);
    } catch (error) {
        showToast('Failed to load products', 'error');
    }
}

function displayProducts(products) {
    const tbody = document.getElementById('productsTableBody');
    
    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No products found</td></tr>';
        return;
    }
    
    tbody.innerHTML = products.map(product => `
        <tr>
            <td><strong>${escapeHtml(product.product_code)}</strong></td>
            <td>${escapeHtml(product.product_name)}</td>
            <td>${escapeHtml(product.unit_type)}</td>
            <td class="${product.quantity <= product.minimum_stock_level ? 'text-danger fw-bold' : ''}">
                ${product.quantity}
            </td>
            <td>${product.minimum_stock_level}</td>
            <td>
                ${getStockStatusBadge(product.quantity, product.minimum_stock_level)}
            </td>
            <td>${new Date(product.created_at).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="editProduct(${product.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="showDeleteModal(${product.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function getStockStatusBadge(quantity, minLevel) {
    if (quantity <= 0) {
        return '<span class="badge bg-danger">Out of Stock</span>';
    } else if (quantity <= minLevel) {
        return '<span class="badge bg-warning">Low Stock</span>';
    } else {
        return '<span class="badge bg-success">In Stock</span>';
    }
}

function setupPagination(pagination) {
    const paginationEl = document.getElementById('pagination');
    if (!pagination || pagination.pages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `
        <li class="page-item ${pagination.page === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${pagination.page - 1})">Previous</a>
        </li>
    `;
    
    // Page numbers
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
    
    // Next button
    html += `
        <li class="page-item ${pagination.page === pagination.pages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${pagination.page + 1})">Next</a>
        </li>
    `;
    
    paginationEl.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    loadProducts();
}

function editProduct(id) {
    // Fetch product details and populate modal
    API.products.getOne(id).then(product => {
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.product_name;
        document.getElementById('productCode').value = product.product_code;
        document.getElementById('unitType').value = product.unit_type;
        document.getElementById('quantity').value = product.quantity;
        document.getElementById('minStockLevel').value = product.minimum_stock_level;
        
        document.getElementById('modalTitle').textContent = 'Edit Product';
        document.getElementById('productCode').readOnly = true; // Can't change product code
        
        new bootstrap.Modal(document.getElementById('productModal')).show();
    }).catch(error => {
        showToast('Failed to load product details', 'error');
    });
}

function showDeleteModal(id) {
    deleteId = id;
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

async function confirmDelete() {
    if (!deleteId) return;
    
    try {
        await API.products.delete(deleteId);
        showToast('Product deleted successfully', 'success');
        bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
        loadProducts();
    } catch (error) {
        showToast(error.message || 'Failed to delete product', 'error');
    } finally {
        deleteId = null;
    }
}

function saveProduct() {
    const productId = document.getElementById('productId').value;
    const productData = {
        product_name: document.getElementById('productName').value,
        product_code: document.getElementById('productCode').value,
        unit_type: document.getElementById('unitType').value,
        quantity: parseInt(document.getElementById('quantity').value) || 0,
        minimum_stock_level: parseInt(document.getElementById('minStockLevel').value) || 5
    };
    
    // Validate
    if (!productData.product_name || !productData.product_code || !productData.unit_type) {
        showToast('Please fill all required fields', 'warning');
        return;
    }
    
    const promise = productId 
        ? API.products.update(productId, productData)
        : API.products.create(productData);
    
    promise.then(() => {
        showToast(`Product ${productId ? 'updated' : 'created'} successfully`, 'success');
        bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
        resetProductForm();
        loadProducts();
    }).catch(error => {
        showToast(error.message || `Failed to ${productId ? 'update' : 'create'} product`, 'error');
    });
}

function resetProductForm() {
    document.getElementById('productId').value = '';
    document.getElementById('productForm').reset();
    document.getElementById('modalTitle').textContent = 'Add New Product';
    document.getElementById('productCode').readOnly = false;
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Debounce function for search
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