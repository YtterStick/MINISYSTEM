document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
  
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault(); // Prevent default form submission
  
      const formData = new FormData(loginForm);
      const data = Object.fromEntries(formData.entries());
  
      try {
        const response = await fetch("/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
  
        if (response.ok) {
          const redirectUrl = await response.text(); // Get the redirect URL from backend
          window.location.href = redirectUrl; // Redirect to the appropriate page
        } else {
          const errorMessage = await response.text();
          alert(`Login failed: ${errorMessage}`); // Show error for invalid login
        }
      } catch (error) {
        console.error("Error:", error);
        alert("An unexpected error occurred. Please try again.");
      }
    });
  });
  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message; // Set the message dynamically
    toast.classList.add("show"); // Show the toast
    toast.classList.remove("hidden");
  
    // Hide the toast after 3 seconds
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }
  
  // Example usage in your login validation
  document.getElementById("login-form").addEventListener("submit", function (e) {
    e.preventDefault(); // Prevent actual form submission
  
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
  
    const correctPassword = "123456"; // Example correct password
  
    if (password !== correctPassword) {
      showToast("Incorrect password. Please try again.");
    } else {
      // Redirect to the dashboard or perform a successful login action
      window.location.href = "dashboard.html"; // Example redirection
    }
  });
  