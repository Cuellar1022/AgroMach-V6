/**
 * AgroMatch Dashboard - JavaScript para Agricultor COMPLETO
 * VERSIÓN ACTUALIZADA CON DUPLICAR + FOTO DE PERFIL
 */

// ================================================================
// VARIABLES GLOBALES
// ================================================================

let currentUser = {
    firstName: 'Carlos',
    lastName: 'González',
    role: 'Agricultor',
    email: 'carlos@finca.com',
    fotoUrl: null,
    isLoggedIn: false
};

let map = null;
let ofertasData = [];

// ================================================================
// VERIFICACIÓN DE SESIÓN
// ================================================================
async function verificarSesionActiva() {
    try {
        const response = await fetch('/check_session', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok || response.status === 401) {
            window.location.replace('/vista/login-trabajador.html?message=Sesión expirada&type=error');
            return false;
        }
        
        const data = await response.json();
        
        if (!data.authenticated || data.user_role !== 'Agricultor') {
            window.location.replace('/vista/login-trabajador.html?message=Por favor inicia sesión&type=error');
            return false;
        }
        
        return true;
        
    } catch (error) {
        console.error('Error verificando sesión:', error);
        window.location.replace('/vista/login-trabajador.html?message=Error de conexión&type=error');
        return false;
    }
}

window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        verificarSesionActiva();
    }
});

if (window.performance && window.performance.navigation.type === 2) {
    window.location.reload(true);
}

setInterval(verificarSesionActiva, 5 * 60 * 1000);

// ================================================================
// INICIALIZACIÓN PRINCIPAL
// ================================================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🌱 Iniciando Dashboard Agricultor...');
    
    await verificarSesionActiva();
    setupEventListeners();
    await fetchUserSession();
    await cargarOfertasDelAgricultor();
    setTimeout(initMap, 500);
    
    console.log('✅ Dashboard inicializado');
});

// ================================================================
// GESTIÓN DE SESIÓN CON FOTO DE PERFIL
// ================================================================

async function fetchUserSession() {
    try {
        const response = await fetch('/get_user_session', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.ok) {
            const data = await response.json();
            
            if (data.success && data.user) {
                currentUser = {
                    firstName: data.user.first_name,
                    lastName: data.user.last_name,
                    role: data.user.role,
                    email: data.user.email,
                    username: data.user.username,
                    userId: data.user.user_id,
                    telefono: data.user.telefono || '',
                    fotoUrl: data.user.url_foto || null,  // 🔥 NUEVO
                    isLoggedIn: true
                };

                console.log('✅ Usuario cargado:', currentUser);
                updateUIWithUserData();
                updateProfilePhoto();  // 🔥 NUEVO
                return true;
            }
        }
        
        currentUser.isLoggedIn = true;
        updateUIWithUserData();
        return true;
        
    } catch (error) {
        console.error('Error conectando con servidor:', error);
        currentUser.isLoggedIn = true;
        updateUIWithUserData();
        return true;
    }
}

function updateUIWithUserData() {
    const header = document.querySelector('.header .logo');
    if (header && !document.querySelector('.user-welcome')) {
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'user-welcome';
        welcomeDiv.innerHTML = `
            <span style="margin-left: 20px; color: #4a7c59; font-weight: 600;">
                🌾 Bienvenido, ${currentUser.firstName}
            </span>
        `;
        header.parentNode.insertBefore(welcomeDiv, header.nextSibling);
    }
}

// 🔥 NUEVA FUNCIÓN PARA ACTUALIZAR FOTO
function updateProfilePhoto() {
    const profileMenuBtn = document.getElementById('profileMenuBtn');
    
    if (profileMenuBtn) {
        if (currentUser.fotoUrl) {
            // Si hay foto, mostrarla
            profileMenuBtn.innerHTML = `
                <img src="${currentUser.fotoUrl}" 
                     alt="Foto de perfil" 
                     style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
            `;
        } else {
            // Si no hay foto, mostrar icono
            profileMenuBtn.innerHTML = '<i class="fas fa-user"></i>';
        }
        console.log('📸 Foto de perfil actualizada:', currentUser.fotoUrl ? 'Con foto' : 'Sin foto');
    }
}

// ================================================================
// MENÚ DESPLEGABLE DE USUARIO
// ================================================================

