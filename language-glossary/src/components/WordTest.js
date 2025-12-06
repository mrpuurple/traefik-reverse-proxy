import React, { useState } from 'react';
import './WordTest.css';

function WordTest({ word, wordNumber, totalWords, onAnswer }) {
  const [userInput, setUserInput] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const normalizeString = (str) => {
    return str
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remove accents for comparison
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const normalized = normalizeString(userInput);
    const correctNormalized = normalizeString(word.spanish);
    const correct = normalized === correctNormalized;

    setIsCorrect(correct);
    setShowFeedback(true);
  };

  const handleNext = () => {
    onAnswer(word, userInput, isCorrect);
    setUserInput('');
    setShowFeedback(false);
    setIsCorrect(false);
  };

  return (
    <div className="word-test">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${(wordNumber / totalWords) * 100}%` }}
        ></div>
      </div>

      <div className="word-counter">
        Word {wordNumber} of {totalWords}
      </div>

      <div className="word-card">
        <div className="word-prompt">
          <span className="label">Translate to Spanish:</span>
          <h2 className="word-english">{word.english}</h2>
        </div>

        {!showFeedback ? (
          <form onSubmit={handleSubmit} className="answer-form">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your answer..."
              className="answer-input"
              autoFocus
              autoComplete="off"
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!userInput.trim()}
            >
              Check Answer
            </button>
          </form>
        ) : (
          <div className={`feedback ${isCorrect ? 'correct' : 'incorrect'}`}>
            <div className="feedback-icon">
              {isCorrect ? '✓' : '✗'}
            </div>
            <div className="feedback-message">
              {isCorrect ? (
                <>
                  <h3>Correct!</h3>
                  <p className="feedback-answer">"{word.spanish}" is right!</p>
                </>
              ) : (
                <>
                  <h3>Not quite...</h3>
                  <p className="feedback-answer">
                    You wrote: <span className="user-answer">"{userInput}"</span>
                  </p>
                  <p className="feedback-answer">
                    Correct answer: <span className="correct-answer">"{word.spanish}"</span>
                  </p>
                </>
              )}
            </div>
            <button
              onClick={handleNext}
              className="btn btn-next"
            >
              {wordNumber === totalWords ? 'See Results' : 'Next Word →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default WordTest;
