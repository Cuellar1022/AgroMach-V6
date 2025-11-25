// ================================================================
// GESTOR DE IDIOMAS GLOBAL MEJORADO - AgroMatch
// Archivo: js/language-manager.js
// ================================================================

(function() {
    'use strict';

    // Traducciones completas del sistema
    window.translations = {
        es: {
            // Página principal
            page_title: 'AgroMatch - Dashboard',
            
            // Navegación común
            dashboard: 'Panel de Control',
            offers: 'Ofertas',
            applications: 'Postulaciones',
            profile: 'Perfil',
            settings: 'Configuración',
            logout: 'Cerrar Sesión',
            
            // Dashboard Trabajador
            recommendations: 'Recomendaciones',
            search_jobs: 'Buscar Trabajos',
            search_placeholder: 'Buscar trabajos por ubicación, tipo de cultivo, etc...',
            filter_all: 'Todos',
            filter_harvest: 'Cosecha',
            filter_planting: 'Siembra',
            filter_maintenance: 'Mantenimiento',
            filter_collection: 'Recolección',
            jobs_near: 'Trabajos Cerca',
            my_applications: 'Postulaciones',
            in_progress: 'En Progreso',
            available_jobs: 'Trabajos Disponibles',
            no_jobs_title: 'No hay trabajos disponibles',
            no_jobs_text: 'No se encontraron ofertas de trabajo que coincidan con tus criterios.',
            my_jobs: 'Mis Trabajos',
            no_active_jobs: 'No tienes trabajos activos',
            no_active_jobs_text: 'Postúlate a las ofertas disponibles para empezar a trabajar.',
            jobs: 'Trabajos',
            hours: 'Horas',
            nearby_jobs: 'Trabajos Cercanos',
            notifications: 'Notificaciones',
            
            // Títulos de páginas
            page_title: 'Configuración - AgroMatch',
            page_title_worker: 'AgroMatch - Dashboard Trabajador',
            page_title_farmer: 'AgroMatch - Dashboard Agricultor',
            
            // Configuración
            user_role: 'Trabajador Agrícola',
            breadcrumb_home: 'Dashboard',
            breadcrumb_config: 'Configuración',
            main_title: 'Configuración de Cuenta',
            language_title: 'Cambiar Idioma',
            language_desc: 'Selecciona tu idioma preferido para la plataforma',
            save_language: 'Guardar Idioma',
            
            // Disponibilidad
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
            
            // Contraseña
            password_title: 'Cambiar Contraseña',
            password_desc: 'Actualiza tu contraseña para mantener tu cuenta segura',
            current_password: 'Contraseña Actual',
            new_password: 'Nueva Contraseña',
            confirm_password: 'Confirmar Nueva Contraseña',
            change_password: 'Cambiar Contraseña',
            
            // Eliminar cuenta
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
            
            // Mensajes
            success_language: 'Idioma cambiado exitosamente',
            success_availability: 'Disponibilidad guardada correctamente',
            success_password: 'Contraseña actualizada correctamente',
            error_password_match: 'Las contraseñas no coinciden',
            error_password_length: 'La contraseña debe tener al menos 8 caracteres',
            error_fill_fields: 'Por favor, completa todos los campos',
            error_select_days: 'Selecciona al menos un día disponible',
            
            // Botones comunes
            save: 'Guardar',
            edit: 'Editar',
            delete: 'Eliminar',
            search: 'Buscar',
            filter: 'Filtrar',
            apply: 'Postular',
            accept: 'Aceptar',
            reject: 'Rechazar',
            close: 'Cerrar',
            back: 'Volver',
            next: 'Siguiente',
            previous: 'Anterior',
            
            // Estados
            active: 'Activo',
            inactive: 'Inactivo',
            pending: 'Pendiente',
            accepted: 'Aceptada',
            rejected: 'Rechazada',
            completed: 'Completado',
            in_progress: 'En Progreso',
            
            // Ofertas
            jobs_title: 'Ofertas de Trabajo',
            salary: 'Salario',
            location: 'Ubicación',
            date: 'Fecha',
            description: 'Descripción',
            requirements: 'Requisitos',
            publish_date: 'Fecha de Publicación',
            
            // Perfil
            personal_info: 'Información Personal',
            contact: 'Contacto',
            experience: 'Experiencia',
            skills: 'Habilidades',
            documents: 'Documentos',
            
            // Otros
            loading: 'Cargando...',
            no_results: 'No se encontraron resultados',
            error: 'Error',
            success: 'Éxito',
            welcome: 'Bienvenido'
        },
        
        en: {
            // Main page
            page_title: 'AgroMatch - Dashboard',
            
            // Common navigation
            dashboard: 'Dashboard',
            offers: 'Offers',
            applications: 'Applications',
            profile: 'Profile',
            settings: 'Settings',
            logout: 'Logout',
            
            // Worker Dashboard
            recommendations: 'Recommendations',
            search_jobs: 'Search Jobs',
            search_placeholder: 'Search jobs by location, crop type, etc...',
            filter_all: 'All',
            filter_harvest: 'Harvest',
            filter_planting: 'Planting',
            filter_maintenance: 'Maintenance',
            filter_collection: 'Collection',
            jobs_near: 'Jobs Nearby',
            my_applications: 'Applications',
            in_progress: 'In Progress',
            available_jobs: 'Available Jobs',
            no_jobs_title: 'No jobs available',
            no_jobs_text: 'No job offers found matching your criteria.',
            my_jobs: 'My Jobs',
            no_active_jobs: 'No active jobs',
            no_active_jobs_text: 'Apply to available offers to start working.',
            jobs: 'Jobs',
            hours: 'Hours',
            nearby_jobs: 'Nearby Jobs',
            notifications: 'Notifications',
            
            // Settings
            page_title: 'Settings - AgroMatch',
            user_role: 'Agricultural Worker',
            breadcrumb_home: 'Dashboard',
            breadcrumb_config: 'Settings',
            main_title: 'Account Settings',
            language_title: 'Change Language',
            language_desc: 'Select your preferred language for the platform',
            save_language: 'Save Language',
            
            // Availability
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
            
            // Password
            password_title: 'Change Password',
            password_desc: 'Update your password to keep your account secure',
            current_password: 'Current Password',
            new_password: 'New Password',
            confirm_password: 'Confirm New Password',
            change_password: 'Change Password',
            
            // Delete account
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
            
            // Messages
            success_language: 'Language changed successfully',
            success_availability: 'Availability saved successfully',
            success_password: 'Password updated successfully',
            error_password_match: 'Passwords do not match',
            error_password_length: 'Password must be at least 8 characters',
            error_fill_fields: 'Please fill in all fields',
            error_select_days: 'Select at least one available day',
            
            // Common buttons
            save: 'Save',
            edit: 'Edit',
            delete: 'Delete',
            search: 'Search',
            filter: 'Filter',
            apply: 'Apply',
            accept: 'Accept',
            reject: 'Reject',
            close: 'Close',
            back: 'Back',
            next: 'Next',
            previous: 'Previous',
            
            // States
            active: 'Active',
            inactive: 'Inactive',
            pending: 'Pending',
            accepted: 'Accepted',
            rejected: 'Rejected',
            completed: 'Completed',
            in_progress: 'In Progress',
            
            // Offers
            jobs_title: 'Job Offers',
            salary: 'Salary',
            location: 'Location',
            date: 'Date',
            description: 'Description',
            requirements: 'Requirements',
            publish_date: 'Publication Date',
            
            // Profile
            personal_info: 'Personal Information',
            contact: 'Contact',
            experience: 'Experience',
            skills: 'Skills',
            documents: 'Documents',
            
            // Others
            loading: 'Loading...',
            no_results: 'No results found',
            error: 'Error',
            success: 'Success',
            welcome: 'Welcome'
        },
        
        zh: {
            // 主页
            page_title: 'AgroMatch - 仪表板',
            
            // 导航
            dashboard: '仪表板',
            offers: '工作机会',
            applications: '申请',
            profile: '资料',
            settings: '设置',
            logout: '退出',
            
            // 工人仪表板
            recommendations: '推荐',
            search_jobs: '搜索工作',
            search_placeholder: '按位置、作物类型等搜索工作...',
            filter_all: '全部',
            filter_harvest: '收获',
            filter_planting: '种植',
            filter_maintenance: '维护',
            filter_collection: '收集',
            jobs_near: '附近工作',
            my_applications: '申请',
            in_progress: '进行中',
            available_jobs: '可用工作',
            no_jobs_title: '没有可用的工作',
            no_jobs_text: '未找到符合您条件的工作机会。',
            my_jobs: '我的工作',
            no_active_jobs: '没有活跃的工作',
            no_active_jobs_text: '申请可用的职位以开始工作。',
            jobs: '工作',
            hours: '小时',
            nearby_jobs: '附近工作',
            notifications: '通知',
            
            // 设置
            page_title: '设置 - AgroMatch',
            user_role: '农业工人',
            breadcrumb_home: '仪表板',
            breadcrumb_config: '设置',
            main_title: '账户设置',
            language_title: '更改语言',
            language_desc: '选择您喜欢的平台语言',
            save_language: '保存语言',
            
            // 可用性
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
            
            // 密码
            password_title: '更改密码',
            password_desc: '更新您的密码以保护您的账户',
            current_password: '当前密码',
            new_password: '新密码',
            confirm_password: '确认新密码',
            change_password: '更改密码',
            
            // 删除账户
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
            
            // 消息
            success_language: '语言已成功更改',
            success_availability: '可用性已成功保存',
            success_password: '密码已成功更新',
            error_password_match: '密码不匹配',
            error_password_length: '密码必须至少8个字符',
            error_fill_fields: '请填写所有字段',
            error_select_days: '至少选择一个可用天',
            
            // 常用按钮
            save: '保存',
            edit: '编辑',
            delete: '删除',
            search: '搜索',
            filter: '筛选',
            apply: '申请',
            accept: '接受',
            reject: '拒绝',
            close: '关闭',
            back: '返回',
            next: '下一步',
            previous: '上一步',
            
            // 状态
            active: '活跃',
            inactive: '不活跃',
            pending: '待定',
            accepted: '已接受',
            rejected: '已拒绝',
            completed: '已完成',
            in_progress: '进行中',
            
            // 工作
            jobs_title: '工作机会',
            salary: '薪资',
            location: '位置',
            date: '日期',
            description: '描述',
            requirements: '要求',
            publish_date: '发布日期',
            
            // 个人资料
            personal_info: '个人信息',
            contact: '联系方式',
            experience: '经验',
            skills: '技能',
            documents: '文档',
            
            // 其他
            loading: '加载中...',
            no_results: '未找到结果',
            error: '错误',
            success: '成功',
            welcome: '欢迎'
        }
    };

    // Gestor principal de idiomas
    window.LanguageManager = {
        currentLanguage: 'es',
        
        init: function() {
            // Primero intentar cargar desde el servidor
            this.loadLanguageFromServer().then(lang => {
                if (!lang) {
                    // Si no hay idioma en el servidor, usar localStorage
                    lang = localStorage.getItem('userLanguage') || 'es';
                }
                this.currentLanguage = lang;
                this.applyTranslations(lang);
                document.documentElement.lang = lang;
                console.log(`✅ Idioma inicializado: ${lang}`);
            }).catch(error => {
                console.error('Error cargando idioma del servidor:', error);
                const lang = localStorage.getItem('userLanguage') || 'es';
                this.currentLanguage = lang;
                this.applyTranslations(lang);
                document.documentElement.lang = lang;
            });
        },
        
        async loadLanguageFromServer() {
            try {
                const response = await fetch('/get_user_session', {
                    method: 'GET',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.user && data.user.language) {
                        localStorage.setItem('userLanguage', data.user.language);
                        return data.user.language;
                    }
                }
                return null;
            } catch (error) {
                console.error('Error obteniendo idioma del servidor:', error);
                return null;
            }
        },
        
        applyTranslations: function(lang) {
            const trans = window.translations[lang] || window.translations['es'];
            
            // Traducir elementos con data-i18n
            document.querySelectorAll('[data-i18n]').forEach(element => {
                const key = element.getAttribute('data-i18n');
                if (trans[key]) {
                    if (element.tagName === 'INPUT' && element.type !== 'submit') {
                        element.placeholder = trans[key];
                    } else if (element.tagName === 'INPUT' && element.type === 'submit') {
                        element.value = trans[key];
                    } else {
                        element.textContent = trans[key];
                    }
                }
            });
            
            // Traducir placeholders específicos
            document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
                const key = element.getAttribute('data-i18n-placeholder');
                if (trans[key]) {
                    element.placeholder = trans[key];
                }
            });
            
            // Traducir títulos
            document.querySelectorAll('[data-i18n-title]').forEach(element => {
                const key = element.getAttribute('data-i18n-title');
                if (trans[key]) {
                    element.title = trans[key];
                }
            });
            
            // Actualizar título de página si existe
            if (trans['page_title']) {
                document.title = trans['page_title'];
            }
            
            console.log(`✅ Traducciones aplicadas: ${lang}`);
        },
        
        changeLanguage: async function(lang) {
            if (!window.translations[lang]) {
                console.error(`❌ Idioma no soportado: ${lang}`);
                return false;
            }
            
            try {
                // Guardar localmente primero
                localStorage.setItem('userLanguage', lang);
                this.currentLanguage = lang;
                
                // Aplicar traducciones inmediatamente
                this.applyTranslations(lang);
                document.documentElement.lang = lang;
                
                // Intentar guardar en el servidor
                const response = await fetch('/api/actualizar-idioma-usuario', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ language: lang })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Idioma guardado en servidor:', data);
                } else {
                    console.warn('⚠️ No se pudo guardar en servidor, pero se aplicó localmente');
                }
                
                // Disparar evento personalizado
                window.dispatchEvent(new CustomEvent('languageChanged', { 
                    detail: { language: lang } 
                }));
                
                return true;
                
            } catch (error) {
                console.error('❌ Error cambiando idioma:', error);
                // Aún así aplicar el cambio localmente
                this.applyTranslations(lang);
                return true;
            }
        },
        
        t: function(key) {
            const trans = window.translations[this.currentLanguage] || window.translations['es'];
            return trans[key] || key;
        },
        
        getCurrentLanguage: function() {
            return this.currentLanguage;
        }
    };

    // Auto-inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.LanguageManager.init();
        });
    } else {
        window.LanguageManager.init();
    }
    
    console.log('✅ Sistema de idiomas global cargado');
})();