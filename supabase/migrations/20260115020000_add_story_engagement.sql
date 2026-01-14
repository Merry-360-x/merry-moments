-- Add story likes table
CREATE TABLE IF NOT EXISTS story_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure one like per user per story
    UNIQUE(story_id, user_id)
);

-- Add story comments table
CREATE TABLE IF NOT EXISTS story_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL CHECK (length(comment_text) > 0 AND length(comment_text) <= 500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_story_likes_story_id ON story_likes(story_id);
CREATE INDEX IF NOT EXISTS idx_story_likes_user_id ON story_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_story_comments_story_id ON story_comments(story_id);
CREATE INDEX IF NOT EXISTS idx_story_comments_created_at ON story_comments(created_at DESC);

-- Enable RLS
ALTER TABLE story_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for likes
CREATE POLICY "story_likes_read" ON story_likes FOR SELECT USING (true);
CREATE POLICY "story_likes_insert" ON story_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "story_likes_delete" ON story_likes FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for comments
CREATE POLICY "story_comments_read" ON story_comments FOR SELECT USING (true);
CREATE POLICY "story_comments_insert" ON story_comments FOR INSERT WITH CHECK (auth.uid() = user_id AND length(comment_text) > 0);
CREATE POLICY "story_comments_update" ON story_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "story_comments_delete" ON story_comments FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at trigger for comments
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at column to comments if needed
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'story_comments' AND column_name = 'updated_at') THEN
        ALTER TABLE story_comments ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
        CREATE TRIGGER update_story_comments_updated_at BEFORE UPDATE ON story_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;