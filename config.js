// config.js - Configuración Firebase Realtime Database
const firebaseConfig = {
    apiKey: "AIzaSyD03j-v-L3pckYW-GC2YfmKI3E08i1atx0",
    authDomain: "conafe-muvn.firebaseapp.com",
    databaseURL: "https://conafe-muvn-default-rtdb.firebaseio.com",
    projectId: "conafe-muvn",
    storageBucket: "conafe-muvn.firebasestorage.app",
    messagingSenderId: "149350241710",
    appId: "1:149350241710:web:59a48078b4f1c4fa33643f"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Obtener referencias
const database = firebase.database();
const auth = firebase.auth();

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
    primario: '#0066cc',      // Azul CONAFE
    secundario: '#004d99',    // Azul oscuro
    verde: '#28a745',         // Verde
    amarillo: '#ffc107',      // Amarillo
    naranja: '#fd7e14',       // Naranja
    rojo: '#dc3545'           // Rojo
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
            borderLeft: `4px solid ${coloresCONAFE.verde}` 
        },
        danger: { 
            background: '#f8d7da', 
            color: '#721c24', 
            borderLeft: `4px solid ${coloresCONAFE.rojo}` 
        },
        warning: { 
            background: '#fff3cd', 
            color: '#856404', 
            borderLeft: `4px solid ${coloresCONAFE.amarillo}` 
        },
        info: { 
            background: '#d1ecf1', 
            color: '#0c5460', 
            borderLeft: `4px solid ${coloresCONAFE.primario}` 
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
    const { password, password_temporal, ...usuarioSeguro } = usuario;
    localStorage.setItem('usuarioConectado', JSON.stringify(usuarioSeguro));
}

// Función para obtener sesión
function obtenerSesion() {
    const sesion = localStorage.getItem('usuarioConectado');
    return sesion ? JSON.parse(sesion) : null;
}

// Función para cerrar sesión
function cerrarSesion() {
    auth.signOut().then(() => {
        localStorage.removeItem('usuarioConectado');
        window.location.href = 'index.html';
    }).catch(error => {
        console.error('Error cerrando sesión:', error);
        localStorage.removeItem('usuarioConectado');
        window.location.href = 'index.html';
    });
}

// Verificar autenticación en páginas protegidas
function verificarAutenticacion() {
    const usuario = obtenerSesion();
    const paginasProtegidas = ['dashboard', 'admin', 'comunidades', 'registro-movil', 
                               'detalles-comunidad', 'usuarios', 'asistencias', 
                               'actividades', 'reportes', 'configuracion'];
    const rutaActual = window.location.pathname;
    
    if (paginasProtegidas.some(pagina => rutaActual.includes(pagina))) {
        if (!usuario) {
            window.location.href = 'index.html';
            return false;
        }
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
            // Crear usuario administrador por defecto
            const adminId = generarId();
            const adminData = {
                id: adminId,
                nombre: 'Administrador CONAFE',
                email: 'admin@conafe.edu.mx',
                telefono: '1234567890',
                rol: 'admin',
                activo: true,
                creado_en: firebase.database.ServerValue.TIMESTAMP,
                actualizado_en: firebase.database.ServerValue.TIMESTAMP
            };
            
            await db.usuarios.child(adminId).set(adminData);
            
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
                creado_en: firebase.database.ServerValue.TIMESTAMP
            };
            
            await db.comunidades.child(comunidadId).set(comunidadData);
            
            console.log('Datos iniciales creados');
        }
    } catch (error) {
        console.error('Error inicializando datos:', error);
    }
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', function() {
    // Solo inicializar datos si estamos en index.html
    if (window.location.pathname.includes('index.html')) {
        inicializarDatosPorDefecto();
    }
});

// Exportar al scope global
window.conafeConfig = {
    database,
    db,
    auth,
    coloresCONAFE,
    generarId,
    mostrarAlerta,
    formatearFecha,
    formatearFechaCorta,
    guardarSesion,
    obtenerSesion,
    cerrarSesion,
    verificarAutenticacion,
    generarPassword
};