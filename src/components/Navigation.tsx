import React from 'react';
import { Calendar, Plus, Table, BarChart3, Settings, Download } from 'lucide-react';

interface NavigationProps {
  currentScreen: 'input' | 'list' | 'summary';
  setCurrentScreen: (screen: 'input' | 'list' | 'summary') => void;
  onOpenSyncModal: () => void;
  onQuickNew: () => void;
  totalCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentScreen,
  setCurrentScreen,
  onOpenSyncModal,
  onQuickNew,
  totalCount,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-slate-200">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-sm">
          강의
        </span>
        <span className="text-base font-bold tracking-tight text-slate-900">
          프리랜서 강의 일정 관리
        </span>
      </div>

      {/* Zone 2: 4 concise single-line nav links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
        <button
          onClick={() => setCurrentScreen('input')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
            currentScreen === 'input'
              ? 'text-slate-950 font-semibold border-b-2 border-slate-900'
              : ''
          }`}
        >
          1. 일정 등록 (입력)
        </button>
        <button
          onClick={() => setCurrentScreen('list')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
            currentScreen === 'list'
              ? 'text-slate-950 font-semibold border-b-2 border-slate-900'
              : ''
          }`}
        >
          2. 근무표 목록 (목록)
          <span className="ml-1.5 px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-xs font-mono">
            {totalCount}
          </span>
        </button>
        <button
          onClick={() => setCurrentScreen('summary')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
            currentScreen === 'summary'
              ? 'text-slate-950 font-semibold border-b-2 border-slate-900'
              : ''
          }`}
        >
          3. 통계 요약 (요약)
        </button>
        <button
          onClick={onOpenSyncModal}
          className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 text-slate-500 flex items-center gap-1.5"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>구글 시트 연동</span>
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onQuickNew}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>신규 일정 등록</span>
        </button>
      </div>
    </header>
  );
};
