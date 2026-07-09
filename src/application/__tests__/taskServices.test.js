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