// Configuración de la API
const API_BASE_URL = 'http://localhost:3000/api';

// Utilidades para el manejo de tokens
const TokenManager = {
    set(token) {
        localStorage.setItem('authToken', token);
    },
    
    get() {
        return localStorage.getItem('authToken');
    },
    
    remove() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
    },
    
    isValid() {
        const token = this.get();
        if (!token) return false;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp > Date.now() / 1000;
        } catch {
            return false;
        }
    }
};





// Cliente API
class ApiClient {
    constructor() {
        this.baseURL = API_BASE_URL;
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = TokenManager.get();
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            ...options
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }
        
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP Error: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error(`API Error: ${endpoint}`, error);
            throw error;
        }
    }
    
    // Métodos de autenticación
    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: userData
        });
    }
    
    async login(credentials) {
        return this.request('/auth/login', {
            method: 'POST',
            body: credentials
        });
    }
    
    async logout() {
        return this.request('/auth/logout', { method: 'POST' });
    }
    
    // Métodos de eventos
    async getEvents(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/events${queryString ? `?${queryString}` : ''}`);
    }
    
    async getEvent(id) {
        return this.request(`/events/${id}`);
    }
    
    async createEvent(eventData) {
        return this.request('/events', {
            method: 'POST',
            body: eventData
        });
    }
    
    async registerForEvent(eventId, registrationData) {
        return this.request(`/events/${eventId}/inscribirse`, {
            method: 'POST',
            body: { ...registrationData, eventoId: eventId }
        });
    }
    
    async getMyRegistrations(email) {
        return this.request(`/events/inscripciones/mis-inscripciones?email=${email}`);
    }
    
    async updateRegistration(registrationId, data) {
        return this.request(`/events/inscripciones/${registrationId}`, {
            method: 'PUT',
            body: data
        });
    }
    
    async deleteRegistration(registrationId) {
        return this.request(`/events/inscripciones/${registrationId}`, {
            method: 'DELETE'
        });
    }

            
    // En tu clase ApiClient
    async getRegistration(id) {
        return this.request(`/events/inscripciones/${id}`);
    }
    
    // Métodos de usuario
    async getUserProfile() {
        return this.request('/users/profile');
    }
    
    async updateUserProfile(profileData) {
        return this.request('/users/profile', {
            method: 'PUT',
            body: profileData
        });
    }
}

const api = new ApiClient();

// Funciones de utilidad
function showMessage(message, type = 'info') {
    // Crear elemento de mensaje si no existe
    let messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'message-container';
        messageContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            max-width: 300px;
        `;
        document.body.appendChild(messageContainer);
    }
    
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.style.cssText = `
        padding: 12px 16px;
        margin-bottom: 10px;
        border-radius: 4px;
        color: white;
        font-weight: bold;
        background-color: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#007bff'};
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    messageEl.textContent = message;
    
    messageContainer.appendChild(messageEl);
    
    // Remover después de 5 segundos
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.remove();
        }
    }, 5000);
}

function handleApiError(error, defaultMessage = 'Ha ocurrido un error') {
    console.error('API Error:', error);
    const message = error.message || defaultMessage;
    showMessage(message, 'error');
}

// Variables globales para eventos
let eventos = [];
let currentEditingId = null;

// Función para cargar eventos disponibles
async function loadEvents() {
    try {
        const response = await api.getEvents();
        if (response.success) {
            eventos = response.data;
            renderEventCards();
            populateEventSelect();
        }
    } catch (error) {
        console.error('Error cargando eventos:', error);
        showMessage('Error al cargar eventos', 'error');
    }
}

// Función para conectar las cards con el formulario
function setupCardButtons() {
    const cardButtons = document.querySelectorAll('.card .btn-añadir');
    
    cardButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Obtener el nombre del evento desde la card
            const card = button.closest('.card');
            const eventName = card.querySelector('h3').textContent;
            
            // Autocompletar el campo de evento
            const eventoInput = document.getElementById('evento');
            if (eventoInput) {
                eventoInput.value = eventName;
                showMessage(`Evento "${eventName}" seleccionado`, 'success');
                
                // Desplazar al formulario
                document.querySelector('#cliente-form').scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Manejo del formulario de inscripción
function setupInscriptionForm() {
    const form = document.getElementById('cliente-form');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nombre = document.getElementById('nombre').value.trim();
        const email = document.getElementById('email').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const evento = document.getElementById('evento').value.trim();
        
        if (!nombre || !email || !telefono || !evento) {
            showMessage('Por favor complete todos los campos', 'error');
            return;
        }
        
        try {
            const response = await api.registerForEvent({
                nombre,
                email,
                telefono,
                evento
            });
            
            showMessage('Inscripción exitosa', 'success');
            form.reset();
            loadRegistrations();
        } catch (error) {
            showMessage(error.message || 'Error al inscribirse', 'error');
        }
    });
}

// En la función setupInscriptionForm (o donde manejas el submit del formulario):
const clienteForm = document.getElementById('cliente-form');
if (clienteForm) {
    clienteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nombre = document.getElementById('nombre').value.trim();
        const email = document.getElementById('email').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const eventoNombre = document.getElementById('evento').value.trim();
        
        if (!nombre || !email || !telefono || !eventoNombre) {
            showMessage('Por favor, completa todos los campos', 'error');
            return;
        }
        
        // Buscar el evento completo por nombre
        const evento = eventos.find(e => e.nombre === eventoNombre);
        if (!evento) {
            showMessage('Evento no encontrado', 'error');
            return;
        }
        
        try {
            // Enviar tanto el ID como el nombre del evento
            const userData = { 
                nombre, 
                email, 
                telefono,
                eventoId: evento.id,
                eventoNombre: evento.nombre // Asegurarnos de enviar el nombre
            };
            
            const response = await api.registerForEvent(evento.id, userData);
            
            if (response.success) {
                showMessage('¡Inscripción exitosa!', 'success');
                clienteForm.reset();
                // Recargar las inscripciones mostrando el nombre del evento
                await loadRegistrations(email); // Pasar el email directamente
            }
        } catch (error) {
            showMessage(error.message || 'Error en la inscripción', 'error');
        }
    });
}

// Modificar la función loadRegistrations para aceptar el email como parámetro
async function loadRegistrations(email = null) {
    try {
        // Si no se proporciona email, intentar obtenerlo del formulario
        if (!email) {
            const emailInput = document.getElementById('email');
            if (emailInput && emailInput.value.trim()) {
                email = emailInput.value.trim();
            } else {
                showMessage('Ingresa tu email para ver las inscripciones', 'error');
                return;
            }
        }
        
        const response = await api.getMyRegistrations(email);
        if (response.success) {
            updateRegistrationsTable(response.data);
        }
    } catch (error) {
        console.error('Error cargando inscripciones:', error);
        showMessage('Error al cargar inscripciones', 'error');
    }
}

function updateRegistrationsTable(registrations) {
    const tbody = document.querySelector('#tabla-clientes tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!registrations || registrations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No hay inscripciones</td></tr>';
        return;
    }
    
    registrations.forEach(reg => {
        const row = document.createElement('tr');
        
        // Asegúrate de mostrar el nombre del evento correctamente
        let eventoNombre = 'N/A';
        if (typeof reg.evento === 'object' && reg.evento !== null) {
            eventoNombre = reg.evento.nombre || 'N/A';
        } else if (typeof reg.evento === 'string') {
            eventoNombre = reg.evento;
        } else if (reg.eventoNombre) {
            eventoNombre = reg.eventoNombre;
        }
        
        row.innerHTML = `
            <td>${reg.nombre || 'N/A'}</td>
            <td>${reg.email || 'N/A'}</td>
            <td>${reg.telefono || 'N/A'}</td>
            <td>${eventoNombre}</td>
            <td>
                <button class="btn-editar" data-id="${reg.id}">Editar</button>
                <button class="btn-eliminar" data-id="${reg.id}">Eliminar</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Configurar eventos para los botones
    setupTableButtons();
}

