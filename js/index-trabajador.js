// ===================================================================
// VARIABLES GLOBALES
// ===================================================================
let appliedJobs = [];
let favoriteJobs = [];
let userData = null;
let currentUser = null;
let map = null;
let favoritosCache = new Set();
let selectedJobId = null;
let ofertasDisponibles = [];
let favoritos = [];

// ===================================================================
// VERIFICACIÓN DE SESIÓN Y PREVENCIÓN DE CACHÉ
// ===================================================================
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
        verificarSesionActiva();
    }
});

// Prevenir caché del navegador
if (window.performance && window.performance.navigation.type === 2) {
    window.location.reload(true);
}

// Verificar sesión cada 5 minutos
setInterval(verificarSesionActiva, 5 * 60 * 1000); 

// ===================================================================
// FUNCIONES DE CARGA DE DATOS DE USUARIO
// ===================================================================
async function loadUserData() {
    try {
        console.log('Cargando datos del usuario...');
        
        const response = await fetch('/get_user_session');
        
        if (!response.ok) {
            if (response.status === 401) {
                console.log('No hay sesión activa, redirigiendo al login');
                window.location.href = '/vista/login-trabajador.html';
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Datos recibidos:', data);
        
        if (data.success && data.user) {
            userData = data.user;
            currentUser = data.user;
            updateUIWithUserData(userData);
            loadUserProfilePhoto();
        } else {
            throw new Error(data.error || 'No se pudieron cargar los datos del usuario');
        }
        
    } catch (error) {
        console.error('Error cargando datos del usuario:', error);
        showErrorMessage('Error al cargar los datos del usuario. Intenta recargar la página.');
        setTimeout(() => showDefaultUserData(), 2000);
    }
}

function updateUIWithUserData(user) {
    console.log('Actualizando UI con datos del usuario:', user);
    
    const profileNameEl = document.getElementById('profileName');
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    const displayName = fullName || user.username || 'Usuario';
    
    if (profileNameEl) {
        profileNameEl.textContent = displayName;
        profileNameEl.classList.remove('skeleton', 'skeleton-text');
        profileNameEl.style.opacity = '0';
        setTimeout(() => {
            profileNameEl.style.transition = 'opacity 0.5s ease';
            profileNameEl.style.opacity = '1';
        }, 100);
    }
    
    const profileAvatarEl = document.getElementById('profileAvatar');
    if (profileAvatarEl) {
        const initials = getInitials(user.first_name, user.last_name);
        profileAvatarEl.innerHTML = `<span style="font-size: 24px; font-weight: bold;">${initials}</span>`;
        profileAvatarEl.classList.remove('skeleton', 'skeleton-circle');
        profileAvatarEl.style.opacity = '0';
        setTimeout(() => {
            profileAvatarEl.style.transition = 'opacity 0.5s ease';
            profileAvatarEl.style.opacity = '1';
        }, 100);
    }
    
    updateDropdownData(user, displayName, getInitials(user.first_name, user.last_name));
}

function updateDropdownData(user, displayName, initials) {
    const dropdownName = document.getElementById('dropdownName');
    if (dropdownName) {
        dropdownName.textContent = displayName;
    }
    
    const dropdownAvatar = document.getElementById('dropdownAvatar');
    if (dropdownAvatar) {
        dropdownAvatar.innerHTML = `<span style="font-size: 24px; font-weight: bold;">${initials}</span>`;
    }
}

function getInitials(firstName, lastName) {
    let initials = '';
    
    if (firstName && firstName.trim()) {
        initials += firstName.trim().charAt(0).toUpperCase();
    }
    
    if (lastName && lastName.trim()) {
        initials += lastName.trim().charAt(0).toUpperCase();
    }
    
    return initials || 'U';
}

function showDefaultUserData() {
    const profileNameEl = document.getElementById('profileName');
    const profileAvatarEl = document.getElementById('profileAvatar');
    const dropdownName = document.getElementById('dropdownName');
    const dropdownAvatar = document.getElementById('dropdownAvatar');
    
    if (profileNameEl) {
        profileNameEl.textContent = 'Usuario';
        profileNameEl.classList.remove('skeleton', 'skeleton-text');
    }
    
    if (profileAvatarEl) {
        profileAvatarEl.innerHTML = '<i class="fas fa-user"></i>';
        profileAvatarEl.classList.remove('skeleton', 'skeleton-circle');
    }
    
    if (dropdownName) dropdownName.textContent = 'Usuario';
    if (dropdownAvatar) dropdownAvatar.innerHTML = '<i class="fas fa-user"></i>';
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(errorDiv, container.firstChild);
        setTimeout(() => errorDiv.remove(), 5000);
    }
}

function loadUserProfilePhoto() {
    console.log('Cargando foto de perfil...');
    fetch('/get_user_session')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.user) {
                const photoUrl = data.user.url_foto;
                console.log('URL de foto recibida:', photoUrl);
                
                const profilePhotoElements = document.querySelectorAll('.profile-photo, #profilePhoto, .user-avatar, .profile-image, #profileAvatar, #dropdownAvatar, #profileMenuBtn');
                
                profilePhotoElements.forEach(element => {
                    if (photoUrl && photoUrl !== '' && photoUrl !== null) {
                        element.style.backgroundImage = `url('${photoUrl}')`;
                        element.style.backgroundSize = 'cover';
                        element.style.backgroundPosition = 'center';
                        element.style.borderRadius = '50%';
                        element.innerHTML = '';
                        console.log('Foto aplicada a elemento:', element.id || element.className);
                    } else {
                        element.innerHTML = '<i class="fas fa-user"></i>';
                        element.style.backgroundImage = 'none';
                    }
                });
            }
        })
        .catch(error => {
            console.error('Error cargando foto de perfil:', error);
        });
}

