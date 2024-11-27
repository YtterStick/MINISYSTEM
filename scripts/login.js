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
            console.log(result); // Check result

            if (result.userId && result.role && result.branch_id) {
                sessionStorage.setItem("userId", result.userId);
                sessionStorage.setItem("role", result.role);
                sessionStorage.setItem("branch_id", result.branch_id);

                if (result.role === "Admin") {
                    window.location.href = "/main/index.html";
                } else if (result.role === "Staff") {
                    window.location.href = "/main/staff.html";
                }
            } else {
                throw new Error("Invalid response data.");
            }
        })
        .catch((err) => {
            alert(err.message);
            console.error(err);
        });
    });
});
