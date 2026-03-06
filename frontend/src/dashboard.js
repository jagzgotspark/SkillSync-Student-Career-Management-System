async function loadDashboard(){

    const response = await fetch("http://127.0.0.1:3001/api/students/1/dashboard");
    const data = await response.json();

    document.getElementById("student-info").innerHTML =
        `<b>Name:</b> ${data.student.name}<br>
         <b>Department:</b> ${data.student.department}<br>
         <b>Year:</b> ${data.student.year}`;

    const skillsList = document.getElementById("skills");
    skillsList.innerHTML = "";

    data.skills.forEach(skill => {
        const li = document.createElement("li");
        li.innerText = skill.skill_name + " (Level " + skill.skill_level + ")";
        skillsList.appendChild(li);
    });

    const matchList = document.getElementById("career-match");
    matchList.innerHTML = "";

    data.career_match.forEach(career => {
        const li = document.createElement("li");
        li.innerText = career.career_name + " - " + career.match_percentage + "%";
        matchList.appendChild(li);
    });
}