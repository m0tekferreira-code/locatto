-- Fix security issues: Remove public access policies and add proper user-scoped policies

-- 1. Fix agent_configs table
DROP POLICY IF EXISTS "Permitir acesso público a agent_configs" ON public.agent_configs;

CREATE POLICY "Users can manage their own agent configs"
ON public.agent_configs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Fix leads table - First add user_id column if it doesn't exist
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);

-- Drop public policy and add user-scoped policy
DROP POLICY IF EXISTS "Permitir acesso público a leads" ON public.leads;

CREATE POLICY "Users can manage their own leads"
ON public.leads
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Fix messages table
DROP POLICY IF EXISTS "Permitir acesso público a messages" ON public.messages;

-- Messages should be accessible through conversations that belong to user's leads
CREATE POLICY "Users can view messages from their conversations"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    INNER JOIN public.leads l ON c.lead_id = l.id
    WHERE c.id = messages.conversation_id
    AND l.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert messages to their conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    INNER JOIN public.leads l ON c.lead_id = l.id
    WHERE c.id = messages.conversation_id
    AND l.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update messages in their conversations"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    INNER JOIN public.leads l ON c.lead_id = l.id
    WHERE c.id = messages.conversation_id
    AND l.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete messages in their conversations"
ON public.messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    INNER JOIN public.leads l ON c.lead_id = l.id
    WHERE c.id = messages.conversation_id
    AND l.user_id = auth.uid()
  )
);

-- 4. Fix conversations table
DROP POLICY IF EXISTS "Permitir acesso público a conversations" ON public.conversations;

CREATE POLICY "Users can view their own conversations"
ON public.conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = conversations.lead_id
    AND leads.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own conversations"
ON public.conversations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = conversations.lead_id
    AND leads.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own conversations"
ON public.conversations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = conversations.lead_id
    AND leads.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own conversations"
ON public.conversations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = conversations.lead_id
    AND leads.user_id = auth.uid()
  )
);

-- 5. Fix conversation_summaries table
DROP POLICY IF EXISTS "Permitir acesso público a summaries" ON public.conversation_summaries;

CREATE POLICY "Users can view summaries of their conversations"
ON public.conversation_summaries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    INNER JOIN public.leads l ON c.lead_id = l.id
    WHERE c.id = conversation_summaries.conversation_id
    AND l.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert summaries for their conversations"
ON public.conversation_summaries
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    INNER JOIN public.leads l ON c.lead_id = l.id
    WHERE c.id = conversation_summaries.conversation_id
    AND l.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update summaries of their conversations"
ON public.conversation_summaries
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    INNER JOIN public.leads l ON c.lead_id = l.id
    WHERE c.id = conversation_summaries.conversation_id
    AND l.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete summaries of their conversations"
ON public.conversation_summaries
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    INNER JOIN public.leads l ON c.lead_id = l.id
    WHERE c.id = conversation_summaries.conversation_id
    AND l.user_id = auth.uid()
  )
);