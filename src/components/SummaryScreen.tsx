import React, { useState, useMemo } from 'react';
import { ScheduleItem } from '../types';
import { BarChart3, CheckCircle2, Clock, AlertTriangle, Building, Calendar, ArrowUpRight } from 'lucide-react';

interface SummaryScreenProps {
  schedules: ScheduleItem[];
  onNavigateToList: () => void;
}

export const SummaryScreen: React.FC<SummaryScreenProps> = ({
  schedules,
  onNavigateToList,
}) => {
  const [startDate, setStartDate] = useState<string>('2026-11-01');
  const [endDate, setEndDate] = useState<string>('2026-11-30');

  // Filter schedules strictly for the selected period
  const periodSchedules = useMemo(() => {
    return schedules.filter((item) => {
      return (
        (!startDate || item.date >= startDate) &&
        (!endDate || item.date <= endDate)
      );
    });
  }, [schedules, startDate, endDate]);

  // Compute 3 key metrics demanded in <내 자료>
  const metrics = useMemo(() => {
    const confirmedList = periodSchedules.filter((i) => i.status === '확정');
    const changedList = periodSchedules.filter((i) => i.status === '변경');
    const waitingList = periodSchedules.filter((i) => i.status === '대기');

    const confirmedCount = confirmedList.length;
    const confirmedHours = confirmedList.reduce((acc, curr) => acc + curr.hours, 0);
    const changedCount = changedList.length;
    const waitingCount = waitingList.length;
    const totalCount = periodSchedules.length;
    const totalHours = periodSchedules.reduce((acc, curr) => acc + curr.hours, 0);

    return {
      confirmedCount,
      confirmedHours: Number(confirmedHours.toFixed(1)),
      changedCount,
      waitingCount,
      totalCount,
      totalHours: Number(totalHours.toFixed(1)),
    };
  }, [periodSchedules]);

  // Group confirmed hours by institution
  const institutionBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; hours: number }>();
    periodSchedules
      .filter((i) => i.status === '확정')
      .forEach((item) => {
        const current = map.get(item.institution) || { count: 0, hours: 0 };
        map.set(item.institution, {
          count: current.count + 1,
          hours: Number((current.hours + item.hours).toFixed(1)),
        });
      });

    return Array.from(map.entries()).sort((a, b) => b[1].hours - a[1].hours);
  }, [periodSchedules]);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            화면 3 · 요약 화면
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1">
            선택 기간 요약 통계 대시보드
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            선택한 기간의 확정 일정 수·확정 시간 합계·변경 일정 수 확인
          </p>
        </div>

        {/* Date period picker */}
        <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-lg text-xs shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-1.5 py-1 bg-transparent font-mono text-slate-800 text-xs focus:outline-hidden"
          />
          <span className="text-slate-400 font-mono">~</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-1.5 py-1 bg-transparent font-mono text-slate-800 text-xs focus:outline-hidden"
          />
        </div>
      </div>

      {/* 3 Core Metric Cards (Mandated by PRD) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. 확정 일정 수 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 text-xs font-semibold">
            <span>1. 확정 일정 수</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-slate-900 tabular-nums">
              {metrics.confirmedCount}
            </span>
            <span className="text-xs font-medium text-slate-500">건</span>
          </div>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>전체 {metrics.totalCount}건 중</span>
            <span className="font-mono font-semibold text-emerald-700">
              {metrics.totalCount ? Math.round((metrics.confirmedCount / metrics.totalCount) * 100) : 0}% 확정
            </span>
          </div>
        </div>

        {/* 2. 확정 시간 합계 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 text-xs font-semibold">
            <span>2. 확정 시간 합계</span>
            <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-blue-700 tabular-nums">
              {metrics.confirmedHours}
            </span>
            <span className="text-xs font-medium text-slate-500">시간</span>
          </div>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>종료−시작 자동 계산</span>
            <span className="font-mono text-slate-600">총 강의 {metrics.totalHours}h 중</span>
          </div>
        </div>

        {/* 3. 변경 일정 수 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 text-xs font-semibold">
            <span>3. 변경 일정 수</span>
            <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-amber-700 tabular-nums">
              {metrics.changedCount}
            </span>
            <span className="text-xs font-medium text-slate-500">건</span>
          </div>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>일정 재조율 대상</span>
            <span className="font-mono text-amber-700">대기 중: {metrics.waitingCount}건</span>
          </div>
        </div>
      </div>

      {/* Institution Hours Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">기관별 확정 강의 시간</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              선택 기간 동안 확정된 강의의 기관별 배분 현황
            </p>
          </div>
          <button
            onClick={onNavigateToList}
            className="text-xs font-medium text-blue-700 hover:underline flex items-center gap-1"
          >
            <span>전체 목록 보기</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {institutionBreakdown.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            선택한 기간에 확정된 강의 일정이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {institutionBreakdown.map(([inst, stat], idx) => {
              const maxHours = institutionBreakdown[0][1].hours || 1;
              const percent = Math.round((stat.hours / maxHours) * 100);

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{inst}</span>
                    <span className="font-mono text-slate-600">
                      {stat.count}회 강의 · <strong className="text-blue-700">{stat.hours}시간</strong>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-slate-900 h-full rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule status overview */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="space-y-0.5">
          <div className="font-bold text-slate-800">
            데이터 검증 원칙: 구글 시트 8열 및 실명/연락처 비저장 준수
          </div>
          <p className="text-slate-600">
            선택 기간 요약 통계는 종료−시작 자동 수식 결과를 기반으로 집계되며, 개인정보는 일체 노출되지 않습니다.
          </p>
        </div>
        <button
          onClick={onNavigateToList}
          className="px-4 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          근무표 목록 확인하기
        </button>
      </div>
    </div>
  );
};
