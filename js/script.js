const apiBase = '/api';

const nameInput = document.getElementById('name');
const phoneInput = document.getElementById('phone');
const emailInput = document.getElementById('email');
const serviceInput = document.getElementById('service');
const dateInput = document.getElementById('date');
const slotGroup = document.getElementById('slotGroup');
const slotGrid = document.getElementById('slotGrid');
const slotHint = document.getElementById('slotHint');
const horaInput = document.getElementById('hora');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');

function showMessage(el, text) {
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(showMessage._timer);
    showMessage._timer = setTimeout(() => el.classList.remove('show'), 7000);
}

const hoy = new Date();
dateInput.min = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');

async function cargarSlots(fecha) {
    slotGrid.innerHTML = '';
    slotHint.textContent = '';
    horaInput.value = '';
    slotGroup.classList.add('hide');
    if (!fecha) return;
    try {
        const res = await fetch(apiBase + '/slots/' + fecha);
        if (!res.ok) {
            slotHint.textContent = 'No pudimos cargar los horarios para este día.';
            slotGroup.classList.remove('hide');
            return;
        }
        const data = await res.json();
        slotGroup.classList.remove('hide');
        if ((!data.slots || data.slots.length === 0) && (!data.ocupados || data.ocupados.length === 0)) {
            slotHint.textContent = 'No hay horarios disponibles para este día. Elige otra fecha.';
            return;
        }
        const items = (data.slots || []).map(hora => ({ hora, ocupado: false }))
            .concat((data.ocupados || []).map(o => ({ hora: o.hora, ocupado: true })));
        items.sort((a, b) => a.hora.localeCompare(b.hora));
        items.forEach(item => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'slot-btn' + (item.ocupado ? ' slot-btn-taken' : '');
            btn.textContent = item.hora;
            if (item.ocupado) {
                btn.disabled = true;
                btn.title = 'Horario ocupado';
            } else {
                btn.addEventListener('click', () => {
                    slotGrid.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    horaInput.value = item.hora;
                    errorMessage.classList.remove('show');
                });
            }
            slotGrid.appendChild(btn);
        });
    } catch (e) {
        slotHint.textContent = 'Error de conexión al cargar los horarios. Intenta de nuevo.';
        slotGroup.classList.remove('hide');
    }
}

dateInput.addEventListener('change', () => cargarSlots(dateInput.value));

document.getElementById('appointmentForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const form = this;
    const nombre = nameInput.value.trim();
    const telefono = phoneInput.value.trim();
    const email = emailInput.value.trim();
    const servicio = serviceInput.value;
    const fecha = dateInput.value;
    const hora = horaInput.value;

    if (!nombre || !telefono || !email || !servicio || !fecha || !hora) {
        showMessage(errorMessage, 'Por favor completa todos los datos y elige un horario disponible.');
        return;
    }

    const btn = form.querySelector('.submit-btn');
    btn.disabled = true;
    btn.textContent = 'Agendando...';

    try {
        const res = await fetch(apiBase + '/citas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, telefono, email, fecha, hora, servicio })
        });

        if (res.status === 409) {
            showMessage(errorMessage, 'Ese horario ya fue reservado. Elige otro horario disponible.');
            cargarSlots(fecha);
        } else if (res.ok) {
            showMessage(successMessage, '✓ ¡Gracias ' + nombre.split(' ')[0] + '! Tu cita quedó reservada para el ' + fecha + ' a las ' + hora + '.');
            form.reset();
            slotGroup.classList.add('hide');
            slotGrid.innerHTML = '';
            horaInput.value = '';
        } else {
            const err = await res.json().catch(() => ({}));
            showMessage(errorMessage, err.error || 'No se pudo agendar la cita. Intenta de nuevo.');
        }
    } catch (err) {
        showMessage(errorMessage, 'Error de conexión al agendar. Intenta de nuevo.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Agendar Cita';
    }
});

// Save appointment to localStorage
function saveAppointment(appointment) {
    const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    appointments.push(appointment);
    localStorage.setItem('appointments', JSON.stringify(appointments));
}

// Scroll to top on logo click
document.querySelector('.logo').addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Chat Assistant
const ASSISTANT_CONFIG = {
    API_KEY: '',
    MODELO: 'meta-llama/llama-3.1-8b-instruct:free'
};

