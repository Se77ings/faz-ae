import React, { useState } from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { translate } from './globalizations/i18n';
import TaskList from './components/taskList';
import { styles } from './styles/homeScreenStyles';
import { TabEnum } from '../domain/enumerations/tabEnum';

export default function HomeScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState(TabEnum.Day);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const handleNavigateDate = (direction) => {
    const newDate = new Date(selectedDate);

    if (activeTab === TabEnum.Day) {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (activeTab === TabEnum.Week) {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (activeTab === TabEnum.Month) {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }

    setSelectedDate(newDate);
  };

  const formatNavigatorLabel = () => {
    const months = translate('months');
    const day = selectedDate.getDate().toString().padStart(2, '0');
    const monthName = months[selectedDate.getMonth()] || '';
    const year = selectedDate.getFullYear();

    if (activeTab === TabEnum.Day) {
      return `${day} de ${monthName} de ${year}`;
    } else if (activeTab === TabEnum.Week) {
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const startDay = startOfWeek.getDate().toString().padStart(2, '0');
      const endDay = endOfWeek.getDate().toString().padStart(2, '0');
      const endMonth = months[endOfWeek.getMonth()] || '';

      return `${startDay} - ${endDay} de ${endMonth}`;
    } else if (activeTab === TabEnum.Month) {
      return `${monthName} de ${year}`;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{translate('myTasks')}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('TaskForm', { maxPriority: 10 })}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === TabEnum.Day && styles.tabActive]}
          onPress={() => setActiveTab(TabEnum.Day)}
        >
          <Text style={styles.tabIcon}>📅₁</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === TabEnum.Week && styles.tabActive]}
          onPress={() => setActiveTab(TabEnum.Week)}
        >
          <Text style={styles.tabIcon}>📆</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === TabEnum.Month && styles.tabActive]}
          onPress={() => setActiveTab(TabEnum.Month)}
        >
          <Text style={styles.tabIcon}>🗓️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dateNavigator}>
        <TouchableOpacity onPress={() => handleNavigateDate('prev')}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.dateText}>{formatNavigatorLabel()}</Text>
        <TouchableOpacity onPress={() => handleNavigateDate('next')}>
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <TaskList selectedDate={selectedDate} activeTab={activeTab} />
    </SafeAreaView>
  );
}