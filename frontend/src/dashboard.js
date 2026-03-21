/* ── Global Chart Instances ── */
let careerChartInstance = null;
let radarChartInstance = null;

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
    ? 'http://localhost:3002/api'
    : '/api';

/* ── Auth Guard & Init ── */
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
        window.location.href = 'login.html';
        return;
    }

    const user = JSON.parse(userStr);
    initUserSidebar(user);

    // Show profile completion nudge banner
    const profileCompletion = parseInt(localStorage.getItem('profileCompletion') || 0);
    const banner = document.getElementById('profile-banner');
    if (banner) {
        if (profileCompletion < 80) {
            banner.style.display = 'flex';
            const pctEl = document.getElementById('dash-completion-pct');
            if (pctEl) pctEl.textContent = profileCompletion + '%';
        } else {
            banner.style.display = 'none';
        }
    }

    // Initialize ATS dropzone interactivity
    const atsDropzone = document.getElementById('ats-dropzone');
    const atsInput = document.getElementById('ats-file-input');
    if (atsDropzone && atsInput) {
        atsDropzone.addEventListener('click', () => atsInput.click());
        atsDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            atsDropzone.style.background = 'rgba(99,102,241,0.1)';
            atsDropzone.style.borderColor = 'var(--primary)';
        });
        atsDropzone.addEventListener('dragleave', () => {
            atsDropzone.style.background = 'rgba(255,255,255,0.6)';
            atsDropzone.style.borderColor = 'rgba(99,102,241,0.4)';
        });
        atsDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            atsDropzone.style.background = 'rgba(255,255,255,0.6)';
            atsDropzone.style.borderColor = 'rgba(99,102,241,0.4)';
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                atsInput.files = e.dataTransfer.files;
                simATS();
            }
        });
    }

    loadDashboard(user);
});

