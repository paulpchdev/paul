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
    // Variables globales para eventos y carrito
    let eventos = [];
    let currentEditingId = null;
    let cart = [];
    // Seleccionar elementos del DOM del carrito
    const cartIcon = document.getElementById('cart-icon');
    const cartModal = document.getElementById('cart-modal');
    const closeCartBtn = document.getElementById('cerrar-carrito');
    const cartItemsList = document.getElementById('cart-items');
    const cartTotalSpan = document.getElementById('cart-total');
    const cartCountSpan = document.getElementById('cart-count');
// Funciones de utilidad
function showMessage(message, type = 'info') {
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
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.remove();
        }
    }, 5000);
}

// Lógica del carrito
function addRegistrationToCart(registrationDetails) {
    // Usamos el `eventoId` para verificar si ya está en el carrito
    const existingItem = cart.find(item => item.eventoId === registrationDetails.eventoId);
    if (existingItem) {
        showMessage('Este evento ya ha sido añadido al carrito.', 'info');
    } else {
        cart.push({ ...registrationDetails, id: Date.now() }); // Generamos un ID único para la entrada del carrito
        showMessage(`Inscripción a "${registrationDetails.eventoNombre}" añadida al carrito.`, 'success');
    }
    updateCartCount();
    renderCart();
}

function renderCart() {
    cartItemsList.innerHTML = '';
    let total = 0;
    if (cart.length === 0) {
        cartItemsList.innerHTML = '<p>El carrito está vacío.</p>';
    } else {
        cart.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="cart-item-name">${item.eventoNombre}</span>
                <span class="cart-item-price">S/. ${(item.precio || 0).toFixed(2)}</span>
                <button class="btn-remove-item" data-cart-id="${item.id}">❌</button>
            `;
            cartItemsList.appendChild(li);
            total += item.precio || 0;
        });
    }
    cartTotalSpan.textContent = total.toFixed(2);
    document.querySelectorAll('.btn-remove-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const cartId = parseInt(this.getAttribute('data-cart-id'));
            cart = cart.filter(item => item.id !== cartId);
            showMessage('Elemento eliminado del carrito.', 'info');
            updateCartCount();
            renderCart();
        });
    });
}

function updateCartCount() {
    cartCountSpan.textContent = cart.length;
}

// Lógica de "Proceder al Pago" en el modal del carrito
document.getElementById('proceder-compra').addEventListener('click', async () => {
    if (cart.length > 0) {
        const successfulRegistrations = [];
        const failedRegistrations = [];
        const firstEmail = cart[0].email; // Asumimos que todas las inscripciones son del mismo usuario

        for (const item of cart) {
            try {
                const registrationData = {
                    nombre: item.nombre,
                    email: item.email,
                    telefono: item.telefono,
                    eventoId: item.eventoId
                };
                const response = await api.registerForEvent(item.eventoId, registrationData);
                if (response.success) {
                    successfulRegistrations.push(item);
                } else {
                    failedRegistrations.push(item);
                    showMessage(`Error al inscribir a "${item.eventoNombre}": ${response.message}`, 'error');
                }
            } catch (error) {
                failedRegistrations.push(item);
                showMessage(`Error de conexión al inscribir a "${item.eventoNombre}"`, 'error');
            }
        }
        
        if (successfulRegistrations.length > 0) {
            showMessage('¡Todas las inscripciones pagadas con éxito!', 'success');
            cart = [];
            updateCartCount();
            renderCart();
            cartModal.style.display = 'none';
            if (firstEmail) {
                await loadRegistrations(firstEmail);
            }
        } else {
            showMessage('No se pudo completar ninguna de las inscripciones.', 'error');
        }
    } else {
        showMessage('Tu carrito está vacío.', 'error');
    }
});
// Funciones de utilidad y renderizado (sin cambios significativos)
function handleApiError(error, defaultMessage = 'Ha ocurrido un error') {
    console.error('API Error:', error);
    const message = error.message || defaultMessage;
    showMessage(message, 'error');
}

async function loadEvents() {
    try {
        const response = await api.getEvents();
        if (response.success) {
            eventos = response.data;
            renderEventCards();
            populateEventSelect();
        }
    } catch (error) {
        handleApiError(error, 'Error al cargar eventos');
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
                <p><strong>Precio:</strong> S/.${(evento.precio || 0).toFixed(2)}</p>
                <button class="btn-añadir" data-event-id="${evento.id}" data-event-name="${evento.nombre}">+</button>
            </div>
        `;
        eventsContainer.appendChild(card);
    });
    
    // Se llama a la función setupCardButtons para que los listeners se añadan
    setupCardButtons();
}

