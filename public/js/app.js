// Global state
let currentUser = null;
let allUsers = [];
let allTeams = [];

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notificationMessage');
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');

// API Base URL
const API_BASE = 'http://localhost:3000/api';

// Page titles mapping
const pageTitles = {
    'dashboardTab': { title: 'Dashboard Overview', subtitle: 'Welcome back, Admin' },
    'teamsTab': { title: 'Teams Management', subtitle: 'Manage all Canva Pro teams and their members' },
    'usersTab': { title: 'Users Management', subtitle: 'Manage all system users and their subscriptions' },
    'addTeamTab': { title: 'Create New Team', subtitle: 'Set up a new Canva Pro team with members and permissions' },
    'addUserTab': { title: 'Add New User', subtitle: 'Add a new user to the Canva Pro management system' },
    'reportsTab': { title: 'Reports & Analytics', subtitle: 'Detailed reports and analytics for your Canva Pro management' },
    'settingsTab': { title: 'System Settings', subtitle: 'Configure system preferences and management options' }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('canvaAdmin');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showDashboard();
        loadDashboardData();
    }
    
    // Event Listeners
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    document.getElementById('backupBtn2').addEventListener('click', handleBackup);
    
    // Setup other event listeners
    setupEventListeners();
});

// Setup all event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // Refresh buttons
    document.getElementById('refreshTeams').addEventListener('click', loadTeams);
    document.getElementById('refreshUsers').addEventListener('click', loadUsers);
    
    // Form submissions
    document.getElementById('addTeamForm').addEventListener('submit', handleAddTeam);
    document.getElementById('addUserForm').addEventListener('submit', handleAddUser);
    document.getElementById('editUserForm').addEventListener('submit', handleEditUser);
    document.getElementById('addMemberForm').addEventListener('submit', handleAddMember);
    
    // Backup and Restore
    document.getElementById('backupBtn').addEventListener('click', handleBackup);
    document.getElementById('restoreBtn').addEventListener('click', function() {
        document.getElementById('restoreFile').click();
    });
    
    document.getElementById('restoreFile').addEventListener('change', handleRestore);
    
    // Modal close buttons
    document.getElementById('closeModal').addEventListener('click', function() {
        document.getElementById('teamModal').classList.add('hidden');
    });
    
    document.getElementById('cancelAddMember').addEventListener('click', function() {
        document.getElementById('addMemberModal').classList.add('hidden');
    });
    
    document.getElementById('cancelEditUser').addEventListener('click', function() {
        document.getElementById('editUserModal').classList.add('hidden');
    });
    
    // Close modals when clicking outside
    document.getElementById('teamModal').addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.add('hidden');
        }
    });
    
    document.getElementById('addMemberModal').addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.add('hidden');
        }
    });
    
    document.getElementById('editUserModal').addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.add('hidden');
        }
    });
    
    // Add member button
    document.getElementById('addMemberBtn').addEventListener('click', async function() {
        const teamId = this.getAttribute('data-team-id');
        
        // Load users for the dropdown
        try {
            const response = await fetch(`${API_BASE}/users`);
            const users = await response.json();
            
            const select = document.getElementById('addMemberUserId');
            select.innerHTML = '<option value="">Choose a user</option>' + 
                users.map(user => `
                    <option value="${user.id}">${user.name} (${user.email})</option>
                `).join('');
            
            // Set team ID in the hidden field
            document.getElementById('addMemberTeamId').value = teamId;
            
            // Show modal
            document.getElementById('addMemberModal').classList.remove('hidden');
        } catch (error) {
            console.error('Error loading users:', error);
            showNotification('Error loading users', 'error');
        }
    });
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('canvaAdmin', JSON.stringify(currentUser));
            showDashboard();
            loadDashboardData();
            showNotification('Login successful! Welcome back.');
        } else {
            showNotification(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Error connecting to server', 'error');
    }
}

// Handle logout
function handleLogout() {
    currentUser = null;
    localStorage.removeItem('canvaAdmin');
    showLoginScreen();
    showNotification('Logged out successfully');
}

