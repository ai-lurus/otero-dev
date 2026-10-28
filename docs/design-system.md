# Design system de Otero

Lineamientos obligatorios para toda pantalla, componente, botón y texto nuevo.
Los tokens viven en `app/globals.css`; este documento explica cómo usarlos.

## Esencia y voz

Otero es la IA de cumplimiento regulatorio para equipos legales en México.
Personalidad serena, precisa y directa. Mexicana sin folclor: la identidad
viene del color y la forma (cal, tinta, rosa mexicano), no de clichés.

- Un solo nombre: el producto y la IA se llaman `Otero`. Nunca "Otero AI",
  "el bot", ni OTERO en mayúsculas.
- Háblale de **tú** al usuario. Frases cortas, verbo primero, cifras y fechas
  exactas: "Vence el 15 de octubre", no "pronto vence".
- Cada afirmación jurídica lleva su fuente en estilo `cite`:
  "DOF 02/10/2026 · Art. 15". Sin fuente, no hay alerta.
- "Revisa con tu abogado" va en la acción, nunca en lugar del dato.
- **Ojo:** es la única palabra de alarma, y solo en alertas de Riesgo.
  Sin signos de exclamación, sin emojis, sin mayúsculas sostenidas.
- Títulos en minúscula después de la primera palabra (sentence case).
- Botones con verbo: "Asignar responsable", "Ver artículo",
  "Marcar como cumplido".
- Evita: "revolucionario", "potenciado por IA", "solución integral" y
  anglicismos innecesarios ("plazo", no "deadline"; "alerta", no
  "notification").

## Regla de oro: solo tokens

Nunca escribas colores en hex, `rgb()` ni clases arbitrarias como
`bg-[#1C2B4A]` o `text-emerald-700`. Usa siempre el token por nombre. El tema
Oscuro (`.dark`) cambia los valores sin cambiar los nombres.

| Token | Utilidad Tailwind | Claro | Oscuro | Uso |
|---|---|---|---|---|
| `surface` | `bg-surface` | #f6f1e8 | #0b1620 | Papel. Fondo de página. |
| `surface-raised` | `bg-surface-raised` | #fffcf6 | #122130 | Cal. Tarjetas, alertas, inputs, menús. |
| `surface-sunken` | `bg-surface-sunken` | #ebe3d4 | #08111a | Adobe. Pozos, encabezados de tabla, chips de cita. |
| `ink` | `text-ink` | #0d2132 | #f3eee3 | Tinta. Texto y títulos; contorno secundario y foco. |
| `ink-muted` | `text-ink-muted` | #4f5d6b | #a7b3bf | Piedra. Texto secundario, captions, metadatos. |
| `border` | `border-border` | #d8cebb | #263848 | Hilo. Líneas decorativas, bordes de tarjeta. |
| `border-strong` | `border-border-strong` | #7b8794 | #6d7c8b | Contorno de inputs y checkboxes (3:1). |
| `brand` | `bg-brand` | #d4006d | #ff5ca5 | Rosa. Botón primario, logo, una cifra destacada por pantalla. |
| `on-brand` | `text-on-brand` | #ffffff | #2a0016 | Texto sobre `brand`. |
| `brand-text` | `text-brand-text` | #c2005f | #ff7db8 | Rosa como texto: enlaces y énfasis. |
| `brand-tint` | `bg-brand-tint` | #fbe3ee | #3a1428 | Fondo rosa suave: avisos informativos, filas seleccionadas. |
| `ok` | `text-ok` | #1b6b47 | #4cc38a | Nopal. Al día / cumplido. |
| `ok-tint` | `bg-ok-tint` | #ddefe4 | #12372a | Fondo de Al día. |
| `warn` | `bg-warn` | #f2a100 | #f2a100 | Cempasúchil. Relleno de chips de plazo, con `on-warn`. |
| `on-warn` | `text-on-warn` | #0d2132 | #0b1620 | Texto sobre `warn`. |
| `warn-text` | `text-warn-text` | #7a4700 | #f6b73c | Atención como texto o ícono. |
| `warn-tint` | `bg-warn-tint` | #fcebc8 | #3a2a07 | Fondo de Atención. |
| `risk` | `text-risk` | #b42318 | #ff8a7a | Ladrillo. Riesgo / vencido. |
| `risk-tint` | `bg-risk-tint` | #fbe2de | #3d1713 | Fondo de Riesgo. |

Notas:

- **Rosa es el único acento de marca** y ocupa menos del 10% del área.
  Rosa nunca significa error ni se usa para texto de cuerpo.
