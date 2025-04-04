let quizzes = {};
let currentQuiz = {};
let flaggedQuestions = [];
let currentQuestionIndex = 0;
let quizTimer, globalTimer;
let remainingGlobalTime = 0;
let userAnswers = {};

let userScores = {};
try {
    userScores = JSON.parse(localStorage.getItem('userScores')) || {};
} catch (e) {
    console.error("Error loading scores from localStorage:", e);
    userScores = {};
}

async function loadQuiz(exam) {
    try {
        const response = await fetch(`./quizzes/${exam}.json`);
        if (!response.ok) throw new Error("Quiz not found");
        currentQuiz = await response.json();
        return currentQuiz;
    } catch (error) {
        console.error("Error loading quiz:", error);
    }
}

async function loadConceptMap(exam) {
    try {
        const conceptMapContainer = document.getElementById('concept-map');
        conceptMapContainer.innerHTML = ''; // Clear the concept map container

        const formattedExam = exam.toLowerCase().replace(/\s+/g, '_');
        const response = await fetch(`./concept_map/${formattedExam}_map.json`);
        if (!response.ok) throw new Error("Concept map unavailable");
        const data = await response.json();

        conceptMapContainer.innerHTML = `
            <div class="box">
                <h3>Concept Map: ${data.exam_name}</h3>
                <div class="concept-map-graph">
                    ${data.concept_map.map(concept => `
                        <div class="concept-node">
                            <div class="concept-title">${concept.concept}</div>
                            <div class="concept-explanation">${concept.explanation}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (error) {
        console.error("Error loading concept map:", error);
    }
}

function isTimeRemaining() {
    return remainingGlobalTime > 0;
}

function saveAnswers(index) {
    const selectedOptions = Array.from(
        document.querySelectorAll(`input[name="question${index}"]:checked`)
    ).map(el => el.value);

    if (selectedOptions.length > 0) {
        userAnswers[index] = selectedOptions;
    } else {
        delete userAnswers[index];
    }
}



// Modify the finishQuiz function to save scores
function finishQuiz() {
    clearInterval(globalTimer);
    clearInterval(quizTimer);

    const globalTimerElement = document.getElementById('global-timer');
    globalTimerElement.textContent = '0';

    const quizContainer = document.getElementById('quiz-container');

    let score = 0;
    currentQuiz.questions.forEach((question, index) => {
        const correctAnswers = Array.isArray(question.correct_answer)
            ? question.correct_answer
            : [question.correct_answer];

        const selectedLetters = (userAnswers[index] || []).map(opt => opt[0]).sort();
        if (JSON.stringify(selectedLetters) === JSON.stringify(correctAnswers.sort())) {
            score++;
        }
    });

    // Calculate percentage score
    const percentageScore = Math.round((score / currentQuiz.questions.length) * 100);
    
    // Save the score
    saveScore(currentQuiz.exam_name, percentageScore);
    
    // Format exam name for display
    const formattedExamName = currentQuiz.exam_name.replace(/_/g, ' ');
    
    // Display the score and progress chart
    quizContainer.innerHTML = `
        <h2>Quiz Completed!</h2>
        <h3>${formattedExamName} - Your Score: ${score}/${currentQuiz.questions.length} (${percentageScore}%)</h3>
        <div id="progress-chart-container" style="width: 100%; height: 300px; margin: 20px 0;"></div>
        <h4>Quiz Summary:</h4>
        ${currentQuiz.questions.map((question, idx) => {
            const correctAnswers = Array.isArray(question.correct_answer) ? question.correct_answer : [question.correct_answer];
            const userSelected = userAnswers[idx] || [];

            return `
                <div style="margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px;">
                    <strong>Q${idx + 1}:</strong> ${question.question}<br/>
                    <em>Your Answer(s):</em> ${userSelected.join(', ')}<br/>
                    <em>Correct Answer(s):</em> ${correctAnswers.join(', ')}<br/>
                    <em>Explanation:</em> ${question.explanation || "Explanation not provided."}<br/>
                    ${question.reference ? `<em>Reference:</em> <a href="${question.reference}" target="_blank">${question.reference}</a>` : ''}
                </div>`;
        }).join('')}
    `;

    // Render the progress chart
    renderProgressChart(currentQuiz.exam_name);

    // Clear the concept map container before loading a new one
    const conceptMapContainer = document.getElementById('concept-map');
    conceptMapContainer.innerHTML = '';

    loadConceptMap(currentQuiz.exam_name);
}

// Add these new functions to handle score tracking
function saveScore(examName, score) {
    if (!userScores[examName]) {
        userScores[examName] = [];
    }
    
    // Add the new score
    userScores[examName].push({
        date: new Date().toISOString(),
        score: score
    });
    
    // Keep only the last 10 scores
    if (userScores[examName].length > 10) {
        userScores[examName] = userScores[examName].slice(-10);
    }
    
    // Save to localStorage
    localStorage.setItem('userScores', JSON.stringify(userScores));
}

function renderProgressChart(examName) {
    const scoresData = userScores[examName] || [];
    
    if (scoresData.length === 0) {
        document.getElementById('progress-chart-container').innerHTML = 
            '<p>No previous scores to display. Complete more quizzes to track your progress!</p>';
        return;
    }
    
    // Prepare data for the chart
    const labels = scoresData.map((item, index) => {
        const date = new Date(item.date);
        return `Attempt ${index + 1} (${date.toLocaleDateString()})`;
    });
    const scores = scoresData.map(item => item.score);
    
    // Create canvas element for the chart
    const canvas = document.createElement('canvas');
    canvas.id = 'progress-chart';
    document.getElementById('progress-chart-container').innerHTML = '';
    document.getElementById('progress-chart-container').appendChild(canvas);
    
    // Create the chart using Chart.js
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Score (%)',
                data: scores,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Score (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Quiz Attempts with Dates'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: `${examName.replace(/_/g, ' ')} - Your Progress Over Last 10 Attempts`,
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const date = new Date(scoresData[context[0].dataIndex].date);
                            return `Attempt ${context[0].dataIndex + 1}`;
                        },
                        label: function(context) {
                            const date = new Date(scoresData[context.dataIndex].date);
                            return [
                                `Score: ${context.raw}%`,
                                `Date: ${date.toLocaleDateString()}`,
                                `Time: ${date.toLocaleTimeString()}`
                            ];
                        }
                    }
                }
            }
        }
    });
}


