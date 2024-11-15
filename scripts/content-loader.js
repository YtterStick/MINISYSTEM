document.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll('.nav-link[data-section]'); // Select only links with data-section
    const branchLinks = document.querySelectorAll('.branch-link[data-section]');
    const mainContent = document.getElementById('main-content-id');
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

    // Populate the floating sidebar with branch-specific options


    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            if (section) loadContent(section);
        });
    });

    loadContent('dashboard'); // Load the dashboard by default on page load
});
