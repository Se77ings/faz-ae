import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import TaskRepository from '../infra/repositories/taskRepository';
import TaskService from '../application/taskServices';
import { translate } from './globalizations/i18n';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Crypto from 'expo-crypto';

export default function TaskFormPage({ navigation, route }) {
  const params = route?.params || {};
  const passedTaskId = params.taskId; // renomear para entityId
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
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [isDescriptionFocused, setIsDescriptionFocused] = useState(false);
  const [isObservationFocused, setIsObservationFocused] = useState(false);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');

  const isDueDateValidForNotify = dueDate.getTime() > Date.now();

  const [taskId, setTaskId] = useState(null);
  const [subTasks, setSubTasks] = useState([]);
  const [newSubTaskDesc, setNewSubTaskDesc] = useState('');

  const handleSave = async () => {
    if (!description || description.trim() === '') {
      setError(translate('validationError'));
      return;
    }
    if (!dueDate || isNaN(dueDate.getTime())) {
      setError(translate('validationError'));
      return;
    }

    const nextPriority = taskId ? undefined : (params.maxPriority || 0) + 1;

    const taskData = {
      id: taskId,
      description: description.trim(),
      observation: observation.trim(),
      priority: nextPriority,
      dueDate: dueDate,
      notify: notify,
      subTasks: subTasks
    };

    setSaving(false);
    setError('');
    setSaving(true);

    const success = await taskService.saveAsync(taskData);
    setSaving(false);

    if (success) {
      navigation.goBack();
    } else {
      setError(translate('saveError'));
    }
  };

  const toggleNotify = () => {
    if (isDueDateValidForNotify) {
      setNotify(!notify);
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

    setDueDate(selectedDate);

    if (selectedDate.getTime() <= Date.now()) {
      setNotify(false);
    }
  };

  useEffect(() => {
    if (passedTaskId) {
      loadTaskForEdit(passedTaskId);
    }
  }, [passedTaskId]);

  const loadTaskForEdit = async (id) => {
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

  // sub tasks
  const handleAddSubTask = () => {
    if (!newSubTaskDesc.trim()) return;

    const novaSubTask = {
      id: Crypto.randomUUID(), // ID temporário em memória para controle da lista
      description: newSubTaskDesc.trim(),
      status: 1 // 1 para Todo
    };

    setSubTasks([...subTasks, novaSubTask]);
    setNewSubTaskDesc('');
  };

  const handleRemoveSubTask = (indexToRemove) => {
    setSubTasks(subTasks.filter((_, index) => index !== indexToRemove));
  };

  const renderFormContent = () => (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>{translate('descriptionLabel')} *</Text>
            <Text style={styles.charCounter}>{description.length}/100</Text>
          </View>
          <TextInput
            style={[styles.input, isDescriptionFocused && styles.inputFocused]}
            value={description}
            onChangeText={(text) => {
              if (text.length <= 100) setDescription(text);
            }}
            placeholder={translate('descriptionPlaceholder')}
            placeholderTextColor="#71717A"
            onFocus={() => setIsDescriptionFocused(true)}
            onBlur={() => setIsDescriptionFocused(false)}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>{translate('observationLabel')}</Text>
            <Text style={styles.charCounter}>{observation.length}/500</Text>
          </View>
          <TextInput
            style={[styles.input, styles.multilineInput, isObservationFocused && styles.inputFocused]}
            value={observation}
            onChangeText={(text) => {
              if (text.length <= 500) setObservation(text);
            }}
            placeholder={translate('observationPlaceholder')}
            placeholderTextColor="#71717A"
            multiline
            numberOfLines={4}
            onFocus={() => setIsObservationFocused(true)}
            onBlur={() => setIsObservationFocused(false)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{translate('dueDateLabel')} *</Text>
        </View>

        <View style={styles.notifyGroup}>
          <View style={styles.notifyRow}>
            <View style={styles.notifyLabelContainer}>
              <Text style={styles.notifyLabelText}>Data do Prazo</Text>
            </View>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => openDateTimePicker('date')}
            >
              <Text style={styles.datePickerButtonText}>
                📅 {dueDate.getDate().toString().padStart(2, '0')} de {translate('months')[dueDate.getMonth()]} de {dueDate.getFullYear()}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.notifyRow}>
            <View style={styles.notifyLabelContainer}>
              <Text style={styles.notifyLabelText}>Horário do Prazo</Text>
            </View>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => openDateTimePicker('time')}
            >
              <Text style={styles.datePickerButtonText}>
                ⏰ {dueDate.getHours().toString().padStart(2, '0')}:{dueDate.getMinutes().toString().padStart(2, '0')}
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
                notify && styles.toggleButtonActive,
                !isDueDateValidForNotify && styles.toggleButtonDisabled
              ]}
              onPress={toggleNotify}
              disabled={!isDueDateValidForNotify}
            >
              <Text style={styles.toggleText}>{notify ? '🔔 Sim' : '🔕 Não'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/*TODO: Globalizar*/}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Sub-tarefas</Text>
          </View>

          {subTasks.map((st, index) => (
            <View key={st.id || index} style={styles.subTaskRow}>
              <Text style={styles.subTaskText}>• {st.description}</Text>
              <TouchableOpacity onPress={() => handleRemoveSubTask(index)}>
                <Text style={styles.subTaskDelete}>❌</Text>
              </TouchableOpacity>
            </View>
          ))}

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
        </View>        {showPicker && (
          <DateTimePicker
            value={dueDate}
            mode={pickerMode}
            is24Hour={true}
            display="default"
            minimumDate={new Date()}
            onValueChange={handleDateChange}
          />
        )}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}
        {saving && (
          <ActivityIndicator size="small" color="#FACC15" style={{ marginTop: 15 }} />
        )}
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.headerBtnText}>❌</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {taskId ? translate('editTask') : translate('newTask')}
        </Text>
        <TouchableOpacity style={[styles.headerBtn, styles.headerBtnSave]} onPress={handleSave} disabled={saving}>
          <Text style={styles.headerBtnText}>✅</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={['form_content']}
        keyExtractor={(item) => item}
        renderItem={renderFormContent}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
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
  headerBtnSave: {
    backgroundColor: '#FACC15',
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
  subTaskDelete: {
    fontSize: 12,
    paddingLeft: 10,
  },
  addSubTaskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  addSubTaskBtn: {
    backgroundColor: '#27272A',
    width: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  addSubTaskBtnText: {
    color: '#FACC15',
    fontSize: 24,
    fontWeight: 'bold',
  },
});