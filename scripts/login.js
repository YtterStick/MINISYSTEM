document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
  
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
          const redirectUrl = await response.text();
          window.location.href = redirectUrl;
        } else {
          const errorMessage = await response.text();
          alert(`Login failed: ${errorMessage}`);
        }
      } catch (error) {
        console.error("Error:", error);
        alert("An unexpected error occurred. Please try again.");
      }
    });
  });
  