// Función para conectar las cards con el formulario de inscripción
function setupCardButtons() {
    const cardButtons = document.querySelectorAll('.card .btn-añadir');
    
    cardButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            
            const eventName = button.getAttribute('data-event-name');
            const eventId = button.getAttribute('data-event-id');
            
            // Llama a la función que autocompleta el campo de evento
            autocompleteEventField(eventName, eventId);
        });
    });
}

// Función para autocompletar el campo de evento en el formulario
function autocompleteEventField(eventName, eventId) {
    const eventoInput = document.getElementById('evento');
    if (eventoInput) {
        eventoInput.value = eventName; // Aquí se asigna el nombre del evento
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

// Función para conectar las cards con el formulario de inscripción
function setupCardButtons() {
    const cardButtons = document.querySelectorAll('.card .btn-añadir');
    
    cardButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            
            const eventName = button.getAttribute('data-event-name');
            const eventId = button.getAttribute('data-event-id');
            
            // Llama a la función que autocompleta el campo de evento
            autocompleteEventField(eventName, eventId);
        });
    });
}

function setupCardButtons() {
    const cardButtons = document.querySelectorAll('.card .btn-añadir');
    cardButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const eventName = button.getAttribute('data-event-name');
            const eventId = button.getAttribute('data-event-id');
            
            // Llama a esta función para rellenar el campo del formulario de inscripción//
            autocompleteEventField(eventName, eventId); 
        });
    });
}

function autocompleteEventField(eventName, eventId) {
    const eventoInput = document.getElementById('evento');
    if (eventoInput) {
        // Asigna el nombre del evento al campo de texto//
        eventoInput.value = eventName;
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

function setupCardButtons() {
    const cardButtons = document.querySelectorAll('.card .btn-añadir');
    cardButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const eventName = button.getAttribute('data-event-name');
            const eventoId = button.getAttribute('data-event-id');
            const evento = eventos.find(e => e.id === parseInt(eventoId));
            if (!evento) {
                showMessage('Error: Evento no encontrado', 'error');
                return;
            }
            // Corregido: Ahora se llama a esta función para rellenar el campo
            autocompleteEventField(eventName, eventoId); 
        });
    });
}

function setupCardButtons() {
    const cardButtons = document.querySelectorAll('.card .btn-añadir');
    cardButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const eventName = button.getAttribute('data-event-name');
            const eventoId = button.getAttribute('data-event-id');
            const evento = eventos.find(e => e.id === parseInt(eventoId));
            if (!evento) {
                showMessage('Error: Evento no encontrado', 'error');
                return;
            }
            autocompleteEventField(eventName, eventoId);
        });
    });
}

function autocompleteEventField(eventName, eventId) {
    const eventoInput = document.getElementById('evento');
    if (eventoInput) {
        eventoInput.value = eventName;
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

// Manejo del formulario de inscripción (modificado para interactuar con el carrito)
function setupInscriptionForm() {
    const clienteForm = document.getElementById('cliente-form');
    if (!clienteForm) return;

    clienteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nombre').value.trim();
        const email = document.getElementById('email').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const eventoNombre = document.getElementById('evento').value.trim();

        if (!nombre || !email || !telefono || !eventoNombre) {
            showMessage('Por favor, completa todos los campos', 'error');
            return;
        }

        const evento = eventos.find(e => e.nombre === eventoNombre);
        if (!evento) {
            showMessage('Evento no encontrado. Selecciona un evento de la lista destacada.', 'error');
            return;
        }

        const registrationData = {
            id: Date.now(), // ID temporal para la tabla
            nombre,
            email,
            telefono,
            eventoId: evento.id,
            eventoNombre: evento.nombre,
            precio: parseFloat(evento.precio || 0)
        };

        // Aquí se añade la lógica para actualizar la tabla
        addRegistrationToTable(registrationData);
        showMessage(`Inscripción a "${eventoNombre}" añadida a la tabla.`, 'success');

        // Opcional: para limpiar el formulario después de la inscripción
        clienteForm.reset();
    });
}

