-- Messages System Setup
-- Run this in Supabase SQL Editor

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT,
    user_name TEXT,
    admin_id UUID REFERENCES auth.users(id),
    subject TEXT DEFAULT 'Support conversation',
    last_message TEXT,
    unread_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    sender_name TEXT,
    sender_email TEXT,
    content TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view their own conversations" ON conversations
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" ON conversations
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can update any conversation" ON conversations
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Messages policies
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Message sender or admin can update messages" ON messages;

CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND conversations.user_id = auth.uid()
        )
        OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        (
            EXISTS (
                SELECT 1 FROM conversations 
                WHERE conversations.id = conversation_id 
                AND conversations.user_id = auth.uid()
            )
            OR
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    );

CREATE POLICY "Message sender or admin can update messages" ON messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND conversations.user_id = auth.uid()
        )
        OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Function to update unread count when new message is inserted
CREATE OR REPLACE FUNCTION update_conversation_unread_count()
RETURNS TRIGGER AS $$
BEGIN
    -- If message is from user (not admin), increment unread count
    IF NEW.is_admin = FALSE THEN
        UPDATE conversations 
        SET unread_count = unread_count + 1,
            updated_at = NOW(),
            last_message = LEFT(NEW.content, 100)
        WHERE id = NEW.conversation_id;
    ELSE
        UPDATE conversations 
        SET updated_at = NOW(),
            last_message = LEFT(NEW.content, 100)
        WHERE id = NEW.conversation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for unread count
DROP TRIGGER IF EXISTS trigger_update_unread_count ON messages;
CREATE TRIGGER trigger_update_unread_count
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_unread_count();

-- Grant necessary permissions
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON messages TO authenticated;

-- Enable realtime for messages
ALTER publication supabase_realtime ADD TABLE messages;
ALTER publication supabase_realtime ADD TABLE conversations;