- Los estados llevan siempre **palabra e ícono**; el color nunca va solo.
- `warn` como ícono suelto sobre `surface` claro no cumple contraste: usa
  `warn-text`.
- Los alias de shadcn (`bg-background`, `bg-card`, `text-muted-foreground`,
  `bg-primary`, `text-destructive`…) apuntan a estos tokens, así que los
  componentes de `components/ui` siguen funcionando. En código nuevo
  prefiere los nombres de marca.
- `--mia-*` y `--paulsen-*` son colores de despacho (tenant), no de marca.

## Tipografía

Tres familias, cargadas en `app/layout.tsx` con `next/font`:

- **Fraunces 600** (`font-display`): solo titulares y cifras grandes, nunca
  cuerpo ni por debajo de 22px.
- **Instrument Sans** (`font-sans`): interfaz y cuerpo.
- **IBM Plex Mono** (`font-mono`): lo que un abogado copiará (citas, folios,
  fechas límite).

Usa la escala; cada utilidad fija familia, tamaño, interlineado, peso y
tracking. No los ajustes a mano.

| Utilidad | Familia | Tamaño / interlineado | Peso | Uso |
|---|---|---|---|---|
| `text-display-xl` | Fraunces | 72 / 0.95, -0.02em | 600 | Titular de portada, uno por página. |
| `text-display-lg` | Fraunces | 48 / 1, -0.015em | 600 | Aperturas de sección y cifras grandes. |
| `text-display-md` | Fraunces | 32 / 1.1, -0.01em | 600 | Títulos de página dentro del producto. |
| `text-heading` | Instrument Sans | 22 / 1.25 | 600 | Títulos de tarjeta y alerta. |
| `text-body-lg` | Instrument Sans | 18 / 1.5 | 400 | Párrafos de entrada, onboarding. |
| `text-body` | Instrument Sans | 16 / 1.5 | 400 | Cuerpo y formularios (por defecto). |
| `text-body-sm` | Instrument Sans | 14 / 1.45 | 400 | Celdas, ayuda; botones con `font-medium`. |
| `text-label` | Instrument Sans | 13 / 1.2, +0.02em | 500 | Etiquetas de campo y tags. |
| `text-caption` | Instrument Sans | 12 / 1.35 | 400 | Fechas y notas; siempre con `text-ink-muted`. |
| `text-cite` | IBM Plex Mono | 13 / 1.5 | 500 | Citas de fuente sobre chip `surface-sunken`. |
| `text-data` | IBM Plex Mono | 14 / 1.5 | 400 | Folios, fechas límite. |

Alinea a la izquierda. No mezcles más de dos familias en un mismo bloque.
`cn()` (en `lib/utils.ts`) reconoce esta escala, así que
`cn('text-body-sm', 'text-ink-muted')` conserva tamaño y color.

## Espacio, forma y foco

La escala de espacio coincide con la de Tailwind (1 = 4px):

| Token | Valor | Tailwind | Uso |
|---|---|---|---|
| `space-1` | 4px | `1` | Ícono a etiqueta. |
| `space-2` | 8px | `2` | Huecos dentro de controles y tags. |
| `space-3` | 12px | `3` | Relleno vertical de botón, huecos de lista. |
| `space-4` | 16px | `4` | Hueco por defecto, relleno de tarjeta en móvil. |
| `space-6` | 24px | `6` | Relleno de tarjeta, separación de campos. |
| `space-8` | 32px | `8` | Huecos entre secciones. |
| `space-12` | 48px | `12` | Márgenes de página. |
| `space-16` | 64px | `16` | Huecos grandes de sección. |
| `space-24` | 96px | `24` | Módulo del mosaico, hero. |

Usa solo esos pasos (`p-6`, `gap-8`…); evita 5, 7, 10, 14 y valores
arbitrarios. Prefiere aire a densidad.

Radios: `rounded-sm` (4px, chips de cita), `rounded-md` (8px, botones,
inputs, menús), `rounded-lg` (16px, tarjetas y paneles), `rounded-pill`
(etiquetas de estado). `rounded-xl` equivale a `rounded-lg`.

- **Bordes, no sombras.** Tarjetas en `bg-surface-raised` con `border
  border-border` y `rounded-lg`. No uses `shadow-*`.
- Sin degradados, sin glassmorphism, sin tarjetas con filo de color en el
  costado: el estado va en la etiqueta.
- **Foco:** contorno sólido de 2px en `ink` con 2px de separación
  (`focus-visible:outline-2 focus-visible:outline-offset-2
  focus-visible:outline-ink`). Ya está como regla base; nunca lo quites con
  `outline-none` sin reponerlo.
