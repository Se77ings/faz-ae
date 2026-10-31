import TaskService from '../taskServices';
import TaskAggregate from '../../domain/entities/TaskAggregate';

describe('TaskService - Testes Unitários', () => {
    let mockRepository;
    let taskService;

    beforeEach(() => {
        // Criamos um mock com os mesmos métodos que o repositório real possui
        mockRepository = {
            getByIdAsync: jest.fn(),
            getAllAsync: jest.fn(),
            saveAsync: jest.fn(),
            deleteAsync: jest.fn()
        };

        // Injetamos o mock no serviço (Inversão de Dependência)
        taskService = new TaskService(mockRepository);
    });

    test('Deve salvar uma nova task com sucesso quando os dados forem válidos', async () => {
        const taskData = {
            description: 'Minha tarefa de teste',
            observation: 'Alguma observação',
            priority: 1,
            dueDate: new Date(Date.now() + 86400000), // Amanhã
            notify: false
        };

        // Simulamos que o repositório vai responder "true" ao salvar
        mockRepository.saveAsync.mockResolvedValue(true);

        const result = await taskService.saveAsync(taskData);

        expect(result).toBe(true);
        expect(mockRepository.saveAsync).toHaveBeenCalledTimes(1);
        // Garante que o serviço instanciou o Domain corretamente antes de mandar pro repo
        expect(mockRepository.saveAsync).toHaveBeenCalledWith(expect.any(TaskAggregate));
    });

    test('Deve retornar false ao salvar se os dados violarem a validação do domínio', async () => {
        const invalidTaskData = {
            description: '', // Inválido: requires(description)
            priority: 1,
            dueDate: new Date(),
            notify: false
        };

        const result = await taskService.saveAsync(invalidTaskData);

        expect(result).toBe(false);
        expect(mockRepository.saveAsync).not.toHaveBeenCalled();
    });

    test('Deve deletar uma task chamando o repositório corretamente', async () => {
        mockRepository.deleteAsync.mockResolvedValue(true);

        const result = await taskService.deleteAsync('some-guid-id');

        expect(result).toBe(true);
        expect(mockRepository.deleteAsync).toHaveBeenCalledWith('some-guid-id');
    });
});

describe('TaskService - Alarmes', () => {
    const HOUR = 60 * 60 * 1000;
    let mockRepository;
    let mockScheduler;
    let taskService;

    beforeEach(() => {
        mockRepository = {
            getByIdAsync: jest.fn(),
            getAllAsync: jest.fn(),
            saveAsync: jest.fn().mockResolvedValue(true),
            deleteAsync: jest.fn().mockResolvedValue(true)
        };
        mockScheduler = { schedule: jest.fn(), cancel: jest.fn() };
        taskService = new TaskService(mockRepository, mockScheduler);
    });

    // TDS-6: trocar a torneira amanhã, avisando com 1 hora de antecedência.
    test('Agenda o alarme 1 hora antes do prazo ao criar uma tarefa com notificação', async () => {
        const dueDate = new Date(Date.now() + 24 * HOUR);

        await taskService.saveAsync({ description: 'Trocar a torneira', observation: '', priority: 1, dueDate, notify: true });

        const [task, ringAt] = mockScheduler.schedule.mock.calls[0];
        expect(task.description).toBe('Trocar a torneira');
        expect(ringAt.getTime()).toBe(dueDate.getTime() - HOUR);
    });

    test('Toca no próprio prazo quando faltar menos de 1 hora', async () => {
        const dueDate = new Date(Date.now() + 30 * 60 * 1000);

        await taskService.saveAsync({ description: 'Tirar o lixo', observation: '', priority: 1, dueDate, notify: true });

        expect(mockScheduler.schedule.mock.calls[0][1]).toEqual(dueDate);
    });

    test('Não agenda alarme para tarefa sem notificação', async () => {
        await taskService.saveAsync({ description: 'Ler um livro', observation: '', priority: 1, dueDate: new Date(Date.now() + 24 * HOUR), notify: false });

        expect(mockScheduler.schedule).not.toHaveBeenCalled();
        expect(mockScheduler.cancel).toHaveBeenCalled();
    });

    // TDS-7: a tarefa concluída antes do prazo não deve mais tocar.
    test('Cancela o alarme ao concluir a tarefa', async () => {
        const task = new TaskAggregate('Trocar a torneira', '', 1, new Date(Date.now() + 24 * HOUR), true);
        task.id = 'torneira'; // o mock do expo-crypto no jest-expo não gera UUID
        mockRepository.getByIdAsync.mockResolvedValue(task);

        await taskService.completeTaskAsync(task.id);

        expect(mockScheduler.cancel).toHaveBeenCalledWith(task.id);
        expect(mockScheduler.schedule).not.toHaveBeenCalled();
    });

    test('Agenda de novo ao reabrir uma tarefa ainda no prazo', async () => {
        const task = new TaskAggregate('Trocar a torneira', '', 1, new Date(Date.now() + 24 * HOUR), true);
        task.completeTask();
        mockRepository.getByIdAsync.mockResolvedValue(task);

        await taskService.reopenTaskAsync(task.id);

        expect(mockScheduler.schedule).toHaveBeenCalledWith(task, expect.any(Date));
    });

    test('Cancela o alarme ao excluir a tarefa', async () => {
        await taskService.deleteAsync('some-guid-id');

        expect(mockScheduler.cancel).toHaveBeenCalledWith('some-guid-id');
    });

    test('Falha no alarme não impede salvar a tarefa', async () => {
        mockScheduler.schedule.mockImplementation(() => { throw new Error('sem permissão'); });
        jest.spyOn(console, 'error').mockImplementation(() => {});

        const result = await taskService.saveAsync({ description: 'Trocar a torneira', observation: '', priority: 1, dueDate: new Date(Date.now() + 24 * HOUR), notify: true });

        expect(result).toBe(true);
    });
});