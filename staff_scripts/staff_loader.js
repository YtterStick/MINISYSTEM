document.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll('.nav-link[data-section]');
    const mainContent = document.getElementById('content-id');
    const dropdownLinks = document.querySelectorAll('.nav-link[onclick="toggleDropdown(event)"]');

    // Add event listeners for dropdown links
    dropdownLinks.forEach(link => {
        link.addEventListener('click', toggleDropdown);
    });

    // Toggle dropdowns for sidebar
    function toggleDropdown(event) {
        event.preventDefault();
        const parentItem = event.currentTarget.parentElement;
        parentItem.classList.toggle("open");
    }

    // Load content dynamically
    function loadContent(section) {
        const contentFile = `/staff_pages/${section}.html`;

        fetch(contentFile)
            .then(response => {
                if (!response.ok) throw new Error('Content not found');
                return response.text();
            })
            .then(data => {
                mainContent.innerHTML = data; // Update the main content
                setActiveLink(section); // Highlight active link

                // Initialize specific page logic
                if (section === "create-sales-order") {
                    initializeCreateSalesOrder();
                }
            })
            .catch(error => {
                console.error(error);
                mainContent.innerHTML = `<p>Error loading content: ${error.message}</p>`;
            });
    }

    // Highlight active link
    function setActiveLink(activeSection) {
        links.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === activeSection) {
                link.classList.add('active');
            }
        });
    }

    // Add event listeners for sidebar navigation
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            if (section) loadContent(section);
        });
    });

    // Initialize Create Sales Order logic
    function initializeCreateSalesOrder() {
        const form = document.getElementById("sales-order-form");

        // Handle form submission
        form.addEventListener("submit", (e) => {
            e.preventDefault();

            // Fetch user ID from localStorage
            const userId = localStorage.getItem("userId");
            if (!userId) {
                alert("User not authenticated. Please log in again.");
                return;
            }

            // Prepare form data
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            // Add userId to data
            data.userId = userId;

            // Send data to the backend
            fetch("/api/sales-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })
                .then((res) => {
                    if (!res.ok) throw new Error("Failed to save transaction.");
                    return res.json();
                })
                .then((result) => {
                    alert(result.message); // Show success message
                })
                .catch((err) => console.error(err));
        });

        // Handle Save Transaction button
        document.getElementById("save-transaction").addEventListener("click", () => {
            alert("Transaction saved as unpaid.");
        });
    }

    // Load default section on page load
    loadContent('dashboard');
});
