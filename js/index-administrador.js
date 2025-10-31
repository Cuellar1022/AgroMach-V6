// ================================================================
// JAVASCRIPT COMPLETO PARA EL PANEL DE ADMINISTRADOR
// Archivo: js/index-administrador.js
// ================================================================

// Variables globales
let currentSection = 'dashboard';
let selectedUsers = [];
let allUsers = [];
let filteredUsers = [];
let currentUserData = null;
let systemStats = {};

// ================================================================
// VERIFICACIÓN DE SESIÓN - ADMINISTRADOR
// ================================================================
async function verificarSesionActivaAdmin() {
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
            console.log('Sesión no válida, redirigiendo al login');
            window.location.replace('/vista/login-trabajador.html?message=Sesión expirada&type=error');
            return false;
        }
        
        const data = await response.json();
        
        if (!data.authenticated) {
            console.log('No autenticado, redirigiendo al login');
            window.location.replace('/vista/login-trabajador.html?message=Por favor inicia sesión&type=info');
            return false;
        }
        
        // Verificar que sea administrador
        if (data.user_role !== 'Administrador') {
            console.log('Usuario no es administrador');
            window.location.replace('/vista/index-trabajador.html');
            return false;
        }
        
        return true;
        
    } catch (error) {
        console.error('Error verificando sesión:', error);
        window.location.replace('/vista/login-trabajador.html?message=Error de conexión&type=error');
        return false;
    }
}

// Prevenir navegación con botón atrás después del logout
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        console.log('Página cargada desde caché, verificando sesión...');
        verificarSesionActivaAdmin();
    }
});

// Prevenir caché del navegador
if (window.performance && window.performance.navigation.type === 2) {
    window.location.reload(true);
}

// Verificar sesión cada 5 minutos
setInterval(verificarSesionActivaAdmin, 5 * 60 * 1000);

// Configuración de la aplicación
const CONFIG = {
    apiBaseUrl: '',
    refreshInterval: 30000, // 30 segundos
    itemsPerPage: 20,
    autoSaveInterval: 5000
};

// ================================================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando Panel de Administrador...');
    
    initializeApp();
});

async function initializeApp() {
    try {
        // Verificar sesión activa
        await verificarSesionActivaAdmin();
        // Verificar sesión de administrador
        await verifyAdminSession();
        
        // Configurar navegación
        setupNavigation();
        
        // Configurar menú móvil
        setupMobileMenu();
        
        // Cargar dashboard inicial
        await loadDashboard();
        
        // Configurar event listeners
        setupEventListeners();
        
        // Iniciar actualizaciones automáticas
        startAutoRefresh();
        
        console.log('✅ Panel de administrador inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando panel:', error);
        showNotification('Error inicializando panel de administrador', 'error');
        redirectToLogin();
    }
}

// ================================================================
// GESTIÓN DE SESIÓN Y AUTENTICACIÓN
// ================================================================
async function verifyAdminSession() {
    try {
        const response = await fetch('/api/admin/session');
        
        if (!response.ok) {
            throw new Error('Sesión no válida');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Error de autenticación');
        }
        
        currentUserData = data.admin;
        updateUserInterface();
        
        return data.admin;
        
    } catch (error) {
        console.error('Error verificando sesión:', error);
        throw error;
    }
}

function updateUserInterface() {
    if (currentUserData) {
        // Actualizar nombre del administrador
        const adminNameEl = document.querySelector('.admin-name');
        if (adminNameEl) {
            adminNameEl.textContent = currentUserData.nombre_completo;
        }
        
        // Actualizar avatar si hay foto
        const avatarEl = document.querySelector('.admin-avatar');
        if (avatarEl && currentUserData.foto_url) {
            avatarEl.innerHTML = `<img src="${currentUserData.foto_url}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%;">`;
        }
    }
}

function redirectToLogin() {
    setTimeout(() => {
        window.location.href = '/vista/login-trabajador.html';
    }, 2000);
}

// ================================================================
// CONFIGURACIÓN DE NAVEGACIÓN
// ================================================================
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remover clase activa de todos los elementos
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Agregar clase activa al elemento clickeado
            this.classList.add('active');
            
            // Mostrar sección correspondiente
            const section = this.dataset.section;
            showSection(section);
        });
    });
}

function setupMobileMenu() {
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
        
        // Cerrar menú al hacer clic fuera
        document.addEventListener('click', function(e) {
            if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });
    }
}

async function showSection(sectionName) {
    try {
        // Ocultar todas las secciones
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => section.classList.remove('active'));
        
        // Mostrar sección seleccionada
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
            currentSection = sectionName;
            
            // Cargar datos específicos según la sección
            switch(sectionName) {
                case 'dashboard':
                    await loadDashboard();
                    break;
                case 'usuarios':
                    await loadUsers();
                    break;
                case 'estadisticas':
                    await loadStatistics();
                    break;
                case 'reportes':
                    await loadReports();
                    break;
                case 'historial':
                    await loadAuditHistory();
                    break;
                default:
                    console.log(`Sección ${sectionName} en desarrollo`);
            }
        }
    } catch (error) {
        console.error('Error mostrando sección:', error);
        showNotification('Error cargando sección', 'error');
    }
}

// ================================================================
// CARGA DEL DASHBOARD
// ================================================================
async function loadDashboard() {
    try {
        console.log('📊 Cargando dashboard...');
        
        // Cargar estadísticas
        await loadDashboardStats();
        
        // Cargar actividad reciente
        await loadRecentActivity();
        
        // Cargar estado del sistema
        await loadSystemStatus();
        
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        showNotification('Error cargando dashboard', 'error');
    }
}

async function loadDashboardStats() {
    try {
        const response = await fetch('/api/admin/dashboard-stats');
        const data = await response.json();
        
        if (data.success) {
            systemStats = data.stats;
            updateStatsCards();
        } else {
            throw new Error(data.error || 'Error obteniendo estadísticas');
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        // Mostrar datos por defecto en caso de error
        systemStats = {
            usuarios_activos: 0,
            ofertas_activas: 0,
            total_postulaciones: 0,
            contratos_exitosos: 0
        };
        updateStatsCards();
    }
}

function updateStatsCards() {
    // Actualizar tarjetas de estadísticas
    updateCounterWithAnimation('totalUsers', systemStats.usuarios_activos || 0);
    updateCounterWithAnimation('activeJobs', systemStats.ofertas_activas || 0);
    updateCounterWithAnimation('totalApplications', systemStats.total_postulaciones || 0);
    updateCounterWithAnimation('successfulHires', systemStats.contratos_exitosos || 0);
}

function updateCounterWithAnimation(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const currentValue = parseInt(element.textContent.replace(/,/g, '')) || 0;
    const difference = targetValue - currentValue;
    const steps = 20;
    const increment = difference / steps;
    let current = currentValue;
    
    const timer = setInterval(() => {
        current += increment;
        element.textContent = Math.round(current).toLocaleString();
        
        if (Math.abs(current - targetValue) < 1) {
            element.textContent = targetValue.toLocaleString();
            clearInterval(timer);
        }
    }, 50);
}

async function loadRecentActivity() {
    try {
        const response = await fetch('/api/admin/recent-activity');
        const data = await response.json();
        
        const activityList = document.getElementById('activityList');
        if (!activityList) return;
        
        activityList.innerHTML = '';
        
        if (data.success && data.activities.length > 0) {
            data.activities.forEach(activity => {
                const activityItem = document.createElement('div');
                activityItem.className = 'activity-item';
                
                activityItem.innerHTML = `
                    <div class="activity-icon ${activity.type}">
                        <i class="${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <p>${activity.message}</p>
                        <small>${activity.time}</small>
                    </div>
                `;
                
                activityList.appendChild(activityItem);
            });
        } else {
            activityList.innerHTML = '<div class="no-activity">No hay actividad reciente</div>';
        }
    } catch (error) {
        console.error('Error cargando actividad reciente:', error);
    }
}

async function loadSystemStatus() {
    try {
        const response = await fetch('/api/admin/system-status');
        const data = await response.json();
        
        const systemStatus = document.getElementById('systemStatus');
        if (!systemStatus) return;
        
        systemStatus.innerHTML = '';
        
        if (data.success && data.system_status.length > 0) {
            data.system_status.forEach(item => {
                const statusItem = document.createElement('div');
                statusItem.className = 'status-item';
                
                statusItem.innerHTML = `
                    <div style="display: flex; align-items: center;">
                        <div class="status-indicator ${item.status}"></div>
                        <span>${item.name}</span>
                    </div>
                    <strong>${item.label}</strong>
                `;
                
                systemStatus.appendChild(statusItem);
            });
        }
    } catch (error) {
        console.error('Error cargando estado del sistema:', error);
    }
}

// ================================================================
// GESTIÓN DE USUARIOS
// ================================================================
async function loadUsers() {
    try {
        console.log('👥 Cargando usuarios...');
        
        // Obtener filtros actuales
        const filters = getCurrentFilters();
        
        // Construir URL con parámetros
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                params.append(key, filters[key]);
            }
        });
        
        const response = await fetch(`/api/admin/get-users?${params}`);
        const data = await response.json();
        
        if (data.success) {
            allUsers = data.users;
            filteredUsers = [...allUsers];
            displayUsers();
            updateUsersTable();
        } else {
            throw new Error(data.error || 'Error cargando usuarios');
        }
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        showNotification('Error cargando usuarios', 'error');
    }
}

function getCurrentFilters() {
    return {
        tipo: document.getElementById('userTypeFilter')?.value || '',
        estado: document.getElementById('userStatusFilter')?.value || '',
        region: document.getElementById('regionFilter')?.value || '',
        search: document.getElementById('searchInput')?.value || ''
    };
}

