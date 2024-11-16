document.addEventListener("DOMContentLoaded", () => {
    const accountForm = document.getElementById('account-form');
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

                // Special behavior for specific sections (like Overall Sales Report or Dashboard)
                if (section === 'overall-sales') {
                    initializeServiceSalesChart();
                    initializeMonthlySalesTrendChart();  // Initialize the chart for overall sales report
                } else if (section === 'dashboard') {
                    initializeDashboardChart();  // Initialize dashboard chart if needed
                }
            })
            .catch(error => {
                console.error(error);
                mainContent.innerHTML = `<p>Error loading content: ${error.message}</p>`;
            });
    }

    // Set active link when a link is clicked
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

    loadContent('dashboard');
    accountForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent the default form submission

        // Collect form data
        const formData = new FormData(accountForm);
        const data = Object.fromEntries(formData.entries());

        try {
            // Send POST request to the server
            const response = await fetch('/create-account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                alert('Account created successfully!');
                accountForm.reset(); // Clear the form after successful submission
            } else {
                const errorText = await response.text();
                alert(`Failed to create account: ${errorText}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An unexpected error occurred. Please try again.');
        }
    }); // Load the dashboard by default on page load
});
