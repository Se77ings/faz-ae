import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import TaskRepository from '../../infra/repositories/taskRepository';
import TaskService from '../../application/taskServices';
import { translate } from '../globalizations/i18n';
import { styles } from '../styles/homeScreenStyles';
import { TabEnum } from '../../domain/enumerations/tabEnum';
import { useNavigation } from '@react-navigation/native';

const taskRepository = new TaskRepository();
const taskService = new TaskService(taskRepository);

export default function TaskList({ selectedDate, activeTab }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigation = useNavigation();

    useEffect(() => {
        fetchTasks();
    }, [selectedDate, activeTab]);

    const fetchTasks = async () => {
        setLoading(true);

        const data = await taskService.getListAsync(1, 100);

        const filtered = data.filter((task) => {
            if (!task.dueDate) return true;

            const taskDate = new Date(task.dueDate);
            const targetDate = new Date(selectedDate);

            if (activeTab === TabEnum.Day) {
                return (
                    taskDate.getDate() === targetDate.getDate() &&
                    taskDate.getMonth() === targetDate.getMonth() &&
                    taskDate.getFullYear() === targetDate.getFullYear()
                );
            } else if (activeTab === TabEnum.Week) {
                const startOfWeek = new Date(targetDate);
                startOfWeek.setDate(targetDate.getDate() - targetDate.getDay());
                startOfWeek.setHours(0, 0, 0, 0);

                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);

                return taskDate >= startOfWeek && taskDate <= endOfWeek;
            } else if (activeTab === TabEnum.Month) {
                return (
                    taskDate.getMonth() === targetDate.getMonth() &&
                    taskDate.getFullYear() === targetDate.getFullYear()
                );
            }

            return true;
        });

        setTasks(filtered);
        setLoading(false);
    };

    const getPriorityDetails = (priorityValue) => {
        if (priorityValue > 10) return { label: translate('highPriority'), color: '#E11D48' };
        if (priorityValue > 5) return { label: translate('mediumPriority'), color: '#EA580C' };
        return { label: translate('lowPriority'), color: '#16A34A' };
    };
    const formatTaskDate = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        const day = d.getDate().toString().padStart(2, '0');
        const month = translate('months')[d.getMonth()].substring(0, 3); // Pega as 3 primeiras letras do mês
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        return `${day} ${month}, ${hours}:${minutes}`;
    };

    const renderTaskCard = ({ item }) => {
        const priorityDetails = getPriorityDetails(item.priority);
        const isDone = item.status === 2;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('TaskForm', { taskId: item.id })}
            >
                <View style={[styles.priorityIndicator, { backgroundColor: priorityDetails.color }]} />
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>
                            {item.description}
                        </Text>
                        <TouchableOpacity style={styles.checkbox}>
                            <Text style={{ fontSize: 18 }}>{isDone ? '✅' : '⚪'}</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.taskObservation}>{item.observation}</Text>

                    <View style={styles.cardFooter}>
                        <View style={styles.metaRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={[styles.priorityText, { color: priorityDetails.color, marginRight: 10 }]}>
                                    {priorityDetails.label}
                                </Text>

                                {/* Exibe o Dia/Hora apenas se a aba for Semana ou Mês */}
                                {activeTab !== TabEnum.Day && item.dueDate && (
                                    <Text style={{ color: '#A1A1AA', fontSize: 12 }}>
                                        🕒 {formatTaskDate(item.dueDate)}
                                    </Text>
                                )}
                            </View>

                            <Text style={styles.timeText}>{item.notify ? '🔔' : '🔕'}</Text>
                        </View>
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: `${item.progressPercentage || 0}%` }]} />
                            </View>
                            <Text style={styles.progressPercentage}>{item.progressPercentage || 0}%</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#FACC15" style={{ marginTop: 20 }} />;
    }

    return (
        <FlatList
            data={tasks}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderTaskCard}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Text style={styles.emptyText}>{translate('emptyTasks')}</Text>}
        />
    );
}