function toggleProfileMenu() {
    const existingDropdown = document.getElementById('profileDropdown');
    if (existingDropdown) {
        existingDropdown.remove();
    }

    const dropdown = document.createElement('div');
    dropdown.id = 'profileDropdown';
    dropdown.className = 'profile-dropdown-dynamic';
    
    // 🔥 ACTUALIZADO: Incluir foto de perfil
    dropdown.innerHTML = `
        <div class="profile-dropdown-header">
            <div class="profile-dropdown-avatar">
                ${currentUser.fotoUrl ? 
                    `<img src="${currentUser.fotoUrl}" 
                          alt="${currentUser.firstName}" 
                          style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` :
                    `<i class="fas fa-user"></i>`
                }
            </div>
            <div class="profile-dropdown-name">${currentUser.firstName} ${currentUser.lastName}</div>
            <div class="profile-dropdown-role">
                <i class="fas fa-seedling"></i>
                <span>${currentUser.role}</span>
            </div>
        </div>
        
        <div class="profile-dropdown-menu">
            <div class="profile-dropdown-item" onclick="viewProfile(); closeProfileMenu()">
                <div class="icon"><i class="fas fa-user-circle"></i></div>
                <span>Mi Perfil</span>
            </div>
            
            <div class="profile-dropdown-item" onclick="showHistorialContrataciones(); closeProfileMenu()">
                <div class="icon"><i class="fas fa-history"></i></div>
                <span>Historial de Contrataciones</span>
            </div>
            
            <div class="profile-dropdown-item" onclick="showEstadisticas(); closeProfileMenu()">
                <div class="icon"><i class="fas fa-chart-line"></i></div>
                <span>Mis Estadísticas</span>
            </div>
            
            <div class="profile-dropdown-item" onclick="viewSettings(); closeProfileMenu()">
                <div class="icon"><i class="fas fa-cog"></i></div>
                <span>Configuración</span>
            </div>
            
            <div class="profile-dropdown-item" onclick="showAyudaSoporte(); closeProfileMenu()">
                <div class="icon"><i class="fas fa-question-circle"></i></div>
                <span>Ayuda y Soporte</span>
            </div>
            
            <div class="profile-dropdown-item logout" onclick="confirmLogout(); closeProfileMenu()">
                <div class="icon"><i class="fas fa-sign-out-alt"></i></div>
                <span>Cerrar Sesión</span>
            </div>
        </div>
    `;

    dropdown.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 9999;
        background: white;
        border-radius: 15px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(74, 124, 89, 0.2);
        min-width: 280px;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-10px);
        transition: all 0.3s ease;
    `;

    document.body.appendChild(dropdown);

    setTimeout(() => {
        dropdown.style.opacity = '1';
        dropdown.style.visibility = 'visible';
        dropdown.style.transform = 'translateY(0)';
    }, 10);

    addDropdownStyles();

    const overlay = document.getElementById('overlay');
    if (overlay) {
        overlay.classList.add('show');
        overlay.onclick = closeProfileMenu;
    }
}

function addDropdownStyles() {
    if (document.getElementById('dropdown-styles')) return;

    const style = document.createElement('style');
    style.id = 'dropdown-styles';
    style.textContent = `
        .profile-dropdown-header {
            padding: 20px;
            text-align: center;
            background: linear-gradient(135deg, rgba(74, 124, 89, 0.1), rgba(144, 238, 144, 0.1));
            border-bottom: 1px solid rgba(74, 124, 89, 0.2);
        }
        .profile-dropdown-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(135deg, #4a7c59, #1e3a2e);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 10px;
            font-size: 20px;
            overflow: hidden;
        }
        .profile-dropdown-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .profile-dropdown-name {
            font-size: 16px;
            font-weight: 700;
            color: #1e3a2e;
            margin-bottom: 5px;
        }
        .profile-dropdown-role {
            font-size: 14px;
            color: #4a7c59;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
        }
        .profile-dropdown-menu {
            padding: 10px 0;
        }
        .profile-dropdown-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 20px;
            color: #1e3a2e;
            cursor: pointer;
            transition: all 0.2s ease;
            border-bottom: 1px solid rgba(74, 124, 89, 0.1);
        }
        .profile-dropdown-item:hover {
            background: rgba(74, 124, 89, 0.1);
            padding-left: 25px;
        }
        .profile-dropdown-item.logout {
            color: #dc2626;
            border-top: 1px solid rgba(220, 38, 38, 0.2);
            margin-top: 5px;
        }
        .profile-dropdown-item.logout:hover {
            background: rgba(220, 38, 38, 0.1);
        }
        .profile-dropdown-item .icon {
            width: 20px;
            text-align: center;
        }
        .overlay.show {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.3);
            z-index: 9998;
        }
    `;
    document.head.appendChild(style);
}

function closeProfileMenu() {
    const dropdown = document.getElementById('profileDropdown');
    const overlay = document.getElementById('overlay');
    
    if (dropdown) {
        dropdown.style.opacity = '0';
        dropdown.style.visibility = 'hidden';
        dropdown.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            if (dropdown.parentNode) {
                dropdown.parentNode.removeChild(dropdown);
            }
        }, 300);
    }
    
    if (overlay) {
        overlay.classList.remove('show');
        overlay.onclick = null;
    }
}

function viewProfile() {
    console.log('👤 Navegando al perfil del agricultor...');
    closeProfileMenu();
    window.location.href = 'perfil-agricultor.html';
}

function viewSettings() {
    showStatusMessage('Cargando configuración...', 'info');
}

function showHistorialContrataciones() {
    console.log('📋 Navegando a Historial de Contrataciones...');
    window.location.href = 'historial-contrataciones.html';
}

function showEstadisticas() {
    console.log('📊 Navegando a Mis Estadísticas...');
    window.location.href = 'estadisticas-agricultor.html';
}

function showAyudaSoporte() {
    console.log('❓ Navegando a Ayuda y Soporte...');
    window.location.href = 'soporte-agricultor.html';
}

function confirmLogout() {
    if (confirm(`¿Seguro que deseas cerrar sesión, ${currentUser.firstName}?`)) {
        executeLogout();
    }
}

async function executeLogout() {
    showStatusMessage('Cerrando sesión...', 'info');
    
    try {
        const response = await fetch('/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            sessionStorage.clear();
            localStorage.removeItem('user_data');
            
            setTimeout(() => {
                window.location.replace('/vista/login-trabajador.html?message=Sesión cerrada&type=success');
            }, 1500);
        }
    } catch (error) {
        console.error('Error en logout:', error);
        setTimeout(() => {
            window.location.replace('/vista/login-trabajador.html');
        }, 1500);
    }
}

// ================================================================
// GESTIÓN DE OFERTAS
// ================================================================

async function cargarOfertasDelAgricultor() {
    try {
        console.log('🔄 Cargando ofertas del agricultor...');
        
        const response = await fetch('/api/get_farmer_jobs', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            ofertasData = data.ofertas || [];
            mostrarOfertasEnDashboard(ofertasData);
            actualizarEstadisticas(data.estadisticas);
            console.log(`✅ ${ofertasData.length} ofertas cargadas`);
        } else {
            throw new Error(data.message || 'Error al cargar ofertas');
        }
        
    } catch (error) {
        console.error('❌ Error cargando ofertas:', error);
        showStatusMessage('Error al cargar ofertas: ' + error.message, 'error');
        mostrarOfertasEnDashboard([]);
    }
}

function mostrarOfertasEnDashboard(ofertas) {
    const container = document.getElementById('ofertasContainer');
    
    if (!container) {
        console.error('❌ No se encontró el contenedor de ofertas');
        return;
    }
    
    container.innerHTML = '';
    
    if (ofertas.length === 0) {
        container.innerHTML = `
            <div class="section-title" style="margin: 30px 0 20px 0;">
                <i class="fas fa-clipboard-list"></i>
                Mis Ofertas Publicadas
            </div>
            <div class="no-ofertas">
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    <div style="font-size: 48px; margin-bottom: 15px; color: #4a7c59;">
                        <i class="fas fa-seedling"></i>
                    </div>
                    <h3 style="color: #1e3a2e; margin-bottom: 10px;">No tienes ofertas publicadas</h3>
                    <p>Crea tu primera oferta para encontrar trabajadores.</p>
                    <button class="btn btn-primary" onclick="createNewOffer()" style="margin-top: 15px;">
                        <i class="fas fa-plus"></i> Crear Primera Oferta
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="section-title" style="margin: 30px 0 20px 0;">
            <i class="fas fa-clipboard-list"></i>
            Mis Ofertas Publicadas (${ofertas.length})
        </div>
    `;
    
    ofertas.forEach(oferta => {
        const ofertaCard = crearTarjetaOferta(oferta);
        container.appendChild(ofertaCard);
    });
}

function crearTarjetaOferta(oferta) {
    const div = document.createElement('div');
    div.className = 'offer-card';
    
    const fechaPublicacion = new Date(oferta.fecha_publicacion);
    const ahora = new Date();
    const diasPublicada = Math.floor((ahora - fechaPublicacion) / (1000 * 60 * 60 * 24));
    
    const estadoInfo = obtenerEstadoOferta(oferta.estado);
    
    const tituloEscapado = oferta.titulo.replace(/'/g, "\\'");
    
    // 🔥 ACTUALIZADO: Agregar botón de duplicar
    div.innerHTML = `
        <div class="offer-header">
            <div class="offer-title">${oferta.titulo}</div>
            <div class="offer-actions">
                <button class="btn-icon btn-icon-duplicate" data-action="duplicar" data-id="${oferta.id_oferta}" title="Duplicar oferta">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="btn-icon" data-action="editar" data-id="${oferta.id_oferta}" title="Editar oferta">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-icon-delete" data-action="eliminar" data-id="${oferta.id_oferta}" title="Eliminar oferta">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        
        <div class="offer-details">
            <p class="offer-description">${oferta.descripcion}</p>
            
            <div class="offer-meta">
                <div class="offer-meta-item">
                    <i class="fas fa-dollar-sign"></i>
                    <span><strong>$${Number(oferta.pago_ofrecido).toLocaleString()} COP</strong></span>
                </div>
                
                <div class="offer-meta-item">
                    <i class="fas fa-calendar"></i>
                    <span>Hace ${diasPublicada === 0 ? 'hoy' : diasPublicada + ' día' + (diasPublicada > 1 ? 's' : '')}</span>
                </div>
                
                <div class="offer-meta-item">
                    <i class="fas fa-users"></i>
                    <span>${oferta.num_postulaciones || 0} postulaciones</span>
                </div>
                
                ${oferta.ubicacion ? `
                <div class="offer-meta-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${oferta.ubicacion}</span>
                </div>` : ''}
            </div>
        </div>
        
        <div class="offer-footer">
            <div class="offer-status">
                <span class="status-badge ${estadoInfo.clase}">${estadoInfo.texto}</span>
            </div>
            
            <div class="offer-actions">
                <button class="btn btn-secondary btn-ver-postulaciones" 
                        data-oferta-id="${oferta.id_oferta}" 
                        data-num-postulaciones="${oferta.num_postulaciones || 0}">
                    <i class="fas fa-eye"></i> 
                    Ver Postulaciones (${oferta.num_postulaciones || 0})
                </button>
                
                ${oferta.estado === 'Abierta' ? 
                    `<button class="btn btn-warning btn-cerrar-oferta" 
                            data-id="${oferta.id_oferta}" 
                            data-titulo="${tituloEscapado}">
                        <i class="fas fa-lock"></i> Cerrar Oferta
                    </button>` : 
                    oferta.estado === 'Cerrada' ?
                    `<button class="btn btn-success btn-reabrir-oferta" data-id="${oferta.id_oferta}" data-titulo="${tituloEscapado}">
                        <i class="fas fa-unlock"></i> Reabrir Oferta
                    </button>` :
                    ''
                }
            </div>
        </div>
    `;
    
    // 🔥 ACTUALIZADO: Agregar listener para duplicar
    setTimeout(() => {
        const btnDuplicar = div.querySelector('[data-action="duplicar"]');
        if (btnDuplicar) {
            btnDuplicar.addEventListener('click', () => duplicarOferta(oferta.id_oferta, oferta.titulo));
        }
        
        const btnEditar = div.querySelector('[data-action="editar"]');
        if (btnEditar) {
            btnEditar.addEventListener('click', () => editarOferta(oferta.id_oferta));
        }
        
        const btnEliminar = div.querySelector('[data-action="eliminar"]');
        if (btnEliminar) {
            btnEliminar.addEventListener('click', () => eliminarOferta(oferta.id_oferta, oferta.titulo));
        }
        
        const btnVerPostulaciones = div.querySelector('.btn-ver-postulaciones');
        if (btnVerPostulaciones) {
            btnVerPostulaciones.addEventListener('click', function() {
                const ofertaId = this.getAttribute('data-oferta-id');
                const numPostulaciones = this.getAttribute('data-num-postulaciones');
                verPostulaciones(parseInt(ofertaId), parseInt(numPostulaciones));
            });
        }
        
        const btnCerrar = div.querySelector('.btn-cerrar-oferta');
        if (btnCerrar) {
            btnCerrar.addEventListener('click', function() {
                const ofertaId = parseInt(this.getAttribute('data-id'));
                const titulo = this.getAttribute('data-titulo');
                cerrarOferta(ofertaId, titulo);
            });
        }
        
        const btnReabrir = div.querySelector('.btn-reabrir-oferta');
        if (btnReabrir) {
            btnReabrir.addEventListener('click', function() {
                const ofertaId = parseInt(this.getAttribute('data-id'));
                const titulo = this.getAttribute('data-titulo');
                reabrirOferta(ofertaId, titulo);
            });
        }
    }, 100);
    
    return div;
}

function obtenerEstadoOferta(estado) {
    switch(estado) {
        case 'Abierta':
            return { clase: 'status-active', texto: 'Activa' };
        case 'En Proceso':
            return { clase: 'status-progress', texto: 'En Proceso' };
        case 'Cerrada':
            return { clase: 'status-closed', texto: 'Cerrada' };
        default:
            return { clase: 'status-inactive', texto: estado };
    }
}

function actualizarEstadisticas(estadisticas) {
    if (!estadisticas) return;
    
    const ofertasActivasEl = document.getElementById('ofertasActivas');
    const trabajadoresContratadosEl = document.getElementById('trabajadoresContratados');
    
    if (ofertasActivasEl) {
        ofertasActivasEl.textContent = estadisticas.ofertas_activas || ofertasData.length;
    }
    
    if (trabajadoresContratadosEl) {
        trabajadoresContratadosEl.textContent = estadisticas.trabajadores_contratados || 0;
    }
}

// ================================================================
// 🔥 DUPLICAR OFERTA - NUEVA FUNCIÓN
// ================================================================

async function duplicarOferta(ofertaId, titulo) {
    if (!confirm(`¿Duplicar la oferta "${titulo}"?\n\nSe creará una copia con el prefijo "Copia de".`)) {
        return;
    }
    
    try {
        console.log('📋 Duplicando oferta:', ofertaId);
        
        showStatusMessage('Duplicando oferta...', 'info');
        
        const response = await fetch(`/api/duplicar_oferta/${ofertaId}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatusMessage('✅ Oferta duplicada exitosamente', 'success');
            setTimeout(() => cargarOfertasDelAgricultor(), 1500);
        } else {
            showStatusMessage('❌ ' + data.message, 'error');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showStatusMessage('❌ Error de conexión', 'error');
    }
}

