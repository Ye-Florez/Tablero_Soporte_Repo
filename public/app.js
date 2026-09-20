// URL de la API. La levanta json-server cuando corres `npm run api`.
const API_URL = 'http://localhost:3000/tickets';

// Estado de la aplicación: la lista de tickets tal como la conoce el navegador.
// La pantalla siempre se dibuja a partir de este arreglo.
let tickets = [];

// null = el formulario está en modo "crear". Un número = el id del ticket que se está editando.
let ticketEnEdicionId = null;

// Texto y color según estado. `siguiente` indica a qué estado avanza el botón de la tarjeta.
const ESTADOS = {
  abierto: { etiqueta: 'Abierto', clases: 'bg-sky-100 text-sky-800', siguiente: 'en_progreso' },
  en_progreso: { etiqueta: 'En progreso', clases: 'bg-amber-100 text-amber-800', siguiente: 'resuelto' },
  resuelto: { etiqueta: 'Resuelto', clases: 'bg-emerald-100 text-emerald-800', siguiente: null },
};

// Texto y color según prioridad.
const PRIORIDADES = {
  alta: { etiqueta: 'Alta', clases: 'bg-red-100 text-red-800' },
  media: { etiqueta: 'Media', clases: 'bg-yellow-100 text-yellow-800' },
  baja: { etiqueta: 'Baja', clases: 'bg-gray-100 text-gray-800' },
};

// ---------- Referencias del DOM (las buscamos una sola vez) ----------
const formulario = document.getElementById('form-ticket');
const inputTitulo = document.getElementById('titulo');
const inputDescripcion = document.getElementById('descripcion');
const inputSolicitante = document.getElementById('solicitante');
const selectCategoria = document.getElementById('categoria');
const selectPrioridad = document.getElementById('prioridad');
const errorTitulo = document.getElementById('error-titulo');
const errorSolicitante = document.getElementById('error-solicitante');
const btnGuardar = document.getElementById('btn-guardar');
const btnCancelar = document.getElementById('btn-cancelar');
const tituloFormulario = document.getElementById('titulo-formulario');
const listaTickets = document.getElementById('lista-tickets');
const mensaje = document.getElementById('mensaje');
const resumen = document.getElementById('resumen');
const filtroEstado = document.getElementById('filtro-estado');
const inputBusqueda = document.getElementById('busqueda');

// ============================================================
// NIVEL 1 · Listar los tickets (GET)
// ============================================================

async function cargarTickets() {
  mensaje.textContent = 'Cargando tickets...';

  try {
    const respuesta = await fetch(API_URL);

    // fetch NO lanza error solo porque el servidor responda 404/500.
    // Lo revisamos nosotros y lanzamos el error manualmente.
    if (!respuesta.ok) {
      throw new Error(`Error del servidor: ${respuesta.status}`);
    }

    tickets = await respuesta.json();
    aplicarFiltros();     // dibuja las tarjetas (o el mensaje de vacío/sin coincidencias)
    renderizarResumen();
  } catch (error) {
    // Cae aquí tanto si no hay conexión como si nosotros lanzamos el error arriba.
    mensaje.textContent = `No se pudieron cargar los tickets: ${error.message}`;
  }
}