// ===================================================================
// FUNCIONES DE FAVORITOS - CORREGIDAS
// ===================================================================
async function cargarFavoritos() {
    try {
        console.log('Cargando favoritos...');
        const response = await fetch('/api/get_favorites', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            favoritosCache.clear();
            data.favoritos.forEach(fav => {
                favoritosCache.add(fav.id_oferta);
            });
            
            console.log(`Favoritos cargados: ${favoritosCache.size} trabajos`);
            actualizarIconosFavoritos();
        }
    } catch (error) {
        console.error('Error cargando favoritos:', error);
    }
}

function actualizarIconosFavoritos() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        const jobId = parseInt(btn.getAttribute('data-job-id'));
        const icon = btn.querySelector('i');
        
        if (favoritosCache.has(jobId)) {
            icon.classList.remove('far');
            icon.classList.add('fas');
            icon.style.color = '#e74c3c';
            btn.classList.add('active');
        } else {
            icon.classList.remove('fas');
            icon.classList.add('far');
            icon.style.color = '';
            btn.classList.remove('active');
        }
    });
}

async function toggleFavorite(button, jobId) {
    console.log('toggleFavorite llamado con:', jobId);
    
    // VALIDACIÓN CRÍTICA
    if (!jobId || isNaN(jobId)) {
        console.error('ID inválido recibido:', jobId);
        return; // Salir silenciosamente
    }
    
    const icon = button.querySelector('i');
    const isFavorite = favoritosCache.has(jobId);
    const action = isFavorite ? 'remove' : 'add';
    
    // Animación del botón
    button.classList.add('animating');
    setTimeout(() => button.classList.remove('animating'), 400);
    
    try {
        console.log('Enviando petición:', { job_id: jobId, action: action });
        
        const response = await fetch('/api/toggle_favorite', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                job_id: jobId,
                action: action
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Respuesta del servidor:', data);
        
        if (data.success) {
            if (data.is_favorite) {
                // Agregar a favoritos
                icon.classList.remove('far');
                icon.classList.add('fas');
                icon.style.color = '#e74c3c';
                button.classList.add('active');
                favoritosCache.add(jobId);
                console.log('✅ Agregado a favoritos');
            } else {
                // Remover de favoritos
                icon.classList.remove('fas');
                icon.classList.add('far');
                icon.style.color = '';
                button.classList.remove('active');
                favoritosCache.delete(jobId);
                console.log('✅ Removido de favoritos');
            }
        } else {
            console.warn('⚠️ Operación no exitosa:', data.message);
        }
        
    } catch (error) {
        console.error('❌ Error completo:', error);
        // NO mostrar mensaje visual al usuario, solo loguear
        
        // Revertir cambio visual si hubo error
        if (action === 'add') {
            icon.classList.remove('fas');
            icon.classList.add('far');
            icon.style.color = '';
            button.classList.remove('active');
        } else {
            icon.classList.remove('far');
            icon.classList.add('fas');
            icon.style.color = '#e74c3c';
            button.classList.add('active');
        }
    }
}

// ===================================================================
// FUNCIONES DE TRABAJOS
// ===================================================================
function loadAvailableJobs() {
    console.log('Cargando trabajos disponibles...');
    fetch('/api/get_jobs')
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            ofertasDisponibles = data.jobs;
            displayJobs(data.jobs);
            updateJobsCount(data.jobs.length);
            console.log('Ofertas cargadas:', data.jobs.length);
        } else {
            showNoJobsMessage();
        }
    })
    .catch(error => {
        console.error('Error al cargar trabajos:', error);
        showNoJobsMessage();
    });
}

