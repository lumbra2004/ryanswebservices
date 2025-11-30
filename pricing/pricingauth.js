(function() {
    'use strict';

    async function updateAuthNav() {
        const authNavItem = document.getElementById('authNavItem');
        if (!authNavItem) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (session && session.user) {
                const userEmail = session.user.email;
                const userInitial = userEmail.charAt(0).toUpperCase();

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, full_name')
                    .eq('id', session.user.id)
                    .single();

                const isAdmin = profile?.role === 'admin' || profile?.role === 'owner';
                const displayName = profile?.full_name || userEmail.split('@')[0];

                authNavItem.innerHTML = '<div class="user-menu"><button class="user-button"><span class="user-avatar">' + userInitial + '</span><span class="user-name">' + displayName + '</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button><div class="user-dropdown"><a href="/profile/" class="user-dropdown-item"><span>👤</span> Profile</a><a href="/dashboard/" class="user-dropdown-item"><span>📊</span> Dashboard</a>' + (isAdmin ? '<a href="/admin/" class="user-dropdown-item"><span>⚙️</span> Admin Panel</a>' : '') + '<a href="/messages/" class="user-dropdown-item"><span>💬</span> Messages</a><div style="height: 1px; background: var(--border-secondary); margin: 0.5rem 0;"></div><button onclick="logout()" class="user-dropdown-item" style="width: 100%; border: none; background: none; cursor: pointer; text-align: left; font-size: inherit; font-family: inherit; color: inherit;"><span>🚪</span> Sign Out</button></div></div>';
            } else {
                authNavItem.innerHTML = '<a href="/login/" class="nav-link nav-cta">Get Started</a>';
            }
        } catch (error) {
            console.error('Auth check error:', error);
        }
    }

    window.logout = async function() {
        await supabase.auth.signOut();
        window.location.reload();
    };

    // Defer auth check to not block page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            requestIdleCallback ? requestIdleCallback(updateAuthNav) : setTimeout(updateAuthNav, 0);
        });
    } else {
        requestIdleCallback ? requestIdleCallback(updateAuthNav) : setTimeout(updateAuthNav, 0);
    }
})();
