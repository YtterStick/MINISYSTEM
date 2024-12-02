document.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll('.nav-link[data-section]');
    const mainContent = document.getElementById('main-content-id');
    const dropdownLinks = document.querySelectorAll('.nav-link[onclick="toggleDropdown(event)"]');

    const logoutBtn = document.getElementById("logout-btn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            window.location.href = "/api/users/logout"; // Navigates to the logout route
        });
    }

    
    dropdownLinks.forEach(link => {
        link.addEventListener('click', toggleDropdown);
    });

    function toggleDropdown(event) {
        event.preventDefault();
        const parentItem = event.currentTarget.parentElement;
        parentItem.classList.toggle("open");
    }

    function loadContent(section) {
        const contentFile = `/pages/${section}.html`;

        fetch(contentFile)
            .then(response => {
                if (!response.ok) throw new Error('Content not found');
                return response.text();
            })
            .then(data => {
                mainContent.innerHTML = data;
                setActiveLink(section);

                if (section === 'overall-sales') {
                    initializeServiceSalesChart();
                    initializeMonthlySalesTrendChart();
                } else if (section === 'dashboard') {
                    initializeDashboardChart();
                } else if (section === 'create-account') {
                    attachCreateAccountFormHandler();
                } else if (section === 'existing-account') {
                    fetchExistingAccounts();
                } else if (section === 'sales-orders') {
                    loadSalesOrders();
                }
            })
            .catch(error => {
                console.error(error);
                mainContent.innerHTML = `<p>Error loading content: ${error.message}</p>`;
            });
    }

    function setActiveLink(activeSection) {
        links.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === activeSection) {
                link.classList.add('active');
            }
        });
    }

    function fetchExistingAccounts() {
        const tableBody = document.querySelector("#accounts-table tbody");

        if (!tableBody) return;
        // Fetch branch_id from localStorage
        const branchId = localStorage.getItem("branch_id");

        console.log("Fetching accounts for branch_id:", branchId); // Debugging
        fetch(`/api/accounts?branch_id=${branchId}`)
            .then(response => response.json())
            .then(accounts => {

            console.log("Accounts fetched:", accounts);
                tableBody.innerHTML = "";
                if (!accounts.length) {
                    console.warn("No accounts found for the given branch.");
                    tableBody.innerHTML = "<tr><td colspan='4'>No accounts found for this branch.</td></tr>";
                    return;
                }
    
                accounts.forEach(account => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${account.username}</td>
                        <td>${account.role}</td>
                        <td>${account.branch_name || "N/A"}</td>
                        <td>
                            <button class="btn-update" data-id="${account.id}">Update</button>
                            <button class="btn-delete" data-id="${account.id}">Delete</button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
            })
            .catch(error => {
                console.error("Error fetching accounts:", error);
                tableBody.innerHTML = "<tr><td colspan='4'>Error loading accounts.</td></tr>";
            });
    }


    function attachCreateAccountFormHandler() {
        const form = document.getElementById('account-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());

                const branchId = document.getElementById('branch_id').value;
                data.branch = branchId;
                console.log(branchId);
                console.log("Form Data with branch:", data.branch);
                try {
                    const response = await fetch('/create-account', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                    });

                    if (response.ok) {
                        alert('Account created successfully!');
                        e.target.reset();
                    } else {
                        const errorMessage = await response.text();
                        alert(`Failed to create account: ${errorMessage}`);
                    }
                } catch (error) {
                    alert('An unexpected error occurred. Please try again.');
                    console.error(error);
                }
            });
        }
    }
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            if (section) loadContent(section);
        });
    });

    loadContent('dashboard');
});