const ASSISTANT_KNOWLEDGE = [
    {
        keywords: ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'hello', 'hey', 'saludos'],
        answer: '¡Hola! Soy el asistente virtual de Sonrisa Brillante. Puedo ayudarte con información sobre servicios, precios, horarios, citas y más. ¿Qué te gustaría saber?'
    },
    {
        keywords: ['que puedo preguntar', 'que puedo preguntarte', 'que puedes hacer', 'que me puedes decir', 'que temas', 'que te puedo preguntar', 'ayuda', 'opciones', 'que informacion', 'en que me ayudas'],
        answer: 'Puedes preguntarme sobre: nuestros servicios (limpieza, blanqueamiento, ortodoncia, tratamientos), precios y costos, horarios de atención, ubicación, cómo agendar una cita, seguros y formas de pago, emergencias dentales y consejos de cuidado bucal. Escríbeme tu pregunta y te responderé al momento.'
    },
    {
        keywords: ['gracias', 'muchas gracias'],
        answer: 'De nada. Si tienes otra pregunta sobre nuestra clínica dental, aquí estoy para ayudarte.'
    },
    {
        keywords: ['horario', 'horarios', 'atencion', 'abren', 'abiertos', 'hora', 'domingo', 'sabado', 'lunes'],
        answer: 'Nuestro horario de atención es:\nLunes a Viernes: 9:00 am - 7:00 pm\nSábado: 9:00 am - 2:00 pm\nDomingo: Cerrado.\nSi necesitas una cita especial, contáctanos al +52 55 1234 5678.'
    },
    {
        keywords: ['ubicacion', 'direccion', 'donde estan', 'donde se encuentra', 'ubicados', 'ciudad', 'estan'],
        answer: 'Nos encontramos en Ciudad de México. Para la dirección exacta y un mapa, déjanos tu número llamándonos al +52 55 1234 5678 y con gusto te la compartimos.'
    },
    {
        keywords: ['telefono', 'llamar', 'numero', 'whatsapp', 'contacto', 'contactarte', 'contactanos'],
        answer: 'Puedes escribirnos o llamarnos al +52 55 1234 5678. También puedes usar el formulario de contacto de esta página y te atenderemos a la brevedad.'
    },
    {
        keywords: ['correo', 'email', 'mail', 'escrito', 'escribenos'],
        answer: 'Escríbenos a contacto@sonrisabrillante.com y con gusto atenderemos todas tus dudas.'
    },
    {
        keywords: ['cita', 'agendar', 'reservar', 'agenda', 'citas', 'pedir'],
        answer: 'Puedes agendar tu cita de dos formas:\n1) Llenando el formulario en la sección "Agenda tu Cita" de esta página.\n2) Llamando al +52 55 1234 5678.\nNos pondremos en contacto contigo para confirmar la fecha y hora.'
    },
    {
        keywords: ['cuanto dura', 'cuanto tarda', 'cuanto tiempo', 'duracion', 'tiempo', 'demora', 'sesiones', 'sesion', 'cuanto demora'],
        answer: 'La duración depende del tratamiento: una limpieza toma unos 45 minutos, el blanqueamiento se hace en 1 a 2 sesiones, y la ortodoncia suele durar entre 12 y 24 meses según cada caso. En tu valoración el dentista te dará un tiempo estimado exacto.'
    },
    {
        keywords: ['servicios', 'servicio', 'que ofrecen', 'que servicios', 'cuales son los servicios', 'servicios ofrece', 'que hacen', 'que tiene'],
        answer: 'Ofrecemos: limpieza dental, blanqueamiento, ortodoncia (brackets y alineadores invisibles) y tratamientos generales como extracciones, endodoncias, coronas e implantes. También atendemos a niños. ¿Quieres saber el precio de alguno o quieres agendar una cita?'
    },
    {
        keywords: ['limpieza', 'higiene'],
        answer: 'La limpieza dental es un procedimiento seguro y cómodo que elimina placa, sarro y manchas superficiales para prevenir caries y enfermedades de las encías. Se recomienda realizarla cada 6 meses. La primera consulta es orientativa y nosotros te indicamos el tratamiento ideal para ti.'
    },
    {
        keywords: ['blanqueamiento', 'blanquear', 'dientes blancos', 'sonrisa mas blanca'],
        answer: 'Nuestro blanqueamiento dental utiliza tecnología de última generación para aclarar el tono de tus dientes de forma segura. El número de sesiones depende del tono inicial; en tu valoración te indicamos el plan ideal. Agenda una cita y te asesoramos sin compromiso.'
    },
    {
        keywords: ['ortodoncia', 'brackets', 'alineadores', 'frenos', 'alinear'],
        answer: 'Ofrecemos ortodoncia con brackets tradicionales y estéticos, además de alineadores invisibles. El especialista diseñará un plan de alineación a tu medida. Te invitamos a una valoración para definir la mejor opción para ti.'
    },
    {
        keywords: ['tratamiento', 'tratamientos', 'endodoncia', 'extraccion', 'muelas', 'reconstruccion', 'caries', 'implante', 'corona'],
        answer: 'Contamos con soluciones dentales completas: extracciones, endodoncias, reconstrucciones, coronas e implantes. Cada paciente recibe un diagnóstico personalizado. Agenda tu valoración y te explicamos todas las opciones y costos.'
    },
    {
        keywords: ['precio', 'precios', 'costo', 'costos', 'cuanto cuesta', 'cuanto vale', 'cuesta', 'tarifas', 'cobran', 'consulta', 'valoracion', 'cita', 'ninos', 'nino', 'nina', 'ninas', 'pediatria', 'familia', 'hijos', 'descuento'],
        require: [
            ['ninos', 'nino', 'nina', 'ninas', 'pediatria', 'familia', 'hijos', 'infant'],
            ['consulta', 'valoracion', 'cita', 'visita']
        ],
        answer: 'La consulta y valoración tiene un costo desde $400. Para niños y niñas ofrecemos tarifas especiales y atención con especialistas pediátricos. El precio final depende del tratamiento que se requiera; agenda una cita al +52 55 1234 5678 y te damos un presupuesto exacto sin compromiso.'
    },
    {
        keywords: ['extraccion', 'extracciones', 'muela', 'muelas', 'sacar', 'diente', 'dientes', 'precio', 'costo', 'cuesta', 'cuanto cuesta', 'cuanto vale', 'tarifas', 'cobran'],
        require: [
            ['extraccion', 'extracciones', 'muela', 'muelas', 'sacar', 'diente', 'dientes'],
            ['precio', 'costo', 'costos', 'cuesta', 'cuanto cuesta', 'cuanto vale', 'tarifas', 'cobran']
        ],
        answer: 'El costo aproximado de una extracción dental es desde $1,200, dependiendo de la complejidad (simple, quirúrgica o muela del juicio). Te recomendamos una valoración para darte un precio exacto; agenda tu cita al +52 55 1234 5678.'
    },
    {
        keywords: ['precio', 'precios', 'cuanto cuesta', 'cuanto vale', 'costo', 'costos', 'cuesta', 'tarifas', 'cuanto cobran', 'paquete'],
        answer: 'Los precios dependen del tratamiento y del diagnóstico de cada paciente. Algunos costos de referencia:\n- Consulta y valoración: desde $400\n- Limpieza dental: desde $550\n- Blanqueamiento: desde $2,500\n- Ortodoncia: desde $4,000 por mes (plan completo desde $38,000)\n- Extracción simple: desde $1,200\n- Endodoncia: desde $3,200\n- Implantes: desde $15,000\nPara niños ofrecemos tarifas especiales. Te recomendamos agendar una valoración; la consulta inicial te da un presupuesto exacto sin compromiso.'
    },
    {
        keywords: ['seguro', 'seguros', 'aseguradora', 'sisben', 'protege', 'cobertura'],
        answer: 'Aceptamos la mayoría de los seguros dentales. Llámanos al +52 55 1234 5678 con los datos de tu póliza y verificaremos si tu plan tiene cobertura y cuáles son los requisitos.'
    },
    {
        keywords: ['pago', 'pagos', 'pagar', 'tarjeta', 'tarjetas', 'credito', 'debito', 'transferencia', 'efectivo', 'financiamiento', 'mensual'],
        answer: 'Aceptamos efectivo, tarjetas de crédito y débito, y transferencias bancarias. Además ofrecemos planes de financiamiento y pagos a meses para tratamientos completos como ortodoncia. Pregunta a nuestra recepción por las opciones disponibles.'
    },
    {
        keywords: ['dolor', 'emergencia', 'urgente', 'urgencia', 'le duele', 'inchado', 'hinchado'],
        answer: 'Si tienes un dolor agudo o una emergencia dental, te pedimos que llames inmediatamente al +52 55 1234 5678. En algunos casos atendemos urgencias el mismo día. Si el dolor es intenso, recomendamos acudir a un servicio de urgencias.'
    },
    {
        keywords: ['niños', 'nino', 'niña', 'ninas', 'pediatria', 'familiar', 'adolescente', 'hijos'],
        answer: 'Atendemos a toda la familia: niños, adolescentes y adultos. La atención pediátrica es cercana y especializada para que los más pequeños se sientan cómodos. Agenda una cita y con gusto cuidamos la sonrisa de tu familia.'
    },
    {
        keywords: ['cuidado', 'cuidar', 'cepillado', 'cepillo', 'consejo', 'recomendacion', 'prevencion'],
        answer: 'Algunos consejos básicos para cuidar tu sonrisa: cepillarse al menos 2 veces al día con pasta con flúor, usar hilo dental diario, evitar bebidas azucaradas en exceso y visitar al dentista cada 6 meses para una limpieza preventiva.'
    },
    {
        keywords: ['doctor', 'dentista', 'quien atiende', 'profesional', 'especialista', 'equipo', 'certificados'],
        answer: 'Contamos con dentistas certificados y un equipo especializado que usa tecnología de punta para darte la mejor atención. Tu salud dental es nuestro compromiso.'
    }
];

