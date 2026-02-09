// 1. CONFIGURACIÓN FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyD03j-v-L3pckYW-GC2YfmKI3E08i1atx0",
    authDomain: "conafe-muvn.firebaseapp.com",
    projectId: "conafe-muvn",
    storageBucket: "conafe-muvn.firebasestorage.app",
    messagingSenderId: "149350241710",
    appId: "1:149350241710:web:59a48078b4f1c4fa33643f"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// 2. VARIABLES GLOBALES
let currentUser = null;
let comunidades = [];
let usuarios = [];
let mapaGlobal = null;
let currentSection = 'dashboard';

// 3. INICIALIZACIÓN DEL SISTEMA
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    verificarAutenticacion();
    
    // Inicializar componentes
    inicializarFirestore();
    cargarComunidades();
    cargarEstadisticas();
    inicializarEventos();
    
    // Configurar DataTables español
    $.extend($.fn.dataTable.defaults, {
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-MX.json'
        }
    });
});

// 4. AUTENTICACIÓN
function verificarAutenticacion() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            document.getElementById('navbarNav').classList.remove('d-none');
            cargarSeccion('dashboard');
        } else {
            // Mostrar login
            mostrarLogin();
        }
    });
}

function mostrarLogin() {
    const contenido = `
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-6 col-lg-4">
                    <div class="card shadow">
                        <div class="card-header bg-primary text-white text-center">
                            <h4><i class="fas fa-chalkboard-teacher"></i> CONAFE Admin</h4>
                        </div>
                        <div class="card-body p-4">
                            <div class="text-center mb-4">
                                <img src="https://cdn-icons-png.flaticon.com/512/3067/3067256.png" 
                                     alt="Logo CONAFE" 
                                     style="width: 80px; height: 80px;">
                                <h5 class="mt-3">Panel de Administración</h5>
                                <p class="text-muted">Ingresa con tus credenciales</p>
                            </div>
                            <form id="loginForm">
                                <div class="mb-3">
                                    <label for="email" class="form-label">Email</label>
                                    <input type="email" class="form-control" id="email" 
                                           placeholder="admin@conafe.mx" required>
                                </div>
                                <div class="mb-3">
                                    <label for="password" class="form-label">Contraseña</label>
                                    <input type="password" class="form-control" id="password" 
                                           placeholder="••••••••" required>
                                </div>
                                <div class="d-grid gap-2">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
                                    </button>
                                </div>
                            </form>
                            <div class="text-center mt-3">
                                <button class="btn btn-link" onclick="crearCuentaAdmin()">
                                    Crear cuenta de administrador
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('contenido-dinamico').innerHTML = contenido;
    document.getElementById('navbarNav').classList.add('d-none');
    document.getElementById('sidebarMenu').classList.add('d-none');
    
    // Configurar formulario de login
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        iniciarSesion();
    });
}

async function iniciarSesion() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        
        // Verificar si es administrador
        const adminDoc = await db.collection('administradores').doc(currentUser.uid).get();
        if (!adminDoc.exists) {
            await auth.signOut();
            throw new Error('No tienes permisos de administrador');
        }
        
        // Cargar panel principal
        document.getElementById('navbarNav').classList.remove('d-none');
        document.getElementById('sidebarMenu').classList.remove('d-none');
        cargarSeccion('dashboard');
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
}

async function crearCuentaAdmin() {
    const email = prompt('Ingresa el email del nuevo administrador:');
    if (!email) return;
    
    const password = prompt('Ingresa la contraseña temporal:');
    if (!password) return;
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Crear documento de administrador
        await db.collection('administradores').doc(user.uid).set({
            email: email,
            nombre: 'Administrador',
            creado: new Date().toISOString(),
            activo: true,
            permisos: ['full']
        });
        
        mostrarAlerta('Cuenta de administrador creada exitosamente', 'success');
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
}

function cerrarSesion() {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
        auth.signOut().then(() => {
            currentUser = null;
            mostrarLogin();
        });
    }
}

// 5. INICIALIZACIÓN DE FIRESTORE
async function inicializarFirestore() {
    try {
        // Crear colecciones básicas si no existen
        const colecciones = ['usuarios', 'comunidades', 'asistencias', 'actividades', 'mensajes', 'configuracion'];
        
        for (const coleccion of colecciones) {
            const snapshot = await db.collection(coleccion).limit(1).get();
            if (snapshot.empty) {
                console.log(`Colección ${coleccion} inicializada`);
            }
        }
        
        // Crear configuración por defecto
        const configRef = db.collection('configuracion').doc('sistema');
        const configDoc = await configRef.get();
        
        if (!configDoc.exists) {
            await configRef.set({
                nombre: 'Sistema CONAFE Yuriria',
                municipio: 'Yuriria, Guanajuato',
                version: '2.0',
                creado: new Date().toISOString(),
                comunidades_habilitadas: true,
                modo_estricto: false,
                notificaciones_push: true
            });
        }
        
    } catch (error) {
        console.error('Error inicializando Firestore:', error);
    }
}

// 6. GESTIÓN DE COMUNIDADES
async function cargarComunidades() {
    try {
        const snapshot = await db.collection('comunidades').orderBy('nombre').get();
        comunidades = [];
        
        snapshot.forEach(doc => {
            comunidades.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Si no hay comunidades, crear algunas por defecto
        if (comunidades.length === 0) {
            await crearComunidadesPorDefecto();
            await cargarComunidades(); // Recargar
        }
        
        console.log(`${comunidades.length} comunidades cargadas`);
        
    } catch (error) {
        console.error('Error cargando comunidades:', error);
    }
}

async function crearComunidadesPorDefecto() {
    const comunidadesDefault = [
        { nombre: 'Yuriria (Cabecera Municipal)', tipo: 'urbana', activa: true },
        { nombre: 'Bocaneo (San Pedro)', tipo: 'rural', activa: true },
        { nombre: 'El Tigre', tipo: 'rural', activa: true },
        { nombre: 'Urireo', tipo: 'rural', activa: true },
        { nombre: 'Cerro Prieto', tipo: 'rural', activa: true }
    ];
    
    for (const comunidad of comunidadesDefault) {
        await db.collection('comunidades').add({
            ...comunidad,
            creado: new Date().toISOString(),
            escuelas: []
        });
    }
}

async function agregarComunidad() {
    const nombre = prompt('Nombre de la nueva comunidad:');
    if (!nombre) return;
    
    const tipo = prompt('Tipo (urbana/rural):');
    const escuelas = prompt('Nombres de escuelas (separados por coma):');
    
    try {
        await db.collection('comunidades').add({
            nombre: nombre,
            tipo: tipo || 'rural',
            activa: true,
            creado: new Date().toISOString(),
            escuelas: escuelas ? escuelas.split(',').map(e => e.trim()) : []
        });
        
        mostrarAlerta('Comunidad agregada exitosamente', 'success');
        await cargarComunidades();
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
}

// 7. CARGA DE SECCIONES DINÁMICAS
async function cargarSeccion(seccion) {
    currentSection = seccion;
    
    // Actualizar breadcrumb
    const breadcrumb = document.getElementById('breadcrumb');
    breadcrumb.innerHTML = `
        <li class="breadcrumb-item"><a href="#" onclick="cargarSeccion('dashboard')">Dashboard</a></li>
        <li class="breadcrumb-item active">${capitalize(seccion)}</li>
    `;
    
    let contenido = '';
    
    switch(seccion) {
        case 'dashboard':
            contenido = await cargarDashboard();
            break;
        case 'maestros':
            contenido = await cargarMaestros();
            break;
        case 'responsables':
            contenido = await cargarResponsables();
            break;
        case 'asistencias':
            contenido = await cargarAsistencias();
            break;
        case 'buzon':
            contenido = await cargarBuzon();
            break;
        case 'mapa':
            contenido = await cargarMapa();
            break;
        case 'estadisticas':
            contenido = await cargarEstadisticas();
            break;
        case 'alertas':
            contenido = await cargarAlertas();
            break;
        default:
            contenido = await cargarDashboard();
    }
    
    document.getElementById('contenido-dinamico').innerHTML = contenido;
    
    // Inicializar componentes específicos
    if (seccion === 'mapa') {
        inicializarMapa();
    }
    
    if (seccion === 'estadisticas') {
        inicializarGraficos();
    }
}

async function cargarDashboard() {
    const stats = await obtenerEstadisticas();
    
    return `
        <div class="fade-in">
            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="stat-card card border-primary">
                        <div class="card-body">
                            <h5 class="card-title text-muted">Usuarios Activos</h5>
                            <h2 class="card-text">${stats.totalUsuarios}</h2>
                            <p class="card-text">
                                <small class="text-success">
                                    <i class="fas fa-arrow-up"></i> ${stats.maestros} maestros
                                </small>
                            </p>
                            <i class="fas fa-users stat-icon text-primary"></i>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card card border-success">
                        <div class="card-body">
                            <h5 class="card-title text-muted">Asistencias Hoy</h5>
                            <h2 class="card-text">${stats.asistenciasHoy}</h2>
                            <p class="card-text">
                                <small class="text-muted">
                                    ${stats.entradasHoy} entradas / ${stats.salidasHoy} salidas
                                </small>
                            </p>
                            <i class="fas fa-check-circle stat-icon text-success"></i>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card card border-warning">
                        <div class="card-body">
                            <h5 class="card-title text-muted">Mensajes Nuevos</h5>
                            <h2 class="card-text">${stats.mensajesNuevos}</h2>
                            <p class="card-text">
                                <small class="text-muted">
                                    Sin leer: ${stats.mensajesSinLeer}
                                </small>
                            </p>
                            <i class="fas fa-envelope stat-icon text-warning"></i>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card card border-info">
                        <div class="card-body">
                            <h5 class="card-title text-muted">Actividades Pend.</h5>
                            <h2 class="card-text">${stats.actividadesPendientes}</h2>
                            <p class="card-text">
                                <small class="text-muted">
                                    ${stats.tareasHoy} para hoy
                                </small>
                            </p>
                            <i class="fas fa-tasks stat-icon text-info"></i>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-history"></i> Actividad Reciente</h5>
                        </div>
                        <div class="card-body">
                            <div id="actividad-reciente">
                                Cargando actividad...
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-bullhorn"></i> Acciones Rápidas</h5>
                        </div>
                        <div class="card-body">
                            <div class="d-grid gap-2">
                                <button class="btn btn-primary" onclick="cargarSeccion('maestros')">
                                    <i class="fas fa-user-plus"></i> Nuevo Maestro
                                </button>
                                <button class="btn btn-success" onclick="crearNuevaActividad()">
                                    <i class="fas fa-plus-circle"></i> Nueva Actividad
                                </button>
                                <button class="btn btn-warning" onclick="cargarSeccion('buzon')">
                                    <i class="fas fa-inbox"></i> Ver Buzón
                                </button>
                                <button class="btn btn-info" onclick="cargarSeccion('mapa')">
                                    <i class="fas fa-map-marker-alt"></i> Ver Mapa
                                </button>
                                <a href="reportes.html" target="_blank" class="btn btn-dark">
                                    <i class="fas fa-chart-bar"></i> Reportes Avanzados
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row mt-4">
                <div class="col-md-12">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-calendar-alt"></i> Calendario de Actividades</h5>
                        </div>
                        <div class="card-body">
                            <div id="calendario-actividades"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 8. FUNCIONES DE ESTADÍSTICAS
async function obtenerEstadisticas() {
    try {
        // Obtener conteo de usuarios
        const usuariosSnapshot = await db.collection('usuarios').where('activo', '==', true).get();
        const maestros = usuariosSnapshot.docs.filter(doc => doc.data().rol === 'maestro').length;
        const responsables = usuariosSnapshot.docs.filter(doc => doc.data().rol === 'responsable').length;
        
        // Obtener asistencias de hoy
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);
        
        const asistenciasSnapshot = await db.collection('asistencias')
            .where('fecha', '>=', hoy.toISOString())
            .where('fecha', '<', manana.toISOString())
            .get();
        
        const entradasHoy = asistenciasSnapshot.docs.filter(doc => doc.data().tipo === 'entrada').length;
        const salidasHoy = asistenciasSnapshot.docs.filter(doc => doc.data().tipo === 'salida').length;
        
        // Obtener mensajes sin leer
        const mensajesSnapshot = await db.collection('mensajes')
            .where('leido', '==', false)
            .get();
        
        // Obtener actividades pendientes
        const actividadesSnapshot = await db.collection('actividades')
            .where('estado', '==', 'pendiente')
            .get();
        
        const tareasHoySnapshot = await db.collection('actividades')
            .where('fecha_limite', '>=', hoy.toISOString())
            .where('fecha_limite', '<', manana.toISOString())
            .get();
        
        return {
            totalUsuarios: usuariosSnapshot.size,
            maestros: maestros,
            responsables: responsables,
            asistenciasHoy: asistenciasSnapshot.size,
            entradasHoy: entradasHoy,
            salidasHoy: salidasHoy,
            mensajesNuevos: mensajesSnapshot.size,
            mensajesSinLeer: mensajesSnapshot.size,
            actividadesPendientes: actividadesSnapshot.size,
            tareasHoy: tareasHoySnapshot.size
        };
        
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        return {
            totalUsuarios: 0,
            maestros: 0,
            responsables: 0,
            asistenciasHoy: 0,
            entradasHoy: 0,
            salidasHoy: 0,
            mensajesNuevos: 0,
            mensajesSinLeer: 0,
            actividadesPendientes: 0,
            tareasHoy: 0
        };
    }
}

