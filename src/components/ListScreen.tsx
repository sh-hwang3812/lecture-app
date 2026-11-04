import React, { useState, useMemo } from 'react';
import { ScheduleItem, ScheduleStatus } from '../types';
import { exportToCSV } from '../utils/scheduleUtils';
import { Filter, Calendar, Clock, Download, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, Search, LayoutList, CalendarRange } from 'lucide-react';

interface ListScreenProps {
  schedules: ScheduleItem[];
  onEditSchedule: (schedule: ScheduleItem) => void;
  onDeleteSchedule: (id: string) => void;
  onUpdateStatus: (id: string, status: ScheduleStatus) => void;
  onNavigateToInput: () => void;
}

export const ListScreen: React.FC<ListScreenProps> = ({
  schedules,
  onEditSchedule,
  onDeleteSchedule,
  onUpdateStatus,
  onNavigateToInput,
}) => {
  // Filters
  const [filterStartDate, setFilterStartDate] = useState<string>('2026-11-01');
  const [filterEndDate, setFilterEndDate] = useState<string>('2026-11-30');
  const [filterStatus, setFilterStatus] = useState<string>('전체');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

  // Filtered and sorted strictly by: 날짜 오름차순, 시작 시각 오름차순
  const filteredAndSorted = useMemo(() => {
    return schedules
      .filter((item) => {
        const matchesDate =
          (!filterStartDate || item.date >= filterStartDate) &&
          (!filterEndDate || item.date <= filterEndDate);
        const matchesStatus = filterStatus === '전체' || item.status === filterStatus;
        const matchesSearch =
          !searchQuery.trim() ||
          item.institution.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.notes.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesDate && matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        if (a.date !== b.date) {
          return a.date.localeCompare(b.date);
        }
        return a.startTime.localeCompare(b.startTime);
      });
  }, [schedules, filterStartDate, filterEndDate, filterStatus, searchQuery]);

  // Aggregate stats for filtered list
  const listStats = useMemo(() => {
    const totalCount = filteredAndSorted.length;
    const confirmedCount = filteredAndSorted.filter((s) => s.status === '확정').length;
    const totalHours = filteredAndSorted.reduce((acc, curr) => acc + curr.hours, 0);
    const confirmedHours = filteredAndSorted
      .filter((s) => s.status === '확정')
      .reduce((acc, curr) => acc + curr.hours, 0);

    return {
      totalCount,
      confirmedCount,
      totalHours: Number(totalHours.toFixed(1)),
      confirmedHours: Number(confirmedHours.toFixed(1)),
    };
  }, [filteredAndSorted]);

  // Quick preset helper
  const handleSetPreset = (preset: 'thisMonth' | 'nextMonth' | 'all') => {
    if (preset === 'thisMonth') {
      setFilterStartDate('2026-11-01');
      setFilterEndDate('2026-11-30');
    } else if (preset === 'nextMonth') {
      setFilterStartDate('2026-12-01');
      setFilterEndDate('2026-12-31');
    } else {
      setFilterStartDate('');
      setFilterEndDate('');
    }
  };

  // Group by date for calendar view
  const groupedByDate = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    filteredAndSorted.forEach((item) => {
      const arr = map.get(item.date) || [];
      arr.push(item);
      map.set(item.date, arr);
    });
    return Array.from(map.entries());
  }, [filteredAndSorted]);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Screen Title & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            화면 2 · 목록 화면
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1">
            근무표 유형 강의 일정 목록
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            기간과 상태로 일정을 골라 보고, 날짜·시작 시각순으로 정렬 확인
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
              title="8열 시트 표 뷰"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">표 보기</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                viewMode === 'calendar' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
              title="일자별 근무표 뷰"
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">근무표 보기</span>
            </button>
          </div>

          <button
            onClick={() => exportToCSV(filteredAndSorted)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV 저장</span>
          </button>

          <button
            onClick={onNavigateToInput}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>일정 등록</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* 기간 시작일 */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">조회 시작일</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-slate-900 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* 기간 종료일 */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">조회 종료일</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-slate-900 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* 상태 필터 */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">상태 필터</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-medium text-slate-900 focus:bg-white focus:outline-hidden"
            >
              <option value="전체">전체 상태</option>
              <option value="확정">확정 (확정된 강의)</option>
              <option value="변경">변경 (일정 변경 요청)</option>
              <option value="대기">대기 (검토/조율 중)</option>
            </select>
          </div>

          {/* 검색어 */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">기관 / 장소 검색</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="기관명 또는 장소 검색..."
                className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:bg-white focus:outline-hidden"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
            </div>
          </div>
        </div>

        {/* Quick presets & stats strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">기간 바로 선택:</span>
            <button
              onClick={() => handleSetPreset('thisMonth')}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium"
            >
              2026년 11월
            </button>
            <button
              onClick={() => handleSetPreset('nextMonth')}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium"
            >
              2026년 12월
            </button>
            <button
              onClick={() => handleSetPreset('all')}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium"
            >
              전체 기간
            </button>
          </div>

          <div className="flex items-center gap-4 text-slate-600 font-mono text-[11px]">
            <span>
              선택 일정: <strong>{listStats.totalCount}</strong>건 (확정 {listStats.confirmedCount}건)
            </span>
            <span className="text-slate-300">|</span>
            <span>
              강의 시간: 확정 <strong>{listStats.confirmedHours}</strong>h / 총 {listStats.totalHours}h
            </span>
          </div>
        </div>
      </div>

      {/* Main View: Table Mode (Strict 8 sheet columns) */}
      {viewMode === 'table' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-3 px-3.5">날짜</th>
                  <th className="py-3 px-3.5">기관 (가상 별칭)</th>
                  <th className="py-3 px-3">시작</th>
                  <th className="py-3 px-3">종료</th>
                  <th className="py-3 px-3 text-right">시간(자동)</th>
                  <th className="py-3 px-3 text-center">상태</th>
                  <th className="py-3 px-3.5">장소</th>
                  <th className="py-3 px-3.5">메모</th>
                  <th className="py-3 px-3 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAndSorted.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      선택한 기간 및 조건에 부합하는 일정이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredAndSorted.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* 1. 날짜 */}
                      <td className="py-3 px-3.5 font-mono font-medium text-slate-900 whitespace-nowrap">
                        {row.date}
                      </td>

                      {/* 2. 기관 */}
                      <td className="py-3 px-3.5 font-semibold text-slate-800">
                        {row.institution}
                      </td>

                      {/* 3. 시작 */}
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {row.startTime}
                      </td>

                      {/* 4. 종료 */}
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {row.endTime}
                      </td>

                      {/* 5. 시간 (자동 계산) */}
                      <td className="py-3 px-3 font-mono text-right font-bold text-blue-700 whitespace-nowrap tabular-nums">
                        {row.hours}시간
                      </td>

                      {/* 6. 상태 (드롭다운 변경 가능) */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <select
                          value={row.status}
                          onChange={(e) =>
                            onUpdateStatus(row.id, e.target.value as ScheduleStatus)
                          }
                          className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                            row.status === '확정'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : row.status === '변경'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          <option value="확정">확정</option>
                          <option value="변경">변경</option>
                          <option value="대기">대기</option>
                        </select>
                      </td>

                      {/* 7. 장소 */}
                      <td className="py-3 px-3.5 text-slate-700 max-w-xs truncate">
                        {row.location}
                      </td>

                      {/* 8. 메모 */}
                      <td className="py-3 px-3.5 text-slate-500 max-w-xs truncate">
                        {row.notes || <span className="text-slate-300">-</span>}
                      </td>

                      {/* 작업 */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100">
                          <button
                            onClick={() => onEditSchedule(row)}
                            className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
                            title="수정"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`'${row.institution}' 일정을 삭제하시겠습니까?`)) {
                                onDeleteSchedule(row.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Calendar / Timetable Grid View */
        <div className="space-y-4">
          {groupedByDate.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-xl">
              선택한 조건의 일정이 없습니다.
            </div>
          ) : (
            groupedByDate.map(([dayDate, items]) => {
              const dayHours = items.reduce((acc, curr) => acc + curr.hours, 0);
              return (
                <div
                  key={dayDate}
                  className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm font-mono">
                        {dayDate}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">
                        {new Date(dayDate).toLocaleDateString('ko-KR', { weekday: 'long' })}
                      </span>
                    </div>
                    <div className="font-mono text-slate-600">
                      총 {items.length}건 · <strong className="text-blue-700">{dayHours}시간</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-lg border text-xs space-y-2 ${
                          item.status === '확정'
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : item.status === '변경'
                            ? 'bg-amber-50/40 border-amber-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">
                            {item.institution}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              item.status === '확정'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === '변경'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-700 font-mono">
                          <span>
                            {item.startTime} ~ {item.endTime}
                          </span>
                          <span className="font-bold text-blue-700">{item.hours}시간</span>
                        </div>

                        <div className="text-slate-600 flex items-center justify-between pt-1 border-t border-slate-200/50">
                          <span className="truncate">{item.location}</span>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              onClick={() => onEditSchedule(item)}
                              className="text-slate-500 hover:text-slate-900 px-1 py-0.5"
                            >
                              수정
                            </button>
                            <span className="text-slate-300">·</span>
                            <button
                              onClick={() => onDeleteSchedule(item.id)}
                              className="text-slate-400 hover:text-rose-600 px-1 py-0.5"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                        {item.notes && (
                          <div className="text-[11px] text-slate-500 italic bg-white/70 p-1.5 rounded">
                            {item.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
