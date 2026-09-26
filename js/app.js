// Shared by the main app and the rollout UI layer below.
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[character]));
}

// LIVE STARTUP MATCH DECK
        // Startups publish their profile through "My Startup".
        // Investors then see those published profiles in the swipe deck.
        let currentProfileIndex = 0;
        let matchProfiles = [];
        let activeMessageRecipientId = '';
        let refreshInProgress = false;
        let unsubscribeFromRealtime = null;

        function getRegisteredStartups() {
            try { return JSON.parse(localStorage.getItem('cslid_startups') || '[]'); }
            catch(e) { return []; }
        }

        function saveRegisteredStartups(list) {
            localStorage.setItem('cslid_startups', JSON.stringify(list));
        }

        function refreshMatchProfiles() {
            const startups = getRegisteredStartups();
            matchProfiles = startups.filter(s => s.isPublic !== false).map(s => ({
                id: s.id,
                name: s.name,
                tagline: s.tagline,
                image: s.image || "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=600",
                badge: "Startup",
                stage: s.stage || "Early Stage",
                location: s.location || "Location not provided",
                seeking: s.seeking || "Funding details available",
                traction: s.traction || "Early stage",
                bio: s.problem || "Startup profile",
                tags: s.tags || (s.sector ? [s.sector] : []),
                contactUrl: s.contactUrl
            }));
            if (currentProfileIndex >= matchProfiles.length) currentProfileIndex = 0;
            renderCard();
        }

        // All feed and directory records come from Supabase.
        const feedPosts = [];
        let directoryStartups = [];

        // Tab Switching Logic
        function switchTab(tabId) {
            const role = getStore('cslid_user', {}).role;
            if (tabId === 'match' && role === 'founder') {
                showToast('Match Deck is available to investor accounts.');
                tabId = 'connections';
            }
            document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
            document.getElementById(`tab-${tabId}`).classList.remove('hidden');

            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.className = "nav-btn px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center space-x-2 text-gray-400 hover:text-white hover:bg-gray-800/50";
            });
            const activeBtn = document.getElementById(`nav-btn-${tabId}`);
            if(activeBtn) {
                activeBtn.className = "nav-btn px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center space-x-2 bg-indigo-600 text-white shadow-md shadow-indigo-600/30";
            }
            if (tabId === 'connections' && typeof window.renderConnections === 'function') {
                window.renderConnections();
            }
        }

        window.openRoleHome = function() {
            const role = getStore('cslid_user', {}).role;
            switchTab(role === 'founder' ? 'connections' : 'match');
        };

        // Subtool Toggle Logic
        function switchToolSub(subId) {
            document.querySelectorAll('.subtool-content').forEach(el => el.classList.add('hidden'));
            document.getElementById(`subtool-${subId}`).classList.remove('hidden');

            document.querySelectorAll('.tool-sub-btn').forEach(btn => {
                btn.className = "tool-sub-btn px-5 py-2 rounded-xl text-xs font-bold transition bg-gray-800 text-gray-400 hover:text-white";
            });
            document.getElementById(`tool-btn-${subId}`).className = "tool-sub-btn px-5 py-2 rounded-xl text-xs font-bold transition bg-indigo-600 text-white shadow-md";
        }

        // LIVE STARTUP SWIPE DECK
        function renderCard() {
            if (!matchProfiles.length) {
                document.getElementById('card-badge').innerText = "Waiting for startups";
                document.getElementById('card-stage').innerText = "LIVE";
                document.getElementById('card-name').innerText = "No startup profiles yet";
                document.getElementById('card-tagline').innerText = "Published startups will appear here automatically.";
                document.getElementById('card-location').innerText = "—";
                document.getElementById('card-seeking').innerText = "—";
                document.getElementById('card-traction').innerText = "—";
                document.getElementById('card-bio').innerText = "Open Launch Center → My Startup and publish a startup profile. Investors can then swipe through registered startups.";
                document.getElementById('card-tags').innerHTML = '';
                return;
            }

            const profile = matchProfiles[currentProfileIndex];
            document.getElementById('card-badge').innerText = profile.badge;
            document.getElementById('card-stage').innerText = profile.stage;
            document.getElementById('card-name').innerText = profile.name;
            document.getElementById('card-tagline').innerText = profile.tagline;
            document.getElementById('card-location').innerText = profile.location;
            document.getElementById('card-seeking').innerText = profile.seeking;
            document.getElementById('card-traction').innerText = profile.traction;
            document.getElementById('card-bio').innerText = profile.bio;
            document.getElementById('card-tags').innerHTML =
                profile.tags.map(t => `<span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gray-800/80 border border-gray-700 text-indigo-300">#${escapeHtml(t)}</span>`).join('');
        }

        let matchedProfile = null;

        function handleSwipe(action) {
            if (getStore('cslid_user', {}).role !== 'investor') {
                showToast('The match deck is for investor accounts.');
                return;
            }
            if (!matchProfiles.length) {
                showToast('No registered startups are available yet.');
                return;
            }

            const profile = matchProfiles[currentProfileIndex];
            const card = document.getElementById('active-card');
            card.style.transform = action === 'pass'
                ? 'translateX(-120%) rotate(-20deg)'
                : 'translateX(120%) rotate(20deg)';
            card.style.opacity = '0';

            setTimeout(async () => {
                card.style.transform = 'none';
                card.style.opacity = '1';

                if (action === 'like' || action === 'super') {
                    if (!profile.id) {
                        showToast('This startup cannot receive a connection request yet.');
                    } else if (await connectPersistently(profile.id)) {
                        openMatchModal(profile);
                    }
                }

                currentProfileIndex = (currentProfileIndex + 1) % matchProfiles.length;
                renderCard();
            }, 300);
        }

        // Render Feed Posts
        function renderFeed() {
            const container = document.getElementById('posts-container');
            container.innerHTML = feedPosts.map(post => `
                <div class="glass p-5 rounded-3xl border border-gray-800 space-y-4 shadow-xl">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400" aria-label="Author"><i class="fa-solid fa-user"></i></div>
                            <div>
                                <h4 class="text-sm font-bold text-white">${escapeHtml(post.author)}</h4>
                                <p class="text-[10px] text-indigo-400 font-semibold">${escapeHtml(post.role)} • ${escapeHtml(post.post_time || post.time || '')}</p>
                            </div>
                        </div>
                        <button class="text-gray-500 hover:text-white"><i class="fa-solid fa-ellipsis"></i></button>
                    </div>
                    <p class="text-sm text-gray-300 leading-relaxed">${escapeHtml(post.content)}</p>
                    ${post.image ? `<div class="rounded-2xl overflow-hidden border border-gray-800 max-h-72"><img src="${escapeHtml(post.image)}" class="w-full h-full object-cover"></div>` : ''}
                    <div class="flex flex-wrap gap-1.5">
                        ${(post.tags || []).map(t => `<span class="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400">#${escapeHtml(t)}</span>`).join('')}
                    </div>
                    <div class="flex items-center justify-between pt-3 border-t border-gray-800/80 text-xs text-gray-400">
                        <button class="flex items-center space-x-1.5 hover:text-pink-400 transition"><i class="fa-regular fa-heart"></i><span>${post.likes}</span></button>
                        <button class="flex items-center space-x-1.5 hover:text-indigo-400 transition"><i class="fa-regular fa-comment"></i><span>${post.comments}</span></button>
                        <button class="flex items-center space-x-1.5 hover:text-emerald-400 transition"><i class="fa-solid fa-share"></i><span>Share</span></button>
                    </div>
                </div>
            `).join('');
        }

        // Render Directory
        function filterDirectory(sector) {
            document.querySelectorAll('.dir-filter').forEach(btn => {
                btn.className = "dir-filter px-4 py-2 rounded-xl text-xs font-bold bg-gray-800 text-gray-400 hover:text-white whitespace-nowrap";
            });
            const active = (typeof event !== 'undefined' && event && event.target) ? event.target : document.querySelector(`.dir-filter[onclick="filterDirectory('${sector}')"]`);
            if(active) active.className = "dir-filter px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white whitespace-nowrap";

            const filtered = sector === 'all' ? directoryStartups : directoryStartups.filter(s => s.sector === sector);
            const currentUser = getStore('cslid_user', {});
            const grid = document.getElementById('directory-grid');
            grid.innerHTML = filtered.map(s => `
                <div data-user-id="${s.userId || s.id}" class="glass p-5 rounded-3xl border border-gray-800 space-y-4 hover:border-indigo-500/50 transition">
                    <div class="h-36 rounded-2xl overflow-hidden bg-gray-800">
                        <img src="${escapeHtml(s.image)}" class="w-full h-full object-cover">
                    </div>
                    <div>
                        <div class="flex items-center justify-between">
                            <h4 class="font-bold text-base text-white">${escapeHtml(s.name)}</h4>
                            <span class="text-[10px] font-bold px-2 py-1 rounded bg-indigo-500/20 text-indigo-400">${escapeHtml(s.sector)}</span>
                        </div>
                        <p class="text-xs text-gray-400 mt-1"><i class="fa-solid fa-location-dot mr-1"></i> ${escapeHtml(s.location)} • Stage: ${escapeHtml(s.stage)}</p>
                    </div>
                    <div class="flex items-center justify-between pt-3 border-t border-gray-800 text-xs">
                        <span class="text-emerald-400 font-bold"><i class="fa-solid fa-sack-dollar mr-1"></i> Seeking ${escapeHtml(s.raise)}</span>
                        <button onclick="connectPersistently('${s.userId || s.id}')" class="connection-action px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition">${(() => {
                            const relationship = getConnectionBetween(currentUser.id, s.userId || s.id);
                            if (relationship?.status === 'accepted') return 'Connected';
                            if (relationship?.status === 'requested') return relationship.requester_id === currentUser.id ? 'Pending' : 'Respond';
                            return 'Connect';
                        })()}</button>
                    </div>
                </div>
            `).join('');
        }

        // Modals & Toasts
        function openMatchModal(profile) {
            matchedProfile = profile || null;
            document.getElementById('match-modal-text').innerText = profile
                ? `Your connection request to ${profile.name} was sent. You can message them after they accept.`
                : 'Connection request sent.';
            document.getElementById('match-modal').classList.remove('hidden');
            document.getElementById('match-modal').classList.add('flex');
        }

        function openMatchedContact() {
            if (matchedProfile && matchedProfile.contactUrl) {
                window.location.href = matchedProfile.contactUrl;
            } else {
                showToast('This startup has not provided a contact page.');
            }
        }
        function closeMatchModal() {
            document.getElementById('match-modal').classList.add('hidden');
            document.getElementById('match-modal').classList.remove('flex');
        }
        function openPostModal() {
            document.getElementById('post-modal').classList.remove('hidden');
            document.getElementById('post-modal').classList.add('flex');
        }
        function closePostModal() {
            document.getElementById('post-modal').classList.add('hidden');
            document.getElementById('post-modal').classList.remove('flex');
        }
        async function submitNewPost() {
            const content = document.getElementById('new-post-content').value;
            if(!content.trim()) return;
            const currentUser = getStore('cslid_user', {});
            const authUser = await getLiveUserForWrite();
            if (!authUser) return;
            const currentProfile = getStore('cslid_profile', {});
            const post = {
                user_id: authUser.id,
                author: currentProfile.name || currentUser.name || "Founder",
                role: currentUser.role || "Founder",
                post_time: "Just now",
                content: content,
                image: null,
                likes: 0,
                comments: 0,
                tags: ["Update", "FounderJourney"]
            };
            const savedPost = await saveToSupabase('cslid_posts', post);
            if (window.SUPABASE_CONFIGURED && !savedPost) return showToast('Could not publish the update. Please try again.');
            feedPosts.unshift({...post, id: savedPost?.id || `local-${Date.now()}`});
            setStore('cslid_posts', feedPosts);
            renderFeed();
            closePostModal();
            document.getElementById('new-post-content').value = '';
            switchTab('feed');
            showToast('Your update was published to the feed!');
        }
        function saveCanvas() {
            showToast('Lean Canvas saved to your founder vault!');
        }
        function showToast(msg) {
            const toast = document.getElementById('toast');
            document.getElementById('toast-msg').innerText = msg;
            toast.classList.remove('translate-y-20', 'opacity-0');
            setTimeout(() => {
                toast.classList.add('translate-y-20', 'opacity-0');
            }, 3500);
        }

        async function saveProfile() {
            const inputs = document.querySelectorAll('#tab-profile input');
            const profile = {
                name: inputs[0]?.value || '',
                startup: inputs[1]?.value || ''
            };
            const currentUser = getStore('cslid_user', {});
            const authUser = await getLiveUserForWrite();
            if (!authUser) return;
            const accountRole = await resolveAccountRole(authUser, currentUser);
            if (!accountRole) return showToast('Could not verify your account role. Please sign in again.');
            const savedProfile = await saveToSupabase('cslid_profiles', {
                id: authUser.id,
                user_id: authUser.id,
                role: accountRole,
                name: profile.name,
                startup: profile.startup
            });
            if (window.SUPABASE_CONFIGURED && !savedProfile) return showToast('Could not save your profile. Please try again.');
            setStore('cslid_profile', profile);
            updateUserUI();
            showToast('Profile saved!');
        }

        async function getLiveUserForWrite() {
            if (!window.SUPABASE_CONFIGURED || !window.getSupabaseUser) {
                showToast('Supabase is not configured.');
                return null;
            }
            const authUser = await window.getSupabaseUser();
            if (!authUser) {
                showToast('Your session has expired. Sign in again before saving.');
                return null;
            }
            return authUser;
        }

        function allowLocalAction(key, limit, windowMs) {
            const now = Date.now();
            const timestamps = getStore(key, []).filter(value => now - value < windowMs);
            if (timestamps.length >= limit) return false;
            timestamps.push(now);
            setStore(key, timestamps);
            return true;
        }

        function clearLocalAccountData() {
            Object.keys(localStorage)
                .filter(key => key.startsWith('cslid_'))
                .forEach(key => localStorage.removeItem(key));
        }

        window.exportMyData = async function() {
            const currentUser = getStore('cslid_user', {});
            if (!currentUser.id) return showToast('Sign in before exporting your data.');
            if (!window.SUPABASE_CONFIGURED) return showToast('Supabase is not configured.');
            const data = await window.callSupabaseFunction('export_my_data');
            if (!data) return showToast('Could not export your data. Please try again.');
            const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `cslid-data-${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
            URL.revokeObjectURL(url);
            showToast('Your data export has been downloaded.');
        };

        window.deleteMyAccount = async function() {
            const currentUser = getStore('cslid_user', {});
            if (!currentUser.id) return showToast('Sign in before deleting your account.');
            if (!window.SUPABASE_CONFIGURED) return showToast('Supabase is not configured.');
            if (!window.confirm('Delete your account and all cslid. data permanently? This cannot be undone.')) return;
            const result = await window.callSupabaseFunction('delete_my_account');
            if (result === null) return showToast('Could not delete your account. Please try again.');
            clearLocalAccountData();
            try { await window.signOutUser(); } catch (error) { console.info('Session ended after account deletion.'); }
            window.location.reload();
        };

        // ------------------------------------------------------------
        // PERSISTENT MVP LAYER
        // This keeps the existing UI, but makes the core interactions
        // survive refreshes. Later this can be swapped for Supabase.
        // ------------------------------------------------------------
        function getStore(key, fallback) {
            try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
            catch(e) { return fallback; }
        }
        function setStore(key, value) {
            localStorage.setItem(key, JSON.stringify(value));
        }
        async function resolveAccountRole(authUser, previousUser) {
            const metadataRole = authUser.user_metadata?.role;
            if (metadataRole === 'founder' || metadataRole === 'investor') return metadataRole;
            if (previousUser?.id === authUser.id &&
                (previousUser.role === 'founder' || previousUser.role === 'investor')) {
                return previousUser.role;
            }
            const accounts = await fetchFromSupabase('cslid_users');
            const accountRole = accounts.find(account => account.id === authUser.id)?.role;
            return accountRole === 'founder' || accountRole === 'investor' ? accountRole : '';
        }

        window.setAuthMode = function(mode) {
            const isSignIn = mode === 'signin';
            const isReset = mode === 'reset';
            document.getElementById('auth-title').innerText = isReset ? 'Set a new password' : (isSignIn ? 'Sign in to cslid.' : 'Create your cslid. account');
            document.getElementById('auth-description').innerText = isSignIn
                ? 'Use your email and password to continue.'
                : (isReset ? 'Choose a new password for your account.' : 'Create a testing account with your role and email.');
            document.getElementById('auth-signup-fields').classList.toggle('hidden', isSignIn || isReset);
            document.getElementById('auth-email').classList.toggle('hidden', isReset);
            document.getElementById('auth-submit').innerText = isReset ? 'Update password' : (isSignIn ? 'Sign in' : 'Create account');
            document.getElementById('auth-submit').onclick = () => window.completeAuth(isReset ? 'reset' : (isSignIn ? 'signin' : 'signup'));
            document.getElementById('auth-forgot').classList.toggle('hidden', !isSignIn);
            document.getElementById('auth-switch').innerHTML = isReset
                ? 'Return to <button type="button" onclick="window.setAuthMode(\'signin\')" class="font-bold text-indigo-400 hover:text-indigo-300">sign in</button>'
                : (isSignIn
                ? 'Need an account? <button type="button" onclick="window.setAuthMode(\'signup\')" class="font-bold text-indigo-400 hover:text-indigo-300">Create one</button>'
                : 'Already have an account? <button type="button" onclick="window.setAuthMode(\'signin\')" class="font-bold text-indigo-400 hover:text-indigo-300">Sign in</button>');
            document.getElementById('auth-note').innerText = isReset
                ? 'Use at least 8 characters.'
                : (isSignIn
                ? 'Use the email address you registered with.'
                : 'Testing account only. Verify your email if Supabase asks you to.');
            document.getElementById('auth-password').placeholder = isSignIn ? 'Password' : 'Password (at least 8 characters)';
        };

        window.resetPassword = async function() {
            const email = document.getElementById('auth-email')?.value.trim() || '';
            if (!email) return showToast('Enter your email first.');
            if (!window.SUPABASE_CONFIGURED) return showToast('Supabase is not configured.');
            try {
                await window.resetPasswordForEmail(email, window.location.origin + window.location.pathname);
                showToast('Password reset email sent. Check your inbox.');
            } catch (error) {
                console.error('Password reset failed:', error.message);
                showToast(error.message || 'Could not send password reset email.');
            }
        };

        async function completeAuth(mode = 'signup') {
            const name = document.getElementById('auth-name')?.value.trim() || '';
            const role = document.getElementById('auth-role')?.value || '';
            const email = document.getElementById('auth-email')?.value.trim() || '';
            const password = document.getElementById('auth-password')?.value || '';
            if((mode !== 'reset' && !email) || !password || (mode === 'signup' && (!name || !role))) {
                return showToast(mode === 'signup' ? 'Enter your name, role, email and password.' : 'Enter your email and password.');
            }
            if(password.length < 8) return showToast('Password must be at least 8 characters.');
            if(!window.SUPABASE_CONFIGURED) return showToast('Add your Supabase URL and anon key first.');
            try {
                if (mode === 'reset') {
                    await window.updatePassword(password);
                    window.setAuthMode('signin');
                    showToast('Password updated. You can now sign in.');
                    return;
                }
                showToast(mode === 'signup' ? 'Creating account...' : 'Signing in...');
                const result = mode === 'signup'
                    ? await window.signUpWithPassword(email, password, name, role)
                    : await window.signInWithPassword(email, password);
                const authUser = result.user;
                if(!authUser || !result.session) {
                    return showToast('Check your email to confirm your account, then sign in.');
                }
                const liveUser = await getLiveUserForWrite();
                if (!liveUser || liveUser.id !== authUser.id) {
                    return showToast('Your sign-in session changed. Please sign in again.');
                }
                const displayName = name || authUser.user_metadata?.name || email.split('@')[0];
                const accountRole = mode === 'signup'
                    ? role
                    : await resolveAccountRole(liveUser, getStore('cslid_user', {}));
                if (!accountRole) {
                    return showToast('Your account has no role yet. Sign out and create a new account with a role.');
                }
                setStore('cslid_user', {id: liveUser.id, name: displayName, email: liveUser.email, role: accountRole});
                await saveToSupabase('cslid_users', {id: liveUser.id, name: displayName, email: liveUser.email, role: accountRole});
                await saveToSupabase('cslid_profiles', {
                    id: liveUser.id,
                    user_id: liveUser.id,
                    role: accountRole,
                    name: displayName,
                    is_public: true
                });
                document.getElementById('auth-modal').classList.add('hidden');
                document.getElementById('auth-modal').classList.remove('flex');
                updateUserUI();
                await hydrateFromSupabase();
                startRealtimeUpdates();
                openRoleHome();
                showToast(mode === 'signup' ? 'Account created.' : 'Signed in.');
            } catch(error) {
                console.error('Supabase authentication failed:', error.message);
                showToast(error.message || 'Authentication failed.');
            }
        }
        window.completeAuth = completeAuth;

        window.signOutCurrentUser = async function() {
            if (!window.SUPABASE_CONFIGURED) {
                return showToast('Supabase is not configured.');
            }
            try {
                await window.signOutUser();
                localStorage.removeItem('cslid_user');
                localStorage.removeItem('cslid_profile');
                localStorage.removeItem('cslid_startup');
                updateUserUI();
                document.getElementById('auth-modal').classList.remove('hidden');
                document.getElementById('auth-modal').classList.add('flex');
                showToast('You have been signed out.');
            } catch (error) {
                console.error('Supabase sign-out failed:', error.message);
                showToast(error.message || 'Sign-out failed. Please try again.');
            }
        };

        function updateUserUI() {
            const user = getStore('cslid_user', null);
            const matchNav = document.getElementById('nav-btn-match');
            const launchButton = document.getElementById('launch-center-nav');
            const connectionsNav = document.getElementById('nav-btn-connections');
            if (!user) {
                if (matchNav) matchNav.style.display = '';
                if (launchButton) launchButton.style.display = '';
                if (connectionsNav) connectionsNav.style.display = '';
                return;
            }
            const isFounder = user.role === 'founder';
            const labels = document.querySelectorAll('#nav-btn-profile span');
            if(labels.length) labels[0].innerText = user.name;
            const profile = getStore('cslid_profile', {});
            const name = document.getElementById('profile-name');
            const startup = document.getElementById('profile-startup');
            const nameInput = document.getElementById('profile-name-input');
            const startupInput = document.getElementById('profile-startup-input');
            const bio = document.getElementById('profile-bio');
            if(name) name.innerText = profile.name || user.name || 'Your profile';
            if(startup) startup.innerText = profile.startup || (isFounder ? 'Add your startup profile' : 'Investor profile');
            if(nameInput) nameInput.value = profile.name || user.name || '';
            if(startupInput) startupInput.value = profile.startup || '';
            if(bio) bio.innerText = profile.startup || (isFounder ? 'Add your startup focus and investment interests.' : 'Connect with founders and explore the startup directory.');
            if (matchNav) {
                matchNav.hidden = isFounder;
                matchNav.style.display = isFounder ? 'none' : '';
            }
            if (launchButton) {
                launchButton.hidden = !isFounder;
                launchButton.style.display = isFounder ? '' : 'none';
            }
            if (connectionsNav) {
                connectionsNav.hidden = false;
                connectionsNav.style.display = '';
            }
        }

        function openStartupModal() {
            if (getStore('cslid_user', {}).role !== 'founder') {
                return showToast('Startup profiles are available to founder accounts.');
            }
            const startup = getStore('cslid_startup', null);
            if(startup) {
                document.getElementById('startup-name').value = startup.name || '';
                document.getElementById('startup-tagline').value = startup.tagline || '';
                document.getElementById('startup-stage').value = startup.stage || 'Idea';
                document.getElementById('startup-sector').value = startup.sector || '';
                document.getElementById('startup-problem').value = startup.problem || '';
                document.getElementById('startup-location').value = startup.location || '';
                document.getElementById('startup-seeking').value = startup.seeking || '';
                document.getElementById('startup-traction').value = startup.traction || '';
                document.getElementById('startup-contact').value = startup.contactUrl || '';
                document.getElementById('startup-public').checked = startup.isPublic !== false;
            }
            document.getElementById('startup-modal').classList.remove('hidden');
            document.getElementById('startup-modal').classList.add('flex');
        }

        function closeStartupModal() {
            document.getElementById('startup-modal').classList.add('hidden');
            document.getElementById('startup-modal').classList.remove('flex');
        }

        async function saveStartup() {
            const user = getStore('cslid_user', {});
            if (user.role !== 'founder') return showToast('Only founder accounts can publish startup profiles.');
            const authUser = await getLiveUserForWrite();
            if (!authUser) return;
            const ownerId = authUser.id;
            const startup = {
                id: ownerId,
                name: document.getElementById('startup-name').value.trim(),
                tagline: document.getElementById('startup-tagline').value.trim(),
                stage: document.getElementById('startup-stage').value,
                sector: document.getElementById('startup-sector').value.trim(),
                problem: document.getElementById('startup-problem').value.trim(),
                location: document.getElementById('startup-location').value.trim(),
                seeking: document.getElementById('startup-seeking').value.trim(),
                traction: document.getElementById('startup-traction').value.trim(),
                contactUrl: document.getElementById('startup-contact').value.trim(),
                isPublic: document.getElementById('startup-public').checked
            };

            if (!startup.name || !startup.tagline) {
                return showToast('Add a startup name and one-line description before saving.');
            }

            if (startup.isPublic) {
                if (!startup.contactUrl) return showToast('Add a real contact page URL before publishing.');
                try { new URL(startup.contactUrl); }
                catch(e) { return showToast('Enter a valid contact page URL starting with https://'); }
            }

            const startups = getRegisteredStartups();
            const idx = startups.findIndex(x => x.id === startup.id);
            if (idx >= 0) startups[idx] = startup;
            else startups.push(startup);

            saveRegisteredStartups(startups);
            setStore('cslid_startup', startup);
            const savedStartup = await saveToSupabase('cslid_startups', {
                id: startup.id,
                user_id: ownerId,
                name: startup.name,
                tagline: startup.tagline,
                stage: startup.stage,
                sector: startup.sector,
                problem: startup.problem,
                location: startup.location,
                seeking: startup.seeking,
                traction: startup.traction,
                contact_url: startup.contactUrl || null,
                is_public: startup.isPublic
            });
            if (window.SUPABASE_CONFIGURED && !savedStartup) {
                return showToast('Could not save the startup profile. Please try again.');
            }
            closeStartupModal();
            refreshMatchProfiles();
            showToast(startup.isPublic ? 'Startup is now live in the investor swipe deck!' : 'Startup saved as a private draft.');
        }

        function getConnectionRows() {
            return getStore('cslid_connections', []).map(item =>
                typeof item === 'string'
                    ? {recipient_id: item, status: 'requested'}
                    : item
            );
        }

        function getConnectionBetween(firstId, secondId) {
            return getConnectionRows().find(item =>
                (item.requester_id === firstId && item.recipient_id === secondId) ||
                (item.requester_id === secondId && item.recipient_id === firstId)
            );
        }

        function getOtherConnectionUser(connection, userId) {
            return connection.requester_id === userId ? connection.recipient_id : connection.requester_id;
        }

        // Send a real participant-based connection request.
        async function connectPersistently(recipientId) {
            const authUser = await getLiveUserForWrite();
            if (!authUser) return;
            const requesterId = authUser.id;
            if (!recipientId || recipientId === requesterId) return showToast('You cannot connect with your own account.');
            if (!allowLocalAction('cslid_connection_attempts', 20, 24 * 60 * 60 * 1000)) {
                return showToast('Daily connection request limit reached. Try again tomorrow.');
            }
            const existing = getConnectionRows();
            const relationship = getConnectionBetween(requesterId, recipientId);
            if (relationship?.status === 'accepted') {
                showToast('You are already connected.');
                return false;
            }
            if (relationship?.status === 'requested') {
                showToast(relationship.requester_id === requesterId
                    ? 'Your connection request is pending.'
                    : 'This person has already requested to connect.');
                return false;
            }
            const saved = relationship?.status === 'rejected' && relationship.requester_id === requesterId
                ? await window.callSupabaseFunction('retry_connection_request', {p_connection_id: relationship.id})
                : await saveToSupabase('cslid_connections', {
                    requester_id: requesterId,
                    recipient_id: recipientId,
                    status: 'requested'
                });
            if (window.SUPABASE_CONFIGURED && !saved) {
                showToast('Could not send the connection request.');
                return false;
            }
            existing.push(saved || {
                requester_id: requesterId,
                recipient_id: recipientId,
                status: 'requested'
            });
            setStore('cslid_connections', existing);
            filterDirectory('all');
            showToast('Connection request sent!');
            return true;
        }

        async function hydrateFromSupabase() {
            if (!window.SUPABASE_CONFIGURED || refreshInProgress) return;
            refreshInProgress = true;
            try {
            const [posts, startups, connections, matches, messages, tasks] = await Promise.all([
                fetchFromSupabase('cslid_posts'),
                fetchFromSupabase('cslid_startups'),
                fetchFromSupabase('cslid_connections'),
                fetchFromSupabase('cslid_matches'),
                fetchFromSupabase('cslid_messages'),
                fetchFromSupabase('cslid_tasks')
            ]);
            const currentUser = getStore('cslid_user', {});
            const userId = currentUser.id;
            if (!userId) return;
            const profiles = await fetchFromSupabase('cslid_profiles');
            setStore('cslid_public_profiles', profiles);
            const ownProfile = profiles.find(item => item.user_id === userId || item.id === userId);
            if (ownProfile) {
                setStore('cslid_profile', {name: ownProfile.name || '', startup: ownProfile.startup || ''});
            }

            feedPosts.length = 0;
            posts.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).forEach(post => feedPosts.push({
                id: post.id,
                author: post.author || 'Founder',
                role: post.role || '',
                avatar: post.avatar || null,
                time: post.post_time || post.created_at || '',
                content: post.content,
                image: post.image,
                likes: post.likes || 0,
                comments: post.comments || 0,
                tags: post.tags || []
            }));
            setStore('cslid_posts', feedPosts);

            directoryStartups = startups.map(startup => ({
                id: startup.id,
                userId: startup.user_id,
                name: startup.name,
                sector: startup.sector || 'Startup',
                stage: startup.stage || 'Early Stage',
                location: startup.location || 'Location not provided',
                raise: startup.seeking || 'Not specified',
                image: startup.image || null,
                isPublic: startup.is_public !== false
            }));
            setStore('cslid_startups', startups.map(startup => ({
                id: startup.id,
                name: startup.name,
                tagline: startup.tagline,
                stage: startup.stage,
                sector: startup.sector,
                problem: startup.problem,
                location: startup.location,
                seeking: startup.seeking,
                traction: startup.traction,
                contactUrl: startup.contact_url,
                isPublic: startup.is_public !== false
            })));
            const ownStartup = startups.find(item => item.user_id === userId || item.id === userId);
            if (ownStartup) {
                const localStartup = {
                    id: ownStartup.id, name: ownStartup.name, tagline: ownStartup.tagline,
                    stage: ownStartup.stage, sector: ownStartup.sector, problem: ownStartup.problem,
                    location: ownStartup.location, seeking: ownStartup.seeking, traction: ownStartup.traction,
                    contactUrl: ownStartup.contact_url, isPublic: ownStartup.is_public !== false
                };
                setStore('cslid_startup', localStartup);
            }
            setStore('cslid_connections', connections
                .filter(item => item.requester_id === userId || item.recipient_id === userId));
            setStore('cslid_matches', matches.filter(item => item.user_id === userId || item.matched_user_id === userId).map(item => ({
                id: item.id,
                userId: item.user_id === userId ? item.matched_user_id : item.user_id,
                matchedAt: item.matched_at
            })));
            const threads = {};
            messages.forEach(item => {
                const otherId = item.sender_id === userId ? item.recipient_id : item.sender_id;
                threads[otherId] = threads[otherId] || [];
                threads[otherId].push({text: item.content, me: item.sender_id === userId, time: item.created_at});
            });
            setStore('cslid_messages', threads);
            const pitchTask = tasks.find(item => item.user_id === userId && item.task_key === 'pitch_ready');
            setStore('cslid_pitch_ready', Boolean(pitchTask && pitchTask.complete));
            renderFeed();
            filterDirectory('all');
            refreshMatchProfiles();
            if (document.getElementById('tab-connections') && !document.getElementById('tab-connections').classList.contains('hidden')) {
                window.renderConnections?.();
            }
            if (activeMessageRecipientId && !document.getElementById('message-modal').classList.contains('hidden')) {
                renderMessages(activeMessageRecipientId);
            }
            } finally {
                refreshInProgress = false;
            }
        }

        window.refreshConnections = async function() {
            if (!getStore('cslid_user', null)) return showToast('Sign in to refresh your connections.');
            const button = document.getElementById('connections-refresh-button');
            const label = button?.querySelector('span');
            if (button) button.disabled = true;
            if (label) label.textContent = 'Refreshing...';
            try {
                await hydrateFromSupabase();
                window.renderConnections?.();
                showToast('Connections refreshed.');
            } finally {
                if (button) button.disabled = false;
                if (label) label.textContent = 'Refresh connections';
            }
        };

        function startRealtimeUpdates() {
            if (unsubscribeFromRealtime) unsubscribeFromRealtime();
            if (!window.subscribeToSupabaseChanges) return;
            unsubscribeFromRealtime = window.subscribeToSupabaseChanges(() => {
                hydrateFromSupabase();
            });
        }

        // Initialize App on Load
        window.onload = async function() {
            window.setAuthMode('signup');
            if (window.SUPABASE_CONFIGURED) {
                const session = await window.getSupabaseSession();
                const authUser = session?.user || null;
                if (authUser) {
                    const displayName = authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User';
                    const previousUser = getStore('cslid_user', {});
                    const role = await resolveAccountRole(authUser, previousUser);
                    setStore('cslid_user', {
                        id: authUser.id,
                        name: displayName,
                        email: authUser.email,
                        role
                    });
                } else {
                    localStorage.removeItem('cslid_user');
                }
            }
            await hydrateFromSupabase();
            startRealtimeUpdates();
            refreshMatchProfiles();
            renderFeed();
            filterDirectory('all');
            updateUserUI();
            if (getStore('cslid_user', null)) openRoleHome();

            // First-run account gate.
            if(!getStore('cslid_user', null)) {
                setTimeout(() => {
                    document.getElementById('auth-modal').classList.remove('hidden');
                    document.getElementById('auth-modal').classList.add('flex');
                }, 250);
            }
            if (window.onSupabaseAuthStateChange) {
                window.onSupabaseAuthStateChange((event, authUser) => {
                    if (event === 'PASSWORD_RECOVERY') {
                        window.setAuthMode('reset');
                        document.getElementById('auth-modal').classList.remove('hidden');
                        document.getElementById('auth-modal').classList.add('flex');
                        return;
                    }
                    if (authUser) {
                        const displayName = authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User';
                        const previousUser = getStore('cslid_user', {});
                        setStore('cslid_user', {
                            id: authUser.id,
                            name: displayName,
                            email: authUser.email,
                            role: authUser.user_metadata?.role || (previousUser?.id === authUser.id ? previousUser.role : '') || ''
                        });
                        updateUserUI();
                        hydrateFromSupabase();
                        startRealtimeUpdates();
                    } else if (event === 'SIGNED_OUT') {
                        if (unsubscribeFromRealtime) {
                            unsubscribeFromRealtime();
                            unsubscribeFromRealtime = null;
                        }
                        localStorage.removeItem('cslid_user');
                        localStorage.removeItem('cslid_profile');
                        localStorage.removeItem('cslid_startup');
                        updateUserUI();
                    }
                });
            }
            window.setInterval(() => {
                if (window.SUPABASE_CONFIGURED && getStore('cslid_user', null)) {
                    hydrateFromSupabase();
                }
            }, 15000);
        };

/* ============================================================
    CSLID ROLLOUT MVP
   Frontend-only demo layer. Replace localStorage with Supabase
   when moving to production.
   ============================================================ */
(function(){
    function applyTheme(theme){
        const dark = theme === 'dark';
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        localStorage.setItem('cslid_theme', dark ? 'dark' : 'light');
        const toggle = document.querySelector('.theme-toggle');
        if(toggle) toggle.innerHTML = `<i class="fa-solid fa-${dark ? 'sun' : 'moon'}"></i>`;
    }
    window.toggleTheme=function(){
        applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    };
    applyTheme(localStorage.getItem('cslid_theme') || 'light');

  const K = {
    user:'cslid_user',
    startup:'cslid_startup',
    posts:'cslid_posts',
    connections:'cslid_connections',
    matches:'cslid_matches',
    messages:'cslid_messages',
    tasks:'cslid_tasks'
  };
  const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const user=()=>read(K.user,null), startup=()=>read(K.startup,null);

  window.openLaunchCenter=function(){
    if (user()?.role !== 'founder') {
      showToast('Launch Center is available to founder accounts.');
      return;
    }
    renderLaunchCenter();
    const el=document.getElementById('launch-center');el.classList.remove('hidden');el.classList.add('flex');
  };
  window.closeLaunchCenter=function(){const el=document.getElementById('launch-center');el.classList.add('hidden');el.classList.remove('flex')};

  function renderLaunchCenter(){
    const s=startup(), u=user(), con=read(K.connections,[]), posts=read(K.posts,[]);
    const connectionRows=con.map(item=>typeof item==='string'?{recipient_id:item,status:'requested'}:item);
    const incoming=connectionRows.filter(item=>item.recipient_id===u?.id && item.status==='requested');
    const matches=connectionRows.filter(item=>item.status==='accepted');
    const checks=[
      ['Account created',!!u,'Create your founder account'],
      ['Startup created',!!s,'Add your startup details'],
      ['Startup description',!!(s&&s.tagline),'Add a clear one-line pitch'],
      ['Problem defined',!!(s&&s.problem),'Explain the problem'],
      ['First post',posts.length>0,'Publish your first journey update'],
      ['First connection',matches.length>0,'Connect with someone in the directory'],
    ['Pitch ready',read('cslid_pitch_ready',false),'Complete your pitch deck'],
      ['Launch page',!!s,'Preview your public startup page']
    ];
    const done=checks.filter(x=>x[1]).length, pct=Math.round(done/checks.length*100);
    document.getElementById('launch-kpis').innerHTML=[
      ['Progress',pct+'%'],['Posts',posts.length],['Connections',matches.length],['Stage',s?.stage||'—']
    ].map(x=>`<div class="vl-kpi"><strong>${escapeHtml(x[1])}</strong><span>${escapeHtml(x[0])}</span></div>`).join('');

    const actionMap={
      'Account created':'account',
      'Startup created':'startup',
      'Startup description':'description',
      'Problem defined':'problem',
      'First post':'post',
      'First connection':'connection',
      'Pitch ready':'pitch',
      'Launch page':'launch'
    };

    document.getElementById('launch-checklist').innerHTML=checks.map((x)=>`
      <div class="vl-row">
        <div class="w-8 h-8 rounded-lg ${x[1]?'bg-emerald-500/15':'bg-gray-900'} flex items-center justify-center">
          <i class="fa-solid ${x[1]?'fa-check text-emerald-400':'fa-arrow-right text-gray-500'} text-xs"></i>
        </div>
        <div class="grow"><p class="text-xs font-bold">${x[0]}</p><p class="vl-muted">${x[1]?'Completed':x[2]}</p></div>
        ${!x[1] && actionMap[x[0]] ? `<button onclick="launchChecklistAction('${actionMap[x[0]]}')" class="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-bold">Do it</button>`:''}
      </div>`).join('');

    const publicProfiles=read('cslid_public_profiles',[]);
    const startups=read('cslid_startups',[]);
    const labelFor=(id)=>{
      const profile=publicProfiles.find(item=>item.user_id===id||item.id===id);
      const startupRecord=startups.find(item=>item.user_id===id||item.id===id);
      return profile?.name || startupRecord?.name || `User ${String(id||'').slice(0,8)}`;
    };
    const requests=document.getElementById('launch-connections');
    if(!requests) return;
    requests.innerHTML=incoming.length ? `
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-bold">Incoming connection requests</h4>
        <span class="vl-pill">${incoming.length}</span>
      </div>
      ${incoming.map(item=>{
        const requester=item.requester_id;
        return `<div class="vl-row">
          <div class="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center"><i class="fa-solid fa-user text-indigo-400 text-xs"></i></div>
          <div class="grow"><p class="text-xs font-bold">${escapeHtml(labelFor(requester))}</p><p class="vl-muted">Would like to connect with you</p></div>
          <div class="flex gap-2">
            <button onclick="respondToConnection('${item.id}','accept')" class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold">Accept</button>
            <button onclick="respondToConnection('${item.id}','reject')" class="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-[10px] font-bold">Reject</button>
          </div>
        </div>`;
      }).join('')}` :
      `<div class="rounded-2xl border border-gray-800 bg-gray-950/40 p-4"><p class="text-xs font-bold">Connection requests</p><p class="text-[10px] text-gray-500 mt-1">Incoming requests will appear here when someone wants to connect.</p></div>`;
  }

  window.openConnectionMessage=function(recipientId){
    const profiles=read('cslid_public_profiles',[]);
    const startups=read('cslid_startups',[]);
    const profile=profiles.find(item=>item.user_id===recipientId||item.id===recipientId);
    const startupRecord=startups.find(item=>item.user_id===recipientId||item.id===recipientId);
    const name=profile?.name||startupRecord?.name||'Connection';
    openMessageModal(name,recipientId);
  };

  window.renderConnections=function(){
    const container=document.getElementById('connections-content');
    if(!container) return;
    const current=user()||{};
    if(!current.id){
      container.innerHTML='<div class="glass p-6 rounded-3xl border border-gray-800"><p class="text-sm font-bold">Sign in to view your connections.</p></div>';
      return;
    }
    const rows=read(K.connections,[])
      .map(item=>typeof item==='string'?{recipient_id:item,status:'requested'}:item)
      .filter(item=>item.requester_id===current.id||item.recipient_id===current.id);
    const profiles=read('cslid_public_profiles',[]);
    const startups=read('cslid_startups',[]);
    const labelFor=(id)=>{
      const profile=profiles.find(item=>item.user_id===id||item.id===id);
      const startupRecord=startups.find(item=>item.user_id===id||item.id===id);
      return profile?.name||startupRecord?.name||`User ${String(id||'').slice(0,8)}`;
    };
    const roleFor=(id)=>{
      const profile=profiles.find(item=>item.user_id===id||item.id===id);
      return profile?.role||'Member';
    };
    const otherId=item=>getOtherConnectionUser(item,current.id);
    const incoming=rows.filter(item=>item.recipient_id===current.id&&item.status==='requested');
    const outgoing=rows.filter(item=>item.requester_id===current.id&&item.status==='requested');
    const accepted=rows.filter(item=>item.status==='accepted');
    const messages=read(K.messages,{});
    const readState=read('cslid_message_read', {});
    const section=(title,items,body,empty)=>`
      <section class="glass p-5 rounded-3xl border border-gray-800 space-y-3">
        <div class="flex items-center justify-between"><h2 class="text-sm font-bold">${title}</h2><span class="vl-pill">${items.length}</span></div>
        ${items.length?items.map(body).join(''):`<p class="text-xs text-gray-500 py-3">${empty}</p>`}
      </section>`;
    const personRow=(item,actions)=>`
      <div class="flex items-center gap-3 rounded-2xl border border-gray-800 bg-gray-950/40 p-3">
        <div class="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center"><i class="fa-solid fa-user text-indigo-400"></i></div>
        <div class="grow"><p class="text-sm font-bold">${escapeHtml(labelFor(otherId(item)))}</p><p class="text-[10px] text-gray-500">${escapeHtml(roleFor(otherId(item)))}</p></div>
        <div class="flex gap-2">${actions(item)}</div>
      </div>`;
    container.innerHTML=
      section('Incoming requests',incoming,item=>personRow(item,request=>`
        <button onclick="respondToConnection('${request.id}','accept')" class="px-3 py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-bold">Accept</button>
        <button onclick="respondToConnection('${request.id}','reject')" class="px-3 py-2 rounded-lg bg-gray-800 text-gray-300 text-[10px] font-bold">Reject</button>`),'No incoming requests right now.')+
      section('Sent requests',outgoing,item=>personRow(item,()=>'<span class="px-3 py-2 rounded-lg bg-gray-800 text-gray-400 text-[10px] font-bold">Pending</span>'),'Requests you send will appear here.')+
      section('Accepted connections',accepted,item=>personRow(item,connection=>{
        const other=otherId(connection);
        const thread=messages[other]||[];
        const last=thread[thread.length-1];
        const unread=thread.filter(item=>!item.me && new Date(item.time||0).getTime() > (readState[other]||0)).length;
        return `<button onclick="openConnectionMessage('${other}')" class="px-3 py-2 rounded-lg bg-indigo-600 text-white text-[10px] font-bold"><i class="fa-regular fa-message mr-1"></i>Message</button>
          ${last?`<span class="hidden sm:inline text-[10px] text-gray-500 max-w-32 truncate">${escapeHtml(last.text)}</span>`:''}
          ${unread?`<span class="min-w-5 h-5 px-1 rounded-full bg-pink-600 text-white text-[10px] font-bold inline-flex items-center justify-center">${unread}</span>`:''}`;
      }),'Accepted connections will appear here.');
  };

  window.respondToConnection=async function(connectionId, action){
    const currentUser=user()||{};
    if(!currentUser.id) return showToast('Sign in before managing connection requests.');
    if(!connectionId) return showToast('This connection request is missing its id.');
    if(!window.SUPABASE_CONFIGURED) return showToast('Supabase is not configured.');
    const functionName=action==='accept'?'accept_connection':'reject_connection';
    const result=await window.callSupabaseFunction(functionName,{p_connection_id:connectionId});
    if(!result) return showToast(`Could not ${action} the connection request.`);
    await hydrateFromSupabase();
    renderLaunchCenter();
    showToast(action==='accept'?'Connection accepted. You can now message each other.':'Connection request rejected.');
  };

  window.launchChecklistAction=function(action){
    closeLaunchCenter();
    switch(action){
      case 'account':
        document.getElementById('auth-modal').classList.remove('hidden');
        document.getElementById('auth-modal').classList.add('flex');
        break;
      case 'startup':
      case 'description':
      case 'problem':
        openStartupModal();
        break;
      case 'post':
        switchTab('feed');
        setTimeout(openPostModal, 80);
        break;
      case 'connection':
        switchTab('directory');
        break;
      case 'pitch':
        openPitchModal();
        break;
      case 'launch':
        openPublicStartup();
        break;
      default:
        break;
    }
  };

  window.goToDirectory=function(){closeLaunchCenter();switchTab('directory');};

  window.openMessageModal=function(name, recipientId){
    const currentUser=user()||{};
    const relationship=getConnectionBetween(currentUser.id,recipientId);
    if(!relationship || relationship.status!=='accepted'){
      showToast('Messaging is available after the connection is accepted.');
      return;
    }
    const title=document.getElementById('message-title');
    title.textContent=`Message ${name}`;
    document.getElementById('message-modal').dataset.person=name;
    document.getElementById('message-modal').dataset.recipientId=recipientId || '';
    document.getElementById('message-modal').dataset.threadKey=recipientId || '';
    activeMessageRecipientId=recipientId || '';
    const readState=read('cslid_message_read',{});
    readState[recipientId]=Date.now();
    write('cslid_message_read',readState);
    renderMessages(recipientId);
    window.renderConnections?.();
    const el=document.getElementById('message-modal');el.classList.remove('hidden');el.classList.add('flex');
  };
  window.blockCurrentUser=async function(){
    const recipientId=document.getElementById('message-modal')?.dataset.recipientId;
    if(!recipientId) return showToast('This user cannot be blocked.');
    if(!window.confirm('Block this user? They will no longer be able to connect or message you.')) return;
    const result=await window.callSupabaseFunction('block_user',{p_blocked_id:recipientId});
    if(result===null) return showToast('Could not block this user. Please try again.');
    window.closeMessageModal();
    await hydrateFromSupabase();
    window.renderConnections?.();
    showToast('User blocked.');
  };
  window.reportCurrentUser=async function(){
    const recipientId=document.getElementById('message-modal')?.dataset.recipientId;
    if(!recipientId) return showToast('This user cannot be reported.');
    const reason=window.prompt('Why are you reporting this user?');
    if(!reason || !reason.trim()) return;
    const result=await window.callSupabaseFunction('report_user',{p_reported_id:recipientId,p_reason:reason.trim()});
    if(result===null) return showToast('Could not submit the report. Please try again.');
    showToast('Report submitted. Thank you.');
  };
  window.closeMessageModal=function(){
    const el=document.getElementById('message-modal');
    el.classList.add('hidden');
    el.classList.remove('flex');
    activeMessageRecipientId='';
  };
  function renderMessages(threadKey){
    const all=read(K.messages,{});
    const arr=all[threadKey]||[];
    document.getElementById('message-thread').innerHTML=arr.length?arr.map(m=>`<div class="${m.me?'text-right':''}"><span class="inline-block max-w-[85%] rounded-xl px-3 py-2 text-xs ${m.me?'bg-indigo-600':'bg-gray-900 text-gray-300'}">${escapeHtml(m.text)}</span></div>`).join(''):`<div class="text-center text-gray-600 text-xs py-16">No messages yet. Start the conversation.</div>`;
  }
  window.sendMessage=async function(){
    const modal=document.getElementById('message-modal');
    const input=document.getElementById('message-input'), text=input.value.trim(), name=modal.dataset.person;
    if(!text)return;
        const authUser = await getLiveUserForWrite();
        if (!authUser) return;
        const senderId = authUser.id;
        const recipientId = document.getElementById('message-modal').dataset.recipientId;
        if (!recipientId || recipientId === senderId) return showToast('This directory entry cannot receive messages yet.');
        const relationship=getConnectionBetween(senderId,recipientId);
        if(!relationship || relationship.status!=='accepted') return showToast('Messaging is available after the connection is accepted.');
        if (!allowLocalAction('cslid_message_attempts', 100, 60 * 60 * 1000)) {
          return showToast('Hourly message limit reached. Please try again later.');
        }
        let saved;
        try {
          saved=await window.sendMessageToSupabase(recipientId, text);
        } catch(error) {
          return showToast(`Could not send message: ${error.message || 'Please try again.'}`);
        }
        if(window.SUPABASE_CONFIGURED && !saved) return showToast('Could not send the message. Please try again.');
        const threadKey=modal.dataset.threadKey||recipientId;
        const all=read(K.messages,{});all[threadKey]=all[threadKey]||[];all[threadKey].push({text,me:true,time:saved?.created_at||Date.now()});write(K.messages,all);
        input.value='';renderMessages(threadKey);window.renderConnections?.();showToast('Message saved');
  };

  window.openPublicStartup=function(){
    const s=startup(), c=document.getElementById('public-startup-content');
    if(!s){c.innerHTML='<div class="vl-empty">Create your startup first.</div>';}
    else c.innerHTML=`
      <div class="text-center py-5">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-pink-500 to-amber-400 mx-auto flex items-center justify-center"><i class="fa-solid fa-rocket text-white text-xl"></i></div>
        <p class="text-[10px] uppercase tracking-widest text-gray-500 mt-4">${escapeHtml(s.stage)} · ${escapeHtml(s.sector||'Startup')}</p>
        <h2 class="text-3xl font-extrabold mt-2">${escapeHtml(s.name)}</h2>
        <p class="text-gray-400 mt-2">${escapeHtml(s.tagline)}</p>
        <div class="mt-6 text-left p-4 rounded-2xl bg-gray-950 border border-gray-800"><p class="text-[10px] uppercase tracking-widest text-gray-500">Problem</p><p class="text-sm text-gray-300 mt-2">${escapeHtml(s.problem||'Not added yet.')}</p></div>
        <div class="flex justify-center gap-2 mt-5"><span class="vl-pill">Founder profile</span><span class="vl-pill">Hiring</span><span class="vl-pill">Pitch</span></div>
      </div>`;
    const el=document.getElementById('public-startup-modal');el.classList.remove('hidden');el.classList.add('flex');
  };
  window.closePublicStartup=function(){const el=document.getElementById('public-startup-modal');el.classList.add('hidden');el.classList.remove('flex')};

  window.openPitchModal=function(){
    const s=startup()||{};
    const nameField=document.getElementById('pitch-name');
    const conceptField=document.getElementById('pitch-concept');
    if(nameField) nameField.value = s.name || 'Your startup';
    if(conceptField) conceptField.value = s.problem || 'AI workflow automation for fast-moving teams';
    if(document.getElementById('pitch-output')) window.generatePitch();
    const el=document.getElementById('pitch-modal'); if(el){el.classList.remove('hidden');el.classList.add('flex');}
  };
  window.closePitchModal=function(){const el=document.getElementById('pitch-modal'); if(el){el.classList.add('hidden');el.classList.remove('flex');}};
  window.generatePitch=function(){
    const name=(document.getElementById('pitch-name')?.value||'Your startup').trim() || 'Your startup';
    const concept=(document.getElementById('pitch-concept')?.value||'AI workflow automation for fast-moving teams').trim() || 'AI workflow automation for fast-moving teams';
    const out=document.getElementById('pitch-output');
    if(!out) return;
    out.innerHTML=`
      <div class="space-y-3">
        <div class="flex items-center justify-between"><span class="text-[10px] uppercase tracking-widest text-indigo-400 font-bold">Investor pitch</span><span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">Ready</span></div>
        <p class="text-sm leading-relaxed text-gray-200">"Hi, I'm the founder of <strong class="text-white">${escapeHtml(name)}</strong>. We are building <strong class="text-white">${escapeHtml(concept)}</strong>. We are looking to speak with investors and partners who are interested in this problem space and can help us validate the opportunity."</p>
        <div class="grid grid-cols-2 gap-2 text-[10px] text-gray-400">
          <div class="rounded-lg bg-gray-900 p-2"><span class="block text-gray-500">Problem</span> Manual workflows slow teams down.</div>
          <div class="rounded-lg bg-gray-900 p-2"><span class="block text-gray-500">Solution</span> AI-powered, low-friction workflow system.</div>
        </div>
      </div>`;
  };
  window.copyPitchText=function(){
    const text=document.getElementById('pitch-output')?.innerText || '';
    if(!text){showToast('Generate a pitch first.'); return;}
    if(navigator.clipboard){
      navigator.clipboard.writeText(text).then(()=>showToast('Pitch copied to clipboard!')).catch(()=>showToast('Pitch ready to copy.'));
    } else {
      showToast('Pitch ready to copy.');
    }
  };

  // Add Message buttons to existing directory cards without changing their design.
  function enhanceDirectory(){
    document.querySelectorAll('#directory-grid > div').forEach(card=>{
      if(card.dataset.vlEnhanced)return;
      const name=card.querySelector('h4')?.innerText?.trim() || card.querySelector('h3')?.innerText?.trim();
      if(!name)return;
      const actions=card.querySelector('.flex.items-center.justify-between');
      if(actions){
        const existing=actions.querySelector('[data-vl-message]');
        if(!existing){
          const btn=document.createElement('button');
          btn.dataset.vlMessage='1';
          btn.className='px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 text-[10px] font-bold hover:border-indigo-500 transition';
          btn.innerHTML='<i class="fa-regular fa-message mr-1"></i> Message';
          btn.onclick=()=>openMessageModal(name, card.dataset.userId);
          actions.appendChild(btn);
        }
      }
      card.dataset.vlEnhanced='1';
    });
  }

  // Small persistence hook for pitch/tool completion.
    window.markPitchReady=async function(){
        const authUser = await getLiveUserForWrite();
        if (!authUser) return;
        write('cslid_pitch_ready',true);
        saveToSupabase('cslid_tasks', {
            user_id: authUser.id,
            task_key: 'pitch_ready',
            complete: true
        });
        showToast('Pitch marked ready!');renderLaunchCenter();
    };

  // Wrap renderDirectory if present so the new message controls survive filters.
  const oldRenderDirectory=window.renderDirectory;
  if(typeof oldRenderDirectory==='function'){
    window.renderDirectory=function(){oldRenderDirectory.apply(this,arguments);setTimeout(enhanceDirectory,0)};
  }
  setTimeout(enhanceDirectory,300);
  setInterval(enhanceDirectory,1500);

  // Make core actions available to inline buttons in every browser.
  window.openStartupModal = window.openStartupModal || openStartupModal;
  window.closeStartupModal = window.closeStartupModal || closeStartupModal;
  window.saveStartup = window.saveStartup || saveStartup;
  window.filterDirectory = window.filterDirectory || filterDirectory;
  window.switchTab = window.switchTab || switchTab;
})();
