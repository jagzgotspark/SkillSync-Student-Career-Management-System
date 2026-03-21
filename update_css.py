import re

css_path = 'frontend/src/style.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# 1. Update variables and body
css = re.sub(
    r':root \{.*?\n\}[\s\n]*\* \{.*?\n\}[\s\n]*body \{.*?\}',
    '''/* Reset & Variables */
:root {
    --primary: #6366f1;
    --primary-light: #818cf8;
    --primary-dark: #4f46e5;
    
    --secondary: #ec4899;
    --accent: #10b981;
    
    --bg-main: #050b1a;
    --bg-card: rgba(255, 255, 255, 0.04);
    
    --text-dark: #f1f5f9;
    --text-muted: #94a3b8;
    --text-light: #ffffff;
    
    --border: rgba(255, 255, 255, 0.08);
    
    --shadow-sm: 0 4px 6px rgba(0,0,0,0.1);
    --shadow-md: 0 10px 15px rgba(0,0,0,0.2);
    --shadow-lg: 0 20px 25px rgba(0,0,0,0.3);
    --shadow-glow: 0 0 20px rgba(99, 102, 241, 0.4);
    
    --radius-md: 0.8rem;
    --radius-lg: 1.2rem;
    --radius-xl: 1.5rem;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Inter', sans-serif;
}

body {
    background-color: var(--bg-main);
    background-image: 
        radial-gradient(circle at 15% 50%, rgba(99,102,241,0.08), transparent 25%),
        radial-gradient(circle at 85% 30%, rgba(236,72,153,0.08), transparent 25%);
    background-attachment: fixed;
    color: var(--text-dark);
    display: flex;
    min-height: 100vh;
    overflow-x: hidden;
}''',
    css,
    flags=re.DOTALL
)

# 2. Update Sidebar
css = re.sub(
    r'\.sidebar \{[^}]+\}',
    '''.sidebar {
    width: 80px;
    background: rgba(15, 23, 42, 0.8);
    backdrop-filter: blur(20px);
    border-right: 1px solid var(--border);
    color: var(--text-light);
    display: flex;
    flex-direction: column;
    position: fixed;
    height: 100vh;
    z-index: 50;
    box-shadow: var(--shadow-lg);
    transition: width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
    overflow: hidden;
    white-space: nowrap;
}

.sidebar:hover {
    width: 260px;
}''',
    css
)

# logo container
css = css.replace('.logo-container {', '.logo-container {\n    overflow: hidden;')
css += '''\n
.logo-container h2 { opacity: 0; transition: opacity 0.3s; }
.sidebar:hover .logo-container h2 { opacity: 1; }
.admin-info { opacity: 0; transition: opacity 0.3s; }
.sidebar:hover .admin-info { opacity: 1; }
'''

# 3. Main Content
css = re.sub(
    r'\.main-content \{[^}]+\}',
    '''.main-content {
    flex: 1;
    margin-left: 80px;
    padding: 2rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    transition: margin-left 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}''',
    css
)

# 4. Cards Glassy
css = re.sub(
    r'\.card \{[^}]+\}',
    '''.card {
    background: var(--bg-card);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: var(--radius-xl);
    padding: 1.5rem;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border);
    transition: transform 0.4s ease, box-shadow 0.4s ease, border-color 0.4s ease;
    display: flex;
    flex-direction: column;
}''',
    css
)

css = re.sub(
    r'\.card:hover \{[^}]+\}',
    '''.card:hover {
    transform: translateY(-6px);
    box-shadow: var(--shadow-lg), 0 0 20px rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.3);
}''',
    css
)

# 5. Fix form elements for dark mode
css = re.sub(
    r'select \{[\s\S]*?\}',
    '''select {
    appearance: none;
    background: rgba(0,0,0,0.2);
    border: 1px solid var(--border);
    padding: 0.75rem 3rem;
    border-radius: 100px;
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--text-dark);
    box-shadow: var(--shadow-sm);
    cursor: pointer;
    outline: none;
    transition: all 0.3s;
    backdrop-filter: blur(8px);
}
select option { background: #0f172a; color: white; }
''',
    css, count=1
)

css = re.sub(
    r'\.list-item \{[\s\S]*?\}',
    '''.list-item {
    background: rgba(0,0,0,0.2);
    border: 1px solid rgba(255,255,255,0.05);
    padding: 1rem;
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transition: transform 0.3s, background 0.3s;
}

.list-item:hover {
    transform: translateX(4px);
    background: rgba(255,255,255,0.05);
}''',
    css, count=1
)

css = re.sub(
    r'\.intern-card \{[\s\S]*?\}',
    '''.intern-card {
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 1.5rem;
    text-align: center;
    transition: all 0.3s cubic-bezier(0.1, 0.8, 0.2, 1);
    background: var(--bg-card);
}''',
    css, count=1
)

css = css.replace('.glass-card {\n    background: rgba(255,255,255,0.7);', '.glass-card {\n    background: rgba(0,0,0,0.2);')

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)
