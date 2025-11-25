// ================================================================
// JAVASCRIPT MEJORADO PARA CONFIGURACIÓN DEL TRABAJADOR
// ================================================================

// Variables globales
let currentUser = null;
let selectedLanguage = 'es';
let selectedDays = [];
let unavailableDates = [];
let selectedSocialProvider = '';
let selectedVisibility = 'visible'; // visible, paused, hidden

// ================================================================
// TRADUCCIONES MULTI-IDIOMA
// ================================================================
const translations = {
    es: {
        page_title: 'Configuración - AgroMatch',
        user_role: 'Trabajador Agrícola',
        breadcrumb_home: 'Dashboard',
        breadcrumb_config: 'Configuración',
        main_title: 'Configuración de Cuenta',
        language_title: 'Cambiar Idioma',
        language_desc: 'Selecciona tu idioma preferido para la plataforma',
        save_language: 'Guardar Idioma',
        availability_title: 'Gestión de Disponibilidad',
        availability_desc: 'Configura tus horarios y días disponibles para trabajar',
        status_available: 'Disponible',
        status_unavailable: 'No disponible',
        status_paused: 'Pausado',
        status_hidden: 'Oculto',
        visibility_public: 'Perfil Público',
        visibility_public_desc: 'Los agricultores pueden ver tu disponibilidad',
        visibility_paused: 'Pausado Temporalmente',
        visibility_paused_desc: 'Disponibilidad guardada pero oculta',
        visibility_hidden: 'Oculto Completamente',
        visibility_hidden_desc: 'No apareces en búsquedas',
        available_days: 'Días Disponibles',
        day_mon: 'Lun',
        day_tue: 'Mar',
        day_wed: 'Mié',
        day_thu: 'Jue',
        day_fri: 'Vie',
        day_sat: 'Sáb',
        day_sun: 'Dom',
        start_time: 'Hora de Inicio',
        end_time: 'Hora de Fin',
        unavailable_dates: 'Fechas No Disponibles (opcional)',
        add_date: 'Agregar Fecha',
        save_availability: 'Guardar Disponibilidad',
        password_title: 'Cambiar Contraseña',
        password_desc: 'Actualiza tu contraseña para mantener tu cuenta segura',
        current_password: 'Contraseña Actual',
        new_password: 'Nueva Contraseña',
        confirm_password: 'Confirmar Nueva Contraseña',
        change_password: 'Cambiar Contraseña',
        delete_account_title: 'Eliminar Cuenta',
        delete_warning: 'Esta acción no se puede deshacer. Se eliminarán todos tus datos permanentemente.',
        delete_confirm_title: '¿Estás seguro?',
        delete_lose_text: 'Al eliminar tu cuenta se perderán:',
        delete_item1: 'Tu perfil y experiencia laboral',
        delete_item2: 'Todas las postulaciones realizadas',
        delete_item3: 'Historial de trabajos y calificaciones',
        delete_item4: 'Mensajes y comunicaciones',
        delete_with_password: 'Eliminar con contraseña',
        or_delete_using: 'o eliminar usando',
        delete_with_google: 'Eliminar con Google',
        delete_with_facebook: 'Eliminar con Facebook',
        no_social_accounts: 'No tienes cuentas de redes sociales asociadas',
        delete_account_modal: 'Eliminar Cuenta',
        delete_enter_password: 'Para confirmar la eliminación de tu cuenta, escribe tu contraseña actual:',
        delete_understand: 'Entiendo que esta acción no se puede deshacer',
        cancel: 'Cancelar',
        delete_permanently: 'Eliminar Cuenta Permanentemente',
        delete_social_text1: 'Vas a eliminar tu cuenta usando',
        delete_social_text2: 'Esta acción eliminará permanentemente:',
        success_language: 'Idioma cambiado exitosamente',
        success_availability: 'Disponibilidad guardada correctamente',
        success_password: 'Contraseña actualizada correctamente',
        error_password_match: 'Las contraseñas no coinciden',
        error_password_length: 'La contraseña debe tener al menos 8 caracteres',
        error_fill_fields: 'Por favor, completa todos los campos',
        error_select_days: 'Selecciona al menos un día disponible'
    },
    en: {
        page_title: 'Settings - AgroMatch',
        user_role: 'Agricultural Worker',
        breadcrumb_home: 'Dashboard',
        breadcrumb_config: 'Settings',
        main_title: 'Account Settings',
        language_title: 'Change Language',
        language_desc: 'Select your preferred language for the platform',
        save_language: 'Save Language',
        availability_title: 'Availability Management',
        availability_desc: 'Configure your schedules and available days to work',
        status_available: 'Available',
        status_unavailable: 'Unavailable',
        status_paused: 'Paused',
        status_hidden: 'Hidden',
        visibility_public: 'Public Profile',
        visibility_public_desc: 'Farmers can see your availability',
        visibility_paused: 'Paused Temporarily',
        visibility_paused_desc: 'Availability saved but hidden',
        visibility_hidden: 'Completely Hidden',
        visibility_hidden_desc: 'You don\'t appear in searches',
        available_days: 'Available Days',
        day_mon: 'Mon',
        day_tue: 'Tue',
        day_wed: 'Wed',
        day_thu: 'Thu',
        day_fri: 'Fri',
        day_sat: 'Sat',
        day_sun: 'Sun',
        start_time: 'Start Time',
        end_time: 'End Time',
        unavailable_dates: 'Unavailable Dates (optional)',
        add_date: 'Add Date',
        save_availability: 'Save Availability',
        password_title: 'Change Password',
        password_desc: 'Update your password to keep your account secure',
        current_password: 'Current Password',
        new_password: 'New Password',
        confirm_password: 'Confirm New Password',
        change_password: 'Change Password',
        delete_account_title: 'Delete Account',
        delete_warning: 'This action cannot be undone. All your data will be permanently deleted.',
        delete_confirm_title: 'Are you sure?',
        delete_lose_text: 'Deleting your account will lose:',
        delete_item1: 'Your profile and work experience',
        delete_item2: 'All submitted applications',
        delete_item3: 'Job history and ratings',
        delete_item4: 'Messages and communications',
        delete_with_password: 'Delete with password',
        or_delete_using: 'or delete using',
        delete_with_google: 'Delete with Google',
        delete_with_facebook: 'Delete with Facebook',
        no_social_accounts: 'You have no social media accounts linked',
        delete_account_modal: 'Delete Account',
        delete_enter_password: 'To confirm account deletion, enter your current password:',
        delete_understand: 'I understand this action cannot be undone',
        cancel: 'Cancel',
        delete_permanently: 'Delete Account Permanently',
        delete_social_text1: 'You are going to delete your account using',
        delete_social_text2: 'This action will permanently delete:',
        success_language: 'Language changed successfully',
        success_availability: 'Availability saved successfully',
        success_password: 'Password updated successfully',
        error_password_match: 'Passwords do not match',
        error_password_length: 'Password must be at least 8 characters',
        error_fill_fields: 'Please fill in all fields',
        error_select_days: 'Select at least one available day'
    },
    zh: {
        page_title: '设置 - AgroMatch',
        user_role: '农业工人',
        breadcrumb_home: '仪表板',
        breadcrumb_config: '设置',
        main_title: '账户设置',
        language_title: '更改语言',
        language_desc: '选择您喜欢的平台语言',
        save_language: '保存语言',
        availability_title: '可用性管理',
        availability_desc: '配置您的工作时间和可用天数',
        status_available: '可用',
        status_unavailable: '不可用',
        status_paused: '已暂停',
        status_hidden: '已隐藏',
        visibility_public: '公开资料',
        visibility_public_desc: '农民可以看到您的可用性',
        visibility_paused: '暂时暂停',
        visibility_paused_desc: '可用性已保存但隐藏',
        visibility_hidden: '完全隐藏',
        visibility_hidden_desc: '您不会出现在搜索中',
        available_days: '可用天数',
        day_mon: '周一',
        day_tue: '周二',
        day_wed: '周三',
        day_thu: '周四',
        day_fri: '周五',
        day_sat: '周六',
        day_sun: '周日',
        start_time: '开始时间',
        end_time: '结束时间',
        unavailable_dates: '不可用日期（可选）',
        add_date: '添加日期',
        save_availability: '保存可用性',
        password_title: '更改密码',
        password_desc: '更新您的密码以保护您的账户',
        current_password: '当前密码',
        new_password: '新密码',
        confirm_password: '确认新密码',
        change_password: '更改密码',
        delete_account_title: '删除账户',
        delete_warning: '此操作无法撤消。您的所有数据将被永久删除。',
        delete_confirm_title: '您确定吗？',
        delete_lose_text: '删除您的账户将丢失：',
        delete_item1: '您的个人资料和工作经验',
        delete_item2: '所有提交的申请',
        delete_item3: '工作历史和评级',
        delete_item4: '消息和通信',
        delete_with_password: '使用密码删除',
        or_delete_using: '或使用以下方式删除',
        delete_with_google: '使用Google删除',
        delete_with_facebook: '使用Facebook删除',
        no_social_accounts: '您没有关联的社交媒体账户',
        delete_account_modal: '删除账户',
        delete_enter_password: '要确认删除账户，请输入您的当前密码：',
        delete_understand: '我理解此操作无法撤消',
        cancel: '取消',
        delete_permanently: '永久删除账户',
        delete_social_text1: '您将使用以下方式删除您的账户',
        delete_social_text2: '此操作将永久删除：',
        success_language: '语言已成功更改',
        success_availability: '可用性已成功保存',
        success_password: '密码已成功更新',
        error_password_match: '密码不匹配',
        error_password_length: '密码必须至少8个字符',
        error_fill_fields: '请填写所有字段',
        error_select_days: '至少选择一个可用天'
    }
};

