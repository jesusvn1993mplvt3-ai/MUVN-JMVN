// dashboard.js - Panel de control con Realtime Database
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    const usuario = conafeConfig.verificarAutenticacion();
    if (!usuario) return;
    
    // Mostrar información del usuario
    mostrarInfoUsuario(usuario);
    
    // Cargar datos del dashboard según rol
    if (usuario.rol === 'responsable' || usuario.rol === 'admin') {
        cargarDashboardResponsable(usuario);
    } else if (usuario.rol === 'maestro') {
        cargarDashboardMaestro(usuario);
    }
    
    // Configurar eventos
    configurarEventosDashboard();
});

function mostrarInfoUsuario(usuario) {
    const elementos = {
        'userName': usuario.nombre,
        'userRole': usuario.rol === 'maestro' ? 'Maestro' : 'Responsable',
        'userEmail': usuario.email || 'Sin email'
    };
    
    Object.entries(elementos).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = valor;
    });
    
    // Mostrar comunidad si es maestro
    const comunidadElement = document.getElementById('userComunidad');
    if (comunidadElement && usuario.rol === 'maestro' && usuario.comunidad_nombre) {
        comunidadElement.textContent = usuario.comunidad_nombre;
    }
}

async function cargarDashboardResponsable(usuario) {
    try {
        // Cargar estadísticas generales
        const [comunidadesSnapshot, usuariosSnapshot, asistenciasSnapshot] = await Promise.all([
            db.comunidades.once('value'),
            db.usuarios.once('value'),
            db.asistencias.limitToLast(100).once('value')
        ]);
        
        // Actualizar contadores
        document.getElementById('totalComunidades').textContent = comunidadesSnapshot.numChildren();
        document.getElementById('totalUsuarios').textContent = usuariosSnapshot.numChildren();
        
        // Calcular asistencias hoy
        const hoy = new Date().toISOString().split('T')[0];
        let asistenciasHoy = 0;
        asistenciasSnapshot.forEach(childSnapshot => {
            const asistencia = childSnapshot.val();
            if (asistencia.fecha && asistencia.fecha.includes(hoy)) {
                asistenciasHoy++;
            }
        });
        document.getElementById('asistenciasHoy').textContent = asistenciasHoy;
        
        // Cargar actividades pendientes
        const actividadesSnapshot = await db.actividades
            .orderByChild('estado')
            .equalTo('pendiente')
            .limitToLast(5)
            .once('value');
        
        const actividadesList = document.getElementById('actividadesList');
        if (actividadesList) {
            actividadesList.innerHTML = '';
            
            if (!actividadesSnapshot.exists()) {
                actividadesList.innerHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        No hay actividades pendientes
                    </div>
                `;
                return;
            }
            
            actividadesSnapshot.forEach(childSnapshot => {
                const actividad = childSnapshot.val();
                actividad.id = childSnapshot.key;
                
                const fechaLimite = actividad.fecha_limite ? 
                    new Date(actividad.fecha_limite).toLocaleDateString('es-MX') : 
                    'Sin fecha límite';
                
                const card = document.createElement('div');
                card.className = 'card mb-2';
                card.innerHTML = `
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="card-title mb-1">${actividad.titulo}</h6>
                                <p class="card-text small text-muted mb-1">${actividad.descripcion || 'Sin descripción'}</p>
                                <small class="text-muted"><i class="far fa-calendar me-1"></i> ${fechaLimite}</small>
                            </div>
                            <span class="badge bg-warning">Pendiente</span>
                        </div>
                    </div>
                `;
                
                actividadesList.appendChild(card);
            });
        }
        
        // Cargar asistencias recientes
        const asistenciasList = document.getElementById('asistenciasRecientes');
        if (asistenciasList) {
            asistenciasList.innerHTML = '';
            
            if (!asistenciasSnapshot.exists()) {
                asistenciasList.innerHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        No hay asistencias recientes
                    </div>
                `;
                return;
            }
            
            // Ordenar por fecha (más reciente primero)
            const asistenciasArray = [];
            asistenciasSnapshot.forEach(childSnapshot => {
                const asistencia = childSnapshot.val();
                asistencia.id = childSnapshot.key;
                asistenciasArray.push(asistencia);
            });
            
            asistenciasArray.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            
            // Mostrar solo las 5 más recientes
            asistenciasArray.slice(0, 5).forEach(asistencia => {
                const fecha = asistencia.fecha ? 
                    new Date(asistencia.fecha).toLocaleTimeString('es-MX', {hour12: false}) : 
                    'Hora no especificada';
                
                const item = document.createElement('div');
                item.className = 'list-group-item';
                item.innerHTML = `
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">${asistencia.usuario_nombre || 'Usuario'}</h6>
                        <small>${fecha}</small>
                    </div>
                    <p class="mb-1">${asistencia.ubicacion_declarada || 'Sin ubicación'}</p>
                    <small class="text-muted">${asistencia.tipo === 'entrada' ? 'Entrada' : 'Salida'}</small>
                `;
                
                asistenciasList.appendChild(item);
            });
        }
        
    } catch (error) {
        console.error('Error cargando dashboard responsable:', error);
        conafeConfig.mostrarAlerta('Error al cargar datos del dashboard', 'danger');
    }
}

