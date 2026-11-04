/**
 * 프리랜서 강의 일정 관리 웹앱 (Vanilla JS ES6+)
 * GitHub Pages 무설치/무빌드 직접 배포 지원
 * 구글 시트 8개 열 규격 준수: [날짜, 기관, 시작, 종료, 시간, 상태, 장소, 메모]
 */

// 초기 샘플 일정 데이터
const INITIAL_SCHEDULES = [
  {
    id: 'sch-1',
    date: '2026-11-10',
    institution: 'A대학 디지털융합원',
    startTime: '09:00',
    endTime: '12:00',
    hours: 3.0,
    status: '확정',
    location: '공학관 301호',
    notes: '노트북 및 교안 사전 배포 완료'
  },
  {
    id: 'sch-2',
    date: '2026-11-10',
    institution: 'B기업 인재개발원',
    startTime: '14:00',
    endTime: '17:30',
    hours: 3.5,
    status: '확정',
    location: '본관 2층 대회의실',
    notes: '실습 환경 클라우드 계정 준비'
  },
  {
    id: 'sch-3',
    date: '2026-11-12',
    institution: 'C스타트업 아카데미',
    startTime: '10:00',
    endTime: '13:00',
    hours: 3.0,
    status: '대기',
    location: '강남 캠퍼스 2강의실',
    notes: '견적서 및 커리큘럼 승인 대기 중'
  },
  {
    id: 'sch-4',
    date: '2026-11-15',
    institution: 'D공공기관 연수원',
    startTime: '13:00',
    endTime: '18:00',
    hours: 5.0,
    status: '변경',
    location: '비대면 줌(Zoom)',
    notes: '14일에서 15일로 일정 변경 요청 반영'
  },
  {
    id: 'sch-5',
    date: '2026-11-20',
    institution: 'E테크 협회',
    startTime: '10:00',
    endTime: '12:00',
    hours: 2.0,
    status: '확정',
    location: 'aT센터 3층 중회의실',
    notes: '현장 인쇄 교재 주최측 제공'
  }
];

// 로컬 스토리지 키
const STORAGE_KEY = 'lecturer_schedules_v1';
const SETTINGS_KEY = 'lecturer_sheet_settings_v1';

// 상태 관리
let state = {
  schedules: loadSchedules(),
  sheetSettings: loadSettings(),
  currentScreen: 'list', // 'input' | 'list' | 'summary'
  viewMode: 'table',     // 'table' | 'calendar'
  editingId: null,
  filters: {
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    status: '전체',
    search: ''
  },
  summaryDates: {
    startDate: '2026-11-01',
    endDate: '2026-11-30'
  }
};

function loadSchedules() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('로컬 스토리지 읽기 실패:', e);
  }
  return [...INITIAL_SCHEDULES];
}

function saveSchedules() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.schedules));
  } catch (e) {
    console.error('로컬 스토리지 저장 실패:', e);
  }
}

function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('설정 읽기 실패:', e);
  }
  return {
    appsScriptUrl: '',
    lastSyncTime: null
  };
}

function saveSettings(settings) {
  state.sheetSettings = settings;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('설정 저장 실패:', e);
  }
}

// 종료시각 - 시작시각 자동 계산 (소수점 1자리 시간 단위)
function calculateHours(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return 0;

  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;
  const diff = endTotal - startTotal;
  return diff > 0 ? Number((diff / 60).toFixed(1)) : 0;
}

// 동일 날짜 시간대 중복 검증 엔진 (15분 병목 해결)
function findConflicts(date, startTime, endTime, excludeId = null) {
  if (!date || !startTime || !endTime) return [];

  const [tH1, tM1] = startTime.split(':').map(Number);
  const [tH2, tM2] = endTime.split(':').map(Number);
  const targetStart = tH1 * 60 + tM1;
  const targetEnd = tH2 * 60 + tM2;

  return state.schedules.filter((item) => {
    if (excludeId && item.id === excludeId) return false;
    if (item.date !== date) return false;

    const [iH1, iM1] = item.startTime.split(':').map(Number);
    const [iH2, iM2] = item.endTime.split(':').map(Number);
    const itemStart = iH1 * 60 + iM1;
    const itemEnd = iH2 * 60 + iM2;

    // 겹침 판정 공식: max(start1, start2) < min(end1, end2)
    return Math.max(targetStart, itemStart) < Math.min(targetEnd, itemEnd);
  });
}

// 화면 전환
function switchScreen(screen) {
  state.currentScreen = screen;
  if (screen !== 'input') {
    state.editingId = null;
  }
  render();
}

