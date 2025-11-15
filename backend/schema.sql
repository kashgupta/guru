-- Create table for storing user conversation sessions
-- Maps phone numbers to OpenAI conversation IDs

CREATE TABLE IF NOT EXISTS user_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  conversation_id VARCHAR(255),
  last_agent VARCHAR(50),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on phone_number for fast lookups
CREATE INDEX IF NOT EXISTS idx_phone_number ON user_conversations(phone_number);

-- Create index on last_activity for cleanup queries
CREATE INDEX IF NOT EXISTS idx_last_activity ON user_conversations(last_activity);

-- Add function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_user_conversations_updated_at ON user_conversations;
CREATE TRIGGER update_user_conversations_updated_at
  BEFORE UPDATE ON user_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE user_conversations IS 'Stores user conversation sessions mapping phone numbers to OpenAI conversation IDs';
COMMENT ON COLUMN user_conversations.phone_number IS 'User phone number (without whatsapp: prefix)';
COMMENT ON COLUMN user_conversations.conversation_id IS 'OpenAI Responses API conversation ID for maintaining state';
COMMENT ON COLUMN user_conversations.last_agent IS 'Last agent used (healthcare, financial, legal, english, general)';
COMMENT ON COLUMN user_conversations.last_activity IS 'Timestamp of last user activity';
