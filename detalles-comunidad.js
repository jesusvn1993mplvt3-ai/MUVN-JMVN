// detalles-comunidad.js - Funciones para la página de detalles de comunidad

let comunidadData = null;
let mapaComunidad = null;
let markerComunidad = null;
let chartAsistencias = null;

// Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD03j-v-L3pckYW-GC2YfmKI3E08i1atx0",
    authDomain: "conafe-muvn.firebaseapp.com",
    projectId: "conafe-muvn",
    storageBucket: "conafe-muvn.firebasestorage.app",
    messagingSenderId: "149350241710",
    appId: "1:149350241710:web:59a48078b4f1c4fa33643f"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Obtener ID de comunidad de la URL
function getComunidadId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Cargar datos de la comunidad
async function cargarComunidad(comunidadId) {
    try {
        const doc = await db.collection('comunidades').doc(comunidadId).get();
        
        if (!doc.exists) {
            mostrarAlerta('Comunidad no encontrada', 'danger');
            setTimeout(() => window.location.href = 'comunidades.html', 2000);
            return;
        }
        
        comunidadData = {
            id: doc.id,
            ...doc.data()
        };
        
        // Actualizar UI
        actualizarUIComunidad();
        
    } catch (error) {
        console.error('Error cargando comunidad:', error);
        mostrarAlerta('Error al cargar comunidad: ' + error.message, 'danger');
    }
}

function actualizarUIComunidad() {
    if (!comunidadData) return;
    
    // Actualizar header
    document.getElementById('breadcrumbNombre').textContent = comunidadData.nombre;
    document.getElementById('comunidadNombre').textContent = comunidadData.nombre;
    
    // Actualizar badges
    const badgesContainer = document.getElementById('comunidadBadges');
    badgesContainer.innerHTML = '';
    
    const tipoBadge = document.createElement('span');
    tipoBadge.className = `badge ${comunidadData.tipo === 'urbana' ? 'bg-primary' : 'bg-warning'}`;
    tipoBadge.textContent = comunidadData.tipo || 'Sin tipo';
    badgesContainer.appendChild(tipoBadge);
    
    if (comunidadData.activa !== false) {
        const activaBadge = document.createElement('span');
        activaBadge.className = 'badge bg-success';
        activaBadge.textContent = 'Activa';
        badgesContainer.appendChild(activaBadge);
    } else {
        const inactivaBadge = document.createElement('span');
        inactivaBadge.className = 'badge bg-danger';
        inactivaBadge.textContent = 'Inactiva';
        badgesContainer.appendChild(inactivaBadge);
    }
    
    // Actualizar información general
    document.getElementById('infoMunicipio').textContent = comunidadData.municipio || 'Yuriria';
    document.getElementById('infoTipoVia').textContent = comunidadData.tipo_via || 'No especificado';
    document.getElementById('infoPoblacion').textContent = comunidadData.poblacion ? 
        comunidadData.poblacion.toLocaleString() : 'No especificada';
    document.getElementById('infoFundacion').textContent = comunidadData.fundacion || 'No especificada';
    document.getElementById('infoObservaciones').textContent = comunidadData.observaciones || 'Sin observaciones';
    
    // Actualizar escuelas
    const escuelasContainer = document.getElementById('escuelasList');
    if (comunidadData.escuelas && Array.isArray(comunidadData.escuelas) && comunidadData.escuelas.length > 0) {
        escuelasContainer.innerHTML = '';
        comunidadData.escuelas.forEach(escuela => {
            const badge = document.createElement('span');
            badge.className = 'school-badge';
            badge.textContent = escuela;
            escuelasContainer.appendChild(badge);
        });
    } else {
        escuelasContainer.innerHTML = '<span class="text-muted">No hay escuelas registradas</span>';
    }
    
    // Actualizar descripción
    document.getElementById('comunidadDescripcion').textContent = 
        comunidadData.descripcion || `Comunidad en ${comunidadData.municipio || 'Yuriria'}`;
}

