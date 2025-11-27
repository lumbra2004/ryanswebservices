-- Fix Messages RLS Policies
-- Run this in Supabase SQL Editor to fix the issue where users only see their own messages

-- Drop ALL existing messages policies first
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Message sender or admin can update messages" ON messages;
DROP POLICY IF EXISTS "Enable read access for users" ON messages;
DROP POLICY IF EXISTS "Enable insert for users" ON messages;
DROP POLICY IF EXISTS "Enable update for users" ON messages;

-- Simple policy: If you own the conversation, you can see ALL messages in it
CREATE POLICY "Users can view all messages in their conversations" ON messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM conversations WHERE user_id = auth.uid()
        )
        OR 
        sender_id = auth.uid()
        OR
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

-- Users can insert messages if they own the conversation or are admin
CREATE POLICY "Users can send messages in their conversations" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()
        AND (
            conversation_id IN (
                SELECT id FROM conversations WHERE user_id = auth.uid()
            )
            OR
            (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
        )
    );

-- Users can update messages in their conversations (for marking read)
CREATE POLICY "Users can update messages in their conversations" ON messages
    FOR UPDATE USING (
        conversation_id IN (
            SELECT id FROM conversations WHERE user_id = auth.uid()
        )
        OR
        sender_id = auth.uid()
        OR
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );
