import { scheduleAlarm, cancelAlarm } from 'android-alarm-manager';

const SNOOZE_MINUTES = 10;

export default class TaskAlarmScheduler {
    // O módulo nativo não tem i18n: os textos da tela de alarme são traduzidos aqui, no agendamento.
    constructor(translate) {
        this._translate = translate;
    }

    schedule(task, ringAt) {
        scheduleAlarm({
            id: task.id.toString(),
            timestamp: ringAt.getTime(),
            title: task.description,
            body: task.observation || '',
            stopLabel: this._translate('alarmStop'),
            snoozeLabel: this._translate('alarmSnooze'),
            snoozeMinutes: SNOOZE_MINUTES
        });
    }

    cancel(taskId) {
        cancelAlarm(taskId.toString());
    }
}
