// LIVE STARTUP MATCH DECK
        // Startups publish their profile through "My Startup".
        // Investors then see those published profiles in the swipe deck.
        let currentProfileIndex = 0;
        let matchProfiles = [];

        function getRegisteredStartups() {
            try { return JSON.parse(localStorage.getItem('cslid_startups') || '[]'); }
            catch(e) { return []; }
        }

        function saveRegisteredStartups(list) {
            localStorage.setItem('cslid_startups', JSON.stringify(list));
        }

        function refreshMatchProfiles() {
            const startups = getRegisteredStartups();
            matchProfiles = startups.map(s => ({
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
            document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
            document.getElementById(`tab-${tabId}`).classList.remove('hidden');

            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.className = "nav-btn px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center space-x-2 text-gray-400 hover:text-white hover:bg-gray-800/50";
            });
            const activeBtn = document.getElementById(`nav-btn-${tabId}`);
            if(activeBtn) {
                activeBtn.className = "nav-btn px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center space-x-2 bg-indigo-600 text-white shadow-md shadow-indigo-600/30";
            }
        }

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
                document.getElementById('card-location').innerText = "â€”";
                document.getElementById('card-seeking').innerText = "â€”";
                document.getElementById('card-traction').innerText = "â€”";
                document.getElementById('card-bio').innerText = "Open Launch Center â†’ My Startup and publish a startup profile. Investors can then swipe through registered startups.";
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
                profile.tags.map(t => `<span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gray-800/80 border border-gray-700 text-indigo-300">#${t}</span>`).join('');
        }

        let matchedProfile = null;

        function handleSwipe(action) {
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

            setTimeout(() => {
                card.style.transform = 'none';
                card.style.opacity = '1';

                if (action === 'like' || action === 'super') {
                    const matches = getStore('cslid_matches', []);
                    if (!matches.some(m => m.id === profile.id)) {
                        const match = {
                            id: profile.id,
                            name: profile.name,
                            contactUrl: profile.contactUrl,
                            matchedAt: Date.now()
                        };
                        matches.push(match);
                        setStore('cslid_matches', matches);
                        const currentUser = getStore('cslid_user', {});
                        saveToSupabase('cslid_matches', {
                            id: `${currentUser.email || 'anonymous'}_${profile.id}`,
                            user_id: currentUser.email || 'anonymous',
                            name: match.name,
                            contact_url: match.contactUrl || null,
                            matched_at: new Date(match.matchedAt).toISOString()
                        });
                    }

                    // Acceptance takes the investor directly to the real contact
                    // page supplied by the startup.
                    if (profile.contactUrl) {
                        window.location.href = profile.contactUrl;
                        return;
                    }

                    openMatchModal(profile);
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
                                <h4 class="text-sm font-bold text-white">${post.author}</h4>
                                <p class="text-[10px] text-indigo-400 font-semibold">${post.role} â€¢ ${post.time}</p>
                            </div>
                        </div>
                        <button class="text-gray-500 hover:text-white"><i class="fa-solid fa-ellipsis"></i></button>
                    </div>
                    <p class="text-sm text-gray-300 leading-relaxed">${post.content}</p>
                    ${post.image ? `<div class="rounded-2xl overflow-hidden border border-gray-800 max-h-72"><img src="${post.image}" class="w-full h-full object-cover"></div>` : ''}
                    <div class="flex flex-wrap gap-1.5">
                        ${post.tags.map(t => `<span class="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400">#${t}</span>`).join('')}
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
            const grid = document.getElementById('directory-grid');
            grid.innerHTML = filtered.map(s => `
                <div class="glass p-5 rounded-3xl border border-gray-800 space-y-4 hover:border-indigo-500/50 transition">
                    <div class="h-36 rounded-2xl overflow-hidden bg-gray-800">
                        <img src="${s.image}" class="w-full h-full object-cover">
                    </div>
                    <div>
                        <div class="flex items-center justify-between">
                            <h4 class="font-bold text-base text-white">${s.name}</h4>
                            <span class="text-[10px] font-bold px-2 py-1 rounded bg-indigo-500/20 text-indigo-400">${s.sector}</span>
                        </div>
                        <p class="text-xs text-gray-400 mt-1"><i class="fa-solid fa-location-dot mr-1"></i> ${s.location} â€¢ Stage: ${s.stage}</p>
                    </div>
                    <div class="flex items-center justify-between pt-3 border-t border-gray-800 text-xs">
                        <span class="text-emerald-400 font-bold"><i class="fa-solid fa-sack-dollar mr-1"></i> Seeking ${s.raise}</span>
                        <button onclick="connectPersistently('${s.name.replace("'", "\'")}')" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition">Connect</button>
                    </div>
                </div>
            `).join('');
        }

        // AI Pitch Generator Logic
        function generateAIPitch() {
            const name = document.getElementById('ai-startup-name').value || "VentureAI";
            const concept = document.getElementById('ai-startup-concept').value || "Autonomous workflows";

            const resultContainer = document.getElementById('ai-output-result');
            resultContainer.innerHTML = `
                <div class="p-4 rounded-2xl bg-gray-900/90 border border-indigo-500/30 space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-indigo-400">ðŸ¦ˆ Shark Tank Elevator Pitch</span>
                        <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">Ready</span>
                    </div>
                    <p class="text-xs text-gray-200 leading-relaxed italic">"Hi Sharks, I'm the founder of <b>${name}</b>. We live in a world where ${concept}. Existing solutions are slow and expensive. We solve this by automating the core bottleneck, delivering 10x faster results at a fraction of the cost. We are growing 30% month-over-month and looking for strategic partners today."</p>
                    <div class="pt-2 border-t border-gray-800 text-[11px] text-gray-400 space-y-1">
                        <div><b>Value Prop:</b> 10x speed improvement on core legacy workflows.</div>
                        <div><b>Target Market:</b> B2B enterprises & high-growth SMBs.</div>
                    </div>
                </div>
            `;
            showToast('AI Pitch generated successfully!');
        }

        function copyAIPitch() {
            showToast('Pitch copied to clipboard!');
        }

        // Modals & Toasts
        function openMatchModal(profile) {
            matchedProfile = profile || null;
            document.getElementById('match-modal-text').innerText = profile
                ? `You accepted ${profile.name}. Open the real contact page provided by the startup.`
                : 'Connection accepted.';
            const btn = document.getElementById('match-contact-btn');
            if (btn) btn.innerText = profile && profile.contactUrl
                ? 'Open Startup Contact Page'
                : 'Contact page unavailable';
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
        function submitNewPost() {
            const content = document.getElementById('new-post-content').value;
            if(!content.trim()) return;
            const currentUser = getStore('cslid_user', {});
            const currentProfile = getStore('cslid_profile', {});
            feedPosts.unshift({
                author: currentProfile.name || currentUser.name || "Founder",
                role: currentProfile.startup || "Founder",
                avatar: currentProfile.avatar || null,
                time: "Just now",
                content: content,
                image: null,
                likes: 1,
                comments: 0,
                tags: ["Update", "FounderJourney"]
            });
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

        function saveProfile() {
            const inputs = document.querySelectorAll('#tab-profile input');
            const profile = {
                name: inputs[0]?.value || '',
                startup: inputs[1]?.value || ''
            };
            setStore('cslid_profile', profile);
            const currentUser = getStore('cslid_user', {});
            saveToSupabase('cslid_profiles', {
                id: currentUser.email || 'anonymous',
                user_id: currentUser.email || 'anonymous',
                name: profile.name,
                startup: profile.startup
            });
            showToast('Profile saved on this device!');
        }

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

        function completeAuth() {
            const name = document.getElementById('auth-name').value.trim();
            const email = document.getElementById('auth-email').value.trim();
            if(!name || !email) return showToast('Enter your name and email.');
            setStore('cslid_user', {name, email});
            saveToSupabase('cslid_users', {id: email, name, email});
            document.getElementById('auth-modal').classList.add('hidden');
            document.getElementById('auth-modal').classList.remove('flex');
            updateUserUI();
            showToast('Account created on this device!');
        }

        function updateUserUI() {
            const user = getStore('cslid_user', null);
            if(!user) return;
            const labels = document.querySelectorAll('#nav-btn-profile span');
            if(labels.length) labels[0].innerText = user.name;
            const profile = getStore('cslid_profile', {});
            const name = document.getElementById('profile-name');
            const startup = document.getElementById('profile-startup');
            const nameInput = document.getElementById('profile-name-input');
            const startupInput = document.getElementById('profile-startup-input');
            if(name) name.innerText = profile.name || user.name || 'Your profile';
            if(startup) startup.innerText = profile.startup || 'Add your founder profile';
            if(nameInput) nameInput.value = profile.name || user.name || '';
            if(startupInput) startupInput.value = profile.startup || '';
        }

        function openStartupModal() {
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
            }
            document.getElementById('startup-modal').classList.remove('hidden');
            document.getElementById('startup-modal').classList.add('flex');
        }

        function closeStartupModal() {
            document.getElementById('startup-modal').classList.add('hidden');
            document.getElementById('startup-modal').classList.remove('flex');
        }

        function saveStartup() {
            const user = getStore('cslid_user', {});
            const startup = {
                id: user.email || ('startup_' + Date.now()),
                name: document.getElementById('startup-name').value.trim(),
                tagline: document.getElementById('startup-tagline').value.trim(),
                stage: document.getElementById('startup-stage').value,
                sector: document.getElementById('startup-sector').value.trim(),
                problem: document.getElementById('startup-problem').value.trim(),
                location: document.getElementById('startup-location').value.trim(),
                seeking: document.getElementById('startup-seeking').value.trim(),
                traction: document.getElementById('startup-traction').value.trim(),
                contactUrl: document.getElementById('startup-contact').value.trim()
            };

            if (!startup.name || !startup.tagline || !startup.contactUrl) {
                return showToast('Add startup name, one-line description and a real contact page URL.');
            }

            try { new URL(startup.contactUrl); }
            catch(e) { return showToast('Enter a valid contact page URL starting with https://'); }

            const startups = getRegisteredStartups();
            const idx = startups.findIndex(x => x.id === startup.id);
            if (idx >= 0) startups[idx] = startup;
            else startups.push(startup);

            saveRegisteredStartups(startups);
            setStore('cslid_startup', startup);
            saveToSupabase('cslid_startups', {
                id: startup.id,
                user_id: user.email || 'anonymous',
                name: startup.name,
                tagline: startup.tagline,
                stage: startup.stage,
                sector: startup.sector,
                problem: startup.problem,
                location: startup.location,
                seeking: startup.seeking,
                traction: startup.traction,
                contact_url: startup.contactUrl
            });
            closeStartupModal();
            refreshMatchProfiles();
            showToast('Startup is now live in the investor swipe deck!');
        }

        // Persist newly created posts.
        const originalSubmitNewPost = submitNewPost;
        submitNewPost = function() {
            originalSubmitNewPost();
            setStore('cslid_posts', feedPosts);
            const post = feedPosts[0];
            const currentUser = getStore('cslid_user', {});
            saveToSupabase('cslid_posts', {
                id: post.id || `post_${Date.now()}`,
                user_id: currentUser.email || 'anonymous',
                author: post.author,
                role: post.role,
                post_time: post.time,
                content: post.content,
                image: post.image,
                likes: post.likes,
                comments: post.comments,
                tags: post.tags
            });
        };

        // Make directory connections persist locally.
        function connectPersistently(name) {
            const connections = getStore('cslid_connections', []);
            if(!connections.includes(name)) {
                connections.push(name);
                setStore('cslid_connections', connections);
                const currentUser = getStore('cslid_user', {});
                saveToSupabase('cslid_connections', {
                    id: `${currentUser.email || 'anonymous'}_${name}`,
                    user_id: currentUser.email || 'anonymous',
                    name
                });
                showToast(`Connection request sent to ${name}!`);
            } else {
                showToast(`You already connected with ${name}.`);
            }
        }

        async function hydrateFromSupabase() {
            if (!window.SUPABASE_CONFIGURED) return;
            const [posts, startups, connections, matches, messages, tasks] = await Promise.all([
                fetchFromSupabase('cslid_posts'),
                fetchFromSupabase('cslid_startups'),
                fetchFromSupabase('cslid_connections'),
                fetchFromSupabase('cslid_matches'),
                fetchFromSupabase('cslid_messages'),
                fetchFromSupabase('cslid_tasks')
            ]);
            const currentUser = getStore('cslid_user', {});
            const userId = currentUser.email || 'anonymous';
            const profiles = await fetchFromSupabase('cslid_profiles');
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
                name: startup.name,
                sector: startup.sector || 'Startup',
                stage: startup.stage || 'Early Stage',
                location: startup.location || 'Location not provided',
                raise: startup.seeking || 'Not specified',
                image: startup.image || null
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
                contactUrl: startup.contact_url
            })));
            const ownStartup = startups.find(item => item.user_id === userId || item.id === userId);
            if (ownStartup) {
                const localStartup = {
                    id: ownStartup.id, name: ownStartup.name, tagline: ownStartup.tagline,
                    stage: ownStartup.stage, sector: ownStartup.sector, problem: ownStartup.problem,
                    location: ownStartup.location, seeking: ownStartup.seeking, traction: ownStartup.traction,
                    contactUrl: ownStartup.contact_url
                };
                setStore('cslid_startup', localStartup);
            }
            setStore('cslid_connections', connections.filter(item => item.user_id === userId).map(item => item.name));
            setStore('cslid_matches', matches.filter(item => item.user_id === userId).map(item => ({
                id: item.id, name: item.name, contactUrl: item.contact_url, matchedAt: item.matched_at
            })));
            const threads = {};
            messages.filter(item => item.user_id === userId).forEach(item => { threads[item.thread_key] = item.messages || []; });
            setStore('cslid_messages', threads);
            const pitchTask = tasks.find(item => item.user_id === userId && item.task_key === 'pitch_ready');
            setStore('cslid_pitch_ready', Boolean(pitchTask && pitchTask.complete));
            renderFeed();
            filterDirectory('all');
            refreshMatchProfiles();
        }

        // Initialize App on Load
        window.onload = async function() {
            await hydrateFromSupabase();
            refreshMatchProfiles();
            renderFeed();
            filterDirectory('all');
            updateUserUI();

            // First-run account gate.
            if(!getStore('cslid_user', null)) {
                setTimeout(() => {
                    document.getElementById('auth-modal').classList.remove('hidden');
                    document.getElementById('auth-modal').classList.add('flex');
                }, 250);
            }
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
    renderLaunchCenter();
    const el=document.getElementById('launch-center');el.classList.remove('hidden');el.classList.add('flex');
  };
  window.closeLaunchCenter=function(){const el=document.getElementById('launch-center');el.classList.add('hidden');el.classList.remove('flex')};

  function renderLaunchCenter(){
    const s=startup(), u=user(), con=read(K.connections,[]), posts=read(K.posts,[]);
    const checks=[
      ['Account created',!!u,'Create your founder account'],
      ['Startup created',!!s,'Add your startup details'],
      ['Startup description',!!(s&&s.tagline),'Add a clear one-line pitch'],
      ['Problem defined',!!(s&&s.problem),'Explain the problem'],
      ['First post',posts.length>0,'Publish your first journey update'],
      ['First connection',con.length>0,'Connect with someone in the directory'],
    ['Pitch ready',read('cslid_pitch_ready',false),'Complete your pitch deck'],
      ['Launch page',!!s,'Preview your public startup page']
    ];
    const done=checks.filter(x=>x[1]).length, pct=Math.round(done/checks.length*100);
    document.getElementById('launch-kpis').innerHTML=[
      ['Progress',pct+'%'],['Posts',posts.length],['Connections',con.length],['Stage',s?.stage||'â€”']
    ].map(x=>`<div class="vl-kpi"><strong>${x[1]}</strong><span>${x[0]}</span></div>`).join('');

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
  }

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

  window.openMessageModal=function(name){
    document.getElementById('message-title').innerHTML=`Message <span class="text-indigo-400">${name}</span>`;
    document.getElementById('message-modal').dataset.person=name;
    renderMessages(name);
    const el=document.getElementById('message-modal');el.classList.remove('hidden');el.classList.add('flex');
  };
  window.closeMessageModal=function(){const el=document.getElementById('message-modal');el.classList.add('hidden');el.classList.remove('flex')};
  function renderMessages(name){
    const all=read(K.messages,{});
    const arr=all[name]||[];
    document.getElementById('message-thread').innerHTML=arr.length?arr.map(m=>`<div class="${m.me?'text-right':''}"><span class="inline-block max-w-[85%] rounded-xl px-3 py-2 text-xs ${m.me?'bg-indigo-600':'bg-gray-900 text-gray-300'}">${escapeHtml(m.text)}</span></div>`).join(''):`<div class="text-center text-gray-600 text-xs py-16">No messages yet. Start the conversation.</div>`;
  }
  window.sendMessage=function(){
    const input=document.getElementById('message-input'), text=input.value.trim(), name=document.getElementById('message-modal').dataset.person;
    if(!text)return;
        const all=read(K.messages,{});all[name]=all[name]||[];all[name].push({text,me:true,time:Date.now()});write(K.messages,all);
        const currentUser = user() || {};
        saveToSupabase('cslid_messages', {
            id: `${currentUser.email || 'anonymous'}_${name}`,
            user_id: currentUser.email || 'anonymous',
            thread_key: name,
            messages: all[name]
        });
        input.value='';renderMessages(name);showToast('Message saved');
  };

  window.openPublicStartup=function(){
    const s=startup(), c=document.getElementById('public-startup-content');
    if(!s){c.innerHTML='<div class="vl-empty">Create your startup first.</div>';}
    else c.innerHTML=`
      <div class="text-center py-5">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-pink-500 to-amber-400 mx-auto flex items-center justify-center"><i class="fa-solid fa-rocket text-white text-xl"></i></div>
        <p class="text-[10px] uppercase tracking-widest text-gray-500 mt-4">${escapeHtml(s.stage)} Â· ${escapeHtml(s.sector||'Startup')}</p>
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
        <p class="text-sm leading-relaxed text-gray-200">â€œHi, Iâ€™m the founder of <strong class="text-white">${escapeHtml(name)}</strong>. We are building <strong class="text-white">${escapeHtml(concept)}</strong> to remove the biggest bottleneck in modern operations: speed, visibility, and manual execution. Our product delivers a clear ROI, reduces overhead, and helps teams scale faster without adding headcount. Weâ€™re raising to accelerate product, distribution, and customer traction.â€</p>
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

  function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}

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
          btn.onclick=()=>openMessageModal(name);
          actions.appendChild(btn);
        }
      }
      card.dataset.vlEnhanced='1';
    });
  }

  // Small persistence hook for pitch/tool completion.
    window.markPitchReady=function(){
        write('cslid_pitch_ready',true);
        const currentUser = user() || {};
        saveToSupabase('cslid_tasks', {
            id: `${currentUser.email || 'anonymous'}_pitch_ready`,
            user_id: currentUser.email || 'anonymous',
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
