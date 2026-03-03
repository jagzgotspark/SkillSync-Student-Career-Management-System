CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'mentor', 'admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Students (
    student_id INT PRIMARY KEY,
    department VARCHAR(100) NOT NULL,
    year INT CHECK (year BETWEEN 1 AND 4),
    cgpa DECIMAL(3,2) CHECK (cgpa BETWEEN 0 AND 10),
    FOREIGN KEY (student_id) REFERENCES Users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE Skills (
    skill_id INT AUTO_INCREMENT PRIMARY KEY,
    skill_name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100)
);

CREATE TABLE Student_Skills (
    student_id INT,
    skill_id INT,
    skill_level INT CHECK (skill_level BETWEEN 1 AND 5),
    PRIMARY KEY (student_id, skill_id),
    FOREIGN KEY (student_id) REFERENCES Students(student_id)
        ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES Skills(skill_id)
        ON DELETE CASCADE
);

CREATE TABLE Careers (
    career_id INT AUTO_INCREMENT PRIMARY KEY,
    career_name VARCHAR(100) UNIQUE NOT NULL,
    average_salary INT,
    growth_rate DECIMAL(5,2)
);

CREATE TABLE Career_Skills (
    career_id INT,
    skill_id INT,
    required_level INT CHECK (required_level BETWEEN 1 AND 5),
    PRIMARY KEY (career_id, skill_id),
    FOREIGN KEY (career_id) REFERENCES Careers(career_id)
        ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES Skills(skill_id)
        ON DELETE CASCADE
);