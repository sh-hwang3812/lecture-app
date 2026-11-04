import React, { useState, useEffect } from 'react';
import { ScheduleItem, ScheduleStatus, SheetSettings } from './types';
import { INITIAL_SCHEDULES } from './utils/scheduleUtils';
import { Navigation } from './components/Navigation';
import { InputScreen } from './components/InputScreen';
import { ListScreen } from './components/ListScreen';
import { SummaryScreen } from './components/SummaryScreen';
import { GoogleSheetSyncModal } from './components/GoogleSheetSyncModal';

const STORAGE_KEY = 'lecturer_schedules_v1';
const SETTINGS_KEY = 'lecturer_sheet_settings_v1';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'input' | 'list' | 'summary'>('list');

  // Schedules state with localStorage persistence
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load schedules from localStorage', e);
    }
    return INITIAL_SCHEDULES;
  });

  // Sheet Settings state
  const [sheetSettings, setSheetSettings] = useState<SheetSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load sheet settings', e);
    }
    return {
      appsScriptUrl: '',
      autoSync: false,
      lastSyncTime: null,
    };
  });

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);

  // Save schedules to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
    } catch (e) {
      console.error('Failed to save schedules', e);
    }
  }, [schedules]);

  // Save settings to localStorage
  const handleSaveSettings = (newSettings: SheetSettings) => {
    setSheetSettings(newSettings);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  };

  // Add or update schedule
  const handleSaveSchedule = async (
    itemData: Omit<ScheduleItem, 'id'>,
    editId?: string
  ) => {
    if (editId) {
      // Update existing
      setSchedules((prev) =>
        prev.map((s) => (s.id === editId ? { ...itemData, id: editId } : s))
      );
      setEditingSchedule(null);
    } else {
      // Create new
      const newItem: ScheduleItem = {
        ...itemData,
        id: `sch-${Date.now()}`,
        createdAt: Date.now(),
      };
      setSchedules((prev) => [newItem, ...prev]);

      // If Google Apps Script is configured, push to Google Sheet via POST
      if (sheetSettings.appsScriptUrl) {
        try {
          fetch(sheetSettings.appsScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newItem),
          }).catch((err) => console.log('Sync push notification', err));
        } catch (err) {
          console.warn('Apps script sync failed', err);
        }
      }
    }
  };

  // Edit schedule trigger
  const handleEditSchedule = (schedule: ScheduleItem) => {
    setEditingSchedule(schedule);
    setCurrentScreen('input');
  };

  // Delete schedule
  const handleDeleteSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  // Update status (확정 / 변경 / 대기)
  const handleUpdateStatus = (id: string, newStatus: ScheduleStatus) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    );
  };

  // Sync now with Google Sheets
  const handleSyncNow = async () => {
    if (!sheetSettings.appsScriptUrl) return;
    setIsSyncing(true);
    try {
      const res = await fetch(sheetSettings.appsScriptUrl);
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setSchedules(json.data);
        handleSaveSettings({
          ...sheetSettings,
          lastSyncTime: new Date().toLocaleString(),
        });
        alert(`구글 시트에서 ${json.data.length}건의 일정을 성공적으로 동기화했습니다.`);
      } else {
        alert('구글 시트에서 가져올 데이터가 없거나 형식이 맞지 않습니다.');
      }
    } catch (e) {
      console.error('Sync error', e);
      alert('구글 시트 동기화 중 오류가 발생했습니다. 웹 앱 URL과 배포 권한("모든 사용자")을 확인해 주세요.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navigation
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onQuickNew={() => {
          setEditingSchedule(null);
          setCurrentScreen('input');
        }}
        totalCount={schedules.length}
      />

      <main className="flex-1">
        {currentScreen === 'input' && (
          <InputScreen
            schedules={schedules}
            onSaveSchedule={handleSaveSchedule}
            editingSchedule={editingSchedule}
            onCancelEdit={() => {
              setEditingSchedule(null);
              setCurrentScreen('list');
            }}
            onNavigateToList={() => setCurrentScreen('list')}
          />
        )}

        {currentScreen === 'list' && (
          <ListScreen
            schedules={schedules}
            onEditSchedule={handleEditSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onUpdateStatus={handleUpdateStatus}
            onNavigateToInput={() => {
              setEditingSchedule(null);
              setCurrentScreen('input');
            }}
          />
        )}

        {currentScreen === 'summary' && (
          <SummaryScreen
            schedules={schedules}
            onNavigateToList={() => setCurrentScreen('list')}
          />
        )}
      </main>

      <GoogleSheetSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        settings={sheetSettings}
        onSaveSettings={handleSaveSettings}
        onSyncNow={handleSyncNow}
        isSyncing={isSyncing}
      />
    </div>
  );
}
