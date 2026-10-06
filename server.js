const express = require('express');
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'citas.db');

const HORARIO = {
    0: null,
    1: { open: 9 * 60, close: 19 * 60 },
    2: { open: 9 * 60, close: 19 * 60 },
    3: { open: 9 * 60, close: 19 * 60 },
    4: { open: 9 * 60, close: 19 * 60 },
    5: { open: 9 * 60, close: 19 * 60 },
    6: { open: 9 * 60, close: 14 * 60 }
};

const SLOT_MIN = 30;

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);

db.exec(`
    CREATE TABLE IF NOT EXISTS citas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        telefono TEXT NOT NULL,
        email TEXT NOT NULL,
        fecha TEXT NOT NULL,
        hora TEXT NOT NULL,
        servicio TEXT NOT NULL,
        demo INTEGER NOT NULL DEFAULT 0,
        creada_en TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(fecha, hora)
    );
`);

try {
    db.exec('ALTER TABLE citas ADD COLUMN demo INTEGER NOT NULL DEFAULT 0');
} catch (e) {
}

app.use(express.json());

function generarSlots(fechaStr) {
    const d = new Date(fechaStr + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    const h = HORARIO[d.getDay()];
    if (!h) return [];
    const slots = [];
    for (let m = h.open; m + SLOT_MIN <= h.close; m += SLOT_MIN) {
        const hh = String(Math.floor(m / 60)).padStart(2, '0');
        const mm = String(m % 60).padStart(2, '0');
        slots.push(hh + ':' + mm);
    }
    return slots;
}

function fechaLocal() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function sumarDias(base, n) {
    const d = new Date(base + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

const DEMO_DIAS = 14;
const DEMO_POR_DIA = [4, 5, 2, 6, 3, 1, 5, 4, 2, 6, 3, 1, 4, 2];
const DEMO_NOMBRES = [
    'María López', 'Carlos García', 'Laura Martínez', 'Pedro Sánchez', 'Lucía Ramírez',
    'Andrés Torres', 'Valentina Herrera', 'Diego Morales', 'Sofía Castillo', 'Mateo Fernández',
    'Camila Ortega', 'Daniel Ríos', 'Renata Vega', 'Emiliano Cruz'
];
const DEMO_SERVICIOS = ['limpieza', 'blanqueamiento', 'ortodoncia', 'tratamiento'];

function semillaDemo() {
    db.prepare('DELETE FROM citas WHERE demo = 1').run();
    const insert = db.prepare('INSERT OR IGNORE INTO citas (nombre, telefono, email, fecha, hora, servicio, demo) VALUES (?, ?, ?, ?, ?, ?, 1)');
    const hoy = fechaLocal();
    let total = 0;
    for (let i = 1; i <= DEMO_DIAS; i++) {
        const fecha = sumarDias(hoy, i);
        const slots = generarSlots(fecha);
        if (!slots || slots.length === 0) continue;
        const cantidad = Math.min(DEMO_POR_DIA[(i - 1) % DEMO_POR_DIA.length], slots.length);
        const elegidos = [];
        while (elegidos.length < cantidad) {
            const t = slots[Math.floor(Math.random() * slots.length)];
            if (!elegidos.includes(t)) elegidos.push(t);
        }
        elegidos.sort().forEach(hora => {
            const nombre = DEMO_NOMBRES[Math.floor(Math.random() * DEMO_NOMBRES.length)];
            const servicio = DEMO_SERVICIOS[Math.floor(Math.random() * DEMO_SERVICIOS.length)];
            const telefono = '55' + String(Math.floor(10000000 + Math.random() * 89999999));
            const email = nombre.split(' ')[0].toLowerCase() + Math.floor(Math.random() * 99) + '@correo.com';
            insert.run(nombre, telefono, email, fecha, hora, servicio);
        });
        total += elegidos.length;
    }
    console.log('[demo] ' + total + ' citas de prueba generadas');
}

app.get('/api/slots/:fecha', (req, res) => {
    const fecha = req.params.fecha;
    const todos = generarSlots(fecha);
    if (todos === null) {
        return res.status(400).json({ error: 'Fecha no válida.' });
    }
    const ocupadas = db.prepare('SELECT hora, servicio, nombre FROM citas WHERE fecha = ?').all(fecha);
    const ocupado = new Set(ocupadas.map(r => r.hora));
    res.json({
        fecha,
        slots: todos.filter(h => !ocupado.has(h)),
        ocupados: ocupadas.map(r => ({ hora: r.hora, servicio: r.servicio, nombre: r.demo ? r.nombre : undefined }))
    });
});

app.get('/api/citas', (req, res) => {
    const { fecha } = req.query;
    if (fecha) {
        res.json(db.prepare('SELECT id, nombre, fecha, hora, servicio, demo, creada_en FROM citas WHERE fecha = ? ORDER BY hora').all(fecha));
    } else {
        res.json(db.prepare('SELECT id, nombre, fecha, hora, servicio, demo, creada_en FROM citas ORDER BY fecha, hora').all());
    }
});

app.post('/api/citas', (req, res) => {
    const { nombre, telefono, email, fecha, hora, servicio } = req.body || {};
    if (!nombre || !telefono || !email || !servicio) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return res.status(400).json({ error: 'Fecha no válida.' });
    }
    if (fecha < fechaLocal()) {
        return res.status(400).json({ error: 'La fecha no puede ser anterior a hoy.' });
    }
    const slots = generarSlots(fecha);
    if (!slots || slots.length === 0) {
        return res.status(400).json({ error: 'No hay atención ese día. Elige otro día.' });
    }
    if (!slots.includes(hora)) {
        return res.status(400).json({ error: 'Horario no válido.' });
    }
    try {
        db.prepare('INSERT INTO citas (nombre, telefono, email, fecha, hora, servicio) VALUES (?, ?, ?, ?, ?, ?)')
            .run(nombre, telefono, email, fecha, hora, servicio);
        res.status(201).json({ ok: true });
    } catch (e) {
        if (String(e).includes('UNIQUE')) {
            return res.status(409).json({ error: 'Ese horario ya está reservado. Elige otro.' });
        }
        return res.status(500).json({ error: 'Error al guardar la cita.' });
    }
});

const OCULTOS = ['/server.js', '/package.json', '/package-lock.json', '/Dockerfile', '/docker-compose.yml', '/.dockerignore'];
app.use((req, res, next) => {
    if (OCULTOS.includes(req.path)) return res.status(404).end();
    next();
});

app.use(express.static(__dirname, { index: 'index.html' }));

if (process.env.SEED_DEMO !== '0') {
    semillaDemo();
}

app.listen(PORT, () => {
    console.log('Sonrisa Brillante corriendo en http://localhost:' + PORT);
});