function displayJobs(jobs) {
    const jobsList = document.getElementById('jobsList');
    const noJobsMessage = document.getElementById('noJobsMessage');
    
    if (jobs.length === 0) {
        showNoJobsMessage();
        return;
    }
    
    if (jobsList) {
        jobsList.innerHTML = '';
    }
    if (noJobsMessage) {
        noJobsMessage.style.display = 'none';
    }
    
    jobs.forEach(job => {
        const jobCard = createJobCard(job);
        if (jobsList) {
            jobsList.appendChild(jobCard);
        }
    });
    
    // Cargar favoritos después de crear las tarjetas
    setTimeout(() => cargarFavoritos(), 500);
}

function createJobCard(job) {
    console.log('Creando tarjeta para job:', job.id_oferta);
    
    const div = document.createElement('div');
    div.className = 'job-card';
    div.setAttribute('data-job-id', job.id_oferta);
    
    const isFavorite = favoritosCache.has(job.id_oferta);
    const heartClass = isFavorite ? 'fas' : 'far';
    const heartColor = isFavorite ? 'style="color: #e74c3c;"' : '';
    const activeClass = isFavorite ? 'active' : '';
    
    const tituloEscapado = (job.titulo || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    
    div.innerHTML = `
        <div class="job-header">
            <div class="job-title">${job.titulo}</div>
            <div class="job-salary">$${Number(job.pago_ofrecido).toLocaleString()}/día</div>
        </div>
        <div class="job-details">
            ${job.descripcion}
        </div>
        <div class="job-location">
            <i class="fas fa-user"></i>
            ${job.nombre_agricultor} • Publicado: ${formatDate(job.fecha_publicacion)}
        </div>
        <div class="job-footer">
            <div class="job-tags">
                <span class="job-tag">${job.estado}</span>
            </div>
            <div class="job-actions">
                <button class="favorite-btn ${activeClass}" data-job-id="${job.id_oferta}" type="button">
                    <i class="${heartClass} fa-heart" ${heartColor}></i>
                </button>
                <button class="apply-btn" data-job-id="${job.id_oferta}" type="button">
                    <i class="fas fa-paper-plane"></i> Postularme
                </button>
            </div>
        </div>
    `;
    
    // IMPORTANTE: Event listeners después de insertar HTML
    setTimeout(() => {
        const favoriteBtn = div.querySelector('.favorite-btn');
        const applyBtn = div.querySelector('.apply-btn');
        
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const jobId = parseInt(this.getAttribute('data-job-id'));
                console.log('Click en favorito, ID:', jobId);
                
                if (!jobId || isNaN(jobId)) {
                    console.error('ID de trabajo inválido:', jobId);
                    showMessage('Error: ID de trabajo no válido', 'error');
                    return;
                }
                
                toggleFavorite(this, jobId);
            });
        }
        
        if (applyBtn) {
            applyBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const jobId = parseInt(this.getAttribute('data-job-id'));
                showApplyModal(jobId, job.titulo);
            });
        }
    }, 100);
    
    return div;
}

function showApplyModal(jobId, jobTitle) {
    selectedJobId = jobId;
    const jobDetails = document.getElementById('jobDetailsForApplication');
    if (jobDetails) {
        jobDetails.innerHTML = `<strong>Trabajo:</strong> ${jobTitle}`;
    }
    
    const modal = document.getElementById('applyJobModal');
    const overlay = document.getElementById('overlay');
    
    if (modal) modal.style.display = 'flex';
    if (overlay) overlay.style.display = 'block';
}

function closeApplyModal() {
    const modal = document.getElementById('applyJobModal');
    const overlay = document.getElementById('overlay');
    
    if (modal) modal.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    
    selectedJobId = null;
    
    const btnConfirm = document.getElementById('confirmApplyBtn');
    if (btnConfirm) {
        btnConfirm.innerHTML = '<i class="fas fa-paper-plane"></i> Confirmar Postulación';
        btnConfirm.disabled = false;
        btnConfirm.style.background = '';
    }
}

