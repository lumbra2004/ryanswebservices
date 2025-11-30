
class MessagesSystem {
    constructor() {
        this.currentUser = null;
        this.currentConversation = null;
        this.conversations = [];
        this.messages = [];
        this.unreadCount = 0;
        this.isWidgetOpen = false;
        this.realtimeSubscription = null;
        this.recentlySentIds = new Set();
        this.eventListenersSet = false;
        this.realtimeSetup = false;
        this.init();
    }

    async init() {
        if (typeof supabase === 'undefined') {
            setTimeout(() => this.init(), 100);
            return;
        }


        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            this.currentUser = {
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata.full_name || session.user.email.split('@')[0]
            };
            await this.loadConversations();
            this.setupRealtimeSubscription();
        }


        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                this.currentUser = {
                    id: session.user.id,
                    email: session.user.email,
                    name: session.user.user_metadata.full_name || session.user.email.split('@')[0]
                };
                await this.loadConversations();
                this.setupRealtimeSubscription();
                this.updateUI();
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.conversations = [];
                this.messages = [];
                this.unreadCount = 0;
                if (this.realtimeSubscription) {
                    this.realtimeSubscription.unsubscribe();
                }
                this.updateUI();
            }
        });

        this.setupEventListeners();
        this.updateUI();
    }

    setupEventListeners() {

        if (this.eventListenersSet) return;
        this.eventListenersSet = true;


        const messageBtn = document.getElementById('messageButton');
        if (messageBtn) {
            messageBtn.addEventListener('click', () => this.toggleWidget());
        }


        const closeWidgetBtn = document.getElementById('closeWidgetBtn');
        if (closeWidgetBtn) {
            closeWidgetBtn.addEventListener('click', () => this.closeWidget());
        }


        const expandBtn = document.getElementById('expandChatBtn');
        if (expandBtn) {
            expandBtn.addEventListener('click', () => {
                window.location.href = '/messages.html';
            });
        }


        const widgetInput = document.getElementById('widgetMessageInput');
        const widgetSendBtn = document.getElementById('widgetSendBtn');

        if (widgetInput && widgetSendBtn) {
            widgetSendBtn.addEventListener('click', () => this.sendWidgetMessage());
            widgetInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendWidgetMessage();
                }
            });
        }


        const chatLoginBtn = document.getElementById('chatLoginBtn');
        if (chatLoginBtn) {
            chatLoginBtn.addEventListener('click', () => {
                this.closeWidget();
                window.location.href = '/login.html';
            });
        }


        document.addEventListener('click', (e) => {
            const widget = document.getElementById('chatWidget');
            const messageBtn = document.getElementById('messageButton');
            if (widget && this.isWidgetOpen &&
                !widget.contains(e.target) &&
                !messageBtn.contains(e.target)) {
                this.closeWidget();
            }
        });


        this.setupTouchScrolling();
    }

    setupTouchScrolling() {
        const messagesArea = document.getElementById('widgetMessages');
        const widget = document.getElementById('chatWidget');

        if (!messagesArea || !widget) return;

        let startY = 0;
        let startScrollTop = 0;


        widget.addEventListener('touchstart', (e) => {
            if (messagesArea.contains(e.target)) {
                startY = e.touches[0].pageY;
                startScrollTop = messagesArea.scrollTop;
            }
        }, { passive: true });

        widget.addEventListener('touchmove', (e) => {
            if (!messagesArea.contains(e.target)) {

                e.preventDefault();
                return;
            }

            const currentY = e.touches[0].pageY;
            const deltaY = startY - currentY;


            messagesArea.scrollTop = startScrollTop + deltaY;


            e.preventDefault();
        }, { passive: false });
    }

    async loadConversations() {
        if (!this.currentUser) return;

        try {

            const { data: conversations, error } = await supabase
                .from('conversations')
                .select(`
                    *,
                    messages (
                        id,
                        content,
                        created_at,
                        sender_id,
                        read
                    )
                `)
                .eq('user_id', this.currentUser.id)
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Error loading conversations:', error);
                return;
            }

            this.conversations = conversations || [];


            this.unreadCount = 0;
            this.conversations.forEach(conv => {
                const unreadMessages = conv.messages?.filter(m =>
                    !m.read && m.sender_id !== this.currentUser.id
                ) || [];
                this.unreadCount += unreadMessages.length;
            });

            this.updateUnreadBadge();
        } catch (err) {
            console.error('Error loading conversations:', err);
        }
    }

    async loadMessages(conversationId) {
        if (!conversationId) return;

        try {
            const { data: messages, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error loading messages:', error);
                return;
            }

            this.messages = messages || [];
            this.currentConversation = conversationId;


            await this.markMessagesAsRead(conversationId);

            return this.messages;
        } catch (err) {
            console.error('Error loading messages:', err);
        }
    }

    async markMessagesAsRead(conversationId) {
        if (!this.currentUser) return;

        try {
            await supabase
                .from('messages')
                .update({ read: true })
                .eq('conversation_id', conversationId)
                .neq('sender_id', this.currentUser.id);


            await this.loadConversations();
        } catch (err) {
            console.error('Error marking messages as read:', err);
        }
    }

    async sendMessage(content, conversationId = null) {
        if (!this.currentUser || !content.trim()) return null;

        try {

            if (!conversationId) {
                const { data: newConv, error: convError } = await supabase
                    .from('conversations')
                    .insert({
                        user_id: this.currentUser.id,
                        user_email: this.currentUser.email,
                        user_name: this.currentUser.name,
                        subject: 'New conversation',
                        updated_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (convError) {
                    console.error('Error creating conversation:', convError);
                    return null;
                }
                conversationId = newConv.id;
                this.currentConversation = conversationId;
            }


            const { data: message, error } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    sender_id: this.currentUser.id,
                    sender_name: this.currentUser.name,
                    sender_email: this.currentUser.email,
                    content: content.trim(),
                    read: false
                })
                .select()
                .single();

            if (error) {
                console.error('Error sending message:', error);
                return null;
            }


            await supabase
                .from('conversations')
                .update({
                    updated_at: new Date().toISOString(),
                    last_message: content.trim().substring(0, 100)
                })
                .eq('id', conversationId);

            return message;
        } catch (err) {
            console.error('Error sending message:', err);
            return null;
        }
    }

    async sendWidgetMessage() {
        const input = document.getElementById('widgetMessageInput');
        const sendBtn = document.getElementById('widgetSendBtn');
        if (!input || !input.value.trim()) return;


        if (sendBtn && sendBtn.disabled) return;

        const content = input.value.trim();
        input.value = '';


        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.style.opacity = '0.5';
        }


        let convId = this.currentConversation;
        if (!convId && this.conversations.length > 0) {
            convId = this.conversations[0].id;
        }


        await this.sendMessage(content, convId);


        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.style.opacity = '1';
        }
    }

    setupRealtimeSubscription() {
        if (!this.currentUser) return;


        if (this.realtimeSetup) return;
        this.realtimeSetup = true;


        if (this.realtimeSubscription) {
            this.realtimeSubscription.unsubscribe();
        }


        this.realtimeSubscription = supabase
            .channel('messages-' + this.currentUser.id)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, (payload) => {
                const newMessage = payload.new;


                const isForCurrentConversation = newMessage.conversation_id === this.currentConversation;

                if (isForCurrentConversation) {

                    const existingIndex = this.messages.findIndex(m => m.id === newMessage.id);
                    if (existingIndex === -1) {
                        this.messages.push({ ...newMessage, status: 'sent' });
                        this.renderWidgetMessages();


                        const container = document.getElementById('widgetMessages');
                        if (container) {
                            container.scrollTop = container.scrollHeight;
                        }
                    }


                    if (this.isWidgetOpen && newMessage.sender_id !== this.currentUser.id) {
                        this.markMessagesAsRead(this.currentConversation);
                    }
                }


                this.loadConversations();
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'messages'
            }, (payload) => {

                const updatedMessage = payload.new;
                const index = this.messages.findIndex(m => m.id === updatedMessage.id);
                if (index !== -1) {
                    this.messages[index] = { ...this.messages[index], ...updatedMessage };
                    this.renderWidgetMessages();
                }
            })
            .subscribe();
    }

    toggleWidget() {
        if (this.isWidgetOpen) {
            this.closeWidget();
        } else {
            this.openWidget();
        }
    }

    openWidget() {
        const widget = document.getElementById('chatWidget');
        if (widget) {
            widget.classList.add('active');
            this.isWidgetOpen = true;


            document.body.style.overflow = 'hidden';

            if (this.currentUser) {

                if (this.conversations.length > 0) {
                    this.loadMessages(this.conversations[0].id).then(() => {
                        this.renderWidgetMessages();
                    });
                } else {
                    this.renderWidgetMessages();
                }
            }
        }
    }

    closeWidget() {
        const widget = document.getElementById('chatWidget');
        if (widget) {
            widget.classList.remove('active');
            this.isWidgetOpen = false;


            document.body.style.overflow = '';
        }
    }

    updateUI() {
        this.updateUnreadBadge();
        this.updateWidgetContent();
    }

    updateUnreadBadge() {

        const badge = document.getElementById('messageUnreadBadge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }


        const profileBadge = document.getElementById('profileUnreadBadge');
        if (profileBadge) {
            if (this.unreadCount > 0) {
                profileBadge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                profileBadge.style.display = 'flex';
            } else {
                profileBadge.style.display = 'none';
            }
        }


        const menuBadge = document.getElementById('messagesMenuBadge');
        if (menuBadge) {
            if (this.unreadCount > 0) {
                menuBadge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                menuBadge.style.display = 'inline-flex';
            } else {
                menuBadge.style.display = 'none';
            }
        }
    }

    updateWidgetContent() {
        const loginPrompt = document.getElementById('chatLoginPrompt');
        const chatContent = document.getElementById('chatContent');

        if (loginPrompt && chatContent) {
            if (this.currentUser) {
                loginPrompt.style.display = 'none';
                chatContent.style.display = 'flex';
            } else {
                loginPrompt.style.display = 'flex';
                chatContent.style.display = 'none';
            }
        }
    }

    renderWidgetMessages() {
        const container = document.getElementById('widgetMessages');
        if (!container) return;

        if (this.messages.length === 0) {
            container.innerHTML = `
                <div class="chat-empty-state">
                    <div class="chat-empty-state-icon">💬</div>
                    <h4>Start a Conversation</h4>
                    <p>Send a message to get help with your project or ask any questions!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.messages.map(msg => {
            const isSent = msg.sender_id === this.currentUser?.id;
            const statusIcon = this.getMessageStatusIcon(msg);

            return `
                <div class="chat-message ${isSent ? 'sent' : 'received'} ${msg.status || ''}">
                    <div class="chat-message-content">${this.escapeHtml(msg.content)}</div>
                    <div class="chat-message-meta">
                        <span class="chat-message-time">${this.formatTime(msg.created_at)}</span>
                        ${isSent ? `<span class="chat-message-status">${statusIcon}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');


        container.scrollTop = container.scrollHeight;
    }

    getMessageStatusIcon(msg) {

        if (msg.status === 'sending') {
            return '<span class="status-sending">○</span>';
        }

        if (msg.status === 'failed') {
            return '<span class="status-failed">✕</span>';
        }

        if (msg.read === true || msg.is_read === true) {
            return '<img src="favicon_io/favicon-16x16.png" alt="Seen" class="status-read-logo">';
        }

        return '<span class="status-sent">✓</span>';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;


        if (diff < 86400000) {
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        }


        if (diff < 604800000) {
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        }


        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === now.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
            });
        }
    }
}


let messagesSystem;
document.addEventListener('DOMContentLoaded', () => {
    messagesSystem = new MessagesSystem();
});

window.MessagesSystem = MessagesSystem;
window.messagesSystem = null;

console.log('%c✓ messages.js loaded successfully', 'color: #10b981; font-weight: 500');
