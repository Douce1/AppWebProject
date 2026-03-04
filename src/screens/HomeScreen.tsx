import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { useSchedule } from '../context/ScheduleContext';
import { Bell, MapPin, Clock, CheckCircle2 } from 'lucide-react-native';

export default function HomeScreen({ navigation }: any) {
  const { classes } = useSchedule();
  const [noticeExpanded, setNoticeExpanded] = useState(true);
  
  // Weekly calendar logic
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
  
  // Generate current week dates (Sun to Sat)
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - dayOfWeek + i);
    return d;
  });

  const getWeekDayStr = (d: Date) => ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];

  // Today's Date String for Check-in logic
  const todayStr = today.toISOString().split('T')[0];
  const [checkedInIds, setCheckedInIds] = useState<string[]>([]);
  
  const handleCheckIn = (id: string) => {
    if (!checkedInIds.includes(id)) {
      setCheckedInIds([...checkedInIds, id]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Urgent Notice */}
      <View style={styles.noticeContainer}>
        {noticeExpanded ? (
          <View style={styles.noticeCard}>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 5}}>
              <Bell color="#E53E3E" size={20} />
              <Text style={styles.noticeTitle}> 긴급 공지사항</Text>
            </View>
            <Text style={styles.noticeText}>코로나19 관련 학원 방역 지침 안내입니다. 모든 강사님들은 반드시 마스크를 착용해주시기 바랍니다.</Text>
            <TouchableOpacity onPress={() => setNoticeExpanded(false)} style={styles.noticeMinimize}>
              <Text style={styles.noticeLink}>최소화</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setNoticeExpanded(true)} style={styles.noticeCollapsed}>
            <Bell color="#E53E3E" size={16} />
            <Text style={styles.noticeCollapsedTitle}> 긴급 공지사항이 있습니다</Text>
            <Text style={styles.noticeLink}> 다시열기</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Weekly Schedule */}
      <View style={styles.calendarContainer}>
        <Text style={styles.sectionTitle}>📅 주간 일정</Text>
        <View style={styles.weekRow}>
          {weekDates.map((date, idx) => {
            const dateStr = date.toISOString().split('T')[0];
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
          return (
            <TouchableOpacity 
              key={c.id} 
              style={styles.classCard} 
              onPress={() => { /* Navigate to specific schedule details here */ }}
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
                style={[styles.checkInButton, isCheckedIn && styles.checkedInButton]}
                onLongPress={() => handleCheckIn(c.id)}
                delayLongPress={800}
                activeOpacity={0.7}
              >
                {isCheckedIn ? (
                  <View style={styles.row}>
                    <CheckCircle2 color="white" size={18} />
                    <Text style={styles.checkInText}> 체크인 완료</Text>
                  </View>
                ) : (
                  <Text style={styles.checkInText}>출근 체크인 (길게 누르기)</Text>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
        {classes.filter(c => c.date === todayStr).length === 0 && (
          <Text style={styles.emptyText}>오늘 예정된 강의가 없습니다.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa', paddingTop: 50 },
  noticeContainer: { paddingHorizontal: 15, marginBottom: 15 },
  noticeCard: { backgroundColor: '#FEE2E2', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#FECACA' },
  noticeTitle: { fontSize: 16, fontWeight: 'bold', color: '#B91C1C' },
  noticeText: { marginTop: 5, color: '#991B1B', lineHeight: 20 },
  noticeMinimize: { alignSelf: 'flex-end', marginTop: 10 },
  noticeCollapsed: { flexDirection: 'row', backgroundColor: '#FEE2E2', padding: 12, borderRadius: 10, alignItems: 'center' },
  noticeCollapsedTitle: { flex: 1, color: '#B91C1C', fontWeight: 'bold', fontSize: 14 },
  noticeLink: { color: '#DC2626', textDecorationLine: 'underline', fontSize: 13 },
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
  checkInText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20 }
});
