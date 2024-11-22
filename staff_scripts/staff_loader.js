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
                } else if (section === 'order-process'){
                    initializeSalesProcess();
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

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Add userId from localStorage
        data.userId = localStorage.getItem("userId");

        fetch("/api/sales-order/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        })
            .then((res) => res.json())
            .then((result) => {
                if (result.success) {
                    alert(result.message);

                    // Show receipt link if available
                    if (result.receipt) {
                        window.open(result.receipt, "_blank");
                    }
                } else {
                    alert("Error: " + result.message);
                }
            })
            .catch((err) => console.error("Error processing transaction:", err));
    });
    }
    function initializeSalesProcess(){
        const unpaidOrdersTable = document.getElementById("unpaid-orders-body");

    // Fetch unpaid transactions
    fetch("/api/sales-order/unpaid")
        .then((res) => res.json())
        .then((data) => {
            if (data.success) {
                const transactions = data.transactions;
                transactions.forEach((transaction) => {
                    const row = document.createElement("tr");

                    row.innerHTML = `
                        <td>${transaction.customer_name}</td>
                        <td>${transaction.services}</td>
                        <td>${transaction.number_of_loads}</td>
                        <td>${transaction.detergent_count}</td>
                        <td>${transaction.fabric_softener_count}</td>
                        <td>PHP ${transaction.total_cost}</td>
                        <td>
                            <button class="process-btn" data-id="${transaction.id}">Mark as Paid</button>
                        </td>
                    `;

                    unpaidOrdersTable.appendChild(row);
                });

                // Add event listeners to the "Mark as Paid" buttons
                const processButtons = document.querySelectorAll(".process-btn");
                processButtons.forEach((button) => {
                    button.addEventListener("click", (e) => {
                        const orderId = e.target.getAttribute("data-id");
                        markAsPaid(orderId);
                    });
                });
            }
        })
        .catch((err) => {
            console.error("Error fetching unpaid transactions:", err);
        });
    }

    function markAsPaid(orderId) {
        fetch(`/api/sales-order/mark-paid/${orderId}`, {
            method: "POST",
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    alert(data.message);
                    window.location.reload(); // Refresh to show updated list
                } else {
                    alert("Failed to process the transaction.");
                }
            })
            .catch((err) => {
                console.error("Error marking order as paid:", err);
                alert("Error marking order as paid.");
            });
    }
    // Load default section on page load
    loadContent('dashboard');
});