// Agrega esta función para configurar los eventos de los botones
function setupTableButtons() {
    // Botón Editar
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            await editRegistration(id);
        });
    });
    
    // Botón Eliminar
    document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            await deleteRegistration(id);
        });
    });
}


// Implementa la función editRegistration
async function editRegistration(id) {
    try {
        // 1. Obtener los datos de la inscripción
        const response = await api.getRegistration(id);
        if (!response.success) throw new Error('No se pudo cargar la inscripción');
        
        const inscripcion = response.data;
        
        // 2. Rellenar el formulario de edición
        document.getElementById('edit-nombre').value = inscripcion.nombre;
        document.getElementById('edit-email').value = inscripcion.email;
        document.getElementById('edit-telefono').value = inscripcion.telefono;
        
        // Seleccionar el evento correcto en el select
        const selectEvento = document.getElementById('edit-evento');
        if (selectEvento) {
            const eventoId = inscripcion.eventoId || (inscripcion.evento && inscripcion.evento.id);
            if (eventoId) {
                selectEvento.value = eventoId;
            }
        }
        
        // 3. Mostrar el modal
        document.getElementById('modal-editar').style.display = 'flex';
        currentEditingId = id;
        
    } catch (error) {
        console.error('Error al editar:', error);
        showMessage('Error al cargar datos para editar', 'error');
    }
}

