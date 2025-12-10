// Sidebar functionality
document.addEventListener('DOMContentLoaded', function() {
    // Mobile sidebar toggle (if needed in future)
    const sidebarToggle = document.createElement('button');
    sidebarToggle.innerHTML = '<i class="fas fa-bars"></i>';
    sidebarToggle.className = 'lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-gray-900 text-white rounded-lg flex items-center justify-center';
    sidebarToggle.id = 'sidebarToggle';
    document.body.appendChild(sidebarToggle);
    
    const sidebar = document.getElementById('sidebar');
    
    sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('hidden');
    });
    
    // Close sidebar on mobile when clicking outside
    document.addEventListener('click', function(event) {
        if (window.innerWidth < 1024) {
            if (!sidebar.contains(event.target) && !sidebarToggle.contains(event.target) && !sidebar.classList.contains('hidden')) {
                sidebar.classList.add('hidden');
            }
        }
    });
    
    // Responsive sidebar behavior
    function handleResize() {
        if (window.innerWidth >= 1024) {
            sidebar.classList.remove('hidden');
        } else {
            sidebar.classList.add('hidden');
        }
    }
    
    // Initial check
    handleResize();
    
    // Listen for resize events
    window.addEventListener('resize', handleResize);
});