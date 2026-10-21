/**
 * TechPeru SAC — Balanced Scorecard (BSC) 2025
 * Servidor Backend Real con Express y Node.js
 * Puerto: 3000
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'excel_parsed.json');
const SEED_FILE = path.join(__dirname, 'seed_backup.json');

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend (HTML, CSS, JS, imágenes)
app.use(express.static(__dirname));

// Estado en memoria respaldado en disco
let bscData = null;

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      bscData = JSON.parse(raw);
    } else if (fs.existsSync(SEED_FILE)) {
      const raw = fs.readFileSync(SEED_FILE, 'utf-8');
      bscData = JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error cargando datos iniciales:', err);
  }

  if (!bscData || !bscData.kpis) {
    console.error('No se pudo cargar la estructura de datos BSC.');
    process.exit(1);
  }

  recalculateAll();
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(bscData, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error guardando en excel_parsed.json:', err);
  }
}

// ==========================================================================
// MOTOR DE CÁLCULO BALANCED SCORECARD (KAPLAN & NORTON)
// ==========================================================================

function calculateKpiAchievement(meta, real, isInverse) {
  const m = Number(meta);
  const r = Number(real);
  if (!m || m === 0 || isNaN(r)) return 0;

  let pct = 0;
  if (isInverse) {
    // Menor es mejor: (Meta / Real) * 100
    pct = (m / r) * 100;
  } else {
    // Mayor es mejor: (Real / Meta) * 100
    pct = (r / m) * 100;
  }

  return Math.round(pct * 10) / 10;
}

function getStatusFromAchievement(pct) {
  if (pct >= 90) return 'LOGRADO';
  if (pct >= 75) return 'RIESGO';
  return 'CRITICO';
}

function recalculateAll() {
  if (!bscData) return;

  // 1. Recalcular cada uno de los 36 KPIs
  bscData.kpis.forEach(kpi => {
    kpi.achievement = calculateKpiAchievement(kpi.meta, kpi.real, kpi.isInverse);
    kpi.status = getStatusFromAchievement(kpi.achievement);
  });

  // 2. Recalcular cada Objetivo Estratégico (12 Objetivos)
  bscData.objectives.forEach(obj => {
    const objKpis = bscData.kpis.filter(k => k.objectiveId === obj.id);
    if (objKpis.length > 0) {
      const sum = objKpis.reduce((acc, k) => acc + k.achievement, 0);
      obj.achievement = Math.round((sum / objKpis.length) * 10) / 10;
      obj.status = getStatusFromAchievement(obj.achievement);
      obj.kpiCount = objKpis.length;
    } else {
      obj.achievement = 0;
      obj.status = 'CRITICO';
    }
  });

  // 3. Recalcular cada una de las 4 Perspectivas
  bscData.perspectives.forEach(p => {
    const pKpis = bscData.kpis.filter(k => k.perspectiveId === p.id);
    if (pKpis.length > 0) {
      const sum = pKpis.reduce((acc, k) => acc + k.achievement, 0);
      p.achievement = Math.round((sum / pKpis.length) * 10) / 10;
      p.status = getStatusFromAchievement(p.achievement);
    } else {
      p.achievement = 0;
      p.status = 'CRITICO';
    }
  });

  // 4. Recalcular Cumplimiento Global Ponderado
  const totalWeight = bscData.perspectives.reduce((acc, p) => acc + (p.weight || 25), 0);
  const weightedSum = bscData.perspectives.reduce((acc, p) => acc + (p.achievement * (p.weight || 25)), 0);
  bscData.globalAchievement = Math.round((weightedSum / (totalWeight || 100)) * 10) / 10;
  bscData.globalStatus = getStatusFromAchievement(bscData.globalAchievement);
}

// Cargar y estructurar datos en el arranque
loadData();

// ==========================================================================
// ENDPOINTS DE LA API REST
// ==========================================================================

/**
 * GET /api/dashboard
 * Retorna el resumen global, contadores y semáforos ejecutivos
 */