// Cargar estadísticas
async function cargarEstadisticas(comunidadId) {
    try {
        // Contar maestros en esta comunidad
        const maestrosSnapshot = await db.collection('usuarios')
            .where('rol', '==', 'maestro')
            .where('comunidad_id', '==', comunidadId)
            .where('activo', '==', true)
            .get();
        
        // Contar responsables que visitan esta comunidad
        const responsablesSnapshot = await db.collection('usuarios')
            .where('rol', '==', 'responsable')
            .where('comunidades_ids', 'array-contains', comunidadId)
            .where('activo', '==', true)
            .get();
        
        // Contar asistencias este mes
        const hoy = new Date();
        const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        
        const asistenciasSnapshot = await db.collection('asistencias')
            .where('comunidad_id', '==', comunidadId)
            .where('fecha', '>=', primerDiaMes.toISOString())
            .get();
        
        // Contar actividades pendientes
        const actividadesSnapshot = await db.collection('actividades')
            .where('comunidad_id', '==', comunidadId)
            .where('estado', '==', 'pendiente')
            .get();
        
        // Actualizar UI
        document.getElementById('totalMaestros').textContent = maestrosSnapshot.size;
        document.getElementById('totalResponsables').textContent = responsablesSnapshot.size;
        document.getElementById('asistenciasMes').textContent = asistenciasSnapshot.size;
        document.getElementById('actividadesPend').textContent = actividadesSnapshot.size;
        document.getElementById('escuelasCount').textContent = 
            (comunidadData.escuelas && Array.isArray(comunidadData.escuelas)) ? 
            comunidadData.escuelas.length : 0;
        
        // Actualizar badge de maestros
        document.getElementById('badgeMaestros').textContent = maestrosSnapshot.size;
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// Cargar maestros asignados
async function cargarMaestros(comunidadId) {
    try {
        const snapshot = await db.collection('usuarios')
            .where('rol', '==', 'maestro')
            .where('comunidad_id', '==', comunidadId)
            .where('activo', '==', true)
            .orderBy('nombre')
            .get();
        
        const tbody = document.getElementById('tbodyMaestros');
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="alert alert-info mb-0">
                            <i class="fas fa-info-circle me-2"></i>
                            No hay maestros asignados a esta comunidad
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        snapshot.forEach(doc => {
            const maestro = doc.data();
            const fechaAsignacion = maestro.fecha_asignacion || maestro.created_at;
            const fecha = fechaAsignacion ? 
                new Date(fechaAsignacion).toLocaleDateString('es-MX') : 
                'No especificada';
            
            // Contar asistencias últimos 30 días
            const hace30Dias = new Date();
            hace30Dias.setDate(hace30Dias.getDate() - 30);
            
            // Esta consulta se haría en un caso real
            const asistencias30d = 0; // Placeholder
            
            const row = `
                <tr>
                    <td>
                        <strong>${maestro.nombre}</strong><br>
                        <small class="text-muted">${maestro.email || ''}</small>
                    </td>
                    <td>${maestro.telefono || 'No especificado'}</td>
                    <td>${fecha}</td>
                    <td>
                        <span class="badge bg-success">Activo</span>
                    </td>
                    <td>
                        <div class="progress" style="height: 8px;">
                            <div class="progress-bar bg-success" style="width: 80%"></div>
                        </div>
                        <small>${asistencias30d} días</small>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="verMaestro('${doc.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-warning" onclick="editarMaestroComunidad('${doc.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
            
            tbody.innerHTML += row;
        });
        
    } catch (error) {
        console.error('Error cargando maestros:', error);
        document.getElementById('tbodyMaestros').innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    Error al cargar maestros: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Cargar responsables que visitan
async function cargarResponsables(comunidadId) {
    try {
        const snapshot = await db.collection('usuarios')
            .where('rol', '==', 'responsable')
            .where('comunidades_ids', 'array-contains', comunidadId)
            .where('activo', '==', true)
            .orderBy('nombre')
            .get();
        
        const container = document.getElementById('responsablesGrid');
        container.innerHTML = '';
        
        if (snapshot.empty) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        No hay responsables que visiten esta comunidad
                    </div>
                </div>
            `;
            return;
        }
        
        snapshot.forEach(doc => {
            const responsable = doc.data();
            
            const card = `
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="card h-100">
                        <div class="card-body">
                            <div class="d-flex align-items-start mb-3">
                                <div class="flex-shrink-0">
                                    <div class="bg-warning text-white rounded-circle d-flex align-items-center justify-content-center" 
                                         style="width: 40px; height: 40px;">
                                        <i class="fas fa-user-tie"></i>
                                    </div>
                                </div>
                                <div class="flex-grow-1 ms-3">
                                    <h6 class="mb-1">${responsable.nombre}</h6>
                                    <small class="text-muted">${responsable.email || ''}</small>
                                </div>
                            </div>
                            <div class="small">
                                <div class="mb-1">
                                    <i class="fas fa-phone me-2"></i>
                                    ${responsable.telefono || 'No especificado'}
                                </div>
                                <div class="mb-1">
                                    <i class="fas fa-calendar-alt me-2"></i>
                                    Última visita: Hace 2 días
                                </div>
                                <div>
                                    <i class="fas fa-chart-line me-2"></i>
                                    Visitas totales: 12
                                </div>
                            </div>
                        </div>
                        <div class="card-footer bg-transparent">
                            <button class="btn btn-sm btn-outline-primary w-100" onclick="contactarResponsable('${doc.id}')">
                                <i class="fas fa-envelope me-1"></i> Contactar
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            container.innerHTML += card;
        });
        
    } catch (error) {
        console.error('Error cargando responsables:', error);
    }
}

// Cargar asistencias
async function cargarAsistencias(comunidadId) {
    try {
        const snapshot = await db.collection('asistencias')
            .where('comunidad_id', '==', comunidadId)
            .orderBy('fecha', 'desc')
            .limit(50)
            .get();
        
        const tbody = document.getElementById('tbodyAsistencias');
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="alert alert-info mb-0">
                            <i class="fas fa-info-circle me-2"></i>
                            No hay registros de asistencia para esta comunidad
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        snapshot.forEach(doc => {
            const asistencia = doc.data();
            const fecha = new Date(asistencia.fecha);
            
            const gpsLink = (asistencia.latitud && asistencia.longitud) ? 
                `<a href="https://maps.google.com/?q=${asistencia.latitud},${asistencia.longitud}" 
                   target="_blank" class="btn btn-sm btn-outline-info">
                    <i class="fas fa-map-marker-alt"></i>
                </a>` : 
                '<span class="badge bg-secondary">Sin GPS</span>';
            
            const tipoBadge = asistencia.tipo === 'entrada' ? 
                '<span class="badge bg-success">Entrada</span>' : 
                '<span class="badge bg-danger">Salida</span>';
            
            const rolBadge = asistencia.userRole === 'responsable' ? 
                '<span class="badge bg-warning">Responsable</span>' : 
                '<span class="badge bg-primary">Maestro</span>';
            
            const row = `
                <tr>
                    <td>${fecha.toLocaleDateString('es-MX')} ${fecha.toLocaleTimeString('es-MX', {hour12: false})}</td>
                    <td>${asistencia.usuario_nombre || 'Usuario'}</td>
                    <td>${tipoBadge}</td>
                    <td>${rolBadge}</td>
                    <td>${asistencia.ubicacion_declarada || 'No especificada'}</td>
                    <td>${gpsLink}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="verDetalleAsistencia('${doc.id}')">
                            <i class="fas fa-search"></i>
                        </button>
                    </td>
                </tr>
            `;
            
            tbody.innerHTML += row;
        });
        
    } catch (error) {
        console.error('Error cargando asistencias:', error);
        document.getElementById('tbodyAsistencias').innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    Error al cargar asistencias: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Filtrar asistencias
async function filtrarAsistencias() {
    const fecha = document.getElementById('filtroFechaAsistencia').value;
    const tipo = document.getElementById('filtroTipoAsistencia').value;
    const comunidadId = getComunidadId();
    
    let query = db.collection('asistencias')
        .where('comunidad_id', '==', comunidadId);
    
    if (fecha) {
        const fechaInicio = new Date(fecha);
        const fechaFin = new Date(fecha);
        fechaFin.setDate(fechaFin.getDate() + 1);
        
        query = query.where('fecha', '>=', fechaInicio.toISOString())
                    .where('fecha', '<', fechaFin.toISOString());
    }
    
    if (tipo !== 'todos') {
        query = query.where('tipo', '==', tipo);
    }
    
    query = query.orderBy('fecha', 'desc').limit(50);
    
    try {
        const snapshot = await query.get();
        const tbody = document.getElementById('tbodyAsistencias');
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        No hay registros con los filtros seleccionados
                    </td>
                </tr>
            `;
            return;
        }
        
        snapshot.forEach(doc => {
            const asistencia = doc.data();
            const fechaObj = new Date(asistencia.fecha);
            
            const gpsLink = (asistencia.latitud && asistencia.longitud) ? 
                `<a href="https://maps.google.com/?q=${asistencia.latitud},${asistencia.longitud}" 
                   target="_blank" class="btn btn-sm btn-outline-info">
                    <i class="fas fa-map-marker-alt"></i>
                </a>` : 
                '<span class="badge bg-secondary">Sin GPS</span>';
            
            const tipoBadge = asistencia.tipo === 'entrada' ? 
                '<span class="badge bg-success">Entrada</span>' : 
                '<span class="badge bg-danger">Salida</span>';
            
            const rolBadge = asistencia.userRole === 'responsable' ? 
                '<span class="badge bg-warning">Responsable</span>' : 
                '<span class="badge bg-primary">Maestro</span>';
            
            const row = `
                <tr>
                    <td>${fechaObj.toLocaleDateString('es-MX')} ${fechaObj.toLocaleTimeString('es-MX', {hour12: false})}</td>
                    <td>${asistencia.usuario_nombre || 'Usuario'}</td>
                    <td>${tipoBadge}</td>
                    <td>${rolBadge}</td>
                    <td>${asistencia.ubicacion_declarada || 'No especificada'}</td>
                    <td>${gpsLink}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="verDetalleAsistencia('${doc.id}')">
                            <i class="fas fa-search"></i>
                        </button>
                    </td>
                </tr>
            `;
            
            tbody.innerHTML += row;
        });
        
    } catch (error) {
        console.error('Error filtrando asistencias:', error);
        mostrarAlerta('Error al filtrar: ' + error.message, 'danger');
    }
}

// Cargar actividades
async function cargarActividades(comunidadId) {
    try {
        const snapshot = await db.collection('actividades')
            .where('comunidad_id', '==', comunidadId)
            .orderBy('fecha_limite', 'asc')
            .limit(10)
            .get();
        
        const container = document.getElementById('actividadesGrid');
        container.innerHTML = '';
        
        if (snapshot.empty) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        No hay actividades relacionadas con esta comunidad
                    </div>
                </div>
            `;
            return;
        }
        
        snapshot.forEach(doc => {
            const actividad = doc.data();
            const fechaLimite = new Date(actividad.fecha_limite);
            const hoy = new Date();
            const diasRestantes = Math.ceil((fechaLimite - hoy) / (1000 * 60 * 60 * 24));
            
            let prioridadBadge = '';
            switch(actividad.prioridad) {
                case 'urgente': prioridadBadge = '<span class="badge bg-danger">Urgente</span>'; break;
                case 'alta': prioridadBadge = '<span class="badge bg-warning">Alta</span>'; break;
                case 'media': prioridadBadge = '<span class="badge bg-info">Media</span>'; break;
                default: prioridadBadge = '<span class="badge bg-secondary">Baja</span>';
            }
            
            let estadoBadge = '';
            switch(actividad.estado) {
                case 'completado': estadoBadge = '<span class="badge bg-success">Completado</span>'; break;
                case 'en_progreso': estadoBadge = '<span class="badge bg-primary">En progreso</span>'; break;
                case 'pendiente': estadoBadge = '<span class="badge bg-warning">Pendiente</span>'; break;
                default: estadoBadge = '<span class="badge bg-secondary">Sin estado</span>';
            }
            
            const card = `
                <div class="col-md-6 mb-3">
                    <div class="card h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h6 class="card-title mb-0">${actividad.titulo}</h6>
                                ${prioridadBadge}
                            </div>
                            <p class="card-text small text-muted">${actividad.descripcion || 'Sin descripción'}</p>
                            <div class="d-flex justify-content-between align-items-center mt-3">
                                <div>
                                    <small class="text-muted">
                                        <i class="far fa-calendar me-1"></i>
                                        ${fechaLimite.toLocaleDateString('es-MX')}
                                    </small>
                                    ${diasRestantes < 0 ? 
                                        '<span class="badge bg-danger ms-2">Vencido</span>' : 
                                        `<small class="text-muted ms-2">(${diasRestantes} días)</small>`}
                                </div>
                                ${estadoBadge}
                            </div>
                        </div>
                        <div class="card-footer bg-transparent">
                            <button class="btn btn-sm btn-outline-primary" onclick="verActividad('${doc.id}')">
                                <i class="fas fa-eye me-1"></i> Ver
                            </button>
                            <button class="btn btn-sm btn-outline-warning" onclick="editarActividadComunidad('${doc.id}')">
                                <i class="fas fa-edit me-1"></i> Editar
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            container.innerHTML += card;
        });
        
    } catch (error) {
        console.error('Error cargando actividades:', error);
    }
}

// Inicializar mapa
function inicializarMapa() {
    const container = document.getElementById('comunidadMap');
    
    if (!comunidadData) {
        container.innerHTML = `
            <div class="text-center py-5">
                <div class="location-marker mx-auto mb-3">
                    <i class="fas fa-map-marker-alt"></i>
                </div>
                <h5>Ubicación no especificada</h5>
                <p class="text-muted">Esta comunidad no tiene coordenadas GPS registradas</p>
                <button class="btn btn-primary" onclick="agregarUbicacion()">
                    <i class="fas fa-plus me-1"></i> Agregar Ubicación
                </button>
            </div>
        `;
        return;
    }
    
    // Si hay coordenadas, mostrar mapa
    if (comunidadData.latitud && comunidadData.longitud) {
        // Limpiar contenedor
        container.innerHTML = '';
        
        // Crear mapa
        mapaComunidad = L.map('comunidadMap').setView(
            [comunidadData.latitud, comunidadData.longitud], 
            14
        );
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(mapaComunidad);
        
        // Agregar marcador
        markerComunidad = L.marker([comunidadData.latitud, comunidadData.longitud])
            .addTo(mapaComunidad)
            .bindPopup(`<strong>${comunidadData.nombre}</strong><br>${comunidadData.municipio || 'Yuriria'}`)
            .openPopup();
        
        // Agregar círculo de precisión si hay
        if (comunidadData.precision) {
            L.circle([comunidadData.latitud, comunidadData.longitud], {
                radius: comunidadData.precision,
                fillColor: '#0066cc',
                fillOpacity: 0.2,
                color: '#0066cc'
            }).addTo(mapaComunidad);
        }
        
        // Actualizar información de ubicación
        document.getElementById('ubicacionInfo').innerHTML = `
            <div class="mb-2">
                <strong>Coordenadas:</strong><br>
                <code>${comunidadData.latitud}, ${comunidadData.longitud}</code>
            </div>
            <div class="mb-2">
                <strong>Precisión:</strong><br>
                ${comunidadData.precision ? `${comunidadData.precision.toFixed(1)} metros` : 'No especificada'}
            </div>
            <div class="mb-2">
                <strong>Última actualización:</strong><br>
                ${comunidadData.ubicacion_actualizada ? 
                    new Date(comunidadData.ubicacion_actualizada).toLocaleDateString('es-MX') : 
                    'No especificada'}
            </div>
            <div class="d-grid gap-2 mt-3">
                <button class="btn btn-sm btn-outline-primary" onclick="verEnGoogleMaps()">
                    <i class="fas fa-external-link-alt me-1"></i> Ver en Google Maps
                </button>
                <button class="btn btn-sm btn-outline-warning" onclick="agregarUbicacion()">
                    <i class="fas fa-edit me-1"></i> Editar Ubicación
                </button>
            </div>
        `;
        
    } else {
        // No hay coordenadas
        container.innerHTML = `
            <div class="text-center py-5">
                <div class="location-marker mx-auto mb-3">
                    <i class="fas fa-map-marker-alt"></i>
                </div>
                <h5>Ubicación no especificada</h5>
                <p class="text-muted">Esta comunidad no tiene coordenadas GPS registradas</p>
                <button class="btn btn-primary" onclick="agregarUbicacion()">
                    <i class="fas fa-plus me-1"></i> Agregar Ubicación
                </button>
            </div>
        `;
        
        document.getElementById('ubicacionInfo').innerHTML = `
            <p class="text-muted">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Esta comunidad no tiene ubicación GPS registrada. 
                Agrega coordenadas para habilitar el mapa y funciones de geolocalización.
            </p>
        `;
    }
}

// Inicializar gráficos
function inicializarGraficos() {
    const ctx = document.getElementById('asistenciasChart').getContext('2d');
    
    // Datos de ejemplo
    const data = {
        labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
        datasets: [{
            label: 'Entradas',
            data: [12, 15, 8, 17, 14, 5, 10],
            backgroundColor: 'rgba(40, 167, 69, 0.5)',
            borderColor: 'rgb(40, 167, 69)',
            borderWidth: 2
        }, {
            label: 'Salidas',
            data: [10, 13, 7, 15, 12, 4, 9],
            backgroundColor: 'rgba(220, 53, 69, 0.5)',
            borderColor: 'rgb(220, 53, 69)',
            borderWidth: 2
        }]
    };
    
    chartAsistencias = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Número de Registros'
                    }
                }
            }
        }
    });
}

