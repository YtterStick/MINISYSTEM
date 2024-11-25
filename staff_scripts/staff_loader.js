document.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll('.nav-link[data-section]');
    const mainContent = document.getElementById('content-id');
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
        const contentFile = `/staff_pages/${section}.html`;

        fetch(contentFile)
            .then(response => {
                if (!response.ok) throw new Error('Content not found');
                return response.text();
            })
            .then(data => {
                mainContent.innerHTML = data;
                setActiveLink(section);

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

    function setActiveLink(activeSection) {
        links.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === activeSection) {
                link.classList.add('active');
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

    function initializeCreateSalesOrder() {
        const form = document.getElementById("sales-order-form");

        form.addEventListener("submit", (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

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

    function initializeSalesProcess() {
        const unpaidOrdersTable = document.getElementById("unpaid-orders-body");

        fetch("/api/sales-order/unpaid")
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
                                markAsClaimed(orderId, e.target.closest('tr'));
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

        dateFilter.addEventListener("change", fetchAndDisplayTransactions);
        searchBar.addEventListener("input", fetchAndDisplayTransactions);

        fetchAndDisplayTransactions();
    }    function markAsClaimed(orderId, rowElement) {
        fetch(`/api/sales-order/mark-claimed/${orderId}`, {
            method: "POST",
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    alert(data.message);

                    if (rowElement) rowElement.remove();
                } else {
                    alert("Failed to mark as claimed.");
                }
            })
            .catch((err) => {
                console.error("Error marking order as claimed:", err);
                alert("Error marking order as claimed.");
            });
    }


    function initializeViewSalesRecord() {
        const recordsBody = document.getElementById("sales-records-body");
        const searchBar = document.getElementById("search-bar");
        const startDateInput = document.getElementById("start-date");
        const endDateInput = document.getElementById("end-date");
        const prevPage = document.getElementById("prev-page");
        const nextPage = document.getElementById("next-page");
        const currentPageSpan = document.getElementById("current-page");
    
        let currentPage = 1;
    
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
                                <td class="${record.payment_status === 'Paid' ? 'paid' : 'unpaid'}">${record.payment_status}</td>
                                <td class="${record.claimed_status === 'Claimed' ? 'claimed' : 'unclaimed'}">${record.claimed_status}</td>
                                <td>${new Date(record.created_at).toLocaleString()}</td>
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
    }
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

    loadContent('dashboard');
});