app.get('/api/dashboard', (req, res) => {
  recalculateAll();

  const logrados = bscData.kpis.filter(k => k.status === 'LOGRADO').length;
  const riesgo = bscData.kpis.filter(k => k.status === 'RIESGO').length;
  const criticos = bscData.kpis.filter(k => k.status === 'CRITICO').length;

  const criticalKpis = bscData.kpis
    .filter(k => k.status === 'CRITICO')
    .sort((a, b) => a.achievement - b.achievement);

  res.json({
    company: bscData.company,
    globalAchievement: bscData.globalAchievement,
    globalStatus: bscData.globalStatus,
    totalObjectives: bscData.objectives.length,
    totalKpis: bscData.kpis.length,
    counts: {
      logrado: logrados,
      riesgo: riesgo,
      critico: criticos
    },
    perspectives: bscData.perspectives,
    criticalKpis: criticalKpis
  });
});

/**
 * GET /api/objetivos
 * Retorna la lista de los 12 objetivos estratégicos
 */
app.get('/api/objetivos', (req, res) => {
  recalculateAll();
  const { perspectiva } = req.query;
  let result = bscData.objectives;
  if (perspectiva && perspectiva !== 'TODAS') {
    result = result.filter(o => o.perspectiveId === perspectiva || o.perspectiveKey === perspectiva);
  }
  res.json(result);
});

/**
 * GET /api/kpis
 * Retorna los 36 KPIs con sus metas, valores reales y estados
 */
app.get('/api/kpis', (req, res) => {
  recalculateAll();
  const { perspectiva, estado, responsable, direccion, search } = req.query;
  let result = bscData.kpis;

  if (perspectiva && perspectiva !== 'TODAS') {
    result = result.filter(k => k.perspectiveId === perspectiva || k.perspectiveKey === perspectiva);
  }
  if (estado && estado !== 'TODOS') {
    result = result.filter(k => k.status === estado);
  }
  if (responsable && responsable !== 'TODOS') {
    result = result.filter(k => k.responsible.includes(responsable));
  }
  if (direccion && direccion !== 'TODOS') {
    result = result.filter(k => direccion === 'inverse' ? k.isInverse : !k.isInverse);
  }
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(k => 
      k.name.toLowerCase().includes(q) ||
      k.id.toLowerCase().includes(q) ||
      k.objectiveId.toLowerCase().includes(q) ||
      (k.analysis && k.analysis.toLowerCase().includes(q))
    );
  }

  res.json(result);
});

/**
 * POST /api/mediciones
 * Recibe el id del KPI y el nuevo valor real, recalcula en el servidor y persiste los cambios
 * Body: { id: "KPI-12", value: 2.0 } o { kpiId: "KPI-12", value: 2.0 }
 */
app.post('/api/mediciones', (req, res) => {
  const kpiId = req.body.id || req.body.kpiId;
  const newValue = req.body.value !== undefined ? req.body.value : req.body.real;

  if (!kpiId) {
    return res.status(400).json({ error: 'Falta el id del KPI (id o kpiId)' });
  }

  const numericValue = Number(newValue);
  if (isNaN(numericValue) || numericValue < 0) {
    return res.status(400).json({ error: 'El valor de la medición debe ser un número válido mayor o igual a 0' });
  }

  const kpi = bscData.kpis.find(k => k.id === kpiId || k.code === kpiId);
  if (!kpi) {
    return res.status(404).json({ error: `No se encontró el indicador con ID: ${kpiId}` });
  }

  const previousReal = kpi.real;
  const previousAchievement = kpi.achievement;

  // Actualizar valor real
  kpi.real = numericValue;

  // Recalcular en cascada
  recalculateAll();

  // Guardar en almacenamiento persistente
  saveData();

  console.log(`[POST /api/mediciones] KPI ${kpi.id} actualizado: ${previousReal} -> ${kpi.real} (${previousAchievement}% -> ${kpi.achievement}%)`);

  res.json({
    success: true,
    message: `Medición registrada con éxito para [${kpi.id}] ${kpi.name}`,
    kpi: kpi,
    dashboard: {
      globalAchievement: bscData.globalAchievement,
      globalStatus: bscData.globalStatus,
      perspectives: bscData.perspectives
    }
  });
});