// Implementa la función deleteRegistration
async function deleteRegistration(id) {
    if (!confirm('¿Estás seguro de eliminar esta inscripción?')) return;
    
    try {
        const response = await api.deleteRegistration(id);
        if (response.success) {
            showMessage('Inscripción eliminada correctamente', 'success');
            // Recargar las inscripciones
            const email = document.getElementById('email')?.value.trim();
            if (email) await loadRegistrations(email);
        } else {
            throw new Error(response.message || 'Error al eliminar');
        }
    } catch (error) {
        console.error('Error al eliminar:', error);
        showMessage(error.message || 'Error al eliminar inscripción', 'error');
    }
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    if (!TokenManager.isValid()) {
        return;
    }
    
    // Configurar elementos de la interfaz
    setupCardButtons();
    setupInscriptionForm();
    
    // Configurar cierre de sesión
    document.querySelector('a[href="index.html"]').addEventListener('click', (e) => {
        e.preventDefault();
        api.logout().finally(() => {
            TokenManager.remove();
            window.location.href = 'index.html';
        });
    });
});

// Funciones para editar/eliminar (simplificadas)
async function editRegistration(id) {
    // Implementar lógica de edición
    console.log('Editar inscripción:', id);
}

async function deleteRegistration(id) {
    if (!confirm('¿Está seguro de eliminar esta inscripción?')) return;
    
    try {
        await api.deleteRegistration(id);
        showMessage('Inscripción eliminada', 'success');
        loadRegistrations();
    } catch (error) {
        showMessage('Error al eliminar', 'error');
    }
}

