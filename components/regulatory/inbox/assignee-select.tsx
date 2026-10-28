'use client'

import type { AssignableMember } from '@/app/actions/regulatory-items'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Props = {
  members: AssignableMember[]
  value: string
  onChange: (id: string) => void
}

/** Elige a la persona del equipo a quien se asigna el asunto. */
export function AssigneeSelect({ members, value, onChange }: Props) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-label text-ink-muted">Asignar a</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label="Asignar a" className="w-full min-w-56">
          <SelectValue placeholder="Elige a una persona" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </label>
  )
}
