// detalles-comunidad.js - Versión Realtime Database
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    const usuario = conafeConfig.verificarAutenticacion();
    if (!usuario) return;
    
    // Obtener ID de la comunidad
    const urlParams = new URLSearchParams(window.location.search);
    const comunidadId = urlParams.get('id');
    
    if (!comunidadId) {
        conafeConfig.mostrarAlerta('No se especificó la comunidad', 'danger');
        setTimeout(() => window.location.href = 'comunidades.html', 2000);
        return;
    }
    
    // Cargar datos de la comunidad
    cargarComunidad(comunidadId);
});

async function cargarComunidad(comunidadId) {
    try {
        const snapshot = await db.comunidades.child(comunidadId).once('value');
        
        if (!snapshot.exists()) {
            conafeConfig.mostrarAlerta('Comunidad no encontrada', 'danger');
            setTimeout(() => window.location.href = 'comunidades.html', 2000);
            return;
        }
        
        const comunidad = snapshot.val();
        comunidad.id = comunidadId;
        
        // Guardar globalmente
        window.comunidadActual = comunidad;
        
        // Actualizar UI
        actualizarUIComunidad(comunidad);
        
        // Cargar datos relacionados
        await Promise.all([
            cargarEstadisticas(comunidadId),
            cargarMaestros(comunidadId),
            cargarAsistencias(comunidadId),
            cargarActividades(comunidadId),
            cargarResponsables(comunidadId)
        ]);
        
        // Inicializar mapa si hay coordenadas
        if (comunidad.latitud && comunidad.longitud) {
            inicializarMapa(comunidad);
        }
        
    } catch (error) {
        console.error('Error cargando comunidad:', error);
        conafeConfig.mostrarAlerta('Error al cargar comunidad', 'danger');
    }
}

function actualizarUIComunidad(comunidad) {
    // Actualizar header
    document.getElementById('breadcrumbNombre').textContent = comunidad.nombre;
    document.getElementById('comunidadNombre').textContent = comunidad.nombre;
    
    // Actualizar badges
    const badgesContainer = document.getElementById('comunidadBadges');
    if (badgesContainer) {
        badgesContainer.innerHTML = '';
        
        const tipoBadge = document.createElement('span');
        tipoBadge.className = `badge ${comunidad.tipo === 'urbana' ? 'bg-primary' : 'bg-warning'}`;
        tipoBadge.textContent = comunidad.tipo || 'Sin tipo';
        badgesContainer.appendChild(tipoBadge);
        
        if (comunidad.activa !== false) {
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
    }
    
    // Actualizar información general
    const elementos = {
        'infoMunicipio': comunidad.municipio || 'Yuriria',
        'infoTipoVia': comunidad.tipo_via || 'No especificado',
        'infoPoblacion': comunidad.poblacion ? comunidad.poblacion.toLocaleString() : 'No especificada',
        'infoFundacion': comunidad.fundacion || 'No especificada',
        'infoObservaciones': comunidad.observaciones || 'Sin observaciones',
        'comunidadDescripcion': comunidad.descripcion || `Comunidad en ${comunidad.municipio || 'Yuriria'}`
    };
    
    Object.entries(elementos).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = valor;
    });
    
    // Actualizar escuelas
    const escuelasContainer = document.getElementById('escuelasList');
    if (escuelasContainer) {
        if (comunidad.escuelas && Array.isArray(comunidad.escuelas) && comunidad.escuelas.length > 0) {
            escuelasContainer.innerHTML = '';
            comunidad.escuelas.forEach(escuela => {
                const badge = document.createElement('span');
                badge.className = 'school-badge';
                badge.textContent = escuela;
                escuelasContainer.appendChild(badge);
            });
        } else {
            escuelasContainer.innerHTML = '<span class="text-muted">No hay escuelas registradas</span>';
        }
    }
}