// Funciones de UI
function editarComunidad() {
    if (!comunidadData) return;
    
    // Llenar formulario con datos actuales
    document.getElementById('editComunidadId').value = comunidadData.id;
    document.getElementById('editNombre').value = comunidadData.nombre || '';
    document.getElementById('editMunicipio').value = comunidadData.municipio || 'Yuriria';
    document.getElementById('editTipo').value = comunidadData.tipo || 'rural';
    document.getElementById('editTipoVia').value = comunidadData.tipo_via || 'terraceria';
    document.getElementById('editPoblacion').value = comunidadData.poblacion || '';
    document.getElementById('editEscuelas').value = 
        (comunidadData.escuelas && Array.isArray(comunidadData.escuelas)) ? 
        comunidadData.escuelas.join(', ') : '';
    document.getElementById('editLatitud').value = comunidadData.latitud || '';
    document.getElementById('editLongitud').value = comunidadData.longitud || '';
    document.getElementById('editObservaciones').value = comunidadData.observaciones || '';
    document.getElementById('editActiva').checked = comunidadData.activa !== false;
    
    const modal = new bootstrap.Modal(document.getElementById('modalEditarComunidad'));
    modal.show();
}

async function guardarCambiosComunidad() {
    const comunidadId = document.getElementById('editComunidadId').value;
    
    const datosActualizados = {
        nombre: document.getElementById('editNombre').value,
        municipio: document.getElementById('editMunicipio').value,
        tipo: document.getElementById('editTipo').value,
        tipo_via: document.getElementById('editTipoVia').value,
        activa: document.getElementById('editActiva').checked,
        observaciones: document.getElementById('editObservaciones').value,
        actualizado: new Date().toISOString(),
        actualizado_por: firebase.auth().currentUser.uid
    };
    
    const poblacion = document.getElementById('editPoblacion').value;
    if (poblacion) datosActualizados.poblacion = parseInt(poblacion);
    
    const latitud = document.getElementById('editLatitud').value;
    const longitud = document.getElementById('editLongitud').value;
    if (latitud && longitud) {
        datosActualizados.latitud = parseFloat(latitud);
        datosActualizados.longitud = parseFloat(longitud);
        datosActualizados.ubicacion_actualizada = new Date().toISOString();
    }
    
    const escuelasText = document.getElementById('editEscuelas').value;
    if (escuelasText) {
        datosActualizados.escuelas = escuelasText.split(',')
            .map(e => e.trim())
            .filter(e => e.length > 0);
    }
    
    try {
        await db.collection('comunidades').doc(comunidadId).update(datosActualizados);
        
        // Actualizar datos locales
        comunidadData = { ...comunidadData, ...datosActualizados };
        actualizarUIComunidad();
        
        // Cerrar modal
        bootstrap.Modal.getInstance(document.getElementById('modalEditarComunidad')).hide();
        
        mostrarAlerta('Comunidad actualizada exitosamente', 'success');
        
        // Recargar mapa si se agregaron coordenadas
        if (latitud && longitud) {
            inicializarMapa();
        }
        
    } catch (error) {
        console.error('Error actualizando comunidad:', error);
        mostrarAlerta('Error al actualizar: ' + error.message, 'danger');
    }
}