// Switch between tabs
function switchTab(tabId) {
    // Update active navigation button
    document.querySelectorAll('.nav-btn').forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('data-tab') === tabId) {
            button.classList.add('active');
        }
    });
    
    // Show active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        if (content.id === tabId) {
            content.classList.add('active');
        }
    });
    
    // Update page title
    if (pageTitles[tabId]) {
        pageTitle.textContent = pageTitles[tabId].title;
        pageSubtitle.textContent = pageTitles[tabId].subtitle;
    }
    
    // Load data for the tab if needed
    if (tabId === 'teamsTab') {
        loadTeams();
    } else if (tabId === 'usersTab') {
        loadUsers();
    } else if (tabId === 'dashboardTab') {
        loadDashboardData();
    } else if (tabId === 'reportsTab') {
        loadReportsData();
    }
    
    // Reset forms if switching away from add/edit tabs
    if (tabId !== 'addTeamTab') {
        document.getElementById('addTeamForm').reset();
        const submitBtn = document.querySelector('#addTeamForm button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-plus-circle mr-2"></i>Create Team';
        document.getElementById('addTeamForm').removeAttribute('data-edit-id');
    }
    
    if (tabId !== 'addUserTab') {
        document.getElementById('addUserForm').reset();
    }
}

// Show login screen
function showLoginScreen() {
    loginScreen.classList.remove('hidden');
    dashboard.classList.add('hidden');
    loginForm.reset();
}