// Función para renderizar las cards de eventos
function renderEventCards() {
    const eventsContainer = document.getElementById('events-container');
    if (!eventsContainer) return;
    
    eventsContainer.innerHTML = '';
    
    eventos.forEach(evento => {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.innerHTML = `
            <div class="card">
                <img src="${evento.imagen || 'https://via.placeholder.com/300'}" alt="${evento.nombre}">
                <h3>${evento.nombre}</h3>
                <p>${evento.descripcion || 'Descripción no disponible'}</p>
                <p><strong>Fecha:</strong> ${new Date(evento.fecha).toLocaleDateString()}</p>
                <p><strong>Lugar:</strong> ${evento.lugar || 'No especificado'}</p>
                <button class="btn-añadir" data-event-id="${evento.id}" data-event-name="${evento.nombre}">+</button>
            </div>
        `;
        eventsContainer.appendChild(card);
    });
    
    // Agregar event listeners a los botones de añadir
    document.querySelectorAll('.btn-añadir').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const eventName = button.getAttribute('data-event-name');
            const eventId = button.getAttribute('data-event-id');
            
            if (!eventName) {
                console.error('No se pudo obtener el nombre del evento');
                showMessage('Error al seleccionar el evento', 'error');
                return;
            }
            
            autocompleteEventField(eventName, eventId);
        });
    });
}

// Función para autocompletar el campo de evento
function autocompleteEventField(eventName, eventId) {
    const eventoInput = document.getElementById('evento');
    const eventoIdInput = document.getElementById('evento-id'); // Campo oculto para el ID
    
    if (eventoInput) {
        eventoInput.value = eventName;
        
        // Si existe un campo para el ID del evento, lo actualizamos
        if (eventoIdInput) {
            eventoIdInput.value = eventId;
        }
        
        // Desplazarse suavemente al formulario
        const formSection = document.getElementById('registration-section');
        if (formSection) {
            formSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        showMessage(`Evento "${eventName}" seleccionado`, 'success');
    } else {
        console.warn('No se encontró el campo de evento en el formulario');
        showMessage('Error al seleccionar el evento', 'error');
    }
}
    
    // Agregar event listeners a los botones de añadir
    document.querySelectorAll('.btn-añadir').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const eventName = button.getAttribute('data-event-name');
            addEventToForm(eventName);
        });
    });


// Función para agregar evento al formulario desde las tarjetas
function addEventToForm(eventName) {
    const eventoInput = document.getElementById('evento');
    if (eventoInput) {
        eventoInput.value = eventName;
        eventoInput.scrollIntoView({ behavior: 'smooth' });
        showMessage(`Evento "${eventName}" seleccionado`, 'success');
    }
}

// Función para llenar el select de eventos en el modal
function populateEventSelect() {
    const editEventoSelect = document.getElementById('edit-evento');
    if (editEventoSelect && eventos.length > 0) {
        editEventoSelect.innerHTML = '<option value="">Selecciona un evento</option>';
        eventos.forEach(evento => {
            const option = document.createElement('option');
            option.value = evento.id;
            option.textContent = evento.nombre;
            editEventoSelect.appendChild(option);
        });
    }
}

