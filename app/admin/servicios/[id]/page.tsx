"use client"

import { notFound, useRouter } from "next/navigation"
import Link from "next/link"
import { useState, use } from "react"
import { services, clientDocuments, payments, timelineEvents, serviceTasks } from "@/lib/data"
import { cn } from "@/lib/utils"
import type { Firm, ServiceTask } from "@/lib/types"

const STATUS_CONFIG = {
  solicitud:  { label: "Solicitud",   color: "#6B7280", bg: "#F3F4F6" },
  en_proceso: { label: "En proceso",  color: "#1C2B4A", bg: "#EEF2F8" },
  revision:   { label: "En revisión", color: "#D97706", bg: "#FFFBEB" },
  completado: { label: "Completado",  color: "#16A34A", bg: "#F0FDF4" },
  cancelado:  { label: "Cancelado",   color: "#DC2626", bg: "#FEF2F2" },
}

function FirmPill({ firm }: { firm: Firm }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
      firm === "paulsen" ? "bg-[#EAF2EC] text-[#2D5A3D]" : "bg-[#EEF2F8] text-[#1C2B4A]"
    )}>
      {firm === "paulsen" ? "Ambiental" : "Corporativo"}
    </span>
  )
}

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString("es-MX", { maximumFractionDigits: 0 })} MXN`
}

type Tab = "tareas" | "documentos" | "pagos" | "timeline"
type TaskStatus = "pendiente" | "en_progreso" | "completada"

interface LocalTask {
  id: string
  title: string
  assignedTo: string
  dueDate?: string
  status: TaskStatus
  note: string
  isLocal?: boolean
}

const TASK_STATUS_CFG: Record<TaskStatus, { color: string; bg: string; label: string }> = {
  completada:  { color: "#16A34A", bg: "#F0FDF4", label: "Completada" },
  en_progreso: { color: "#D97706", bg: "#FFFBEB", label: "En progreso" },
  pendiente:   { color: "#9CA3AF", bg: "#F3F4F6", label: "Pendiente" },
}

export default function AdminServiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const service = services.find(s => s.id === id)
  if (!service) notFound()

  const [activeTab, setActiveTab] = useState<Tab>("tareas")
  const [taskDone, setTaskDone] = useState<string[]>([])
  const [localTasks, setLocalTasks] = useState<LocalTask[]>([])
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<LocalTask>>({})
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTask, setNewTask] = useState({ title: "", assignedTo: "", dueDate: "", note: "" })

  const statusCfg = STATUS_CONFIG[service.status]
  const seedTasks  = serviceTasks.filter(t => t.serviceId === service.id)
  const docs       = clientDocuments.filter(d => d.serviceId === service.id)
  const svcPayments = payments.filter(p => p.serviceId === service.id)
  const timeline   = timelineEvents.filter(e => e.serviceId === service.id).sort((a, b) => b.date.localeCompare(a.date))

  const allTasks: LocalTask[] = [
    ...seedTasks.map(t => ({
      id: t.id,
      title: t.title,
      assignedTo: t.assignedTo,
      dueDate: t.dueDate,
      status: t.status as TaskStatus,
      note: t.note ?? "",
      isLocal: false,
    })),
    ...localTasks,
  ]
  const completedTasks = allTasks.filter(t => t.status === "completada" || taskDone.includes(t.id)).length

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "tareas",     label: "Tareas",     count: allTasks.length },
    { id: "documentos", label: "Documentos", count: docs.length },
    { id: "pagos",      label: "Pagos",      count: svcPayments.length },
    { id: "timeline",   label: "Timeline",   count: timeline.length },
  ]

  function startEdit(task: LocalTask) {
    setEditingTask(task.id)
    setEditValues({ title: task.title, assignedTo: task.assignedTo, dueDate: task.dueDate, status: task.status, note: task.note })
  }

  function saveEdit(taskId: string) {
    // For seed tasks — just update done state based on status
    if (editValues.status === "completada") {
      setTaskDone(p => [...new Set([...p, taskId])])
    }
    // For local tasks, update in state
    setLocalTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...editValues } : t))
    setEditingTask(null)
  }

  function addTask() {
    if (!newTask.title.trim()) return
    const task: LocalTask = {
      id: `lt-${Date.now()}`,
      title: newTask.title,
      assignedTo: newTask.assignedTo || "Por asignar",
      dueDate: newTask.dueDate || undefined,
      status: "pendiente",
      note: newTask.note,
      isLocal: true,
    }
    setLocalTasks(prev => [...prev, task])
    setNewTask({ title: "", assignedTo: "", dueDate: "", note: "" })
    setShowNewTask(false)
  }

  function deleteLocalTask(id: string) {
    setLocalTasks(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="min-h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-8 h-8 rounded-xl hover:bg-muted transition-colors shrink-0"
          >
            <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Servicios</p>
            <h1 className="text-base font-semibold text-foreground leading-tight truncate">{service.title}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <FirmPill firm={service.firm} />
            {/* Chat shortcut */}
            <Link
              href={`/admin/chat?service=${service.id}`}
              className="flex items-center gap-1.5 text-xs font-semibold bg-[#1C2B4A] text-white px-3 py-1.5 rounded-xl hover:bg-[#1C2B4A]/90 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              Chat
            </Link>
          </div>
        </div>

        {/* Progress + status */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ color: statusCfg.color, background: statusCfg.bg }}>
              {statusCfg.label}
            </span>
            <span className="text-xs text-muted-foreground">{completedTasks}/{allTasks.length} tareas · {service.progress}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${service.progress}%`, background: service.firm === "paulsen" ? "#2D5A3D" : "#1C2B4A" }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              Responsable: <span className="font-medium text-foreground">{service.assignedTo}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(service.updatedAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-border overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 flex-1 justify-center px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "border-[#1C2B4A] text-[#1C2B4A]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn(
                  "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                  activeTab === tab.id ? "bg-[#EEF2F8] text-[#1C2B4A]" : "bg-muted text-muted-foreground"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6">

        {/* ── TAREAS ── */}
        {activeTab === "tareas" && (
          <div className="max-w-2xl space-y-2">
            {/* Next step callout */}
            {service.nextStep && service.status !== "completado" && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 mb-4">
                <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <div>
                  <p className="text-xs font-semibold text-amber-800 mb-0.5">Siguiente accion requerida</p>
                  <p className="text-xs text-amber-700">{service.nextStep}</p>
                </div>
              </div>
            )}

            {allTasks.map(task => {
              const isDone = task.status === "completada" || taskDone.includes(task.id)
              const cfg = TASK_STATUS_CFG[isDone ? "completada" : (task.status as TaskStatus)]
              const isEditing = editingTask === task.id

              return (
                <div key={task.id} className={cn("bg-card border rounded-2xl overflow-hidden transition-all", isDone ? "border-border opacity-70" : "border-border")}>
                  {isEditing ? (
                    /* Edit mode */
                    <div className="p-4 flex flex-col gap-3">
                      <input
                        className="w-full text-sm bg-muted rounded-xl px-3 py-2 outline-none border border-transparent focus:border-[#1C2B4A]/30"
                        value={editValues.title || ""}
                        onChange={e => setEditValues(v => ({ ...v, title: e.target.value }))}
                        placeholder="Título de la tarea"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          className="text-xs bg-muted rounded-xl px-3 py-2 outline-none border border-transparent focus:border-[#1C2B4A]/30"
                          value={editValues.assignedTo || ""}
                          onChange={e => setEditValues(v => ({ ...v, assignedTo: e.target.value }))}
                          placeholder="Responsable"
                        />
                        <input
                          type="date"
                          className="text-xs bg-muted rounded-xl px-3 py-2 outline-none border border-transparent focus:border-[#1C2B4A]/30"
                          value={editValues.dueDate || ""}
                          onChange={e => setEditValues(v => ({ ...v, dueDate: e.target.value }))}
                        />
                      </div>
                      <select
                        className="text-xs bg-muted rounded-xl px-3 py-2 outline-none border border-transparent focus:border-[#1C2B4A]/30"
                        value={editValues.status || task.status}
                        onChange={e => setEditValues(v => ({ ...v, status: e.target.value as TaskStatus }))}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="en_progreso">En progreso</option>
                        <option value="completada">Completada</option>
                      </select>
                      <input
                        className="text-xs bg-muted rounded-xl px-3 py-2 outline-none border border-transparent focus:border-[#1C2B4A]/30"
                        value={editValues.note || ""}
                        onChange={e => setEditValues(v => ({ ...v, note: e.target.value }))}
                        placeholder="Nota interna (opcional)"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(task.id)}
                          className="flex-1 bg-[#1C2B4A] text-white text-xs font-semibold py-2 rounded-xl"
                        >
                          Guardar cambios
                        </button>
                        <button
                          onClick={() => setEditingTask(null)}
                          className="px-4 border border-border text-xs font-medium py-2 rounded-xl"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <div className="p-4 flex gap-3">
                      <button
                        onClick={() => !isDone && setTaskDone(p => [...p, task.id])}
                        className="mt-0.5 shrink-0"
                        aria-label="Marcar completada"
                      >
                        {isDone ? (
                          <svg className="w-5 h-5 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : task.status === "en_progreso" ? (
                          <svg className="w-5 h-5 text-[#D97706]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="12" r="9" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium text-foreground", isDone && "line-through text-muted-foreground")}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] text-muted-foreground">{task.assignedTo}</span>
                          {task.dueDate && (
                            <span className={cn(
                              "text-[10px] font-medium px-1.5 py-0.5 rounded-md",
                              new Date(task.dueDate) < new Date() && !isDone
                                ? "bg-red-50 text-red-600"
                                : "bg-muted text-muted-foreground"
                            )}>
                              {new Date(task.dueDate).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                            </span>
                          )}
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: cfg.color, background: cfg.bg }}>
                            {cfg.label}
                          </span>
                        </div>
                        {task.note && (
                          <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mt-2">{task.note}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(task)}
                          className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                          aria-label="Editar tarea"
                        >
                          <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        {task.isLocal && (
                          <button
                            onClick={() => deleteLocalTask(task.id)}
                            className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors"
                            aria-label="Eliminar tarea"
                          >
                            <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* New task form */}
            {showNewTask ? (
              <div className="bg-card border-2 border-dashed border-[#1C2B4A]/30 rounded-2xl p-4 flex flex-col gap-3">
                <p className="text-sm font-semibold text-foreground">Nueva tarea</p>
                <input
                  className="w-full text-sm bg-muted rounded-xl px-3 py-2.5 outline-none border border-transparent focus:border-[#1C2B4A]/30"
                  value={newTask.title}
                  onChange={e => setNewTask(v => ({ ...v, title: e.target.value }))}
                  placeholder="Titulo de la tarea *"
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="text-xs bg-muted rounded-xl px-3 py-2 outline-none border border-transparent focus:border-[#1C2B4A]/30"
                    value={newTask.assignedTo}
                    onChange={e => setNewTask(v => ({ ...v, assignedTo: e.target.value }))}
                    placeholder="Responsable"
                  />
                  <input
                    type="date"
                    className="text-xs bg-muted rounded-xl px-3 py-2 outline-none border border-transparent focus:border-[#1C2B4A]/30"
                    value={newTask.dueDate}
                    onChange={e => setNewTask(v => ({ ...v, dueDate: e.target.value }))}
                  />
                </div>
                <input
                  className="text-xs bg-muted rounded-xl px-3 py-2 outline-none border border-transparent focus:border-[#1C2B4A]/30"
                  value={newTask.note}
                  onChange={e => setNewTask(v => ({ ...v, note: e.target.value }))}
                  placeholder="Nota interna (opcional)"
                />
                <div className="flex gap-2">
                  <button onClick={addTask} className="flex-1 bg-[#1C2B4A] text-white text-xs font-semibold py-2.5 rounded-xl">
                    Agregar tarea
                  </button>
                  <button onClick={() => setShowNewTask(false)} className="px-4 border border-border text-xs font-medium py-2.5 rounded-xl">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewTask(true)}
                className="w-full border-2 border-dashed border-border rounded-2xl py-3.5 text-sm font-medium text-muted-foreground hover:border-[#1C2B4A]/30 hover:text-[#1C2B4A] transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Agregar tarea
              </button>
            )}
          </div>
        )}

        {/* ── DOCUMENTOS ── */}
        {activeTab === "documentos" && (
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Documentos del expediente</h2>
              <button className="text-xs font-semibold text-[#1C2B4A] border border-[#1C2B4A]/20 px-3 py-1.5 rounded-xl hover:bg-[#EEF2F8] transition-colors flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Subir documento
              </button>
            </div>
            {docs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                <svg className="w-8 h-8 text-muted-foreground mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p className="text-sm text-muted-foreground">Sin documentos en este expediente</p>
              </div>
            )}
            {docs.map(doc => {
              const dirColor = doc.direction === "pendiente_firma" ? "#D97706" : doc.direction === "recibido" ? "#1C2B4A" : "#16A34A"
              const dirLabel = doc.direction === "recibido" ? "Recibido" : doc.direction === "enviado" ? "Enviado" : "Pendiente firma"
              return (
                <div key={doc.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ color: dirColor, background: `${dirColor}15` }}>
                        {dirLabel}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{doc.size}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString("es-MX")}</span>
                    </div>
                  </div>
                  <button className="p-2 rounded-xl hover:bg-muted transition-colors" aria-label="Descargar">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* ── PAGOS ── */}
        {activeTab === "pagos" && (
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Pagos del servicio</h2>
              <Link href="/admin/pagos" className="text-xs text-[#1C2B4A] font-semibold flex items-center gap-1 border border-[#1C2B4A]/20 px-3 py-1.5 rounded-xl hover:bg-[#EEF2F8]">
                Ver todos
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            </div>
            {svcPayments.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                <svg className="w-8 h-8 text-muted-foreground mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
                <p className="text-sm text-muted-foreground">Sin pagos asociados</p>
              </div>
            )}
            {svcPayments.map(p => {
              const isPaid = p.status === "pagado"
              const isOverdue = p.status === "vencido"
              return (
                <div key={p.id} className={cn("bg-card border rounded-2xl p-4 flex items-center gap-3",
                  isOverdue ? "border-red-200" : isPaid ? "border-border" : "border-amber-200"
                )}>
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    isPaid ? "bg-[#F0FDF4]" : isOverdue ? "bg-[#FEF2F2]" : "bg-[#FFFBEB]"
                  )}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      style={{ color: isPaid ? "#16A34A" : isOverdue ? "#DC2626" : "#D97706" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{p.concept}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isPaid ? `Pagado el ${new Date(p.paidAt!).toLocaleDateString("es-MX")}` : `Vence: ${new Date(p.dueDate).toLocaleDateString("es-MX")}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-foreground">{fmt(p.amount)}</p>
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                      isPaid ? "bg-[#F0FDF4] text-[#16A34A]" : isOverdue ? "bg-[#FEF2F2] text-[#DC2626]" : "bg-[#FFFBEB] text-[#D97706]"
                    )}>
                      {isPaid ? "Pagado" : isOverdue ? "Vencido" : "Pendiente"}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── TIMELINE ── */}
        {activeTab === "timeline" && (
          <div className="max-w-2xl">
            <h2 className="text-sm font-semibold text-foreground mb-4">Historial del expediente</h2>
            {timeline.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">Sin eventos registrados</div>
            )}
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-4 pl-10">
                {timeline.map(event => (
                  <div key={event.id} className="relative">
                    <div
                      className="absolute -left-10 top-2 w-3 h-3 rounded-full border-2 border-background"
                      style={{ background: event.firm === "paulsen" ? "#2D5A3D" : "#1C2B4A" }}
                    />
                    <div className="bg-card border border-border rounded-2xl p-4">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-foreground">{event.action}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(event.date).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      {event.detail && <p className="text-xs text-muted-foreground mb-2">{event.detail}</p>}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{event.actor}</span>
                        <FirmPill firm={event.firm} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