// Nueva función para añadir la inscripción a la tabla
function addRegistrationToTable(registration) {
    const tbody = document.querySelector('#tabla-clientes tbody');
    if (!tbody) return;

    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${registration.nombre || 'N/A'}</td>
        <td>${registration.email || 'N/A'}</td>
        <td>${registration.telefono || 'N/A'}</td>
        <td>${registration.eventoNombre || 'N/A'}</td>
        <td>
            <button class="btn-editar" data-id="${registration.id}">Editar</button>
            <button class="btn-eliminar" data-id="${registration.id}">Eliminar</button>
        </td>
    `;
    tbody.appendChild(row);
    // Se vuelven a configurar los botones para las nuevas filas
    setupTableButtons();
}

// Funciones para la tabla de inscripciones//
async function loadRegistrations(email = null) {
    try {
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
        handleApiError(error, 'Error al cargar inscripciones');
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
        const eventoNombre = reg.evento?.nombre || reg.eventoNombre || 'N/A';
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
    setupTableButtons();
}
function setupTableButtons() {
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            await editRegistration(id);
        });
    });
    document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            await deleteRegistration(id);
        });
    });
}

async function editRegistration(id) {
    try {
        const response = await api.getRegistration(id);
        if (!response.success) {
            throw new Error(response.message || 'No se pudo cargar la inscripción');
        }
        const inscripcion = response.data;
        document.getElementById('edit-nombre').value = inscripcion.nombre || '';
        document.getElementById('edit-email').value = inscripcion.email || '';
        document.getElementById('edit-telefono').value = inscripcion.telefono || '';
        const selectEvento = document.getElementById('edit-evento');
        if (selectEvento && eventos.length > 0) {
            const eventoId = inscripcion.eventoId || (inscripcion.evento && inscripcion.evento.id);
            if (eventoId) {
                selectEvento.value = eventoId;
            }
        }
        const modal = document.getElementById('modal-editar');
        if (modal) {
            modal.style.display = 'flex';
            currentEditingId = id;
        } else {
            throw new Error('Modal de edición no encontrado');
        }
    } catch (error) {
        handleApiError(error, 'Error al cargar datos para editar');
    }
}

async function deleteRegistration(id) {
    if (!confirm('¿Estás seguro de eliminar esta inscripción?')) return;
    try {
        const response = await api.deleteRegistration(id);
        if (response.success) {
            showMessage('Inscripción eliminada correctamente', 'success');
            const email = document.getElementById('email')?.value.trim();
            if (email) await loadRegistrations(email);
        } else {
            throw new Error(response.message || 'Error al eliminar');
        }
    } catch (error) {
        handleApiError(error, 'Error al eliminar inscripción');
    }
}
function setupEditModal() {
    const modal = document.getElementById('modal-editar');
    const editForm = document.getElementById('editar-form');
    const cancelButton = document.getElementById('cancelar-edicion');
    if (!modal || !editForm || !cancelButton) {
        return;
    }
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentEditingId) {
            showMessage('Error: No se ha seleccionado inscripción para editar', 'error');
            return;
        }
        const nombre = document.getElementById('edit-nombre').value.trim();
        const email = document.getElementById('edit-email').value.trim();
        const telefono = document.getElementById('edit-telefono').value.trim();
        const eventoId = parseInt(document.getElementById('edit-evento').value);
        if (!nombre || !email || !telefono || !eventoId) {
            showMessage('Por favor, completa todos los campos', 'error');
            return;
        }
        try {
            const updateData = { nombre, email, telefono, eventoId };
            const response = await api.updateRegistration(currentEditingId, updateData);
            if (response.success) {
                showMessage('Inscripción actualizada exitosamente', 'success');
                modal.style.display = 'none';
                currentEditingId = null;
                const currentEmail = document.getElementById('email')?.value.trim();
                if (currentEmail) await loadRegistrations(currentEmail);
            }
        } catch (error) {
            handleApiError(error, 'Error al actualizar inscripción');
        }
    });
    cancelButton.addEventListener('click', () => {
        modal.style.display = 'none';
        currentEditingId = null;
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            currentEditingId = null;
        }
    });
}
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
// Inicialización principal
document.addEventListener('DOMContentLoaded', async () => {
    await loadEvents();
    setupCardButtons();
    setupInscriptionForm();
    setupEditModal();
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
            if (userData.password !== userData.confirmPassword) {
                showMessage('Las contraseñas no coinciden.', 'error');
                return;
            }
            try {
                const response = await api.register(userData);
                showMessage(response.message, 'success');
                TokenManager.set(response.data.token);
                localStorage.setItem('currentUser', JSON.stringify(response.data.user));
                setTimeout(() => { window.location.href = '/eventos'; }, 1500);
            } catch (error) {
                handleApiError(error, 'Error al registrar usuario');
            }
        });
    }
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
                TokenManager.set(response.data.token);
                localStorage.setItem('currentUser', JSON.stringify(response.data.user));
                setTimeout(() => { window.location.href = '/eventos'; }, 1000);
            } catch (error) {
                handleApiError(error, 'Error al iniciar sesión');
            }
        });
    }
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
                setTimeout(() => { window.location.href = '/'; }, 1000);
            });
        }
    });

    cartIcon.addEventListener('click', (e) => {
        e.preventDefault();
        cartModal.style.display = 'flex';
        renderCart();
    });
    closeCartBtn.addEventListener('click', () => {
        cartModal.style.display = 'none';
    });
});

// Estilos CSS
const style = document.createElement('style');
style.textContent = `
    .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); align-items: center; justify-content: center; }
    .modal-content { background-color: #fefefe; padding: 20px; border-radius: 8px; width: 90%; max-width: 500px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .modal-content h2 { margin-top: 0; color: #333; text-align: center; }
    .modal-content form { display: flex; flex-direction: column; gap: 15px; }
    .modal-content input, .modal-content select { padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    .modal-content button { padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
    .modal-content button[type="submit"] { background-color: #28a745; color: white; }
    .modal-content button[type="button"] { background-color: #6c757d; color: white; margin-top: 10px; }
    .btn-editar { background-color: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-right: 5px; }
    .btn-eliminar { background-color: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; }
    .btn-editar:hover { background-color: #0056b3; }
    .btn-eliminar:hover { background-color: #c82333; }
    @keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    #cart-modal { display: none; position: fixed; z-index: 1001; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.4); justify-content: center; align-items: center; }
    .cart-content { background-color: #fefefe; margin: 15% auto; padding: 20px; border: 1px solid #888; width: 80%; max-width: 500px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
    .cart-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px; }
    .cart-header h2 { margin: 0; }
    .cart-close-btn { color: #aaa; font-size: 28px; font-weight: bold; cursor: pointer; }
    .cart-close-btn:hover, .cart-close-btn:focus { color: #000; text-decoration: none; }
    .cart-items ul { list-style: none; padding: 0; }
    .cart-items li { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee; }
    .cart-items li:last-child { border-bottom: none; }
    .cart-total-container { display: flex; justify-content: space-between; font-size: 1.2em; font-weight: bold; margin-top: 15px; padding-top: 10px; border-top: 2px solid #333; }
    .btn-proceder-compra { background-color: #007bff; color: white; border: none; padding: 12px 20px; font-size: 16px; border-radius: 5px; cursor: pointer; width: 100%; margin-top: 15px; }
    .btn-proceder-compra:hover { background-color: #0056b3; }
    #cart-icon { cursor: pointer; position: relative; }
    #cart-count { position: absolute; top: -10px; right: -10px; background-color: red; color: white; border-radius: 50%; padding: 2px 6px; font-size: 12px; }
    .btn-remove-item { background: none; border: none; cursor: pointer; color: red; font-weight: bold; }
`;
document.head.appendChild(style);