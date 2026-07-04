// eJustice — Frontend Logic

const questionInput = document.getElementById('questionInput');
const charCount = document.getElementById('charCount');
const consultBtn = document.getElementById('consultBtn');
let lastResultData = null;
let lastQuestionText = '';

const translations = {
  uk: {
    pageTitle: 'eJustice — AI-допомога з прав людини',
    quickExit: '✕ Вихід',
    quickExitTitle: 'Швидкий вихід',
    logoSub: 'Права людини • Офіційні джерела',
    navConsult: 'Консультація',
    navSources: 'Джерела',
    navTopics: 'Теми',
    heroBadge: '🔒 Тільки офіційні джерела',
    heroTitle: 'Ваші права',
    heroEm: 'захищені законом',
    heroDesc: 'AI-консультації з прав людини на основі офіційного законодавства України, міжнародних договорів та рішень ЄСПЛ. Жодної відповіді без джерела.',
    countryUA: '🇺🇦 Україна',
    countryEU: '🇪🇺 Країна ЄС',
    countryOther: '🌍 Інша країна',
    languageLabel: 'Мова відповіді',
    languageUk: 'Українська',
    assistantIntro: 'Як ШІ-асистент з первинної юридичної допомоги, я можу зробити первинний правовий аналіз ситуації, визначити перелік прав, які може мати особа, знайти у юридичних документах світу та обраної країни відповідні норми, а також запропонувати комплекс заходів, які можна вжити для вирішення ситуації.',
    assistantStart: 'Для початку, опишіть ситуацію.',
    questionPlaceholder: 'Наприклад: «Мене незаконно затримали. Що робити?»',
    consultButton: 'Отримати консультацію',
    popularTopics: 'Популярні теми:',
    chipDetention: 'Затримання',
    chipEchr: 'ЄСПЛ',
    chipSearch: 'Обшук',
    chipDiscrimination: 'Дискримінація',
    chipCaptivity: 'Полон / МГП',
    resultTitle: 'Відповідь eJustice',
    sourceBadgeOk: 'Відповідь сформована на основі офіційних джерел',
    sourceBadgeNo: 'Поза правовою темою: юридичні джерела не підбиралися',
    printButton: '🖨 Роздрукувати',
    copyButton: '📋 Копіювати',
    newQuestionButton: '+ Нове питання',
    loadingText: 'Шукаємо в офіційних джерелах...',
    loadingSub: 'Перевіряємо законодавство та міжнародні договори',
    sourcesTitle: 'Джерела до цієї відповіді',
    sourcesSub: 'Офіційні правові джерела, підібрані саме під описану ситуацію.',
    disclaimerText: '<strong>eJustice</strong> — AI-система первинної правової інформації. Відповіді формуються виключно на базі офіційних джерел. Ця платформа <strong>не замінює</strong> консультацію адвоката. У разі серйозної правової ситуації зверніться до юриста або до <a href="https://ombudsman.gov.ua" target="_blank">Уповноваженого з прав людини</a>.',
    quickExitFooter: 'Швидкий вихід ✕',
    emptyQuestion: 'Будь ласка, введіть питання',
    shortQuestion: 'Питання занадто коротке',
    nonJsonError: 'Сервер повернув не JSON-відповідь',
    serverError: 'Помилка сервера',
    connectionError: 'Помилка з\'єднання з сервером. Перевірте підключення.',
    noSourcesLegal: 'Недостатньо офіційних джерел для формування відповіді.',
    noSourcesOutOfScope: 'Питання поза правовою темою.',
    fallbackOutOfScope: 'Сформулюйте питання як правову ситуацію: яке право порушено, куди звернутися, який документ потрібен або яку скаргу подати.',
    fallbackNoSources: 'Рекомендуємо звернутися до юриста або перевірити інформацію в офіційному органі.',
    violationAssessment: 'Оцінка наявності порушення',
    caseAnalysis: 'Розбір справи по суті',
    factAssessment: 'Факти, що впливають на оцінку',
    answer: 'Відповідь',
    yourRights: 'Ваші права',
    legalBasis: 'Правова підстава',
    officialSource: '↗ Офіційне джерело',
    steps: 'Що зробити зараз',
    whereToGo: 'Куди звертатися',
    documents: 'Можливі документи',
    deadlines: 'Строки',
    verifiedSources: 'Перевірені джерела',
    sourceDocuments: 'Документи, враховані у відповіді',
    disclaimer: 'Застереження',
    likelyViolation: 'Ймовірно є порушення',
    possibleViolation: 'Може бути порушення',
    insufficientFacts: 'Недостатньо фактів для висновку',
    likelyNoViolation: 'Ознак порушення не видно',
    copied: 'Скопійовано в буфер обміну',
    copyFailed: 'Не вдалось скопіювати',
    openSource: 'Відкрити',
    activeStatus: 'чинний'
  },
  en: {
    pageTitle: 'eJustice — AI human rights assistance',
    quickExit: '✕ Exit',
    quickExitTitle: 'Quick exit',
    logoSub: 'Human rights • Official sources',
    navConsult: 'Consultation',
    navSources: 'Sources',
    navTopics: 'Topics',
    heroBadge: '🔒 Official sources only',
    heroTitle: 'Your rights',
    heroEm: 'protected by law',
    heroDesc: 'AI consultations on human rights based on official Ukrainian legislation, international treaties, and ECtHR case law. No answer without a source.',
    countryUA: '🇺🇦 Ukraine',
    countryEU: '🇪🇺 EU country',
    countryOther: '🌍 Other country',
    languageLabel: 'Response language',
    languageUk: 'Ukrainian',
    assistantIntro: 'As an AI assistant for primary legal aid, I can make an initial legal analysis of the situation, identify the rights a person may have, find relevant rules in legal documents from the world and the selected country, and suggest practical steps that may help resolve the situation.',
    assistantStart: 'To begin, describe the situation.',
    questionPlaceholder: 'For example: "I was unlawfully detained. What should I do?"',
    consultButton: 'Get consultation',
    popularTopics: 'Popular topics:',
    chipDetention: 'Detention',
    chipEchr: 'ECtHR',
    chipSearch: 'Search',
    chipDiscrimination: 'Discrimination',
    chipCaptivity: 'Captivity / IHL',
    resultTitle: 'eJustice answer',
    sourceBadgeOk: 'The answer is based on official sources',
    sourceBadgeNo: 'Outside a legal topic: legal sources were not selected',
    printButton: '🖨 Print',
    copyButton: '📋 Copy',
    newQuestionButton: '+ New question',
    loadingText: 'Searching official sources...',
    loadingSub: 'Checking legislation and international treaties',
    sourcesTitle: 'Sources for this answer',
    sourcesSub: 'Official legal sources selected specifically for the described situation.',
    disclaimerText: '<strong>eJustice</strong> is an AI system for primary legal information. Answers are generated only from official sources. This platform <strong>does not replace</strong> advice from a lawyer. In a serious legal situation, contact a lawyer or the <a href="https://ombudsman.gov.ua" target="_blank">Ukrainian Parliament Commissioner for Human Rights</a>.',
    quickExitFooter: 'Quick exit ✕',
    emptyQuestion: 'Please enter a question',
    shortQuestion: 'The question is too short',
    nonJsonError: 'The server returned a non-JSON response',
    serverError: 'Server error',
    connectionError: 'Connection error. Please check the server connection.',
    noSourcesLegal: 'There are not enough official sources to form an answer.',
    noSourcesOutOfScope: 'The question is outside a legal topic.',
    fallbackOutOfScope: 'Please phrase the question as a legal situation: which right may have been violated, where to apply, which document is needed, or which complaint to file.',
    fallbackNoSources: 'We recommend contacting a lawyer or checking the information with an official authority.',
    violationAssessment: 'Assessment of possible violation',
    caseAnalysis: 'Substantive case analysis',
    factAssessment: 'Facts affecting the assessment',
    answer: 'Answer',
    yourRights: 'Your rights',
    legalBasis: 'Legal basis',
    officialSource: '↗ Official source',
    steps: 'What to do now',
    whereToGo: 'Where to apply',
    documents: 'Possible documents',
    deadlines: 'Deadlines',
    verifiedSources: 'Verified sources',
    sourceDocuments: 'Documents used in the answer',
    disclaimer: 'Disclaimer',
    likelyViolation: 'A violation is likely',
    possibleViolation: 'There may be a violation',
    insufficientFacts: 'Not enough facts to conclude',
    likelyNoViolation: 'No signs of violation are apparent',
    copied: 'Copied to clipboard',
    copyFailed: 'Could not copy',
    openSource: 'Open',
    activeStatus: 'active'
  }
};

