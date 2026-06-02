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

  if (!question) { showError('Будь ласка, введіть питання'); return; }
  if (question.length < 10) { showError('Питання занадто коротке'); return; }

  setLoading(true);
  closeError();

  try {
    const res = await fetch('/api/consult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, country })
    });
    const data = await res.json();

    if (data.error) {
      showError(data.message);
    } else {
      renderResult(data, question);
    }
  } catch (err) {
    showError('Помилка з\'єднання з сервером. Перевірте підключення.');
  } finally {
    setLoading(false);
  }
}

function renderResult(data, question) {
  const resultSection = document.getElementById('resultSection');
  const resultBody = document.getElementById('resultBody');
  const resultTime = document.getElementById('resultTime');

  resultTime.textContent = data.queried_at || '';

  if (!data.has_sources) {
    resultBody.innerHTML = `
      <div class="no-sources-box">
        ⚠ Недостатньо офіційних джерел для формування відповіді.<br/>
        ${data.short_answer || 'Рекомендуємо звернутися до юриста або перевірити інформацію в офіційному органі.'}
      </div>
    `;
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  let html = '';

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
  if (data.documents?.filter(Boolean).length) {
    html += block('Можливі документи', listItems(data.documents));
  }

  // 7. Deadlines
  if (data.deadlines?.filter(Boolean).length) {
    html += block('Строки', listItems(data.deadlines));
  }

  // 8. Sources verified
  if (data.sources_verified?.length) {
    const srcList = data.sources_verified.map(s => `<li class="result-list" style="padding:4px 0 4px 24px;position:relative;font-size:13px;color:var(--text-sec)">${esc(s)}</li>`).join('');
    html += block('Перевірені джерела', `<ul class="result-list">${srcList}</ul>`);
  }

  // 9. Disclaimer
  if (data.disclaimer) {
    html += block('Застереження', `<div class="disclaimer-box">${esc(data.disclaimer)}</div>`);
  }

  resultBody.innerHTML = html;
  resultSection.style.display = 'block';
  resultSection.scrollIntoView({ behavior: 'smooth' });
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
  return '<ul class="result-list">' + arr.filter(Boolean).map(i => `<li>${esc(i)}</li>`).join('') + '</ul>';
}

function stepsItems(arr) {
  return '<ol class="result-steps">' + arr.filter(Boolean).map(i => `<li>${esc(i)}</li>`).join('') + '</ol>';
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
    const res = await fetch(`/api/sources?country=${country}`);
    const sources = await res.json();
    const grid = document.getElementById('sourcesGrid');
    if (!grid) return;
    grid.innerHTML = sources.map(s => `
      <div class="source-card">
        <div class="source-type">${esc(s.type)}</div>
        <div class="source-name">${esc(s.title)}</div>
        <div class="source-status">✓ ${esc(s.status)}</div>
        <a href="${esc(s.url)}" target="_blank" rel="noopener" class="source-url">${esc(s.domain)}</a>
        <div class="source-tags">
          ${(s.rights || []).slice(0, 3).map(r => `<span class="source-tag">${esc(r)}</span>`).join('')}
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.warn('Failed to load sources', e);
  }
}

document.addEventListener('DOMContentLoaded', loadSources);

// Reload sources on country change
document.getElementById('countrySelect')?.addEventListener('change', loadSources);