// Event Listeners principales
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticación
    if (TokenManager.isValid()) {
        try {
            const response = await api.getUserProfile();
            localStorage.setItem('currentUser', JSON.stringify(response.data.user));
        } catch (error) {
            TokenManager.remove();
        }
    }
    
    // Cargar eventos al inicio
    await loadEvents();
    
    // --- Lógica de Registro ---
    const registrationForm = document.getElementById('registrationForm');
    if (registrationForm) {
        registrationForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const formData = new FormData(registrationForm);
            const userData = {
                username: formData.get('username').trim(),
                email: formData.get('email').trim(),
                password: formData.get('password'),
                confirmPassword: formData.get('confirmPassword')
            };
            
            // Validaciones del frontend
            if (userData.password !== userData.confirmPassword) {
                showMessage('Las contraseñas no coinciden.', 'error');
                return;
            }
            
            try {
                const response = await api.register(userData);
                showMessage(response.message, 'success');
                
                // Guardar token y usuario
                TokenManager.set(response.data.token);
                localStorage.setItem('currentUser', JSON.stringify(response.data.user));
                
                setTimeout(() => {
                    window.location.href = '/eventos';
                }, 1500);
            } catch (error) {
                handleApiError(error, 'Error al registrar usuario');
            }
        });
    }
    
    // --- Lógica de Inicio de Sesión ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const formData = new FormData(loginForm);
            const credentials = {
                identifier: formData.get('username').trim(),
                password: formData.get('password')
            };
            
            try {
                const response = await api.login(credentials);
                showMessage(response.message, 'success');
                
                // Guardar token y usuario
                TokenManager.set(response.data.token);
                localStorage.setItem('currentUser', JSON.stringify(response.data.user));
                
                setTimeout(() => {
                    window.location.href = '/eventos';
                }, 1000);
            } catch (error) {
                handleApiError(error, 'Error al iniciar sesión');
            }
        });
    }
    
    // --- Lógica de Cierre de Sesión ---
    const logoutLinks = document.querySelectorAll('a[href*="index.html"]');
    logoutLinks.forEach(link => {
        if (link.textContent.includes('Cerrar')) {
            link.addEventListener('click', async (event) => {
                event.preventDefault();
                
                try {
                    await api.logout();
                } catch (error) {
                    console.log('Error al cerrar sesión:', error);
                }
                
                TokenManager.remove();
                showMessage('Sesión cerrada exitosamente', 'success');
                
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            });
        }
    });
    
    // --- Lógica de Inscripción a Eventos ---
    const clienteForm = document.getElementById('cliente-form');
    if (clienteForm) {
        clienteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nombre = document.getElementById('nombre').value.trim();
            const email = document.getElementById('email').value.trim();
            const telefono = document.getElementById('telefono').value.trim();
            const eventoNombre = document.getElementById('evento').value.trim();
            
            if (!nombre || !email || !telefono || !eventoNombre) {
                showMessage('Por favor, completa todos los campos', 'error');
                return;
            }
            
            // Buscar el ID del evento por nombre
            const evento = eventos.find(e => e.nombre === eventoNombre);
            if (!evento) {
                showMessage('Evento no encontrado', 'error');
                return;
            }
            
            try {
                const userData = { nombre, email, telefono };
                const response = await api.registerForEvent(evento.id, userData);
                
                if (response.success) {
                    showMessage('¡Inscripción exitosa!', 'success');
                    clienteForm.reset();
                }
            } catch (error) {
                showMessage(error.message || 'Error en la inscripción', 'error');
            }
        });
    }
    
    // --- Lógica para ver mis inscripciones ---
    const misInscripcionesBtn = document.getElementById('mis-inscripciones-btn');
    if (misInscripcionesBtn) {
        misInscripcionesBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('email');
            const email = emailInput ? emailInput.value.trim() : '';
            
            if (!email) {
                showMessage('Por favor, ingresa tu email', 'error');
                return;
            }
            
            try {
                const response = await api.getMyRegistrations(email);
                if (response.success) {
                    showMessage('Inscripciones cargadas', 'success');
                    // Aquí puedes implementar la lógica para mostrar las inscripciones
                    console.log('Mis inscripciones:', response.data);
                }
            } catch (error) {
                handleApiError(error, 'Error al obtener inscripciones');
            }
        });
    }
});

// Agregar estilos CSS para las cards de eventos
const style = document.createElement('style');
style.textContent = `
    #events-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 20px;
        padding: 20px;
    }
    
    .event-card {
        border: 1px solid #ddd;
        border-radius: 8px;
        overflow: hidden;
        transition: transform 0.3s ease;
    }
    
    .event-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    
    .event-card img {
        width: 100%;
        height: 200px;
        object-fit: cover;
    }
    
    .event-card .card {
        padding: 15px;
    }
    
    .event-card h3 {
        margin-top: 0;
        color: #333;
    }
    
    .event-card p {
        margin: 5px 0;
        color: #666;
    }
    
    .btn-añadir {
        background-color: #28a745;
        color: white;
        border: none;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        font-size: 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 10px;
    }
    
    .btn-añadir:hover {
        background-color: #218838;
    }
    
    @keyframes slideIn {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
`;
document.head.appendChild(style);