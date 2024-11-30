document.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll('.nav-link[data-section]');
    const mainContent = document.getElementById('content-id');
    const dropdownLinks = document.querySelectorAll('.nav-link[onclick="toggleDropdown(event)"]');
    const userId = sessionStorage.getItem("userId"); // Ensure userId is available globally

    const logoutBtn = document.getElementById("logout-btn");
    
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            window.location.href = "/api/users/logout"; // Navigates to the logout route
        });
    }

    console.log("mainContent: ", mainContent);

    if(!mainContent){
        console.log("main content element not fount");
    }

    if (!userId) {
        alert("Session expired. Please log in again.");
        window.location.href = "/"; // Redirect to login
        return;
    }

    // Dropdown functionality for navigation
    dropdownLinks.forEach(link => {
        link.addEventListener('click', toggleDropdown);
    });

    function toggleDropdown(event) {
        event.preventDefault();
        const parentItem = event.currentTarget.parentElement;
        parentItem.classList.toggle("open");
    }

    // Load content dynamically based on section selected
    function loadContent(section) {
        const contentFile = `/staff_pages/${section}.html`;

        fetch(contentFile)
            .then(response => {
                console.log("Response status: ", response.status);
                if (!response.ok) throw new Error('Content not found');
                return response.text();
            })
            .then(data => {
                console.log("Data loaded successfully");
                mainContent.innerHTML = data;
                setActiveLink(section);

                // Initialize the corresponding section functionality
                if (section === "create-sales-order") {
                    initializeCreateSalesOrder();
                } else if (section === "order-process") {
                    initializeSalesProcess();
                } else if (section === "manage-distribution") {
                    initializeManageDistribution();
                } else if (section === "view-sales-record") {
                    initializeViewSalesRecord();
                }
            })
            .catch(error => {
                console.error(error);
                mainContent.innerHTML = `<p>Error loading content: ${error.message}</p>`;
            });
    }

    // Set active class on navigation links
    function setActiveLink(activeSection) {
        links.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === activeSection) {
                link.classList.add('active');
                console.log("Activated link for section: ", activeSection);
            }
        });
    }

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            if (section) loadContent(section);
        });
    });
    
    // Initialize Create Sales Order functionality
    function initializeCreateSalesOrder() {
        const form = document.getElementById("sales-order-form");
        const serviceDropdown = document.getElementById("services");
        const detergentInput = document.getElementById("detergent-count");
        const softenerInput = document.getElementById("fabric-softener-count");
    
        // Disable inputs for "Dry" service
        serviceDropdown.addEventListener("change", () => {
            const selectedService = serviceDropdown.value;
    
            if (selectedService === "Dry") {
                detergentInput.value = 0;
                detergentInput.disabled = true;
                softenerInput.value = 0;
                softenerInput.disabled = true;
            } else {
                detergentInput.disabled = false;
                softenerInput.disabled = false;
            }
        });
    
        form.addEventListener("submit", (e) => {
            e.preventDefault();
    
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
    
            // Attach userId to the request
            data.userId = sessionStorage.getItem("userId");
            console.log("Data to be sent:", data);
    
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
    
                        if (result.receipt) {
                            showPrintPopup(result.receipt);
                        }
    
                        form.reset();
                    } else {
                        alert("Error: " + result.message);
                    }
                })
                .catch((err) => console.error("Error processing transaction:", err));
        });
    }
    
    // Initialize Sales Process (Fetch Unpaid Transactions)
    function initializeSalesProcess() {
        const unpaidOrdersTable = document.getElementById("unpaid-orders-body");

        fetch(`/api/sales-order/unpaid?userId=${userId}`) // Include userId in the request
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch unpaid transactions.");
                return res.json();
            })
            .then((data) => {
                if (data.success) {
                    const transactions = data.transactions;

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

    // Mark transaction as Paid
    function markAsPaid(orderId) {
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

                    if (data.receipt) {
                        showPrintPopup(data.receipt);
                    }

                    initializeSalesProcess(); // Refresh the unpaid orders table
                } else {
                    alert("Failed to process the transaction.");
                }
            })
            .catch((err) => {
                console.error("Error marking order as paid:", err);
                alert("Error marking order as paid.");
            });
    }

