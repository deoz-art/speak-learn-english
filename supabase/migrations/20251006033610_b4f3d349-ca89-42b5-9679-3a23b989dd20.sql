-- Create user_roles enum type
CREATE TYPE public.app_role AS ENUM ('student', 'admin');

-- Create profiles table (extends auth.users with additional info)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create levels table
CREATE TABLE public.levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  theme TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT positive_level_number CHECK (level_number > 0)
);

ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;

-- Create questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id UUID NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  image_url TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT options_length CHECK (array_length(options, 1) >= 2),
  CONSTRAINT correct_answer_in_options CHECK (correct_answer = ANY(options))
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Create progress table
CREATE TABLE public.progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked', 'completed')),
  high_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, level_number),
  CONSTRAINT positive_score CHECK (high_score >= 0)
);

ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    'student'
  );
  
  -- Initialize progress for level 1 (unlocked) and other levels (locked)
  INSERT INTO public.progress (user_id, level_number, status)
  SELECT new.id, level_number, CASE WHEN level_number = 1 THEN 'unlocked' ELSE 'locked' END
  FROM public.levels
  ORDER BY level_number;
  
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Security definer function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin(auth.uid()));

-- RLS Policies for levels (students can read, admins can do everything)
CREATE POLICY "Everyone can view levels"
  ON public.levels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert levels"
  ON public.levels FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update levels"
  ON public.levels FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete levels"
  ON public.levels FOR DELETE
  USING (public.is_admin(auth.uid()));

-- RLS Policies for questions
CREATE POLICY "Everyone can view questions"
  ON public.questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert questions"
  ON public.questions FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update questions"
  ON public.questions FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete questions"
  ON public.questions FOR DELETE
  USING (public.is_admin(auth.uid()));

-- RLS Policies for progress
CREATE POLICY "Users can view their own progress"
  ON public.progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
  ON public.progress FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all progress"
  ON public.progress FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_progress_updated_at
  BEFORE UPDATE ON public.progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert seed data: 5 levels with 5 questions each
INSERT INTO public.levels (level_number, title, theme, image_url) VALUES
(1, 'Restaurant Basics', 'Restaurant & Dining', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'),
(2, 'Travel & Airport', 'Travel Essentials', 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800'),
(3, 'Shopping & Retail', 'Shopping Vocabulary', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800'),
(4, 'Health & Medical', 'Medical Terms', 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800'),
(5, 'Business & Office', 'Professional English', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800');

-- Insert questions for Level 1 (Restaurant)
INSERT INTO public.questions (level_id, question_text, image_url, options, correct_answer)
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 1),
  'What do you call the person who serves food at a restaurant?',
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600',
  ARRAY['Waiter', 'Chef', 'Manager', 'Cashier'],
  'Waiter'
UNION ALL
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 1),
  'What is the list of food items available at a restaurant called?',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600',
  ARRAY['Menu', 'Bill', 'Receipt', 'Order'],
  'Menu'
UNION ALL
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 1),
  'What do you ask for when you finish eating and want to pay?',
  'https://images.unsplash.com/photo-1554224311-22a36c943f53?w=600',
  ARRAY['Check', 'Food', 'Table', 'Drink'],
  'Check'
UNION ALL
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 1),
  'What is the extra money given to service staff called?',
  'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600',
  ARRAY['Tip', 'Tax', 'Fee', 'Charge'],
  'Tip'
UNION ALL
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 1),
  'Where do you typically sit to eat at a restaurant?',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600',
  ARRAY['Table', 'Counter', 'Floor', 'Bench'],
  'Table';

-- Insert questions for Level 2 (Travel)
INSERT INTO public.questions (level_id, question_text, image_url, options, correct_answer)
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 2),
  'What document do you need to travel to another country?',
  'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=600',
  ARRAY['Passport', 'License', 'Ticket', 'Map'],
  'Passport'
UNION ALL
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 2),
  'Where do you check in your luggage at the airport?',
  'https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=600',
  ARRAY['Counter', 'Gate', 'Taxi', 'Shop'],
  'Counter'
