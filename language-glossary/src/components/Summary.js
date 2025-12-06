import React from 'react';
import './Summary.css';

function Summary({ answers, totalWords, startTime, endTime, onRestart }) {
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const percentage = Math.round((correctCount / totalWords) * 100);
  const timeTaken = Math.round((endTime - startTime) / 1000); // seconds

  const getGrade = () => {
    if (percentage === 100) return { grade: 'A+', emoji: '🏆', message: 'Perfect!' };
    if (percentage >= 90) return { grade: 'A', emoji: '🌟', message: 'Excellent!' };
    if (percentage >= 80) return { grade: 'B', emoji: '👏', message: 'Great job!' };
    if (percentage >= 70) return { grade: 'C', emoji: '👍', message: 'Good effort!' };
    if (percentage >= 60) return { grade: 'D', emoji: '💪', message: 'Keep practicing!' };
    return { grade: 'F', emoji: '📚', message: 'Study more!' };
  };

  const gradeInfo = getGrade();

  return (
    <div className="summary">
      <div className="summary-header">
        <div className="grade-circle">
          <div className="grade-emoji">{gradeInfo.emoji}</div>
          <div className="grade-text">{gradeInfo.grade}</div>
        </div>
        <h2>{gradeInfo.message}</h2>
        <div className="score-display">
          <span className="score-number">{correctCount}</span>
          <span className="score-divider">/</span>
          <span className="score-total">{totalWords}</span>
        </div>
        <div className="percentage">{percentage}% Correct</div>
        <div className="time-taken">⏱️ Completed in {timeTaken} seconds</div>
      </div>

      <div className="results-list">
        <h3>Review Your Answers</h3>
        {answers.map((answer, index) => (
          <div
            key={index}
            className={`result-item ${answer.isCorrect ? 'correct' : 'incorrect'}`}
          >
            <div className="result-number">{index + 1}</div>
            <div className="result-content">
              <div className="result-word">{answer.word.english}</div>
              <div className="result-answers">
                <div className="result-row">
                  <span className="result-label">Your answer:</span>
                  <span className={`result-value ${answer.isCorrect ? 'correct-text' : 'incorrect-text'}`}>
                    {answer.userAnswer || '(no answer)'}
                  </span>
                </div>
                {!answer.isCorrect && (
                  <div className="result-row">
                    <span className="result-label">Correct answer:</span>
                    <span className="result-value correct-text">
                      {answer.correctAnswer}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="result-icon">
              {answer.isCorrect ? '✓' : '✗'}
            </div>
          </div>
        ))}
      </div>

      <button onClick={onRestart} className="btn btn-restart">
        ↻ Try Again
      </button>
    </div>
  );
}

export default Summary;
