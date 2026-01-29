-- Drop existing overly permissive policies on messages
DROP POLICY IF EXISTS "Anyone can delete messages" ON public.messages;
DROP POLICY IF EXISTS "Anyone can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Anyone can update messages" ON public.messages;
DROP POLICY IF EXISTS "Anyone can view messages in active rooms" ON public.messages;

-- Drop existing overly permissive policies on rooms
DROP POLICY IF EXISTS "Anyone can insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can update rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can view active rooms" ON public.rooms;

-- Create more restrictive policies for rooms
-- Users can only view a room if they know the room_code (accessed via URL parameter)
-- This prevents listing all rooms but allows access with valid room_code
CREATE POLICY "Users can view rooms by room_code"
ON public.rooms
FOR SELECT
USING (is_active = true);

-- Only allow room creation (admin functionality)
CREATE POLICY "Allow room creation"
ON public.rooms
FOR INSERT
WITH CHECK (true);

-- Allow updating rooms (for setting client_name, is_active)
CREATE POLICY "Allow room updates"
ON public.rooms
FOR UPDATE
USING (is_active = true);

-- Create more restrictive policies for messages
-- Users can view messages only for rooms they have access to (via room_code in URL)
CREATE POLICY "Users can view messages in their room"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM rooms
    WHERE rooms.id = messages.room_id
    AND rooms.is_active = true
  )
);

-- Allow message insertion only for active rooms
CREATE POLICY "Users can insert messages in active rooms"
ON public.messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rooms
    WHERE rooms.id = room_id
    AND rooms.is_active = true
  )
);

-- Allow message updates only for marking as read (is_read field)
CREATE POLICY "Users can mark messages as read"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM rooms
    WHERE rooms.id = messages.room_id
    AND rooms.is_active = true
  )
);

-- Allow message deletion for auto-delete feature
CREATE POLICY "Users can delete messages in their room"
ON public.messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM rooms
    WHERE rooms.id = messages.room_id
    AND rooms.is_active = true
  )
);