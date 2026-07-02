// eJustice — Frontend Logic

const questionInput = document.getElementById('questionInput');
const charCount = document.getElementById('charCount');
const consultBtn = document.getElementById('consultBtn');

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

  if (!question) { showError('Будь ласка, введіть питання'); return; }
  if (question.length < 10) { showError('Питання занадто коротке'); return; }

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
      throw new Error(`Сервер повернув не JSON-відповідь (${res.status}).`);
    }

    if (!res.ok) {
      throw new Error(data.message || `Помилка сервера: ${res.status}`);
    }

    if (data.error) {
      showError(data.message);
    } else {
      renderResult(data, question);
    }
  } catch (err) {
    showError(err.message || 'Помилка з\'єднання з сервером. Перевірте підключення.');
  } finally {
    setLoading(false);
  }
}

function renderResult(data, question) {
  const resultSection = document.getElementById('resultSection');
  const resultBody = document.getElementById('resultBody');
  const resultTime = document.getElementById('resultTime');
  const sourceBadge = document.querySelector('.source-badge');

  resultTime.textContent = data.queried_at || '';

  if (!data.has_sources) {
    setSourceBadge(sourceBadge, false);
    resultBody.innerHTML = `
      <div class="no-sources-box">
        ⚠ ${data.out_of_scope ? 'Питання поза правовою темою.' : 'Недостатньо офіційних джерел для формування відповіді.'}<br/>
        ${esc(data.short_answer || fallbackNoSourcesText(data.out_of_scope))}
      </div>
    `;
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  let html = '';
  setSourceBadge(sourceBadge, true);

  if (data.violation_assessment) {
    html += block('Оцінка наявності порушення', renderViolationAssessment(data.violation_assessment));
  }

  if (data.case_analysis) {
    html += block('Розбір справи по суті', `<p class="result-short">${esc(data.case_analysis)}</p>`);
  }

  if (data.fact_assessment?.length) {
    html += block('Факти, що впливають на оцінку', listItems(data.fact_assessment));
  }

  // 1. Short answer
  html += block('Відповідь', `<p class="result-short">${esc(data.short_answer)}</p>`);

  // 2. Your rights
  if (data.your_rights?.length) {
    html += block('Ваші права', listItems(data.your_rights));
  }

  // 3. Legal basis
  if (data.legal_basis?.length) {
    const bases = data.legal_basis.map(b => `
      <div class="legal-basis-item">
        <div class="legal-basis-title">${esc(b.title)}</div>
        ${b.article ? `<div class="legal-basis-article">${esc(b.article)}</div>` : ''}
        ${b.url ? `<a href="${esc(b.url)}" target="_blank" rel="noopener" class="legal-basis-link">↗ Офіційне джерело</a>` : ''}
      </div>
    `).join('');
    html += block('Правова підстава', bases);
  }

  // 4. Steps
  if (data.steps?.length) {
    html += block('Що зробити зараз', stepsItems(data.steps));
  }

  // 5. Where to go
  if (data.where_to_go?.length) {
    const contacts = data.where_to_go.map(c => `
      <div class="contact-item">
        <span class="contact-name">${esc(c.name)}</span>
        ${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener" class="contact-link">${esc(c.url)}</a>` : ''}
        ${c.note ? `<span class="contact-note">${esc(c.note)}</span>` : ''}
      </div>
    `).join('');
    html += block('Куди звертатися', contacts);
  }

  // 6. Documents
  if (toList(data.documents).length) {
    html += block('Можливі документи', listItems(data.documents));
  }

  // 7. Deadlines
  if (toList(data.deadlines).length) {
    html += block('Строки', listItems(data.deadlines));
  }

  // 8. Sources verified
  if (data.sources_verified?.length) {
    const srcList = data.sources_verified.map(s => `<li class="result-list" style="padding:4px 0 4px 24px;position:relative;font-size:13px;color:var(--text-sec)">${esc(s)}</li>`).join('');
    html += block('Перевірені джерела', `<ul class="result-list">${srcList}</ul>`);
  }

  if (data.source_documents?.length) {
    const docs = data.source_documents.map(s => `
      <div class="legal-basis-item">
        <div class="legal-basis-title">${esc(s.title)}</div>
        <div class="legal-basis-article">${esc(s.type || '')}${s.articles?.length ? ` · ${esc(s.articles.join(', '))}` : ''}</div>
        ${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener" class="legal-basis-link">↗ Офіційне джерело</a>` : ''}
      </div>
    `).join('');
    html += block('Документи, враховані у відповіді', docs);
  }

  // 9. Disclaimer
  if (data.disclaimer) {
    html += block('Застереження', `<div class="disclaimer-box">${esc(data.disclaimer)}</div>`);
  }

  resultBody.innerHTML = html;
  resultSection.style.display = 'block';
  resultSection.scrollIntoView({ behavior: 'smooth' });
}

function setSourceBadge(sourceBadge, hasSources) {
  if (!sourceBadge) return;
  sourceBadge.innerHTML = hasSources
    ? '<span class="source-dot"></span>Відповідь сформована на основі офіційних джерел'
    : '<span class="source-dot"></span>Поза правовою темою: юридичні джерела не підбиралися';
}

function fallbackNoSourcesText(outOfScope) {
  return outOfScope
    ? 'Сформулюйте питання як правову ситуацію: яке право порушено, куди звернутися, який документ потрібен або яку скаргу подати.'
    : 'Рекомендуємо звернутися до юриста або перевірити інформацію в офіційному органі.';
}

function renderViolationAssessment(assessment) {
  const status = assessment.status || 'insufficient_facts';
  const labels = {
    likely_violation: 'Ймовірно є порушення',
    possible_violation: 'Може бути порушення',
    insufficient_facts: 'Недостатньо фактів для висновку',
    likely_no_violation: 'Ознак порушення не видно'
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
    showToast('Скопійовано в буфер обміну');
  }).catch(() => {
    showError('Не вдалось скопіювати');
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

// Load sources list
async function loadSources() {
  const country = document.getElementById('countrySelect')?.value || 'UA';
  try {
    const res = await fetch(`/api/sources?country=${country}&all=1`);
    const payload = await res.json();
    const sources = Array.isArray(payload) ? payload : payload.sources;
    const grid = document.getElementById('sourcesGrid');
    if (!grid) return;
    grid.innerHTML = (sources || []).map((s, index) => `
      <article class="source-row">
        <div class="source-index">${index + 1}</div>
        <div class="source-main">
          <div class="source-row-head">
            <div>
              <div class="source-type">${esc(s.type)}</div>
              <h3 class="source-name">${esc(s.title)}</h3>
            </div>
            <a href="${esc(s.url)}" target="_blank" rel="noopener" class="source-open">Відкрити</a>
          </div>
          <div class="source-meta">
            <span>${esc(s.status || 'чинний')}</span>
            <span>${esc(s.country || 'UNIVERSAL')}</span>
            <span>${esc(s.domain || '')}</span>
            ${s.date_adopted ? `<span>${esc(s.date_adopted)}</span>` : ''}
          </div>
          ${s.articles?.length ? `<div class="source-articles">${esc(s.articles.join(', '))}</div>` : ''}
          <div class="source-tags">
            ${(s.rights || []).map(r => `<span class="source-tag">${esc(r)}</span>`).join('')}
          </div>
        </div>
      </article>
    `).join('');
  } catch (e) {
    console.warn('Failed to load sources', e);
  }
}

document.addEventListener('DOMContentLoaded', loadSources);

// Reload sources on country change
document.getElementById('countrySelect')?.addEventListener('change', loadSources);
