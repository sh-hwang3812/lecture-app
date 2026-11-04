export type ScheduleStatus = '확정' | '변경' | '대기';

export interface ScheduleItem {
  id: string;
  date: string;          // 날짜 (YYYY-MM-DD, 직접 입력)
  institution: string;   // 기관 (가상 별칭 직접 입력)
  startTime: string;     // 시작 (HH:MM, 직접 입력)
  endTime: string;       // 종료 (HH:MM, 직접 입력)
  hours: number;         // 시간 (자동: 종료−시작 계산)
  status: ScheduleStatus;// 상태 (확정 / 변경 / 대기, 드롭다운)
  location: string;      // 장소 (직접 입력)
  notes: string;         // 메모 (직접 입력, 비워도 됨)
  createdAt?: number;
}

export interface SheetSettings {
  appsScriptUrl: string;
  autoSync: boolean;
  lastSyncTime: string | null;
}
