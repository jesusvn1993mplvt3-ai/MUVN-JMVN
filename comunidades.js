// comunidades.js - Gestión de comunidades con Realtime Database
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    const usuario = conafeConfig.verificarAutenticacion();
    if (!usuario) return;
    
    // Inicializar
    inicializarComunidades();
});

async function inicializarComunidades() {
    // Cargar lista de comunidades
    await cargarComunidades();
    
    // Configurar eventos
    configurarEventosComunidades();
}

async function cargarComunidades() {
    try {
        const snapshot = await db.comunidades.orderByChild('nombre').once('value');
        const container = document.getElementById('comunidadesList');
        
        if (!container) return;
        
        if (!snapshot.exists()) {
            container.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            No hay comunidades registradas
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        snapshot.forEach(childSnapshot => {
            const comunidad = childSnapshot.val();
            comunidad.id = childSnapshot.key;
            
            const fecha = comunidad.creado_en ? 
                new Date(comunidad.creado_en).toLocaleDateString('es-MX') : 
                'No especificada';
            
            const tipoBadge = comunidad.tipo === 'urbana' ? 
                '<span class="badge bg-primary">Urbana</span>' : 
                '<span class="badge bg-warning">Rural</span>';
            
            const estadoBadge = comunidad.activa === false ? 
                '<span class="badge bg-danger">Inactiva</span>' : 
                '<span class="badge bg-success">Activa</span>';
            
            // Contar maestros en esta comunidad
            // Esto se haría con una consulta adicional en producción
            
            html += `
                <tr>
                    <td>
                        <strong>${comunidad.nombre}</strong><br>
                        <small class="text-muted">${comunidad.municipio || 'Sin municipio'}</small>
                    </td>
                    <td>${tipoBadge}</td>
                    <td>${comunidad.poblacion ? comunidad.poblacion.toLocaleString() : 'N/A'}</td>
                    <td>${comunidad.escuelas ? comunidad.escuelas.length : 0}</td>
                    <td>${fecha}</td>
                    <td>${estadoBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="verComunidad('${comunidad.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-warning me-1" onclick="editarComunidad('${comunidad.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="eliminarComunidad('${comunidad.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error cargando comunidades:', error);
        conafeConfig.mostrarAlerta('Error al cargar comunidades', 'danger');
    }
}

function configurarEventosComunidades() {
    // Botón de nueva comunidad
    const btnNueva = document.getElementById('btnNuevaComunidad');
    if (btnNueva) {
        btnNueva.addEventListener('click', mostrarModalNuevaComunidad);
    }
    
    // Formulario de nueva comunidad
    const formNueva = document.getElementById('formNuevaComunidad');
    if (formNueva) {
        formNueva.addEventListener('submit', async function(e) {
            e.preventDefault();
            await crearComunidad();
        });
    }
    
    // Formulario de edición
    const formEditar = document.getElementById('formEditarComunidad');
    if (formEditar) {
        formEditar.addEventListener('submit', async function(e) {
            e.preventDefault();
            await actualizarComunidad();
        });
    }
    
    // Búsqueda
    const inputBusqueda = document.getElementById('buscarComunidad');
    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', buscarComunidades);
    }
}

async function crearComunidad() {
    const nombre = document.getElementById('nombre').value.trim();
    const municipio = document.getElementById('municipio').value.trim();
    const tipo = document.getElementById('tipo').value;
    const poblacion = document.getElementById('poblacion').value;
    const observaciones = document.getElementById('observaciones').value.trim();
    
    if (!nombre || !municipio) {
        conafeConfig.mostrarAlerta('Nombre y municipio son obligatorios', 'warning');
        return;
    }
    
    const usuario = conafeConfig.obtenerSesion();
    
    const nuevaComunidad = {
        nombre: nombre,
        municipio: municipio,
        tipo: tipo,
        poblacion: poblacion ? parseInt(poblacion) : null,
        observaciones: observaciones,
        activa: true,
        creado_por: usuario.id || usuario.email,
        creado_en: firebase.database.ServerValue.TIMESTAMP,
        actualizado_en: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Escuelas (si se proporcionan)
    const escuelasInput = document.getElementById('escuelas').value;
    if (escuelasInput) {
        nuevaComunidad.escuelas = escuelasInput.split(',').map(e => e.trim()).filter(e => e);
    }
    
    try {
        const nuevoRef = db.comunidades.push();
        await nuevoRef.set(nuevaComunidad);
        
        conafeConfig.mostrarAlerta(`Comunidad "${nombre}" creada exitosamente`, 'success');
        
        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalNuevaComunidad'));
        modal.hide();
        
        // Limpiar formulario
        document.getElementById('formNuevaComunidad').reset();
        
        // Recargar lista
        await cargarComunidades();
        
    } catch (error) {
        console.error('Error creando comunidad:', error);
        conafeConfig.mostrarAlerta('Error al crear comunidad', 'danger');
    }
}

async function actualizarComunidad() {
    const comunidadId = document.getElementById('editComunidadId').value;
    const nombre = document.getElementById('editNombre').value.trim();
    const municipio = document.getElementById('editMunicipio').value.trim();
    const tipo = document.getElementById('editTipo').value;
    const poblacion = document.getElementById('editPoblacion').value;
    const observaciones = document.getElementById('editObservaciones').value.trim();
    const activa = document.getElementById('editActiva').checked;
    
    if (!nombre || !municipio) {
        conafeConfig.mostrarAlerta('Nombre y municipio son obligatorios', 'warning');
        return;
    }
    
    const usuario = conafeConfig.obtenerSesion();
    
    const datosActualizados = {
        nombre: nombre,
        municipio: municipio,
        tipo: tipo,
        poblacion: poblacion ? parseInt(poblacion) : null,
        observaciones: observaciones,
        activa: activa,
        actualizado_por: usuario.id || usuario.email,
        actualizado_en: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Escuelas (si se proporcionan)
    const escuelasInput = document.getElementById('editEscuelas').value;
    if (escuelasInput) {
        datosActualizados.escuelas = escuelasInput.split(',').map(e => e.trim()).filter(e => e);
    }
    
    // Ubicación (si se proporciona)
    const latitud = document.getElementById('editLatitud').value;
    const longitud = document.getElementById('editLongitud').value;
    if (latitud && longitud) {
        datosActualizados.latitud = parseFloat(latitud);
        datosActualizados.longitud = parseFloat(longitud);
    }
    
    try {
        await db.comunidades.child(comunidadId).update(datosActualizados);
        
        conafeConfig.mostrarAlerta(`Comunidad "${nombre}" actualizada exitosamente`, 'success');
        
        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarComunidad'));
        modal.hide();
        
        // Recargar lista
        await cargarComunidades();
        
    } catch (error) {
        console.error('Error actualizando comunidad:', error);
        conafeConfig.mostrarAlerta('Error al actualizar comunidad', 'danger');
    }
}

async function editarComunidad(id) {
    try {
        const snapshot = await db.comunidades.child(id).once('value');
        
        if (!snapshot.exists()) {
            conafeConfig.mostrarAlerta('Comunidad no encontrada', 'warning');
            return;
        }
        
        const comunidad = snapshot.val();
        
        // Llenar formulario
        document.getElementById('editComunidadId').value = id;
        document.getElementById('editNombre').value = comunidad.nombre || '';
        document.getElementById('editMunicipio').value = comunidad.municipio || 'Yuriria';
        document.getElementById('editTipo').value = comunidad.tipo || 'rural';
        document.getElementById('editPoblacion').value = comunidad.poblacion || '';
        document.getElementById('editObservaciones').value = comunidad.observaciones || '';
        document.getElementById('editActiva').checked = comunidad.activa !== false;
        document.getElementById('editLatitud').value = comunidad.latitud || '';
        document.getElementById('editLongitud').value = comunidad.longitud || '';
        
        // Escuelas
        if (comunidad.escuelas && Array.isArray(comunidad.escuelas)) {
            document.getElementById('editEscuelas').value = comunidad.escuelas.join(', ');
        } else {
            document.getElementById('editEscuelas').value = '';
        }
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('modalEditarComunidad'));
        modal.show();
        
    } catch (error) {
        console.error('Error cargando comunidad:', error);
        conafeConfig.mostrarAlerta('Error al cargar comunidad', 'danger');
    }
}

async function eliminarComunidad(id) {
    if (!confirm('¿Estás seguro de eliminar esta comunidad? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        // Verificar si hay maestros asignados a esta comunidad
        const snapshot = await db.usuarios.orderByChild('comunidad_id').equalTo(id).once('value');
        
        if (snapshot.exists()) {
            conafeConfig.mostrarAlerta('No se puede eliminar la comunidad porque tiene maestros asignados', 'warning');
            return;
        }
        
        // Eliminar comunidad
        await db.comunidades.child(id).remove();
        
        conafeConfig.mostrarAlerta('Comunidad eliminada exitosamente', 'success');
        
        // Recargar lista
        await cargarComunidades();
        
    } catch (error) {
        console.error('Error eliminando comunidad:', error);
        conafeConfig.mostrarAlerta('Error al eliminar comunidad', 'danger');
    }
}

function verComunidad(id) {
    window.location.href = `detalles-comunidad.html?id=${id}`;
}

async function buscarComunidades() {
    const termino = document.getElementById('buscarComunidad').value.toLowerCase().trim();
    
    try {
        const snapshot = await db.comunidades.orderByChild('nombre').once('value');
        const container = document.getElementById('comunidadesList');
        
        if (!container) return;
        
        if (!snapshot.exists()) {
            container.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            No hay comunidades registradas
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        let encontradas = 0;
        
        snapshot.forEach(childSnapshot => {
            const comunidad = childSnapshot.val();
            comunidad.id = childSnapshot.key;
            
            // Filtrar por término de búsqueda
            if (termino && 
                !comunidad.nombre.toLowerCase().includes(termino) &&
                !comunidad.municipio.toLowerCase().includes(termino)) {
                return;
            }
            
            encontradas++;
            
            const fecha = comunidad.creado_en ? 
                new Date(comunidad.creado_en).toLocaleDateString('es-MX') : 
                'No especificada';
            
            const tipoBadge = comunidad.tipo === 'urbana' ? 
                '<span class="badge bg-primary">Urbana</span>' : 
                '<span class="badge bg-warning">Rural</span>';
            
            const estadoBadge = comunidad.activa === false ? 
                '<span class="badge bg-danger">Inactiva</span>' : 
                '<span class="badge bg-success">Activa</span>';
            
            html += `
                <tr>
                    <td>
                        <strong>${comunidad.nombre}</strong><br>
                        <small class="text-muted">${comunidad.municipio || 'Sin municipio'}</small>
                    </td>
                    <td>${tipoBadge}</td>
                    <td>${comunidad.poblacion ? comunidad.poblacion.toLocaleString() : 'N/A'}</td>
                    <td>${comunidad.escuelas ? comunidad.escuelas.length : 0}</td>
                    <td>${fecha}</td>
                    <td>${estadoBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="verComunidad('${comunidad.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-warning me-1" onclick="editarComunidad('${comunidad.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="eliminarComunidad('${comunidad.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        if (encontradas === 0) {
            html = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="alert alert-warning">
                            <i class="fas fa-search me-2"></i>
                            No se encontraron comunidades con "${termino}"
                        </div>
                    </td>
                </tr>
            `;
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error buscando comunidades:', error);
        conafeConfig.mostrarAlerta('Error al buscar comunidades', 'danger');
    }
}

function mostrarModalNuevaComunidad() {
    // Limpiar formulario
    document.getElementById('formNuevaComunidad').reset();
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('modalNuevaComunidad'));
    modal.show();
}

// Exportar funciones globales
window.comunidadesManager = {
    cargarComunidades,
    crearComunidad,
    editarComunidad,
    actualizarComunidad,
    eliminarComunidad,
    buscarComunidades
};