// Show dashboard
function showDashboard() {
    loginScreen.classList.add('hidden');
    dashboard.classList.remove('hidden');
    switchTab('dashboardTab');
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load stats
        const statsResponse = await fetch(`${API_BASE}/stats`);
        const stats = await statsResponse.json();
        renderStats(stats);
        
        // Load recent activity
        const activityResponse = await fetch(`${API_BASE}/recent-activity`);
        const activity = await activityResponse.json();
        renderRecentActivity(activity);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

// Load reports data
async function loadReportsData() {
    try {
        const statsResponse = await fetch(`${API_BASE}/stats`);
        const stats = await statsResponse.json();
        
        // Update report elements
        document.getElementById('paidUsersCount').textContent = stats.paid_users || 0;
        document.getElementById('freeUsersCount').textContent = stats.free_users || 0;
        document.getElementById('activeUsersCount').textContent = stats.active_users || 0;
        document.getElementById('totalRevenue').textContent = `$${(stats.total_revenue || 0).toFixed(2)}`;
        
        // Calculate average revenue
        const avgRevenue = stats.paid_users > 0 ? (stats.total_revenue / stats.paid_users).toFixed(2) : '0.00';
        document.getElementById('avgRevenue').textContent = `$${avgRevenue}`;
        
        // Calculate percentages for bars
        const totalUsers = stats.total_users || 1;
        const paidPercent = ((stats.paid_users || 0) / totalUsers * 100);
        const freePercent = ((stats.free_users || 0) / totalUsers * 100);
        const activePercent = ((stats.active_users || 0) / totalUsers * 100);
        
        document.getElementById('paidUsersBar').style.width = `${paidPercent}%`;
        document.getElementById('freeUsersBar').style.width = `${freePercent}%`;
        document.getElementById('activeUsersBar').style.width = `${activePercent}%`;
        
    } catch (error) {
        console.error('Error loading reports data:', error);
    }
}

// Render stats cards
function renderStats(stats) {
    const statsContainer = document.getElementById('statsContainer');
    
    const statsCards = [
        {
            title: 'Total Users',
            value: stats.total_users,
            icon: 'fa-users',
            color: 'blue',
            change: '+12%',
            gradient: 'from-blue-500 to-cyan-500'
        },
        {
            title: 'Total Teams',
            value: stats.total_teams,
            icon: 'fa-user-friends',
            color: 'green',
            change: '+8%',
            gradient: 'from-green-500 to-emerald-500'
        },
        {
            title: 'Premium Teams',
            value: stats.premium_teams,
            icon: 'fa-crown',
            color: 'yellow',
            change: '+5%',
            gradient: 'from-yellow-500 to-amber-500'
        },
        {
            title: 'Total Revenue',
            value: `$${(stats.total_revenue || 0).toFixed(2)}`,
            icon: 'fa-dollar-sign',
            color: 'purple',
            change: '+18%',
            gradient: 'from-purple-500 to-pink-500'
        }
    ];
    
    statsContainer.innerHTML = statsCards.map(card => `
        <div class="bg-gradient-to-r ${card.gradient} rounded-2xl shadow-lg p-6 text-white">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <p class="text-white/80 text-sm font-medium">${card.title}</p>
                    <p class="text-3xl font-bold mt-2">${card.value}</p>
                </div>
                <div class="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <i class="fas ${card.icon} text-2xl"></i>
                </div>
            </div>
            <p class="text-white/90 text-sm">
                <i class="fas fa-arrow-up mr-1"></i>${card.change} from last month
            </p>
        </div>
    `).join('');
}

// Render recent activity
function renderRecentActivity(activity) {
    const activityContainer = document.getElementById('recentActivity');
    
    if (activity.length === 0) {
        activityContainer.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <i class="fas fa-history text-4xl mb-4"></i>
                <p>No recent activity</p>
            </div>
        `;
        return;
    }
    
    activityContainer.innerHTML = activity.map(item => {
        const icon = item.type === 'team_created' ? 'fa-users' : 'fa-user-plus';
        const color = item.type === 'team_created' ? 'text-blue-500' : 'text-green-500';
        const text = item.type === 'team_created' ? 'Team created' : 'User added';
        
        return `
            <div class="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg transition">
                <div class="w-10 h-10 rounded-full ${color} bg-${color.split('-')[1]}-100 flex items-center justify-center">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="flex-1">
                    <p class="font-medium text-gray-800">${item.name}</p>
                    <p class="text-sm text-gray-500">${text}</p>
                </div>
                <div class="text-sm text-gray-500">
                    ${new Date(item.timestamp).toLocaleDateString()}
                </div>
            </div>
        `;
    }).join('');
}

// Load all teams
async function loadTeams() {
    try {
        const response = await fetch(`${API_BASE}/teams`);
        allTeams = await response.json();
        renderTeams(allTeams);
    } catch (error) {
        console.error('Error loading teams:', error);
        showNotification('Error loading teams', 'error');
    }
}

// Render teams
function renderTeams(teams) {
    const teamsContainer = document.getElementById('teamsContainer');
    
    if (teams.length === 0) {
        teamsContainer.innerHTML = `
            <div class="col-span-full text-center py-16">
                <div class="inline-block p-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl mb-6">
                    <i class="fas fa-users text-6xl text-gray-300"></i>
                </div>
                <h3 class="text-xl font-medium text-gray-700 mb-2">No teams found</h3>
                <p class="text-gray-500 mb-6">Create your first team to get started</p>
                <button class="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition font-medium shadow-lg hover:shadow-xl" onclick="switchTab('addTeamTab')">
                    <i class="fas fa-plus-circle mr-2"></i>Create Team
                </button>
            </div>
        `;
        return;
    }
    
    teamsContainer.innerHTML = teams.map(team => `
        <div class="team-card bg-white rounded-2xl shadow-lg overflow-hidden">
            <div class="p-6">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <div class="flex items-center mb-2">
                            <h3 class="text-xl font-bold text-gray-800 mr-3">${team.name}</h3>
                            <span class="plan-badge plan-${team.plan}">${team.plan}</span>
                        </div>
                        <p class="text-gray-600 text-sm mb-2">
                            <i class="fas fa-envelope mr-2 text-gray-400"></i>${team.email || 'No email'}
                        </p>
                        <p class="text-gray-600 text-sm">${team.description || 'No description provided'}</p>
                    </div>
                    <span class="status-badge status-${team.status}">${team.status}</span>
                </div>
                
                <div class="grid grid-cols-3 gap-4 mb-6">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-amber-600">${team.owner_count || 0}</div>
                        <div class="text-xs text-gray-500">Owners</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-blue-600">${team.admin_count || 0}</div>
                        <div class="text-xs text-gray-500">Admins</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-gray-600">${team.user_count || 0}</div>
                        <div class="text-xs text-gray-500">Users</div>
                    </div>
                </div>
                
                <div class="flex space-x-3">
                    <button class="view-team-btn flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition font-medium" data-id="${team.id}">
                        <i class="fas fa-eye mr-2"></i>View Details
                    </button>
                    <button class="edit-team-btn px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition" data-id="${team.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-team-btn px-4 py-2.5 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition" data-id="${team.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            
            <div class="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
                <i class="fas fa-calendar-alt mr-2"></i>
                Created ${new Date(team.created_at).toLocaleDateString()}
                <span class="mx-2">•</span>
                <i class="fas fa-users mr-2"></i>
                ${team.member_count || 0} total members
            </div>
        </div>
    `).join('');
    
    // Add event listeners
    document.querySelectorAll('.view-team-btn').forEach(button => {
        button.addEventListener('click', function() {
            const teamId = this.getAttribute('data-id');
            viewTeamDetails(teamId);
        });
    });
    
    document.querySelectorAll('.edit-team-btn').forEach(button => {
        button.addEventListener('click', function() {
            const teamId = this.getAttribute('data-id');
            editTeam(teamId);
        });
    });
    
    document.querySelectorAll('.delete-team-btn').forEach(button => {
        button.addEventListener('click', function() {
            const teamId = this.getAttribute('data-id');
            deleteTeam(teamId);
        });
    });
}

// View team details
async function viewTeamDetails(teamId) {
    try {
        const response = await fetch(`${API_BASE}/teams/${teamId}`);
        const team = await response.json();
        
        // Update modal content
        document.getElementById('modalTeamName').textContent = team.name;
        document.getElementById('modalTeamEmail').textContent = team.email || 'No email provided';
        document.getElementById('modalTeamPlan').textContent = team.plan.charAt(0).toUpperCase() + team.plan.slice(1);
        document.getElementById('modalTeamMembers').textContent = team.members ? team.members.length : 0;
        document.getElementById('modalTeamCreated').textContent = new Date(team.created_at).toLocaleDateString();
        document.getElementById('modalTeamDescription').textContent = team.description || 'No description provided';
        
        // Set team ID for add member button
        document.getElementById('addMemberBtn').setAttribute('data-team-id', team.id);
        
        // Render team members
        const membersList = document.getElementById('modalMembersList');
        if (team.members && team.members.length > 0) {
            membersList.innerHTML = team.members.map(member => `
                <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                    <div class="flex items-center">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold mr-4">
                            ${member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h4 class="font-medium text-gray-800">${member.name}</h4>
                            <p class="text-sm text-gray-600">${member.email}</p>
                        </div>
                    </div>
                    
                    <div class="flex items-center space-x-3">
                        <select class="member-role-select px-3 py-1.5 border border-gray-300 rounded-lg text-sm" data-user-id="${member.id}" data-team-id="${team.id}">
                            <option value="user" ${member.role === 'user' ? 'selected' : ''}>User</option>
                            <option value="admin" ${member.role === 'admin' ? 'selected' : ''}>Admin</option>
                            <option value="owner" ${member.role === 'owner' ? 'selected' : ''}>Owner</option>
                        </select>
                        
                        <button class="remove-member-btn px-3 py-1.5 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition text-sm" data-user-id="${member.id}" data-team-id="${team.id}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `).join('');
            
            // Add event listeners for role changes
            document.querySelectorAll('.member-role-select').forEach(select => {
                select.addEventListener('change', function() {
                    const userId = this.getAttribute('data-user-id');
                    const teamId = this.getAttribute('data-team-id');
                    const newRole = this.value;
                    updateUserRole(teamId, userId, newRole);
                });
            });
            
            // Add event listeners for remove member buttons
            document.querySelectorAll('.remove-member-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const userId = this.getAttribute('data-user-id');
                    const teamId = this.getAttribute('data-team-id');
                    removeMemberFromTeam(teamId, userId);
                });
            });
        } else {
            membersList.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-users text-4xl mb-4"></i>
                    <p>No members in this team</p>
                </div>
            `;
        }
        
        // Show modal
        document.getElementById('teamModal').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading team details:', error);
        showNotification('Error loading team details', 'error');
    }
}

// Edit team
async function editTeam(teamId) {
    try {
        const response = await fetch(`${API_BASE}/teams/${teamId}`);
        const team = await response.json();
        
        // Switch to add team tab and populate form
        switchTab('addTeamTab');
        
        // Populate form with team data
        document.getElementById('teamName').value = team.name;
        document.getElementById('teamEmail').value = team.email || '';
        document.getElementById('teamDescription').value = team.description || '';
        document.getElementById('teamPlan').value = team.plan;
        document.getElementById('teamStatus').value = team.status;
        
        // Change form to update mode
        const form = document.getElementById('addTeamForm');
        form.setAttribute('data-edit-id', teamId);
        
        // Change submit button text
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Update Team';
        
        // Update page title
        pageTitle.textContent = 'Edit Team';
        pageSubtitle.textContent = `Update details for ${team.name}`;
        
    } catch (error) {
        console.error('Error loading team for edit:', error);
        showNotification('Error loading team details', 'error');
    }
}

// Delete team
async function deleteTeam(teamId) {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/teams/${teamId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Team deleted successfully');
            loadTeams(); // Refresh teams list
        } else {
            showNotification(data.error || 'Error deleting team', 'error');
        }
    } catch (error) {
        console.error('Error deleting team:', error);
        showNotification('Error deleting team', 'error');
    }
}

// Load all users
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/users`);
        allUsers = await response.json();
        renderUsers(allUsers);
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Error loading users', 'error');
    }
}

