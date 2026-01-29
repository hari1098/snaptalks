-- Create rooms table for admin-generated chat links
CREATE TABLE public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(4), 'hex'),
    client_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'client')),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for rooms (public read for active rooms, admin can manage)
CREATE POLICY "Anyone can view active rooms" ON public.rooms
    FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can insert rooms" ON public.rooms
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update rooms" ON public.rooms
    FOR UPDATE USING (true);

-- RLS policies for messages (public access for chat functionality)
CREATE POLICY "Anyone can view messages in active rooms" ON public.messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.rooms WHERE id = room_id AND is_active = true)
    );

CREATE POLICY "Anyone can insert messages" ON public.messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update messages" ON public.messages
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete messages" ON public.messages
    FOR DELETE USING (true);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;