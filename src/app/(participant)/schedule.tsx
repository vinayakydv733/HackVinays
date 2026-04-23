import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { db } from '../../firebase/config';

type EventType = 'event' | 'speaker' | 'break' | 'meal';

interface ScheduleEvent {
  id: string;
  title: string;
  description: string;
  time: string;
  date: string;
  type: EventType;
  location?: string;
}

interface TypeConfigItem {
  color: string;
  icon: string;
  label: string;
}

const TYPE_CONFIG: { [key in EventType]: TypeConfigItem } = {
  event:   { color: COLORS.primary, icon: 'calendar',    label: 'EVENT'   },
  speaker: { color: COLORS.purple,  icon: 'mic',         label: 'SPEAKER' },
  break:   { color: COLORS.orange,  icon: 'cafe',        label: 'BREAK'   },
  meal:    { color: COLORS.green,   icon: 'restaurant',  label: 'MEAL'    },
};

export default function Schedule() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupedEvents, setGroupedEvents] = useState<{ [key: string]: ScheduleEvent[] }>({});

  useEffect(() => {
    const q = query(
      collection(db, 'events'),
      orderBy('date', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as ScheduleEvent)
      );
      setEvents(data);

      const grouped: { [key: string]: ScheduleEvent[] } = {};
      data.forEach((e) => {
        if (!grouped[e.date]) grouped[e.date] = [];
        grouped[e.date].push(e);
      });
      setGroupedEvents(grouped);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Event Schedule</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {Object.keys(groupedEvents).map((date) => (
          <View key={date}>
            <View style={styles.dateSeparator}>
              <View style={styles.dateLine} />
              <Text style={styles.dateText}>
                {new Date(date)
                  .toLocaleDateString('en-US', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                  })
                  .toUpperCase()}
              </Text>
              <View style={styles.dateLine} />
            </View>

            {groupedEvents[date].map((event: ScheduleEvent, index: number) => {
              const config: TypeConfigItem = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.event;
              const isLast = index === groupedEvents[date].length - 1;

              return (
                <View key={event.id} style={styles.eventRow}>
                  <View style={styles.timeline}>
                    <View
                      style={[
                        styles.timelineDot,
                        { backgroundColor: config.color },
                      ]}
                    >
                      <Ionicons
                        name={config.icon as any}
                        size={12}
                        color={COLORS.bg}
                      />
                    </View>
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>

                  <View style={styles.eventCard}>
                    <View style={styles.eventCardTop}>
                      <Text style={styles.eventTime}>{event.time}</Text>
                      <View
                        style={[
                          styles.typeBadge,
                          { backgroundColor: config.color + '22' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeBadgeText,
                            { color: config.color },
                          ]}
                        >
                          {config.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventDesc}>{event.description}</Text>
                    {event.location ? (
                      <View style={styles.locationRow}>
                        <Ionicons
                          name="location"
                          size={12}
                          color={COLORS.textSecondary}
                        />
                        <Text style={styles.locationText}>
                          {event.location}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        {events.length === 0 && (
          <View style={styles.empty}>
            <Ionicons
              name="calendar-outline"
              size={48}
              color={COLORS.textDim}
            />
            <Text style={styles.emptyText}>No events scheduled yet</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: 56,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.size.xl,
    fontWeight: '800',
  },
  content: { padding: SPACING.md, paddingBottom: 100 },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dateText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.xs,
    letterSpacing: 2,
    fontWeight: '700',
  },
  eventRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  timeline: {
    alignItems: 'center',
    width: 32,
    paddingTop: SPACING.sm,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.border,
    marginTop: 4,
    minHeight: 20,
  },
  eventCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  eventCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  eventTime: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.sm,
    fontWeight: '600',
  },
  typeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  typeBadgeText: {
    fontSize: FONTS.size.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  eventTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.size.md,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  eventDesc: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.sm,
    lineHeight: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.sm,
  },
  locationText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.xs,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: SPACING.md,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.md,
  },
});