import { useMemo, useState } from 'react'

type Task = {
  id: number
  title: string
  completed: boolean
}

function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, title: 'Plan today\'s work', completed: false },
    { id: 2, title: 'Review pull requests', completed: false },
  ])
  const [newTask, setNewTask] = useState('')

  const remaining = useMemo(
    () => tasks.filter((task) => !task.completed).length,
    [tasks],
  )

  const addTask = () => {
    const title = newTask.trim()
    if (!title) return
    setTasks((prev) => [
      ...prev,
      { id: Date.now(), title, completed: false },
    ])
    setNewTask('')
  }

  const toggleTask = (id: number) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    )
  }

  const clearCompleted = () => {
    setTasks((prev) => prev.filter((task) => !task.completed))
  }

  return (
    <section className="task-manager">
      <div className="task-header">
        <h2>Working Manager</h2>
        <p>{remaining} task{remaining === 1 ? '' : 's'} remaining</p>
      </div>
      <div className="task-input-row">
        <input
          value={newTask}
          onChange={(event) => setNewTask(event.target.value)}
          placeholder="Add a new task..."
          aria-label="New task title"
        />
        <button type="button" onClick={addTask}>
          Add
        </button>
      </div>
      <ul className="task-list">
        {tasks.map((task) => (
          <li key={task.id} className={task.completed ? 'completed' : ''}>
            <label>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTask(task.id)}
              />
              <span>{task.title}</span>
            </label>
          </li>
        ))}
      </ul>
      <button type="button" className="clear-button" onClick={clearCompleted}>
        Clear completed
      </button>
    </section>
  )
}

export default TaskManager