function agregarUbicacion() {
    if (!comunidadData) return;
    
    const modal = new bootstrap.Modal(document.getElementById('modalAgregarUbicacion'));
    modal.show();
    
    // Inicializar mapa de selección
    setTimeout(() => {
        const map = L.map('mapaSeleccion').setView([20.2139, -101.1336], 11);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        let marker = null;
        
        // Si ya hay coordenadas, centrar ahí
        if (comunidadData.latitud && comunidadData.longitud) {
            map.setView([comunidadData.latitud, comunidadData.longitud], 14);
            marker = L.marker([comunidadData.latitud, comunidadData.longitud]).addTo(map);
            document.getElementById('inputLatitud').value = comunidadData.latitud;
            document.getElementById('inputLongitud').value = comunidadData.longitud;
        }
        
        // Agregar evento de clic en el mapa
        map.on('click', function(e) {
            if (marker) {
                map.removeLayer(marker);
            }
            
            marker = L.marker(e.latlng).addTo(map);
            document.getElementById('inputLatitud').value = e.latlng.lat.toFixed(6);
            document.getElementById('inputLongitud').value = e.latlng.lng.toFixed(6);
        });
        
        // Guardar referencia para usar después
        window.selectionMap = map;
        window.selectionMarker = marker;
        
    }, 500);
}

