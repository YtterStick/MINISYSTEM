document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");

  loginForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const formData = new FormData(loginForm);
      const data = Object.fromEntries(formData.entries());

      fetch("/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
      })
          .then((res) => {
              if (!res.ok) throw new Error("Login failed. Please check your username and password.");
              return res.json();
          })
          .then((result) => {
              // Save user information in localStorage
              localStorage.setItem("userId", result.userId);
              localStorage.setItem("role", result.role);

              // Redirect based on role
              if (result.role === "Admin") {
                  window.location.href = "/main/index.html";
              } else if (result.role === "Staff") {
                  window.location.href = "/main/staff.html";
              }
          })
          .catch((err) => {
              alert(err.message); // Show error to the user
              console.error(err);
          });
  });
});