/**
 * POST /api/reset
 * Restablece los valores originales de TechPeru 2025 desde el respaldo oficial
 */
app.post('/api/reset', (req, res) => {
  try {
    if (fs.existsSync(SEED_FILE)) {
      const raw = fs.readFileSync(SEED_FILE, 'utf-8');
      bscData = JSON.parse(raw);
    } else {
      // Re-generar desde copia
      loadData();
    }

    recalculateAll();
    saveData();

    console.log('[POST /api/reset] Se restablecieron los datos originales de TechPeru SAC 2025.');

    res.json({
      success: true,
      message: 'Datos oficiales de TechPeru SAC 2025 restablecidos correctamente.',
      globalAchievement: bscData.globalAchievement,
      globalStatus: bscData.globalStatus,
      totalKpis: bscData.kpis.length
    });
  } catch (err) {
    console.error('Error al restablecer datos:', err);
    res.status(500).json({ error: 'No se pudo restablecer los datos originales.' });
  }
});

// ==========================================================================
// ENDPOINTS AUXILIARES PARA SOPORTAR TODOS LOS MÓDULOS
// ==========================================================================

/**
 * GET /api/perspectivas
 */
app.get('/api/perspectivas', (req, res) => {
  recalculateAll();
  res.json(bscData.perspectives);
});

/**
 * POST /api/ponderaciones
 * Actualiza los pesos de las 4 perspectivas (debe sumar 100%)
 */
app.post('/api/ponderaciones', (req, res) => {
  const { weights } = req.body; // { FIN: 25, CLI: 25, PROC: 25, APR: 25 }
  if (!weights || typeof weights !== 'object') {
    return res.status(400).json({ error: 'Formato de ponderaciones inválido' });
  }

  let sum = 0;
  bscData.perspectives.forEach(p => {
    if (weights[p.id] !== undefined) {
      p.weight = Number(weights[p.id]);
    }
    sum += p.weight;
  });

  if (Math.round(sum) !== 100) {
    return res.status(400).json({ error: `La suma de ponderaciones debe ser 100% (suma actual: ${sum}%)` });
  }

  recalculateAll();
  saveData();

  res.json({
    success: true,
    message: 'Ponderaciones actualizadas correctamente',
    perspectives: bscData.perspectives,
    globalAchievement: bscData.globalAchievement
  });
});

/**
 * GET /api/iniciativas
 */
app.get('/api/iniciativas', (req, res) => {
  res.json(bscData.initiatives || []);
});

/**
 * POST /api/iniciativas
 */
app.post('/api/iniciativas', (req, res) => {
  const newIni = req.body;
  if (!newIni.name) {
    return res.status(400).json({ error: 'El nombre de la iniciativa es obligatorio' });
  }

  if (!newIni.id) {
    newIni.id = `INI-${String((bscData.initiatives?.length || 0) + 1).padStart(2, '0')}`;
  }

  bscData.initiatives = bscData.initiatives || [];
  bscData.initiatives.push(newIni);
  saveData();

  res.status(201).json({ success: true, initiative: newIni });
});

/**
 * POST /api/objetivos
 */
