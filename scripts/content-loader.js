document.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll('.nav-link[data-section]');
    const mainContent = document.getElementById('main-content-id');
    const dropdownLinks = document.querySelectorAll('.nav-link[onclick="toggleDropdown(event)"]');

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

        const branchId = localStorage.getItem("branch_id");

        fetch(`/api/accounts?branch_id=${branchId}`)
            .then(response => response.json())
            .then(accounts => {
                tableBody.innerHTML = "";

                accounts.forEach(account => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${account.username}</td>
                        <td>${account.role}</td>
                        <td>${account.branch || "N/A"}</td>
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

    // // Load sales orders for the current branch
    // function loadSalesOrders() {
    //     const branchId = localStorage.getItem("branch_id");

    //     fetch(`/api/sales-order/unpaid?branch_id=${branchId}`)
    //         .then(response => response.json())
    //         .then(data => {
    //             if (data.success) {
    //                 const ordersTableBody = document.querySelector("#sales-orders-body");
    //                 ordersTableBody.innerHTML = "";  // Clear any previous orders

    //                 data.orders.forEach(order => {
    //                     const row = document.createElement("tr");
    //                     row.innerHTML = `
    //                         <td>${order.customer_name}</td>
    //                         <td>${order.services}</td>
    //                         <td>${order.number_of_loads}</td>
    //                         <td>${order.detergent_count}</td>
    //                         <td>${order.fabric_softener_count}</td>
    //                         <td>PHP ${order.total_cost}</td>
    //                         <td>
    //                             <button class="btn-mark-paid" data-id="${order.id}">Mark as Paid</button>
    //                         </td>
    //                     `;
    //                     ordersTableBody.appendChild(row);
    //                 });

    //                 // Attach event listeners for "Mark as Paid" buttons
    //                 const processButtons = document.querySelectorAll(".btn-mark-paid");
    //                 processButtons.forEach(button => {
    //                     button.addEventListener('click', (e) => {
    //                         const orderId = e.target.getAttribute('data-id');
    //                         markOrderAsPaid(orderId);
    //                     });
    //                 });
    //             }
    //         })
    //         .catch(error => {
    //             console.error("Error fetching sales orders:", error);
    //         });
    // }

    // // Function to mark order as paid
    // function markOrderAsPaid(orderId) {
    //     fetch(`/api/sales-order/mark-paid/${orderId}`, {
    //         method: "POST"
    //     })
    //     .then(res => res.json())
    //     .then(data => {
    //         if (data.success) {
    //             alert(data.message);
    //             loadSalesOrders(); // Refresh the orders list
    //         } else {
    //             alert("Failed to mark order as paid.");
    //         }
    //     })
    //     .catch(err => {
    //         console.error("Error marking order as paid:", err);
    //     });
    // }

    // Load the initial content (e.g., dashboard) after page loads
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            if (section) loadContent(section);
        });
    });

    loadContent('dashboard');
});