function usarUbicacionActual() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                document.getElementById('inputLatitud').value = position.coords.latitude.toFixed(6);
                document.getElementById('inputLongitud').value = position.coords.longitude.toFixed(6);
                
                // Mover mapa a la ubicación actual
                if (window.selectionMap && window.selectionMarker) {
                    const latlng = [position.coords.latitude, position.coords.longitude];
                    window.selectionMap.setView(latlng, 15);
                    
                    if (window.selectionMarker) {
                        window.selectionMap.removeLayer(window.selectionMarker);
                    }
                    
                    window.selectionMarker = L.marker(latlng).addTo(window.selectionMap);
                }
                
                mostrarAlerta('Ubicación obtenida exitosamente', 'success');
            },
            (error) => {
                console.error('Error obteniendo ubicación:', error);
                mostrarAlerta('Error al obtener ubicación: ' + error.message, 'danger');
            }
        );
    } else {
        mostrarAlerta('Geolocalización no soportada por el navegador', 'warning');
    }
}

async function guardarUbicacion() {
    const latitud = document.getElementById('inputLatitud').value;
    const longitud = document.getElementById('inputLongitud').value;
    
    if (!latitud || !longitud) {
        mostrarAlerta('Ingresa latitud y longitud', 'warning');
        return;
    }
    
    try {
        await db.collection('comunidades').doc(comunidadData.id).update({
            latitud: parseFloat(latitud),
            longitud: parseFloat(longitud),
            ubicacion_actualizada: new Date().toISOString()
        });
        
        // Actualizar datos locales
        comunidadData.latitud = parseFloat(latitud);
        comunidadData.longitud = parseFloat(longitud);
        comunidadData.ubicacion_actualizada = new Date().toISOString();
        
        // Cerrar modal
        bootstrap.Modal.getInstance(document.getElementById('modalAgregarUbicacion')).hide();
        
        // Recargar mapa
        inicializarMapa();
        
        mostrarAlerta('Ubicación guardada exitosamente', 'success');
        
    } catch (error) {
        console.error('Error guardando ubicación:', error);
        mostrarAlerta('Error al guardar: ' + error.message, 'danger');
    }
}