app.post('/api/objetivos', (req, res) => {
  const { id, name, perspectiveId, owner, description } = req.body;
  if (!id || !name || !perspectiveId) {
    return res.status(400).json({ error: 'Faltan campos obligatorios (id, name, perspectiveId)' });
  }

  const p = bscData.perspectives.find(item => item.id === perspectiveId);
  const newObj = {
    id: id.toUpperCase(),
    code: id.toUpperCase(),
    name,
    perspectiveId,
    perspectiveKey: p ? p.key : 'fin',
    owner: owner || 'Dirección',
    description: description || '',
    weight: 33.3,
    kpiCount: 0,
    achievement: 100,
    status: 'LOGRADO'
  };

  bscData.objectives.push(newObj);
  recalculateAll();
  saveData();

  res.status(201).json({ success: true, objective: newObj });
});

/**
 * PUT /api/objetivos/:id
 */
app.put('/api/objetivos/:id', (req, res) => {
  const { id } = req.params;
  const obj = bscData.objectives.find(o => o.id === id);
  if (!obj) {
    return res.status(404).json({ error: 'Objetivo no encontrado' });
  }

  if (req.body.name) obj.name = req.body.name;
  if (req.body.owner) obj.owner = req.body.owner;
  if (req.body.description !== undefined) obj.description = req.body.description;

  recalculateAll();
  saveData();

  res.json({ success: true, objective: obj });
});

/**
 * DELETE /api/objetivos/:id
 */
app.delete('/api/objetivos/:id', (req, res) => {
  const { id } = req.params;
  const initialLen = bscData.objectives.length;
  bscData.objectives = bscData.objectives.filter(o => o.id !== id);

  if (bscData.objectives.length === initialLen) {
    return res.status(404).json({ error: 'Objetivo no encontrado' });
  }

  recalculateAll();
  saveData();

  res.json({ success: true, message: `Objetivo ${id} eliminado correctamente` });
});

/**
 * POST /api/kpis
 */
app.post('/api/kpis', (req, res) => {
  const { name, objectiveId, unit, meta, real, isInverse, analysis } = req.body;
  if (!name || isNaN(meta) || isNaN(real)) {
    return res.status(400).json({ error: 'Datos de KPI incompletos o inválidos' });
  }

  const obj = bscData.objectives.find(o => o.id === objectiveId);
  const newId = `KPI-${String(bscData.kpis.length + 1).padStart(2, '0')}`;
  const ach = calculateKpiAchievement(meta, real, Boolean(isInverse));

  const newKpi = {
    id: newId,
    code: newId,
    name,
    perspectiveId: obj ? obj.perspectiveId : 'FIN',
    perspectiveKey: obj ? obj.perspectiveKey : 'fin',
    objectiveId: objectiveId || 'OBJ-F1',
    objectiveName: obj ? obj.name : '',
    unit: unit || '',
    meta: Number(meta),
    real: Number(real),
    isInverse: Boolean(isInverse),
    achievement: ach,
    status: getStatusFromAchievement(ach),
    analysis: analysis || '',
    responsible: obj ? obj.owner : 'Dirección General'
  };

  bscData.kpis.push(newKpi);
  recalculateAll();
  saveData();

  res.status(201).json({ success: true, kpi: newKpi });
});

/**
 * GET /api/usuarios
 */
app.get('/api/usuarios', (req, res) => {
  res.json(bscData.users || []);
});

// Fallback para SPA en cualquier ruta no API (compatible con Express 5)
app.use((req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    res.status(404).json({ error: 'Endpoint no encontrado' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Servidor BSC TechPeru SAC 2025 activo en el puerto ${PORT}`);
  console.log(`📍 Acceso Web: http://localhost:${PORT}`);
  console.log(`📊 Endpoints API REST disponibles:`);
  console.log(`   - GET  /api/dashboard`);
  console.log(`   - GET  /api/objetivos`);
  console.log(`   - GET  /api/kpis`);
  console.log(`   - POST /api/mediciones`);
  console.log(`   - POST /api/reset`);
  console.log(`   - GET  /api/perspectivas`);
  console.log(`   - GET  /api/iniciativas`);
  console.log(`=======================================================`);
});

module.exports = app;
