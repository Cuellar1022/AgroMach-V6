// Variables globales
let postulacionesData = [];
let currentPage = 1;
const itemsPerPage = 6;
let filteredData = [];
let userData = null;
let refreshInterval;

// Función para cargar datos del usuario
async function loadUserData() {
    try {
        const response = await fetch('/get_user_session');
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
                userData = data.user;
                console.log('Usuario cargado:', userData);
            }
        }
    } catch (error) {
        console.error('Error cargando datos del usuario:', error);
    }
}

// Función para cargar postulaciones desde el servidor
async function loadPostulacionesFromServer() {
    try {
        showLoadingState();
        const response = await fetch('/api/postulaciones');
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                postulacionesData = data.postulaciones || [];
                console.log('Postulaciones cargadas:', postulacionesData.length);
                console.log('Favoritos encontrados:', postulacionesData.filter(p => p.estado === 'Favorito').length);
                showToast('success', 'Actualizado', 'Postulaciones cargadas correctamente');
            } else {
                postulacionesData = [];
                showToast('error', 'Error', data.error || 'Error al cargar postulaciones');
            }
        } else {
            throw new Error(`Error del servidor: ${response.status}`);
        }
    } catch (error) {
        console.error('Error cargando postulaciones:', error);
        postulacionesData = [];
        showToast('error', 'Error de Conexión', 'No se pudieron cargar las postulaciones');
    }
    
    filteredData = [...postulacionesData];
    renderPostulaciones();
    updateTabCounts();
    hideLoadingState();
}

