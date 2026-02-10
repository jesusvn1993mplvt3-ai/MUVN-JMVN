// config.js - Configuración Firebase Realtime Database (sin Auth)
const firebaseConfig = {
    apiKey: "AIzaSyD03j-v-L3pckYW-GC2YfmKI3E08i1atx0",
    authDomain: "conafe-muvn.firebaseapp.com",
    databaseURL: "https://conafe-muvn-default-rtdb.firebaseio.com",
    projectId: "conafe-muvn",
    storageBucket: "conafe-muvn.firebasestorage.app",
    messagingSenderId: "149350241710",
    appId: "1:149350241710:web:59a48078b4f1c4fa33643f"
};

// Inicializar Firebase sin Auth
firebase.initializeApp(firebaseConfig);

// Obtener referencias
const database = firebase.database();

// Referencias principales
const db = {
    usuarios: database.ref('usuarios'),
    comunidades: database.ref('comunidades'),
    asistencias: database.ref('asistencias'),
    actividades: database.ref('actividades'),
    configuracion: database.ref('configuracion')
};

// Colores CONAFE
const coloresCONAFE = {
    primario: '#0066cc',
    secundario: '#004d99',
    verde: '#28a745',
    amarillo: '#ffc107',
    naranja: '#fd7e14',
    rojo: '#dc3545'
};

// Función para generar ID único
function generarId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Función para mostrar alertas
function mostrarAlerta(mensaje, tipo = 'info', duracion = 5000) {
    // Crear contenedor si no existe
    let container = document.getElementById('alert-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'alert-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }
    
    // Crear alerta
    const alert = document.createElement('div');
    alert.className = `alert alert-${tipo}`;
    alert.style.cssText = `
        padding: 15px 20px;
        border-radius: 8px;
        margin-bottom: 10px;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        position: relative;
        min-width: 300px;
    `;
    
    // Estilos por tipo
    const estilos = {
        success: { 
            background: '#d4edda', 
            color: '#155724', 
            borderLeft: '4px solid #28a745' 
        },
        danger: { 
            background: '#f8d7da', 
            color: '#721c24', 
            borderLeft: '4px solid #dc3545' 
        },
        warning: { 
            background: '#fff3cd', 
            color: '#856404', 
            borderLeft: '4px solid #ffc107' 
        },
        info: { 
            background: '#d1ecf1', 
            color: '#0c5460', 
            borderLeft: '4px solid #17a2b8' 
        }
    };
    
    Object.assign(alert.style, estilos[tipo]);
    
    // Iconos
    const iconos = {
        success: '✓',
        danger: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    
    alert.innerHTML = `
        <strong style="margin-right: 10px;">${iconos[tipo]}</strong>
        ${mensaje}
        <button onclick="this.parentElement.remove()" style="
            background: none;
            border: none;
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            font-size: 1.2rem;
            opacity: 0.7;
        ">&times;</button>
    `;
    
    container.appendChild(alert);
    
    // Animación de entrada
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    // Auto-eliminar
    setTimeout(() => {
        if (alert.parentNode) {
            alert.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => alert.remove(), 300);
        }
    }, duracion);
}

