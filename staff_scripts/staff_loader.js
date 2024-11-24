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
                } else if (section === "order-process") {
                    initializeSalesProcess();
                } else if (section === "manage-distribution") {
                    initializeManageDistribution();
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
                .then((res) => {
                    if (!res.ok) throw new Error("Error processing transaction.");
                    return res.json();
                })
                .then((result) => {
                    if (result.success) {
                        alert(result.message);

                        // Show receipt in custom popup
                        if (result.receipt) {
                            showPrintPopup(result.receipt);
                        }

                        // Clear form for next transaction
                        form.reset();
                    } else {
                        alert("Error: " + result.message);
                    }
                })
                .catch((err) => console.error("Error processing transaction:", err));
        });
    }

    // Initialize Order Process logic
    function initializeSalesProcess() {
        const unpaidOrdersTable = document.getElementById("unpaid-orders-body");

        // Fetch unpaid transactions
        fetch("/api/sales-order/unpaid")
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch unpaid transactions.");
                return res.json();
            })
            .then((data) => {
                if (data.success) {
                    const transactions = data.transactions;

                    // Clear previous rows
                    unpaidOrdersTable.innerHTML = "";

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

    // Mark an order as paid and show the receipt popup
    function markAsPaid(orderId, rowElement) {
        fetch(`/api/sales-order/mark-paid/${orderId}`, {
            method: "POST",
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to mark order as paid.");
                return res.json();
            })
            .then((data) => {
                if (data.success) {
                    alert(data.message);
    
                    if (rowElement) rowElement.remove();
    
                    if (data.receipt) {
                        showPrintPopup(data.receipt);
                    }
                    //repres 
                    initializeSalesProcess();
                } else {
                    alert("Failed to process the transaction.");
                }
            })
            .catch((err) => {
                console.error("Error marking order as paid:", err);
                alert("Error marking order as paid.");
            });
    }
    
    // Initialize Manage Distribution logic
 // Initialize Manage Distribution logic
 function initializeManageDistribution() {
    const distributionOrdersTable = document.getElementById("distribution-orders-body");
    const dateFilter = document.getElementById("date-filter");
    const searchBar = document.getElementById("search-bar");

    function fetchAndDisplayTransactions() {
        const selectedDate = dateFilter.value;
        const searchName = searchBar.value.trim();

        fetch(`/api/sales-order/paid?date=${selectedDate}&name=${searchName}`)
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch paid transactions.");
                return res.json();
            })
            .then((data) => {
                if (data.success) {
                    const transactions = data.transactions;

                    // Clear previous rows
                    distributionOrdersTable.innerHTML = "";

                    transactions.forEach((transaction) => {
                        const row = document.createElement("tr");

                        row.innerHTML = `
                            <td>${transaction.customer_name}</td>
                            <td>${transaction.number_of_loads}</td>
                            <td>${new Date(transaction.created_at).toLocaleString()}</td>
                            <td>
                                <button class="mark-claimed-btn" data-id="${transaction.id}">Mark as Claimed</button>
                            </td>
                        `;

                        distributionOrdersTable.appendChild(row);
                    });

                    // Add event listeners to "Mark as Claimed" buttons
                    const claimButtons = document.querySelectorAll(".mark-claimed-btn");
                    claimButtons.forEach((button) => {
                        button.addEventListener("click", (e) => {
                            const orderId = e.target.getAttribute("data-id");
                            markAsClaimed(orderId, e.target.closest('tr')); // Pass the row to remove it
                        });
                    });
                } else {
                    distributionOrdersTable.innerHTML = `<tr><td colspan="4">No results found.</td></tr>`;
                }
            })
            .catch((err) => {
                console.error("Error fetching paid transactions:", err);
                distributionOrdersTable.innerHTML = `<tr><td colspan="4">Error loading transactions.</td></tr>`;
            });
    }

    // Event listeners for date picker and search bar
    dateFilter.addEventListener("change", fetchAndDisplayTransactions);
    searchBar.addEventListener("input", fetchAndDisplayTransactions);

    // Initial fetch
    fetchAndDisplayTransactions();
}

// Function to mark an order as claimed
function markAsClaimed(orderId, rowElement) {
    fetch(`/api/sales-order/mark-claimed/${orderId}`, {
        method: "POST",
    })
        .then((res) => {
            if (!res.ok) throw new Error("Failed to mark order as claimed.");
            return res.json();
        })
        .then((data) => {
            if (data.success) {
                alert(data.message);

                // Remove the row dynamically from the table
                if (rowElement) rowElement.remove();
            } else {
                alert("Failed to process the claim.");
            }
        })
        .catch((err) => {
            console.error("Error marking order as claimed:", err);
            alert("Error marking order as claimed.");
        });
}

    // Show the popup for printing the receipt
    function showPrintPopup(receiptUrl) {
        const popup = document.getElementById("print-popup");
        const iframe = document.getElementById("receipt-iframe");
        const printButton = document.getElementById("print-button");
        const closeButton = document.getElementById("close-popup");

        iframe.src = receiptUrl; // Set the iframe src to the receipt URL
        popup.style.display = "flex"; // Show the popup

        printButton.onclick = () => {
            iframe.contentWindow.print(); // Print the PDF inside the iframe
        };

        closeButton.onclick = () => {
            popup.style.display = "none"; // Close the popup
        };
    }
    
    // Load default section on page load
    loadContent('dashboard');
});