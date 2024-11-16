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
  