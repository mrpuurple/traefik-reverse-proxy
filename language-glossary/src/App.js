import React, { useState, useEffect } from 'react';
import './App.css';
import WordTest from './components/WordTest';
import Summary from './components/Summary';

// Sample word list (English to Spanish for demo)
const WORD_LIST = [
  { english: 'hello', spanish: 'hola' },
  { english: 'goodbye', spanish: 'adiós' },
  { english: 'thank you', spanish: 'gracias' },
  { english: 'please', spanish: 'por favor' },
  { english: 'yes', spanish: 'sí' },
  { english: 'no', spanish: 'no' },
  { english: 'water', spanish: 'agua' },
  { english: 'food', spanish: 'comida' },
  { english: 'friend', spanish: 'amigo' },
  { english: 'house', spanish: 'casa' },
];

function App() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);

  useEffect(() => {
    setStartTime(new Date());
  }, []);

  const handleAnswer = (word, userAnswer, isCorrect) => {
    const newAnswers = [...answers, { word, userAnswer, isCorrect, correctAnswer: word.spanish }];
    setAnswers(newAnswers);

    if (currentWordIndex + 1 >= WORD_LIST.length) {
      setIsComplete(true);
      setEndTime(new Date());
    } else {
      setCurrentWordIndex(currentWordIndex + 1);
    }
  };

  const handleRestart = () => {
    setCurrentWordIndex(0);
    setAnswers([]);
    setIsComplete(false);
    setStartTime(new Date());
    setEndTime(null);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🌍 Language Glossary</h1>
        <p className="subtitle">Test Your Language Skills</p>
      </header>

      <main className="App-main">
        {!isComplete ? (
          <WordTest
            word={WORD_LIST[currentWordIndex]}
            wordNumber={currentWordIndex + 1}
            totalWords={WORD_LIST.length}
            onAnswer={handleAnswer}
          />
        ) : (
          <Summary
            answers={answers}
            totalWords={WORD_LIST.length}
            startTime={startTime}
            endTime={endTime}
            onRestart={handleRestart}
          />
        )}
      </main>

      <footer className="App-footer">
        <p>English → Spanish Practice</p>
      </footer>
    </div>
  );
}

export default App;
