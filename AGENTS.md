# Lineamientos del proyecto

## UI y diseño

Toda pantalla, componente, botón o texto nuevo sigue el design system de
Otero: lee `docs/design-system.md` antes de tocar UI.

- Colores solo por token (`bg-surface`, `text-ink`, `bg-brand`,
  `text-risk`…). Nunca hex, `rgb()`, `bg-[#…]` ni la paleta por defecto de
  Tailwind.
- Tipografía con la escala (`text-display-md`, `text-heading`, `text-body`,
  `text-body-sm`, `text-label`, `text-caption`, `text-cite`, `text-data`).
- Bordes, no sombras. Radios `sm`/`md`/`lg`/`pill`. Espacios en la escala
  1, 2, 3, 4, 6, 8, 12, 16, 24.
- Reutiliza `components/ui` (`Button`, `StatusTag`, `Cite`, `DeadlineChip`,
  `Card`…) y `components/regulatory/regulatory-alert.tsx` antes de crear
  estilos propios.
- Un solo botón primario (rosa) por vista. Estados con palabra e ícono.
- Textos en español de México, de tú, verbo primero, sin exclamaciones ni
  emojis. Toda alerta lleva su fuente ("DOF 02/10/2026 · Art. 15").
- Al editar un archivo con colores escritos a mano, migra a tokens los que
  toques.

## Flujo

- pnpm. Verifica tipos con `pnpm exec tsc --noEmit` antes de integrar.
