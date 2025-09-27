// components/TestComponent.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { TestData, getTestData } from '@/lib/testData';
import { recordTestPass } from '@/lib/db';

interface TestResult {
  lessonId: number;
  answers: number[]; // индексы выбранных ответов
  correctAnswers: number; // количество правильных ответов
  completed: boolean;
  completedAt: number; // timestamp
}

interface TestComponentProps {
  lessonId: number;
  onTestComplete?: (result: TestResult) => void;
}

/* === user-scoped localStorage namespace — как в lesson page === */
function getTgIdSync(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wa = (window as any)?.Telegram?.WebApp;
    const id = wa?.initDataUnsafe?.user?.id;
    return (id ?? null)?.toString?.() ?? null;
  } catch {
    return null;
  }
}

function ns(key: string): string {
  const id = getTgIdSync();
  return id ? `${key}:tg_${id}` : `${key}:anon`;
}

export default function TestComponent({ lessonId, onTestComplete }: TestComponentProps) {
  const [testData, setTestData] = useState<TestData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // Загружаем данные теста
  useEffect(() => {
    const data = getTestData(lessonId);
    setTestData(data);
    
    // Загружаем сохранённые результаты
    try {
      const saved = localStorage.getItem(ns(`test_result_${lessonId}`));
      if (saved) {
        const result: TestResult = JSON.parse(saved);
        setTestResult(result);
        setSelectedAnswers(result.answers);
        setIsCompleted(result.completed);
        if (result.completed) {
          setShowResults(true);
        }
      }
    } catch {
      // Игнорируем ошибки парсинга
    }
  }, [lessonId]);

  // Если тест уже пройден, показываем краткую информацию
  if (isCompleted && !showResults) {
    return (
      <div className="glass p-4 rounded-2xl w-full">
        <div className="text-center mb-4">
          <div className="text-2xl mb-2">✅</div>
          <h3 className="text-lg font-bold mb-2">Тест уже пройден</h3>
          <div className="text-sm text-[var(--muted)] mb-4">
            Вы можете пройти тест заново, чтобы улучшить результат
          </div>
        </div>
        
        <button
          onClick={() => setShowResults(true)}
          className="w-full h-11 rounded-xl bg-[var(--brand)] text-black font-semibold text-sm
                     flex items-center justify-center gap-2 hover:brightness-105 transition-all mb-3"
        >
          <span>👁️</span>
          <span>Посмотреть результаты</span>
        </button>
        
        <button
          onClick={restartTest}
          className="w-full h-11 rounded-xl bg-[var(--surface)] border border-[var(--border)] 
                     text-[var(--fg)] font-semibold text-sm flex items-center justify-center gap-2 
                     hover:bg-[var(--brand)]/10 transition-all"
        >
          <span>🔄</span>
          <span>Пройти заново</span>
        </button>
      </div>
    );
  }

  // Обработка выбора ответа
  const handleAnswerSelect = (answerIndex: number) => {
    if (showResults || isCompleted) return;
    
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);

    // Haptic feedback: лёгкий отклик при выборе
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const h = (window as any)?.Telegram?.WebApp?.HapticFeedback;
      h?.impactOccurred?.('light');
    } catch {}
  };

  // Переход к следующему вопросу
  const handleNext = () => {
    if (currentQuestion < (testData?.questions.length || 0) - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Завершаем тест
      finishTest();
    }
  };

  // Переход к предыдущему вопросу
  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  // Завершение теста
  const finishTest = () => {
    if (!testData) return;

    const correctAnswers = testData.questions.reduce((count, question, index) => {
      return count + (selectedAnswers[index] === question.correctAnswer ? 1 : 0);
    }, 0);

    const result: TestResult = {
      lessonId,
      answers: selectedAnswers,
      correctAnswers,
      completed: true,
      completedAt: Date.now()
    };

    setTestResult(result);
    setIsCompleted(true);
    setShowResults(true);

    // Сохраняем результат
    try {
      localStorage.setItem(ns(`test_result_${lessonId}`), JSON.stringify(result));
    } catch {
      // Игнорируем ошибки сохранения
    }

    onTestComplete?.(result);

    // Отправим событие в БД (процент и детали)
    try {
      const percentage = Math.round((correctAnswers / totalQuestions) * 100);
      console.log('🧪 Test completed, calling recordTestPass...', { 
        lessonId, 
        correctAnswers, 
        totalQuestions, 
        percentage 
      });
      await recordTestPass({ lesson_id: lessonId, correct_answers: correctAnswers, total_questions: totalQuestions, percentage });
      console.log('🧪 recordTestPass call completed');
    } catch (e) {
      console.error('❌ Error in recordTestPass:', e);
    }

    // Haptic feedback: success/error
    try {
      const percentage = Math.round((result.correctAnswers / totalQuestions) * 100);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const h = (window as any)?.Telegram?.WebApp?.HapticFeedback;
      if (percentage >= 60) {
        h?.notificationOccurred?.('success');
      } else {
        h?.notificationOccurred?.('error');
      }
    } catch {}
  };

  // Перезапуск теста
  const restartTest = () => {
    setCurrentQuestion(0);
    setSelectedAnswers([]);
    setShowResults(false);
    setTestResult(null);
    setIsCompleted(false);
    
    // Удаляем сохранённый результат
    try {
      localStorage.removeItem(ns(`test_result_${lessonId}`));
    } catch {
      // Игнорируем ошибки
    }
  };

  if (!testData) {
    return (
      <div className="glass p-4 rounded-2xl w-full text-center text-[var(--muted)]">
        <div className="text-lg mb-2">❌</div>
        <div>Тест для этого урока не найден</div>
      </div>
    );
  }

  const question = testData.questions[currentQuestion];
  const totalQuestions = testData.questions.length;
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;

  // Если тест завершён, показываем результаты
  if (showResults && testResult) {
    const correctPercentage = Math.round((testResult.correctAnswers / totalQuestions) * 100);
    
    // Определяем оценку по проценту
    let grade = '';
    let gradeColor = '';
    let gradeEmoji = '';
    
    if (correctPercentage >= 80) {
      grade = 'Отлично!';
      gradeColor = 'text-green-400';
      gradeEmoji = '🌟';
    } else if (correctPercentage >= 60) {
      grade = 'Хорошо!';
      gradeColor = 'text-yellow-400';
      gradeEmoji = '👍';
    } else {
      grade = 'Нужно повторить';
      gradeColor = 'text-orange-400';
      gradeEmoji = '📚';
    }
    
    return (
      <div className="glass p-4 rounded-2xl w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">{gradeEmoji}</div>
          <h3 className="text-xl font-bold mb-2">Тест завершён!</h3>
          <div className={`text-lg font-semibold mb-2 ${gradeColor}`}>
            {grade}
          </div>
          <div className="text-sm text-[var(--muted)] mb-4">
            Правильных ответов: {testResult.correctAnswers} из {totalQuestions}
          </div>
          <div className="text-3xl font-bold text-[var(--brand)] mb-4">
            {correctPercentage}%
          </div>
          
          {/* Круговая диаграмма прогресса */}
          <div className="relative w-20 h-20 mx-auto mb-4">
            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-[var(--surface)]"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-[var(--brand)]"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeDasharray={`${correctPercentage}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
          </div>
        </div>

        {/* Детальные результаты по вопросам */}
        <div className="space-y-3 mb-6">
          {testData.questions.map((q, index) => {
            const userAnswer = testResult.answers[index];
            const isCorrect = userAnswer === q.correctAnswer;
            const isAnswered = userAnswer !== undefined;
            
            return (
              <div 
                key={q.id} 
                className="p-3 rounded-xl border border-[var(--border)] fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-sm font-medium mb-2 flex items-center gap-2">
                  <span className="text-lg">
                    {isCorrect ? '✅' : '❌'}
                  </span>
                  <span>Вопрос {index + 1}: {q.question}</span>
                </div>
                <div className="space-y-1">
                  {q.options.map((option, optionIndex) => {
                    let bgColor = 'bg-[var(--surface)]';
                    let textColor = 'text-[var(--fg)]';
                    let borderColor = 'border-[var(--border)]';
                    
                    if (isAnswered) {
                      if (optionIndex === q.correctAnswer) {
                        bgColor = 'bg-green-500/20';
                        textColor = 'text-green-400';
                        borderColor = 'border-green-500';
                      } else if (optionIndex === userAnswer && !isCorrect) {
                        bgColor = 'bg-red-500/20';
                        textColor = 'text-red-400';
                        borderColor = 'border-red-500';
                      }
                    }
                    
                    return (
                      <div
                        key={optionIndex}
                        className={`p-2 rounded-lg border ${bgColor} ${textColor} ${borderColor} text-sm transition-all`}
                      >
                        {option}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={restartTest}
          className="w-full h-11 rounded-xl bg-[var(--brand)] text-black font-semibold text-sm
                     flex items-center justify-center gap-2 hover:brightness-105 transition-all
                     hover:scale-105 active:scale-95 fade-in"
          style={{ animationDelay: `${testData.questions.length * 100 + 200}ms` }}
        >
          <span>🔄</span>
          <span>Пройти заново</span>
        </button>
      </div>
    );
  }

  return (
    <div className="glass p-4 rounded-2xl w-full">
      {/* Заголовок теста */}
      <div className="text-center mb-4">
        <div className="text-lg font-bold mb-1">🧠 Тест по уроку</div>
        <div className="text-sm text-[var(--muted)]">Проверьте свои знания</div>
      </div>

      {/* Прогресс-бар */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-[var(--muted)] mb-2">
          <span>Вопрос {currentQuestion + 1} из {totalQuestions}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 bg-[var(--surface)] rounded-full overflow-hidden border border-[var(--border)]">
          <div 
            className="h-full bg-gradient-to-r from-[var(--brand)] to-[var(--brand-200)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Вопрос */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 leading-relaxed">
          {question.question}
        </h3>
        
        {/* Варианты ответов */}
        <div className="space-y-2">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswers[currentQuestion] === index;
            const isAnswered = selectedAnswers[currentQuestion] !== undefined;
            
            let bgColor = 'bg-[var(--surface)]';
            let borderColor = 'border-[var(--border)]';
            let textColor = 'text-[var(--fg)]';
            
            if (isAnswered) {
              if (index === question.correctAnswer) {
                bgColor = 'bg-green-500/20';
                borderColor = 'border-green-500';
                textColor = 'text-green-400';
              } else if (index === selectedAnswers[currentQuestion] && index !== question.correctAnswer) {
                bgColor = 'bg-red-500/20';
                borderColor = 'border-red-500';
                textColor = 'text-red-400';
              }
            } else if (isSelected) {
              bgColor = 'bg-[var(--brand)]/20';
              borderColor = 'border-[var(--brand)]';
              textColor = 'text-[var(--brand)]';
            }
            
            return (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={isAnswered}
                className={`w-full p-3 rounded-xl border text-left transition-all duration-200
                           ${bgColor} ${borderColor} ${textColor}
                           ${!isAnswered ? 'hover:bg-[var(--brand)]/10 hover:border-[var(--brand)]/50 hover:scale-[1.02]' : ''}
                           ${isAnswered ? 'cursor-default' : 'cursor-pointer'}
                           ${isSelected && !isAnswered ? 'ring-2 ring-[var(--brand)]/30' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                                 ${isSelected ? 'bg-[var(--brand)] border-[var(--brand)] scale-110' : 'border-[var(--border)]'}`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-black animate-pulse" />}
                  </div>
                  <span className="text-sm font-medium">{option}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Навигация */}
      <div className="flex gap-2">
        <button
          onClick={handlePrev}
          disabled={currentQuestion === 0}
          className="flex-1 h-11 rounded-xl bg-[var(--surface)] border border-[var(--border)]
                     font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span>←</span>
          <span>Назад</span>
        </button>
        
        <button
          onClick={handleNext}
          disabled={selectedAnswers[currentQuestion] === undefined}
          className="flex-1 h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2
                     disabled:opacity-50 bg-[var(--brand)] text-black"
        >
          <span>{currentQuestion === totalQuestions - 1 ? 'Завершить' : 'Далее'}</span>
          <span>{currentQuestion === totalQuestions - 1 ? '✓' : '→'}</span>
        </button>
      </div>
    </div>
  );
}