// Manage Distribution (Show Paid Transactions)
function initializeManageDistribution() {
    const distributionOrdersTable = document.getElementById("distribution-orders-body");
    const startDateInput = document.getElementById("start-date");
    const endDateInput = document.getElementById("end-date");
    const searchBar = document.getElementById("search-bar");
    const prevPage = document.getElementById("prev-page");
    const nextPage = document.getElementById("next-page");
    const currentPageSpan = document.getElementById("current-page");

    let currentPage = 1;
    const recordsPerPage = 10;

    // Function to fetch and display transactions with Date & Time Paid only
    function fetchAndDisplayTransactions() {
        const startDate = startDateInput.value || null; // Default to null if empty
        const endDate = endDateInput.value || null; // Default to null if empty
        const searchName = searchBar.value.trim(); // Get the search term

        const params = new URLSearchParams();
        params.append("page", currentPage);
        params.append("limit", recordsPerPage);

        // Always append the search term to the params if it's present
        if (searchName) {
            params.append("name", searchName);
        }

        // Append the date range to params for filtering by "Date Paid"
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);

        fetch(`/api/sales-order/paid?${params.toString()}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    distributionOrdersTable.innerHTML = ""; // Clear previous data

                    if (data.transactions.length === 0) {
                        distributionOrdersTable.innerHTML = `<tr><td colspan="4">No transactions found.</td></tr>`;
                        return;
                    }

                    // Populate table rows
                    data.transactions.forEach((transaction) => {
                        const formattedDate = transaction.paid_at
                            ? new Date(transaction.paid_at).toLocaleString("en-US", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                              })
                            : "N/A";

                        const row = document.createElement("tr");
                        row.innerHTML = `
                            <td>${transaction.customer_name}</td>
                            <td>${transaction.number_of_loads}</td>
                            <td>${formattedDate}</td> <!-- Show formatted Date & Time Paid -->
                            <td>
                                <button class="mark-claimed-btn" data-id="${transaction.id}">Mark as Claimed</button>
                            </td>
                        `;
                        distributionOrdersTable.appendChild(row);
                    });

                    // Add event listener to "Mark as Claimed" buttons
                    document.querySelectorAll(".mark-claimed-btn").forEach((button) => {
                        button.addEventListener("click", (e) => {
                            const orderId = e.target.dataset.id;
                            markAsClaimed(orderId, e.target.closest("tr"));
                        });
                    });

                    updatePagination(data.totalPages); // Update pagination controls
                }
            })
            .catch((err) => {
                console.error("Error fetching transactions:", err);
                distributionOrdersTable.innerHTML = `<tr><td colspan="4">Error loading transactions.</td></tr>`;
            });
    }

    // Update pagination controls
    function updatePagination(totalPages) {
        currentPageSpan.textContent = currentPage;
        prevPage.disabled = currentPage === 1;
        nextPage.disabled = currentPage >= totalPages;
    }

    // Event listeners for pagination
    prevPage.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            fetchAndDisplayTransactions();
        }
    });

    nextPage.addEventListener("click", () => {
        currentPage++;
        fetchAndDisplayTransactions();
    });

    // Event listeners for date range changes
    startDateInput.addEventListener("change", () => {
        currentPage = 1; // Reset to first page on date change
        fetchAndDisplayTransactions();
    });

    endDateInput.addEventListener("change", () => {
        currentPage = 1; // Reset to first page on date change
        fetchAndDisplayTransactions();
    });

    // Live search functionality: trigger search on input change
    searchBar.addEventListener("input", () => {
        currentPage = 1; // Reset to first page on search input
        fetchAndDisplayTransactions();
    });

    fetchAndDisplayTransactions(); // Initial fetch when the page loads
}

function markAsClaimed(orderId, rowElement) {
    fetch(`/api/sales-order/mark-claimed/${orderId}`, {
        method: "POST",
    })
        .then((res) => res.json())
        .then((data) => {
            if (data.success) {
                alert(data.message);
                if (rowElement) rowElement.remove(); // Remove the row after marking as claimed
            } else {
                alert("Failed to mark as claimed.");
            }
        })
        .catch((err) => {
            console.error("Error marking as claimed:", err);
            alert("Error marking as claimed.");
        });
}


    // View Sales Records with Filters
    function initializeViewSalesRecord() {
        const recordsBody = document.getElementById("sales-records-body");
        const searchBar = document.getElementById("search-bar");
        const startDateInput = document.getElementById("start-date");
        const endDateInput = document.getElementById("end-date");
        const prevPage = document.getElementById("prev-page");
        const nextPage = document.getElementById("next-page");
        const currentPageSpan = document.getElementById("current-page");
        const dateFilterDropdown = document.getElementById("date-filter-dropdown"); // New dropdown for header filter
    
        let currentPage = 1;
        let dateField = "created_at"; // Default field to show in the column
    
        const formatDate = (date) => {
            return date
                ? new Date(date).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })
                : "N/A";
        };
    
        function fetchRecords() {
            const search = searchBar.value.trim();
            const startDate = startDateInput.value;
            const endDate = endDateInput.value;
    
            fetch(`/api/sales-order/sales-records?page=${currentPage}&search=${search}&startDate=${startDate}&endDate=${endDate}`)
                .then((res) => res.json())
                .then((data) => {
                    if (data.success) {
                        recordsBody.innerHTML = "";
    
                        data.records.forEach((record) => {
                            const row = document.createElement("tr");
    
                            row.innerHTML = `
                                <td>${record.customer_name}</td>
                                <td>${record.number_of_loads}</td>
                                <td>${record.services}</td>
                                <td>${record.detergent_count}</td>
                                <td>${record.fabric_softener_count}</td>
                                <td>PHP ${record.total_cost}</td>
                                <td class="${record.payment_status === "Paid" ? "paid" : "unpaid"}">${record.payment_status}</td>
                                <td class="${record.claimed_status === "Claimed" ? "claimed" : "unclaimed"}">${record.claimed_status}</td>
                                <td>${formatDate(record[dateField])}</td>
                            `;
    
                            recordsBody.appendChild(row);
                        });
    
                        currentPageSpan.textContent = currentPage;
                        prevPage.disabled = currentPage === 1;
                        nextPage.disabled = currentPage >= data.pages;
                    } else {
                        alert("Failed to fetch sales records.");
                    }
                })
                .catch((err) => console.error("Error fetching sales records:", err));
        }
    
        fetchRecords();
    
        searchBar.addEventListener("input", () => {
            currentPage = 1;
            fetchRecords();
        });
    
        startDateInput.addEventListener("change", fetchRecords);
        endDateInput.addEventListener("change", fetchRecords);
    
        prevPage.addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                fetchRecords();
            }
        });
    
        nextPage.addEventListener("click", () => {
            currentPage++;
            fetchRecords();
        });
    
        // Handle date filter dropdown changes
        dateFilterDropdown.addEventListener("change", (e) => {
            dateField = e.target.value; // Update the dateField based on the dropdown selection
            fetchRecords(); // Refresh the table with the selected date field
        });
    }
    
    

    // Show Print Popup for Receipt
    function showPrintPopup(receiptUrl) {
        const popup = document.getElementById("print-popup");
        const iframe = document.getElementById("receipt-iframe");
        const printButton = document.getElementById("print-button");
        const closeButton = document.getElementById("close-popup");

        iframe.src = receiptUrl;
        popup.style.display = "flex";

        printButton.onclick = () => {
            iframe.contentWindow.print();
        };

        closeButton.onclick = () => {
            popup.style.display = "none";
        };
    }

    loadContent("dashboard"); // Load default section on start
});