function currentLang() {
  return document.getElementById('languageSelect')?.value || 'uk';
}

function t(key) {
  const lang = currentLang();
  return translations[lang]?.[key] || translations.uk[key] || key;
}

// Char counter
questionInput.addEventListener('input', () => {
  const len = questionInput.value.length;
  charCount.textContent = `${len} / 2000`;
  charCount.style.color = len > 1800 ? '#B3261E' : '#A08890';
});

// Set question from chip
function setQuestion(text) {
  questionInput.value = text;
  charCount.textContent = `${text.length} / 2000`;
  questionInput.focus();
  questionInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setQuestionFromChip(button) {
  const lang = currentLang();
  setQuestion(button.dataset[`question${lang[0].toUpperCase()}${lang.slice(1)}`] || button.dataset.questionUk || '');
}

// Submit on Enter (Shift+Enter for new line)
questionInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    submitConsult();
  }
});

async function submitConsult() {
  const question = questionInput.value.trim();
  const country = document.getElementById('countrySelect').value;
  const language = document.getElementById('languageSelect')?.value || 'uk';

  if (!question) { showError(t('emptyQuestion')); return; }
  if (question.length < 10) { showError(t('shortQuestion')); return; }

  setLoading(true);
  closeError();

  try {
    const res = await fetch('/api/consult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, country, language })
    });
    const responseText = await res.text();
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      throw new Error(`${t('nonJsonError')} (${res.status}).`);
    }

    if (!res.ok) {
      throw new Error(data.message || `${t('serverError')}: ${res.status}`);
    }

    if (data.error) {
      showError(data.message);
    } else {
      renderResult(data, question);
    }
  } catch (err) {
    showError(err.message || t('connectionError'));
  } finally {
    setLoading(false);
  }
}