// Render users table
function renderUsers(users) {
    const usersTableBody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-12 text-center">
                    <div class="inline-block p-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl mb-6">
                        <i class="fas fa-user-friends text-6xl text-gray-300"></i>
                    </div>
                    <h3 class="text-xl font-medium text-gray-700 mb-2">No users found</h3>
                    <p class="text-gray-500 mb-6">Add your first user to get started</p>
                    <button class="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition font-medium shadow-lg hover:shadow-xl" onclick="switchTab('addUserTab')">
                        <i class="fas fa-user-plus mr-2"></i>Add User
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    usersTableBody.innerHTML = users.map(user => {
        const subscriptionType = user.subscription_type || 'free';
        const amountPaid = user.amount_paid ? `$${parseFloat(user.amount_paid).toFixed(2)}` : '$0.00';
        const issueDate = user.issue_date ? new Date(user.issue_date).toLocaleDateString() : 'Not set';
        const expiryDate = user.expiry_date ? new Date(user.expiry_date).toLocaleDateString() : 'Not set';
        
        return `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold mr-3">
                            ${user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="font-medium text-gray-900">${user.name}</div>
                            <div class="text-sm text-gray-500">${user.email}</div>
                            <div class="text-xs text-gray-400 mt-1">Ref: ${user.reference || 'N/A'}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="space-y-1">
                        <div>
                            <span class="subscription-badge subscription-${subscriptionType}">${subscriptionType}</span>
                        </div>
                        <div class="text-sm text-gray-700">${amountPaid}</div>
                        <div class="text-xs text-gray-500">
                            ${issueDate} - ${expiryDate}
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <span class="status-badge status-${user.status}">${user.status}</span>
                </td>
                <td class="px-6 py-4">
                    <div class="text-gray-900">${user.team_names ? user.team_names.split(',').slice(0, 2).join(', ') : 'No teams'}</div>
                    <div class="text-gray-500 text-sm">${user.roles ? user.roles.split(',').length : 0} roles</div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex space-x-2">
                        <button class="edit-user-btn px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition text-sm font-medium" data-id="${user.id}">
                            <i class="fas fa-edit mr-1"></i>Edit
                        </button>
                        <button class="delete-user-btn px-3 py-1.5 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition text-sm font-medium" data-id="${user.id}">
                            <i class="fas fa-trash mr-1"></i>Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners
    document.querySelectorAll('.edit-user-btn').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.getAttribute('data-id');
            editUser(userId);
        });
    });
    
    document.querySelectorAll('.delete-user-btn').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.getAttribute('data-id');
            deleteUser(userId);
        });
    });
}

// Edit user - FIXED: Load user data for editing
async function editUser(userId) {
    try {
        const response = await fetch(`${API_BASE}/users/${userId}`);
        const user = await response.json();
        
        // Populate edit form
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editUserName').value = user.name;
        document.getElementById('editUserEmail').value = user.email;
        document.getElementById('editUserReference').value = user.reference || '';
        document.getElementById('editUserSubscriptionType').value = user.subscription_type || 'free';
        document.getElementById('editUserAmountPaid').value = user.amount_paid || '0.00';
        document.getElementById('editUserIssueDate').value = user.issue_date || '';
        document.getElementById('editUserExpiryDate').value = user.expiry_date || '';
        document.getElementById('editUserStatus').value = user.status || 'active';
        
        // Show modal
        document.getElementById('editUserModal').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading user for edit:', error);
        showNotification('Error loading user details', 'error');
    }
}

// Delete user
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/users/${userId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('User deleted successfully');
            loadUsers(); // Refresh users list
        } else {
            showNotification(data.error || 'Error deleting user', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Error deleting user', 'error');
    }
}

// Handle add team form submission
async function handleAddTeam(e) {
    e.preventDefault();
    
    const teamId = e.target.getAttribute('data-edit-id');
    const isEdit = !!teamId;
    
    const teamData = {
        name: document.getElementById('teamName').value,
        email: document.getElementById('teamEmail').value,
        description: document.getElementById('teamDescription').value,
        plan: document.getElementById('teamPlan').value,
        status: document.getElementById('teamStatus').value
    };
    
    try {
        const url = isEdit ? `${API_BASE}/teams/${teamId}` : `${API_BASE}/teams`;
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(teamData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(isEdit ? 'Team updated successfully' : 'Team created successfully');
            
            // Reset form
            e.target.reset();
            e.target.removeAttribute('data-edit-id');
            
            // Change submit button back to "Create Team" if it was an edit
            const submitBtn = e.target.querySelector('button[type="submit"]');
            if (isEdit) {
                submitBtn.innerHTML = '<i class="fas fa-plus-circle mr-2"></i>Create Team';
            }
            
            // Refresh teams list and switch to teams tab
            loadTeams();
            switchTab('teamsTab');
        } else {
            showNotification(data.error || 'Error saving team', 'error');
        }
    } catch (error) {
        console.error('Error saving team:', error);
        showNotification('Error saving team', 'error');
    }
}

// Handle add user form submission
async function handleAddUser(e) {
    e.preventDefault();
    
    const userData = {
        name: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        reference: document.getElementById('userReference').value,
        status: document.getElementById('userStatus').value,
        subscription_type: document.getElementById('userSubscriptionType').value,
        amount_paid: document.getElementById('userAmountPaid').value || 0,
        issue_date: document.getElementById('userIssueDate').value,
        expiry_date: document.getElementById('userExpiryDate').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('User added successfully');
            
            // Reset form
            e.target.reset();
            
            // Refresh users list and switch to users tab
            loadUsers();
            switchTab('usersTab');
        } else {
            showNotification(data.error || 'Error adding user', 'error');
        }
    } catch (error) {
        console.error('Error adding user:', error);
        showNotification('Error adding user', 'error');
    }
}

// Handle edit user form submission - FIXED: Proper update with email check
async function handleEditUser(e) {
    e.preventDefault();
    
    const userId = document.getElementById('editUserId').value;
    
    const userData = {
        name: document.getElementById('editUserName').value,
        email: document.getElementById('editUserEmail').value,
        reference: document.getElementById('editUserReference').value,
        status: document.getElementById('editUserStatus').value,
        subscription_type: document.getElementById('editUserSubscriptionType').value,
        amount_paid: document.getElementById('editUserAmountPaid').value || 0,
        issue_date: document.getElementById('editUserIssueDate').value,
        expiry_date: document.getElementById('editUserExpiryDate').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('User updated successfully');
            
            // Close modal
            document.getElementById('editUserModal').classList.add('hidden');
            
            // Refresh users list
            loadUsers();
        } else {
            showNotification(data.error || 'Error updating user', 'error');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        showNotification('Error updating user', 'error');
    }
}

// Handle backup
async function handleBackup() {
    try {
        const response = await fetch(`${API_BASE}/backup`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `canva-backup-${Date.now()}.db`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showNotification('Backup created and downloaded successfully');
        } else {
            showNotification('Error creating backup', 'error');
        }
    } catch (error) {
        console.error('Error creating backup:', error);
        showNotification('Error creating backup', 'error');
    }
}

// Handle restore
async function handleRestore(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!confirm('Are you sure you want to restore from this backup? All current data will be replaced.')) {
        e.target.value = '';
        return;
    }
    
    const formData = new FormData();
    formData.append('database', file);
    
    try {
        const response = await fetch(`${API_BASE}/restore`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Database restored successfully');
            
            // Reload all data
            loadDashboardData();
            loadTeams();
            loadUsers();
            loadReportsData();
        } else {
            showNotification(data.error || 'Error restoring database', 'error');
        }
    } catch (error) {
        console.error('Error restoring database:', error);
        showNotification('Error restoring database', 'error');
    }
    
    // Reset file input
    e.target.value = '';
}

// Update user role in team
async function updateUserRole(teamId, userId, role) {
    try {
        const response = await fetch(`${API_BASE}/teams/${teamId}/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ role })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('User role updated successfully');
            // Refresh team details
            viewTeamDetails(teamId);
        } else {
            showNotification(data.error || 'Error updating user role', 'error');
        }
    } catch (error) {
        console.error('Error updating user role:', error);
        showNotification('Error updating user role', 'error');
    }
}

