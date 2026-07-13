-- Enable realtime for chat. Both apps already subscribe to postgres_changes
-- on `messages`, but the table was never added to the realtime publication,
-- so INSERT events never reached clients.
alter publication supabase_realtime add table messages;