// ================================================================
// INICIALIZACIÓN
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Configuración cargada');
    
    loadUserData();
    setupEventListeners();
    loadSavedSettings();
    initializeLanguageSelector();
    initializeAvailabilityManager();
});

// ================================================================
// SISTEMA DE TRADUCCIÓN
// ================================================================
function loadUserLanguage() {
    const savedLang = localStorage.getItem('userLanguage') || 'es';
    selectedLanguage = savedLang;
    applyTranslations(savedLang);
    updateLanguageSelection(savedLang);
}

function applyTranslations(lang) {
    const trans = translations[lang] || translations['es'];
    
    // Actualizar todos los elementos con data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (trans[key]) {
            if (element.tagName === 'INPUT' && element.type !== 'submit') {
                element.placeholder = trans[key];
            } else {
                element.textContent = trans[key];
            }
        }
    });
    
    // Actualizar placeholders específicos
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (trans[key]) {
            element.placeholder = trans[key];
        }
    });
    
    // Actualizar el título de la página
    document.title = trans['page_title'];
    
    // Actualizar el atributo lang del HTML
    document.documentElement.lang = lang;
}

function updateLanguageSelection(lang) {
    document.querySelectorAll('.language-card').forEach(card => {
        card.classList.remove('active');
        if (card.getAttribute('data-lang') === lang) {
            card.classList.add('active');
        }
    });
}

