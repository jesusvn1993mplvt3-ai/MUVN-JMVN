// comunidades.js - Funciones específicas para gestión de comunidades

let mapaComunidades = null;
let tablaComunidades = null;
let comunidadesData = [];

// Inicializar página de comunidades
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('comunidades.html')) {
        inicializarPaginaComunidades();
    }
});

async function inicializarPaginaComunidades() {
    console.log('Inicializando página de comunidades...');
    
    // Verificar autenticación
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        // Inicializar mapa
        inicializarMapa();
        
        // Cargar datos
        await cargarComunidades();
        await cargarSelectComunidades();
        
        // Configurar formulario
        document.getElementById('formComunidad').addEventListener('submit', function(e) {
            e.preventDefault();
            guardarComunidad();
        });
        
        // Configurar búsqueda
        document.getElementById('buscarComunidad').addEventListener('keyup', buscarComunidades);
    });
}

function inicializarMapa() {
    mapaComunidades = L.map('mapaComunidades').setView([20.2139, -101.1336], 11);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(mapaComunidades);
    
    // Agregar control para buscar ubicación
    L.Control.geocoder().addTo(mapaComunidades);
    
    // Evento al hacer click en el mapa para obtener coordenadas
    mapaComunidades.on('click', function(e) {
        document.getElementById('latitudComunidad').value = e.latlng.lat.toFixed(6);
        document.getElementById('longitudComunidad').value = e.latlng.lng.toFixed(6);
        
        // Mover marcador
        if (window.marcadorTemporal) {
            mapaComunidades.removeLayer(window.marcadorTemporal);
        }
        
        window.marcadorTemporal = L.marker(e.latlng).addTo(mapaComunidades)
            .bindPopup('Ubicación seleccionada').openPopup();
    });
}