// 메인 렌더링 함수
function render() {
  updateNav();

  const container = document.getElementById('main-content');
  if (!container) return;

  if (state.currentScreen === 'input') {
    container.innerHTML = renderInputScreen();
    attachInputEvents();
  } else if (state.currentScreen === 'list') {
    container.innerHTML = renderListScreen();
    attachListEvents();
  } else if (state.currentScreen === 'summary') {
    container.innerHTML = renderSummaryScreen();
    attachSummaryEvents();
  }

  // 아이콘 렌더링 (Lucide CDN)
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// 상단 네비게이션 갱신
function updateNav() {
  const totalCountEl = document.getElementById('nav-total-count');
  if (totalCountEl) {
    totalCountEl.textContent = state.schedules.length;
  }

  const navButtons = document.querySelectorAll('[data-nav-screen]');
  navButtons.forEach((btn) => {
    const screen = btn.getAttribute('data-nav-screen');
    if (screen === state.currentScreen) {
      btn.className = 'text-slate-950 font-semibold border-b-2 border-slate-900 pb-0.5 whitespace-nowrap shrink-0';
    } else {
      btn.className = 'text-slate-600 hover:text-slate-900 transition-colors pb-0.5 whitespace-nowrap shrink-0';
    }
  });
}

// ==========================================
// 1. 입력 화면 (일정 등록 + 실시간 중복 감지)
// ==========================================
function renderInputScreen() {
  const editingItem = state.editingId
    ? state.schedules.find((s) => s.id === state.editingId)
    : null;

  const initialDate = editingItem ? editingItem.date : new Date().toISOString().slice(0, 10);
  const initialInst = editingItem ? editingItem.institution : '';
  const initialStart = editingItem ? editingItem.startTime : '10:00';
  const initialEnd = editingItem ? editingItem.endTime : '13:00';
  const initialStatus = editingItem ? editingItem.status : '대기';
  const initialLoc = editingItem ? editingItem.location : '';
  const initialNotes = editingItem ? editingItem.notes : '';

  const initialHours = calculateHours(initialStart, initialEnd);
  const conflicts = findConflicts(initialDate, initialStart, initialEnd, state.editingId);

  // 최근 기관명 목록
  const recentInstitutions = Array.from(new Set(state.schedules.map((s) => s.institution))).slice(0, 5);

  return `
    <div class="max-w-3xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      <div class="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">화면 1 · 입력 화면</div>
          <h1 class="text-xl font-bold tracking-tight text-slate-900 mt-1">
            ${editingItem ? '강의 일정 수정' : '강의 일정 한 건 등록'}
          </h1>
          <p class="text-xs text-slate-500 mt-0.5">
            날짜·기관·시작·종료·상태·장소·메모를 입력해 일정 한 건 등록 (시간 자동 계산 & 0초 중복 감지)
          </p>
        </div>
        ${
          editingItem
            ? `<button id="btn-cancel-edit" class="px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100">수정 취소</button>`
            : ''
        }
      </div>

      <!-- 실시간 중복 감지 알림 배너 -->
      <div id="conflict-banner-container">
        ${renderConflictBanner(conflicts, initialDate, initialStart, initialEnd, initialHours)}
      </div>

      <!-- 성공/알림 배너 -->
      <div id="form-alert-container"></div>

      <!-- 등록/수정 폼 -->
      <form id="schedule-form" class="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
          <!-- 1. 날짜 -->
          <div>
            <label class="block font-semibold text-slate-800 mb-1.5">
              1. 날짜 <span class="text-rose-500">*</span>
              <span class="text-slate-400 font-normal ml-1">(직접 입력)</span>
            </label>
            <input
              type="date"
              id="field-date"
              value="${initialDate}"
              required
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition-all text-xs sm:text-sm"
            />
          </div>

          <!-- 2. 기관 -->
          <div>
            <label class="block font-semibold text-slate-800 mb-1.5">
              2. 기관 <span class="text-rose-500">*</span>
              <span class="text-slate-400 font-normal ml-1">(가상 별칭 직접 입력)</span>
            </label>
            <input
              type="text"
              id="field-institution"
              value="${escapeHtml(initialInst)}"
              placeholder="예: A대학교 디지털융합원, B기업 인재개발원"
              required
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition-all text-xs sm:text-sm"
            />
            ${
              recentInstitutions.length > 0
                ? `<div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span class="text-[11px] text-slate-400">최근 입력:</span>
                    ${recentInstitutions
                      .map(
                        (inst) =>
                          `<button type="button" class="btn-recent-inst text-[11px] text-slate-600 hover:text-slate-900 underline underline-offset-2" data-inst="${escapeHtml(inst)}">${escapeHtml(inst)}</button>`
                      )
                      .join('')}
                   </div>`
                : ''
            }
          </div>

          <!-- 3. 시작 시각 -->
          <div>
            <label class="block font-semibold text-slate-800 mb-1.5">
              3. 시작 시각 <span class="text-rose-500">*</span>
              <span class="text-slate-400 font-normal ml-1">(직접 입력)</span>
            </label>
            <input
              type="time"
              id="field-start-time"
              value="${initialStart}"
              required
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition-all text-xs sm:text-sm"
            />
          </div>

          <!-- 4. 종료 시각 -->
          <div>
            <label class="block font-semibold text-slate-800 mb-1.5">
              4. 종료 시각 <span class="text-rose-500">*</span>
              <span class="text-slate-400 font-normal ml-1">(직접 입력)</span>
            </label>
            <input
              type="time"
              id="field-end-time"
              value="${initialEnd}"
              required
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition-all text-xs sm:text-sm"
            />
            <div class="flex items-center gap-1.5 mt-1.5">
              <span class="text-[11px] text-slate-400">빠른 설정:</span>
              <button type="button" class="btn-quick-duration text-[11px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded" data-hours="2">+2시간</button>
              <button type="button" class="btn-quick-duration text-[11px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded" data-hours="3">+3시간</button>
              <button type="button" class="btn-quick-duration text-[11px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded" data-hours="4">+4시간</button>
            </div>
          </div>

          <!-- 5. 시간 (자동 계산) -->
          <div class="sm:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
            <div>
              <span class="font-semibold text-slate-800">5. 시간 (자동 계산):</span>
              <span class="text-slate-500 text-xs ml-2">수식: 종료시각 − 시작시각</span>
            </div>
            <div class="flex items-center gap-2">
              <span id="display-hours" class="font-mono text-xl font-bold text-blue-700 tabular-nums">
                ${initialHours}
              </span>
              <span class="text-xs font-semibold text-slate-600">시간</span>
            </div>
          </div>

          <!-- 6. 상태 -->
          <div>
            <label class="block font-semibold text-slate-800 mb-1.5">
              6. 상태 <span class="text-rose-500">*</span>
              <span class="text-slate-400 font-normal ml-1">(선택지 드롭다운)</span>
            </label>
            <select
              id="field-status"
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition-all text-xs sm:text-sm font-medium"
            >
              <option value="확정" ${initialStatus === '확정' ? 'selected' : ''}>확정 (일정 확정됨)</option>
              <option value="변경" ${initialStatus === '변경' ? 'selected' : ''}>변경 (일정 변경 조율 중)</option>
              <option value="대기" ${initialStatus === '대기' ? 'selected' : ''}>대기 (의뢰 접수/검토 대기)</option>
            </select>
          </div>

          <!-- 7. 장소 -->
          <div>
            <label class="block font-semibold text-slate-800 mb-1.5">
              7. 장소 <span class="text-rose-500">*</span>
              <span class="text-slate-400 font-normal ml-1">(글자 직접 입력)</span>
            </label>
            <input
              type="text"
              id="field-location"
              value="${escapeHtml(initialLoc)}"
              placeholder="예: 공학관 301호 또는 온라인 줌(Zoom)"
              required
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition-all text-xs sm:text-sm"
            />
          </div>

          <!-- 8. 메모 -->
          <div class="sm:col-span-2">
            <label class="block font-semibold text-slate-800 mb-1.5">
              8. 메모
              <span class="text-slate-400 font-normal ml-1">(글자 직접 입력, 비워도 됨)</span>
            </label>
            <textarea
              id="field-notes"
              rows="2"
              placeholder="교안 사전 송부 여부, 담당자 직함, 주차권 확인 등 특이사항"
              class="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition-all text-xs sm:text-sm resize-none"
            >${escapeHtml(initialNotes)}</textarea>
          </div>
        </div>

        <!-- 폼 하단 버튼 -->
        <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            id="btn-goto-list"
            class="text-xs text-slate-600 hover:text-slate-900"
          >
            ← 근무표 목록으로 이동
          </button>

          <div class="flex items-center gap-2">
            ${
              editingItem
                ? `<button type="button" id="btn-cancel-form" class="px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">취소</button>`
                : ''
            }
            <button
              type="submit"
              class="px-6 py-2.5 bg-slate-900 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <i data-lucide="check" class="w-4 h-4"></i>
              <span>${editingItem ? '수정 완료' : '일정 한 건 시트에 등록'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  `;
}

function renderConflictBanner(conflicts, date, startTime, endTime, hours) {
  if (conflicts.length > 0) {
    return `
      <div class="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
        <div class="flex items-start gap-2.5 text-rose-900">
          <i data-lucide="alert-circle" class="w-5 h-5 text-rose-600 shrink-0 mt-0.5"></i>
          <div>
            <div class="font-bold text-xs sm:text-sm">
              [시간 중복 감지 경고] ${date} 같은 시간대에 이미 등록된 일정이 있습니다!
            </div>
            <p class="text-xs text-rose-700 mt-0.5">
              프리랜서 일정 겹침을 방지하기 위해 즉시 알려드립니다. 시작/종료 시각을 변경하세요.
            </p>
          </div>
        </div>
        <div class="mt-2 space-y-1.5 pt-2 border-t border-rose-200/60">
          ${conflicts
            .map(
              (c) => `
              <div class="flex items-center justify-between bg-white/80 px-3 py-2 rounded-lg text-xs border border-rose-200">
                <div class="flex items-center gap-2 font-medium text-slate-900">
                  <span class="font-semibold text-rose-800">${escapeHtml(c.institution)}</span>
                  <span class="text-slate-400">·</span>
                  <span class="font-mono text-slate-700">${c.startTime} ~ ${c.endTime} (${c.hours}시간)</span>
                  <span class="text-slate-400">·</span>
                  <span class="text-slate-600">${escapeHtml(c.location)}</span>
                </div>
                <span class="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                  ${c.status}
                </span>
              </div>
            `
            )
            .join('')}
        </div>
      </div>
    `;
  } else if (startTime && endTime && hours > 0) {
    return `
      <div class="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-600 shrink-0"></i>
          <span>
            <strong>[중복 없음]</strong> ${date} ${startTime}~${endTime}에 겹치는 일정이 없습니다. 바로 등록 가능합니다.
          </span>
        </div>
        <span class="font-mono font-bold text-emerald-700">안전</span>
      </div>
    `;
  }
  return '';
}

function attachInputEvents() {
  const dateEl = document.getElementById('field-date');
  const startEl = document.getElementById('field-start-time');
  const endEl = document.getElementById('field-end-time');
  const instEl = document.getElementById('field-institution');
  const statusEl = document.getElementById('field-status');
  const locEl = document.getElementById('field-location');
  const notesEl = document.getElementById('field-notes');
  const hoursDisplay = document.getElementById('display-hours');
  const bannerContainer = document.getElementById('conflict-banner-container');

  const updateValidation = () => {
    const d = dateEl.value;
    const s = startEl.value;
    const e = endEl.value;
    const hours = calculateHours(s, e);

    if (hoursDisplay) hoursDisplay.textContent = hours;

    const conflicts = findConflicts(d, s, e, state.editingId);
    if (bannerContainer) {
      bannerContainer.innerHTML = renderConflictBanner(conflicts, d, s, e, hours);
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    }
  };

  dateEl?.addEventListener('change', updateValidation);
  startEl?.addEventListener('input', updateValidation);
  endEl?.addEventListener('input', updateValidation);

  // 빠른 기간 버튼
  document.querySelectorAll('.btn-quick-duration').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const h = Number(e.currentTarget.getAttribute('data-hours'));
      if (!startEl.value) return;
      const [startH, startM] = startEl.value.split(':').map(Number);
      const totalEnd = startH * 60 + startM + h * 60;
      const endH = Math.floor(totalEnd / 60) % 24;
      const endM = totalEnd % 60;
      endEl.value = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
      updateValidation();
    });
  });

  // 최근 기관 태그 클릭
  document.querySelectorAll('.btn-recent-inst').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      instEl.value = e.currentTarget.getAttribute('data-inst') || '';
    });
  });

  // 취소 버튼
  document.getElementById('btn-cancel-edit')?.addEventListener('click', () => {
    state.editingId = null;
    switchScreen('list');
  });
  document.getElementById('btn-cancel-form')?.addEventListener('click', () => {
    state.editingId = null;
    switchScreen('list');
  });
  document.getElementById('btn-goto-list')?.addEventListener('click', () => {
    switchScreen('list');
  });

  // 폼 제출
  document.getElementById('schedule-form')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const d = dateEl.value;
    const inst = instEl.value.trim();
    const s = startEl.value;
    const en = endEl.value;
    const stat = statusEl.value;
    const loc = locEl.value.trim();
    const notes = notesEl.value.trim();
    const hours = calculateHours(s, en);

    if (!d || !inst || !s || !en || !loc) {
      alert('필수 항목을 모두 입력해 주세요.');
      return;
    }

    if (hours <= 0) {
      alert('종료 시각은 시작 시각보다 늦어야 합니다.');
      return;
    }

    const conflicts = findConflicts(d, s, en, state.editingId);
    if (conflicts.length > 0) {
      const confirmForce = confirm(
        `[일정 중복 경고] 동일 날짜에 이미 등록된 '${conflicts[0].institution}' (${conflicts[0].startTime}~${conflicts[0].endTime}) 일정과 시간이 겹칩니다.\n\n정말 등록하시겠습니까?`
      );
      if (!confirmForce) return;
    }

    if (state.editingId) {
      // 수정
      state.schedules = state.schedules.map((item) =>
        item.id === state.editingId
          ? {
              ...item,
              date: d,
              institution: inst,
              startTime: s,
              endTime: en,
              hours,
              status: stat,
              location: loc,
              notes
            }
          : item
      );
      state.editingId = null;
    } else {
      // 신규 등록
      const newItem = {
        id: 'sch-' + Date.now(),
        date: d,
        institution: inst,
        startTime: s,
        endTime: en,
        hours,
        status: stat,
        location: loc,
        notes
      };
      state.schedules.unshift(newItem);

      // 구글 시트 백그라운드 POST 전송
      if (state.sheetSettings.appsScriptUrl) {
        fetch(state.sheetSettings.appsScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newItem)
        }).catch((err) => console.log('Apps script sync notification', err));
      }
    }

    saveSchedules();
    switchScreen('list');
  });
}

