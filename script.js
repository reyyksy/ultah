document.addEventListener('DOMContentLoaded', function () {
    console.log('✅ DOM siap!');

    // ----- ELEMEN -----
    const card = document.getElementById('card');
    const openBtn = document.getElementById('openCard');
    const musicToggle = document.getElementById('musicToggle');
    const audio = document.getElementById('bgMusic');

    // Cek elemen kritis
    if (!card || !openBtn) {
        console.error('❌ Elemen card atau tombol tidak ditemukan!');
        return;
    }
    console.log('✅ Elemen ditemukan:', { card, openBtn });

    // ----- BUKA KARTU (PASTIKAN INI JALAN) -----
    openBtn.addEventListener('click', function () {
        console.log('🔄 Tombol Buka Kartu diklik!');
        card.classList.toggle('flipped');
        if (card.classList.contains('flipped')) {
            openBtn.textContent = '📖 Tutup';
            if (typeof renderMessages === 'function') {
                renderMessages();
            }
        } else {
            openBtn.textContent = 'Buka Kartu';
        }
    });

    // ----- INISIALISASI SUPABASE (dengan error handling) -----
    let supabase = null;
    try {
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            const SUPABASE_URL = 'https://mchvkgmerllkczuodoeh.supabase.co';
            const SUPABASE_KEY = 'sb_publishable_4Eg7qVwZ-CMbhuN_Mv6VkA_6pXyx98d';
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log('✅ Supabase client siap');
        } else {
            console.warn('⚠️ window.supabase tidak tersedia. Cek CDN.');
        }
    } catch (e) {
        console.error('❌ Gagal inisialisasi Supabase:', e);
    }

    // ----- FUNGSI DATABASE (hanya jika supabase tersedia) -----
    async function saveMessage(name, message) {
        if (!supabase) throw new Error('Supabase tidak siap');
        const { data, error } = await supabase
            .from('messages')
            .insert([{ name, message }]);
        if (error) throw error;
        return data;
    }

    async function fetchMessages() {
        if (!supabase) throw new Error('Supabase tidak siap');
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    // ----- TAB -----
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabKirim = document.getElementById('tabKirim');
    const tabLihat = document.getElementById('tabLihat');
    const messageList = document.getElementById('messageList');

    function switchTab(tabId) {
        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        if (tabId === 'kirim') {
            tabKirim.classList.add('active');
            tabLihat.classList.remove('active');
        } else {
            tabLihat.classList.add('active');
            tabKirim.classList.remove('active');
            renderMessages();
        }
        const feedback = document.getElementById('submitFeedback');
        if (feedback) feedback.textContent = '';
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            switchTab(this.dataset.tab);
        });
    });

    // ----- KIRIM PESAN -----
    const senderName = document.getElementById('senderName');
    const messageText = document.getElementById('messageText');
    const submitBtn = document.getElementById('submitMessage');
    const feedback = document.getElementById('submitFeedback');

    if (submitBtn) {
        submitBtn.addEventListener('click', async function () {
            const name = senderName.value.trim() || null;
            const message = messageText.value.trim();

            if (message === '') {
                feedback.style.color = '#ef5350';
                feedback.textContent = '✏️ Yuk tulis pesannya dulu!';
                return;
            }

            try {
                await saveMessage(name, message);
                senderName.value = '';
                messageText.value = '';
                feedback.style.color = '#4caf50';
                feedback.textContent = '✅ Ucapan terkirim! Terima kasih 💙';

                if (tabLihat.classList.contains('active')) {
                    renderMessages();
                }

                submitBtn.textContent = '✨ Tersimpan!';
                setTimeout(() => {
                    submitBtn.textContent = 'Kirim Ucapan 💌';
                }, 1500);
            } catch (err) {
                console.error(err);
                feedback.style.color = '#ef5350';
                feedback.textContent = '❌ Gagal mengirim. Coba lagi nanti.';
            }
        });
    }

    // ----- RENDER PESAN -----
    async function renderMessages() {
        if (!messageList) return;
        try {
            const messages = await fetchMessages();
            if (messages.length === 0) {
                messageList.innerHTML = `<p class="empty-state">Belum ada ucapan. Jadilah yang pertama! 🥳</p>`;
                return;
            }

            let html = '';
            messages.forEach(msg => {
                const displayName = msg.name && msg.name.trim() !== ''
                    ? `👤 ${escapeHtml(msg.name)}`
                    : `<span class="anon">🕊️ Anonim</span>`;
                html += `
                    <div class="message-item">
                        <div class="msg-name">${displayName}</div>
                        <div class="msg-text">${escapeHtml(msg.message)}</div>
                        <span class="msg-time">${formatDate(msg.created_at)}</span>
                    </div>
                `;
            });
            messageList.innerHTML = html;
        } catch (err) {
            console.error(err);
            messageList.innerHTML = `<p class="empty-state">⚠️ Gagal memuat pesan. Coba refresh.</p>`;
        }
    }

    // ----- HELPER -----
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(isoString) {
        const d = new Date(isoString);
        return d.toLocaleString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // ----- PLAYLIST (URUTAN TETAP) -----
    const PLAYLIST = [
        { src: 'assets/music-1.mp3', title: '🎵 Lagu Pertama' },
        { src: 'assets/music-2.mp3', title: '🎶 Lagu Kedua' },
        { src: 'assets/music-3.mp3', title: '🎧 Lagu Ketiga' }
    ];

    let currentIndex = 0;
    let isPlaying = false;

    // ----- FUNGSI PUTAR LAGU BERDASARKAN INDEX -----
    function playSong(index) {
        const song = PLAYLIST[index];
        audio.src = song.src;
        audio.load();
        audio.play()
            .then(() => {
                isPlaying = true;
                musicToggle.classList.add('playing');
                musicToggle.innerHTML = `<span class="music-icon">🔊</span> ${song.title}`;
            })
            .catch(() => {
                isPlaying = false;
                musicToggle.classList.remove('playing');
                musicToggle.innerHTML = '<span class="music-icon">🔇</span> Lagu Error';
            });
    }

    // ----- FUNGSI PINDAM KE LAGU BERIKUTNYA (SEQUENTIAL) -----
    function nextSong() {
        currentIndex = (currentIndex + 1) % PLAYLIST.length;
        playSong(currentIndex);
    }

    // ----- SAAT LAGU SELESAI -----
    audio.addEventListener('ended', function () {
        if (isPlaying) {
            nextSong();
        }
    });

    // ----- TOMBOL TOGGLE PLAY/PAUSE -----
    musicToggle.addEventListener('click', function () {
        if (audio.paused) {
            audio.play()
                .then(() => {
                    isPlaying = true;
                    this.classList.add('playing');
                    const title = PLAYLIST[currentIndex].title;
                    this.innerHTML = `<span class="music-icon">🔊</span> ${title}`;
                })
                .catch(() => {
                    playSong(currentIndex);
                });
        } else {
            audio.pause();
            isPlaying = false;
            this.classList.remove('playing');
            this.innerHTML = '<span class="music-icon">🔇</span> Putar Lagu';
        }
    });

    // ----- INISIALISASI MUSIK SAAT PERTAMA LOAD -----
    currentIndex = 0;
    const firstSong = PLAYLIST[0];
    audio.src = firstSong.src;
    audio.load();
    musicToggle.innerHTML = `<span class="music-icon">▶️</span> ${firstSong.title}`;

    console.log('🎂 Buku Tamu Ultah siap!');
});