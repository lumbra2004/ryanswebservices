-- Fix Messages RLS Policies
-- Run this in Supabase SQL Editor

-- Re-enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view all messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Message sender or admin can update messages" ON messages;
DROP POLICY IF EXISTS "Enable read access for users" ON messages;
DROP POLICY IF EXISTS "Enable insert for users" ON messages;
DROP POLICY IF EXISTS "Enable update for users" ON messages;

-- Simple policies - allow all authenticated users to access messages
CREATE POLICY "Allow all select on messages" ON messages
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all insert on messages" ON messages
    FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Allow all update on messages" ON messages
    FOR UPDATE TO authenticated USING (true);

-- Same for conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON conversations;
DROP POLICY IF EXISTS "Admins can update any conversation" ON conversations;

CREATE POLICY "Allow all select on conversations" ON conversations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all insert on conversations" ON conversations
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow all update on conversations" ON conversations
    FOR UPDATE TO authenticated USING (true);