function displayUsers() {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    filteredUsers.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <input type="checkbox" value="${user.id}" onchange="toggleUserSelection(${user.id})" ${selectedUsers.includes(user.id) ? 'checked' : ''}>
            </td>
            <td>${user.id}</td>
            <td>${user.nombre}</td>
            <td>${user.email}</td>
            <td><span class="user-type ${user.tipo}">${user.tipo}</span></td>
            <td><span class="user-status ${user.estado}">${user.estado}</span></td>
            <td>${user.registro}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-info" onclick="viewUser(${user.id})" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-warning" onclick="editUser(${user.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteUser(${user.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    updateSelectAllCheckbox();
}

function updateUsersTable() {
    const totalUsers = filteredUsers.length;
    console.log(`📊 Mostrando ${totalUsers} usuarios`);
}

// ================================================================
// FILTROS Y BÚSQUEDA
// ================================================================
async function applyUserFilters() {
    try {
        await loadUsers(); // Recargar con filtros aplicados
        selectedUsers = []; // Limpiar selección
        showNotification('Filtros aplicados correctamente', 'success');
    } catch (error) {
        console.error('Error aplicando filtros:', error);
        showNotification('Error aplicando filtros', 'error');
    }
}

function clearUserFilters() {
    // Limpiar todos los filtros
    document.getElementById('userTypeFilter').value = '';
    document.getElementById('userStatusFilter').value = '';
    document.getElementById('regionFilter').value = '';
    document.getElementById('searchInput').value = '';
    
    // Recargar usuarios sin filtros
    loadUsers();
    selectedUsers = [];
    showNotification('Filtros limpiados', 'info');
}

// ================================================================
// SELECCIÓN DE USUARIOS
// ================================================================
function toggleUserSelection(userId) {
    const index = selectedUsers.indexOf(userId);
    if (index > -1) {
        selectedUsers.splice(index, 1);
    } else {
        selectedUsers.push(userId);
    }
    
    updateSelectAllCheckbox();
    console.log('Usuarios seleccionados:', selectedUsers);
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const userCheckboxes = document.querySelectorAll('#usersTableBody input[type="checkbox"]');
    
    if (selectAllCheckbox.checked) {
        selectedUsers = filteredUsers.map(user => user.id);
        userCheckboxes.forEach(checkbox => checkbox.checked = true);
    } else {
        selectedUsers = [];
        userCheckboxes.forEach(checkbox => checkbox.checked = false);
    }
    
    console.log('Selección masiva:', selectedUsers);
}

function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const totalVisible = filteredUsers.length;
    const totalSelected = selectedUsers.filter(id => 
        filteredUsers.some(user => user.id === id)
    ).length;
    
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = totalSelected === totalVisible && totalVisible > 0;
        selectAllCheckbox.indeterminate = totalSelected > 0 && totalSelected < totalVisible;
    }
}

// ================================================================
// ACCIONES CON USUARIOS INDIVIDUALES
// ================================================================
async function viewUser(userId) {
    try {
        const response = await fetch(`/api/admin/user/${userId}/details`);
        const data = await response.json();
        
        if (data.success) {
            const user = data.user;
            
            let content = `
                <div class="user-details">
                    <div class="user-basic-info">
                        <h4>Información Básica</h4>
                        <div class="info-grid">
                            <div><strong>ID:</strong> ${user.id}</div>
                            <div><strong>Nombre:</strong> ${user.nombre} ${user.apellido}</div>
                            <div><strong>Email:</strong> ${user.email}</div>
                            <div><strong>Teléfono:</strong> ${user.telefono || 'No especificado'}</div>
                            <div><strong>Rol:</strong> <span class="user-type ${user.rol.toLowerCase()}">${user.rol}</span></div>
                            <div><strong>Estado:</strong> <span class="user-status ${user.estado.toLowerCase()}">${user.estado}</span></div>
                            <div><strong>Registro:</strong> ${user.fecha_registro}</div>
                            <div><strong>Red Social:</strong> ${user.red_social || 'Ninguna'}</div>
                        </div>
                    </div>
            `;
            
            // Información específica según el rol
            if (user.estadisticas) {
                content += `
                    <div class="user-stats">
                        <h4>Estadísticas</h4>
                        <div class="stats-grid">
                `;
                
                if (user.rol === 'Trabajador') {
                    content += `
                            <div><strong>Postulaciones:</strong> ${user.estadisticas.postulaciones}</div>
                            <div><strong>Trabajos Completados:</strong> ${user.estadisticas.trabajos_completados}</div>
                            <div><strong>Calificación:</strong> ${user.estadisticas.calificacion.toFixed(1)}/5</div>
                            <div><strong>Habilidades:</strong> ${user.estadisticas.habilidades_count}</div>
                    `;
                } else if (user.rol === 'Agricultor') {
                    content += `
                            <div><strong>Ofertas Publicadas:</strong> ${user.estadisticas.ofertas_publicadas}</div>
                            <div><strong>Contratos Completados:</strong> ${user.estadisticas.contratos_completados}</div>
                            <div><strong>Calificación:</strong> ${user.estadisticas.calificacion.toFixed(1)}/5</div>
                            <div><strong>Predios:</strong> ${user.estadisticas.predios_count}</div>
                    `;
                }
                
                content += `
                        </div>
                    </div>
                `;
            }
            
            content += '</div>';
            
            showModal('Detalles del Usuario', content);
        } else {
            throw new Error(data.error || 'Error obteniendo detalles del usuario');
        }
    } catch (error) {
        console.error('Error viendo usuario:', error);
        showNotification('Error obteniendo detalles del usuario', 'error');
    }
}

async function editUser(userId) {
    try {
        const response = await fetch(`/api/admin/user/${userId}/details`);
        const data = await response.json();
        
        if (data.success) {
            const user = data.user;
            
            const content = `
                <form id="editUserForm">
                    <div class="form-grid">
                        <div class="form-group">
                            <label><strong>Nombre:</strong></label>
                            <input type="text" id="editNombre" value="${user.nombre}" required>
                        </div>
                        <div class="form-group">
                            <label><strong>Apellido:</strong></label>
                            <input type="text" id="editApellido" value="${user.apellido}" required>
                        </div>
                        <div class="form-group">
                            <label><strong>Email:</strong></label>
                            <input type="email" id="editEmail" value="${user.email}" required>
                        </div>
                        <div class="form-group">
                            <label><strong>Teléfono:</strong></label>
                            <input type="tel" id="editTelefono" value="${user.telefono || ''}">
                        </div>
                        <div class="form-group">
                            <label><strong>Estado:</strong></label>
                            <select id="editEstado" required>
                                <option value="Activo" ${user.estado === 'Activo' ? 'selected' : ''}>Activo</option>
                                <option value="Inactivo" ${user.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
                                <option value="Bloqueado" ${user.estado === 'Bloqueado' ? 'selected' : ''}>Bloqueado</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-primary" onclick="saveUserChanges(${userId})">
                            <i class="fas fa-save"></i> Guardar Cambios
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                    </div>
                </form>
            `;
            
            showModal('Editar Usuario', content);
        } else {
            throw new Error(data.error || 'Error obteniendo datos del usuario');
        }
    } catch (error) {
        console.error('Error editando usuario:', error);
        showNotification('Error cargando datos del usuario', 'error');
    }
}

async function saveUserChanges(userId) {
    try {
        const formData = {
            nombre: document.getElementById('editNombre').value.trim(),
            apellido: document.getElementById('editApellido').value.trim(),
            email: document.getElementById('editEmail').value.trim(),
            telefono: document.getElementById('editTelefono').value.trim(),
            estado: document.getElementById('editEstado').value
        };
        
        // Validaciones básicas
        if (!formData.nombre || !formData.apellido || !formData.email) {
            showNotification('Por favor complete todos los campos requeridos', 'warning');
            return;
        }
        
        const response = await fetch(`/api/admin/user/${userId}/update`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeModal();
            showNotification('Usuario actualizado correctamente', 'success');
            await loadUsers(); // Recargar usuarios
        } else {
            throw new Error(data.error || 'Error actualizando usuario');
        }
    } catch (error) {
        console.error('Error guardando cambios:', error);
        showNotification('Error guardando cambios', 'error');
    }
}

async function deleteUser(userId) {
    try {
        const user = allUsers.find(u => u.id === userId);
        if (!user) {
            showNotification('Usuario no encontrado', 'error');
            return;
        }
        
        const confirmed = await showConfirmDialog(
            'Eliminar Usuario',
            `¿Está seguro de eliminar el usuario ${user.nombre}? Esta acción no se puede deshacer y eliminará todos sus datos asociados.`,
            'danger'
        );
        
        if (confirmed) {
            const response = await fetch(`/api/admin/user/${userId}/delete`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                showNotification('Usuario eliminado correctamente', 'success');
                await loadUsers(); // Recargar usuarios
                selectedUsers = selectedUsers.filter(id => id !== userId);
            } else {
                throw new Error(data.error || 'Error eliminando usuario');
            }
        }
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        showNotification('Error eliminando usuario', 'error');
    }
}

// ================================================================
// ACCIONES MASIVAS
// ================================================================
async function bulkSuspendUsers() {
    if (selectedUsers.length === 0) {
        showNotification('Seleccione al menos un usuario', 'warning');
        return;
    }
    
    const confirmed = await showConfirmDialog(
        'Suspender Usuarios',
        `¿Suspender ${selectedUsers.length} usuario(s) seleccionado(s)?`,
        'warning'
    );
    
    if (confirmed) {
        await performBulkAction('suspend');
    }
}

async function bulkDeleteUsers() {
    if (selectedUsers.length === 0) {
        showNotification('Seleccione al menos un usuario', 'warning');
        return;
    }
    
    const confirmed = await showConfirmDialog(
        'Eliminar Usuarios',
        `¿Eliminar ${selectedUsers.length} usuario(s) seleccionado(s)? Esta acción no se puede deshacer.`,
        'danger'
    );
    
    if (confirmed) {
        await performBulkAction('delete');
    }
}

async function bulkActivateUsers() {
    if (selectedUsers.length === 0) {
        showNotification('Seleccione al menos un usuario', 'warning');
        return;
    }
    
    const confirmed = await showConfirmDialog(
        'Activar Usuarios',
        `¿Activar ${selectedUsers.length} usuario(s) seleccionado(s)?`,
        'success'
    );
    
    if (confirmed) {
        await performBulkAction('activate');
    }
}

