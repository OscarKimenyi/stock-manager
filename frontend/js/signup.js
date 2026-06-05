// frontend/js/signup.js
let currentStep = 1;
let usernameTimeout;
let isUsernameAvailable = false;

function updateStepIndicator() {
  for (let i = 1; i <= 2; i++) {
    const step = document.getElementById(`step${i}`);
    const circle = step.querySelector(".step-circle");

    if (i < currentStep) {
      step.classList.add("completed");
      step.classList.remove("active");
      circle.innerHTML = '<i class="fas fa-check"></i>';
    } else if (i === currentStep) {
      step.classList.add("active");
      step.classList.remove("completed");
      circle.innerHTML = i;
    } else {
      step.classList.remove("active", "completed");
      circle.innerHTML = i;
    }
  }

  // Update step line (now only 1 line between 2 steps)
  const stepLine = document.getElementById("stepLine");
  const width = ((currentStep - 1) / 1) * 100;
  stepLine.style.width = width + "%";
  stepLine.classList.add("active");
}

function nextStep() {
  if (currentStep === 1 && validateStep1()) {
    currentStep = 2;
    showStep(currentStep);
  }
}

function prevStep() {
  if (currentStep > 1) {
    currentStep--;
    showStep(currentStep);
  }
}

function showStep(step) {
  // Hide all steps
  document.getElementById("step1Form").style.display = "none";
  document.getElementById("step2Form").style.display = "none";

  // Show current step
  document.getElementById(`step${step}Form`).style.display = "block";

  updateStepIndicator();
}

function validateStep1() {
  const companyName = document.getElementById("company_name").value.trim();

  if (!companyName) {
    Toast.warning("Please enter your company name", "Required Field");
    return false;
  }

  return true;
}

// Check username availability
async function checkUsernameAvailability() {
  const username = document.getElementById("username").value.trim();
  const usernameInput = document.getElementById("username");
  const feedback = document.getElementById("usernameFeedback");

  if (!username || username.length < 3) {
    usernameInput.classList.remove("is-valid", "is-invalid");
    isUsernameAvailable = false;
    return;
  }

  try {
    const response = await fetch(
      `/api/auth/check-username?username=${encodeURIComponent(username)}`,
    );
    const data = await response.json();

    if (data.available) {
      usernameInput.classList.add("is-valid");
      usernameInput.classList.remove("is-invalid");
      feedback.textContent = "Username is available";
      feedback.className = "valid-feedback";
      isUsernameAvailable = true;
    } else {
      usernameInput.classList.add("is-invalid");
      usernameInput.classList.remove("is-valid");
      feedback.textContent =
        "Username is already taken. Please choose another.";
      feedback.className = "invalid-feedback";
      isUsernameAvailable = false;
    }
  } catch (error) {
    console.error("Username check error:", error);
  }
}

function validateStep2() {
  const fullName = document.getElementById("full_name").value.trim();
  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("admin_email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm_password").value;

  if (!fullName) {
    Toast.warning("Please enter your full name", "Required Field");
    return false;
  }

  if (!username) {
    Toast.warning("Please enter a username", "Required Field");
    return false;
  }

  if (username.length < 3) {
    Toast.warning("Username must be at least 3 characters", "Invalid Username");
    return false;
  }

  if (!isUsernameAvailable) {
    Toast.warning(
      "Please choose a different username",
      "Username Not Available",
    );
    return false;
  }

  if (!email) {
    Toast.warning("Please enter your email address", "Required Field");
    return false;
  }

  if (!isValidEmail(email)) {
    Toast.warning("Please enter a valid email address", "Invalid Email");
    return false;
  }

  if (!password || password.length < 6) {
    Toast.warning("Password must be at least 6 characters", "Invalid Password");
    return false;
  }

  if (password !== confirmPassword) {
    Toast.warning("Passwords do not match", "Validation Error");
    return false;
  }

  return true;
}

async function registerCompany() {
  const companyData = {
    company_name: document.getElementById("company_name").value.trim(),
    business_type: document.getElementById("business_type").value,
    phone: document.getElementById("company_phone").value,
    email: document.getElementById("company_email").value,
    address: document.getElementById("company_address").value,
  };

  const adminData = {
    full_name: document.getElementById("full_name").value.trim(),
    username: document.getElementById("username").value.trim(),
    email: document.getElementById("admin_email").value.trim(),
    phone: document.getElementById("admin_phone").value,
    password: document.getElementById("password").value,
  };

  const loader = Toast.loading("Creating your account...", "Please wait");

  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        company: companyData,
        admin: adminData,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Registration failed");
    }

    loader.success("Account created successfully! Redirecting to login...");

    setTimeout(() => {
      window.location.href = "login.html";
    }, 2000);
  } catch (error) {
    console.error("Registration error:", error);
    loader.error(error.message);
  }
}

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  updateStepIndicator();

  // Add username availability check
  const usernameInput = document.getElementById("username");
  if (usernameInput) {
    usernameInput.addEventListener("input", function () {
      clearTimeout(usernameTimeout);
      usernameTimeout = setTimeout(checkUsernameAvailability, 500);
    });
  }
});
