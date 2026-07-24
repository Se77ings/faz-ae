const translations = {
  "pt-BR": {
    myTasks: "Minhas Tarefas",
    highPriority: "Alta prioridade",
    mediumPriority: "Média prioridade",
    lowPriority: "Baixa prioridade",
    openWork: "Open up App.js to start working on your app!",
    emptyTasks: "Nenhuma tarefa para este período.",
    months: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
    newTask: "Nova Tarefa",
    descriptionLabel: "Descrição",
    descriptionPlaceholder: "O que precisa ser feito?",
    observationLabel: "Observação",
    observationPlaceholder: "Adicione notas ou observações...",
    dueDateLabel: "Prazo",
    notifyLabel: "Notificar",
    validationError: "Por favor, preencha todos os campos corretamente.",
    saveError: "Erro ao salvar a tarefa no banco.",
    cancel: "Cancelar",
    save: "Salvar",
    editTask: "Editar Tarefa",
    task: "Tarefa",
    date: "Data",
    time: "Horário",
    subTasksLabel: "Sub-tarefas",
  },
  "en-US": {
    myTasks: "My Tasks",
    highPriority: "High priority",
    mediumPriority: "Medium priority",
    lowPriority: "Low priority",
    openWork: "Open up App.js to start working on your app!",
    emptyTasks: "No tasks for this period.",
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    newTask: "New Task",
    descriptionLabel: "Description",
    descriptionPlaceholder: "What needs to be done?",
    observationLabel: "Observation",
    observationPlaceholder: "Add notes or observations...",
    dueDateLabel: "Due Date",
    notifyLabel: "Notify",
    validationError: "Please fill in all fields correctly.",
    saveError: "Error saving task to database.",
    cancel: "Cancel",
    save: "Save",
    editTask: "Edit Task",
    task: "Task",
    date: "Date",
    time: "Time",
    subTasksLabel: "Sub-tasks",
  }
};

// Define o idioma estático inicial (facilmente alterável por uma tela de configuração no futuro)
export const currentLanguage = "pt-BR";

export const translate = (key) => {
  return translations[currentLanguage]?.[key] || translations["en-US"]?.[key] || key;
};