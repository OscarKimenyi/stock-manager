const Toast = {
    // Show a toast notification
    show(message, type = 'info', title = '', duration = 5000) {
        const container = document.getElementById('toastContainer');
        if (!container) {
            console.error('Toast container not found');
            return null;
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Set icon based on type
        let icon = 'info-circle';
        let defaultTitle = 'Notification';
        
        switch(type) {
            case 'success':
                icon = 'check-circle';
                defaultTitle = 'Success';
                break;
            case 'error':
                icon = 'exclamation-circle';
                defaultTitle = 'Error';
                break;
            case 'warning':
                icon = 'exclamation-triangle';
                defaultTitle = 'Warning';
                break;
            case 'loading':
                icon = 'spinner fa-pulse';
                defaultTitle = 'Processing';
                break;
            default:
                icon = 'info-circle';
                defaultTitle = 'Information';
        }

        // Set toast content
        toast.innerHTML = `
            <i class="fas fa-${icon} fa-lg"></i>
            <div class="toast-content">
                <div class="toast-title">${title || defaultTitle}</div>
                <div class="toast-message">${message}</div>
            </div>
            <span class="toast-close" onclick="this.closest('.toast').remove()">
                <i class="fas fa-times"></i>
            </span>
        `;

        // Add to container
        container.appendChild(toast);

        // Auto remove after duration (only if not loading)
        if (type !== 'loading') {
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, duration);
        }

        return toast;
    },

    // Quick success toast
    success(message, title = 'Success') {
        this.show(message, 'success', title);
    },

    // Quick error toast
    error(message, title = 'Error') {
        this.show(message, 'error', title);
    },

    // Quick warning toast
    warning(message, title = 'Warning') {
        this.show(message, 'warning', title);
    },

    // Quick info toast
    info(message, title = 'Information') {
        this.show(message, 'info', title);
    },

    // Loading toast (returns function to update/close)
    loading(message, title = 'Processing') {
        const container = document.getElementById('toastContainer');
        if (!container) {
            console.error('Toast container not found');
            return {
                success: (msg) => console.log('Success:', msg),
                error: (msg) => console.error('Error:', msg)
            };
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast loading`;
        
        toast.innerHTML = `
            <i class="fas fa-spinner fa-pulse fa-lg"></i>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <span class="toast-close" onclick="this.closest('.toast').remove()">
                <i class="fas fa-times"></i>
            </span>
        `;

        // Add to container
        container.appendChild(toast);

        // Return control object
        return {
            success: (successMessage) => {
                // Remove loading toast
                toast.remove();
                // Show success toast
                Toast.show(successMessage || 'Operation completed successfully', 'success', 'Success');
            },
            error: (errorMessage) => {
                // Remove loading toast
                toast.remove();
                // Show error toast
                Toast.show(errorMessage || 'Operation failed', 'error', 'Error');
            },
            update: (newMessage) => {
                // Update the message of the loading toast
                const messageEl = toast.querySelector('.toast-message');
                if (messageEl) {
                    messageEl.textContent = newMessage;
                }
            },
            dismiss: () => {
                // Just remove the loading toast
                toast.remove();
            }
        };
    },

    // Confirmation dialog
    confirm(options) {
        const {
            title = 'Confirm Action',
            message = 'Are you sure you want to proceed?',
            confirmText = 'Yes, proceed',
            cancelText = 'Cancel',
            type = 'warning',
            onConfirm,
            onCancel
        } = options;

        // Create modal element
        const modalId = 'confirmModal_' + Date.now();
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = modalId;
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-body modal-confirm ${type}">
                        <i class="fas fa-${type === 'warning' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'} fa-4x"></i>
                        <h4>${title}</h4>
                        <p>${message}</p>
                        <div class="d-flex gap-2 justify-content-center">
                            <button class="btn btn-light" data-bs-dismiss="modal">${cancelText}</button>
                            <button class="btn btn-${type === 'warning' ? 'danger' : type === 'success' ? 'success' : 'primary'}" id="confirmBtn">${confirmText}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Initialize modal
        const bsModal = new bootstrap.Modal(modal);
        
        // Handle confirm
        document.getElementById('confirmBtn').onclick = () => {
            bsModal.hide();
            if (onConfirm) onConfirm();
        };

        // Handle cancel
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
            if (onCancel) onCancel();
        });

        bsModal.show();
    }
};

// Make Toast globally available
window.Toast = Toast;