// ================================================================
// RESTO DE FUNCIONES (sin cambios)
// ================================================================

async function cerrarOferta(ofertaId, titulo) {
    try {
        console.log('🔒 Cerrando oferta:', ofertaId);
        
        const statsResponse = await fetch(`/api/estadisticas_cierre_v2/${ofertaId}`, {
            credentials: 'include'
        });
        
        let mensaje = `¿Cerrar la oferta "${titulo}"?\n\n`;
        
        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            if (statsData.success) {
                const stats = statsData.stats;
                mensaje += `📊 Postulaciones:\n` +
                          `• Pendientes: ${stats.pendientes}\n` +
                          `• Aceptadas: ${stats.aceptadas}\n` +
                          `• Rechazadas: ${stats.rechazadas}\n\n`;
                          if (stats.pendientes > 0) {
                    mensaje += `⚠️ Las ${stats.pendientes} postulaciones pendientes serán rechazadas.\n\n`;
                }
            }
        }
        
        mensaje += `Esta acción:\n` +
                  `✓ Cerrará la oferta\n` +
                  `✓ Guardará la fecha de finalización\n` +
                  `✓ Finalizará los acuerdos laborales activos`;
        
        if (!confirm(mensaje)) return;
        
        showStatusMessage('Cerrando oferta...', 'info');
        
        const response = await fetch(`/api/cerrar_oferta_manual_v2/${ofertaId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatusMessage('✅ Oferta cerrada exitosamente', 'success');
            setTimeout(() => cargarOfertasDelAgricultor(), 1500);
        } else {
            showStatusMessage('❌ ' + data.message, 'error');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showStatusMessage('❌ Error de conexión', 'error');
    }
}

async function reabrirOferta(ofertaId, titulo) {
    if (!confirm(`¿Reabrir la oferta "${titulo}"?\n\nVolverás a recibir postulaciones.`)) return;
    
    try {
        console.log('🔓 Reabriendo oferta:', ofertaId);
        
        showStatusMessage('Reabriendo oferta...', 'info');
        
        const response = await fetch(`/api/reabrir_oferta_v2/${ofertaId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatusMessage('✅ Oferta reabierta exitosamente', 'success');
            setTimeout(() => cargarOfertasDelAgricultor(), 1500);
        } else {
            showStatusMessage('❌ ' + data.message, 'error');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showStatusMessage('❌ Error de conexión', 'error');
    }
}

function createNewOffer() {
    abrirModalOferta();
}

function abrirModalOferta() {
    const modal = document.getElementById('modalCrearOferta');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            const tituloInput = document.getElementById('tituloOferta');
            if (tituloInput) tituloInput.focus();
        }, 300);
    }
}

