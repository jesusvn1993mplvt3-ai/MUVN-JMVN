// usuarios.js - Funciones específicas para gestión de usuarios

let tablaUsuarios = null;
let comunidadesLista = [];

// Inicializar página de usuarios
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('usuarios.html')) {
        inicializarPaginaUsuarios();
    }
});

async function inicializarPaginaUsuarios() {
    console.log('Inicializando página de usuarios...');
    
    // Verificar autenticación
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        // Cargar datos
        await cargarComunidadesParaFiltros();
        await cargarUsuariosCompletos();
        actualizarEstadisticas();
        
        // Configurar eventos
        document.getElementById('filtroRol').addEventListener('change', aplicarFiltros);
        document.getElementById('filtroEstado').addEventListener('change', aplicarFiltros);
        document.getElementById('filtroComunidad').addEventListener('change', aplicarFiltros);
        document.getElementById('buscarUsuario').addEventListener('keyup', buscarUsuarios);
    });
}

async function cargarComunidadesParaFiltros() {
    try {
        const snapshot = await db.collection('comunidades').orderBy('nombre').get();
        const select = document.getElementById('filtroComunidad');
        
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
        console.error('Error cargando comunidades:', error);
    }
}

async function cargarUsuariosCompletos() {
    try {
        const snapshot = await db.collection('usuarios').orderBy('nombre').get();
        const tbody = document.getElementById('tbodyUsuarios');
        tbody.innerHTML = '';
        
        snapshot.forEach(doc => {
            const usuario = doc.data();
            const fechaUltima = usuario.ultima_sesion ? 
                new Date(usuario.ultima_sesion).toLocaleDateString() : 'Nunca';
            
            // Determinar color del badge según estado
            let estadoColor = 'secondary';
            let estadoText = usuario.estado || 'activo';
            
            if (estadoText === 'activo') estadoColor = 'success';
            if (estadoText === 'inactivo') estadoColor = 'danger';
            if (estadoText === 'pendiente') estadoColor = 'warning';
            
            // Determinar color del badge según rol
            let rolColor = 'primary';
            let rolText = usuario.rol || 'maestro';
            
            if (rolText === 'responsable') rolColor = 'warning';
            if (rolText === 'administrador') rolColor = 'danger';
            
            // Mostrar comunidades/escuelas según rol
            let comunidadesHtml = '';
            if (usuario.rol === 'maestro') {
                comunidadesHtml = `<span class="badge bg-info">${usuario.comunidad || 'Sin asignar'}</span>`;
                if (usuario.escuela) {
                    comunidadesHtml += `<br><small>${usuario.escuela}</small>`;
                }
            } else if (usuario.rol === 'responsable') {
                if (usuario.comunidades && Array.isArray(usuario.comunidades)) {
                    usuario.comunidades.slice(0, 2).forEach(c => {
                        comunidadesHtml += `<span class="comunidad-tag">${c}</span> `;
                    });
                    if (usuario.comunidades.length > 2) {
                        comunidadesHtml += `<br><span class="badge bg-secondary">+${usuario.comunidades.length - 2} más</span>`;
                    }
                }
            }
            
            const row = `
                <tr data-id="${doc.id}" data-rol="${usuario.rol}" data-estado="${usuario.estado}" data-comunidad="${usuario.comunidad || ''}">
                    <td>
                        <code>${doc.id.substring(0, 8)}...</code>
                    </td>
                    <td>
                        <strong>${usuario.nombre || 'Sin nombre'}</strong><br>
                        <small class="text-muted">${usuario.email || ''}</small>
                    </td>
                    <td>
                        <span class="badge bg-${rolColor}">${rolText}</span>
                    </td>
                    <td>${comunidadesHtml}</td>
                    <td>
                        ${usuario.telefono || 'Sin teléfono'}<br>
                        <small class="text-muted">${usuario.email || ''}</small>
                    </td>
                    <td>
                        <span class="badge bg-${estadoColor}">${estadoText}</span>
                    </td>
                    <td>
                        ${fechaUltima}<br>
                        <small class="text-muted">${usuario.ultima_asistencia ? new Date(usuario.ultima_asistencia).toLocaleDateString() : ''}</small>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="editarUsuario('${doc.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-info" onclick="verDetallesUsuario('${doc.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-warning" onclick="resetearPassword('${doc.id}')">
                                <i class="fas fa-key"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="eliminarUsuarioConfirmar('${doc.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            
            tbody.innerHTML += row;
        });
        
        // Inicializar DataTable
        if (tablaUsuarios) {
            tablaUsuarios.destroy();
        }
        
        tablaUsuarios = $('#tablaUsuariosCompleta').DataTable({
            pageLength: 25,
            language: {
                url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-MX.json'
            },
            order: [[1, 'asc']]
        });
        
        // Actualizar contador
        document.getElementById('contadorUsuarios').textContent = snapshot.size;
        
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        document.getElementById('tbodyUsuarios').innerHTML = 
            `<tr><td colspan="8" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}

function aplicarFiltros() {
    if (!tablaUsuarios) return;
    
    const rol = document.getElementById('filtroRol').value;
    const estado = document.getElementById('filtroEstado').value;
    const comunidad = document.getElementById('filtroComunidad').value;
    
    // Aplicar filtros a DataTable
    tablaUsuarios.columns().search('').draw();
    
    if (rol !== 'todos') {
        tablaUsuarios.column(2).search(rol).draw();
    }
    
    // Los filtros de estado y comunidad necesitarían implementación personalizada
    // ya que están en diferentes columnas o combinados
    
    mostrarAlerta(`Filtros aplicados: ${rol !== 'todos' ? rol : 'Todos'}`, 'info');
}

function buscarUsuarios() {
    if (!tablaUsuarios) return;
    
    const termino = document.getElementById('buscarUsuario').value;
    tablaUsuarios.search(termino).draw();
}

function abrirModalNuevoUsuario(tipo = null) {
    document.getElementById('modalUsuarioTitulo').innerHTML = '<i class="fas fa-user-plus"></i> Nuevo Usuario';
    document.getElementById('formUsuario').reset();
    document.getElementById('usuarioId').value = '';
    
    // Si se especifica un tipo, seleccionarlo
    if (tipo) {
        document.getElementById('rolUsuario').value = tipo;
        cambiarCamposRol();
    }
    
    // Cargar comunidades en los selects
    cargarComunidadesParaModal();
    
    const modal = new bootstrap.Modal(document.getElementById('modalUsuario'));
    modal.show();
}

async function cargarComunidadesParaModal() {
    try {
        const snapshot = await db.collection('comunidades').where('activa', '==', true).orderBy('nombre').get();
        const selectMaestro = document.getElementById('comunidadMaestro');
        const checklistContainer = document.getElementById('checklistComunidades');
        
        // Limpiar selects
        selectMaestro.innerHTML = '<option value="">Selecciona una comunidad</option>';
        checklistContainer.innerHTML = '';
        
        // Llenar select para maestros
        snapshot.forEach(doc => {
            const comunidad = doc.data();
            
            // Para select de maestros
            const option = document.createElement('option');
            option.value = doc.id;
            option.text = comunidad.nombre;
            selectMaestro.add(option.cloneNode(true));
            
            // Para checklist de responsables
            const checkDiv = document.createElement('div');
            checkDiv.className = 'form-check';
            checkDiv.innerHTML = `
                <input class="form-check-input comunidad-checkbox" type="checkbox" 
                       value="${doc.id}" id="check-com-${doc.id}">
                <label class="form-check-label" for="check-com-${doc.id}">
                    ${comunidad.nombre}
                </label>
            `;
            checklistContainer.appendChild(checkDiv);
        });
        
    } catch (error) {
        console.error('Error cargando comunidades para modal:', error);
    }
}

function cambiarCamposRol() {
    const rol = document.getElementById('rolUsuario').value;
    const camposMaestro = document.getElementById('camposMaestro');
    const camposResponsable = document.getElementById('camposResponsable');
    
    if (rol === 'maestro') {
        camposMaestro.style.display = 'flex';
        camposResponsable.style.display = 'none';
        document.getElementById('comunidadMaestro').required = true;
    } else if (rol === 'responsable') {
        camposMaestro.style.display = 'none';
        camposResponsable.style.display = 'block';
        document.getElementById('comunidadMaestro').required = false;
    } else {
        camposMaestro.style.display = 'none';
        camposResponsable.style.display = 'none';
        document.getElementById('comunidadMaestro').required = false;
    }
}

async function guardarUsuario() {
    const form = document.getElementById('formUsuario');
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
    const usuarioId = document.getElementById('usuarioId').value;
    const nombre = document.getElementById('nombreUsuario').value;
    const email = document.getElementById('emailUsuario').value;
    const telefono = document.getElementById('telefonoUsuario').value;
    const rol = document.getElementById('rolUsuario').value;
    const password = document.getElementById('passwordUsuario').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const estado = document.getElementById('estadoUsuario').value;
    const fechaIngreso = document.getElementById('fechaIngreso').value;
    const observaciones = document.getElementById('observacionesUsuario').value;
    
    // Validar contraseña
    if (password !== confirmPassword) {
        mostrarAlerta('Las contraseñas no coinciden', 'danger');
        return;
    }
    
    if (password.length < 6) {
        mostrarAlerta('La contraseña debe tener al menos 6 caracteres', 'danger');
        return;
    }
    
    try {
        const usuarioData = {
            nombre: nombre,
            email: email,
            telefono: telefono,
            rol: rol,
            estado: estado,
            fecha_creacion: new Date().toISOString(),
            observaciones: observaciones
        };
        
        if (fechaIngreso) {
            usuarioData.fecha_ingreso = fechaIngreso;
        }
        
        // Agregar datos específicos según rol
        if (rol === 'maestro') {
            const comunidadId = document.getElementById('comunidadMaestro').value;
            const escuela = document.getElementById('escuelaMaestro').value;
            
            if (!comunidadId) {
                mostrarAlerta('Selecciona una comunidad para el maestro', 'warning');
                return;
            }
            
            // Obtener nombre de la comunidad
            const comunidadDoc = await db.collection('comunidades').doc(comunidadId).get();
            if (comunidadDoc.exists) {
                usuarioData.comunidad = comunidadDoc.data().nombre;
                usuarioData.comunidad_id = comunidadId;
            }
            
            if (escuela) {
                usuarioData.escuela = escuela;
            }
            
        } else if (rol === 'responsable') {
            const checkboxes = document.querySelectorAll('.comunidad-checkbox:checked');
            const comunidadesSeleccionadas = Array.from(checkboxes).map(cb => cb.value);
            
            if (comunidadesSeleccionadas.length === 0) {
                mostrarAlerta('Selecciona al menos una comunidad para el responsable', 'warning');
                return;
            }
            
            // Obtener nombres de las comunidades
            const comunidadesNombres = [];
            for (const comId of comunidadesSeleccionadas) {
                const comDoc = await db.collection('comunidades').doc(comId).get();
                if (comDoc.exists) {
                    comunidadesNombres.push(comDoc.data().nombre);
                }
            }
            
            usuarioData.comunidades = comunidadesNombres;
            usuarioData.comunidades_ids = comunidadesSeleccionadas;
        }
        
        if (usuarioId) {
            // Actualizar usuario existente
            await db.collection('usuarios').doc(usuarioId).update(usuarioData);
            mostrarAlerta('Usuario actualizado exitosamente', 'success');
        } else {
            // Crear nuevo usuario
            // Primero crear cuenta de autenticación
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const firebaseUserId = userCredential.user.uid;
            
            // Guardar en Firestore con el mismo ID
            usuarioData.auth_uid = firebaseUserId;
            await db.collection('usuarios').doc(firebaseUserId).set(usuarioData);
            
            // Cerrar sesión del usuario recién creado (mantener sesión admin)
            await auth.signOut();
            // Volver a iniciar sesión como admin
            // (Necesitarías guardar las credenciales del admin)
            
            mostrarAlerta('Usuario creado exitosamente', 'success');
        }
        
        // Cerrar modal y recargar
        bootstrap.Modal.getInstance(document.getElementById('modalUsuario')).hide();
        await cargarUsuariosCompletos();
        actualizarEstadisticas();
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
}

async function editarUsuario(usuarioId) {
    try {
        const doc = await db.collection('usuarios').doc(usuarioId).get();
        if (!doc.exists) {
            mostrarAlerta('Usuario no encontrado', 'warning');
            return;
        }
        
        const usuario = doc.data();
        
        // Llenar formulario
        document.getElementById('modalUsuarioTitulo').innerHTML = '<i class="fas fa-edit"></i> Editar Usuario';
        document.getElementById('usuarioId').value = usuarioId;
        document.getElementById('nombreUsuario').value = usuario.nombre || '';
        document.getElementById('emailUsuario').value = usuario.email || '';
        document.getElementById('telefonoUsuario').value = usuario.telefono || '';
        document.getElementById('rolUsuario').value = usuario.rol || 'maestro';
        document.getElementById('estadoUsuario').value = usuario.estado || 'activo';
        document.getElementById('fechaIngreso').value = usuario.fecha_ingreso || '';
        document.getElementById('observacionesUsuario').value = usuario.observaciones || '';
        
        // Cambiar campos según rol
        cambiarCamposRol();
        
        // Cargar comunidades y seleccionar las adecuadas
        await cargarComunidadesParaModal();
        
        if (usuario.rol === 'maestro' && usuario.comunidad_id) {
            document.getElementById('comunidadMaestro').value = usuario.comunidad_id;
            document.getElementById('escuelaMaestro').value = usuario.escuela || '';
        } else if (usuario.rol === 'responsable' && usuario.comunidades_ids) {
            usuario.comunidades_ids.forEach(comId => {
                const checkbox = document.querySelector(`#check-com-${comId}`);
                if (checkbox) checkbox.checked = true;
            });
        }
        
        // Quitar required de contraseña para edición
        document.getElementById('passwordUsuario').required = false;
        document.getElementById('confirmPassword').required = false;
        
        const modal = new bootstrap.Modal(document.getElementById('modalUsuario'));
        modal.show();
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
}

function verDetallesUsuario(usuarioId) {
    // Abrir modal con detalles completos del usuario
    // Esta función se puede expandir según necesidades
    window.open(`detalles-usuario.html?id=${usuarioId}`, '_blank');
}

async function resetearPassword(usuarioId) {
    const nuevaPassword = prompt('Ingresa la nueva contraseña (mínimo 6 caracteres):');
    if (!nuevaPassword || nuevaPassword.length < 6) {
        mostrarAlerta('La contraseña debe tener al menos 6 caracteres', 'warning');
        return;
    }
    
    if (confirm('¿Estás seguro de resetear la contraseña de este usuario?')) {
        try {
            // Obtener email del usuario
            const doc = await db.collection('usuarios').doc(usuarioId).get();
            if (!doc.exists) {
                mostrarAlerta('Usuario no encontrado', 'warning');
                return;
            }
            
            const email = doc.data().email;
            
            // Resetear contraseña usando Firebase Auth
            // Nota: Necesitas permisos especiales para esto
            // En una implementación real, usarías Firebase Admin SDK en el backend
            // O el método sendPasswordResetEmail
            
            // Por ahora, solo actualizaremos en Firestore que se debe resetear
            await db.collection('usuarios').doc(usuarioId).update({
                password_reset_required: true,
                password_reset_requested: new Date().toISOString(),
                password_reset_by: currentUser.uid
            });
            
            mostrarAlerta('Solicitud de reset de contraseña registrada. El usuario deberá usar "Olvidé mi contraseña".', 'success');
            
        } catch (error) {
            mostrarAlerta('Error: ' + error.message, 'danger');
        }
    }
}

async function eliminarUsuarioConfirmar(usuarioId) {
    if (confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) {
        const confirmacion = prompt('Escribe "ELIMINAR" para confirmar:');
        if (confirmacion === 'ELIMINAR') {
            await eliminarUsuario(usuarioId);
        } else {
            mostrarAlerta('Eliminación cancelada', 'info');
        }
    }
}

async function eliminarUsuario(usuarioId) {
    try {
        // Marcar como inactivo en lugar de eliminar (borrado lógico)
        await db.collection('usuarios').doc(usuarioId).update({
            estado: 'inactivo',
            eliminado: new Date().toISOString(),
            eliminado_por: currentUser.uid
        });
        
        mostrarAlerta('Usuario marcado como inactivo', 'success');
        await cargarUsuariosCompletos();
        actualizarEstadisticas();
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
}

function actualizarEstadisticas() {
    // Esta función calcularía estadísticas en tiempo real
    // Por ahora es un placeholder
    setTimeout(() => {
        document.getElementById('estadisticasUsuarios').innerHTML = `
            <div class="small">
                <div class="d-flex justify-content-between mb-1">
                    <span>Maestros activos:</span>
                    <span class="badge bg-success">12</span>
                </div>
                <div class="d-flex justify-content-between mb-1">
                    <span>Responsables activos:</span>
                    <span class="badge bg-warning">3</span>
                </div>
                <div class="d-flex justify-content-between mb-1">
                    <span>Usuarios inactivos:</span>
                    <span class="badge bg-danger">2</span>
                </div>
                <div class="d-flex justify-content-between mb-1">
                    <span>Total usuarios:</span>
                    <span class="badge bg-primary">17</span>
                </div>
                <hr>
                <div class="text-center">
                    <small class="text-muted">Última actualización: ${new Date().toLocaleTimeString()}</small>
                </div>
            </div>
        `;
    }, 500);
}

function exportarUsuariosExcel() {
    // Implementar exportación a Excel
    // Podrías usar una librería como SheetJS
    mostrarAlerta('Exportación a Excel en desarrollo', 'info');
}

function importarUsuariosCSV() {
    // Implementar importación desde CSV
    mostrarAlerta('Importación desde CSV en desarrollo', 'info');
}