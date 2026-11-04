import React, { useState, useEffect, useMemo } from 'react';
import { ScheduleItem, ScheduleStatus } from '../types';
import { calculateHours, findConflicts } from '../utils/scheduleUtils';
import { AlertCircle, CheckCircle2, Clock, Calendar, Building2, MapPin, FileText, Check, ArrowRight } from 'lucide-react';

interface InputScreenProps {
  schedules: ScheduleItem[];
  onSaveSchedule: (schedule: Omit<ScheduleItem, 'id'>, editId?: string) => void;
  editingSchedule: ScheduleItem | null;
  onCancelEdit: () => void;
  onNavigateToList: () => void;
}

export const InputScreen: React.FC<InputScreenProps> = ({
  schedules,
  onSaveSchedule,
  editingSchedule,
  onCancelEdit,
  onNavigateToList,
}) => {
  // Form fields
  const [date, setDate] = useState<string>(
    editingSchedule ? editingSchedule.date : new Date().toISOString().slice(0, 10)
  );
  const [institution, setInstitution] = useState<string>(
    editingSchedule ? editingSchedule.institution : ''
  );
  const [startTime, setStartTime] = useState<string>(
    editingSchedule ? editingSchedule.startTime : '10:00'
  );
  const [endTime, setEndTime] = useState<string>(
    editingSchedule ? editingSchedule.endTime : '13:00'
  );
  const [status, setStatus] = useState<ScheduleStatus>(
    editingSchedule ? editingSchedule.status : '대기'
  );
  const [location, setLocation] = useState<string>(
    editingSchedule ? editingSchedule.location : ''
  );
  const [notes, setNotes] = useState<string>(
    editingSchedule ? editingSchedule.notes : ''
  );

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync state if editingSchedule changes
  useEffect(() => {
    if (editingSchedule) {
      setDate(editingSchedule.date);
      setInstitution(editingSchedule.institution);
      setStartTime(editingSchedule.startTime);
      setEndTime(editingSchedule.endTime);
      setStatus(editingSchedule.status);
      setLocation(editingSchedule.location);
      setNotes(editingSchedule.notes);
    }
  }, [editingSchedule]);

  // Automatic calculation of duration: 종료시각 - 시작시각
  const autoHours = useMemo(() => {
    return calculateHours(startTime, endTime);
  }, [startTime, endTime]);

  // Real-time conflict detection (Solves the "15-minute duplicate check" problem!)
  const conflicts = useMemo(() => {
    return findConflicts(
      { date, startTime, endTime, id: editingSchedule?.id },
      schedules
    );
  }, [date, startTime, endTime, schedules, editingSchedule]);

  // Unique recent institutions for quick auto-complete
  const recentInstitutions = useMemo(() => {
    const set = new Set(schedules.map((s) => s.institution));
    return Array.from(set).slice(0, 5);
  }, [schedules]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!date || !institution.trim() || !startTime || !endTime || !location.trim()) {
      setNotification({
        type: 'error',
        message: '필수 항목(날짜, 기관, 시작/종료 시각, 상태, 장소)을 모두 입력해 주세요.',
      });
      return;
    }

    if (autoHours <= 0) {
      setNotification({
        type: 'error',
        message: '종료 시각은 시작 시각보다 늦어야 합니다.',
      });
      return;
    }

    if (conflicts.length > 0) {
      const confirmForce = window.confirm(
        `[일정 중복 경고] 동일 날짜에 이미 등록된 '${conflicts[0].institution}' (${conflicts[0].startTime}~${conflicts[0].endTime}) 일정과 시간이 겹칩니다.\n\n정말 등록하시겠습니까?`
      );
      if (!confirmForce) return;
    }

    onSaveSchedule(
      {
        date,
        institution: institution.trim(),
        startTime,
        endTime,
        hours: autoHours,
        status,
        location: location.trim(),
        notes: notes.trim(),
      },
      editingSchedule?.id
    );

    setNotification({
      type: 'success',
      message: editingSchedule
        ? '일정이 성공적으로 수정되었습니다.'
        : `'${institution.trim()}' 일정이 성공적으로 등록되었습니다.`,
    });

    if (!editingSchedule) {
      // Clear form for next entry
      setInstitution('');
      setLocation('');
      setNotes('');
      setStatus('대기');
    }

    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleSetQuickDuration = (durationHours: number) => {
    if (!startTime) return;
    const [h, m] = startTime.split(':').map(Number);
    const endMinutes = h * 60 + m + durationHours * 60;
    const endH = Math.floor(endMinutes / 60) % 24;
    const endM = endMinutes % 60;
    const formattedEnd = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    setEndTime(formattedEnd);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Screen Title */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            화면 1 · 입력 화면
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1">
            {editingSchedule ? '강의 일정 수정' : '강의 일정 한 건 등록'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            날짜·기관·시작·종료·상태·장소·메모를 입력해 일정 한 건 등록 (시간 자동 계산 & 중복 즉시 감지)
          </p>
        </div>
        {editingSchedule && (
          <button
            onClick={onCancelEdit}
            className="px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100"
          >
            수정 취소
          </button>
        )}
      </div>

      {/* Notification banner */}
      {notification && (
        <div
          className={`p-3.5 rounded-lg text-xs flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={onNavigateToList}
            className="flex items-center gap-1 font-semibold underline text-xs ml-4 whitespace-nowrap"
          >
            <span>목록에서 확인</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Real-time Conflict Alert Box (Key differentiator solving 15 min check) */}
      {conflicts.length > 0 ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
          <div className="flex items-start gap-2.5 text-rose-900">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-xs sm:text-sm">
                [시간 중복 감지 경고] {date} 같은 시간대에 이미 등록된 일정이 있습니다!
              </div>
              <p className="text-xs text-rose-700 mt-0.5">
                프리랜서 일정 겹침을 방지하기 위해 즉시 알려드립니다. 시작/종료 시각을 변경하세요.
              </p>
            </div>
          </div>

          <div className="mt-2 space-y-1.5 pt-2 border-t border-rose-200/60">
            {conflicts.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between bg-white/80 px-3 py-2 rounded-lg text-xs border border-rose-200"
              >
                <div className="flex items-center gap-2 font-medium text-slate-900">
                  <span className="font-semibold text-rose-800">{c.institution}</span>
                  <span className="text-slate-400">·</span>
                  <span className="font-mono text-slate-700">
                    {c.startTime} ~ {c.endTime} ({c.hours}시간)
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-600">{c.location}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : startTime && endTime && autoHours > 0 ? (
        <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>[중복 없음]</strong> {date} {startTime}~{endTime}에 겹치는 일정이 없습니다. 바로 등록 가능합니다.
            </span>
          </div>
          <span className="font-mono font-bold text-emerald-700">안전</span>
        </div>
      ) : null}

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
          {/* 1. 날짜 */}
          <div>
            <label className="block font-semibold text-slate-800 mb-1.5">
              1. 날짜 <span className="text-rose-500">*</span>
              <span className="text-slate-400 font-normal ml-1">(직접 입력)</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition-all text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* 2. 기관 (가상 별칭) */}
          <div>
            <label className="block font-semibold text-slate-800 mb-1.5">
              2. 기관 <span className="text-rose-500">*</span>
              <span className="text-slate-400 font-normal ml-1">(가상 별칭 직접 입력)</span>
            </label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="예: A대학교 디지털융합원, B기업 인재개발원"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition-all text-xs sm:text-sm"
            />
            {recentInstitutions.length > 0 && !institution && (
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400">최근 입력:</span>
                {recentInstitutions.map((inst, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInstitution(inst)}
                    className="text-[11px] text-slate-600 hover:text-slate-900 underline underline-offset-2"
                  >
                    {inst}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. 시작 시각 */}
          <div>
            <label className="block font-semibold text-slate-800 mb-1.5">
              3. 시작 시각 <span className="text-rose-500">*</span>
              <span className="text-slate-400 font-normal ml-1">(직접 입력)</span>
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition-all text-xs sm:text-sm"
            />
          </div>

          {/* 4. 종료 시각 */}
          <div>
            <label className="block font-semibold text-slate-800 mb-1.5">
              4. 종료 시각 <span className="text-rose-500">*</span>
              <span className="text-slate-400 font-normal ml-1">(직접 입력)</span>
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition-all text-xs sm:text-sm"
            />
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[11px] text-slate-400">빠른 설정:</span>
              <button
                type="button"
                onClick={() => handleSetQuickDuration(2)}
                className="text-[11px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
              >
                +2시간
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickDuration(3)}
                className="text-[11px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
              >
                +3시간
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickDuration(4)}
                className="text-[11px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
              >
                +4시간
              </button>
            </div>
          </div>

          {/* 5. 시간 (자동 계산) */}
          <div className="sm:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-800">5. 시간 (자동 계산):</span>
              <span className="text-slate-500 text-xs ml-2">수식: 종료시각 − 시작시각</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-bold text-blue-700 tabular-nums">
                {autoHours}
              </span>
              <span className="text-xs font-semibold text-slate-600">시간</span>
            </div>
          </div>

          {/* 6. 상태 */}
          <div>
            <label className="block font-semibold text-slate-800 mb-1.5">
              6. 상태 <span className="text-rose-500">*</span>
              <span className="text-slate-400 font-normal ml-1">(선택지 드롭다운)</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ScheduleStatus)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition-all text-xs sm:text-sm font-medium"
            >
              <option value="확정">확정 (일정 확정됨)</option>
              <option value="변경">변경 (일정 변경 조율 중)</option>
              <option value="대기">대기 (의뢰 접수/검토 대기)</option>
            </select>
          </div>

          {/* 7. 장소 */}
          <div>
            <label className="block font-semibold text-slate-800 mb-1.5">
              7. 장소 <span className="text-rose-500">*</span>
              <span className="text-slate-400 font-normal ml-1">(글자 직접 입력)</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="예: 공학관 301호 또는 온라인 줌(Zoom)"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition-all text-xs sm:text-sm"
            />
          </div>

          {/* 8. 메모 */}
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-800 mb-1.5">
              8. 메모
              <span className="text-slate-400 font-normal ml-1">(글자 직접 입력, 비워도 됨)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="교안 사전 송부 여부, 담당자 직함, 주차권 확인 등 특이사항"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition-all text-xs sm:text-sm resize-none"
            />
          </div>
        </div>

        {/* Submit button bar */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onNavigateToList}
            className="text-xs text-slate-600 hover:text-slate-900"
          >
            ← 근무표 목록으로 이동
          </button>

          <div className="flex items-center gap-2">
            {editingSchedule && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
              >
                취소
              </button>
            )}
            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-900 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{editingSchedule ? '수정 완료' : '일정 한 건 시트에 등록'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
