// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Skip auth check for login page
    if (window.location.pathname.includes('login.html')) {
        return;
    }

    try {
        const data = await API.auth.checkAuth();
        
        if (!data.authenticated) {
            window.location.href = 'login.html';
        } else {
            // Update username display
            const usernameDisplay = document.getElementById('usernameDisplay');
            if (usernameDisplay) {
                usernameDisplay.textContent = data.user.username;
            }
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = 'login.html';
    }
});

// Login form handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Simple validation
        if (!username || !password) {
            Toast.warning('Please enter both username and password', 'Missing Information');
            return;
        }
        
        // Show loading toast
        const loader = Toast.loading('Logging in...', 'Please wait');
        
        try {
            const data = await API.auth.login({ username, password });
            
            // Success - update loading toast to success
            loader.success('Login successful! Redirecting...');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } catch (error) {
            console.error('Login error:', error);
            // Show error toast
            loader.error(error.message || 'Login failed. Please check your credentials.');
        }
    });
}

// Logout function
async function logout() {
    Toast.confirm({
        title: 'Logout',
        message: 'Are you sure you want to logout?',
        type: 'info',
        confirmText: 'Yes, logout',
        onConfirm: async () => {
            const loader = Toast.loading('Logging out...');
            try {
                await API.auth.logout();
                loader.success('Logged out successfully');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            } catch (error) {
                loader.error('Logout failed');
            }
        },
        onCancel: () => {
            Toast.info('Logout cancelled', 'Stay logged in');
        }
    });
}

// Toast notification function
function showToast(message, type = 'info', title = '') {
    Toast.show(message, type, title);
}

function showSuccess(message, title = 'Success') {
    Toast.success(message, title);
}

function showError(message, title = 'Error') {
    Toast.error(message, title);
}

function showWarning(message, title = 'Warning') {
    Toast.warning(message, title);
}

function showInfo(message, title = 'Information') {
    Toast.info(message, title);
}

function showConfirmation(options) {
    Toast.confirm(options);
}

// Sidebar toggle function
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');
}