function crearTarjeta(ticket) {
  const estadoInfo = ESTADOS[ticket.estado];
  const prioridadInfo = PRIORIDADES[ticket.prioridad];
  const esResuelto = ticket.estado === 'resuelto';

  const tarjeta = document.createElement('div');
  tarjeta.className = `flex flex-col gap-2 rounded-lg p-4 shadow ${
    esResuelto ? 'bg-gray-50 opacity-75' : 'bg-white'
  }`;

  // --- Encabezado: número + título, y los dos badges ---
  const encabezado = document.createElement('div');
  encabezado.className = 'flex justify-between items-start gap-2';

  const numeroYTitulo = document.createElement('h3');
  numeroYTitulo.className = 'font-semibold text-slate-800';
  // textContent, nunca innerHTML: si el usuario escribió <b>hola</b>, se muestra tal cual como texto.
  numeroYTitulo.textContent = `#${ticket.id} ${ticket.titulo}`;
  encabezado.appendChild(numeroYTitulo);

  const badges = document.createElement('div');
  badges.className = 'flex gap-2 shrink-0';

  const badgePrioridad = document.createElement('span');
  badgePrioridad.className = `text-xs font-medium px-2 py-1 rounded-full ${prioridadInfo.clases}`;
  badgePrioridad.textContent = prioridadInfo.etiqueta;

  const badgeEstado = document.createElement('span');
  badgeEstado.className = `text-xs font-medium px-2 py-1 rounded-full ${estadoInfo.clases}`;
  badgeEstado.textContent = estadoInfo.etiqueta;

  badges.append(badgePrioridad, badgeEstado);
  encabezado.appendChild(badges);
  tarjeta.appendChild(encabezado);

  // --- Descripción y detalle ---
  const descripcion = document.createElement('p');
  descripcion.className = 'text-sm text-slate-600';
  descripcion.textContent = ticket.descripcion;
  tarjeta.appendChild(descripcion);

  const detalle = document.createElement('p');
  detalle.className = 'text-sm text-slate-500';
  detalle.textContent = `Solicitante: ${ticket.solicitante} · Categoría: ${ticket.categoria}`;
  tarjeta.appendChild(detalle);

  // --- Botones de acción ---
  const acciones = document.createElement('div');
  acciones.className = 'flex gap-2 mt-2';

  if (estadoInfo.siguiente) {
    const btnAvanzar = document.createElement('button');
    btnAvanzar.className =
      'bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-700 transition-colors';
    btnAvanzar.textContent = ticket.estado === 'abierto' ? 'Empezar' : 'Marcar resuelto';
    btnAvanzar.addEventListener('click', () => cambiarEstado(ticket));
    acciones.appendChild(btnAvanzar);
  }

  const btnEditar = document.createElement('button');
  btnEditar.className =
    'bg-gray-200 text-gray-800 px-3 py-1.5 rounded-md text-sm hover:bg-gray-300 transition-colors';
  btnEditar.textContent = 'Editar';
  btnEditar.addEventListener('click', () => entrarModoEdicion(ticket));
  acciones.appendChild(btnEditar);

  const btnEliminar = document.createElement('button');
  btnEliminar.className =
    'bg-red-100 text-red-700 px-3 py-1.5 rounded-md text-sm hover:bg-red-200 transition-colors';
  btnEliminar.textContent = 'Eliminar';
  btnEliminar.addEventListener('click', () => eliminarTicket(ticket));
  acciones.appendChild(btnEliminar);

  tarjeta.appendChild(acciones);

  return tarjeta;
}

function renderizarTickets(listaAMostrar) {
  listaTickets.innerHTML = ''; // limpiar antes de redibujar (esto no viene de un usuario, es seguro)

  if (listaAMostrar.length === 0) {
    mensaje.textContent =
      tickets.length === 0
        ? 'No hay tickets todavía. ¡Crea el primero!'
        : 'Ningún ticket coincide con el filtro.';
    return;
  }

  mensaje.textContent = '';
  listaAMostrar.forEach((ticket) => listaTickets.appendChild(crearTarjeta(ticket)));
}

// ============================================================
// NIVEL 2 · Crear tickets (POST)
// ============================================================

function validarFormulario() {
  let esValido = true;

  const titulo = inputTitulo.value.trim();
  if (titulo.length < 5) {
    errorTitulo.textContent = 'El título debe tener al menos 5 caracteres.';
    esValido = false;
  } else {
    errorTitulo.textContent = '';
  }

  const solicitante = inputSolicitante.value.trim();
  if (solicitante === '') {
    errorSolicitante.textContent = 'El solicitante no puede estar vacío.';
    esValido = false;
  } else {
    errorSolicitante.textContent = '';
  }

  return esValido;
}

function limpiarFormulario() {
  formulario.reset();
  errorTitulo.textContent = '';
  errorSolicitante.textContent = '';
}

async function crearTicket(datosTicket) {
  const respuesta = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datosTicket),
  });

  if (!respuesta.ok) {
    throw new Error(`No se pudo crear el ticket: ${respuesta.status}`);
  }

  return respuesta.json(); // trae el ticket con el id que le asignó el servidor
}

// ============================================================
// NIVEL 3 · Cambiar el estado (PATCH)
// ============================================================

