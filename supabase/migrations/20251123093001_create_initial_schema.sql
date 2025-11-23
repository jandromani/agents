/*
  # Initial Database Schema for AI Agent Platform

  ## Overview
  Complete database structure to support user management, agent creation, 
  usage tracking, billing, and notifications.

  ## New Tables

  ### 1. `profiles`
  - `id` (uuid, references auth.users)
  - `email` (text)
  - `full_name` (text)
  - `company_name` (text, optional)
  - `plan_type` (enum: free, premium_basic, premium_ultra)
  - `credits` (integer, for ultra plan)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `agents`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `name` (text)
  - `description` (text)
  - `model` (text, AI model identifier)
  - `knowledge_base` (jsonb, structured knowledge)
  - `documents` (jsonb, uploaded document references)
  - `config` (jsonb, agent configuration)
  - `worker_url` (text, deployed Cloudflare Worker URL)
  - `status` (enum: active, inactive, deploying, error)
  - `daily_query_count` (integer, for free plan)
  - `last_query_date` (date)
  - `total_queries` (integer)
  - `last_used_at` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `usage_logs`
  - `id` (uuid, primary key)
  - `agent_id` (uuid, references agents)
  - `user_id` (uuid, references profiles)
  - `query_text` (text)
  - `response_text` (text)
  - `tokens_used` (integer)
  - `credits_consumed` (numeric)
  - `model_used` (text)
  - `created_at` (timestamptz)

  ### 4. `credit_transactions`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `amount` (numeric)
  - `transaction_type` (enum: purchase, usage, refund)
  - `description` (text)
  - `balance_after` (numeric)
  - `created_at` (timestamptz)

  ### 5. `notifications`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `type` (enum: credit_low, agent_inactive, system)
  - `title` (text)
  - `message` (text)
  - `read` (boolean)
  - `created_at` (timestamptz)

  ### 6. `subscriptions`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `plan_type` (text)
  - `status` (enum: active, canceled, expired)
  - `started_at` (timestamptz)
  - `ends_at` (timestamptz)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Policies for authenticated users to access their own data
  - Admin policies for monitoring
*/

-- Create enums
CREATE TYPE plan_type AS ENUM ('free', 'premium_basic', 'premium_ultra');
CREATE TYPE agent_status AS ENUM ('active', 'inactive', 'deploying', 'error');
CREATE TYPE transaction_type AS ENUM ('purchase', 'usage', 'refund');
CREATE TYPE notification_type AS ENUM ('credit_low', 'agent_inactive', 'system');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'expired');

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  company_name text,
  plan_type plan_type DEFAULT 'free' NOT NULL,
  credits numeric DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  model text DEFAULT 'gpt-3.5-turbo' NOT NULL,
  knowledge_base jsonb DEFAULT '{}'::jsonb NOT NULL,
  documents jsonb DEFAULT '[]'::jsonb NOT NULL,
  config jsonb DEFAULT '{}'::jsonb NOT NULL,
  worker_url text,
  status agent_status DEFAULT 'deploying' NOT NULL,
  daily_query_count integer DEFAULT 0 NOT NULL,
  last_query_date date,
  total_queries integer DEFAULT 0 NOT NULL,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Usage logs table
CREATE TABLE IF NOT EXISTS usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  query_text text,
  response_text text,
  tokens_used integer DEFAULT 0 NOT NULL,
  credits_consumed numeric DEFAULT 0 NOT NULL,
  model_used text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Credit transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  transaction_type transaction_type NOT NULL,
  description text,
  balance_after numeric NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan_type text NOT NULL,
  status subscription_status DEFAULT 'active' NOT NULL,
  started_at timestamptz DEFAULT now() NOT NULL,
  ends_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_usage_logs_agent_id ON usage_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Agents policies
CREATE POLICY "Users can view own agents"
  ON agents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create agents"
  ON agents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own agents"
  ON agents FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own agents"
  ON agents FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Usage logs policies
CREATE POLICY "Users can view own usage logs"
  ON usage_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert usage logs"
  ON usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Credit transactions policies
CREATE POLICY "Users can view own transactions"
  ON credit_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert transactions"
  ON credit_transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to reset daily query count
CREATE OR REPLACE FUNCTION reset_daily_query_count()
RETURNS void AS $$
BEGIN
  UPDATE agents
  SET daily_query_count = 0,
      last_query_date = CURRENT_DATE
  WHERE last_query_date < CURRENT_DATE
    AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;