// Messages System with Supabase
class MessagesSystem {
    constructor() {
        this.currentUser = null;
        this.currentConversation = null;
        this.conversations = [];
        this.messages = [];
        this.unreadCount = 0;
        this.isWidgetOpen = false;
        this.realtimeSubscription = null;
        this.recentlySentIds = new Set(); // Track IDs of messages we just sent
        this.eventListenersSet = false; // Prevent duplicate listeners
        this.realtimeSetup = false; // Prevent duplicate subscriptions
        this.init();
    }

    async init() {
        // Wait for Supabase to be available
        if (typeof supabase === 'undefined') {
            console.log('Waiting for Supabase...');
            setTimeout(() => this.init(), 100);
            return;
        }

        // Check auth state
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

        // Listen for auth changes
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
        // Only set up listeners once
        if (this.eventListenersSet) return;
        this.eventListenersSet = true;
        
        // Message button toggle
        const messageBtn = document.getElementById('messageButton');
        if (messageBtn) {
            messageBtn.addEventListener('click', () => this.toggleWidget());
        }

        // Close widget button
        const closeWidgetBtn = document.getElementById('closeWidgetBtn');
        if (closeWidgetBtn) {
            closeWidgetBtn.addEventListener('click', () => this.closeWidget());
        }

        // Expand to full page button
        const expandBtn = document.getElementById('expandChatBtn');
        if (expandBtn) {
            expandBtn.addEventListener('click', () => {
                window.location.href = '/messages.html';
            });
        }

        // Widget send message
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

        // Login button in widget
        const chatLoginBtn = document.getElementById('chatLoginBtn');
        if (chatLoginBtn) {
            chatLoginBtn.addEventListener('click', () => {
                this.closeWidget();
                window.location.href = '/login.html';
            });
        }

        // Close widget when clicking outside
        document.addEventListener('click', (e) => {
            const widget = document.getElementById('chatWidget');
            const messageBtn = document.getElementById('messageButton');
            if (widget && this.isWidgetOpen && 
                !widget.contains(e.target) && 
                !messageBtn.contains(e.target)) {
                this.closeWidget();
            }
        });
    }

    async loadConversations() {
        if (!this.currentUser) return;

        try {
            // Get conversations for current user
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
                .or(`user_id.eq.${this.currentUser.id},admin_id.eq.${this.currentUser.id}`)
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Error loading conversations:', error);
                return;
            }

            this.conversations = conversations || [];
            
            // Calculate unread count
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

            // Mark messages as read
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
            
            // Update local unread count
            await this.loadConversations();
        } catch (err) {
            console.error('Error marking messages as read:', err);
        }
    }

    async sendMessage(content, conversationId = null) {
        if (!this.currentUser || !content.trim()) return null;

        try {
            // If no conversation exists, create one with admin
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

            // Send the message
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

            // Update conversation timestamp
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
        
        // Prevent double-sending
        if (sendBtn && sendBtn.disabled) return;

        const content = input.value.trim();
        input.value = '';
        
        // Disable send button while sending
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.style.opacity = '0.5';
        }

        // Get or create conversation
        let convId = this.currentConversation;
        if (!convId && this.conversations.length > 0) {
            convId = this.conversations[0].id;
        }

        // Send the message - realtime subscription will handle displaying it
        await this.sendMessage(content, convId);
        
        // Re-enable send button
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.style.opacity = '1';
        }
    }

    setupRealtimeSubscription() {
        if (!this.currentUser) return;
        
        // Only set up once
        if (this.realtimeSetup) return;
        this.realtimeSetup = true;

        // Unsubscribe from existing subscription
        if (this.realtimeSubscription) {
            this.realtimeSubscription.unsubscribe();
        }

        // Subscribe to new messages with unique channel name
        this.realtimeSubscription = supabase
            .channel('messages-' + this.currentUser.id)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, (payload) => {
                const newMessage = payload.new;
                
                // Check if message is for current user's conversation
                const isForCurrentConversation = newMessage.conversation_id === this.currentConversation;
                
                if (isForCurrentConversation) {
                    // Add if not already present (check by ID)
                    const existingIndex = this.messages.findIndex(m => m.id === newMessage.id);
                    if (existingIndex === -1) {
                        this.messages.push({ ...newMessage, status: 'sent' });
                        this.renderWidgetMessages();
                        
                        // Scroll to bottom
                        const container = document.getElementById('widgetMessages');
                        if (container) {
                            container.scrollTop = container.scrollHeight;
                        }
                    }
                    
                    // Auto-mark as read if widget is open and message is from someone else
                    if (this.isWidgetOpen && newMessage.sender_id !== this.currentUser.id) {
                        this.markMessagesAsRead(this.currentConversation);
                    }
                }
                
                // Reload conversations to update unread counts
                this.loadConversations();
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'messages'
            }, (payload) => {
                // Update read status when messages are marked as read
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
            
            if (this.currentUser) {
                // Load most recent conversation
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

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    getMessageStatusIcon(msg) {
        // Check status - sending
        if (msg.status === 'sending') {
            return '<span class="status-sending">○</span>';
        }
        // Failed to send
        if (msg.status === 'failed') {
            return '<span class="status-failed">✕</span>';
        }
        // Read - show company logo (check both 'read' field and is_read)
        if (msg.read === true || msg.is_read === true) {
            return '<img src="favicon_io/favicon-16x16.png" alt="Seen" class="status-read-logo">';
        }
        // Sent but not read - show checkmark
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
        
        // If less than 24 hours, show time
        if (diff < 86400000) {
            return date.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
        }
        
        // If less than 7 days, show day name
        if (diff < 604800000) {
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        }
        
        // Otherwise show date
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

// Initialize Messages System
let messagesSystem;
document.addEventListener('DOMContentLoaded', () => {
    messagesSystem = new MessagesSystem();
});

// Export for use in other scripts
window.MessagesSystem = MessagesSystem;
window.messagesSystem = null;
