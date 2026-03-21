/* analytics.js */

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') ? 'http://localhost:3002/api' : '/api';

document.addEventListener('DOMContentLoaded', () => {
    loadGlobalAnalytics();
    buildDepartmentChart();
    buildSalaryChart();
});

async function loadGlobalAnalytics() {
    try {
        const res = await fetch(`${API_BASE_URL}/analytics`);
        if(!res.ok) throw new Error("Failed to fetch global analytics");
        const data = await res.json();
        
        document.getElementById("global-skill").innerText = data.most_demanded_skill || 'N/A';
        document.getElementById("global-career").innerText = data.top_career || 'N/A';
        document.getElementById("global-avg").innerText = `${data.average_skill_level || '0'} / 5`;
    } catch(e) {
        console.error("Global Analytics error:", e);
        document.getElementById("global-skill").innerText = 'Error';
        document.getElementById("global-career").innerText = 'Error';
    }
}

async function buildDepartmentChart() {
    const loader = document.getElementById('dept-loader');
    const canvas = document.getElementById('deptChart');
    
    try {
        const res = await fetch(`${API_BASE_URL}/analytics`);
        if(!res.ok) throw new Error("Failed to fetch analytics");
        const data = await res.json();
        const successRates = data.successRates || [];
        
        if (successRates.length === 0) {
            loader.innerText = 'No trend data yet';
            return;
        }

        // Hide Loader
        loader.style.display = 'none';
        canvas.style.display = 'block';

        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: successRates.map(r => r.department),
                datasets: [{
                    label: 'Success Rate (%)',
                    data: successRates.map(r => r.rate),
                    backgroundColor: [
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(236, 72, 153, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(249, 115, 22, 0.8)',
                        'rgba(168, 85, 247, 0.8)'
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right' },
                    title: { display: true, text: 'Placement Success Rate by Dept', color: '#94a3b8' },
                    tooltip: { 
                        backgroundColor: '#1f2937', 
                        padding: 12, 
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => `Success Rate: ${context.raw}%`
                        }
                    }
                },
                cutout: '70%'
            }
        });

    } catch(e) {
        console.error("Department Chart error:", e);
        loader.innerText = 'Failed to load data';
    }
}

async function buildSalaryChart() {
    const loader = document.getElementById('salary-loader');
    const canvas = document.getElementById('salaryChart');
    
    try {
        const res = await fetch(`${API_BASE_URL}/careers`);
        if(!res.ok) throw new Error("Failed to fetch careers");
        const careers = await res.json();
        
        // Sort by salary
        careers.sort((a,b) => parseFloat(b.average_salary) - parseFloat(a.average_salary));
        // Take top 6
        const topCareers = careers.slice(0, 6);

        // Hide Loader
        loader.style.display = 'none';
        canvas.style.display = 'block';

        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.7)'); // green
        gradient.addColorStop(1, 'rgba(6, 182, 212, 0.7)'); // cyan

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topCareers.map(c => c.career_name.split(' ')[0]), // shortening for labels
                datasets: [{
                    label: 'Avg Salary ($)',
                    data: topCareers.map(c => parseFloat(c.average_salary)),
                    backgroundColor: gradient,
                    borderRadius: 6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { backgroundColor: '#1f2937' } // dark tooltips
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        border: { display: false }
                    },
                    x: {
                        grid: { display: false },
                        border: { display: false }
                    }
                }
            }
        });

    } catch(e) {
        console.error("Salary Chart error:", e);
        loader.innerText = 'Failed to load data';
    }
}
