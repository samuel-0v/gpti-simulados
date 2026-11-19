import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeft, BarChart3, BookOpen, Check, CheckCircle2, ChevronLeft, ChevronRight,
  Circle, CircleHelp, Clock3, Download, FileText, History, Minus, Moon, Plus,
  RotateCcw, Sun, Trash2, X,
} from 'lucide-react';
import quizzes from './quizzes.json';
import './style.css';

const topicNames = ['Custos', 'Riscos', 'Comunicação', 'Qualidade', 'Aquisições'];
const storageKey = 'gpti-simulados-v1';
const emptySaved = { attempts: [], drafts: {}, correctionPreference: null };

function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey));
    return value && Array.isArray(value.attempts)
      ? { ...emptySaved, ...value, drafts: value.drafts || {} }
      : emptySaved;
  } catch {
    return emptySaved;
  }
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function App() {
  const [saved, setSaved] = useState(readSaved);
  const [screen, setScreen] = useState('home');
  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [mode, setMode] = useState('immediate');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState({});
  const [examCounts, setExamCounts] = useState(topicNames.map(() => 5));
  const [clearDialog, setClearDialog] = useState(false);
  const [deleteAttempt, setDeleteAttempt] = useState(null);
  const [exitDialog, setExitDialog] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState(null);
  const [correctionPrompt, setCorrectionPrompt] = useState(false);
  const [rememberCorrection, setRememberCorrection] = useState(false);
  const [darkTheme, setDarkTheme] = useState(() => localStorage.getItem('gpti-theme') === 'dark');

  useEffect(() => {
    localStorage.setItem('gpti-theme', darkTheme ? 'dark' : 'light');
  }, [darkTheme]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(saved));
    } catch {
      // The app still works for the current session when browser storage is unavailable.
    }
  }, [saved]);

  useEffect(() => {
    if (!quiz || !['quiz', 'review'].includes(screen)) return;
    const draft = { quiz, selected, index, mode, updatedAt: new Date().toISOString() };
    setSaved((previous) => {
      if (JSON.stringify(previous.drafts?.[quiz.id]) === JSON.stringify(draft)) return previous;
      return { ...previous, drafts: { ...previous.drafts, [quiz.id]: draft } };
    });
  }, [quiz, selected, index, mode, screen]);

  const current = quiz?.questions[index];
  const answeredCount = Object.keys(selected).length;
  const unansweredIndexes = useMemo(
    () => quiz?.questions.map((question, questionIndex) => (selected[question.id] ? -1 : questionIndex)).filter((n) => n >= 0) ?? [],
    [quiz, selected],
  );
  const totalExamQuestions = examCounts.reduce((sum, count) => sum + count, 0);

  const goHome = () => {
    setScreen('home');
    setQuiz(null);
    setAttempt(null);
    setSelected({});
    setIndex(0);
    setExitDialog(false);
  };

  const begin = (title, id, questions, initialMode = 'immediate') => {
    setQuiz({ title, id, questions });
    setAttempt(null);
    setSelected({});
    setIndex(0);
    setMode(initialMode);
    setScreen('quiz');
    setCorrectionPrompt(!saved.correctionPreference);
    setRememberCorrection(false);
  };

  const openQuiz = (title, id, questions) => {
    const draft = saved.drafts?.[id];
    if (draft) {
      setDraftPrompt({ fresh: { title, id, questions }, draft });
      return;
    }
    begin(title, id, questions, saved.correctionPreference || 'immediate');
  };

  const resumeDraft = () => {
    const draft = draftPrompt?.draft;
    if (!draft) return;
    setQuiz(draft.quiz);
    setSelected(draft.selected || {});
    setIndex(draft.index || 0);
    setMode(draft.mode || saved.correctionPreference || 'immediate');
    setAttempt(null);
    setScreen('quiz');
    setDraftPrompt(null);
  };

  const startFresh = () => {
    if (!draftPrompt) return;
    const freshQuiz = draftPrompt.fresh;
    const draftId = draftPrompt.draft.quiz.id;
    setSaved((previous) => {
      const drafts = { ...previous.drafts };
      delete drafts[draftId];
      return { ...previous, drafts };
    });
    setDraftPrompt(null);
    if (!freshQuiz) {
      setScreen('examSetup');
      return;
    }
    begin(freshQuiz.title, freshQuiz.id, freshQuiz.questions, saved.correctionPreference || 'immediate');
  };

  const chooseCorrection = (chosenMode, remember = rememberCorrection) => {
    setMode(chosenMode);
    if (remember) setSaved((previous) => ({ ...previous, correctionPreference: chosenMode }));
    setCorrectionPrompt(false);
  };

  const updateCorrectionPreference = (chosenMode) => {
    setSaved((previous) => ({ ...previous, correctionPreference: chosenMode }));
  };

  const startTopic = (quizIndex) => {
    const questionSet = quizzes[quizIndex].questions.map((question) => ({
      ...question,
      topic: topicNames[quizIndex],
    }));
    openQuiz(quizzes[quizIndex].title, quizzes[quizIndex].id, questionSet);
  };

  const openExamSetup = () => {
    const draft = saved.drafts?.exam;
    if (draft) {
      setDraftPrompt({ draft, fresh: null, beforeExamSetup: true });
      return;
    }
    setScreen('examSetup');
  };

  const startExam = () => {
    if (totalExamQuestions < 1) return;
    const questions = quizzes.flatMap((set, quizIndex) => {
      const picked = shuffle(set.questions).slice(0, examCounts[quizIndex]);
      return picked.map((question) => ({ ...question, topic: topicNames[quizIndex] }));
    });
    openQuiz('Simulado geral', 'exam', shuffle(questions));
  };

  const chooseAnswer = (questionId, optionKey) => {
    setSelected((previous) => ({ ...previous, [questionId]: optionKey }));
  };

  const finalize = () => {
    const answers = quiz.questions.map((question) => ({
      question,
      selected: selected[question.id] || null,
      correct: (selected[question.id] || '').toUpperCase() === question.answer.toUpperCase(),
    }));
    const result = {
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      title: quiz.title,
      mode,
      answers,
      score: answers.filter((answer) => answer.correct).length,
      total: answers.length,
      date: new Date().toISOString(),
    };
    setAttempt(result);
    setSaved((previous) => {
      const drafts = { ...previous.drafts };
      delete drafts[quiz.id];
      return { ...previous, attempts: [result, ...previous.attempts].slice(0, 100), drafts };
    });
    setScreen('result');
  };

  const exportResult = (result) => {
    const rows = [
      ['Simulado', result.title],
      ['Data', new Date(result.date).toLocaleString('pt-BR')],
      ['Nota', `${result.score}/${result.total}`],
      [],
      ['Questão', 'Tema', 'Enunciado', 'Resposta da pessoa', 'Resultado', 'Resposta correta'],
    ];
    result.answers.forEach((answer, answerIndex) => {
      const correctOption = answer.question.options.find((option) => option.key === answer.question.answer.toUpperCase());
      const selectedOption = answer.question.options.find((option) => option.key === answer.selected);
      rows.push([
        answerIndex + 1,
        answer.question.topic,
        answer.question.text,
        selectedOption ? `${selectedOption.key}) ${selectedOption.text}` : 'Não respondida',
        answer.correct ? 'Correta' : 'Incorreta',
        correctOption ? `${correctOption.key}) ${correctOption.text}` : answer.question.answer.toUpperCase(),
      ]);
    });
    const csv = '\ufeff' + rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `resultado-${result.title.toLowerCase().replaceAll(' ', '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openSavedAttempt = (result) => {
    setAttempt(result);
    setScreen('result');
  };

  const isSolving = screen === 'quiz' || screen === 'review';

  return (
    <div className={`app ${isSolving ? 'app-solving' : ''} ${darkTheme ? 'theme-dark' : ''}`}>
      {isSolving && <button className="theme-toggle solving-theme-toggle" onClick={() => setDarkTheme((value) => !value)} aria-label={darkTheme ? 'Ativar tema claro' : 'Ativar tema escuro'} title={darkTheme ? 'Tema claro' : 'Tema escuro'}>{darkTheme ? <Sun size={17} /> : <Moon size={17} />}</button>}
      {!isSolving && (
        <AppHeader onHome={goHome} onHistory={() => setScreen('history')} attemptCount={saved.attempts.length} darkTheme={darkTheme} onToggleTheme={() => setDarkTheme((value) => !value)} />
      )}
      <div className={`layout ${isSolving ? 'layout-solving' : ''}`}>
        {!isSolving && <Sidebar onTopic={startTopic} onExam={openExamSetup} onHistory={() => setScreen('history')} onStats={() => setScreen('stats')} activeSection={screen} />}
        <main className={isSolving ? 'main-solving' : ''}>
          {screen === 'home' && (
            <HomePage
              attempts={saved.attempts}
              onTopic={startTopic}
              onExam={openExamSetup}
              onHistory={() => setScreen('history')}
              correctionPreference={saved.correctionPreference}
              onCorrectionPreference={updateCorrectionPreference}
            />
          )}
          {screen === 'examSetup' && (
            <ExamSetup
              counts={examCounts}
              total={totalExamQuestions}
              onChange={(topicIndex, value) => setExamCounts((previous) => previous.map((count, i) => i === topicIndex ? value : count))}
              onBack={goHome}
              onStart={startExam}
            />
          )}
          {screen === 'stats' && <StatsPage attempts={saved.attempts} onBack={goHome} />}
          {screen === 'history' && (
            <HistoryPage
              attempts={saved.attempts}
              onBack={goHome}
              onClear={() => setClearDialog(true)}
              onExport={exportResult}
              onOpen={openSavedAttempt}
              onDelete={(result) => setDeleteAttempt(result)}
            />
          )}
          {screen === 'quiz' && current && (
            <QuizPage
              quiz={quiz}
              current={current}
              index={index}
              selected={selected}
              mode={mode}
              answeredCount={answeredCount}
              onAnswer={chooseAnswer}
              onMode={setMode}
              onIndex={setIndex}
              onReview={() => setScreen('review')}
              onExit={() => setExitDialog(true)}
            />
          )}
          {screen === 'review' && quiz && (
            <ReviewPage
              quiz={quiz}
              mode={mode}
              selected={selected}
              index={index}
              unansweredIndexes={unansweredIndexes}
              onIndex={(questionIndex) => { setIndex(questionIndex); setScreen('quiz'); }}
              onBack={() => setScreen('quiz')}
              onFinish={finalize}
            />
          )}
          {screen === 'result' && attempt && (
            <ResultPage
              attempt={attempt}
              onBack={() => setScreen('history')}
              onHome={goHome}
              onExport={() => exportResult(attempt)}
              onHistory={() => setScreen('history')}
            />
          )}
        </main>
      </div>
      {clearDialog && (
        <ConfirmDialog
          title="Limpar histórico?"
          description="Essa ação apaga todas as tentativas salvas neste navegador."
          confirmText="Limpar histórico"
          onCancel={() => setClearDialog(false)}
          onConfirm={() => { setSaved((previous) => ({ ...previous, attempts: [] })); setClearDialog(false); }}
        />
      )}
      {deleteAttempt && (
        <ConfirmDialog
          title="Excluir este resultado?"
          description={`A tentativa de ${deleteAttempt.title} será removida do histórico.`}
          confirmText="Excluir resultado"
          onCancel={() => setDeleteAttempt(null)}
          onConfirm={() => {
            setSaved((previous) => ({ ...previous, attempts: previous.attempts.filter((item) => item.id !== deleteAttempt.id) }));
            setDeleteAttempt(null);
          }}
        />
      )}
      {exitDialog && (
        <ConfirmDialog
          title="Sair do simulado?"
          description="Seu progresso fica salvo como rascunho neste navegador. Você pode continuar de onde parou ao abrir o simulado novamente."
          confirmText="Sair do simulado"
          onCancel={() => setExitDialog(false)}
          onConfirm={goHome}
          icon="exit"
        />
      )}
      {draftPrompt && (
        <ResumeDraftDialog
          title={draftPrompt.fresh?.title || 'Simulado geral'}
          beforeExamSetup={draftPrompt.beforeExamSetup}
          answered={Object.keys(draftPrompt.draft.selected || {}).length}
          total={draftPrompt.draft.quiz.questions.length}
          onResume={resumeDraft}
          onRestart={startFresh}
          onCancel={() => setDraftPrompt(null)}
        />
      )}
      {correctionPrompt && (
        <CorrectionDialog
          remember={rememberCorrection}
          onRemember={setRememberCorrection}
          onChoose={chooseCorrection}
        />
      )}
    </div>
  );
}

function AppHeader({ onHome, onHistory, attemptCount, darkTheme, onToggleTheme }) {
  return (
    <header className="site-header">
      <button className="brand" onClick={onHome} aria-label="Ir para o início">
        <span className="brandmark"><BookOpen size={20} /></span>
        <span>GPTI <b>|</b> Simulados</span>
      </button>
      <div className="header-actions">
        <span className="saved-status"><span className="saved-dot"><Check size={11} /></span>Salvo neste navegador</span>
        <button className="theme-toggle" onClick={onToggleTheme} aria-label={darkTheme ? 'Ativar tema claro' : 'Ativar tema escuro'} title={darkTheme ? 'Tema claro' : 'Tema escuro'}>{darkTheme ? <Sun size={17} /> : <Moon size={17} />}<span>{darkTheme ? 'Claro' : 'Escuro'}</span></button>
        <button className="header-history" onClick={onHistory}><History size={16} /><span>Histórico</span><span className="header-count">{attemptCount}</span></button>
      </div>
    </header>
  );
}

function Sidebar({ onTopic, onExam, onHistory, onStats, activeSection }) {
  return (
    <aside className="sidebar">
      <div className="aside-title">CONTEÚDO</div>
      {quizzes.map((quiz, i) => (
        <button key={quiz.id} className="navitem" onClick={() => onTopic(i)}>
          <span className={`navicon tone-text-${i}`}><FileText size={17} /></span><span>{topicNames[i]}</span><span className="navcount">25</span>
        </button>
      ))}
      <div className="aside-rule" />
      <div className="aside-title nav-group-title">REVISÃO</div>
      <button className={`navitem exam-nav ${activeSection === 'examSetup' ? 'active' : ''}`} onClick={onExam}><span className="navicon"><CircleHelp size={17} /></span><span>Simulado geral</span></button>
      <button className={`navitem history-nav ${activeSection === 'history' ? 'active' : ''}`} onClick={onHistory}><span className="navicon"><History size={17} /></span><span>Histórico</span></button>
      <button className={`navitem ${activeSection === 'stats' ? 'active' : ''}`} onClick={onStats}><span className="navicon"><BarChart3 size={17} /></span><span>Estatísticas</span></button>
      <div className="aside-foot"><span className="avatar">G</span><span><b>Gerência de Projetos</b><small>Facom · UFU</small></span></div>
    </aside>
  );
}

function HomePage({ attempts, onTopic, onExam, onHistory, correctionPreference, onCorrectionPreference }) {
  return (
    <>
      <section className="welcome">
        <div><div className="welcome-mark"><BookOpen size={20} /></div><span className="welcome-kicker">GERÊNCIA DE PROJETOS · CICLO DE APRENDIZADO</span><h1>Seu painel de revisão</h1><p>Pratique os conceitos, acompanhe seus erros recorrentes e consolide o que aprendeu.</p></div>
        <div className="welcome-stat"><span>QUESTÕES DISPONÍVEIS</span><b>125</b><small>em 5 temas</small></div>
      </section>
      <section className="section-head">
        <div><h2>Trilhas de conhecimento</h2><p>Pratique por área de conhecimento e acompanhe seu desempenho.</p></div>
        <button className="text-button" onClick={onHistory}><History size={16} /> Histórico ({attempts.length})</button>
      </section>
      <div className="quiz-list">
        {quizzes.map((quiz, i) => (
          <button className="quiz-row" key={quiz.id} onClick={() => onTopic(i)}>
            <span className={`topic-icon tone-${i}`}><FileText size={19} /></span>
            <span className="quiz-info"><b>{topicNames[i]}</b><small>{quiz.title}</small></span>
            <span className="question-count">25 questões</span><ChevronRight className="row-arrow" size={19} />
          </button>
        ))}
      </div>
      <button className="exam-banner" onClick={onExam}>
        <span className="exam-symbol"><CircleHelp size={22} /></span>
        <span><b>Simulado geral</b><small>Monte a prova escolhendo quantas questões quer de cada tema.</small></span>
        <span className="exam-action">Configurar <ChevronRight size={16} /></span>
      </button>
      <section className="correction-preference" aria-labelledby="correction-preference-title">
        <div>
          <h2 id="correction-preference-title">Padrão de correção</h2>
          <p>{correctionPreference ? 'Essa opção será usada automaticamente ao iniciar os próximos simulados.' : 'Escolha uma opção para já começar os próximos simulados com essa preferência.'}</p>
        </div>
        <div className="preference-options" role="group" aria-label="Padrão de correção">
          <button className={correctionPreference === 'immediate' ? 'mode active' : 'mode'} onClick={() => onCorrectionPreference('immediate')}><span className="radio-dot" />Na hora</button>
          <button className={correctionPreference === 'final' ? 'mode active' : 'mode'} onClick={() => onCorrectionPreference('final')}><span className="radio-dot" />No final</button>
        </div>
      </section>
    </>
  );
}

function PageHeading({ back, label, title, description }) {
  return (
    <div className="page-heading">
      <button className="back-link" onClick={back}><ArrowLeft size={16} />{label}</button>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  );
}

function StatsPage({ attempts, onBack }) {
  const [filter, setFilter] = useState('all');
  const filteredAnswers = attempts.flatMap((attempt) => attempt.answers
    .filter((answer) => filter === 'all' || answer.question.topic === filter)
    .map((answer) => ({ ...answer, attemptTitle: attempt.title, attemptDate: attempt.date })));
  const questionMap = new Map();
  filteredAnswers.forEach((answer) => {
    const question = answer.question;
    const current = questionMap.get(question.id) || { question, correct: 0, errors: 0, blank: 0, appearances: 0 };
    current.appearances += 1;
    if (!answer.selected) current.blank += 1;
    else if (answer.correct) current.correct += 1;
    else current.errors += 1;
    questionMap.set(question.id, current);
  });
  const questions = [...questionMap.values()].sort((a, b) => b.errors - a.errors || (b.errors / Math.max(1, b.errors + b.correct)) - (a.errors / Math.max(1, a.errors + a.correct)) || a.question.number - b.question.number);
  const difficult = questions.filter((item) => item.errors > 0);
  const answered = filteredAnswers.filter((answer) => answer.selected).length;
  const correct = filteredAnswers.filter((answer) => answer.selected && answer.correct).length;
  const relevantAttempts = attempts.filter((attempt) => filter === 'all' || attempt.answers.some((answer) => answer.question.topic === filter)).length;

  return (
    <section className="page-wrap stats-page">
      <PageHeading back={onBack} label="Início" title="Estatísticas de respostas" description="Veja quais questões você mais erra com base nas tentativas salvas neste navegador." />
      <div className="stats-toolbar">
        <label htmlFor="stats-topic">Tema</label>
        <select id="stats-topic" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">Todos os temas</option>
          {topicNames.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </div>
      <div className="stats-summary">
        <article><small>TENTATIVAS NO FILTRO</small><b>{relevantAttempts}</b></article>
        <article><small>RESPOSTAS AVALIADAS</small><b>{answered}</b></article>
        <article><small>APROVEITAMENTO</small><b>{answered ? Math.round(correct / answered * 100) : 0}%</b></article>
      </div>
      {attempts.length === 0 ? (
        <div className="history-empty"><span className="empty-icon"><BarChart3 size={22} /></span><b>Sem dados para analisar</b><p>Finalize um simulado para ver suas estatísticas aqui.</p></div>
      ) : difficult.length === 0 ? (
        <div className="history-empty"><span className="empty-icon"><CheckCircle2 size={22} /></span><b>Nenhum erro neste filtro</b><p>{filteredAnswers.length ? 'Até agora, você acertou todas as questões respondidas neste filtro.' : 'Não há tentativas salvas para este tema.'}</p></div>
      ) : (
        <div className="stats-question-list">
          <div className="stats-list-heading"><div><h2>Questões para revisar</h2><p>Ordenadas pelo número de erros acumulados.</p></div><span>{difficult.length} {difficult.length === 1 ? 'questão' : 'questões'}</span></div>
          {difficult.map(({ question, correct: hits, errors, blank, appearances }) => (
            <article className="stats-question" key={question.id}>
              <div className="stats-question-top"><span>{question.topic} · Questão {question.number}</span><b>{errors} {errors === 1 ? 'erro' : 'erros'}</b></div>
              <p>{question.text}</p>
              <div className="stats-metrics"><span>Erros <b>{errors}</b></span><span>Acertos <b>{hits}</b></span><span>Em branco <b>{blank}</b></span><span>Aparições <b>{appearances}</b></span><span>Taxa de erro <b>{Math.round(errors / Math.max(1, errors + hits) * 100)}%</b></span></div>
              <details className="stats-answer"><summary>Revisar resposta correta</summary><p>{question.answer.toUpperCase()} — {question.options.find((option) => option.key === question.answer.toUpperCase())?.text}</p></details>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function HistoryPage({ attempts, onBack, onClear, onExport, onOpen, onDelete }) {
  const [filter, setFilter] = useState('all');
  const visible = filter === 'all' ? attempts : attempts.filter((attempt) => attempt.answers.some((answer) => answer.question.topic === filter) || attempt.title.includes(filter));
  return (
    <section className="page-wrap history-page">
      <PageHeading back={onBack} label="Início" title="Histórico de tentativas" description="As tentativas ficam guardadas somente neste navegador." />
      <div className="history-toolbar">
        <span>{attempts.length} {attempts.length === 1 ? 'tentativa salva' : 'tentativas salvas'}</span>
        <div className="history-tools">
          <select aria-label="Filtrar tentativas" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">Todos os simulados</option>
            {topicNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <button className="danger-quiet" onClick={onClear} disabled={attempts.length === 0}><Trash2 size={15} />Limpar histórico</button>
        </div>
      </div>
      {visible.length === 0 ? (
        <div className="history-empty"><span className="empty-icon"><History size={22} /></span><b>{attempts.length === 0 ? 'Nenhuma tentativa salva ainda' : 'Nenhuma tentativa neste filtro'}</b><p>{attempts.length === 0 ? 'Quando terminar um simulado, a nota e as respostas aparecem aqui.' : 'Escolha outro filtro para ver suas tentativas.'}</p></div>
      ) : (
        <div className="history-list">
          {visible.map((attempt) => (
            <article className="history-card" key={attempt.id}>
              <button className="history-card-main" onClick={() => onOpen(attempt)}>
                <span className={`history-grade ${attempt.score / attempt.total >= 0.7 ? 'grade-good' : 'grade-neutral'}`}><b>{attempt.score}</b><small>/{attempt.total}</small></span>
                <span className="history-detail"><b>{attempt.title}</b><small>{new Date(attempt.date).toLocaleString('pt-BR')}</small></span>
                <span className="history-percent">{Math.round(attempt.score / attempt.total * 100)}%</span>
                <ChevronRight size={17} className="row-arrow" />
              </button>
              <button className="history-export" onClick={() => onExport(attempt)}><Download size={15} />Exportar</button>
              <button className="history-delete" aria-label={`Excluir resultado de ${attempt.title}`} title="Excluir resultado" onClick={() => onDelete(attempt)}><Trash2 size={15} /><span>Excluir</span></button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ExamSetup({ counts, total, onChange, onBack, onStart }) {
  return (
    <section className="page-wrap exam-setup">
      <PageHeading back={onBack} label="Início" title="Monte seu simulado geral" description="Escolha quantas questões sortear de cada tema. Cada tema tem até 25 questões disponíveis." />
      <div className="count-list">
        {topicNames.map((name, i) => (
          <div className="count-row" key={name}>
            <span className={`topic-icon tone-${i}`}><FileText size={18} /></span>
            <span className="count-topic"><b>{name}</b><small>Máximo: 25 questões</small></span>
            <div className="stepper" aria-label={`${name}: ${counts[i]} questões`}>
              <button onClick={() => onChange(i, Math.max(0, counts[i] - 1))} aria-label={`Diminuir questões de ${name}`} disabled={counts[i] === 0}><Minus size={16} /></button>
              <input aria-label={`Quantidade de questões de ${name}`} type="number" min="0" max="25" value={counts[i]} onChange={(event) => onChange(i, Math.min(25, Math.max(0, Number(event.target.value) || 0)))} />
              <button onClick={() => onChange(i, Math.min(25, counts[i] + 1))} aria-label={`Aumentar questões de ${name}`} disabled={counts[i] === 25}><Plus size={16} /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="exam-summary"><span><b>{total}</b> {total === 1 ? 'questão selecionada' : 'questões selecionadas'}</span><small>As questões serão embaralhadas e escolhidas sem repetição dentro de cada tema.</small></div>
      <div className="setup-actions"><button className="secondary-btn" onClick={() => topicNames.forEach((_, i) => onChange(i, 5))}><RotateCcw size={15} />Redefinir para 5 por tema</button><button className="primary-btn" disabled={total === 0} onClick={onStart}>Começar simulado<ChevronRight size={17} /></button></div>
      {total === 0 && <p className="inline-error">Selecione pelo menos uma questão para começar.</p>}
    </section>
  );
}

function SolvingHeader({ quiz, current, index, total, answeredCount, onExit }) {
  const percent = Math.round((answeredCount / total) * 100);
  return (
    <div className="solving-header">
      <button className="solving-exit" onClick={onExit}><ChevronLeft size={18} /><span>Sair do simulado</span></button>
      <div className="solving-title-row"><div><h1>{quiz.id === 'exam' ? quiz.title : `Simulado — ${current.topic}`}</h1><p>{current.topic}</p></div><span className="solving-clock"><Clock3 size={14} />{percent}%</span></div>
      <div className="solving-progress"><div><b>{answeredCount} respondidas <span>de {total}</span></b><span>{percent}%</span></div><div className="track"><i style={{ width: `${percent}%` }} /></div></div>
    </div>
  );
}

function QuestionDock({ questions, selected, index, onIndex, onReview, onFinish, answeredCount, reviewMode = false }) {
  const blankCount = questions.length - answeredCount;
  return (
    <div className="question-dock">
      <div className="question-map-head"><span className="map-caption">Questões</span><span className={blankCount ? 'blank-count' : 'complete-count'}>{blankCount ? `${blankCount} em branco` : 'Todas respondidas'}</span></div>
      <div className="question-map" aria-label="Navegação das questões">
        {questions.map((question, questionIndex) => {
          const isAnswered = Boolean(selected[question.id]);
          return <button key={question.id} className={`question-chip ${questionIndex === index ? 'current' : ''} ${isAnswered ? 'answered' : 'blank'}`} aria-label={`Questão ${questionIndex + 1}, ${isAnswered ? 'respondida' : 'em branco'}`} aria-current={questionIndex === index ? 'step' : undefined} onClick={() => onIndex(questionIndex)}>{questionIndex + 1}</button>;
        })}
      </div>
      <div className="dock-actions">
        {reviewMode ? <>
          <button className="secondary-btn" onClick={onReview}><ChevronLeft size={16} /><span>Continuar respondendo</span></button>
          <button className="primary-btn" onClick={onFinish}><span>Finalizar simulado</span><Check size={17} /></button>
        </> : <>
          <button className="secondary-btn" onClick={() => onIndex(Math.max(0, index - 1))} disabled={index === 0}><ChevronLeft size={16} /><span>Anterior</span></button>
          {answeredCount === questions.length
            ? <button className="primary-btn" onClick={onReview}><span>Revisar respostas</span><Check size={17} /></button>
            : index < questions.length - 1
            ? <button className="primary-btn" onClick={() => onIndex(index + 1)}><span>Próxima</span><ChevronRight size={17} /></button>
            : <button className="primary-btn" onClick={onReview}><span>Revisar respostas</span><Check size={17} /></button>}
        </>}
      </div>
    </div>
  );
}

function QuizPage({ quiz, current, index, selected, mode, answeredCount, onAnswer, onMode, onIndex, onReview, onExit }) {
  const answerKey = current.answer.toUpperCase();
  return (
    <div className="solve-page">
      <SolvingHeader quiz={quiz} current={current} index={index} total={quiz.questions.length} answeredCount={answeredCount} onExit={onExit} />
      <div className="solve-mode"><span>Correção</span><button className={mode === 'immediate' ? 'mode active' : 'mode'} onClick={() => onMode('immediate')}><span className="radio-dot" />Na hora</button><button className={mode === 'final' ? 'mode active' : 'mode'} onClick={() => onMode('final')}><span className="radio-dot" />No final</button></div>
      <article className="question-card">
        <div className="question-meta"><span>{current.topic}</span><span>{String(index + 1).padStart(2, '0')} / {quiz.questions.length}</span></div>
        <h2>{current.text}</h2>
        <div className="options">
          {current.options.map((option) => {
            const isSelected = selected[current.id] === option.key;
            const revealed = mode === 'immediate' && Boolean(selected[current.id]);
            const isCorrect = option.key === answerKey;
            return (
              <button key={option.key} className={`option ${isSelected ? 'chosen' : ''} ${revealed && isCorrect ? 'correct' : ''} ${revealed && isSelected && !isCorrect ? 'wrong' : ''}`} onClick={() => onAnswer(current.id, option.key)}>
                <span className="option-letter">{option.key}</span><span>{option.text}</span>
                {revealed && isCorrect && <Check className="option-status" size={17} />}
                {revealed && isSelected && !isCorrect && <X className="option-status" size={17} />}
              </button>
            );
          })}
        </div>
        {mode === 'immediate' && selected[current.id] && (
          <div className={`feedback ${selected[current.id] === answerKey ? 'good' : 'bad'}`}>
            {selected[current.id] === answerKey ? <><Check size={17} />Resposta correta</> : <><X size={17} />Resposta incorreta · correta: {answerKey}</>}
          </div>
        )}
      </article>
      <QuestionDock questions={quiz.questions} selected={selected} index={index} onIndex={onIndex} onReview={onReview} answeredCount={answeredCount} />
    </div>
  );
}

function ReviewPage({ quiz, mode, selected, index, unansweredIndexes, onIndex, onBack, onFinish }) {
  const blanks = unansweredIndexes.length;
  return (
    <div className="solve-page review-page">
      <div className="solving-header review-top">
        <button className="solving-exit" onClick={onBack}><ChevronLeft size={18} /><span>Voltar às questões</span></button>
        <div className="solving-title-row"><div><h1>Revisar respostas</h1><p>{quiz.title}</p></div><span className={blanks ? 'review-badge pending' : 'review-badge complete'}>{blanks ? `${blanks} em branco` : 'Completo'}</span></div>
      </div>
      <section className="review-summary-card">
        {blanks === 0 ? <><span className="review-summary-icon complete"><CheckCircle2 size={22} /></span><h2>Todas as questões foram respondidas</h2><p>Você pode finalizar o simulado ou voltar para revisar suas respostas.</p></> : <><span className="review-summary-icon pending"><CircleHelp size={22} /></span><h2>{blanks} {blanks === 1 ? 'questão sem resposta' : 'questões sem resposta'}</h2><p>Toque em uma questão para voltar diretamente a ela. Você também pode localizar as em branco na navegação inferior.</p></>}
      </section>
      {blanks > 0 && (
        <section className="blank-list"><h3>Responda antes de concluir</h3>{unansweredIndexes.map((questionIndex) => <button key={quiz.questions[questionIndex].id} onClick={() => onIndex(questionIndex)}><span className="blank-number">{questionIndex + 1}</span><span><b>{quiz.questions[questionIndex].topic}</b><small>{quiz.questions[questionIndex].text}</small></span><ChevronRight size={17} /></button>)}</section>
      )}
      {blanks === 0 && <section className="review-checklist"><h3>Resumo da tentativa</h3><p><CheckCircle2 size={16} />{quiz.questions.length} questões respondidas</p><p><Circle size={16} />Correção {mode === 'immediate' ? 'mostrada a cada resposta' : 'após finalizar'}</p></section>}
      <QuestionDock questions={quiz.questions} selected={selected} index={index} onIndex={onIndex} onReview={onBack} onFinish={onFinish} answeredCount={quiz.questions.length - blanks} reviewMode />
    </div>
  );
}

function ResultPage({ attempt, onBack, onHome, onExport, onHistory }) {
  return (
    <div className="result-wrap page-wrap">
      <PageHeading back={onBack} label="Histórico" title="Resultado do simulado" description={`${attempt.title} · ${new Date(attempt.date).toLocaleString('pt-BR')}`} />
      <div className="score-strip"><div><small>NOTA</small><b>{attempt.score}<span> / {attempt.total}</span></b></div><div><small>APROVEITAMENTO</small><b>{Math.round(attempt.score / attempt.total * 100)}<span>%</span></b></div><button className="primary-btn" onClick={onExport}><Download size={17} />Exportar respostas</button></div>
      <div className="review-list"><h2>Revisão das respostas</h2>{attempt.answers.map((answer, i) => <article className="review-item" key={`${answer.question.id}-${i}`}><div className="review-qhead"><span>Questão {i + 1} · {answer.question.topic}</span><b className={answer.correct ? 'is-correct' : 'is-wrong'}>{answer.correct ? 'Correta' : answer.selected ? 'Incorreta' : 'Em branco'}</b></div><p>{answer.question.text}</p><div className="review-answer">Sua resposta: <b>{answer.selected || 'Em branco'}</b>{!answer.correct && <span> · Correta: <b>{answer.question.answer.toUpperCase()}</b></span>}</div></article>)}</div>
      <div className="result-actions"><button className="secondary-btn" onClick={onHistory}><History size={16} />Voltar ao histórico</button><button className="primary-btn" onClick={onHome}>Início<ChevronRight size={16} /></button></div>
    </div>
  );
}

function ConfirmDialog({ title, description, confirmText, onCancel, onConfirm, icon = 'trash' }) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description">
        <button className="dialog-close" onClick={onCancel} aria-label="Fechar"><X size={18} /></button>
        <span className="dialog-icon">{icon === 'exit' ? <ArrowLeft size={19} /> : <Trash2 size={19} />}</span><h2 id="dialog-title">{title}</h2><p id="dialog-description">{description}</p>
        <div className="dialog-actions"><button className="secondary-btn" onClick={onCancel}>Cancelar</button><button className="danger-btn" onClick={onConfirm}>{confirmText}</button></div>
      </section>
    </div>
  );
}

function ResumeDraftDialog({ title, answered, total, beforeExamSetup = false, onResume, onRestart, onCancel }) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="confirm-dialog resume-dialog" role="dialog" aria-modal="true" aria-labelledby="resume-title">
        <span className="dialog-icon resume-icon"><RotateCcw size={20} /></span>
        <h2 id="resume-title">{beforeExamSetup ? 'Simulado geral em andamento' : 'Continuar simulado?'}</h2>
        <p>{beforeExamSetup
          ? `Há um rascunho do simulado geral com ${answered} de ${total} questões respondidas. Você pode continuar ou configurar uma nova prova.`
          : <>Há um rascunho de <b>{title}</b> com {answered} de {total} questões respondidas.</>}</p>
        <div className="dialog-actions resume-actions">
          <button className="secondary-btn" onClick={onCancel}>Agora não</button>
          <button className="secondary-btn" onClick={onRestart}>{beforeExamSetup ? 'Configurar do zero' : 'Começar do zero'}</button>
          <button className="primary-btn" onClick={onResume}>Continuar</button>
        </div>
      </section>
    </div>
  );
}

function CorrectionDialog({ remember, onRemember, onChoose }) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="confirm-dialog correction-dialog" role="dialog" aria-modal="true" aria-labelledby="correction-title">
        <span className="dialog-icon correction-icon"><CheckCircle2 size={20} /></span>
        <h2 id="correction-title">Quando mostrar a correção?</h2>
        <p>Escolha como prefere ver o resultado das respostas neste simulado.</p>
        <div className="correction-choices">
          <button className="secondary-btn" onClick={() => onChoose('immediate')}><CheckCircle2 size={18} /><span><b>Na hora</b><small>Veja se acertou ao responder.</small></span></button>
          <button className="secondary-btn" onClick={() => onChoose('final')}><FileText size={18} /><span><b>No final</b><small>Veja as respostas depois de concluir.</small></span></button>
        </div>
        <label className="remember-choice"><input type="checkbox" checked={remember} onChange={(event) => onRemember(event.target.checked)} /><span>Salvar como padrão e não perguntar novamente</span></label>
      </section>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