async function cambiarEstado(ticket) {
  const siguiente = ESTADOS[ticket.estado].siguiente;

  try {
    const respuesta = await fetch(`${API_URL}/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: siguiente }), // solo el campo que cambia
    });

    if (!respuesta.ok) {
      throw new Error(`No se pudo actualizar el estado: ${respuesta.status}`);
    }

    const ticketActualizado = await respuesta.json();
    tickets = tickets.map((t) => (t.id === ticketActualizado.id ? ticketActualizado : t));
    aplicarFiltros();
    renderizarResumen();
  } catch (error) {
    mensaje.textContent = error.message;
  }
}

// ============================================================
// NIVEL 4 · Editar tickets (PUT)
// ============================================================

function entrarModoEdicion(ticket) {
  ticketEnEdicionId = ticket.id;

  inputTitulo.value = ticket.titulo;
  inputDescripcion.value = ticket.descripcion;
  inputSolicitante.value = ticket.solicitante;
  selectCategoria.value = ticket.categoria;
  selectPrioridad.value = ticket.prioridad;

  tituloFormulario.textContent = `Editar ticket #${ticket.id}`;
  btnGuardar.textContent = 'Guardar cambios';
  btnCancelar.hidden = false;

  errorTitulo.textContent = '';
  errorSolicitante.textContent = '';
}

function salirModoEdicion() {
  ticketEnEdicionId = null;
  limpiarFormulario();
  tituloFormulario.textContent = 'Nuevo ticket';
  btnGuardar.textContent = 'Crear ticket';
  btnCancelar.hidden = true;
}

async function actualizarTicket(id, datosTicket) {
  const respuesta = await fetch(`${API_URL}/${id}`, {
    method: 'PUT', // reemplaza el ticket COMPLETO
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datosTicket),
  });

  if (!respuesta.ok) {
    throw new Error(`No se pudo editar el ticket: ${respuesta.status}`);
  }

  return respuesta.json();
}

btnCancelar.addEventListener('click', salirModoEdicion);

// ---------- Envío del formulario: decide si crea o edita ----------

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault(); // evita que el navegador recargue la página

  if (!validarFormulario()) return;

  const datosTicket = {
    titulo: inputTitulo.value.trim(),
    descripcion: inputDescripcion.value.trim(),
    solicitante: inputSolicitante.value.trim(),
    categoria: selectCategoria.value,
    prioridad: selectPrioridad.value,
  };

  try {
    if (ticketEnEdicionId === null) {
      // Modo creación: todo ticket nuevo arranca abierto
      datosTicket.estado = 'abierto';
      const ticketCreado = await crearTicket(datosTicket);
      tickets.push(ticketCreado);
    } else {
      // Modo edición: el formulario no tiene campo de estado,
      // así que reinyectamos el estado ACTUAL del ticket antes del PUT.
      // Si no lo hiciéramos, el PUT (que reemplaza todo) lo dejaría sin estado.
      const ticketOriginal = tickets.find((t) => t.id === ticketEnEdicionId);
      datosTicket.estado = ticketOriginal.estado;

      const ticketActualizado = await actualizarTicket(ticketEnEdicionId, datosTicket);
      tickets = tickets.map((t) => (t.id === ticketActualizado.id ? ticketActualizado : t));
      salirModoEdicion();
    }

    limpiarFormulario();
    aplicarFiltros();
    renderizarResumen();
  } catch (error) {
    mensaje.textContent = error.message;
  }
});

// ============================================================
// NIVEL 5 · Eliminar tickets (DELETE)
// ============================================================

async function eliminarTicket(ticket) {
  const confirmado = confirm(`¿Eliminar el ticket #${ticket.id} "${ticket.titulo}"?`);
  if (!confirmado) return; // si cancela, no sale ninguna petición

  try {
    const respuesta = await fetch(`${API_URL}/${ticket.id}`, { method: 'DELETE' });

    if (!respuesta.ok) {
      throw new Error(`No se pudo eliminar el ticket: ${respuesta.status}`);
    }

    tickets = tickets.filter((t) => t.id !== ticket.id);

    if (ticketEnEdicionId === ticket.id) {
      salirModoEdicion(); // si estabas editando el que borraste, vuelve a modo creación
    }

    aplicarFiltros();
    renderizarResumen();
  } catch (error) {
    mensaje.textContent = error.message;
  }
}

// ============================================================
// NIVEL 6 · Filtrar y resumir (todo en memoria, sin llamar a la API)
// ============================================================

function aplicarFiltros() {
  const estadoSeleccionado = filtroEstado.value;
  const textoBusqueda = inputBusqueda.value.trim().toLowerCase();

  const filtrados = tickets.filter((ticket) => {
    const coincideEstado = estadoSeleccionado === 'todos' || ticket.estado === estadoSeleccionado;
    const coincideBusqueda = ticket.titulo.toLowerCase().includes(textoBusqueda);
    return coincideEstado && coincideBusqueda;
  });

  renderizarTickets(filtrados);
}

function renderizarResumen() {
  const conteos = tickets.reduce((acumulado, ticket) => {
    acumulado[ticket.estado] = (acumulado[ticket.estado] || 0) + 1;
    return acumulado;
  }, {});

  const altasSinResolver = tickets.filter(
    (t) => t.prioridad === 'alta' && t.estado !== 'resuelto'
  ).length;

  resumen.textContent =
    `Abiertos: ${conteos.abierto || 0} · ` +
    `En progreso: ${conteos.en_progreso || 0} · ` +
    `Resueltos: ${conteos.resuelto || 0} · ` +
    `Prioridad alta sin resolver: ${altasSinResolver}`;
}

filtroEstado.addEventListener('change', aplicarFiltros);
inputBusqueda.addEventListener('input', aplicarFiltros);

// ============================================================
// Arranque de la aplicación
// ============================================================
cargarTickets();