async function cargarEstadisticas(comunidadId) {
    try {
        // Contar maestros en esta comunidad
        const maestrosSnapshot = await db.usuarios
            .orderByChild('comunidad_id')
            .equalTo(comunidadId)
            .once('value');
        
        // Contar asistencias este mes
        const hoy = new Date();
        const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const asistenciasSnapshot = await db.asistencias
            .orderByChild('comunidad_id')
            .equalTo(comunidadId)
            .once('value');
        
        let asistenciasEsteMes = 0;
        asistenciasSnapshot.forEach(childSnapshot => {
            const asistencia = childSnapshot.val();
            if (new Date(asistencia.fecha) >= primerDiaMes) {
                asistenciasEsteMes++;
            }
        });
        
        // Contar actividades pendientes
        const actividadesSnapshot = await db.actividades
            .orderByChild('comunidad_id')
            .equalTo(comunidadId)
            .once('value');
        
        let actividadesPendientes = 0;
        actividadesSnapshot.forEach(childSnapshot => {
            const actividad = childSnapshot.val();
            if (actividad.estado === 'pendiente') {
                actividadesPendientes++;
            }
        });
        
        // Actualizar UI
        document.getElementById('totalMaestros').textContent = maestrosSnapshot.numChildren();
        document.getElementById('asistenciasMes').textContent = asistenciasEsteMes;
        document.getElementById('actividadesPend').textContent = actividadesPendientes;
        document.getElementById('escuelasCount').textContent = 
            (window.comunidadActual.escuelas && Array.isArray(window.comunidadActual.escuelas)) ? 
            window.comunidadActual.escuelas.length : 0;
        
        // Actualizar badge de maestros
        const badgeMaestros = document.getElementById('badgeMaestros');
        if (badgeMaestros) {
            badgeMaestros.textContent = maestrosSnapshot.numChildren();
        }
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

async function cargarMaestros(comunidadId) {
    try {
        const snapshot = await db.usuarios
            .orderByChild('comunidad_id')
            .equalTo(comunidadId)
            .once('value');
        
        const tbody = document.getElementById('tbodyMaestros');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!snapshot.exists()) {
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
        
        snapshot.forEach(childSnapshot => {
            const maestro = childSnapshot.val();
            maestro.id = childSnapshot.key;
            
            const fechaAsignacion = maestro.fecha_inicio || maestro.creado_en;
            const fecha = fechaAsignacion ? 
                new Date(fechaAsignacion).toLocaleDateString('es-MX') : 
                'No especificada';
            
            const row = document.createElement('tr');
            row.innerHTML = `
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
                    <small>15 días</small>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="verMaestro('${maestro.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="editarMaestroComunidad('${maestro.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error cargando maestros:', error);
        const tbody = document.getElementById('tbodyMaestros');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger">
                        Error al cargar maestros
                    </td>
                </tr>
            `;
        }
    }
}

// ... continuaría con las demás funciones para asistencias, actividades, etc.

// Funciones placeholder
function editarComunidad() {
    if (!window.comunidadActual) return;
    
    // Implementar edición de comunidad
    conafeConfig.mostrarAlerta('Función de edición en desarrollo', 'info');
}

function exportarDatosComunidad() {
    if (!window.comunidadActual) return;
    
    // Implementar exportación
    conafeConfig.mostrarAlerta('Función de exportación en desarrollo', 'info');
}

function inicializarMapa(comunidad) {
    const container = document.getElementById('comunidadMap');
    if (!container) return;
    
    // Limpiar contenedor
    container.innerHTML = '';
    
    // Crear mapa Leaflet
    const map = L.map('comunidadMap').setView([comunidad.latitud, comunidad.longitud], 14);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Agregar marcador
    L.marker([comunidad.latitud, comunidad.longitud])
        .addTo(map)
        .bindPopup(`<strong>${comunidad.nombre}</strong><br>${comunidad.municipio || 'Yuriria'}`)
        .openPopup();
    
    // Guardar referencia
    window.mapaComunidad = map;
}

// Exportar funciones globales
window.detallesComunidad = {
    cargarComunidad,
    editarComunidad,
    exportarDatosComunidad
};