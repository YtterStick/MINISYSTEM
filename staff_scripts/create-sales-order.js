document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("sales-order-form").addEventListener("submit", (e) => {
        e.preventDefault();
    
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
    
        fetch("/api/sales-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        })
            .then((res) => res.json())
            .then((result) => alert(result.message))
            .catch((err) => console.error(err));
    });
    fetch("/api/sales-order/unpaid")
    .then((res) => res.json())
    .then((orders) => {
        const tableBody = document.querySelector("#unpaid-orders-table tbody");
        tableBody.innerHTML = "";

        orders.forEach((order) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${order.customer_name}</td>
                <td>${order.services}</td>
                <td>${order.number_of_loads}</td>
                <td>${order.total_cost}</td>
                <td>${order.month_created}</td>
                <td>
                    <button data-id="${order.id}" class="mark-paid">Mark as Paid</button>
                </td>`;
            tableBody.appendChild(row);
        });

        //mark paid
        document.querySelectorAll(".mark-paid").forEach((btn) =>
            btn.addEventListener("click", (e) => {
                const id = e.target.dataset.id;
                fetch(`/api/sales-order/mark-paid/${id}`, { method: "PUT" })
                    .then((res) => res.json())
                    .then((result) => {
                        alert(result.message);
                        location.reload(); // Reload to update the table
                    });
            })
        );
    })
    .catch((err) => console.error(err));
});
