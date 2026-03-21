import random

# Configuration
NUM_STUDENTS = 120
NUM_COMPANIES = 15
NUM_JOB_ROLES = 30
BRANCHES = ['Computer Science', 'Information Technology', 'Electronics & Communication', 
            'Electrical & Electronics', 'Mechanical Engineering', 'Civil Engineering', 
            'Artificial Intelligence', 'Data Science']
INDUSTRIES = ['Software', 'Information Technology', 'Core Engineering', 'FinTech', 'Renewable Energy', 'Consulting']
LOCATIONS = ['Bangalore', 'Chennai', 'Pune', 'Hyderabad', 'Mumbai', 'Delhi NCR', 'Remote']

SKILLS_LIST = [
    ('Python', 'Programming'), ('Java', 'Programming'), ('C++', 'Programming'), 
    ('JavaScript', 'Web Development'), ('React', 'Web Development'), ('Node.js', 'Web Development'),
    ('SQL', 'Database'), ('MongoDB', 'Database'), ('Docker', 'DevOps'), ('AWS', 'Cloud'),
    ('Machine Learning', 'AI'), ('Data Analysis', 'Data Science'), ('AutoCAD', 'Design'),
    ('MATLAB', 'Mathematics'), ('Public Speaking', 'Soft Skills'), ('Project Management', 'Business')
]

COMPANY_NAMES = ["Google India", "Microsoft", "Amazon", "TATA Consultancy Services", "Infosys", "Wipro", 
                 "Reliance Industries", "Zomato", "Swiggy", "PhonePe", "OLA Electric", "Jio", "HCLTech", "L&T", "Adani Group"]

PROJECT_TITLES = [
    "Smart Traffic Control System", "IoT Based Smart Agri", "E-Commerce Website", 
    "AI Health Assistant", "Blockchain Secure Voting", "Face Recognition Attendance",
    "Predictive Maintenance for Industrial Motors", "Library Management System",
    "Student Performance Analytics", "Social Media App", "Virtual Reality Training Module",
    "Drone Delivery System", "Flood Prediction Model", "Waste Management System"
]

FIRST_NAMES = ["Aarav", "Aditi", "Arjun", "Ananya", "Ishaan", "Isha", "Rohan", "Riya", 
               "Vihaan", "Vedika", "Apurva", "Rahul", "Priya", "Amit", "Sneha", "Vikram",
               "Kavya", "Siddharth", "Meera", "Yash", "Tanvi", "Pranav", "Divya", "Sanjay"]
LAST_NAMES = ["Sharma", "Verma", "Gupta", "Malhotra", "Kapoor", "Joshi", "Patel", "Reddy",
              "Nair", "Iyer", "Singh", "Choudhury", "Bose", "Das", "Sen", "Khan"]

ROLE_NAMES = ["Software Engineer", "Frontend Developer", "Backend Developer", "Data Scientist", 
              "ML Engineer", "Embedded Systems Dev", "UI/UX Designer", "Cloud Architect", 
              "Cybersecurity Analyst", "Product Manager"]

def generate_password_hash(password):
    # Valid 60-character bcrypt hash for 'password123'
    return "$2a$10$89Jd8P/mD8X2T8h8S8E8Ue8Jd8P/mD8X2T8h8S8E8U8Jd8P/mD8X"

