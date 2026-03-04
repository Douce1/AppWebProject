import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, Dimensions } from 'react-native';
import { useSchedule } from '../context/ScheduleContext';
import { Bell, MapPin, Clock, CalendarIcon as Calendar, CheckCircle2, ChevronLeft, ChevronRight, X, Megaphone } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const router = useRouter();
  const { classes, notifications, removeNotification } = useSchedule();
  // Notice & Side panel logic
  const [sidePanelVisible, setSidePanelVisible] = useState(false);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);

  // Calendar selection state
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

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
  const [checkedInIds, setCheckedInIds] = useState<string[]>([]);
  const [reportedIds, setReportedIds] = useState<string[]>([]);

  const handleCheckIn = async (id: string, hasEnded: boolean) => {
    // If the class has ended and we haven't reported yet, mark as reported.
    if (hasEnded && checkedInIds.includes(id) && !reportedIds.includes(id)) {
      setReportedIds([...reportedIds, id]);
      Alert.alert('보고 완료', '강의 보고서 작성을 위해 관련 폼으로 이동합니다. (현재 모의 동작)');
      return;
    }

    // Normal Check-in logic
    if (!checkedInIds.includes(id) && !hasEnded) {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('권한 필요', '체크인을 위해 위치 권한이 필요합니다.');
          return;
        }
        let location = await Location.getLastKnownPositionAsync();
        if (!location) {
          location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
        }
        console.log('Checked in at:', location?.coords);

        setCheckedInIds([...checkedInIds, id]);
        Alert.alert('체크인 완료', '정상적으로 출근 체크인이 완료되었습니다.');
      } catch (error) {
        Alert.alert('오류', '위치를 가져오는데 실패했습니다.');
      }
    }
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
      {/* Top Bar with Persistent Bell */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>대시보드</Text>
        <TouchableOpacity onPress={() => setSidePanelVisible(true)} style={styles.bellIconContainer}>
          <Bell color="#666" size={24} />
          {notifications.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notifications.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Weekly Schedule */}
      <View style={styles.calendarContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>📅 주간 일정</Text>
          <TouchableOpacity onPress={() => { setCalendarModalVisible(true); setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1)); }} style={styles.viewCalendarBtn}>
            <Calendar size={16} color="#3b82f6" style={{ marginRight: 4 }} />
            <Text style={styles.viewAllText}>전체 일정 확인</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.weekRow}>
          {weekDates.map((date, idx) => {
            const dateStr = toLocalISOString(date);
            const isToday = dateStr === todayStr;
            const hasClass = classes.some(c => c.date === dateStr);

            return (
              <View key={idx} style={[styles.dayContainer, isToday && styles.todayContainer]}>
                <Text style={[styles.dayText, isToday && styles.todayText]}>{getWeekDayStr(date)}</Text>
                <Text style={[styles.dateText, isToday && styles.todayText]}>{date.getDate()}</Text>
                {hasClass && <View style={styles.classIndicator} />}
              </View>
            );
          })}
        </View>
      </View>

      {/* Today's Schedule List */}
      <ScrollView style={styles.scheduleListContainer}>
        <Text style={styles.sectionTitle}>오늘의 일정 ({classes.filter(c => c.date === todayStr).length})</Text>
        {classes.filter(c => c.date === todayStr).map((c) => {
          const isCheckedIn = checkedInIds.includes(c.id);
          const isReported = reportedIds.includes(c.id);

          let hasEnded = false;
          const endStr = c.time.split('-')[1]?.trim();
          if (endStr && c.date === todayStr) {
            const [endH, endM] = endStr.split(':').map(Number);
            const endTime = new Date(today);
            endTime.setHours(endH, endM, 0, 0);
            if (new Date() > endTime) hasEnded = true;
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
                  (isCheckedIn && !hasEnded) && styles.checkedInButton,
                  (isCheckedIn && hasEnded && !isReported) && styles.reportButtonStyles,
                  (isReported) && styles.checkedInButton
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleCheckIn(c.id, hasEnded);
                }}
                activeOpacity={0.7}
                disabled={isReported}
              >
                {isReported ? (
                  <View style={styles.row}>
                    <CheckCircle2 color="white" size={18} />
                    <Text style={styles.checkInText}> 강의 보고 완료</Text>
                  </View>
                ) : (isCheckedIn && hasEnded) ? (
                  <Text style={styles.checkInText}>보고서 작성</Text>
                ) : isCheckedIn ? (
                  <View style={styles.row}>
                    <CheckCircle2 color="white" size={18} />
                    <Text style={styles.checkInText}> 출근 완료 (강의 중)</Text>
                  </View>
                ) : (
                  <Text style={styles.checkInText}>출근 체크인</Text>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
        {classes.filter(c => c.date === todayStr).length === 0 && (
          <Text style={styles.emptyText}>오늘 예정된 강의가 없습니다.</Text>
        )}
      </ScrollView>

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
              <Text style={styles.sidebarTitle}>알림 센터 ({notifications.length})</Text>
              <TouchableOpacity onPress={() => setSidePanelVisible(false)}>
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sidebarContent}>
              {notifications.map((notif) => (
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
              {notifications.length === 0 && (
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
          setSelectedCalendarDate(null);
        }}
      >
        <View style={styles.modalOverlayCen}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calHeaderRow}>
              <TouchableOpacity onPress={() => changeMonth(-1)}><ChevronLeft size={24} color="#333" /></TouchableOpacity>
              <Text style={styles.calMonthText}>{currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월</Text>
              <TouchableOpacity onPress={() => changeMonth(1)}><ChevronRight size={24} color="#333" /></TouchableOpacity>
              <TouchableOpacity onPress={() => { setCalendarModalVisible(false); setSelectedCalendarDate(null); }} style={{ position: 'absolute', right: 0 }}>
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
                const isSelected = selectedCalendarDate === dStr;
                const isTodayStr = dStr === todayStr;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.calCell, isSelected && styles.calCellSelected]}
                    onPress={() => setSelectedCalendarDate(dStr)}
                  >
                    <Text style={[styles.calCellText, isTodayStr && { color: '#3b82f6', fontWeight: 'bold' }, isSelected && { color: 'white' }]}>
                      {dateObj.getDate()}
                    </Text>
                    {hasClass && <View style={styles.redDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected Date Details */}
            {selectedCalendarDate && (
              <ScrollView style={styles.selectedDateScroll}>
                <Text style={styles.selectedDateTitle}>{selectedCalendarDate.split('-')[1]}월 {selectedCalendarDate.split('-')[2]}일 일정</Text>
                {classes.filter(c => c.date === selectedCalendarDate).length > 0 ? (
                  classes.filter(c => c.date === selectedCalendarDate).map(cls => (
                    <View key={cls.id} style={styles.calMiniCard}>
                      <Text style={styles.calMiniTitle}>{cls.title}</Text>
                      <Text style={styles.calMiniTime}>{cls.time} | {cls.location}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>해당 날짜에 예정된 강의가 없습니다.</Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View >
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
  checkInText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20 },
  bellIconContainer: { padding: 8, position: 'relative' },
  badge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#E53E3E', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'white' },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
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
  calMiniTime: { fontSize: 12, color: '#666', marginTop: 4 }
});