// ==========================================
// 2. 목록 화면 (근무표 목록 & 8열 시트 표/타임라인)
// ==========================================
function renderListScreen() {
  const { startDate, endDate, status, search } = state.filters;

  // 필터링 및 날짜/시작 시각 오름차순 정렬
  const filtered = state.schedules
    .filter((item) => {
      const matchDate =
        (!startDate || item.date >= startDate) && (!endDate || item.date <= endDate);
      const matchStatus = status === '전체' || item.status === status;
      const matchSearch =
        !search.trim() ||
        item.institution.toLowerCase().includes(search.toLowerCase()) ||
        item.location.toLowerCase().includes(search.toLowerCase()) ||
        item.notes.toLowerCase().includes(search.toLowerCase());
      return matchDate && matchStatus && matchSearch;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });

  const totalHours = filtered.reduce((acc, curr) => acc + curr.hours, 0);
  const confirmedHours = filtered
    .filter((s) => s.status === '확정')
    .reduce((acc, curr) => acc + curr.hours, 0);

  // 날짜별 그룹 (근무표 뷰용)
  const groupedByDate = new Map();
  filtered.forEach((item) => {
    const arr = groupedByDate.get(item.date) || [];
    arr.push(item);
    groupedByDate.set(item.date, arr);
  });

  return `
    <div class="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      <!-- 타이틀 및 상단 액션 -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">화면 2 · 목록 화면</div>
          <h1 class="text-xl font-bold tracking-tight text-slate-900 mt-1">근무표 유형 강의 일정 목록</h1>
          <p class="text-xs text-slate-500 mt-0.5">
            기간과 상태로 일정을 골라 보고, 날짜·시작 시각순으로 정렬 확인
          </p>
        </div>

        <div class="flex items-center gap-2">
          <!-- 표 / 근무표 뷰 토글 -->
          <div class="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg">
            <button
              id="view-table-btn"
              class="p-1.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                state.viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }"
            >
              <i data-lucide="layout-list" class="w-3.5 h-3.5"></i>
              <span class="hidden sm:inline">표 보기</span>
            </button>
            <button
              id="view-calendar-btn"
              class="p-1.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                state.viewMode === 'calendar' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }"
            >
              <i data-lucide="calendar-range" class="w-3.5 h-3.5"></i>
              <span class="hidden sm:inline">근무표 보기</span>
            </button>
          </div>

          <button
            id="btn-export-csv"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <i data-lucide="download" class="w-3.5 h-3.5"></i>
            <span>CSV 저장</span>
          </button>

          <button
            id="btn-new-schedule-from-list"
            class="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
            <span>일정 등록</span>
          </button>
        </div>
      </div>

      <!-- 필터 툴바 -->
      <div class="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3 shadow-xs">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">조회 시작일</label>
            <input
              type="date"
              id="filter-start-date"
              value="${startDate}"
              class="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-slate-900 focus:bg-white focus:outline-hidden"
            />
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">조회 종료일</label>
            <input
              type="date"
              id="filter-end-date"
              value="${endDate}"
              class="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-slate-900 focus:bg-white focus:outline-hidden"
            />
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">상태 필터</label>
            <select
              id="filter-status"
              class="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-medium text-slate-900 focus:bg-white focus:outline-hidden"
            >
              <option value="전체" ${status === '전체' ? 'selected' : ''}>전체 상태</option>
              <option value="확정" ${status === '확정' ? 'selected' : ''}>확정 (확정된 강의)</option>
              <option value="변경" ${status === '변경' ? 'selected' : ''}>변경 (일정 변경 요청)</option>
              <option value="대기" ${status === '대기' ? 'selected' : ''}>대기 (검토/조율 중)</option>
            </select>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">기관 / 장소 검색</label>
            <input
              type="text"
              id="filter-search"
              value="${escapeHtml(search)}"
              placeholder="기관명 또는 장소 검색..."
              class="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div class="flex items-center gap-1.5">
            <span class="text-slate-500 font-medium">기간 바로 선택:</span>
            <button class="btn-preset-date px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium" data-start="2026-11-01" data-end="2026-11-30">2026년 11월</button>
            <button class="btn-preset-date px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium" data-start="2026-12-01" data-end="2026-12-31">2026년 12월</button>
            <button class="btn-preset-date px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium" data-start="" data-end="">전체 기간</button>
          </div>
          <div class="flex items-center gap-4 text-slate-600 font-mono text-[11px]">
            <span>선택 일정: <strong>${filtered.length}</strong>건</span>
            <span class="text-slate-300">|</span>
            <span>강의 시간: 확정 <strong class="text-blue-700">${confirmedHours.toFixed(1)}</strong>h / 총 ${totalHours.toFixed(1)}h</span>
          </div>
        </div>
      </div>

      <!-- 데이터 뷰 영역 -->
      ${
        state.viewMode === 'table'
          ? renderTableView(filtered)
          : renderCalendarView(groupedByDate)
      }
    </div>
  `;
}

