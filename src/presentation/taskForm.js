import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import TaskRepository from '../infra/repositories/taskRepository';
import TaskService from '../application/taskServices';
import { translate } from './globalizations/i18n';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SubTask } from '../domain/entities/subTask';

export default function TaskFormPage({ navigation, route }) {
  const params = route?.params || {};
  const entityId = params.taskId;
  const taskServiceRef = useRef(null);

  if (!taskServiceRef.current) {
    const repository = new TaskRepository();
    taskServiceRef.current = new TaskService(repository);
  }
  const taskService = taskServiceRef.current;

  // ESTADO UNIFICADO DENTRO DE ENTITY
  const [entity, setEntity] = useState({
    id: null,
    description: '',
    observation: '',
    dueDate: new Date(Date.now() + 60 * 60 * 1000),
    notify: false,
    subTasks: []
  });

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [isDescriptionFocused, setIsDescriptionFocused] = useState(false);
  const [isObservationFocused, setIsObservationFocused] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');
  const [newSubTaskDesc, setNewSubTaskDesc] = useState('');

  const isDueDateValidForNotify = entity.dueDate.getTime() > Date.now();

  // Helper para atualizar campos específicos do entity
  const updateEntity = (field, value) => {
    setEntity(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (entityId) {
      loadTaskForEdit(entityId);
    }
  }, [entityId]);

  const loadTaskForEdit = async (id) => {
    const task = await taskService.getByIdAsync(id);
    if (task) {
      setEntity({
        id: task.id,
        description: task.description,
        observation: task.observation,
        dueDate: new Date(task.dueDate),
        notify: task.notify,
        subTasks: task.subTasks || []
      });
    }
  };

  const handleSave = async () => {
    if (!entity.description || entity.description.trim() === '') {
      setError(translate('validationError'));
      return;
    }
    if (!entity.dueDate || isNaN(entity.dueDate.getTime())) {
      setError(translate('validationError'));
      return;
    }

    const nextPriority = entity.id ? undefined : (params.maxPriority || 0) + 1;

    const taskData = {
      id: entity.id,
      description: entity.description.trim(),
      observation: entity.observation.trim(),
      priority: nextPriority,
      dueDate: entity.dueDate,
      notify: entity.notify,
      subTasks: entity.subTasks
    };

    setSaving(false);
    setError('');
    setSaving(true);

    const success = await taskService.saveAsync(taskData);
    setSaving(false);

    if (success) {
      console.log("SUCESSO! (reload)");
      navigation.goBack();
    } else {
      setError(translate('saveError'));
    }
  };

  const toggleNotify = () => {
    if (isDueDateValidForNotify) {
      updateEntity('notify', !entity.notify);
    }
  };

  const openDateTimePicker = (mode) => {
    setPickerMode(mode);
    setShowPicker(true);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowPicker(false);

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    setEntity(prev => ({
      ...prev,
      dueDate: selectedDate,
      // Desativa a notificação automaticamente se a data selecionada for no passado
      notify: selectedDate.getTime() <= Date.now() ? false : prev.notify
    }));
  };

  const handleAddSubTask = () => {
    if (!newSubTaskDesc.trim()) return;

    const novaSubTask = new SubTask(newSubTaskDesc.trim());
    updateEntity('subTasks', [...entity.subTasks, novaSubTask]);
    setNewSubTaskDesc('');
  };

  const handleRemoveSubTask = (indexToRemove) => {
    updateEntity('subTasks', entity.subTasks.filter((_, index) => index !== indexToRemove));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.headerBtnText}>❌</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {entity.id ? translate('editTask') : translate('newTask')}
        </Text>
        <TouchableOpacity style={styles.headerBtn} onPress={handleSave} disabled={saving}>
          <Text style={styles.headerBtnText}>✅</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={'padding'}>
        <ScrollView
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled" >

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}
          <View style={styles.formContainer}>

            {/* DESCRIÇÃO */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{translate('descriptionLabel')} *</Text>
                <Text style={styles.charCounter}>{entity.description.length}/100</Text>
              </View>
              <TextInput
                style={[styles.input, isDescriptionFocused && styles.inputFocused]}
                value={entity.description}
                onChangeText={(text) => {
                  if (text.length <= 100) updateEntity('description', text);
                }}
                placeholder={translate('descriptionPlaceholder')}
                placeholderTextColor="#71717A"
                onFocus={() => setIsDescriptionFocused(true)}
                onBlur={() => setIsDescriptionFocused(false)}
              />
            </View>

            {/* OBSERVAÇÃO */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{translate('observationLabel')}</Text>
                <Text style={styles.charCounter}>{entity.observation.length}/500</Text>
              </View>
              <TextInput
                style={[styles.input, styles.multilineInput, isObservationFocused && styles.inputFocused]}
                value={entity.observation}
                onChangeText={(text) => {
                  if (text.length <= 500) updateEntity('observation', text);
                }}
                placeholder={translate('observationPlaceholder')}
                placeholderTextColor="#71717A"
                multiline
                numberOfLines={4}
                onFocus={() => setIsObservationFocused(true)}
                onBlur={() => setIsObservationFocused(false)}
              />
            </View>

            {/* SESSÃO DE PRAZO */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{translate('dueDateLabel')} *</Text>
            </View>

            <View style={styles.notifyGroup}>
              <View style={styles.notifyRow}>
                <View style={styles.notifyLabelContainer}>
                  <Text style={styles.notifyLabelText}>{translate('date')}</Text>
                </View>
                <TouchableOpacity style={styles.datePickerButton} onPress={() => openDateTimePicker('date')}>
                  <Text style={styles.datePickerButtonText}>
                    📅 {entity.dueDate.getDate().toString().padStart(2, '0')} de {translate('months')[entity.dueDate.getMonth()]} de {entity.dueDate.getFullYear()}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.notifyRow}>
                <View style={styles.notifyLabelContainer}>
                  <Text style={styles.notifyLabelText}>{translate('time')}</Text>
                </View>
                <TouchableOpacity style={styles.datePickerButton} onPress={() => openDateTimePicker('time')}>
                  <Text style={styles.datePickerButtonText}>
                    ⏰ {entity.dueDate.getHours().toString().padStart(2, '0')}:{entity.dueDate.getMinutes().toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.notifyRow, !isDueDateValidForNotify && styles.notifyRowDisabled]}>
                <View style={styles.notifyLabelContainer}>
                  <Text style={styles.notifyLabelText}>{translate('notifyLabel')}</Text>
                  {!isDueDateValidForNotify && (
                    <Text style={styles.notifySubText}>Prazo deve ser futuro</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    entity.notify && styles.toggleButtonActive,
                    !isDueDateValidForNotify && styles.toggleButtonDisabled
                  ]}
                  onPress={toggleNotify}
                  disabled={!isDueDateValidForNotify}
                >
                  <Text style={styles.toggleText}>{entity.notify ? '🔔 Sim' : '🔕 Não'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* SESSÃO DE SUB-TAREFAS COM FLATLIST */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{translate('subTasksLabel')}</Text>
              </View>

              <FlatList
                data={entity.subTasks}
                keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                scrollEnabled={false}
                renderItem={({ item, index }) => (
                  <View style={styles.subTaskCard}>
                    <View style={styles.subTaskRow}>
                      <View style={styles.statusIconContainer}>
                        <Text style={styles.statusIconText}>•</Text>
                      </View>
                      <Text style={styles.subTaskText}>{item.description}</Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveSubTask(index)}
                        style={styles.subTaskDeleteBtn}
                      >
                        <Text style={styles.subTaskDeleteBtnText}>❌</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />

              <View style={styles.addSubTaskContainer}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={newSubTaskDesc}
                  onChangeText={setNewSubTaskDesc}
                  placeholder="Nova sub-tarefa..."
                  placeholderTextColor="#71717A"
                />
                <TouchableOpacity style={styles.addSubTaskBtn} onPress={handleAddSubTask}>
                  <Text style={styles.addSubTaskBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {showPicker && (
              <DateTimePicker
                value={entity.dueDate}
                mode={pickerMode}
                is24Hour={true}
                display="default"
                minimumDate={new Date()}
                onValueChange={handleDateChange}
              />
            )}

            {saving && (
              <ActivityIndicator size="small" color="#FACC15" style={{ marginTop: 15 }} />
            )}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  charCounter: {
    color: '#71717A',
    fontSize: 12,
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
  inputFocused: {
    borderColor: '#FACC15',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
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
  notifyRowDisabled: {
    opacity: 0.6,
  },
  notifyLabelContainer: {
    flex: 1,
  },
  notifyLabelText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  notifySubText: {
    color: '#E11D48',
    fontSize: 12,
    marginTop: 2,
  },
  datePickerButton: {
    backgroundColor: '#27272A',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  datePickerButtonText: {
    color: '#FACC15',
    fontSize: 13,
    fontWeight: 'bold',
  },
  toggleButton: {
    backgroundColor: '#27272A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#FACC15',
  },
  toggleButtonDisabled: {
    backgroundColor: '#27272A',
  },
  toggleText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  errorContainer: {
    backgroundColor: '#450A0A',
    borderColor: '#7F1D1D',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Estilos Alinhados com a ViewTaskPage
  subTaskCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#27272A',
    overflow: 'hidden',
  },
  subTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
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
  subTaskDeleteBtn: {
    padding: 8,
  },
  subTaskDeleteBtnText: {
    fontSize: 12,
  },
  addSubTaskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    height: 52,
  },
  addSubTaskBtn: {
    backgroundColor: '#27272A',
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1.5,
    borderColor: '#27272A',
  },
  addSubTaskBtnText: {
    color: '#FACC15',
    fontSize: 24,
    fontWeight: 'bold',
  },
});