UNION ALL
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 2),
  'What do you call the bags you carry when traveling?',
  'https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=600',
  ARRAY['Luggage', 'Boxes', 'Papers', 'Books'],
  'Luggage'
UNION ALL
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 2),
  'Where do you wait before boarding your flight?',
  'https://images.unsplash.com/photo-1556388158-158ea5ccacbd?w=600',
  ARRAY['Gate', 'Runway', 'Parking', 'Hotel'],
  'Gate'
UNION ALL
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 2),
  'What shows your seat assignment on a plane?',
  'https://images.unsplash.com/photo-1559268950-2d7ceb2efa68?w=600',
  ARRAY['Boarding Pass', 'Menu', 'Magazine', 'Window'],
  'Boarding Pass';

-- Continue with remaining levels...
INSERT INTO public.questions (level_id, question_text, image_url, options, correct_answer)
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 3),
  'Where do you pay for items at a store?',
  'https://images.unsplash.com/photo-1556741533-6e6a62bd8b49?w=600',
  ARRAY['Register', 'Shelf', 'Entrance', 'Window'],
  'Register'
UNION ALL
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 3),
  'What do you receive after making a purchase?',
  'https://images.unsplash.com/photo-1553697388-94e804e2f0f6?w=600',
  ARRAY['Receipt', 'Product', 'Bag', 'Card'],
  'Receipt'
UNION ALL
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 3),
  'What discount is often available for a limited time?',
  'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600',
  ARRAY['Sale', 'Return', 'Exchange', 'Refund'],
  'Sale'
UNION ALL
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 3),
  'Where are products displayed in a store?',
  'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600',
  ARRAY['Shelf', 'Floor', 'Ceiling', 'Door'],
  'Shelf'
UNION ALL
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 3),
  'What do you use to carry your purchases?',
  'https://images.unsplash.com/photo-1591948404368-1be0d8ea4962?w=600',
  ARRAY['Shopping Bag', 'Wallet', 'Phone', 'Keys'],
  'Shopping Bag';

INSERT INTO public.questions (level_id, question_text, image_url, options, correct_answer)
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 4),
  'Who treats patients in a hospital?',
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600',
  ARRAY['Doctor', 'Teacher', 'Lawyer', 'Engineer'],
  'Doctor'
UNION ALL
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 4),
  'What does a doctor write to get medicine?',
  'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600',
  ARRAY['Prescription', 'Letter', 'Email', 'Book'],
  'Prescription'
UNION ALL
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 4),
  'Where do you go to get medicine?',
  'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600',
  ARRAY['Pharmacy', 'Bank', 'School', 'Library'],
  'Pharmacy'
UNION ALL
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 4),
  'What do you have when you feel sick?',
  'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=600',
  ARRAY['Symptoms', 'Happiness', 'Energy', 'Strength'],
  'Symptoms'
UNION ALL
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 4),
  'What helps prevent diseases?',
  'https://images.unsplash.com/photo-1632053002748-9e47e50e2861?w=600',
  ARRAY['Vaccine', 'Candy', 'Coffee', 'Sugar'],
  'Vaccine';

INSERT INTO public.questions (level_id, question_text, image_url, options, correct_answer)
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 5),
  'What do you call a planned discussion at work?',
  'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=600',
  ARRAY['Meeting', 'Party', 'Game', 'Lunch'],
  'Meeting'
UNION ALL
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 5),
  'What do you send to communicate with coworkers?',
  'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=600',
  ARRAY['Email', 'Package', 'Letter', 'Gift'],
  'Email'
UNION ALL
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 5),
  'What is a time limit for completing work called?',
  'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600',
  ARRAY['Deadline', 'Holiday', 'Break', 'Weekend'],
  'Deadline'
UNION ALL
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 5),
  'Who manages and leads a team?',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600',
  ARRAY['Manager', 'Student', 'Client', 'Customer'],
  'Manager'
UNION ALL
SELECT 
  (SELECT id FROM public.levels WHERE level_number = 5),
  'What document shows your work history?',
  'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600',
  ARRAY['Resume', 'Menu', 'Ticket', 'Receipt'],
  'Resume';