function displayQuestion(index) {
    if (!isTimeRemaining()) {
        finishQuiz();
        return;
    }

    if (index >= currentQuiz.questions.length) {
        if (flaggedQuestions.length > 0) {
            displayQuestion(flaggedQuestions.shift());
        } else {
            finishQuiz();
        }
        return;
    }

    clearInterval(quizTimer);
    const quizContainer = document.getElementById('quiz-container');
    const question = currentQuiz.questions[index];

    const inputType = Array.isArray(question.correct_answer) ? 'checkbox' : 'radio';
    const storedAnswers = userAnswers[index] || [];

    quizContainer.innerHTML = `
        <div class="question-container">
            <h4>Question ${index + 1}: ${question.question}</h4>
            ${question.options.map(option => {
                const isChecked = storedAnswers.includes(option) ? 'checked' : '';
                return `
                <label style="display: block; text-align: left;">
                    <input type="${inputType}" name="question${index}" value="${option}" ${isChecked}>
                    ${option}
                </label>
                `;
            }).join('')}

            <button onclick="flagQuestion(${index})">Flag</button>
            <button onclick="saveAnswers(${index}); nextQuestion(${index + 1});">Next</button>
            ${index > 0 ? `<button onclick="previousQuestion(${index - 1})">Previous</button>` : ''}
        </div>
        <div class="timer-container" id="timeElement">Time Left For Current Question: 60s</div>
    `;

    if (index === currentQuiz.questions.length - 1 && flaggedQuestions.length === 0) {
        quizContainer.innerHTML += `<button onclick="saveAnswers(${index}); endQuizNow();">End Quiz Now</button>`;
    }

    let questionTimeLeft = 60;
    const timeElement = document.getElementById('timeElement');
    quizTimer = setInterval(() => {
        if (!isTimeRemaining()) {
            finishQuiz();
            return;
        }
        questionTimeLeft--;
        timeElement.textContent = `Time Left For Current Question: ${questionTimeLeft}s`;
        if (questionTimeLeft <= 0) {
            saveAnswers(index);
            nextQuestion(index + 1);
        }
    }, 1000);
}

function previousQuestion(index) {
    if (!isTimeRemaining()) {
        finishQuiz();
        return;
    }
    saveAnswers(index + 1);
    if (index >= 0) displayQuestion(index);
}

function flagQuestion(index) {
    if (!flaggedQuestions.includes(index)) {
        flaggedQuestions.push(index);
    }
    nextQuestion(index + 1);
}

function nextQuestion(nextIndex) {
    if (!isTimeRemaining()) {
        finishQuiz();
        return;
    }

    if (nextIndex >= currentQuiz.questions.length) {
        if (flaggedQuestions.length > 0) {
            displayQuestion(flaggedQuestions.shift());
        } else {
            finishQuiz();
        }
        return;
    }

    displayQuestion(nextIndex);
}

function endQuizNow() {
    finishQuiz();
}

function startQuiz() {
    currentQuestionIndex = 0;
    flaggedQuestions = [];
    userAnswers = {};

    clearInterval(quizTimer);
    clearInterval(globalTimer);

    const globalTimerElement = document.getElementById('global-timer');
    globalTimerElement.textContent = currentQuiz.questions.length * 60;

    const questionCount = parseInt(document.getElementById('question-count').value, 10);
    const shuffledQuestions = currentQuiz.questions.sort(() => Math.random() - 0.5);
    currentQuiz.questions = shuffledQuestions.slice(0, questionCount);

    remainingGlobalTime = currentQuiz.questions.length * 60;

    globalTimer = setInterval(() => {
        remainingGlobalTime--;
        globalTimerElement.textContent = remainingGlobalTime;
        if (remainingGlobalTime <= 0) finishQuiz();
    }, 1000);

    // Clear the concept map container
    const conceptMapContainer = document.getElementById('concept-map');
    conceptMapContainer.innerHTML = '';

    displayQuestion(0);
}

async function fetchAvailableExams() {
    try {
        const response = await fetch('./quizzes/exam_list.json');
        if (!response.ok) throw new Error("Failed to fetch exams");
        const data = await response.json();
        return data.exams;
    } catch (error) {
        console.error("Error fetching exams:", error);
        return [];
    }
}

window.onload = async () => {
    const examSelect = document.getElementById('examSelect');
    const exams = await fetchAvailableExams();
    exams.forEach(exam => {
        const option = document.createElement('option');
        option.value = exam;
        option.textContent = exam.replace(/_/g, ' ').toUpperCase();
        examSelect.appendChild(option);
    });

    document.getElementById('startQuiz').addEventListener('click', async () => {
        const selectedExam = examSelect.value;
        if (!selectedExam) return alert("Select an exam first.");

        await loadQuiz(selectedExam);
        if (!currentQuiz.questions || currentQuiz.questions.length === 0) {
            alert("Quiz loading failed.");
            return;
        }
        startQuiz();
    });
};
