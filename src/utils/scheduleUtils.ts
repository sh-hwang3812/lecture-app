import { ScheduleItem, ScheduleStatus } from '../types';

export const INITIAL_SCHEDULES: ScheduleItem[] = [
  {
    id: 'sch-1',
    date: '2026-11-10',
    institution: 'A대학 디지털융합원',
    startTime: '09:00',
    endTime: '12:00',
    hours: 3.0,
    status: '확정',
    location: '공학관 301호',
    notes: '노트북 및 교안 사전 배포 완료',
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
    notes: '실습 환경 클라우드 계정 준비',
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
    notes: '견적서 및 커리큘럼 승인 대기 중',
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
    notes: '14일에서 15일로 일정 변경 요청 반영',
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
    notes: '현장 인쇄 교재 주최측 제공',
  },
];

/**
 * 종료시각 - 시작시각을 계산하여 시간 단위(소수점 1자리)로 반환
 */
export function calculateHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return 0;
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const diffMinutes = endMinutes - startMinutes;
  
  return diffMinutes > 0 ? Number((diffMinutes / 60).toFixed(1)) : 0;
}

/**
 * 동일 날짜의 시간대 중복 여부 검사
 * 반환값: 겹치는 기존 일정 목록
 */
export function findConflicts(
  target: { date: string; startTime: string; endTime: string; id?: string },
  allSchedules: ScheduleItem[]
): ScheduleItem[] {
  if (!target.date || !target.startTime || !target.endTime) return [];
  
  const [targetStartH, targetStartM] = target.startTime.split(':').map(Number);
  const [targetEndH, targetEndM] = target.endTime.split(':').map(Number);
  const targetStart = targetStartH * 60 + targetStartM;
  const targetEnd = targetEndH * 60 + targetEndM;

  return allSchedules.filter((item) => {
    if (target.id && item.id === target.id) return false;
    if (item.date !== target.date) return false;
    
    const [itemStartH, itemStartM] = item.startTime.split(':').map(Number);
    const [itemEndH, itemEndM] = item.endTime.split(':').map(Number);
    const itemStart = itemStartH * 60 + itemStartM;
    const itemEnd = itemEndH * 60 + itemEndM;

    // Overlap condition: max(start1, start2) < min(end1, end2)
    return Math.max(targetStart, itemStart) < Math.min(targetEnd, itemEnd);
  });
}

/**
 * 8개 시트 열 규격에 맞춘 CSV 문자열 생성 및 다운로드
 */
export function exportToCSV(schedules: ScheduleItem[]) {
  const headers = ['날짜', '기관', '시작', '종료', '시간', '상태', '장소', '메모'];
  const rows = schedules.map((s) => [
    s.date,
    `"${s.institution.replace(/"/g, '""')}"`,
    s.startTime,
    s.endTime,
    s.hours,
    s.status,
    `"${s.location.replace(/"/g, '""')}"`,
    `"${(s.notes || '').replace(/"/g, '""')}"`,
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
