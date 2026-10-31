import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TaskRepository from '../infra/repositories/taskRepository';
import TaskAlarmScheduler from '../infra/alarms/taskAlarmScheduler';
import TaskService from '../application/taskServices';
import { translate } from './globalizations/i18n';
import { taskStatus } from "../domain/enumerations/taskStatus";

export default function ViewTaskPage({ navigation, route }) {
    const params = route?.params || {};
    const entityId = params.taskId;
    const taskServiceRef = useRef(null);

    if (!taskServiceRef.current) {
        const repository = new TaskRepository();
        taskServiceRef.current = new TaskService(repository, new TaskAlarmScheduler(translate));
    }

    const taskService = taskServiceRef.current;
    const [expandedSubTaskId, setExpandedSubTaskId] = useState(null);
    const [hasModifications, setHasModifications] = useState(false);
    const toggleExpandSubTask = (id) => {
        setExpandedSubTaskId(prevId => prevId === id ? null : id);
    };
    const [entity, setEntity] = useState({
        id: null,
        description: '',
        observation: '',
        dueDate: new Date(),
        notify: false,
        status: taskStatus.Todo,
        subTasks: []
    });

    useEffect(() => {
        if (entityId) {
            getDataAsync(entityId);
        }
    }, [entityId]);

    useEffect(() => {
        if (route.params?.refreshRequired) {
            getDataAsync(entityId);
            setHasModifications(true);
            navigation.setParams({ refreshRequired: false });
        }
    }, [route.params?.refreshRequired]);

    const getDataAsync = async (id) => {
        const task = await taskService.getByIdAsync(id);

        if (task) {
            setEntity({
                id: task.id,
                description: task.description,
                observation: task.observation,
                dueDate: new Date(task.dueDate),
                notify: task.notify,
                status: task.status,
                subTasks: task.subTasks || []
            });
        }
    };

    const handleEdit = () => {
        navigation.navigate('TaskForm', { taskId: entity.id });
    };

    const isTaskDone = entity.status === taskStatus.Done || entity.status === 2;

    const handleCompleteSubTaskAsync = async (subTaskId) => {
        try {
            const result = await taskService.completeSubTaskAsync(entity.id, subTaskId);
            if (result) {
                setHasModifications(true);
                getDataAsync(entity.id);
            }
        } catch (ex) {
            console.error("Erro ao completar subTask:", ex);
        }
    };

    const handleReopenSubTaskAsync = async (subTaskId) => {
        try {
            const result = await taskService.reopenSubTaskAsync(entity.id, subTaskId);
            if (result) {
                getDataAsync(entity.id);
            }
        } catch (ex) {
            console.error("Erro ao reabrir subTask:", ex);
        }
    };

    const handleReopenTask = async () => {
        try {
            const result = await taskService.reopenTaskAsync(entity.id);
            if (result) {
                getDataAsync(entity.id);
            }
        } catch (error) {
            console.error("Erro ao reabrir a tarefa:", error);
        }
    };

    const handleCompleteTask = async () => {
        const hasPendingSubTasks = entity.subTasks.some(
            st => st.status === taskStatus.Todo || st.status === 1 || st.status === 'todo'
        );

        if (hasPendingSubTasks) {
            Alert.alert(
                "Sub-tarefas pendentes",
                "Esta tarefa possui sub-tarefas não concluídas. Deseja concluir a tarefa e todas as sub-tarefas?",
                [
                    { text: "Cancelar", style: "cancel" },
                    { text: "Concluir Tudo", style: "destructive", onPress: executeCompleteTask }
                ]
            );
        } else {
            executeCompleteTask();
        }
    };

    const executeCompleteTask = async () => {
        try {
            const result = await taskService.completeTaskAsync(entity.id);
            if (result) {
                getDataAsync(entity.id);
            }
        } catch (error) {
            console.error("Erro ao concluir a tarefa:", error);
        }
    };

    const handleGoBack = () => {
        if (hasModifications) {
            navigation.navigate('Home', { refreshRequired: true }, { merge: true });
        } else {
            navigation.goBack();
        }
    };
    return (
        <SafeAreaView style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerBtn} onPress={handleGoBack}>
                    <Text style={styles.headerBtnText}>⬅️</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{translate('task')}</Text>
                <TouchableOpacity style={styles.headerBtn} onPress={handleEdit}>
                    <Text style={styles.headerBtnText}>✏️</Text>
                </TouchableOpacity>
            </View>

            {/* CONTEÚDO */}
            <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.formContainer}>

                    {/* DESCRIÇÃO */}
                    <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>{translate('descriptionLabel')}</Text>
                        </View>
                        <View style={styles.readOnlyBox}>
                            <Text style={styles.readOnlyText}>{entity.description}</Text>
                        </View>
                    </View>

                    {/* OBSERVAÇÃO */}
                    <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>{translate('observationLabel')}</Text>
                        </View>
                        <View style={[styles.readOnlyBox, { minHeight: 100 }]}>
                            <Text style={styles.readOnlyText}>
                                {entity.observation || 'Nenhuma observação informada.'}
                            </Text>
                        </View>
                    </View>

                    {/* PRAZO */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{translate('dueDateLabel')}</Text>
                    </View>

                    <View style={styles.notifyGroup}>
                        <View style={styles.notifyRow}>
                            <View style={styles.notifyLabelContainer}>
                                <Text style={styles.notifyLabelText}>{translate('date')}</Text>
                            </View>
                            <Text style={styles.datePickerButtonText}>
                                📅 {entity.dueDate.getDate().toString().padStart(2, '0')} de {translate('months')[entity.dueDate.getMonth()]} de {entity.dueDate.getFullYear()}
                            </Text>
                        </View>

                        <View style={styles.notifyRow}>
                            <View style={styles.notifyLabelContainer}>
                                <Text style={styles.notifyLabelText}>{translate('time')}</Text>
                            </View>
                            <Text style={styles.datePickerButtonText}>
                                ⏰ {entity.dueDate.getHours().toString().padStart(2, '0')}:{entity.dueDate.getMinutes().toString().padStart(2, '0')}
                            </Text>
                        </View>

                        <View style={styles.notifyRow}>
                            <View style={styles.notifyLabelContainer}>
                                <Text style={styles.notifyLabelText}>{translate('notifyLabel')}</Text>
                            </View>
                            <Text style={styles.toggleText}>{entity.notify ? '🔔 Sim' : '🔕 Não'}</Text>
                        </View>
                    </View>

                    {/* SUB-TAREFAS */}
                    {entity.subTasks.length > 0 && (
                        <View style={styles.inputGroup}>
                            <View style={styles.labelRow}>
                                <Text style={styles.label}>{translate('subTasksLabel')}</Text>
                            </View>

                            <FlatList
                                data={entity.subTasks}
                                keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                                scrollEnabled={false}
                                renderItem={({ item }) => {
                                    const isSubDone = item.status === taskStatus.Done || item.status === 2 || item.status === 'done';
                                    const isExpanded = expandedSubTaskId === item.id;

                                    if (!isSubDone) {
                                        return (
                                            <View style={[styles.subTaskCard, styles.subTaskTodo]}>
                                                <View style={styles.subTaskRow}>
                                                    <View style={styles.statusIconContainer}>
                                                        <Text style={styles.statusIconText}>•</Text>
                                                    </View>
                                                    <Text style={styles.subTaskText}>{item.description}</Text>
                                                    <TouchableOpacity
                                                        onPress={() => handleCompleteSubTaskAsync(item.id)}
                                                        style={styles.subTaskCompleteBtn}
                                                        activeOpacity={0.6}>
                                                        <Text style={styles.completeBtnText}>CONCLUIR</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        );
                                    }

                                    return (
                                        <View style={[styles.subTaskCard, styles.subTaskCompleted]}>
                                            <TouchableOpacity
                                                style={styles.subTaskRow}
                                                activeOpacity={0.7}
                                                disabled={isTaskDone}
                                                onPress={() => toggleExpandSubTask(item.id)}>
                                                <View style={styles.statusIconContainer}>
                                                    <Text style={styles.statusIconText}>✓</Text>
                                                </View>
                                                <Text style={[styles.subTaskText, styles.subTaskTextDone]}>
                                                    {item.description}
                                                </Text>
                                                <Text style={styles.expandChevronText}>{isExpanded ? '▲' : ''}</Text>
                                            </TouchableOpacity>

                                            {/* Conteúdo Expandido (Aparece apenas quando clicado) */}
                                            {isExpanded && (
                                                <View style={styles.expandedContent}>
                                                    <TouchableOpacity
                                                        style={styles.undoActionBtn}
                                                        activeOpacity={0.8}
                                                        disabled={isTaskDone}
                                                        onPress={() => {
                                                            setExpandedSubTaskId(null); // Fecha a expansão
                                                            handleReopenSubTaskAsync(item.id);
                                                        }}>
                                                        <Text style={styles.undoActionText}>↺ Desfazer Conclusão</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    );
                                }}
                            />
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* BARRA FIXA INFERIOR - AÇÃO PRINCIPAL */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={[styles.mainActionButton, isTaskDone ? styles.mainActionButtonReopen : styles.mainActionButtonComplete]}
                    onPress={isTaskDone ? handleReopenTask : handleCompleteTask}
                    activeOpacity={0.8}>
                    <Text style={[styles.mainActionButtonText, isTaskDone && styles.mainActionButtonTextReopen]}>
                        {isTaskDone ? 'REABRIR TAREFA' : 'CONCLUIR TAREFA'}
                    </Text>
                </TouchableOpacity>
            </View>
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
        paddingBottom: 20,
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
    readOnlyBox: {
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
    datePickerButtonText: {
        color: '#FACC15',
        fontSize: 13,
        fontWeight: 'bold',
    },
    subTaskCard: {
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1,
        overflow: 'hidden',
    },
    subTaskRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 52,
    },
    subTaskTodo: {
        backgroundColor: '#1C1C1E',
        borderColor: '#27272A',
    },
    subTaskCompleted: {
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    statusIconContainer: {
        marginRight: 12,
        width: 20,
        alignItems: 'center',
    },
    statusIconText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#10B981',
    },
    subTaskText: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '500',
    },
    subTaskTextDone: {
        color: '#71717A',
        textDecorationLine: 'line-through',
    },
    expandChevronText: {
        color: '#71717A',
        fontSize: 10,
        marginLeft: 8,
    },
    // Área que se abre ao clicar no item concluído
    expandedContent: {
        paddingHorizontal: 16,
        paddingBottom: 12,
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: 'rgba(16, 185, 129, 0.15)',
        alignItems: 'flex-end', // Alinha o botão de desfazer à direita
    },
    undoActionBtn: {
        backgroundColor: 'rgba(234, 88, 12, 0.15)', // Laranja translúcido
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#EA580C',
    },
    undoActionText: {
        color: '#EA580C',
        fontSize: 12,
        fontWeight: 'bold',
    },
    subTaskCompleteBtn: {
        backgroundColor: 'rgba(250, 204, 21, 0.15)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#FACC15',
    },
    completeBtnText: {
        color: '#FACC15',
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    // BARRA FIXA INFERIOR
    bottomBar: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#000000',
        borderTopWidth: 1,
        borderTopColor: '#1C1C1E',
    },
    mainActionButton: {
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainActionButtonComplete: {
        backgroundColor: '#FACC15',
    },
    mainActionButtonReopen: {
        backgroundColor: '#1C1C1E',
        borderWidth: 1,
        borderColor: '#27272A',
    },
    mainActionButtonText: {
        color: '#000000',
        fontSize: 15,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    mainActionButtonTextReopen: {
        color: '#A1A1AA',
    }
});