// Función para formatear fecha
function formatearFecha(fechaISO) {
    if (!fechaISO) return 'No especificada';
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Función para formatear fecha corta
function formatearFechaCorta(fechaISO) {
    if (!fechaISO) return '';
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-MX');
}

// Función para guardar sesión
function guardarSesion(usuario) {
    // No guardar contraseña por seguridad
    const { password, ...usuarioSeguro } = usuario;
    localStorage.setItem('usuarioConectado', JSON.stringify(usuarioSeguro));
}

// Función para obtener sesión
function obtenerSesion() {
    const sesion = localStorage.getItem('usuarioConectado');
    return sesion ? JSON.parse(sesion) : null;
}

// Función para cerrar sesión
function cerrarSesion() {
    localStorage.removeItem('usuarioConectado');
    window.location.href = 'index.html';
}

// Verificar autenticación en páginas protegidas
function verificarAutenticacion() {
    const usuario = obtenerSesion();
    const paginasProtegidas = ['dashboard', 'admin', 'comunidades', 'registro-movil', 
                               'detalles-comunidad', 'usuarios', 'asistencias', 
                               'actividades', 'reportes', 'configuracion', 'asistencia'];
    const rutaActual = window.location.pathname;
    
    // Verificar si estamos en una página protegida
    const esPaginaProtegida = paginasProtegidas.some(pagina => 
        rutaActual.includes(pagina) || 
        rutaActual.includes(`${pagina}.html`)
    );
    
    if (esPaginaProtegida && !usuario) {
        window.location.href = 'index.html';
        return false;
    }
    
    return usuario;
}

// Función para generar contraseña
function generarPassword() {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return password;
}

// Inicializar datos por defecto si no existen
async function inicializarDatosPorDefecto() {
    try {
        // Verificar si existe algún usuario
        const usuariosSnapshot = await db.usuarios.limitToFirst(1).once('value');
        
        if (!usuariosSnapshot.exists()) {
            console.log('Creando datos iniciales...');
            
            // Crear usuario administrador por defecto
            const adminId = generarId();
            const adminData = {
                id: adminId,
                nombre: 'Administrador CONAFE',
                email: 'admin@conafe.edu.mx',
                telefono: '1234567890',
                rol: 'admin',
                password: 'conafe2024', // Contraseña simple para desarrollo
                activo: true,
                creado_en: new Date().toISOString(),
                actualizado_en: new Date().toISOString()
            };
            
            await db.usuarios.child(adminId).set(adminData);
            
            // Crear usuario responsable
            const responsableId = generarId();
            const responsableData = {
                id: responsableId,
                nombre: 'Responsable CONAFE',
                email: 'responsable@conafe.edu.mx',
                telefono: '0987654321',
                rol: 'responsable',
                password: 'conafe2024',
                activo: true,
                creado_en: new Date().toISOString(),
                actualizado_en: new Date().toISOString()
            };
            
            await db.usuarios.child(responsableId).set(responsableData);
            
            // Crear usuario maestro
            const maestroId = generarId();
            const maestroData = {
                id: maestroId,
                nombre: 'Maestro Ejemplo',
                email: 'maestro@conafe.edu.mx',
                telefono: '1122334455',
                rol: 'maestro',
                password: 'conafe2024',
                activo: true,
                creado_en: new Date().toISOString(),
                actualizado_en: new Date().toISOString()
            };
            
            await db.usuarios.child(maestroId).set(maestroData);
            
            // Crear comunidad de ejemplo
            const comunidadId = generarId();
            const comunidadData = {
                id: comunidadId,
                nombre: 'San Juan de la Montaña',
                municipio: 'Yuriria',
                tipo: 'rural',
                poblacion: 1200,
                activa: true,
                escuelas: ['Primaria "Benito Juárez"', 'Telesecundaria 456'],
                creado_en: new Date().toISOString()
            };
            
            await db.comunidades.child(comunidadId).set(comunidadData);
            
            // Asignar comunidad al maestro
            await db.usuarios.child(maestroId).update({
                comunidad_id: comunidadId,
                comunidad_nombre: comunidadData.nombre
            });
            
            console.log('Datos iniciales creados exitosamente');
            mostrarAlerta('Base de datos inicializada con datos de ejemplo', 'success');
        }
    } catch (error) {
        console.error('Error inicializando datos:', error);
        mostrarAlerta('Error inicializando datos: ' + error.message, 'danger');
    }
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', function() {
    // Solo inicializar datos si estamos en index.html
    if (window.location.pathname.includes('index.html') || 
        window.location.pathname.endsWith('/')) {
        inicializarDatosPorDefecto();
    }
    
    // Verificar autenticación en páginas protegidas
    if (!window.location.pathname.includes('index.html') && 
        !window.location.pathname.endsWith('/')) {
        setTimeout(() => verificarAutenticacion(), 100);
    }
});

// Sistema de autenticación simple
async function autenticarUsuario(email, password, tipoUsuario) {
    try {
        // Buscar usuario por email
        const snapshot = await db.usuarios
            .orderByChild('email')
            .equalTo(email.toLowerCase())
            .once('value');
        
        if (!snapshot.exists()) {
            return { success: false, message: 'Usuario no encontrado' };
        }
        
        // Obtener usuario
        let usuario = null;
        snapshot.forEach(childSnapshot => {
            usuario = childSnapshot.val();
            usuario.id = childSnapshot.key;
        });
        
        // Verificar contraseña
        if (usuario.password !== password) {
            return { success: false, message: 'Contraseña incorrecta' };
        }
        
        // Verificar rol
        if (tipoUsuario && usuario.rol !== tipoUsuario) {
            return { 
                success: false, 
                message: `Este usuario no es un ${tipoUsuario === 'maestro' ? 'maestro' : 'responsable'}` 
            };
        }
        
        // Verificar si está activo
        if (usuario.activo === false) {
            return { success: false, message: 'Usuario inactivo. Contacta al administrador.' };
        }
        
        // Éxito
        return { success: true, usuario: usuario };
        
    } catch (error) {
        console.error('Error en autenticación:', error);
        return { success: false, message: 'Error en el sistema de autenticación' };
    }
}

// Exportar al scope global
window.conafeConfig = {
    database,
    db,
    coloresCONAFE,
    generarId,
    mostrarAlerta,
    formatearFecha,
    formatearFechaCorta,
    guardarSesion,
    obtenerSesion,
    cerrarSesion,
    verificarAutenticacion,
    generarPassword,
    autenticarUsuario
};