function initializeLanguageSelector() {
    document.querySelectorAll('.language-card').forEach(card => {
        card.addEventListener('click', function() {
            const lang = this.getAttribute('data-lang');
            updateLanguageSelection(lang);
            selectedLanguage = lang;
        });
    });
}

// ================================================================
// GESTIÓN DE DISPONIBILIDAD
// ================================================================
function initializeAvailabilityManager() {
    // Toggle de disponibilidad
    const availabilityToggle = document.getElementById('availabilityToggle');
    const statusLight = document.getElementById('statusLight');
    const statusText = document.getElementById('statusText');
    const statusSubtext = document.getElementById('statusSubtext');
    const visibilityOptions = document.getElementById('visibilityOptions');
    
    if (availabilityToggle) {
        availabilityToggle.addEventListener('change', function() {
            if (this.checked) {
                statusLight.classList.add('available');
                statusLight.classList.remove('paused', 'hidden');
                statusText.textContent = translations[selectedLanguage].status_available;
                visibilityOptions.style.display = 'grid';
                
                // Seleccionar por defecto "visible" si no hay selección previa
                if (!selectedVisibility) {
                    selectedVisibility = 'visible';
                    updateVisibilitySelection('visible');
                }
                updateStatusSubtext();
            } else {
                statusLight.classList.remove('available', 'paused');
                statusLight.classList.add('hidden');
                statusText.textContent = translations[selectedLanguage].status_unavailable;
                statusSubtext.textContent = '';
                visibilityOptions.style.display = 'none';
                selectedVisibility = 'hidden';
            }
        });
    }
    
    // Selector de visibilidad
    document.querySelectorAll('.visibility-card').forEach(card => {
        card.addEventListener('click', function() {
            const visibility = this.getAttribute('data-visibility');
            selectedVisibility = visibility;
            updateVisibilitySelection(visibility);
            updateStatusDisplay();
        });
    });
    
    // Selector de días
    document.querySelectorAll('.day-card').forEach(card => {
        card.addEventListener('click', function() {
            this.classList.toggle('selected');
            const day = this.getAttribute('data-day');
            
            if (this.classList.contains('selected')) {
                if (!selectedDays.includes(day)) {
                    selectedDays.push(day);
                }
            } else {
                selectedDays = selectedDays.filter(d => d !== day);
            }
        });
    });
    
    // Agregar fechas no disponibles
    const addDateBtn = document.getElementById('addUnavailableDate');
    if (addDateBtn) {
        addDateBtn.addEventListener('click', addUnavailableDate);
    }
}

