document.addEventListener('DOMContentLoaded', () => {

    // --- STATE MANAGEMENT ---
    let state = {
        currentPage: 'home-page',
        currentUser: null,
        loginTarget: '', // 'user' or 'admin'
        users: [],
        complaints: []
    };

    const adminCredentials = {
        email: 'rajeshk@akshayapatra.org',
        password: 'kulfi@123'
    };

    // --- DOM ELEMENTS ---
    const pages = document.querySelectorAll('.page');
    const addComplaintBtn = document.getElementById('add-complaint-btn');
    const manageComplaintsBtn = document.getElementById('manage-complaints-btn');
    const authForm = document.getElementById('auth-form');
    const loginTitle = document.getElementById('login-title');
    const registerLinkContainer = document.getElementById('register-link-container');
    const showRegisterFormLink = document.getElementById('show-register-form');
    const loginSubmitBtn = document.getElementById('login-submit-btn');
    const authError = document.getElementById('auth-error');
    const sectionCards = document.querySelectorAll('.section-card');
    const complaintForm = document.getElementById('complaint-form');
    const complaintFormTitle = document.getElementById('complaint-form-title');
    const backBtns = document.querySelectorAll('.back-btn');
    const pendingContainer = document.getElementById('pending-complaints');
    const resolvedContainer = document.getElementById('resolved-complaints');
    const modal = document.getElementById('complaint-detail-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const ongoingContainer = document.getElementById('ongoing-complaints');
    const pendingCount = document.getElementById('pending-count');
    const ongoingCount = document.getElementById('ongoing-count');
    const resolvedCount = document.getElementById('resolved-count');

    // --- DATA PERSISTENCE (localStorage) ---
    function saveData() {
        localStorage.setItem('appState', JSON.stringify({
            users: state.users,
            complaints: state.complaints
        }));
    }

    function loadData() {
        const savedState = JSON.parse(localStorage.getItem('appState'));
        if (savedState) {
            state.users = savedState.users || [];
            state.complaints = savedState.complaints || [];
        } else {
             // No default complaints or users
            state.complaints = [];
            state.users = [];
            saveData();
        }
    }

    // --- NAVIGATION ---
    function showPage(pageId) {
        state.currentPage = pageId;
        pages.forEach(page => {
            page.classList.toggle('hidden', page.id !== pageId);
        });
        // Special rendering for pages that need it
        if (pageId === 'admin-dashboard-page') {
            renderAdminDashboard();
        }
    }

    // --- RENDERING ---
    function renderAdminDashboard() {
        pendingContainer.innerHTML = '';
        ongoingContainer.innerHTML = '';
        resolvedContainer.innerHTML = '';

        let pending = 0, ongoing = 0, resolved = 0;

        // Sort complaints so latest (highest id) comes first
        const sortedComplaints = [...state.complaints].sort((a, b) => b.id - a.id);

        sortedComplaints.forEach(c => {
            const card = document.createElement('div');
            card.className = 'complaint-card';
            card.dataset.id = c.id;
            card.innerHTML = `
                <h4>${c.appliance}</h4>
                <p><strong>Name:</strong> ${c.name || ''}</p>
                <p><strong>Mobile No:</strong> ${c.mobile || ''}</p>
                <p>Section: ${c.section}</p>
                <p>Date: ${c.date}</p>
                <p class="admin-description"><strong>Description:</strong> ${truncateWords(c.description, 150)}</p>
                <p>Status: <strong>${c.status.charAt(0).toUpperCase() + c.status.slice(1)}</strong></p>
                ${c.status === 'pending' ? '<button class="start-ongoing-btn">Start</button>' : ''}
                ${c.status === 'ongoing' ? '<button class="mark-complete-btn">Resolve</button>' : ''}
                ${c.status === 'resolved' ? '<button class="reopen-btn">Reopen</button> <button class="delete-btn">Delete</button>' : ''}
            `;
            card.addEventListener('click', (e) => {
                if(e.target.tagName !== 'BUTTON'){
                    showComplaintDetails(c.id);
                }
            });
            if (c.status === 'pending') {
                pending++;
                const startBtn = card.querySelector('.start-ongoing-btn');
                startBtn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    markComplaintOngoing(c.id);
                });
                pendingContainer.appendChild(card);
            } else if (c.status === 'ongoing') {
                ongoing++;
                const completeBtn = card.querySelector('.mark-complete-btn');
                completeBtn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    markComplaintComplete(c.id);
                });
                ongoingContainer.appendChild(card);
            } else if (c.status === 'resolved') {
                resolved++;
                const reopenBtn = card.querySelector('.reopen-btn');
                reopenBtn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    reopenComplaint(c.id);
                });
                const deleteBtn = card.querySelector('.delete-btn');
                deleteBtn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    deleteComplaint(c.id);
                });
                resolvedContainer.appendChild(card);
            }
        });
        pendingCount.textContent = pending;
        ongoingCount.textContent = ongoing;
        resolvedCount.textContent = resolved;
    }

    // --- ACTIONS ---
    function markComplaintOngoing(complaintId) {
        const complaint = state.complaints.find(c => c.id === complaintId);
        if (complaint) {
            complaint.status = 'ongoing';
            saveData();
            renderAdminDashboard();
        }
    }

    function markComplaintComplete(complaintId) {
        const complaint = state.complaints.find(c => c.id === complaintId);
        if (complaint) {
            complaint.status = 'resolved';
            saveData();
            // Send to Google Sheets
            fetch('https://script.google.com/macros/s/AKfycbyVjiwfXVYE5P9sqEZAovcruWV_q8-0yvWqJsJLd5qoKT0q9yeFSOAHDYJeTO-f3c-YiQ/exec', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(complaint)
            })
            .then(res => res.text())
            .then(data => {
                // Optionally, show a message or log
                console.log('Complaint sent to Google Sheets:', data);
            })
            .catch(err => {
                console.error('Failed to send to Google Sheets:', err);
            });
            renderAdminDashboard();
        }
    }

    function reopenComplaint(complaintId) {
        const complaint = state.complaints.find(c => c.id === complaintId);
        if (complaint) {
            complaint.status = 'pending';
            saveData();
            renderAdminDashboard();
        }
    }

    function showComplaintDetails(complaintId) {
        const complaint = state.complaints.find(c => c.id === complaintId);
        if(complaint) {
            document.getElementById('modal-name').textContent = complaint.name || '';
            document.getElementById('modal-mobile').textContent = complaint.mobile || '';
            document.getElementById('modal-appliance').textContent = complaint.appliance;
            document.getElementById('modal-description').textContent = complaint.description;
            document.getElementById('modal-date').textContent = complaint.date;
            modal.classList.remove('hidden');
        }
    }

    // --- EVENT LISTENERS ---

    // Home Page
    addComplaintBtn.addEventListener('click', () => {
        showPage('user-dashboard-page');
    });

    manageComplaintsBtn.addEventListener('click', () => {
        state.loginTarget = 'admin';
        loginTitle.textContent = 'Admin Login';
        showPage('login-page');
    });

    // Admin Login Page
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        authError.textContent = '';
        if (email === adminCredentials.email && password === adminCredentials.password) {
            showPage('admin-dashboard-page');
        } else {
            authError.textContent = 'Invalid admin credentials.';
        }
    });

    // Back Buttons / Logout
    backBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.target === 'home-page') {
                state.currentUser = null;
            }
            showPage(btn.dataset.target);
        });
    });
    
    // User Dashboard Sections
    sectionCards.forEach(card => {
        card.addEventListener('click', () => {
            const section = card.dataset.section;
            complaintFormTitle.textContent = `New Complaint: ${section}`;
            complaintForm.dataset.section = section;
            showPage('complaint-form-page');
        });
    });

    // Complaint Form
    complaintForm.addEventListener("submit", async function(e) {
        e.preventDefault();

        // Get form values
        const name = document.getElementById('complainant-name').value.trim();
        const mobile = document.getElementById('complainant-mobile').value.trim();
        const appliance = document.getElementById('appliance-name').value.trim();
        const description = document.getElementById('problem-description').value.trim();
        const section = complaintForm.dataset.section || '';
        const date = new Date().toISOString().slice(0, 10);
        let image = null;

        // Handle image upload as base64 (optional)
        const imageInput = document.getElementById('problem-image');
        if (imageInput.files && imageInput.files[0]) {
            const file = imageInput.files[0];
            image = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        // Add complaint to state
        const newComplaint = {
            id: Date.now(),
            name,
            mobile,
            appliance,
            description,
            image,
            section,
            date,
            status: 'pending'
        };
        state.complaints.push(newComplaint);
        saveData();
        // Send new complaint to Google Sheets
        fetch('https://script.google.com/macros/s/AKfycbyVjiwfXVYE5P9sqEZAovcruWV_q8-0yvWqJsJLd5qoKT0q9yeFSOAHDYJeTO-f3c-YiQ/exec', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
        },
    body: JSON.stringify(newComplaint)
})
.then(res => res.json())
.then(data => {
    console.log('Complaint submitted to Google Sheets:', data);
    alert("Complaint submitted and sent to Google Sheets!");
})
.catch(err => {
    console.error('Error submitting to Google Sheets:', err);
    alert("Complaint saved locally, but failed to send to Google Sheets.");
});

        
        alert("Complaint submitted successfully!");
        complaintForm.reset();
        showPage('home-page');
    });
    
    // Modal
    modalCloseBtn.addEventListener('click', () => modal.classList.add('hidden'));

    fetch('https://script.google.com/macros/s/AKfycbyVjiwfXVYE5P9sqEZAovcruWV_q8-0yvWqJsJLd5qoKT0q9yeFSOAHDYJeTO-f3c-YiQ/exec')
  .then(res => res.json())
  .then(data => {
      state.complaints = data;
      showPage('home-page');
  })
  .catch(err => {
      console.error("Error loading complaints:", err);
      showPage('home-page');
  });


    function deleteComplaint(complaintId) {
        state.complaints = state.complaints.filter(c => c.id !== complaintId);
        saveData();
        renderAdminDashboard();
    }

    function fetchComplaintsFromSheet() {
        fetch('https://script.google.com/macros/s/AKfycbzo3iVZA4Q7K9mVXcMeE-RwBwTF6_PzpxFf_wRewsrYGk1HePg0d-0LQzhFxRDrABzPWA/exec')
            .then(response => response.json())
            .then(data => {
                state.complaints = data;
                renderAdminDashboard();
            })
            .catch(err => {
                console.error('Failed to fetch complaints:', err);
            });
    }
});

function truncateWords(str, maxWords) {
    if (!str) return '';
    const words = str.split(/\s+/);
    if (words.length <= maxWords) return str;
    return words.slice(0, maxWords).join(' ') + '...';
}