const chatWidget = document.getElementById('chatWidget');
const chatPanel = document.querySelector('.chat-panel');
const chatToggle = document.getElementById('chatToggle');
const chatClose = document.getElementById('chatClose');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');

const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function findAnswer(question) {
    const q = normalize(question);
    let best = null;
    let bestScore = 0;
    ASSISTANT_KNOWLEDGE.forEach(entry => {
        if (entry.require && !entry.require.every(group => group.some(kw => q.includes(normalize(kw))))) {
            return;
        }
        const score = entry.keywords.reduce((acc, kw) => acc + (q.includes(normalize(kw)) ? 1 : 0), 0);
        if (score > bestScore) {
            bestScore = score;
            best = entry;
        }
    });
    return best ? best.answer : null;
}

function addMessage(text, sender) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg ' + sender;
    msg.textContent = text;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return msg;
}

function showTyping() {
    const typing = document.createElement('div');
    typing.className = 'chat-msg bot typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    typing.id = 'chatTyping';
    chatMessages.appendChild(typing);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
    const typing = document.getElementById('chatTyping');
    if (typing) typing.remove();
}

async function askAI(question) {
    if (!ASSISTANT_CONFIG.API_KEY) return null;
    try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + ASSISTANT_CONFIG.API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: ASSISTANT_CONFIG.MODELO,
                messages: [
                    {
                        role: 'system',
                        content: 'Eres el asistente virtual de Sonrisa Brillante, una clínica dental en Ciudad de México. Responde en español, de forma breve, amable y útil. Si no sabes algo, sugiere contactarlos al +52 55 1234 5678 o al correo contacto@sonrisabrillante.com.'
                    },
                    { role: 'user', content: question }
                ],
                max_tokens: 300
            })
        });
        const data = await res.json();
        return data.choices && data.choices[0] ? data.choices[0].message.content : null;
    } catch (e) {
        return null;
    }
}

const fallbackMessage = 'Lo siento, no tengo una respuesta preparada para eso. Puedes llamarnos al +52 55 1234 5678 o escribirnos a contacto@sonrisabrillante.com y con gusto te atenderemos.';

async function sendMessage(text) {
    const question = text.trim();
    if (!question) return;
    chatInput.value = '';
    addMessage(question, 'user');
    showTyping();

    const local = findAnswer(question);
    let reply = null;
    if (local) {
        reply = local;
    } else {
        reply = await askAI(question);
    }

    hideTyping();
    addMessage(reply || fallbackMessage, 'bot');
}

chatToggle.addEventListener('click', () => {
    chatPanel.classList.add('open');
    chatToggle.classList.add('hide');
    chatInput.focus();
});

chatClose.addEventListener('click', () => {
    chatPanel.classList.remove('open');
    chatToggle.classList.remove('hide');
});

chatSend.addEventListener('click', () => sendMessage(chatInput.value));

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage(chatInput.value);
});