function updateVisibilitySelection(visibility) {
    document.querySelectorAll('.visibility-card').forEach(card => {
        card.classList.remove('active');
        if (card.getAttribute('data-visibility') === visibility) {
            card.classList.add('active');
        }
    });
}

function updateStatusDisplay() {
    const statusLight = document.getElementById('statusLight');
    const statusText = document.getElementById('statusText');
    
    // Remover todas las clases
    statusLight.classList.remove('available', 'paused', 'hidden');
    
    // Aplicar clase según visibilidad
    switch(selectedVisibility) {
        case 'visible':
            statusLight.classList.add('available');
            statusText.textContent = translations[selectedLanguage].status_available;
            break;
        case 'paused':
            statusLight.classList.add('paused');
            statusText.textContent = translations[selectedLanguage].status_paused;
            break;
        case 'hidden':
            statusLight.classList.add('hidden');
            statusText.textContent = translations[selectedLanguage].status_hidden;
            break;
    }
    
    updateStatusSubtext();
}

function updateStatusSubtext() {
    const statusSubtext = document.getElementById('statusSubtext');
    const trans = translations[selectedLanguage];
    
    switch(selectedVisibility) {
        case 'visible':
            statusSubtext.textContent = trans.visibility_public_desc;
            break;
        case 'paused':
            statusSubtext.textContent = trans.visibility_paused_desc;
            break;
        case 'hidden':
            statusSubtext.textContent = trans.visibility_hidden_desc;
            break;
        default:
            statusSubtext.textContent = '';
    }
}