// 9. FUNCIONES DE MAPA
function inicializarMapa() {
    if (!mapaGlobal) {
        mapaGlobal = L.map('mapa-global').setView([20.2139, -101.1336], 11);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(mapaGlobal);
    }
    
    // Cargar ubicaciones en tiempo real
    cargarUbicacionesTiempoReal();
}

async function cargarUbicacionesTiempoReal() {
    // Escuchar nuevas asistencias con ubicación
    db.collection('asistencias')
        .where('latitud', '!=', null)
        .where('longitud', '!=', null)
        .orderBy('fecha', 'desc')
        .limit(50)
        .onSnapshot((snapshot) => {
            // Limpiar marcadores anteriores
            mapaGlobal.eachLayer((layer) => {
                if (layer instanceof L.Marker) {
                    mapaGlobal.removeLayer(layer);
                }
            });
            
            // Agregar nuevos marcadores
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.latitud && data.longitud) {
                    const marker = L.marker([data.latitud, data.longitud]).addTo(mapaGlobal);
                    
                    let popupContent = `
                        <strong>${data.usuario_nombre || 'Usuario'}</strong><br>
                        ${data.tipo === 'entrada' ? '✅ Entrada' : '🚪 Salida'}<br>
                        ${new Date(data.fecha).toLocaleString()}<br>
                        <small>${data.ubicacion_declarada || ''}</small>
                    `;
                    
                    if (data.userRol === 'responsable') {
                        popupContent += `<br><span class="badge bg-warning">Responsable</span>`;
                    }
                    
                    marker.bindPopup(popupContent);
                }
            });
        });
}