function confirmApplication() {
    if (!selectedJobId) return;
    
    const btnConfirm = document.getElementById('confirmApplyBtn');
    const originalText = btnConfirm.innerHTML;
    
    btnConfirm.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    btnConfirm.disabled = true;
    
    fetch('/api/apply_job', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            job_id: selectedJobId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            btnConfirm.innerHTML = '<i class="fas fa-check"></i> ¡Enviado!';
            btnConfirm.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
            
            showToast('success', 'Postulación enviada', 'Tu postulación ha sido enviada exitosamente');
            
            setTimeout(() => {
                closeApplyModal();
                loadAvailableJobs();
                loadStats();
            }, 1500);
            
        } else {
            throw new Error(data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('error', 'Error', error.message || 'Error de conexión. Intenta de nuevo.');
        
        btnConfirm.innerHTML = originalText;
        btnConfirm.disabled = false;
        btnConfirm.style.background = '';
    });
}

function loadMyJobs() {
    fetch('/api/get_my_jobs')
    .then(response => response.json())
    .then(data => {
        if (data.success && data.jobs.length > 0) {
            displayMyJobs(data.jobs);
        } else {
            const noMyJobsMessage = document.getElementById('noMyJobsMessage');
            if (noMyJobsMessage) {
                noMyJobsMessage.style.display = 'block';
            }
        }
    })
    .catch(error => {
        console.error('Error al cargar mis trabajos:', error);
    });
}

function displayMyJobs(jobs) {
    const myJobsList = document.getElementById('myJobsList');
    const noMyJobsMessage = document.getElementById('noMyJobsMessage');
    
    if (!myJobsList) return;
    
    myJobsList.innerHTML = '';
    if (noMyJobsMessage) noMyJobsMessage.style.display = 'none';
    
    jobs.forEach(job => {
        const jobCard = createMyJobCard(job);
        myJobsList.appendChild(jobCard);
    });
}

function createMyJobCard(job) {
    const div = document.createElement('div');
    div.className = 'job-card my-job-card';
    
    let statusClass = '';
    let statusText = '';
    
    switch(job.estado) {
        case 'Pendiente':
            statusClass = 'status-pending';
            statusText = 'Pendiente';
            break;
        case 'Aceptada':
            statusClass = 'status-confirmed';
            statusText = 'Confirmado';
            break;
        case 'Rechazada':
            statusClass = 'status-rejected';
            statusText = 'Rechazado';
            break;
        case 'Favorito':
            statusClass = 'status-favorite';
            statusText = 'Favorito';
            break;
    }
    
    let descripcionCorta = job.descripcion;
    if (descripcionCorta && descripcionCorta.length > 150) {
        descripcionCorta = descripcionCorta.substring(0, 150) + '...';
    }
    
    div.innerHTML = `
        <div class="job-header">
            <div class="job-title">${job.titulo}</div>
            <div class="job-status ${statusClass}">${statusText}</div>
        </div>
        <div class="job-details">
            ${descripcionCorta}
        </div>
        <div class="job-location">
            <i class="fas fa-user"></i>
            ${job.nombre_agricultor} • Postulado: ${formatDate(job.fecha_postulacion)}
        </div>
    `;
    
    return div;
}

function loadStats() {
    fetch('/api/get_worker_stats')
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const applicationsCount = document.getElementById('applicationsCount');
            const activeJobsCount = document.getElementById('activeJobsCount');
            const totalJobs = document.getElementById('totalJobs');
            const totalHours = document.getElementById('totalHours');
            
            if (applicationsCount) applicationsCount.textContent = data.applications || 0;
            if (activeJobsCount) activeJobsCount.textContent = data.active_jobs || 0;
            if (totalJobs) totalJobs.textContent = data.total_jobs || 0;
            if (totalHours) totalHours.textContent = (data.total_hours || 0) + 'h';
        }
    })
    .catch(error => {
        console.error('Error al cargar estadísticas:', error);
    });
}

function showNoJobsMessage() {
    const jobsList = document.getElementById('jobsList');
    const noJobsMessage = document.getElementById('noJobsMessage');
    
    if (jobsList) jobsList.innerHTML = '';
    if (noJobsMessage) noJobsMessage.style.display = 'block';
}

function updateJobsCount(count) {
    const jobsNearCount = document.getElementById('jobsNearCount');
    if (jobsNearCount) jobsNearCount.textContent = count;
}

function formatDate(dateString) {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
}