// Remove member from team
async function removeMemberFromTeam(teamId, userId) {
    if (!confirm('Are you sure you want to remove this user from the team?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/teams/${teamId}/users/${userId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('User removed from team successfully');
            // Refresh team details
            viewTeamDetails(teamId);
        } else {
            showNotification(data.error || 'Error removing user from team', 'error');
        }
    } catch (error) {
        console.error('Error removing user from team:', error);
        showNotification('Error removing user from team', 'error');
    }
}

// Handle add member form submission
async function handleAddMember(e) {
    e.preventDefault();
    
    const teamId = document.getElementById('addMemberTeamId').value;
    const userId = document.getElementById('addMemberUserId').value;
    const role = document.getElementById('addMemberRole').value;
    
    try {
        const response = await fetch(`${API_BASE}/teams/${teamId}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId, role })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('User added to team successfully');
            
            // Close modal and reset form
            document.getElementById('addMemberModal').classList.add('hidden');
            e.target.reset();
            
            // Refresh team details
            viewTeamDetails(teamId);
        } else {
            showNotification(data.error || 'Error adding user to team', 'error');
        }
    } catch (error) {
        console.error('Error adding user to team:', error);
        showNotification('Error adding user to team', 'error');
    }
}

// Show notification
function showNotification(message, type = 'success') {
    notificationMessage.textContent = message;
    
    // Set color based on type
    notification.className = 'fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-xl hidden transform transition-transform duration-300 translate-y-10 z-50';
    
    if (type === 'error') {
        notification.classList.add('bg-gradient-to-r', 'from-red-500', 'to-pink-600', 'text-white');
    } else if (type === 'warning') {
        notification.classList.add('bg-gradient-to-r', 'from-yellow-500', 'to-amber-600', 'text-white');
    } else {
        notification.classList.add('bg-gradient-to-r', 'from-green-500', 'to-emerald-600', 'text-white');
    }
    
    // Show notification
    notification.classList.remove('hidden', 'translate-y-10');
    notification.classList.add('translate-y-0');
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('translate-y-0');
        notification.classList.add('translate-y-10');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 300);
    }, 3000);
}