function addUnavailableDate() {
    const dateInput = document.getElementById('unavailableDate');
    const datesList = document.getElementById('unavailableDatesList');
    
    if (dateInput && dateInput.value) {
        const date = dateInput.value;
        
        if (!unavailableDates.includes(date)) {
            unavailableDates.push(date);
            
            const badge = document.createElement('div');
            badge.className = 'date-badge';
            badge.innerHTML = `
                ${formatDate(date)}
                <button onclick="removeUnavailableDate('${date}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            datesList.appendChild(badge);
            dateInput.value = '';
        }
    }
}

function removeUnavailableDate(date) {
    unavailableDates = unavailableDates.filter(d => d !== date);
    loadUnavailableDatesList();
}

function loadUnavailableDatesList() {
    const datesList = document.getElementById('unavailableDatesList');
    if (datesList) {
        datesList.innerHTML = '';
        unavailableDates.forEach(date => {
            const badge = document.createElement('div');
            badge.className = 'date-badge';
            badge.innerHTML = `
                ${formatDate(date)}
                <button onclick="removeUnavailableDate('${date}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            datesList.appendChild(badge);
        });
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString(selectedLanguage === 'zh' ? 'zh-CN' : selectedLanguage);
}

// ================================================================
// CARGAR DATOS DEL USUARIO
// ================================================================
async function loadUserData() {
    try {
        const response = await fetch('/get_user_session', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                currentUser = data.user;
                updateUIWithUserData(data.user);
            } else {
                window.location.href = '/vista/login-trabajador.html';
            }
        } else {
            window.location.href = '/vista/login-trabajador.html';
        }
    } catch (error) {
        console.error('Error:', error);
        loadLocalUserData();
    }
}

function loadLocalUserData() {
    try {
        const userData = localStorage.getItem('agroMatchUser');
        if (userData) {
            currentUser = JSON.parse(userData);
            updateUIWithUserData(currentUser);
        } else {
            window.location.href = '/vista/login-trabajador.html';
        }
    } catch (error) {
        console.error('Error cargando datos locales:', error);
        window.location.href = '/vista/login-trabajador.html';
    }
}

function updateUIWithUserData(user) {
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        const fullName = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
        userNameElement.textContent = fullName || user.username || user.email || 'Usuario';
    }
}

// ================================================================
// EVENT LISTENERS
// ================================================================
function setupEventListeners() {
    // Formulario de idioma
    const languageForm = document.getElementById('languageForm');
    if (languageForm) {
        languageForm.addEventListener('submit', handleLanguageChange);
    }
    
    // Formulario de disponibilidad
    const availabilityForm = document.getElementById('availabilityForm');
    if (availabilityForm) {
        availabilityForm.addEventListener('submit', handleAvailabilityChange);
    }
    
    // Formulario de contraseña
    const passwordForm = document.getElementById('changePasswordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }
    
    // Validación de contraseñas
    const confirmPasswordField = document.getElementById('confirmPassword');
    if (confirmPasswordField) {
        confirmPasswordField.addEventListener('input', validatePasswordMatch);
    }
}

// ================================================================
// MANEJO DE CAMBIO DE IDIOMA
// ================================================================
async function handleLanguageChange(e) {
    e.preventDefault();
    
    try {
        // Guardar en localStorage inmediatamente
        localStorage.setItem('userLanguage', selectedLanguage);
        
        // Intentar guardar en el servidor
        const response = await fetch('/api/actualizar-idioma-usuario', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                language: selectedLanguage
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification(translations[selectedLanguage].success_language, 'success');
                applyTranslations(selectedLanguage);
            }
        } else {
            // Si falla el servidor, aún aplicamos el cambio localmente
            showNotification(translations[selectedLanguage].success_language, 'success');
            applyTranslations(selectedLanguage);
        }
    } catch (error) {
        console.error('Error:', error);
        // Aplicar el cambio localmente aunque falle el servidor
        showNotification(translations[selectedLanguage].success_language, 'success');
        applyTranslations(selectedLanguage);
    }
}