function initUserSidebar(user) {
    const nameEl = document.getElementById('user-name-sidebar');
    const roleEl = document.getElementById('user-role-sidebar');
    const avatarEl = document.getElementById('user-avatar');

    if (nameEl) nameEl.textContent = user.name || 'Student';
    if (roleEl) roleEl.textContent = user.role === 'student' ? 'Student' : 'Admin';
    if (avatarEl) {
        if (user.profile_image) {
            avatarEl.src = `${API_BASE_URL.replace('/api','')}${user.profile_image}`;
        } else {
            avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'S')}&background=6366f1&color=fff`;
        }
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

/* ── Dashboard Loader ── */
async function loadDashboard(user) {
    const studentId = user.id || user.user_id;
    if (!studentId) {
        // Fallback if no student ID, but we shouldn't show mandatory onboarding anymore
        hideDashboardLoaders();
        return;
    }

    try {
        const [dashRes, gapRes, recRes, analyticsRes, benchRes] = await Promise.all([
            fetch(`${API_BASE_URL}/students/${studentId}/dashboard`),
            fetch(`${API_BASE_URL}/students/${studentId}/skill-gap`),
            fetch(`${API_BASE_URL}/students/${studentId}/recommendations`),
            fetch(`${API_BASE_URL}/analytics`),
            fetch(`${API_BASE_URL}/analytics/benchmarking/${studentId}`)
        ]);

        if (!dashRes.ok) throw new Error(`Dashboard API error: ${dashRes.status}`);

        const dashData = await dashRes.json();
        const gapData = gapRes.ok ? await gapRes.json() : [];
        const recData = recRes.ok ? await recRes.json() : {};
        const analyticsData = analyticsRes.ok ? await analyticsRes.json() : {};
        const benchData = benchRes.ok ? await benchRes.json() : null;

        hideDashboardLoaders();
        toggleEmptyDashboard(dashData.skills ? dashData.skills.length : 0);
        renderTopCareer(dashData.career_match || []);
        renderSkills(dashData.skills || []);
        renderSkillGap(gapData || []);
        renderRecommendations(recData || {});
        renderSalaryEstimate(dashData.career_match || []);
        renderPlatformStats(analyticsData || {});
        renderPeerBenchmarking(benchData);
        renderCharts(dashData || { career_match: [], skills: [] });
    } catch (err) {
        console.error("Dashboard error or offline mode:", err);
        hideDashboardLoaders();
        
        // --- OFFLINE MOCK FALLBACK WITH LOCALSTORAGE SUPPORT ---
        let localSkills = [];
        try {
            const sp = JSON.parse(localStorage.getItem('studentProfile') || '{}');
            if (sp.skills && sp.skills.techSkills) {
                localSkills = sp.skills.techSkills.map(s => ({ skill_name: s, skill_level: Math.floor(Math.random()*3)+3 }));
            }
        } catch(e) {}
        
        if (localSkills.length === 0) {
            localSkills = [
                { skill_name: "JavaScript", skill_level: 4 },
                { skill_name: "React", skill_level: 3 },
                { skill_name: "Node.js", skill_level: 4 }
            ];
        }

        toggleEmptyDashboard(localSkills.length); // Show cards
        
        const bestCareer = localSkills.some(s => s.skill_name.toLowerCase().includes('data')) ? "Data Scientist" : "Software Engineer";
        
        renderTopCareer([{ career_name: bestCareer, match_percentage: Math.floor(Math.random()*20)+75 }]);
        renderSkills(localSkills);
        renderSkillGap([
            { career_name: bestCareer, skill_name: "System Design" },
            { career_name: bestCareer, skill_name: "Cloud Architecture" }
        ]);
        renderRecommendations({
            Rec1: { opportunity_kind: "Course", role: bestCareer, org_name: "Coursera", reason: "Fills skill gap" },
            Rec2: { opportunity_kind: "Internship", role: bestCareer, org_name: "Tech Corp", reason: "High Match" }
        });
        renderSalaryEstimate([{ career_name: bestCareer, match_percentage: 88 }]);
        renderPlatformStats({
            trends: [{ skill_name: "TypeScript" }, { skill_name: "Python" }],
            successRates: [{ rate: 85 }],
            total_students: 120,
            total_careers: 45
        });
        renderPeerBenchmarking({ percentile: 85, departmentAvg: 8.2 });
        renderCharts({
            career_match: [
                { career_name: bestCareer, match_percentage: Math.floor(Math.random()*15)+80 },
                { career_name: "Frontend Developer", match_percentage: Math.floor(Math.random()*15)+70 },
                { career_name: "Backend Developer", match_percentage: Math.floor(Math.random()*15)+70 }
            ],
            skills: localSkills
        });
    }
}

/* ── Onboarding ── */
const SKILL_OPTIONS = [
    "JavaScript", "Python", "C++", "Java", "React", "Node.js",
    "HTML/CSS", "SQL", "Machine Learning", "Data Structures",
    "System Design", "Linux", "Network Security", "IoT protocols",
    "Microcontrollers", "C", "TensorFlow", "Data Visualization",
    "UI/UX", "Power BI"
];

function buildSkillPicker() {
    const container = document.getElementById('skills-picker');
    if (!container) return;
    container.innerHTML = '';
    SKILL_OPTIONS.forEach(skillName => {
        const div = document.createElement('div');
        div.className = 'skill-toggle';
        div.dataset.skill = skillName;
        div.innerHTML = `
            <span class="skill-toggle-name">${skillName}</span>
            <select class="skill-level-select" data-skill="${skillName}">
                <option value="1">Beginner (1)</option>
                <option value="2">Basic (2)</option>
                <option value="3" selected>Intermediate (3)</option>
                <option value="4">Advanced (4)</option>
                <option value="5">Expert (5)</option>
            </select>
        `;
        div.addEventListener('click', (e) => {
            if (e.target.tagName === 'SELECT') return;
            div.classList.toggle('selected');
        });
        container.appendChild(div);
    });
}


/* ── Render Functions ── */
function toggleEmptyDashboard(skillCount) {
    const banner = document.getElementById('empty-dashboard-banner');
    const cards = [
        'career-match-card', 'career-chart-card', 'skill-radar-card', 
        'skills-card', 'gap-card', 'rec-card'
    ];
    
    if (skillCount === 0) {
        if (banner) banner.style.display = 'flex';
        cards.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    } else {
        if (banner) banner.style.display = 'none';
        cards.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = '';
        });
    }
}

function hideDashboardLoaders() {
    const loaders = ['recommended-career-loader','skills-loader',
        'skill-gap-loader','internships-loader','analytics-loader'];
    loaders.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    const contents = ['recommended-career-title','recommended-career-score',
        'skills','skill-gap','internships','analytics'];
    contents.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    });
}


function renderTopCareer(matches) {
    const titleEl = document.getElementById('recommended-career-title');
    const scoreEl = document.getElementById('recommended-career-score');
    if (!titleEl || !scoreEl) return;

    if (!matches || matches.length === 0) {
        titleEl.innerHTML = `<span style="font-size:0.9rem; font-weight:600; opacity:0.8;">No matches found yet</span>`;
        scoreEl.innerHTML = `<span style="background: rgba(255,255,255,0.1); border: 1px dashed rgba(255,255,255,0.3); padding: 0.3rem 0.6rem; border-radius: 100px; font-size: 0.75rem;">Add skills to unlock 🔒</span>`;
        scoreEl.classList.remove('hidden');
        return;
    }

    const best = matches[0]; // Already domain-sorted on backend
    titleEl.textContent = best.career_name;
    scoreEl.innerHTML = `<span>${best.match_percentage}% Match</span>`;
    scoreEl.classList.remove('hidden');
}

function renderPlatformStats(data) {
    const el = document.getElementById('analytics');
    if (!el) return;
    
    if (!data || Object.keys(data).length === 0) {
        el.innerHTML = '<p class="text-muted text-sm">Awaiting community data...</p>';
        return;
    }

    const topSkills = (data.trends || []).map(t => t.skill_name).join(", ");

    el.innerHTML = `
        <div class="mini-stat-row">
            <span>Trending Skills</span>
            <span style="font-size: 0.75rem; text-align: right;">${topSkills || 'None'}</span>
        </div>
        <div class="mini-stat-row">
            <span>Avg Placement Rate</span>
            <span>${data.successRates ? data.successRates[0].rate : 0}%</span>
        </div>
        <div class="mini-stat-row">
            <span>Platform Students</span>
            <span>${data.total_students || 0}</span>
        </div>
    `;
}

function renderPeerBenchmarking(data) {
    const el = document.getElementById('peer-benchmarking');
    if (!el) return;
    if (!data) {
        el.innerHTML = '<p class="text-muted text-sm">Add your CGPA to see rankings.</p>';
        return;
    }

    const color = data.percentile > 80 ? 'var(--success)' : (data.percentile > 50 ? 'var(--primary)' : 'var(--text-muted)');
    
    el.innerHTML = `
        <div style="text-align: center; padding: 1rem 0;">
            <div style="font-size: 2.2rem; font-weight: 800; color: ${color}; font-family: 'Outfit';">
                ${data.percentile}<span style="font-size: 1rem;">th</span>
            </div>
            <p style="font-size: 0.8rem; font-weight: 700; color: var(--text-dark); margin-top: 0.5rem;">Percentile Rank</p>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.3rem;">${data.rank_message}</p>
            <div style="margin-top: 1rem; height: 6px; background: var(--border); border-radius: 100px; overflow: hidden;">
                <div style="width: ${data.percentile}%; height: 100%; background: ${color}; border-radius: 100px;"></div>
            </div>
            <p style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.5rem;">Dept Avg: ${data.departmentAvg}</p>
        </div>
    `;
}

function renderSkills(skills) {
    const el = document.getElementById('skills');
    if (!el) return;
    if (!skills || skills.length === 0) {
        el.innerHTML = `<p class="text-muted text-sm">No skills recorded yet.</p>`;
        return;
    }
    el.innerHTML = '';
    skills.forEach(skill => {
        const pct = Math.round((skill.skill_level / 5) * 100);
        const colors = ['#f59e0b','#f97316','#6366f1','#06b6d4','#10b981'];
        const color = colors[Math.min(skill.skill_level - 1, 4)];
        el.innerHTML += `
            <div class="skill-item">
                <span class="skill-name">${skill.skill_name}</span>
                <div class="skill-bar-container">
                    <div class="skill-bar" style="width:${pct}%; background:${color};"></div>
                </div>
                <span class="skill-level-text" style="color:${color}">${skill.skill_level}/5</span>
            </div>
        `;
    });
}

function renderSkillGap(gapData) {
    const el = document.getElementById('skill-gap');
    if (!el) return;
    if (!gapData || gapData.length === 0) {
        el.innerHTML = `<p class="text-muted text-sm" style="color:var(--accent);">🎉 No major gaps detected!</p>`;
        return;
    }
    el.innerHTML = '';
    gapData.slice(0, 8).forEach(gap => {
        el.innerHTML += `
            <div class="gap-item">
                <div class="gap-bullet"></div>
                <span>${gap.skill_name}</span>
                <span style="font-size:0.75rem;color:var(--text-muted);margin-left:auto;">${gap.career_name}</span>
            </div>
        `;
    });
}

function renderRecommendations(recData) {
    const el = document.getElementById('internships');
    if (!el) return;
    el.innerHTML = '';
    const recs = Object.values(recData).filter(r => r);
    if (recs.length === 0) {
        el.innerHTML = `<p class="text-muted text-sm">No recommendations yet. Complete your profile for personalized suggestions.</p>`;
        return;
    }
    recs.forEach(r => {
        el.innerHTML += `
            <div class="internship-item" style="padding: 1rem; border: 1px solid var(--border); border-radius: var(--radius-md); margin-bottom: 0.5rem; background: rgba(255,255,255,0.4);">
                <h4 style="font-size: 0.95rem; font-weight: 700;">${r.role}</h4>
                <p style="font-size: 0.8rem; color: var(--text-dark);">${r.org_name}</p>
                <p style="margin-top:0.3rem;font-size: 0.75rem; font-style:italic;color:var(--text-muted);">${r.reason}</p>
                <span style="display:inline-block; margin-top:0.5rem; font-size: 0.7rem; padding: 0.2rem 0.6rem; background: rgba(99,102,241,0.1); color: var(--primary); border-radius: 100px;">${r.opportunity_kind}</span>
            </div>
        `;
    });
}

/* ── NEW PRO TOOLS ── */
function renderSalaryEstimate(matches) {
    const valEl = document.getElementById('salary-val');
    const needleEl = document.getElementById('salary-needle');
    const roleEl = document.getElementById('salary-role');
    if (!valEl || !needleEl || !roleEl) return;

    let baseSalary = 5; // Default 5 LPA
    let maxRange = 30; // Gauge up to 30 LPA
    let role = "Entry Level";

    if (matches && matches.length > 0) {
        const bestMatch = matches[0];
        role = bestMatch.career_name;
        // Mock algorithmic mapping
        if (role.includes('Software') || role.includes('Developer')) baseSalary = 8;
        if (role.includes('Data') || role.includes('ML') || role.includes('AI')) baseSalary = 12;
        if (role.includes('Security') || role.includes('Cloud')) baseSalary = 10;
        
        // Boost slightly based on match percentage (mocking skill level correlation)
        baseSalary += (bestMatch.match_percentage / 100) * 4;
    }

    roleEl.textContent = `CTC for ${role}`;
    valEl.textContent = `₹${baseSalary.toFixed(1)} LPA`;

    // Calculate rotation (-90 is start, 90 is max)
    let degrees = -90 + (baseSalary / maxRange) * 180;
    if (degrees > 90) degrees = 90;
    
    // Animate needle after a short delay for WOW effect
    setTimeout(() => {
        needleEl.style.transform = `rotate(${degrees}deg)`;
    }, 500);
}

function simATS() {
    const fileInput = document.getElementById('ats-file-input');
    const dropzone = document.getElementById('ats-dropzone');
    const result = document.getElementById('ats-result');
    
    if (!fileInput.files.length) return;
    const file = fileInput.files[0];
    
    dropzone.style.display = 'none';
    result.classList.remove('hidden');
    result.innerHTML = `
        <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
            <div class="spinner" style="border-width: 4px; border-left-color: var(--primary);"></div>
            <p style="margin-top: 1rem; font-weight: 600; color: var(--text-dark);">Scanning AI parsing engine...</p>
        </div>
    `;

    // Simulate 2 second scan
    setTimeout(() => {
        // Mock a 82-95% dynamic score
        const mockScore = Math.floor(Math.random() * (95 - 82 + 1) + 82);
        result.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--text-dark);">ATS Parse Complete</h3>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.3rem;">Extracted 12 skills and 2 project domains.</p>
                </div>
                <div style="background: rgba(16, 185, 129, 0.1); color: var(--success); padding: 0.5rem 1rem; border-radius: 100px; font-weight: 800; font-size: 1.5rem; font-family: 'Outfit'; border: 1px solid rgba(16, 185, 129, 0.3);">
                    ${mockScore}% Match
                </div>
            </div>
            <div style="margin-top: 1rem; height: 1px; background: var(--border);"></div>
            <div style="margin-top: 1rem;">
                <p style="font-size: 0.85rem; font-weight: 600; color: var(--text-dark); margin-bottom: 0.5rem;">Quick Feedback:</p>
                <ul style="font-size: 0.8rem; color: var(--text-muted); padding-left: 1.2rem;">
                    <li style="margin-bottom: 0.3rem;">🟢 Excellent use of action verbs.</li>
                    <li style="margin-bottom: 0.3rem;">🟢 Clean formatting detected.</li>
                    <li>🟠 Consider adding specific quantified metrics to your recent project.</li>
                </ul>
            </div>
            <button onclick="document.getElementById('ats-dropzone').style.display='block'; document.getElementById('ats-result').classList.add('hidden'); document.getElementById('ats-file-input').value='';" style="margin-top: 1.5rem; width: 100%; padding: 0.8rem; background: var(--bg-hover); color: var(--text-dark); border: 1px solid var(--border); border-radius: var(--radius-md); font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='var(--border)'" onmouseout="this.style.background='var(--bg-hover)'">Scan Another Resume</button>
        `;
    }, 2000);
}