function showLoadingState() {
    const container = document.getElementById('postulacionesList');
    container.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Cargando postulaciones...</p>
        </div>
    `;
}

function hideLoadingState() {
    // Se oculta automáticamente cuando se renderiza el contenido
}

// Función para renderizar postulaciones
function renderPostulaciones() {
    const container = document.getElementById('postulacionesList');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);

    if (pageData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-paper-plane"></i>
                <h3>No se encontraron postulaciones</h3>
                <p>No hay postulaciones que coincidan con los filtros seleccionados.</p>
                ${postulacionesData.length === 0 ? '<p><small>Es posible que aún no hayas postulado a ningún trabajo.</small></p>' : ''}
            </div>
        `;
        updatePagination();
        return;
    }

    container.innerHTML = pageData.map(postulacion => `
        <div class="postulacion-card" data-id="${postulacion.id}" data-estado="${postulacion.estado}">
            ${postulacion.estado === 'Aceptada' && isRecent(postulacion.ultimaActualizacion) ? 
                '<div class="notificacion-badge">NUEVO</div>' : ''}
            
            ${postulacion.estado === 'Favorito' ? 
                '<div class="notificacion-badge" style="background: linear-gradient(135deg, #E91E63, #C2185B);"><i class="fas fa-heart"></i> FAVORITO</div>' : ''}
            
            <div class="postulacion-header">
                <div>
                    <div class="postulacion-title">${postulacion.titulo}</div>
                    <div class="agricultor-info">
                        <i class="fas fa-seedling"></i>
                        ${postulacion.agricultor}
                    </div>
                </div>
                <div class="postulacion-status status-${postulacion.estado.toLowerCase()}">
                    ${getStatusIcon(postulacion.estado)}
                    ${postulacion.estado}
                </div>
            </div>

            <div class="postulacion-details">
                <div class="detail-item">
                    <i class="fas fa-calendar-plus"></i>
                    <span>Postulado: ${formatDate(postulacion.fechaPostulacion)}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-dollar-sign"></i>
                    <span>${formatCurrency(postulacion.pago)}/día</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${postulacion.ubicacion}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span>${postulacion.duracion}</span>
                </div>
            </div>

            <div class="postulacion-timeline">
                ${generateTimeline(postulacion)}
            </div>

            <div class="postulacion-footer">
                <div class="postulacion-actions">
                    <button class="action-btn" onclick="showPostulacionDetails(${postulacion.id})">
                        <i class="fas fa-eye"></i> Ver Detalles
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    updatePagination();
    addCardAnimations();
}

function getStatusIcon(estado) {
    const icons = {
        'Pendiente': '<i class="fas fa-hourglass-half"></i>',
        'Aceptada': '<i class="fas fa-check-circle"></i>',
        'Rechazada': '<i class="fas fa-times-circle"></i>',
        'Finalizada': '<i class="fas fa-flag-checkered"></i>',
        'Favorito': '<i class="fas fa-heart"></i>'
    };
    return icons[estado] || '<i class="fas fa-question-circle"></i>';
}

function generateTimeline(postulacion) {
    const items = [];
    items.push(`
        <div class="timeline-item">
            <i class="fas fa-paper-plane"></i>
            <span>Postulación enviada - ${formatDateTime(postulacion.fechaPostulacion)}</span>
        </div>
    `);
    return items.join('');
}

function isRecent(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now - date) / (1000 * 60 * 60);
    return diffHours < 24;
}

function formatDate(dateString) {
    if (!dateString) return 'Fecha no disponible';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}

function formatDateTime(dateString) {
    if (!dateString) return 'Fecha no disponible';
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}

function formatCurrency(amount) {
    if (!amount) return '$0';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
}

function showPostulacionDetails(postulacionId) {
    const postulacion = postulacionesData.find(p => p.id === postulacionId);
    if (!postulacion) return;
    console.log('Mostrando detalles de:', postulacion);
}

function filterByStatus(status) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (status === '') {
        filteredData = [...postulacionesData];
    } else {
        filteredData = postulacionesData.filter(p => p.estado === status);
    }

    console.log(`Filtrando por: ${status || 'Todas'}, encontradas: ${filteredData.length}`);
    currentPage = 1;
    renderPostulaciones();
}

function setupSearch() {
    const searchInput = document.getElementById('searchPostulaciones');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            filteredData = postulacionesData.filter(postulacion => 
                postulacion.titulo.toLowerCase().includes(searchTerm) ||
                postulacion.agricultor.toLowerCase().includes(searchTerm) ||
                postulacion.ubicacion.toLowerCase().includes(searchTerm)
            );
            currentPage = 1;
            renderPostulaciones();
        });
    }
}

function updateTabCounts() {
    const pendientes = postulacionesData.filter(p => p.estado === 'Pendiente').length;
    const aceptadas = postulacionesData.filter(p => p.estado === 'Aceptada').length;
    const rechazadas = postulacionesData.filter(p => p.estado === 'Rechazada').length;
    const finalizadas = postulacionesData.filter(p => p.estado === 'Finalizada').length;
    const favoritos = postulacionesData.filter(p => p.estado === 'Favorito').length;
    const total = postulacionesData.length;

    const tabs = document.querySelectorAll('.tab-btn');
    if (tabs.length >= 6) {
        tabs[0].innerHTML = `<i class="fas fa-list"></i> Todas (${total})`;
        tabs[1].innerHTML = `<i class="fas fa-hourglass-half"></i> Pendientes (${pendientes})`;
        tabs[2].innerHTML = `<i class="fas fa-check-circle"></i> Aceptadas (${aceptadas})`;
        tabs[3].innerHTML = `<i class="fas fa-times-circle"></i> Rechazadas (${rechazadas})`;
        tabs[4].innerHTML = `<i class="fas fa-flag-checkered"></i> Finalizadas (${finalizadas})`;
        tabs[5].innerHTML = `<i class="fas fa-heart"></i> Favoritos (${favoritos})`;
    }
}

function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginationInfo = document.querySelector('.pagination-info');
    if (paginationInfo) {
        paginationInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
    }
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderPostulaciones();
        window.scrollTo(0, 0);
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderPostulaciones();
        window.scrollTo(0, 0);
    }
}

function refreshPostulaciones() {
    loadPostulacionesFromServer();
}

function showToast(type, title, message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-header">
            <i class="fas fa-check-circle toast-icon"></i>
            <span class="toast-title">${title}</span>
        </div>
        <div class="toast-message">${message}</div>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => container.removeChild(toast), 300);
    }, 3000);
}

function addCardAnimations() {
    const cards = document.querySelectorAll('.postulacion-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

function closeModal() {
    const modal = document.getElementById('detalleModal');
    if (modal) modal.classList.remove('show');
}

function goBack() {
    window.location.href = 'index-trabajador.html';
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando página de postulaciones...');
    loadUserData();
    loadPostulacionesFromServer();
    setupSearch();
});

function showPostulacionDetails(postulacionId) {
    const postulacion = postulacionesData.find(p => p.id === postulacionId);
    if (!postulacion) {
        showToast('error', 'Error', 'No se encontró la postulación');
        return;
    }
    
    console.log('Mostrando detalles de:', postulacion);
    
    const modal = document.getElementById('detalleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    // Actualizar título del modal
    modalTitle.innerHTML = `
        <i class="fas fa-file-alt"></i> ${postulacion.titulo}
    `;
    
    // Crear contenido del modal
    modalBody.innerHTML = `
        <div class="modal-detail-section">
            <div class="modal-status-badge status-${postulacion.estado.toLowerCase()}">
                ${getStatusIcon(postulacion.estado)}
                Estado: ${postulacion.estado}
            </div>
        </div>

        <div class="modal-detail-section">
            <h4><i class="fas fa-seedling"></i> Información del Agricultor</h4>
            <p><strong>Nombre:</strong> ${postulacion.agricultor}</p>
            <p><strong>Ubicación:</strong> ${postulacion.ubicacion}</p>
        </div>

        <div class="modal-detail-section">
            <h4><i class="fas fa-briefcase"></i> Detalles del Trabajo</h4>
            <p><strong>Duración:</strong> ${postulacion.duracion}</p>
            <p><strong>Pago:</strong> ${formatCurrency(postulacion.pago)} por día</p>
            <p><strong>Descripción:</strong> ${postulacion.descripcion || 'No disponible'}</p>
        </div>

        <div class="modal-detail-section">
            <h4><i class="fas fa-calendar"></i> Fechas Importantes</h4>
            <p><strong>Fecha de postulación:</strong> ${formatDateTime(postulacion.fechaPostulacion)}</p>
            ${postulacion.ultimaActualizacion ? `<p><strong>Última actualización:</strong> ${formatDateTime(postulacion.ultimaActualizacion)}</p>` : ''}
            ${postulacion.fechaInicio ? `<p><strong>Fecha de inicio:</strong> ${formatDate(postulacion.fechaInicio)}</p>` : ''}
            ${postulacion.fechaFin ? `<p><strong>Fecha de fin:</strong> ${formatDate(postulacion.fechaFin)}</p>` : ''}
        </div>

        ${postulacion.comentarios ? `
            <div class="modal-detail-section">
                <h4><i class="fas fa-comment"></i> Comentarios del Agricultor</h4>
                <p>${postulacion.comentarios}</p>
            </div>
        ` : ''}

        <div class="modal-detail-section">
            <h4><i class="fas fa-timeline"></i> Historial</h4>
            ${generateDetailedTimeline(postulacion)}
        </div>

        <div class="modal-actions">
            ${postulacion.estado === 'Pendiente' ? `
                <button class="btn btn-danger" onclick="cancelarPostulacion(${postulacion.id})">
                    <i class="fas fa-times"></i> Cancelar Postulación
                </button>
            ` : ''}
            ${postulacion.estado === 'Aceptada' ? `
                <button class="btn btn-success" onclick="contactarAgricultor(${postulacion.id})">
                    <i class="fas fa-phone"></i> Contactar Agricultor
                </button>
            ` : ''}
            ${postulacion.estado !== 'Favorito' ? `
                <button class="btn btn-secondary" onclick="marcarComoFavorito(${postulacion.id})">
                    <i class="fas fa-heart"></i> Marcar como Favorito
                </button>
            ` : ''}
            <button class="btn btn-secondary" onclick="closeModal()">
                <i class="fas fa-times"></i> Cerrar
            </button>
        </div>
    `;
    
    // Mostrar modal
    modal.classList.add('show');
}

// Función auxiliar para generar timeline detallado
function generateDetailedTimeline(postulacion) {
    let timeline = `
        <div class="timeline-detailed">
            <div class="timeline-item-detailed">
                <div class="timeline-icon"><i class="fas fa-paper-plane"></i></div>
                <div class="timeline-content">
                    <strong>Postulación enviada</strong>
                    <p>${formatDateTime(postulacion.fechaPostulacion)}</p>
                </div>
            </div>
    `;
    
    if (postulacion.estado === 'Aceptada') {
        timeline += `
            <div class="timeline-item-detailed">
                <div class="timeline-icon success"><i class="fas fa-check-circle"></i></div>
                <div class="timeline-content">
                    <strong>Postulación aceptada</strong>
                    <p>${postulacion.ultimaActualizacion ? formatDateTime(postulacion.ultimaActualizacion) : 'Fecha no disponible'}</p>
                </div>
            </div>
        `;
    } else if (postulacion.estado === 'Rechazada') {
        timeline += `
            <div class="timeline-item-detailed">
                <div class="timeline-icon danger"><i class="fas fa-times-circle"></i></div>
                <div class="timeline-content">
                    <strong>Postulación rechazada</strong>
                    <p>${postulacion.ultimaActualizacion ? formatDateTime(postulacion.ultimaActualizacion) : 'Fecha no disponible'}</p>
                </div>
            </div>
        `;
    } else if (postulacion.estado === 'Finalizada') {
        timeline += `
            <div class="timeline-item-detailed">
                <div class="timeline-icon success"><i class="fas fa-flag-checkered"></i></div>
                <div class="timeline-content">
                    <strong>Trabajo finalizado</strong>
                    <p>${postulacion.fechaFin ? formatDate(postulacion.fechaFin) : 'Fecha no disponible'}</p>
                </div>
            </div>
        `;
    }
    
    timeline += '</div>';
    return timeline;
}

// Funciones adicionales para acciones del modal
function cancelarPostulacion(postulacionId) {
    if (confirm('¿Estás seguro de que deseas cancelar esta postulación?')) {
        // Aquí harías la llamada al servidor
        showToast('success', 'Cancelado', 'Postulación cancelada correctamente');
        closeModal();
        // Recargar postulaciones
        loadPostulacionesFromServer();
    }
}

function contactarAgricultor(postulacionId) {
    const postulacion = postulacionesData.find(p => p.id === postulacionId);
    if (postulacion) {
        showToast('info', 'Contacto', 'Función de contacto en desarrollo');
        // Aquí implementarías la lógica de contacto
    }
}

function marcarComoFavorito(postulacionId) {
    // Aquí harías la llamada al servidor para marcar como favorito
    showToast('success', 'Favorito', 'Postulación marcada como favorita');
    loadPostulacionesFromServer();
}

// Cerrar modal al hacer clic fuera de él
document.addEventListener('click', function(event) {
    const modal = document.getElementById('detalleModal');
    if (event.target === modal) {
        closeModal();
    }
});