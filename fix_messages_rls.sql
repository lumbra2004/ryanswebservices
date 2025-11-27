-- Fix Messages RLS Policies
-- Run this in Supabase SQL Editor to fix the issue where users only see their own messages

-- Drop existing messages policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Message sender or admin can update messages" ON messages;

-- Recreate with fixed logic
-- Users can see ALL messages in conversations they own (including admin replies)
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

-- Users can send messages in their own conversations, admins can send anywhere
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

-- Users can update (mark as read) messages in their conversations
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