async function performBulkAction(action) {
    try {
        showLoading('Procesando acción masiva...');
        
        const response = await fetch('/api/admin/bulk-action', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: action,
                user_ids: selectedUsers
            })
        });
        
        const data = await response.json();
        
        hideLoading();
        
        if (data.success) {
            showNotification(data.message, 'success');
            selectedUsers = [];
            await loadUsers(); // Recargar usuarios
        } else {
            throw new Error(data.error || 'Error realizando acción masiva');
        }
    } catch (error) {
        hideLoading();
        console.error('Error en acción masiva:', error);
        showNotification('Error realizando acción masiva', 'error');
    }
}

// ================================================================
// MODAL PARA AGREGAR NUEVO USUARIO
// ================================================================
function showAddUserModal() {
    const content = `
        <form id="addUserForm">
            <div class="form-grid">
                <div class="form-group">
                    <label><strong>Nombre:</strong></label>
                    <input type="text" id="newUserNombre" required>
                </div>
                <div class="form-group">
                    <label><strong>Apellido:</strong></label>
                    <input type="text" id="newUserApellido" required>
                </div>
                <div class="form-group">
                    <label><strong>Email:</strong></label>
                    <input type="email" id="newUserEmail" required>
                </div>
                <div class="form-group">
                    <label><strong>Tipo de Usuario:</strong></label>
                    <select id="newUserTipo" required>
                        <option value="">Seleccionar...</option>
                        <option value="trabajador">Trabajador</option>
                        <option value="agricultor">Agricultor</option>
                    </select>
                </div>
                <div class="form-group">
                    <label><strong>Región:</strong></label>
                    <select id="newUserRegion" required>
                        <option value="">Seleccionar...</option>
                        <option value="bogota">Bogotá</option>
                        <option value="antioquia">Antioquia</option>
                        <option value="valle">Valle del Cauca</option>
                        <option value="otra">Otra región</option>
                    </select>
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-primary" onclick="createNewUser()">
                    <i class="fas fa-user-plus"></i> Crear Usuario
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    <i class="fas fa-times"></i> Cancelar
                </button>
            </div>
        </form>
    `;
    
    showModal('Agregar Nuevo Usuario', content);
}

