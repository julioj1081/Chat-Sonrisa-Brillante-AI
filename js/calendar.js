const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const SERVICIOS = {
    limpieza: 'Limpieza Dental',
    blanqueamiento: 'Blanqueamiento',
    ortodoncia: 'Ortodoncia',
    tratamiento: 'Tratamiento General',
    otro: 'Otro'
};

const daysGrid = document.getElementById('daysGrid');
const weekdaysEl = document.getElementById('weekdays');
const monthYearEl = document.getElementById('monthYear');
const panelDateEl = document.getElementById('panelDate');
const dayListEl = document.getElementById('dayList');

let citas = [];
let viewedYear = 0;
let viewedMonth = 0;
let selectedDate = null;

function formatoFecha(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function parsearFecha(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function esHoy(fecha) {
    return fecha === formatoFecha(new Date());
}

function tituloDeMes() {
    const t = MESES[viewedMonth];
    return t.charAt(0).toUpperCase() + t.slice(1) + ' ' + viewedYear;
}

function citasDe(fecha) {
    return citas.filter(c => c.fecha === fecha).sort((a, b) => a.hora.localeCompare(b.hora));
}

function renderCabecera() {
    monthYearEl.textContent = tituloDeMes();
    weekdaysEl.textContent = '';
    WEEKDAYS_SHORT.forEach(d => {
        const div = document.createElement('div');
        div.className = 'weekday';
        div.textContent = d;
        weekdaysEl.appendChild(div);
    });
}

function crearCelda(dia, fecha, fueraDeMes) {
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    if (fueraDeMes) cell.classList.add('other-month');
    if (fecha === selectedDate) cell.classList.add('selected');
    if (esHoy(fecha)) cell.classList.add('today');

    const num = document.createElement('span');
    num.className = 'day-num';
    num.textContent = dia;
    cell.appendChild(num);

    const delDia = citasDe(fecha);
    if (delDia.length > 0) {
        cell.classList.add('has-citas');
        const chips = document.createElement('div');
        chips.className = 'day-chips';
        delDia.slice(0, 3).forEach(c => {
            const chip = document.createElement('span');
            chip.className = 'chip' + (c.demo ? ' chip-demo' : '');
            chip.textContent = c.hora + '  ' + c.nombre.split(' ')[0];
            chip.title = c.hora + ' · ' + c.nombre + ' · ' + (SERVICIOS[c.servicio] || c.servicio);
            chips.appendChild(chip);
        });
        if (delDia.length > 3) {
            const more = document.createElement('span');
            more.className = 'chip chip-more';
            more.textContent = '+' + (delDia.length - 3) + ' más';
            chips.appendChild(more);
        }
        cell.appendChild(chips);
    }

    cell.addEventListener('click', () => {
        selectedDate = fecha;
        renderGrid();
        renderPanel();
    });

    return cell;
}

function renderGrid() {
    daysGrid.textContent = '';
    const first = new Date(viewedYear, viewedMonth, 1);
    const offset = (first.getDay() + 6) % 7;
    const diasEnMes = new Date(viewedYear, viewedMonth + 1, 0).getDate();
    const diasMesAnterior = new Date(viewedYear, viewedMonth, 0).getDate();

    for (let i = offset - 1; i >= 0; i--) {
        const dia = diasMesAnterior - i;
        daysGrid.appendChild(crearCelda(dia, formatoFecha(new Date(viewedYear, viewedMonth - 1, dia)), true));
    }

    for (let d = 1; d <= diasEnMes; d++) {
        daysGrid.appendChild(crearCelda(d, formatoFecha(new Date(viewedYear, viewedMonth, d)), false));
    }

    let d = 1;
    while (daysGrid.children.length % 7 !== 0) {
        daysGrid.appendChild(crearCelda(d, formatoFecha(new Date(viewedYear, viewedMonth + 1, d)), true));
        d++;
    }
}

function legendServicio(s) {
    return SERVICIOS[s] || s || 'Otro';
}

function renderPanel() {
    if (!selectedDate) return;
    const d = parsearFecha(selectedDate);
    panelDateEl.textContent = WEEKDAYS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();

    dayListEl.textContent = '';
    const delDia = citasDe(selectedDate);
    if (delDia.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'day-empty';
        empty.textContent = 'No hay citas agendadas para este día.';
        dayListEl.appendChild(empty);
        return;
    }

    delDia.forEach(c => {
        const item = document.createElement('div');
        item.className = 'appointment-item' + (c.demo ? ' item-demo' : '');

        const hora = document.createElement('div');
        hora.className = 'appt-hour';
        hora.textContent = c.hora;

        const info = document.createElement('div');
        info.className = 'appt-info';

        const nombre = document.createElement('div');
        nombre.className = 'appt-name';
        nombre.textContent = c.nombre;

        const svc = document.createElement('div');
        svc.className = 'appt-svc';
        svc.textContent = legendServicio(c.servicio) + (c.demo ? ' · demostración' : '');

        info.appendChild(nombre);
        info.appendChild(svc);
        item.appendChild(hora);
        item.appendChild(info);
        dayListEl.appendChild(item);
    });
}

function render() {
    renderCabecera();
    renderGrid();
    renderPanel();
}

async function cargarCitas() {
    try {
        const res = await fetch('/api/citas');
        if (!res.ok) throw new Error();
        citas = await res.json();
    } catch (e) {
        citas = [];
    }
    render();
}

function cambiarMes(delta) {
    const d = new Date(viewedYear, viewedMonth + delta, 1);
    viewedYear = d.getFullYear();
    viewedMonth = d.getMonth();
    if (selectedDate && selectedDate.slice(0, 7) !== viewedYear + '-' + String(viewedMonth + 1).padStart(2, '0')) {
        selectedDate = null;
    }
    render();
}

function irAHoy() {
    const hoy = new Date();
    viewedYear = hoy.getFullYear();
    viewedMonth = hoy.getMonth();
    selectedDate = formatoFecha(hoy);
    render();
}

document.getElementById('prevMonth').addEventListener('click', () => cambiarMes(-1));
document.getElementById('nextMonth').addEventListener('click', () => cambiarMes(1));
document.getElementById('todayBtn').addEventListener('click', irAHoy);

irAHoy();
cargarCitas();