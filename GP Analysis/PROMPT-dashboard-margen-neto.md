# Generación de Tablero de Margen Neto

Actúa como un **Senior Full Stack Developer**. Necesito crear un componente de dashboard (en React con Recharts, o en HTML/JS autónomo) que procese un archivo CSV de contratistas y visualice el **Net Margin Won/Loss** (Ganancias y Pérdidas de Margen Neto) en un gráfico de barras y líneas.

---

## 1. Estructura de los Datos (CSV)

El CSV puede tener distintas variantes. Columnas relevantes:

- **Candidate Name** / **First Name** + **Last Name**: Identificación del contratista (usar como clave para deduplicar y agrupar filas del mismo candidato).
- **Company**: Empresa cliente (ej: "Fanatics Live", "Ryz Labs", "Hiptrain", "Offsiteio"). Usar para filtrar talento interno.
- **Rate**: Monto que cobramos al cliente (ej: "$9,500.00" o "$9,500.00/monthly").
- **Actual Cost**: Lo que se paga al contratista (ej: "$7,000.00").
- **Rate Type**: Tipo de tarifa (ej: "Monthly", "Hourly", "MonthlyHourly", "WeeklyHourly").
- **Start Date**: Fecha de inicio del contrato (formato ej: "Jan 6, 2025").
- **End Date**: Fecha de finalización (puede estar vacía o "N/A" si sigue activo).
- **Status** / **Status Tag** (si existe): "Onboarded", "Offboarded", "Salary Updated", etc.
- **Record Date** (si existe): Fecha del cambio o actualización.

**Limpieza de datos**: Antes de calcular, limpiar strings de moneda (quitar `$`, `,` y sufijos como `/monthly`) y convertir a números. Parsear fechas en formatos como "Jan 6, 2025" o "01/06/2025".

---

## 2. Exclusiones Previas al Cálculo

- **Horas**: Excluir filas donde **Rate Type** sea `Hourly`, `MonthlyHourly` o `WeeklyHourly` (solo considerar contratos mensuales para el margen).
- **Opcional – Talento interno**: Ofrecer un filtro (checkbox) para **excluir** contratistas cuyo **Company** sea **Ryz Labs**, **Hiptrain** o **Offsiteio**. Si no se excluyen, se aplica la regla de “interno = pérdida” (ver más abajo).

---

## 3. Lógica de Cálculo de Margen

**Margen por fila** = `Rate - Actual Cost` (valores mensuales; si Rate/Cost son por hora, no incluir o convertir según convención).

Se trabaja por **mes** (año-mes). Para cada candidato se consideran **todas sus filas** (no solo una) para construir una línea de tiempo y calcular ganancias/pérdidas por mes.

### 3.1 “Activo” en un mes

Un contrato (fila) está **activo en el mes M** si:

- **Start Date** es en o antes del último día del mes M (ej: cualquier start en enero → activo en enero).
- Y **no hay End Date**, o el **End Date** es **después** del último día del mes M.

Si el **End Date** cae **en** el mes M (cualquier día de ese mes), el contratista **no** está activo en M y la **pérdida** se reconoce **en el mes M**.

- **Onboarding**: Si el **Start Date** es en el mes M (1º o cualquier día del mes), el margen se reconoce **en el mes M** (Margin Gain).
- **Offboarding**: Si el **End Date** está en el mes M, la **Margin Loss** se reconoce **en el mes M**.

### 3.2 Regla de Entrada (Onboarding)

En el mes del **Start Date**, registrar una **Margin Gain** igual al margen de esa fila (solo para contratistas no internos; ver 3.4).

### 3.3 Regla de Salida (Offboarding)

Si existe **End Date** en el mes M, registrar una **Margin Loss** en el mes M por el margen que se deja de percibir (valor de la fila que estaba vigente hasta ese momento).

### 3.4 Regla de Actualización (Salary Updated / múltiples filas por candidato)

Para candidatos con **varias filas** (mismo candidato, distintas Rate/Actual Cost en el tiempo):

