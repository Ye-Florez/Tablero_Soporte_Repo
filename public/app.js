// URL de la API. La levanta json-server cuando corres `npm run api`.
const API_URL = 'http://localhost:3000/tickets';

// Estado de la aplicación: la lista de tickets tal como la conoce el navegador.
// La pantalla siempre se dibuja a partir de este arreglo.
let tickets = [];
let ticketEnEdicionId = null;


const ESTADOS = {
  abierto: { etiqueta: 'Abierto', clases: 'bg-sky-100 text-sky-800', siguiente: 'en_progreso' },
  en_progreso: { etiqueta: 'En progreso', clases: 'bg-amber-100 text-amber-800', siguiente: 'resuelto' },
  resuelto: { etiqueta: 'Resuelto', clases: 'bg-emerald-100 text-emerald-800', siguiente: null },
};

const PRIORIDADES = {
  alta: { etiqueta: 'Alta', clases: 'bg-red-100 text-red-800' },
  media: { etiqueta: 'Media', clases: 'bg-yellow-100 text-yellow-800' },
  baja: { etiqueta: 'Baja', clases: 'bg-green-100 text-green-800' },
};

// DOM
const formulario = document.querySelector('#form-ticket');
const inputTitulo = document.querySelector('#titulo');
const inputDescripcion = document.querySelector('#descripcion');
const inputSolicitante = document.querySelector('#solicitante');
const selectCategoria = document.querySelector('#categoria');
const selectPrioridad = document.querySelector('#prioridad');
const errorTitulo = document.querySelector('#error-titulo');
const errorSolicitante = document.querySelector('#error-solicitante');
const btnGuardar = document.querySelector('#btn-guardar');
const btnCancelar = document.querySelector('#btn-cancelar');
const tituloFormulario = document.querySelector('#titulo-formulario');
const listaTickets = document.querySelector('#lista-tickets');
const mensaje = document.querySelector('#mensaje');
const resumen = document.querySelector('#resumen');
const filtroEstado = document.querySelector('#filtro-estado');
const inputBusqueda = document.querySelector('#busqueda');


function crearElemento(etiqueta, clases, texto = '') {
  const el = document.createElement(etiqueta);
  el.className = clases;
  el.textContent = texto;
  return el;
}

function crearBoton(texto, clases, alHacerClick) {
  const boton = crearElemento('button', `${clases} px-3 py-1.5 rounded-md text-sm transition-colors`, texto);
  boton.addEventListener('click', alHacerClick);
  return boton;
}

function refrescar() {
  aplicarFiltros();
  renderizarResumen();
}

// -------------- NIVEL 1
async function cargarTickets() {
  mensaje.textContent = 'Cargando tickets...';

  try {
    const res = await fetch(API_URL);
    // fetch no falla con un 404/500, hay que revisarlo a mano
    if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);

    tickets = await res.json();
    refrescar();
  } catch (error) {
    mensaje.textContent = `Hubo un problema al cargar los tickets (${error.message}). Verifica que el servidor esté corriendo y la URL sea correcta.`;
  }
}

function crearTarjeta(ticket) {
  const estado = ESTADOS[ticket.estado];
  const prioridad = PRIORIDADES[ticket.prioridad];
  const resuelto = ticket.estado === 'resuelto';

  // NIVEL 3
  const tarjeta = crearElemento(
    'div',
    `flex flex-col gap-2 rounded-lg p-4 shadow ${resuelto ? 'bg-gray-50 opacity-75' : 'bg-white'}`
  );

  const titulo = crearElemento('h3', 'font-semibold text-slate-800', `#${ticket.id} ${ticket.titulo}`);

  const descripcion = crearElemento('p', 'text-sm text-slate-600', ticket.descripcion);
  const detalle = crearElemento(
    'p',
    'text-sm text-slate-500',
    `Solicitante: ${ticket.solicitante} · Categoría: ${ticket.categoria}`
  );

  const lineaPrioridad = crearElemento(
    'p',
    `${prioridad.clases} text-sm px-2 py-1 rounded`,
    `Prioridad: ${prioridad.etiqueta}`
  );
  const lineaEstado = crearElemento(
    'p',
    `${estado.clases} text-sm px-2 py-1 rounded`,
    `Estado: ${estado.etiqueta}`
  );

  const acciones = crearElemento('div', 'flex gap-2 mt-2');

  // NIVEL 3
  if (estado.siguiente) {
    const textoAvanzar = ticket.estado === 'abierto' ? 'Empezar' : 'Marcar resuelto';
    acciones.append(
      crearBoton(textoAvanzar, 'bg-blue-600 text-white hover:bg-blue-700', () => cambiarEstado(ticket))
    );
  }

  acciones.append(
    // NIVEL 4
    crearBoton('Editar', 'bg-gray-200 text-gray-800 hover:bg-gray-300', () => entrarModoEdicion(ticket)),
    // NIVEL 5
    crearBoton('Eliminar', 'bg-red-100 text-red-700 hover:bg-red-200', () => eliminarTicket(ticket))
  );

  tarjeta.append(titulo, descripcion, detalle, lineaPrioridad, lineaEstado, acciones);
  return tarjeta;
}

