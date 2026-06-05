// Check authentication on page load
document.addEventListener("DOMContentLoaded", async () => {
  // Skip auth check for login and signup pages
  if (
    window.location.pathname.includes("login.html") ||
    window.location.pathname.includes("signup.html")
  ) {
    return;
  }

  try {
    const data = await API.auth.checkAuth();

    if (!data.authenticated) {
      window.location.href = "login.html";
    } else {
      // Try to get from session first, then localStorage
      let username = data.user?.username;

      if (!username) {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          username = userData.username || userData.fullName || "User";
        } else {
          username = "User";
        }
      }

      // Update username display on all pages
      const usernameDisplay = document.getElementById("usernameDisplay");
      if (usernameDisplay) {
        usernameDisplay.textContent = username;
      }
    }
  } catch (error) {
    console.error("Auth check failed:", error);
    window.location.href = "login.html";
  }
});

// Login form handler
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if (!username || !password) {
      Toast.warning(
        "Please enter both username and password",
        "Missing Information",
      );
      return;
    }

    const loader = Toast.loading("Logging in...", "Please wait");

    try {
      const data = await API.auth.login({ username, password });

      // Store user info in localStorage
      localStorage.setItem("user", JSON.stringify(data.user));

      loader.success("Login successful! Redirecting...");

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1500);
    } catch (error) {
      console.error("Login error:", error);
      loader.error(
        error.message || "Login failed. Please check your credentials.",
      );
    }
  });
}

// Logout function
async function logout() {
  Toast.confirm({
    title: "Logout",
    message: "Are you sure you want to logout?",
    type: "info",
    confirmText: "Yes, logout",
    onConfirm: async () => {
      const loader = Toast.loading("Logging out...");
      try {
        await API.auth.logout();
        loader.success("Logged out successfully");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 1500);
      } catch (error) {
        loader.error("Logout failed");
      }
    },
    onCancel: () => {
      Toast.info("Logout cancelled", "Stay logged in");
    },
  });
}

// Toast notification function
function showToast(message, type = "info", title = "") {
  Toast.show(message, type, title);
}

function showSuccess(message, title = "Success") {
  Toast.success(message, title);
}

function showError(message, title = "Error") {
  Toast.error(message, title);
}

function showWarning(message, title = "Warning") {
  Toast.warning(message, title);
}

function showInfo(message, title = "Information") {
  Toast.info(message, title);
}

function showConfirmation(options) {
  Toast.confirm(options);
}

// Sidebar toggle function
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const mainContent = document.getElementById("mainContent");

  sidebar.classList.toggle("collapsed");
  mainContent.classList.toggle("expanded");
}

// frontend/js/auth.js - Add these sidebar functions

// Desktop sidebar toggle (collapsing)
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const mainContent = document.getElementById("mainContent");

  sidebar.classList.toggle("collapsed");
  mainContent.classList.toggle("expanded");
}

// Mobile sidebar toggle
function toggleMobileSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  sidebar.classList.add("mobile-open");
  overlay.classList.add("active");
  document.body.style.overflow = "hidden"; // Prevent scrolling when sidebar is open
}

// Close mobile sidebar
function closeMobileSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  sidebar.classList.remove("mobile-open");
  overlay.classList.remove("active");
  document.body.style.overflow = ""; // Restore scrolling
}

// Handle window resize
window.addEventListener("resize", function () {
  const width = window.innerWidth;

  if (width > 1024) {
    // On desktop, ensure mobile sidebar is closed
    closeMobileSidebar();

    // Reset sidebar state based on localStorage preference
    const sidebarCollapsed =
      localStorage.getItem("sidebarCollapsed") === "true";
    const sidebar = document.getElementById("sidebar");
    const mainContent = document.getElementById("mainContent");

    if (sidebarCollapsed) {
      sidebar.classList.add("collapsed");
      mainContent.classList.add("expanded");
    } else {
      sidebar.classList.remove("collapsed");
      mainContent.classList.remove("expanded");
    }
  } else {
    // On mobile, ensure sidebar is not in collapsed state
    const sidebar = document.getElementById("sidebar");
    const mainContent = document.getElementById("mainContent");
    sidebar.classList.remove("collapsed");
    mainContent.classList.remove("expanded");
  }
});

// Save sidebar state when toggling on desktop
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const mainContent = document.getElementById("mainContent");

  sidebar.classList.toggle("collapsed");
  mainContent.classList.toggle("expanded");

  // Save state for desktop
  const isCollapsed = sidebar.classList.contains("collapsed");
  localStorage.setItem("sidebarCollapsed", isCollapsed);
}

// Initialize responsive behavior on page load
document.addEventListener("DOMContentLoaded", function () {
  const width = window.innerWidth;

  if (width > 1024) {
    // Desktop: restore sidebar state
    const sidebarCollapsed =
      localStorage.getItem("sidebarCollapsed") === "true";
    const sidebar = document.getElementById("sidebar");
    const mainContent = document.getElementById("mainContent");

    if (sidebarCollapsed) {
      sidebar.classList.add("collapsed");
      mainContent.classList.add("expanded");
    }
  } else {
    // Mobile: ensure sidebar is hidden initially
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.remove("collapsed", "mobile-open");
  }
});