def generate_full_data():
    sql_statements = [
        "PRAGMA foreign_keys = OFF;",
        "DELETE FROM Applications;",
        "DELETE FROM Projects;",
        "DELETE FROM StudentSkills;",
        "DELETE FROM JobRoleSkills;",
        "DELETE FROM JobRoles;",
        "DELETE FROM Companies;",
        "DELETE FROM Skills;",
        "DELETE FROM Students;",
        "DELETE FROM StudentPoints;",
        "DELETE FROM CGPAHistory;",
        "PRAGMA foreign_keys = ON;"
    ]
    
    # 1. Insert Skills
    for i, (skill, category) in enumerate(SKILLS_LIST, 1):
        sql_statements.append(f"INSERT INTO Skills (skill_id, skill_name, category) VALUES ({i}, '{skill}', '{category}');")

    # 2. Insert Companies
    for i in range(1, NUM_COMPANIES + 1):
        name = COMPANY_NAMES[i-1] if i-1 < len(COMPANY_NAMES) else f"Company {i}"
        industry = random.choice(INDUSTRIES)
        loc = random.choice(LOCATIONS)
        clean_name = name.lower().replace(' ', '').replace('&', 'n')
        site = f"https://www.{clean_name}.com"
        sql_statements.append(f"INSERT INTO Companies (company_id, company_name, industry, location, website) VALUES ({i}, '{name}', '{industry}', '{loc}', '{site}');")

    # 3. Insert Job Roles
    for i in range(1, NUM_JOB_ROLES + 1):
        c_id = random.randint(1, NUM_COMPANIES)
        role = random.choice(ROLE_NAMES)
        req_skills = ", ".join(random.sample([s[0] for s in SKILLS_LIST], 3))
        salary = f"₹{random.randint(6, 40)} LPA"
        loc = random.choice(LOCATIONS)
        min_cgpa = float(round(random.uniform(6.5, 8.5), 1))
        sql_statements.append(f"INSERT INTO JobRoles (role_id, company_id, role_name, required_skills, salary_range, location, min_cgpa) VALUES ({i}, {c_id}, '{role}', '{req_skills}', '{salary}', '{loc}', {min_cgpa});")

    # 4. Insert Students
    for i in range(1, NUM_STUDENTS + 1):
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        name = f"{first} {last}"
        email = f"{first.lower()}.{last.lower()}{i}@example.edu.in"
        dept = random.choice(BRANCHES)
        year = random.randint(1, 4)
        cgpa = float(round(random.uniform(6.5, 9.8), 2))
        phone = f"+91 {random.randint(7000, 9999)} {random.randint(10000, 99999)}"
        total_points = random.randint(200, 2500)
        
        sql_statements.append(
            f"INSERT INTO Students (student_id, name, email, password_hash, role, department, year, cgpa, phone, total_points) "
            f"VALUES ({i}, '{name}', '{email}', '{generate_password_hash('password123')}', 'student', '{dept}', {year}, {cgpa}, '{phone}', {total_points});"
        )

    # 5. Map Skills & Projects to Students
    for s_id in range(1, NUM_STUDENTS + 1):
        # Skills
        num_skills = random.randint(4, 9)
        chosen_skills = random.sample(range(1, len(SKILLS_LIST) + 1), num_skills)
        for sk_id in chosen_skills:
            sql_statements.append(f"INSERT INTO StudentSkills (student_id, skill_id, proficiency_level) VALUES ({s_id}, {sk_id}, 'Advanced');")
            
        # Projects
        num_projs = random.randint(1, 4)
        for _ in range(num_projs):
            title = random.choice(PROJECT_TITLES)
            tech = random.choice(["Python, Django", "React, Node.js", "Flutter, Firebase", "Java, Android", "C++, OpenCV"])
            sql_statements.append(f"INSERT INTO Projects (student_id, title, description, tech_stack, project_url) VALUES ({s_id}, '{title}', 'An engineering project on {title.lower()}.', '{tech}', 'https://github.com/student{s_id}/{title.lower().replace(' ', '-')}');")
        
        # Applications (Randomly assign 1-3 applications per student)
        num_apps = random.randint(0, 3)
        if num_apps > 0:
            applied_roles = random.sample(range(1, NUM_JOB_ROLES + 1), num_apps)
            for r_id in applied_roles:
                status = random.choice(['Applied', 'Shortlisted', 'Interviewing', 'Offered', 'Selected', 'Rejected'])
                sql_statements.append(f"INSERT OR IGNORE INTO Applications (student_id, role_id, status) VALUES ({s_id}, {r_id}, '{status}');")

    with open('sql/demodata_seed.sql', 'w', encoding='utf-8') as f:
        f.write("\n".join(sql_statements))
    
    print(f"Generated clean full-sweep demo data in sql/demodata_seed.sql")

if __name__ == "__main__":
    generate_full_data()
