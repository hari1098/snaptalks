-- Create table for WebRTC signaling (call offers, answers, ICE candidates)
CREATE TABLE public.call_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'client')),
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate', 'call-end', 'call-reject')),
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

-- Allow signals for active rooms only
CREATE POLICY "Allow select signals for active rooms"
ON public.call_signals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE rooms.id = call_signals.room_id 
    AND rooms.is_active = true
  )
);

CREATE POLICY "Allow insert signals for active rooms"
ON public.call_signals
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE rooms.id = call_signals.room_id 
    AND rooms.is_active = true
  )
);

CREATE POLICY "Allow delete signals for active rooms"
ON public.call_signals
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE rooms.id = call_signals.room_id 
    AND rooms.is_active = true
  )
);

-- Enable realtime for signaling
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;

-- Create index for faster queries
CREATE INDEX idx_call_signals_room_id ON public.call_signals(room_id);
CREATE INDEX idx_call_signals_created_at ON public.call_signals(created_at DESC);