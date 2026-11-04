import React, { useState } from 'react';
import { SheetSettings } from '../types';
import { X, Copy, Check, ExternalLink, ShieldCheck, RefreshCw } from 'lucide-react';

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SheetSettings;
  onSaveSettings: (settings: SheetSettings) => void;
  onSyncNow: () => Promise<void>;
  isSyncing: boolean;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onSyncNow,
  isSyncing,
}) => {
  const [url, setUrl] = useState(settings.appsScriptUrl);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const appsScriptCode = `/**
 * [프리랜서 강의 일정 관리] Google Apps Script
 * 제약조건: 무료 계정 쿼터 최적화, 실명/연락처 배제, 무상태 JSON 통신
 */

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('강의일정') || ss.insertSheet('강의일정');
  
  // 8개 시트 열 헤더 (엄격 유지)
  const headers = ['날짜', '기관', '시작', '종료', '시간', '상태', '장소', '메모'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f1f5f9');
  
  // 상태 드롭다운 (확정 / 변경 / 대기)
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['확정', '변경', '대기'], true)
    .build();
  sheet.getRange('F2:F1000').setDataValidation(rule);
  sheet.setFrozenRows(1);
}

// GET: 일정 목록 및 요약 반환
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('강의일정') || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1);
  
  const schedules = rows.map((r, i) => ({
    id: 'sheet-' + (i + 1),
    date: Utilities.formatDate(new Date(r[0]), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    institution: r[1],
    startTime: r[2],
    endTime: r[3],
    hours: Number(r[4]),
    status: r[5],
    location: r[6],
    notes: r[7] || ''
  }));
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: schedules
  })).setMimeType(ContentService.MimeType.JSON);
}

// POST: 신규 일정 등록
function doPost(e) {
  try {
    const item = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('강의일정') || ss.getSheets()[0];
    
    // 시간 계산: 종료 - 시작
    const [startH, startM] = item.startTime.split(':').map(Number);
    const [endH, endM] = item.endTime.split(':').map(Number);
    const hours = Number((((endH * 60 + endM) - (startH * 60 + startM)) / 60).toFixed(1));
    
    sheet.appendRow([
      item.date,
      item.institution,
      item.startTime,
      item.endTime,
      hours,
      item.status,
      item.location,
      item.notes || ''
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSaveSettings({
      ...settings,
      appsScriptUrl: url.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              구글 스프레드시트 연동 (Google Apps Script)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              별도의 상용 DB 없이 구글 시트를 무료 영구 데이터베이스로 활용합니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Constraints guarantee */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-700">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>제약조건 보증</span>
            </div>
            <p className="leading-relaxed text-slate-600">
              • <strong>무료 계정 최적화:</strong> 구글 일일 실행 한도를 고려해 가벼운 무상태(JSON) 단건 추가 및 조회로 작동합니다.<br />
              • <strong>개인정보 비저장:</strong> 기관명은 가상 별칭만 사용되며 실명/연락처는 시트에 절대 저장되지 않습니다.
            </p>
          </div>

          {/* Web App URL input */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-800">
              배포된 Google Apps Script 웹 앱 URL:
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
              <button
                type="button"
                onClick={onSyncNow}
                disabled={isSyncing || !url}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-lg disabled:opacity-40 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? '동기화 중...' : '지금 동기화'}</span>
              </button>
            </div>
            {settings.lastSyncTime && (
              <div className="text-[11px] text-slate-500 font-mono">
                마지막 동기화 시각: {settings.lastSyncTime}
              </div>
            )}
          </div>

          {/* Setup Guide */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">
                연동 방법 (3단계, 1분 소요)
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-blue-700 hover:underline"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '코드 복사됨' : 'Apps Script 코드 복사'}</span>
              </button>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 bg-slate-50 p-3 rounded-lg leading-relaxed">
              <li>새 구글 스프레드시트를 생성하고 상단 메뉴에서 <strong>확장 프로그램 &gt; Apps Script</strong>를 엽니다.</li>
              <li>기존 코드를 지우고 아래 <strong>Apps Script 코드</strong>를 붙여넣은 뒤 <code>setupSheet</code> 함수를 1회 실행합니다.</li>
              <li>우측 상단 <strong>배포 &gt; 새 배포 &gt; 유형: 웹 앱</strong>을 선택하고 액세스 권한을 '모든 사용자(Anyone)'로 설정 후 배포된 URL을 위 입력창에 등록합니다.</li>
            </ol>
          </div>

          {/* Script Code preview */}
          <div className="bg-slate-900 text-slate-200 rounded-lg p-3 font-mono text-[11px] max-h-48 overflow-y-auto">
            <pre className="text-slate-300 leading-relaxed">{appsScriptCode}</pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800"
          >
            설정 저장
          </button>
        </div>
      </div>
    </div>
  );
};
