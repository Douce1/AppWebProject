import { useRouter } from 'expo-router';
import { Bell, CalendarIcon as Calendar, CheckCircle2, ChevronLeft, ChevronRight, Clock, MapPin, Settings, X } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import { Dimensions, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useChat } from '../context/ChatContext';
import { useSchedule } from '../context/ScheduleContext';
import { CalendarStrip } from '../components/molecules/CalendarStrip';
import { LessonCard } from '../components/organisms/LessonCard';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { CheckinFlow } from '../components/organisms/CheckinFlow';

const { width, height } = Dimensions.get('window');

// ±180일 날짜 배열 생성 (오늘 = index 180)
const DAYS_RANGE = 180;
const TODAY_INDEX = DAYS_RANGE;

function buildDateList() {
  const today = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return Array.from({ length: DAYS_RANGE * 2 + 1 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + (i - DAYS_RANGE));
    return toStr(d);
  });
}

const DATE_LIST = buildDateList();


export default function HomeScreen({ navigation }: any) {
  const router = useRouter();
  const { classes, notifications, removeNotification,
    departedIds, canArriveIds, arrivedIds, canEndClassIds, endedClassIds, readyToReportIds, reportedIds, handleClassAction, submitClassReport
  } = useSchedule();
  const { unreadCount, unreadMessages, markAsRead } = useChat();

  const today = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const toLocalISOString = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayStr = toLocalISOString(today);

  // Notice & Side panel logic
  const [sidePanelVisible, setSidePanelVisible] = useState(false);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const changeMonth = (offset: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  // Weekly calendar row
  const dayOfWeek = today.getDay();
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - dayOfWeek + i);
    return d;
  });

  // Carousel state
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(TODAY_INDEX);
  const activeDate = DATE_LIST[currentIndex];

  // Scroll to a given index
  const scrollToIndex = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(DATE_LIST.length - 1, index));
    flatListRef.current?.scrollToIndex({ index: clampedIndex, animated: true });
  }, []);

  // Jump to today
  const goToToday = useCallback(() => scrollToIndex(TODAY_INDEX), [scrollToIndex]);

  // When weekly calendar bar is tapped, jump to that date
  const jumpToDate = useCallback((dateStr: string) => {
    const idx = DATE_LIST.indexOf(dateStr);
    if (idx !== -1) scrollToIndex(idx);
  }, [scrollToIndex]);

  // Track which page is currently visible
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  // getItemLayout so FlatList can scroll without measuring
  const getItemLayout = useCallback((_: any, index: number) => ({
    length: width,
    offset: width * index,
    index,
  }), []);

  // Report & Checkin modals
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [reportText, setReportText] = useState('');

  const [checkinModalVisible, setCheckinModalVisible] = useState(false);
  const [currentCheckinId, setCurrentCheckinId] = useState<string | null>(null);
  const [isEndingFlow, setIsEndingFlow] = useState(false);

  const submitReport = () => {
    if (currentReportId) submitClassReport(currentReportId, reportText);
    setReportModalVisible(false);
    setReportText('');
    setCurrentReportId(null);
  };

  const confirmCheckin = () => {
    if (currentCheckinId) handleClassAction(currentCheckinId);
    setCheckinModalVisible(false);
    setCurrentCheckinId(null);
  };

  // Monthly calendar grid
  const getDaysInMonth = (year: number, month: number) => {
    const days: (Date | null)[] = [];
    const firstDay = new Date(year, month, 1).getDay();
    for (let i = 0; i < firstDay; i++) days.push(null);
    const numDays = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= numDays; i++) days.push(new Date(year, month, i, 12, 0, 0));
    return days;
  };
  const monthGridDays = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());

  // Render one carousel page for a given dateStr
  const renderPage = useCallback(({ item: dateStr }: { item: string }) => {
    const dayClasses = classes.filter(c => c.date === dateStr);
    const [, m, d] = dateStr.split('-');

    return (
      <View style={{ width, flex: 1, paddingHorizontal: 15 }}>
        {/* Date Navigation Row */}
        <View style={styles.dateNavRow}>
          <TouchableOpacity onPress={() => scrollToIndex(currentIndex - 1)} style={styles.dateNavBtn}>
            <ChevronLeft size={22} color="#F3C742" />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToToday} style={styles.dateNavCenter}>
            <Text style={styles.sectionTitle}>
              {dateStr === todayStr ? '오늘의 일정' : `${parseInt(m)}월 ${parseInt(d)}일 일정`} ({dayClasses.length})
            </Text>
            {dateStr !== todayStr && <Text style={styles.goTodayHint}>오늘로 이동</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToIndex(currentIndex + 1)} style={styles.dateNavBtn}>
            <ChevronRight size={22} color="#F3C742" />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }}>
          {dayClasses.map((c) => {
            const isReadyToReport = readyToReportIds.includes(c.id);
            const isEndedClass = endedClassIds.includes(c.id);
            const isCanEndClass = canEndClassIds.includes(c.id);
            const isArrived = arrivedIds.includes(c.id);
            const isCanArrive = canArriveIds.includes(c.id);
            const isDeparted = departedIds.includes(c.id);
            const isReported = reportedIds.includes(c.id);

            let hasEnded = false;
            const endStr = c.time.split('-')[1]?.trim();
            if (endStr && c.date === dateStr) {
              const [endH, endM] = endStr.split(':').map(Number);
              const endTime = new Date(today);
              endTime.setHours(endH, endM, 0, 0);
              if (new Date() > endTime && dateStr === todayStr) hasEnded = true;
            } else if (c.date < todayStr) {
              hasEnded = true;
            }

            let statusStr: 'requested' | 'confirmed' | 'canceled' | 'completed' = 'confirmed';
            let badgeLabelStr = '확정됨';
            let statusLabelStr = '수업 확정';
            let actionLabel = '출발';
            let actionDisabled = false;

            let actionVariant: 'primary' | 'secondary' = 'primary';

            if (isReported) {
              statusStr = 'completed'; badgeLabelStr = '제출됨'; statusLabelStr = '수업 완료';
              actionLabel = '수고하셨습니다'; actionDisabled = true;
            } else if (isReadyToReport) {
              statusStr = 'requested'; badgeLabelStr = '작성 대기'; statusLabelStr = '보고서 작성 필요';
              actionLabel = '강의 보고서 작성';
            } else if (isEndedClass) {
              statusStr = 'completed'; badgeLabelStr = '종료 됨'; statusLabelStr = '종료 처리 중';
              actionLabel = '종료 처리 중...'; actionDisabled = true;
            } else if (isCanEndClass) {
              statusStr = 'confirmed'; badgeLabelStr = '강의 중'; statusLabelStr = '수업 진행';
              actionLabel = '강의 종료';
            } else if (isArrived) {
              statusStr = 'confirmed'; badgeLabelStr = '도착 완료'; statusLabelStr = '강의 대기 중';
              actionLabel = '도착 완료 (강의 중)'; actionDisabled = true;
            } else if (isCanArrive) {
              statusStr = 'requested'; badgeLabelStr = '이동 중'; statusLabelStr = '도착 승인 대기';
              actionLabel = '도착 확인'; actionVariant = 'secondary';
            } else if (isDeparted) {
              statusStr = 'requested'; badgeLabelStr = '이동 중'; statusLabelStr = '이동 중';
              actionLabel = '이동 중...'; actionDisabled = true;
            } else {
              actionVariant = 'secondary';
            }


            return (
              <LessonCard
                key={c.id}
                status={statusStr}
                badgeLabel={badgeLabelStr}
                statusLabel={statusLabelStr}
                title={c.title}
                location={c.location}
                time={c.time}
                isExternal={c.isExternal}
                onPressCard={() => router.push({ pathname: '/class-detail' as any, params: { classInfo: JSON.stringify(c) } })}
                primaryActionLabel={actionLabel}
                primaryActionVariant={actionVariant}
                primaryActionDisabled={actionDisabled}
                onPrimaryAction={() => {
                  if (isReadyToReport && !isReported) {
                    setCurrentReportId(c.id);
                    setReportModalVisible(true);
                  } else if (isCanArrive) {
                    setCurrentCheckinId(c.id);
                    setIsEndingFlow(false);
                    setCheckinModalVisible(true);
                  } else if (isCanEndClass) {
                    setCurrentCheckinId(c.id);
                    setIsEndingFlow(true);
                    setCheckinModalVisible(true);
                  } else {
                    handleClassAction(c.id);
                  }
                }}
              />
            );
          })}
          {dayClasses.length === 0 && (
            <Text style={styles.emptyText}>
              {dateStr === todayStr ? '오늘 예정된 강의가 없습니다.' : '해당 날짜에 예정된 강의가 없습니다.'}
            </Text>
          )}
        </ScrollView>
      </View>
    );
  }, [classes, readyToReportIds, endedClassIds, canEndClassIds, arrivedIds, canArriveIds, departedIds, reportedIds, todayStr, goToToday, handleClassAction, router, currentIndex, scrollToIndex]);

  // compute classes dict for CalendarStrip indicator
  const classesForDates = classes.reduce((acc, c) => {
    acc[c.date] = true;
    return acc;
  }, {} as Record<string, boolean>);

  const currentClassName = classes.find(c => c.id === currentCheckinId)?.title || '';

  return (
    <View style={styles.container}>
      {/* Top Bar with Settings & Notifications */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>대시보드</Text>
        <View style={styles.topBarIcons}>
          <TouchableOpacity onPress={() => setSidePanelVisible(true)} style={styles.settingsIconContainer}>
            <Bell color="#666" size={26} />
            {notifications.filter(n => n.type !== '채팅 신규메시지').length + unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{notifications.filter(n => n.type !== '채팅 신규메시지').length + unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/settings' as any)} style={styles.settingsIconContainer}>
            <Settings color="#666" size={26} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekly Schedule */}
      <CalendarStrip
        dates={weekDates}
        activeDateStr={activeDate}
        onDateSelect={jumpToDate}
        classesForDates={classesForDates}
        onViewAll={() => { setCalendarModalVisible(true); setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1)); }}
      />

      {/* Schedule Carousel -> FlatList with pagingEnabled */}
      <FlatList
        ref={flatListRef}
        data={DATE_LIST}
        renderItem={renderPage}
        keyExtractor={(item) => item}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={getItemLayout}
        initialScrollIndex={TODAY_INDEX}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.scheduleListContainer}
        removeClippedSubviews
      />

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
                알림 센터 ({notifications.filter(n => n.type !== '채팅 신규메시지').length + unreadCount})
              </Text>
              <TouchableOpacity onPress={() => setSidePanelVisible(false)}>
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sidebarContent}>
              {/* Added Dynamic Chat Notifications */}
              {unreadMessages.map(msg => (
                <TouchableOpacity
                  key={`chat-${msg.messageId}`}
                  style={styles.notifItem}
                  onPress={() => {
                    setSidePanelVisible(false);
                    markAsRead(msg.roomId);
                    router.push({ pathname: '/chat-room', params: { roomId: msg.roomId } } as any);
                  }}
                >
                  <Text style={styles.notifType}>채팅 신규메시지 ({msg.senderName})</Text>
                  <Text style={styles.notifTitle}>관리자: {msg.content}</Text>
                  <Text style={styles.notifTime}>{new Date(msg.sentAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</Text>
                </TouchableOpacity>
              ))}
              {notifications.filter(n => n.type !== '채팅 신규메시지').map((notif: any) => (
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
              {notifications.filter(n => n.type !== '채팅 신규메시지').length === 0 && unreadCount === 0 && (
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
                      jumpToDate(dStr);
                      setCalendarModalVisible(false);
                    }}
                  >
                    <Text style={[styles.calCellText, isTodayStr && { color: Colors.brandInk, fontWeight: 'bold' }, isSelected && { color: 'white' }]}>
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

      {/* Checkin / End Class Modal */}
      <CheckinFlow
        visible={checkinModalVisible}
        className={currentClassName}
        isEndClass={isEndingFlow}
        onConfirm={confirmCheckin}
        onCancel={() => setCheckinModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: 50 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, marginBottom: 15 },
  topBarTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  topBarIcons: { flexDirection: 'row', alignItems: 'center' },
  bellBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#E53E3E', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'white' },
  bellBadgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  calendarContainer: { backgroundColor: 'white', padding: 15, marginHorizontal: 15, borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayContainer: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 5, borderRadius: 10, width: 40 },
  todayContainer: { backgroundColor: Colors.brandInk },
  dayText: { fontSize: 13, color: '#666', marginBottom: 5 },
  dateText: { fontSize: 16, fontWeight: '600', color: '#333' },
  todayText: { color: 'white', fontWeight: 'bold' },
  classIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E53E3E', marginTop: 5 },
  scheduleListContainer: { marginTop: 20, flex: 1 },
  dateNavRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dateNavBtn: { padding: 8, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#F3C742' },
  dateNavCenter: { flex: 1, alignItems: 'center' },
  goTodayHint: { fontSize: 11, color: '#F3C742', marginTop: 2, fontWeight: 'bold' },
  classCard: { backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  classTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  classDetails: { fontSize: 14, color: '#666' },
  checkInButton: { backgroundColor: Colors.brandInk, padding: 15, ...Radius.button, alignItems: 'center', marginTop: 10 },
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
  sidebarPanel: { width: width * 0.75, backgroundColor: '#FCF9F2', height: '100%' },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  sidebarTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.brandInk },
  sidebarContent: { padding: 15 },
  notifItem: { backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  notifType: { fontSize: 12, color: Colors.brandInk, fontWeight: 'bold', marginBottom: 4 },
  notifTitle: { fontSize: 15, color: '#333', marginBottom: 2 },
  notifTime: { fontSize: 12, color: Colors.mutedForeground },

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
  calCellSelected: { backgroundColor: Colors.brandInk },
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
  reportModalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.brandInk },
  reportInput: { backgroundColor: Colors.surfaceSoft, borderRadius: 12, padding: 15, minHeight: 120, fontSize: 15, marginBottom: 15, borderWidth: 1, borderColor: Colors.border },
  submitReportBtn: { backgroundColor: Colors.brandInk, paddingVertical: 14, ...Radius.button, alignItems: 'center' },
  submitReportText: { color: Colors.brandHoney, fontSize: 16, fontWeight: 'bold' },


});
