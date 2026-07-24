import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, FlatList, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TaskRepository from '../infra/repositories/taskRepository';
import TaskService from '../application/taskServices';
import { translate } from './globalizations/i18n';

export default function ViewTaskPage({ navigation, route }) {
    const params = route?.params || {};
    const entityId = params.taskId;
    const taskServiceRef = useRef(null);

    if (!taskServiceRef.current) {
        const repository = new TaskRepository();
        taskServiceRef.current = new TaskService(repository);
    }

    const taskService = taskServiceRef.current;

    const [description, setDescription] = useState('');
    const [observation, setObservation] = useState('');
    const [dueDate, setDueDate] = useState(new Date(Date.now() + 60 * 1000));
    const [notify, setNotify] = useState(false);

    const [showPicker, setShowPicker] = useState(false);
    const [pickerMode, setPickerMode] = useState('date');

    const [taskId, setTaskId] = useState(null);
    const [subTasks, setSubTasks] = useState([]);
    const [newSubTaskDesc, setNewSubTaskDesc] = useState('');

    const handleEdit = async () => {
        navigation.navigate('TaskForm', { taskId: taskId });
    }

    useEffect(() => {
        if (entityId) {
            getDataAsync(entityId);
        }
    }, [entityId]);

    const getDataAsync = async (id) => {
        const task = await taskService.getByIdAsync(id);

        if (task) {
            setTaskId(task.id);
            setDescription(task.description);
            setObservation(task.observation);
            setDueDate(new Date(task.dueDate));
            setNotify(task.notify);
            setSubTasks(task.subTasks || []);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.headerBtnText}>⬅️</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {translate('task')}
                </Text>
                <TouchableOpacity style={styles.headerBtn} onPress={handleEdit} >
                    <Text style={styles.headerBtnText}>✏️</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.formContainer}>

                    <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>{translate('descriptionLabel')}</Text>
                        </View>

                        <View style={styles.readOnlyBox}>
                            <Text style={styles.readOnlyText}>{description}</Text>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>{translate('observationLabel')}</Text>
                        </View>

                        <View style={[styles.readOnlyBox, { minHeight: 100 }]}>
                            <Text style={styles.readOnlyText}>
                                {observation || 'Nenhuma observação informada.'}
                            </Text>
                        </View>
                    </View>

                    {/* SESSÃO DE PRAZO */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{translate('dueDateLabel')}</Text>
                    </View>

                    <View style={styles.notifyGroup}>
                        <View style={styles.notifyRow}>
                            <View style={styles.notifyLabelContainer}>
                                <Text style={styles.notifyLabelText}>{translate('date')}</Text>
                            </View>
                            <Text style={styles.datePickerButtonText}>
                                📅 {dueDate.getDate().toString().padStart(2, '0')} de {translate('months')[dueDate.getMonth()]} de {dueDate.getFullYear()}
                            </Text>
                        </View>

                        <View style={styles.notifyRow}>
                            <View style={styles.notifyLabelContainer}>
                                <Text style={styles.notifyLabelText}>{translate('time')}</Text>
                            </View>
                            <Text style={styles.datePickerButtonText}>
                                ⏰ {dueDate.getHours().toString().padStart(2, '0')}:{dueDate.getMinutes().toString().padStart(2, '0')}
                            </Text>
                        </View>

                        <View style={styles.notifyRow}>
                            <View style={styles.notifyLabelContainer}>
                                <Text style={styles.notifyLabelText}>{translate('notifyLabel')}</Text>
                            </View>
                            <Text style={styles.toggleText}>{notify ? '🔔 Sim' : '🔕 Não'}</Text>
                        </View>
                    </View>

                    {/* SESSÃO DE SUB-TAREFAS COM FLATLIST - //TODO: GLOBALIZAR */}
                    <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>{translate('subTasksLabel')}</Text>
                        </View>

                        <FlatList
                            data={subTasks}
                            keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                            scrollEnabled={false}
                            renderItem={({ item, index }) => (
                                <View style={styles.subTaskRow}>
                                    <Text style={styles.subTaskText}>• {item.description}</Text>
                                </View>
                            )}
                        />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#1C1C1E',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1C1C1E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerBtnText: {
        fontSize: 16,
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    formContainer: {
        marginTop: 20,
    },
    inputGroup: {
        marginBottom: 24,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    input: {
        backgroundColor: '#1C1C1E',
        color: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        borderWidth: 1.5,
        borderColor: '#1C1C1E',
    },
    notifyGroup: {
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 24,
    },
    notifyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A',
    },
    notifyLabelContainer: {
        flex: 1,
    },
    notifyLabelText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    toggleText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 13,
    },
    subTaskRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1C1C1E',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#27272A',
    },
    subTaskText: {
        color: '#FFFFFF',
        fontSize: 14,
        flex: 1,
    },
    datePickerButtonText: {
        color: '#FACC15',
        fontSize: 13,
        fontWeight: 'bold',
    }, readOnlyBox: {
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1.5,
        borderColor: '#1C1C1E',
    },
    readOnlyText: {
        color: '#FFFFFF',
        fontSize: 16,
        lineHeight: 24,
    },
});