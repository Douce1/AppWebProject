import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, Dimensions, TextInput } from 'react-native';
import { useSchedule } from '../context/ScheduleContext';
import { Bell, MapPin, Clock, CalendarIcon as Calendar, CheckCircle2, ChevronLeft, ChevronRight, X, Megaphone, Settings } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const router = useRouter();
  const { classes, notifications, removeNotification, chatMessages, markChatRoomAsRead,
    departedIds, canArriveIds, arrivedIds, canEndClassIds, endedClassIds, readyToReportIds, reportedIds, handleClassAction, submitClassReport
  } = useSchedule();
  // Notice & Side panel logic
  const [sidePanelVisible, setSidePanelVisible] = useState(false);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Weekly calendar logic
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const changeMonth = (offset: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };
  const dayOfWeek = today.getDay();

  // Generate current week dates
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - dayOfWeek + i);
    return d;
  });

  const getWeekDayStr = (d: Date) => ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];

  const toLocalISOString = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // Today's Date String for Check-in logic
  const todayStr = toLocalISOString(today);
  const activeDate = selectedDate || todayStr;

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [reportText, setReportText] = useState('');

  const submitReport = () => {
    if (currentReportId) {
      submitClassReport(currentReportId);
    }
    setReportModalVisible(false);
    setReportText('');
    setCurrentReportId(null);
  };

  // Helper func: Generate current month's calendar grid days
  const getDaysInMonth = (year: number, month: number) => {
    const days = [];
    const date = new Date(year, month, 1);
    const firstDay = date.getDay();

    // Pad empty slots
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Safely generate all days of the month at noon to prevent timezone shifts
    const numDays = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= numDays; i++) {
      days.push(new Date(year, month, i, 12, 0, 0));
    }
    return days;
  };

  const monthGridDays = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());

  return (
    <View style={styles.container}>
      {/* Top Bar with Settings */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>대시보드</Text>
        <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/profile/settings', params: { returnTo: '/' } })} style={styles.settingsIconContainer}>
          <Settings color="#666" size={26} />
        </TouchableOpacity>
      </View>

      {/* Weekly Schedule */}
      <View style={styles.calendarContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>📅 주간일정</Text>
          <TouchableOpacity onPress={() => { setCalendarModalVisible(true); setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1)); }} style={styles.viewCalendarBtn}>
            <Calendar size={16} color="#3b82f6" style={{ marginRight: 4 }} />
            <Text style={styles.viewAllText}>전체 일정 확인</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.weekRow}>
          {weekDates.map((date, idx) => {
            const dateStr = toLocalISOString(date);
            const isSelected = dateStr === activeDate;
            const hasClass = classes.some(c => c.date === dateStr);

            return (
              <TouchableOpacity
                key={idx}
                style={[styles.dayContainer, isSelected && styles.todayContainer]}
                onPress={() => setSelectedDate(dateStr)}
              >
                <Text style={[styles.dayText, isSelected && styles.todayText]}>{getWeekDayStr(date)}</Text>
                <Text style={[styles.dateText, isSelected && styles.todayText]}>{date.getDate()}</Text>
                {hasClass && <View style={styles.classIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Today's Schedule List */}
      <ScrollView style={styles.scheduleListContainer}>
        <Text style={styles.sectionTitle}>
          {activeDate === todayStr ? '오늘의 일정' : `${activeDate.split('-')[1]}월 ${activeDate.split('-')[2]}일 일정`} ({classes.filter(c => c.date === activeDate).length})
        </Text>
        {classes.filter(c => c.date === activeDate).map((c) => {
          const isReadyToReport = readyToReportIds.includes(c.id);
          const isEndedClass = endedClassIds.includes(c.id);
          const isCanEndClass = canEndClassIds.includes(c.id);
          const isArrived = arrivedIds.includes(c.id);
          const isCanArrive = canArriveIds.includes(c.id);
          const isDeparted = departedIds.includes(c.id);
          const isReported = reportedIds.includes(c.id);

          let hasEnded = false;
          const endStr = c.time.split('-')[1]?.trim();
          if (endStr && c.date === activeDate) {
            const [endH, endM] = endStr.split(':').map(Number);
            const endTime = new Date(today);
            endTime.setHours(endH, endM, 0, 0);
            if (new Date() > endTime && activeDate === todayStr) hasEnded = true;
          } else if (c.date < todayStr) {
            hasEnded = true;
          }

          return (
            <TouchableOpacity
              key={c.id}
              style={styles.classCard}
              onPress={() => router.push({ pathname: '/class-detail' as any, params: { classInfo: JSON.stringify(c) } })}
            >
              <Text style={styles.classTitle}>{c.title}</Text>
              <View style={styles.row}>
                <MapPin size={16} color="gray" />
                <Text style={styles.classDetails}> {c.location}</Text>
              </View>
              <View style={styles.row}>
                <Clock size={16} color="gray" />
                <Text style={styles.classDetails}> {c.time}</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.checkInButton,
                  (isDeparted && !isCanArrive) && styles.checkedInButton,
                  (isCanArrive && !isArrived) && styles.checkInButton,
                  (isArrived && !isCanEndClass) && styles.checkedInButton,
                  (isCanEndClass && !isEndedClass) && styles.checkInButton,
                  (isEndedClass && !isReadyToReport) && styles.checkedInButton,
                  (isReadyToReport && !isReported) && styles.reportButtonStyles,
                  (isReported) && styles.doneButtonStyles
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  if (isReadyToReport && !isReported) {
                    setCurrentReportId(c.id);
                    setReportModalVisible(true);
                  } else {
                    handleClassAction(c.id);
                  }
                }}
                activeOpacity={0.7}
                disabled={isReported || (isDeparted && !isCanArrive) || (isArrived && !isCanEndClass) || (isEndedClass && !isReadyToReport)}
              >
                {isReported ? (
                  <View style={styles.row}>
                    <CheckCircle2 color="white" size={18} />
                    <Text style={[styles.checkInText, { marginLeft: 4 }]}>강의 수고하셨습니다!</Text>
                  </View>
                ) : isReadyToReport ? (
                  <Text style={styles.checkInText}>강의 보고서 작성</Text>
                ) : isEndedClass ? (
                  <View style={styles.row}>
                    <CheckCircle2 color="white" size={18} />
                    <Text style={[styles.checkInText, { marginLeft: 4 }]}>종료 처리 중...</Text>
                  </View>
                ) : isCanEndClass ? (
                  <Text style={styles.checkInText}>강의 종료</Text>
                ) : isArrived ? (
                  <View style={styles.row}>
                    <CheckCircle2 color="white" size={18} />
                    <Text style={[styles.checkInText, { marginLeft: 4 }]}>도착 완료 (강의 중)</Text>
                  </View>
                ) : isCanArrive ? (
                  <Text style={styles.checkInText}>도착</Text>
                ) : isDeparted ? (
                  <View style={styles.row}>
                    <CheckCircle2 color="white" size={18} />
                    <Text style={[styles.checkInText, { marginLeft: 4 }]}>이동 중...</Text>
                  </View>
                ) : (
                  <Text style={styles.checkInText}>출발</Text>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
        {classes.filter(c => c.date === activeDate).length === 0 && (
          <Text style={styles.emptyText}>
            {activeDate === todayStr ? '오늘 예정된 강의가 없습니다.' : '해당 날짜에 예정된 강의가 없습니다.'}
          </Text>
        )}
      </ScrollView>

      {/* Report Modal */}
      <Modal
        visible={reportModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlayCen}>
          <View style={styles.reportModalContent}>
            <View style={styles.reportModalHeader}>
              <Text style={styles.reportModalTitle}>강의 보고서 작성</Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.reportInput}
              placeholder="특이사항 및 강의 내용을 입력해주세요..."
              value={reportText}
              onChangeText={setReportText}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity style={styles.submitReportBtn} onPress={submitReport}>
              <Text style={styles.submitReportText}>작성 완료</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Right Sidebar Notification Panel */}
      <Modal
        visible={sidePanelVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSidePanelVisible(false)}
      >
        <View style={styles.sidebarOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSidePanelVisible(false)} />
          <View style={styles.sidebarPanel}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>
                알림 센터 ({notifications.filter(n => n.type !== '💬 신규메시지').length + chatMessages.filter(msg => !msg.isMine && !msg.isRead).length})
              </Text>
              <TouchableOpacity onPress={() => setSidePanelVisible(false)}>
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sidebarContent}>
              {/* Added Dynamic Chat Notifications */}
              {chatMessages.filter(msg => !msg.isMine && !msg.isRead).map(msg => (
                <TouchableOpacity
                  key={`chat-${msg.id}`}
                  style={styles.notifItem}
                  onPress={() => {
                    setSidePanelVisible(false);
                    markChatRoomAsRead(msg.roomId);
                    router.push({ pathname: '/chat-room', params: { roomId: msg.roomId } } as any);
                  }}
                >
                  <Text style={styles.notifType}>💬 신규메시지 ({msg.companyName})</Text>
                  <Text style={styles.notifTitle}>관리자님: {msg.text}</Text>
                  <Text style={styles.notifTime}>{msg.time}</Text>
                </TouchableOpacity>
              ))}
              {notifications.filter(n => n.type !== '💬 신규메시지').map((notif: any) => (
                <TouchableOpacity
                  key={notif.id}
                  style={styles.notifItem}
                  onPress={() => {
                    setSidePanelVisible(false);
                    removeNotification(notif.id);
                    router.push(notif.target);
                  }}
                >
                  <Text style={styles.notifType}>{notif.type}</Text>
                  <Text style={styles.notifTitle}>{notif.title}</Text>
                  <Text style={styles.notifTime}>{notif.time}</Text>
                </TouchableOpacity>
              ))}
              {notifications.filter(n => n.type !== '💬 신규메시지').length === 0 && chatMessages.filter(msg => !msg.isMine && !msg.isRead).length === 0 && (
                <Text style={styles.emptyText}>새로운 알림이 없습니다.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Monthly Calendar Modal */}
      <Modal
        visible={calendarModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setCalendarModalVisible(false);
        }}
      >
        <View style={styles.modalOverlayCen}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calHeaderRow}>
              <TouchableOpacity onPress={() => changeMonth(-1)}><ChevronLeft size={24} color="#333" /></TouchableOpacity>
              <Text style={styles.calMonthText}>{currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월</Text>
              <TouchableOpacity onPress={() => changeMonth(1)}><ChevronRight size={24} color="#333" /></TouchableOpacity>
              <TouchableOpacity onPress={() => { setCalendarModalVisible(false); }} style={{ position: 'absolute', right: 0 }}>
                <X size={24} color="#999" />
              </TouchableOpacity>
            </View>

            {/* Grid */}
            <View style={styles.calGrid}>
              {['일', '월', '화', '수', '목', '금', '토'].map(d => <Text key={d} style={styles.calDayLabel}>{d}</Text>)}
              {monthGridDays.map((dateObj, idx) => {
                if (!dateObj) return <View key={idx} style={styles.calCellEmpty} />;
                const dStr = toLocalISOString(dateObj);
                const hasClass = classes.some(c => c.date === dStr);
                const isSelected = activeDate === dStr;
                const isTodayStr = dStr === todayStr;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.calCell, isSelected && styles.calCellSelected]}
                    onPress={() => {
                      setSelectedDate(dStr);
                      setCalendarModalVisible(false);
                    }}
                  >
                    <Text style={[styles.calCellText, isTodayStr && { color: '#3b82f6', fontWeight: 'bold' }, isSelected && { color: 'white' }]}>
                      {dateObj.getDate()}
                    </Text>
                    {hasClass && <View style={styles.redDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
      {/* Floating Action Button for Notifications */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setSidePanelVisible(true)}
        activeOpacity={0.8}
      >
        <Bell color="white" size={28} />
        {notifications.filter(n => n.type !== '💬 신규메시지').length + chatMessages.filter(msg => !msg.isMine && !msg.isRead).length > 0 && (
          <View style={styles.fabBadge}>
            <Text style={styles.badgeText}>{notifications.filter(n => n.type !== '💬 신규메시지').length + chatMessages.filter(msg => !msg.isMine && !msg.isRead).length}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa', paddingTop: 50 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, marginBottom: 15 },
  topBarTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  calendarContainer: { backgroundColor: 'white', padding: 15, marginHorizontal: 15, borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayContainer: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 5, borderRadius: 10, width: 40 },
  todayContainer: { backgroundColor: '#2f95dc' },
  dayText: { fontSize: 13, color: '#666', marginBottom: 5 },
  dateText: { fontSize: 16, fontWeight: '600', color: '#333' },
  todayText: { color: 'white', fontWeight: 'bold' },
  classIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E53E3E', marginTop: 5 },
  scheduleListContainer: { paddingHorizontal: 15, marginTop: 20, flex: 1 },
  classCard: { backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  classTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  classDetails: { fontSize: 14, color: '#666' },
  checkInButton: { backgroundColor: '#2f95dc', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  checkedInButton: { backgroundColor: '#10B981' },
  reportButtonStyles: { backgroundColor: '#E53E3E' },
  doneButtonStyles: { backgroundColor: '#9CA3AF' },
  checkInText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20 },
  settingsIconContainer: { padding: 8 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  viewCalendarBtn: { flexDirection: 'row', alignItems: 'center' },
  viewAllText: { fontSize: 13, color: '#333', fontWeight: '500' },

  // Right Sidebar Styles
  sidebarOverlay: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.5)' },
  sidebarPanel: { width: width * 0.75, backgroundColor: 'white', height: '100%' },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#eee' },
  sidebarTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  sidebarContent: { padding: 15 },
  notifItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  notifType: { fontSize: 12, color: '#3b82f6', fontWeight: 'bold', marginBottom: 4 },
  notifTitle: { fontSize: 15, color: '#333', marginBottom: 2 },
  notifTime: { fontSize: 12, color: '#999' },

  // Calendar Modal Styles
  modalOverlayCen: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  calendarModalContent: { backgroundColor: 'white', width: '90%', borderRadius: 16, padding: 20, maxHeight: height * 0.8 },
  calHeaderRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20, position: 'relative' },
  calMonthText: { fontSize: 18, fontWeight: 'bold', paddingHorizontal: 20 },
  calDaysRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 10 },
  calDayLabel: { color: '#666', fontSize: 13, width: '14.28%', textAlign: 'center', marginBottom: 10 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  calCellEmpty: { width: '14.28%', height: 40, marginVertical: 2 },
  calCell: { width: '14.28%', height: 40, marginVertical: 2, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  calCellSelected: { backgroundColor: '#3b82f6' },
  calCellText: { fontSize: 15, color: '#333' },
  redDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#E53E3E', position: 'absolute', bottom: 4 },
  selectedDateScroll: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15 },
  selectedDateTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  calMiniCard: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#f0f0f0' },
  calMiniTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  calMiniTime: { fontSize: 12, color: '#666', marginTop: 4 },

  // Report Modal Styles
  reportModalContent: { backgroundColor: 'white', width: '90%', borderRadius: 16, padding: 20 },
  reportModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  reportModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  reportInput: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 15, minHeight: 120, fontSize: 15, marginBottom: 15 },
  submitReportBtn: { backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitReportText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  // Floating Action Button
  fab: { position: 'absolute', bottom: 20, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5, zIndex: 1000 },
  fabBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: '#E53E3E', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'white' },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' }
});