// 10. FUNCIONES DE ACTIVIDADES Y VISTA PREVIA
async function crearNuevaActividad() {
    const modalContent = `
        <div class="modal fade" id="modalNuevaActividad" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-plus-circle"></i> Crear Nueva Actividad
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="formNuevaActividad">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Tipo de Actividad *</label>
                                        <select class="form-select" id="tipoActividad" required>
                                            <option value="">Selecciona un tipo</option>
                                            <option value="nota">Nota/Aviso</option>
                                            <option value="checklist">Checklist</option>
                                            <option value="cuestionario">Cuestionario</option>
                                            <option value="documento">Documento/PDF</option>
                                            <option value="encuesta">Encuesta</option>
                                            <option value="tarea">Tarea Especial</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Prioridad</label>
                                        <select class="form-select" id="prioridadActividad">
                                            <option value="baja">Baja</option>
                                            <option value="media" selected>Media</option>
                                            <option value="alta">Alta</option>
                                            <option value="urgente">Urgente</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Título *</label>
                                <input type="text" class="form-control" id="tituloActividad" 
                                       placeholder="Ej: Reporte Semanal de Actividades" required>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Descripción</label>
                                <textarea class="form-control" id="descripcionActividad" rows="3"
                                          placeholder="Describe la actividad..."></textarea>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Fecha Límite</label>
                                        <input type="date" class="form-control" id="fechaLimiteActividad">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Destinatarios</label>
                                        <select class="form-select" id="destinatariosActividad" multiple>
                                            <option value="todos">Todos los usuarios</option>
                                            <option value="maestros">Solo maestros</option>
                                            <option value="responsables">Solo responsables</option>
                                            <!-- Se llenará dinámicamente con usuarios específicos -->
                                        </select>
                                        <small class="text-muted">Mantén Ctrl para seleccionar múltiples</small>
                                    </div>
                                </div>
                            </div>
                            
                            <div id="camposDinamicos">
                                <!-- Se cargarán según el tipo de actividad -->
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Adjuntar Archivos</label>
                                <input type="text" class="form-control" id="urlsArchivos" 
                                       placeholder="URLs separadas por coma (PDFs, imágenes, etc.)">
                                <small class="text-muted">Ej: https://ejemplo.com/documento.pdf</small>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="guardarActividad()">
                            <i class="fas fa-save"></i> Guardar Actividad
                        </button>
                        <button type="button" class="btn btn-info" onclick="previsualizarActividad()">
                            <i class="fas fa-eye"></i> Vista Previa
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Agregar modal al body
    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('modalNuevaActividad'));
    modal.show();
    
    // Cargar destinatarios
    await cargarDestinatarios();
    
    // Configurar cambios en tipo de actividad
    document.getElementById('tipoActividad').addEventListener('change', function() {
        cargarCamposDinamicos(this.value);
    });
}

function cargarCamposDinamicos(tipo) {
    const container = document.getElementById('camposDinamicos');
    let html = '';
    
    switch(tipo) {
        case 'nota':
            html = `
                <div class="mb-3">
                    <label class="form-label">Contenido de la Nota *</label>
                    <textarea class="form-control" id="contenidoNota" rows="5" 
                              placeholder="Escribe el contenido de la nota..."></textarea>
                </div>
                <div class="mb-3">
                    <label class="form-check-label">
                        <input type="checkbox" class="form-check-input" id="notaImportante">
                        Marcar como importante
                    </label>
                </div>
            `;
            break;
            
        case 'checklist':
            html = `
                <div class="mb-3">
                    <label class="form-label">Items del Checklist (uno por línea) *</label>
                    <textarea class="form-control" id="itemsChecklist" rows="5" 
                              placeholder="Ejemplo:
1. Revisar asistencia de alumnos
2. Limpiar salón
3. Preparar material para mañana"></textarea>
                </div>
                <div class="mb-3">
                    <label class="form-label">Orden de items</label>
                    <select class="form-select" id="ordenChecklist">
                        <option value="numerico">Numérico (1, 2, 3...)</option>
                        <option value="alfabetico">Alfabético (a, b, c...)</option>
                        <option value="personalizado">Personalizado</option>
                    </select>
                </div>
            `;
            break;
            
        case 'cuestionario':
            html = `
                <div class="mb-3">
                    <label class="form-label">Preguntas (una por línea, formato: Pregunta|Tipo|Opciones) *</label>
                    <textarea class="form-control" id="preguntasCuestionario" rows="5" 
                              placeholder="Ejemplo:
¿Cómo está el grupo?|texto|
¿Asistencia de alumnos?|numero|
¿Material suficiente?|opciones|Sí,No,Parcial"></textarea>
                    <small class="text-muted">Tipos: texto, numero, opciones, fecha, si_no</small>
                </div>
            `;
            break;
            
        case 'documento':
            html = `
                <div class="mb-3">
                    <label class="form-label">Tipo de Documento</label>
                    <select class="form-select" id="tipoDocumento">
                        <option value="pdf">PDF</option>
                        <option value="word">Word</option>
                        <option value="excel">Excel</option>
                        <option value="presentacion">Presentación</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label class="form-check-label">
                        <input type="checkbox" class="form-check-input" id="permiteDescarga">
                        Permitir descarga
                    </label>
                </div>
                <div class="mb-3">
                    <label class="form-check-label">
                        <input type="checkbox" class="form-check-input" id="requiereFirma">
                        Requiere firma digital
                    </label>
                </div>
            `;
            break;
            
        case 'encuesta':
            html = `
                <div class="mb-3">
                    <label class="form-label">Opciones de Respuesta (una por línea) *</label>
                    <textarea class="form-control" id="opcionesEncuesta" rows="5" 
                              placeholder="Ejemplo:
Muy satisfecho
Satisfecho
Neutral
Insatisfecho
Muy insatisfecho"></textarea>
                </div>
                <div class="mb-3">
                    <label class="form-check-label">
                        <input type="checkbox" class="form-check-input" id="encuestaAnonima">
                        Encuesta anónima
                    </label>
                </div>
            `;
            break;
    }
    
    container.innerHTML = html;
}

async function cargarDestinatarios() {
    try {
        const snapshot = await db.collection('usuarios').where('activo', '==', true).get();
        const select = document.getElementById('destinatariosActividad');
        
        // Limpiar opciones excepto las primeras tres
        while (select.options.length > 3) {
            select.remove(3);
        }
        
        // Agregar usuarios específicos
        snapshot.forEach(doc => {
            const user = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.text = `${user.nombre} (${user.rol}) - ${user.comunidad || 'Sin comunidad'}`;
            select.add(option);
        });
        
    } catch (error) {
        console.error('Error cargando destinatarios:', error);
    }
}

function previsualizarActividad() {
    const tipo = document.getElementById('tipoActividad').value;
    const titulo = document.getElementById('tituloActividad').value;
    
    if (!tipo || !titulo) {
        mostrarAlerta('Completa el tipo y título para previsualizar', 'warning');
        return;
    }
    
    let contenidoVista = '';
    
    switch(tipo) {
        case 'nota':
            const contenido = document.getElementById('contenidoNota')?.value || '';
            const importante = document.getElementById('notaImportante')?.checked || false;
            
            contenidoVista = `
                <div class="vista-movil">
                    <div class="vista-movil-content">
                        <div style="padding: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <h4 style="margin: 0; color: #00d2ff;">${importante ? '⚠️ ' : ''}${titulo}</h4>
                                <span style="color: #888; font-size: 0.8em;">Hoy</span>
                            </div>
                            <div style="background: #1e1e1e; padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                                <p style="margin: 0; line-height: 1.5;">${contenido}</p>
                            </div>
                            <div style="text-align: center; margin-top: 20px;">
                                <button style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 10px; width: 100%;">
                                    Marcar como Leído
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'checklist':
            const items = document.getElementById('itemsChecklist')?.value.split('\n').filter(i => i.trim()) || [];
            
            contenidoVista = `
                <div class="vista-movil">
                    <div class="vista-movil-content">
                        <div style="padding: 20px;">
                            <h4 style="margin: 0 0 15px 0; color: #00d2ff;">${titulo}</h4>
                            <div style="background: #1e1e1e; padding: 15px; border-radius: 10px;">
                                ${items.map((item, index) => `
                                    <div style="display: flex; align-items: center; margin-bottom: 10px; padding: 10px; background: #2a2a2a; border-radius: 5px;">
                                        <input type="checkbox" style="margin-right: 10px;" id="item-${index}">
                                        <label for="item-${index}" style="flex: 1; margin: 0;">${item.trim()}</label>
                                    </div>
                                `).join('')}
                            </div>
                            <div style="text-align: center; margin-top: 20px;">
                                <button style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 10px; width: 100%;">
                                    Enviar Checklist Completado
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'documento':
            const urls = document.getElementById('urlsArchivos')?.value.split(',').filter(u => u.trim()) || [];
            
            contenidoVista = `
                <div class="vista-movil">
                    <div class="vista-movil-content">
                        <div style="padding: 20px;">
                            <h4 style="margin: 0 0 15px 0; color: #00d2ff;">${titulo}</h4>
                            <div style="background: #1e1e1e; padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                                <p style="margin: 0 0 10px 0; color: #aaa;">Documentos adjuntos:</p>
                                ${urls.map((url, index) => `
                                    <div style="display: flex; align-items: center; margin-bottom: 10px; padding: 10px; background: #2a2a2a; border-radius: 5px;">
                                        <i class="fas fa-file-pdf" style="color: #ff4444; margin-right: 10px;"></i>
                                        <div style="flex: 1;">
                                            <div style="font-weight: bold;">Documento ${index + 1}</div>
                                            <div style="font-size: 0.8em; color: #888;">${url.trim()}</div>
                                        </div>
                                        <button style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 5px; font-size: 0.8em;">
                                            Descargar
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                            <div style="text-align: center;">
                                <button style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 10px; width: 100%; margin-bottom: 10px;">
                                    <i class="fas fa-print"></i> Imprimir Documentos
                                </button>
                                <button style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 10px; width: 100%;">
                                    Confirmar Recepción
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            break;
    }
    
    // Mostrar en modal de vista previa
    document.getElementById('vista-movil-contenido').innerHTML = contenidoVista;
    
    const infoActividad = `
        <div class="alert alert-info">
            <strong>Tipo:</strong> ${tipo}<br>
            <strong>Título:</strong> ${titulo}<br>
            <strong>Fecha:</strong> ${new Date().toLocaleDateString()}<br>
            <strong>Vista:</strong> Modo oscuro (default en app)
        </div>
        <p class="small text-muted">
            Esta es una simulación de cómo se verá la actividad en la aplicación móvil de los usuarios.
            Los botones son funcionales en la app real.
        </p>
    `;
    
    document.getElementById('info-actividad').innerHTML = infoActividad;
    
    const modal = new bootstrap.Modal(document.getElementById('modalVistaPrevia'));
    modal.show();
}

function actualizarVistaPrevia() {
    // Recargar la vista previa con nuevas configuraciones
    previsualizarActividad();
}

async function guardarActividad() {
    const tipo = document.getElementById('tipoActividad').value;
    const titulo = document.getElementById('tituloActividad').value;
    const prioridad = document.getElementById('prioridadActividad').value;
    const descripcion = document.getElementById('descripcionActividad').value;
    const fechaLimite = document.getElementById('fechaLimiteActividad').value;
    const destinatarios = Array.from(document.getElementById('destinatariosActividad').selectedOptions).map(o => o.value);
    const urlsArchivos = document.getElementById('urlsArchivos').value.split(',').filter(u => u.trim());
    
    if (!tipo || !titulo) {
        mostrarAlerta('Completa los campos obligatorios', 'warning');
        return;
    }
    
    try {
        const actividadData = {
            tipo: tipo,
            titulo: titulo,
            prioridad: prioridad,
            descripcion: descripcion,
            fecha_creacion: new Date().toISOString(),
            fecha_limite: fechaLimite || null,
            destinatarios: destinatarios,
            urls_archivos: urlsArchivos,
            estado: 'pendiente',
            creador: currentUser.uid,
            creador_nombre: currentUser.email
        };
        
        // Agregar datos específicos según el tipo
        switch(tipo) {
            case 'nota':
                actividadData.contenido = document.getElementById('contenidoNota').value;
                actividadData.importante = document.getElementById('notaImportante')?.checked || false;
                break;
                
            case 'checklist':
                const itemsText = document.getElementById('itemsChecklist').value;
                actividadData.items = itemsText.split('\n')
                    .filter(item => item.trim())
                    .map((item, index) => ({
                        id: index + 1,
                        texto: item.trim(),
                        completado: false
                    }));
                actividadData.orden = document.getElementById('ordenChecklist').value;
                break;
                
            case 'cuestionario':
                const preguntasText = document.getElementById('preguntasCuestionario').value;
                actividadData.preguntas = preguntasText.split('\n')
                    .filter(p => p.trim())
                    .map((p, index) => {
                        const partes = p.split('|');
                        return {
                            id: index + 1,
                            pregunta: partes[0]?.trim() || '',
                            tipo: partes[1]?.trim() || 'texto',
                            opciones: partes[2]?.split(',').map(o => o.trim()) || []
                        };
                    });
                break;
                
            case 'documento':
                actividadData.tipo_documento = document.getElementById('tipoDocumento').value;
                actividadData.permite_descarga = document.getElementById('permiteDescarga')?.checked || false;
                actividadData.requiere_firma = document.getElementById('requiereFirma')?.checked || false;
                break;
                
            case 'encuesta':
                const opcionesText = document.getElementById('opcionesEncuesta').value;
                actividadData.opciones = opcionesText.split('\n')
                    .filter(o => o.trim())
                    .map(o => o.trim());
                actividadData.anonima = document.getElementById('encuestaAnonima')?.checked || false;
                break;
        }
        
        // Guardar en Firestore
        await db.collection('actividades').add(actividadData);
        
        // Cerrar modal
        bootstrap.Modal.getInstance(document.getElementById('modalNuevaActividad')).hide();
        
        // Mostrar éxito
        mostrarAlerta('Actividad creada exitosamente', 'success');
        
        // Recargar sección actual
        cargarSeccion(currentSection);
        
    } catch (error) {
        mostrarAlerta('Error al guardar actividad: ' + error.message, 'danger');
    }
}

// 11. FUNCIONES DE UTILIDAD
function mostrarAlerta(mensaje, tipo) {
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
    alerta.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;
    
    alerta.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alerta);
    
    setTimeout(() => {
        if (alerta.parentNode) {
            alerta.classList.remove('show');
            setTimeout(() => alerta.remove(), 150);
        }
    }, 5000);
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function inicializarEventos() {
    // Toggle sidebar en móviles
    document.querySelector('.navbar-toggler').addEventListener('click', function() {
        document.getElementById('sidebarMenu').classList.toggle('show');
        document.querySelector('.sidebar-backdrop')?.classList.toggle('show');
    });
    
    // Crear backdrop para sidebar
    const backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    backdrop.addEventListener('click', function() {
        document.getElementById('sidebarMenu').classList.remove('show');
        this.classList.remove('show');
    });
    document.querySelector('main').before(backdrop);
}

// 12. FUNCIONES DE EXPORTACIÓN E IMPORTACIÓN
async function exportarTodo() {
    try {
        // Obtener todos los datos
        const [usuariosSnap, comunidadesSnap, asistenciasSnap, actividadesSnap] = await Promise.all([
            db.collection('usuarios').get(),
            db.collection('comunidades').get(),
            db.collection('asistencias').limit(1000).get(),
            db.collection('actividades').get()
        ]);
        
        const data = {
            usuarios: usuariosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            comunidades: comunidadesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            asistencias: asistenciasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            actividades: actividadesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            exportado: new Date().toISOString(),
            version: '1.0'
        };
        
        // Crear archivo JSON
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Crear enlace de descarga
        const a = document.createElement('a');
        a.href = url;
        a.download = `conafe_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        mostrarAlerta('Exportación completada exitosamente', 'success');
        
    } catch (error) {
        mostrarAlerta('Error en exportación: ' + error.message, 'danger');
    }
}

function abrirImportador() {
    const modalContent = `
        <div class="modal fade" id="modalImportar" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-warning text-dark">
                        <h5 class="modal-title">
                            <i class="fas fa-file-import"></i> Importar Datos
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle"></i> Importa datos desde un archivo JSON previamente exportado.
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Seleccionar Archivo JSON</label>
                            <input type="file" class="form-control" id="fileImport" accept=".json">
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Tipo de Importación</label>
                            <select class="form-select" id="tipoImport">
                                <option value="completo">Completo (reemplazar todo)</option>
                                <option value="usuarios">Solo usuarios</option>
                                <option value="comunidades">Solo comunidades</option>
                                <option value="actividades">Solo actividades</option>
                            </select>
                        </div>
                        
                        <div class="form-check mb-3">
                            <input class="form-check-input" type="checkbox" id="backupPrevio">
                            <label class="form-check-label" for="backupPrevio">
                                Crear backup automático antes de importar
                            </label>
                        </div>
                        
                        <div id="previewImport" class="d-none">
                            <h6>Vista Previa:</h6>
                            <pre style="max-height: 200px; overflow: auto; background: #f8f9fa; padding: 10px; border-radius: 5px;"></pre>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-warning" onclick="importarDatos()" id="btnImportar" disabled>
                            <i class="fas fa-upload"></i> Importar Datos
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    const modal = new bootstrap.Modal(document.getElementById('modalImportar'));
    modal.show();
    
    // Configurar evento de archivo
    document.getElementById('fileImport').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    document.getElementById('previewImport').classList.remove('d-none');
                    document.getElementById('previewImport').querySelector('pre').textContent = 
                        JSON.stringify(data, null, 2).substring(0, 1000) + '...';
                    document.getElementById('btnImportar').disabled = false;
                } catch (error) {
                    mostrarAlerta('Archivo JSON inválido', 'danger');
                }
            };
            reader.readAsText(file);
        }
    });
}

// 13. INICIALIZACIÓN DE GRÁFICOS
function inicializarGraficos() {
    // Gráfico de asistencias por día
    const ctx = document.getElementById('chartAsistencias');
    if (ctx) {
        new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
                datasets: [{
                    label: 'Entradas',
                    data: [12, 19, 15, 17, 14, 8, 10],
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }, {
                    label: 'Salidas',
                    data: [10, 15, 13, 16, 12, 6, 9],
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Asistencias por Día (Última Semana)'
                    }
                }
            }
        });
    }
}

// 14. CARGAR OTRAS SECCIONES (simplificadas)
async function cargarMaestros() {
    return `
        <div class="fade-in">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h3><i class="fas fa-user-graduate"></i> Gestión de Maestros</h3>
                <button class="btn btn-primary" onclick="abrirModalNuevoUsuario('maestro')">
                    <i class="fas fa-plus"></i> Nuevo Maestro
                </button>
            </div>
            
            <div class="card">
                <div class="card-body">
                    <table class="table table-hover" id="tablaMaestros">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Comunidad</th>
                                <th>Teléfono</th>
                                <th>Estado</th>
                                <th>Última Actividad</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tbodyMaestros">
                            <tr><td colspan="6" class="text-center">Cargando maestros...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

async function cargarBuzon() {
    return `
        <div class="fade-in">
            <h3><i class="fas fa-inbox"></i> Buzón de Mensajes</h3>
            
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="input-group">
                        <input type="text" class="form-control" placeholder="Buscar en mensajes...">
                        <button class="btn btn-primary" type="button">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                </div>
                <div class="col-md-6 text-end">
                    <div class="btn-group">
                        <button class="btn btn-outline-primary" onclick="filtrarMensajes('todos')">Todos</button>
                        <button class="btn btn-outline-warning" onclick="filtrarMensajes('sin_leer')">Sin Leer</button>
                        <button class="btn btn-outline-success" onclick="filtrarMensajes('respondidos')">Respondidos</button>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-body" id="contenidoBuzon">
                    Cargando mensajes...
                </div>
            </div>
        </div>
    `;
}

// Función para inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdmin);
} else {
    initializeAdmin();
}

async function initializeAdmin() {
    console.log('Sistema CONAFE Admin inicializando...');
    // La inicialización principal ya está en DOMContentLoaded
}