async function cargarDashboardMaestro(usuario) {
    try {
        // Cargar información de la comunidad
        if (usuario.comunidad_id) {
            const comunidadSnapshot = await db.comunidades.child(usuario.comunidad_id).once('value');
            if (comunidadSnapshot.exists()) {
                const comunidad = comunidadSnapshot.val();
                document.getElementById('miComunidad').textContent = comunidad.nombre;
                document.getElementById('miMunicipio').textContent = comunidad.municipio || 'Yuriria';
            }
        }
        
        // Cargar asistencias del maestro
        const asistenciasSnapshot = await db.asistencias
            .orderByChild('usuario_id')
            .equalTo(usuario.id)
            .limitToLast(10)
            .once('value');
        
        const misAsistencias = document.getElementById('misAsistencias');
        if (misAsistencias) {
            misAsistencias.innerHTML = '';
            
            if (!asistenciasSnapshot.exists()) {
                misAsistencias.innerHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        No has registrado asistencias aún
                    </div>
                `;
                return;
            }
            
            asistenciasSnapshot.forEach(childSnapshot => {
                const asistencia = childSnapshot.val();
                const fecha = asistencia.fecha ? 
                    new Date(asistencia.fecha).toLocaleString('es-MX') : 
                    'Fecha no especificada';
                
                const tipoBadge = asistencia.tipo === 'entrada' ? 
                    '<span class="badge bg-success">Entrada</span>' : 
                    '<span class="badge bg-danger">Salida</span>';
                
                const item = document.createElement('tr');
                item.innerHTML = `
                    <td>${fecha}</td>
                    <td>${tipoBadge}</td>
                    <td>${asistencia.ubicacion_declarada || 'Sin ubicación'}</td>
                `;
                
                misAsistencias.appendChild(item);
            });
        }
        
        // Cargar actividades asignadas
        if (usuario.comunidad_id) {
            const actividadesSnapshot = await db.actividades
                .orderByChild('comunidad_id')
                .equalTo(usuario.comunidad_id)
                .limitToLast(5)
                .once('value');
            
            const misActividades = document.getElementById('misActividades');
            if (misActividades) {
                misActividades.innerHTML = '';
                
                if (!actividadesSnapshot.exists()) {
                    misActividades.innerHTML = `
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            No hay actividades asignadas
                        </div>
                    `;
                    return;
                }
                
                actividadesSnapshot.forEach(childSnapshot => {
                    const actividad = childSnapshot.val();
                    const fechaLimite = actividad.fecha_limite ? 
                        new Date(actividad.fecha_limite).toLocaleDateString('es-MX') : 
                        'Sin fecha límite';
                    
                    const card = document.createElement('div');
                    card.className = 'card mb-2';
                    card.innerHTML = `
                        <div class="card-body p-3">
                            <h6 class="card-title">${actividad.titulo}</h6>
                            <p class="card-text small">${actividad.descripcion || 'Sin descripción'}</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted">Vence: ${fechaLimite}</small>
                                <span class="badge ${actividad.estado === 'pendiente' ? 'bg-warning' : 'bg-success'}">
                                    ${actividad.estado === 'pendiente' ? 'Pendiente' : 'Completado'}
                                </span>
                            </div>
                        </div>
                    `;
                    
                    misActividades.appendChild(card);
                });
            }
        }
        
    } catch (error) {
        console.error('Error cargando dashboard maestro:', error);
        conafeConfig.mostrarAlerta('Error al cargar datos del dashboard', 'danger');
    }
}

function configurarEventosDashboard() {
    // Botón de cerrar sesión
    const btnCerrarSesion = document.getElementById('btnCerrarSesion');
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', conafeConfig.cerrarSesion);
    }
    
    // Botón de registrar asistencia (para maestros)
    const btnRegistrarAsistencia = document.getElementById('btnRegistrarAsistencia');
    if (btnRegistrarAsistencia) {
        btnRegistrarAsistencia.addEventListener('click', function() {
            window.location.href = 'asistencia.html';
        });
    }
}

// Funciones adicionales para el dashboard
async function actualizarContadores() {
    try {
        const [comunidadesCount, usuariosCount] = await Promise.all([
            db.comunidades.once('value'),
            db.usuarios.once('value')
        ]);
        
        document.getElementById('totalComunidades').textContent = comunidadesCount.numChildren();
        document.getElementById('totalUsuarios').textContent = usuariosCount.numChildren();
        
    } catch (error) {
        console.error('Error actualizando contadores:', error);
    }
}

// Llamar a actualizar contadores cada 30 segundos
setInterval(actualizarContadores, 30000);

// Exportar funciones globales
window.dashboard = {
    cargarDashboardResponsable,
    cargarDashboardMaestro,
    actualizarContadores
};