# Balanced Scorecard (BSC) — TechPeru SAC 2025
## Sistema Web Interactivo de Gestión Estratégica y Cuadro de Mando Integral

Prototipo funcional corporativo de **Balanced Scorecard (BSC)** desarrollado con base en la estructura y datos oficiales de `BSC_TechPeru_Ampliado_2025.xlsx`.

---

## 🚀 Cómo Ejecutar la Aplicación

1. **Apertura Directa en Navegador (Recomendada):**
   - Haz doble clic en [`index.html`](file:///c:/Users/ASUS/Downloads/BSC_Prototipo_Interactivo-v3/BSC_Prototipo/index.html) para abrirlo con Chrome, Edge, Firefox o Safari.
   - Funciona 100% de manera autónoma y local (sin compiladores ni dependencias externas obligatorias).

2. **Opcional — Servidor Local HTTP:**
   - Si deseas servirlo mediante HTTP:
     ```bash
     npx http-server ./ -p 3000
     ```
   - Abre `http://localhost:3000` en tu navegador.

---

## 🔑 Credenciales de Demostración

| Rol | Usuario / Correo | Contraseña | Perfil / Titular |
|---|---|---|---|
| **Administrador** | `admin@techperu.pe` | `admin123` | Lic. Carlos Mendoza (Director General & Estrategia) |
| **Gerente Comercial** | `gerente@techperu.pe` | `admin123` | Ing. Patricia Vargas (Gerente Comercial & Marketing) |
| **Gerente de Operaciones** | `operaciones@techperu.pe` | `admin123` | Ing. Fernando Soto (Gerente de Operaciones & TI) |
| **Gerente de RRHH** | `rrhh@techperu.pe` | `admin123` | Mg. Andrea Rivas (Gerente de Talento Humano) |
| **Analista BSC** | `analista@techperu.pe` | `admin123` | Control de Gestión y Auditoría Estratégica |

*(Nota: En la pantalla de inicio de sesión dispones de botones de acceso rápido de **1 Clic** para cada perfil).*

---

## 📊 Arquitectura de Datos Oficial (TechPeru SAC 2025)

- **Organización:** TechPeru SAC (RUC: 20549281901)
- **Ejercicio Evaluado:** 2025
- **Cumplimiento Global Ponderado:** **84.2%** (Estado: **⚠️ EN RIESGO**)
- **Las 4 Perspectivas del BSC:**
  1. **Perspectiva Financiera (87.8%):** 3 objetivos (`OBJ-F1` a `OBJ-F3`), 9 KPIs.
  2. **Perspectiva del Cliente (86.0%):** 3 objetivos (`OBJ-C1` a `OBJ-C3`), 9 KPIs.
  3. **Perspectiva de Procesos Internos (79.4%):** 3 objetivos (`OBJ-P1` a `OBJ-P3`), 9 KPIs.
  4. **Perspectiva de Aprendizaje y Crecimiento (83.8%):** 3 objetivos (`OBJ-A1` a `OBJ-A3`), 9 KPIs.
- **Distribución Semafórica:**
  - ✅ **Logrado (≥ 90%):** 11 KPIs (30.6%)
  - ⚠️ **En Riesgo (75% a 89.9%):** 19 KPIs (52.8%)
  - ❌ **Crítico (< 75%):** 6 KPIs (16.7%)

### Los 6 Indicadores en Estado Crítico (Atención Inmediata)
1. **N° Incidencias con Proveedores:** 62.5% (Real: 8 vs. Meta: 5, Inverso)
2. **Ideas Implementadas de Empleados:** 66.7% (Real: 16 vs. Meta: 24, Directo)
3. **Churn Rate (Tasa de Abandono):** 69.4% (Real: 7.2% vs. Meta: 5.0%, Inverso)
4. **Tiempo de Resolución de Quejas:** 71.4% (Real: 2.8 días vs. Meta: 2.0 días, Inverso)
5. **Tasa de Defectos / Reclamos:** 71.4% (Real: 2.8% vs. Meta: 2.0%, Inverso)
6. **% Ingresos de Productos < 2 años:** 72.0% (Real: 18.0% vs. Meta: 25.0%, Directo)

---

## 🧮 Lógica de Negocio y Fórmulas de Cumplimiento

- **KPIs Directos (Mayor es mejor):**
  $$\% \text{Cumplimiento} = \left(\frac{\text{Real}}{\text{Meta}}\right) \times 100$$
- **KPIs Inversos (Menor es mejor — ej: Churn, Costos, Incidentes, Tiempos, Defectos):**
  $$\% \text{Cumplimiento} = \left(\frac{\text{Meta}}{\text{Real}}\right) \times 100$$
- **Cumplimiento por Objetivo:** Promedio aritmético de sus 3 KPIs asociados.
- **Cumplimiento por Perspectiva:** Promedio de los KPIs pertenecientes a la perspectiva.
- **Cumplimiento Global del BSC:** Promedio ponderado de las 4 perspectivas según su peso configurado (25% cada una por defecto).
- **Persistencia Reactiva:** Todo cambio o simulación se guarda automáticamente en `localStorage` (`bsc_techperu_sac_2025`).

---

## 🖥️ Módulos Conectados del Sistema

1. **Módulo 1: Inicio de Sesión:** Autenticación simulada corporativa, selector de roles y botones de prueba en 1 clic.
2. **Módulo 2: Dashboard Ejecutivo:** Tarjetas resumen, gráficos dinámicos (Chart.js), desglose por perspectiva y tabla de atención inmediata de KPIs críticos.
3. **Módulo 3: Mapa Estratégico Interactivo:** Visualización vertical causa-efecto Kaplan & Norton (Aprendizaje $\rightarrow$ Procesos $\rightarrow$ Clientes $\rightarrow$ Financiera) con nodos interactivos y modales con sus 3 KPIs y análisis.
4. **Módulo 4: Gestión de Objetivos Estratégicos:** Catálogo interactivo de los 12 objetivos con operaciones CRUD (crear, editar, eliminar con confirmación).
5. **Módulo 5: Tablero de Control de KPIs:** Gestión integral de los 36 KPIs con filtros reactivos por perspectiva, responsable, semáforo, dirección y búsqueda en tiempo real.
6. **Módulo 6: Registro de Resultados y Simulador What-If:**
   - *Registro Individual:* Selección de KPI, cálculo dinámico en vivo del nuevo porcentaje y semáforo al tipear, y guardado reactivo.
   - *Matriz What-If:* Deslizadores para los indicadores críticos, simulación simultánea y proyección inmediata del impacto en el cumplimiento global.
7. **Módulo 7: Iniciativas Estratégicas:** Portafolio de 36 proyectos y planes de acción recomendados con presupuesto en Soles (S/), avance (%) y fechas.
8. **Módulo 8: Reportes Ejecutivos:** Resumen gerencial consolidado, botón de descarga a archivo **CSV** (con codificación UTF-8 BOM) y vista optimizada para imprimir (`window.print()`).
9. **Módulo 9: Administración y Configuración:** Edición de ponderaciones por perspectiva (validación de suma 100%), directorio de usuarios y botón para restablecer datos originales.

---

## 📁 Estructura del Proyecto

```
BSC_Prototipo/
├── index.html               # Shell principal y vistas de la aplicación
├── css/
│   └── styles.css          # Sistema de diseño ERP enterprise, paleta corporativa y @media print
├── js/
│   ├── data.js             # Dataset estructurado extraído de BSC_TechPeru_Ampliado_2025.xlsx
│   └── app.js              # Lógica de cálculo reactivo, persistencia, enrutamiento y gráficos
├── excel_parsed.json       # Volcado JSON completo del modelo de datos de TechPeru SAC 2025
└── README.md               # Documentación ejecutiva y técnica del prototipo
```