function renderTableView(items) {
  return `
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-semibold">
              <th class="py-3 px-3.5">날짜</th>
              <th class="py-3 px-3.5">기관 (가상 별칭)</th>
              <th class="py-3 px-3">시작</th>
              <th class="py-3 px-3">종료</th>
              <th class="py-3 px-3 text-right">시간(자동)</th>
              <th class="py-3 px-3 text-center">상태</th>
              <th class="py-3 px-3.5">장소</th>
              <th class="py-3 px-3.5">메모</th>
              <th class="py-3 px-3 text-center">관리</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            ${
              items.length === 0
                ? `<tr><td colspan="9" class="py-12 text-center text-slate-400">선택한 기간 및 조건에 부합하는 일정이 없습니다.</td></tr>`
                : items
                    .map(
                      (row) => `
                <tr class="hover:bg-slate-50/80 transition-colors group">
                  <td class="py-3 px-3.5 font-mono font-medium text-slate-900 whitespace-nowrap">${row.date}</td>
                  <td class="py-3 px-3.5 font-semibold text-slate-800">${escapeHtml(row.institution)}</td>
                  <td class="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">${row.startTime}</td>
                  <td class="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">${row.endTime}</td>
                  <td class="py-3 px-3 font-mono text-right font-bold text-blue-700 whitespace-nowrap tabular-nums">${row.hours}시간</td>
                  <td class="py-3 px-3 text-center whitespace-nowrap">
                    <select
                      class="row-status-select text-xs font-semibold px-2 py-0.5 rounded border ${
                        row.status === '확정'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : row.status === '변경'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }"
                      data-id="${row.id}"
                    >
                      <option value="확정" ${row.status === '확정' ? 'selected' : ''}>확정</option>
                      <option value="변경" ${row.status === '변경' ? 'selected' : ''}>변경</option>
                      <option value="대기" ${row.status === '대기' ? 'selected' : ''}>대기</option>
                    </select>
                  </td>
                  <td class="py-3 px-3.5 text-slate-700 max-w-xs truncate">${escapeHtml(row.location)}</td>
                  <td class="py-3 px-3.5 text-slate-500 max-w-xs truncate">${escapeHtml(row.notes) || '<span class="text-slate-300">-</span>'}</td>
                  <td class="py-3 px-3 text-center whitespace-nowrap">
                    <div class="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100">
                      <button class="btn-edit-row p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100" data-id="${row.id}" title="수정">
                        <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                      </button>
                      <button class="btn-delete-row p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100" data-id="${row.id}" title="삭제">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderCalendarView(groupedMap) {
  if (groupedMap.size === 0) {
    return `<div class="p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-xl">선택한 조건의 일정이 없습니다.</div>`;
  }

  return `
    <div class="space-y-4">
      ${Array.from(groupedMap.entries())
        .map(([dayDate, items]) => {
          const dayHours = items.reduce((acc, curr) => acc + curr.hours, 0);
          const weekday = new Date(dayDate).toLocaleDateString('ko-KR', { weekday: 'long' });

          return `
            <div class="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
              <div class="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-900 text-sm font-mono">${dayDate}</span>
                  <span class="text-slate-400">·</span>
                  <span class="text-slate-500">${weekday}</span>
                </div>
                <div class="font-mono text-slate-600">
                  총 ${items.length}건 · <strong class="text-blue-700">${dayHours}시간</strong>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${items
                  .map(
                    (item) => `
                  <div class="p-3.5 rounded-lg border text-xs space-y-2 ${
                    item.status === '확정'
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : item.status === '변경'
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }">
                    <div class="flex items-center justify-between">
                      <span class="font-bold text-slate-900 text-sm">${escapeHtml(item.institution)}</span>
                      <span class="px-2 py-0.5 rounded text-[11px] font-semibold ${
                        item.status === '확정'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === '변경'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }">
                        ${item.status}
                      </span>
                    </div>

                    <div class="flex items-center justify-between text-slate-700 font-mono">
                      <span>${item.startTime} ~ ${item.endTime}</span>
                      <span class="font-bold text-blue-700">${item.hours}시간</span>
                    </div>

                    <div class="text-slate-600 flex items-center justify-between pt-1 border-t border-slate-200/50">
                      <span class="truncate">${escapeHtml(item.location)}</span>
                      <div class="flex items-center gap-1 shrink-0 ml-2">
                        <button class="btn-edit-row text-slate-500 hover:text-slate-900 px-1 py-0.5" data-id="${item.id}">수정</button>
                        <span class="text-slate-300">·</span>
                        <button class="btn-delete-row text-slate-400 hover:text-rose-600 px-1 py-0.5" data-id="${item.id}">삭제</button>
                      </div>
                    </div>
                    ${
                      item.notes
                        ? `<div class="text-[11px] text-slate-500 italic bg-white/70 p-1.5 rounded">${escapeHtml(item.notes)}</div>`
                        : ''
                    }
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function attachListEvents() {
  // 필터 이벤트
  document.getElementById('filter-start-date')?.addEventListener('change', (e) => {
    state.filters.startDate = e.target.value;
    render();
  });
  document.getElementById('filter-end-date')?.addEventListener('change', (e) => {
    state.filters.endDate = e.target.value;
    render();
  });
  document.getElementById('filter-status')?.addEventListener('change', (e) => {
    state.filters.status = e.target.value;
    render();
  });
  document.getElementById('filter-search')?.addEventListener('input', (e) => {
    state.filters.search = e.target.value;
    render();
  });

  // 프리셋 날짜 버튼
  document.querySelectorAll('.btn-preset-date').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      state.filters.startDate = e.currentTarget.getAttribute('data-start') || '';
      state.filters.endDate = e.currentTarget.getAttribute('data-end') || '';
      render();
    });
  });

  // 뷰 모드 토글
  document.getElementById('view-table-btn')?.addEventListener('click', () => {
    state.viewMode = 'table';
    render();
  });
  document.getElementById('view-calendar-btn')?.addEventListener('click', () => {
    state.viewMode = 'calendar';
    render();
  });

  // CSV 다운로드
  document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    downloadCSV();
  });

  // 신규 등록 이동
  document.getElementById('btn-new-schedule-from-list')?.addEventListener('click', () => {
    state.editingId = null;
    switchScreen('input');
  });

  // 행 내 상태 변경
  document.querySelectorAll('.row-status-select').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      const id = e.target.getAttribute('data-id');
      const newStatus = e.target.value;
      state.schedules = state.schedules.map((s) => (s.id === id ? { ...s, status: newStatus } : s));
      saveSchedules();
      render();
    });
  });

  // 행 수정
  document.querySelectorAll('.btn-edit-row').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      state.editingId = e.currentTarget.getAttribute('data-id');
      switchScreen('input');
    });
  });

  // 행 삭제
  document.querySelectorAll('.btn-delete-row').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const item = state.schedules.find((s) => s.id === id);
      if (confirm(`'${item?.institution || '해당'}' 일정을 삭제하시겠습니까?`)) {
        state.schedules = state.schedules.filter((s) => s.id !== id);
        saveSchedules();
        render();
      }
    });
  });
}

// ==========================================
// 3. 요약 화면 (선택 기간 요약 통계)
// ==========================================
function renderSummaryScreen() {
  const { startDate, endDate } = state.summaryDates;

  const filtered = state.schedules.filter((item) => {
    return (!startDate || item.date >= startDate) && (!endDate || item.date <= endDate);
  });

  const confirmedItems = filtered.filter((i) => i.status === '확정');
  const changedItems = filtered.filter((i) => i.status === '변경');
  const waitingItems = filtered.filter((i) => i.status === '대기');

  const confirmedCount = confirmedItems.length;
  const confirmedHours = confirmedItems.reduce((acc, curr) => acc + curr.hours, 0);
  const changedCount = changedItems.length;
  const totalCount = filtered.length;
  const totalHours = filtered.reduce((acc, curr) => acc + curr.hours, 0);

  // 기관별 확정 시간 집계
  const instMap = new Map();
  confirmedItems.forEach((item) => {
    const cur = instMap.get(item.institution) || { count: 0, hours: 0 };
    instMap.set(item.institution, {
      count: cur.count + 1,
      hours: Number((cur.hours + item.hours).toFixed(1))
    });
  });
  const instBreakdown = Array.from(instMap.entries()).sort((a, b) => b[1].hours - a[1].hours);

  return `
    <div class="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      <!-- 타이틀 및 기간 선택 -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">화면 3 · 요약 화면</div>
          <h1 class="text-xl font-bold tracking-tight text-slate-900 mt-1">선택 기간 요약 통계 대시보드</h1>
          <p class="text-xs text-slate-500 mt-0.5">
            선택한 기간의 확정 일정 수·확정 시간 합계·변경 일정 수 확인
          </p>
        </div>

        <div class="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-lg text-xs shadow-2xs">
          <i data-lucide="calendar" class="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1"></i>
          <input
            type="date"
            id="summary-start-date"
            value="${startDate}"
            class="px-1.5 py-1 bg-transparent font-mono text-slate-800 text-xs focus:outline-hidden"
          />
          <span class="text-slate-400 font-mono">~</span>
          <input
            type="date"
            id="summary-end-date"
            value="${endDate}"
            class="px-1.5 py-1 bg-transparent font-mono text-slate-800 text-xs focus:outline-hidden"
          />
        </div>
      </div>

      <!-- 3대 핵심 지표 카드 -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <!-- 1. 확정 일정 수 -->
        <div class="bg-white border border-slate-200 rounded-xl p-5 space-y-2 shadow-xs">
          <div class="flex items-center justify-between text-slate-600 text-xs font-semibold">
            <span>1. 확정 일정 수</span>
            <span class="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <i data-lucide="check-circle-2" class="w-4 h-4"></i>
            </span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="font-mono text-3xl font-bold text-slate-900 tabular-nums">${confirmedCount}</span>
            <span class="text-xs font-medium text-slate-500">건</span>
          </div>
          <div class="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>전체 ${totalCount}건 중</span>
            <span class="font-mono font-semibold text-emerald-700">
              ${totalCount ? Math.round((confirmedCount / totalCount) * 100) : 0}% 확정
            </span>
          </div>
        </div>

        <!-- 2. 확정 시간 합계 -->
        <div class="bg-white border border-slate-200 rounded-xl p-5 space-y-2 shadow-xs">
          <div class="flex items-center justify-between text-slate-600 text-xs font-semibold">
            <span>2. 확정 시간 합계</span>
            <span class="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <i data-lucide="clock" class="w-4 h-4"></i>
            </span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="font-mono text-3xl font-bold text-blue-700 tabular-nums">${confirmedHours.toFixed(1)}</span>
            <span class="text-xs font-medium text-slate-500">시간</span>
          </div>
          <div class="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>종료−시작 자동 계산</span>
            <span class="font-mono text-slate-600">총 강의 ${totalHours.toFixed(1)}h 중</span>
          </div>
        </div>

        <!-- 3. 변경 일정 수 -->
        <div class="bg-white border border-slate-200 rounded-xl p-5 space-y-2 shadow-xs">
          <div class="flex items-center justify-between text-slate-600 text-xs font-semibold">
            <span>3. 변경 일정 수</span>
            <span class="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
              <i data-lucide="alert-triangle" class="w-4 h-4"></i>
            </span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="font-mono text-3xl font-bold text-amber-700 tabular-nums">${changedCount}</span>
            <span class="text-xs font-medium text-slate-500">건</span>
          </div>
          <div class="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>일정 재조율 대상</span>
            <span class="font-mono text-amber-700">대기 중: ${waitingItems.length}건</span>
          </div>
        </div>
      </div>

      <!-- 기관별 확정 강의 시간 -->
      <div class="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 class="text-sm font-bold text-slate-900">기관별 확정 강의 시간</h3>
            <p class="text-xs text-slate-500 mt-0.5">선택 기간 동안 확정된 강의의 기관별 배분 현황</p>
          </div>
          <button id="btn-summary-goto-list" class="text-xs font-medium text-blue-700 hover:underline flex items-center gap-1">
            <span>근무표 목록 보기</span>
            <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>

        ${
          instBreakdown.length === 0
            ? `<div class="py-8 text-center text-xs text-slate-400">선택한 기간에 확정된 강의 일정이 없습니다.</div>`
            : `<div class="space-y-3">
                ${instBreakdown
                  .map(([inst, stat]) => {
                    const maxH = instBreakdown[0][1].hours || 1;
                    const percent = Math.round((stat.hours / maxH) * 100);
                    return `
                    <div class="space-y-1.5">
                      <div class="flex items-center justify-between text-xs">
                        <span class="font-semibold text-slate-800">${escapeHtml(inst)}</span>
                        <span class="font-mono text-slate-600">
                          ${stat.count}회 강의 · <strong class="text-blue-700">${stat.hours}시간</strong>
                        </span>
                      </div>
                      <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div class="bg-slate-900 h-full rounded-full transition-all duration-300" style="width: ${percent}%"></div>
                      </div>
                    </div>
                  `;
                  })
                  .join('')}
               </div>`
        }
      </div>
    </div>
  `;
}

function attachSummaryEvents() {
  document.getElementById('summary-start-date')?.addEventListener('change', (e) => {
    state.summaryDates.startDate = e.target.value;
    render();
  });
  document.getElementById('summary-end-date')?.addEventListener('change', (e) => {
    state.summaryDates.endDate = e.target.value;
    render();
  });
  document.getElementById('btn-summary-goto-list')?.addEventListener('click', () => {
    switchScreen('list');
  });
}

// ==========================================
// CSV 다운로드 유틸리티
// ==========================================
function downloadCSV() {
  const headers = ['날짜', '기관', '시작', '종료', '시간', '상태', '장소', '메모'];
  const rows = state.schedules.map((s) => [
    s.date,
    `"${s.institution.replace(/"/g, '""')}"`,
    s.startTime,
    s.endTime,
    s.hours,
    s.status,
    `"${s.location.replace(/"/g, '""')}"`,
    `"${(s.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `강의일정근무표_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==========================================
// 구글 시트 연동 모달 핸들링
// ==========================================
function initSyncModal() {
  const modal = document.getElementById('sync-modal');
  const openBtn = document.getElementById('btn-open-sync');
  const closeBtn = document.getElementById('btn-close-modal');
  const closeFooterBtn = document.getElementById('btn-close-footer');
  const saveBtn = document.getElementById('btn-save-sync');
  const syncNowBtn = document.getElementById('btn-sync-now');
  const copyScriptBtn = document.getElementById('btn-copy-script');
  const urlInput = document.getElementById('input-apps-script-url');
  const lastSyncLabel = document.getElementById('sync-last-time');

  if (!modal) return;

  const openModal = () => {
    if (urlInput) urlInput.value = state.sheetSettings.appsScriptUrl || '';
    if (lastSyncLabel && state.sheetSettings.lastSyncTime) {
      lastSyncLabel.textContent = `마지막 동기화: ${state.sheetSettings.lastSyncTime}`;
    }
    modal.classList.remove('hidden');
  };

  const closeModal = () => {
    modal.classList.add('hidden');
  };

  openBtn?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  closeFooterBtn?.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  saveBtn?.addEventListener('click', () => {
    const newUrl = urlInput.value.trim();
    saveSettings({
      ...state.sheetSettings,
      appsScriptUrl: newUrl
    });
    closeModal();
    alert('구글 시트 연동 설정이 저장되었습니다.');
  });

  syncNowBtn?.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) {
      alert('구글 Apps Script 웹 앱 URL을 먼저 입력해 주세요.');
      return;
    }

    syncNowBtn.disabled = true;
    syncNowBtn.textContent = '동기화 중...';

    try {
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        state.schedules = json.data;
        saveSchedules();
        const now = new Date().toLocaleString();
        saveSettings({
          ...state.sheetSettings,
          appsScriptUrl: url,
          lastSyncTime: now
        });
        if (lastSyncLabel) lastSyncLabel.textContent = `마지막 동기화: ${now}`;
        render();
        alert(`구글 시트에서 ${json.data.length}건의 일정을 성공적으로 불러왔습니다.`);
      } else {
        alert('구글 시트에 가져올 데이터가 없거나 형식이 맞지 않습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('구글 시트 동기화 중 오류가 발생했습니다. 웹 앱 URL과 배포 권한("모든 사용자")을 확인해 주세요.');
    } finally {
      syncNowBtn.disabled = false;
      syncNowBtn.textContent = '지금 동기화';
    }
  });

  copyScriptBtn?.addEventListener('click', () => {
    const codeEl = document.getElementById('apps-script-code-block');
    if (codeEl) {
      navigator.clipboard.writeText(codeEl.innerText.trim());
      copyScriptBtn.textContent = '코드 복사 완료!';
      setTimeout(() => {
        copyScriptBtn.textContent = 'Apps Script 코드 복사';
      }, 2000);
    }
  });
}

// XSS 방지 이스케이프
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 초기화 진입점
function initApp() {
  // 상단 네비게이션 이벤트
  document.querySelectorAll('[data-nav-screen]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const screen = e.currentTarget.getAttribute('data-nav-screen');
      switchScreen(screen);
    });
  });

  document.getElementById('btn-quick-new')?.addEventListener('click', () => {
    state.editingId = null;
    switchScreen('input');
  });

  initSyncModal();
  render();
}

// 문서 로드 상태 안전 확인 (이미 로드 완료된 경우 즉시 실행)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