// ===================================================================
// FUNCIONES DE FILTRADO Y BÚSQUEDA
// ===================================================================
function filterJobs(searchTerm) {
    const jobCards = document.querySelectorAll('#jobsList .job-card');
    const searchLower = searchTerm.toLowerCase();
    
    jobCards.forEach(card => {
        const title = card.querySelector('.job-title')?.textContent.toLowerCase() || '';
        const details = card.querySelector('.job-details')?.textContent.toLowerCase() || '';
        
        if (title.includes(searchLower) || details.includes(searchLower)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function filterByType(button, type) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    button.classList.add('active');
    
    if (type === 'todos') {
        loadAvailableJobs();
    } else {
        const jobCards = document.querySelectorAll('#jobsList .job-card');
        jobCards.forEach(card => {
            const title = card.querySelector('.job-title')?.textContent.toLowerCase() || '';
            const description = card.querySelector('.job-details')?.textContent.toLowerCase() || '';
            
            if (title.includes(type) || description.includes(type)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }
}

function searchJobs() {
    const modal = document.getElementById('searchModal');
    const overlay = document.getElementById('overlay');
    
    if (modal) modal.style.display = 'flex';
    if (overlay) overlay.style.display = 'block';
}

function closeSearchModal() {
    const modal = document.getElementById('searchModal');
    const overlay = document.getElementById('overlay');
    
    if (modal) modal.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
}

function clearSearchFilters() {
    const locationInput = document.getElementById('searchLocation');
    const cropTypeInput = document.getElementById('searchCropType');
    const minPayInput = document.getElementById('searchMinPay');
    const maxPayInput = document.getElementById('searchMaxPay');
    const availabilityInput = document.getElementById('searchAvailability');
    
    if (locationInput) locationInput.value = '';
    if (cropTypeInput) cropTypeInput.value = '';
    if (minPayInput) minPayInput.value = '';
    if (maxPayInput) maxPayInput.value = '';
    if (availabilityInput) availabilityInput.value = '';
}

function applySearchFilters() {
    const locationInput = document.getElementById('searchLocation');
    const cropTypeInput = document.getElementById('searchCropType');
    const minPayInput = document.getElementById('searchMinPay');
    const maxPayInput = document.getElementById('searchMaxPay');
    const availabilityInput = document.getElementById('searchAvailability');
    
    const filters = {
        location: locationInput ? locationInput.value : '',
        cropType: cropTypeInput ? cropTypeInput.value : '',
        minPay: minPayInput ? minPayInput.value : '',
        maxPay: maxPayInput ? maxPayInput.value : '',
        availability: availabilityInput ? availabilityInput.value : ''
    };
    
    console.log('Filtros aplicados:', filters);
    
    const jobCards = document.querySelectorAll('#jobsList .job-card');
    let visibleCount = 0;
    
    jobCards.forEach(card => {
        let shouldShow = true;
        
        const title = card.querySelector('.job-title')?.textContent.toLowerCase() || '';
        const description = card.querySelector('.job-details')?.textContent.toLowerCase() || '';
        const salaryText = card.querySelector('.job-salary')?.textContent || '';
        const salary = parseInt(salaryText.replace(/[^0-9]/g, ''));
        
        if (filters.location && !description.toLowerCase().includes(filters.location.toLowerCase())) {
            shouldShow = false;
        }
        
        if (filters.cropType && !title.includes(filters.cropType) && !description.includes(filters.cropType)) {
            shouldShow = false;
        }
        
        if (filters.minPay && salary < parseInt(filters.minPay)) {
            shouldShow = false;
        }
        
        if (filters.maxPay && salary > parseInt(filters.maxPay)) {
            shouldShow = false;
        }
        
        if (shouldShow) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    if (visibleCount === 0) {
        showNoJobsMessage();
    } else {
        const noJobsMessage = document.getElementById('noJobsMessage');
        if (noJobsMessage) noJobsMessage.style.display = 'none';
    }
    
    updateJobsCount(visibleCount);
    closeSearchModal();
    
    showMessage(`Se encontraron ${visibleCount} trabajos con los filtros aplicados`, 'info');
}

// ===================================================================
// FUNCIONES DE MENÚ
// ===================================================================
function toggleProfileMenu() {
    console.log('Click en menú detectado');
    
    const dropdown = document.getElementById('dynamicProfileDropdown');
    
    if (!dropdown) {
        console.error('No se encontró dynamicProfileDropdown');
        return;
    }
    
    const isVisible = dropdown.style.display === 'block';
    
    if (isVisible) {
        dropdown.style.display = 'none';
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-10px)';
        dropdown.style.pointerEvents = 'none';
    } else {
        dropdown.style.display = 'block';
        dropdown.style.opacity = '1';
        dropdown.style.transform = 'translateY(0)';
        dropdown.style.pointerEvents = 'all';
        dropdown.style.transition = 'all 0.3s ease';
    }
}

document.addEventListener('click', function(event) {
    const profileMenu = document.querySelector('.profile-menu');
    const dropdown = document.getElementById('dynamicProfileDropdown');
    
    if (!profileMenu || !dropdown) return;
    
    if (!profileMenu.contains(event.target) && 
        !dropdown.contains(event.target) && 
        dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-10px)';
        dropdown.style.pointerEvents = 'none';
    }
});

async function logout() {
    try {
        console.log('Cerrando sesión...');
        
        const response = await fetch('/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('Sesión cerrada correctamente');
            
            sessionStorage.clear();
            localStorage.removeItem('user_data');
            
            window.location.replace('/vista/login-trabajador.html?message=Sesión cerrada correctamente&type=success');
        } else {
            throw new Error(data.error || 'Error cerrando sesión');
        }
        
    } catch (error) {
        console.error('Error cerrando sesión:', error);
        window.location.replace('/vista/login-trabajador.html');
    }
}

function showProfile() {
    const dropdown = document.getElementById('dynamicProfileDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-10px)';
        dropdown.style.pointerEvents = 'none';
    }
    
    if (userData) {
        window.location.href = `perfil-trabajador.html?userId=${userData.user_id}&self=true`;
    } else {
        window.location.href = 'perfil-trabajador.html';
    }
}

function showStats() {
    const dropdown = document.getElementById('dynamicProfileDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-10px)';
        dropdown.style.pointerEvents = 'none';
    }
    
    window.location.href = 'estadisticas-trabajador.html';
}

function showSettings() {
    const dropdown = document.getElementById('dynamicProfileDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-10px)';
        dropdown.style.pointerEvents = 'none';
    }
    
    window.location.href = 'configuracion-trabajador.html';
}

function showHistorialEmpleos() {
    window.location.href = 'historial-empleos.html';
}

function showPostulaciones() {
    window.location.href = 'postulaciones.html';
}

function showFavoritos() {
    const dropdown = document.getElementById('dynamicProfileDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-10px)';
        dropdown.style.pointerEvents = 'none';
    }
    window.location.href = 'favoritos.html';
}

// ===================================================================
// FUNCIONES DE NOTIFICACIONES
// ===================================================================
function showToast(tipo, titulo, mensaje) {
    const toastAnterior = document.querySelector('.toast');
    if (toastAnterior) {
        toastAnterior.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    
    const iconos = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-triangle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-circle'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${iconos[tipo]}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${titulo}</div>
            <div class="toast-message">${mensaje}</div>
        </div>
    `;
    
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        padding: 20px 24px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10001;
        transform: translateX(400px);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        border-left: 5px solid ${tipo === 'success' ? '#22c55e' : tipo === 'error' ? '#ef4444' : '#4a7c59'};
        max-width: 400px;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.style.transform = 'translateX(0)', 100);
    
    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 400);
    }, 4000);
}

function showMessage(message, type = 'info') {
    const colors = {
        success: '#22c55e',
        error: '#ef4444',
        info: '#3b82f6',
        warning: '#f59e0b'
    };
    
    const msgDiv = document.createElement('div');
    msgDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 100000;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;
    msgDiv.textContent = message;
    
    document.body.appendChild(msgDiv);
    
    setTimeout(() => {
        msgDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => msgDiv.remove(), 300);
    }, 3000);
}

function showNotifications() {
    showMessage('Centro de Notificaciones: 1 nuevo trabajo disponible, 1 recordatorio de trabajo', 'info');
}

function handleNotification(element) {
    element.style.opacity = '0.7';
    element.style.transform = 'translateX(10px)';
    
    setTimeout(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateX(0)';
        
        const title = element.querySelector('.notification-title')?.textContent || '';
        if (title.includes('Nuevo trabajo')) {
            showMessage('Nuevo trabajo encontrado cerca de ti', 'success');
        } else {
            showMessage('Recordatorio guardado', 'info');
        }
    }, 200);
}

// ===================================================================
// FUNCIONES DEL MAPA
// ===================================================================
function initMap() {
    console.log('Inicializando mapa con Leaflet...');
    
    const mapElement = document.getElementById("map");
    if (!mapElement) {
        console.error('Elemento del mapa no encontrado');
        return;
    }
    
    try {
        const bogota = [4.7110, -74.0721];
        
        map = L.map('map').setView(bogota, 11);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
        }).addTo(map);
        
        const jobs = [
            { lat: 4.7310, lng: -74.0521, title: "Cosecha de Café Premium", salary: "$50,000/día", type: "Café" },
            { lat: 4.6910, lng: -74.0921, title: "Siembra de Maíz Tecnificado", salary: "$45,000/día", type: "Maíz" },
            { lat: 4.7510, lng: -74.0321, title: "Recolección de Cítricos", salary: "$40,000/día", type: "Cítricos" },
            { lat: 4.6710, lng: -74.1121, title: "Mantenimiento Invernaderos", salary: "$42,000/día", type: "Invernadero" },
            { lat: 4.7710, lng: -74.0121, title: "Cosecha Aguacate Hass", salary: "$55,000/día", type: "Aguacate" }
        ];
        
        const jobIcon = L.divIcon({
            className: 'custom-job-marker',
            html: '<div style="background-color: #4a7c59; width: 25px; height: 25px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><i class="fas fa-seedling" style="color: white; font-size: 12px;"></i></div>',
            iconSize: [25, 25],
            iconAnchor: [12, 12]
        });
        
        jobs.forEach((job) => {
            const marker = L.marker([job.lat, job.lng], { icon: jobIcon }).addTo(map);
            
            const popupContent = `
                <div style="padding: 10px; font-family: 'Segoe UI', sans-serif; min-width: 180px;">
                    <h4 style="margin: 0 0 8px 0; color: #1e3a2e; font-size: 14px;">${job.title}</h4>
                    <p style="margin: 0 0 6px 0; color: #4a7c59; font-weight: bold; font-size: 13px;">${job.salary}</p>
                    <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px;">Tipo: ${job.type}</p>
                    <button onclick="applyFromMap('${job.title}')" style="
                        background: linear-gradient(135deg, #4a7c59, #1e3a2e);
                        color: white;
                        border: none;
                        padding: 6px 12px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 600;
                        width: 100%;
                    ">Postularme</button>
                </div>
            `;
            
            marker.bindPopup(popupContent);
        });
        
        const userIcon = L.divIcon({
            className: 'custom-user-marker',
            html: '<div style="background-color: #dc2626; width: 20px; height: 20px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><i class="fas fa-user" style="color: white; font-size: 10px;"></i></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        
        L.marker(bogota, { icon: userIcon }).addTo(map)
            .bindPopup('<div style="text-align: center; padding: 5px;"><strong>Tu ubicación</strong></div>');
        
        console.log('Mapa inicializado correctamente con Leaflet');
        
    } catch (error) {
        console.error('Error inicializando el mapa:', error);
        handleMapError();
    }
}

function applyFromMap(jobTitle) {
    const userName = userData ? (userData.first_name || 'Usuario') : 'Usuario';
    showToast('success', 'Postulación enviada', `Aplicaste exitosamente a "${jobTitle}" desde el mapa`);
    
    const postulacionesCounter = document.querySelector('.quick-stat-number');
    if (postulacionesCounter) {
        postulacionesCounter.textContent = parseInt(postulacionesCounter.textContent) + 1;
    }
}

function handleMapError() {
    console.error('Error cargando el mapa');
    const mapElement = document.getElementById("map");
    if (mapElement) {
        mapElement.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                background: linear-gradient(135deg, rgba(144, 238, 144, 0.2), rgba(74, 124, 89, 0.1));
                border-radius: 15px;
                color: #1e3a2e;
                text-align: center;
                padding: 20px;
            ">
                <div>
                    <div style="font-size: 48px; margin-bottom: 15px; color: #4a7c59;">
                        <i class="fas fa-map-marked-alt"></i>
                    </div>
                    <strong style="font-size: 16px; color: #1e3a2e;">Mapa no disponible</strong><br>
                    <small style="color: #4a7c59; font-size: 14px; display: block; margin-top: 5px;">
                        8 trabajos en 10km de radio
                    </small>
                </div>
            </div>
        `;
    }
}

// ===================================================================
// FUNCIONES GLOBALES PARA WINDOW
// ===================================================================
window.initMap = initMap;
window.handleMapError = handleMapError;
window.applyFromMap = applyFromMap;
window.toggleFavorite = toggleFavorite;
window.showApplyModal = showApplyModal;
window.closeApplyModal = closeApplyModal;
window.confirmApplication = confirmApplication;
window.searchJobs = searchJobs;
window.closeSearchModal = closeSearchModal;
window.clearSearchFilters = clearSearchFilters;
window.applySearchFilters = applySearchFilters;
window.filterJobs = filterJobs;
window.filterByType = filterByType;
window.toggleProfileMenu = toggleProfileMenu;
window.logout = logout;
window.showProfile = showProfile;
window.showStats = showStats;
window.showSettings = showSettings;
window.showHistorialEmpleos = showHistorialEmpleos;
window.showPostulaciones = showPostulaciones;
window.showFavoritos = showFavoritos;
window.showNotifications = showNotifications;
window.handleNotification = handleNotification;

// ===================================================================
// INICIALIZACIÓN
// ===================================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando dashboard de trabajador...');
    
    // AGREGAR ESTA LÍNEA AL INICIO
    verificarSesionActiva();
    
    // ... el resto de tu código existente
    loadUserData();
    loadAvailableJobs();
    // etc...
});
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando dashboard de trabajador...');
    
    // Cargar datos del usuario
    loadUserData();
    
    // Cargar trabajos
    loadAvailableJobs();
    loadMyJobs();
    
    // Cargar estadísticas
    loadStats();
    
    // Cargar favoritos
    setTimeout(() => cargarFavoritos(), 1000);
    
    // Inicializar mapa
    setTimeout(() => initMap(), 500);
    
    // Animaciones para las tarjetas de trabajo
    setTimeout(() => {
        const jobCards = document.querySelectorAll('.job-card');
        jobCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 150);
        });
    }, 2000);

    // Animación para estadísticas rápidas
    const quickStats = document.querySelectorAll('.quick-stat');
    quickStats.forEach((stat) => {
        const number = stat.querySelector('.quick-stat-number');
        if (number) {
            const finalNumber = parseInt(number.textContent);
            
            let currentNumber = 0;
            const increment = finalNumber / 30;
            const counter = setInterval(() => {
                currentNumber += increment;
                if (currentNumber >= finalNumber) {
                    number.textContent = finalNumber;
                    clearInterval(counter);
                } else {
                    number.textContent = Math.floor(currentNumber);
                }
            }, 50);
        }
    });

    // Verificación de sesión cada 5 minutos
    setInterval(async () => {
        try {
            const response = await fetch('/check_session');
            const data = await response.json();
            
            if (!data.authenticated) {
                console.log('Sesión expirada, redirigiendo al login');
                window.location.href = '/vista/login-trabajador.html';
            }
        } catch (error) {
            console.error('Error verificando sesión:', error);
        }
    }, 5 * 60 * 1000);
});