function cerrarModalOferta() {
    const modal = document.getElementById('modalCrearOferta');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            
            const form = document.getElementById('formCrearOferta');
            if (form) form.reset();
            
            const btnCrear = document.getElementById('btnCrearOferta');
            if (btnCrear) {
                btnCrear.disabled = false;
                btnCrear.innerHTML = '<i class="fas fa-check"></i> Crear Oferta';
            }
        }, 300);
    }
}

async function crearOferta(event) {
    event.preventDefault();
    
    const btnCrear = document.getElementById('btnCrearOferta');
    const form = event.target;
    const formData = new FormData(form);
    
    const ofertaData = {
        titulo: formData.get('titulo').trim(),
        descripcion: formData.get('descripcion').trim(),
        pago: parseInt(formData.get('pago')),
        ubicacion: formData.get('ubicacion').trim()
    };
    
    if (!ofertaData.titulo || ofertaData.titulo.length < 10) {
        showStatusMessage('El título debe tener al menos 10 caracteres', 'error');
        return;
    }
    
    if (!ofertaData.descripcion || ofertaData.descripcion.length < 20) {
        showStatusMessage('La descripción debe tener al menos 20 caracteres', 'error');
        return;
    }
    
    if (!ofertaData.pago || ofertaData.pago < 10000) {
        showStatusMessage('El pago mínimo debe ser $10,000 COP', 'error');
        return;
    }
    
    btnCrear.disabled = true;
    btnCrear.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
    
    try {
        const response = await fetch('/api/crear_oferta', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(ofertaData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            btnCrear.innerHTML = '<i class="fas fa-check"></i> ¡Creada!';
            showStatusMessage(`Oferta "${ofertaData.titulo}" creada exitosamente!`, 'success');
            
            setTimeout(() => {
                cerrarModalOferta();
                cargarOfertasDelAgricultor();
            }, 1500);
            
        } else {
            throw new Error(result.message || 'Error al crear la oferta');
        }
        
    } catch (error) {
        console.error('❌ Error creando oferta:', error);
        
        btnCrear.disabled = false;
        btnCrear.innerHTML = '<i class="fas fa-check"></i> Crear Oferta';
        
        showStatusMessage('Error: ' + error.message, 'error');
    }
}

async function editarOferta(ofertaId) {
    const oferta = ofertasData.find(o => o.id_oferta === ofertaId);
    
    if (!oferta) {
        showStatusMessage('Oferta no encontrada', 'error');
        return;
    }
    
    let descripcion_limpia = oferta.descripcion || '';
    let ubicacion = oferta.ubicacion || '';
    
    if (descripcion_limpia.includes('Ubicación:')) {
        try {
            const partes = descripcion_limpia.split('\n\nUbicación:');
            descripcion_limpia = partes[0];
            ubicacion = partes[1].trim();
        } catch (e) {
            console.log('⚠️ Error extrayendo ubicación:', e);
        }
    }
    
    document.getElementById('editOfertaId').value = oferta.id_oferta;
    document.getElementById('editTituloOferta').value = oferta.titulo;
    document.getElementById('editDescripcionOferta').value = descripcion_limpia;
    document.getElementById('editPagoOferta').value = oferta.pago_ofrecido;
    document.getElementById('editUbicacionOferta').value = ubicacion;
    
    const modal = document.getElementById('modalEditarOferta');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function cerrarModalEditar() {
    const modal = document.getElementById('modalEditarOferta');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            
            const form = document.getElementById('formEditarOferta');
            if (form) form.reset();
            
            const btnGuardar = document.getElementById('btnGuardarEdicion');
            if (btnGuardar) {
                btnGuardar.disabled = false;
                btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
            }
        }, 300);
    }
}

