export const taskStatus = Object.freeze({
    Todo: 'todo',
    Done: 'done',
    parse: (value) => {
        if (value === taskStatus.Done || String(value).toLowerCase() === 'done' || value === '2') {
            return taskStatus.Done;
        }
        // TODO: Ate gostaria de retornar uma exception nesse caso, ver depois. <TDS-24>
        
        return taskStatus.Todo;
    }
})