// ================================================================
// MANEJO DE DISPONIBILIDAD
// ================================================================
async function handleAvailabilityChange(e) {
    e.preventDefault();
    
    const availabilityToggle = document.getElementById('availabilityToggle');
    const startTime = document.getElementById('startTime');
    const endTime = document.getElementById('endTime');
    
    if (!availabilityToggle.checked) {
        showNotification('Primero activa tu disponibilidad', 'error');
        return;
    }
    
    if (selectedDays.length === 0) {
        showNotification(translations[selectedLanguage].error_select_days, 'error');
        return;
    }
    
    const availabilityData = {
        available: availabilityToggle.checked,
        visibility: selectedVisibility, // Nueva propiedad
        days: selectedDays,
        startTime: startTime.value,
        endTime: endTime.value,
        unavailableDates: unavailableDates
    };
    
    try {
        const response = await fetch('/api/update-availability', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(availabilityData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            localStorage.setItem('userAvailability', JSON.stringify(availabilityData));
            showNotification(translations[selectedLanguage].success_availability, 'success');
        } else {
            // Guardar localmente si falla el servidor
            localStorage.setItem('userAvailability', JSON.stringify(availabilityData));
            showNotification(translations[selectedLanguage].success_availability, 'success');
        }
    } catch (error) {
        console.error('Error:', error);
        localStorage.setItem('userAvailability', JSON.stringify(availabilityData));
        showNotification(translations[selectedLanguage].success_availability, 'success');
    }
}

// ================================================================
// MANEJO DE CAMBIO DE CONTRASEÑA
// ================================================================
async function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword')?.value;
    const newPassword = document.getElementById('newPassword')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification(translations[selectedLanguage].error_fill_fields, 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showNotification(translations[selectedLanguage].error_password_match, 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        showNotification(translations[selectedLanguage].error_password_length, 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                currentPassword: currentPassword,
                newPassword: newPassword
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showNotification(translations[selectedLanguage].success_password, 'success');
            const form = document.getElementById('changePasswordForm');
            if (form) form.reset();
        } else {
            showNotification(data.message || 'Error al cambiar la contraseña', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error de conexión', 'error');
    }
}

// ================================================================
// FUNCIONES DE UTILIDAD
// ================================================================
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    const button = field.nextElementSibling;
    if (!button) return;
    
    const icon = button.querySelector('i');
    if (!icon) return;
    
    if (field.type === 'password') {
        field.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        field.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

function validatePasswordMatch() {
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    
    if (!newPassword || !confirmPassword) return;
    
    if (confirmPassword.value && newPassword.value !== confirmPassword.value) {
        confirmPassword.style.borderColor = '#f44336';
        confirmPassword.style.boxShadow = '0 0 0 3px rgba(244, 67, 54, 0.1)';
    } else {
        confirmPassword.style.borderColor = '#4CAF50';
        confirmPassword.style.boxShadow = '0 0 0 3px rgba(76, 175, 80, 0.1)';
    }
}

// ================================================================
// CARGAR CONFIGURACIONES GUARDADAS
// ================================================================
async function loadSavedSettings() {
    try {
        // Cargar idioma
        loadUserLanguage();
        
        // Cargar disponibilidad desde localStorage
        const savedAvailability = localStorage.getItem('userAvailability');
        if (savedAvailability) {
            const availability = JSON.parse(savedAvailability);
            
            // Aplicar disponibilidad guardada
            const availabilityToggle = document.getElementById('availabilityToggle');
            if (availabilityToggle) {
                availabilityToggle.checked = availability.available;
                availabilityToggle.dispatchEvent(new Event('change'));
            }
            
            // Aplicar visibilidad guardada
            if (availability.visibility) {
                selectedVisibility = availability.visibility;
                updateVisibilitySelection(availability.visibility);
                updateStatusDisplay();
            }
            
            // Aplicar días seleccionados
            if (availability.days) {
                selectedDays = availability.days;
                availability.days.forEach(day => {
                    const dayCard = document.querySelector(`.day-card[data-day="${day}"]`);
                    if (dayCard) {
                        dayCard.classList.add('selected');
                    }
                });
            }
            
            // Aplicar horarios
            if (availability.startTime) {
                document.getElementById('startTime').value = availability.startTime;
            }
            if (availability.endTime) {
                document.getElementById('endTime').value = availability.endTime;
            }
            
            // Aplicar fechas no disponibles
            if (availability.unavailableDates) {
                unavailableDates = availability.unavailableDates;
                loadUnavailableDatesList();
            }
        }
        
        // Intentar cargar desde el servidor
        const response = await fetch('/api/get-user-settings', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.settings) {
                // Aplicar configuraciones del servidor si existen
                if (data.settings.language) {
                    selectedLanguage = data.settings.language;
                    localStorage.setItem('userLanguage', data.settings.language);
                    applyTranslations(data.settings.language);
                    updateLanguageSelection(data.settings.language);
                }
            }
        }
    } catch (error) {
        console.error('Error cargando configuraciones:', error);
    }
}

// ================================================================
// ELIMINACIÓN DE CUENTA
// ================================================================
function showDeleteConfirmation() {
    const modal = document.getElementById('deleteAccountModal');
    if (modal) modal.style.display = 'flex';
}

function hideDeleteModal() {
    const modal = document.getElementById('deleteAccountModal');
    if (modal) modal.style.display = 'none';
    
    const deletePassword = document.getElementById('deletePassword');
    const confirmDelete = document.getElementById('confirmDelete');
    
    if (deletePassword) deletePassword.value = '';
    if (confirmDelete) confirmDelete.checked = false;
}

async function deleteAccount() {
    const passwordField = document.getElementById('deletePassword');
    const confirmedField = document.getElementById('confirmDelete');
    
    const password = passwordField ? passwordField.value : '';
    const confirmed = confirmedField ? confirmedField.checked : false;
    
    if (!password) {
        showNotification('Por favor, ingresa tu contraseña', 'error');
        return;
    }
    
    if (!confirmed) {
        showNotification('Debes confirmar la eliminación', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/delete-account', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showNotification('Cuenta eliminada correctamente', 'success');
            
            localStorage.clear();
            sessionStorage.clear();
            
            setTimeout(() => {
                window.location.href = '/vista/login-trabajador.html';
            }, 3000);
            
        } else {
            showNotification(data.message || 'Error al eliminar la cuenta', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error de conexión', 'error');
    }
    
    hideDeleteModal();
}

// ================================================================
// ELIMINACIÓN CON REDES SOCIALES
// ================================================================
function deletAccountWithGoogle() {
    selectedSocialProvider = 'google';
    showSocialDeleteModal('Google');
}

function deleteAccountWithFacebook() {
    selectedSocialProvider = 'facebook';
    showSocialDeleteModal('Facebook');
}

function showSocialDeleteModal(providerName) {
    const modal = document.getElementById('deleteSocialModal');
    const providerText = document.getElementById('socialProviderText');
    const confirmBtn = document.getElementById('confirmSocialDeleteBtn');
    
    if (!modal || !providerText || !confirmBtn) return;
    
    providerText.textContent = providerName;
    modal.style.display = 'flex';
    
    confirmBtn.onclick = processSocialAccountDeletion;
}

function hideSocialDeleteModal() {
    const modal = document.getElementById('deleteSocialModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    const confirmSocialDelete = document.getElementById('confirmSocialDelete');
    if (confirmSocialDelete) {
        confirmSocialDelete.checked = false;
    }
    
    selectedSocialProvider = '';
}

async function processSocialAccountDeletion() {
    const confirmSocialDelete = document.getElementById('confirmSocialDelete');
    
    if (!confirmSocialDelete || !confirmSocialDelete.checked) {
        showNotification('Debes confirmar la eliminación', 'error');
        return;
    }
    
    if (!selectedSocialProvider) {
        showNotification('Error: No se pudo determinar el proveedor', 'error');
        return;
    }
    
    try {
        showNotification('Procesando eliminación...', 'info');
        
        let deleteUrl = '';
        if (selectedSocialProvider === 'google') {
            deleteUrl = '/auth/google/delete-account';
        } else if (selectedSocialProvider === 'facebook') {
            deleteUrl = '/auth/facebook/delete-account';
        } else {
            throw new Error('Proveedor no válido');
        }
        
        const response = await fetch(deleteUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            hideSocialDeleteModal();
            showNotification('Cuenta eliminada correctamente', 'success');
            
            localStorage.clear();
            sessionStorage.clear();
            
            setTimeout(() => {
                window.location.href = '/vista/login-trabajador.html';
            }, 3000);
            
        } else {
            showNotification(data.message || 'Error al eliminar la cuenta', 'error');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error de conexión', 'error');
    }
}

// ================================================================
// SISTEMA DE NOTIFICACIONES
// ================================================================
function showNotification(message, type = 'info', duration = 4000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icon = getNotificationIcon(type);
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="${icon}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="closeNotification(this.parentElement)">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    if (!document.getElementById('notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border: 2px solid #ddd;
                border-radius: 12px;
                padding: 1.25rem;
                box-shadow: 0 8px 25px rgba(0,0,0,0.15);
                z-index: 10000;
                max-width: 400px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                animation: slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .notification-success {
                border-left: 5px solid #4CAF50;
                background: linear-gradient(135deg, #ffffff, #f1f8f4);
            }
            
            .notification-error {
                border-left: 5px solid #f44336;
                background: linear-gradient(135deg, #ffffff, #fef5f4);
            }
            
            .notification-info {
                border-left: 5px solid #2196F3;
                background: linear-gradient(135deg, #ffffff, #f1f7fc);
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                flex: 1;
            }
            
            .notification-success .notification-content i {
                color: #4CAF50;
                font-size: 1.5rem;
            }
            
            .notification-error .notification-content i {
                color: #f44336;
                font-size: 1.5rem;
            }
            
            .notification-info .notification-content i {
                color: #2196F3;
                font-size: 1.5rem;
            }
            
            .notification-close {
                background: none;
                border: none;
                color: #666;
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 8px;
                transition: all 0.3s;
            }
            
            .notification-close:hover {
                background: #f0f0f0;
                color: #333;
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        closeNotification(notification);
    }, duration);
    
    return notification;
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success':
            return 'fas fa-check-circle';
        case 'error':
            return 'fas fa-exclamation-circle';
        case 'info':
        default:
            return 'fas fa-info-circle';
    }
}

function closeNotification(element) {
    if (element && element.parentNode) {
        element.style.animation = 'slideOutRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 400);
    }
}

// ================================================================
// CERRAR MODALES CON ESC Y CLICK FUERA
// ================================================================
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        hideDeleteModal();
        hideSocialDeleteModal();
    }
});

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        hideDeleteModal();
        hideSocialDeleteModal();
    }
});

// ================================================================
// FUNCIONES GLOBALES
// ================================================================
window.togglePassword = togglePassword;
window.hideDeleteModal = hideDeleteModal;
window.hideSocialDeleteModal = hideSocialDeleteModal;
window.deleteAccount = deleteAccount;
window.showDeleteConfirmation = showDeleteConfirmation;
window.deletAccountWithGoogle = deletAccountWithGoogle;
window.deleteAccountWithFacebook = deleteAccountWithFacebook;
window.removeUnavailableDate = removeUnavailableDate;
window.closeNotification = closeNotification;

console.log('✅ Sistema de configuración mejorado cargado completamente');