async function cargarComunidades() {
    try {
        const snapshot = await db.collection('comunidades').orderBy('nombre').get();
        const tbody = document.getElementById('tbodyComunidades');
        tbody.innerHTML = '';
        
        comunidadesData = [];
        let contador = 0;
        
        // Limpiar marcadores anteriores
        if (window.marcadoresComunidades) {
            window.marcadoresComunidades.forEach(marker => mapaComunidades.removeLayer(marker));
        }
        window.marcadoresComunidades = [];
        
        snapshot.forEach(doc => {
            const comunidad = doc.data();
            comunidad.id = doc.id;
            comunidadesData.push(comunidad);
            contador++;
            
            // Contar maestros en esta comunidad
            contarMaestrosComunidad(doc.id).then(maestrosCount => {
                // Actualizar fila si ya existe
                const row = document.querySelector(`tr[data-id="${doc.id}"]`);
                if (row) {
                    row.cells[3].innerText = maestrosCount;
                }
            });
            
            // Determinar color según tipo
            let tipoColor = 'primary';
            let tipoText = comunidad.tipo || 'rural';
            
            if (tipoText === 'urbana') tipoColor = 'info';
            if (tipoText === 'indigena') tipoColor = 'warning';
            if (tipoText === 'marginal') tipoColor = 'danger';
            
            // Determinar estado
            let estadoColor = 'success';
            let estadoText = 'Activa';
            if (comunidad.activa === false) {
                estadoColor = 'danger';
                estadoText = 'Inactiva';
            }
            
            // Contar escuelas
            const escuelasCount = Array.isArray(comunidad.escuelas) ? comunidad.escuelas.length : 0;
            
            const row = `
                <tr data-id="${doc.id}">
                    <td>
                        <strong>${comunidad.nombre || 'Sin nombre'}</strong><br>
                        <small class="text-muted">${comunidad.municipio || ''}, ${comunidad.estado || ''}</small>
                    </td>
                    <td>
                        <span class="badge bg-${tipoColor}">${tipoText}</span>
                    </td>
                    <td>
                        ${escuelasCount} escuela(s)
                        ${escuelasCount > 0 ? `<br><small>Ver lista</small>` : ''}
                    </td>
                    <td>Cargando...</td>
                    <td>
                        <span class="badge bg-${estadoColor}">${estadoText}</span>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="editarComunidad('${doc.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-info" onclick="verDetallesComunidad('${doc.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-success" onclick="agregarEscuelaDesdeLista('${doc.id}')">
                                <i class="fas fa-school"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="eliminarComunidadConfirmar('${doc.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            
            tbody.innerHTML += row;
            
            // Agregar marcador al mapa si tiene coordenadas
            if (comunidad.latitud && comunidad.longitud) {
                const marker = L.marker([comunidad.latitud, comunidad.longitud]).addTo(mapaComunidades);
                
                let popupContent = `
                    <strong>${comunidad.nombre}</strong><br>
                    <small>${comunidad.tipo} - ${comunidad.municipio}</small><br>
                    <small>Escuelas: ${escuelasCount}</small><br>
                    <button class="btn btn-sm btn-primary mt-1" onclick="editarComunidad('${doc.id}')">
                        Editar
                    </button>
                `;
                
                marker.bindPopup(popupContent);
                window.marcadoresComunidades.push(marker);
            }
        });
        
        // Inicializar DataTable
        if (tablaComunidades) {
            tablaComunidades.destroy();
        }
        
        tablaComunidades = $('#tablaComunidades').DataTable({
            pageLength: 25,
            language: {
                url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-MX.json'
            },
            order: [[0, 'asc']]
        });
        
        // Actualizar contador
        document.getElementById('contadorComunidades').textContent = contador;
        
    } catch (error) {
        console.error('Error cargando comunidades:', error);
        document.getElementById('tbodyComunidades').innerHTML = 
            `<tr><td colspan="6" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}

async function contarMaestrosComunidad(comunidadId) {
    try {
        // Primero, obtener el nombre de la comunidad
        const comunidadDoc = await db.collection('comunidades').doc(comunidadId).get();
        if (!comunidadDoc.exists) return 0;
        
        const nombreComunidad = comunidadDoc.data().nombre;
        
        // Contar maestros con esta comunidad asignada
        const snapshot = await db.collection('usuarios')
            .where('rol', '==', 'maestro')
            .where('comunidad', '==', nombreComunidad)
            .where('estado', '==', 'activo')
            .get();
        
        return snapshot.size;
    } catch (error) {
        console.error('Error contando maestros:', error);
        return 0;
    }
}

async function cargarSelectComunidades() {
    try {
        const snapshot = await db.collection('comunidades').orderBy('nombre').get();
        const select = document.getElementById('selectComunidadEscuelas');
        
        // Limpiar opciones excepto la primera
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // Agregar comunidades
        snapshot.forEach(doc => {
            const comunidad = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.text = comunidad.nombre;
            select.add(option);
        });
        
    } catch (error) {
        console.error('Error cargando select de comunidades:', error);
    }
}

async function guardarComunidad() {
    const form = document.getElementById('formComunidad');
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
    const comunidadId = document.getElementById('comunidadId').value;
    const nombre = document.getElementById('nombreComunidad').value;
    const tipo = document.getElementById('tipoComunidad').value;
    const municipio = document.getElementById('municipioComunidad').value;
    const estado = document.getElementById('estadoComunidad').value;
    const latitud = document.getElementById('latitudComunidad').value;
    const longitud = document.getElementById('longitudComunidad').value;
    const descripcion = document.getElementById('descripcionComunidad').value;
    const activa = document.getElementById('activaComunidad').checked;
    
    try {
        const comunidadData = {
            nombre: nombre,
            tipo: tipo,
            municipio: municipio,
            estado: estado,
            descripcion: descripcion,
            activa: activa,
            actualizado: new Date().toISOString()
        };
        
        if (latitud && longitud) {
            comunidadData.latitud = parseFloat(latitud);
            comunidadData.longitud = parseFloat(longitud);
        }
        
        if (comunidadId) {
            // Actualizar comunidad existente
            await db.collection('comunidades').doc(comunidadId).update(comunidadData);
            mostrarAlerta('Comunidad actualizada exitosamente', 'success');
        } else {
            // Crear nueva comunidad
            comunidadData.creado = new Date().toISOString();
            comunidadData.escuelas = [];
            
            await db.collection('comunidades').add(comunidadData);
            mostrarAlerta('Comunidad creada exitosamente', 'success');
        }
        
        // Limpiar formulario y recargar
        limpiarFormulario();
        await cargarComunidades();
        await cargarSelectComunidades();
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
}

function limpiarFormulario() {
    document.getElementById('formComunidad').reset();
    document.getElementById('comunidadId').value = '';
    document.getElementById('municipioComunidad').value = 'Yuriria';
    document.getElementById('estadoComunidad').value = 'Guanajuato';
    
    // Limpiar marcador temporal del mapa
    if (window.marcadorTemporal) {
        mapaComunidades.removeLayer(window.marcadorTemporal);
        window.marcadorTemporal = null;
    }
}

async function editarComunidad(comunidadId) {
    try {
        const doc = await db.collection('comunidades').doc(comunidadId).get();
        if (!doc.exists) {
            mostrarAlerta('Comunidad no encontrada', 'warning');
            return;
        }
        
        const comunidad = doc.data();
        
        // Llenar formulario
        document.getElementById('comunidadId').value = comunidadId;
        document.getElementById('nombreComunidad').value = comunidad.nombre || '';
        document.getElementById('tipoComunidad').value = comunidad.tipo || 'rural';
        document.getElementById('municipioComunidad').value = comunidad.municipio || 'Yuriria';
        document.getElementById('estadoComunidad').value = comunidad.estado || 'Guanajuato';
        document.getElementById('latitudComunidad').value = comunidad.latitud || '';
        document.getElementById('longitudComunidad').value = comunidad.longitud || '';
        document.getElementById('descripcionComunidad').value = comunidad.descripcion || '';
        document.getElementById('activaComunidad').checked = comunidad.activa !== false;
        
        // Centrar mapa en la comunidad si tiene coordenadas
        if (comunidad.latitud && comunidad.longitud) {
            mapaComunidades.setView([comunidad.latitud, comunidad.longitud], 13);
            
            // Agregar marcador temporal
            if (window.marcadorTemporal) {
                mapaComunidades.removeLayer(window.marcadorTemporal);
            }
            
            window.marcadorTemporal = L.marker([comunidad.latitud, comunidad.longitud])
                .addTo(mapaComunidades)
                .bindPopup('Comunidad seleccionada')
                .openPopup();
        }
        
        // Hacer scroll al formulario
        document.getElementById('formComunidad').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
}

function verDetallesComunidad(comunidadId) {
    // Abrir modal con detalles completos de la comunidad
    // Esta función se puede expandir según necesidades
    window.open(`detalles-comunidad.html?id=${comunidadId}`, '_blank');
}

async function eliminarComunidadConfirmar(comunidadId) {
    // Verificar si hay maestros asignados a esta comunidad
    const maestrosCount = await contarMaestrosComunidad(comunidadId);
    
    if (maestrosCount > 0) {
        mostrarAlerta(`No se puede eliminar: Hay ${maestrosCount} maestro(s) asignado(s) a esta comunidad`, 'warning');
        return;
    }
    
    if (confirm('¿Estás seguro de eliminar esta comunidad? Esta acción no se puede deshacer.')) {
        const confirmacion = prompt('Escribe "ELIMINAR" para confirmar:');
        if (confirmacion === 'ELIMINAR') {
            await eliminarComunidad(comunidadId);
        } else {
            mostrarAlerta('Eliminación cancelada', 'info');
        }
    }
}

async function eliminarComunidad(comunidadId) {
    try {
        // Marcar como inactiva en lugar de eliminar (borrado lógico)
        await db.collection('comunidades').doc(comunidadId).update({
            activa: false,
            eliminado: new Date().toISOString(),
            eliminado_por: currentUser.uid
        });
        
        mostrarAlerta('Comunidad marcada como inactiva', 'success');
        await cargarComunidades();
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
}

function buscarComunidades() {
    if (!tablaComunidades) return;
    
    const termino = document.getElementById('buscarComunidad').value;
    tablaComunidades.search(termino).draw();
}

async function cargarEscuelasComunidad() {
    const comunidadId = document.getElementById('selectComunidadEscuelas').value;
    if (!comunidadId) {
        document.getElementById('escuelasContainer').style.display = 'none';
        return;
    }
    
    try {
        const doc = await db.collection('comunidades').doc(comunidadId).get();
        if (!doc.exists) return;
        
        const comunidad = doc.data();
        const lista = document.getElementById('listaEscuelas');
        const nombreSpan = document.getElementById('nombreComunidadSeleccionada');
        
        nombreSpan.textContent = comunidad.nombre;
        lista.innerHTML = '';
        
        if (comunidad.escuelas && Array.isArray(comunidad.escuelas)) {
            comunidad.escuelas.forEach((escuela, index) => {
                const div = document.createElement('div');
                div.className = 'd-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded';
                div.innerHTML = `
                    <span>${escuela}</span>
                    <button class="btn btn-sm btn-danger" onclick="eliminarEscuela('${comunidadId}', ${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
                lista.appendChild(div);
            });
        } else {
            lista.innerHTML = '<div class="text-center text-muted">No hay escuelas registradas</div>';
        }
        
        document.getElementById('escuelasContainer').style.display = 'block';
        
    } catch (error) {
        console.error('Error cargando escuelas:', error);
    }
}

async function agregarEscuela() {
    const comunidadId = document.getElementById('selectComunidadEscuelas').value;
    const nuevaEscuela = document.getElementById('nuevaEscuela').value.trim();
    
    if (!comunidadId || !nuevaEscuela) {
        mostrarAlerta('Selecciona una comunidad y escribe el nombre de la escuela', 'warning');
        return;
    }
    
    try {
        const docRef = db.collection('comunidades').doc(comunidadId);
        const doc = await docRef.get();
        
        if (!doc.exists) return;
        
        const comunidad = doc.data();
        const escuelas = comunidad.escuelas || [];
        
        // Verificar si ya existe
        if (escuelas.includes(nuevaEscuela)) {
            mostrarAlerta('Esta escuela ya está registrada en la comunidad', 'warning');
            return;
        }
        
        // Agregar escuela
        escuelas.push(nuevaEscuela);
        await docRef.update({ escuelas: escuelas });
        
        // Limpiar input y recargar
        document.getElementById('nuevaEscuela').value = '';
        await cargarEscuelasComunidad();
        
        mostrarAlerta('Escuela agregada exitosamente', 'success');
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
}

async function eliminarEscuela(comunidadId, index) {
    if (!confirm('¿Estás seguro de eliminar esta escuela?')) return;
    
    try {
        const docRef = db.collection('comunidades').doc(comunidadId);
        const doc = await docRef.get();
        
        if (!doc.exists) return;
        
        const comunidad = doc.data();
        const escuelas = comunidad.escuelas || [];
        
        // Eliminar escuela
        escuelas.splice(index, 1);
        await docRef.update({ escuelas: escuelas });
        
        await cargarEscuelasComunidad();
        mostrarAlerta('Escuela eliminada exitosamente', 'success');
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
}

function agregarEscuelaDesdeLista(comunidadId) {
    // Seleccionar la comunidad en el select y mostrar el panel de escuelas
    document.getElementById('selectComunidadEscuelas').value = comunidadId;
    cargarEscuelasComunidad();
    
    // Hacer scroll al panel de escuelas
    document.getElementById('escuelasContainer').scrollIntoView({ behavior: 'smooth' });
}