- Íconos: Lucide, trazo lineal, 24px (14px en etiquetas), en `ink` o en el
  color del estado. No mezcles sets ni uses emojis.

## Componentes

Usa los componentes de `components/ui` antes de escribir estilos propios.

### Botón (`components/ui/button.tsx`)

- `default`: primario rosa (`brand` + `on-brand`); hover a `ink` con texto
  `surface`. **Una sola acción primaria por vista.**
- `outline` / `secondary`: contorno `ink`; hover `surface-sunken`.
- `ghost`: sin contorno, para acciones terciarias.
- `link`: texto `brand-text`, subrayado al pasar.
- `destructive`: contorno y texto `risk`. Nunca rosa para destruir; confirma
  con un diálogo.
- Deshabilitado: `surface-sunken` + `ink-muted` + `border`. Explica el porqué
  en texto cercano, no en un tooltip.
- Etiquetas con verbo. No pongas dos primarios juntos.

### Etiqueta de estado (`components/ui/status-tag.tsx`)

`<StatusTag status="risk|warn|ok|info" />` muestra Riesgo, Atención, Al día
o Informativo con su ícono. Una etiqueta por alerta; no apiles estados.
Riesgo solo para plazos vencidos o por vencer y multas posibles.

- `<DeadlineChip>Vence en 5 días</DeadlineChip>`: solo junto a Riesgo o
  Atención.
- `<Cite>DOF 02/10/2026 · Art. 15</Cite>`: fuente en mono sobre
  `surface-sunken`.

`Badge` tiene las mismas variantes (`risk`, `warn`, `ok`, `info`,
`deadline`) para casos sin ícono fijo; agrega tú el ícono.

### Alerta regulatoria (`components/regulatory/regulatory-alert.tsx`)

El objeto central del producto. Estructura fija: etiqueta de estado y cita;
título en `text-heading`; una frase de consecuencia en `text-body`; pie con el
plazo a la izquierda y las acciones (secundaria "Ver artículo" y primaria con
verbo) a la derecha. Solo en Riesgo el cuerpo abre con **Ojo:**. Sin `source`
no se renderiza. Las obligaciones al día se muestran como fila compacta:
etiqueta Al día, nombre y hora de la última verificación en `text-caption`.

### Tarjeta, inputs y avisos

- `Card`: `surface-raised`, `border`, `rounded-lg`, sin sombra; `CardTitle`
  en `text-heading`.
- `Input`, `Textarea`, `Select`: `border-strong`, `rounded-md`, foco `ink`.
- `Label`: `text-label`.
- `Alert`: variantes `default`, `info`, `warn`, `ok`, `destructive`.

## Logo y mosaico

- Logotipo "otero" en Fraunces 600 con un punto cuadrado rosa; símbolo: una
  baldosa crema con un cuadrado rosa al centro. Mínimo 72px el logotipo y 16px
  el símbolo. Sobre fondo oscuro, la variante inversa. No girar, recolorear,
  redondear el cuadrado, poner sobre rosa ni añadir sombras.
- Imagen de marca: el **mosaico Otero**, módulos cuadrados de 96px con cuartos
  de círculo en `ink`, `brand`, `warn`, `ok` y `border`. Máximo un tercio de
  la pieza, sangra por un borde, nunca con texto encima. Nada de fotos de
  stock de oficinas, balanzas ni martillos.

## Checklist antes de abrir un cambio de UI

- [ ] Ningún hex, `rgb()`, `bg-[#…]` ni color de la paleta por defecto de
      Tailwind (`emerald-*`, `amber-*`, `red-*`…).
- [ ] Tipografía con la escala (`text-heading`, `text-body`…), no tamaños
      sueltos.
- [ ] Espacios en pasos de la escala; radios `sm`/`md`/`lg`/`pill`.
- [ ] Sin sombras ni degradados.
- [ ] Máximo un botón primario rosa por vista; acciones con verbo.
- [ ] Estados con palabra + ícono; alertas con cita de fuente.
- [ ] Textos en español de México, de tú, sin exclamaciones ni emojis.

## Migración pendiente

Varias pantallas existentes aún tienen colores escritos a mano (sobre todo
`#1C2B4A`, `#2D5A3D`, `#16A34A`, `#D97706`, `#DC2626` y `#c42a6d` en
`app/admin` y `app/cliente`) y reglas con hex en `app/otero.css`. Al tocar uno
de esos archivos, cambia los colores que modifiques por su token. Para
encontrarlos:

```bash
grep -rnE '\[#[0-9a-fA-F]{3,8}\]|(emerald|amber|red|green|slate|gray)-[0-9]{2,3}' app components
```