async function createNewUser() {
    try {
        const formData = {
            nombre: document.getElementById('newUserNombre').value.trim(),
            apellido: document.getElementById('newUserApellido').value.trim(),
            email: document.getElementById('newUserEmail').value.trim(),
            tipo: document.getElementById('newUserTipo').value,
            region: document.getElementById('newUserRegion').value
        };
        
        // Validaciones
        if (!formData.nombre || !formData.apellido || !formData.email || !formData.tipo || !formData.region) {
            showNotification('Por favor complete todos los campos', 'warning');
            return;
        }
        
        showLoading('Creando usuario...');
        
        const response = await fetch('/api/admin/create-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        hideLoading();
        
        if (data.success) {
            closeModal();
            
            // Mostrar información de la contraseña temporal
            showModal('Usuario Creado', `
                <div class="user-created-info">
                    <div class="success-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h3>Usuario creado exitosamente</h3>
                    <div class="user-info">
                        <p><strong>Nombre:</strong> ${data.user_data.nombre} ${data.user_data.apellido}</p>
                        <p><strong>Email:</strong> ${data.user_data.email}</p>
                        <p><strong>Tipo:</strong> ${data.user_data.tipo}</p>
                    </div>
                    <div class="temp-password">
                        <p><strong>Contraseña temporal:</strong></p>
                        <code>${data.temp_password}</code>
                        <small>El usuario debe cambiar esta contraseña en su primer inicio de sesión</small>
                    </div>
                    <button class="btn btn-primary" onclick="closeModal()">Entendido</button>
                </div>
            `);
            
            await loadUsers(); // Recargar usuarios
        } else {
            throw new Error(data.error || 'Error creando usuario');
        }
    } catch (error) {
        hideLoading();
        console.error('Error creando usuario:', error);
        showNotification('Error creando usuario', 'error');
    }
}

// ================================================================
// OTRAS FUNCIONES DEL DASHBOARD
// ================================================================
function showPendingReports() {
    // Simular reportes pendientes
    const content = `
        <div class="pending-reports">
            <div class="report-item">
                <div class="report-header">
                    <h4>Contenido inapropiado</h4>
                    <span class="report-priority high">Alta</span>
                </div>
                <p><strong>Reportado por:</strong> Usuario123</p>
                <p><strong>Oferta:</strong> Recolección de Frutas</p>
                <p><strong>Fecha:</strong> Hace 2 horas</p>
                <div class="report-actions">
                    <button class="btn btn-primary">Revisar</button>
                    <button class="btn btn-warning">Descartar</button>
                </div>
            </div>
            
            <div class="report-item">
                <div class="report-header">
                    <h4>Usuario fraudulento</h4>
                    <span class="report-priority medium">Media</span>
                </div>
                <p><strong>Reportado por:</strong> FarmerX</p>
                <p><strong>Usuario:</strong> Carlos Fake</p>
                <p><strong>Fecha:</strong> Hace 1 día</p>
                <div class="report-actions">
                    <button class="btn btn-primary">Investigar</button>
                    <button class="btn btn-danger">Bloquear Usuario</button>
                </div>
            </div>
            
            <div class="no-more-reports">
                <p>No hay más reportes pendientes</p>
            </div>
        </div>
    `;
    
    showModal('Reportes Pendientes', content);
}

// ================================================================
// HERRAMIENTAS DE ADMINISTRACIÓN
// ================================================================
async function exportToExcel() {
    try {
        showLoading('Generando archivo Excel...');
        
        const response = await fetch('/api/admin/export-users?format=excel');
        const data = await response.json();
        
        hideLoading();
        
        if (data.success) {
            showNotification('Archivo Excel generado correctamente', 'success');
            console.log('Datos para Excel:', data.users);
            // Aquí podrías implementar la descarga real del archivo
        } else {
            throw new Error(data.error || 'Error generando Excel');
        }
    } catch (error) {
        hideLoading();
        console.error('Error exportando Excel:', error);
        showNotification('Error generando archivo Excel', 'error');
    }
}

async function exportToPDF() {
    try {
        showLoading('Generando archivo PDF...');
        
        const response = await fetch('/api/admin/export-users?format=pdf');
        const data = await response.json();
        
        hideLoading();
        
        if (data.success) {
            showNotification('Archivo PDF generado correctamente', 'success');
            console.log('Datos para PDF:', data.users);
            // Aquí podrías implementar la descarga real del archivo
        } else {
            throw new Error(data.error || 'Error generando PDF');
        }
    } catch (error) {
        hideLoading();
        console.error('Error exportando PDF:', error);
        showNotification('Error generando archivo PDF', 'error');
    }
}

async function backupData() {
    try {
        showLoading('Creando copia de seguridad...');
        
        const response = await fetch('/api/admin/backup-data', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        hideLoading();
        
        if (data.success) {
            showNotification('Copia de seguridad creada correctamente', 'success');
            
            showModal('Backup Completado', `
                <div class="backup-info">
                    <div class="success-icon">
                        <i class="fas fa-database"></i>
                    </div>
                    <h3>Copia de seguridad creada</h3>
                    <div class="backup-details">
                        <p><strong>Archivo:</strong> ${data.backup_info.filename}</p>
                        <p><strong>Tamaño:</strong> ${data.backup_info.size}</p>
                        <p><strong>Estado:</strong> ${data.backup_info.status}</p>
                    </div>
                    <button class="btn btn-primary" onclick="closeModal()">Cerrar</button>
                </div>
            `);
        } else {
            throw new Error(data.error || 'Error creando backup');
        }
    } catch (error) {
        hideLoading();
        console.error('Error creando backup:', error);
        showNotification('Error creando copia de seguridad', 'error');
    }
}

async function clearCache() {
    try {
        showLoading('Limpiando cache...');
        
        const response = await fetch('/api/admin/clear-cache', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        hideLoading();
        
        if (data.success) {
            showNotification('Cache limpiado correctamente', 'success');
            
            showModal('Cache Limpiado', `
                <div class="cache-info">
                    <div class="success-icon">
                        <i class="fas fa-broom"></i>
                    </div>
                    <h3>Cache del sistema limpiado</h3>
                    <div class="cache-details">
                        <p><strong>Elementos eliminados:</strong> ${data.cache_info.cleared_items}</p>
                        <p><strong>Espacio liberado:</strong> ${data.cache_info.space_freed}</p>
                        <p><strong>Tiempo:</strong> ${data.cache_info.time_taken}</p>
                    </div>
                    <button class="btn btn-primary" onclick="closeModal()">Cerrar</button>
                </div>
            `);
        } else {
            throw new Error(data.error || 'Error limpiando cache');
        }
    } catch (error) {
        hideLoading();
        console.error('Error limpiando cache:', error);
        showNotification('Error limpiando cache', 'error');
    }
}

// ================================================================
// SISTEMA DE MODALES
// ================================================================
function showModal(title, content) {
    const modal = document.getElementById('userModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (modal && modalTitle && modalBody) {
        modalTitle.textContent = title;
        modalBody.innerHTML = content;
        modal.style.display = 'block';
        document.body.classList.add('modal-open');
        
        // Agregar evento para cerrar con ESC
        document.addEventListener('keydown', handleModalKeydown);
    }
}

function closeModal() {
    const modal = document.getElementById('userModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', handleModalKeydown);
    }
}

function handleModalKeydown(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
}

// Cerrar modal al hacer clic fuera
window.addEventListener('click', function(e) {
    const modal = document.getElementById('userModal');
    if (e.target === modal) {
        closeModal();
    }
});

// ================================================================
// SISTEMA DE CONFIRMACIÓN
// ================================================================
function showConfirmDialog(title, message, type = 'warning') {
    return new Promise((resolve) => {
        const typeClasses = {
            'warning': 'btn-warning',
            'danger': 'btn-danger',
            'success': 'btn-success',
            'info': 'btn-info'
        };
        
        const typeIcons = {
            'warning': 'fas fa-exclamation-triangle',
            'danger': 'fas fa-trash-alt',
            'success': 'fas fa-check-circle',
            'info': 'fas fa-info-circle'
        };
        
        const content = `
            <div class="confirm-dialog">
                <div class="confirm-icon ${type}">
                    <i class="${typeIcons[type] || 'fas fa-question-circle'}"></i>
                </div>
                <p>${message}</p>
                <div class="confirm-actions">
                    <button class="btn ${typeClasses[type] || 'btn-warning'}" onclick="confirmAction(true)">
                        Confirmar
                    </button>
                    <button class="btn btn-secondary" onclick="confirmAction(false)">
                        Cancelar
                    </button>
                </div>
            </div>
        `;
        
        showModal(title, content);
        
        // Función global temporal para manejar la respuesta
        window.confirmAction = (result) => {
            closeModal();
            delete window.confirmAction;
            resolve(result);
        };
    });
}

// ================================================================
// SISTEMA DE NOTIFICACIONES
// ================================================================
function showNotification(message, type = 'info', duration = 4000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const typeConfig = {
        'success': { icon: 'fas fa-check-circle', color: '#28a745' },
        'error': { icon: 'fas fa-times-circle', color: '#dc3545' },
        'warning': { icon: 'fas fa-exclamation-triangle', color: '#ffc107' },
        'info': { icon: 'fas fa-info-circle', color: '#17a2b8' }
    };
    
    const config = typeConfig[type] || typeConfig['info'];
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${config.color};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 10000;
        transform: translateX(100%);
        transition: all 0.3s ease;
        max-width: 400px;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    `;
    
    notification.innerHTML = `
        <i class="${config.icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Animación de entrada
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-remover
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, duration);
}

// ================================================================
// SISTEMA DE LOADING
// ================================================================
function showLoading(message = 'Cargando...') {
    const loading = document.createElement('div');
    loading.id = 'loadingOverlay';
    loading.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;
    
    loading.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 10px; text-align: center;">
            <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
            <p>${message}</p>
        </div>
    `;
    
    document.body.appendChild(loading);
}

function hideLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        document.body.removeChild(loading);
    }
}

// ================================================================
// EVENT LISTENERS
// ================================================================
function setupEventListeners() {
    // Búsqueda en tiempo real
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                loadUsers();
            }, 500);
        });
    }
    
    // Notificaciones
    const notificationBell = document.querySelector('.notification-bell');
    if (notificationBell) {
        notificationBell.addEventListener('click', toggleNotifications);
    }
}

function toggleNotifications() {
    showNotification('Sistema de notificaciones en desarrollo', 'info');
}

// ================================================================
// ACTUALIZACIÓN AUTOMÁTICA
// ================================================================
function startAutoRefresh() {
    setInterval(async () => {
        if (currentSection === 'dashboard') {
            await loadDashboardStats();
        }
    }, CONFIG.refreshInterval);
}

// ================================================================
// FUNCIONES DE LOGOUT
// ================================================================
function logout() {
    showConfirmDialog(
        'Cerrar Sesión',
        '¿Está seguro que desea cerrar sesión?',
        'warning'
    ).then(async (confirmed) => {
        if (confirmed) {
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
                    showNotification('Sesión cerrada correctamente', 'success');
                    
                    // AGREGAR ESTAS LÍNEAS
                    sessionStorage.clear();
                    localStorage.removeItem('user_data');
                    
                    // CAMBIAR setTimeout por window.location.replace
                    setTimeout(() => {
                        window.location.replace('/vista/login-trabajador.html?message=Sesión cerrada correctamente&type=success');
                    }, 1000);
                } else {
                    throw new Error('Error cerrando sesión');
                }
            } catch (error) {
                console.error('Error logout:', error);
                showNotification('Error cerrando sesión', 'error');
                // AGREGAR: Forzar redirección aunque haya error
                setTimeout(() => {
                    window.location.replace('/vista/login-trabajador.html');
                }, 1000);
            }
        }
    });
}

// ================================================================
// FUNCIONES ADICIONALES PARA COMPATIBILIDAD
// ================================================================
async function loadStatistics() {
    console.log('Cargando estadísticas detalladas...');
    showNotification('Sección de estadísticas en desarrollo', 'info');
}

async function loadReports() {
    console.log('Cargando reportes...');
    showNotification('Sección de reportes en desarrollo', 'info');
}

async function loadAuditHistory() {
    console.log('Cargando historial de auditoría...');
    showNotification('Historial de auditoría en desarrollo', 'info');
}

// ================================================================
// CSS PARA ANIMACIONES (agregar al head si no existe)
// ================================================================
if (!document.getElementById('admin-styles')) {
    const styles = document.createElement('style');
    styles.id = 'admin-styles';
    styles.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .modal-open {
            overflow: hidden;
        }
        
        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin-bottom: 1rem;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
        }
        
        .form-group input,
        .form-group select {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
        }
        
        .form-actions {
            display: flex;
            gap: 0.5rem;
            justify-content: flex-end;
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid #eee;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 0.5rem;
        }
        
        .user-created-info,
        .backup-info,
        .cache-info {
            text-align: center;
        }
        
        .success-icon {
            font-size: 3rem;
            color: #28a745;
            margin-bottom: 1rem;
        }
        
        .temp-password {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 5px;
            margin: 1rem 0;
        }
        
        .temp-password code {
            background: #e9ecef;
            padding: 0.5rem 1rem;
            border-radius: 3px;
            font-size: 1.2rem;
            font-weight: bold;
            color: #495057;
            display: block;
            margin: 0.5rem 0;
            text-align: center;
            letter-spacing: 2px;
        }
        
        .confirm-dialog {
            text-align: center;
            padding: 1rem;
        }
        
        .confirm-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        
        .confirm-icon.warning { color: #ffc107; }
        .confirm-icon.danger { color: #dc3545; }
        .confirm-icon.success { color: #28a745; }
        .confirm-icon.info { color: #17a2b8; }
        
        .confirm-actions {
            display: flex;
            gap: 0.5rem;
            justify-content: center;
            margin-top: 1.5rem;
        }
        
        .report-item {
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
        }
        
        .report-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }
        
        .report-priority {
            padding: 0.25rem 0.5rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: bold;
        }
        
        .report-priority.high {
            background: #dc3545;
            color: white;
        }
        
        .report-priority.medium {
            background: #ffc107;
            color: #212529;
        }
        
        .report-priority.low {
            background: #28a745;
            color: white;
        }
        
        .report-actions {
            display: flex;
            gap: 0.5rem;
            margin-top: 0.5rem;
        }
        
        .no-more-reports {
            text-align: center;
            color: #6c757d;
            font-style: italic;
            margin-top: 1rem;
        }
        
        .user-details {
            max-height: 500px;
            overflow-y: auto;
        }
        
        .user-basic-info,
        .user-stats {
            margin-bottom: 1.5rem;
        }
        
        .user-basic-info h4,
        .user-stats h4 {
            color: #495057;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 0.5rem;
            margin-bottom: 1rem;
        }
        
        .notification {
            font-size: 14px;
            line-height: 1.4;
        }
        
        .notification i {
            font-size: 16px;
        }
        
        .action-buttons {
            display: flex;
            gap: 0.25rem;
        }
        
        .action-buttons .btn {
            padding: 0.25rem 0.5rem;
            font-size: 0.8rem;
        }
        
        .user-type.trabajador {
            background: #17a2b8;
            color: white;
            padding: 0.2rem 0.5rem;
            border-radius: 12px;
            font-size: 0.8rem;
        }
        
        .user-type.agricultor {
            background: #28a745;
            color: white;
            padding: 0.2rem 0.5rem;
            border-radius: 12px;
            font-size: 0.8rem;
        }
        
        .user-status.activo {
            background: #28a745;
            color: white;
            padding: 0.2rem 0.5rem;
            border-radius: 12px;
            font-size: 0.8rem;
        }
        
        .user-status.suspendido,
        .user-status.inactivo {
            background: #ffc107;
            color: #212529;
            padding: 0.2rem 0.5rem;
            border-radius: 12px;
            font-size: 0.8rem;
        }
        
        .user-status.bloqueado {
            background: #dc3545;
            color: white;
            padding: 0.2rem 0.5rem;
            border-radius: 12px;
            font-size: 0.8rem;
        }
        
        .activity-item {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            padding: 0.75rem;
            border-bottom: 1px solid #f1f1f1;
        }
        
        .activity-item:last-child {
            border-bottom: none;
        }
        
        .activity-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.1rem;
            flex-shrink: 0;
        }
        
        .activity-icon.new-user {
            background: rgba(40, 167, 69, 0.1);
            color: #28a745;
        }
        
        .activity-icon.new-job {
            background: rgba(0, 123, 255, 0.1);
            color: #007bff;
        }
        
        .activity-icon.new-application {
            background: rgba(255, 193, 7, 0.1);
            color: #ffc107;
        }
        
        .activity-content {
            flex: 1;
        }
        
        .activity-content p {
            margin: 0 0 0.25rem 0;
            font-size: 0.9rem;
            line-height: 1.4;
        }
        
        .activity-content small {
            color: #6c757d;
            font-size: 0.8rem;
        }
        
        .status-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid #f1f1f1;
        }
        
        .status-item:last-child {
            border-bottom: none;
        }
        
        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 0.5rem;
            display: inline-block;
        }
        
        .status-indicator.online {
            background: #28a745;
        }
        
        .status-indicator.warning {
            background: #ffc107;
        }
        
        .status-indicator.offline {
            background: #dc3545;
        }
        
        .no-activity {
            text-align: center;
            color: #6c757d;
            font-style: italic;
            padding: 2rem;
        }
        
        .bulk-actions {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        .bulk-btn {
            padding: 0.375rem 0.75rem;
            border: none;
            border-radius: 4px;
            font-size: 0.875rem;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .bulk-btn.suspend {
            background: #ffc107;
            color: #212529;
        }
        
        .bulk-btn.delete {
            background: #dc3545;
            color: white;
        }
        
        .bulk-btn.activate {
            background: #28a745;
            color: white;
        }
        
        .bulk-btn:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }
        
        .bulk-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        @media (max-width: 768px) {
            .form-grid {
                grid-template-columns: 1fr;
            }
            
            .info-grid {
                grid-template-columns: 1fr;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
            
            .confirm-actions {
                flex-direction: column;
            }
            
            .bulk-actions {
                flex-direction: column;
                align-items: flex-start;
                gap: 0.5rem;
            }
            
            .action-buttons {
                flex-direction: column;
                gap: 0.25rem;
            }
            
            .notification {
                right: 10px;
                left: 10px;
                max-width: none;
            }
        }
    `;
    
    document.head.appendChild(styles);
}

console.log('✅ Panel de Administrador JavaScript cargado completamente');
console.log('📋 Funcionalidades disponibles:');
console.log('   • Gestión completa de usuarios (ver, editar, eliminar)');
console.log('   • Filtros avanzados y búsqueda en tiempo real');
console.log('   • Acciones masivas (suspender, activar, eliminar)');
console.log('   • Dashboard con estadísticas en tiempo real');
console.log('   • Sistema de notificaciones y modales');
console.log('   • Herramientas de administración (backup, cache)');
console.log('   • Responsive design para móviles');
console.log('   • Validaciones y manejo de errores completo');

// ================================================================
// AGREGAR ESTAS FUNCIONES A: js/index-administrador.js
// Funcionalidades para Publicaciones, Estadísticas y Reportes
// ================================================================

// ================================================================
// GESTIÓN DE PUBLICACIONES
// ================================================================

async function loadPublicaciones() {
    try {
        console.log('📋 Cargando publicaciones...');
        
        // Obtener filtros actuales
        const estado = document.getElementById('pubEstadoFilter')?.value || '';
        const agricultor = document.getElementById('pubAgricultorFilter')?.value || '';
        
        const params = new URLSearchParams();
        if (estado) params.append('estado', estado);
        if (agricultor) params.append('agricultor', agricultor);
        
        const response = await fetch(`/api/admin/publicaciones?${params}`);
        const data = await response.json();
        
        if (data.success) {
            displayPublicaciones(data.publicaciones);
            updatePublicacionesStats(data.publicaciones);
        } else {
            showNotification('Error cargando publicaciones', 'error');
        }
        
    } catch (error) {
        console.error('Error cargando publicaciones:', error);
        showNotification('Error de conexión', 'error');
    }
}

function displayPublicaciones(publicaciones) {
    const container = document.getElementById('publicacionesTableBody');
    if (!container) return;
    
    if (!publicaciones || publicaciones.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-inbox" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p>No hay publicaciones disponibles</p>
                </td>
            </tr>
        `;
        return;
    }
    
    container.innerHTML = publicaciones.map(pub => `
        <tr>
            <td>${pub.id}</td>
            <td>
                <strong>${pub.titulo}</strong>
                <br>
                <small style="color: #666;">${pub.descripcion.substring(0, 80)}...</small>
            </td>
            <td>${pub.agricultor.nombre}</td>
            <td>$${pub.pago.toLocaleString('es-CO')}</td>
            <td>
                <span class="badge badge-${getEstadoBadgeClass(pub.estado)}">
                    ${pub.estado}
                </span>
            </td>
            <td>${pub.estadisticas.total_postulaciones}</td>
            <td>${pub.fecha_publicacion}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-info" onclick="viewPublicacionDetails(${pub.id})" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="cambiarEstadoPublicacion(${pub.id}, '${pub.estado}')" title="Cambiar estado">
                        <i class="fas fa-exchange-alt"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deletePublicacion(${pub.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function getEstadoBadgeClass(estado) {
    const classes = {
        'Abierta': 'success',
        'Cerrada': 'secondary',
        'En Proceso': 'warning'
    };
    return classes[estado] || 'secondary';
}

async function viewPublicacionDetails(ofertaId) {
    try {
        const response = await fetch(`/api/admin/publicacion/${ofertaId}`);
        const data = await response.json();
        
        if (data.success) {
            const pub = data.publicacion;
            
            const content = `
                <div class="publicacion-details">
                    <div class="detail-section">
                        <h4><i class="fas fa-info-circle"></i> Información de la Oferta</h4>
                        <div class="info-grid">
                            <div><strong>ID:</strong> ${pub.id}</div>
                            <div><strong>Estado:</strong> <span class="badge badge-${getEstadoBadgeClass(pub.estado)}">${pub.estado}</span></div>
                            <div><strong>Pago:</strong> $${pub.pago.toLocaleString('es-CO')}</div>
                            <div><strong>Fecha:</strong> ${new Date(pub.fecha_publicacion).toLocaleDateString()}</div>
                        </div>
                        <div style="margin-top: 1rem;">
                            <strong>Título:</strong>
                            <p>${pub.titulo}</p>
                        </div>
                        <div style="margin-top: 1rem;">
                            <strong>Descripción:</strong>
                            <p>${pub.descripcion}</p>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4><i class="fas fa-user"></i> Agricultor</h4>
                        <div class="info-grid">
                            <div><strong>Nombre:</strong> ${pub.agricultor.nombre}</div>
                            <div><strong>Email:</strong> ${pub.agricultor.email}</div>
                            <div><strong>Teléfono:</strong> ${pub.agricultor.telefono || 'No disponible'}</div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4><i class="fas fa-users"></i> Postulaciones (${pub.postulaciones.length})</h4>
                        ${pub.postulaciones.length > 0 ? `
                            <table class="mini-table">
                                <thead>
                                    <tr>
                                        <th>Trabajador</th>
                                        <th>Fecha</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${pub.postulaciones.map(p => `
                                        <tr>
                                            <td>${p.Trabajador_Nombre}</td>
                                            <td>${new Date(p.Fecha_Postulacion).toLocaleDateString()}</td>
                                            <td><span class="badge badge-${getPostulacionBadge(p.Estado)}">${p.Estado}</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : '<p style="color: #666; text-align: center; padding: 1rem;">No hay postulaciones aún</p>'}
                    </div>
                    
                    ${pub.contratos.length > 0 ? `
                        <div class="detail-section">
                            <h4><i class="fas fa-handshake"></i> Contratos (${pub.contratos.length})</h4>
                            <table class="mini-table">
                                <thead>
                                    <tr>
                                        <th>Trabajador</th>
                                        <th>Fecha Inicio</th>
                                        <th>Estado</th>
                                        <th>Pago</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${pub.contratos.map(c => `
                                        <tr>
                                            <td>${c.Trabajador_Nombre}</td>
                                            <td>${new Date(c.Fecha_Inicio).toLocaleDateString()}</td>
                                            <td><span class="badge badge-${getContratoBadge(c.Estado)}">${c.Estado}</span></td>
                                            <td>$${(c.Pago_Final || 0).toLocaleString('es-CO')}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : ''}
                </div>
            `;
            
            showModal('Detalles de la Publicación', content);
        }
        
    } catch (error) {
        console.error('Error obteniendo detalles:', error);
        showNotification('Error cargando detalles', 'error');
    }
}

function getPostulacionBadge(estado) {
    const badges = {
        'Pendiente': 'warning',
        'Aceptada': 'success',
        'Rechazada': 'danger',
        'Favorito': 'info'
    };
    return badges[estado] || 'secondary';
}

function getContratoBadge(estado) {
    const badges = {
        'Activo': 'success',
        'Finalizado': 'primary',
        'Cancelado': 'danger'
    };
    return badges[estado] || 'secondary';
}

async function cambiarEstadoPublicacion(ofertaId, estadoActual) {
    const estados = ['Abierta', 'Cerrada', 'En Proceso'];
    const otrosEstados = estados.filter(e => e !== estadoActual);
    
    const content = `
        <div class="estado-change-form">
            <p style="margin-bottom: 1.5rem;">Selecciona el nuevo estado para esta publicación:</p>
            <div class="estado-options">
                ${otrosEstados.map(estado => `
                    <button class="btn btn-block btn-${getEstadoBadgeClass(estado)}" 
                            onclick="confirmarCambioEstado(${ofertaId}, '${estado}')"
                            style="margin-bottom: 0.5rem;">
                        ${estado}
                    </button>
                `).join('')}
            </div>
            <button class="btn btn-block btn-secondary" onclick="closeModal()" style="margin-top: 1rem;">
                Cancelar
            </button>
        </div>
    `;
    
    showModal('Cambiar Estado de Publicación', content);
}

async function confirmarCambioEstado(ofertaId, nuevoEstado) {
    try {
        const response = await fetch(`/api/admin/publicacion/${ofertaId}/cambiar-estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeModal();
            showNotification(data.message, 'success');
            await loadPublicaciones();
        } else {
            showNotification(data.error, 'error');
        }
        
    } catch (error) {
        console.error('Error cambiando estado:', error);
        showNotification('Error al cambiar estado', 'error');
    }
}

async function deletePublicacion(ofertaId) {
    const confirmed = await showConfirmDialog(
        'Eliminar Publicación',
        '¿Estás seguro de eliminar esta publicación? Esta acción no se puede deshacer.',
        'danger'
    );
    
    if (confirmed) {
        try {
            const response = await fetch(`/api/admin/publicacion/${ofertaId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                showNotification(data.message, 'success');
                await loadPublicaciones();
            } else {
                showNotification(data.error, 'error');
            }
            
        } catch (error) {
            console.error('Error eliminando publicación:', error);
            showNotification('Error al eliminar publicación', 'error');
        }
    }
}

function updatePublicacionesStats(publicaciones) {
    const abiertas = publicaciones.filter(p => p.estado === 'Abierta').length;
    const cerradas = publicaciones.filter(p => p.estado === 'Cerrada').length;
    const enProceso = publicaciones.filter(p => p.estado === 'En Proceso').length;
    const totalPostulaciones = publicaciones.reduce((sum, p) => sum + p.estadisticas.total_postulaciones, 0);
    
    // Actualizar tarjetas de estadísticas si existen
    updateCounterWithAnimation('pubAbiertas', abiertas);
    updateCounterWithAnimation('pubCerradas', cerradas);
    updateCounterWithAnimation('pubEnProceso', enProceso);
    updateCounterWithAnimation('pubTotalPostulaciones', totalPostulaciones);
}

// ================================================================
// ESTADÍSTICAS
// ================================================================

async function loadEstadisticas() {
    try {
        console.log('📊 Cargando estadísticas...');
        
        // Cargar estadísticas generales
        await loadEstadisticasGenerales();
        
        // Cargar datos para gráficos
        await loadGraficos();
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        showNotification('Error cargando estadísticas', 'error');
    }
}

async function loadEstadisticasGenerales() {
    try {
        const response = await fetch('/api/admin/estadisticas/general');
        const data = await response.json();
        
        if (data.success) {
            displayEstadisticasGenerales(data.estadisticas);
        }
        
    } catch (error) {
        console.error('Error cargando estadísticas generales:', error);
    }
}

function displayEstadisticasGenerales(stats) {
    const container = document.getElementById('estadisticasGenerales');
    if (!container) return;
    
    container.innerHTML = `
        <div class="stats-grid">
            <!-- Usuarios -->
            <div class="stat-card">
                <div class="stat-header">
                    <i class="fas fa-users"></i>
                    <h4>Usuarios</h4>
                </div>
                <div class="stat-body">
                    <div class="stat-main">${stats.usuarios.total}</div>
                    <div class="stat-details">
                        <div class="stat-item">
                            <span>Trabajadores:</span>
                            <strong>${stats.usuarios.trabajadores}</strong>
                        </div>
                        <div class="stat-item">
                            <span>Agricultores:</span>
                            <strong>${stats.usuarios.agricultores}</strong>
                        </div>
                        <div class="stat-item success">
                            <span>Activos:</span>
                            <strong>${stats.usuarios.activos}</strong>
                        </div>
                        <div class="stat-item">
                            <span>Nuevos (mes):</span>
                            <strong>${stats.usuarios.nuevos_mes}</strong>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Ofertas -->
            <div class="stat-card">
                <div class="stat-header">
                    <i class="fas fa-briefcase"></i>
                    <h4>Ofertas de Trabajo</h4>
                </div>
                <div class="stat-body">
                    <div class="stat-main">${stats.ofertas.total}</div>
                    <div class="stat-details">
                        <div class="stat-item success">
                            <span>Abiertas:</span>
                            <strong>${stats.ofertas.abiertas}</strong>
                        </div>
                        <div class="stat-item">
                            <span>Cerradas:</span>
                            <strong>${stats.ofertas.cerradas}</strong>
                        </div>
                        <div class="stat-item warning">
                            <span>En Proceso:</span>
                            <strong>${stats.ofertas.en_proceso}</strong>
                        </div>
                        <div class="stat-item">
                            <span>Pago Promedio:</span>
                            <strong>${stats.ofertas.pago_promedio.toLocaleString('es-CO')}</strong>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Postulaciones -->
            <div class="stat-card">
                <div class="stat-header">
                    <i class="fas fa-file-alt"></i>
                    <h4>Postulaciones</h4>
                </div>
                <div class="stat-body">
                    <div class="stat-main">${stats.postulaciones.total}</div>
                    <div class="stat-details">
                        <div class="stat-item warning">
                            <span>Pendientes:</span>
                            <strong>${stats.postulaciones.pendientes}</strong>
                        </div>
                        <div class="stat-item success">
                            <span>Aceptadas:</span>
                            <strong>${stats.postulaciones.aceptadas}</strong>
                        </div>
                        <div class="stat-item danger">
                            <span>Rechazadas:</span>
                            <strong>${stats.postulaciones.rechazadas}</strong>
                        </div>
                        <div class="stat-item">
                            <span>Tasa Conversión:</span>
                            <strong>${stats.postulaciones.tasa_conversion}%</strong>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Contratos -->
            <div class="stat-card">
                <div class="stat-header">
                    <i class="fas fa-handshake"></i>
                    <h4>Contratos</h4>
                </div>
                <div class="stat-body">
                    <div class="stat-main">${stats.contratos.total}</div>
                    <div class="stat-details">
                        <div class="stat-item success">
                            <span>Activos:</span>
                            <strong>${stats.contratos.activos}</strong>
                        </div>
                        <div class="stat-item">
                            <span>Finalizados:</span>
                            <strong>${stats.contratos.finalizados}</strong>
                        </div>
                        <div class="stat-item">
                            <span>Monto Total:</span>
                            <strong>${stats.contratos.monto_total.toLocaleString('es-CO')}</strong>
                        </div>
                        <div class="stat-item">
                            <span>Tasa Éxito:</span>
                            <strong>${stats.contratos.tasa_exito}%</strong>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Calificaciones -->
            <div class="stat-card">
                <div class="stat-header">
                    <i class="fas fa-star"></i>
                    <h4>Calificaciones</h4>
                </div>
                <div class="stat-body">
                    <div class="stat-main">${stats.calificaciones.total}</div>
                    <div class="stat-details">
                        <div class="stat-item">
                            <span>Promedio:</span>
                            <strong>${stats.calificaciones.promedio.toFixed(1)} ⭐</strong>
                        </div>
                        <div class="stat-item success">
                            <span>Buenas (4-5):</span>
                            <strong>${stats.calificaciones.buenas}</strong>
                        </div>
                        <div class="stat-item danger">
                            <span>Malas (1-2):</span>
                            <strong>${stats.calificaciones.malas}</strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function loadGraficos() {
    try {
        const response = await fetch('/api/admin/estadisticas/graficos');
        const data = await response.json();
        
        if (data.success) {
            renderGraficos(data.graficos);
        }
        
    } catch (error) {
        console.error('Error cargando gráficos:', error);
    }
}

function renderGraficos(graficos) {
    // Gráfico de usuarios por mes
    renderChartUsuariosPorMes(graficos.usuarios_por_mes);
    
    // Gráfico de ofertas por mes
    renderChartOfertasPorMes(graficos.ofertas_por_mes);
    
    // Gráfico de postulaciones por estado
    renderChartPostulacionesPorEstado(graficos.postulaciones_por_estado);
    
    // Gráfico de distribución de pagos
    renderChartDistribucionPagos(graficos.distribucion_pagos);
    
    // Top trabajadores y agricultores
    renderTopLists(graficos.top_trabajadores, graficos.top_agricultores);
}

function renderChartUsuariosPorMes(data) {
    const canvas = document.getElementById('chartUsuariosMes');
    if (!canvas || !data || data.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    const labels = data.map(d => d.mes);
    const trabajadores = data.map(d => d.trabajadores);
    const agricultores = data.map(d => d.agricultores);
    
    // Usar Chart.js si está disponible, sino mostrar tabla
    if (typeof Chart !== 'undefined') {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Trabajadores',
                        data: trabajadores,
                        borderColor: '#4a7c59',
                        backgroundColor: 'rgba(74, 124, 89, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Agricultores',
                        data: agricultores,
                        borderColor: '#5a8c69',
                        backgroundColor: 'rgba(90, 140, 105, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Usuarios Registrados por Mes'
                    }
                }
            }
        });
    }
}

function renderChartPostulacionesPorEstado(data) {
    const canvas = document.getElementById('chartPostulacionesEstado');
    if (!canvas || !data || data.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    const labels = data.map(d => d.Estado);
    const totales = data.map(d => d.total);
    
    if (typeof Chart !== 'undefined') {
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: totales,
                    backgroundColor: [
                        '#ffc107', // Pendiente
                        '#28a745', // Aceptada
                        '#dc3545', // Rechazada
                        '#17a2b8'  // Favorito
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Postulaciones por Estado'
                    }
                }
            }
        });
    }
}

function renderTopLists(topTrabajadores, topAgricultores) {
    // Renderizar top trabajadores
    const trabajadoresContainer = document.getElementById('topTrabajadores');
    if (trabajadoresContainer && topTrabajadores) {
        trabajadoresContainer.innerHTML = `
            <h4><i class="fas fa-trophy"></i> Top Trabajadores</h4>
            <div class="top-list">
                ${topTrabajadores.map((t, index) => `
                    <div class="top-item">
                        <span class="rank">#${index + 1}</span>
                        <div class="top-info">
                            <strong>${t.nombre}</strong>
                            <small>${t.total_postulaciones} postulaciones • ${t.aceptadas} aceptadas</small>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Renderizar top agricultores
    const agricultoresContainer = document.getElementById('topAgricultores');
    if (agricultoresContainer && topAgricultores) {
        agricultoresContainer.innerHTML = `
            <h4><i class="fas fa-trophy"></i> Top Agricultores</h4>
            <div class="top-list">
                ${topAgricultores.map((a, index) => `
                    <div class="top-item">
                        <span class="rank">#${index + 1}</span>
                        <div class="top-info">
                            <strong>${a.nombre}</strong>
                            <small>${a.total_ofertas} ofertas • ${a.ofertas_activas} activas</small>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

// ================================================================
// REPORTES
// ================================================================

async function loadReportes() {
    try {
        console.log('📑 Cargando reportes...');
        
        // Mostrar opciones de reportes
        displayReportesOptions();
        
    } catch (error) {
        console.error('Error cargando reportes:', error);
        showNotification('Error cargando reportes', 'error');
    }
}

function displayReportesOptions() {
    const container = document.getElementById('reportesContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="reportes-grid">
            <!-- Generar Reporte -->
            <div class="reporte-card">
                <div class="reporte-header">
                    <i class="fas fa-file-export"></i>
                    <h4>Generar Reporte</h4>
                </div>
                <div class="reporte-body">
                    <div class="form-group">
                        <label>Tipo de Reporte</label>
                        <select id="reporteTipo" class="form-control">
                            <option value="usuarios">Usuarios</option>
                            <option value="ofertas">Ofertas de Trabajo</option>
                            <option value="contratos">Contratos</option>
                            <option value="financiero">Financiero</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Fecha Inicio</label>
                        <input type="date" id="reporteFechaInicio" class="form-control">
                    </div>
                    
                    <div class="form-group">
                        <label>Fecha Fin</label>
                        <input type="date" id="reporteFechaFin" class="form-control">
                    </div>
                    
                    <div class="form-group">
                        <label>Formato</label>
                        <select id="reporteFormato" class="form-control">
                            <option value="json">JSON</option>
                            <option value="csv">CSV</option>
                            <option value="excel">Excel</option>
                        </select>
                    </div>
                    
                    <button class="btn btn-primary btn-block" onclick="generarReporte()">
                        <i class="fas fa-download"></i> Generar Reporte
                    </button>
                </div>
            </div>
            
            <!-- Reporte de Actividad -->
            <div class="reporte-card">
                <div class="reporte-header">
                    <i class="fas fa-chart-line"></i>
                    <h4>Reporte de Actividad</h4>
                </div>
                <div class="reporte-body">
                    <div class="form-group">
                        <label>Período (días)</label>
                        <select id="actividadDias" class="form-control">
                            <option value="7">Últimos 7 días</option>
                            <option value="30" selected>Últimos 30 días</option>
                            <option value="90">Últimos 90 días</option>
                        </select>
                    </div>
                    
                    <button class="btn btn-success btn-block" onclick="generarReporteActividad()">
                        <i class="fas fa-chart-bar"></i> Ver Actividad
                    </button>
                </div>
                <div id="actividadResults" class="reporte-results"></div>
            </div>
            
            <!-- Reporte de Rendimiento -->
            <div class="reporte-card">
                <div class="reporte-header">
                    <i class="fas fa-tachometer-alt"></i>
                    <h4>Reporte de Rendimiento</h4>
                </div>
                <div class="reporte-body">
                    <p style="margin-bottom: 1rem; color: #666;">
                        Análisis de rendimiento del sistema y usuarios más activos
                    </p>
                    
                    <button class="btn btn-info btn-block" onclick="generarReporteRendimiento()">
                        <i class="fas fa-trophy"></i> Ver Rendimiento
                    </button>
                </div>
                <div id="rendimientoResults" class="reporte-results"></div>
            </div>
            
            <!-- Exportar Datos -->
            <div class="reporte-card">
                <div class="reporte-header">
                    <i class="fas fa-database"></i>
                    <h4>Exportar Datos</h4>
                </div>
                <div class="reporte-body">
                    <div class="export-buttons">
                        <button class="btn btn-block btn-outline-primary" onclick="exportarDatos('usuarios')">
                            <i class="fas fa-users"></i> Exportar Usuarios
                        </button>
                        <button class="btn btn-block btn-outline-success" onclick="exportarDatos('ofertas')">
                            <i class="fas fa-briefcase"></i> Exportar Ofertas
                        </button>
                        <button class="btn btn-block btn-outline-warning" onclick="exportarDatos('postulaciones')">
                            <i class="fas fa-file-alt"></i> Exportar Postulaciones
                        </button>
                        <button class="btn btn-block btn-outline-info" onclick="exportarDatos('contratos')">
                            <i class="fas fa-handshake"></i> Exportar Contratos
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Establecer fechas por defecto
    const hoy = new Date().toISOString().split('T')[0];
    const hace30dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    document.getElementById('reporteFechaFin').value = hoy;
    document.getElementById('reporteFechaInicio').value = hace30dias;
}

async function generarReporte() {
    try {
        const tipo = document.getElementById('reporteTipo').value;
        const fechaInicio = document.getElementById('reporteFechaInicio').value;
        const fechaFin = document.getElementById('reporteFechaFin').value;
        const formato = document.getElementById('reporteFormato').value;
        
        if (!fechaInicio || !fechaFin) {
            showNotification('Por favor selecciona las fechas', 'warning');
            return;
        }
        
        showLoading('Generando reporte...');
        
        const response = await fetch('/api/admin/reportes/generar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tipo,
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin,
                formato
            })
        });
        
        const data = await response.json();
        
        hideLoading();
        
        if (data.success) {
            mostrarResultadoReporte(data.reporte);
        } else {
            showNotification(data.error, 'error');
        }
        
    } catch (error) {
        hideLoading();
        console.error('Error generando reporte:', error);
        showNotification('Error generando reporte', 'error');
    }
}

function mostrarResultadoReporte(reporte) {
    const content = `
        <div class="reporte-resultado">
            <div class="reporte-info">
                <h4><i class="fas fa-file-alt"></i> Reporte de ${reporte.tipo}</h4>
                <div class="info-grid">
                    <div><strong>Período:</strong> ${reporte.fecha_inicio} al ${reporte.fecha_fin}</div>
                    <div><strong>Generado por:</strong> ${reporte.generado_por}</div>
                    <div><strong>Registros:</strong> ${reporte.total_registros}</div>
                    <div><strong>Fecha:</strong> ${new Date(reporte.fecha_generacion).toLocaleString()}</div>
                </div>
            </div>
            
            <div class="reporte-preview">
                <h5>Vista Previa de Datos</h5>
                <pre>${JSON.stringify(reporte.datos, null, 2).substring(0, 1000)}...</pre>
            </div>
            
            <div class="reporte-actions">
                <button class="btn btn-primary" onclick="descargarReporte(${JSON.stringify(reporte).replace(/"/g, '&quot;')})">
                    <i class="fas fa-download"></i> Descargar
                </button>
                <button class="btn btn-secondary" onclick="closeModal()">
                    Cerrar
                </button>
            </div>
        </div>
    `;
    
    showModal('Reporte Generado', content);
}

async function generarReporteActividad() {
    try {
        const dias = document.getElementById('actividadDias').value;
        
        showLoading('Generando reporte de actividad...');
        
        const response = await fetch(`/api/admin/reportes/actividad?dias=${dias}`);
        const data = await response.json();
        
        hideLoading();
        
        if (data.success) {
            mostrarActividadResults(data);
        } else {
            showNotification(data.error, 'error');
        }
        
    } catch (error) {
        hideLoading();
        console.error('Error generando reporte de actividad:', error);
        showNotification('Error generando reporte', 'error');
    }
}

function mostrarActividadResults(data) {
    const container = document.getElementById('actividadResults');
    if (!container) return;
    
    container.innerHTML = `
        <div class="actividad-summary">
            <h5>Resumen de Actividad - ${data.periodo}</h5>
            <div class="summary-grid">
                ${data.resumen.map(item => `
                    <div class="summary-item">
                        <div class="summary-value">${item.total}</div>
                        <div class="summary-label">${item.tipo_actividad}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

async function generarReporteRendimiento() {
    try {
        showLoading('Generando reporte de rendimiento...');
        
        const response = await fetch('/api/admin/reportes/rendimiento');
        const data = await response.json();
        
        hideLoading();
        
        if (data.success) {
            mostrarRendimientoResults(data.rendimiento);
        } else {
            showNotification(data.error, 'error');
        }
        
    } catch (error) {
        hideLoading();
        console.error('Error generando reporte de rendimiento:', error);
        showNotification('Error generando reporte', 'error');
    }
}

function mostrarRendimientoResults(rendimiento) {
    const container = document.getElementById('rendimientoResults');
    if (!container) return;
    
    container.innerHTML = `
        <div class="rendimiento-content">
            <h5>Top Usuarios Más Activos</h5>
            
            <div class="top-section">
                <h6><i class="fas fa-user-tie"></i> Trabajadores</h6>
                ${rendimiento.trabajadores_destacados.slice(0, 5).map((t, i) => `
                    <div class="top-user-item">
                        <span class="position">#${i + 1}</span>
                        <div class="user-info">
                            <strong>${t.nombre}</strong>
                            <small>${t.postulaciones} postulaciones • ${t.contratos_completados} trabajos</small>
                        </div>
                        <span class="rating">${(t.calificacion || 0).toFixed(1)} ⭐</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="top-section">
                <h6><i class="fas fa-tractor"></i> Agricultores</h6>
                ${rendimiento.agricultores_destacados.slice(0, 5).map((a, i) => `
                    <div class="top-user-item">
                        <span class="position">#${i + 1}</span>
                        <div class="user-info">
                            <strong>${a.nombre}</strong>
                            <small>${a.ofertas_publicadas} ofertas • ${a.contratos_completados} contratos</small>
                        </div>
                        <span class="rating">${(a.calificacion || 0).toFixed(1)} ⭐</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

async function exportarDatos(tipo) {
    try {
        showLoading(`Exportando ${tipo}...`);
        
        const response = await fetch(`/api/admin/exportar/${tipo}?formato=csv`);
        const data = await response.json();
        
        hideLoading();
        
        if (data.success) {
            showNotification(`${data.total_registros} registros de ${tipo} preparados para exportación`, 'success');
            // Aquí podrías generar y descargar el archivo CSV/Excel
            console.log('Datos para exportar:', data.datos);
        } else {
            showNotification(data.error, 'error');
        }
        
    } catch (error) {
        hideLoading();
        console.error('Error exportando datos:', error);
        showNotification('Error exportando datos', 'error');
    }
}

// ================================================================
// CSS ADICIONAL PARA LOS NUEVOS COMPONENTES
// ================================================================

const additionalStyles = `
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
        margin: 2rem 0;
    }
    
    .stat-card {
        background: white;
        border-radius: 15px;
        padding: 1.5rem;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    
    .stat-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #f0f4f1;
    }
    
    .stat-header i {
        font-size: 1.5rem;
        color: #4a7c59;
    }
    
    .stat-main {
        font-size: 3rem;
        font-weight: bold;
        color: #1e3a2e;
        text-align: center;
        margin: 1rem 0;
    }
    
    .stat-details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
    }
    
    .stat-item {
        padding: 0.5rem;
        background: #f8f9fa;
        border-radius: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .stat-item.success { border-left: 3px solid #28a745; }
    .stat-item.warning { border-left: 3px solid #ffc107; }
    .stat-item.danger { border-left: 3px solid #dc3545; }
    
    .reportes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 2rem;
        margin: 2rem 0;
    }
    
    .reporte-card {
        background: white;
        border-radius: 15px;
        overflow: hidden;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    
    .reporte-header {
        background: linear-gradient(135deg, #4a7c59, #1e3a2e);
        color: white;
        padding: 1.5rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .reporte-body {
        padding: 1.5rem;
    }
    
    .top-list {
        margin-top: 1rem;
    }
    
    .top-item {
        display: flex;
        align-items: center;
        padding: 0.75rem;
        margin-bottom: 0.5rem;
        background: #f8f9fa;
        border-radius: 8px;
    }
    
    .rank {
        font-size: 1.5rem;
        font-weight: bold;
        color: #4a7c59;
        width: 50px;
        text-align: center;
    }
    
    .top-info {
        flex: 1;
        margin-left: 1rem;
    }
    
    .top-info strong {
        display: block;
        color: #1e3a2e;
    }
    
    .top-info small {
        color: #666;
    }
    
    .mini-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 1rem;
    }
    
    .mini-table th,
    .mini-table td {
        padding: 0.75rem;
        text-align: left;
        border-bottom: 1px solid #f0f4f1;
    }
    
    .mini-table th {
        background: #f8f9fa;
        font-weight: 600;
        color: #1e3a2e;
    }
    
    .badge {
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 600;
    }
    
    .badge-success { background: #28a745; color: white; }
    .badge-warning { background: #ffc107; color: #212529; }
    .badge-danger { background: #dc3545; color: white; }
    .badge-info { background: #17a2b8; color: white; }
    .badge-secondary { background: #6c757d; color: white; }
    .badge-primary { background: #007bff; color: white; }
    
    .detail-section {
        background: white;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        border-radius: 10px;
        border-left: 4px solid #4a7c59;
    }
    
    .detail-section h4 {
        margin-bottom: 1rem;
        color: #1e3a2e;
    }
    
    .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }
    
    .export-buttons button {
        margin-bottom: 0.5rem;
    }
    
    .reporte-results {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #eee;
    }
    
    .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
    }
    
    .summary-item {
        text-align: center;
        padding: 1rem;
        background: linear-gradient(135deg, #4a7c59, #1e3a2e);
        border-radius: 10px;
        color: white;
    }
    
    .summary-value {
        font-size: 2rem;
        font-weight: bold;
    }
    
    .summary-label {
        font-size: 0.9rem;
        margin-top: 0.5rem;
    }
    
    .top-section {
        margin-bottom: 1.5rem;
    }
    
    .top-section h6 {
        color: #4a7c59;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #f0f4f1;
    }
    
    .top-user-item {
        display: flex;
        align-items: center;
        padding: 0.75rem;
        margin-bottom: 0.5rem;
        background: #f8f9fa;
        border-radius: 8px;
    }
    
    .position {
        font-size: 1.2rem;
        font-weight: bold;
        color: #4a7c59;
        width: 40px;
        text-align: center;
    }
    
    .user-info {
        flex: 1;
        margin-left: 1rem;
    }
    
    .rating {
        font-weight: bold;
        color: #ffc107;
    }
    
    .reporte-resultado {
        padding: 1rem;
    }
    
    .reporte-preview {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
        max-height: 400px;
        overflow-y: auto;
    }
    
    .reporte-preview pre {
        margin: 0;
        font-family: 'Courier New', monospace;
        font-size: 0.85rem;
    }
    
    .reporte-actions {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
        justify-content: center;
    }
    
    .estado-change-form {
        padding: 1rem;
    }
    
    .estado-options button {
        transition: transform 0.2s;
    }
    
    .estado-options button:hover {
        transform: translateY(-2px);
    }
    
    @media (max-width: 768px) {
        .stats-grid,
        .reportes-grid {
            grid-template-columns: 1fr;
        }
        
        .stat-details {
            grid-template-columns: 1fr;
        }
        
        .info-grid {
            grid-template-columns: 1fr;
        }
    }
`;

// Inyectar estilos adicionales
if (!document.getElementById('admin-extra-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'admin-extra-styles';
    styleSheet.textContent = additionalStyles;
    document.head.appendChild(styleSheet);
}

// ================================================================
// INTEGRAR CON EL SISTEMA DE NAVEGACIÓN EXISTENTE
// ================================================================

// Modificar la función showSection existente para incluir las nuevas secciones
const originalShowSection = window.showSection;
window.showSection = async function(sectionName) {
    // Llamar a la función original
    if (originalShowSection) {
        await originalShowSection(sectionName);
    }
    
    // Cargar datos específicos según la sección
    switch(sectionName) {
        case 'publicaciones':
            await loadPublicaciones();
            break;
        case 'estadisticas':
            await loadEstadisticas();
            break;
        case 'reportes':
            await loadReportes();
            break;
    }
};

// ================================================================
// FUNCIONES AUXILIARES ADICIONALES
// ================================================================

function descargarReporte(reporte) {
    try {
        // Convertir datos a formato CSV
        const csv = convertToCSV(reporte.datos);
        
        // Crear blob y descargar
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `reporte_${reporte.tipo}_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Reporte descargado correctamente', 'success');
        
    } catch (error) {
        console.error('Error descargando reporte:', error);
        showNotification('Error descargando reporte', 'error');
    }
}

function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    // Si es un objeto con resumen, convertir el resumen
    if (data.resumen) {
        data = data.detalles_mensuales || [];
    }
    
    // Obtener headers
    const headers = Object.keys(data[0]);
    
    // Crear filas CSV
    const csvRows = [
        headers.join(','), // Header row
        ...data.map(row => 
            headers.map(header => {
                const value = row[header];
                // Escapar comillas y valores con comas
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ];
    
    return csvRows.join('\n');
}

function renderChartOfertasPorMes(data) {
    const canvas = document.getElementById('chartOfertasMes');
    if (!canvas || !data || data.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    const labels = data.map(d => d.mes);
    const abiertas = data.map(d => d.abiertas);
    const cerradas = data.map(d => d.cerradas);
    
    if (typeof Chart !== 'undefined') {
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Abiertas',
                        data: abiertas,
                        backgroundColor: 'rgba(40, 167, 69, 0.7)',
                        borderColor: '#28a745',
                        borderWidth: 1
                    },
                    {
                        label: 'Cerradas',
                        data: cerradas,
                        backgroundColor: 'rgba(108, 117, 125, 0.7)',
                        borderColor: '#6c757d',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Ofertas Publicadas por Mes'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

function renderChartDistribucionPagos(data) {
    const canvas = document.getElementById('chartDistribucionPagos');
    if (!canvas || !data || data.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    const labels = data.map(d => d.rango);
    const totales = data.map(d => d.total);
    
    if (typeof Chart !== 'undefined') {
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: totales,
                    backgroundColor: [
                        'rgba(255, 193, 7, 0.7)',
                        'rgba(40, 167, 69, 0.7)',
                        'rgba(23, 162, 184, 0.7)'
                    ],
                    borderColor: [
                        '#ffc107',
                        '#28a745',
                        '#17a2b8'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Distribución de Pagos por Rango'
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

// ================================================================
// FILTROS PARA PUBLICACIONES
// ================================================================

function applyPublicacionesFilters() {
    loadPublicaciones();
}

function clearPublicacionesFilters() {
    const filters = ['pubEstadoFilter', 'pubAgricultorFilter', 'pubFechaDesde', 'pubFechaHasta'];
    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) element.value = '';
    });
    loadPublicaciones();
}

// ================================================================
// ACTUALIZACIÓN AUTOMÁTICA DE MÉTRICAS
// ================================================================

async function actualizarMetricasTiempoReal() {
    try {
        const response = await fetch('/api/admin/metricas-tiempo-real');
        const data = await response.json();
        
        if (data.success) {
            // Actualizar badges o indicadores en tiempo real
            const metricas = data.metricas;
            
            // Actualizar elementos del DOM si existen
            updateElement('metricaUsuariosActivos', metricas.usuarios_activos);
            updateElement('metricaOfertasAbiertas', metricas.ofertas_abiertas);
            updateElement('metricaPostulacionesPendientes', metricas.postulaciones_pendientes);
            updateElement('metricaContratosActivos', metricas.contratos_activos);
            
            console.log('✅ Métricas actualizadas:', data.timestamp);
        }
        
    } catch (error) {
        console.error('Error actualizando métricas:', error);
    }
}

function updateElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value.toLocaleString();
    }
}

// Actualizar métricas cada 30 segundos
setInterval(actualizarMetricasTiempoReal, 30000);

// ================================================================
// INICIALIZACIÓN
// ================================================================

// Ejecutar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Módulos de Publicaciones, Estadísticas y Reportes cargados');
    
    // Agregar event listeners para filtros si existen
    const pubEstadoFilter = document.getElementById('pubEstadoFilter');
    if (pubEstadoFilter) {
        pubEstadoFilter.addEventListener('change', applyPublicacionesFilters);
    }
    
    const pubAgricultorFilter = document.getElementById('pubAgricultorFilter');
    if (pubAgricultorFilter) {
        let timeout;
        pubAgricultorFilter.addEventListener('input', function() {
            clearTimeout(timeout);
            timeout = setTimeout(applyPublicacionesFilters, 500);
        });
    }
    
    // Iniciar actualización de métricas
    actualizarMetricasTiempoReal();
});

console.log('✅ JavaScript del panel de administrador (Publicaciones, Estadísticas y Reportes) cargado correctamente');
console.log('📋 Funcionalidades disponibles:');
console.log('   • Gestión completa de publicaciones');
console.log('   • Estadísticas detalladas con gráficos');
console.log('   • Generación de reportes personalizados');
console.log('   • Exportación de datos en múltiples formatos');
console.log('   • Métricas en tiempo real');
console.log('   • Análisis de rendimiento del sistema');