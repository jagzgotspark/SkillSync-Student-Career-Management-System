/**
 * SkillSync Interview Engine
 * Simulates a technical/HR interview based on student department.
 */

const INTERVIEW_QUESTIONS = {
    'CSE': [
        "What is the difference between a Process and a Thread?",
        "Explain the Big O complexity of searching in a Balanced Binary Search Tree.",
        "How does a REST API handle state across different requests?",
        "What are the ACID properties in a Database Management System?",
        "Explain the concept of Virtual Memory and why it's used."
    ],
    'CSBS': [
        "Explain the relationship between Business Process Mapping and System Design.",
        "How do you calculate the ROI of a new software implementation?",
        "What is the role of Big Data in Strategic Decision Making?",
        "Explain the concept of Agile Scrum and its benefits to a business.",
        "How do you ensure data privacy while maintaining business transparency?"
    ],
    'ECE': [
        "What is the difference between a Microprocessor and a Microcontroller?",
        "Explain the working principle of a P-N Junction Diode.",
        "What is Pulse Code Modulation and where is it primarily used?",
        "How do you reduce noise in a high-frequency analog circuit?",
        "What are the advantages of using FPGA over traditional ASICs?"
    ],
    'DEFAULT': [
        "Tell me about a challenging technical project you've worked on.",
        "How do you stay updated with the latest trends in your field?",
        "Describe a time you had to work in a team to solve a complex problem.",
        "Where do you see yourself in the next 5 years professionally?",
        "Why should a company hire you over other candidates with similar skills?"
    ]
};

let currentQIndex = 0;
let interviewQuestions = [];
let userAnswers = [];
let interviewTimer = null;
let secondsElapsed = 0;

function openInterviewModal() {
    const modal = document.getElementById('interview-modal');
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};
    const dept = user.department || 'CSE';
    
    // Update dynamic text
    const setupText = document.querySelector('#interview-setup p');
    if (setupText) setupText.textContent = `I will ask you 5 technical questions based on your department (${dept}). Answer them to get your readiness score.`;

    // Reset state
    currentQIndex = 0;
    userAnswers = [];
    secondsElapsed = 0;
    
    // Setup UI
    document.getElementById('interview-setup').style.display = 'block';
    document.getElementById('interview-running').style.display = 'none';
    document.getElementById('interview-result').style.display = 'none';
    
    modal.style.display = 'block';
}

function closeInterviewModal() {
    document.getElementById('interview-modal').style.display = 'none';
    if (interviewTimer) clearInterval(interviewTimer);
}

function startInterview() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const dept = user.department || 'CSE';
    
    interviewQuestions = INTERVIEW_QUESTIONS[dept] || INTERVIEW_QUESTIONS['DEFAULT'];
    
    document.getElementById('interview-setup').style.display = 'none';
    document.getElementById('interview-running').style.display = 'block';
    
    showQuestion();
    startTimer();
}

function startTimer() {
    if (interviewTimer) clearInterval(interviewTimer);
    secondsElapsed = 0;
    interviewTimer = setInterval(() => {
        secondsElapsed++;
        const mins = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
        const secs = (secondsElapsed % 60).toString().padStart(2, '0');
        document.getElementById('interview-timer').textContent = `${mins}:${secs}`;
    }, 1000);
}

function showQuestion() {
    const progress = ((currentQIndex) / interviewQuestions.length) * 100;
    const progressEl = document.getElementById('interview-progress');
    if (progressEl) progressEl.style.width = `${progress}%`;

    document.getElementById('question-count').textContent = `Question ${currentQIndex + 1} / ${interviewQuestions.length}`;
    document.getElementById('current-question').textContent = interviewQuestions[currentQIndex];
    document.getElementById('interview-answer').value = '';
    document.getElementById('interview-answer').focus();
    
    if (currentQIndex === interviewQuestions.length - 1) {
        document.getElementById('next-q-btn').textContent = "FINISH DRILL";
    } else {
        document.getElementById('next-q-btn').textContent = "SUBMIT ANSWER";
    }
}

function nextQuestion() {
    const ans = document.getElementById('interview-answer').value.trim();
    if (!ans) {
        alert("Please provide an answer before continuing.");
        return;
    }
    
    userAnswers.push(ans);
    currentQIndex++;
    
    if (currentQIndex < interviewQuestions.length) {
        showQuestion();
    } else {
        finishInterview();
    }
}

function finishInterview() {
    clearInterval(interviewTimer);
    document.getElementById('interview-running').style.display = 'none';
    document.getElementById('interview-result').style.display = 'block';
    
    // Calculate a dynamic "Readiness Score" based on answer length and keywords (simulated AI)
    let score = 0;
    const keywords = ['explain', 'system', 'process', 'using', 'because', 'concept', 'example', 'implementation'];
    
    userAnswers.forEach(ans => {
        // Simple heuristic: length + keywords
        score += Math.min(15, ans.split(' ').length / 5);
        keywords.forEach(kw => {
            if (ans.toLowerCase().includes(kw)) score += 2;
        });
    });
    
    const finalScore = Math.min(98, Math.max(45, Math.floor(score + (Math.random() * 20))));
    
    // Animate score counting up
    let displayScore = 0;
    const scoreEl = document.getElementById('readiness-score');
    const interval = setInterval(() => {
        if (displayScore >= finalScore) {
            clearInterval(interval);
        } else {
            displayScore++;
            scoreEl.textContent = `${displayScore}%`;
        }
    }, 20);

    const feedback = finalScore > 85 ? "Exceptional performance! Your technical depth and articulation are interview-ready for top-tier firms. Keep refining your specific examples." :
                     finalScore > 70 ? "Great job! You have a solid grasp of core concepts. To reach the next level, try to include more industry-standard terminology in your explanations." :
                                       "Solid effort. We recommend focusing on quantifying your technical achievements and deepening your core theory knowledge through our analytics modules.";
                                       
    document.getElementById('result-feedback').textContent = feedback;
    document.getElementById('result-emoji').textContent = finalScore > 85 ? '🏆' : (finalScore > 70 ? '💪' : '📚');
    
    // Final progress bar update
    const progressEl = document.getElementById('interview-progress');
    if (progressEl) progressEl.style.width = `100%`;
}