function verEnGoogleMaps() {
    if (!comunidadData.latitud || !comunidadData.longitud) return;
    
    const url = `https://www.google.com/maps?q=${comunidadData.latitud},${comunidadData.longitud}`;
    window.open(url, '_blank');
}

function exportarDatosComunidad() {
    if (!comunidadData) return;
    
    // Crear datos para exportar
    const datos = {
        comunidad: comunidadData,
        exportado: new Date().toISOString(),
        formato: 'CONAFE Comunidad Export'
    };
    
    // Convertir a JSON
    const json = JSON.stringify(datos, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Crear enlace de descarga
    const a = document.createElement('a');
    a.href = url;
    a.download = `comunidad_${comunidadData.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    mostrarAlerta('Datos exportados exitosamente', 'success');
}

function generarReporte() {
    const tipo = document.getElementById('tipoReporte').value;
    const periodo = document.getElementById('periodoReporte').value;
    
    let contenido = '';
    
    switch(tipo) {
        case 'asistencias':
            contenido = generarReporteAsistencias(periodo);
            break;
        case 'actividades':
            contenido = generarReporteActividades(periodo);
            break;
        case 'maestros':
            contenido = generarReporteMaestros(periodo);
            break;
        case 'comunidad':
            contenido = generarReporteComunidad(periodo);
            break;
    }
    
    document.getElementById('reporteContainer').innerHTML = contenido;
}

function generarReporteAsistencias(periodo) {
    return `
        <div class="reporte-asistencias">
            <h5>Reporte de Asistencias - ${comunidadData.nombre}</h5>
            <p class="text-muted">Período: ${obtenerTextoPeriodo(periodo)}</p>
            
            <div class="row mt-4">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <h6>Resumen General</h6>
                            <table class="table table-sm">
                                <tr><td>Total de registros:</td><td class="text-end"><strong>156</strong></td></tr>
                                <tr><td>Entradas:</td><td class="text-end"><strong>78</strong></td></tr>
                                <tr><td>Salidas:</td><td class="text-end"><strong>78</strong></td></tr>
                                <tr><td>Maestros registrados:</td><td class="text-end"><strong>12</strong></td></tr>
                                <tr><td>Responsables registrados:</td><td class="text-end"><strong>3</strong></td></tr>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <h6>Horarios Más Comunes</h6>
                            <table class="table table-sm">
                                <tr><td>Entrada más temprana:</td><td class="text-end"><strong>07:15 AM</strong></td></tr>
                                <tr><td>Entrada más tardía:</td><td class="text-end"><strong>09:45 AM</strong></td></tr>
                                <tr><td>Salida más temprana:</td><td class="text-end"><strong>02:30 PM</strong></td></tr>
                                <tr><td>Salida más tardía:</td><td class="text-end"><strong>05:20 PM</strong></td></tr>
                                <tr><td>Promedio de jornada:</td><td class="text-end"><strong>7.8 horas</strong></td></tr>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card mt-4">
                <div class="card-body">
                    <h6>Distribución por Día de la Semana</h6>
                    <canvas id="reporteChart" height="100"></canvas>
                </div>
            </div>
        </div>
    `;
}

function exportarReporte() {
    const tipo = document.getElementById('tipoReporte').value;
    const periodo = document.getElementById('periodoReporte').value;
    
    const nombreArchivo = `reporte_${tipo}_${comunidadData.nombre.replace(/\s+/g, '_')}_${periodo}_dias.pdf`;
    
    // En una implementación real, usarías una librería como jsPDF
    alert(`Funcionalidad de exportación a PDF en desarrollo.\nSe generaría: ${nombreArchivo}`);
    
    mostrarAlerta('Exportación a PDF en desarrollo', 'info');
}

function obtenerTextoPeriodo(periodo) {
    switch(periodo) {
        case '7': return 'Últimos 7 días';
        case '30': return 'Últimos 30 días';
        case '90': return 'Últimos 3 meses';
        case '365': return 'Último año';
        default: return 'Período personalizado';
    }
}

// Funciones de utilidad
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

// Funciones placeholder para acciones adicionales
function asignarMaestro() {
    alert('Función para asignar maestro en desarrollo');
}

function crearActividadComunidad() {
    alert('Función para crear actividad específica de comunidad en desarrollo');
}

function agregarContacto() {
    alert('Función para agregar contacto en desarrollo');
}

function agregarPuntoReferencia() {
    alert('Función para agregar punto de referencia en desarrollo');
}

function verMaestro(maestroId) {
    window.open(`detalles-usuario.html?id=${maestroId}`, '_blank');
}

function contactarResponsable(responsableId) {
    alert(`Contactando al responsable ${responsableId}`);
}

function verDetalleAsistencia(asistenciaId) {
    alert(`Mostrando detalle de asistencia ${asistenciaId}`);
}

function verActividad(actividadId) {
    window.open(`detalles-actividad.html?id=${actividadId}`, '_blank');
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarDetallesComunidad);
} else {
    inicializarDetallesComunidad();
}

function inicializarDetallesComunidad() {
    console.log('Página de detalles de comunidad inicializada');
    
    // Verificar si estamos en la página correcta
    if (!window.location.pathname.includes('detalles-comunidad.html')) return;
    
    // Cargar responsbles después de cargar maestros
    const comunidadId = getComunidadId();
    if (comunidadId) {
        setTimeout(() => cargarResponsables(comunidadId), 1000);
        
        // Cargar actividad reciente
        cargarActividadReciente(comunidadId);
    }
}

async function cargarActividadReciente(comunidadId) {
    try {
        // Obtener asistencias recientes
        const asistenciasSnapshot = await db.collection('asistencias')
            .where('comunidad_id', '==', comunidadId)
            .orderBy('fecha', 'desc')
            .limit(5)
            .get();
        
        const timeline = document.getElementById('actividadTimeline');
        timeline.innerHTML = '';
        
        if (asistenciasSnapshot.empty) {
            timeline.innerHTML = '<p class="text-muted">No hay actividad reciente</p>';
            return;
        }
        
        asistenciasSnapshot.forEach(doc => {
            const actividad = doc.data();
            const fecha = new Date(actividad.fecha);
            
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.innerHTML = `
                <strong>${actividad.usuario_nombre}</strong><br>
                <small class="text-muted">
                    ${actividad.tipo === 'entrada' ? 'Registró entrada' : 'Registró salida'} • 
                    ${fecha.toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'})}
                </small>
            `;
            
            timeline.appendChild(item);
        });
        
    } catch (error) {
        console.error('Error cargando actividad reciente:', error);
    }
}