- Calcular el **margen efectivo** del candidato en cada mes (usar la fila vigente en ese mes según Start/End).
- Calcular el **cambio de margen** mes a mes: `delta = margen(mes actual) - margen(mes anterior)`.
  - Si **delta > 0**: registrar la diferencia como **Gain** en el mes actual.
  - Si **delta < 0**: registrar la diferencia como **Loss** en el mes actual.
  - Si **delta = 0** (ej: subió Rate y Cost lo mismo): **no** registrar cambio en ese mes.

### 3.5 Talento interno (Ryz Labs, Hiptrain, Offsiteio)

Si el sistema **no** excluye por checkbox a estos clientes:

Para internos no se usa **margen** (Rate − Actual Cost), sino el **Rate** (monto mensual) como base del impacto:

- **Onboarding**: En el mes del **Start Date**, registrar una **Margin Loss** igual al **Rate** de esa fila (ej: $2,400 en oct 2024).
- **Salary increase**: En el mes del cambio (ej: **Record Date** o mes en que entra la nueva fila), el Rate pasa de $2,400 a $3,000 → registrar **$600 de Margin Loss adicional** (delta = 3,000 − 2,400).
- **Salary decrease**: Si el Rate baja, registrar el **delta positivo** como **Gain** (reducción de costo interno).
- **Offboarding**: Si tienen **End Date** en el mes M, dejan de tener Rate en ese mes; el **delta negativo** (ej: −2,400) se reconoce como **Gain** (dejamos de perder ese costo).

---

## 4. Agregación por Mes

Para cada mes:

- **Margin Gain (mes)** = suma de todos los Gains del mes (deltas positivos + onboardings de no internos).
- **Margin Loss (mes)** = suma de todos los Losses del mes (deltas negativos + offboardings + para internos: Rate en onboarding y deltas de Rate en salary increase).
- **Net Margin (mes)** = **Margin Gain - Margin Loss**.

Incluir un **filtro de período** (From / To) para elegir rango de meses (ej: Jun 2025 – Dec 2025) y que el gráfico y la tabla muestren solo ese rango; los totales de resumen deben ser para el período seleccionado.

---

## 5. Requerimientos Visuales

- **Gráfico combinado** (tipo Recharts o equivalente):
  - **Barras verdes**: suma de **Margin Gains** del mes.
  - **Barras rojas**: suma de **Margin Losses** del mes (mostrar como valores negativos o en color rojo).
  - **Línea azul**: **Net Margin** del mes (Gain - Loss).

- **Tabla por mes**: columnas **Month**, **Margin gain ($)**, **Margin loss ($)**, **Net margin ($)**.

- **Tarjetas de resumen** (para el período seleccionado o todo): Total Margin Gain, Total Margin Loss, Net (Gain − Loss), Cantidad de contratistas únicos.

- **Opciones de filtro**:
  - Checkbox: “Excluir contratistas internos (Ryz Labs, Hiptrain, Offsiteio)”.
  - Selectores **From** y **To** para el rango de meses.

---

## 6. Resumen de Reglas Clave

| Evento | Cuándo | Dónde se reconoce |
|--------|--------|--------------------|
| Onboarding | Start Date en el mes M | Gain en el mes M |
| Offboarding | End Date en el mes M | Loss en el mes M |
| Salary update (margen sube) | Record Date / cambio de fila en mes M | Gain = delta en mes M |
| Salary update (margen baja) | Idem | Loss = |delta| en mes M |
| Salary update (mismo margen) | Idem | No registrar cambio |
| Interno – onboarding | Start Date en mes M | Loss = **Rate** (monto total) en mes M |
| Interno – salary increase | Mes del cambio | Loss = **delta** (nuevo Rate − anterior) en ese mes |
| Interno – offboarding | End Date en mes M | Gain = Rate que se deja de “perder” (delta negativo) |

- **Activo en mes M**: `Start ≤ último día de M` y (`End` vacío o `End > último día de M`).
- **Pérdida en mes M por offboarding**: cuando `End` cae dentro del mes M (no activo en M → delta negativo = loss en M).
