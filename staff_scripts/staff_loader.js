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
                if(section === "create-sales-order"){
                    initializeCreateSalesOrder();
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
    
        document.getElementById("save-transaction").addEventListener("click", () => {
            alert("Transaction saved as unpaid.");
        });
    }
    
    loadContent('dashboard');
});