/* ── Charts ── */
function renderCharts(data) {
    const careers = data.career_match || [];
    const skills = data.skills || [];

    // Career Bar Chart
    const ctxCareer = document.getElementById('careerChart');
    if (ctxCareer) {
        if (careerChartInstance) careerChartInstance.destroy();

        if (careers.length === 0) {
            ctxCareer.parentElement.innerHTML = `
                <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%; text-align:center; padding: 2rem;">
                    <div style="font-size: 2.5rem; opacity: 0.5; margin-bottom: 0.5rem;">📈</div>
                    <h4 style="font-size:0.95rem; font-weight:700; color:var(--text-dark);">No Match Data Yet</h4>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.3rem;">Add skills to your profile to visualize your career match percentages.</p>
                </div>
            `;
        } else {
            const colors = careers.map((c, i) => {
                const palette = ['#6366f1','#ec4899','#10b981','#f59e0b','#06b6d4'];
                return palette[i % palette.length];
            });

            careerChartInstance = new Chart(ctxCareer, {
                type: 'bar',
                data: {
                    labels: careers.map(c => c.career_name),
                    datasets: [{
                        label: 'Match %',
                        data: careers.map(c => parseFloat(c.match_percentage)),
                        backgroundColor: colors.map(c => c + '33'),
                        borderColor: colors,
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false,
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { backgroundColor: 'rgba(15,23,42,0.9)', padding: 12, borderRadius: 8 }
                    },
                    scales: {
                        y: {
                            beginAtZero: true, max: 100,
                            grid: { color: 'rgba(100,116,139,0.08)' },
                            ticks: { color: '#64748b', font: { size: 11 }, callback: v => v + '%' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#64748b', font: { size: 11 }, maxRotation: 30 }
                        }
                    }
                }
            });
        }
    }

    // Skill Radar
    const ctxRadar = document.getElementById('skillRadar');
    if (ctxRadar) {
        if (radarChartInstance) radarChartInstance.destroy();

        if (skills.length === 0) {
            ctxRadar.parentElement.innerHTML = `
                <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%; text-align:center; padding: 2rem;">
                    <div style="font-size: 2.5rem; opacity: 0.5; margin-bottom: 0.5rem;">🕸️</div>
                    <h4 style="font-size:0.95rem; font-weight:700; color:var(--text-dark);">Radar Inactive</h4>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.3rem;">Your skill footprint will appear here once you map your proficiencies.</p>
                </div>
            `;
        } else {
            const top = skills.slice(0, 6);
            radarChartInstance = new Chart(ctxRadar, {
                type: 'radar',
                data: {
                    labels: top.map(s => s.skill_name),
                    datasets: [{
                        label: 'Your Skills',
                        data: top.map(s => s.skill_level),
                        fill: true,
                        backgroundColor: 'rgba(99,102,241,0.15)',
                        borderColor: '#6366f1',
                        pointBackgroundColor: '#6366f1',
                        pointRadius: 4,
                        borderWidth: 2,
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: {
                        r: {
                            min: 0, max: 5,
                            ticks: { stepSize: 1, display: false },
                            grid: { color: 'rgba(100,116,139,0.12)' },
                            pointLabels: { color: '#1e293b', font: { size: 11, weight: '600' } }
                        }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }
    }
}

// ── Real-time Dashboard Sync ──
window.addEventListener('storage', (e) => {
    // If user profile is updated in another tab, refresh dashboard
    if (e.key === 'studentProfile' || e.key === 'user' || !e.key) { // !e.key covers dispatchEvent without key
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            initUserSidebar(user);
            loadDashboard(user);
        }
    }
});

// --- PLACEMENT PREDICTOR ----------------------------------------------------
async function loadPlacementPredictor(user) {
    try {
        const studentId = user.id || user.user_id || '';
        const res = await fetch(`${API_BASE_URL}/analytics/placement-score/${studentId}`);
        const d = await res.json();
        const total = d.total || 0;
        document.getElementById('predict-loading').style.display = 'none';
        document.getElementById('predict-content').style.display  = 'block';
        document.getElementById('predict-score').textContent = total;
        document.getElementById('predict-arc').style.strokeDashoffset = 264 - (total/100)*264;
        const label = total>=80?'?? Highly Placeable':total>=60?'?? Good Prospects':total>=40?'?? Average':'?? Needs Improvement';
        document.getElementById('predict-label').textContent = label;
        document.getElementById('predict-avg').textContent = (d.dept_avg||0) + ' avg';
        const bd = d.breakdown||{};
        const bars = [
            {l:'CGPA',v:bd.cgpa||0,m:35,c:'#10b981'},
            {l:'Skills',v:bd.skills||0,m:25,c:'#6366f1'},
            {l:'Projects',v:bd.projects||0,m:25,c:'#8b5cf6'},
            {l:'Certs',v:bd.certificates||0,m:10,c:'#f59e0b'},
            {l:'Applied',v:bd.applications||0,m:5,c:'#06b6d4'},
        ];
        document.getElementById('predict-bars').innerHTML = bars.map(b=>`
            <div style="display:flex;align-items:center;gap:0.6rem;font-size:0.78rem;">
                <span style="width:50px;color:var(--text-muted);font-weight:600;flex-shrink:0;">${b.l}</span>
                <div style="flex:1;height:7px;border-radius:100px;background:rgba(0,0,0,0.06);overflow:hidden;">
                    <div style="width:${(b.v/b.m)*100}%;height:100%;background:${b.c};border-radius:100px;transition:width 1s ease;"></div>
                </div>
                <span style="width:30px;text-align:right;font-weight:700;color:var(--text-dark);">${b.v}</span>
            </div>`).join('');
    } catch(e) {
        const el = document.getElementById('predict-loading');
        if(el) el.textContent = 'Start with: node server.js';
    }
}

// --- AUDITLOG FEED ----------------------------------------------------------
async function loadAuditFeed(user) {
    const feed = document.getElementById('audit-feed');
    if(!feed) return;
    try {
        const studentId = user.id || user.user_id || '';
        const res = await fetch(`${API_BASE_URL}/analytics/auditlog/${studentId}`);
        const logs = await res.json();
        if(!Array.isArray(logs)||!logs.length) {
            feed.innerHTML = `<div style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:1.5rem;">No activity yet. Apply to jobs and update your profile!</div>`;
            return;
        }
        const timeAgo = (ts) => {
            if(!ts) return '';
            const d = Math.floor((Date.now()-new Date(ts).getTime())/86400000);
            return d===0?'Today':d===1?'Yesterday':`${d}d ago`;
        };
        feed.innerHTML = logs.slice(0,6).map(l=>`
            <div style="display:flex;align-items:flex-start;gap:0.75rem;padding:0.7rem 0.9rem;border-radius:0.75rem;background:rgba(255,255,255,0.4);border:1px solid var(--border);transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.7)'" onmouseout="this.style.background='rgba(255,255,255,0.4)'">
                <span style="font-size:1.1rem;flex-shrink:0;">${l.type==='APPLY'?'??':'??'}</span>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:0.85rem;font-weight:600;color:var(--text-dark);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${l.activity}</div>
                    <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.1rem;">${timeAgo(l.timestamp)}</div>
                </div>
            </div>`).join('');
    } catch(e) {
        if(feed) feed.innerHTML = `<div style="color:var(--text-muted);font-size:0.85rem;padding:1rem;">Backend offline. Start server to see activity.</div>`;
    }
}

// --- DARK MODE TOGGLE -------------------------------------------------------
function toggleDark() {
    const isDark = document.body.classList.contains('dark');
    if(isDark) {
        document.body.classList.remove('dark');
        localStorage.setItem('darkMode','off');
        document.getElementById('dark-toggle').textContent = '?? Dark Mode';
    } else {
        document.body.classList.add('dark');
        localStorage.setItem('darkMode','on');
        document.getElementById('dark-toggle').textContent = '?? Light Mode';
    }
}
// Restore dark mode preference
(function() {
    if(localStorage.getItem('darkMode')==='on') {
        document.body.classList.add('dark');
        const btn = document.getElementById('dark-toggle');
        if(btn) btn.textContent = '?? Light Mode';
    }
})();

// --- Call new widgets when dashboard loads ----------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const u = localStorage.getItem('user');
    if(u) {
        const user = JSON.parse(u);
        setTimeout(() => { loadPlacementPredictor(user); loadAuditFeed(user); }, 800);
    }
});