async function guardarEdicion(event) {
    event.preventDefault();
    
    const btnGuardar = document.getElementById('btnGuardarEdicion');
    const form = event.target;
    const formData = new FormData(form);
    
    const ofertaId = parseInt(formData.get('ofertaId'));
    
    if (!ofertaId) {
        showStatusMessage('Error: ID de oferta no válido', 'error');
        return;
    }
    
    const ofertaData = {
        titulo: formData.get('titulo').trim(),
        descripcion: formData.get('descripcion').trim(),
        pago: parseInt(formData.get('pago')),
        ubicacion: formData.get('ubicacion').trim()
    };
    
    if (!ofertaData.titulo || ofertaData.titulo.length < 10) {
        showStatusMessage('El título debe tener al menos 10 caracteres', 'error');
        return;
    }
    
    if (!ofertaData.descripcion || ofertaData.descripcion.length < 20) {
        showStatusMessage('La descripción debe tener al menos 20 caracteres', 'error');
        return;
    }
    
    if (!ofertaData.pago || ofertaData.pago < 10000) {
        showStatusMessage('El pago mínimo debe ser $10,000 COP', 'error');
        return;
    }
    
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    try {
        const response = await fetch(`/api/edit_job/${ofertaId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(ofertaData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            btnGuardar.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
            showStatusMessage('✅ Oferta actualizada exitosamente!', 'success');
            
            setTimeout(() => {
                cerrarModalEditar();
                cargarOfertasDelAgricultor();
            }, 1500);
            
        } else {
            throw new Error(result.message || 'Error al actualizar la oferta');
        }
        
    } catch (error) {
        console.error('❌ Error guardando edición:', error);
        
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
        
        showStatusMessage('❌ Error: ' + error.message, 'error');
    }
}

async function eliminarOferta(ofertaId, titulo) {
    const confirmar = confirm(`¿Estás seguro de que deseas eliminar la oferta "${titulo}"?\n\nEsta acción no se puede deshacer.`);
    
    if (!confirmar) return;
    
    try {
        const response = await fetch(`/api/delete_job/${ofertaId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatusMessage('Oferta eliminada exitosamente', 'success');
            cargarOfertasDelAgricultor();
        } else {
            throw new Error(data.message || 'Error al eliminar la oferta');
        }
        
    } catch (error) {
        console.error('❌ Error eliminando oferta:', error);
        showStatusMessage('Error al eliminar la oferta', 'error');
    }
}

async function verPostulaciones(ofertaId, numPostulaciones) {
    if (numPostulaciones === 0) {
        showStatusMessage('Esta oferta no tiene postulaciones aún', 'info');
        return;
    }
    
    showStatusMessage('Cargando postulaciones...', 'info');
    
    try {
        const response = await fetch(`/api/get_offer_applications/${ofertaId}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            mostrarModalPostulaciones(data);
        } else {
            showStatusMessage(data.message || 'Error al cargar postulaciones', 'error');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showStatusMessage('Error de conexión al cargar postulaciones', 'error');
    }
}

function mostrarModalPostulaciones(data) {
    const modal = document.getElementById('applicationsModal');
    const content = document.getElementById('applicationsContent');
    
    if (!modal || !content) {
        alert('Error: No se encontraron los elementos del modal');
        return;
    }
    
    if (!data.postulaciones || data.postulaciones.length === 0) {
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #64748b;">
                <i class="fas fa-users" style="font-size: 48px; margin-bottom: 15px; color: #4a7c59;"></i>
                <h3>No hay postulaciones</h3>
                <p>Aún no hay trabajadores interesados en esta oferta.</p>
            </div>
        `;
    } else {
        let html = `
            <div class="applications-header">
                <h3>${data.oferta_titulo}</h3>
                <p>${data.total} postulación${data.total !== 1 ? 'es' : ''}</p>
            </div>
            <div class="applications-list">
        `;
        
        data.postulaciones.forEach(post => {
            const estrellas = '⭐'.repeat(Math.round(post.calificacion));
            const estadoClass = post.estado === 'Pendiente' ? 'status-pending' : 
                              post.estado === 'Aceptada' ? 'status-accepted' : 'status-rejected';
            
            html += `
                <div class="application-card">
                    <div class="application-header">
                        <div class="worker-info">
                            <div class="worker-avatar">
                                ${post.foto_url ? 
                                    `<img src="${post.foto_url}" alt="${post.nombre_completo}">` :
                                    `<i class="fas fa-user"></i>`
                                }
                            </div>
                            <div class="worker-details">
                                <h4>${post.nombre_completo}</h4>
                                <div class="worker-stats">
                                    <span><i class="fas fa-briefcase"></i> ${post.trabajos_completados} trabajos</span>
                                    <span>${estrellas} ${post.calificacion.toFixed(1)}</span>
                                </div>
                            </div>
                        </div>
                        <span class="status-badge ${estadoClass}">${post.estado}</span>
                    </div>
                    
                    <div class="application-body">
                        <div class="application-info">
                            <div class="info-item">
                                <i class="fas fa-phone"></i>
                                <span>${post.telefono}</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-envelope"></i>
                                <span>${post.email}</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-calendar"></i>
                                <span>Postulado: ${post.fecha_postulacion}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="application-actions">
                        <button class="btn btn-secondary" onclick="verPerfilTrabajador(${post.trabajador_id})">
                            <i class="fas fa-user-circle"></i> Ver Perfil
                        </button>
                        ${post.estado === 'Pendiente' ? `
                            <button class="btn btn-success" onclick="aceptarPostulacionConCierre(${post.id_postulacion}, '${post.nombre_completo}', ${data.oferta_id})">
                                <i class="fas fa-check"></i> Aceptar
                            </button>
                            <button class="btn btn-danger" onclick="rechazarPostulacion(${post.id_postulacion})">
                                <i class="fas fa-times"></i> Rechazar
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        content.innerHTML = html;
    }
    
    modal.style.display = 'flex';
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'block';
}

function closeApplicationsModal() {
    const modal = document.getElementById('applicationsModal');
    if (modal) modal.style.display = 'none';
    
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'none';
}

async function aceptarPostulacionConCierre(postulacionId, nombreTrabajador, ofertaId) {
    console.log('🎯 Aceptando postulación:', postulacionId, nombreTrabajador, ofertaId);
    
    if (!confirm(`¿Aceptar la postulación de ${nombreTrabajador}?`)) return;
    
    const cerrarOferta = confirm(
        `✅ ¿Deseas CERRAR la oferta ahora?\n\n` +
        `• SÍ: La oferta se cerrará (no más postulaciones)\n` +
        `• NO: La oferta seguirá abierta`
    );
    
    console.log('📋 Cerrar oferta:', cerrarOferta);
    
    showStatusMessage('Procesando...', 'info');
    
    try {
        console.log('🌐 Enviando a /api/aceptar_postulacion_v3/' + postulacionId);
        
        const response = await fetch(`/api/aceptar_postulacion_v3/${postulacionId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cerrar_oferta: cerrarOferta })
        });
        
        console.log('📡 Response status:', response.status);
        
        const data = await response.json();
        console.log('📦 Response data:', data);
        
        if (data.success) {
            showStatusMessage('✅ ' + data.message, 'success');
            closeApplicationsModal();
            setTimeout(() => cargarOfertasDelAgricultor(), 2000);
        } else {
            showStatusMessage('❌ ' + data.message, 'error');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        showStatusMessage('❌ Error de conexión', 'error');
    }
}

async function rechazarPostulacion(postulacionId) {
    if (!confirm('¿Rechazar esta postulación?')) return;
    
    try {
        console.log('❌ Rechazando postulación:', postulacionId);
        
        showStatusMessage('Procesando...', 'info');
        
        const response = await fetch(`/api/rechazar_postulacion_v3/${postulacionId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatusMessage('✅ Postulación rechazada', 'info');
            closeApplicationsModal();
            setTimeout(() => cargarOfertasDelAgricultor(), 1500);
        } else {
            showStatusMessage('❌ ' + data.message, 'error');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showStatusMessage('❌ Error de conexión', 'error');
    }
}

async function verPerfilTrabajador(trabajadorId) {
    try {
        const response = await fetch(`/api/get_worker_profile/${trabajadorId}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarPerfilTrabajador(data.worker);
        } else {
            showStatusMessage('Error al cargar perfil', 'error');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showStatusMessage('Error de conexión', 'error');
    }
}

function mostrarPerfilTrabajador(worker) {
    const modal = document.getElementById('workerProfileModal');
    const content = document.getElementById('workerProfileContent');
    
    const estrellas = '⭐'.repeat(Math.round(worker.estadisticas.calificacion_promedio));
    
    content.innerHTML = `
        <div class="worker-profile">
            <div class="profile-header">
                <div class="profile-avatar-large">
                    ${worker.foto_url ? 
                        `<img src="${worker.foto_url}" alt="${worker.nombre_completo}">` :
                        `<i class="fas fa-user"></i>`
                    }
                </div>
                <div class="profile-info">
                    <h2>${worker.nombre_completo}</h2>
                    <div class="profile-rating">
                        ${estrellas} ${worker.estadisticas.calificacion_promedio.toFixed(1)}
                        <span>(${worker.estadisticas.total_calificaciones} calificaciones)</span>
                    </div>
                    <div class="profile-stats-row">
                        <div class="stat-item">
                            <i class="fas fa-briefcase"></i>
                            <span>${worker.estadisticas.trabajos_completados} trabajos completados</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="profile-section">
                <h3><i class="fas fa-id-card"></i> Información de Contacto</h3>
                <div class="contact-info">
                    <div class="contact-item">
                        <i class="fas fa-phone"></i>
                        <span>${worker.telefono}</span>
                    </div>
                    <div class="contact-item">
                        <i class="fas fa-envelope"></i>
                        <span>${worker.email}</span>
                    </div>
                </div>
            </div>
            
            ${worker.habilidades && worker.habilidades.length > 0 ? `
                <div class="profile-section">
                    <h3><i class="fas fa-tools"></i> Habilidades</h3>
                    <div class="skills-list">
                        ${worker.habilidades.map(h => `
                            <span class="skill-tag">${h.Nombre}</span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    modal.style.display = 'flex';
}

function closeWorkerProfileModal() {
    const modal = document.getElementById('workerProfileModal');
    if (modal) modal.style.display = 'none';
}

function initMap() {
    const mapElement = document.getElementById("map");
    if (!mapElement) return;
    
    try {
        const fincaLocation = [5.0056, -75.6063];
        
        map = L.map('map').setView(fincaLocation, 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
        }).addTo(map);
        
        const fincaIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="background: #4a7c59; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><i class="fas fa-home" style="color: white; font-size: 14px;"></i></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        L.marker(fincaLocation, { icon: fincaIcon }).addTo(map)
            .bindPopup(`
                <div style="text-align: center; padding: 10px;">
                    <h4 style="margin: 0 0 5px 0; color: #4a7c59;">Tu Finca</h4>
                    <p style="margin: 0; color: #666;">Chinchiná, Caldas</p>
                </div>
            `);
        
    } catch (error) {
        console.error('Error inicializando mapa:', error);
    }
}

function showNotifications() {
    showStatusMessage('Cargando notificaciones...', 'info');
}

function handleNotification(element) {
    element.style.opacity = '0.7';
    element.style.transform = 'translateX(5px)';
    
    setTimeout(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateX(0)';
        showStatusMessage('Notificación marcada como leída', 'success');
    }, 200);
}

function showStatusMessage(message, type = 'info') {
    const messageElement = document.createElement('div');
    messageElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        z-index: 99999;
        max-width: 350px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        animation: slideInRight 0.3s ease;
    `;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-triangle', 
        warning: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };
    
    const colors = {
        success: 'linear-gradient(135deg, #22c55e, #16a34a)',
        error: 'linear-gradient(135deg, #dc2626, #991b1b)',
        warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
        info: 'linear-gradient(135deg, #3b82f6, #2563eb)'
    };
    
    messageElement.style.background = colors[type] || colors.info;
    messageElement.innerHTML = `<i class="${icons[type] || icons.info}" style="margin-right: 8px;"></i>${message}`;
    
    document.body.appendChild(messageElement);
    
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.parentNode.removeChild(messageElement);
                }
            }, 300);
        }
    }, 4000);
}

function setupEventListeners() {
    document.addEventListener('click', function(event) {
        if (!event.target.closest('#profileMenuBtn') && !event.target.closest('#profileDropdown')) {
            closeProfileMenu();
        }
    });

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            cerrarModalOferta();
            cerrarModalEditar();
            closeProfileMenu();
            closeApplicationsModal();
            closeWorkerProfileModal();
        }
    });

    document.getElementById('modalCrearOferta')?.addEventListener('click', function(event) {
        if (event.target === this) {
            cerrarModalOferta();
        }
    });

    document.getElementById('modalEditarOferta')?.addEventListener('click', function(event) {
        if (event.target === this) {
            cerrarModalEditar();
        }
    });

    document.getElementById('applicationsModal')?.addEventListener('click', function(event) {
        if (event.target === this) {
            closeApplicationsModal();
        }
    });

    document.getElementById('workerProfileModal')?.addEventListener('click', function(event) {
        if (event.target === this) {
            closeWorkerProfileModal();
        }
    });
}

// ================================================================
// EXPONER FUNCIONES GLOBALMENTE
// ================================================================

window.toggleProfileMenu = toggleProfileMenu;
window.closeProfileMenu = closeProfileMenu;
window.createNewOffer = createNewOffer;
window.cerrarModalOferta = cerrarModalOferta;
window.crearOferta = crearOferta;
window.editarOferta = editarOferta;
window.cerrarModalEditar = cerrarModalEditar;
window.guardarEdicion = guardarEdicion;
window.eliminarOferta = eliminarOferta;
window.duplicarOferta = duplicarOferta; // 🔥 NUEVO
window.cerrarOferta = cerrarOferta;
window.reabrirOferta = reabrirOferta;
window.verPostulaciones = verPostulaciones;
window.aceptarPostulacionConCierre = aceptarPostulacionConCierre;
window.rechazarPostulacion = rechazarPostulacion;
window.closeApplicationsModal = closeApplicationsModal;
window.verPerfilTrabajador = verPerfilTrabajador;
window.closeWorkerProfileModal = closeWorkerProfileModal;
window.showNotifications = showNotifications;
window.handleNotification = handleNotification;
window.showHistorialContrataciones = showHistorialContrataciones;
window.showEstadisticas = showEstadisticas;
window.viewProfile = viewProfile;
window.viewSettings = viewSettings;
window.confirmLogout = confirmLogout;
window.showAyudaSoporte = showAyudaSoporte;

console.log('✅ Dashboard Agricultor COMPLETO con Historial y Estadísticas');