function renderResult(data, question, shouldScroll = true) {
  lastResultData = data;
  lastQuestionText = question;
  const resultSection = document.getElementById('resultSection');
  const resultBody = document.getElementById('resultBody');
  const resultTime = document.getElementById('resultTime');
  const sourceBadge = document.querySelector('.source-badge');

  resultTime.textContent = data.queried_at || '';

  if (!data.has_sources) {
    setSourceBadge(sourceBadge, false);
    renderRelevantSources([]);
    resultBody.innerHTML = `
      <div class="no-sources-box">
        ⚠ ${data.out_of_scope ? t('noSourcesOutOfScope') : t('noSourcesLegal')}<br/>
        ${esc(data.short_answer || fallbackNoSourcesText(data.out_of_scope))}
      </div>
    `;
    resultSection.style.display = 'block';
    if (shouldScroll) resultSection.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  let html = '';
  setSourceBadge(sourceBadge, true);
  renderRelevantSources(data.source_documents || []);

  if (data.violation_assessment) {
    html += block(t('violationAssessment'), renderViolationAssessment(data.violation_assessment));
  }

  if (data.case_analysis) {
    html += block(t('caseAnalysis'), `<p class="result-short">${esc(data.case_analysis)}</p>`);
  }

  if (data.fact_assessment?.length) {
    html += block(t('factAssessment'), listItems(data.fact_assessment));
  }

  // 1. Short answer
  html += block(t('answer'), `<p class="result-short">${esc(data.short_answer)}</p>`);

  // 2. Your rights
  if (data.your_rights?.length) {
    html += block(t('yourRights'), listItems(data.your_rights));
  }

  // 3. Legal basis
  if (toList(data.legal_basis).length) {
    const bases = toList(data.legal_basis).map(b => typeof b === 'object' ? `
      <div class="legal-basis-item">
        <div class="legal-basis-title">${esc(b.title)}</div>
        ${b.article ? `<div class="legal-basis-article">${esc(b.article)}</div>` : ''}
        ${b.url ? `<a href="${esc(b.url)}" target="_blank" rel="noopener" class="legal-basis-link">${esc(t('officialSource'))}</a>` : ''}
      </div>
    ` : `<div class="legal-basis-item">${esc(formatValue(b))}</div>`).join('');
    html += block(t('legalBasis'), bases);
  }

  // 4. Steps
  if (data.steps?.length) {
    html += block(t('steps'), stepsItems(data.steps));
  }

  // 5. Where to go
  if (toList(data.where_to_go).length) {
    const contacts = toList(data.where_to_go).map(c => typeof c === 'object' ? `
      <div class="contact-item">
        <span class="contact-name">${esc(c.name)}</span>
        ${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener" class="contact-link">${esc(c.url)}</a>` : ''}
        ${c.note ? `<span class="contact-note">${esc(c.note)}</span>` : ''}
      </div>
    ` : `<div class="contact-item"><span class="contact-name">${esc(formatValue(c))}</span></div>`).join('');
    html += block(t('whereToGo'), contacts);
  }

  // 6. Documents
  if (toList(data.documents).length) {
    html += block(t('documents'), listItems(data.documents));
  }

  // 7. Deadlines
  if (toList(data.deadlines).length) {
    html += block(t('deadlines'), listItems(data.deadlines));
  }

  // 8. Sources verified
  if (toList(data.sources_verified).length) {
    const srcList = toList(data.sources_verified).map(s => `<li class="result-list" style="padding:4px 0 4px 24px;position:relative;font-size:13px;color:var(--text-sec)">${esc(formatValue(s))}</li>`).join('');
    html += block(t('verifiedSources'), `<ul class="result-list">${srcList}</ul>`);
  }

  if (toList(data.source_documents).length) {
    const docs = toList(data.source_documents).map(s => typeof s === 'object' ? `
      <div class="legal-basis-item">
        <div class="legal-basis-title">${esc(s.title)}</div>
        <div class="legal-basis-article">${esc(s.type || '')}${s.articles?.length ? ` · ${esc(s.articles.join(', '))}` : ''}</div>
        ${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener" class="legal-basis-link">${esc(t('officialSource'))}</a>` : ''}
      </div>
    ` : `<div class="legal-basis-item">${esc(formatValue(s))}</div>`).join('');
    html += block(t('sourceDocuments'), docs);
  }

  // 9. Disclaimer
  if (data.disclaimer) {
    html += block(t('disclaimer'), `<div class="disclaimer-box">${esc(data.disclaimer)}</div>`);
  }

  resultBody.innerHTML = html;
  resultSection.style.display = 'block';
  if (shouldScroll) resultSection.scrollIntoView({ behavior: 'smooth' });
}

function setSourceBadge(sourceBadge, hasSources) {
  if (!sourceBadge) return;
  sourceBadge.innerHTML = hasSources
    ? `<span class="source-dot"></span>${esc(t('sourceBadgeOk'))}`
    : `<span class="source-dot"></span>${esc(t('sourceBadgeNo'))}`;
}

function fallbackNoSourcesText(outOfScope) {
  return outOfScope
    ? t('fallbackOutOfScope')
    : t('fallbackNoSources');
}

function renderViolationAssessment(assessment) {
  const status = assessment.status || 'insufficient_facts';
  const labels = {
    likely_violation: t('likelyViolation'),
    possible_violation: t('possibleViolation'),
    insufficient_facts: t('insufficientFacts'),
    likely_no_violation: t('likelyNoViolation')
  };
  return `
    <div class="violation-assessment violation-${esc(status)}">
      <div class="violation-status">${esc(labels[status] || labels.insufficient_facts)}</div>
      ${assessment.summary ? `<p class="violation-summary">${esc(assessment.summary)}</p>` : ''}
      ${assessment.reasoning ? `<p class="violation-reasoning">${esc(assessment.reasoning)}</p>` : ''}
    </div>
  `;
}

function block(title, content) {
  return `
    <div class="result-block">
      <div class="result-block-title">${title}</div>
      ${content}
    </div>
  `;
}

function listItems(arr) {
  return '<ul class="result-list">' + toList(arr).map(i => `<li>${esc(formatValue(i))}</li>`).join('') + '</ul>';
}

function stepsItems(arr) {
  return '<ol class="result-steps">' + toList(arr).map(i => `<li>${esc(formatValue(i))}</li>`).join('') + '</ol>';
}

function toList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === null || value === undefined || value === '') return [];
  return [value];
}

function formatValue(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    return Object.values(value).filter(Boolean).join(' — ') || JSON.stringify(value);
  }
  return '';
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setLoading(state) {
  document.getElementById('loadingOverlay').style.display = state ? 'flex' : 'none';
  consultBtn.disabled = state;
}

function showError(msg) {
  const banner = document.getElementById('errorBanner');
  document.getElementById('errorText').textContent = msg;
  banner.style.display = 'flex';
  setTimeout(closeError, 8000);
}
function closeError() {
  document.getElementById('errorBanner').style.display = 'none';
}

function newQuestion() {
  document.getElementById('resultSection').style.display = 'none';
  renderRelevantSources([]);
  lastResultData = null;
  lastQuestionText = '';
  questionInput.value = '';
  charCount.textContent = '0 / 2000';
  questionInput.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function printResult() { window.print(); }

function copyResult() {
  const body = document.getElementById('resultBody');
  const text = body ? body.innerText : '';
  navigator.clipboard.writeText(text).then(() => {
    showToast(t('copied'));
  }).catch(() => {
    showError(t('copyFailed'));
  });
}

function showToast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#2E7D32;color:white;padding:10px 20px;border-radius:8px;font-size:13px;z-index:999;';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function quickExit() {
  window.location.replace('https://www.google.com');
}

function renderRelevantSources(sources) {
  const section = document.getElementById('sources');
  const grid = document.getElementById('sourcesGrid');
  if (!section || !grid) return;

  const relevantSources = toList(sources);
  if (!relevantSources.length) {
    section.style.display = 'none';
    grid.innerHTML = '';
    return;
  }

  section.style.display = 'block';
  grid.innerHTML = relevantSources.map((s, index) => {
    if (typeof s !== 'object') {
      return `<article class="source-row">
        <div class="source-index">${index + 1}</div>
        <div class="source-main">${esc(formatValue(s))}</div>
      </article>`;
    }

    const articles = toList(s.articles);
    const rights = toList(s.rights);

    return `<article class="source-row">
      <div class="source-index">${index + 1}</div>
      <div class="source-main">
        <div class="source-row-head">
          <div>
            <div class="source-type">${esc(s.type || '')}</div>
            <h3 class="source-name">${esc(s.title || '')}</h3>
          </div>
          ${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener" class="source-open">${esc(t('openSource'))}</a>` : ''}
        </div>
        <div class="source-meta">
          ${s.status ? `<span>${esc(s.status)}</span>` : ''}
          ${s.country ? `<span>${esc(s.country)}</span>` : ''}
          ${s.domain ? `<span>${esc(s.domain)}</span>` : ''}
          ${s.date_adopted ? `<span>${esc(s.date_adopted)}</span>` : ''}
        </div>
        ${articles.length ? `<div class="source-articles">${esc(articles.join(', '))}</div>` : ''}
        ${rights.length ? `<div class="source-tags">${rights.map(r => `<span class="source-tag">${esc(r)}</span>`).join('')}</div>` : ''}
      </div>
    </article>`;
  }).join('');
}

function applyLanguage(lang = currentLang()) {
  document.documentElement.lang = lang;
  document.title = translations[lang]?.pageTitle || translations.uk.pageTitle;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (!translations[lang]?.[key] && !translations.uk[key]) return;
    el.innerHTML = translations[lang]?.[key] || translations.uk[key];
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    el.placeholder = translations[lang]?.[key] || translations.uk[key] || '';
  });

  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.dataset.i18nTitle;
    el.title = translations[lang]?.[key] || translations.uk[key] || '';
  });

  const sourceBadge = document.querySelector('.source-badge');
  if (lastResultData) {
    renderResult(lastResultData, lastQuestionText, false);
  } else if (sourceBadge) {
    setSourceBadge(sourceBadge, !document.querySelector('.no-sources-box'));
  }

  if (!lastResultData) renderRelevantSources([]);
}

document.addEventListener('DOMContentLoaded', () => {
  applyLanguage(currentLang());
});

document.getElementById('languageSelect')?.addEventListener('change', (event) => {
  applyLanguage(event.target.value);
});