function renderizarTickets(lista) {
  listaTickets.innerHTML = '';

  if (lista.length === 0) {
    mensaje.textContent =
      tickets.length === 0
        ? 'No hay tickets todavía. ¡Crea el primero!'
        : 'Ningún ticket coincide con el filtro.';
    return;
  }

  mensaje.textContent = '';
  lista.forEach((ticket) => listaTickets.appendChild(crearTarjeta(ticket)));
}


//-------------- NIVEL 2

function validarFormulario() {
  const tituloOk = inputTitulo.value.trim().length >= 5;
  const solicitanteOk = inputSolicitante.value.trim() !== '';

  errorTitulo.textContent = tituloOk ? '' : 'El título debe tener al menos 5 caracteres.';
  errorSolicitante.textContent = solicitanteOk ? '' : 'El solicitante no puede estar vacío.';

  return tituloOk && solicitanteOk;
}

function limpiarFormulario() {
  formulario.reset();
  errorTitulo.textContent = '';
  errorSolicitante.textContent = '';
}

async function crearTicket(datos) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });

  if (!res.ok) throw new Error(`No se pudo crear el ticket: ${res.status}`);

  return res.json();
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  if (!validarFormulario()) return;

  const datos = {
    titulo: inputTitulo.value.trim(),
    descripcion: inputDescripcion.value.trim(),
    solicitante: inputSolicitante.value.trim(),
    categoria: selectCategoria.value,
    prioridad: selectPrioridad.value,
  };

  try {
    if (ticketEnEdicionId === null) {
      // NIVEL 2
      datos.estado = 'abierto';
      const creado = await crearTicket(datos);
      tickets.push(creado);
    } else {
      // NIVEL 4
      const original = tickets.find((t) => t.id === ticketEnEdicionId);
      datos.estado = original.estado;

      const actualizado = await actualizarTicket(ticketEnEdicionId, datos);
      tickets = tickets.map((t) => (t.id === actualizado.id ? actualizado : t));
      salirModoEdicion();
    }

    limpiarFormulario();
    refrescar();
  } catch (error) {
    mensaje.textContent = error.message;
  }
});

// -------------- NIVEL 3

async function cambiarEstado(ticket) {
  const siguiente = ESTADOS[ticket.estado].siguiente;

  try {
    const res = await fetch(`${API_URL}/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: siguiente }),
    });

    if (!res.ok) throw new Error(`No se pudo actualizar el estado: ${res.status}`);

    const actualizado = await res.json();
    tickets = tickets.map((t) => (t.id === actualizado.id ? actualizado : t));
    refrescar();
  } catch (error) {
    mensaje.textContent = error.message;
  }
}

// -------------- NIVEL 4

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

async function actualizarTicket(id, datos) {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });

  if (!res.ok) throw new Error(`No se pudo editar el ticket: ${res.status}`);

  return res.json();
}

btnCancelar.addEventListener('click', salirModoEdicion);

// -------------- NIVEL 5 
async function eliminarTicket(ticket) {
  if (!confirm(`¿Eliminar el ticket #${ticket.id} "${ticket.titulo}"?`)) return;

  try {
    const res = await fetch(`${API_URL}/${ticket.id}`, { method: 'DELETE' });

    if (!res.ok) throw new Error(`No se pudo eliminar el ticket: ${res.status}`);

    tickets = tickets.filter((t) => t.id !== ticket.id);

    if (ticketEnEdicionId === ticket.id) salirModoEdicion();

    refrescar();
  } catch (error) {
    mensaje.textContent = error.message;
  }
}

// -------------- NIVEL 6 

function aplicarFiltros() {
  const estadoElegido = filtroEstado.value;
  const busqueda = inputBusqueda.value.trim().toLowerCase();

  const filtrados = tickets.filter((ticket) => {
    const coincideEstado = estadoElegido === 'todos' || ticket.estado === estadoElegido;
    const coincideTitulo = ticket.titulo.toLowerCase().includes(busqueda);
    return coincideEstado && coincideTitulo;
  });

  renderizarTickets(filtrados);
}

function renderizarResumen() {
  const contar = (estado) => tickets.filter((t) => t.estado === estado).length;
  const altasPendientes = tickets.filter((t) => t.prioridad === 'alta' && t.estado !== 'resuelto').length;

  resumen.textContent =
    `Abiertos: ${contar('abierto')} · ` +
    `En progreso: ${contar('en_progreso')} · ` +
    `Resueltos: ${contar('resuelto')} · ` +
    `Prioridad alta sin resolver: ${altasPendientes}`;
}

filtroEstado.addEventListener('change', aplicarFiltros);
inputBusqueda.addEventListener('input', aplicarFiltros);


listaTickets.classList.add('grid', 'grid-cols-1', 'md:grid-cols-2', 'gap-4');

cargarTickets();