// Atajos de teclado
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case 'f':
                e.preventDefault();
                const searchBar = document.querySelector('.search-bar');
                if (searchBar) searchBar.focus();
                break;
            case 'n':
                e.preventDefault();
                showNotifications();
                break;
            case 'm':
                e.preventDefault();
                const mapElement = document.getElementById('map');
                if (mapElement) mapElement.scrollIntoView({ behavior: 'smooth' });
                break;
            case 'h':
                e.preventDefault();
                showHistorialEmpleos();
                break;
            case 'p':
                e.preventDefault();
                showPostulaciones();
                break;
        }
    }
});

console.log('JavaScript del trabajador cargado correctamente');

// Cargar recomendaciones al inicio
async function cargarRecomendaciones() {
    try {
        const response = await fetch('/api/recomendaciones-empleos', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.recomendaciones.length > 0) {
            mostrarRecomendaciones(data.recomendaciones);
        }
    } catch (error) {
        console.error('Error cargando recomendaciones:', error);
    }
}

function mostrarRecomendaciones(recomendaciones) {
    // Agregar sección de recomendaciones al dashboard
    const seccionRec = document.createElement('div');
    seccionRec.className = 'recomendaciones-section';
    seccionRec.innerHTML = `
        <h2><i class="fas fa-lightbulb"></i> Recomendado para ti</h2>
        <div class="recomendaciones-grid"></div>
    `;
    // Insertar al inicio del job-list
    const jobList = document.getElementById('jobsList');
    jobList.parentNode.insertBefore(seccionRec, jobList);
    
    // Agregar tarjetas
    const grid = seccionRec.querySelector('.recomendaciones-grid');
    recomendaciones.slice(0, 3).forEach(rec => {
        const card = createJobCard(rec); // Usa tu función existente
        card.classList.add('recomendado');
        grid.appendChild(card);
    });
}

// ============================================================
// FUNCIÓN PARA MOSTRAR HISTORIAL DE EMPLEOS
// ============================================================

function showHistorialEmpleos() {
    const dropdown = document.getElementById('dynamicProfileDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-10px)';
        dropdown.style.pointerEvents = 'none';
    }
    
    // Redirigir a la página de historial
    window.location.href = 'historial-empleos.html';
}

function showHelpSupport() {
    window.location.href = 'soporte-trabajador.html';
    toggleProfileMenu(); // Cierra el menú desplegable
}
// Asegúrate de que la función esté disponible globalmente
window.showHistorialEmpleos = showHistorialEmpleos;